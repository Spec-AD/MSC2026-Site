const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Song = require('../models/Song');
const Score = require('../models/Score');
const { authMiddleware } = require('../middleware/auth');

// ==========================================
// 🌟 五维雷达图：玩家提交主观投票
// ==========================================
router.post('/api/songs/:songId/radar/vote', authMiddleware, async (req, res) => {
  try {
    const { diffIndex, values } = req.body;
    const userId = req.user.id || req.user._id;

    // 获取玩家在这首歌这个难度的成绩，用于计算权重
    const score = await Score.findOne({
      userId,
      songId: { $in: [req.params.songId, Number(req.params.songId)] },
      level: Number(diffIndex)
    }).lean();

    // 没有成绩不允许投票
    if (!score) return res.status(403).json({ msg: '您需要先打过这首歌的该难度才能投票' });

    // 计算权重
    const ach = score.achievement || 0;
    let scoreMultiplier = 0.1;
    if (ach >= 100.5) scoreMultiplier = 1.0;
    else if (ach >= 100.0) scoreMultiplier = 0.85;
    else if (ach >= 99.0) scoreMultiplier = 0.7;
    else if (ach >= 97.0) scoreMultiplier = 0.5;
    else if (ach >= 94.0) scoreMultiplier = 0.35;
    else if (ach >= 90.0) scoreMultiplier = 0.2;

    const user = await User.findById(userId).select('rating').lean();
    const ratingMultiplier = Math.min(1.0, Math.max(0.1, (user.rating || 1000) / 16000));
    const weight = parseFloat((scoreMultiplier * (0.5 + 0.5 * ratingMultiplier)).toFixed(4));

    const DIMS = ['stamina', 'tech', 'stable', 'accuracy', 'burst'];
    const validated = {};
    DIMS.forEach(dim => {
      const v = parseFloat(values[dim]);
      validated[dim] = isNaN(v) ? 5 : Math.min(10, Math.max(0, Math.round(v * 10) / 10));
    });

    const song = await Song.findOne({ id: req.params.songId });
    if (!song) return res.status(404).json({ msg: '曲目不存在' });

    if (!song.radarVotes) song.radarVotes = {};
    if (!song.radarVotes[diffIndex]) song.radarVotes[diffIndex] = [];

    // 更新或新增投票（每个玩家每个难度只有一票）
    const existingIdx = song.radarVotes[diffIndex].findIndex(v => String(v.userId) === String(userId));
    const voteEntry = { userId, weight, values: validated, createdAt: new Date() };

    if (existingIdx >= 0) song.radarVotes[diffIndex][existingIdx] = voteEntry;
    else song.radarVotes[diffIndex].push(voteEntry);

    song.markModified('radarVotes');
    await song.save();

    res.json({ msg: '投票已记录', weight });
  } catch (err) {
    console.error('投票失败:', err);
    res.status(500).json({ msg: '投票失败' });
  }
});

// ==========================================
// 🌟 五维雷达图：获取当前玩家的投票记录
// ==========================================
router.get('/api/songs/:songId/radar/my-vote', authMiddleware, async (req, res) => {
  try {
    const { diffIndex } = req.query;
    const userId = req.user.id || req.user._id;

    const song = await Song.findOne({ id: req.params.songId }).select('radarVotes').lean();
    if (!song) return res.status(404).json({ msg: '曲目不存在' });

    const votes = (song.radarVotes && song.radarVotes[diffIndex]) || [];
    const myVote = votes.find(v => String(v.userId) === String(userId));

    res.json({ myVote: myVote ? myVote.values : null });
  } catch (err) {
    res.status(500).json({ msg: '获取失败' });
  }
});




module.exports = router;
