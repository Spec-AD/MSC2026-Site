// server/utils/pfCalculator.js

/**
 * @param {number} constant - 谱面定数 (如 14.5)
 * @param {number} achievementRate - 达成率 (如 100.5)
 * @param {number} dxScore - 玩家实际获得的 DX 分数
 * @param {number} maxDxScore - 谱面理论满 DX 分数 (总物量 * 3)
 */
function calculatePF(constant, achievementRate, dxScore, maxDxScore) {
  // 防御性编程，避免除以0
  const dxRatio = maxDxScore > 0 ? (dxScore / maxDxScore) : 0;
  
  // 1. 合成综合 PF 率 (满分 101)
  const pfRate = (achievementRate * 0.51) + ((dxRatio * 100) * 0.4949);

  // 2. 难度基准分 (Base PF)
  let basePF = 0;
  if (constant >= 10) {
    basePF = 70 * Math.pow(1.9, constant - 10);
  } else {
    basePF = 70 * (constant / 10);
  }

  // 3. 断崖衰减乘区
  let multiplier = 0;
  if (pfRate >= 100) {
    const ratio = Math.min(1, pfRate - 100);
    multiplier = 0.5 + 0.5 * Math.pow(ratio, 2);
  } else if (pfRate >= 97) {
    const ratio = (pfRate - 97) / 3;
    multiplier = 0.05 + 0.45 * Math.pow(ratio, 2.5);
  } else {
    const ratio = Math.max(0, pfRate - 90) / 7;
    multiplier = 0.05 * Math.pow(ratio, 2);
  }

  return Number((basePF * multiplier).toFixed(2));
}

module.exports = { calculatePF };