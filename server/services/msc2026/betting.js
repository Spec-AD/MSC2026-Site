const mongoose = require('mongoose');
const User = require('../../models/User');
const PointsAccount = require('../../models/PointsAccount');
const PointsTransaction = require('../../models/PointsTransaction');
const MSCBettingMarket = require('../../models/MSCBettingMarket');
const MSCBet = require('../../models/MSCBet');
const { ensureAccount } = require('./points');
const { broadcast } = require('./ssePool');

const BETTING_WINDOW_MS = 120_000;
const FINAL_REVEAL_MS = 7_000;
const MINIMUM_STAKES = { stage1: 1000, stage4: 10000 };

function marketKey(stage, groupIndex = null) {
  return stage === 'stage1' ? `stage1-group-${groupIndex}` : 'stage4-final';
}

function effectiveStatus(market, now = Date.now()) {
  if (['settled', 'void'].includes(market.status)) return market.status;
  const opensAt = new Date(market.opensAt).getTime();
  const closesAt = new Date(market.closesAt).getTime();
  if (now < opensAt) return 'scheduled';
  if (now >= closesAt) return 'locked';
  return 'open';
}

function calculateOdds(totalPool, selectionPool) {
  if (!Number.isFinite(totalPool) || !Number.isFinite(selectionPool) || totalPool <= 0 || selectionPool <= 0) return null;
  return Number((totalPool / selectionPool).toFixed(2));
}

function serializeMarket(market, viewerBet = null, now = Date.now()) {
  if (!market) return null;
  const status = effectiveStatus(market, now);
  const totalPool = Number(market.totalPool || 0);
  const minimumStake = Number(market.minimumStake || 1);
  return {
    marketId: String(market._id),
    stage: market.stage,
    matchKey: market.matchKey,
    groupIndex: market.groupIndex,
    status,
    minimumStake: market.minimumStake,
    opensAt: market.opensAt,
    closesAt: market.closesAt,
    serverTime: new Date(now),
    totalPool,
    winnerId: market.winnerId ? String(market.winnerId) : null,
    players: (market.players || []).map(player => ({
      userId: String(player.userId),
      username: player.username,
      avatarUrl: player.avatarUrl,
      pool: Number(player.pool || 0),
      betCount: Number(player.betCount || 0),
      poolShare: totalPool > 0 ? Number(((Number(player.pool || 0) / totalPool) * 100).toFixed(1)) : 50,
      odds: Number(player.pool || 0) > 0
        ? calculateOdds(totalPool, Number(player.pool || 0))
        : totalPool > 0
          ? Number(((totalPool + minimumStake) / minimumStake).toFixed(2))
          : 2,
      oddsProjected: Number(player.pool || 0) === 0
    })),
    myBet: viewerBet ? {
      selectionId: String(viewerBet.selectionId),
      stake: viewerBet.stake,
      status: viewerBet.status,
      payout: viewerBet.payout
    } : null
  };
}

async function createMarket({ tournamentId, stage, groupIndex = null, playerIds, opensAt = new Date() }) {
  if (!MINIMUM_STAKES[stage]) throw new Error('该阶段不支持竞猜');
  const users = await User.find({ _id: { $in: playerIds } }).select('username avatarUrl').lean();
  const byId = new Map(users.map(user => [String(user._id), user]));
  const players = playerIds.map(id => {
    const user = byId.get(String(id));
    if (!user) throw new Error('竞猜选手资料不存在');
    return { userId: id, username: user.username, avatarUrl: user.avatarUrl, pool: 0, betCount: 0 };
  });
  const openTime = new Date(opensAt);
  const closesAt = new Date(openTime.getTime() + BETTING_WINDOW_MS);
  const key = marketKey(stage, groupIndex);
  const latest = await MSCBettingMarket.findOne({ tournamentId, stage, matchKey: key }).sort({ generation: -1 });
  if (latest && !['settled', 'void'].includes(latest.status)) return latest;
  const market = await MSCBettingMarket.create({
    tournamentId,
    stage,
    matchKey: key,
    generation: (latest?.generation || 0) + 1,
    groupIndex,
    players,
    minimumStake: MINIMUM_STAKES[stage],
    opensAt: openTime,
    closesAt,
    status: openTime.getTime() > Date.now() ? 'scheduled' : 'open',
    totalPool: 0
  });
  broadcast('betting_update', { action: 'market_opened', market: serializeMarket(market) });
  return market;
}

async function getMarket({ tournamentId, stage, groupIndex = null, userId = null }) {
  const market = await MSCBettingMarket.findOne({ tournamentId, stage, matchKey: marketKey(stage, groupIndex) }).sort({ generation: -1 }).lean();
  if (!market) return null;
  const viewerBet = userId ? await MSCBet.findOne({ marketId: market._id, userId }).lean() : null;
  return serializeMarket(market, viewerBet);
}

async function placeBet({ marketId, userId, selectionId, stake }) {
  const normalizedStake = Number(stake);
  if (!Number.isSafeInteger(normalizedStake) || normalizedStake <= 0) throw new Error('下注积分必须是正整数');

  const session = await mongoose.startSession();
  let response;
  try {
    await session.withTransaction(async () => {
      const market = await MSCBettingMarket.findById(marketId).session(session);
      if (!market) throw new Error('竞猜场次不存在');
      if (effectiveStatus(market) !== 'open') throw new Error('本场竞猜尚未开放或已经封盘');
      if (normalizedStake < market.minimumStake) throw new Error(`本场最低下注 ${market.minimumStake.toLocaleString()} 积分`);
      const playerIndex = market.players.findIndex(player => String(player.userId) === String(selectionId));
      if (playerIndex < 0) throw new Error('所选选手不属于本场比赛');

      const existing = await MSCBet.findOne({ marketId: market._id, userId }).session(session);
      if (existing) throw new Error('每场比赛仅可下注一次，确认后不可更改');

      await ensureAccount(userId, session);
      const account = await PointsAccount.findOneAndUpdate(
        { userId, balance: { $gte: normalizedStake } },
        { $inc: { balance: -normalizedStake, lifetimeSpent: normalizedStake } },
        { new: true, session }
      );
      if (!account) throw new Error('积分余额不足');

      const [bet] = await MSCBet.create([{
        marketId: market._id,
        userId,
        selectionId,
        stake: normalizedStake
      }], { session });

      market.players[playerIndex].pool += normalizedStake;
      market.players[playerIndex].betCount += 1;
      market.totalPool += normalizedStake;
      market.status = 'open';
      await market.save({ session });

      await PointsTransaction.create([{
        userId,
        type: 'BET_STAKE',
        amount: -normalizedStake,
        balanceAfter: account.balance,
        referenceType: 'bet',
        referenceId: bet._id,
        note: `${market.stage === 'stage1' ? '12进6' : '决赛'}竞猜下注`,
        idempotencyKey: `bet-stake:${bet._id}`
      }], { session });
      response = { market: serializeMarket(market, bet), balance: account.balance };
    });
  } finally {
    await session.endSession();
  }
  broadcast('betting_update', { action: 'bet_placed', market: serializeMarket(await MSCBettingMarket.findById(marketId).lean()) });
  broadcast('points_updated', { userId: String(userId) });
  return response;
}

function allocatePayouts(winningBets, totalPool, winnerPool) {
  const shares = winningBets.map(bet => {
    const exact = (bet.stake * totalPool) / winnerPool;
    return { bet, payout: Math.floor(exact), fraction: exact - Math.floor(exact) };
  });
  let remainder = totalPool - shares.reduce((sum, item) => sum + item.payout, 0);
  shares.sort((a, b) => b.fraction - a.fraction || String(a.bet._id).localeCompare(String(b.bet._id)));
  for (let i = 0; i < shares.length && remainder > 0; i += 1, remainder -= 1) shares[i].payout += 1;
  return shares;
}

async function settleMarket({ tournamentId, stage, groupIndex = null, winnerId }) {
  const session = await mongoose.startSession();
  let serialized = null;
  try {
    await session.withTransaction(async () => {
      const market = await MSCBettingMarket.findOne({ tournamentId, stage, matchKey: marketKey(stage, groupIndex) }).sort({ generation: -1 }).session(session);
      if (!market || ['settled', 'void'].includes(market.status)) {
        serialized = market ? serializeMarket(market) : null;
        return;
      }
      const bets = await MSCBet.find({ marketId: market._id, status: 'placed' }).session(session);
      const winnerPool = Number(market.players.find(player => String(player.userId) === String(winnerId))?.pool || 0);

      // 无人押中时不凭空销毁用户积分：本场作废并全额退还。
      if (bets.length === 0 || winnerPool === 0) {
        for (const bet of bets) {
          const account = await PointsAccount.findOneAndUpdate(
            { userId: bet.userId },
            { $inc: { balance: bet.stake, lifetimeSpent: -bet.stake } },
            { new: true, session }
          );
          bet.status = 'refunded';
          bet.payout = bet.stake;
          bet.settledAt = new Date();
          await bet.save({ session });
          await PointsTransaction.create([{
            userId: bet.userId, type: 'REFUND', amount: bet.stake, balanceAfter: account.balance,
            referenceType: 'market', referenceId: market._id, note: '竞猜无人押中，下注全额退回',
            idempotencyKey: `market-refund:${market._id}:${bet.userId}`
          }], { session });
        }
        market.status = 'void';
        market.winnerId = winnerId;
        market.settledAt = new Date();
        await market.save({ session });
        serialized = serializeMarket(market);
        return;
      }

      const winningBets = bets.filter(bet => String(bet.selectionId) === String(winnerId));
      const allocations = allocatePayouts(winningBets, Number(market.totalPool), winnerPool);
      const payoutByBet = new Map(allocations.map(item => [String(item.bet._id), item.payout]));
      for (const bet of bets) {
        const won = payoutByBet.has(String(bet._id));
        const payout = payoutByBet.get(String(bet._id)) || 0;
        bet.status = won ? 'won' : 'lost';
        bet.payout = payout;
        bet.settledAt = new Date();
        await bet.save({ session });
        if (payout > 0) {
          const account = await PointsAccount.findOneAndUpdate(
            { userId: bet.userId },
            { $inc: { balance: payout, lifetimeEarned: payout } },
            { new: true, session }
          );
          await PointsTransaction.create([{
            userId: bet.userId, type: 'BET_PAYOUT', amount: payout, balanceAfter: account.balance,
            referenceType: 'market', referenceId: market._id, note: '竞猜命中结算',
            idempotencyKey: `market-payout:${market._id}:${bet.userId}`
          }], { session });
        }
      }
      market.status = 'settled';
      market.winnerId = winnerId;
      market.payoutPool = market.totalPool;
      market.settledAt = new Date();
      await market.save({ session });
      serialized = serializeMarket(market);
    });
  } finally {
    await session.endSession();
  }
  if (serialized) broadcast('betting_update', { action: 'market_settled', market: serialized });
  return serialized;
}

async function prepareMarketsForRollback({ tournamentId, stage = null, fromGroupIndex = null }) {
  const query = { tournamentId, ...(stage ? { stage } : {}) };
  if (fromGroupIndex != null) query.groupIndex = { $gte: fromGroupIndex };
  const settled = await MSCBettingMarket.exists({ ...query, status: 'settled' });
  if (settled) throw new Error('相关竞猜已经完成派奖，不能直接回退赛果；请先由赛事负责人完成积分对账');
  const active = await MSCBettingMarket.find({ ...query, status: { $in: ['scheduled', 'open', 'locked'] } }).select('stage groupIndex').lean();
  for (const market of active) {
    await settleMarket({ tournamentId, stage: market.stage, groupIndex: market.groupIndex, winnerId: null });
  }
}

module.exports = {
  BETTING_WINDOW_MS,
  FINAL_REVEAL_MS,
  MINIMUM_STAKES,
  effectiveStatus,
  calculateOdds,
  allocatePayouts,
  serializeMarket,
  createMarket,
  getMarket,
  placeBet,
  settleMarket,
  prepareMarketsForRollback
};
