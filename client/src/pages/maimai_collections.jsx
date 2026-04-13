import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaSpinner, FaBoxOpen, FaUserCircle, FaImage, FaIdCard, FaTimes, FaArrowUp, FaLock, FaCheckCircle, FaStar } from 'react-icons/fa';
import axios from 'axios';

// ==========================================
// 🌟 落雪查分器收藏品 API 基础配置
// ==========================================
const LXNS_BASE = 'https://assets2.lxns.net/maimai';
const LXNS_API  = 'https://maimai.lxns.net/api/v0/maimai';

// 稀有度颜色映射（TrophyColor）
// 注意：API 返回的 color 字段为首字母大写（Normal/Bronze/Silver/Gold/Rainbow），
// 统一在使用时转为小写后查表。
const TROPHY_COLOR_MAP = {
  normal:  { label: '普通', bg: 'bg-zinc-600/30', border: 'border-zinc-500/30', text: 'text-zinc-300', dot: 'bg-zinc-400' },
  bronze:  { label: '铜',   bg: 'bg-orange-900/30', border: 'border-orange-600/40', text: 'text-orange-300', dot: 'bg-orange-500' },
  silver:  { label: '银',   bg: 'bg-zinc-300/10', border: 'border-zinc-300/30', text: 'text-zinc-200', dot: 'bg-zinc-300' },
  gold:    { label: '金',   bg: 'bg-amber-900/30', border: 'border-amber-500/40', text: 'text-amber-300', dot: 'bg-amber-400' },
  rainbow: { label: '虹',   bg: 'bg-indigo-900/20', border: 'border-indigo-400/40', text: 'text-transparent', dot: 'bg-gradient-to-r from-pink-400 to-cyan-400', rainbow: true },
};

// 统一将 API 返回的 color 字段标准化为小写
const normColor = (c) => (c || 'normal').toLowerCase();

// 收藏品分类配置
const COLLECTION_TYPES = [
  { id: 'trophy', label: '称号',   icon: FaUserCircle,  key: 'trophies',  hasImage: false },
  { id: 'icon',   label: '头像',   icon: FaUserCircle,  key: 'icons',     hasImage: true  },
  { id: 'plate',  label: '姓名框', icon: FaIdCard,      key: 'plates',    hasImage: true  },
  { id: 'frame',  label: '背景',   icon: FaImage,       key: 'frames',    hasImage: true  },
];

// 用于缓存已拉取的数据，避免重复请求
const collectionCache = {};

// ==========================================
// 🖼️ 带懒加载的图片组件
// ==========================================
const LazyImage = ({ src, alt, className, fallback = null }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [src]);

  if (error || !src) return fallback;

  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/5 animate-pulse rounded" />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading="lazy"
        className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
};

// ==========================================
// 🏆 称号卡片
// ==========================================
const TrophyCard = ({ item, owned = false, equipped = false, onDetail }) => {
  const colorKey = normColor(item.color);
  const style = TROPHY_COLOR_MAP[colorKey] || TROPHY_COLOR_MAP.normal;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onDetail && onDetail(item)}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer
        ${ equipped
            ? 'border-cyan-400/60 bg-cyan-500/10 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
            : owned
            ? `${style.bg} ${style.border} brightness-110 ring-1 ring-white/10`
            : `${style.bg} ${style.border} opacity-50 grayscale-[30%]`
        } hover:brightness-125`}
    >
      <div className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
      <div className="flex-1 min-w-0">
        <div
          className={`text-sm font-bold truncate ${style.rainbow
            ? 'bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent'
            : style.text
          }`}
          style={{ fontFamily: "'Quicksand', sans-serif" }}
        >
          {item.name}
        </div>
        {item.description && (
          <div className="text-[10px] text-zinc-600 truncate mt-0.5">{item.description}</div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {equipped && <FaStar className="text-cyan-400 text-[10px]" title="当前装备" />}
        {owned && !equipped && <FaCheckCircle className="text-emerald-400 text-[10px]" title="已拥有" />}
        <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${style.border} ${style.rainbow ? 'text-purple-300' : style.text}`}>
          {style.label}
        </div>
      </div>
    </motion.div>
  );
};

// ==========================================
// 🖼️ 图片类收藏品卡片（头像/姓名框/背景）
// ==========================================
const ImageCard = ({ item, type, owned = false, equipped = false }) => {
  const getUrl = () => {
    if (type === 'icon')  return `${LXNS_BASE}/icon/${item.id}.png`;
    if (type === 'plate') return `${LXNS_BASE}/plate/${item.id}.png`;
    if (type === 'frame') return `${LXNS_BASE}/frame/${item.id}.png`;
    return null;
  };

  const url = getUrl();
  const isFrame  = type === 'frame';
  const isPlate  = type === 'plate';
  const isIcon   = type === 'icon';

  // TODO 7: frame 改为横板展示（宽高比 16:5 横条形，与游戏内实际比例接近）
  const frameAspect = 'aspect-[16/5]';

  const ownedBorder = equipped
    ? 'border-cyan-400/70 shadow-[0_0_12px_rgba(34,211,238,0.3)] ring-1 ring-cyan-400/40'
    : owned
    ? 'border-emerald-500/40 ring-1 ring-emerald-500/20'
    : 'border-white/[0.05] opacity-60 grayscale-[20%]';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`group relative bg-[#15151e] border rounded-2xl overflow-hidden transition-all hover:brightness-110 ${ownedBorder}`}
    >
      {/* 已装备/已拥有角标 */}
      {(equipped || owned) && (
        <div className={`absolute top-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
          equipped ? 'bg-cyan-500/30 text-cyan-300' : 'bg-emerald-500/20 text-emerald-400'
        }`}>
          {equipped ? <><FaStar className="text-[8px]" /> 已装备</> : <><FaCheckCircle className="text-[8px]" /> 已拥有</>}
        </div>
      )}

      {/* 图片预览区 */}
      <div className={`relative overflow-hidden bg-[#0c0c11] flex items-center justify-center ${
        isIcon  ? 'aspect-square p-4' :
        isPlate ? 'aspect-[4/1] p-3' :
        isFrame ? `${frameAspect} p-0` : 'aspect-square'
      }`}>
        {url ? (
          <LazyImage
            src={url}
            alt={item.name}
            className={`object-contain ${
              isIcon  ? 'w-full h-full rounded-xl' :
              isPlate ? 'w-full h-auto'             :
              isFrame ? 'w-full h-auto'              : 'w-full h-auto'
            }`}
            fallback={
              <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">无预览</div>
            }
          />
        ) : (
          <div className="text-zinc-700 text-xs">无预览</div>
        )}
      </div>
      {/* 信息区 */}
      <div className="px-3 py-2.5">
        <div className="text-xs font-bold text-zinc-300 truncate" style={{ fontFamily: "'Quicksand', sans-serif" }}>
          {item.name}
        </div>
        {item.genre && (
          <div className="text-[10px] text-zinc-600 truncate mt-0.5">{item.genre}</div>
        )}
        <div className="text-[9px] text-zinc-700 mt-1 font-mono">ID: {item.id}</div>
      </div>
    </motion.div>
  );
};

// ==========================================
// 📊 分类统计进度条
// ==========================================
const SectionHeader = ({ label, count, color }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className={`w-1 h-5 rounded-full ${color}`} />
    <span className="font-bold text-zinc-200 text-sm tracking-wide">{label}</span>
    <span className="text-xs text-zinc-600 bg-[#1a1a24] px-2.5 py-0.5 rounded-lg border border-white/[0.04]">
      共 {count} 项
    </span>
  </div>
);

// ==========================================
// 🏆 称号详情弹窗（TODO 5）
// ==========================================
const LEVEL_NAMES = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER'];
const LEVEL_COLORS = ['text-emerald-400', 'text-amber-400', 'text-rose-400', 'text-purple-400', 'text-zinc-200'];

const TrophyDetailModal = ({ item, onClose }) => {
  if (!item) return null;
  const colorKey = normColor(item.color);
  const style = TROPHY_COLOR_MAP[colorKey] || TROPHY_COLOR_MAP.normal;
  const reqs = item.required || [];

  const renderCondition = (req, idx) => {
    const diffs = req.difficulties || [];
    const diffLabel = diffs.length === 0
      ? '全难易度'
      : diffs.map(d => LEVEL_NAMES[d] || d).join(' / ');
    const conditions = [];
    if (req.rate)  conditions.push(req.rate.toUpperCase());
    if (req.fc)    conditions.push(req.fc.toUpperCase());
    if (req.fs)    conditions.push(req.fs.toUpperCase());
    const songs = req.songs || [];

    return (
      <div key={idx} className={`rounded-xl border p-4 ${
        req.completed ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-white/[0.05] bg-[#0c0c11]'
      }`}>
        {/* 达成条件标题行 */}
        <div className="flex items-center gap-2 mb-3">
          {req.completed
            ? <FaCheckCircle className="text-emerald-400 shrink-0" />
            : <div className="w-4 h-4 rounded-full border-2 border-zinc-600 shrink-0" />}
          <span className="text-xs font-bold text-zinc-400">条件 {idx + 1}</span>
          {diffs.length > 0 && (
            <span className="flex gap-1">
              {diffs.map(d => (
                <span key={d} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/10 ${LEVEL_COLORS[d] || 'text-zinc-400'}`}>
                  {LEVEL_NAMES[d] || d}
                </span>
              ))}
            </span>
          )}
          {diffs.length === 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/10 text-zinc-400">全难易度</span>
          )}
          {conditions.map(c => (
            <span key={c} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-cyan-300">{c}</span>
          ))}
        </div>

        {/* 关联曲目列表 */}
        {songs.length > 0 && (
          <div className="space-y-2">
            {songs.map((song) => {
              const completedDiffs = song.completed_difficulties || [];
              return (
                <div key={song.id} className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                  song.completed ? 'bg-emerald-500/10' : 'bg-white/[0.03]'
                }`}>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-zinc-200 truncate">{song.title}</div>
                    <div className="text-[9px] text-zinc-600 mt-0.5">{song.type} · ID {song.id}</div>
                  </div>
                  <div className="flex items-center gap-1.5 ml-3 shrink-0">
                    {completedDiffs.map(d => (
                      <span key={d} className={`text-[8px] font-bold px-1 py-0.5 rounded ${LEVEL_COLORS[d] || 'text-zinc-400'} bg-white/5`}>
                        {LEVEL_NAMES[d] || d}
                      </span>
                    ))}
                    {song.completed
                      ? <FaCheckCircle className="text-emerald-400 text-[10px]" />
                      : <div className="w-3 h-3 rounded-full border border-zinc-600" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {songs.length === 0 && conditions.length === 0 && (
          <div className="text-xs text-zinc-600">（无具体曲目要求）</div>
        )}
      </div>
    );
  };

  const totalReqs = reqs.length;
  const completedReqs = reqs.filter(r => r.completed).length;
  const progress = totalReqs > 0 ? (completedReqs / totalReqs) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#0c0c11]/80 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-[#15151e] border border-white/[0.08] rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl z-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#15151e]/95 backdrop-blur-sm px-5 pt-5 pb-4 border-b border-white/[0.05] z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className={`text-lg font-bold mb-1 ${
                style.rainbow
                  ? 'bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent'
                  : style.text
              }`}>{item.name}</div>
              {item.description && (
                <div className="text-xs text-zinc-500">{item.description}</div>
              )}
            </div>
            <button onClick={onClose} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
              <FaTimes className="text-xs" />
            </button>
          </div>
          {/* 进度条 */}
          {totalReqs > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                <span>达成进度</span>
                <span className="font-bold text-zinc-300">{completedReqs} / {totalReqs}</span>
              </div>
              <div className="h-1.5 bg-[#0c0c11] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8 }}
                  className={`h-full rounded-full ${
                    progress >= 100 ? 'bg-gradient-to-r from-pink-400 to-cyan-400' : 'bg-cyan-500'
                  }`}
                />
              </div>
            </div>
          )}
        </div>
        <div className="p-5 space-y-3">
          {reqs.length === 0 ? (
            <div className="text-center py-8 text-zinc-600 text-sm">该称号无解锁条件数据</div>
          ) : (
            reqs.map((req, idx) => renderCondition(req, idx))
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ==========================================
// 🚀 主页面组件
// ==========================================
export default function MaimaiCollections() {
  const navigate = useNavigate();
  const { username } = useParams();
  const [activeType, setActiveType] = useState('trophy');
  const [collections, setCollections] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterColor, setFilterColor] = useState('all');
  const fetchedRef = useRef(new Set());

  // TODO 3 & 4：用户收藏品持有数据
  const [ownedData, setOwnedData] = useState(null);  // { trophy:[], icon:[], plate:[], frame:[], equipped:{} }
  const [ownedLoading, setOwnedLoading] = useState(false);
  const [ownedError, setOwnedError] = useState(null);
  const ownedFetchedRef = useRef(false);

  // TODO 5：称号详情弹窗
  const [detailTrophy, setDetailTrophy] = useState(null);

  // TODO 6：回到顶部按钮
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 📡 拉取指定类型的收藏品（带缓存，避免重复请求）
  const fetchCollection = useCallback(async (type) => {
    if (fetchedRef.current.has(type)) return;
    if (collectionCache[type]) {
      setCollections(prev => ({ ...prev, [type]: collectionCache[type] }));
      fetchedRef.current.add(type);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${LXNS_API}/${type}/list?version=25000`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const typeConfig = COLLECTION_TYPES.find(t => t.id === type);
      const items = data[typeConfig?.key] || [];

      collectionCache[type] = items;
      fetchedRef.current.add(type);
      setCollections(prev => ({ ...prev, [type]: items }));
    } catch (err) {
      setError(`获取${COLLECTION_TYPES.find(t=>t.id===type)?.label || ''}收藏品失败：${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载：仅拉取当前 tab 的数据
  useEffect(() => {
    fetchCollection(activeType);
  }, [activeType, fetchCollection]);

  // TODO 3：一次性拉取用户收藏品持有情况（有 token 才触发）
  useEffect(() => {
    if (!username || ownedFetchedRef.current) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    ownedFetchedRef.current = true;
    setOwnedLoading(true);
    setOwnedError(null);
    axios.get(`/api/maimai/player-collections-owned/${username}?collectionType=all`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setOwnedData(res.data))
      .catch(err => {
        const msg = err.response?.data?.msg || '';
        if (msg === 'NO_TOKEN' || msg === 'TOKEN_EXPIRED') {
          setOwnedError(msg);
        } else {
          setOwnedError('FETCH_FAILED');
        }
      })
      .finally(() => setOwnedLoading(false));
  }, [username]);

  const activeConfig = COLLECTION_TYPES.find(t => t.id === activeType);
  const items = collections[activeType] || [];

  // TODO 4：获取当前类型的持有 Set 与装备 ID
  const ownedSet = new Set((ownedData?.[activeType] || []).map(id => Number(id)));
  const equippedId = ownedData?.equipped?.[activeType] || null;

  // 搜索过滤
  const filteredItems = items.filter(item => {
    const matchName = item.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchColor = filterColor === 'all' || item.color === filterColor;
    return matchName && (activeType !== 'trophy' || matchColor);
  });

  // 按稀有度分组（仅 trophy）
  const trophyGroups = activeType === 'trophy'
    ? Object.entries(
        filteredItems.reduce((acc, item) => {
          const k = normColor(item.color);
          if (!acc[k]) acc[k] = [];
          acc[k].push(item);
          return acc;
        }, {})
      ).sort((a, b) => {
        const order = ['rainbow', 'gold', 'silver', 'bronze', 'normal'];
        return order.indexOf(a[0]) - order.indexOf(b[0]);
      })
    : null;

  // 颜色进度统计（称号专用）
  const trophyStats = activeType === 'trophy' && items.length > 0
    ? Object.entries(TROPHY_COLOR_MAP).map(([key, style]) => ({
        key,
        style,
        count: items.filter(i => normColor(i.color) === key).length,
        total: items.length,
        ownedCount: ownedData ? items.filter(i => normColor(i.color) === key && ownedSet.has(Number(i.id))).length : null,
      })).filter(s => s.count > 0)
    : [];

  return (
    <div className="w-full min-h-screen bg-[#0c0c11] text-zinc-200 font-sans pb-24 overflow-x-hidden">
      {/* 背景装饰 */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[55vw] h-[55vw] bg-cyan-900/8 rounded-full blur-[160px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] bg-indigo-900/8 rounded-full blur-[160px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-24 relative z-10">

        {/* 返回按钮 */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors font-bold text-sm w-fit active:scale-95 mb-6"
        >
          <FaArrowLeft /> 返回
        </button>

        {/* 页面标题 */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-7 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
            <h1 className="text-3xl font-extrabold text-zinc-100 tracking-tight" style={{ fontFamily: "'Quicksand', sans-serif" }}>
              舞萌 DX 收藏品图鉴
            </h1>
          </div>
          <p className="text-sm text-zinc-500 ml-4 mt-1">游戏内全部收藏品展示 · 数据来自落雪查分器</p>
        </div>

        {/* 分类 Tab 切换 */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {COLLECTION_TYPES.map(type => {
            const Icon = type.icon;
            const isActive = activeType === type.id;
            const count = collections[type.id]?.length;
            return (
              <button
                key={type.id}
                onClick={() => { setActiveType(type.id); setSearchQuery(''); setFilterColor('all'); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all active:scale-95 ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.15)]'
                    : 'bg-[#15151e] text-zinc-400 border border-white/[0.05] hover:text-zinc-200 hover:bg-[#1a1a24]'
                }`}
                style={{ fontFamily: "'Quicksand', sans-serif" }}
              >
                <Icon className="text-xs" />
                {type.label}
                {count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${isActive ? 'bg-cyan-500/30 text-cyan-200' : 'bg-white/5 text-zinc-600'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 搜索 + 筛选行 */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder={`搜索${activeConfig?.label || ''}名称...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-[#15151e] border border-white/[0.05] text-zinc-200 px-4 py-2.5 rounded-xl focus:outline-none focus:border-cyan-500/40 text-sm placeholder-zinc-600 transition-colors"
          />
          {/* 称号稀有度筛选 */}
          {activeType === 'trophy' && (
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
              <button
                onClick={() => setFilterColor('all')}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filterColor === 'all' ? 'bg-zinc-200 text-zinc-900' : 'bg-[#15151e] text-zinc-400 border border-white/[0.05] hover:text-zinc-200'}`}
              >
                全部
              </button>
              {Object.entries(TROPHY_COLOR_MAP).map(([key, style]) => (
                <button
                  key={key}
                  onClick={() => setFilterColor(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    filterColor === key ? `${style.bg} ${style.border}` : 'bg-[#15151e] border-white/[0.05] hover:bg-[#1a1a24]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                  <span className={filterColor === key ? (style.rainbow ? 'text-purple-300' : style.text) : 'text-zinc-400'}>
                    {style.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TODO 3 & 4：用户收藏品授权状态提示 */}
        {ownedLoading && (
          <div className="mb-4 flex items-center gap-2 text-xs text-zinc-500 bg-[#15151e] border border-white/[0.05] rounded-xl px-4 py-2.5">
            <FaSpinner className="animate-spin text-cyan-500/60" /> 正在拉取持有数据...
          </div>
        )}
        {!ownedLoading && ownedError === 'NO_TOKEN' && (
          <div className="mb-4 flex items-center gap-2 text-xs text-zinc-500 bg-[#15151e] border border-white/[0.05] rounded-xl px-4 py-2.5">
            <FaLock className="text-zinc-600" /> 该用户尚未通过落雪 OAuth 授权，无法显示持有状态
          </div>
        )}
        {!ownedLoading && ownedError === 'TOKEN_EXPIRED' && (
          <div className="mb-4 flex items-center gap-2 text-xs text-amber-500 bg-amber-900/10 border border-amber-500/20 rounded-xl px-4 py-2.5">
            <FaLock /> 落雪授权已过期，请前往 Maimai Profile 重新授权
          </div>
        )}

        {/* TODO 4：已拥有统计面板 */}
        {ownedData && !ownedLoading && items.length > 0 && (
          <div className="mb-6 bg-[#15151e] border border-white/[0.05] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">持有进度</span>
              <span className="text-xs text-zinc-400 font-bold" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                {ownedSet.size} <span className="text-zinc-600">/</span> {items.length}
              </span>
            </div>
            <div className="h-2.5 bg-[#0c0c11] rounded-full overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${items.length > 0 ? (ownedSet.size / items.length) * 100 : 0}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500"
              />
            </div>
            <div className="text-[10px] text-zinc-600 text-right">
              {items.length > 0 ? ((ownedSet.size / items.length) * 100).toFixed(1) : '0.0'}% 已持有
            </div>
          </div>
        )}

      {/* 称号稀有度统计进度条 */}
        {activeType === 'trophy' && trophyStats.length > 0 && (
          <div className="mb-8 bg-[#15151e] border border-white/[0.05] rounded-2xl p-5">
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">稀有度分布</div>
            <div className="space-y-3">
              {trophyStats.map(({ key, style, count, total, ownedCount }) => {
                const pct = (count / total) * 100;
                const ownedPct = count > 0 && ownedCount != null ? (ownedCount / count) * 100 : null;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 w-14 shrink-0">
                      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                      <span className={`text-xs font-bold ${style.rainbow ? 'text-purple-300' : style.text}`}>{style.label}</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-0.5">
                      {/* 总量进度条 */}
                      <div className="h-1.5 bg-[#0c0c11] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={`h-full rounded-full opacity-30 ${
                            key === 'rainbow' ? 'bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400'
                            : key === 'gold'   ? 'bg-amber-400'
                            : key === 'silver' ? 'bg-zinc-300'
                            : key === 'bronze' ? 'bg-orange-500'
                            : 'bg-zinc-600'
                          }`}
                        />
                      </div>
                      {/* 持有进度条（仅有数据时显示） */}
                      {ownedPct != null && (
                        <div className="h-1 bg-[#0c0c11] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${ownedPct}%` }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                            className={`h-full rounded-full ${
                              key === 'rainbow' ? 'bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400'
                              : key === 'gold'   ? 'bg-amber-400'
                              : key === 'silver' ? 'bg-zinc-300'
                              : key === 'bronze' ? 'bg-orange-500'
                              : 'bg-zinc-600'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0 w-20" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                      <span className="text-xs font-bold text-zinc-500">{count}</span>
                      {ownedPct != null && (
                        <span className="text-[9px] text-zinc-600 block">{ownedCount}/{count}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 内容区 */}
        <AnimatePresence mode="wait">
          {loading && !items.length ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32 text-zinc-500"
            >
              <FaSpinner className="animate-spin text-4xl text-cyan-500/40 mb-4" />
              <p className="text-sm font-medium">正在拉取收藏品数据...</p>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 text-zinc-500"
            >
              <FaBoxOpen className="text-5xl opacity-20 mb-4" />
              <p className="text-sm font-medium text-rose-400">{error}</p>
              <button
                onClick={() => { fetchedRef.current.delete(activeType); fetchCollection(activeType); }}
                className="mt-4 px-5 py-2 bg-[#15151e] border border-white/[0.05] rounded-xl text-sm font-bold text-zinc-300 hover:text-white transition-colors"
              >
                重试
              </button>
            </motion.div>
          ) : filteredItems.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 text-zinc-600"
            >
              <FaBoxOpen className="text-5xl opacity-20 mb-3" />
              <p className="text-sm">未找到匹配的收藏品</p>
            </motion.div>
          ) : activeType === 'trophy' ? (
            /* 称号：按稀有度分组展示 */
            <motion.div key="trophy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {trophyGroups?.map(([colorKey, groupItems]) => {
                const style = TROPHY_COLOR_MAP[colorKey] || TROPHY_COLOR_MAP.normal;
                const dotColor = colorKey === 'rainbow'
                  ? 'bg-gradient-to-r from-pink-400 to-cyan-400'
                  : style.dot;
                const groupOwned = ownedData ? groupItems.filter(i => ownedSet.has(Number(i.id))).length : null;
                return (
                  <div key={colorKey} className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-1 h-5 rounded-full ${dotColor}`} />
                      <span className="font-bold text-zinc-200 text-sm tracking-wide">{style.label}称号</span>
                      <span className="text-xs text-zinc-600 bg-[#1a1a24] px-2.5 py-0.5 rounded-lg border border-white/[0.04]">共 {groupItems.length} 项</span>
                      {groupOwned != null && (
                        <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                          已持有 {groupOwned}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {groupItems.map(item => (
                        <TrophyCard
                          key={item.id}
                          item={item}
                          owned={ownedSet.has(Number(item.id))}
                          equipped={Number(item.id) === Number(equippedId)}
                          onDetail={setDetailTrophy}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          ) : (
            /* 图片类：网格展示 */
            <motion.div
              key={activeType}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className={`grid gap-4 ${
                activeType === 'icon'  ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8' :
                activeType === 'plate' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'                :
                activeType === 'frame' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'                :
                'grid-cols-3'
              }`}
            >
              {filteredItems.map(item => (
                <ImageCard
                  key={item.id}
                  item={item}
                  type={activeType}
                  owned={ownedSet.has(Number(item.id))}
                  equipped={Number(item.id) === Number(equippedId)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 底部数据来源说明 */}
        {!loading && items.length > 0 && (
          <div className="mt-12 text-center text-xs text-zinc-700 border-t border-white/[0.04] pt-6">
            数据来源：落雪查分器 · 图片资源：assets2.lxns.net · 版本：25000
          </div>
        )}
      </div>

      {/* TODO 6：回到顶部固定按钮 */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-8 right-8 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.3)] hover:bg-cyan-500/30 hover:scale-110 transition-all active:scale-95"
            title="回到顶部"
          >
            <FaArrowUp />
          </motion.button>
        )}
      </AnimatePresence>

      {/* TODO 5：称号详情弹窗 */}
      <AnimatePresence>
        {detailTrophy && (
          <TrophyDetailModal item={detailTrophy} onClose={() => setDetailTrophy(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}