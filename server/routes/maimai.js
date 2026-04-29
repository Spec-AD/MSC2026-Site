const express = require('express');
const router = express.Router();
const User = require('../models/User');
const axios = require('axios');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

// ==========================================
// 🌟 落雪 OAuth：获取玩家收藏品进度
// ==========================================
router.get('/api/maimai/player-collections/:username', authMiddleware, async (req, res) => {
  try {
    const targetUser = await User.findOne({ username: new RegExp(`^${req.params.username}$`, 'i') }).select('lxnsAccessToken divingFishUsername proberUsername maimaiProfile');
    if (!targetUser) return res.status(404).json({ msg: '用户不存在' });
    if (!targetUser.lxnsAccessToken) return res.status(403).json({ msg: '该用户尚未通过落雪 OAuth 授权，无法获取收藏品进度' });

    const { collectionType, collectionId } = req.query;
    if (!collectionType || !collectionId) return res.status(400).json({ msg: '缺少参数 collectionType 或 collectionId' });

    // 获取用户的好友码（通过落雪 API 的 player info）
    const playerRes = await axios.get('https://maimai.lxns.net/api/v0/user/maimai/player', {
      headers: { 'Authorization': `Bearer ${targetUser.lxnsAccessToken}` },
      timeout: 10000
    });
    const friendCode = playerRes.data?.data?.friend_code;
    if (!friendCode) return res.status(404).json({ msg: '无法获取好友码' });

    const collectionRes = await axios.get(
      `https://maimai.lxns.net/api/v0/maimai/player/${friendCode}/${collectionType}/${collectionId}`,
      { headers: { 'Authorization': `Bearer ${targetUser.lxnsAccessToken}` }, timeout: 10000 }
    );
    res.json(collectionRes.data);
  } catch (err) {
    if (err.response?.status === 403) return res.status(403).json({ msg: '落雪 OAuth 授权已过期，请重新授权' });
    console.error('获取收藏品进度失败:', err.message);
    res.status(500).json({ msg: '获取收藏品进度失败' });
  }
});

// 批量获取玩家所有收藏品 ID（用于前端高亮已拥有的收藏品）
router.get('/api/maimai/player-collections-owned/:username', authMiddleware, async (req, res) => {
  try {
    const targetUser = await User.findOne({ username: new RegExp(`^${req.params.username}$`, 'i') }).select('lxnsAccessToken');
    if (!targetUser) return res.status(404).json({ msg: '用户不存在' });
    if (!targetUser.lxnsAccessToken) return res.status(403).json({ msg: 'NO_TOKEN' });

    const { collectionType } = req.query;
    if (!collectionType) return res.status(400).json({ msg: '缺少参数 collectionType' });

    const playerRes = await axios.get('https://maimai.lxns.net/api/v0/user/maimai/player', {
      headers: { 'Authorization': `Bearer ${targetUser.lxnsAccessToken}` },
      timeout: 10000
    });
    const playerData = playerRes.data?.data;
    if (!playerData) return res.status(404).json({ msg: '无法获取玩家数据' });

    // 落雪 /player 接口返回的数据中包含 name_plate, icon, frame, trophy
    // 这里提取拥有的收藏品 ID（当前装备的），并额外获取背包里的
    const friendCode = playerData.friend_code;
    
    // 获取玩家收藏品列表（背包）
    const [trophyRes, iconRes, plateRes, frameRes] = await Promise.allSettled([
      collectionType === 'trophy' || collectionType === 'all'
        ? axios.get(`https://maimai.lxns.net/api/v0/maimai/player/${friendCode}/trophy/list`, { headers: { 'Authorization': `Bearer ${targetUser.lxnsAccessToken}` }, timeout: 10000 })
        : Promise.resolve(null),
      collectionType === 'icon' || collectionType === 'all'
        ? axios.get(`https://maimai.lxns.net/api/v0/maimai/player/${friendCode}/icon/list`, { headers: { 'Authorization': `Bearer ${targetUser.lxnsAccessToken}` }, timeout: 10000 })
        : Promise.resolve(null),
      collectionType === 'plate' || collectionType === 'all'
        ? axios.get(`https://maimai.lxns.net/api/v0/maimai/player/${friendCode}/plate/list`, { headers: { 'Authorization': `Bearer ${targetUser.lxnsAccessToken}` }, timeout: 10000 })
        : Promise.resolve(null),
      collectionType === 'frame' || collectionType === 'all'
        ? axios.get(`https://maimai.lxns.net/api/v0/maimai/player/${friendCode}/frame/list`, { headers: { 'Authorization': `Bearer ${targetUser.lxnsAccessToken}` }, timeout: 10000 })
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
    if (err.response?.status === 403) return res.status(403).json({ msg: 'TOKEN_EXPIRED' });
    console.error('获取收藏品持有信息失败:', err.message);
    res.status(500).json({ msg: '获取失败' });
  }
});


module.exports = router;
