/**
 * 🎮 游戏结束与 OV100 全局结算引擎 (从 server.js 解耦)
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const { GameRecord, ActiveSession } = require('../models/LetterGame');
const { getRevealRatio } = require('../utils/gameEngine');

async function finishGameSession(session) {
  let totalOv = 0;
  let allCleared = true;

  const finalSongs = session.songs.map(song => {
    if (song.status !== 'CLEARED') allCleared = false;
    totalOv += (song.actualOv || 0);
    return {
      songId: song.songId,
      title: song.realTitle,
      baseOv: song.baseOv,
      actualOv: song.actualOv || 0,
      mistakes: song.mistakes,
      isCleared: song.status === 'CLEARED',
      revealRatio: getRevealRatio(song.realTitle, session.openedChars, session.mods)
    };
  });

  if (allCleared) totalOv *= 1.15;
  const timeRemaining = Math.max(0, session.expireAt.getTime() - Date.now());
  const speedBonus = 1 + (timeRemaining / 1000) / 1000;
  totalOv *= speedBonus;

  const record = new GameRecord({
    userId: session.userId,
    totalOv: Number(totalOv.toFixed(2)),
    mods: session.mods,
    isFullCombo: allCleared,
    songs: finalSongs
  });
  await record.save();
  await ActiveSession.deleteOne({ _id: session._id });

  const userBefore = await User.findById(session.userId);
  const oldStats = userBefore.letterGameStats ? { ...userBefore.letterGameStats.toObject() } : {};

  try {
    const topPlays = await GameRecord.find({ userId: session.userId })
      .sort({ totalOv: -1 }).limit(100).select('totalOv');
    let weightedTotalOv = 0;
    topPlays.forEach((play, index) => { weightedTotalOv += play.totalOv * Math.pow(0.95, index); });
    const userIdObj = new mongoose.Types.ObjectId(session.userId.toString());
    const statsAggr = await GameRecord.aggregate([
      { $match: { userId: userIdObj } },
      { $unwind: '$songs' },
      { $group: { _id: null, totalSongs: { $sum: 1 }, clearedSongs: { $sum: { $cond: [{ $eq: ['$songs.isCleared', true] }, 1, 0] } }, totalRevealRatio: { $sum: { $cond: [{ $eq: ['$songs.isCleared', true] }, { $ifNull: ['$songs.revealRatio', 0] }, 0] } } } }
    ]);
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

  const userAfter = await User.findById(session.userId);
  const newStats = userAfter.letterGameStats ? userAfter.letterGameStats.toObject() : {};
  const timeUsed = Date.now() - session.createdAt.getTime();
  return { record, oldStats, newStats, timeUsed };
}

module.exports = finishGameSession;
