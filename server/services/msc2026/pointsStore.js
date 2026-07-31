const crypto = require('crypto');
const mongoose = require('mongoose');
const PointsAccount = require('../../models/PointsAccount');
const PointsTransaction = require('../../models/PointsTransaction');
const PointsStoreProduct = require('../../models/PointsStoreProduct');
const PointsRedemption = require('../../models/PointsRedemption');
const { ensureAccount } = require('./points');

function voucherSecret() {
  const secret = process.env.POINTS_VOUCHER_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('兑奖凭证签名密钥未配置');
  return secret;
}

function formatVoucher(publicToken) {
  const token = String(publicToken).toUpperCase();
  const signature = crypto.createHmac('sha256', voucherSecret()).update(token).digest('hex').slice(0, 10).toUpperCase();
  return `MSC26-${token.slice(0, 4)}-${token.slice(4, 8)}-${token.slice(8, 12)}-${signature}`;
}

function parseVoucher(code) {
  const normalizedCode = String(code || '').trim().toUpperCase();
  const match = /^MSC26-([A-F0-9]{4})-([A-F0-9]{4})-([A-F0-9]{4})-([A-F0-9]{10})$/i.exec(normalizedCode);
  if (!match) return null;
  const publicToken = `${match[1]}${match[2]}${match[3]}`.toLowerCase();
  return crypto.timingSafeEqual(Buffer.from(formatVoucher(publicToken)), Buffer.from(normalizedCode)) ? publicToken : null;
}

function serializeRedemption(redemption) {
  return {
    redemptionId: String(redemption._id),
    product: redemption.productSnapshot,
    status: redemption.status,
    voucherCode: formatVoucher(redemption.publicToken),
    issuedAt: redemption.createdAt,
    redeemedAt: redemption.redeemedAt
  };
}

async function redeemProduct({ userId, productId }) {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const product = await PointsStoreProduct.findOneAndUpdate(
        { _id: productId, active: true, stock: { $gt: 0 } },
        { $inc: { stock: -1 } },
        { new: true, session }
      );
      if (!product) throw new Error('商品不存在、已下架或库存不足');
      await ensureAccount(userId, session);
      const account = await PointsAccount.findOneAndUpdate(
        { userId, balance: { $gte: product.cost } },
        { $inc: { balance: -product.cost, lifetimeSpent: product.cost } },
        { new: true, session }
      );
      if (!account) throw new Error('积分余额不足');
      const [redemption] = await PointsRedemption.create([{
        userId,
        productId: product._id,
        productSnapshot: { name: product.name, cost: product.cost },
        publicToken: crypto.randomBytes(6).toString('hex')
      }], { session });
      await PointsTransaction.create([{
        userId, type: 'STORE_REDEMPTION', amount: -product.cost, balanceAfter: account.balance,
        referenceType: 'redemption', referenceId: redemption._id, note: `兑换：${product.name}`,
        idempotencyKey: `redemption:${redemption._id}`
      }], { session });
      result = { redemption: serializeRedemption(redemption), balance: account.balance };
    });
  } finally {
    await session.endSession();
  }
  return result;
}

async function verifyAndRedeemVoucher({ code, redeemedBy }) {
  const publicToken = parseVoucher(code);
  if (!publicToken) throw new Error('防伪凭证格式或签名无效');
  const redemption = await PointsRedemption.findOneAndUpdate(
    { publicToken, status: 'issued' },
    { $set: { status: 'redeemed', redeemedAt: new Date(), redeemedBy } },
    { new: true }
  );
  if (redemption) return serializeRedemption(redemption);
  const existing = await PointsRedemption.findOne({ publicToken }).lean();
  if (!existing) throw new Error('未找到该防伪凭证');
  if (existing.status === 'redeemed') throw new Error('该凭证已核销，不能重复兑奖');
  throw new Error('该凭证当前不可核销');
}

module.exports = { formatVoucher, parseVoucher, serializeRedemption, redeemProduct, verifyAndRedeemVoucher };
