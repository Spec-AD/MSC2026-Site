import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaSpinner, FaBoxOpen, FaUserCircle, FaImage, FaIdCard, FaTimes } from 'react-icons/fa';

// ==========================================
// 🌟 落雪查分器收藏品 API 基础配置
// ==========================================
const LXNS_BASE = 'https://assets2.lxns.net/maimai';
const LXNS_API  = 'https://maimai.lxns.net/api/v0/maimai';

// 稀有度颜色映射（TrophyColor）
const TROPHY_COLOR_MAP = {
  normal:  { label: '普通', bg: 'bg-zinc-600/30', border: 'border-zinc-500/30', text: 'text-zinc-300', dot: 'bg-zinc-400' },
  bronze:  { label: '铜',   bg: 'bg-orange-900/30', border: 'border-orange-600/40', text: 'text-orange-300', dot: 'bg-orange-500' },
  silver:  { label: '银',   bg: 'bg-zinc-300/10', border: 'border-zinc-300/30', text: 'text-zinc-200', dot: 'bg-zinc-300' },
  gold:    { label: '金',   bg: 'bg-amber-900/30', border: 'border-amber-500/40', text: 'text-amber-300', dot: 'bg-amber-400' },
  rainbow: { label: '虹',   bg: 'bg-indigo-900/20', border: 'border-indigo-400/40', text: 'text-transparent', dot: 'bg-gradient-to-r from-pink-400 to-cyan-400', rainbow: true },
};

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
const TrophyCard = ({ item }) => {
  const colorKey = item.color || 'normal';
  const style = TROPHY_COLOR_MAP[colorKey] || TROPHY_COLOR_MAP.normal;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${style.bg} ${style.border} transition-all hover:brightness-110`}
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
      <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${style.border} ${style.rainbow ? 'text-purple-300' : style.text}`}>
        {style.label}
      </div>
    </motion.div>
  );
};

// ==========================================
// 🖼️ 图片类收藏品卡片（头像/姓名框/背景）
// ==========================================
const ImageCard = ({ item, type }) => {
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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative bg-[#15151e] border border-white/[0.05] rounded-2xl overflow-hidden hover:border-white/10 transition-all"
    >
      {/* 图片预览区 */}
      <div className={`relative overflow-hidden bg-[#0c0c11] flex items-center justify-center ${
        isIcon  ? 'aspect-square p-4'    :
        isPlate ? 'aspect-[4/1] p-3'    :
        isFrame ? 'aspect-[3/4] p-0'    : 'aspect-square'
      }`}>
        {url ? (
          <LazyImage
            src={url}
            alt={item.name}
            className={`object-contain ${
              isIcon  ? 'w-full h-full rounded-xl' :
              isPlate ? 'w-full h-auto'             :
              isFrame ? 'w-full h-full object-cover' : 'w-full h-auto'
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
// 🚀 主页面组件
// ==========================================
export default function MaimaiCollections() {
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState('trophy');
  const [collections, setCollections] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterColor, setFilterColor] = useState('all');
  const fetchedRef = useRef(new Set());

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

  const activeConfig = COLLECTION_TYPES.find(t => t.id === activeType);
  const items = collections[activeType] || [];

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
          const k = item.color || 'normal';
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
        count: items.filter(i => (i.color || 'normal') === key).length,
        total: items.length,
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

        {/* 称号稀有度统计进度条 */}
        {activeType === 'trophy' && trophyStats.length > 0 && (
          <div className="mb-8 bg-[#15151e] border border-white/[0.05] rounded-2xl p-5">
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">稀有度分布</div>
            <div className="space-y-3">
              {trophyStats.map(({ key, style, count, total }) => {
                const pct = (count / total) * 100;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 w-14 shrink-0">
                      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                      <span className={`text-xs font-bold ${style.rainbow ? 'text-purple-300' : style.text}`}>{style.label}</span>
                    </div>
                    <div className="flex-1 h-2 bg-[#0c0c11] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          key === 'rainbow' ? 'bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400'
                          : key === 'gold'   ? 'bg-amber-400'
                          : key === 'silver' ? 'bg-zinc-300'
                          : key === 'bronze' ? 'bg-orange-500'
                          : 'bg-zinc-600'
                        }`}
                      />
                    </div>
                    <span className="text-xs font-bold text-zinc-500 w-16 text-right shrink-0" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                      {count} <span className="text-zinc-700">({pct.toFixed(1)}%)</span>
                    </span>
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
                return (
                  <div key={colorKey} className="mb-8">
                    <SectionHeader
                      label={`${style.label}称号`}
                      count={groupItems.length}
                      color={dotColor}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {groupItems.map(item => (
                        <TrophyCard key={item.id} item={item} />
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
                activeType === 'frame' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' :
                'grid-cols-3'
              }`}
            >
              {filteredItems.map(item => (
                <ImageCard key={item.id} item={item} type={activeType} />
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
    </div>
  );
}