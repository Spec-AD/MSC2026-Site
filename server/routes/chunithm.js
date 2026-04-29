const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ChunithmSong = require('../models/ChunithmSong');
const ChunithmScore = require('../models/ChunithmScore');
const axios = require('axios');
const { authMiddleware } = require('../middleware/auth');
const calculateChuniRating = require('../services/chuniRating');

router.get('/api/users/:username/chunithm-scores', async (req, res) => {
  try {
    const user = await User.findOne({ username: { $regex: new RegExp(`^${req.params.username}$`, 'i') } });
    if (!user) return res.status(404).json({ msg: '用户不存在' });
    const scores = await ChunithmScore.find({ userId: user._id });
    res.json(scores);
  } catch (err) { res.status(500).json({ msg: '获取失败' }); }
});

router.post('/api/users/sync-chunithm', authMiddleware, async (req, res) => {
  try {
    const { importToken } = req.body;
    const response = await axios.get('https://www.diving-fish.com/api/chunithmprober/player/records', { headers: { 'Developer-Token': importToken.trim() }, timeout: 15000 });

    let rawRecords = [];
    if (Array.isArray(response.data)) rawRecords = response.data;
    else if (response.data.records) {
       const best = response.data.records.best || [];
       const r20 = response.data.records.r20 || [];
       const map = new Map();
       [...best, ...r20].forEach(r => map.set(`${r.cid || r.music_id}`, r));
       rawRecords = Array.from(map.values());
    }

    const allSongsArray = await ChunithmSong.find({}, 'id title ds basic_info cids').lean();
    const processedScores = [];

    for (const rec of rawRecords) {
       let song = null; let levelIndex = 0;
       if (rec.cid) {
          song = allSongsArray.find(s => s.cids && s.cids.includes(rec.cid));
          if (song) levelIndex = song.cids.indexOf(rec.cid);
       } else if (rec.music_id || rec.id) {
          const lxId = Number(rec.music_id || rec.id);
          song = allSongsArray.find(s => Number(s.id) === lxId);
          levelIndex = Number(rec.level_index !== undefined ? rec.level_index : rec.level);
       }

       if (!song) continue;
       let constant = 0;
       if (song.ds && song.ds[levelIndex] !== undefined) constant = song.ds[levelIndex];
       const isWE = levelIndex === 5;
       const realScore = rec.score || 0;
       const singleRating = isWE ? 0 : (rec.rating || calculateChuniRating(realScore, constant));

       processedScores.push({
         userId: req.user.id, songId: song.id, songName: song.title || song.basic_info?.title, imageUrl: `https://www.diving-fish.com/covers/${String(song.id).padStart(5, '0')}.png`,
         level: levelIndex, constant: isWE ? 0 : constant, score: realScore, rating: singleRating, rank: rec.rank || '', clearStatus: rec.clear || '', fcStatus: rec.fc || rec.full_combo || '', isNew: song.basic_info?.from === 'LUMINOUS PLUS' || false, finishTime: new Date(rec.upload_time || rec.play_time || Date.now())
       });
    }

    await ChunithmScore.deleteMany({ userId: req.user.id });
    await ChunithmScore.insertMany(processedScores);

    const validScores = processedScores.filter(s => s.level !== 5 && s.rating > 0);
    validScores.sort((a, b) => b.rating - a.rating || b.score - a.score);
    const b30 = validScores.filter(s => !s.isNew).slice(0, 30);
    const r20 = validScores.filter(s => s.isNew).slice(0, 20);
    const sumB30 = b30.reduce((sum, s) => sum + s.rating, 0);
    const sumR20 = r20.reduce((sum, s) => sum + s.rating, 0);
    const totalCount = b30.length + r20.length;
    const avgRating = totalCount > 0 ? Number(((sumB30 + sumR20) / totalCount).toFixed(2)) : 0;

    await User.findByIdAndUpdate(req.user.id, { importToken: importToken, chuniRating: avgRating });
    res.json({ msg: `同步成功！`, rating: avgRating });
  } catch (err) { res.status(500).json({ msg: '失败' }); }
});

router.post('/api/chunithm-songs/sync', async (req, res) => {
  try {
    const response = await axios.get('https://www.diving-fish.com/api/chunithmprober/music_data', { timeout: 15000 });
    const songs = response.data;
    await ChunithmSong.deleteMany({});
    await ChunithmSong.insertMany(songs);
    res.json({ msg: `同步成功！` });
  } catch (err) { res.status(500).json({ msg: '失败' }); }
});

router.get('/api/chunithm-songs', async (req, res) => {
  try { res.json(await ChunithmSong.find({}).sort({ id: -1 })); } catch (err) { res.status(500).json({ msg: '失败' }); }
});


module.exports = router;
