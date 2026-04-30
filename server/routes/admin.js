const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Tournament = require('../models/Tournament');
const Message = require('../models/Message');
const Song = require('../models/Song');
const axios = require('axios');
const { addXp, authMiddleware, optionalAuth } = require('../middleware/auth');

// ==========================================
// 🛡️ 维护管理员(MAT) API：投诉系统
// ==========================================

const checkMaintenancePermission = (role) => ['ADM', 'MAT'].includes(role);

// 用户提交投诉
router.post('/api/complaints', authMiddleware, async (req, res) => {
  try {
    const { type, title, content, targetUserId, targetContentId, attachments } = req.body;
    if (!title || !content || !type) return res.status(400).json({ msg: '请填写完整信息' });
    const complaint = new Complaint({ author: req.user.id, type, title, content, targetUserId: targetUserId || null, targetContentId: targetContentId || '', attachments: attachments || [] });
    await complaint.save();
    res.json({ msg: '投诉已提交，维护团队将尽快处理', data: complaint });
  } catch (err) { res.status(500).json({ msg: '提交失败' }); }
});

// 获取投诉列表 (MAT/ADM)
router.get('/api/complaints', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !checkMaintenancePermission(user.role)) return res.status(403).json({ msg: '权限不足' });
    const { status } = req.query;
    const filter = status ? { status } : {};
    const complaints = await Complaint.find(filter)
      .populate('author', 'username uid avatarUrl')
      .populate('targetUserId', 'username uid avatarUrl')
      .populate('handledBy', 'username avatarUrl')
      .sort({ createdAt: -1 });
    res.json(complaints);
  } catch (err) { res.status(500).json({ msg: '获取失败' }); }
});

// 用户查看自己的投诉
router.get('/api/complaints/mine', authMiddleware, async (req, res) => {
  try {
    const complaints = await Complaint.find({ author: req.user.id })
      .populate('handledBy', 'username avatarUrl')
      .sort({ createdAt: -1 });
    res.json(complaints);
  } catch (err) { res.status(500).json({ msg: '获取失败' }); }
});

// 处理投诉 (MAT/ADM)
router.put('/api/complaints/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !checkMaintenancePermission(user.role)) return res.status(403).json({ msg: '权限不足' });
    const { status, handlerNote } = req.body;
    const updateFields = { status, handledBy: user._id, handlerNote: handlerNote || '' };
    if (status === 'RESOLVED' || status === 'DISMISSED') updateFields.resolvedAt = new Date();
    const updated = await Complaint.findByIdAndUpdate(req.params.id, { $set: updateFields }, { new: true });
    if (updated) {
      const statusText = status === 'RESOLVED' ? '已解决' : status === 'DISMISSED' ? '已驳回' : '处理中';
      await Message.create({ receiver: updated.author, sender: user._id, type: 'SYSTEM', title: '投诉处理通知', content: `您的投诉「${updated.title}」已被标记为 ${statusText}。${handlerNote ? '处理备注：' + handlerNote : ''}` });
    }
    res.json({ msg: '投诉已处理', data: updated });
  } catch (err) { res.status(500).json({ msg: '处理失败' }); }
});

// ==========================================
// 🔧 ADM 专属：角色管理 API
// ==========================================

router.put('/api/admin/set-role', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (!admin || admin.role !== 'ADM') return res.status(403).json({ msg: '仅 ADM 可分配角色' });
    const { targetUid, newRole, tournamentId } = req.body;
    const targetUser = await User.findOne({ uid: targetUid });
    if (!targetUser) return res.status(404).json({ msg: '目标用户不存在' });
    if (targetUser.role === 'ADM' && admin._id.toString() !== targetUser._id.toString()) return res.status(400).json({ msg: '不能修改其他 ADM 的角色' });
    const validRoles = ['user', 'ADM', 'ANN', 'CHM', 'MAT', 'TO', 'DS'];
    if (!validRoles.includes(newRole)) return res.status(400).json({ msg: '无效的角色' });
    targetUser.role = newRole;
    if (newRole === 'CHM' && tournamentId) {
      targetUser.chmTournamentId = tournamentId;
      await Tournament.findByIdAndUpdate(tournamentId, { $addToSet: { managers: targetUser._id } });
    }
    if (newRole !== 'CHM') targetUser.chmTournamentId = null;
    await targetUser.save();
    const roleNames = { 'user': '普通用户', 'ADM': '管理员', 'ANN': '公告管理员', 'CHM': '比赛管理员', 'MAT': '维护管理员', 'TO': '赛事运营', 'DS': '设计师' };
    await Message.create({ receiver: targetUser._id, sender: admin._id, type: 'SYSTEM', title: '🎖️ 身份变更通知', content: `您的身份已被更新为：${roleNames[newRole] || newRole}。` });
    res.json({ msg: `已将 ${targetUser.username} 的角色设置为 ${roleNames[newRole]}` });
  } catch (err) { console.error('角色设置失败:', err); res.status(500).json({ msg: '设置失败' }); }
});

// 获取管理员列表 (ADM only)
router.get('/api/admin/staff', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (!admin || admin.role !== 'ADM') return res.status(403).json({ msg: '权限不足' });
    const staff = await User.find({ role: { $ne: 'user' } })
      .select('username uid avatarUrl role chmTournamentId')
      .populate('chmTournamentId', 'title status')
      .sort({ role: 1 });
    res.json(staff);
  } catch (err) { res.status(500).json({ msg: '获取失败' }); }
});

// 同步舞萌曲库 (ADM only)
router.post('/api/admin/sync-songs', authMiddleware, async (req, res) => {
  try {
    const adminUser = await User.findById(req.user.id || req.user._id);
    if (!adminUser || adminUser.role !== 'ADM') return res.status(403).json({ msg: '权限不足' });
    const response = await axios.get('https://www.diving-fish.com/api/maimaidxprober/music_data');
    const songs = response.data;
    await Song.collection.dropIndexes().catch(() => {});

    const bulkOps = songs.map(song => {
      const isUtage = song.basic_info?.genre === '宴会場' || song.basic_info?.genre === '宴会场' || song.basic_info?.from === '宴会場' || song.basic_info?.from === '宴会场' || song.type === 'UTAGE';
      const finalDs = isUtage ? (song.ds ? song.ds.map(() => 0) : [0, 0, 0, 0, 0]) : song.ds;
      return { updateOne: { filter: { id: String(song.id) }, update: { $set: { id: String(song.id), title: song.title, type: song.type, ds: finalDs, level: song.level, basic_info: song.basic_info, charts: song.charts } }, upsert: true } };
    });
    await Song.bulkWrite(bulkOps);
    res.json({ msg: `✅ 成功同步 ${songs.length} 首乐曲！` });
  } catch (err) { res.status(500).json({ msg: '同步失败' }); }
});

module.exports = router;
