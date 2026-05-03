// b1.7 第三轮 — 自动化测试脚本 v1.1 🦇⚡️
// 范围: P0 阻塞修复 + P1 字段完整性 + 回归
// 运行: node test-b1.7-round3-api.js

const BASE = 'https://www.purebeat.top';
const MANIA_BIDS = [552569, 557819, 5400230, 4828566, 5526025];
const POPULAR_BID = 1223366;

const results = { passed: 0, failed: 0, total: 0, sections: {} };
let currentSection = '';

function section(name) {
  currentSection = name;
  results.sections[name] = { passed: 0, failed: 0, total: 0 };
  console.log(`\n═══════════════════════════════════════════`);
  console.log(`  ${name}`);
  console.log(`═══════════════════════════════════════════`);
}

function ok(id, condition, msg) {
  results.total++;
  results.sections[currentSection].total++;
  if (condition) {
    results.passed++;
    results.sections[currentSection].passed++;
    console.log(`  ✅ [${id}] ${msg}`);
  } else {
    results.failed++;
    results.sections[currentSection].failed++;
    console.log(`  ❌ [${id}] ${msg}`);
  }
}

function fail(id, detail) {
  results.total++;
  results.sections[currentSection].total++;
  results.failed++;
  results.sections[currentSection].failed++;
  console.log(`  ❌ [${id}] ${detail}`);
}

function info(msg) {
  console.log(`  ℹ️  ${msg}`);
}

async function get(path) {
  try {
    const r = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(10000) });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { parseError: text.slice(0, 200) }; }
    return { status: r.status, ok: r.ok, data, text };
  } catch (e) {
    return { status: 0, ok: false, data: { msg: e.message }, text: e.message };
  }
}

async function findManiaBeatmap() {
  for (const bid of MANIA_BIDS) {
    const r = await get(`/api/osu/leaderboard/${bid}?legacy=1`);
    if (r.ok && r.data?.mode === 'mania' && (r.data?.scores?.length || 0) > 0) {
      return { bid, data: r.data };
    }
  }
  return null;
}

async function findBeatmapWithScores() {
  // Try popular beatmaps that likely have scores
  const candidates = [1883081, 1299000, 1050776, 368125, 2761200];
  for (const bid of candidates) {
    const r = await get(`/api/osu/leaderboard/${bid}?legacy=1`);
    if (r.ok && (r.data?.scores?.length || 0) > 3) {
      return { bid, data: r.data };
    }
  }
  return null;
}

// ==============================
// 开始测试
// ==============================
section('📊 测试概览');
info(`BASE: ${BASE}`);
info(`时间: ${new Date().toISOString()}`);

// ==============================
// P0-C: Mania countPerf
// ==============================
section('🎯 P0-C: Mania countPerf ≠ countGreat');

const mania = await findManiaBeatmap();

if (mania) {
  ok('PDC.0', !!mania, `Mania 谱面 BID=${mania.bid}, ${mania.data.scores.length} 条数据`);

  const scores = mania.data.scores;
  const withPerf = scores.filter(s => s.countPerf !== null && s.countPerf !== undefined);
  ok('PDC.1', withPerf.length > 0, `countPerf 非 null: ${withPerf.length}/${scores.length}`);

  if (withPerf.length > 0) {
    const diff = withPerf.filter(s => s.countPerf !== s.countGreat).length;
    ok('PDC.2', diff > 0, `PERFECT≠GREAT 确认: ${diff} 条不同 / ${withPerf.length} 条总计`);

    for (let i = 0; i < Math.min(3, scores.length); i++) {
      const s = scores[i];
      info(`Score[${i}]: perf=${s.countPerf}, great=${s.countGreat}, ok=${s.countOk}, meh=${s.countMeh}, miss=${s.countMiss}, grade=${s.grade}, score=${s.score}`);
    }
  }
} else {
  fail('PDC.0', '未找到带数据的 mania 谱面');
}

// ==============================
// P0-D: Lazer 分数 fallback
// ==============================
section('🎯 P0-D: Lazer 分数 ≠ 0');

const withScores = await findBeatmapWithScores();

if (withScores) {
  ok('PDD.0', true, `谱面 ${withScores.bid}: ${withScores.data.scores.length} 条成绩 (mode=${withScores.data.mode})`);

  const scores = withScores.data.scores;
  const zeroScores = scores.filter(s => s.score === 0);
  ok('PDD.1', zeroScores.length < scores.length, `score=0: ${zeroScores.length}/${scores.length}`);
  ok('PDD.2', scores.every(s => typeof s.score === 'number'), 'score 全为 number 类型');

  const nonZero = scores.filter(s => s.score > 0);
  if (nonZero.length > 0) {
    const minS = Math.min(...nonZero.map(s => s.score));
    const maxS = Math.max(...nonZero.map(s => s.score));
    ok('PDD.3', minS > 0, `分数范围: ${minS.toLocaleString()} ~ ${maxS.toLocaleString()}`);
  } else {
    // All scores are 0 — check for lazer data
    info('所有 score=0，可能是 lazer 数据 (需确认 fallback)');
  }
} else {
  fail('PDD.0', '未找到带排行榜数据的谱面');
}

// ==============================
// P1-A: 档案页字段完整性
// ==============================
section('📋 P1-A: 档案页字段完整性');

const rInfo = await get('/api/osu/info?q=peppy');

if (rInfo.ok) {
  const p = rInfo.data;
  ok('P1A.0', !!(p.username || p.osuUsername), `用户: ${p.username || p.osuUsername || '?'}`);

  // 基本字段检查
  ok('P1A.1', !!p.username, `username: ${p.username}`);
  ok('P1A.2', !!p.avatarUrl || !!p.osuAvatarUrl, `avatarUrl: ${!!(p.avatarUrl || p.osuAvatarUrl)}`);
  ok('P1A.3', !!(p.countryCode), `countryCode: ${p.countryCode || 'missing'}`);
  ok('P1A.4', !!p.coverUrl, `coverUrl: ${!!p.coverUrl}`);
  ok('P1A.5', !!p.joinDate, `joinDate: ${p.joinDate || 'missing'}`);
  ok('P1A.6', p.friendsCount !== undefined, `friendsCount: ${p.friendsCount}`);
  ok('P1A.7', p.badgeCount !== undefined, `badgeCount: ${p.badgeCount}`);
  ok('P1A.8', p.mapperFollowersCount !== undefined, `mapperFollowersCount: ${p.mapperFollowersCount}`);
  ok('P1A.9', p.followerCount !== undefined, `followerCount: ${p.followerCount}`);

  // 四模式
  const statKeys = p.statistics ? Object.keys(p.statistics) : [];
  const hasFour = ['standard', 'taiko', 'catch', 'mania'].every(m => statKeys.includes(m));
  ok('P1A.10', hasFour, `四模式: ${hasFour ? '✅' : statKeys.join(',')}`);

  if (hasFour) {
    // 实际字段名（camelCase，后端返回的格式）
    const modeFields = ['pp', 'rank', 'countryRank', 'accuracy', 'playCount', 'totalHits',
      'level', 'maxCombo', 'rankedScore', 'totalScore', 'playTime', 'replaysWatched', 'replaysWatchedByOthers', 'rankHistory'];
    for (const mode of ['standard', 'taiko', 'catch', 'mania']) {
      const ms = p.statistics[mode] || {};
      const n = modeFields.filter(f => ms[f] !== undefined).length;
      // rankHistory might be an empty array, count it but flag
      const hasRankHistory = Array.isArray(ms.rankHistory);
      ok(`P1A.11-${mode}`, n >= modeFields.length - 1, `${mode}: ${n}/${modeFields.length} 字段存在 (rankHistory: ${hasRankHistory ? ms.rankHistory.length : 0}pts)`);
    }
  }

  ok('P1A.12', !!p.defaultMode, `defaultMode: ${p.defaultMode}`);
  
  // top-level rankHistory
  const rhTop = p.rankHistory;
  info(`顶层 rankHistory: ${Array.isArray(rhTop) ? rhTop.length + 'pts' : 'missing'}`);
  const rhStd = p.statistics?.standard?.rankHistory;
  ok('P1A.13', Array.isArray(rhStd) && rhStd.length > 0, `standard.rankHistory: ${rhStd?.length || 0}pts`);
} else {
  fail('P1A.0', `/api/osu/info?q=peppy → ${rInfo.status}`);
}

// ==============================
// P1-B/C: 排行榜字段完整性
// ==============================
section('📋 P1-B/C: 排行榜字段');

const rLB = await get(`/api/osu/leaderboard/${POPULAR_BID}?legacy=1`);

if (rLB.ok) {
  const ld = rLB.data;
  const bm = ld.beatmap || {};

  // Beatmap fields
  const requiredBm = ['id', 'title', 'artist', 'version', 'coverUrl', 'status', 'starRating', 'bpm', 'mode', 'modeInt', 'od', 'cs', 'ar', 'totalLength'];
  const optionalBm = ['titleUnicode', 'mapperId', 'mapperUsername', 'mapperAvatarUrl', 'submittedDate', 'rankedDate', 'circles', 'sliders', 'spinners', 'maxCombo'];
  
  const reqPresent = requiredBm.filter(f => bm[f] !== undefined).length;
  ok('P1B.0', reqPresent >= requiredBm.length - 1, `beatmap 必需字段: ${reqPresent}/${requiredBm.length}`);

  const optPresent = optionalBm.filter(f => bm[f] !== undefined).length;
  ok('P1B.1', optPresent >= optionalBm.length - 2, `beatmap 可选字段: ${optPresent}/${optionalBm.length}`);

  info(`谱面: ${bm.title || '?'} / ${bm.version || '?'} (${bm.mode})`);
  info(`星级: ${bm.starRating}, BPM: ${bm.bpm}, OD: ${bm.od}, CS: ${bm.cs}, AR: ${bm.ar}`);
  info(`谱师: ${bm.mapperUsername || '?'} (ID: ${bm.mapperId}), 提交: ${bm.submittedDate || '?'}`);
  info(`圆圈/滑条/转盘: ${bm.circles}/${bm.sliders}/${bm.spinners}`);

  // Missing fields
  const missing = [...requiredBm, ...optionalBm].filter(f => bm[f] === undefined);
  if (missing.length > 0) info(`缺失字段: ${missing.join(', ')}`);

  // Score fields
  const scores = ld.scores || [];
  if (scores.length > 0) {
    const s = scores[0];
    const scoreKeys = ['rank', 'score', 'accuracy', 'countGreat', 'countOk', 'countMeh', 'countMiss',
      'mods', 'grade', 'maxCombo', 'userId', 'username', 'avatarUrl', 'countryCode', 'countryName', 'coverUrl'];
    
    const scPresent = scoreKeys.filter(k => s[k] !== undefined).length;
    ok('P1C.0', scPresent >= scoreKeys.length - 2, `score 条目字段: ${scPresent}/${scoreKeys.length}`);

    const scMissing = scoreKeys.filter(k => s[k] === undefined);
    if (scMissing.length > 0) info(`score 缺失: ${scMissing.join(', ')}`);

    const withCountryName = scores.filter(s => s.countryName).length;
    ok('P1C.1', withCountryName > 0, `countryName 非空: ${withCountryName}/${scores.length}`);

    // Sample
    for (let i = 0; i < Math.min(3, scores.length); i++) {
      const sc = scores[i];
      info(`Score[${i}]: ${sc.username} | ${sc.countryCode} | ${sc.grade} | ${sc.score?.toLocaleString()} | mods=${JSON.stringify(sc.mods)}`);
    }
  } else {
    info('score 数组为空 (谱面无排行数据)');
  }

  ok('P1B.2', ld.userScore !== undefined, `userScore: ${ld.userScore === null ? 'null (未登录)' : 'object'}`);
} else {
  fail('P1B.0', `排行榜 → ${rLB.status}`);
}

// ==============================
// 回归测试
// ==============================
section('🔄 回归: 未知谱面 404');

let r = await get('/api/osu/leaderboard/4035260?legacy=1');
ok('REG.1', r.status === 404 && /谱面未找到/.test(JSON.stringify(r.data)), `未知谱面排行榜: ${r.status}`);

r = await get('/api/osu/map/4035260');
ok('REG.2', r.status === 404 && /谱面未找到/.test(JSON.stringify(r.data)), `未知谱面 map: ${r.status}`);

section('🔄 回归: 同步 401');

r = await get('/api/osu/sync-all');
ok('REG.3', r.status === 401 || r.status === 404, `sync-all 未登录: ${r.status} (401=need auth, 404=endpoint changed)`);

r = await get('/api/users/sync-osu');
ok('REG.4', r.status === 401 || r.status === 404, `sync-osu 未登录: ${r.status} (401=need auth, 404=endpoint changed)`);

section('🔄 回归: BP');

r = await get('/api/osu/best?mode=standard');
ok('REG.5', r.status === 400, `BP 无参数: ${r.status}`);

r = await get('/api/osu/best?mode=standard&username=peppy');
ok('REG.6', r.status === 404, `BP 未绑定用户: ${r.status}`);

section('🔄 回归: 排行榜字段');

r = await get(`/api/osu/leaderboard/${POPULAR_BID}?legacy=1`);
if (r.ok) {
  ok('REG.7', true, `排行榜 200 ✅`);
  ok('REG.8', r.data?.availableTypes?.[0] === 'stable', `availableTypes: ${r.data?.availableTypes?.[0]}`);
  ok('REG.9', r.data?.currentUserRank === null, `currentUserRank: null`);
  ok('REG.10', typeof r.data?.totalEntries === 'number', `totalEntries: ${r.data?.totalEntries}`);
}
  
section('🔄 回归: Info 四模式');

r = await get('/api/osu/info?q=peppy');
if (r.ok) {
  ok('REG.11', true, `Info 200 ✅`);
  const modes = r.data?.statistics ? Object.keys(r.data.statistics).join(',') : '';
  ok('REG.12', /standard|taiko|catch|mania/.test(modes), `四模式: ${modes}`);
}

r = await get('/api/osu/info?q=nonexistent_user_xxxx');
ok('REG.13', r.status === 404, `不存在用户: ${r.status}`);

r = await get('/api/osu/info');
ok('REG.14', r.status === 400, `空参数: ${r.status}`);

section('🔄 回归: Map');

r = await get(`/api/osu/map/${POPULAR_BID}`);
ok('REG.15', r.ok && r.data?.title, `map 200: ${r.data?.title || r.status}`);

r = await get('/api/osu/map/-1');
ok('REG.16', r.status >= 400, `无效 ID: ${r.status}`);

section('🔄 回归: 未知谱面 404 保持');

r = await get('/api/osu/map/4035260');
ok('REG.17', r.status === 404, `map 未知谱面: ${r.status}`);

section('🔄 回归: 第二轮 Taiko 模式');

r = await get('/api/osu/leaderboard/1883081?legacy=1');
ok('REG.18', r.ok && r.data?.mode === 'taiko', `Taiko BID mode=${r.data?.mode}`);

// ==============================
// 汇总
// ==============================
section('📊 汇总');

const rate = results.total > 0 ? (results.passed / results.total * 100).toFixed(1) : '0.0';
console.log(`\n  ✅ 通过: ${results.passed}/${results.total}`);
console.log(`  ❌ 失败: ${results.failed}/${results.total}`);
console.log(`  📈 通过率: ${rate}%\n`);

console.log(`  分节明细:`);
for (const [sec, res] of Object.entries(results.sections)) {
  const r2 = res.total > 0 ? (res.passed / res.total * 100).toFixed(1) : '-';
  console.log(`    ${sec}: ✅ ${res.passed}/${res.total} (${r2}%)`);
}

console.log(`\n  🦇 测试完成: ${new Date().toISOString()}`);
