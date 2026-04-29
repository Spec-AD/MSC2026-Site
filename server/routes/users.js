const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Score = require('../models/Score');
const OsuScore = require('../models/OsuScore');
const QualifierScore = require('../models/QualifierScore');
const { upload } = require('../config/cloudinary');
const { addXp, authMiddleware, optionalAuth } = require('../middleware/auth');

// ==========================================
// 🏷️ 报名匹配 & 服务器时间
// ==========================================
router.post('/api/match/register', authMiddleware, async (req, res) => {
  try {
    const { nickname, contactType, contactValue, prizeWish, intro } = req.body;
    if (!nickname || !contactValue) return res.status(400).json({ msg: '必填项缺失' });
    const updatedUser = await User.findByIdAndUpdate(req.user.id, { isRegistered: true, nickname, contactType, contactValue, prizeWish, intro, regTime: new Date() }, { new: true });
    await addXp(req.user.id, 200);
    res.json({ success: true, user: updatedUser });
  } catch (err) { res.status(500).json({ msg: '报名失败' }); }
});

router.get('/api/time', (req, res) => {
  res.json({ serverTime: new Date(), timestamp: Date.now() });
});

// ==========================================
// 🌟 在线人数统计系统
// ==========================================
const onlineSessions = new Map();
const dailyOnlineSnapshots = new Map();
const getServerHour = () => new Date().getHours();
const getTodayKey = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`; };
setInterval(() => { const cutoff = Date.now() - 3*60*1000; for (const [sid,ts] of onlineSessions.entries()) { if (ts < cutoff) onlineSessions.delete(sid); } }, 60*1000);
setInterval(() => { const hour = getServerHour(); const todayKey = getTodayKey(); if (!dailyOnlineSnapshots.has(todayKey)) { dailyOnlineSnapshots.set(todayKey, new Array(24).fill(null)); for (const key of dailyOnlineSnapshots.keys()) { if (key < todayKey) dailyOnlineSnapshots.delete(key); } } dailyOnlineSnapshots.get(todayKey)[hour] = onlineSessions.size; }, 60*60*1000);
router.post('/api/online/heartbeat', (req, res) => { const { sessionId } = req.body; if (!sessionId) return res.status(400).json({ msg: '缺少 sessionId' }); onlineSessions.set(sessionId, Date.now()); res.json({ onlineCount: onlineSessions.size }); });
router.get('/api/online/stats', (req, res) => { const now = new Date(); const todayKey = getTodayKey(); const currentHour = getServerHour(); const currentMinute = now.getMinutes(); if (!dailyOnlineSnapshots.has(todayKey)) { dailyOnlineSnapshots.set(todayKey, new Array(24).fill(null)); } const snapshots = [...dailyOnlineSnapshots.get(todayKey)]; snapshots[currentHour] = onlineSessions.size; res.json({ serverTime: now.toISOString(), currentHour, currentMinute, currentCount: onlineSessions.size, hourlyData: snapshots, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }); });

router.post('/api/upload', authMiddleware, upload.single('image'), (req, res) => {
  try { res.json({ url: req.file.path }); } catch (err) { res.status(500).json({ msg: '上传失败' }); }
});

router.get('/api/users/search', async (req, res) => {
  try {
    const { q } = req.query; 
    if (!q || q.trim() === '') return res.json([]);
    const users = await User.aggregate([
      { $addFields: { uidString: { $toString: "$uid" } } },
      { $match: { $or: [{ username: { $regex: q, $options: 'i' } }, { uidString: { $regex: q, $options: 'i' } }] } },
      { $limit: 10 },
      { $project: { _id: 1, username: 1, uid: 1, avatarUrl: 1, isRegistered: 1, role: 1 } }
    ]);
    res.json(users);
  } catch (err) { res.status(500).json({ msg: '搜索错误' }); }
});


// ==========================================
// 🌟 核心修复：纯净的好友列表查询接口
// ==========================================
router.get('/api/users/:username/friends', optionalAuth, async (req, res) => {
  try {
    const user = await User.findOne({ username: { $regex: new RegExp(`^${req.params.username}$`, 'i') } })
      .populate('friends', 'username uid avatarUrl bannerUrl level totalPf rating isB50Visible chuniRating isChuniB50Visible osuPp osuMode osuDetails sponsorTier role')
      .populate('friendRequests', 'username uid avatarUrl level sponsorTier role');

    if (!user) return res.status(404).json({ msg: '该用户不存在' });

    // 安全校验：只有当登录者是本人时，才返回 friendRequests（收到的申请列表）
    const isOwnProfile = req.user && (req.user.id === user._id.toString() || req.user._id === user._id.toString());

    res.json({
      friends: user.friends || [],
      friendRequests: isOwnProfile ? (user.friendRequests || []) : []
    });
  } catch (err) {
    console.error('获取好友列表失败:', err);
    res.status(500).json({ msg: '获取好友列表失败' });
  }
});


// ==========================================
// 核心：获取玩家详细档案
// ==========================================
router.get('/api/users/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: { $regex: new RegExp(`^${req.params.username}$`, 'i') } })
            .select('-password -contactValue -contactType')
	          .populate('friends', 'username uid avatarUrl bannerUrl level totalPf rating isB50Visible chuniRating isChuniB50Visible osuPp osuMode osuDetails sponsorTier role');
        
        if (!user) return res.status(404).json({ msg: '用户不存在' });

        let pfRank = '-';
        if (user.totalPf && user.totalPf > 0) pfRank = await User.countDocuments({ totalPf: { $gt: user.totalPf } }) + 1;
        let chuniRank = '-';
        if (user.chuniRating && user.chuniRating > 0) chuniRank = await User.countDocuments({ chuniRating: { $gt: user.chuniRating } }) + 1;

	      const allScores = await Score.find({ userId: user._id }).lean();
        const topScores = await Score.find({ userId: user._id }).sort({ rating: -1, achievement: -1 }).limit(50);
        const topPfScores = await Score.find({ userId: user._id }).sort({ pf: -1 }).limit(50);
        const qualifierScores = await QualifierScore.find({ userId: user._id }).sort({ entryTime: -1 });
        const osuScores = await OsuScore.find({ userId: user._id }).sort({ pp: -1 }).lean();

        res.json({
            ...user.toObject(),
	          allScores: allScores || [], topScores: topScores || [], pfRank, chuniRank, 
            topPfScores: topPfScores || [], qualifierScores: qualifierScores || [], osuScores: osuScores || [],             
            friendsCount: user.friends ? user.friends.length : 0, friends: user.friends 
        });
    } catch (err) { res.status(500).json({ msg: '服务器错误' }); }
});

router.put('/api/users/profile', authMiddleware, async (req, res) => {
    try {
        const { bio, avatarUrl, bannerUrl, divingFishUsername, proberUsername, isB50Visible } = req.body;
        const updateFields = {};
        if (bio !== undefined) updateFields.bio = bio;
        if (avatarUrl !== undefined) updateFields.avatarUrl = avatarUrl;
        if (bannerUrl !== undefined) updateFields.bannerUrl = bannerUrl;
        if (isB50Visible !== undefined) updateFields.isB50Visible = isB50Visible;
        if (divingFishUsername !== undefined) updateFields.divingFishUsername = divingFishUsername;
        if (proberUsername !== undefined) updateFields.proberUsername = proberUsername;

        const updatedUser = await User.findByIdAndUpdate(req.user.id, { $set: updateFields }, { new: true }).select('-password');
        res.json(updatedUser);
    } catch (err) { res.status(500).json({ msg: '更新失败' }); }
});

// ==========================================
// 👤 用户设置（个人资料/可见性）
// ==========================================
router.get('/api/users/settings/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('location occupation website twitter birthday isB50Visible isChuniB50Visible email');
    if (!user) return res.status(404).json({ msg: '用户不存在' });
    res.json(user);
  } catch (err) { res.status(500).json({ msg: '获取设置失败' }); }
});

router.put('/api/users/settings/profile', authMiddleware, async (req, res) => {
  try {
    const { location, occupation, website, twitter, birthday } = req.body;
    await User.findByIdAndUpdate(req.user.id, { location, occupation, website, twitter, birthday });
    res.json({ msg: '资料更新成功' });
  } catch (err) { res.status(500).json({ msg: '更新设置失败' }); }
});


module.exports = router;
