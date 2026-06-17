/**
 * 🎮 游戏结束与 OV100 全局结算引擎 (从 server.js 解耦)
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const { GameRecord, ActiveSession } = require('../models/LetterGame');
const { getRevealRatio } = require('../utils/gameEngine');

async function finishGameSession(session) {
  // ── 空值防御 ──
  if (!session) throw new Error('finishGameSession: session 为空');
  const songs = Array.isArray(session.songs) ? session.songs : [];
  const sessionMods = Array.isArray(session.mods) ? session.mods : [];
  const openedChars = Array.isArray(session.openedChars) ? session.openedChars : [];

  let totalOv = 0;
  let allCleared = true;

  const finalSongs = songs.map(song => {
    if (song.status !== 'CLEARED') allCleared = false;
    totalOv += (song.actualOv || 0);
    return {
      songId: song.songId,
      title: song.realTitle,
      baseOv: song.baseOv,
      actualOv: song.actualOv || 0,
      mistakes: song.mistakes || 0,
      isCleared: song.status === 'CLEARED',
      revealRatio: getRevealRatio(song.realTitle || '', openedChars, sessionMods)
    };
  });

  if (allCleared) totalOv *= 1.15;

  // 安全获取 expireAt
  const expireAt = session.expireAt && typeof session.expireAt.getTime === 'function'
    ? session.expireAt.getTime() : Date.now();
  const timeRemaining = Math.max(0, expireAt - Date.now());
  const speedBonus = 1 + (timeRemaining / 1000) / 1000;
  totalOv *= speedBonus;

  const record = new GameRecord({
    userId: session.userId,
    totalOv: Number(totalOv.toFixed(2)),
    mods: sessionMods,
    isFullCombo: allCleared,
    songs: finalSongs
  });
  await record.save();
  await ActiveSession.deleteOne({ _id: session._id }).catch(err => {
    console.error('【Letter Decode 删除会话失败】:', err);
  });

  // ── 获取结算前的用户状态 ──
  let oldStats = {};
  try {
    const userBefore = await User.findById(session.userId);
    if (userBefore && userBefore.letterGameStats) {
      oldStats = { ...userBefore.letterGameStats.toObject() };
    }
  } catch (err) {
    console.error('【Letter Decode 用户查询失败】:', err);
  }

  let newStats = {};
  try {
    const topPlays = await GameRecord.find({ userId: session.userId })
      .sort({ totalOv: -1 }).limit(100).select('totalOv').lean();
    let weightedTotalOv = 0;
    topPlays.forEach((play, index) => { weightedTotalOv += play.totalOv * Math.pow(0.95, index); });

    // 安全构造 ObjectId
    let userIdObj;
    try {
      userIdObj = new mongoose.Types.ObjectId(session.userId.toString());
    } catch (e) {
      // userId 不是 ObjectId，使用字符串 $match
      const statsAggr = await GameRecord.aggregate([
        { $match: { userId: session.userId.toString() } },
        { $unwind: '$songs' },
        { $group: { _id: null, totalSongs: { $sum: 1 }, clearedSongs: { $sum: { $cond: [{ $eq: ['$songs.isCleared', true] }, 1, 0] } }, totalRevealRatio: { $sum: { $cond: [{ $eq: ['$songs.isCleared', true] }, { $ifNull: ['$songs.revealRatio', 0] }, 0] } } } }
      ]).allowDiskUse(true);
      const totalPlaysRecord = await GameRecord.countDocuments({ userId: session.userId.toString() });
      if (statsAggr.length > 0) {
        const stats = statsAggr[0];
        const accuracy = stats.totalSongs > 0 ? (stats.clearedSongs / stats.totalSongs) : 0;
        const conservativeness = stats.clearedSongs > 0 ? (stats.totalRevealRatio / stats.clearedSongs) : 0;
        await User.findByIdAndUpdate(session.userId, {
          $set: {
            'letterGameStats.totalOv': Number(weightedTotalOv.toFixed(2)),
            'letterGameStats.totalPlays': totalPlaysRecord,
            'letterGameStats.totalSongsEncountered': stats.totalSongs,
            'letterGameStats.clearedSongs': stats.clearedSongs,
            'letterGameStats.accuracy': Number(accuracy.toFixed(4)),
            'letterGameStats.conservativeness': Number(conservativeness.toFixed(4))
          }
        });
      }
      const userAfter = await User.findById(session.userId);
      if (userAfter && userAfter.letterGameStats) newStats = userAfter.letterGameStats.toObject();
      const createdAt = session.createdAt && typeof session.createdAt.getTime === 'function'
        ? session.createdAt.getTime() : Date.now();
      const timeUsed = Date.now() - createdAt;
      return { record, oldStats, newStats, timeUsed };
    }

    const statsAggr = await GameRecord.aggregate([
      { $match: { userId: userIdObj } },
      { $unwind: '$songs' },
      { $group: { _id: null, totalSongs: { $sum: 1 }, clearedSongs: { $sum: { $cond: [{ $eq: ['$songs.isCleared', true] }, 1, 0] } }, totalRevealRatio: { $sum: { $cond: [{ $eq: ['$songs.isCleared', true] }, { $ifNull: ['$songs.revealRatio', 0] }, 0] } } } }
    ]).allowDiskUse(true);
    const totalPlaysRecord = await GameRecord.countDocuments({ userId: session.userId });
    if (statsAggr.length > 0) {
      const stats = statsAggr[0];
      const accuracy = stats.totalSongs > 0 ? (stats.clearedSongs / stats.totalSongs) : 0;
      const conservativeness = stats.clearedSongs > 0 ? (stats.totalRevealRatio / stats.clearedSongs) : 0;
      await User.findByIdAndUpdate(session.userId, {
        $set: {
          'letterGameStats.totalOv': Number(weightedTotalOv.toFixed(2)),
          'letterGameStats.totalPlays': totalPlaysRecord,
          'letterGameStats.totalSongsEncountered': stats.totalSongs,
          'letterGameStats.clearedSongs': stats.clearedSongs,
          'letterGameStats.accuracy': Number(accuracy.toFixed(4)),
          'letterGameStats.conservativeness': Number(conservativeness.toFixed(4))
        }
      });
    }
  } catch (err) {
    console.error('【Letter Decode 数据聚合失败】:', err);
  }

  try {
    const userAfter = await User.findById(session.userId);
    if (userAfter && userAfter.letterGameStats) {
      newStats = userAfter.letterGameStats.toObject();
    }
  } catch (err) {
    console.error('【Letter Decode 结算后用户查询失败】:', err);
  }

  const createdAt = session.createdAt && typeof session.createdAt.getTime === 'function'
    ? session.createdAt.getTime() : Date.now();
  const timeUsed = Date.now() - createdAt;
  return { record, oldStats, newStats, timeUsed };
}

module.exports = finishGameSession;
