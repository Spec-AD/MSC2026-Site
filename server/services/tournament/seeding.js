/**
 * 🏆 种子分配算法 (Snake Seed)
 *
 * 用于单败淘汰制对阵表的种子排布。
 * 输入排序后的选手列表 → 输出按 bracket 位置排布的选手数组。
 */

/**
 * Snake Seed 算法
 *
 * 将已排序选手按 Snake Pattern 填入 2^k 大小的 bracket 槽位：
 * - 奇数轮次从左往右填，偶数轮次从右往左
 * - 确保高排位种子在 bracket 两端对称分布
 *
 * @param {Array} players — 已排序的选手列表 [{ userId, ... }]
 * @param {number} size — 补齐后的 bracket 大小 (2^k)
 * @returns {Array} — 长度为 size 的数组，null = 轮空位
 */
function snakeSeed(players, size) {
  const bracket = new Array(size).fill(null);
  const sorted = [...players]; // 假定调用方已排序
  const n = sorted.length;

  // 使用经典 snake: pos 0, N-1, N/2-1, N/2, ...
  const seeds = [];

  // 生成种子序列位置
  let left = 0;
  let right = size - 1;
  let dirLeft = true;
  for (let i = 0; i < size; i++) {
    if (i < n) {
      const pos = dirLeft ? left++ : right--;
      seeds.push({ ...sorted[i], bracketPos: pos });
    }
    dirLeft = !dirLeft;
  }

  // 填入 bracket
  seeds.forEach(s => {
    bracket[s.bracketPos] = s;
  });

  return bracket.map(slot => (slot ? slot.userId : null));
}

/**
 * 获取 2 的幂次补齐值
 */
function nextPowerOfTwo(n) {
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 * 根据预选排名排序选手（供 seeding 使用）
 * @param {Array} rankings — calculateQualifierRankings 的输出
 * @returns {Array} — 按 rank 升序的选手列表
 */
function sortByQualifierRank(rankings) {
  return [...rankings].sort((a, b) => a.rank - b.rank).map(r => ({
    userId: r.userId,
    rank: r.rank,
    total: r.total,
  }));
}

module.exports = {
  snakeSeed,
  nextPowerOfTwo,
  sortByQualifierRank,
};
