const PointsAccount = require('../../models/PointsAccount');
const PointsTransaction = require('../../models/PointsTransaction');

const INITIAL_BALANCE = 5000;

async function ensureAccount(userId, session = null) {
  const options = { upsert: true, new: true, setDefaultsOnInsert: true };
  if (session) options.session = session;
  const account = await PointsAccount.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, balance: INITIAL_BALANCE, lifetimeEarned: INITIAL_BALANCE, lifetimeSpent: 0 } },
    options
  );

  const transactionOptions = session ? { session } : undefined;
  await PointsTransaction.updateOne(
    { idempotencyKey: `welcome:${userId}` },
    {
      $setOnInsert: {
        userId,
        type: 'WELCOME',
        amount: INITIAL_BALANCE,
        balanceAfter: INITIAL_BALANCE,
        referenceType: 'system',
        note: 'MSC 2026 初始积分',
        idempotencyKey: `welcome:${userId}`
      }
    },
    { upsert: true, ...(transactionOptions || {}) }
  );
  return account;
}

async function getAccountSummary(userId) {
  const account = await ensureAccount(userId);
  const transactions = await PointsTransaction.find({ userId })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();
  return {
    balance: account.balance,
    lifetimeEarned: account.lifetimeEarned,
    lifetimeSpent: account.lifetimeSpent,
    transactions
  };
}

module.exports = { INITIAL_BALANCE, ensureAccount, getAccountSummary };
