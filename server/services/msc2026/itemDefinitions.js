/**
 * MSC 2026 道具定义（20种，双池）
 *
 * 密锁&准锁池（#1-#10）：阶段二使用
 * 叹息之墙池（#11-#20）：阶段三使用
 *
 * 性质：
 *   buff   — 增益，纯正面
 *   double — 双面，使用后若挑战失败触发惩罚
 *
 * 道具效果通过 apply(challenge, ctx) 函数实现
 * 双面道具额外提供 penalty 对象描述失败惩罚
 */

const { rollProbability } = require('./probabilityRoll');

const ITEM_MAIN_POOL = {
  // ===== #1-#10：密锁之墙 & 准锁之墙 =====

  1: {
    ref: 1,
    name: '醒时之钥',
    type: 'buff',
    description: '评价型挑战的评价要求降一级（AP→FC+→FC）',
    apply(challenge, ctx) {
      if (!challenge.evalRequirement) return challenge;
      const rank = ['FC', 'FC+', 'AP', 'AP+'];
      const idx = rank.indexOf(challenge.evalRequirement);
      if (idx > 0) {
        return { ...challenge, evalRequirement: rank[idx - 1], _modifiedBy: [...(challenge._modifiedBy || []), '醒时之钥'] };
      }
      return challenge;
    }
  },

  2: {
    ref: 2,
    name: '精度裨益',
    type: 'buff',
    description: '准度型挑战的准度要求降两级',
    apply(challenge, ctx) {
      if (!challenge.dxRequirement) return challenge;
      const newReq = Math.max(1, challenge.dxRequirement - 2);
      if (newReq !== challenge.dxRequirement) {
        return { ...challenge, dxRequirement: newReq, _modifiedBy: [...(challenge._modifiedBy || []), '精度裨益'] };
      }
      return challenge;
    }
  },

  3: {
    ref: 3,
    name: '幸运之钥',
    type: 'buff',
    description: '挑战完成率附加 0.2000% 奖励',
    apply(challenge, ctx) {
      const bonus = (challenge._achievementBonus || 0) + 0.2000;
      return { ...challenge, _achievementBonus: bonus, _modifiedBy: [...(challenge._modifiedBy || []), '幸运之钥'] };
    }
  },

  4: {
    ref: 4,
    name: '囚笼套索',
    type: 'double',
    description: '补全型挑战容错要求 +10；失败→静默1回合',
    penalty: { silentTurns: 1 },
    apply(challenge, ctx) {
      if (!challenge.toleranceLimit) return challenge;
      return { ...challenge, toleranceLimit: challenge.toleranceLimit + 10, _modifiedBy: [...(challenge._modifiedBy || []), '囚笼套索'] };
    }
  },

  5: {
    ref: 5,
    name: '量子计算器',
    type: 'buff',
    description: '完成型挑战要求减少 0.3000%',
    apply(challenge, ctx) {
      if (!challenge.threshold) return challenge;
      return { ...challenge, threshold: +(challenge.threshold - 0.3000).toFixed(4), _modifiedBy: [...(challenge._modifiedBy || []), '量子计算器'] };
    }
  },

  6: {
    ref: 6,
    name: '万能钥匙',
    type: 'double',
    description: '挑战转化为「获得 SSS 及以上」；失败→下回合无法使用道具',
    penalty: { disableItemsTurns: 1 },
    apply(challenge, ctx) {
      // 万能钥匙：在曲目不变前提下，将挑战条件重写为 SSS 评价
      // 保留原 songId/songTitle/difficulty 但条件全替换
      return {
        ...challenge,
        type: 'eval',
        evalRequirement: 'SSS',
        threshold: undefined,
        dxRequirement: undefined,
        toleranceType: undefined,
        toleranceLimit: undefined,
        greatMax: undefined,
        extraRequirement: undefined,
        _convertedBy: '万能钥匙',
        _modifiedBy: [...(challenge._modifiedBy || []), '万能钥匙']
      };
    }
  },

  7: {
    ref: 7,
    name: '精打细算',
    type: 'double',
    description: '附加效果：DX完成率+2%、完成率+0.1000%、GREAT及以下抵消2个；失败→下回合禁用道具',
    penalty: { disableItemsTurns: 1 },
    apply(challenge, ctx) {
      const bonus = (challenge._achievementBonus || 0) + 0.1000;
      const dxBonus = (challenge._dxBonus || 0) + 2;
      const greatCancel = (challenge._greatCancel || 0) + 2;
      return {
        ...challenge,
        _achievementBonus: bonus,
        _dxBonus: dxBonus,
        _greatCancel: greatCancel,
        _modifiedBy: [...(challenge._modifiedBy || []), '精打细算']
      };
    }
  },

  8: {
    ref: 8,
    name: '鬼面人心',
    type: 'double',
    description: '全局降难度1回合：评价型降一级、准度型降一级、补全型容错+5、完成型完成率降0.2000%',
    penalty: null, // 效果已作用于全体，无个人惩罚
    globalEffect: true,
    globalDuration: 1, // 持续1回合
    apply(challenge, ctx) {
      let modified = { ...challenge, _modifiedBy: [...(challenge._modifiedBy || []), '鬼面人心'] };
      // 评价型降一级
      if (modified.evalRequirement) {
        const rank = ['FC', 'FC+', 'AP', 'AP+'];
        const idx = rank.indexOf(modified.evalRequirement);
        if (idx > 0) modified.evalRequirement = rank[idx - 1];
      }
      // 准度型降一级
      if (modified.dxRequirement) {
        modified.dxRequirement = Math.max(1, modified.dxRequirement - 1);
      }
      // 补全型容错 +5
      if (modified.toleranceLimit != null) {
        modified.toleranceLimit += 5;
      }
      // 完成型降 0.2000%
      if (modified.threshold != null) {
        modified.threshold = +(modified.threshold - 0.2000).toFixed(4);
      }
      return modified;
    }
  },

  9: {
    ref: 9,
    name: '红心',
    type: 'buff',
    description: '提前知道离最近墙壁的挑战内容（不占行动）',
    isIntel: true, // 情报型，不改挑战条件
    apply(challenge, ctx) {
      return challenge; // pass-through
    }
  },

  10: {
    ref: 10,
    name: '黑心',
    type: 'double',
    description: '挑战难度强制改为 EXPERT；失败→回到起点并静默1回合',
    penalty: { backToLayer0: true, silentTurns: 1 },
    apply(challenge, ctx) {
      return {
        ...challenge,
        difficulty: 'EXPERT',
        _modifiedBy: [...(challenge._modifiedBy || []), '黑心']
      };
    }
  }
};

// ===== #11-#20：叹息之墙专用（弱化版） =====
const ITEM_SIGH_POOL = {
  11: {
    ref: 11,
    name: '略显老旧的醒时之钥',
    type: 'buff',
    probability: 0.70,
    description: '评价型挑战 70%概率评价要求降一级',
    apply(challenge, ctx) {
      if (!challenge.evalRequirement) return challenge;
      const rank = ['FC', 'FC+', 'AP', 'AP+'];
      const idx = rank.indexOf(challenge.evalRequirement);
      if (idx <= 0) return challenge;
      const outcome = (ctx?.rollProbability || rollProbability)(0.70);
      if (outcome.success) {
        return {
          ...challenge,
          evalRequirement: rank[idx - 1],
          _itemOutcome: { status: 'applied', ...outcome },
          _modifiedBy: [...(challenge._modifiedBy || []), '略显老旧的醒时之钥']
        };
      }
      return { ...challenge, _itemOutcome: { status: 'missed', ...outcome } };
    }
  },

  12: {
    ref: 12,
    name: '纯度略低的精度裨益',
    type: 'buff',
    description: '准度型挑战准度要求降一级',
    apply(challenge, ctx) {
      if (!challenge.dxRequirement) return challenge;
      const newReq = Math.max(1, challenge.dxRequirement - 1);
      if (newReq !== challenge.dxRequirement) {
        return { ...challenge, dxRequirement: newReq, _modifiedBy: [...(challenge._modifiedBy || []), '纯度略低的精度裨益'] };
      }
      return challenge;
    }
  },

  13: {
    ref: 13,
    name: '尘封已久的幸运之钥',
    type: 'buff',
    description: '挑战完成率附加 0.1000% 奖励',
    apply(challenge, ctx) {
      const bonus = (challenge._achievementBonus || 0) + 0.1000;
      return { ...challenge, _achievementBonus: bonus, _modifiedBy: [...(challenge._modifiedBy || []), '尘封已久的幸运之钥'] };
    }
  },

  14: {
    ref: 14,
    name: '异常坚固的囚笼套索',
    type: 'double',
    description: '补全型挑战容错 +5；失败→静默1回合',
    penalty: { silentTurns: 1 },
    apply(challenge, ctx) {
      if (!challenge.toleranceLimit) return challenge;
      return { ...challenge, toleranceLimit: challenge.toleranceLimit + 5, _modifiedBy: [...(challenge._modifiedBy || []), '异常坚固的囚笼套索'] };
    }
  },

  15: {
    ref: 15,
    name: '老化的量子计算器',
    type: 'buff',
    description: '完成型挑战要求减少 0.1500%',
    apply(challenge, ctx) {
      if (!challenge.threshold) return challenge;
      return { ...challenge, threshold: +(challenge.threshold - 0.1500).toFixed(4), _modifiedBy: [...(challenge._modifiedBy || []), '老化的量子计算器'] };
    }
  },

  16: {
    ref: 16,
    name: '不再万能的万能钥匙',
    type: 'double',
    description: '挑战转化为「SSS+ 及以上」；失败→下2回合禁用道具',
    penalty: { disableItemsTurns: 2 },
    apply(challenge, ctx) {
      return {
        ...challenge,
        type: 'eval',
        evalRequirement: 'SSS+',
        threshold: undefined,
        dxRequirement: undefined,
        toleranceType: undefined,
        toleranceLimit: undefined,
        greatMax: undefined,
        extraRequirement: undefined,
        _convertedBy: '不再万能的万能钥匙',
        _modifiedBy: [...(challenge._modifiedBy || []), '不再万能的万能钥匙']
      };
    }
  },

  17: {
    ref: 17,
    name: '诡计多端的精打细算',
    type: 'double',
    description: 'DX完成率+1%、完成率+0.1000%、GREAT抵消1个；失败→下回合禁用道具',
    penalty: { disableItemsTurns: 1 },
    apply(challenge, ctx) {
      const bonus = (challenge._achievementBonus || 0) + 0.1000;
      const dxBonus = (challenge._dxBonus || 0) + 1;
      const greatCancel = (challenge._greatCancel || 0) + 1;
      return {
        ...challenge,
        _achievementBonus: bonus,
        _dxBonus: dxBonus,
        _greatCancel: greatCancel,
        _modifiedBy: [...(challenge._modifiedBy || []), '诡计多端的精打细算']
      };
    }
  },

  18: {
    ref: 18,
    name: '容易被看破的鬼面人心',
    type: 'double',
    description: '全局降难度2回合（效果同鬼面人心）',
    penalty: null,
    globalEffect: true,
    globalDuration: 2,
    apply(challenge, ctx) {
      // 同鬼面人心逻辑
      let modified = { ...challenge, _modifiedBy: [...(challenge._modifiedBy || []), '容易被看破的鬼面人心'] };
      if (modified.evalRequirement) {
        const rank = ['FC', 'FC+', 'AP', 'AP+'];
        const idx = rank.indexOf(modified.evalRequirement);
        if (idx > 0) modified.evalRequirement = rank[idx - 1];
      }
      if (modified.dxRequirement) {
        modified.dxRequirement = Math.max(1, modified.dxRequirement - 1);
      }
      if (modified.toleranceLimit != null) {
        modified.toleranceLimit += 5;
      }
      if (modified.threshold != null) {
        modified.threshold = +(modified.threshold - 0.2000).toFixed(4);
      }
      return modified;
    }
  },

  19: {
    ref: 19,
    name: '白色的红心',
    type: 'buff',
    probability: 0.40,
    description: '40%概率知道最近墙壁的挑战（不占行动）',
    isIntel: true,
    apply(challenge, ctx) {
      // 概率由调用方（race engine）处理，这里只标记
      return challenge;
    }
  },

  20: {
    ref: 20,
    name: '深渊黑心',
    type: 'double',
    description: '挑战难度强制降一级（MASTER不受影响）；失败→回到起点+静默1回合',
    penalty: { backToLayer0: true, silentTurns: 1 },
    apply(challenge, ctx) {
      // 仅 MASTER 不受影响，Re:MASTER → MASTER
      if (challenge.difficulty === 'MASTER') {
        return challenge;
      }
      if (challenge.difficulty === 'Re:MASTER') {
        return { ...challenge, difficulty: 'MASTER', _modifiedBy: [...(challenge._modifiedBy || []), '深渊黑心(Re:MASTER→MASTER)'] };
      }
      return {
        ...challenge,
        difficulty: 'EXPERT',
        _modifiedBy: [...(challenge._modifiedBy || []), '深渊黑心']
      };
    }
  }
};

// ===== 池选择 =====
function getItemPool(stage) {
  if (stage === 'stage2') return ITEM_MAIN_POOL;
  if (stage === 'stage3') return ITEM_SIGH_POOL;
  return {};
}

function getItem(ref) {
  return ITEM_MAIN_POOL[ref] || ITEM_SIGH_POOL[ref] || null;
}

// ===== 道具效果叠加引擎 =====
/**
 * 将选手持有的全部生效道具依次 applied 到 challenge 上
 * @param {object} challenge - 原始挑战任务对象
 * @param {Array} itemRefs - 选手持有的道具 ref 列表（已 used 且未失效的）
 * @param {object} ctx - 上下文 { playerId, tournament, stage }
 * @returns {object} 修改后的 challenge
 */
function applyItemEffects(challenge, itemRefs, ctx) {
  return applyItemEffectsDetailed(challenge, itemRefs, ctx).challenge;
}

const EFFECT_FIELDS = [
  ['type', '挑战类型'],
  ['difficulty', '谱面难度'],
  ['evalRequirement', '评价要求'],
  ['threshold', '完成率要求'],
  ['dxRequirement', 'DX星级要求'],
  ['toleranceLimit', '容错上限'],
  ['greatMax', 'GREAT上限'],
  ['_achievementBonus', '完成率判定奖励'],
  ['_dxBonus', 'DX完成率奖励'],
  ['_greatCancel', 'GREAT抵消']
];

function normalizeEffectValue(value) {
  return value == null ? null : value;
}

function getEffectChanges(before, after) {
  return EFFECT_FIELDS.flatMap(([field, label]) => {
    const previous = normalizeEffectValue(before[field]);
    const next = normalizeEffectValue(after[field]);
    if (previous === next) return [];
    return [{ field, label, before: previous, after: next }];
  });
}

function summarizeEffect(status, item, changes, outcome) {
  if (status === 'missed') {
    return `概率判定未命中：掷值 ${(outcome.roll * 100).toFixed(2)}%，需低于 ${(outcome.probability * 100).toFixed(0)}%`;
  }
  if (status === 'not_applicable') return `当前挑战不适用：${item.description}`;
  if (changes.length === 0) return item.description;
  return changes.map(change => `${change.label} ${String(change.before ?? '无')} → ${String(change.after ?? '无')}`).join('；');
}

function applyItemEffectsDetailed(challenge, itemRefs, ctx = {}) {
  let modified = {
    ...challenge,
    _achievementBonus: challenge._achievementBonus || 0,
    _dxBonus: challenge._dxBonus || 0,
    _greatCancel: challenge._greatCancel || 0,
    _modifiedBy: [...(challenge._modifiedBy || [])]
  };
  const effects = [];

  for (const ref of itemRefs) {
    const item = getItem(ref);
    if (item && item.apply) {
      const input = { ...modified };
      delete input._itemOutcome;
      const next = item.apply(input, ctx);
      const outcome = next._itemOutcome || null;
      const changes = getEffectChanges(input, next);
      const status = outcome?.status || (changes.length > 0 ? 'applied' : 'not_applicable');
      effects.push({
        itemRef: item.ref,
        itemName: item.name,
        source: ctx.source || 'personal',
        status,
        description: item.description,
        probability: outcome?.probability ?? item.probability ?? null,
        roll: outcome?.roll ?? null,
        changes,
        summary: summarizeEffect(status, item, changes, outcome),
        penalty: item.penalty || null
      });
      modified = { ...next };
      delete modified._itemOutcome;
    }
  }

  return { challenge: modified, effects };
}

module.exports = {
  ITEM_MAIN_POOL,
  ITEM_SIGH_POOL,
  getItemPool,
  getItem,
  applyItemEffects,
  applyItemEffectsDetailed
};
