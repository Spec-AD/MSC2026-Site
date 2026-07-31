// Browser-safe MSC 2026 display data. Secret challenge definitions live on the server.

export const CHALLENGE_TYPE_LABELS = {
  eval: '评价型',
  achievement: '完成型',
  precision: '准度型',
  tolerance: '补全型',
  completion: '补全型',
  combined: '复合型',
};

/** 密锁之墙 & 准锁之墙专用道具池 */
export const ITEMS_WALLS = {
  1: { ref: 1, name: '醒时之钥', type: 'buff', effect: '评价型挑战的评价要求降一级', penalty: null },
  2: { ref: 2, name: '精度裨益', type: 'buff', effect: '准度型挑战的准度要求降两级', penalty: null },
  3: { ref: 3, name: '幸运之钥', type: 'buff', effect: '挑战完成率附加 0.2000% 奖励', penalty: null },
  4: { ref: 4, name: '囚笼套索', type: 'double', effect: '补全型挑战容错要求提升 10', penalty: '失败 → 静默一回合' },
  5: { ref: 5, name: '量子计算器', type: 'buff', effect: '完成型挑战要求减少 0.3000%', penalty: null },
  6: { ref: 6, name: '万能钥匙', type: 'double', effect: '挑战转化为「获得 SSS 及以上」', penalty: '失败 → 下回合无法使用道具' },
  7: { ref: 7, name: '精打细算', type: 'double', effect: 'DX 完成率 +2%、完成率 +0.1000%、GREAT 抵消 2 个', penalty: '失败 → 下回合无法使用道具' },
  8: { ref: 8, name: '鬼面人心', type: 'double', effect: '全体玩家：评价降一级、准度降一级、容错 +5、完成率降 0.2000%（持续1回合）', penalty: null },
  9: { ref: 9, name: '红心', type: 'buff', effect: '提前知道离最近墙壁的挑战内容（不占行动）', penalty: null },
  10: { ref: 10, name: '黑心', type: 'double', effect: '挑战难度强制改为 EXPERT', penalty: '失败 → 回到起点并静默一回合' },
};

/** 叹息之墙专用道具池（弱化版） */
export const ITEMS_SIGH = {
  11: { ref: 11, name: '略显老旧的醒时之钥', type: 'buff', effect: '评价型挑战评价要求 70% 概率降一级', penalty: null, probability: 0.7 },
  12: { ref: 12, name: '纯度略低的精度裨益', type: 'buff', effect: '准度型挑战准度要求降一级', penalty: null },
  13: { ref: 13, name: '尘封已久的幸运之钥', type: 'buff', effect: '挑战完成率附加 0.1000% 奖励', penalty: null },
  14: { ref: 14, name: '异常坚固的囚笼套索', type: 'double', effect: '补全型挑战容错要求提升 5', penalty: '失败 → 静默一回合' },
  15: { ref: 15, name: '老化的量子计算器', type: 'buff', effect: '完成型挑战要求减少 0.1500%', penalty: null },
  16: { ref: 16, name: '不再万能的万能钥匙', type: 'double', effect: '挑战转化为「获得 SSS+ 及以上」', penalty: '失败 → 下两回合无法使用道具' },
  17: { ref: 17, name: '诡计多端的精打细算', type: 'double', effect: 'DX 完成率 +1%、GREAT 抵消 1 个', penalty: '失败 → 下回合无法使用道具' },
  18: { ref: 18, name: '容易被看破的鬼面人心', type: 'double', effect: '全体玩家效果（持续2回合）', penalty: null },
  19: { ref: 19, name: '白色的红心', type: 'buff', effect: '40% 概率知道离最近墙壁的挑战（不占行动）', penalty: null, probability: 0.4 },
  20: { ref: 20, name: '深渊黑心', type: 'double', effect: '挑战难度强制降一级（MASTER 不受影响）', penalty: '失败 → 回到起点并静默一回合' },
};

export const ALL_ITEMS = { ...ITEMS_WALLS, ...ITEMS_SIGH };

export const getItemDef = (itemRef) => ALL_ITEMS[itemRef] || null;

export const STAGE_CONFIG = {
  stage1: { label: '12进6', desc: '淘汰赛', icon: '01' },
  stage2: { label: '6进4', desc: '跑图 · 六边形', icon: '02', mapShape: 'hexagon', layers: 3, wallLabels: ['密锁之墙', '准锁之墙'], totalTimeMs: 60 * 60 * 1000, turnTimeMs: 45 * 1000, playerCount: 6 },
  stage3: { label: '4进2', desc: '跑图 · 正方形', icon: '03', mapShape: 'square', layers: 3, wallLabels: ['叹息之墙', '终局之墙'], totalTimeMs: 45 * 60 * 1000, turnTimeMs: 45 * 1000, playerCount: 4 },
  stage4: { label: '决赛', desc: '2进1', icon: '04' },
};

export const SCORE_LIMITS = {
  achievement: { min: 0, max: 101, decimals: 4 },
  dxScore: { min: 0, max: 2147483647, decimals: 0 },
  perfectBreak: { min: 0, max: 100000, decimals: 0 },
};
