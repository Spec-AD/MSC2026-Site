// ============================================================
// AdminPanel.jsx — MSC2026 管理员面板 (patch-02 重做)
// 权限：ADM | TO | CHM
// 选手数据源：同一比赛档案自动拉取（不再手动录入）
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { useMSC2026Store } from '../../store';
import * as api from '../../api/msc2026Api';
import {
  FaCog, FaPlay, FaUsers, FaMusic, FaCheck, FaSpinner, FaTimes,
  FaUndo, FaTrash, FaTrophy, FaMedal, FaExclamationTriangle
} from 'react-icons/fa';

const ADMIN_ROLES = ['ADM', 'TO', 'CHM'];

// ==================== 曲目搜索 ====================

function getSongId(song) {
  return String(song?._id || song?.songId || '');
}

function SongSearch({ onToggle, selectedSongs = [], maxSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const selectedIds = selectedSongs.map(getSongId);

  const handleSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await api.searchSongs(q, 30);
      setResults(res.data.data || []);
    } catch (err) { console.error('曲目搜索失败', err); }
    finally { setSearching(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => handleSearch(query), 400);
    return () => clearTimeout(t);
  }, [query, handleSearch]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <FaMusic className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs" />
        <input type="text" placeholder="搜索曲目..." value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-zinc-800 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white placeholder-zinc-600 focus:border-amber-500/40 focus:outline-none transition-all" />
        {searching && <FaSpinner className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs animate-spin" />}
      </div>
      {results.length > 0 && (
        <div className="max-h-48 overflow-y-auto border border-white/10 rounded-xl bg-zinc-800/80 divide-y divide-white/5">
          {results.map((song) => {
            const id = getSongId(song);
            const selected = selectedIds.includes(id);
            const atLimit = maxSelect != null && selectedIds.length >= maxSelect && !selected;
            return (
              <button key={id} onClick={() => !atLimit && onToggle(song)} disabled={atLimit}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-all
                  ${selected ? 'bg-amber-500/10' : 'hover:bg-zinc-700/50'}
                  ${atLimit ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                {song.coverUrl
                  ? <img src={song.coverUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                  : <div className="w-8 h-8 rounded bg-zinc-700 flex items-center justify-center flex-shrink-0"><FaMusic className="text-zinc-500 text-[10px]" /></div>}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{song.title}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{song.artist}</p>
                </div>
                {selected && <FaCheck className="text-amber-400 text-xs flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-zinc-500">已选：</span>
          {selectedSongs.map((song) => (
            <button key={getSongId(song)} type="button" onClick={() => onToggle(song)}
              className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/25 hover:bg-red-500/15 hover:text-red-300 transition-all">
              {song.title || getSongId(song)} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== 旧赛事选手卡片 ====================

function RegistrationCard({ reg, rank, qualifiedUpTo }) {
  const hasQualifier = reg.qualifierProgress?.completed > 0;
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all
      ${rank <= qualifiedUpTo ? 'border-green-500/20 bg-green-500/5' : 'border-white/5 bg-zinc-800/30'}`}>
      {reg.avatarUrl
        ? <img src={reg.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-white/10" />
        : <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0"><FaUsers className="text-zinc-500 text-[10px]" /></div>}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {rank <= qualifiedUpTo && <FaMedal className="text-green-400 text-[10px] flex-shrink-0" />}
          <span className="text-sm text-white font-medium truncate">{reg.username}</span>
          <span className="text-[10px] text-zinc-600 font-mono">#{rank}</span>
        </div>
        {hasQualifier
          ? <p className="text-[10px] text-zinc-500">预选: {reg.qualifierTotalAchievement?.toFixed(4)}% · {reg.qualifierTotalDxScore} DX</p>
          : <p className="text-[10px] text-zinc-600">无预选赛成绩（自动补位）</p>}
      </div>
      {reg.token && <span className="text-[9px] text-zinc-600 font-mono whitespace-nowrap">#{reg.token}</span>}
    </div>
  );
}

// ==================== 操作按钮 ====================

function ActionButton({ onClick, loading, disabled, icon, label, variant = 'primary' }) {
  const styles = {
    primary: 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30',
    danger: 'bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30',
    undo: 'bg-zinc-800 text-zinc-400 border-white/10 hover:bg-zinc-700 hover:text-white',
    default: 'bg-zinc-800 text-zinc-400 border-white/10 hover:bg-zinc-700',
  };
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all
        ${styles[variant]} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {loading ? <FaSpinner className="animate-spin" /> : icon}
      {label}
    </button>
  );
}

function QualifiedPlayerList({ players, emptyText }) {
  if (!players.length) {
    return <p className="text-xs text-zinc-600 py-2">{emptyText}</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {players.map((player, index) => (
        <div key={player.userId} className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-emerald-500/15 bg-emerald-500/5 text-xs text-emerald-200">
          <span className="w-5 text-center font-mono text-emerald-500">{index + 1}</span>
          <span className="truncate">{player.username}</span>
          <FaCheck className="ml-auto text-emerald-400 text-[10px]" />
        </div>
      ))}
    </div>
  );
}

// ==================== 主面板 ====================

export default function AdminPanel() {
  const { user } = useAuth();
  const store = useMSC2026Store();

  const [activeTab, setActiveTab] = useState('init');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  // 比赛档案数据
  const [registrations, setRegistrations] = useState([]);
  const [qualifierRankings, setQualifierRankings] = useState(null);
  const [regLoading, setRegLoading] = useState(false);

  // 图池
  const [stage1Songs, setStage1Songs] = useState([]);
  const [stage4Songs, setStage4Songs] = useState([]);
  const [designatedSong, setDesignatedSong] = useState(null);
  const [savedSongConfig, setSavedSongConfig] = useState({
    stage1SongPool: [],
    stage4SongPool: [],
    designatedSong: null,
  });
  const advanceCount = 12;

  const isAdmin = user && ADMIN_ROLES.includes(user.role);
  const status = store.status;
  const fetchPlayers = store.fetchPlayers;
  const stage2Players = store.players.filter(player => player.isQualifiedStage1);
  const stage3Players = store.players.filter(player => player.isQualifiedStage2);
  const stage4Players = store.players.filter(player => player.isQualifiedStage3);

  // 加载旧赛事数据
  const loadRegistrations = useCallback(async () => {
    if (!isAdmin) return;
    setRegLoading(true);
    try {
      const [regRes, rankRes] = await Promise.all([
        api.getOldRegistrations(),
        api.getQualifierRankings(),
      ]);
      setRegistrations(regRes.data.data?.registrations || []);
      setQualifierRankings(rankRes.data.data || null);
    } catch (err) { console.error('加载比赛档案数据失败', err); }
    finally { setRegLoading(false); }
  }, [isAdmin]);

  const loadSongConfig = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await api.getConfig();
      const config = res.data.data || {};
      const nextConfig = {
        stage1SongPool: config.stage1SongPool || [],
        stage4SongPool: config.stage4SongPool || [],
        designatedSong: config.designatedSong || null,
      };
      setSavedSongConfig(nextConfig);
      setStage1Songs(nextConfig.stage1SongPool);
      setStage4Songs(nextConfig.stage4SongPool);
      setDesignatedSong(nextConfig.designatedSong);
    } catch (err) {
      console.error('加载比赛图池配置失败', err);
    }
  }, [isAdmin]);

  useEffect(() => { loadRegistrations(); }, [loadRegistrations]);
  useEffect(() => { loadSongConfig(); }, [loadSongConfig]);
  useEffect(() => {
    if (isAdmin) fetchPlayers().catch(() => {});
  }, [isAdmin, fetchPlayers]);

  if (!isAdmin) return null;

  // 通用操作包装
  const handleAction = async (fn, successMsg) => {
    setLoading(true); setMsg(null);
    try {
      await fn();
      setMsg({ type: 'success', text: successMsg });
      setTimeout(() => setMsg(null), 3000);
      store.fetchStatus();
      store.fetchPlayers();
    } catch (err) {
      setMsg({ type: 'error', text: err?.msg || err?.response?.data?.msg || '操作失败' });
    } finally { setLoading(false); }
  };

  const quickAction = (fn, label) => () => handleAction(fn, `${label} 完成`);

  const toggleSong = (setter, song) => {
    const id = getSongId(song);
    setter((current) => current.some(item => getSongId(item) === id)
      ? current.filter(item => getSongId(item) !== id)
      : [...current, song]);
  };

  const handleSaveStage1Pool = () => handleAction(
    async () => {
      await api.updateConfig({
        poolType: 'stage1',
        songPoolIds: stage1Songs.map(getSongId),
      });
      await loadSongConfig();
    },
    '阶段一图池已保存'
  );

  const handleSaveStage4Pool = () => handleAction(
    async () => {
      await api.updateConfig({
        poolType: 'stage4',
        songPoolIds: stage4Songs.map(getSongId),
        designatedSongId: getSongId(designatedSong),
      });
      await loadSongConfig();
    },
    '决赛图池与课题曲已保存'
  );

  // 初始化动作
  const handleInitFromQualifier = () =>
    handleAction(
      () => api.initStage1FromQualifier({ advanceCount }),
      `阶段一已从预选赛初始化，${advanceCount} 人晋级`
    );

  const handleInitRace = () => {
    handleAction(
      () => api.initRace({}),
      '跑图初始化完成，后端晋级选手已就位'
    );
  };

  const handleInitStage4 = () =>
    handleAction(
      () => api.initStage4({}),
      '决赛初始化完成！'
    );

  const handleAdvanceToStage3 = () =>
    handleAction(
      () => api.advanceToStage3({}),
      '已推进到阶段三'
    );

  const handleBackfillTokens = () =>
    handleAction(
      async () => {
        await api.backfillRegistrationTokens();
        await loadRegistrations();
      },
      '选手三位数代号已补齐'
    );

  const tabs = [
    { key: 'init', label: '初始化', icon: <FaPlay /> },
    { key: 'players', label: '选手', icon: <FaUsers /> },
    { key: 'songs', label: '图池', icon: <FaMusic /> },
    { key: 'undo', label: '撤销', icon: <FaUndo /> },
  ];

  const statusLabel = {
    pending: '未开始', stage1: '阶段一 · 12进6', stage2: '阶段二 · 6进4 跑图',
    stage3: '阶段三 · 4进2 跑图', stage4: '阶段四 · 决赛', finished: '已结束',
  }[status] || status;

  const statusColorClass = {
    pending: 'bg-zinc-800 text-zinc-400 border-white/10',
    stage1: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    stage2: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    stage3: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    stage4: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    finished: 'bg-green-500/20 text-green-400 border-green-500/30',
  }[status] || '';

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 overflow-hidden">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-zinc-900/80">
        <div className="flex items-center gap-2">
          <FaCog className="text-amber-400/70 text-sm" />
          <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'Torus, sans-serif' }}>管理员面板</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400/80 border border-amber-500/30">{user.role}</span>
        </div>
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${activeTab === tab.key ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* 状态条 */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-500">当前阶段：</span>
          <span className={`px-2 py-0.5 rounded-full font-medium border ${statusColorClass}`}>{statusLabel}</span>
        </div>

        {/* 消息 */}
        {msg && (
          <div className={`px-4 py-2.5 rounded-xl text-xs border ${msg.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            {msg.text}
            <button onClick={() => setMsg(null)} className="ml-2 opacity-50 hover:opacity-100"><FaTimes className="inline text-[10px]" /></button>
          </div>
        )}

        {/* ========== 选手 Tab ========== */}
        {activeTab === 'players' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs text-zinc-400 uppercase tracking-wider">报名选手档案（{registrations.length} 人）</h4>
              <div className="flex items-center gap-2">
                <ActionButton onClick={handleBackfillTokens} loading={loading} icon={<FaCheck />} label="补齐代号" variant="undo" />
                <button onClick={loadRegistrations} className="text-xs text-zinc-500 hover:text-white transition-colors">
                  <FaSpinner className={`inline mr-1 ${regLoading ? 'animate-spin' : ''}`} />刷新
                </button>
              </div>
            </div>
            {qualifierRankings && (
              <div className="flex items-center gap-4 text-xs text-zinc-500 mb-2">
                <span>晋级线: 前 {qualifierRankings.qualifiedCount} 名</span>
                <span>有成绩: {qualifierRankings.rankings?.filter(r => r.totalAchievement > 0).length || 0} 人</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-1">
              {registrations.map((reg, i) => (
                <RegistrationCard key={reg.userId} reg={reg} rank={i + 1} qualifiedUpTo={qualifierRankings?.qualifiedCount || 12} />
              ))}
              {registrations.length === 0 && !regLoading && (
                <div className="col-span-full text-center py-8 text-zinc-500 text-xs">暂无报名档案数据</div>
              )}
            </div>
          </div>
        )}

        {/* ========== 图池 Tab ========== */}
        {activeTab === 'songs' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-xs text-zinc-400 uppercase tracking-wider">阶段一图池</h4>
                <span className="text-xs text-zinc-500">{stage1Songs.length} 首</span>
              </div>
              <SongSearch onToggle={(song) => toggleSong(setStage1Songs, song)} selectedSongs={stage1Songs} />
              <ActionButton onClick={handleSaveStage1Pool} loading={loading} disabled={stage1Songs.length < 3}
                icon={<FaCheck />} label="保存阶段一图池" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-xs text-zinc-400 uppercase tracking-wider">决赛图池</h4>
                <span className="text-xs text-zinc-500">{stage4Songs.length} 首</span>
              </div>
              <SongSearch onToggle={(song) => toggleSong(setStage4Songs, song)} selectedSongs={stage4Songs} />
              <div className="pt-2 border-t border-white/10">
                <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-2">决赛课题曲</h4>
                <SongSearch
                  onToggle={(song) => setDesignatedSong(current => getSongId(current) === getSongId(song) ? null : song)}
                  selectedSongs={designatedSong ? [designatedSong] : []}
                  maxSelect={1}
                />
              </div>
              <ActionButton onClick={handleSaveStage4Pool} loading={loading}
                disabled={stage4Songs.length < 3 || !designatedSong || stage4Songs.some(song => getSongId(song) === getSongId(designatedSong))}
                icon={<FaCheck />} label="保存决赛配置" />
            </div>
          </div>
        )}

        {/* ========== 初始化 Tab ========== */}
        {activeTab === 'init' && (
          <div className="space-y-6">
            {/* 预选赛排名概览 */}
            {qualifierRankings && (status === 'pending' || status === 'stage1') && (
              <div className="rounded-xl border border-white/10 bg-zinc-800/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs text-zinc-400 uppercase tracking-wider">预选赛排名（前 {advanceCount} 名晋级）</h4>
                  <span className="text-[10px] text-zinc-500">MSC 2026 固定晋级 12 人</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[200px] overflow-y-auto">
                  {qualifierRankings.rankings?.slice(0, 12).map((r) => (
                    <div key={r.userId} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs
                      ${r.rank <= advanceCount ? 'bg-green-500/5 border border-green-500/10' : 'bg-zinc-800/50 border border-white/5'}`}>
                      <span className={`w-4 text-center font-mono font-bold ${r.rank <= advanceCount ? 'text-green-400' : 'text-zinc-600'}`}>{r.rank}</span>
                      <span className="truncate text-white">{r.username}</span>
                      <span className="text-zinc-600 text-[10px] ml-auto">{r.totalAchievement?.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 阶段一：从预选赛初始化 */}
            {status === 'pending' && (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">1</div>
                  <h4 className="text-sm font-semibold text-white" style={{ fontFamily: 'Torus, sans-serif' }}>阶段一 · 12进6</h4>
                </div>
                <p className="text-xs text-zinc-500">系统将自动从预选赛排名取前 {advanceCount} 名选手，随机分组并决定 P1/P2 及出场顺序。</p>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block mb-2">已保存比赛图池</span>
                  <p className="text-sm text-zinc-300">{savedSongConfig.stage1SongPool.length} 首曲目</p>
                </div>
                {qualifierRankings?.autoFilledCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                    <FaExclamationTriangle className="text-amber-400" />
                    有 {qualifierRankings.autoFilledCount} 人无预选赛成绩，将按报名时间自动补位
                  </div>
                )}
                <ActionButton onClick={handleInitFromQualifier} loading={loading} disabled={savedSongConfig.stage1SongPool.length < 3}
                  icon={<FaPlay />} label={savedSongConfig.stage1SongPool.length < 3 ? '请先保存阶段一图池' : `从预选赛初始化阶段一（前${advanceCount}人）`} />
              </div>
            )}

            {/* 阶段一：重置 */}
            {status === 'stage1' && (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">1</div>
                  <h4 className="text-sm font-semibold text-white" style={{ fontFamily: 'Torus, sans-serif' }}>阶段一 进行中</h4>
                </div>
                <p className="text-xs text-zinc-500">小组比赛进行中，以下为重置/回退操作（慎用）。</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <ActionButton onClick={quickAction(api.undoStage1LastSong, '撤销选曲')} loading={loading} icon={<FaUndo />} label="撤销选曲" variant="undo" />
                  <ActionButton onClick={quickAction(api.undoStage1LastScore, '撤销成绩')} loading={loading} icon={<FaUndo />} label="撤销成绩" variant="undo" />
                  <ActionButton onClick={quickAction(api.resetStage1, '重置阶段一')} loading={loading} icon={<FaTrash />} label="重置" variant="danger" />
                </div>
              </div>
            )}

            {/* 阶段二 */}
            {(status === 'stage1' || status === 'stage2') && (
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold">2</div>
                  <h4 className="text-sm font-semibold text-white" style={{ fontFamily: 'Torus, sans-serif' }}>阶段二 · 6进4 跑图</h4>
                </div>
                <p className="text-xs text-zinc-500">阶段一结束后，系统固定使用后端确认的 6 名晋级选手。</p>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block mb-2">后端晋级名单（{stage2Players.length}/6）</span>
                  <QualifiedPlayerList players={stage2Players} emptyText="等待阶段一产生晋级名单" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {status === 'stage2' && !store.summary?.stage2 && (
                    <ActionButton onClick={handleInitRace} loading={loading} disabled={stage2Players.length !== 6}
                      icon={<FaPlay />} label={stage2Players.length !== 6 ? `等待晋级名单 ${stage2Players.length}/6` : '初始化跑图'} />
                  )}
                  {status === 'stage2' && (
                    <>
                      <ActionButton onClick={handleAdvanceToStage3} loading={loading} disabled={!store.summary?.stage2?.terminated || stage3Players.length !== 4}
                        icon={<FaPlay />} label={store.summary?.stage2?.terminated ? '推进到阶段三' : '跑图结束后可推进'} />
                      <ActionButton onClick={quickAction(api.terminateRace, '终止跑图')} loading={loading} disabled={!store.summary?.stage2 || store.summary?.stage2?.terminated} icon={<FaTimes />} label="终止" variant="danger" />
                      <ActionButton onClick={quickAction(api.undoRaceLastAction, '撤销行动')} loading={loading} icon={<FaUndo />} label="撤销行动" variant="undo" />
                      <ActionButton onClick={quickAction(api.revertChallengeResult, '翻转判定')} loading={loading} icon={<FaUndo />} label="翻转判定" variant="undo" />
                      <ActionButton onClick={quickAction(api.resetRace, '重置跑图')} loading={loading} icon={<FaTrash />} label="重置" variant="danger" />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 阶段三 */}
            {status === 'stage3' && (
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold">3</div>
                  <h4 className="text-sm font-semibold text-white" style={{ fontFamily: 'Torus, sans-serif' }}>阶段三 · 4进2 跑图</h4>
                </div>
                <p className="text-xs text-zinc-500">系统固定使用阶段二排名产生的 4 名晋级选手。</p>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block mb-2">后端晋级名单（{stage3Players.length}/4）</span>
                  <QualifiedPlayerList players={stage3Players} emptyText="等待阶段二完成排名结算" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {!store.summary?.stage3 && (
                    <ActionButton onClick={handleInitRace} loading={loading} disabled={stage3Players.length !== 4}
                      icon={<FaPlay />} label={stage3Players.length !== 4 ? `等待晋级名单 ${stage3Players.length}/4` : '初始化跑图'} />
                  )}
                  <ActionButton onClick={quickAction(api.terminateRace, '终止跑图')} loading={loading} disabled={!store.summary?.stage3 || store.summary?.stage3?.terminated} icon={<FaTimes />} label="终止" variant="danger" />
                  <ActionButton onClick={quickAction(api.undoRaceLastAction, '撤销行动')} loading={loading} icon={<FaUndo />} label="撤销行动" variant="undo" />
                  <ActionButton onClick={quickAction(api.revertChallengeResult, '翻转判定')} loading={loading} icon={<FaUndo />} label="翻转判定" variant="undo" />
                  <ActionButton onClick={quickAction(api.resetRace, '重置跑图')} loading={loading} icon={<FaTrash />} label="重置" variant="danger" />
                </div>
              </div>
            )}

            {/* 阶段四 */}
            {(status === 'stage3' || status === 'stage4') && !(status === 'finished') && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold">4</div>
                  <h4 className="text-sm font-semibold text-white" style={{ fontFamily: 'Torus, sans-serif' }}>阶段四 · 决赛</h4>
                </div>
                <p className="text-xs text-zinc-500">阶段三结束后自动锁定 2 名决赛选手，只需确认图池与课题曲。</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block mb-2">决赛选手（{stage4Players.length}/2）</span>
                    <QualifiedPlayerList players={stage4Players} emptyText="等待阶段三完成排名结算" />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block mb-2">已保存决赛配置</span>
                    <p className="text-sm text-zinc-300">图池 {savedSongConfig.stage4SongPool.length} 首</p>
                    <p className="text-xs text-zinc-500 mt-1">课题曲：{savedSongConfig.designatedSong?.title || '未设置'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {status === 'stage3' && (
                    <ActionButton onClick={handleInitStage4} loading={loading}
                      disabled={stage4Players.length !== 2 || !store.summary?.stage3?.terminated || savedSongConfig.stage4SongPool.length < 3 || !savedSongConfig.designatedSong}
                      icon={<FaPlay />} label={stage4Players.length !== 2 ? `等待决赛名单 ${stage4Players.length}/2` : '初始化决赛'} />
                  )}
                  {status === 'stage4' && (
                    <>
                      <ActionButton onClick={quickAction(api.undoStage4LastSong, '撤销选曲')} loading={loading} icon={<FaUndo />} label="撤销选曲" variant="undo" />
                      <ActionButton onClick={quickAction(api.undoStage4LastScore, '撤销成绩')} loading={loading} icon={<FaUndo />} label="撤销成绩" variant="undo" />
                      <ActionButton onClick={quickAction(api.resetStage4, '重置决赛')} loading={loading} icon={<FaTrash />} label="重置" variant="danger" />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 结束 */}
            {status === 'finished' && (
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-6 text-center">
                <FaTrophy className="text-2xl text-green-400 mx-auto mb-2" />
                <p className="text-sm text-green-300 font-medium">所有阶段已完成</p>
                <p className="text-xs text-zinc-500 mt-1">MSC 2026 赛事已结束</p>
              </div>
            )}
          </div>
        )}

        {/* ========== 撤销 Tab ========== */}
        {activeTab === 'undo' && (
          <div className="space-y-6">
            {/* 全局操作 */}
            <div className="rounded-xl border border-white/10 bg-zinc-800/40 p-4 space-y-3">
              <h4 className="text-xs text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <FaExclamationTriangle className="text-red-400" /> 全局操作（不可逆）
              </h4>
              <div className="flex items-center gap-2 flex-wrap">
                <ActionButton onClick={quickAction(api.revertStage, '回退阶段')} loading={loading} icon={<FaUndo />} label="回退到上一阶段" variant="danger" />
                <ActionButton onClick={quickAction(api.resetAll, '完全重置')} loading={loading} icon={<FaTrash />} label="完全重置赛事" variant="danger" />
              </div>
            </div>

            {/* 阶段一撤销 */}
            {status === 'stage1' && (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
                <h4 className="text-xs text-blue-400 uppercase tracking-wider">阶段一 回退操作</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <ActionButton onClick={quickAction(api.undoStage1LastSong, '撤销选曲')} loading={loading} icon={<FaUndo />} label="撤销最后选曲" variant="undo" />
                  <ActionButton onClick={quickAction(api.undoStage1LastScore, '撤销成绩')} loading={loading} icon={<FaUndo />} label="撤销最后成绩" variant="undo" />
                  <ActionButton onClick={quickAction(api.resetStage1, '重置')} loading={loading} icon={<FaTrash />} label="重置阶段一" variant="danger" />
                </div>
              </div>
            )}

            {/* 跑图撤销 */}
            {(status === 'stage2' || status === 'stage3') && (
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-2">
                <h4 className="text-xs text-purple-400 uppercase tracking-wider">跑图 回退操作</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <ActionButton onClick={quickAction(api.undoRaceLastAction, '撤销行动')} loading={loading} icon={<FaUndo />} label="撤销最后行动" variant="undo" />
                  <ActionButton onClick={quickAction(api.revertChallengeResult, '翻转判定')} loading={loading} icon={<FaUndo />} label="翻转挑战判定" variant="undo" />
                  <ActionButton onClick={quickAction(api.resetRace, '重置')} loading={loading} icon={<FaTrash />} label="重置跑图" variant="danger" />
                </div>
              </div>
            )}

            {/* 决赛撤销 */}
            {status === 'stage4' && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                <h4 className="text-xs text-amber-400 uppercase tracking-wider">决赛 回退操作</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <ActionButton onClick={quickAction(api.undoStage4LastSong, '撤销选曲')} loading={loading} icon={<FaUndo />} label="撤销最后选曲" variant="undo" />
                  <ActionButton onClick={quickAction(api.undoStage4LastScore, '撤销成绩')} loading={loading} icon={<FaUndo />} label="撤销最后成绩" variant="undo" />
                  <ActionButton onClick={quickAction(api.resetStage4, '重置')} loading={loading} icon={<FaTrash />} label="重置决赛" variant="danger" />
                </div>
              </div>
            )}

            {status === 'pending' && (
              <p className="text-xs text-zinc-500 text-center py-8">赛事尚未开始，无需撤销操作</p>
            )}
            {status === 'finished' && (
              <p className="text-xs text-zinc-500 text-center py-8">赛事已结束。如需撤销，请使用全局回退。</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
