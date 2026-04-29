const express = require('express');
const router = express.Router();
const User = require('../models/User');
const OsuScore = require('../models/OsuScore');
const axios = require('axios');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

router.post('/api/osu/bind', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const clientId = Number(process.env.OSU_CLIENT_ID); 
    const clientSecret = process.env.OSU_CLIENT_SECRET ? String(process.env.OSU_CLIENT_SECRET).trim() : '';
    const redirectUri = process.env.OSU_CALLBACK_URL ? String(process.env.OSU_CALLBACK_URL).trim() : '';

    const payload = { client_id: clientId, client_secret: clientSecret, code: code, grant_type: 'authorization_code', redirect_uri: redirectUri };
    const tokenResponse = await axios.post('https://osu.ppy.sh/oauth/token', payload, { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' } });
    const accessToken = tokenResponse.data.access_token;
    const userResponse = await axios.get('https://osu.ppy.sh/api/v2/me/osu', { headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' } });
    const osuUser = userResponse.data;

    const user = await User.findById(req.user.id || req.user._id);
    user.osuId = osuUser.id; user.osuUsername = osuUser.username; user.osuAvatarUrl = osuUser.avatar_url;
    user.xp = (user.xp || 0) + 50; user.level = Math.floor(user.xp / 300) + 1;
    await user.save();
    res.json({ msg: `绑定成功` });
  } catch (err) { res.status(500).json({ msg: '绑定失败' }); }
});

router.post('/api/users/sync-osu', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id);
    if (!user.osuId) return res.status(400).json({ msg: '请先绑定 osu! 账号' });

    const modeMap = { 'standard': 'osu', 'taiko': 'taiko', 'catch': 'fruits', 'mania': 'mania' };
    const frontendMode = req.body.mode || 'standard';
    const syncMode = modeMap[frontendMode] || 'osu'; 

    const tokenRes = await axios.post('https://osu.ppy.sh/oauth/token', { 
      client_id: Number(process.env.OSU_CLIENT_ID), 
      client_secret: process.env.OSU_CLIENT_SECRET.trim(), 
      grant_type: 'client_credentials', 
      scope: 'public' 
    });
    const token = tokenRes.data.access_token;

    const osuUserRes = await axios.get(`https://osu.ppy.sh/api/v2/users/${user.osuId}/${syncMode}`, { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    const osuStats = osuUserRes.data.statistics;

    if (!user.osuDetails) user.osuDetails = {};
    user.osuDetails[frontendMode] = {
      pp: osuStats.pp || 0,
      rank: osuStats.global_rank || 0,
      countryRank: osuStats.country_rank || 0,
      accuracy: osuStats.hit_accuracy || 0,
      playCount: osuStats.play_count || 0
    };
    user.markModified('osuDetails');

    user.osuPp = osuStats.pp; 
    user.osuGlobalRank = osuStats.global_rank || 0; 
    user.osuCountryRank = osuStats.country_rank || 0; 
    user.osuMode = frontendMode; 
    await user.save();

    const bpRes = await axios.get(`https://osu.ppy.sh/api/v2/users/${user.osuId}/scores/best?mode=${syncMode}&limit=100`, { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    
    await OsuScore.deleteMany({ userId: user._id, mode: syncMode });
    
    const bpDocs = bpRes.data.map(s => ({ 
      userId: user._id, 
      mode: syncMode, 
      beatmapId: s.beatmap.id, 
      title: s.beatmapset.title, 
      version: s.beatmap.version, 
      accuracy: s.accuracy * 100, 
      mods: s.mods.map(m => m.acronym || m), 
      pp: s.pp, 
      grade: s.rank, 
      coverUrl: s.beatmapset.covers.list, 
      playedAt: s.created_at 
    }));
    await OsuScore.insertMany(bpDocs);

    res.json({ msg: `${frontendMode} 模式同步成功！` });
  } catch (err) { 
    res.status(500).json({ msg: '同步失败' }); 
  }
});


module.exports = router;
