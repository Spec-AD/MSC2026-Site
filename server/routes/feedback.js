const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const Message = require('../models/Message');
const QualifierScore = require('../models/QualifierScore');
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


module.exports = router;
