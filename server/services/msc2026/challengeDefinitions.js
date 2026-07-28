/**
 * MSC 2026 第一道墙随机挑战池（33 条）与第二道墙固定挑战
 * stage2 与 stage3 各自独立实例化，互不干扰
 *
 * 任务类型：
 *   eval        — 评价型（FC/FC+/AP/AP+）
 *   achievement — 完成型（完成率阈值）
 *   precision   — 准度型（DX 星数）
 *   completion  — 补全型（容错/GREAT数量限制）
 *   combined    — 复合型（评价+准度 / 评价+补全）
 */

const CHALLENGE_TASKS = [
  {
    id: 1,
    name: '江江，来比个耶~',
    description: '在 Radiance[MASTER] 谱面中取得 AP',
    type: 'eval',
    songTitle: 'Radiance',
    difficulty: 'MASTER',
    evalRequirement: 'AP'
  },
  {
    id: 2,
    name: 'How to challenge 音ゲ～曲！',
    description: '在 How To Make 音ゲ～曲！[MASTER] 谱面中取得 AP',
    type: 'eval',
    songTitle: 'How To Make 音ゲ～曲！',
    difficulty: 'MASTER',
    evalRequirement: 'AP'
  },
  {
    id: 3,
    name: '深奥的2112112...',
    description: '在 Abstruse Dilemma[MASTER] 谱面中取得 100.9200% 及以上',
    type: 'achievement',
    songTitle: 'Abstruse Dilemma',
    difficulty: 'MASTER',
    threshold: 100.9200
  },
  {
    id: 4,
    name: '蛋~白~泥~',
    description: '在 オーバーライド[MASTER] 谱面中取得 DX 5星准度',
    type: 'precision',
    songTitle: 'オーバーライド',
    difficulty: 'MASTER',
    dxRequirement: 5
  },
  {
    id: 5,
    name: '一个女孩拿着一把枪是什么歌',
    description: '在 snooze[MASTER] 谱面中取得 AP',
    type: 'eval',
    songTitle: 'snooze',
    difficulty: 'MASTER',
    evalRequirement: 'AP'
  },
  {
    id: 6,
    name: '天马咲希的礼物',
    description: '在 てらてら[MASTER] 谱面中取得 AP+ 且 DX 5星',
    type: 'combined',
    songTitle: 'てらてら',
    difficulty: 'MASTER',
    evalRequirement: 'AP+',
    dxRequirement: 5
  },
  {
    id: 7,
    name: '我想成为世界大明星！',
    description: '在 シリウスの輝きのように[Re:MASTER] 谱面中取得 AP',
    type: 'eval',
    songTitle: 'シリウスの輝きのように',
    difficulty: 'Re:MASTER',
    evalRequirement: 'AP'
  },
  {
    id: 8,
    name: '只是黑人变成了猫娘',
    description: '在 Divide et impera![MASTER] 谱面中取得 100.8400% 及以上',
    type: 'achievement',
    songTitle: 'Divide et impera!',
    difficulty: 'MASTER',
    threshold: 100.8400
  },
  {
    id: 9,
    name: '合上你的天灵盖',
    description: '在 天蓋[MASTER] 谱面中取得 AP',
    type: 'eval',
    songTitle: '天蓋',
    difficulty: 'MASTER',
    evalRequirement: 'AP'
  },
  {
    id: 10,
    name: '玄奥之密',
    description: '在 Cryptarithm[MASTER] 谱面中取得 FC+ 且 Great ≤ 3',
    type: 'combined',
    songTitle: 'Cryptarithm',
    difficulty: 'MASTER',
    evalRequirement: 'FC+',
    greatMax: 3
  },
  {
    id: 11,
    name: '萤火之森',
    description: '在 マツヨイナイトバグ[Re:MASTER] 谱面中取得 AP',
    type: 'eval',
    songTitle: 'マツヨイナイトバグ',
    difficulty: 'Re:MASTER',
    evalRequirement: 'AP'
  },
  {
    id: 12,
    name: '在鸟居前的狐面女孩',
    description: '在 美夜月鏡[MASTER] 谱面中取得 DX 4星及以上',
    type: 'precision',
    songTitle: '美夜月鏡',
    difficulty: 'MASTER',
    dxRequirement: 4
  },
  {
    id: 13,
    name: '东方走马灯',
    description: '在 Ultimate taste[MASTER] 谱面中非完美绝赞数 ≤ 5',
    type: 'completion',
    songTitle: 'Ultimate taste',
    difficulty: 'MASTER',
    toleranceType: 'nonPerfect',
    toleranceLimit: 5
  },
  {
    id: 14,
    name: 'DeepSeek "C"hatGPT',
    description: '在 Ai C[MASTER] 谱面中 Great 数目 ≤ 1',
    type: 'completion',
    songTitle: 'Ai C',
    difficulty: 'MASTER',
    toleranceType: 'great',
    toleranceLimit: 1
  },
  {
    id: 15,
    name: '暴力美学',
    description: '在 RondeauX of RagnaroQ[MASTER] 谱面中 Great 数目 ≤ 3',
    type: 'completion',
    songTitle: 'RondeauX of RagnaroQ',
    difficulty: 'MASTER',
    toleranceType: 'great',
    toleranceLimit: 3
  },
  {
    id: 16,
    name: 'R属于实数',
    description: '在 ℝ∈Χ LUNATiCA[MASTER] 谱面中取得 FC+',
    type: 'eval',
    songTitle: 'ℝ∈Χ LUNATiCA',
    difficulty: 'MASTER',
    evalRequirement: 'FC+'
  },
  {
    id: 17,
    name: '手握节拍器',
    description: '在 QUATTUORUX[MASTER] 谱面中非完美绝赞数 ≤ 20',
    type: 'completion',
    songTitle: 'QUATTUORUX',
    difficulty: 'MASTER',
    toleranceType: 'nonPerfect',
    toleranceLimit: 20
  },
  {
    id: 18,
    name: '我说的X不是这个[X]',
    description: '在 Re:Unknown X[MASTER] 谱面中取得 FC+ 且 DX 3星+',
    type: 'combined',
    songTitle: 'Re:Unknown X',
    difficulty: 'MASTER',
    evalRequirement: 'FC+',
    dxRequirement: 3
  },
  {
    id: 19,
    name: '这是一首 AT16',
    description: '在 INFiNiTE ENERZY -Overdoze-[MASTER] 谱面中取得 DX 5星准度',
    type: 'precision',
    songTitle: 'INFiNiTE ENERZY -Overdoze-',
    difficulty: 'MASTER',
    dxRequirement: 5
  },
  {
    id: 20,
    name: '咋咋咋咋咋木咋',
    description: '在 ザムザ[MASTER] 谱面中取得 AP+ 且 DX 5星',
    type: 'combined',
    songTitle: 'ザムザ',
    difficulty: 'MASTER',
    evalRequirement: 'AP+',
    dxRequirement: 5
  },
  {
    id: 21,
    name: '剿灭？！',
    description: '在 勦滅[MASTER] 谱面中取得 100.9500% 及以上',
    type: 'achievement',
    songTitle: '勦滅',
    difficulty: 'MASTER',
    threshold: 100.9500
  },
  {
    id: 22,
    name: '天苍苍，野茫茫',
    description: '在 PANDORA PARADOXXX[Re:MASTER] 谱面中取得 100.5000% 及以上',
    type: 'achievement',
    songTitle: 'PANDORA PARADOXXX',
    difficulty: 'Re:MASTER',
    threshold: 100.5000
  },
  {
    id: 23,
    name: '夜颜醉',
    description: '在 Yorugao[MASTER] 谱面中取得 DX 4星及以上',
    type: 'precision',
    songTitle: 'Yorugao',
    difficulty: 'MASTER',
    dxRequirement: 4
  },
  {
    id: 24,
    name: '七岁小孩都能鸟',
    description: '在 BLACK SWAN[MASTER] 谱面中取得 100.9000% 及以上',
    type: 'achievement',
    songTitle: 'BLACK SWAN',
    difficulty: 'MASTER',
    threshold: 100.9000
  },
  {
    id: 25,
    name: '星的咏唱者',
    description: '在 星詠みとデスペラード[MASTER] 谱面中非完美绝赞数 ≤ 2',
    type: 'completion',
    songTitle: '星詠みとデスペラード',
    difficulty: 'MASTER',
    toleranceType: 'nonPerfect',
    toleranceLimit: 2
  },
  {
    id: 26,
    name: '兄弟提一把',
    description: '在 TiamaT:F minor[MASTER] 谱面中 GREAT及以下 ≤ 6',
    type: 'completion', songTitle: 'TiamaT:F minor', difficulty: 'MASTER',
    toleranceType: 'greatOrBelow', toleranceLimit: 6
  },
  {
    id: 27,
    name: 'YOSHIKI附体',
    description: '在 Our Wrenally[MASTER] 谱面中取得 AP+',
    type: 'eval', songTitle: 'Our Wrenally', difficulty: 'MASTER', evalRequirement: 'AP+'
  },
  {
    id: 28,
    name: '艺术就是爆炸！',
    description: '在 脳天直撃[MASTER] 谱面中取得 100.9000% 及以上',
    type: 'achievement', songTitle: '脳天直撃', difficulty: 'MASTER', threshold: 100.9000
  },
  {
    id: 29,
    name: '我上早八',
    description: '在 QuiQ[MASTER] 谱面中非完美 BREAK 数 ≤ 8',
    type: 'completion', songTitle: 'QuiQ', difficulty: 'MASTER',
    toleranceType: 'nonPerfectBreak', toleranceLimit: 8
  },
  {
    id: 30,
    name: '舞萌科目二',
    description: '在 ウミユリ海底譚[MASTER] 谱面中取得 AP+ 且 DX 5星',
    type: 'combined', songTitle: 'ウミユリ海底譚', difficulty: 'MASTER',
    evalRequirement: 'AP+', dxRequirement: 5
  },
  {
    id: 31,
    name: '404 Mother-No-Found',
    description: '在 Good bye, Merry-Go-Round.[MASTER] 谱面中取得 AP',
    type: 'eval', songTitle: 'Good bye, Merry-Go-Round.', difficulty: 'MASTER', evalRequirement: 'AP'
  },
  {
    id: 32,
    name: '崩坏：星穹铁道',
    description: '在 CO5M1C R4ILR0AD[MASTER] 谱面中取得 AP',
    type: 'eval', songTitle: 'CO5M1C R4ILR0AD', difficulty: 'MASTER', evalRequirement: 'AP'
  },
  {
    id: 33,
    name: '你爹来咯',
    description: '在 ≠彡"/了→[MASTER] 谱面中非完美 BREAK 数 ≤ 15',
    type: 'completion', songTitle: '≠彡"/了→', difficulty: 'MASTER',
    toleranceType: 'nonPerfectBreak', toleranceLimit: 15
  }
];

const FIXED_WALL_CHALLENGES = {
  stage2: {
    id: 201,
    name: '6进4 最终墙',
    description: '在 最強 STRONGER[MASTER] 谱面中取得 DX 4星及以上',
    type: 'precision', songTitle: '最強 STRONGER', difficulty: 'MASTER', dxRequirement: 4,
    fixed: true
  },
  stage3: {
    id: 301,
    name: '4进2 最终墙',
    description: '在 氷滅の135小節[MASTER] 谱面中取得 AP',
    type: 'eval', songTitle: '氷滅の135小節', difficulty: 'MASTER', evalRequirement: 'AP',
    fixed: true
  }
};

/**
 * 根据 songTitle 查找 Song._id（管理员配置阶段调用）
 * @param {object} songMap - { songTitle: Song._id } 映射表
 * @returns {Array} 注入了 songId 的任务列表
 */
function resolveSongIds(songMap) {
  return CHALLENGE_TASKS.map(task => {
    const songId = songMap[task.songTitle] || null;
    return { ...task, songId };
  });
}

/**
 * 深拷贝一份任务池（每次 raceInit 调用）
 * 返回 { allTasks[], remainingIds[], usedIds[] }
 */
function createTaskPool(songMap) {
  const tasks = resolveSongIds(songMap);
  const allIds = tasks.map(t => t.id);
  // Fisher-Yates shuffle
  for (let i = allIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allIds[i], allIds[j]] = [allIds[j], allIds[i]];
  }
  return {
    taskMap: Object.fromEntries(tasks.map(t => [t.id, t])),
    remaining: [...allIds],
    used: [],
    fallbackCount: 0
  };
}

module.exports = { CHALLENGE_TASKS, FIXED_WALL_CHALLENGES, resolveSongIds, createTaskPool };
