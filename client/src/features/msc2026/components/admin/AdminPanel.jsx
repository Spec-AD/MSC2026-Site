// ============================================================
// AdminPanel.jsx — MSC2026 管理员面板
// 权限：ADM | TO | CHM
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { useMSC2026Store } from '../../store';
import * as api from '../../api/msc2026Api';
import { FaCog, FaPlay, FaUsers, FaMusic, FaCheck, FaSpinner, FaTimes } from 'react-icons/fa';

const ADMIN_ROLES = ['ADM', 'TO', 'CHM'];

/** 曲目搜索组件 */
function SongSearch({ onSelect, selectedIds, maxSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await api.searchSongs(q, 30);
      setResults(res.data.data || []);
    } catch (err) {
      console.error('曲目搜索失败', err);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => handleSearch(query), 400);
    return () => clearTimeout(t);
  }, [query, handleSearch]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <FaMusic className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs" />
        <input
          type="text"
          placeholder="搜索曲目（标题/别名）..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-zinc-800 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white placeholder-zinc-600 focus:border-amber-500/40 focus:outline-none transition-all"
        />
        {searching && <FaSpinner className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs animate-spin" />}
      </div>
      {results.length > 0 && (
        <div className="max-h-48 overflow-y-auto border border-white/10 rounded-xl bg-zinc-800/80 divide-y divide-white/5">
          {results.map((song) => {
            const id = song._id || song.songId;
            const selected = selectedIds.includes(id);
            const atLimit = maxSelect != null && selectedIds.length >= maxSelect && !selected;
            return (
              <button
                key={id}
                onClick={() => !atLimit && onSelect(id)}
                disabled={atLimit}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-all
                  ${selected ? 'bg-amber-500/10' : 'hover:bg-zinc-700/50'}
                  ${atLimit ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {song.coverUrl ? (
                  <img src={song.coverUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded bg-zinc-700 flex items-center justify-center flex-shrink-0">
                    <FaMusic className="text-zinc-500 text-[10px]" />
                  </div>
                )}
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
          {selectedIds.map((id, i) => (
            <span
              key={id}
              className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 cursor-pointer hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all"
              onClick={() => onSelect(id)}
            >
              #{i + 1} ✕
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** 选手多选组件 */
function PlayerSelector({ onToggle, selectedIds, maxSelect }) {
  const { players } = useMSC2026Store();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          已选 {selectedIds.length}{maxSelect != null ? ` / ${maxSelect}` : ''} 人
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
        {players.map((p) => {
          const selected = selectedIds.includes(p.userId);
          const atLimit = maxSelect != null && selectedIds.length >= maxSelect && !selected;
          return (
            <button
              key={p.userId}
              onClick={() => !atLimit && onToggle(p.userId)}
              disabled={atLimit}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-all
                ${selected
                  ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300'
                  : 'bg-zinc-800/50 border border-white/5 text-zinc-400 hover:border-white/10'}
                ${atLimit ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {p.avatarUrl ? (
                <img src={p.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                  <FaUsers className="text-zinc-600 text-[8px]" />
                </div>
              )}
              <span className="truncate">{p.username}</span>
              {selected && <FaCheck className="text-amber-400 text-[10px] ml-auto flex-shrink-0" />}
            </button>
          );
        })}
        {players.length === 0 && (
          <p className="col-span-full text-center py-4 text-xs text-zinc-600">
            暂无选手数据，请先在配置中录入选手
          </p>
        )}
      </div>
    </div>
  );
}

/** 操作按钮 */
function ActionButton({ onClick, loading, disabled, icon, label, variant = 'primary' }) {
  const styles = {
    primary: 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30',
    danger: 'bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30',
    default: 'bg-zinc-800 text-zinc-400 border-white/10 hover:bg-zinc-700',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all
        ${styles[variant]}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? <FaSpinner className="animate-spin text-xs" /> : icon}
      {label}
    </button>
  );
}

// ==================== 主面板 ====================

export default function AdminPanel() {
  const { user } = useAuth();
  const store = useMSC2026Store();

  const [activeTab, setActiveTab] = useState('init');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  // --- 状态 ---
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [designatedSongId, setDesignatedSongId] = useState(null);

  // 权限
  const isAdmin = user && ADMIN_ROLES.includes(user.role);
  if (!isAdmin) return null;

  const status = store.status;
  const isPending = status === 'pending';
  const isStage1 = status === 'stage1';
  const isStage2 = status === 'stage2';
  const isStage3 = status === 'stage3';
  const isStage4 = status === 'stage4';
  const isFinished = status === 'finished';

  // 加载选手
  useEffect(() => {
    store.fetchPlayers().catch(() => {});
  }, []);

  const handleAction = async (fn, successMsg) => {
    setLoading(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ type: 'success', text: successMsg });
      store.fetchStatus();
      store.fetchPlayers();
    } catch (err) {
      setMsg({ type: 'error', text: err?.msg || err?.response?.data?.msg || '操作失败' });
    } finally {
      setLoading(false);
    }
  };

  // --- 初始化动作 ---

  const handleInitStage1 = () => {
    if (selectedPlayers.length !== 12) return;
    handleAction(
      () => api.initStage1({ songPoolIds: selectedSongs, playerIds: selectedPlayers }),
      '阶段一初始化完成！12 人已随机分组'
    );
  };

  const handleInitRace = () => {
    const count = isStage2 ? 6 : 4;
    if (selectedPlayers.length !== count) return;
    handleAction(
      () => api.initRace({ playerIds: selectedPlayers }),
      `跑图初始化完成！${count} 名选手已就位`
    );
  };

  const handleInitStage4 = () => {
    if (selectedPlayers.length !== 2) return;
    handleAction(
      () => api.initStage4({ songPoolIds: selectedSongs, designatedSongId, playerIds: selectedPlayers }),
      '决赛初始化完成！'
    );
  };

  const handleConfigPlayers = () => {
    handleAction(
      () => api.updateConfig({ poolType: 'players', playerIds: selectedPlayers }),
      `已登记 ${selectedPlayers.length} 名参赛选手`
    );
  };

  const handleAdvanceToStage3 = () => {
    handleAction(
      () => api.advanceToStage3({ qualifiedIds: selectedPlayers }),
      '已推进到阶段三'
    );
  };

  const handleTerminate = () => {
    handleAction(
      () => api.terminateRace(),
      '跑图已终止'
    );
  };

  const tabs = [
    { key: 'init', label: '初始化', icon: <FaPlay /> },
    { key: 'players', label: '选手', icon: <FaUsers /> },
    { key: 'songs', label: '图池', icon: <FaMusic /> },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 overflow-hidden">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-zinc-900/80">
        <div className="flex items-center gap-2">
          <FaCog className="text-amber-400/70 text-sm" />
          <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'Torus, sans-serif' }}>
            管理员面板
          </h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400/80 border border-amber-500/30">
            {user.role}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${activeTab === tab.key
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容 */}
      <div className="p-5 space-y-4">
        {/* 当前阶段指示 */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-500">当前阶段：</span>
          <span className={`px-2 py-0.5 rounded-full font-medium border
            ${isPending ? 'bg-zinc-800 text-zinc-400 border-white/10' : ''}
            ${isStage1 ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : ''}
            ${isStage2 ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : ''}
            ${isStage3 ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : ''}
            ${isStage4 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : ''}
            ${isFinished ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}
          `}>
            {status === 'pending' ? '未开始' :
             status === 'stage1' ? '阶段一 · 12进6' :
             status === 'stage2' ? '阶段二 · 6进4 跑图' :
             status === 'stage3' ? '阶段三 · 4进2 跑图' :
             status === 'stage4' ? '阶段四 · 决赛' :
             status === 'finished' ? '已结束' : status}
          </span>
        </div>

        {/* 消息 */}
        {msg && (
          <div className={`px-4 py-2.5 rounded-xl text-xs border
            ${msg.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : ''}
            ${msg.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : ''}
          `}>
            {msg.text}
            <button onClick={() => setMsg(null)} className="ml-2 text-current opacity-50 hover:opacity-100">
              <FaTimes className="inline text-[10px]" />
            </button>
          </div>
        )}

        {/* === 选手登记 Tab === */}
        {activeTab === 'players' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">登记参赛选手</h4>
              <PlayerSelector
                onToggle={(id) => setSelectedPlayers((prev) =>
                  prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
                )}
                selectedIds={selectedPlayers}
              />
            </div>
            {selectedPlayers.length > 0 && (
              <ActionButton
                onClick={handleConfigPlayers}
                loading={loading}
                icon={<FaCheck />}
                label={`登记 ${selectedPlayers.length} 名选手`}
              />
            )}
          </div>
        )}

        {/* === 图池 Tab === */}
        {activeTab === 'songs' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">阶段一/决赛 图池</h4>
              <SongSearch
                onSelect={(id) => setSelectedSongs((prev) =>
                  prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
                )}
                selectedIds={selectedSongs}
              />
            </div>
            <div>
              <h4 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">决赛课题曲（可选）</h4>
              <SongSearch
                onSelect={(id) => setDesignatedSongId(id === designatedSongId ? null : id)}
                selectedIds={designatedSongId ? [designatedSongId] : []}
                maxSelect={1}
              />
            </div>
          </div>
        )}

        {/* === 初始化 Tab === */}
        {activeTab === 'init' && (
          <div className="space-y-6">
            {/* 阶段一 初始化 */}
            {(isPending || isStage1) && (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">1</div>
                  <h4 className="text-sm font-semibold text-white" style={{ fontFamily: 'Torus, sans-serif' }}>阶段一 · 12进6</h4>
                </div>
                <p className="text-xs text-zinc-500">选择 12 名选手和比赛图池，系统将自动随机分组并决定 P1/P2 及出场顺序。</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block mb-2">选手选择（12人）</span>
                    <PlayerSelector
                      onToggle={(id) => setSelectedPlayers((prev) =>
                        prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
                      )}
                      selectedIds={selectedPlayers}
                      maxSelect={12}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block mb-2">比赛图池</span>
                    <SongSearch
                      onSelect={(id) => setSelectedSongs((prev) =>
                        prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
                      )}
                      selectedIds={selectedSongs}
                    />
                  </div>
                </div>
                <ActionButton
                  onClick={handleInitStage1}
                  loading={loading}
                  disabled={selectedPlayers.length !== 12 || selectedSongs.length === 0}
                  icon={<FaPlay />}
                  label={selectedPlayers.length !== 12
                    ? `选手 ${selectedPlayers.length}/12`
                    : selectedSongs.length === 0
                      ? '请选择图池'
                      : isStage1 ? '重新初始化阶段一' : '初始化阶段一'}
                  variant={isStage1 ? 'danger' : 'primary'}
                />
              </div>
            )}

            {/* 阶段二 初始化 */}
            {(isStage1 || isStage2) && (
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold">2</div>
                  <h4 className="text-sm font-semibold text-white" style={{ fontFamily: 'Torus, sans-serif' }}>阶段二 · 6进4 跑图</h4>
                </div>
                <p className="text-xs text-zinc-500">选择阶段一晋级的 6 名选手，初始化正六边形跑图地图。</p>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block mb-2">晋级选手（6人）</span>
                  <PlayerSelector
                    onToggle={(id) => setSelectedPlayers((prev) =>
                      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
                    )}
                    selectedIds={selectedPlayers}
                    maxSelect={6}
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <ActionButton
                    onClick={handleInitRace}
                    loading={loading}
                    disabled={selectedPlayers.length !== 6}
                    icon={<FaPlay />}
                    label={selectedPlayers.length !== 6 ? `选手 ${selectedPlayers.length}/6` : isStage2 ? '重新初始化跑图' : '初始化阶段二 跑图'}
                    variant={isStage2 ? 'danger' : 'primary'}
                  />
                  {isStage2 && (
                    <ActionButton
                      onClick={handleAdvanceToStage3}
                      loading={loading}
                      disabled={selectedPlayers.length !== 4}
                      icon={<FaPlay />}
                      label={selectedPlayers.length !== 4 ? '选择4名晋级选手' : '推进到阶段三'}
                    />
                  )}
                  {isStage2 && (
                    <ActionButton
                      onClick={handleTerminate}
                      loading={loading}
                      icon={<FaTimes />}
                      label="终止跑图"
                      variant="danger"
                    />
                  )}
                </div>
              </div>
            )}

            {/* 阶段三 过渡 */}
            {isStage3 && (
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold">3</div>
                  <h4 className="text-sm font-semibold text-white" style={{ fontFamily: 'Torus, sans-serif' }}>阶段三 · 4进2 跑图</h4>
                </div>
                <p className="text-xs text-zinc-500">选择阶段二晋级的 4 名选手，初始化正四边形跑图地图。</p>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block mb-2">晋级选手（4人）</span>
                  <PlayerSelector
                    onToggle={(id) => setSelectedPlayers((prev) =>
                      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
                    )}
                    selectedIds={selectedPlayers}
                    maxSelect={4}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <ActionButton
                    onClick={handleInitRace}
                    loading={loading}
                    disabled={selectedPlayers.length !== 4}
                    icon={<FaPlay />}
                    label={selectedPlayers.length !== 4 ? `选手 ${selectedPlayers.length}/4` : '初始化阶段三 跑图'}
                  />
                  <ActionButton
                    onClick={handleTerminate}
                    loading={loading}
                    icon={<FaTimes />}
                    label="终止跑图"
                    variant="danger"
                  />
                </div>
              </div>
            )}

            {/* 阶段四 初始化 */}
            {(isStage3 || isStage4) && !isFinished && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold">4</div>
                  <h4 className="text-sm font-semibold text-white" style={{ fontFamily: 'Torus, sans-serif' }}>阶段四 · 决赛</h4>
                </div>
                <p className="text-xs text-zinc-500">选择 2 名决赛选手、决赛图池及课题曲。</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block mb-2">决赛选手（2人）</span>
                    <PlayerSelector
                      onToggle={(id) => setSelectedPlayers((prev) =>
                        prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
                      )}
                      selectedIds={selectedPlayers}
                      maxSelect={2}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block mb-2">决赛图池 + 课题曲</span>
                    <SongSearch
                      onSelect={(id) => setSelectedSongs((prev) =>
                        prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
                      )}
                      selectedIds={selectedSongs}
                    />
                    <div className="mt-2">
                      <span className="text-[10px] text-zinc-600">课题曲（可选1首）</span>
                      <SongSearch
                        onSelect={(id) => setDesignatedSongId(id === designatedSongId ? null : id)}
                        selectedIds={designatedSongId ? [designatedSongId] : []}
                        maxSelect={1}
                      />
                    </div>
                  </div>
                </div>
                <ActionButton
                  onClick={handleInitStage4}
                  loading={loading}
                  disabled={selectedPlayers.length !== 2 || selectedSongs.length === 0}
                  icon={<FaPlay />}
                  label={!isStage4 ? '初始化决赛'
                    : selectedPlayers.length !== 2 ? `选手 ${selectedPlayers.length}/2`
                    : '初始化决赛'}
                />
              </div>
            )}

            {/* 完成状态 */}
            {isFinished && (
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-6 text-center">
                <FaCheck className="text-2xl text-green-400 mx-auto mb-2" />
                <p className="text-sm text-green-300 font-medium">所有阶段已完成 🏆</p>
                <p className="text-xs text-zinc-500 mt-1">MSC 2026 赛事已结束</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
