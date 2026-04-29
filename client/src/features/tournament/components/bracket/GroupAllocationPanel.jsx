// ============================================================
// GroupAllocationPanel.jsx — 分组拖选面板
// P3 组件 | 依据：spec §十四 Q3 + API Contract §四 P3
// HTML5 Draggable + 自动种子分配 + 待分配池
// ============================================================
import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaUsers, FaPlus, FaTrash, FaSeedling, FaSave,
  FaSpinner, FaGripVertical, FaArrowRight, FaTimes
} from 'react-icons/fa';

const GroupAllocationPanel = ({
  players = [],           // [{ userId, username, avatarUrl, seeding }] — 预选晋级选手
  initialGroups = [],     // [{ name, players: [userId] }]
  onSave,                 // (groups) => Promise<void>
  isManager = false,
}) => {
  const [groups, setGroups] = useState(() => {
    if (initialGroups.length > 0) return initialGroups;
    return []; // 未初始化
  });
  const [unassignedIds, setUnassignedIds] = useState(() => {
    const assigned = new Set(initialGroups.flatMap(g => g.players || []));
    return players.filter(p => !assigned.has(p.userId || p._id)).map(p => p.userId || p._id);
  });
  const [saving, setSaving] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [dragOverGroup, setDragOverGroup] = useState(null);
  const dragRef = useRef(null);

  // ---- Drag & Drop ----
  const handleDragStart = useCallback((e, userId) => {
    dragRef.current = userId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', userId);
    // 拖拽时添加视觉反馈
    e.currentTarget.classList.add('opacity-40');
  }, []);

  const handleDragEnd = useCallback((e) => {
    e.currentTarget.classList.remove('opacity-40');
    dragRef.current = null;
    setDragOverGroup(null);
  }, []);

  const handleDropOnGroup = useCallback((groupIdx) => {
    const userId = dragRef.current;
    if (!userId) return;

    setUnassignedIds(prev => prev.filter(id => id !== userId));

    setGroups(prev => {
      const newGroups = prev.map((g, i) => {
        if (i === groupIdx) {
          // 防重复
          if (g.players?.includes(userId)) return g;
          return { ...g, players: [...(g.players || []), userId] };
        }
        return g;
      });
      return newGroups;
    });

    setDragOverGroup(null);
  }, []);

  const handleDropOnUnassigned = useCallback(() => {
    const userId = dragRef.current;
    if (!userId) return;

    setGroups(prev => prev.map(g => ({
      ...g,
      players: (g.players || []).filter(id => id !== userId),
    })));

    setUnassignedIds(prev => {
      if (prev.includes(userId)) return prev;
      return [...prev, userId];
    });

    setDragOverGroup(null);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // ---- Auto-seeding ----
  const handleAutoSeed = useCallback(() => {
    // 按 pre-existing seeding 或默认顺序分配到各组
    const qualified = players
      .filter(p => !unassignedIds.includes(p.userId || p._id))
      .sort((a, b) => (a.seeding ?? 999) - (b.seeding ?? 999));

    if (groups.length === 0) return;

    const newGroups = groups.map(g => ({ ...g, players: [] }));
    // Snake 分布：按种子轮流分配
    qualified.forEach((p, idx) => {
      const gIdx = idx % newGroups.length;
      newGroups[gIdx] = {
        ...newGroups[gIdx],
        players: [...(newGroups[gIdx].players || []), p.userId || p._id],
      };
    });

    setGroups(newGroups);
    setUnassignedIds([]);
  }, [players, groups, unassignedIds]);

  // ---- CRUD ----
  const addGroup = useCallback(() => {
    if (!newGroupName.trim()) return;
    setGroups(prev => [...prev, { name: newGroupName.trim(), players: [] }]);
    setNewGroupName('');
  }, [newGroupName]);

  const removeGroup = useCallback((idx) => {
    setGroups(prev => {
      const removed = prev[idx];
      if (removed.players?.length > 0) {
        setUnassignedIds(u => [...u, ...removed.players]);
      }
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const removeFromGroup = useCallback((groupIdx, userId) => {
    setGroups(prev => prev.map((g, i) =>
      i === groupIdx
        ? { ...g, players: (g.players || []).filter(id => id !== userId) }
        : g
    ));
    setUnassignedIds(prev => prev.includes(userId) ? prev : [...prev, userId]);
  }, []);

  // ---- Save ----
  const handleSaveGrouping = useCallback(async () => {
    setSaving(true);
    try {
      await onSave?.(groups);
    } catch (err) {
      console.error('分组保存失败', err);
    } finally {
      setSaving(false);
    }
  }, [groups, onSave]);

  const getUser = (userId) => players.find(p => (p.userId || p._id) === userId);

  const totalPlayers = players.length;
  const assignedCount = groups.reduce((s, g) => s + (g.players?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* 统计栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <FaUsers className="text-purple-400" />
          <span>共 {totalPlayers} 位选手 · 已分配 {assignedCount} 人 · {groups.length} 组</span>
        </div>
        {isManager && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoSeed}
              disabled={groups.length === 0}
              className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 border border-purple-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40"
            >
              <FaSeedling /> 自动分配
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
        {/* ——— 待分配池 ——— */}
        <div
          className="bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl p-4 min-h-[200px]"
          onDragOver={handleDragOver}
          onDrop={handleDropOnUnassigned}
        >
          <h4 className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-3">
            待分配 ({unassignedIds.length})
          </h4>
          <div className="space-y-1.5">
            <AnimatePresence>
              {unassignedIds.length === 0 ? (
                <p className="text-zinc-700 text-xs text-center py-6">全部已分配</p>
              ) : (
                unassignedIds.map((uid) => {
                  const user = getUser(uid);
                  return (
                    <motion.div
                      key={uid}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      draggable={isManager}
                      onDragStart={(e) => handleDragStart(e, uid)}
                      onDragEnd={handleDragEnd}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] cursor-grab active:cursor-grabbing"
                    >
                      <FaGripVertical className="text-zinc-700 text-[10px] flex-shrink-0" />
                      <img
                        src={user?.avatarUrl || '/assets/logos.png'}
                        alt=""
                        className="w-6 h-6 rounded-full object-cover bg-black border border-white/10"
                      />
                      <span className="text-xs text-zinc-300 flex-1 truncate">{user?.username || uid}</span>
                      {user?.seeding && (
                        <span className="text-[10px] text-purple-400 font-bold">#{user.seeding}</span>
                      )}
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ——— 分组区域 ——— */}
        <div className="space-y-4">
          {isManager && (
            <div className="flex items-center gap-2">
              <input
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addGroup()}
                placeholder="新分组名称"
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-purple-500/50"
              />
              <button
                onClick={addGroup}
                disabled={!newGroupName.trim()}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40"
              >
                <FaPlus /> 添加
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {groups.length === 0 ? (
                <p className="text-zinc-600 text-xs col-span-2 text-center py-8">
                  暂无分组，请添加分组后再分配选手
                </p>
              ) : (
                groups.map((group, gIdx) => (
                  <motion.div
                    key={gIdx}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`bg-white/[0.02] border rounded-2xl p-4 transition-all ${
                      dragOverGroup === gIdx
                        ? 'border-purple-500/40 bg-purple-500/5'
                        : 'border-white/[0.06]'
                    }`}
                    onDragOver={handleDragOver}
                    onDragEnter={() => setDragOverGroup(gIdx)}
                    onDragLeave={() => setDragOverGroup(null)}
                    onDrop={() => handleDropOnGroup(gIdx)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-white">{group.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500">{group.players?.length || 0} 人</span>
                        {isManager && (
                          <button
                            onClick={() => removeGroup(gIdx)}
                            className="text-red-400/60 hover:text-red-400 transition-colors"
                          >
                            <FaTrash size={10} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 min-h-[60px]">
                      <AnimatePresence>
                        {(group.players || []).length === 0 ? (
                          <p className="text-zinc-700 text-[11px] text-center py-3">拖拽选手到此处</p>
                        ) : (
                          (group.players || []).map((uid) => {
                            const user = getUser(uid);
                            return (
                              <motion.div
                                key={uid}
                                layout
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                draggable={isManager}
                                onDragStart={(e) => handleDragStart(e, uid)}
                                onDragEnd={handleDragEnd}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.05] cursor-grab active:cursor-grabbing group"
                              >
                                <FaGripVertical className="text-zinc-700 text-[8px] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <img
                                  src={user?.avatarUrl || '/assets/logos.png'}
                                  alt=""
                                  className="w-5 h-5 rounded-full object-cover bg-black border border-white/10"
                                />
                                <span className="text-[11px] text-zinc-300 flex-1 truncate">{user?.username || uid}</span>
                                {isManager && (
                                  <button
                                    onClick={() => removeFromGroup(gIdx, uid)}
                                    className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <FaTimes size={8} />
                                  </button>
                                )}
                              </motion.div>
                            );
                          })
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {isManager && groups.length > 0 && (
            <button
              onClick={handleSaveGrouping}
              disabled={saving}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
              {saving ? '保存中...' : '保存分组'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupAllocationPanel;
