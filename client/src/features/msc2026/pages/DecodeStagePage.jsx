import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { ArrowRight, Clock3, Eye, Keyboard, Loader2, RefreshCw, Send, Square } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import * as api from '../api/msc2026Api';
import { useMSC2026Store } from '../store';
import { useMSCSSE } from '../hooks/useSSE';

const CONTROL_ROLES = ['ADM', 'TO', 'CHM'];

function formatRemaining(ms) {
  const safe = Math.max(0, ms);
  const minutes = Math.floor(safe / 60_000);
  const seconds = Math.floor((safe % 60_000) / 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const STATUS_LABEL = {
  playing: '待解答',
  cleared: '回答正确',
  dead: '已揭晓',
};

export default function DecodeStagePage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const fetchStatus = useMSC2026Store(state => state.fetchStatus);
  const [game, setGame] = useState(null);
  const [selectedSong, setSelectedSong] = useState(0);
  const [charInput, setCharInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [remainingMs, setRemainingMs] = useState(15 * 60 * 1000);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const canControl = Boolean(user && CONTROL_ROLES.includes(user.role));

  const loadGame = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const response = await api.getDecodeState();
      setGame(response.data.data);
      setError('');
      return response.data.data;
    } catch (requestError) {
      setError(requestError.response?.data?.msg || '开字母状态暂时不可用');
      throw requestError;
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGame().catch(() => {});
    const poller = setInterval(() => loadGame({ quiet: true }).catch(() => {}), 3000);
    return () => clearInterval(poller);
  }, [loadGame]);

  useEffect(() => {
    if (!game?.expiresAt) return undefined;
    const tick = () => setRemainingMs(Math.max(0, new Date(game.expiresAt).getTime() - Date.now()));
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [game?.expiresAt]);

  useEffect(() => {
    if (!game?.songs?.[selectedSong] || game.songs[selectedSong].status !== 'playing') {
      const next = game?.songs?.find(song => song.status === 'playing');
      if (next) setSelectedSong(next.index);
    }
  }, [game, selectedSong]);

  useMSCSSE({
    decode_updated: useCallback(() => loadGame({ quiet: true }).catch(() => {}), [loadGame]),
    stage_advanced: useCallback(() => fetchStatus().catch(() => {}), [fetchStatus]),
  });

  const selected = game?.songs?.[selectedSong] || null;
  const isDone = game?.status === 'done';
  const openedChars = useMemo(
    () => (game?.openedChars || []).map(char => String(char).toUpperCase()),
    [game?.openedChars]
  );

  const handleOpen = async event => {
    event.preventDefault();
    if (!charInput.trim() || busy) return;
    setBusy('open');
    try {
      const response = await api.openDecodeChar(charInput.trim());
      setGame(response.data.data);
      setCharInput('');
      addToast(response.data.msg, 'success');
    } catch (requestError) {
      addToast(requestError.response?.data?.msg || '开字母失败', 'error');
    } finally {
      setBusy('');
    }
  };

  const handleGuess = async event => {
    event.preventDefault();
    if (!guessInput.trim() || busy || !selected) return;
    setBusy('guess');
    try {
      const response = await api.guessDecodeSong(selected.index, guessInput.trim());
      setGame(response.data.data);
      if (response.data.data.correct) setGuessInput('');
      addToast(response.data.msg, response.data.data.correct ? 'success' : 'error');
    } catch (requestError) {
      addToast(requestError.response?.data?.msg || '提交答案失败', 'error');
    } finally {
      setBusy('');
    }
  };

  const handleFinish = async () => {
    if (busy || !window.confirm('提前结束会立即揭晓全部答案，确认继续？')) return;
    setBusy('finish');
    try {
      const response = await api.finishDecode();
      setGame(response.data.data);
      addToast(response.data.msg, 'success');
    } catch (requestError) {
      addToast(requestError.response?.data?.msg || '结束失败', 'error');
    } finally {
      setBusy('');
    }
  };

  const handleAdvance = async () => {
    if (busy) return;
    setBusy('advance');
    try {
      const response = await api.advanceFromDecode();
      addToast(response.data.msg, 'success');
      await fetchStatus();
    } catch (requestError) {
      addToast(requestError.response?.data?.msg || '推进失败', 'error');
    } finally {
      setBusy('');
    }
  };

  if (loading) {
    return <div className="msc-panel flex min-h-[55vh] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-fuchsia-300" /></div>;
  }

  if (error || !game) {
    return (
      <div className="msc-panel flex min-h-[55vh] flex-col items-center justify-center p-8 text-center">
        <p className="text-2xl font-black text-red-200">{error || '开字母尚未初始化'}</p>
        <button onClick={() => loadGame().catch(() => {})} className="mt-6 inline-flex items-center gap-2 border border-white/15 px-5 py-3 font-black text-white"><RefreshCw className="h-5 w-5" />重试</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="msc-panel overflow-hidden border-fuchsia-300/20">
        <div className="grid gap-px bg-white/10 lg:grid-cols-[1fr_280px_220px]">
          <div className="bg-[#090c0f] p-5 md:p-7">
            <p className="msc-kicker text-fuchsia-200">INTERMISSION / LETTER DECODE</p>
            <h1 className="mt-2 text-4xl font-black text-white md:text-6xl">开字母 · 8首挑战</h1>
            <p className="mt-3 text-base text-zinc-400 md:text-lg">曲名不含汉字、平假名或片假名。开出的字符对全部曲目生效，猜错扣除15秒。</p>
          </div>
          <div className={`flex items-center justify-between gap-4 p-5 lg:flex-col lg:items-start lg:justify-center ${remainingMs <= 60_000 && !isDone ? 'bg-red-400 text-black' : 'bg-fuchsia-200 text-black'}`}>
            <div className="flex items-center gap-3"><Clock3 className="h-7 w-7" /><span className="font-mono text-sm font-black">FIXED LIMIT</span></div>
            <p className="font-mono text-5xl font-black tabular-nums md:text-6xl">{formatRemaining(remainingMs)}</p>
          </div>
          <div className="flex items-center justify-between bg-[#090c0f] p-5 lg:flex-col lg:items-start lg:justify-center">
            <p className="font-mono text-sm font-black text-zinc-500">CLEARED</p>
            <p className="text-5xl font-black text-emerald-200">{game.clearedCount}<span className="text-2xl text-zinc-600">/{game.totalSongs}</span></p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {game.songs.map(song => {
          const active = selectedSong === song.index;
          return (
            <button
              key={song.index}
              type="button"
              onClick={() => setSelectedSong(song.index)}
              className={`min-h-36 border p-5 text-left transition-colors ${active ? 'border-fuchsia-200 bg-fuchsia-300/10' : 'border-white/10 bg-[#090c0f] hover:border-white/25'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm font-black text-zinc-500">TRACK {String(song.index + 1).padStart(2, '0')}</span>
                <span className={`text-xs font-black ${song.status === 'cleared' ? 'text-emerald-300' : song.status === 'dead' ? 'text-red-300' : 'text-fuchsia-200'}`}>{STATUS_LABEL[song.status]}</span>
              </div>
              <p className={`mt-6 break-words font-mono text-2xl font-black leading-tight ${song.status === 'cleared' ? 'text-emerald-100' : song.status === 'dead' ? 'text-zinc-500' : 'text-white'}`}>{song.maskedTitle}</p>
              {song.mistakes > 0 && <p className="mt-4 text-xs font-black text-red-300">MISS × {song.mistakes}</p>}
            </button>
          );
        })}
      </div>

      <section className="msc-panel p-5 md:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm font-black text-zinc-500">OPENED</span>
          {openedChars.length ? openedChars.map(char => <span key={char} className="flex h-10 min-w-10 items-center justify-center border border-fuchsia-200/30 bg-fuchsia-300/10 px-2 font-mono text-lg font-black text-fuchsia-100">{char}</span>) : <span className="text-zinc-600">尚未开出字符</span>}
        </div>

        {canControl ? (
          <AnimatePresence mode="wait">
            {!isDone ? (
              <Motion.div key="controls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-7 grid gap-4 xl:grid-cols-2">
                <form onSubmit={handleOpen} className="border border-white/10 bg-white/[0.025] p-5">
                  <label htmlFor="decode-char" className="flex items-center gap-2 text-lg font-black text-white"><Keyboard className="h-5 w-5 text-fuchsia-200" />开出一个字符</label>
                  <div className="mt-4 flex gap-2">
                    <input id="decode-char" value={charInput} onChange={event => setCharInput(event.target.value)} placeholder="A" className="min-w-0 flex-1 border border-white/15 bg-black/30 px-4 py-3 font-mono text-xl font-black uppercase text-white outline-none focus:border-fuchsia-200" autoComplete="off" />
                    <button disabled={Boolean(busy) || !charInput.trim()} className="inline-flex min-w-28 items-center justify-center gap-2 bg-fuchsia-200 px-5 py-3 font-black text-black disabled:opacity-40">{busy === 'open' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Eye className="h-5 w-5" />}开字母</button>
                  </div>
                </form>

                <form onSubmit={handleGuess} className="border border-white/10 bg-white/[0.025] p-5">
                  <label htmlFor="decode-guess" className="flex items-center gap-2 text-lg font-black text-white"><Send className="h-5 w-5 text-emerald-200" />回答 TRACK {String((selected?.index ?? 0) + 1).padStart(2, '0')}</label>
                  <div className="mt-4 flex gap-2">
                    <input id="decode-guess" value={guessInput} onChange={event => setGuessInput(event.target.value)} disabled={selected?.status !== 'playing'} placeholder="输入完整曲名" className="min-w-0 flex-1 border border-white/15 bg-black/30 px-4 py-3 text-lg font-bold text-white outline-none focus:border-emerald-200 disabled:opacity-40" autoComplete="off" />
                    <button disabled={Boolean(busy) || !guessInput.trim() || selected?.status !== 'playing'} className="inline-flex min-w-28 items-center justify-center gap-2 bg-emerald-200 px-5 py-3 font-black text-black disabled:opacity-40">{busy === 'guess' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}提交</button>
                  </div>
                </form>

                <button onClick={handleFinish} disabled={Boolean(busy)} className="inline-flex items-center justify-center gap-2 border border-red-300/25 px-5 py-3 font-black text-red-200 hover:bg-red-400/10 disabled:opacity-40 xl:col-span-2"><Square className="h-4 w-4" />提前结束并揭晓</button>
              </Motion.div>
            ) : (
              <Motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-7 flex flex-col gap-5 border-t border-white/10 pt-6 md:flex-row md:items-center md:justify-between">
                <div><p className="text-3xl font-black text-white">开字母环节已结束</p><p className="mt-2 text-zinc-400">已答对 {game.clearedCount} / {game.totalSongs} 首，答案已全部揭晓。</p></div>
                <button onClick={handleAdvance} disabled={Boolean(busy)} className="inline-flex min-h-14 items-center justify-center gap-3 bg-amber-300 px-7 text-lg font-black text-black disabled:opacity-40">{busy === 'advance' ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}进入 6进4</button>
              </Motion.div>
            )}
          </AnimatePresence>
        ) : (
          <p className="mt-7 border-t border-white/10 pt-5 font-black text-zinc-500">等待主办方操作</p>
        )}
      </section>
    </div>
  );
}
