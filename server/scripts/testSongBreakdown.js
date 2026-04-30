/**
 * 验证 songBreakdown + dxStar 计算（2026-04-30 v3 — dxScore/theoreticalDxScore）
 * - 总榜：Σachievement 简单求和
 * - dxStar：dxScore / theoreticalDxScore
 */
const { calculateQualifierRankings } = require('../services/tournament/qualifier');

const tournament = {
  advanceCount: 8,
  qualifierSongs: [
    { songName: 'Song A', constant: 13.5, theoreticalDxScore: 1000000 },
    { songName: 'Song B', constant: 14.0, theoreticalDxScore: 1200000 },
    { songName: 'Song C', constant: 12.0, theoreticalDxScore: 0 },
  ],
  qualifierScores: [
    // Player 1: 最高分
    { userId: { _id: 'p1' }, songName: 'Song A', achievement: 101.0, dxScore: 970000, entryTime: new Date('2026-04-01') },
    { userId: { _id: 'p1' }, songName: 'Song B', achievement: 99.5, dxScore: 940000, entryTime: new Date('2026-04-02') },
    { userId: { _id: 'p1' }, songName: 'Song C', achievement: 100.5, dxScore: 960000, entryTime: new Date('2026-04-03') },
    // Player 2
    { userId: { _id: 'p2' }, songName: 'Song A', achievement: 98.0, dxScore: 930000, entryTime: new Date('2026-04-04') },
    { userId: { _id: 'p2' }, songName: 'Song B', achievement: 97.0, dxScore: 910000, entryTime: new Date('2026-04-05') },
    // Player 3
    { userId: { _id: 'p3' }, songName: 'Song A', achievement: 100.0, dxScore: 950000, entryTime: new Date('2026-04-06') },
    { userId: { _id: 'p3' }, songName: 'Song B', achievement: 100.0, dxScore: 920000, entryTime: new Date('2026-04-07') },
  ],
};

const result = calculateQualifierRankings(tournament);

console.log('=== 总排名 ===');
result.rankings.forEach(r => console.log(`#${r.rank} p${r.userId} total=${r.total}`));

console.assert(result.rankings[0].total === 301.0, 'p1 total should be 301.0');
console.log('✅ 总榜正确\n');

console.log('=== 单曲排行榜 ===');
result.songBreakdown.forEach(song => {
  console.log(`\n【${song.songName}】`);
  song.rankings.forEach(r => {
    console.log(`  #${r.rank} p${r.userId} ach=${r.achievement} dx=${r.dxScore} dxStar=${r.dxStar}`);
  });
});

// Song A: theoretical=1,000,000
// p1 dx=970,000 → 97% → 5★
// p3 dx=950,000 → 95% → 4★
// p2 dx=930,000 → 93% → 3★
const songA = result.songBreakdown.find(s => s.songName === 'Song A');
console.assert(songA.rankings[0].dxStar === 5, '970k/1M = 97% → 5★');
console.assert(songA.rankings[1].dxStar === 4, '950k/1M = 95% → 4★');
console.assert(songA.rankings[2].dxStar === 3, '930k/1M = 93% → 3★');

// Song B: theoretical=1,200,000
// p1 dx=940,000 → 78.3% → 0★ (below 85%)
const songB = result.songBreakdown.find(s => s.songName === 'Song B');
console.assert(songB.rankings[0].dxStar === 0, '940k/1.2M = 78.3% → 0★');

// Song C: theoretical=0 (not set) → 0★
const songC = result.songBreakdown.find(s => s.songName === 'Song C');
console.assert(songC.rankings[0].dxStar === 0, 'theoreticalDxScore=0 → 0★');

console.log('✅ dxStar 全部正确');
