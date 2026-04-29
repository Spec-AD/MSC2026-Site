const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Score = require('../models/Score');
const ChunithmScore = require('../models/ChunithmScore');
const { addXp, authMiddleware, optionalAuth } = require('../middleware/auth');

router.get('/api/songs/:songId/leaderboard', optionalAuth, async (req, res) => {
  try {
    const { level, scope, game } = req.query;
    const songId = req.params.songId;

    let query = { songId: { $in: [String(songId), Number(songId)] } };   
    
    if (level !== undefined && !isNaN(Number(level))) {
        query.level = Number(level);
    }

    if (game === 'chunithm') {
        query.score = { $gt: 0 };
    }

    if (scope === 'friends') {
      if (!req.user) return res.status(401).json({ msg: '请先登录以查看好友排行榜' });
      const currentUser = await User.findById(req.user.id);
      
      if (!currentUser || (currentUser.sponsorTier || 0) < 1) {
        return res.status(403).json({ msg: '好友特权需要 赞助者 Tier 1 或以上' });
      }
      
      const friendIds = currentUser.friends || [];
      query.userId = { $in: [...friendIds, currentUser._id] };
    }

    const Model = game === 'chunithm' ? ChunithmScore : Score;
    const sortCriteria = game === 'chunithm' ? { score: -1, finishTime: 1 } : { achievement: -1, dxScore: -1 };

    const scores = await Model.find(query)
      .sort(sortCriteria)
      .limit(100)
      .populate('userId', 'username avatarUrl uid sponsorTier role nickname')
      .lean();

    const formattedScores = scores.map(s => ({
      ...s,
      username: s.userId?.username || s.nickname || 'Unknown Player',
      avatarUrl: s.userId?.avatarUrl,
      uid: s.userId?.uid,
      sponsorTier: s.userId?.sponsorTier,
      role: s.userId?.role,
      fcStatus: s.fc || s.fcStatus || '',
      fsStatus: s.fs || s.fsStatus || ''
    }));

    res.json(formattedScores);
  } catch (err) {
    console.error('[单曲排行榜报错]', err);
    res.status(500).json({ msg: '获取单曲排行榜失败' });
  }
});


module.exports = router;
