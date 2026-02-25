// server/utils/pfCalculator.js

/**
 * Purebeat Performance Formula (PPF) 核心计算引擎
 * @param {number} constant - 谱面定数 (如 14.5)
 * @param {number} achievementRate - 达成率 (如 100.5)
 * @param {number} dxScore - 玩家实际获得的 DX 分数
 * @param {number} maxDxScore - 谱面理论满 DX 分数 (总物量 * 3)
 */
function calculatePF(constant, achievementRate, dxScore, maxDxScore) {
  // 防御性校验
  if (!constant || !achievementRate || constant <= 0) return 0;

  // 1. 🌟 难度基数：三次幂成长 (定数 - 5)^3
  // 完美实现“低难度无感，高难度天堑”
  const baseDiff = Math.pow(Math.max(0, constant - 5), 3);

  // 2. 🎯 达成率乘区 (最大 0.6)
  let accMultiplier = 0;
  if (achievementRate >= 101.0) {
    accMultiplier = 0.60;
  } else if (achievementRate >= 100.0) {
    // 100% ~ 101%：极限凹函数，从 0.4 增长到 0.6
    const progress = (achievementRate - 100.0) / 1.0;
    accMultiplier = 0.40 + 0.20 * Math.pow(progress, 2);
  } else if (achievementRate >= 97.0) {
    // 97% ~ 100%：平滑凹函数，从 0.1 增长到 0.4
    const progress = (achievementRate - 97.0) / 3.0;
    accMultiplier = 0.10 + 0.30 * Math.pow(progress, 2);
  } else if (achievementRate >= 80.0) {
    // 80% ~ 97%：糊分惩罚区，从 0 艰难爬到 0.1
    const progress = (achievementRate - 80.0) / 17.0;
    accMultiplier = 0.10 * Math.pow(progress, 2);
  } else {
    // < 80%：无收益
    accMultiplier = 0;
  }

  // 3. ✨ DX 分乘区 (最大 0.4)
  let dxMult = 0;
  if (maxDxScore > 0) {
    const dxRatio = dxScore / maxDxScore;
    // 使用平方成长，让高 DX 占比获得非线性的巨大奖励
    dxMult = 0.40 * Math.pow(dxRatio, 2);
  }

  // 4. 🚀 最终结算
  // 基数 * (达成率乘区 + DX乘区)
  const pf = baseDiff * (accMultiplier + dxMult);

  return Number(pf.toFixed(2));
}

module.exports = { calculatePF };