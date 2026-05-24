const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Announcement = require('../models/Announcement');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

// ==========================================
// 📰 公告管理员(ANN)扩展 API：审核/编辑/删除公告
// ==========================================

// 获取公告列表
router.get('/api/announcements', async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 }).populate('author', 'username avatarUrl role');
    res.json(announcements);
  } catch (err) { res.status(500).json({ msg: '获取失败' }); }
});

// 获取单个公告详情
router.get('/api/announcements/:id', async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id).populate('author', 'username avatarUrl role');
    if (!announcement) return res.status(404).json({ msg: '公告不存在' });
    res.json(announcement);
  } catch (err) { res.status(500).json({ msg: '获取失败' }); }
});

// 编辑公告 (ADM + ANN)
router.put('/api/announcements/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !['ADM', 'ANN'].includes(user.role)) return res.status(403).json({ msg: '权限不足' });
    const { title, subtitle, type, content, coverUrl } = req.body;
    const updated = await Announcement.findByIdAndUpdate(req.params.id, { title, subtitle, type, content, coverUrl }, { new: true });
    if (!updated) return res.status(404).json({ msg: '公告不存在' });
    res.json({ msg: '公告已更新', data: updated });
  } catch (err) { res.status(500).json({ msg: '编辑失败' }); }
});

// 删除公告 (ADM + ANN)
router.delete('/api/announcements/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !['ADM', 'ANN'].includes(user.role)) return res.status(403).json({ msg: '权限不足' });
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ msg: '公告已删除' });
  } catch (err) { res.status(500).json({ msg: '删除失败' }); }
});


module.exports = router;
