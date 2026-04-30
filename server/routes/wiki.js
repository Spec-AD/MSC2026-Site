const express = require('express');
const router = express.Router();
const User = require('../models/User');
const WikiPage = require('../models/WikiPage');
const WikiCategory = require('../models/WikiCategory');
const ChunithmSong = require('../models/ChunithmSong');
const ChunithmScore = require('../models/ChunithmScore');
const axios = require('axios');
const { addXp, authMiddleware, optionalAuth } = require('../middleware/auth');


router.post('/api/users/sync-chunithm-oauth', authMiddleware, async (req, res) => {
  try {
    const { code, redirectUri } = req.body;
    const tokenResponse = await axios.post('https://maimai.lxns.net/api/v0/oauth/token', { grant_type: 'authorization_code', client_id: process.env.LXNS_CLIENT_ID, client_secret: process.env.LXNS_CLIENT_SECRET, code, redirect_uri: redirectUri }, { headers: { 'Content-Type': 'application/json' } });
    const userAccessToken = tokenResponse.data.access_token || tokenResponse.data.data?.access_token;
    const scoreResponse = await axios.get('https://maimai.lxns.net/api/v0/user/chunithm/player/scores', { headers: { 'Authorization': `Bearer ${userAccessToken}` }, timeout: 30000 });
    const allRecords = scoreResponse.data?.data?.records || scoreResponse.data?.records || [];

    const allSongsArray = await ChunithmSong.find({}, 'id title ds basic_info').lean();
    const processedScores = [];

    for (const rec of allRecords) {
      const lxId = Number(rec.song_id || rec.id);
      const lxLevelIndex = Number(rec.level_index);
      const song = allSongsArray.find(s => Number(s.id) === lxId);
      if (!song) continue;

      let constant = 0;
      if (song.ds && song.ds[lxLevelIndex]) constant = song.ds[lxLevelIndex];
      const isWE = lxLevelIndex === 5; 

      processedScores.push({
        userId: req.user.id, songId: song.id, songName: song.title || song.basic_info?.title, imageUrl: `https://www.diving-fish.com/covers/${song.id}.png`, 
        level: lxLevelIndex, constant: isWE ? 0 : constant, score: rec.score || 0, rating: isWE ? 0 : (rec.rating || 0), rank: rec.rank || '', clearStatus: rec.clear || '', fcStatus: rec.full_combo || rec.fc || '', isNew: song.basic_info?.from === 'LUMINOUS PLUS' || false, finishTime: new Date(rec.play_time || Date.now())
      });
    }

    await ChunithmScore.deleteMany({ userId: req.user.id });
    await ChunithmScore.insertMany(processedScores);

    const validScores = processedScores.filter(s => s.level !== 5 && s.rating > 0);
    validScores.sort((a, b) => b.rating - a.rating || b.score - a.score);
    const b30 = validScores.filter(s => !s.isNew).slice(0, 30);
    const r20 = validScores.filter(s => s.isNew).slice(0, 20);
    const sumB30 = b30.reduce((sum, s) => sum + s.rating, 0);
    const sumR20 = r20.reduce((sum, s) => sum + s.rating, 0);
    const totalCount = b30.length + r20.length;
    const avgRating = totalCount > 0 ? Number(((sumB30 + sumR20) / totalCount).toFixed(2)) : 0;

    await User.findByIdAndUpdate(req.user.id, { chuniRating: avgRating });
    res.json({ msg: `同步成功！` });
  } catch (err) { res.status(500).json({ msg: `失败` }); }
});

router.get('/api/wiki/categories', async (req, res) => {
  try { res.json(await WikiCategory.find().sort({ createdAt: 1 })); } catch (err) { res.status(500).json({ msg: '获取失败' }); }
});

router.post('/api/admin/wiki/category', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id || req.user._id);
    if (!currentUser || !['ADM', 'TO'].includes(currentUser.role)) return res.status(403).json({ msg: '权限不足' });
    const { name, slug, description, parentId, icon, color } = req.body;
    const formattedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const newCategory = new WikiCategory({ name, slug: formattedSlug, description, parentId: parentId || null, icon: icon || 'FaFolder', color: color || 'text-cyan-400' });
    await newCategory.save(); res.json({ msg: '创建成功！', category: newCategory });
  } catch (err) { res.status(500).json({ msg: '失败' }); }
});

router.get('/api/wiki/list', async (req, res) => {
  try { res.json(await WikiPage.find({ status: 'APPROVED' }).select('title slug category views updatedAt').populate('category', 'name slug parentId color icon').sort({ views: -1 })); } catch (err) { res.status(500).json({ msg: '失败' }); }
});

router.get('/api/wiki/page/:slug', async (req, res) => {
  try {
    const page = await WikiPage.findOneAndUpdate({ slug: req.params.slug, status: 'APPROVED' }, { $inc: { views: 1 } }, { new: true, timestamps: false }).populate('category', 'name slug parentId').populate('author', 'username avatarUrl role').populate('lastEditedBy', 'username avatarUrl role');
    if (!page) return res.status(404).json({ msg: '不存在' }); res.json(page);
  } catch (err) { res.status(500).json({ msg: '失败' }); }
});

router.post('/api/wiki/submit', authMiddleware, async (req, res) => {
  try {
    const { slug, title, categoryId, content } = req.body; 
    const formattedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    let page = await WikiPage.findOne({ slug: formattedSlug });
    const currentUser = await User.findById(req.user.id || req.user._id);
    const isAdmin = currentUser && ['ADM', 'TO'].includes(currentUser.role);
    const newStatus = isAdmin ? 'APPROVED' : 'PENDING';

    if (page) {
      if (!page.history) page.history = [];
      page.history.push({ title: page.title, content: page.content, editedBy: page.lastEditedBy, editedAt: page.updatedAt || new Date() });
      page.title = title; page.category = categoryId; page.content = content; page.lastEditedBy = currentUser._id; page.status = newStatus; page.isPendingUpdate = !isAdmin;
      await page.save();
      if (isAdmin) { await addXp(currentUser._id, 30); await User.findByIdAndUpdate(currentUser._id, { $inc: { wikiApprovedCount: 1 } }); }
      return res.json({ msg: '更新成功' });
    } else {
      const newPage = new WikiPage({ title, slug: formattedSlug, category: categoryId, content, author: currentUser._id, lastEditedBy: currentUser._id, status: newStatus, isPendingUpdate: false });
      await newPage.save();
      if (isAdmin) { await addXp(currentUser._id, 50); await User.findByIdAndUpdate(currentUser._id, { $inc: { wikiApprovedCount: 1 } }); }
      return res.json({ msg: '提交成功' });
    }
  } catch (err) { res.status(500).json({ msg: '失败' }); }
});

router.get('/api/admin/wiki/pending', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id || req.user._id);
        if (!currentUser || !['ADM', 'TO', 'MAT'].includes(currentUser.role)) return res.status(403).json({ msg: '权限不足' });
    res.json(await WikiPage.find({ status: 'PENDING' }).populate('category', 'name').populate('author', 'username').sort({ createdAt: -1 }));
  } catch (err) { res.status(500).json({ msg: '失败' }); }
});

router.put('/api/admin/wiki/review/:id', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id || req.user._id);
        if (!currentUser || !['ADM', 'TO', 'MAT'].includes(currentUser.role)) return res.status(403).json({ msg: '权限不足' });
    const { action, rejectReason } = req.body;
    const page = await WikiPage.findById(req.params.id);
    
    if (action === 'APPROVE') {
      page.status = 'APPROVED'; page.rejectReason = '';
      const targetUserId = page.isPendingUpdate ? page.lastEditedBy : page.author;
      await addXp(targetUserId, page.isPendingUpdate ? 30 : 50); 
      await User.findByIdAndUpdate(targetUserId, { $inc: { wikiApprovedCount: 1 } });
      page.isPendingUpdate = false;
    } else if (action === 'REJECT') {
      page.status = 'REJECTED'; page.rejectReason = rejectReason || '不符合规范';
    }
    await page.save(); res.json({ msg: `审核完成` });
  } catch (err) { res.status(500).json({ msg: '失败' }); }
});

router.post('/api/wiki/read-reward', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id);
    const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
    if (user.lastWikiReadDate !== today) {
      user.lastWikiReadDate = today; user.xp = (user.xp || 0) + 5; user.level = Math.floor(user.xp / 300) + 1; 
      await user.save(); return res.json({ awarded: true, msg: '📚 每日奖励 +5' });
    }
    res.json({ awarded: false });
  } catch (err) { res.status(500).json({ msg: '失败' }); }
});



module.exports = router;
