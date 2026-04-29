const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Song = require('../models/Song');
const Message = require('../models/Message');
const MessageFolder = require('../models/MessageFolder');
const QualifierScore = require('../models/QualifierScore');
const { addXp, authMiddleware, optionalAuth } = require('../middleware/auth');

// ==========================================
//  前端拉取本地 Maimai 曲库 (包含别名 aliases)
// ==========================================
router.get('/api/songs', async (req, res) => {
  try {
    // 从我们自己的数据库读取曲库，这里面才包含刚刚同步的 aliases 字段！
    // 使用 .lean() 提高大数据量查询性能
    const songs = await Song.find({}).sort({ id: 1 }).lean(); 
    res.json(songs);
  } catch (err) {
    console.error('获取本地曲库失败:', err);
    res.status(500).json({ msg: '获取曲库数据失败' });
  }
});

router.post('/api/users/:username/friend-request', authMiddleware, async (req, res) => {
  try {
    const sender = await User.findById(req.user.id);
    const receiver = await User.findOne({ username: req.params.username });
    if (!receiver) return res.status(404).json({ message: '目标用户不存在' });
    if (sender._id.toString() === receiver._id.toString()) return res.status(400).json({ message: '不能添加自己' });

    const getLimit = (tier) => { if (tier === 2) return 5000; if (tier === 1) return 300; return 50; };
    if (sender.friends.length >= getLimit(sender.sponsorTier || 0)) return res.status(400).json({ message: `你的好友数量已达上限` });
    if (receiver.friends.length >= getLimit(receiver.sponsorTier || 0)) return res.status(400).json({ message: '对方好友满' });
    if (receiver.friends.includes(sender._id)) return res.status(400).json({ message: '已经是好友了' });
    if (receiver.friendRequests.includes(sender._id)) return res.status(400).json({ message: '已发送过请求' });

    receiver.friendRequests.push(sender._id); await receiver.save();
    await Message.create({ receiver: receiver._id, sender: sender._id, type: 'FRIEND_REQUEST', title: '📬 新的好友申请', content: `玩家 [${sender.username}] 希望添加你为好友！`, actionData: { senderId: sender._id } });
    res.json({ message: '申请已发送' });
  } catch (err) { res.status(500).json({ message: '发送失败' }); }
});

router.post('/api/users/friend-request/accept', authMiddleware, async (req, res) => {
  try {
    const { senderId, messageId } = req.body;
    const receiver = await User.findById(req.user.id);
    const sender = await User.findById(senderId);
    if (!sender) return res.status(404).json({ message: '发送者不存在' });

    receiver.friendRequests = receiver.friendRequests.filter(id => id.toString() !== senderId);
    if (!receiver.friends.includes(senderId)) receiver.friends.push(senderId);
    if (!sender.friends.includes(receiver._id)) sender.friends.push(receiver._id);

    await receiver.save(); await sender.save();
    if (messageId) await Message.findByIdAndUpdate(messageId, { isRead: true });
    res.json({ message: '已添加好友' });
  } catch (err) { res.status(500).json({ message: '操作失败' }); }
});

router.post('/api/users/friend-request/reject', authMiddleware, async (req, res) => {
  try {
    const { senderId, messageId } = req.body;
    const receiver = await User.findById(req.user.id);
    receiver.friendRequests = receiver.friendRequests.filter(id => id.toString() !== senderId);
    await receiver.save();
    if (messageId) await Message.findByIdAndUpdate(messageId, { isRead: true });
    res.json({ message: '已拒绝申请' });
  } catch (err) { res.status(500).json({ message: '操作失败' }); }
});

router.get('/api/messages', authMiddleware, async (req, res) => {
  try { res.json(await Message.find({ receiver: req.user.id }).populate('sender', 'username avatarUrl').sort({ createdAt: -1 })); } catch (err) { res.status(500).json({ message: '获取失败' }); }
});

router.get('/api/messages/unread-count', authMiddleware, async (req, res) => {
  try { res.json({ count: await Message.countDocuments({ receiver: req.user.id, isRead: false }) }); } catch (err) { res.status(500).json({ message: '失败' }); }
});

router.delete('/api/messages/bulk-delete-read', authMiddleware, async (req, res) => {
  try { await Message.deleteMany({ receiver: req.user.id, isRead: true, isStarred: { $ne: true } }); res.json({ msg: '清理成功' }); } catch (err) { res.status(500).json({ msg: '失败' }); }
});

router.put('/api/messages/:id/read', authMiddleware, async (req, res) => {
  try { res.json(await Message.findOneAndUpdate( { _id: req.params.id, receiver: req.user.id }, { isRead: true }, { new: true } )); } catch (err) { res.status(500).json({ message: '失败' }); }
});

router.put('/api/messages/:id/star', authMiddleware, async (req, res) => {
  try { res.json(await Message.findOneAndUpdate( { _id: req.params.id, receiver: req.user.id }, { isStarred: req.body.isStarred }, { new: true } )); } catch (err) { res.status(500).json({ msg: '失败' }); }
});

router.put('/api/messages/:id/move', authMiddleware, async (req, res) => {
  try { res.json(await Message.findOneAndUpdate( { _id: req.params.id, receiver: req.user.id }, { folderId: req.body.folderId || null }, { new: true } )); } catch (err) { res.status(500).json({ msg: '失败' }); }
});

router.delete('/api/messages/:id', authMiddleware, async (req, res) => {
  try { await Message.findOneAndDelete({ _id: req.params.id, receiver: req.user.id }); res.json({ msg: '已删除' }); } catch (err) { res.status(500).json({ msg: '失败' }); }
});

router.get('/api/messages/folders', authMiddleware, async (req, res) => {
  try { res.json(await MessageFolder.find({ userId: req.user.id }).sort({ createdAt: 1 })); } catch (err) { res.status(500).json({ msg: '失败' }); }
});

router.post('/api/messages/folders', authMiddleware, async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ msg: '名称不能为空' });
    const count = await MessageFolder.countDocuments({ userId: req.user.id });
    if (count >= 20) return res.status(400).json({ msg: '最多只能创建 20 个分类夹' });
    const newFolder = new MessageFolder({ name: req.body.name, userId: req.user.id }); await newFolder.save(); res.json(newFolder);
  } catch (err) { res.status(500).json({ msg: '失败' }); }
});

router.delete('/api/messages/folders/:id', authMiddleware, async (req, res) => {
  try {
    await MessageFolder.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    await Message.updateMany({ folderId: req.params.id, receiver: req.user.id }, { $set: { folderId: null } });
    res.json({ msg: '已删除' });
  } catch (err) { res.status(500).json({ msg: '失败' }); }
});

router.post('/api/admin/send-message', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (admin.role !== 'ADM') return res.status(403).json({ message: '权限不足' });
    const { targetUid, title, content } = req.body;
    const targetUser = await User.findOne({ uid: targetUid });
    if (!targetUser) return res.status(404).json({ message: '未找到' });
    await Message.create({ receiver: targetUser._id, sender: admin._id, type: 'ADM_DIRECT', title, content }); res.json({ message: `成功` });
  } catch (err) { res.status(500).json({ message: '失败' }); }
});

router.post('/api/admin/broadcast-message', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (!admin || admin.role !== 'ADM') return res.status(403).json({ message: '权限不足' });
    const allUsers = await User.find({}, '_id');
    const messages = allUsers.map(u => ({ receiver: u._id, sender: admin._id, type: 'SYSTEM', title: req.body.title, content: req.body.content }));
    await Message.insertMany(messages); res.json({ message: `广播成功！` });
  } catch (err) { res.status(500).json({ message: '失败' }); }
});

router.post('/api/admin/qualifier-score', authMiddleware, async (req, res) => {
  try {
    const adminUser = await User.findById(req.user.id || req.user._id);
    if (!adminUser || !['ADM', 'TO'].includes(adminUser.role)) return res.status(403).json({ msg: '权限不足' });
    const { targetUid, songName, level, achievement, dxScore } = req.body;
    const targetUser = await User.findOne({ uid: targetUid });
    if (!targetUser) return res.status(404).json({ msg: '未找到' });
    const existingScore = await QualifierScore.findOne({ userId: targetUser._id, songName: songName });

    if (existingScore) {
      existingScore.level = Number(level); existingScore.achievement = Number(achievement); existingScore.dxScore = Number(dxScore || 0);
      existingScore.entryBy = adminUser.username; existingScore.entryTime = Date.now(); await existingScore.save();
      return res.json({ msg: `更新成功！` });
    } else {
      await QualifierScore.create({ userId: targetUser._id, songName, level: Number(level), achievement: Number(achievement), dxScore: Number(dxScore || 0), entryBy: adminUser.username });
      return res.json({ msg: `录入成功！` });
    }
  } catch (err) { res.status(500).json({ msg: '失败' }); }
});

module.exports = router;
