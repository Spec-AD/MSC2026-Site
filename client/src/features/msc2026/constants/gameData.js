// ============================================================
// gameData.js — MSC 2026 挑战任务库 & 道具常量 & 赛事配置
// 来源：清音需求 v1.2 + 琉璃后端 v1.1
// ============================================================

/**
 * 判定等级体系
 * 前端展示用，后端权威计算
 */
export const RANK_ORDER = {
  C: 0, B: 1, BB: 2, BBB: 3, A: 4, AA: 5, AAA: 6,
  S: 7, 'S+': 8, SS: 9, 'SS+': 10, SSS: 11, 'SSS+': 12,
};

export const EVAL_ORDER = { FC: 0, 'FC+': 1, AP: 2, 'AP+': 3 };

export const DIFFICULTY_ORDER = { EXPERT: 0, MASTER: 1, 'Re:MASTER': 2 };

// ============================================================
// 挑战任务库（25 条）
// ============================================================
export const CHALLENGE_TASKS = {
  1: {
    id: 1,
    name: '江江，来比个耶~',
    description: 'Radiance [MASTER] 取得 AP',
    type: 'eval',
    evalRequirement: 'AP',
    difficulty: 'MASTER',
    songTitle: 'Radiance',
  },
  2: {
    id: 2,
    name: 'How to challenge 音ゲ～曲！',
    description: 'How To Make 音ゲ～曲！[MASTER] 取得 AP',
    type: 'eval',
    evalRequirement: 'AP',
    difficulty: 'MASTER',
    songTitle: 'How To Make 音ゲ～曲！',
  },
  3: {
    id: 3,
    name: '深奥的2112112...',
    description: 'Abstruse Dilemma [MASTER] 取得 100.9200%+',
    type: 'achievement',
    threshold: 100.92,
    difficulty: 'MASTER',
    songTitle: 'Abstruse Dilemma',
  },
  4: {
    id: 4,
    name: '蛋~白~泥~',
    description: 'オーバーライド [MASTER] 取得 DX 5 星准度',
    type: 'precision',
    dxRequirement: 5,
    difficulty: 'MASTER',
    songTitle: 'オーバーライド',
  },
  5: {
    id: 5,
    name: '一个女孩拿着一把枪是什么歌',
    description: 'snooze [MASTER] 取得 AP',
    type: 'eval',
    evalRequirement: 'AP',
    difficulty: 'MASTER',
    songTitle: 'snooze',
  },
  6: {
    id: 6,
    name: '天马咲希的礼物',
    description: 'てらてら [MASTER] 取得 AP+ 且 5 星',
    type: 'eval',
    evalRequirement: 'AP+',
    extraRequirement: { type: 'precision', dxRequirement: 5 },
    difficulty: 'MASTER',
    songTitle: 'てらてら',
  },
  7: {
    id: 7,
    name: '我想成为世界大明星！',
    description: 'シリウスの輝きのように [Re:MASTER] 取得 AP',
    type: 'eval',
    evalRequirement: 'AP',
    difficulty: 'Re:MASTER',
    songTitle: 'シリウスの輝きのように',
  },
  8: {
    id: 8,
    name: '只是黑人变成了猫娘',
    description: 'Divide et impera! [MASTER] 取得 100.8400%+',
    type: 'achievement',
    threshold: 100.84,
    difficulty: 'MASTER',
    songTitle: 'Divide et impera!',
  },
  9: {
    id: 9,
    name: '合上你的天灵盖',
    description: '天蓋 [MASTER] 取得 AP',
    type: 'eval',
    evalRequirement: 'AP',
    difficulty: 'MASTER',
    songTitle: '天蓋',
  },
  10: {
    id: 10,
    name: '玄奥之密',
    description: 'Cryptarithm [MASTER] 取得 FC+ 且 Great ≤ 3',
    type: 'eval',
    evalRequirement: 'FC+',
    extraRequirement: { type: 'tolerance', toleranceLimit: 3 },
    difficulty: 'MASTER',
    songTitle: 'Cryptarithm',
  },
  11: {
    id: 11,
    name: '萤火之森',
    description: 'マツヨイナイトバグ [Re:MASTER] 取得 AP',
    type: 'eval',
    evalRequirement: 'AP',
    difficulty: 'Re:MASTER',
    songTitle: 'マツヨイナイトバグ',
  },
  12: {
    id: 12,
    name: '在鸟居前的狐面女孩',
    description: '美夜月鏡 [MASTER] 取得 DX 4 星及以上',
    type: 'precision',
    dxRequirement: 4,
    difficulty: 'MASTER',
    songTitle: '美夜月鏡',
  },
  13: {
    id: 13,
    name: '东方走马灯',
    description: 'Ultimate taste [MASTER] 非完美绝赞数 ≤ 5',
    type: 'tolerance',
    toleranceLimit: 5,
    difficulty: 'MASTER',
    songTitle: 'Ultimate taste',
  },
  14: {
    id: 14,
    name: 'DeepSeek "C"hatGPT',
    description: 'Ai C [MASTER] Great 数目 ≤ 1',
    type: 'tolerance',
    toleranceType: 'great',
    toleranceLimit: 1,
    difficulty: 'MASTER',
    songTitle: 'Ai C',
  },
  15: {
    id: 15,
    name: '暴力美学',
    description: 'RondeauX of RagnaroQ [MASTER] Great 数目 ≤ 3',
    type: 'tolerance',
    toleranceType: 'great',
    toleranceLimit: 3,
    difficulty: 'MASTER',
    songTitle: 'RondeauX of RagnaroQ',
  },
  16: {
    id: 16,
    name: 'R属于实数',
    description: 'ℝ∈Χ LUNATiCA [MASTER] 取得 FC+',
    type: 'eval',
    evalRequirement: 'FC+',
    difficulty: 'MASTER',
    songTitle: 'ℝ∈Χ LUNATiCA',
  },
  17: {
    id: 17,
    name: '手握节拍器',
    description: 'QUATTUORUX [MASTER] 非完美绝赞数 ≤ 20',
    type: 'tolerance',
    toleranceLimit: 20,
    difficulty: 'MASTER',
    songTitle: 'QUATTUORUX',
  },
  18: {
    id: 18,
    name: '我说的X不是这个[X]',
    description: 'Re:Unknown X [MASTER] FC+ 且 DX 3 星+',
    type: 'eval',
    evalRequirement: 'FC+',
    extraRequirement: { type: 'precision', dxRequirement: 3 },
    difficulty: 'MASTER',
    songTitle: 'Re:Unknown X',
  },
  19: {
    id: 19,
    name: '这是一首 AT16',
    description: 'INFiNiTE ENERZY -Overdoze- [MASTER] DX 5 星准度',
    type: 'precision',
    dxRequirement: 5,
    difficulty: 'MASTER',
    songTitle: 'INFiNiTE ENERZY -Overdoze-',
  },
  20: {
    id: 20,
    name: '咋咋咋咋咋木咋',
    description: 'ザムザ [MASTER] AP+ 且 DX 5 星',
    type: 'eval',
    evalRequirement: 'AP+',
    extraRequirement: { type: 'precision', dxRequirement: 5 },
    difficulty: 'MASTER',
    songTitle: 'ザムザ',
  },
  21: {
    id: 21,
    name: '剿灭？！',
    description: '勦滅 [MASTER] 取得 100.9500%+',
    type: 'achievement',
    threshold: 100.95,
    difficulty: 'MASTER',
    songTitle: '勦滅',
  },
  22: {
    id: 22,
    name: '天苍苍，野茫茫',
    description: 'PANDORA PARADOXXX [Re:MASTER] 取得 100.5000%+',
    type: 'achievement',
    threshold: 100.5,
    difficulty: 'Re:MASTER',
    songTitle: 'PANDORA PARADOXXX',
  },
  23: {
    id: 23,
    name: '夜颜醉',
    description: 'Yorugao [MASTER] 取得 DX 4 星+',
    type: 'precision',
    dxRequirement: 4,
    difficulty: 'MASTER',
    songTitle: 'Yorugao',
  },
  24: {
    id: 24,
    name: '七岁小孩都能鸟',
    description: 'BLACK SWAN [MASTER] 取得 100.9000%+',
    type: 'achievement',
    threshold: 100.9,
    difficulty: 'MASTER',
    songTitle: 'BLACK SWAN',
  },
  25: {
    id: 25,
    name: '星的咏唱者',
    description: '星詠みとデスペラード [MASTER] 非完美绝赞数 ≤ 2',
    type: 'tolerance',
    toleranceLimit: 2,
    difficulty: 'MASTER',
    songTitle: '星詠みとデスペラード',
  },
};

/**
 * 根据 taskId 获取挑战任务详情
 */
export const getChallengeTask = (taskId) => CHALLENGE_TASKS[taskId] || null;

/**
 * 获取挑战任务类型的中文标签
 */
export const CHALLENGE_TYPE_LABELS = {
  eval: '评价型',
  achievement: '完成型',
  precision: '准度型',
  tolerance: '补全型',
};

// ============================================================
// 道具常量（20 种）
// ============================================================

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

/** 合并全部道具 */
export const ALL_ITEMS = { ...ITEMS_WALLS, ...ITEMS_SIGH };

/**
 * 根据 itemRef 获取道具详情
 */
export const getItemDef = (itemRef) => ALL_ITEMS[itemRef] || null;

// ============================================================
// 阶段/地图配置
// ============================================================

export const STAGE_CONFIG = {
  stage1: { label: '12进6', desc: '淘汰赛', icon: '⚔️' },
  stage2: { label: '6进4', desc: '跑图 · 六边形', icon: '⬡', mapShape: 'hexagon', layers: 3, wallLabels: ['密锁之墙', '准锁之墙'], totalTimeMs: 45 * 60 * 1000, turnTimeMs: 45 * 1000, playerCount: 6 },
  stage3: { label: '4进2', desc: '跑图 · 正方形', icon: '⬜', mapShape: 'square', layers: 2, wallLabels: ['叹息之墙'], totalTimeMs: 25 * 60 * 1000, turnTimeMs: 45 * 1000, playerCount: 4 },
  stage4: { label: '决赛', desc: '2进1', icon: '👑' },
};

export const SCORE_LIMITS = {
  achievement: { min: 0, max: 101, decimals: 4 },
  dxScore: { min: 0, max: 2147483647, decimals: 0 },
  perfectRate: { min: 0, max: 100, decimals: 2 },
};

export const CHALLENGE_TYPE_LABELS_DETAIL = {
  eval: '评价型',
  achievement: '完成型',
  precision: '准度型',
  tolerance: '补全型',
};
