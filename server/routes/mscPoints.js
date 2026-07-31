const express = require('express');
const router = express.Router();
const MSC2026Tournament = require('../models/MSC2026Tournament');
const MSCBet = require('../models/MSCBet');
const PointsStoreProduct = require('../models/PointsStoreProduct');
const PointsRedemption = require('../models/PointsRedemption');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { checkPermission } = require('../services/msc2026/utils');
const { getAccountSummary } = require('../services/msc2026/points');
const { getMarket, placeBet } = require('../services/msc2026/betting');
const { serializeRedemption, redeemProduct, verifyAndRedeemVoucher } = require('../services/msc2026/pointsStore');

async function currentTournament() {
  return MSC2026Tournament.findOne().select('_id status stage1.currentGroupIndex').lean();
}

router.get('/points/account', authMiddleware, async (req, res) => {
  try {
    res.json({ msg: 'ok', data: await getAccountSummary(req.user.id) });
  } catch (err) {
    console.error('获取积分账户失败:', err);
    res.status(500).json({ msg: '积分账户暂时不可用' });
  }
});

router.get('/betting/current', optionalAuth, async (req, res) => {
  try {
    const tournament = await currentTournament();
    if (!tournament) return res.status(404).json({ msg: '赛事不存在' });
    const stage = req.query.stage || tournament.status;
    if (!['stage1', 'stage4'].includes(stage)) return res.json({ msg: '当前阶段不开放竞猜', data: null });
    const groupIndex = stage === 'stage1'
      ? Number(req.query.groupIndex ?? tournament.stage1?.currentGroupIndex)
      : null;
    const market = await getMarket({
      tournamentId: tournament._id,
      stage,
      groupIndex,
      userId: req.user?.id || null
    });
    res.json({ msg: 'ok', data: market });
  } catch (err) {
    console.error('获取竞猜市场失败:', err);
    res.status(500).json({ msg: '竞猜市场暂时不可用' });
  }
});

router.post('/betting/bets', authMiddleware, async (req, res) => {
  try {
    const result = await placeBet({
      marketId: req.body.marketId,
      userId: req.user.id,
      selectionId: req.body.selectionId,
      stake: req.body.stake
    });
    res.status(201).json({ msg: '下注成功，选择与积分已锁定', data: result });
  } catch (err) {
    const duplicate = err?.code === 11000;
    res.status(400).json({ msg: duplicate ? '每场比赛仅可下注一次' : err.message });
  }
});

router.get('/betting/history', authMiddleware, async (req, res) => {
  try {
    const bets = await MSCBet.find({ userId: req.user.id })
      .populate('marketId', 'stage matchKey players winnerId settledAt')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    res.json({ msg: 'ok', data: bets });
  } catch (err) {
    res.status(500).json({ msg: '竞猜记录暂时不可用' });
  }
});

router.get('/store/products', async (req, res) => {
  try {
    const products = await PointsStoreProduct.find({ active: true, stock: { $gt: 0 } })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
    res.json({ msg: 'ok', data: products });
  } catch (err) {
    res.status(500).json({ msg: '积分商店暂时不可用' });
  }
});

router.get('/store/redemptions', authMiddleware, async (req, res) => {
  try {
    const redemptions = await PointsRedemption.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json({ msg: 'ok', data: redemptions.map(serializeRedemption) });
  } catch (err) {
    res.status(500).json({ msg: '兑换记录暂时不可用' });
  }
});

router.post('/store/redeem', authMiddleware, async (req, res) => {
  try {
    const result = await redeemProduct({ userId: req.user.id, productId: req.body.productId });
    res.status(201).json({ msg: '兑换成功，请妥善保存防伪凭证', data: result });
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

router.post('/store/admin/products', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'admin');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    const { name, description = '', imageUrl = '', cost, stock = 0, active = false, sortOrder = 0 } = req.body;
    if (!name || !Number.isSafeInteger(Number(cost)) || Number(cost) < 1) return res.status(400).json({ msg: '商品名称与正整数价格必填' });
    const product = await PointsStoreProduct.create({ name, description, imageUrl, cost: Number(cost), stock: Number(stock), active, sortOrder });
    res.status(201).json({ msg: '商品已创建', data: product });
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

router.patch('/store/admin/products/:id', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'admin');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    const allowed = ['name', 'description', 'imageUrl', 'cost', 'stock', 'active', 'sortOrder'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const product = await PointsStoreProduct.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ msg: '商品不存在' });
    res.json({ msg: '商品已更新', data: product });
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

router.post('/store/admin/verify', authMiddleware, async (req, res) => {
  try {
    const perm = await checkPermission(req.user, null, 'referee');
    if (!perm.allowed) return res.status(403).json({ msg: perm.msg });
    const redemption = await verifyAndRedeemVoucher({ code: req.body.code, redeemedBy: req.user.id });
    res.json({ msg: '凭证有效，核销成功', data: redemption });
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

module.exports = router;
