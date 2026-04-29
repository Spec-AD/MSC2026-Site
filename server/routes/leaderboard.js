const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

router.get('/api/leaderboard/:type', async (req, res) => {
  try {
    const type = req.params.type;
    const { game, mode } = req.query; 

    // osu! 特殊处理逻辑（兼容新旧数据）
    if (type === 'pf' && game === 'osu') {
      const currentMode = mode || 'standard';
      
      const users = await User.find({
        $or: [
          { [`osuDetails.${currentMode}.pp`]: { $gt: 0 } },
          { osuMode: currentMode, osuPp: { $gt: 0 } },
          ...(currentMode === 'standard' ? [{ osuMode: { $exists: false }, osuPp: { $gt: 0 } }] : [])
        ]
      })
      .select('username uid avatarUrl role isRegistered isB50Visible chuniRating isChuniB50Visible osuPp osuMode osuDetails createdAt')
      .lean();

      // 在内存中将对应的 PP 映射到根节点的 pp 属性
      const formattedUsers = users.map(u => {
        let pp = 0;
        if (u.osuDetails && u.osuDetails[currentMode] && u.osuDetails[currentMode].pp > 0) {
          pp = u.osuDetails[currentMode].pp;
        } else if ((u.osuMode === currentMode || (!u.osuMode && currentMode === 'standard')) && u.osuPp > 0) {
          pp = u.osuPp;
        }
        return { ...u, pp };
      });

      // 手动按 PP 排序（降序）
      formattedUsers.sort((a, b) => b.pp - a.pp || new Date(a.createdAt) - new Date(b.createdAt));
      return res.json(formattedUsers.slice(0, 100));
    }

    // 常规模式处理 (Maimai / Chuni / 社区活跃榜)
    let sortQuery = {};
    let filterQuery = {};

    switch(type) {
      case 'level': sortQuery = { xp: -1, createdAt: 1 }; break;
      case 'wiki': sortQuery = { wikiApprovedCount: -1, createdAt: 1 }; break;
      case 'feedback': sortQuery = { feedbackApprovedCount: -1, createdAt: 1 }; break;
      case 'checkin': sortQuery = { checkInCount: -1, createdAt: 1 }; break;
      case 'chunithm': 
        sortQuery = { chuniRating: -1, createdAt: 1 }; 
        filterQuery = { chuniRating: { $gt: 0 } }; 
        break;
      case 'pf':
      default: 
        sortQuery = { totalPf: -1, createdAt: 1 };
        filterQuery = { totalPf: { $gt: 0 } };
        break;
    }

    const users = await User.find(filterQuery)
      .sort(sortQuery)
      // 必须暴露 osuDetails 字典让前端读取
      .select('username uid avatarUrl totalPf rating role isRegistered isB50Visible xp level wikiApprovedCount feedbackApprovedCount checkInCount chuniRating isChuniB50Visible osuPp osuMode osuDetails')
      .limit(100)
      .lean();

    res.json(users);
  } catch (err) { 
    console.error('排行榜拉取失败:', err);
    res.status(500).json({ msg: '获取排行榜失败' }); 
  }
});

router.post('/api/users/check-in', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }); 
    if (user.lastCheckInDate === today) return res.status(400).json({ msg: '今天已经签到过啦！' });
    user.lastCheckInDate = today; user.xp = (user.xp || 0) + 20; user.checkInCount = (user.checkInCount || 0) + 1; user.level = Math.floor(user.xp / 300) + 1;
    await user.save();
    res.json({ msg: '签到成功！经验值 +20', xp: user.xp, level: user.level });
  } catch (err) { res.status(500).json({ msg: '签到失败' }); }
});


module.exports = router;
