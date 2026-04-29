const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Song = require('../models/Song');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

// ==========================================
// 🌟 五维雷达图：获取单曲的全局雷达数据
// ==========================================
router.get('/api/songs/:songId/radar', async (req, res) => {
  try {
    const song = await Song.findOne({ id: req.params.songId }).select('radarStats radarVotes charts level type').lean();
    if (!song) return res.status(404).json({ msg: '曲目不存在' });

    // 贝叶斯平滑系数 C（相当于 C 个高权重玩家的分量）
    const BAYESIAN_C = 10;
    const DIMS = ['stamina', 'tech', 'stable', 'accuracy', 'burst'];
    // 计算每个难度的最终展示数值
    const finalRadar = {};
    const diffCount = song.level ? song.level.length : 5;

    for (let diffIdx = 0; diffIdx < diffCount; diffIdx++) {
      const base = (song.radarStats && song.radarStats[diffIdx]) || null;
      const votes = (song.radarVotes && song.radarVotes[diffIdx]) || [];

      if (!base && votes.length === 0) {
        finalRadar[diffIdx] = null;
        continue;
      }

      const baseValues = base || { stamina: 5, tech: 5, stable: 5, accuracy: 5, burst: 5 };

      // 如果没有玩家投票，直接使用 base 值
      if (votes.length === 0) {
        finalRadar[diffIdx] = { ...baseValues, voteCount: 0, isBaseOnly: true };
        continue;
      }

      // 截尾平均：去掉最高 15% 和最低 15%
      const trimRatio = 0.15;
      const result = {};

      DIMS.forEach(dim => {
        const allVals = votes
          .filter(v => v.values && v.values[dim] !== undefined)
          .map(v => ({ val: v.values[dim], w: v.weight || 1 }))
          .sort((a, b) => a.val - b.val);

        if (allVals.length === 0) {
          result[dim] = baseValues[dim] || 5;
          return;
        }

        const trimCount = Math.floor(allVals.length * trimRatio);
        const trimmed = allVals.slice(trimCount, allVals.length - trimCount);

        let weightedSum = 0, totalWeight = 0;
        trimmed.forEach(({ val, w }) => { weightedSum += val * w; totalWeight += w; });

        const mu = totalWeight > 0 ? weightedSum / totalWeight : baseValues[dim];

        // 贝叶斯平滑融合
        const final = (BAYESIAN_C * (baseValues[dim] || 5) + totalWeight * mu) / (BAYESIAN_C + totalWeight);
        result[dim] = Math.round(final * 10) / 10;
      });

      finalRadar[diffIdx] = { ...result, voteCount: votes.length };
    }

    res.json({
      songId: req.params.songId,
      radarStats: song.radarStats || {},
      finalRadar
    });
  } catch (err) {
    console.error('获取雷达图数据失败:', err);
    res.status(500).json({ msg: '获取雷达图数据失败' });
  }
});

// ==========================================
// 🌟 五维雷达图：管理员设置基础锚点值
// ==========================================
router.put('/api/songs/:songId/radar/base', authMiddleware, async (req, res) => {
  try {
    const adminUser = await User.findById(req.user.id || req.user._id);
    if (!adminUser || adminUser.role !== 'ADM') return res.status(403).json({ msg: '权限不足' });

    const { diffIndex, values } = req.body;
    // values: { stamina, tech, stable, accuracy, burst } 每项 0~10
    const DIMS = ['stamina', 'tech', 'stable', 'accuracy', 'burst'];
    const validated = {};
    DIMS.forEach(dim => {
      const v = parseFloat(values[dim]);
      validated[dim] = isNaN(v) ? 5 : Math.min(10, Math.max(0, Math.round(v * 10) / 10));
    });

    const song = await Song.findOne({ id: req.params.songId });
    if (!song) return res.status(404).json({ msg: '曲目不存在' });

    if (!song.radarStats) song.radarStats = {};
    song.radarStats[diffIndex] = validated;
    song.markModified('radarStats');
    await song.save();

    res.json({ msg: '基础雷达图已更新', radarStats: song.radarStats });
  } catch (err) {
    console.error('更新雷达图失败:', err);
    res.status(500).json({ msg: '更新失败' });
  }
});


module.exports = router;
