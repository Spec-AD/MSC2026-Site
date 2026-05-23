const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Song = require('../models/Song');
const ChunithmSong = require('../models/ChunithmSong');
const ArcaeaSong = require('../models/ArcaeaSong');
const { addXp, authMiddleware, optionalAuth } = require('../middleware/auth');
const {
  canTransition,
  validateTransition,
  getRollbackUnset,
  getRollbackPatch,
  calculateQualifierRankings,
  getQualifiedUserIds,
  generateSingleElimination,
  advanceWinner,
  allMatchesFinished,
  distributeXp,
  sortByQualifierRank,
  nextPowerOfTwo,
  notifyStateChange,
  notifyQualifierResult,
  notifyFinalResults,
} = require('../services/tournament');

const { addSSEClient, removeSSEClient, pushSSE } = require('../services/tournament/ssePool');

// ==========================================
// 🏆 赛事管理系统 API (CHM 比赛管理员 + ADM)
// ==========================================

// 辅助：检查赛事权限
const checkTournamentPermission = async (userId, tournamentId = null) => {
  const user = await User.findById(userId);
  if (!user) return { allowed: false, user: null, msg: '用户不存在' };
  if (user.role === 'ADM') return { allowed: true, user, msg: 'ok' };
  if (user.role === 'CHM') {
    if (!tournamentId) return { allowed: true, user, msg: 'ok' };
    if (user.chmTournamentId && user.chmTournamentId.toString() === tournamentId.toString()) {
      return { allowed: true, user, msg: 'ok' };
    }
    const tournament = await Tournament.findById(tournamentId);
    if (tournament && tournament.managers.some(m => m.toString() === userId.toString())) {
      return { allowed: true, user, msg: 'ok' };
    }
    return { allowed: false, user, msg: '您不是该赛事的管理员' };
  }
  return { allowed: false, user, msg: '权限不足' };
};

// 创建赛事 (ADM / CHM)
router.post('/api/tournaments/create', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !['ADM', 'CHM'].includes(user.role)) return res.status(403).json({ msg: '权限不足' });
    const { title, subtitle, description, coverUrl, rules, registrationStart, registrationEnd, startTime, endTime, advanceCount } = req.body;
    if (!title) return res.status(400).json({ msg: '赛事标题不能为空' });
    const newTournament = new Tournament({
      title, subtitle, description, coverUrl, rules,
      registrationStart, registrationEnd, startTime, endTime,
      advanceCount: Number(advanceCount) || 8,
      createdBy: user._id, managers: [user._id],
      timeApproved: user.role === 'ADM'
    });
    await newTournament.save();
    if (user.role === 'CHM') { user.chmTournamentId = newTournament._id; await user.save(); }
    res.json({ msg: '赛事创建成功！', data: newTournament });
  } catch (err) { console.error('创建赛事失败:', err); res.status(500).json({ msg: '创建失败' }); }
});

// 获取所有赛事列表 (公开)
router.get('/api/tournaments/list', async (req, res) => {
  try {
    const tournaments = await Tournament.find({ status: { $ne: 'DRAFT' } })
      .select('title subtitle coverUrl status registrationStart registrationEnd startTime endTime advanceCount registrations createdAt')
      .sort({ createdAt: -1 });
    const result = tournaments.map(t => ({ ...t.toObject(), registrationCount: t.registrations ? t.registrations.length : 0 }));
    res.json(result);
  } catch (err) { res.status(500).json({ msg: '获取赛事列表失败' }); }
});

// 获取赛事详情 (公开)
router.get('/api/tournaments/detail/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('createdBy', 'username avatarUrl role')
      .populate('managers', 'username avatarUrl role')
      .populate('registrations.userId', 'username uid avatarUrl')
      .populate('groups.players', 'username uid avatarUrl')
      .populate('matches.playerA', 'username uid avatarUrl')
      .populate('matches.playerB', 'username uid avatarUrl')
      .populate('matches.winner', 'username uid avatarUrl')
      .populate('results.userId', 'username uid avatarUrl');
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });
    res.json(tournament);
  } catch (err) { res.status(500).json({ msg: '获取赛事详情失败' }); }
});

// ── 审计日志端点 ──
router.get('/api/tournaments/detail/:id/audit-log', authMiddleware, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .select('operationLogs status')
      .populate('operationLogs.operatedBy', 'username role avatarUrl');
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });

    // 权限控制：赛后公开，赛前仅管理
    const isPublic = ['FINISHED', 'ARCHIVED'].includes(tournament.status);
    if (!isPublic) {
      const perm = await checkTournamentPermission(req.user.id, req.params.id);
      if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    }

    // 按时间倒序
    const logs = (tournament.operationLogs || [])
      .sort((a, b) => new Date(b.operatedAt) - new Date(a.operatedAt))
      .map(log => ({
        action: log.action,
        fromStatus: log.fromStatus ?? null,
        toStatus: log.toStatus ?? null,
        operatedBy: log.operatedBy ? { username: log.operatedBy.username, role: log.operatedBy.role, avatarUrl: log.operatedBy.avatarUrl ?? null } : null,
        operatedAt: log.operatedAt,
        note: log.note ?? null,
      }));

    res.json({ logs, isPublic });
  } catch (err) {
    console.error('获取审计日志失败:', err);
    res.status(500).json({ msg: '获取审计日志失败' });
  }
});

// 更新赛事基本信息 (CHM/ADM)
router.put('/api/tournaments/detail/:id', authMiddleware, async (req, res) => {
  try {
    const perm = await checkTournamentPermission(req.user.id, req.params.id);
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    const blocked = await archivedWriteGuard(req, res, req.params.id);
    if (blocked) return;
    const { title, subtitle, description, coverUrl, rules, status, registrationStart, registrationEnd, startTime, endTime, advanceCount } = req.body;
    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (subtitle !== undefined) updateFields.subtitle = subtitle;
    if (description !== undefined) updateFields.description = description;
    if (coverUrl !== undefined) updateFields.coverUrl = coverUrl;
    if (rules !== undefined) updateFields.rules = rules;
    if (advanceCount !== undefined) updateFields.advanceCount = Number(advanceCount);
    if (registrationStart !== undefined) updateFields.registrationStart = registrationStart;
    if (registrationEnd !== undefined) updateFields.registrationEnd = registrationEnd;
    if (startTime !== undefined || endTime !== undefined) {
      if (startTime !== undefined) updateFields.startTime = startTime;
      if (endTime !== undefined) updateFields.endTime = endTime;
      updateFields.timeApproved = perm.user.role === 'ADM';
    }
    if (status !== undefined && perm.user.role === 'ADM') updateFields.status = status;

    const before = await Tournament.findById(req.params.id).select('status');
    const updated = await Tournament.findByIdAndUpdate(req.params.id, {
      $set: updateFields,
      $push: { operationLogs: { action: 'info_edit', fromStatus: before?.status ?? 'N/A', toStatus: updateFields.status ?? before?.status ?? 'N/A', operatedBy: req.user.id, operatedAt: new Date() } }
    }, { new: true });
    res.json({ msg: '赛事信息已更新', data: updated });
  } catch (err) { res.status(500).json({ msg: '更新失败' }); }
});

// ADM 审核赛事时间
router.put('/api/tournaments/detail/:id/approve-time', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'ADM') return res.status(403).json({ msg: '仅 ADM 可审核' });
    await Tournament.findByIdAndUpdate(req.params.id, { timeApproved: true });
    res.json({ msg: '赛事时间已审核通过' });
  } catch (err) { res.status(500).json({ msg: '审核失败' }); }
});

// 设计报名表 (CHM/ADM)
router.put('/api/tournaments/detail/:id/registration-form', authMiddleware, async (req, res) => {
  try {
    const perm = await checkTournamentPermission(req.user.id, req.params.id);
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    const blocked = await archivedWriteGuard(req, res, req.params.id);
    if (blocked) return;
    const { fields } = req.body;
    await Tournament.findByIdAndUpdate(req.params.id, {
      $set: { registrationForm: fields },
      $push: { operationLogs: { action: 'form_edit', fromStatus: 'N/A', toStatus: 'N/A', operatedBy: req.user.id, operatedAt: new Date(), note: `更新报名表（${fields?.length ?? 0} 个字段）` } }
    });
    res.json({ msg: '报名表已更新' });
  } catch (err) { res.status(500).json({ msg: '更新失败' }); }
});

// 选手报名
router.post('/api/tournaments/detail/:id/register', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ msg: '用户不存在' });
    if (user.banned || user.role === 'BANNED') return res.status(403).json({ msg: '您已被封禁，无法报名' });

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });
    // 不再校验 status，仅由时间窗口控制
    const now = new Date();
    if (tournament.registrationStart && now < tournament.registrationStart) return res.status(400).json({ msg: '报名尚未开始' });
    if (tournament.registrationEnd && now > tournament.registrationEnd) return res.status(400).json({ msg: '报名已截止' });

    const existing = tournament.registrations.find(r => r.userId.toString() === req.user.id);
    if (existing) return res.status(400).json({ msg: '您已报名该赛事' });

    // 自定义报名字段必填校验
    const formFields = tournament.registrationForm || [];
    const formData = req.body.formData || {};
    for (const field of formFields) {
      if (field.required && (!formData[field.label] || String(formData[field.label]).trim() === '')) {
        return res.status(400).json({ msg: `必填字段「${field.label}」不能为空` });
      }
    }

    tournament.registrations.push({ userId: req.user.id, formData });
    await tournament.save();
    await addXp(req.user.id, 100);
    res.json({ msg: '报名成功！' });
  } catch (err) {
    console.error('报名失败:', err);
    res.status(500).json({ msg: '报名失败' });
  }
});

// ── 1.1 选手查看自己的报名信息 ──
router.get('/api/tournaments/detail/:id/my-registration', authMiddleware, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });

    const reg = tournament.registrations.find(r => r.userId.toString() === req.user.id);
    if (!reg) return res.json({ registered: false });

    res.json({
      registered: true,
      registration: {
        formData: reg.formData,
        registeredAt: reg.registeredAt,
        modifyCount: reg.modifyCount ?? 0,
      }
    });
  } catch (err) {
    console.error('查询报名信息失败:', err);
    res.status(500).json({ msg: '查询失败' });
  }
});

// ── 1.2 选手修改报名信息（最多 1 次） ──
router.put('/api/tournaments/detail/:id/my-registration', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ msg: '用户不存在' });
    if (user.banned || user.role === 'BANNED')
      return res.status(403).json({ msg: '您已被封禁' });

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });

    // 时间窗口校验：报名窗口内才可修改
    const now = new Date();
    if (tournament.registrationStart && now < tournament.registrationStart)
      return res.status(400).json({ msg: '报名尚未开始' });
    if (tournament.registrationEnd && now > tournament.registrationEnd)
      return res.status(400).json({ msg: '报名已截止，无法修改' });

    const reg = tournament.registrations.find(r => r.userId.toString() === req.user.id);
    if (!reg) return res.status(400).json({ msg: '您未报名该赛事' });

    if ((reg.modifyCount ?? 0) >= 1)
      return res.status(400).json({ msg: '报名信息仅可修改一次' });

    // 必填字段校验
    const formFields = tournament.registrationForm || [];
    const formData = req.body.formData || {};
    for (const field of formFields) {
      if (field.required && (!formData[field.label] || String(formData[field.label]).trim() === '')) {
        return res.status(400).json({ msg: `必填字段「${field.label}」不能为空` });
      }
    }

    reg.formData = formData;
    reg.modifyCount = (reg.modifyCount ?? 0) + 1;

    tournament.operationLogs.push({
      action: 'registration_modify',
      fromStatus: tournament.status, toStatus: tournament.status,
      operatedBy: req.user.id,
      note: `修改报名信息（第 ${reg.modifyCount} 次）`,
    });

    await tournament.save();

    res.json({
      msg: '报名信息已更新',
      registration: {
        formData: reg.formData,
        registeredAt: reg.registeredAt,
        modifyCount: reg.modifyCount,
      }
    });
  } catch (err) {
    console.error('修改报名信息失败:', err);
    res.status(500).json({ msg: '修改失败' });
  }
});

// 选手自行取消报名
router.delete('/api/tournaments/detail/:id/register', authMiddleware, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });
    // 改为时间窗口校验，不再校验 status
    const now = new Date();
    if (tournament.registrationStart && now < tournament.registrationStart)
      return res.status(400).json({ msg: '报名尚未开始' });
    if (tournament.registrationEnd && now > tournament.registrationEnd)
      return res.status(400).json({ msg: '报名已截止，无法取消' });

    const idx = tournament.registrations.findIndex(r => r.userId.toString() === req.user.id);
    if (idx === -1) return res.status(400).json({ msg: '您未报名该赛事' });

    tournament.registrations.splice(idx, 1);
    await tournament.save();
    res.json({ msg: '已取消报名' });
  } catch (err) {
    console.error('取消报名失败:', err);
    res.status(500).json({ msg: '取消报名失败' });
  }
});

// 管理员删除违规报名
router.delete('/api/tournaments/detail/:id/registrations/:targetUserId', authMiddleware, async (req, res) => {
  try {
    const perm = await checkTournamentPermission(req.user.id, req.params.id);
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    const blocked = await archivedWriteGuard(req, res, req.params.id);
    if (blocked) return;

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });

    const idx = tournament.registrations.findIndex(r => r.userId.toString() === req.params.targetUserId);
    if (idx === -1) return res.status(400).json({ msg: '未找到该选手的报名记录' });

    tournament.registrations.splice(idx, 1);
    tournament.operationLogs.push({
      action: 'rollback',
      fromStatus: tournament.status, toStatus: tournament.status,
      operatedBy: req.user.id,
      note: `删除选手 ${req.params.targetUserId} 的报名`,
    });
    await tournament.save();
    res.json({ msg: '已删除该选手的报名' });
  } catch (err) {
    console.error('删除报名失败:', err);
    res.status(500).json({ msg: '删除报名失败' });
  }
});

// 报名表 CSV 导出（CHM/ADM）
router.get('/api/tournaments/detail/:id/registrations/export', authMiddleware, async (req, res) => {
  try {
    const perm = await checkTournamentPermission(req.user.id, req.params.id);
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });

    const tournament = await Tournament.findById(req.params.id)
      .populate('registrations.userId', 'username uid nickname contactType contactValue');
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });

    const formFields = (tournament.registrationForm || []).map(f => f.label);
    const headers = ['选手', 'UID', ...formFields, '报名时间'];
    const rows = [headers.join(',')];

    tournament.registrations.forEach(r => {
      const u = r.userId || {};
      const customFields = formFields.map(label => {
        const val = r.formData?.[label];
        return val !== undefined ? `"${val}"` : '';
      });
      rows.push([
        `"${u.username || ''}"`,
        `"${u.uid || ''}"`,
        ...customFields,
        r.registeredAt ? new Date(r.registeredAt).toISOString() : '',
      ].join(','));
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="registrations_${req.params.id}.csv"`);
    res.send('\uFEFF' + rows.join('\n'));
  } catch (err) {
    console.error('报名表 CSV 导出失败:', err);
    res.status(500).json({ msg: '导出失败' });
  }
});

// 查看报名信息 (CHM/ADM)
router.get('/api/tournaments/detail/:id/registrations', authMiddleware, async (req, res) => {
  try {
    const perm = await checkTournamentPermission(req.user.id, req.params.id);
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    const tournament = await Tournament.findById(req.params.id)
      .populate('registrations.userId', 'username uid avatarUrl nickname contactType contactValue');
    res.json({ count: tournament.registrations.length, registrations: tournament.registrations });
  } catch (err) { res.status(500).json({ msg: '获取失败' }); }
});

// 设计预选赛曲目 (CHM/ADM)
router.put('/api/tournaments/detail/:id/qualifier-songs', authMiddleware, async (req, res) => {
  try {
    const perm = await checkTournamentPermission(req.user.id, req.params.id);
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    const blocked = await archivedWriteGuard(req, res, req.params.id);
    if (blocked) return;
    const { songs } = req.body;
    await Tournament.findByIdAndUpdate(req.params.id, {
      $set: { qualifierSongs: songs },
      $push: { operationLogs: { action: 'qualifier_songs_update', fromStatus: 'QUALIFYING', toStatus: 'QUALIFYING', operatedBy: req.user.id, operatedAt: new Date(), note: `更新了 ${songs?.length ?? 0} 首预选赛曲目` } }
    });
    res.json({ msg: '预选赛曲目已设置' });
  } catch (err) { res.status(500).json({ msg: '设置失败' }); }
});

// 录入选手预选赛成绩 (CHM/ADM)
router.post('/api/tournaments/detail/:id/qualifier-scores', authMiddleware, async (req, res) => {
  try {
    const perm = await checkTournamentPermission(req.user.id, req.params.id);
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    const blocked = await archivedWriteGuard(req, res, req.params.id);
    if (blocked) return;
    const { targetUid, songName, achievement, dxScore } = req.body;
    const targetUser = await User.findOne({ uid: targetUid });
    if (!targetUser) return res.status(404).json({ msg: '选手不存在' });
    const tournament = await Tournament.findById(req.params.id);
    const existingIdx = tournament.qualifierScores.findIndex(
      s => s.userId.toString() === targetUser._id.toString() && s.songName === songName
    );
    if (existingIdx >= 0) {
      tournament.qualifierScores[existingIdx].achievement = Number(achievement);
      tournament.qualifierScores[existingIdx].dxScore = Number(dxScore || 0);
      tournament.qualifierScores[existingIdx].entryBy = perm.user.username;
      tournament.qualifierScores[existingIdx].entryTime = Date.now();
    } else {
      tournament.qualifierScores.push({ userId: targetUser._id, songName, achievement: Number(achievement), dxScore: Number(dxScore || 0), entryBy: perm.user.username });
    }
    tournament.operationLogs.push({
      action: existingIdx >= 0 ? 'score_edit' : 'score_entry',
      fromStatus: tournament.status, toStatus: tournament.status,
      operatedBy: req.user.id,
      operatedAt: new Date(),
      note: `${targetUser.username} — ${songName}（${achievement}%）`,
    });
    await tournament.save();
    res.json({ msg: '成绩录入成功！' });
  } catch (err) { res.status(500).json({ msg: '录入失败' }); }
});

// ── 获取预选赛成绩（支持 userId 过滤，供成绩录入 UX 回填）──
router.get('/api/tournaments/detail/:id/qualifier-scores', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });

    let scores = tournament.qualifierScores || [];

    // 按 userId 过滤
    if (req.query.userId) {
      scores = scores.filter(s => s.userId.toString() === req.query.userId);
    }

    res.json({ scores });
  } catch (err) {
    console.error('获取预选赛成绩失败:', err);
    res.status(500).json({ msg: '获取失败' });
  }
});

// 指定选手分组 (CHM/ADM)
router.put('/api/tournaments/detail/:id/groups', authMiddleware, async (req, res) => {
  try {
    const perm = await checkTournamentPermission(req.user.id, req.params.id);
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    const blocked = await archivedWriteGuard(req, res, req.params.id);
    if (blocked) return;
    const { groups } = req.body;
    await Tournament.findByIdAndUpdate(req.params.id, {
      $set: { groups },
      $push: { operationLogs: { action: 'group_update', fromStatus: 'QUALIFYING', toStatus: 'QUALIFYING', operatedBy: req.user.id, operatedAt: new Date(), note: `设置了 ${groups?.length ?? 0} 个分组` } }
    });
    res.json({ msg: '分组已设置' });
  } catch (err) { res.status(500).json({ msg: '分组设置失败' }); }
});

// 创建/更新正赛对局 (CHM/ADM)
router.put('/api/tournaments/detail/:id/matches', authMiddleware, async (req, res) => {
  try {
    const perm = await checkTournamentPermission(req.user.id, req.params.id);
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    const blocked = await archivedWriteGuard(req, res, req.params.id);
    if (blocked) return;
    const { matches } = req.body;
    await Tournament.findByIdAndUpdate(req.params.id, {
      $set: { matches },
      $push: { operationLogs: { action: 'match_update', fromStatus: 'ONGOING', toStatus: 'ONGOING', operatedBy: req.user.id, operatedAt: new Date(), note: `更新了 ${matches?.length ?? 0} 场对局` } }
    });
    res.json({ msg: '正赛对局已更新' });
  } catch (err) { res.status(500).json({ msg: '更新失败' }); }
});

// 记录单场比赛成绩 (CHM/ADM)
router.put('/api/tournaments/detail/:id/matches/:matchIndex/score', authMiddleware, async (req, res) => {
  try {
    const perm = await checkTournamentPermission(req.user.id, req.params.id);
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    const blocked = await archivedWriteGuard(req, res, req.params.id);
    if (blocked) return;
    const { scoreA, scoreB, songs, status, winnerId } = req.body;
    const tournament = await Tournament.findById(req.params.id);
    const matchIdx = Number(req.params.matchIndex);
    if (!tournament.matches[matchIdx]) return res.status(404).json({ msg: '对局不存在' });
    if (scoreA !== undefined) tournament.matches[matchIdx].scoreA = scoreA;
    if (scoreB !== undefined) tournament.matches[matchIdx].scoreB = scoreB;
    if (songs) tournament.matches[matchIdx].songs = songs;
    if (status) tournament.matches[matchIdx].status = status;
    if (winnerId) tournament.matches[matchIdx].winner = winnerId;
    if (status === 'FINISHED') tournament.matches[matchIdx].finishedAt = new Date();
    await tournament.save();
    res.json({ msg: '对局成绩已记录' });
  } catch (err) { res.status(500).json({ msg: '记录失败' }); }
});

// 公布比赛结果 (CHM/ADM)
router.put('/api/tournaments/detail/:id/results', authMiddleware, async (req, res) => {
  try {
    const perm = await checkTournamentPermission(req.user.id, req.params.id);
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    const blocked = await archivedWriteGuard(req, res, req.params.id);
    if (blocked) return;
    const { results, resultAnnouncement } = req.body;
    const updateFields = {};
    if (results) updateFields.results = results;
    if (resultAnnouncement) updateFields.resultAnnouncement = resultAnnouncement;
    await Tournament.findByIdAndUpdate(req.params.id, { $set: updateFields });
    res.json({ msg: '比赛结果已发布' });
  } catch (err) { res.status(500).json({ msg: '发布失败' }); }
});

// 结束赛事并收回 CHM 权限 (ADM only)
router.put('/api/tournaments/detail/:id/finish', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'ADM') return res.status(403).json({ msg: '仅 ADM 可结束赛事' });
    const tournament = await Tournament.findByIdAndUpdate(req.params.id, { status: 'FINISHED' }, { new: true });
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });
    await User.updateMany({ chmTournamentId: tournament._id, role: 'CHM' }, { $set: { role: 'user', chmTournamentId: null } });
    res.json({ msg: '赛事已结束，CHM 权限已收回' });
  } catch (err) { res.status(500).json({ msg: '操作失败' }); }
});

// ================================================================
// 🆕 Phase 1 — 赛事闭环新 API（状态机 / 预选赛 / 正赛 / 奖励 / SSE）
// ================================================================

// ── 辅助：含 TO 角色的权限检查 ──
const checkTAPermission = async (userId, tournamentId) => {
  const user = await User.findById(userId);
  if (!user) return { allowed: false, user: null, msg: '用户不存在' };
  if (user.role === 'ADM') return { allowed: true, user, msg: 'ok' };
  if (user.role === 'TO') return { allowed: true, user, msg: 'ok' };
  if (user.role === 'CHM') {
    if (user.chmTournamentId?.toString() === tournamentId.toString()) return { allowed: true, user, msg: 'ok' };
    const tournament = await Tournament.findById(tournamentId);
    if (tournament?.managers.some(m => m.toString() === userId.toString())) return { allowed: true, user, msg: 'ok' };
    return { allowed: false, user, msg: '您不是该赛事的管理员' };
  }
  return { allowed: false, user, msg: '权限不足' };
};

/** 归档拦截：已归档赛事仅 GET/HEAD/OPTIONS 放行 */
const archivedWriteGuard = async (req, res, tournamentId) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return null;
  const t = await Tournament.findById(tournamentId).select('status');
  if (!t) return res.status(404).json({ msg: '赛事不存在' });
  if (t.status === 'ARCHIVED') {
    res.status(403).json({ msg: '赛事已归档，不可修改' });
    return res;
  }
  return null;
};

// ── 1. 状态推进 ──
router.post('/api/tournaments/:id/transition', authMiddleware, async (req, res) => {
  try {
    const perm = await checkTAPermission(req.user.id, req.params.id);
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    const blocked = await archivedWriteGuard(req, res, req.params.id);
    if (blocked) return;
    const { targetStatus } = req.body;
    if (!targetStatus) return res.status(400).json({ msg: '缺少 targetStatus' });

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });

    const validation = validateTransition(tournament, targetStatus);
    if (!validation.valid) {
      return res.status(400).json({ msg: '状态变更校验未通过', errors: validation.errors });
    }

    const fromStatus = tournament.status;
    tournament.status = targetStatus;
    tournament.operationLogs.push({
      action: 'transition', fromStatus, toStatus: targetStatus,
      operatedBy: req.user.id, note: '',
    });

    // ARCHIVED → 收回 CHM 权限
    if (targetStatus === 'ARCHIVED') {
      await User.updateMany(
        { chmTournamentId: tournament._id, role: 'CHM' },
        { $set: { role: 'user', chmTournamentId: null } }
      );
    }

    await tournament.save();

    // SSE 推送
    pushSSE(tournament._id.toString(), 'tournament:stateChange', {
      from: fromStatus, to: targetStatus, timestamp: new Date().toISOString(),
    });

    // 站内信通知
    notifyStateChange(tournament, fromStatus, targetStatus).catch(() => {});

    res.json({
      msg: `赛事状态已推至 ${targetStatus}`,
      data: { from: fromStatus, to: targetStatus, tournament },
    });
  } catch (err) {
    console.error('状态推进失败:', err);
    res.status(500).json({ msg: '状态推进失败' });
  }
});

// ── 2. 状态回退 ──
router.post('/api/tournaments/:id/rollback', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'ADM') return res.status(403).json({ msg: '仅 ADM 可回退状态' });
    const { targetStatus } = req.body;
    if (!targetStatus) return res.status(400).json({ msg: '缺少 targetStatus' });

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });

    if (!canTransition(targetStatus, tournament.status)) {
      return res.status(400).json({ msg: `不能从 ${tournament.status} 回退至 ${targetStatus}` });
    }

    const fromStatus = tournament.status;
    // 级联清空
    const unset = getRollbackUnset(tournament.status, targetStatus);
    const setFields = getRollbackPatch(tournament.status, targetStatus);

    const update = { $set: { status: targetStatus, ...setFields }, $unset: unset };
    await Tournament.findByIdAndUpdate(req.params.id, update);

    // 日志
    tournament.operationLogs.push({
      action: 'rollback', fromStatus, toStatus: targetStatus,
      operatedBy: req.user.id, note: '',
    });
    tournament.status = targetStatus;
    await tournament.save();

    // SSE
    pushSSE(tournament._id.toString(), 'tournament:stateChange', {
      from: fromStatus, to: targetStatus, timestamp: new Date().toISOString(),
    });

    const updated = await Tournament.findById(req.params.id);
    res.json({ msg: `赛事已回退至 ${targetStatus}`, data: { from: fromStatus, to: targetStatus, tournament: updated } });
  } catch (err) {
    console.error('回退失败:', err);
    res.status(500).json({ msg: '回退失败' });
  }
});

// ── 3. 预选赛排名 ──
router.get('/api/tournaments/:id/qualifier/rankings', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('qualifierScores.userId', 'username uid avatarUrl');
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });

    const cutoff = parseInt(req.query.cutoff) || 0;
    const result = calculateQualifierRankings(tournament, { cutoff: cutoff || undefined });

    // 附加用户名信息
    const popMap = {};
    tournament.qualifierScores.forEach(s => {
      if (s.userId && s.userId._id) popMap[s.userId._id.toString()] = {
        username: s.userId.username, uid: s.userId.uid, avatarUrl: s.userId.avatarUrl,
      };
    });
    result.rankings = result.rankings.map(r => ({
      ...r,
      username: popMap[r.userId]?.username || '',
      avatarUrl: popMap[r.userId]?.avatarUrl || '',
    }));

    // 单曲排行榜也附加用户信息
    if (result.songBreakdown) {
      result.songBreakdown = result.songBreakdown.map(song => ({
        ...song,
        rankings: song.rankings.map(r => ({
          ...r,
          username: popMap[r.userId]?.username || '',
          avatarUrl: popMap[r.userId]?.avatarUrl || '',
        })),
      }));
    }

    res.json({
      ...result,
      cutLineRank: result.cutoff,
      advanceCount: tournament.advanceCount || 8,
    });
  } catch (err) {
    console.error('获取预选排名失败:', err);
    res.status(500).json({ msg: '获取排名失败' });
  }
});

// ── 4. 预选赛成绩录入（批量）──
router.post('/api/tournaments/:id/qualifier/scores', authMiddleware, async (req, res) => {
  try {
    const perm = await checkTAPermission(req.user.id, req.params.id);
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    const blocked = await archivedWriteGuard(req, res, req.params.id);
    if (blocked) return;

    const { scores } = req.body;
    if (!Array.isArray(scores) || scores.length === 0) {
      return res.status(400).json({ msg: '请提供 scores 数组' });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });

    // 报名选手 ID 集合（防未报名录入）
    const registeredIds = new Set(tournament.registrations.map(r => r.userId.toString()));

    let updated = 0;
    const errors = [];

    for (const entry of scores) {
      const { userId, songName, achievement, dxScore } = entry;
      if (!userId || !songName) {
        errors.push({ ...entry, reason: '缺少 userId 或 songName' });
        continue;
      }

      // 防未报名录入
      if (!registeredIds.has(userId.toString())) {
        errors.push({ userId, songName, reason: '选手未报名该赛事' });
        continue;
      }

      // 已晋级选手成绩保护（ONGOING+ 状态不可修改预选成绩）
      if (tournament.status !== 'QUALIFYING') {
        errors.push({ userId, songName, reason: '赛事已不在预选阶段，无法修改成绩' });
        continue;
      }

      const existingIdx = tournament.qualifierScores.findIndex(
        s => s.userId.toString() === userId.toString() && s.songName === songName
      );

      if (existingIdx >= 0) {
        // TO 角色只能录入新成绩，不可覆盖
        if (perm.user.role === 'TO') {
          errors.push({ userId, songName, reason: 'TO 角色不可覆盖已有成绩' });
          continue;
        }
        tournament.qualifierScores[existingIdx].achievement = Number(achievement) || 0;
        tournament.qualifierScores[existingIdx].dxScore = Number(dxScore) || 0;
        tournament.qualifierScores[existingIdx].entryBy = perm.user.username;
        tournament.qualifierScores[existingIdx].entryTime = new Date();
      } else {
        tournament.qualifierScores.push({
          userId, songName,
          achievement: Number(achievement) || 0,
          dxScore: Number(dxScore) || 0,
          entryBy: perm.user.username,
        });
      }
      updated++;
    }

    await tournament.save();

    // SSE
    pushSSE(tournament._id.toString(), 'tournament:qualifierUpdated', {
      tournamentId: tournament._id.toString(), timestamp: new Date().toISOString(),
    });

    res.json({
      msg: errors.length === 0 ? '预选赛成绩已录入' : '部分成绩录入失败',
      data: { updated, skipped: 0, errors },
    });
  } catch (err) {
    console.error('预选成绩录入失败:', err);
    res.status(500).json({ msg: '录入失败' });
  }
});

// ── 5. 确认晋级并推进到正赛 ──
router.post('/api/tournaments/:id/qualifier/advance', authMiddleware, async (req, res) => {
  try {
    const perm = await checkTAPermission(req.user.id, req.params.id);
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    const blocked = await archivedWriteGuard(req, res, req.params.id);
    if (blocked) return;

    const tournament = await Tournament.findById(req.params.id)
      .populate('qualifierScores.userId', '_id')
      .populate('registrations.userId', '_id');
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });

    const { qualifiedUserIds, overrideCutoff } = req.body;
    const targetCutoff = tournament.advanceCount || 8;

    let finalQualified;
    if (qualifiedUserIds && Array.isArray(qualifiedUserIds)) {
      finalQualified = qualifiedUserIds;
      if (overrideCutoff) tournament.advanceCount = finalQualified.length;
    } else {
      const rankings = calculateQualifierRankings(tournament);
      finalQualified = getQualifiedUserIds(rankings.rankings, targetCutoff);
    }

    if (finalQualified.length < 2) {
      return res.status(400).json({ msg: `晋级人数不足（${finalQualified.length}，需至少 2 人）` });
    }

    tournament.status = 'ONGOING';
    tournament.advanceCount = finalQualified.length;
    tournament.operationLogs.push({
      action: 'transition', fromStatus: 'QUALIFYING', toStatus: 'ONGOING',
      operatedBy: req.user.id, note: `晋级 ${finalQualified.length} 人`,
    });
    await tournament.save();

    pushSSE(tournament._id.toString(), 'tournament:stateChange', {
      from: 'QUALIFYING', to: 'ONGOING', timestamp: new Date().toISOString(),
    });

    // 站内信：选手晋级/淨汰通知
    notifyQualifierResult(tournament, finalQualified).catch(() => {});

    res.json({ msg: '已确认晋级名单，赛事进入正赛', data: { qualifiedUserIds: finalQualified, tournament } });
  } catch (err) {
    console.error('确认晋级失败:', err);
    res.status(500).json({ msg: '操作失败' });
  }
});

// ── 6. 生成对阵表（支持分组模式）──
router.post('/api/tournaments/:id/bracket/generate', authMiddleware, async (req, res) => {
  try {
    const perm = await checkTAPermission(req.user.id, req.params.id);
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    const blocked = await archivedWriteGuard(req, res, req.params.id);
    if (blocked) return;

    const tournament = await Tournament.findById(req.params.id)
      .populate('qualifierScores.userId', '_id')
      .populate('registrations.userId', '_id');
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });
    if (tournament.bracketGenerated) {
      return res.status(409).json({ msg: '对阵表已生成，请先回退 QUALIFYING 状态重置' });
    }

    const { seeding } = req.body;
    if (seeding && !['qualifier', 'random', 'manual'].includes(seeding)) {
      return res.status(400).json({ msg: '无效的 seeding 模式' });
    }

    const rankings = calculateQualifierRankings(tournament);
    const allMatches = [];
    let totalRounds = 0;
    let totalByes = 0;
    let bracketPosOffset = 0;

    if (tournament.groups && tournament.groups.length > 0) {
      // ── 分组模式：每组独立生成对阵 ──
      for (const group of tournament.groups) {
        const groupPlayerIds = (group.players || []).filter(id => id != null).map(id => id.toString());
        if (groupPlayerIds.length < 2) continue;

        // 按预选排名取该组选手
        const groupRanked = rankings.rankings.filter(r => groupPlayerIds.includes(r.userId));
        if (groupRanked.length < 2) continue;

        const groupSorted = sortByQualifierRank(groupRanked);
        const groupIds = groupSorted.map(p => p.userId);

        const result = generateSingleElimination(groupIds);

        // 给每组 match 加上 bracketPosition offset，避免重复
        const groupMatches = (result.matches || []).map(m => ({
          ...m,
          bracketPosition: m.bracketPosition + bracketPosOffset,
          roundName: `${group.name} ${m.roundName || ''}`,
        }));

        allMatches.push(...groupMatches);
        bracketPosOffset += nextPowerOfTwo(groupPlayerIds.length);
        totalRounds = Math.max(totalRounds, result.totalRounds || 0);
        totalByes += result.byeCount || 0;
      }

      if (allMatches.length === 0) {
        return res.status(400).json({ msg: '所有分组选手不足，无法生成对阵表' });
      }
    } else {
      // ── 无分组：全局单败 ──
      const qualified = getQualifiedUserIds(rankings.rankings, tournament.advanceCount);
      if (qualified.length < 2) {
        return res.status(400).json({ msg: '晋级选手不足，无法生成对阵表' });
      }

      const result = generateSingleElimination(qualified);
      allMatches.push(...(result.matches || []));
      totalRounds = result.totalRounds || 0;
      totalByes = result.byeCount || 0;
    }

    tournament.matches = allMatches;
    tournament.bracketGenerated = true;
    tournament.bracketGeneratedAt = new Date();
    if (seeding) tournament.seeding = seeding;
    tournament.operationLogs.push({
      action: 'bracket_generate',
      fromStatus: 'QUALIFYING', toStatus: 'ONGOING',
      operatedBy: req.user.id,
      operatedAt: new Date(),
      note: `生成对阵表：${totalRounds} 轮，${totalByes} 轮空`,
    });
    await tournament.save();

    res.json({
      msg: '对阵表已生成',
      data: { matches: allMatches, totalRounds, byeCount: totalByes },
    });
  } catch (err) {
    console.error('生成对阵表失败:', err);
    res.status(500).json({ msg: '生成失败' });
  }
});

// ── 7. 重置对阵表标识（允许重新生成）──
router.post('/api/tournaments/:id/bracket/reset', authMiddleware, async (req, res) => {
  try {
    const perm = await checkTAPermission(req.user.id, req.params.id);
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    const blocked = await archivedWriteGuard(req, res, req.params.id);
    if (blocked) return;

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });
    if (tournament.status !== 'QUALIFYING') {
      return res.status(400).json({ msg: '仅在 QUALIFYING 状态下可重置对阵表' });
    }

    tournament.matches = [];
    tournament.bracketGenerated = false;
    tournament.bracketGeneratedAt = null;
    tournament.operationLogs.push({
      action: 'rollback',
      fromStatus: 'QUALIFYING', toStatus: 'QUALIFYING',
      operatedBy: req.user.id,
      note: '重置对阵表生成状态（允许重新生成）',
    });
    await tournament.save();

    res.json({ msg: '对阵表已重置，可重新生成' });
  } catch (err) {
    console.error('重置对阵表失败:', err);
    res.status(500).json({ msg: '重置失败' });
  }
});

// ── 8. 获取对阵表 ──
router.get('/api/tournaments/:id/bracket', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('matches.playerA', 'username uid avatarUrl')
      .populate('matches.playerB', 'username uid avatarUrl')
      .populate('matches.winner', 'username uid avatarUrl');
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });

    const roundSet = new Set();
    tournament.matches.forEach(m => { if (m.round) roundSet.add(m.round); });
    const rounds = [...roundSet].sort((a, b) => a - b).map(r => {
      const sample = tournament.matches.find(m => m.round === r);
      return sample?.roundName || `Round ${r}`;
    });

    // 轮空位置（首轮 FINISHED 且一方为空）
    const byePositions = tournament.matches
      .filter(m => m.status === 'FINISHED' && (!m.playerA || !m.playerB))
      .map(m => m.bracketPosition);

    res.json({ matches: tournament.matches, rounds, byePositions });
  } catch (err) {
    console.error('获取对阵表失败:', err);
    res.status(500).json({ msg: '获取对阵表失败' });
  }
});

// ── 8. 录入比赛成绩 + 自动推进 ──
router.put('/api/tournaments/:id/matches/:matchId', authMiddleware, async (req, res) => {
  try {
    const perm = await checkTAPermission(req.user.id, req.params.id);
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    const blocked = await archivedWriteGuard(req, res, req.params.id);
    if (blocked) return;

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });

    const matchId = req.params.matchId;
    const match = tournament.matches.id(matchId);
    if (!match) return res.status(404).json({ msg: '对局不存在' });

    // 防篡改：FINISHED match 不可修改
    if (match.status === 'FINISHED') {
      return res.status(409).json({ msg: '该对局已结束，不可修改（需先回退赛事状态）' });
    }

    const { scoreA, scoreB, songs, status, scheduledAt, forfeited, forfeitReason } = req.body;
    if (scoreA !== undefined) match.scoreA = Number(scoreA);
    if (scoreB !== undefined) match.scoreB = Number(scoreB);
    if (songs) match.songs = songs;
    if (scheduledAt) match.scheduledAt = scheduledAt;
    if (forfeited !== undefined) match.forfeited = forfeited;
    if (forfeitReason !== undefined) match.forfeitReason = forfeitReason;

    let advanceResult = null;
    let nextMatchUpdate = null;

    if (status === 'FINISHED' || scoreA !== undefined || scoreB !== undefined) {
      // ── 自动判定 winner（含平局规则）──
      const tieRule = tournament.tieBreakRule || 'score_only';

      if (match.scoreA > match.scoreB) {
        match.winner = match.playerA;
      } else if (match.scoreB > match.scoreA) {
        match.winner = match.playerB;
      } else if (forfeited && match.playerA && !match.playerB) {
        match.winner = match.playerA;
      } else if (forfeited && match.playerB && !match.playerA) {
        match.winner = match.playerB;
      } else if (match.scoreA === match.scoreB && match.playerA && match.playerB) {
        // 平局处理
        if (tieRule === 'forfeit_lower_seed') {
          // bracketPosition 大 = 低位种子自动判负
          const posA = match.bracketPosition ?? 0;
          const posB = match.nextMatchIndex ?? 0;
          if (posA > posB) { match.winner = match.playerB; match.forfeitReason = '平局：低位种子弃权'; }
          else { match.winner = match.playerA; match.forfeitReason = '平局：低位种子弃权'; }
        } else if (tieRule === 'admin_decision') {
          // 需要请求体中传递 winnerId
          if (req.body.winnerId) {
            const winnerId = req.body.winnerId.toString();
            if (winnerId === match.playerA?.toString()) match.winner = match.playerA;
            else if (winnerId === match.playerB?.toString()) match.winner = match.playerB;
            if (match.winner) match.forfeitReason = '平局：管理员判定';
          }
          // 如果没传 winnerId，winner 保持 null，跳过 FINISHED
        }
        // score_only: winner 保持 null，下面不会 FINISHED
      }

      if (status === 'FINISHED') {
        match.status = 'FINISHED';
        match.finishedAt = new Date();

        // 自动推进 winner 到下一轮
        if (match.winner) {
          const matchIdx = tournament.matches.findIndex(m => m._id.toString() === matchId);
          const result = advanceWinner(
            tournament.matches.map(m => m.toObject ? m.toObject() : m),
            matchIdx,
            match.winner.toString()
          );
          tournament.matches = result.updatedMatches.map(m => {
            const doc = tournament.matches.find(
              dm => dm.bracketPosition === m.bracketPosition && dm.round === m.round
            );
            if (doc) {
              Object.assign(doc, m);
              return doc;
            }
            return m;
          });
          advanceResult = result;
          nextMatchUpdate = result.nextMatchUpdate;

          // 推 SSE
          pushSSE(tournament._id.toString(), 'tournament:matchResult', {
            matchId,
            winnerId: match.winner.toString(),
            scoreA: match.scoreA,
            scoreB: match.scoreB,
            nextMatchUpdate: nextMatchUpdate ? { matchIndex: nextMatchUpdate.matchIndex } : null,
          });
        }

        // 检查是否全部结束
        if (allMatchesFinished(tournament.matches)) {
          tournament.status = 'FINISHED';
          tournament.operationLogs.push({
            action: 'transition', fromStatus: 'ONGOING', toStatus: 'FINISHED',
            operatedBy: req.user.id, note: '自动结束：所有比赛已完成',
          });
        }
      }
    }

    if (status && status !== 'FINISHED') match.status = status;

    tournament.operationLogs.push({
      action: 'score_edit', fromStatus: tournament.status, toStatus: tournament.status,
      operatedBy: req.user.id, note: `更新比赛 ${matchId}`,
    });
    await tournament.save();

    // 若自动结束，推送 stateChange
    if (tournament.status === 'FINISHED') {
      pushSSE(tournament._id.toString(), 'tournament:finished', {
        tournamentId: tournament._id.toString(),
        winnerName: match.winner?.toString() || '',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      msg: '比赛成绩已录入',
      data: { match, advanced: advanceResult !== null, nextMatchUpdate },
    });
  } catch (err) {
    console.error('录入比赛成绩失败:', err);
    res.status(500).json({ msg: '录入失败' });
  }
});

// ── 9. 获取最终结果 ──
router.get('/api/tournaments/:id/results', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('results.userId', 'username uid avatarUrl');
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });
    res.json({ ranks: tournament.results || [], announcement: tournament.resultAnnouncement || '' });
  } catch (err) {
    console.error('获取结果失败:', err);
    res.status(500).json({ msg: '获取结果失败' });
  }
});

// ── 10. 发放奖励 ──
router.post('/api/tournaments/:id/rewards/distribute', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'ADM') return res.status(403).json({ msg: '仅 ADM 可发放奖励' });

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });

    const result = await distributeXp(tournament, req.body.recipients || null);
    // 站内信：最终结果公布
    notifyFinalResults(tournament).catch(() => {});
    res.json({ msg: '奖励已发放', data: result });
  } catch (err) {
    console.error('奖励发放失败:', err);
    res.status(500).json({ msg: '发放失败' });
  }
});

// ── 11. SSE 实时事件流 ──
router.get('/api/tournaments/:id/events', (req, res) => {
  const tournamentId = req.params.id;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(`event: connected\ndata: {"tournamentId":"${tournamentId}"}\n\n`);

  addSSEClient(tournamentId, res);

  const heartbeat = setInterval(() => {
    try { res.write(':heartbeat\n\n'); } catch (_) {
      clearInterval(heartbeat);
      removeSSEClient(tournamentId, res);
    }
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeSSEClient(tournamentId, res);
  });
});

// ── 11. 自动生成最终排名 ──
// 根据 bracket 反推名次：决赛 winner=1 / loser=2 / 半决赛 loser=3~4 依次类推
router.post('/api/tournaments/:id/results/generate', authMiddleware, async (req, res) => {
  try {
    const perm = await checkTAPermission(req.user.id, req.params.id);
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    const blocked = await archivedWriteGuard(req, res, req.params.id);
    if (blocked) return;

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });
    if (tournament.status !== 'FINISHED') {
      return res.status(400).json({ msg: '赛事未结束，无法生成排名' });
    }

    const matches = tournament.matches;
    const maxRound = Math.max(...matches.map(m => m.round || 0));
    const finalMatch = matches.find(m => m.round === maxRound && m.status === 'FINISHED');
    if (!finalMatch) {
      return res.status(400).json({ msg: '决赛未找到，请确认对阵表已全部完成' });
    }

    const results = [];
    const losersMap = {};

    matches.forEach(m => {
      if (m.status !== 'FINISHED' || !m.winner) return;
      const winnerId = m.winner.toString();
      const loserId = m.playerA?.toString() === winnerId
        ? m.playerB?.toString()
        : m.playerA?.toString();
      if (!loserId) return;
      if (!losersMap[m.round]) losersMap[m.round] = [];
      losersMap[m.round].push(loserId);
    });

    // rank 1: 决赛 winner
    results.push({ rank: 1, userId: finalMatch.winner });

    // rank 2: 决赛 loser
    const finalLoserId = finalMatch.playerA?.toString() === finalMatch.winner?.toString()
      ? finalMatch.playerB
      : finalMatch.playerA;
    if (finalLoserId) results.push({ rank: 2, userId: finalLoserId });

    // rank 3~4: 半决赛 losers
    const semiRound = maxRound - 1;
    if (losersMap[semiRound]) {
      losersMap[semiRound].forEach((id, i) => {
        results.push({ rank: 3 + i, userId: id });
      });
    }

    // 其余轮次 loser 按轮次反向推算
    let nextRank = results.length + 1;
    for (let r = semiRound - 1; r >= 1; r--) {
      if (losersMap[r]) {
        losersMap[r].forEach(id => {
          results.push({ rank: nextRank, userId: id });
        });
        nextRank += losersMap[r].length;
      }
    }

    tournament.results = results;
    await tournament.save();

    res.json({ msg: '最终排名已生成', data: { results } });
  } catch (err) {
    console.error('自动生成排名失败:', err);
    res.status(500).json({ msg: '生成排名失败' });
  }
});


// ── 12. 预选赛成绩 CSV 导出 ──
router.get('/api/tournaments/:id/qualifier/export', authMiddleware, async (req, res) => {
  try {
    const perm = await checkTAPermission(req.user.id, req.params.id);
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });

    const tournament = await Tournament.findById(req.params.id)
      .populate('qualifierScores.userId', 'username uid');
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });

    const headers = ['选手', 'UID', '曲目', 'Achievement', 'DX Score', '录入者', '录入时间'];
    const rows = [headers.join(',')];

    tournament.qualifierScores.forEach(s => {
      const username = s.userId?.username || '';
      const uid = s.userId?.uid || '';
      rows.push([
        `"${username}"`,
        `"${uid}"`,
        `"${s.songName || ''}"`,
        s.achievement || 0,
        s.dxScore || 0,
        `"${s.entryBy || ''}"`,
        s.entryTime ? new Date(s.entryTime).toISOString() : '',
      ].join(','));
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="qualifier_${req.params.id}.csv"`);
    res.send('\uFEFF' + rows.join('\n'));
  } catch (err) {
    console.error('CSV 导出失败:', err);
    res.status(500).json({ msg: '导出失败' });
  }
});

// ── 14. 生成结果公告模板 ──
router.post('/api/tournaments/:id/results/announce', authMiddleware, async (req, res) => {
  try {
    const perm = await checkTAPermission(req.user.id, req.params.id);
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    const blocked = await archivedWriteGuard(req, res, req.params.id);
    if (blocked) return;

    const tournament = await Tournament.findById(req.params.id)
      .populate('results.userId', 'username');
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });
    if (tournament.results.length === 0) {
      return res.status(400).json({ msg: '请先生成最终排名（results/generate）' });
    }

    const title = tournament.title || '赛事';
    const lines = [
      `【${title}】比赛结果公告`,
      '',
      '---',
      `🏆 **${title}** 已圆满结束！感谢所有选手的参与！`,
      '',
      '## 最终排名',
      '',
    ];

    // 按 rank 排序
    const sorted = [...tournament.results].sort((a, b) => a.rank - b.rank);
    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
    sorted.forEach(r => {
      const medal = medals[r.rank] || (r.rank < 10 ? `${r.rank}.` : `${r.rank}.`);
      const name = r.userId?.username || `选手[${r.userId?._id || '?'}]`;
      const note = r.note ? `（${r.note}）` : '';
      lines.push(`${medal} **${name}** ${note}`);
    });

    lines.push('', '---', '🎉 恭喜以上选手！');

    tournament.resultAnnouncement = lines.join('\n');
    await tournament.save();

    res.json({
      msg: '结果公告模板已生成',
      data: { resultAnnouncement: tournament.resultAnnouncement },
    });
  } catch (err) {
    console.error('生成结果公告失败:', err);
    res.status(500).json({ msg: '生成失败' });
  }
});

// ── 15. 归档赛事（ADM only，不可逆）──
router.post('/api/tournaments/:id/archive', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'ADM') return res.status(403).json({ msg: '仅 ADM 可归档赛事' });

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });

    const validation = validateTransition(tournament, 'ARCHIVED');
    if (!validation.valid) {
      return res.status(400).json({ msg: '归档校验未通过', errors: validation.errors });
    }

    tournament.status = 'ARCHIVED';
    tournament.operationLogs.push({
      action: 'transition', fromStatus: 'FINISHED', toStatus: 'ARCHIVED',
      operatedBy: req.user.id, note: '赛事归档（不可逆）',
    });
    await tournament.save();

    await User.updateMany(
      { chmTournamentId: tournament._id, role: 'CHM' },
      { $set: { role: 'user', chmTournamentId: null } }
    );

    pushSSE(tournament._id.toString(), 'tournament:stateChange', {
      from: 'FINISHED', to: 'ARCHIVED', timestamp: new Date().toISOString(),
    });

    res.json({ msg: '赛事已归档（不可逆）', data: { tournament } });
  } catch (err) {
    console.error('归档失败:', err);
    res.status(500).json({ msg: '归档失败' });
  }
});

// ── 16. 曲库搜索（三库合并）──
/** 用于赛事管理员从全部曲库中搜索预选曲目 */
router.get('/api/tournaments/songs/search', authMiddleware, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ msg: '请先登录' });
    const user = await User.findById(req.user.id);
    if (!user || !['ADM', 'CHM', 'TO'].includes(user.role)) {
      return res.status(403).json({ msg: '权限不足' });
    }

    const query = (req.query.q || '').trim();
    if (!query) return res.json({ data: [] });

    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const [maimai, chuni, arcaea] = await Promise.all([
      Song.find({ title: regex }).select('id title type ds level charts basic_info.artist basic_info.genre').limit(30).lean(),
      ChunithmSong.find({ $or: [{ title: regex }, { 'basic_info.title': regex }] })
        .select('title ds level basic_info.artist basic_info.genre').limit(30).lean(),
      ArcaeaSong.find({ $or: [{ title: regex }, { aliases: regex }] })
        .select('title id aliases').limit(30).lean(),
    ]);

    // 计算理论 DX 分数：从 chart notes 取最高难度，总物量 × 3
    const calcTheoDx = (s) => {
      const charts = Array.isArray(s.charts) ? s.charts : [];
      const chart = charts[charts.length - 1]; // 最高难度
      if (!chart || !chart.notes) return 0;
      const notes = Array.isArray(chart.notes) ? chart.notes : [];
      return notes.reduce((a, b) => a + (Number(b) || 0), 0) * 3;
    };

    // 统一格式
    const format = (arr, game) => arr.map(s => ({
      _id: s._id,
      game,
      title: s.title || s.basic_info?.title || '',
      artist: s.basic_info?.artist || '',
      genre: s.basic_info?.genre || '',
      ds: s.ds || [],
      level: s.level || [],
      aliases: s.aliases || [],
      coverUrl: game === 'maimai' && s.id
        ? `https://www.diving-fish.com/covers/${String(s.id).padStart(5, '0')}.png`
        : '',
      theoreticalDxScore: game === 'maimai' ? calcTheoDx(s) : 0,
      source: s,
    }));

    res.json({
      data: [
        ...format(maimai, 'maimai'),
        ...format(chuni, 'chunithm'),
        ...format(arcaea, 'arcaea'),
      ],
    });
  } catch (err) {
    console.error('曲库搜索失败:', err);
    res.status(500).json({ msg: '搜索失败' });
  }
});

// ── 18. 删除赛事（仅 ADM/CHM，仅 DRAFT/REGISTRATION 阶段）──
router.delete('/api/tournaments/:id', authMiddleware, async (req, res) => {
  try {
    const perm = await checkTAPermission(req.user.id, req.params.id);
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });
    if (!['DRAFT', 'REGISTRATION'].includes(tournament.status)) {
      return res.status(400).json({ msg: '仅 DRAFT 或 REGISTRATION 阶段的赛事可删除' });
    }

    await Tournament.findByIdAndDelete(req.params.id);
    res.json({ msg: '赛事已删除' });
  } catch (err) {
    console.error('删除赛事失败:', err);
    res.status(500).json({ msg: '删除失败' });
  }
});

// ── 19. 管理员手动录入报名（ADM/CHM，跳过时间窗口和权限校验）──
router.post('/api/tournaments/:id/register/user', authMiddleware, async (req, res) => {
  try {
    const perm = await checkTAPermission(req.user.id, req.params.id);
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ msg: '缺少 userId' });

    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ msg: '用户不存在' });

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });
    // 管理员录入不检查 status，仅确认报名未彻底截止
    // 允许提前录入（registrationStart 未到），但拒绝已截止后的录入
    if (tournament.registrationEnd && new Date() > tournament.registrationEnd)
      return res.status(400).json({ msg: '报名已截止，无法录入' });

    const existing = tournament.registrations.find(r => r.userId.toString() === userId);
    if (existing) return res.status(400).json({ msg: '该用户已报名' });

    const formData = req.body.formData || {};
    tournament.registrations.push({ userId, formData });
    await tournament.save();

    res.json({ msg: `已为 ${targetUser.username} 完成报名` });
  } catch (err) {
    console.error('管理员报名失败:', err);
    res.status(500).json({ msg: '报名失败' });
  }
});

module.exports = router;
