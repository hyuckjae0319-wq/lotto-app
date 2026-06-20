// scripts/fetch-lotto.js
// 동행복권에서 최신 로또 당첨 번호를 가져와 data/lotto_history.json 업데이트

const https = require('https');
const http  = require('http');
const fs   = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/lotto_history.json');
const MAX_ROUNDS = 1000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 리다이렉트를 자동으로 따라가는 GET 요청
function fetchUrl(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('리다이렉트 최대 횟수 초과'));
    const lib = url.startsWith('https') ? https : http;
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Referer': 'https://www.dhlottery.co.kr/',
        'Connection': 'keep-alive'
      }
    };
    const req = lib.get(url, options, (res) => {
      // 리다이렉트 처리
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume(); // 현재 응답 소비
        let nextUrl = res.headers.location;
        if (nextUrl.startsWith('/')) {
          const u = new URL(url);
          nextUrl = u.origin + nextUrl;
        }
        return resolve(fetchUrl(nextUrl, redirectCount + 1));
      }

      let data = '';
      res.setEncoding('utf-8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

let useOfficialAPI = true;

async function fetchRound(drwNo) {
  if (useOfficialAPI) {
    try {
      const url = `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${drwNo}`;
      const raw = await fetchUrl(url);
      const json = JSON.parse(raw);
      if (json.returnValue === 'success') {
        return {
          round: json.drwNo,
          date: json.drwNoDate,
          numbers: [json.drwtNo1, json.drwtNo2, json.drwtNo3, json.drwtNo4, json.drwtNo5, json.drwtNo6].sort((a, b) => a - b),
          bonus: json.bnusNo
        };
      }
    } catch (e) {
      console.log(`\n⚠️ 공식 API 호출 실패 (회차 ${drwNo}). 백업 API 모드로 전환합니다. (${e.message})`);
      useOfficialAPI = false;
    }
  }

  try {
    const backupUrl = `https://smok95.github.io/lotto/results/${drwNo}.json`;
    const raw = await fetchUrl(backupUrl);
    const json = JSON.parse(raw);
    if (json && json.draw_no) {
      return {
        round: json.draw_no,
        date: json.date.substring(0, 10), // YYYY-MM-DD
        numbers: json.numbers.sort((a, b) => a - b),
        bonus: json.bonus_no
      };
    }
  } catch (e) {
    throw new Error(`공식 API 및 백업 API 모두 실패 (회차: ${drwNo}): ${e.message}`);
  }
  return null;
}

async function getCurrentRound() {
  const startDate = new Date('2002-12-07T00:00:00+09:00');
  const now = new Date();
  const diffMs = now - startDate;
  const weeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, weeks + 1);
}

async function main() {
  console.log('🎱 로또 데이터 업데이트 시작...\n');

  let existing = { draws: [] };
  if (fs.existsSync(DATA_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      console.log(`📦 기존 데이터: ${existing.draws.length}회차`);
    } catch {
      console.log('📦 기존 데이터 없음, 새로 생성');
    }
  }

  // API 연결 테스트 (1회차)
  console.log('🔌 API 연결 테스트 중...');
  try {
    const test = await fetchRound(1);
    if (test) {
      console.log(`✅ API 연결 성공! 1회차: ${test.numbers.join(', ')}`);
    }
  } catch (e) {
    console.error(`❌ API 연결 실패: ${e.message}`);
    console.error('   동행복권 서버에 연결할 수 없습니다.');
    process.exit(1);
  }

  const currentRound = await getCurrentRound();
  const startRound = Math.max(1, currentRound - MAX_ROUNDS + 1);

  console.log(`\n📊 수집 계획:`);
  console.log(`   현재 추정 최신 회차: ${currentRound}`);
  console.log(`   수집 범위: ${startRound} ~ ${currentRound}`);

  let draws = (existing.draws || []).filter(d => d.round >= startRound);
  const existingSet = new Set(draws.map(d => d.round));

  const missing = [];
  for (let r = startRound; r <= currentRound; r++) {
    if (!existingSet.has(r)) missing.push(r);
  }

  console.log(`   신규 수집 필요: ${missing.length}개\n`);

  if (missing.length === 0) {
    console.log('✅ 이미 최신 데이터입니다!');
  } else {
    let success = 0, fail = 0;
    const BATCH = 5; // 5개씩 배치

    for (let i = 0; i < missing.length; i += BATCH) {
      const batch = missing.slice(i, i + BATCH);
      const results = await Promise.allSettled(batch.map(r => fetchRound(r)));

      for (const res of results) {
        if (res.status === 'fulfilled' && res.value) {
          draws.push(res.value);
          success++;
        } else if (res.status === 'rejected') {
          fail++;
          if (fail <= 3) console.error(`\n   ⚠️ 실패: ${res.reason?.message}`);
        }
      }

      const done = Math.min(i + BATCH, missing.length);
      const pct = Math.round(done / missing.length * 100);
      process.stdout.write(`\r   진행중: ${done}/${missing.length} (${pct}%) - 성공 ${success}개`);

      if (i + BATCH < missing.length) await sleep(500);
    }
    console.log('');
  }

  draws.sort((a, b) => a.round - b.round);

  const result = {
    lastUpdated: new Date().toISOString(),
    totalRounds: draws.length,
    draws
  };

  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(result, null, 2), 'utf-8');

  console.log(`\n\n🎉 완료! 총 ${draws.length}회차 데이터 저장`);
  if (draws.length > 0) {
    const last = draws[draws.length - 1];
    console.log(`📅 최신 회차: 제${last.round}회 (${last.date})`);
    console.log(`🎱 당첨번호: ${last.numbers.join(', ')} + 보너스 ${last.bonus}`);
  }
}

main().catch(err => {
  console.error('\n❌ 치명적 오류:', err.message);
  process.exit(1);
});
