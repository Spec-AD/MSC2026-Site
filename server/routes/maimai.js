const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Song = require('../models/Song');
const Score = require('../models/Score');
const axios = require('axios');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { calculatePF } = require('../utils/pfCalculator');

// ==========================================
// 🔄 落雪 Token 自动续期工具
// ==========================================
async function getValidLxnsToken(userId) {
  const user = await User.findById(userId).select('lxnsAccessToken lxnsRefreshToken');
  if (!user || !user.lxnsAccessToken) return null;

  if (user.lxnsRefreshToken) {
    try {
      const refreshRes = await axios.post(
        'https://maimai.lxns.net/api/v0/oauth/token',
        {
          grant_type: 'refresh_token', client_id: process.env.LXNS_CLIENT_ID,
          client_secret: process.env.LXNS_CLIENT_SECRET, refresh_token: user.lxnsRefreshToken
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
      );
      const newToken = refreshRes.data.access_token || refreshRes.data.data?.access_token;
      const newRefresh = refreshRes.data.refresh_token || refreshRes.data.data?.refresh_token;
      if (newToken) {
        const update = { lxnsAccessToken: newToken };
        if (newRefresh) update.lxnsRefreshToken = newRefresh;
        await User.findByIdAndUpdate(userId, update);
        return newToken;
      }
    } catch (_) { /* 刷新失败，fallback 到原 token 试试 */ }
  }

  return user.lxnsAccessToken;
}

// ==========================================
// 🐟 水鱼 Import-Token：导入舞萌 DX 成绩
// ==========================================
router.post('/api/users/sync-maimai', authMiddleware, async (req, res) => {
  try {
    const { importToken } = req.body;
    if (!importToken || !importToken.trim()) {
      return res.status(400).json({ msg: '请提供有效的 Import-Token' });
    }

    const token = importToken.trim();
    const response = await axios.get(
      'https://www.diving-fish.com/api/maimaidxprober/player/records',
      { headers: { 'Import-Token': token, 'Accept': 'application/json' }, timeout: 20000 }
    );
    const data = response.data;
    const playerRating = data.rating || 0;
    const allRecords = data.records;
    if (!allRecords || !allRecords.length) {
      return res.status(200).json({ msg: '水鱼返回的成绩列表为空', rating: 0, totalPf: 0 });
    }

    const allSongsArray = await Song.find({}, 'id title ds charts basic_info').lean();
    const songMap = new Map();
    allSongsArray.forEach(song => songMap.set(String(song.id), song));

    const processedScores = allRecords.map(rec => {
      const song = songMap.get(String(rec.song_id));
      let pf = 0, dxRatio = 0, constant = rec.ds || 0, isNew = false;

      if (song) {
        isNew = song.basic_info?.is_new || false;
        const isUtage = /^\[.+?\]/.test(rec.title) || /^\[.+?\]/.test(song.title) || song.type === 'UTAGE' || song.basic_info?.genre === '宴会場' || song.basic_info?.genre === '宴会场';
        if (song.charts && song.charts[rec.level_index]) {
          const chartInfo = song.charts[rec.level_index];
          const maxDxScore = chartInfo.notes.reduce((a, b) => a + b, 0) * 3;
          constant = isUtage ? 0 : (rec.ds || song.ds[rec.level_index]);
          dxRatio = maxDxScore > 0 ? (rec.dxScore / maxDxScore) : 0;
          if (maxDxScore > 0) pf = calculatePF(constant, rec.achievements, rec.dxScore, maxDxScore);
        }
      }
      return {
        userId: req.user.id, nickname: data.nickname || 'MaimaiPlayer',
        imageUrl: `https://www.diving-fish.com/covers/${String(rec.song_id).padStart(5, '0')}.png`,
        achievementRate: rec.achievements || 0, songId: rec.song_id,
        songName: song ? song.title : rec.title, achievement: rec.achievements || 0,
        fcStatus: rec.fc || '', fsStatus: rec.fs || '', dxScore: rec.dxScore || 0,
        rating: rec.ra || 0, level: rec.level_index || 0,
        // TODO: 水鱼 API 的 player/records 不返回游玩时间字段，
        //       所有成绩的 finishTime 统一为导入时刻。若后续需要"最近游玩"排序，
        //       可考虑使用水鱼 Developer-Token 获取新版 API 数据
        finishTime: new Date(),
        pf: isNaN(pf) || !isFinite(pf) ? 0 : pf,
        dxRatio: isNaN(dxRatio) || !isFinite(dxRatio) ? 0 : dxRatio,
        constant: isNaN(constant) || !isFinite(constant) ? 0 : constant, isNew: isNew
      };
    });

    if (processedScores.length === 0) {
      return res.status(400).json({ msg: '水鱼 Token 有效但无匹配的本地曲库记录，无成绩可导入' });
    }

    const oldTop35 = processedScores.filter(r => !r.isNew).sort((a, b) => b.rating - a.rating).slice(0, 35);
    const newTop15 = processedScores.filter(r => r.isNew).sort((a, b) => b.rating - a.rating).slice(0, 15);
    const calculatedRating = [...oldTop35, ...newTop15].reduce((sum, rec) => sum + rec.rating, 0);
    const finalRating = calculatedRating > 0 ? calculatedRating : playerRating;

    const oldScoresBackup = await Score.find({ userId: req.user.id }).lean();
    const finalScoresToSave = processedScores.map(({ isNew, ...rest }) => rest);

    try {
      await Score.deleteMany({ userId: req.user.id });
      await Score.insertMany(finalScoresToSave);
    } catch (writeErr) {
      if (oldScoresBackup.length > 0) {
        await Score.insertMany(oldScoresBackup);
      }
      console.error('水鱼同步写入失败，已回滚:', writeErr.message);
      return res.status(500).json({ msg: '成绩写入失败，已自动回滚至同步前状态' });
    }

    const topRecordsByPf = [...finalScoresToSave].sort((a, b) => b.pf - a.pf).slice(0, 50);
    const totalPf = topRecordsByPf.reduce((sum, score) => sum + score.pf, 0);
    await User.findByIdAndUpdate(req.user.id, {
      importToken: token, totalPf: Number(totalPf.toFixed(2)), rating: finalRating
    });

    res.json({ msg: `成功同步！共导入 ${processedScores.length} 条成绩`, rating: finalRating, totalPf: Number(totalPf.toFixed(2)) });
  } catch (err) {
    const status = err.response?.status;
    const errMsg = err.response?.data?.message || err.response?.data?.msg || '';
    if (status === 400 && errMsg.includes('token')) {
      return res.status(400).json({ msg: '导入 Token 有误，请检查后重试' });
    }
    if (status === 403) {
      return res.status(403).json({ msg: '水鱼 API 拒绝访问，请检查 Token 权限' });
    }
    console.error('水鱼同步失败:', err.message);
    const safeMsg = errMsg || '服务器内部错误';
    res.status(status || 500).json({ msg: `同步失败：${safeMsg}` });
  }
});

// ==========================================
// ❄️ 落雪 OAuth：授权码 → Token + 全量导入成绩
// ==========================================
router.post('/api/users/sync-luoxue-oauth', authMiddleware, async (req, res) => {
  try {
    const { code, redirectUri } = req.body;
    if (!code) return res.status(400).json({ msg: '缺少 OAuth 授权码' });

    // 1. 用授权码换取 Access Token
    const tokenResponse = await axios.post(
      'https://maimai.lxns.net/api/v0/oauth/token',
      {
        grant_type: 'authorization_code', client_id: process.env.LXNS_CLIENT_ID,
        client_secret: process.env.LXNS_CLIENT_SECRET, code, redirect_uri: redirectUri
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    const userAccessToken = tokenResponse.data.access_token || tokenResponse.data.data?.access_token;
    const refreshToken = tokenResponse.data.refresh_token || tokenResponse.data.data?.refresh_token;
    if (!userAccessToken) {
      return res.status(502).json({ msg: '落雪 OAuth Token 换取失败，请检查 LXNS_CLIENT_ID/SECRET 配置' });
    }

    // 2. 尝试提取个人 API 密钥（用于后续免 OAuth 刷成绩）
    let personalApiToken = null;
    try {
      const userTokenRes = await axios.get('https://maimai.lxns.net/api/v0/user/token', {
        headers: { 'Authorization': `Bearer ${userAccessToken}` }, timeout: 10000
      });
      personalApiToken = userTokenRes.data?.data?.token || null;
    } catch (_) { /* 非必需，失败不阻塞 */ }

    // 3. 获取玩家成绩
    const scoreResponse = await axios.get(
      'https://maimai.lxns.net/api/v0/user/maimai/player/scores',
      { headers: { 'Authorization': `Bearer ${userAccessToken}` }, timeout: 30000 }
    );
    const allRecords = scoreResponse.data?.data?.records || scoreResponse.data?.records || [];
    if (!allRecords.length) {
      return res.status(200).json({ msg: '落雪返回的成绩列表为空' });
    }

    // 4. 匹配本地曲库（使用 Map 统一风格，同水鱼）
    const allSongsArray = await Song.find({}, 'id title ds charts basic_info type').lean();
    const songMap = new Map();
    allSongsArray.forEach(s => {
      const key = `${String(s.id)}_${String(s.type || 'SD').trim().toUpperCase()}`;
      songMap.set(key, s);
    });
    // 兼容 ID 偏移的情况（旧数据中部分歌曲 id ±10000）
    allSongsArray.forEach(s => {
      ['SD', 'DX'].forEach(t => {
        [10000, -10000].forEach(offset => {
          const adjustedKey = `${String(Number(s.id) + offset)}_${t}`;
          if (!songMap.has(adjustedKey)) songMap.set(adjustedKey, s);
        });
      });
    });

    const processedScores = [];

    for (const rec of allRecords) {
      const rawType = String(rec.type || '').trim().toUpperCase();
      let lxType = 'SD';
      if (rawType === 'DX' || rawType === '1') lxType = 'DX';

      const lxId = Number(rec.song_id || rec.id);
      const lxLevelIndex = Number(rec.level_index !== undefined ? rec.level_index : rec.level);
      const mapKey = `${lxId}_${lxType}`;

      const song = songMap.get(mapKey);
      if (!song) continue;
      if (song.disabled) continue;

      let pf = 0, dxRatio = 0, constant = 0;
      const isNew = song.basic_info?.is_new || false;
      const isUtage = /^\[.+?\]/.test(song.title) || song.type === 'UTAGE' || song.basic_info?.genre === '宴会场';

      if (song.charts && song.charts[lxLevelIndex]) {
        const notes = song.charts[lxLevelIndex].notes;
        const maxDxScore = notes ? notes.reduce((a, b) => a + b, 0) * 3 : 0;
        constant = isUtage ? 0 : (song.ds[lxLevelIndex] || 0);
        const currentDxScore = rec.dxScore || rec.dx_score || 0;
        dxRatio = maxDxScore > 0 ? (currentDxScore / maxDxScore) : 0;
        if (maxDxScore > 0) pf = calculatePF(constant, rec.achievements, currentDxScore, maxDxScore);
      }

      processedScores.push({
        userId: req.user.id, nickname: 'LxOAuthPlayer',
        imageUrl: `https://www.diving-fish.com/covers/${String(song.id).padStart(5, '0')}.png`,
        achievementRate: rec.achievements || 0, songId: song.id, songName: song.title,
        achievement: rec.achievements || 0, fcStatus: rec.fc || '', fsStatus: rec.fs || '',
        dxScore: rec.dxScore || rec.dx_score || 0,
        rating: Math.floor(rec.dx_rating || rec.ra || 0), level: lxLevelIndex,
        constant: isNaN(constant) ? 0 : constant,
        finishTime: new Date(rec.play_time || Date.now()),
        pf: isNaN(pf) ? 0 : pf, dxRatio: isNaN(dxRatio) ? 0 : dxRatio, isNew: isNew
      });
    }

    if (processedScores.length === 0) {
      return res.status(400).json({
        msg: '落雪 API 返回的成绩数据均未匹配到本地曲库，请确认当前曲库已同步。旧成绩已保留未改动'
      });
    }

    // 5. 计算 Rating (B35 + B15)
    const oldTop35 = processedScores.filter(r => !r.isNew).sort((a, b) => b.rating - a.rating).slice(0, 35);
    const newTop15 = processedScores.filter(r => r.isNew).sort((a, b) => b.rating - a.rating).slice(0, 15);
    const calculatedRating = [...oldTop35, ...newTop15].reduce((sum, rec) => sum + (rec.rating || 0), 0);

    const oldScoresBackup = await Score.find({ userId: req.user.id }).lean();
    try {
      await Score.deleteMany({ userId: req.user.id });
      await Score.insertMany(processedScores);
    } catch (writeErr) {
      if (oldScoresBackup.length > 0) {
        await Score.insertMany(oldScoresBackup);
      }
      console.error('落雪同步写入失败，已回滚:', writeErr.message);
      return res.status(500).json({ msg: '成绩写入失败，已自动回滚至同步前状态' });
    }

    const topRecordsByPf = [...processedScores].sort((a, b) => b.pf - a.pf).slice(0, 50);
    const totalPf = topRecordsByPf.reduce((sum, score) => sum + score.pf, 0);

    // 6. 保存 Token 与 Rating/PF
    const updateFields = {
      totalPf: Number(totalPf.toFixed(2)), rating: calculatedRating,
      lxnsAccessToken: userAccessToken
    };
    if (refreshToken) updateFields.lxnsRefreshToken = refreshToken;
    if (personalApiToken) updateFields.lxnsPersonalApiToken = personalApiToken;
    await User.findByIdAndUpdate(req.user.id, updateFields);

    res.json({
      msg: `全量同步成功！共导入 ${processedScores.length} 条成绩`,
      rating: calculatedRating, count: processedScores.length,
      totalPf: Number(totalPf.toFixed(2))
    });
  } catch (err) {
    const status = err.response?.status;
    const errMsg = err.response?.data?.message || err.response?.data?.msg || '';
    if (status === 400) {
      return res.status(400).json({ msg: `落雪 OAuth 授权码无效或已过期：${errMsg}` });
    }
    if (status === 401) {
      return res.status(401).json({ msg: '落雪 OAuth Token 无效，请重新授权' });
    }
    console.error('落雪 OAuth 同步失败:', err.message);
    const safeMsg = errMsg || '服务器内部错误';
    res.status(status || 500).json({ msg: `同步失败：${safeMsg}` });
  }
});

// ==========================================
// 🌟 落雪 OAuth：获取玩家收藏品进度（含 Token 自动续期）
// ==========================================
router.get('/api/maimai/player-collections/:username', authMiddleware, async (req, res) => {
  try {
    const targetUser = await User.findOne({ username: new RegExp(`^${req.params.username}$`, 'i') }).select('lxnsAccessToken lxnsRefreshToken divingFishUsername proberUsername maimaiProfile');
    if (!targetUser) return res.status(404).json({ msg: '用户不存在' });
    if (!targetUser.lxnsAccessToken) return res.status(403).json({ msg: '该用户尚未通过落雪 OAuth 授权，无法获取收藏品进度' });

    const { collectionType, collectionId } = req.query;
    if (!collectionType || !collectionId) return res.status(400).json({ msg: '缺少参数 collectionType 或 collectionId' });

    const token = await getValidLxnsToken(targetUser._id);
    if (!token) return res.status(403).json({ msg: '获取落雪 Token 失败' });

    const playerRes = await axios.get('https://maimai.lxns.net/api/v0/user/maimai/player', {
      headers: { 'Authorization': `Bearer ${token}` }, timeout: 10000
    });
    const friendCode = playerRes.data?.data?.friend_code;
    if (!friendCode) return res.status(404).json({ msg: '无法获取好友码' });

    const collectionRes = await axios.get(
      `https://maimai.lxns.net/api/v0/maimai/player/${friendCode}/${collectionType}/${collectionId}`,
      { headers: { 'Authorization': `Bearer ${token}` }, timeout: 10000 }
    );
    res.json(collectionRes.data);
  } catch (err) {
    const status = err.response?.status;
    const errMsg = err.response?.data?.message || '';
    if (status === 403 || status === 401) {
      return res.status(403).json({ msg: `落雪 OAuth 授权已过期${errMsg ? '：' + errMsg : ''}，请重新授权` });
    }
    console.error('获取收藏品进度失败:', err.message);
    res.status(500).json({ msg: '获取收藏品进度失败' });
  }
});

// 批量获取玩家所有收藏品 ID（含 Token 自动续期）
router.get('/api/maimai/player-collections-owned/:username', authMiddleware, async (req, res) => {
  try {
    const targetUser = await User.findOne({ username: new RegExp(`^${req.params.username}$`, 'i') }).select('lxnsAccessToken lxnsRefreshToken');
    if (!targetUser) return res.status(404).json({ msg: '用户不存在' });
    if (!targetUser.lxnsAccessToken) return res.status(403).json({ msg: 'NO_TOKEN' });

    const { collectionType } = req.query;
    if (!collectionType) return res.status(400).json({ msg: '缺少参数 collectionType' });

    const token = await getValidLxnsToken(targetUser._id);
    if (!token) return res.status(403).json({ msg: 'NO_TOKEN' });

    const playerRes = await axios.get('https://maimai.lxns.net/api/v0/user/maimai/player', {
      headers: { 'Authorization': `Bearer ${token}` }, timeout: 10000
    });
    const playerData = playerRes.data?.data;
    if (!playerData) return res.status(404).json({ msg: '无法获取玩家数据' });

    const friendCode = playerData.friend_code;

    const [trophyRes, iconRes, plateRes, frameRes] = await Promise.allSettled([
      collectionType === 'trophy' || collectionType === 'all'
        ? axios.get(`https://maimai.lxns.net/api/v0/maimai/player/${friendCode}/trophy/list`, { headers: { 'Authorization': `Bearer ${token}` }, timeout: 10000 })
        : Promise.resolve(null),
      collectionType === 'icon' || collectionType === 'all'
        ? axios.get(`https://maimai.lxns.net/api/v0/maimai/player/${friendCode}/icon/list`, { headers: { 'Authorization': `Bearer ${token}` }, timeout: 10000 })
        : Promise.resolve(null),
      collectionType === 'plate' || collectionType === 'all'
        ? axios.get(`https://maimai.lxns.net/api/v0/maimai/player/${friendCode}/plate/list`, { headers: { 'Authorization': `Bearer ${token}` }, timeout: 10000 })
        : Promise.resolve(null),
      collectionType === 'frame' || collectionType === 'all'
        ? axios.get(`https://maimai.lxns.net/api/v0/maimai/player/${friendCode}/frame/list`, { headers: { 'Authorization': `Bearer ${token}` }, timeout: 10000 })
        : Promise.resolve(null),
    ]);

    const ownedIds = {
      trophy: trophyRes.value?.data?.data?.map(t => t.id) || [],
      icon:   iconRes.value?.data?.data?.map(i => i.id) || [],
      plate:  plateRes.value?.data?.data?.map(p => p.id) || [],
      frame:  frameRes.value?.data?.data?.map(f => f.id) || [],
      equipped: {
        trophy: playerData.trophy?.id || null,
        icon:   playerData.icon?.id || null,
        plate:  playerData.name_plate?.id || null,
        frame:  playerData.frame?.id || null,
      }
    };

    res.json(ownedIds);
  } catch (err) {
    const status = err.response?.status;
    const errMsg = err.response?.data?.message || '';
    if (status === 403 || status === 401) {
      return res.status(403).json({ msg: 'TOKEN_EXPIRED' });
    }
    console.error('获取收藏品持有信息失败:', err.message);
    res.status(500).json({ msg: '获取失败' });
  }
});

module.exports = router;
