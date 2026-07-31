import { useCallback, useEffect, useMemo, useState } from 'react';
import { Coins, LockKeyhole, Radio, TimerReset, TrendingUp } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { useMSCSSE } from '../../hooks/useSSE';
import * as api from '../../api/msc2026Api';

const number = new Intl.NumberFormat('zh-CN');

function formatRemaining(ms) {
  const safe = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

export default function BettingPanel({ stage, groupIndex = null }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const compact = pathname.endsWith('/live');
  const [market, setMarket] = useState(null);
  const [account, setAccount] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [stake, setStake] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    const [marketResult, accountResult] = await Promise.allSettled([
      api.getCurrentBettingMarket(stage, groupIndex),
      user ? api.getPointsAccount() : Promise.resolve(null)
    ]);
    if (marketResult.status === 'fulfilled') {
      const nextMarket = marketResult.value.data.data;
      setMarket(nextMarket);
      if (nextMarket?.minimumStake) setStake(current => current || String(nextMarket.minimumStake));
    }
    if (accountResult.status === 'fulfilled' && accountResult.value) setAccount(accountResult.value.data.data);
  }, [stage, groupIndex, user]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  useMSCSSE({
    betting_update: useCallback(() => load(), [load]),
    points_updated: useCallback((data) => {
      if (user && String(data.userId) === String(user.id || user._id)) load();
    }, [load, user])
  }, { enabled: true });

  const phase = useMemo(() => {
    if (!market) return { label: '等待开盘', remaining: 0 };
    const opensAt = new Date(market.opensAt).getTime();
    const closesAt = new Date(market.closesAt).getTime();
    if (!['settled', 'void'].includes(market.status) && now < opensAt) return { status: 'scheduled', label: '选手揭晓中', remaining: opensAt - now };
    if (!['settled', 'void'].includes(market.status) && now < closesAt) return { status: 'open', label: '竞猜开放', remaining: closesAt - now };
    if (!['settled', 'void'].includes(market.status)) return { status: 'locked', label: '已封盘', remaining: 0 };
    if (market.status === 'locked') return { label: '已封盘', remaining: 0 };
    if (market.status === 'settled') return { status: 'settled', label: '已结算', remaining: 0 };
    return { status: 'void', label: '本场作废 · 已退款', remaining: 0 };
  }, [market, now]);

  const submit = async () => {
    if (!selectedId || !stake) return;
    setPending(true);
    setMessage('');
    try {
      const response = await api.placeBet(market.marketId, selectedId, Number(stake));
      setMarket(response.data.data.market);
      setAccount(current => current ? { ...current, balance: response.data.data.balance } : current);
      setMessage('下注成功。选择与积分已锁定，封盘后不可撤回。');
    } catch (err) {
      setMessage(err.response?.data?.msg || '下注失败，请稍后再试');
    } finally {
      setPending(false);
    }
  };

  if (!market) {
    return (
      <section className="msc-panel border-l-2 border-l-zinc-600 px-5 py-4 text-zinc-500">
        <div className="flex items-center gap-3"><Radio className="h-5 w-5" /><span className="font-black">本场竞猜尚未创建</span></div>
      </section>
    );
  }

  const isOpen = phase.status === 'open';
  const hasBet = Boolean(market.myBet);
  const selectedPlayer = market.players.find(player => player.userId === selectedId);

  return (
    <section className={`relative overflow-hidden border border-amber-300/25 bg-[#0e0d09] ${compact ? 'p-4 md:p-5' : 'p-5 md:p-7'}`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200 to-transparent" />
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 text-amber-200"><TrendingUp className="h-5 w-5" /><span className="msc-kicker">LIVE POOL / 积分竞猜</span></div>
          {!compact && <p className="mt-2 text-sm text-zinc-500">彩池赔率 = 总池 ÷ 该选手池 · 无平台抽成</p>}
        </div>
        <div className="flex items-center gap-4">
          {user && account && <span className="flex items-center gap-2 font-black text-amber-100"><Coins className="h-5 w-5" />{number.format(account.balance)}</span>}
          <div className={`min-w-32 border px-3 py-2 text-right ${isOpen ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200' : 'border-white/10 text-zinc-400'}`}>
            <p className="text-xs font-black">{phase.label}</p>
            {phase.remaining > 0 && <p className="font-mono text-2xl font-black tabular-nums">{formatRemaining(phase.remaining)}</p>}
          </div>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-px bg-white/10 md:grid-cols-2">
        {market.players.map((player, index) => {
          const picked = selectedId === player.userId || market.myBet?.selectionId === player.userId;
          const won = market.winnerId === player.userId;
          return (
            <button
              key={player.userId}
              type="button"
              disabled={!isOpen || hasBet || compact}
              onClick={() => setSelectedId(player.userId)}
              className={`relative min-h-36 bg-[#090a0d] p-5 text-left transition-colors disabled:cursor-default ${picked ? '!bg-amber-300 text-black' : 'hover:bg-white/[0.055]'} ${won ? 'ring-1 ring-inset ring-emerald-300' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`font-mono text-xs font-black ${picked ? 'text-black/50' : 'text-zinc-600'}`}>SIDE {index + 1}</p>
                  <p className="mt-2 truncate text-2xl font-black md:text-3xl">{player.username}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs ${picked ? 'text-black/55' : 'text-zinc-500'}`}>{player.oddsProjected ? '参考赔率' : '实时赔率'}</p>
                  <p className="text-3xl font-black tabular-nums">{player.odds ? `${player.odds.toFixed(2)}x` : '—'}</p>
                </div>
              </div>
              <div className="mt-5 h-1.5 bg-white/10"><div className={`h-full ${picked ? 'bg-black/50' : index === 0 ? 'bg-sky-300' : 'bg-orange-300'}`} style={{ width: `${player.poolShare}%` }} /></div>
              <div className={`mt-2 flex justify-between text-sm font-bold ${picked ? 'text-black/60' : 'text-zinc-400'}`}>
                <span>{player.poolShare}% · {player.betCount} 人</span><span>{number.format(player.pool)} 分</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
        <span>总池 <strong className="text-white">{number.format(market.totalPool)}</strong> 积分</span>
        <span>最低下注 <strong className="text-amber-200">{number.format(market.minimumStake)}</strong></span>
      </div>

      {!compact && !hasBet && (
        <div className="mt-5 grid gap-3 border-t border-white/10 pt-5 md:grid-cols-[minmax(0,1fr)_auto]">
          <label className="block">
            <span className="sr-only">下注积分</span>
            <input
              type="number"
              min={market.minimumStake}
              step="100"
              value={stake}
              onChange={event => setStake(event.target.value)}
              disabled={!isOpen}
              className="h-14 w-full border border-white/15 bg-black/30 px-4 text-xl font-black text-white outline-none focus:border-amber-300 disabled:opacity-40"
              placeholder={`最低 ${number.format(market.minimumStake)}`}
            />
          </label>
          <button
            onClick={submit}
            disabled={!isOpen || !user || !selectedId || pending || Number(stake) < market.minimumStake}
            className="h-14 min-w-52 bg-amber-300 px-6 text-lg font-black text-black disabled:cursor-not-allowed disabled:opacity-35"
          >
            {pending ? '正在锁定...' : selectedPlayer ? `确认支持 ${selectedPlayer.username}` : user ? '先选择选手' : '登录后参与'}
          </button>
        </div>
      )}

      {!compact && hasBet && (
        <div className="mt-5 flex items-center gap-3 border border-amber-300/20 bg-amber-300/8 p-4 text-amber-100">
          <LockKeyhole className="h-5 w-5 shrink-0" />
          <p className="font-bold">已下注 {number.format(market.myBet.stake)} 积分 · {market.players.find(p => p.userId === market.myBet.selectionId)?.username} · {market.myBet.status === 'won' ? `赢得 ${number.format(market.myBet.payout)} 积分` : market.myBet.status === 'lost' ? '未命中' : market.myBet.status === 'refunded' ? '已退款' : '等待赛果'}</p>
        </div>
      )}
      {message && <p className={`mt-3 text-sm font-bold ${message.startsWith('下注成功') ? 'text-emerald-200' : 'text-red-200'}`}>{message}</p>}
      {!compact && <p className="mt-4 flex items-center gap-2 text-xs text-zinc-600"><TimerReset className="h-4 w-4" />赔率随彩池实时变化，最终收益以封盘彩池和正式赛果为准。</p>}
    </section>
  );
}
