/**
 * MSC 2026 特殊赛制 — 路由模块
 * b1.7.11.patch-02
 * 独立于现有 tournament.js，前缀 /api/msc2026
 *
 * patch-02 修复：
 * - P0-4: stage2→stage3 超时终止允许按排名自动推进
 * - P1-2: /stage2/* /stage3/* 别名路由 → 内部转发 /race/*
 * - P1-3: stage1/stage4 端点统一 userId 序列化
 * - P2-3: Song populate 嵌套 basic_info.artist
 * - P2-4: SSE 角色分级广播 (addClient 携带 role)
 * - P2-5: /race/map 墙 perPlayer breached 标记
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const MSC2026Tournament = require('../models/MSC2026Tournament');
const Tournament = require('../models/Tournament');
const Song = require('../models/Song');
const User = require('../models/User');

const { loadTournament, checkPermission, calculateRaceRankings, shuffle, assertObjectIdList } = require('../services/msc2026/utils');
const { initStage1, startFirstGroup, completeGroupReveal, selectSong, submitScore, advance: advanceStage1, forfeitPlayer, resolveGroupTie } = require('../services/msc2026/stage1');
const { initRace, startRace, currentRace, playerAction, useItem, challengeResult, skipTurn, terminateRace } = require('../services/msc2026/raceEngine');
const { initStage4, selectSong: selectSong4, submitScore: submitScore4, advance: advanceStage4, resolveTie: resolveTie4 } = require('../services/msc2026/stage4');
const { addClient, broadcast } = require('../services/msc2026/ssePool');
const {
  undoStage1LastSong, undoStage1LastScore, revertStage1Group, resetStage1,
  undoRaceLastAction, undoRaceItemUse, undoRaceLastChallengeResult, resetRace,
  undoStage4LastSong, undoStage4LastScore, resetStage4,
  revertStage, resetAll
} = require('../services/msc2026/rollback');
const { getItem } = require('../services/msc2026/itemDefinitions');
const { CHALLENGE_TASKS } = require('../services/msc2026/challengeDefinitions');
const { getTaskById, getFallbackTask } = require('../services/msc2026/raceEngine');
const { serializeSongDoc, serializeSongPlay } = require('../services/msc2026/songSerialization');
const { withRaceMutationLock } = require('../services/msc2026/raceMutationLock');
const { getQualifiedIdsForStage, assertRequestedIdsMatch } = require('../services/msc2026/advancement');
const {
  normalizeSongPool,
  normalizeDesignatedSong,
  assertFinalSongConfig,
  resolveConfiguredSongPool,
  isStage4Initialized,
  getStoredStage4Config
} = require('../services/msc2026/songPoolConfig');
const { snapshotChallenge } = require('../services/msc2026/challengePresentation');
const { buildQualifierRankings } = require('../services/msc2026/qualifierRanking');
const { createMarket, settleMarket, prepareMarketsForRollback, FINAL_REVEAL_MS } = require('../services/msc2026/betting');

const SONG_DISPLAY_FIELDS = 'id title type basic_info.artist basic_info.bpm ds level aliases charts';

// ── 辅助 ──
async function requireTournament(res) {
  const t = await loadTournament(res);
  return t;
}

async function withLockedTournament(res, operation) {
  return withRaceMutationLock(async () => {
    const tournament = await requireTournament(res);
    if (!tournament) return null;
    return operation(tournament);
  });
}

function parseBoolean(value, label = '布尔值') {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${label}必须为 true 或 false`);
}

function normalizeRaceResultSnapshot(raw) {
  if (raw == null) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new Error('挑战原始成绩格式非法');
  const result = {};
  if (raw.achievement !== undefined && raw.achievement !== '') {
    const value = Number(raw.achievement);
    if (!Number.isFinite(value) || value < 0 || value > 101 || !/^\d{1,3}(\.\d{1,4})?$/.test(String(raw.achievement))) {
      throw new Error('挑战原始完成率须为 0-101，最多四位小数');
    }
    result.achievement = value;
  }
  if (raw.dxScore !== undefined && raw.dxScore !== '') {
    const value = Number(raw.dxScore);
    if (!Number.isInteger(value) || value < 0 || value > 2147483647) throw new Error('挑战原始 DX 分须为非负整数');
    result.dxScore = value;
  }
  if (raw.completionMs !== undefined && raw.completionMs !== '') {
    const value = Number(raw.completionMs);
    if (!Number.isInteger(value) || value < 0 || value > 24 * 60 * 60 * 1000) {
      throw new Error('挑战完成用时须为 0-86400000 的整数毫秒');
    }
    result.completionMs = value;
  }
  return Object.keys(result).length ? result : null;
}

async function assertSongsExist(songIds, label) {
  const count = await Song.countDocuments({ _id: { $in: songIds } });
  if (count !== songIds.length) throw new Error(`${label}包含曲库中不存在的曲目`);
}

function normalizeDifficultyIndexes(songIds, raw = {}, label = '图池') {
  const normalized = {};
  for (const songId of songIds) {
    const value = Number(raw?.[String(songId)] ?? 3);
    if (!Number.isInteger(value) || value < 0 || value > 4) {
      throw new Error(`${label}包含非法难度索引`);
    }
    normalized[String(songId)] = value;
  }
  return normalized;
}

async function assertSongDifficulties(songIds, difficultyIndexes, label) {
  const songs = await Song.find({ _id: { $in: songIds } }).select('_id ds').lean();
  if (songs.length !== songIds.length) throw new Error(`${label}包含曲库中不存在的曲目`);
  for (const song of songs) {
    const index = difficultyIndexes[String(song._id)];
    if (song.ds?.[index] == null) throw new Error(`${label}中的曲目缺少所选难度谱面`);
  }
}

function normalizeDrawToken(token) {
  const value = String(token ?? '').trim();
  return /^\d{3}$/.test(value) ? value : '';
}

async function ensureOldTournamentRegistrationTokens(oldTournamentId) {
  if (!oldTournamentId) return { updatedCount: 0, total: 0 };

  const oldT = await Tournament.findById(oldTournamentId);
  if (!oldT) return { updatedCount: 0, total: 0 };

  const registrations = oldT.registrations || [];
  if (registrations.length > 1000) {
    throw new Error('三位数代号池最多支持 1000 名选手');
  }

  const used = new Set();
  const needsToken = [];
  let changed = false;

  registrations.forEach((reg) => {
    const token = normalizeDrawToken(reg.token);
    if (token && !used.has(token)) {
      if (reg.token !== token) {
        reg.token = token;
        changed = true;
      }
      used.add(token);
      return;
    }
    needsToken.push(reg);
  });

  if (needsToken.length === 0) return { updatedCount: 0, total: registrations.length };

  const available = shuffle(
    Array.from({ length: 1000 }, (_, i) => String(i).padStart(3, '0'))
      .filter(token => !used.has(token))
  );

  needsToken.forEach((reg, i) => {
    reg.token = available[i];
    changed = true;
  });

  if (changed) await oldT.save();

  return { updatedCount: needsToken.length, total: registrations.length };
}

async function loadPreMatchRoster(tournament, advanceCount = 12) {
  if (!tournament.oldTournamentId) throw new Error('未关联比赛档案');
  await ensureOldTournamentRegistrationTokens(tournament.oldTournamentId);
  const oldTournament = await Tournament.findById(tournament.oldTournamentId)
    .populate('registrations.userId', 'username avatarUrl')
    .lean();
  if (!oldTournament) throw new Error('比赛档案不存在');
  return {
    oldTournament,
    roster: buildQualifierRankings(oldTournament, advanceCount).slice(0, advanceCount),
  };
}

function serializePreMatchRoster(tournament, roster) {
  const checkIns = new Map((tournament.preMatchCheckIns || []).map(entry => [
    String(entry.userId),
    entry,
  ]));
  const players = roster.map(player => {
    const checkIn = checkIns.get(player.userId);
    return {
      ...player,
      checkedIn: Boolean(checkIn),
      checkedInAt: checkIn?.checkedInAt || null,
    };
  });
  return {
    players,
    checkedInCount: players.filter(player => player.checkedIn).length,
    total: players.length,
  };
}

// ==========================================
// 🌐 全局状态
// ==========================================

router.get('/status', async (req, res) => {
  try {
    const t = await MSC2026Tournament.findOne().select('-stage2.players -stage3.players');
    if (!t) return res.json({ msg: 'ok', data: { status: 'pending' } });

    res.json({
      msg: 'ok',
      data: {
        status: t.status,
        stage1: t.stage1 ? {
          totalGroups: t.stage1.groups?.length || 0,
          completedGroups: t.stage1.groups?.filter(g => g.status === 'done').length || 0,
          status: t.stage1.status
        } : null,
        stage2: t.stage2 ? {
          shape: t.stage2.mapConfig?.shape,
          finishCount: t.stage2.finishOrder?.length || 0,
          totalPlayers: t.stage2.players?.length || 0,
          terminated: t.stage2.terminated,
          status: t.stage2.terminated ? 'terminated' : (t.stage2.status || (t.stage2.totalTimeStartedAt ? 'racing' : 'waiting'))
        } : null,
        stage3: t.stage3 ? {
          shape: t.stage3.mapConfig?.shape,
          finishCount: t.stage3.finishOrder?.length || 0,
          totalPlayers: t.stage3.players?.length || 0,
          terminated: t.stage3.terminated,
          status: t.stage3.terminated ? 'terminated' : (t.stage3.status || (t.stage3.totalTimeStartedAt ? 'racing' : 'waiting'))
        } : null,
        stage4: t.stage4 ? {
          winner: t.stage4.winner,
          needTiebreak: t.stage4.needTiebreak
        } : null,
        qualifiedStage1: t.qualifiedStage1?.length || 0,
        qualifiedStage2: t.qualifiedStage2?.length || 0,
        qualifiedStage3: t.qualifiedStage3?.length || 0
      }
    });
  } catch (err) {
    console.error('MSC 状态查询失败:', err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

// ── 配置 ──
router.get('/config', authMiddleware, async (req, res) => {
  try {
    const { allowed, msg } = await checkPermission(req.user, null, 'admin');
    if (!allowed) return res.status(403).json({ msg });

    const t = await MSC2026Tournament.findOne()
      // P2-3: artist 在 basic_info.artist 嵌套字段
      .populate('stage1SongPool', SONG_DISPLAY_FIELDS)
      .populate('stage4SongPool', SONG_DISPLAY_FIELDS)
      .populate('stage4DesignatedSongId', SONG_DISPLAY_FIELDS)
      .populate('stage4SecretDesignatedSongId', SONG_DISPLAY_FIELDS)
      .populate('stage4.songPool', SONG_DISPLAY_FIELDS)
      .populate('stage4.designatedSongId', SONG_DISPLAY_FIELDS)
      .populate('stage4.secretDesignatedSongId', SONG_DISPLAY_FIELDS);

    if (!t) return res.status(404).json({ msg: '赛事不存在' });

    const stage4Config = getStoredStage4Config(t);
    res.json({
      msg: 'ok',
      data: {
        stage1SongPool: (t.stage1SongPool || []).map(song => serializeSongDoc(song, t.stage1DifficultyIndexes?.[String(song._id)])),
        stage4SongPool: (stage4Config.songPoolIds || []).map(song => serializeSongDoc(song, stage4Config.difficultyIndexes?.[String(song._id)])),
        designatedSong: serializeSongDoc(stage4Config.designatedSongId, stage4Config.designatedDifficultyIndex),
        secretDesignatedSong: serializeSongDoc(stage4Config.secretDesignatedSongId, stage4Config.secretDesignatedDifficultyIndex)
      }
    });
  } catch (err) {
    console.error('获取配置失败:', err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

router.put('/config', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'admin');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    await withRaceMutationLock(async () => {
      const t = await requireTournament(res);
      if (!t) return;

    const {
      poolType, songPoolIds, designatedSongId, secretDesignatedSongId,
      songDifficultyIndexes, designatedDifficultyIndex, secretDesignatedDifficultyIndex
    } = req.body;

    if (poolType === 'stage1') {
      const normalizedPool = normalizeSongPool(songPoolIds, '阶段一图池');
      const difficulties = normalizeDifficultyIndexes(normalizedPool, songDifficultyIndexes, '阶段一图池');
      await assertSongDifficulties(normalizedPool, difficulties, '阶段一图池');
      t.stage1SongPool = normalizedPool;
      t.stage1DifficultyIndexes = difficulties;
    } else if (poolType === 'stage4') {
      const normalizedPool = normalizeSongPool(songPoolIds, '决赛图池');
      const normalizedDesignated = normalizeDesignatedSong(designatedSongId, '决赛表课题曲');
      const normalizedSecretDesignated = normalizeDesignatedSong(secretDesignatedSongId, '决赛里课题曲');
      const difficulties = normalizeDifficultyIndexes(normalizedPool, songDifficultyIndexes, '决赛图池');
      const designatedIndex = Number(designatedDifficultyIndex ?? 3);
      const secretDesignatedIndex = Number(secretDesignatedDifficultyIndex ?? 3);
      if (!Number.isInteger(designatedIndex) || designatedIndex < 0 || designatedIndex > 4) throw new Error('表课题曲难度非法');
      if (!Number.isInteger(secretDesignatedIndex) || secretDesignatedIndex < 0 || secretDesignatedIndex > 4) throw new Error('里课题曲难度非法');
      assertFinalSongConfig(normalizedPool, normalizedDesignated, normalizedSecretDesignated);
      await assertSongDifficulties(
        [...normalizedPool, normalizedDesignated, normalizedSecretDesignated],
        { ...difficulties, [normalizedDesignated]: designatedIndex, [normalizedSecretDesignated]: secretDesignatedIndex },
        '决赛图池'
      );
      t.stage4SongPool = normalizedPool;
      t.stage4DifficultyIndexes = difficulties;
      t.stage4DesignatedSongId = normalizedDesignated;
      t.stage4DesignatedDifficultyIndex = designatedIndex;
      t.stage4SecretDesignatedSongId = normalizedSecretDesignated;
      t.stage4SecretDesignatedDifficultyIndex = secretDesignatedIndex;
    } else {
      return res.status(400).json({ msg: '未知配置类型' });
    }

    t.operationLogs.push({
      action: 'song_pool_configured',
      stage: poolType,
      detail: { songPoolIds, designatedSongId: designatedSongId || null, secretDesignatedSongId: secretDesignatedSongId || null },
      operatedBy: req.user.id,
      operatedAt: new Date()
    });
      await t.save();
      res.json({ msg: '配置已更新', data: { count: songPoolIds?.length || 0 } });
    });
  } catch (err) {
    console.error('更新配置失败:', err);
    res.status(400).json({ msg: err.message });
  }
});

// ── 选手列表（patch-02 v2：从旧赛事拉取 + 新阶段状态叠加） ──
router.get('/players', async (req, res) => {
  try {
    const t = await MSC2026Tournament.findOne()
      .populate('oldTournamentId')
      .populate('qualifiedStage1', 'username avatarUrl')
      .populate('qualifiedStage2', 'username avatarUrl')
      .populate('qualifiedStage3', 'username avatarUrl')
      .populate('stage1.groups.p1', 'username avatarUrl')
      .populate('stage1.groups.p2', 'username avatarUrl')
      .populate('stage2.players.userId', 'username avatarUrl')
      .populate('stage3.players.userId', 'username avatarUrl')
      .populate('stage4.p1', 'username avatarUrl')
      .populate('stage4.p2', 'username avatarUrl');

    if (!t) return res.status(404).json({ msg: '赛事不存在' });

    const playerSet = new Map();
    const addPlayer = (p) => {
      if (!p) return;
      const id = String(p._id || p);
      if (!playerSet.has(id)) {
        playerSet.set(id, {
          userId: id,
          username: p.username || null,
          avatarUrl: p.avatarUrl || null
        });
      }
    };

    // 基准集：从旧赛事 registrations 拉取（优先于 registeredPlayers）
    let oldRegistrations = [];
    if (t.oldTournamentId) {
      try {
        await ensureOldTournamentRegistrationTokens(t.oldTournamentId._id || t.oldTournamentId);
        const oldT = await Tournament.findById(t.oldTournamentId)
          .populate('registrations.userId', 'username avatarUrl')
          .lean();
        if (oldT && oldT.registrations) {
          oldRegistrations = oldT.registrations;
          oldT.registrations.forEach(r => addPlayer(r.userId));
        }
      } catch { /* 旧赛事读取失败不阻塞 */ }
    }

    // fallback: 没有旧赛事时用 registeredPlayers
    if (playerSet.size === 0 && t.registeredPlayers) {
      const users = await User.find({ _id: { $in: t.registeredPlayers } }).select('username avatarUrl').lean();
      users.forEach(addPlayer);
    }

    // 叠加新赛事各阶段选手
    if (t.stage1?.groups) {
      t.stage1.groups.forEach(g => { addPlayer(g.p1); addPlayer(g.p2); });
    }
    if (t.stage2?.players) {
      t.stage2.players.forEach(p => addPlayer(p.userId));
    }
    if (t.stage3?.players) {
      t.stage3.players.forEach(p => addPlayer(p.userId));
    }
    if (t.stage4) {
      addPlayer(t.stage4.p1);
      addPlayer(t.stage4.p2);
    }
    (t.qualifiedStage1 || []).forEach(addPlayer);
    (t.qualifiedStage2 || []).forEach(addPlayer);
    (t.qualifiedStage3 || []).forEach(addPlayer);

    const players = Array.from(playerSet.values());

    // 附加阶段状态
    const stage2Ids = new Set((t.stage2?.players || []).map(p => String(p.userId?._id || p.userId)));
    const stage3Ids = new Set((t.stage3?.players || []).map(p => String(p.userId?._id || p.userId)));
    const finishedIds = new Set([
      ...(t.stage2?.finishOrder || []).map(f => String(f.userId?._id || f.userId)),
      ...(t.stage3?.finishOrder || []).map(f => String(f.userId?._id || f.userId))
    ]);
    const q1Ids = new Set((t.qualifiedStage1 || []).map(id => String(id._id || id)));
    const q2Ids = new Set((t.qualifiedStage2 || []).map(id => String(id._id || id)));
    const q3Ids = new Set((t.qualifiedStage3 || []).map(id => String(id._id || id)));

    // 旧赛事报名信息映射
    const regMap = {};
    oldRegistrations.forEach(r => {
      regMap[String(r.userId?._id || r.userId)] = {
        token: r.token || '',
        formData: r.formData || {},
        registeredAt: r.registeredAt
      };
    });

    players.forEach(p => {
      p.inStage1 = t.stage1?.groups?.some(g =>
        String(g.p1?._id || g.p1) === p.userId || String(g.p2?._id || g.p2) === p.userId
      ) || false;
      p.inStage2 = stage2Ids.has(p.userId);
      p.inStage3 = stage3Ids.has(p.userId);
      p.inStage4 = t.stage4 && (
        String(t.stage4.p1?._id || t.stage4.p1) === p.userId ||
        String(t.stage4.p2?._id || t.stage4.p2) === p.userId
      );
      p.isQualifiedStage1 = q1Ids.has(p.userId);
      p.isQualifiedStage2 = q2Ids.has(p.userId);
      p.isQualifiedStage3 = q3Ids.has(p.userId);
      p.isFinished = finishedIds.has(p.userId);
      // 附带旧赛事报名信息
      const reg = regMap[p.userId];
      if (reg) {
        p.token = reg.token;
        p.formData = reg.formData;
        p.registeredAt = reg.registeredAt;
      }
    });

    res.json({
      msg: 'ok',
      data: {
        total: players.length,
        source: t.oldTournamentId ? '旧赛事registrations' : 'registeredPlayers',
        players
      }
    });
  } catch (err) {
    console.error('获取选手列表失败:', err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

// ── 旧赛事数据接口（patch-02） ──

/** 获取旧赛事注册选手列表（含预选赛成绩） */
router.get('/old/registrations', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'admin');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });

    const t = await requireTournament(res);
    if (!t) return;
    if (!t.oldTournamentId) return res.status(404).json({ msg: '未关联旧赛事' });

    await ensureOldTournamentRegistrationTokens(t.oldTournamentId);

    const oldT = await Tournament.findById(t.oldTournamentId)
      .populate('registrations.userId', 'username avatarUrl')
      .lean();
    if (!oldT) return res.status(404).json({ msg: '旧赛事不存在' });

    // 聚合预选赛成绩
    const scoresByUser = {};
    (oldT.qualifierScores || []).forEach(s => {
      const uid = String(s.userId);
      if (!scoresByUser[uid]) scoresByUser[uid] = [];
      scoresByUser[uid].push(s);
    });

    const registrations = (oldT.registrations || []).map(r => {
      const userId = String(r.userId?._id || r.userId);
      const scores = scoresByUser[userId] || [];
      return {
        userId,
        username: r.userId?.username || null,
        avatarUrl: r.userId?.avatarUrl || null,
        token: r.token || '',
        formData: r.formData || {},
        registeredAt: r.registeredAt,
        qualifierProgress: {
          completed: scores.length,
          total: oldT.qualifierSongs?.length || 0
        },
        qualifierTotalAchievement: scores.reduce((sum, s) => sum + (s.achievement || 0), 0),
        qualifierTotalDxScore: scores.reduce((sum, s) => sum + (s.dxScore || 0), 0)
      };
    });

    res.json({
      msg: 'ok',
      data: {
        totalRegistered: registrations.length,
        tournamentTitle: oldT.title,
        qualifierSongCount: oldT.qualifierSongs?.length || 0,
        registrations
      }
    });
  } catch (err) {
    console.error('获取旧赛事注册列表失败:', err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

/** 补齐旧赛事报名选手三位数代号（MSC 现场抽奖/身份展示用） */
router.post('/old/registrations/backfill-tokens', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'admin');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });

    const t = await requireTournament(res);
    if (!t) return;
    if (!t.oldTournamentId) return res.status(404).json({ msg: '未关联比赛档案' });

    const result = await ensureOldTournamentRegistrationTokens(t.oldTournamentId);
    res.json({
      msg: result.updatedCount > 0 ? '三位数代号已补齐' : '所有选手已有唯一三位数代号',
      data: result
    });
  } catch (err) {
    console.error('补齐三位数代号失败:', err);
    res.status(400).json({ msg: err.message });
  }
});

/** 获取预选赛排名 */
router.get('/old/qualifier-rankings', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'admin');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });

    const t = await requireTournament(res);
    if (!t) return;
    if (!t.oldTournamentId) return res.status(404).json({ msg: '未关联旧赛事' });

    const { oldTournament: oldT } = await loadPreMatchRoster(t, 12);
    if (!oldT.qualifierScores || oldT.qualifierScores.length === 0) {
      return res.status(400).json({ msg: '预选赛尚无成绩数据' });
    }

    const advanceCount = Number(req.query.advance ?? 12);
    const rankings = buildQualifierRankings(oldT, advanceCount);

    res.json({
      msg: 'ok',
      data: {
        rankings,
        qualifiedCount: rankings.filter(r => r.qualified).length,
        totalPlayers: rankings.length,
        advanceThreshold: Number(advanceCount),
        qualifierSongCount: oldT.qualifierSongs?.length || 0
      }
    });
  } catch (err) {
    console.error('获取预选赛排名失败:', err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

/** 赛前大厅：读取预选赛前 12 签到状态 */
router.get('/pre-match/check-ins', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'admin');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    const tournament = await requireTournament(res);
    if (!tournament) return;
    const { roster } = await loadPreMatchRoster(tournament, 12);
    res.json({ msg: 'ok', data: serializePreMatchRoster(tournament, roster) });
  } catch (err) {
    console.error('读取赛前签到失败:', err);
    res.status(400).json({ msg: err.message });
  }
});

/** 赛前大厅：签到或撤销签到，仅在阶段一初始化前开放 */
router.put('/pre-match/check-ins/:playerId', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'admin');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    const checkedIn = parseBoolean(req.body?.checkedIn, '签到状态');

    await withRaceMutationLock(async () => {
      const tournament = await requireTournament(res);
      if (!tournament) return;
      if (tournament.status !== 'pending' || (tournament.stage1?.groups?.length || 0) > 0) {
        return res.status(409).json({ msg: '阶段一已初始化，赛前签到已锁定' });
      }

      const { roster } = await loadPreMatchRoster(tournament, 12);
      const player = roster.find(entry => entry.userId === String(req.params.playerId));
      if (!player) return res.status(400).json({ msg: '该选手不在本次预选赛前 12 名名单中' });

      const checkIns = tournament.preMatchCheckIns || [];
      const existingIndex = checkIns.findIndex(entry => String(entry.userId) === player.userId);
      if (checkedIn && existingIndex < 0) {
        checkIns.push({ userId: player.userId, checkedInAt: new Date(), checkedInBy: req.user.id });
      } else if (!checkedIn && existingIndex >= 0) {
        checkIns.splice(existingIndex, 1);
      }
      tournament.preMatchCheckIns = checkIns;
      tournament.operationLogs.push({
        action: 'pre_match_check_in_updated',
        stage: 'pending',
        detail: { playerId: player.userId, checkedIn },
        operatedBy: req.user.id,
        operatedAt: new Date(),
      });
      await tournament.save();
      res.json({
        msg: checkedIn ? `${player.username || '选手'} 已签到` : `${player.username || '选手'} 已撤销签到`,
        data: serializePreMatchRoster(tournament, roster),
      });
    });
  } catch (err) {
    console.error('更新赛前签到失败:', err);
    res.status(400).json({ msg: err.message });
  }
});

/** 从预选赛排名自动初始化阶段一 */
router.post('/stage1/init-from-qualifier', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'admin');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    await withRaceMutationLock(async () => {
      const t = await requireTournament(res);
      if (!t) return;
    if (!t.oldTournamentId) return res.status(404).json({ msg: '未关联旧赛事' });
    if (t.stage1?.status === 'done' || (t.stage1?.groups?.length || 0) > 0) {
      return res.status(400).json({ msg: '阶段一已初始化，如需重置请先手动清理' });
    }

    const { songPoolIds } = req.body;
    const advanceCount = Number(req.body.advanceCount ?? 12);
    if (!Number.isInteger(advanceCount) || advanceCount !== 12) {
      return res.status(400).json({ msg: 'MSC 2026 阶段一晋级人数必须为 12' });
    }
    const normalizedSongPoolIds = resolveConfiguredSongPool(
      t.stage1SongPool,
      songPoolIds,
      '阶段一图池'
    );
    await assertSongsExist(normalizedSongPoolIds, '阶段一图池');

    await ensureOldTournamentRegistrationTokens(t.oldTournamentId);

    const oldT = await Tournament.findById(t.oldTournamentId)
      .populate('registrations.userId', 'username avatarUrl')
      .lean();
    if (!oldT) return res.status(404).json({ msg: '旧赛事不存在' });

    const registrations = oldT.registrations || [];
    if (registrations.length < advanceCount) {
      return res.status(400).json({ msg: `报名人数不足 ${advanceCount} 人，当前仅有 ${registrations.length} 人报名` });
    }

    const selected = buildQualifierRankings(oldT, advanceCount).slice(0, advanceCount);
    const playerIds = selected.map(p => p.userId);
    const autoFilled = selected.filter(p => p.totalAchievement === 0 && p.totalDxScore === 0);

    // 写入排名快照
    t.qualifierRankings = selected.map((p, i) => ({
      rank: i + 1,
      userId: p.userId,
      totalAchievement: p.totalAchievement,
      totalDxScore: p.totalDxScore,
      qualified: true
    }));

    // 初始化阶段一（修复 #2：与 /stage1/init 一致——必须设状态 + 开第一组，
    // 否则状态停留在 pending、currentGroupIndex=-1，首次 select-song 即抛"当前不在比赛阶段"）
    t.status = 'stage1';
    await initStage1(t, playerIds, normalizedSongPoolIds, t.stage1DifficultyIndexes || {});
    await startFirstGroup(t);

    // patch-03: 启动 MSC 主赛适配层不再改动权威 tournament.status。
    // 阶段推进/收尾由组织者在 tournament 端显式控制，预选成绩录入与主赛可并行。

      res.json({
        msg: '阶段一已从预选赛初始化',
        data: {
          qualifiedFromQualifier: advanceCount,
          autoFilledCount: autoFilled.length,
          autoFilledPlayerIds: autoFilled.map(p => p.userId),
          currentGroup: {
            groupId: t.stage1.groups[0].order,
            order: t.stage1.groups[0].order,
            p1: String(t.stage1.groups[0].p1),
            p2: String(t.stage1.groups[0].p2),
            status: t.stage1.groups[0].status,
            revealEndsAt: t.stage1.groups[0].revealEndsAt
          },
          totalGroups: t.stage1.groups.length,
          currentGroupIndex: t.stage1.currentGroupIndex
        }
      });
    });
  } catch (err) {
    console.error('init-from-qualifier 失败:', err);
    res.status(400).json({ msg: err.message });
  }
});

// ── 曲库搜索 ──
router.get('/songs/search', authMiddleware, async (req, res) => {
  try {
    const { q, limit = 30 } = req.query;
    if (!q) return res.status(400).json({ msg: '缺少搜索关键词 q' });

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const songs = await Song.find({
      $or: [
        { title: regex },
        { aliases: regex }
      ]
    })
      .select('id title type ds level aliases basic_info charts')
      .limit(Math.min(Number(limit), 50))
      .lean();

    const data = songs.map(s => ({
      ...serializeSongDoc(s, 3),
      availableDifficulties: (s.ds || []).map((constant, difficultyIndex) => ({
        difficultyIndex,
        difficultyName: ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER'][difficultyIndex],
        chartConstant: constant,
        levelValue: s.level?.[difficultyIndex]
      })).filter(entry => entry.chartConstant != null)
    }));

    res.json({ msg: 'ok', data });
  } catch (err) {
    console.error('曲库搜索失败:', err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

// ==========================================
// 🏆 阶段一：12进6
// ==========================================

router.post('/stage1/init', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'admin');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    await withRaceMutationLock(async () => {
      const t = await requireTournament(res);
      if (!t) return;

    const { songPoolIds, playerIds } = req.body;

    t.status = 'stage1';
    const configuredSongPool = resolveConfiguredSongPool(t.stage1SongPool, songPoolIds, '阶段一图池');
    await assertSongsExist(configuredSongPool, '阶段一图池');

    const stage1 = await initStage1(t, playerIds, configuredSongPool, t.stage1DifficultyIndexes || {});
    await startFirstGroup(t);

    // populate
    const populated = await MSC2026Tournament.findById(t._id)
      .populate('stage1.groups.p1', 'username avatarUrl')
      .populate('stage1.groups.p2', 'username avatarUrl');

      const first = populated.stage1.groups[0];
      res.json({ msg: '分组初始化完成', data: { totalGroups: populated.stage1.groups.length, currentGroup: first } });
    });
  } catch (err) {
    console.error('阶段一初始化失败:', err);
    res.status(400).json({ msg: err.message });
  }
});

router.get('/stage1/state', async (req, res) => {
  try {
    const t = await MSC2026Tournament.findOne()
      // P2-3: artist 在 basic_info.artist 嵌套字段
      .populate('stage1.songPool', SONG_DISPLAY_FIELDS)
      .populate('stage1.groups.p1', 'username avatarUrl')
      .populate('stage1.groups.p2', 'username avatarUrl')
      .populate('stage1.groups.winner', 'username avatarUrl')
      .populate('stage1.groups.songs.songId', SONG_DISPLAY_FIELDS);

    if (!t || !t.stage1) return res.status(404).json({ msg: '阶段一未初始化' });

    const s1 = t.stage1;
    const currentGroup = s1.currentGroupIndex >= 0 ? s1.groups[s1.currentGroupIndex] : null;
    let currentTurn = null;

    if (currentGroup && currentGroup.status !== 'done') {
      if (currentGroup.status === 'p1_pick') {
        currentTurn = { pickPhase: 'p1_pick', currentPicker: currentGroup.p1?._id?.toString() };
      } else if (currentGroup.status === 'p2_pick') {
        currentTurn = { pickPhase: 'p2_pick', currentPicker: currentGroup.p2?._id?.toString() };
      } else if (currentGroup.status === 'random_pick') {
        currentTurn = { pickPhase: 'random_pick', currentPicker: null };
      } else if (currentGroup.status === 'playing') {
        currentTurn = { pickPhase: 'playing', currentPicker: null };
      } else if (currentGroup.status === 'revealing') {
        currentTurn = { pickPhase: 'revealing', currentPicker: null };
      }
    }

    // P1-3: 统一序列化 userId 字段，前端用 .userId 而非 ._id
    const serializeGroup = (g, index) => ({
      groupId: g.order,
      order: g.order,
      p1: index <= s1.currentGroupIndex && g.p1 ? { userId: String(g.p1._id), username: g.p1.username, avatarUrl: g.p1.avatarUrl } : null,
      p2: index <= s1.currentGroupIndex && g.p2 ? { userId: String(g.p2._id), username: g.p2.username, avatarUrl: g.p2.avatarUrl } : null,
      songs: index <= s1.currentGroupIndex ? (g.songs || []).map(serializeSongPlay) : [],
      status: g.status,
      concealed: index > s1.currentGroupIndex,
      revealStartedAt: index === s1.currentGroupIndex ? g.revealStartedAt : null,
      revealEndsAt: index === s1.currentGroupIndex ? g.revealEndsAt : null,
      winner: g.winner ? String(g.winner._id || g.winner) : null,
      forfait: g.forfait ? String(g.forfait._id || g.forfait) : null,
      needTiebreak: g.needTiebreak
    });

    res.json({
      msg: 'ok',
      data: {
        status: s1.status,
        currentGroupIndex: s1.currentGroupIndex,
        songPool: (s1.songPool || []).map(song => serializeSongDoc(song, s1.difficultyIndexes?.[String(song._id)])),
        totalGroups: s1.groups.length,
        completedGroups: s1.groups.filter(g => g.status === 'done').length,
        groups: s1.groups.map(serializeGroup),
        currentTurn
      }
    });
  } catch (err) {
    console.error('获取阶段一状态失败:', err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

router.get('/stage1/group/:groupId', async (req, res) => {
  try {
    const t = await MSC2026Tournament.findOne()
      .populate('stage1.groups.p1', 'username avatarUrl')
      .populate('stage1.groups.p2', 'username avatarUrl')
      // P2-3
      .populate('stage1.groups.songs.songId', SONG_DISPLAY_FIELDS);

    if (!t || !t.stage1) return res.status(404).json({ msg: '阶段一未初始化' });

    const idx = Number(req.params.groupId);
    const g = t.stage1.groups[idx];
    if (!g) return res.status(404).json({ msg: '组不存在' });
    if (idx > t.stage1.currentGroupIndex) return res.status(403).json({ msg: '该组尚未揭晓' });

    // P1-3: 统一序列化 userId
    res.json({ msg: 'ok', data: {
      groupId: g.order,
      order: g.order,
      p1: g.p1 ? { userId: String(g.p1._id), username: g.p1.username, avatarUrl: g.p1.avatarUrl } : null,
      p2: g.p2 ? { userId: String(g.p2._id), username: g.p2.username, avatarUrl: g.p2.avatarUrl } : null,
      songs: (g.songs || []).map(serializeSongPlay),
      status: g.status,
      winner: g.winner ? String(g.winner._id || g.winner) : null,
      forfait: g.forfait ? String(g.forfait._id || g.forfait) : null,
      needTiebreak: g.needTiebreak
    }});
  } catch (err) {
    console.error('获取组详情失败:', err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

router.post('/stage1/complete-reveal', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'referee');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    await withRaceMutationLock(async () => {
      const t = await requireTournament(res);
      if (!t) return;
      const group = await completeGroupReveal(t);
      const market = await createMarket({
        tournamentId: t._id,
        stage: 'stage1',
        groupIndex: t.stage1.currentGroupIndex,
        playerIds: [group.p1, group.p2],
        opensAt: new Date()
      });
      res.json({
        msg: '本组抽签揭晓完成，竞猜已开放 2 分钟',
        data: { groupIndex: t.stage1.currentGroupIndex, status: group.status, bettingClosesAt: market.closesAt }
      });
    });
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

router.post('/stage1/select-song', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'referee');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });

    await withRaceMutationLock(async () => {
      const t = await requireTournament(res);
      if (!t) return;

    const { songId } = req.body;
    const group = t.stage1?.groups?.[t.stage1.currentGroupIndex];
    let targetPlayerId;
    if (group?.status === 'p1_pick') targetPlayerId = String(group.p1);
    else if (group?.status === 'p2_pick') targetPlayerId = String(group.p2);
    else return res.status(400).json({ msg: '当前不是选曲阶段' });

    const result = await selectSong(t, targetPlayerId, songId);

    // populate song info
    // P2-3
    const populated = await MSC2026Tournament.findById(t._id)
      .populate('stage1.songPool', SONG_DISPLAY_FIELDS);

    const songs = populated.stage1.groups[populated.stage1.currentGroupIndex].songs;
    const lastSong = songs[songs.length - 1];
    const songRef = populated.stage1.songPool.find(s => s._id.toString() === lastSong.songId.toString());

      res.json({
        msg: '选曲完成',
        data: {
          song: songRef ? serializeSongDoc(songRef, lastSong.difficultyIndex) : { _id: lastSong.songId, title: '???' },
          pickType: lastSong.pickType,
          nextStep: result.nextStep
        }
      });
    });
  } catch (err) {
    console.error('选曲失败:', err);
    res.status(400).json({ msg: err.message });
  }
});

router.post('/stage1/submit-score', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'referee');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });

    await withRaceMutationLock(async () => {
      const t = await requireTournament(res);
      if (!t) return;
      const groupIndex = t.stage1.currentGroupIndex;
      const group = t.stage1.groups[groupIndex];
      const result = await submitScore(t, req.user.id, req.body);
      if (group.status === 'done' && group.winner) {
        await settleMarket({ tournamentId: t._id, stage: 'stage1', groupIndex, winnerId: group.winner });
      }
      res.json({
        msg: '成绩已录入',
        data: result
      });
    });
  } catch (err) {
    console.error('提交成绩失败:', err);
    res.status(400).json({ msg: err.message });
  }
});

router.post('/stage1/advance', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'referee');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });

    const result = await withLockedTournament(res, (t) => advanceStage1(t));
    if (!result) return;

    if (result.nextStep === 'stage_done') {
      res.json({ msg: '阶段一完成，6 人晋级', data: { qualifiedIds: result.qualifiedIds.map(String) } });
    } else if (result.nextStep === 'random_pick') {
      const song = await Song.findById(result.songId).select(SONG_DISPLAY_FIELDS).lean();
      res.json({
        msg: '系统已抽取随机曲目',
        data: {
          ...result,
          song: serializeSongDoc(song, result.difficultyIndex),
          pickType: 'random',
          nextStep: 'waiting_play_result'
        }
      });
    } else {
      res.json({ msg: '推进成功', data: result });
    }
  } catch (err) {
    console.error('阶段推进失败:', err);
    res.status(400).json({ msg: err.message });
  }
});

router.post('/stage1/forfait', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'referee');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });

    await withRaceMutationLock(async () => {
      const t = await requireTournament(res);
      if (!t) return;
      const { playerId } = req.body;
      const groupIndex = t.stage1.currentGroupIndex;
      const { group, result } = await forfeitPlayer(t, playerId);
      await settleMarket({ tournamentId: t._id, stage: 'stage1', groupIndex, winnerId: group.winner });
      res.json({
        msg: `选手弃权，对手晋级`,
        data: { winner: group.winner.toString(), forfaitBy: playerId, nextStep: result.nextStep, groupIndex: result.groupIndex }
      });
    });
  } catch (err) {
    console.error('弃权处理失败:', err);
    res.status(400).json({ msg: err.message });
  }
});

// 修复 #4：裁判加赛判定（三项全平的组，线下加赛后录入胜者）
router.post('/stage1/resolve-tie', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'referee');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });

    const { groupIndex, winnerId } = req.body;
    if (groupIndex == null || !winnerId) {
      return res.status(400).json({ msg: '需提供 groupIndex 与 winnerId' });
    }
    await withRaceMutationLock(async () => {
      const t = await requireTournament(res);
      if (!t) return;
      const group = await resolveGroupTie(t, Number(groupIndex), winnerId);
      await settleMarket({ tournamentId: t._id, stage: 'stage1', groupIndex: Number(groupIndex), winnerId: group.winner });
      res.json({ msg: '加赛结果已录入', data: { groupIndex: Number(groupIndex), winner: String(group.winner) } });
    });
  } catch (err) {
    console.error('阶段一加赛判定失败:', err);
    res.status(400).json({ msg: err.message });
  }
});

// ==========================================
// 🗺️ 跑图：阶段二 & 三
// ==========================================

router.post('/race/init', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'admin');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });

    await withLockedTournament(res, async (t) => {
      if (t.status !== 'stage2' && t.status !== 'stage3') throw new Error('当前不在跑图初始化阶段');
      if (t[t.status]?.players?.length) throw new Error('当前跑图已经初始化，如需重开请先重置');

      const playerIds = getQualifiedIdsForStage(t, t.status);
      assertRequestedIdsMatch(req.body.playerIds, playerIds, '跑图选手名单');
      const race = await initRace(t, playerIds);

    const populated = await MSC2026Tournament.findById(t._id)
      .populate(`${t.status}.players.userId`, 'username avatarUrl');

      res.json({
      msg: '跑图已初始化',
      data: {
        stage: t.status,
        mapConfig: race.mapConfig,
        timeLimitMs: race.timeLimitMs,
        turnTimeLimitMs: race.turnTimeLimitMs,
        players: populated[t.status].players.map(p => ({
          userId: String(p.userId._id || p.userId),
          username: p.userId.username,
          avatarUrl: p.userId.avatarUrl,
          startVertex: p.startVertex,
          currentLayer: p.currentLayer
        })),
        currentTurn: race.currentTurn,
        currentPlayerIndex: race.currentPlayerIndex,
        currentPlayerId: String(race.players[race.currentPlayerIndex].userId._id || race.players[race.currentPlayerIndex].userId),
        totalItemsOnMap: race.itemsOnMap.length,
        totalTasks: CHALLENGE_TASKS.length
      }
      });
    });
  } catch (err) {
    console.error('跑图初始化失败:', err);
    res.status(400).json({ msg: err.message });
  }
});

router.post('/race/start', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'admin');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    await withLockedTournament(res, async (t) => {
      const result = await startRace(t);
      res.json({ msg: '跑图已开始', data: result });
    });
  } catch (err) {
    console.error('开始跑图失败:', err);
    res.status(400).json({ msg: err.message });
  }
});

router.get('/race/state', async (req, res) => {
  try {
    const t = await MSC2026Tournament.findOne()
      .populate('stage2.players.userId', 'username avatarUrl')
      .populate('stage3.players.userId', 'username avatarUrl')
      .populate('stage2.finishOrder.userId', 'username avatarUrl')
      .populate('stage3.finishOrder.userId', 'username avatarUrl');

    if (!t) return res.status(404).json({ msg: '赛事不存在' });

    const race = currentRace(t);
    if (!race) return res.status(404).json({ msg: '不在跑图阶段' });

    const now = Date.now();
    const totalElapsed = race.totalTimeStartedAt ? now - new Date(race.totalTimeStartedAt).getTime() : 0;
    const turnElapsed = race.turnStartedAt ? now - new Date(race.turnStartedAt).getTime() : 0;
    const pendingChallenge = race.challengeHistory?.some(ch => ch.passed === null);

    res.json({
      msg: 'ok',
      data: {
        stage: t.status,
        status: race.terminated ? 'terminated' : (race.status || (race.totalTimeStartedAt ? (pendingChallenge ? 'adjudicating' : 'racing') : 'waiting')),
        mapConfig: race.mapConfig,
        timeLimitMs: race.timeLimitMs,
        turnTimeLimitMs: race.turnTimeLimitMs,
        totalTimeStartedAt: race.totalTimeStartedAt,
        turnStartedAt: race.turnStartedAt,
        currentTurn: race.currentTurn,
        roundNumber: race.roundNumber || 1,
        roundPosition: race.roundPosition || 0,
        turnOrder: (race.turnOrder || []).map(index => String(race.players[index]?.userId?._id || race.players[index]?.userId)),
        pendingJudgementCount: race.challengeHistory?.filter(ch => ch.passed === null).length || 0,
        currentPlayerIndex: race.currentPlayerIndex,
        currentPlayerId: String(race.players[race.currentPlayerIndex]?.userId?._id || race.players[race.currentPlayerIndex]?.userId),
        players: race.players.map(p => ({
          userId: String(p.userId._id || p.userId),
          username: p.userId.username,
          avatarUrl: p.userId.avatarUrl,
          startVertex: p.startVertex,
          currentLayer: p.currentLayer,
          itemCount: p.items.length,
          itemUsedCount: p.items.filter(i => i.status === 'consumed' || i.status === 'armed').length,
          silentUntilTurn: p.silentUntilTurn,
          disableItemsUntilTurn: p.disableItemsUntilTurn,
          status: p.finishOrder ? 'finished' : 'racing',
          finishOrder: p.finishOrder,
          finishTimestamp: p.finishTimestamp,
          challengeFailureCount: p.challengeFailureCount || 0,
          successfulChallengeAverage: p.successfulChallengeCount
            ? (p.successfulChallengeAchievementTotal || 0) / p.successfulChallengeCount
            : 0,
          cumulativeDxScore: p.cumulativeDxScore || 0
        })),
        finishOrder: race.finishOrder,
        actionLog: race.actionLog.slice(-50).map(log => {
          const value = log.toObject ? log.toObject() : { ...log };
          if (value.actionType === 'pickup') value.detail = { zoneIndex: value.detail?.zoneIndex };
          return value;
        }),
        turnRemainingMs: race.status === 'adjudicating' || (!race.status && pendingChallenge) || !race.turnStartedAt
          ? null
          : Math.max(0, race.turnTimeLimitMs - turnElapsed),
        totalRemainingMs: race.totalTimeStartedAt ? Math.max(0, race.timeLimitMs - totalElapsed) : race.timeLimitMs,
        terminated: race.terminated,
        terminatedReason: race.terminatedReason
      }
    });
  } catch (err) {
    console.error('获取跑图状态失败:', err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

router.get('/race/map', async (req, res) => {
  try {
    const t = await MSC2026Tournament.findOne()
      .populate('stage2.players.userId', 'username avatarUrl')
      .populate('stage3.players.userId', 'username avatarUrl');

    if (!t) return res.status(404).json({ msg: '赛事不存在' });

    const race = currentRace(t);
    if (!race) return res.status(404).json({ msg: '不在跑图阶段' });

    // P2-5: 墙状态改为按选手分别标记（每人各自破墙，非全局共享）
    const wallsBroken = [];
    for (let i = 0; i < race.mapConfig.layers - 1; i++) {
      const breachedBy = race.challengeHistory
        .filter(ch => ch.wallIndex === i && ch.passed === true)
        .map(ch => ch.playerId.toString());
      wallsBroken.push({
        wallIndex: i,
        label: race.mapConfig.wallLabels[i],
        breachedBy: [...new Set(breachedBy)],
        // 按选手标记各自是否已破此墙
        perPlayer: race.players.map(p => ({
          userId: String(p.userId._id || p.userId),
          breached: race.challengeHistory.some(
            ch => ch.wallIndex === i && ch.passed === true && ch.playerId.toString() === String(p.userId._id || p.userId)
          )
        }))
      });
    }

    res.json({
      msg: 'ok',
      data: {
        players: race.players.map(p => ({
          userId: String(p.userId._id || p.userId),
          username: p.userId.username,
          avatarUrl: p.userId.avatarUrl,
          startVertex: p.startVertex,
          currentLayer: p.currentLayer,
          itemCount: p.items.length,
          itemUsedCount: p.items.filter(i => i.status === 'consumed' || i.status === 'armed').length,
          status: p.finishOrder ? 'finished' : 'racing',
          finishOrder: p.finishOrder,
          challengeFailureCount: p.challengeFailureCount || 0,
          successfulChallengeAverage: p.successfulChallengeCount
            ? (p.successfulChallengeAchievementTotal || 0) / p.successfulChallengeCount
            : 0,
          cumulativeDxScore: p.cumulativeDxScore || 0
        })),
        itemsOnMap: race.itemsOnMap.map(i => {
          return {
            zoneIndex: i.zoneIndex,
            collected: i.collected
          };
        }),
        wallsBroken,
        currentTurn: race.currentTurn,
        roundNumber: race.roundNumber || 1,
        roundPosition: race.roundPosition || 0,
        turnOrder: (race.turnOrder || []).map(index => String(race.players[index]?.userId?._id || race.players[index]?.userId)),
        currentPlayerIndex: race.currentPlayerIndex,
        currentPlayerId: String(race.players[race.currentPlayerIndex]?.userId?._id || race.players[race.currentPlayerIndex]?.userId)
      }
    });
  } catch (err) {
    console.error('获取地图失败:', err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

router.post('/race/action', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'referee');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });

    await withLockedTournament(res, async (t) => {
      const { actionType, zoneIndex } = req.body;
      const race = currentRace(t);
      if (!race) return res.status(400).json({ msg: '不在跑图阶段' });
      const cp = race.players[race.currentPlayerIndex];
      if (!cp) return res.status(400).json({ msg: '无当前选手' });
      const targetPlayerId = String(cp.userId?._id || cp.userId);
      const result = await playerAction(t, targetPlayerId, actionType, zoneIndex);
      res.json(result.action === 'advance' ? { msg: '进入挑战', data: result } : { msg: '拾取道具', data: result });
    });
  } catch (err) {
    console.error('跑图行动失败:', err);
    res.status(400).json({ msg: err.message });
  }
});

router.post('/race/use-item', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'referee');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });

    await withLockedTournament(res, async (t) => {
      const { itemRef } = req.body;
      const race = currentRace(t);
      if (!race) return res.status(400).json({ msg: '不在跑图阶段' });
      const cp = race.players[race.currentPlayerIndex];
      if (!cp) return res.status(400).json({ msg: '无当前选手' });
      const targetPlayerId = String(cp.userId?._id || cp.userId);
      const result = await useItem(t, targetPlayerId, itemRef);
      res.json({ msg: `已使用 ${result.name}`, data: result });
    });
  } catch (err) {
    console.error('道具使用失败:', err);
    res.status(400).json({ msg: err.message });
  }
});

router.get('/race/challenge', authMiddleware, async (req, res) => {
  try {
    const t = await MSC2026Tournament.findOne();
    if (!t) return res.status(404).json({ msg: '赛事不存在' });

    const race = currentRace(t);
    if (!race) return res.status(404).json({ msg: '不在跑图阶段' });

    // 统一判定按本圈行动顺序处理，禁止裁判录入顺序反向影响结果。
    const pending = race.status === 'adjudicating'
      ? race.challengeHistory.find(ch => ch.passed === null)
      : [...race.challengeHistory].reverse().find(ch => ch.passed === null);
    if (!pending) return res.status(400).json({ msg: '无待判定的挑战' });

    // P1-4: 优先返回 resolvedChallenge 快照（含道具修改后的挑战条件）
    // P0-1: 不再依赖 race._taskMap，转用快照或 CHALLENGE_TASKS
    if (pending.resolvedChallenge) {
      let rawTask = getTaskById(pending.taskId);
      if (!rawTask) rawTask = getFallbackTask(pending.taskId, race.taskPool.fallbackTasks);
      const originalChallenge = pending.originalChallenge || snapshotChallenge(rawTask, pending.taskId);
      const effectiveChallenge = snapshotChallenge(pending.resolvedChallenge, pending.taskId);
      res.json({
        msg: 'ok',
        data: {
          playerId: pending.playerId.toString(),
          ...effectiveChallenge,
          wallLabel: race.mapConfig.wallLabels[pending.wallIndex],
          wallIndex: pending.wallIndex,
          originalChallenge,
          effectiveChallenge,
          activeItemEffects: pending.activeItemEffects || [],
          itemEffectResults: pending.itemEffectResults || [],
          pendingJudgement: race.status === 'adjudicating',
          raceStatus: race.status,
          roundNumber: race.roundNumber || 1
        }
      });
      return;
    }

    // 无快照回退：从 CHALLENGE_TASKS / fallbackTasks 读取
    let task = getTaskById(pending.taskId);
    if (!task) task = getFallbackTask(pending.taskId, race.taskPool.fallbackTasks);
    if (!task) return res.status(404).json({ msg: '挑战任务不存在' });

    const originalChallenge = snapshotChallenge(task, pending.taskId);
    res.json({
      msg: 'ok',
      data: {
        playerId: pending.playerId.toString(),
        ...originalChallenge,
        wallLabel: race.mapConfig.wallLabels[pending.wallIndex],
        wallIndex: pending.wallIndex,
        originalChallenge,
        effectiveChallenge: originalChallenge,
        activeItemEffects: [],
        itemEffectResults: [],
        pendingJudgement: race.status === 'adjudicating',
        raceStatus: race.status,
        roundNumber: race.roundNumber || 1
      }
    });
  } catch (err) {
    console.error('获取挑战失败:', err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

router.post('/race/challenge-result', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'referee');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });

    await withLockedTournament(res, async (t) => {
      const passed = parseBoolean(req.body.passed, '挑战判定 passed');
      const resultSnapshot = normalizeRaceResultSnapshot(req.body.resultSnapshot);
      const result = await challengeResult(t, req.user.id, passed, resultSnapshot);
      if (passed) {
        if (result.raceTerminated) {
          res.json({ msg: '挑战成功，跑图结束', data: result });
        } else {
          res.json({ msg: '挑战成功', data: result });
        }
      } else {
        res.json({ msg: '挑战失败，弹回', data: result });
      }
    });
  } catch (err) {
    console.error('挑战判定失败:', err);
    res.status(400).json({ msg: err.message });
  }
});

router.post('/race/skip-turn/manual', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'referee');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });

    await withLockedTournament(res, async (t) => {
      const result = await skipTurn(t, 'skip_manual');
      res.json({ msg: '已跳过当前选手回合', data: result });
    });
  } catch (err) {
    console.error('跳过回合失败:', err);
    res.status(400).json({ msg: err.message });
  }
});

router.get('/race/my-items', authMiddleware, async (req, res) => {
  try {
    const t = await MSC2026Tournament.findOne();
    if (!t) return res.status(404).json({ msg: '赛事不存在' });

    const race = currentRace(t);
    if (!race) return res.status(404).json({ msg: '不在跑图阶段' });

    const player = race.players.find(p => p.userId.toString() === req.user.id.toString());
    if (!player) return res.status(404).json({ msg: '你不在比赛中' });

    const items = player.items.map(i => {
      const def = getItem(i.itemRef);
      return {
        itemRef: i.itemRef,
        name: def ? def.name : '???',
        type: def ? def.type : '???',
        description: def ? def.description : '',
        penalty: def && def.penalty ? def.penalty : null,
        probability: def && def.probability != null ? def.probability : null,
        status: i.status
      };
    });

    res.json({
      msg: 'ok',
      data: {
        items,
        disableItemsUntilTurn: player.disableItemsUntilTurn
      }
    });
  } catch (err) {
    console.error('获取道具失败:', err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

router.get('/race/player/:playerId/items', authMiddleware, async (req, res) => {
  try {
    const t = await MSC2026Tournament.findOne();
    if (!t) return res.status(404).json({ msg: '赛事不存在' });

    const race = currentRace(t);
    if (!race) return res.status(404).json({ msg: '不在跑图阶段' });

    const playerId = String(req.params.playerId);
    if (String(req.user.id) !== playerId) {
      const perm = await checkPermission(req.user, t, 'referee');
      if (!perm.allowed) return res.status(403).json({ msg: '只能查看自己的隐藏道具' });
    }
    const player = race.players.find(p => String(p.userId?._id || p.userId) === playerId);
    if (!player) return res.status(404).json({ msg: '选手不在比赛中' });

    const user = await User.findById(playerId).select('username avatarUrl').lean();
    const items = player.items.map(i => {
      const def = getItem(i.itemRef);
      return {
        itemRef: i.itemRef,
        name: def ? def.name : '???',
        type: def ? def.type : '???',
        description: def ? def.description : '',
        penalty: def && def.penalty ? def.penalty : null,
        probability: def && def.probability != null ? def.probability : null,
        status: i.status
      };
    });

    res.json({
      msg: 'ok',
      data: {
        player: {
          userId: playerId,
          username: user?.username || null,
          avatarUrl: user?.avatarUrl || null
        },
        items,
        disableItemsUntilTurn: player.disableItemsUntilTurn,
        silentUntilTurn: player.silentUntilTurn
      }
    });
  } catch (err) {
    console.error('获取选手道具失败:', err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

router.post('/race/terminate', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'admin');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });

    await withLockedTournament(res, async (t) => {
      const result = await terminateRace(t, 'admin');
      res.json({ msg: '跑图已终止', data: result });
    });
  } catch (err) {
    console.error('终止跑图失败:', err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

router.get('/race/challenge-history', async (req, res) => {
  try {
    const t = await MSC2026Tournament.findOne();
    if (!t) return res.status(404).json({ msg: '赛事不存在' });

    const race = currentRace(t);
    if (!race) return res.status(404).json({ msg: '不在跑图阶段' });

    const history = race.challengeHistory.map(ch => {
      // P0-1: 优先用快照，其次 CHALLENGE_TASKS
      let taskName = ch.resolvedChallenge?.taskName || '???';
      if (taskName === '???') {
        const staticTask = getTaskById(ch.taskId);
        if (staticTask) taskName = staticTask.name;
        else {
          const fbTask = getFallbackTask(ch.taskId, race.taskPool.fallbackTasks);
          if (fbTask) taskName = fbTask.name;
        }
      }
      return {
        wallIndex: ch.wallIndex,
        taskId: ch.taskId,
        playerId: ch.playerId.toString(),
        passed: ch.passed,
        taskName,
        originalChallenge: ch.originalChallenge || null,
        effectiveChallenge: ch.resolvedChallenge || null,
        itemEffectResults: ch.itemEffectResults || [],
        timestamp: ch.judgedAt
      };
    });

    res.json({ msg: 'ok', data: { history } });
  } catch (err) {
    console.error('获取挑战历史失败:', err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

router.get('/race/task-pool', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'admin');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });

    const t = await MSC2026Tournament.findOne();
    if (!t) return res.status(404).json({ msg: '赛事不存在' });

    const race = currentRace(t);
    if (!race) return res.status(404).json({ msg: '不在跑图阶段' });

    res.json({
      msg: 'ok',
      data: {
        used: race.taskPool.used,
        remaining: race.taskPool.remaining,
        fallbackCount: race.taskPool.fallbackCount
      }
    });
  } catch (err) {
    console.error('获取任务库失败:', err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

// ── 阶段二 → 阶段三 推进 ──
router.post('/stage2/advance-to-stage3', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'admin');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    await withRaceMutationLock(async () => {
      const t = await requireTournament(res);
      if (!t) return;

    if (t.status !== 'stage2') return res.status(400).json({ msg: '当前不在阶段二' });
    if (!t.stage2) return res.status(400).json({ msg: '阶段二未初始化' });

    if (!t.stage2.terminated) return res.status(400).json({ msg: '阶段二尚未完成结算' });

    const qualifiedIds = getQualifiedIdsForStage(t, 'stage3');
    const rankingIds = calculateRaceRankings(t.stage2.players).slice(0, 4).map(r => String(r.userId));
    assertRequestedIdsMatch(qualifiedIds, rankingIds, '阶段二晋级名单');
    assertRequestedIdsMatch(req.body.qualifiedIds, qualifiedIds, '阶段二晋级名单');

    t.status = 'stage3';
    t.qualifiedStage2 = qualifiedIds;

    t.operationLogs.push({
      action: 'stage_advance',
      stage: 'stage2→stage3',
      detail: { qualifiedIds },
      operatedBy: req.user.id,
      operatedAt: new Date()
    });

    await t.save();

    broadcast('stage_advanced', { from: 'stage2', to: 'stage3', timestamp: Date.now() });

      res.json({ msg: '已推进到阶段三', data: { status: 'stage3', qualifiedIds } });
    });
  } catch (err) {
    console.error('推进阶段三失败:', err);
    res.status(400).json({ msg: err.message });
  }
});

// ==========================================
// 🏅 阶段四：决赛
// ==========================================

router.post('/stage4/init', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'admin');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    await withRaceMutationLock(async () => {
      const t = await requireTournament(res);
      if (!t) return;

    if (t.status !== 'stage3') return res.status(400).json({ msg: '当前不在决赛初始化阶段' });
    if (!t.stage3?.terminated) return res.status(400).json({ msg: '阶段三尚未完成' });
    if (isStage4Initialized(t.stage4)) return res.status(400).json({ msg: '决赛已经初始化，如需重开请先重置' });

    const { songPoolIds, designatedSongId, secretDesignatedSongId } = req.body;
    const storedConfig = getStoredStage4Config(t);
    const configuredSongPool = resolveConfiguredSongPool(
      storedConfig.songPoolIds,
      songPoolIds,
      '决赛图池'
    );
    const configuredDesignatedSong = normalizeDesignatedSong(storedConfig.designatedSongId, '决赛表课题曲');
    const configuredSecretDesignatedSong = normalizeDesignatedSong(storedConfig.secretDesignatedSongId, '决赛里课题曲');
    if (designatedSongId) {
      const requestedDesignatedSong = normalizeDesignatedSong(designatedSongId);
      if (requestedDesignatedSong !== configuredDesignatedSong) {
        throw new Error('决赛课题曲与已保存的比赛配置不一致，请刷新后重试');
      }
    }
    if (secretDesignatedSongId) {
      const requestedSecretSong = normalizeDesignatedSong(secretDesignatedSongId, '决赛里课题曲');
      if (requestedSecretSong !== configuredSecretDesignatedSong) {
        throw new Error('决赛里课题曲与已保存的比赛配置不一致，请刷新后重试');
      }
    }
    assertFinalSongConfig(configuredSongPool, configuredDesignatedSong, configuredSecretDesignatedSong);
    await assertSongsExist([...configuredSongPool, configuredDesignatedSong, configuredSecretDesignatedSong], '决赛图池');

    const playerIds = getQualifiedIdsForStage(t, 'stage4');
    const rankingIds = calculateRaceRankings(t.stage3.players).slice(0, 2).map(r => String(r.userId));
    assertRequestedIdsMatch(playerIds, rankingIds, '决赛选手名单');
    assertRequestedIdsMatch(req.body.playerIds, playerIds, '决赛选手名单');

    t.stage4SongPool = configuredSongPool;
    t.stage4DifficultyIndexes = storedConfig.difficultyIndexes || {};
    t.stage4DesignatedSongId = configuredDesignatedSong;
    t.stage4DesignatedDifficultyIndex = storedConfig.designatedDifficultyIndex ?? 3;
    t.stage4SecretDesignatedSongId = configuredSecretDesignatedSong;
    t.stage4SecretDesignatedDifficultyIndex = storedConfig.secretDesignatedDifficultyIndex ?? 3;
    t.stage4 = null;
    t.status = 'stage4';

    const s4 = await initStage4(
      t,
      playerIds,
      configuredSongPool,
      configuredDesignatedSong,
      configuredSecretDesignatedSong,
      storedConfig.difficultyIndexes || {},
      storedConfig.designatedDifficultyIndex ?? 3,
      storedConfig.secretDesignatedDifficultyIndex ?? 3
    );

      const market = await createMarket({
        tournamentId: t._id,
        stage: 'stage4',
        playerIds: [s4.p1, s4.p2],
        opensAt: new Date(Date.now() + FINAL_REVEAL_MS)
      });

      res.json({
        msg: '决赛已初始化，选手揭晓后将开放 2 分钟竞猜',
        data: {
          p1: { userId: s4.p1.toString() },
          p2: { userId: s4.p2.toString() },
          designatedSongId: s4.designatedSongId.toString(),
          status: s4.status,
          totalSongs: 5,
          songs: [],
          bettingOpensAt: market.opensAt,
          bettingClosesAt: market.closesAt
        }
      });
    });
  } catch (err) {
    console.error('决赛初始化失败:', err);
    res.status(400).json({ msg: err.message });
  }
});

router.get('/stage4/state', async (req, res) => {
  try {
    const t = await MSC2026Tournament.findOne()
      .populate('stage4.p1', 'username avatarUrl')
      .populate('stage4.p2', 'username avatarUrl')
      // P2-3
      .populate('stage4.songPool', SONG_DISPLAY_FIELDS)
      .populate('stage4.designatedSongId', SONG_DISPLAY_FIELDS)
      .populate('stage4.songs.songId', SONG_DISPLAY_FIELDS);

    if (!t || !t.stage4) return res.status(404).json({ msg: '决赛未初始化' });

    const s4 = t.stage4;
    let currentTurn = null;
    if (s4.status === 'p1_pick') currentTurn = { phase: 'p1_pick', currentPicker: s4.p1?._id?.toString() };
    else if (s4.status === 'p2_pick') currentTurn = { phase: 'p2_pick', currentPicker: s4.p2?._id?.toString() };
    else if (s4.status === 'random_pick') currentTurn = { phase: 'random_pick', currentPicker: null };

    // P1-3: 统一序列化 userId
    res.json({
      msg: 'ok',
      data: {
        status: s4.status,
        p1: s4.p1 ? { userId: String(s4.p1._id), username: s4.p1.username, avatarUrl: s4.p1.avatarUrl } : null,
        p2: s4.p2 ? { userId: String(s4.p2._id), username: s4.p2.username, avatarUrl: s4.p2.avatarUrl } : null,
        songPool: (s4.songPool || []).map(song => serializeSongDoc(song, s4.difficultyIndexes?.[String(song._id)])),
        designatedSong: serializeSongDoc(s4.designatedSongId, s4.designatedDifficultyIndex),
        songs: (s4.songs || []).map(serializeSongPlay),
        secretRevealed: Boolean(s4.secretRevealedAt),
        currentTurn,
        winner: s4.winner ? String(s4.winner._id || s4.winner) : null,
        needTiebreak: s4.needTiebreak
      }
    });
  } catch (err) {
    console.error('获取决赛状态失败:', err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

router.post('/stage4/select-song', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'referee');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    await withRaceMutationLock(async () => {
      const t = await requireTournament(res);
      if (!t) return;

    const { songId } = req.body;
    const s4 = t.stage4;
    let targetPlayerId;
    if (s4?.status === 'p1_pick') targetPlayerId = String(s4.p1);
    else if (s4?.status === 'p2_pick') targetPlayerId = String(s4.p2);
    else return res.status(400).json({ msg: '当前不是选曲阶段' });

    const result = await selectSong4(t, targetPlayerId, songId);

    const lastSong = result.stage4.songs[result.stage4.songs.length - 1];
    // P2-3
    const songRef = await Song.findById(lastSong.songId).select(SONG_DISPLAY_FIELDS).lean();

      res.json({
        msg: '选曲完成',
        data: {
          song: songRef ? serializeSongDoc(songRef, lastSong.difficultyIndex) : { title: '???' },
          pickType: lastSong.pickType,
          nextStep: result.nextStep
        }
      });
    });
  } catch (err) {
    console.error('决赛选曲失败:', err);
    res.status(400).json({ msg: err.message });
  }
});

router.post('/stage4/submit-score', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'referee');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });

    await withRaceMutationLock(async () => {
      const t = await requireTournament(res);
      if (!t) return;
      const result = await submitScore4(t, req.user.id, req.body);
      res.json({ msg: '成绩已录入', data: { nextStep: result.nextStep } });
    });
  } catch (err) {
    console.error('决赛成绩提交失败:', err);
    res.status(400).json({ msg: err.message });
  }
});

router.post('/stage4/advance', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'referee');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });

    const result = await withLockedTournament(res, (t) => advanceStage4(t));
    if (!result) return;

    if (result.nextStep === 'match_done') {
      const t = await MSC2026Tournament.findOne().select('_id').lean();
      if (t) await settleMarket({ tournamentId: t._id, stage: 'stage4', winnerId: result.winner });
      res.json({ msg: '决赛结束', data: result });
    } else if (result.nextStep === 'random_pick') {
      // P2-3
      const song = await Song.findById(result.song?.songId).select(SONG_DISPLAY_FIELDS).lean();
      res.json({
        msg: '系统已抽取随机曲目',
        data: { song: serializeSongDoc(song, result.song?.difficultyIndex), pickType: 'random', nextStep: 'waiting_play_result' }
      });
    } else if (result.nextStep === 'designated_pick') {
      // P2-3
      const song = await Song.findById(result.designatedSongId).select(SONG_DISPLAY_FIELDS).lean();
      res.json({
        msg: '课题曲阶段',
        data: { song: serializeSongDoc(song, result.difficultyIndex), pickType: 'designated', nextStep: 'waiting_play_result' }
      });
    } else if (result.nextStep === 'final_challenge') {
      const song = await Song.findById(result.secretDesignatedSongId).select(SONG_DISPLAY_FIELDS).lean();
      res.json({
        msg: '最终挑战已揭晓',
        data: { song: serializeSongDoc(song, result.difficultyIndex), pickType: 'secret_designated', nextStep: 'final_challenge' }
      });
    } else {
      res.json({ msg: '推进成功', data: result });
    }
  } catch (err) {
    console.error('决赛推进失败:', err);
    res.status(400).json({ msg: err.message });
  }
});

// 修复 #4：决赛加赛判定（五曲全平后，线下加赛录入胜者并收尾赛事）
router.post('/stage4/resolve-tie', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'referee');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });

    const { winnerId } = req.body;
    if (!winnerId) return res.status(400).json({ msg: '需提供 winnerId' });
    await withRaceMutationLock(async () => {
      const t = await requireTournament(res);
      if (!t) return;
      const result = await resolveTie4(t, winnerId);
      await settleMarket({ tournamentId: t._id, stage: 'stage4', winnerId: result.winner });
      res.json({ msg: '决赛加赛结果已录入，赛事结束', data: result });
    });
  } catch (err) {
    console.error('决赛加赛判定失败:', err);
    res.status(400).json({ msg: err.message });
  }
});

// ==========================================
// 🔙 回退端点（patch-02: 全链路可逆操作）
// ==========================================

const requireAdmin = async (req, res) => {
  const perm = await checkPermission(req.user, null, 'admin');
  if (!perm.allowed) { res.status(403).json({ msg: perm.msg }); return false; }
  return true;
};

const loadAndCheck = async (req, res) => {
  const ok = await requireAdmin(req, res);
  if (!ok) return null;
  return await requireTournament(res);
};

const withAdminLockedTournament = (req, res, operation) => withRaceMutationLock(async () => {
  const t = await loadAndCheck(req, res);
  if (!t) return null;
  return operation(t);
});

// ── 阶段一回退 ──

router.post('/stage1/undo-last-song', authMiddleware, async (req, res) => {
  try {
    await withAdminLockedTournament(req, res, async (t) => {
      undoStage1LastSong(t);
      await t.save();
      broadcast('score_updated', { stage: 'stage1', event: 'undo-last-song' });
      res.json({ msg: '已撤销最后选曲' });
    });
  } catch (err) { res.status(400).json({ msg: err.message }); }
});

router.post('/stage1/undo-last-score', authMiddleware, async (req, res) => {
  try {
    await withAdminLockedTournament(req, res, async (t) => {
      const { player = 'both' } = req.body;
      undoStage1LastScore(t, player);
      await t.save();
      broadcast('score_updated', { stage: 'stage1', event: 'undo-last-score', player });
      res.json({ msg: '已撤销最后成绩' });
    });
  } catch (err) { res.status(400).json({ msg: err.message }); }
});

router.post('/stage1/revert-group', authMiddleware, async (req, res) => {
  try {
    await withAdminLockedTournament(req, res, async (t) => {
      const { groupId } = req.body;
      await prepareMarketsForRollback({ tournamentId: t._id, stage: 'stage1', fromGroupIndex: Number(groupId) });
      revertStage1Group(t, Number(groupId));
      await t.save();
      broadcast('stage_advanced', { stage: 'stage1', event: 'revert-group', groupId });
      res.json({ msg: `已回退到组 ${groupId}` });
    });
  } catch (err) { res.status(400).json({ msg: err.message }); }
});

router.post('/stage1/reset', authMiddleware, async (req, res) => {
  try {
    await withAdminLockedTournament(req, res, async (t) => {
      await prepareMarketsForRollback({ tournamentId: t._id, stage: 'stage1' });
      resetStage1(t);
      t.operationLogs.push({ action: 'stage1_reset', stage: 'stage1', operatedBy: req.user.id, operatedAt: new Date() });
      await t.save();
      broadcast('stage_advanced', { stage: 'stage1', event: 'reset' });
      res.json({ msg: '阶段一已重置' });
    });
  } catch (err) { res.status(400).json({ msg: err.message }); }
});

// ── 跑图回退 ──

router.post('/race/undo-last-action', authMiddleware, async (req, res) => {
  try {
    await withRaceMutationLock(async () => {
      const t = await loadAndCheck(req, res); if (!t) return;
      const race = currentRace(t);
      if (!race) return res.status(404).json({ msg: '不在跑图阶段' });
      undoRaceLastAction(race, t, t.status);
      await t.save();
      broadcast('turn_change', { event: 'undo-last-action', turn: race.currentTurn });
      res.json({ msg: '已撤销最后行动', data: { currentTurn: race.currentTurn } });
    });
  } catch (err) { res.status(400).json({ msg: err.message }); }
});

router.post('/race/undo-item-use', authMiddleware, async (req, res) => {
  try {
    await withRaceMutationLock(async () => {
      const t = await loadAndCheck(req, res); if (!t) return;
      const { itemRef } = req.body;
      const race = currentRace(t);
      if (!race) return res.status(404).json({ msg: '不在跑图阶段' });
      undoRaceItemUse(race, Number(itemRef));
      await t.save();
      broadcast('item_used', { event: 'undo-item-use', itemRef });
      res.json({ msg: `已撤销道具 ${itemRef} 的使用` });
    });
  } catch (err) { res.status(400).json({ msg: err.message }); }
});

router.post('/race/revert-challenge', authMiddleware, async (req, res) => {
  try {
    await withRaceMutationLock(async () => {
      const t = await loadAndCheck(req, res); if (!t) return;
      const race = currentRace(t);
      if (!race) return res.status(404).json({ msg: '不在跑图阶段' });
      undoRaceLastChallengeResult(race, t, t.status);
      await t.save();
      broadcast('challenge_resolved', { event: 'revert-challenge' });
      res.json({ msg: '已撤回最后挑战判定，等待重新确认' });
    });
  } catch (err) { res.status(400).json({ msg: err.message }); }
});

router.post('/race/reset', authMiddleware, async (req, res) => {
  try {
    await withRaceMutationLock(async () => {
      const t = await loadAndCheck(req, res); if (!t) return;
      const race = currentRace(t);
      if (!race) return res.status(404).json({ msg: '不在跑图阶段' });
      resetRace(race);
      t.operationLogs.push({ action: 'race_reset', stage: t.status, operatedBy: req.user.id, operatedAt: new Date() });
      await t.save();
      broadcast('map_timeout', { event: 'reset' });
      res.json({ msg: '跑图已重置' });
    });
  } catch (err) { res.status(400).json({ msg: err.message }); }
});

// ── 决赛回退 ──

router.post('/stage4/undo-last-song', authMiddleware, async (req, res) => {
  try {
    await withAdminLockedTournament(req, res, async (t) => {
      if (t.status === 'finished') await prepareMarketsForRollback({ tournamentId: t._id, stage: 'stage4' });
      undoStage4LastSong(t);
      await t.save();
      broadcast('score_updated', { stage: 'stage4', event: 'undo-last-song' });
      res.json({ msg: '已撤销决赛最后选曲' });
    });
  } catch (err) { res.status(400).json({ msg: err.message }); }
});

router.post('/stage4/undo-last-score', authMiddleware, async (req, res) => {
  try {
    await withAdminLockedTournament(req, res, async (t) => {
      const { player = 'both' } = req.body;
      if (t.status === 'finished') await prepareMarketsForRollback({ tournamentId: t._id, stage: 'stage4' });
      undoStage4LastScore(t, player);
      await t.save();
      broadcast('score_updated', { stage: 'stage4', event: 'undo-last-score', player });
      res.json({ msg: '已撤销决赛最后成绩' });
    });
  } catch (err) { res.status(400).json({ msg: err.message }); }
});

router.post('/stage4/reset', authMiddleware, async (req, res) => {
  try {
    await withAdminLockedTournament(req, res, async (t) => {
      await prepareMarketsForRollback({ tournamentId: t._id, stage: 'stage4' });
      resetStage4(t);
      t.operationLogs.push({ action: 'stage4_reset', stage: 'stage4', operatedBy: req.user.id, operatedAt: new Date() });
      await t.save();
      broadcast('stage_advanced', { stage: 'stage4', event: 'reset' });
      res.json({ msg: '决赛已重置' });
    });
  } catch (err) { res.status(400).json({ msg: err.message }); }
});

// ── 全局回退 ──

router.post('/revert-stage', authMiddleware, async (req, res) => {
  try {
    await withAdminLockedTournament(req, res, async (t) => {
      if (t.status === 'stage1') await prepareMarketsForRollback({ tournamentId: t._id, stage: 'stage1' });
      if (t.status === 'stage4' || t.status === 'finished') await prepareMarketsForRollback({ tournamentId: t._id, stage: 'stage4' });
      await revertStage(t);
      t.operationLogs.push({ action: 'revert_stage', stage: t.status, operatedBy: req.user.id, operatedAt: new Date() });
      await t.save();
      broadcast('stage_advanced', { from: 'rolled_back', to: t.status });
      res.json({ msg: `已回退到 ${t.status}` });
    });
  } catch (err) { res.status(400).json({ msg: err.message }); }
});

router.post('/reset', authMiddleware, async (req, res) => {
  try {
    await withAdminLockedTournament(req, res, async (t) => {
      await prepareMarketsForRollback({ tournamentId: t._id });
      await resetAll(t);
      t.operationLogs.push({ action: 'full_reset', operatedBy: req.user.id, operatedAt: new Date() });
      await t.save();
      broadcast('stage_advanced', { from: 'reset', to: 'pending' });
      res.json({ msg: '赛事已完全重置' });
    });
  } catch (err) { res.status(400).json({ msg: err.message }); }
});

// ==========================================
// 📡 SSE 实时推送
// ==========================================

router.get('/events', optionalAuth, async (req, res) => {
  // P2-4: 根据用户角色分级订阅；已登录用户传角色，匿名用户仅接收公开事件
  let role = 'anon';
  if (req.user) {
    try {
      const u = await User.findById(req.user.id).select('role').lean();
      if (u) role = u.role || 'user';
    } catch { role = 'user'; }
  }
  const clientId = req.user ? req.user.id : `anon_${Date.now()}`;
  const cleanup = addClient(clientId, res, role);
  req.on('close', cleanup);
});

// ==========================================
// 🔀 P1-2: /stage2/* 和 /stage3/* 别名 — 内部转发到 /race/*
// 满足需求文档 API 约定，与前端 /race/* 均可使用
// ==========================================
['stage2', 'stage3'].forEach(stage => {
  router.use(`/${stage}`, (req, _res, _next) => {
    const origUrl = req.url;
    req.url = '/race' + origUrl;
    // router.handle 重新匹配 /race/* 路由
    router.handle(req, _res, (err) => {
      req.url = origUrl;
      if (err) _next(err);
    });
  });
});

// ==========================================
module.exports = router;
