// ============================================================
// BracketView.jsx — 单败淘汰 Bracket SVG 对阵图
// P3 核心组件 | 依据：API Contract §1.3 + spec §六.6.1 + §十一建议二
//
// 渲染策略：
// 1. 按 roundName 分组 matches，每轮一列
// 2. 二遍遍历：先算 y 坐标偏移 → 再画连接线
// 3. Framer Motion layoutId 实现位置过渡动画
// 4. IntersectionObserver 懒渲染（64人+ 虚拟列表）
// ============================================================
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBracketStore, selectMatchesByRound } from '../../store/bracketStore';
import MatchDetail from './MatchDetail';
import {
  FaTrophy, FaSpinner, FaExpand, FaCompress, FaEye,
  FaEyeSlash,
} from 'react-icons/fa';

// ---- 布局常量 ----
const CARD_W = 230;
const CARD_H = 72;
const CARD_GAP = 16;
const H_GAP = 80; // 轮次间水平间距
const PADDING = 40; // SVG padding
const BYE_OPACITY = 0.45; // 轮空（自动晋级）半透明

// ---- 布局计算 ----
function computeLayout(matchesByRound, rounds) {
  if (!rounds || rounds.length === 0) return { placed: [], connectors: [], totalW: 0, totalH: 0 };

  const placed = [];
  const connectors = [];
  let maxY = 0;

  // 建立 bracketPosition → match 映射
  const posMap = {};
  Object.values(matchesByRound).flat().forEach(m => {
    posMap[m.bracketPosition] = m;
  });

  rounds.forEach((roundName, rIdx) => {
    const roundMatches = (matchesByRound[roundName] || [])
      .sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0));

    const x = PADDING + rIdx * (CARD_W + H_GAP);

    roundMatches.forEach((m, j) => {
      // y-center 公式：每个 match 覆盖 2^rIdx 个 round 0 槽位
      const span = Math.pow(2, rIdx);
      const yCenter = (j * span + (span - 1) / 2) * (CARD_H + CARD_GAP) + CARD_H / 2;

      placed.push({
        match: m,
        x,
        y: yCenter - CARD_H / 2,
        w: CARD_W,
        h: CARD_H,
        yCenter,
        roundIdx: rIdx,
        indexInRound: j,
      });

      if (yCenter + CARD_H / 2 > maxY) maxY = yCenter + CARD_H / 2;

      // 连接线：本 match → nextMatchIndex
      if (m.nextMatchIndex != null && m.nextMatchIndex >= 0) {
        const target = posMap[m.nextMatchIndex];
        if (target) {
          const targetRound = rounds.findIndex(r => {
            const tm = (matchesByRound[r] || []).find(t => t.bracketPosition === target.bracketPosition);
            return !!tm;
          });
          if (targetRound >= 0) {
            const tx = PADDING + targetRound * (CARD_W + H_GAP);
            const targetPlaced = placed.find(p => p.match.bracketPosition === target.bracketPosition);
            const ty = targetPlaced ? targetPlaced.yCenter : (() => {
              const targetIdx = (matchesByRound[rounds[targetRound]] || [])
                .sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0))
                .findIndex(t => t.bracketPosition === target.bracketPosition);
              if (targetIdx < 0) return yCenter;
              const tSpan = Math.pow(2, targetRound);
              return (targetIdx * tSpan + (tSpan - 1) / 2) * (CARD_H + CARD_GAP) + CARD_H / 2;
            })();

            connectors.push({
              key: `conn_${m.bracketPosition}_to_${m.nextMatchIndex}`,
              x1: x + CARD_W,
              y1: yCenter,
              x2: tx,
              y2: ty,
              status: m.status,
            });
          }
        }
      }
    });
  });

  const totalW = rounds.length * (CARD_W + H_GAP) - H_GAP + PADDING * 2;
  const totalH = Math.max(maxY + PADDING, 200);

  return { placed, connectors, totalW, totalH };
}

// ---- 卡片颜色 ----
function matchCardColors(match) {
  switch (match.status) {
    case 'FINISHED':
      return match.forfeited
        ? 'border-red-500/30 bg-red-500/8'
        : 'border-emerald-500/25 bg-emerald-500/8';
    case 'ONGOING':
      return 'border-yellow-500/30 bg-yellow-500/10 shadow-lg shadow-yellow-500/10';
    default:
      return 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]';
  }
}

function matchCardShadow(match) {
  if (match.status === 'ONGOING') return '0 0 24px rgba(234,179,8,0.08)';
  if (match.status === 'FINISHED' && !match.forfeited) return '0 0 12px rgba(52,211,153,0.05)';
  return 'none';
}

// =============================================================

const BracketView = ({ tournamentId, isManager = false }) => {
  const { matches, rounds, byePositions, loading, updateMatch } = useBracketStore();
  const matchesByRound = useMemo(() => selectMatchesByRound({ matches }), [matches]);

  const [hoveredMatch, setHoveredMatch] = useState(null);
  const [detailPos, setDetailPos] = useState({ x: 0, y: 0 });
  const [showDetail, setShowDetail] = useState(false);
  const [detailMatch, setDetailMatch] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedRounds, setExpandedRounds] = useState({});
  const svgRef = useRef(null);
  const obsRef = useRef(null);
  const [visiblePositions, setVisiblePositions] = useState(new Set());

  const layout = useMemo(() => computeLayout(matchesByRound, rounds), [matchesByRound, rounds]);

  // ---- IntersectionObserver 懒渲染 ----
  useEffect(() => {
    if (!collapsed || matches.length <= 64) {
      setVisiblePositions(new Set(matches.map(m => m.bracketPosition)));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const pos = parseInt(entry.target.dataset.bracketPosition, 10);
            if (!isNaN(pos)) {
              setVisiblePositions(prev => new Set([...prev, pos]));
            }
          }
        });
      },
      { rootMargin: '200px' }
    );

    const currentObs = obsRef.current;
    if (currentObs) observer.observe(currentObs);

    return () => {
      observer.disconnect();
    };
  }, [collapsed, matches.length]);

  // ---- Hover 详情 ----
  const handleMouseEnter = useCallback((m, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgRect = svgRef.current?.getBoundingClientRect();
    const relX = rect.right - svgRect.left + 8;
    const relY = rect.top - svgRect.top - 60;
    setDetailPos({ x: relX, y: relY });
    setHoveredMatch(m);
    setShowDetail(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    // 加小延迟防止 Popover 消失过快
    setTimeout(() => setShowDetail(false), 200);
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><FaSpinner className="animate-spin text-3xl text-amber-400" /></div>;
  }

  if (layout.placed.length === 0) {
    return (
      <div className="text-center py-16">
        <FaTrophy className="text-4xl text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-500 text-sm">对阵表尚未生成</p>
      </div>
    );
  }

  const isLarge = matches.length > 32;

  return (
    <div className="relative">
      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>{rounds.length} 轮 · {matches.length} 场对局</span>
          {byePositions.length > 0 && (
            <span className="text-zinc-600">{byePositions.length} 轮空</span>
          )}
        </div>
        {isLarge && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl text-xs text-zinc-400 transition-all"
          >
            {collapsed ? <FaEye size={12} /> : <FaEyeSlash size={12} />}
            {collapsed ? '完整视图' : '紧凑视图'}
          </button>
        )}
      </div>

      {/* SVG Bracket */}
      <div
        ref={svgRef}
        className="overflow-auto rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#0c0c11] to-[#111118]"
        style={{ maxHeight: collapsed ? '480px' : 'none', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
      >
        <svg
          width={layout.totalW}
          height={collapsed ? Math.min(layout.totalH, 480) : layout.totalH}
          className="min-w-full"
          style={{ minHeight: collapsed ? 480 : layout.totalH }}
        >
          {/* 连接线（先画，在卡片下面） */}
          {layout.connectors.map((c) => {
            const midX = c.x2 - H_GAP / 2;
            return (
              <path
                key={c.key}
                d={`M ${c.x1} ${c.y1} L ${midX} ${c.y1} L ${midX} ${c.y2} L ${c.x2} ${c.y2}`}
                fill="none"
                stroke={c.status === 'FINISHED' ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.08)'}
                strokeWidth={c.status === 'FINISHED' ? 2 : 1.5}
                strokeLinejoin="round"
                className="transition-all duration-500"
              />
            );
          })}

          {/* 轮次标题 */}
          {rounds.map((name, rIdx) => (
            <text
              key={name}
              x={PADDING + rIdx * (CARD_W + H_GAP) + CARD_W / 2}
              y={22}
              textAnchor="middle"
              className="fill-zinc-500 text-[11px] font-bold uppercase tracking-widest"
            >
              {name}
            </text>
          ))}

          {/* 卡片 */}
          {layout.placed.map((p) => {
            const m = p.match;
            const { x, y, w, h, yCenter } = p;
            const isBye = !m.playerA || !m.playerB;
            const colors = matchCardColors(m);
            const shadow = matchCardShadow(m);
            const isVisible = collapsed ? visiblePositions.has(m.bracketPosition) : true;
            const isActiveRound = collapsed && !expandedRounds[p.roundIdx];

            if (collapsed && !isVisible) {
              // 占位符
              return (
                <g
                  key={`place_${m.bracketPosition}`}
                  data-bracket-position={m.bracketPosition}
                  ref={p.roundIdx === 0 && m.bracketPosition >= 0 ? obsRef : undefined}
                >
                  <rect
                    x={x} y={y + 2} width={w} height={h - 4}
                    rx={10}
                    fill="rgba(255,255,255,0.02)"
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                  />
                  <text
                    x={x + w / 2} y={yCenter + 3}
                    textAnchor="middle"
                    className="fill-zinc-600 text-[10px]"
                  >
                    (#{m.bracketPosition})
                  </text>
                </g>
              );
            }

            if (!isVisible) return null;

            return (
              <g
                key={m._id || m.bracketPosition}
                data-bracket-position={m.bracketPosition}
                onClick={(e) => {
                  if (window.innerWidth < 768) {
                    // 移动端：点击切换详情
                    setDetailMatch(prev => prev?._id === m._id ? null : m);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <motion.rect
                  layoutId={`match_${m._id || m.bracketPosition}`}
                  x={x} y={y} width={w} height={h}
                  rx={10}
                  fill="none"
                  strokeWidth={1}
                  filter={shadow !== 'none' ? `drop-shadow(${shadow})` : undefined}
                  className={`transition-all duration-300 cursor-pointer ${colors}`}
                  onMouseEnter={(e) => handleMouseEnter(m, e)}
                  onMouseLeave={handleMouseLeave}
                  style={{ opacity: isBye ? BYE_OPACITY : 1 }}
                />

                {/* Player A */}
                <foreignObject
                  x={x + 12} y={y + 8} width={w - 24} height={22}
                  style={{ opacity: isBye ? BYE_OPACITY : 1 }}
                >
                  <div className="flex items-center gap-2 h-full text-xs">
                    <div className="w-5 h-5 rounded-full bg-black/40 border border-white/10 flex-shrink-0 overflow-hidden">
                      {m.playerA?.avatarUrl && (
                        <img src={m.playerA.avatarUrl} className="w-full h-full object-cover" alt="" />
                      )}
                    </div>
                    <span className={`truncate font-medium ${
                      m.status === 'FINISHED' && m.winner && (m.winner === m.playerA?._id || m.winner === m.playerA?.username)
                        ? 'text-emerald-400'
                        : 'text-zinc-200'
                    }`}>
                      {m.playerA?.username || m.playerA || '—'}
                    </span>
                    {m.status === 'FINISHED' && m.winner === (m.playerA?._id || m.playerA?.username) && (
                      <FaTrophy className="text-yellow-400 text-[9px] flex-shrink-0" />
                    )}
                  </div>
                </foreignObject>

                {/* Player B */}
                <foreignObject
                  x={x + 12} y={y + 34} width={w - 24} height={22}
                  style={{ opacity: isBye ? BYE_OPACITY : 1 }}
                >
                  <div className="flex items-center gap-2 h-full text-xs">
                    <div className="w-5 h-5 rounded-full bg-black/40 border border-white/10 flex-shrink-0 overflow-hidden">
                      {m.playerB?.avatarUrl && (
                        <img src={m.playerB.avatarUrl} className="w-full h-full object-cover" alt="" />
                      )}
                    </div>
                    <span className={`truncate font-medium ${
                      m.status === 'FINISHED' && m.winner && (m.winner === m.playerB?._id || m.winner === m.playerB?.username)
                        ? 'text-emerald-400'
                        : 'text-zinc-200'
                    }`}>
                      {m.playerB?.username || m.playerB || '—'}
                    </span>
                    {m.status === 'FINISHED' && m.winner === (m.playerB?._id || m.playerB?.username) && (
                      <FaTrophy className="text-yellow-400 text-[9px] flex-shrink-0" />
                    )}
                  </div>
                </foreignObject>

                {/* Score */}
                {m.scoreA !== undefined && (m.scoreA !== 0 || m.scoreB !== 0 || m.status === 'FINISHED') && (
                  <>
                    <text
                      x={x + w - 14} y={y + 22}
                      textAnchor="end"
                      className={`text-xs font-black font-mono ${
                        m.status === 'FINISHED' && m.winner === (m.playerA?._id || m.playerA?.username)
                          ? 'fill-emerald-400'
                          : 'fill-zinc-400'
                      }`}
                      style={{ opacity: isBye ? BYE_OPACITY : 1 }}
                    >
                      {m.scoreA}
                    </text>
                    <text
                      x={x + w - 14} y={y + 48}
                      textAnchor="end"
                      className={`text-xs font-black font-mono ${
                        m.status === 'FINISHED' && m.winner === (m.playerB?._id || m.playerB?.username)
                          ? 'fill-emerald-400'
                          : 'fill-zinc-400'
                      }`}
                      style={{ opacity: isBye ? BYE_OPACITY : 1 }}
                    >
                      {m.scoreB}
                    </text>
                  </>
                )}

                {/* Status label */}
                {!isBye && (
                  <text
                    x={x + w / 2} y={y + h - 6}
                    textAnchor="middle"
                    className={`text-[8px] font-bold uppercase tracking-wider ${
                      m.status === 'FINISHED' ? 'fill-emerald-500/50' :
                      m.status === 'ONGOING' ? 'fill-yellow-500/60' :
                      'fill-zinc-600'
                    }`}
                  >
                    {m.status === 'FINISHED' ? 'FINISHED' :
                     m.status === 'ONGOING' ? 'LIVE' :
                     m.forfeited ? 'FORFEIT' : 'PENDING'}
                  </text>
                )}
                {isBye && (
                  <text
                    x={x + w / 2} y={y + h - 6}
                    textAnchor="middle"
                    className="fill-zinc-600 text-[8px] font-bold uppercase tracking-wider"
                  >
                    BYE
                  </text>
                )}

                {/* Forfeit badge */}
                {m.forfeited && !isBye && (
                  <rect x={x + w - 20} y={y + 4} width={16} height={14} rx={4} fill="rgba(239,68,68,0.15)" />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Match Detail Popover（桌面端 hover） */}
      <div
        className="absolute z-50 hidden md:block"
        style={{
          left: detailPos.x,
          top: detailPos.y,
          pointerEvents: showDetail && hoveredMatch ? 'auto' : 'none',
        }}
      >
        <MatchDetail
          match={hoveredMatch}
          visible={showDetail && !!hoveredMatch}
          onClose={() => setShowDetail(false)}
        />
      </div>

      {/* Match Detail（移动端 tap） */}
      {detailMatch && window.innerWidth < 768 && (
        <>
          {/* 遮罩 */}
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setDetailMatch(null)}
          />
          {/* 底部弹窗 */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-900 border-t border-white/10 rounded-t-2xl shadow-2xl p-4 max-h-[60vh] overflow-y-auto">
            <div className="flex justify-center mb-3">
              <div className="w-8 h-1 rounded-full bg-white/20" />
            </div>
            <MatchDetail
              match={detailMatch}
              visible={true}
              onClose={() => setDetailMatch(null)}
            />
          </div>
        </>
      )}

      {/* 图例 */}
      <div className="flex items-center gap-5 mt-4 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-emerald-500/40 bg-emerald-500/10" /> 已结束
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-yellow-500/40 bg-yellow-500/15" /> 进行中
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-white/15 bg-white/[0.04]" /> 待开始
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-white/10 bg-white/[0.02] opacity-45" /> 轮空
        </span>
      </div>
    </div>
  );
};

export default BracketView;
