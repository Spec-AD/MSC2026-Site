const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Song = require('../models/Song');
const ChunithmSong = require('../models/ChunithmSong');
const ArcaeaSong = require('../models/ArcaeaSong');
const { GameRecord, ActiveSession } = require('../models/LetterGame');
const { addXp, authMiddleware, optionalAuth } = require('../middleware/auth');
const finishGameSession = require('../services/gameSession');
const { normalizeTitle, calculateBaseOV, generateMaskedTitle, calculateActualOV, calculateSessionStarRating, distributeNonLinearOV } = require('../utils/gameEngine');

// ==================================================
// 🎮 API 1：开始开字母游戏 (支持多曲库混合 & 目标星级匹配)
// ==================================================
router.post('/api/letter-game/start', authMiddleware, async (req, res) => {
  try {
    let { mods = [], gameTypes = ['arcaea'], targetStar = 5.0 } = req.body;

    if (mods.includes('Tenacity') && mods.includes('Fear')) {
      mods = mods.filter(m => m !== 'Tenacity' && m !== 'Fear');
      if (!mods.includes('Prudence')) mods.push('Prudence');
    }

    let poolSongs = [];
    if (gameTypes.includes('maimai')) {
      const ms = await Song.aggregate([{ $sample: { size: 50 } }]);
      poolSongs = poolSongs.concat(ms);
    }
    if (gameTypes.includes('chunithm')) {
      const cs = await ChunithmSong.aggregate([{ $sample: { size: 50 } }]);
      poolSongs = poolSongs.concat(cs);
    }
    if (gameTypes.includes('arcaea')) {
      const as = await ArcaeaSong.aggregate([{ $sample: { size: 50 } }]);
      poolSongs = poolSongs.concat(as);
    }

    if (poolSongs.length < 5) {
      return res.status(400).json({ msg: '选中的曲库数据不足 5 首，无法生成对局' });
    }

    poolSongs.sort(() => Math.random() - 0.5);
    const poolWithOvs = poolSongs.map(s => {
      const title = s.title || s.basic_info?.title || s.id || 'Unknown';
      return { ...s, _baseOv: calculateBaseOV(title) };
    });

    const targetTotalOv = targetStar * 60;
    poolWithOvs.sort((a, b) => a._baseOv - b._baseOv);
    let bestDiff = Infinity;
    let bestSubset = [];
    for (let i = 0; i <= poolWithOvs.length - 5; i++) {
      const subset = poolWithOvs.slice(i, i + 5);
      const currentSum = subset.reduce((sum, song) => sum + song._baseOv, 0);
      const diff = Math.abs(currentSum - targetTotalOv);
      if (diff < bestDiff) { bestDiff = diff; bestSubset = subset; }
    }

    const finalSongs = bestSubset.sort(() => Math.random() - 0.5);
    let initialOpenedChars = new Set();
    let baseTime = 60000;
    if (mods.includes('Tenacity')) baseTime = 30000;
    if (mods.includes('Easy')) baseTime = 120000;

    if (mods.includes('Easy')) {
      ['a','e','i','o','u','あ','い','う','え','お','ア','イ','ウ','エ','オ'].forEach(c => initialOpenedChars.add(c));
    }
    if (mods.includes('Lucky')) {
      let globalChars = new Set();
      finalSongs.forEach(s => {
        for (let char of (s.title || s.basic_info?.title || s.id || '')) {
          if (char.trim() !== '') globalChars.add(char.toLowerCase());
        }
      });
      const luckyCount = Math.min(7, Math.ceil(globalChars.size * 0.3));
      const poolArray = Array.from(globalChars);
      for (let i = 0; i < luckyCount; i++) {
        const randIdx = Math.floor(Math.random() * poolArray.length);
        initialOpenedChars.add(poolArray.splice(randIdx, 1)[0]);
      }
    }

    const rawBaseOvs = finalSongs.map(s => s._baseOv);
    const actualStarRating = calculateSessionStarRating(rawBaseOvs) || 1.0;
    const nonLinearOvs = distributeNonLinearOV(actualStarRating, rawBaseOvs) || rawBaseOvs;

    const sessionSongs = finalSongs.map((s, index) => {
      const realTitle = String(s.title || s.basic_info?.title || s.id || 'Unknown');
      return {
        songId: String(s.id || s._id),
        realTitle,
        aliases: s.aliases || [],
        baseOv: nonLinearOvs[index] || 10,
        mistakes: 0,
        status: 'PLAYING',
        hasKana: /[\u3040-\u309F\u30A0-\u30FF]/.test(realTitle),
        hasKanji: /[\u4E00-\u9FAF]/.test(realTitle),
        hasSym: /[^\sa-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(realTitle)
      };
    });

    const newSession = new ActiveSession({
      userId: req.user.id || req.user._id,
      gameType: gameTypes.join(','),
      mods,
      starRating: actualStarRating,
      openedChars: Array.from(initialOpenedChars),
      expireAt: new Date(Date.now() + baseTime),
      songs: sessionSongs
    });
    await newSession.save();

    const clientSongs = sessionSongs.map((song, idx) => ({
      index: idx,
      maskedTitle: generateMaskedTitle(song.realTitle, newSession.openedChars, mods),
      status: song.status,
      hasKana: song.hasKana, hasKanji: song.hasKanji, hasSym: song.hasSym
    }));

    res.json({
      sessionId: newSession._id,
      expireAt: newSession.expireAt,
      starRating: actualStarRating,
      openedChars: newSession.openedChars,
      songs: clientSongs
    });
  } catch (err) {
    console.error('【Letter Decode 初始化错误】:', err);
    res.status(500).json({ msg: '初始化失败，请查看后台日志' });
  }
});

// ==================================================
// 🎮 API 2：开字母操作
// ==================================================
router.post('/api/letter-game/open', authMiddleware, async (req, res) => {
  try {
    const { sessionId, char } = req.body;
    const session = await ActiveSession.findById(sessionId);
    if (!session) return res.status(404).json({ msg: '对局不存在' });

    if (session.expireAt <= Date.now() && !session.mods.includes('Strength')) {
      const resultData = await finishGameSession(session);
      return res.json({ gameOver: true, ...resultData, msg: 'Time Out' });
    }

    const targetChar = char.toLowerCase();
    if (!session.openedChars.includes(targetChar)) {
      session.openedChars.push(targetChar);
    }

    let baseTime = 60000;
    if (session.mods.includes('Tenacity')) baseTime = 30000;
    if (session.mods.includes('Easy')) baseTime = 120000;
    session.expireAt = new Date(Date.now() + baseTime);

    session.songs.forEach(song => {
      if (song.status === 'PLAYING') {
        const R_CheckMask = generateMaskedTitle(song.realTitle, session.openedChars, session.mods);
        if (!R_CheckMask.includes('*') && !session.mods.includes('Puzzle')) {
          song.status = 'DEAD';
        }
      }
    });

    await session.save();

    const clientSongs = session.songs.map((song, idx) => ({
      index: idx,
      maskedTitle: song.status === 'CLEARED' ? song.realTitle : generateMaskedTitle(song.realTitle, session.openedChars, session.mods),
      status: song.status,
      hasKana: song.hasKana, hasKanji: song.hasKanji, hasSym: song.hasSym
    }));

    res.json({ expireAt: session.expireAt, songs: clientSongs });
  } catch (err) {
    res.status(500).json({ msg: '操作失败' });
  }
});

// ==================================================
// 🎮 API 3：猜歌名核心裁决 (支持别名与转写平替)
// ==================================================
router.post('/api/letter-game/guess', authMiddleware, async (req, res) => {
  try {
    const { sessionId, songIndex, guess } = req.body;
    const session = await ActiveSession.findById(sessionId);
    if (!session) return res.status(404).json({ msg: '对局不存在' });

    if (session.expireAt <= Date.now() && !session.mods.includes('Strength')) {
      const resultData = await finishGameSession(session);
      return res.json({ gameOver: true, ...resultData, msg: '时间已耗尽' });
    }

    const song = session.songs[songIndex];
    if (!song || song.status !== 'PLAYING') return res.status(400).json({ msg: '该曲目无法作答' });

    const normalizedGuess = normalizeTitle(guess);
    const isCorrect =
      normalizedGuess === normalizeTitle(song.realTitle) ||
      (song.aliases && song.aliases.some(alias => normalizeTitle(alias) === normalizedGuess));

    if (isCorrect) {
      song.status = 'CLEARED';
      song.actualOv = calculateActualOV(song.baseOv, song.realTitle, session.openedChars, song.mistakes, session.mods);
    } else {
      song.mistakes += 1;
      let penalty = 15000;
      if (session.mods.includes('Fear')) penalty = 30000;
      if (session.mods.includes('Brave')) penalty = 5000;
      if (session.mods.includes('Prudence')) {
        const resultData = await finishGameSession(session);
        return res.json({ gameOver: true, ...resultData, msg: 'Prudence! 猜错即死。' });
      }
      session.expireAt = new Date(session.expireAt.getTime() - penalty);
      if (session.expireAt <= Date.now() && !session.mods.includes('Strength')) {
        const resultData = await finishGameSession(session);
        return res.json({ gameOver: true, ...resultData, msg: '惩罚导致时间耗尽。' });
      }
    }

    const isAllDone = session.songs.every(s => s.status !== 'PLAYING');
    if (isAllDone) {
      const resultData = await finishGameSession(session);
      return res.json({ gameOver: true, isCorrect, ...resultData });
    }

    await session.save();

    const clientSongs = session.songs.map((s, idx) => ({
      index: idx,
      maskedTitle: s.status === 'CLEARED' ? s.realTitle : generateMaskedTitle(s.realTitle, session.openedChars, session.mods),
      status: s.status,
      actualOv: s.actualOv,
      hasKana: s.hasKana, hasKanji: s.hasKanji, hasSym: s.hasSym
    }));

    res.json({ isCorrect, expireAt: session.expireAt, songs: clientSongs });
  } catch (err) {
    res.status(500).json({ msg: '校验失败' });
  }
});

// ==================================================
// 🎮 API 4：直接结束并查看答案 (无损废弃对局)
// ==================================================
router.post('/api/letter-game/abort', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await ActiveSession.findById(sessionId);
    if (!session) return res.status(404).json({ msg: '对局不存在' });

    const finalSongs = session.songs.map(song => ({
      songId: song.songId,
      title: song.realTitle,
      baseOv: song.baseOv,
      actualOv: 0,
      mistakes: song.mistakes,
      isCleared: false
    }));

    await ActiveSession.deleteOne({ _id: session._id });

    const user = await User.findById(session.userId);
    const currentStats = user.letterGameStats ? user.letterGameStats.toObject() : {};

    res.json({
      gameOver: true,
      isAborted: true,
      record: { isFullCombo: false, songs: finalSongs },
      oldStats: currentStats,
      newStats: currentStats,
      timeUsed: Date.now() - session.createdAt.getTime(),
      msg: '行动已终止，未计入个人档案'
    });
  } catch (err) {
    res.status(500).json({ msg: '终止失败' });
  }
});

// ==================================================
// 🎮 API 5：获取玩家 Letter Decode 档案与 OV100 记录
// ==================================================
router.get('/api/letter-game/records/:username', async (req, res) => {
  try {
    const targetUser = await User.findOne({ username: new RegExp(`^${req.params.username}$`, 'i') })
      .select('username avatarUrl level letterGameStats');
    if (!targetUser) return res.status(404).json({ msg: '未找到该玩家' });

    const topRecords = await GameRecord.find({ userId: targetUser._id })
      .sort({ totalOv: -1 }).limit(100).lean();

    res.json({ user: targetUser, stats: targetUser.letterGameStats || {}, records: topRecords });
  } catch (err) {
    res.status(500).json({ msg: '拉取战绩失败' });
  }
});

// ==================================================
// 🎮 API 6：拉取开字母竞技场 2.0 排行榜
// ==================================================
router.get('/api/leaderboard/decode', async (req, res) => {
  try {
    const topPlayers = await User.find({ 'letterGameStats.totalOv': { $gt: 0 } })
      .select('username avatarUrl role uid level letterGameStats')
      .sort({ 'letterGameStats.totalOv': -1, 'letterGameStats.accuracy': -1 })
      .limit(100).lean();
    res.json(topPlayers);
  } catch (err) {
    console.error('拉取开字母排行榜失败:', err);
    res.status(500).json({ msg: '拉取排行榜失败' });
  }
});

module.exports = router;
