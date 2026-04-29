const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const Score = require('../models/Score');
const Song = require('../models/Song');
const QualifierScore = require('../models/QualifierScore');
const axios = require('axios');
const { addXp, authMiddleware, optionalAuth } = require('../middleware/auth');

router.get('/api/leaderboard/qualifiers', async (req, res) => {
  try {
    const leaderboard = await QualifierScore.aggregate([
      { $group: { _id: '$userId', totalAchievement: { $sum: '$achievement' }, totalDxScore: { $sum: '$dxScore' }, playCount: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userInfo' } },
      { $unwind: '$userInfo' }, 
      { $project: { _id: 0, userId: '$_id', username: { $ifNull: ['$userInfo.nickname', '$userInfo.username'] }, avatarUrl: '$userInfo.avatarUrl', uid: '$userInfo.uid', totalAchievement: 1, totalDxScore: 1, playCount: 1 } },
      { $sort: { totalAchievement: -1, totalDxScore: -1 } }
    ]);
    res.json(leaderboard);
  } catch (err) { res.status(500).json({ msg: '获取失败' }); }
});

router.get('/api/feedback', async (req, res) => {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    await Feedback.updateMany({ status: { $ne: 'CLOSED' }, statusUpdatedAt: { $lt: ninetyDaysAgo } }, { $set: { status: 'CLOSED', statusUpdatedAt: new Date() } });
    const feedbacks = await Feedback.find().populate('author', 'username avatarUrl role').populate('replies.author', 'username avatarUrl role').sort({ isPinned: -1, updatedAt: -1 });
    res.json(feedbacks);
  } catch (err) { res.status(500).json({ message: '获取失败' }); }
});

router.post('/api/feedback', authMiddleware, async (req, res) => {
  try {
    const newFeedback = new Feedback({ author: req.user.id, title: req.body.title, content: req.body.content, type: req.body.type });
    await newFeedback.save(); res.status(201).json(newFeedback);
  } catch (err) { res.status(500).json({ message: '发布失败' }); }
});

router.put('/api/feedback/:id', authMiddleware, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ message: '不存在' });
    if (feedback.author.toString() !== req.user.id) return res.status(403).json({ message: '无权修改' });
    feedback.title = req.body.title || feedback.title; feedback.content = req.body.content || feedback.content; feedback.type = req.body.type || feedback.type; feedback.status = 'PENDING'; feedback.statusUpdatedAt = Date.now();
    await feedback.save(); res.json(feedback);
  } catch (err) { res.status(500).json({ message: '修改失败' }); }
});

router.delete('/api/feedback/:id', authMiddleware, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    const user = await User.findById(req.user.id);
    if (feedback.author.toString() !== req.user.id && user.role !== 'ADM') return res.status(403).json({ message: '无权删除' });
    await Feedback.findByIdAndDelete(req.params.id); res.json({ message: '已删除' });
  } catch (err) { res.status(500).json({ message: '删除失败' }); }
});

router.patch('/api/feedback/:id/status', authMiddleware, async (req, res) => {
  try {
    const { action } = req.body; 
    const feedback = await Feedback.findById(req.params.id);
    const user = await User.findById(req.user.id);
    
    if (action === 'SOLVE') {
      if (user.role !== 'ADM') return res.status(403).json({ message: '仅管理员可操作' });
      const referenceTime = (feedback.status === 'PENDING' && feedback.statusUpdatedAt && feedback.statusUpdatedAt > feedback.createdAt) ? feedback.statusUpdatedAt : feedback.createdAt;
      feedback.status = 'SOLVED'; feedback.statusUpdatedAt = Date.now();
      await addXp(feedback.author, 100); 
      await User.findByIdAndUpdate(feedback.author, { $inc: { feedbackApprovedCount: 1 } });
      const timeStr = new Date(referenceTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
      await Message.create({ receiver: feedback.author, sender: user._id, type: 'SYSTEM', title: '反馈已解决', content: `您于 ${timeStr} 发布的反馈被标记为已解决。` });
    } else if (action === 'REAPPEAL') {
      if (feedback.author.toString() !== req.user.id) return res.status(403).json({ message: '无权操作' });
      feedback.status = 'PENDING'; feedback.statusUpdatedAt = Date.now();
    }
    await feedback.save(); res.json(feedback);
  } catch (err) { res.status(500).json({ message: '失败' }); }
});

router.patch('/api/feedback/:id/pin', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'ADM') return res.status(403).json({ message: '无权' });
    const feedback = await Feedback.findById(req.params.id);
    feedback.isPinned = !feedback.isPinned; await feedback.save(); res.json(feedback);
  } catch (err) { res.status(500).json({ message: '失败' }); }
});

router.post('/api/feedback/:id/reply', authMiddleware, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    feedback.replies.push({ author: req.user.id, content: req.body.content.trim() });
    await feedback.save(); res.status(201).json({ message: '回复成功' });
  } catch (err) { res.status(500).json({ message: '失败' }); }
});

router.post('/api/users/sync-maimai', authMiddleware, async (req, res) => {
  try {
    const { importToken } = req.body;
    const response = await axios.get('https://www.diving-fish.com/api/maimaidxprober/player/records', { headers: { 'Import-Token': importToken.trim(), 'Accept': 'application/json' }, timeout: 20000 });
    const data = response.data;
    const playerRating = data.rating || 0; 
    const allRecords = data.records;

    const allSongsArray = await Song.find({}, 'id title ds charts basic_info').lean();
    const songMap = new Map();
    allSongsArray.forEach(song => songMap.set(String(song.id), song));

    const processedScores = allRecords.map(rec => {
      const song = songMap.get(String(rec.song_id));
      let pf = 0, dxRatio = 0, constant = rec.ds || 0, isNew = false;
      
      if (song) {
        isNew = song.basic_info?.is_new || false; 
        const isUtage = /^\[.+?\]/.test(rec.title) || /^\[.+?\]/.test(song.title) || song.type === 'UTAGE' || song.basic_info?.genre === '宴会場' || song.basic_info?.genre === '宴会场';
        if (song.charts && song.charts[rec.level_index]) {
          const chartInfo = song.charts[rec.level_index];
          const maxDxScore = chartInfo.notes.reduce((a, b) => a + b, 0) * 3;
          constant = isUtage ? 0 : (rec.ds || song.ds[rec.level_index]);
          dxRatio = maxDxScore > 0 ? (rec.dxScore / maxDxScore) : 0;
          if (maxDxScore > 0) pf = calculatePF(constant, rec.achievements, rec.dxScore, maxDxScore);
        }
      }
      return {
        userId: req.user.id, nickname: data.nickname || 'MaimaiPlayer', imageUrl: `https://www.diving-fish.com/covers/${String(rec.song_id).padStart(5, '0')}.png`, 
        achievementRate: rec.achievements || 0, songId: rec.song_id, songName: song ? song.title : rec.title, achievement: rec.achievements || 0, 
	      fcStatus: rec.fc || '', fsStatus: rec.fs || '', dxScore: rec.dxScore || 0, rating: rec.ra || 0, level: rec.level_index || 0, finishTime: new Date(),
        pf: isNaN(pf) || !isFinite(pf) ? 0 : pf, dxRatio: isNaN(dxRatio) || !isFinite(dxRatio) ? 0 : dxRatio, constant: isNaN(constant) || !isFinite(constant) ? 0 : constant, isNew: isNew
      };
    });

    const oldTop35 = processedScores.filter(r => !r.isNew).sort((a, b) => b.rating - a.rating).slice(0, 35);
    const newTop15 = processedScores.filter(r => r.isNew).sort((a, b) => b.rating - a.rating).slice(0, 15);
    const calculatedRating = [...oldTop35, ...newTop15].reduce((sum, rec) => sum + rec.rating, 0);
    const finalRating = calculatedRating > 0 ? calculatedRating : playerRating;

    const finalScoresToSave = processedScores.map(({ isNew, ...rest }) => rest);
    await Score.deleteMany({ userId: req.user.id });
    await Score.insertMany(finalScoresToSave);

    const topRecordsByPf = [...finalScoresToSave].sort((a, b) => b.pf - a.pf).slice(0, 50);
    const totalPf = topRecordsByPf.reduce((sum, score) => sum + score.pf, 0);
    await User.findByIdAndUpdate(req.user.id, { importToken: importToken.trim(), totalPf: Number(totalPf.toFixed(2)), rating: finalRating });

    res.json({ msg: `成功同步！`, rating: finalRating, totalPf: Number(totalPf.toFixed(2)) });
  } catch (err) { res.status(500).json({ msg: '错误' }); }
});

router.post('/api/users/sync-luoxue-oauth', authMiddleware, async (req, res) => {
  try {
    const { code, redirectUri } = req.body;
    const tokenResponse = await axios.post('https://maimai.lxns.net/api/v0/oauth/token', { grant_type: 'authorization_code', client_id: process.env.LXNS_CLIENT_ID, client_secret: process.env.LXNS_CLIENT_SECRET, code: code, redirect_uri: redirectUri }, { headers: { 'Content-Type': 'application/json' } });
    const userAccessToken = tokenResponse.data.access_token || tokenResponse.data.data?.access_token;
    const scoreResponse = await axios.get('https://maimai.lxns.net/api/v0/user/maimai/player/scores', { headers: { 'Authorization': `Bearer ${userAccessToken}` }, timeout: 30000 });
    const allRecords = scoreResponse.data?.data?.records || scoreResponse.data?.records || [];

    const allSongsArray = await Song.find({}, 'id title ds charts basic_info type').lean();
    const processedScores = [];

    for (const rec of allRecords) {
      const rawType = String(rec.type || '').trim().toUpperCase();
      let lxType = 'SD'; if (rawType === 'DX' || rawType === '1') lxType = 'DX';
      const lxId = Number(rec.song_id || rec.music_id || rec.id);
      const lxLevelIndex = Number(rec.level_index !== undefined ? rec.level_index : rec.level);

      const song = allSongsArray.find(s => {
        const sId = Number(s.id);
        const sType = String(s.type || 'SD').trim().toUpperCase();
        return (sId === lxId || sId === lxId + 10000 || sId === lxId - 10000) && (sType === lxType);
      });
      if (!song) continue;

      let pf = 0, dxRatio = 0, constant = 0;
      const isNew = song.basic_info?.is_new || false;
      const isUtage = /^\[.+?\]/.test(song.title) || song.type === 'UTAGE' || song.basic_info?.genre === '宴会场';

      if (song.charts && song.charts[lxLevelIndex]) {
        const maxDxScore = song.charts[lxLevelIndex].notes ? song.charts[lxLevelIndex].notes.reduce((a, b) => a + b, 0) * 3 : 0;
        constant = isUtage ? 0 : (song.ds[lxLevelIndex] || 0);
        const currentDxScore = rec.dxScore || rec.dx_score || 0; 
        dxRatio = maxDxScore > 0 ? (currentDxScore / maxDxScore) : 0;
        if (maxDxScore > 0) pf = calculatePF(constant, rec.achievements, currentDxScore, maxDxScore);
      }

      processedScores.push({
        userId: req.user.id, nickname: 'LxOAuthPlayer', imageUrl: `https://www.diving-fish.com/covers/${String(song.id).padStart(5, '0')}.png`, 
        achievementRate: rec.achievements || 0, songId: song.id, songName: song.title, achievement: rec.achievements || 0, fcStatus: rec.fc || '', fsStatus: rec.fs || '',
        dxScore: rec.dxScore || rec.dx_score || 0, rating: Math.floor(rec.dx_rating || rec.ra || 0), level: lxLevelIndex, constant: isNaN(constant) ? 0 : constant, finishTime: new Date(rec.play_time || Date.now()), pf: isNaN(pf) ? 0 : pf, dxRatio: isNaN(dxRatio) ? 0 : dxRatio, isNew: isNew
      });
    }

    const oldTop35 = processedScores.filter(r => !r.isNew).sort((a, b) => b.rating - a.rating).slice(0, 35);
    const newTop15 = processedScores.filter(r => r.isNew).sort((a, b) => b.rating - a.rating).slice(0, 15);
    const calculatedRating = [...oldTop35, ...newTop15].reduce((sum, rec) => sum + (rec.rating || 0), 0);

    await Score.deleteMany({ userId: req.user.id });
    await Score.insertMany(processedScores);

    const topRecordsByPf = [...processedScores].sort((a, b) => b.pf - a.pf).slice(0, 50);
    const totalPf = topRecordsByPf.reduce((sum, score) => sum + score.pf, 0);

    await User.findByIdAndUpdate(req.user.id, { totalPf: Number(totalPf.toFixed(2)), rating: calculatedRating, lxnsAccessToken: userAccessToken });

    res.json({ msg: `全量同步成功！`, rating: calculatedRating });
  } catch (err) { res.status(500).json({ msg: `同步失败` }); }
});


module.exports = router;
