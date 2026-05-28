// ============================================================
// OsuScoreDetailPanel — BP 列表点击成绩弹出的详情面板
// 桌面端：右侧滑入 (framer-motion)
// 移动端：底部 Sheet
// 由父级 <AnimatePresence> + 条件挂载控制显隐
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getBeatmap } from '../api/osuApi';
import OsuGrade from './OsuGrade';
import OsuCoverImage from './OsuCoverImage';
import OsuModIcons from './OsuModIcons';
import { FaTimes, FaExternalLinkAlt, FaSpinner } from 'react-icons/fa';
import useWindowSize from '../../../hooks/useWindowSize';
import OsuStarBadge from './OsuStarBadge';

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const desktopPanelVariants = {
  hidden: { x: '100%' },
  visible: { x: 0 },
  exit: { x: '100%' },
};

const mobileSheetVariants = {
  hidden: { y: '100%' },
  visible: { y: 0 },
  exit: { y: '100%' },
};

export default function OsuScoreDetailPanel({ score, onClose }) {
  const navigate = useNavigate();
  const { width } = useWindowSize();
  const isMobile = width < 640;
  const [beatmap, setBeatmap] = useState(null);
  const [loadingBeatmap, setLoadingBeatmap] = useState(false);

  useEffect(() => {
    if (!score?.beatmapId) return;
    setLoadingBeatmap(true);
    getBeatmap(score.beatmapId)
      .then(({ data }) => setBeatmap(data))
      .catch(() => {}) // 静默失败
      .finally(() => setLoadingBeatmap(false));
  }, [score?.beatmapId]);

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isManiaMode = (score?.mode || beatmap?.mode) === 'mania';
  const beatmapParams = isManiaMode
    ? [
      { label: 'OD', value: beatmap?.od },
      { label: 'HP', value: beatmap?.hp },
      { label: 'Keys', value: beatmap?.maniaKeys ?? beatmap?.cs },
    ]
    : [
      { label: 'CS', value: beatmap?.cs },
      { label: 'AR', value: beatmap?.ar },
      { label: 'OD', value: beatmap?.od },
      { label: 'HP', value: beatmap?.hp },
      { label: 'BPM', value: beatmap?.bpm },
      { label: '时长', value: formatDuration(beatmap?.length) },
    ];

  const panelContent = (
    <div className="flex flex-col h-full">
      {/* 封面 */}
      <div className="relative h-40 sm:h-48 overflow-hidden shrink-0">
        <OsuCoverImage
          src={beatmap?.covers?.cover || score?.coverUrl || ''}
          alt=""
          className="w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a12] via-transparent to-transparent" />
        <button onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-zinc-400 hover:text-zinc-200 transition-colors">
          <FaTimes size={14} />
        </button>
        {/* 左上角星级徽章 */}
        {beatmap?.starRating != null && (
          <div className="absolute top-3 left-3">
            <OsuStarBadge starRating={beatmap.starRating} size="md" />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* 曲名区 */}
        <div>
          <h3 className="text-lg font-bold text-zinc-100 leading-tight">{score?.titleOriginal || score?.title || '未知曲目'}</h3>
          {score?.version && (
            <p className="text-sm text-zinc-500 mt-0.5">{score.version}</p>
          )}
        </div>

        {/* 成绩概览 */}
        <div className="flex items-center gap-4 py-3 px-4 bg-white/[0.03] rounded-lg">
          <OsuGrade grade={score?.grade} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-3">
              {/* PP — 非 Ranked/Approved 显示短杠；Stable 0pp 加问号 */}
              <span className={`text-2xl font-bold ${score?.beatmapStatus === 'ranked' || score?.beatmapStatus === 'approved' ? 'text-pink-400' : 'text-zinc-600'}`}>
                {(score?.beatmapStatus === 'ranked' || score?.beatmapStatus === 'approved')
                  ? (score?.isLazer === false && score?.pp === 0 && score?.accuracy === 0 ? '0 (?)' : Math.round(score?.pp || 0))
                  : '-'}
                {(score?.beatmapStatus === 'ranked' || score?.beatmapStatus === 'approved') && <span>pp</span>}
              </span>
              <span className="text-lg font-bold text-zinc-300">
                {typeof score?.accuracy === 'number' ? score.accuracy.toFixed(2) : (score?.accuracy ?? '-')}%
              </span>
              {score?.score != null && (
                <span className="text-sm text-zinc-400">
                  {Number(score.score).toLocaleString()} 分
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <OsuModIcons mods={score?.mods} />
              {/* Lazer/Stable 客户端标签 */}
              {score?.isLazer !== null && score?.isLazer !== undefined && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${score.isLazer ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                  {score.isLazer ? 'LAZER' : 'STABLE'}
                </span>
              )}
              <span className="text-[11px] text-zinc-600">{formatDate(score?.playedAt)}</span>
            </div>
          </div>
        </div>

        {/* 连击 & 评分 */}
        <div className="grid grid-cols-2 gap-3">
          {score?.maxCombo != null && (
            <div className="bg-white/[0.02] rounded-lg p-3">
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider">Max Combo</div>
              <div className="text-sm font-bold text-zinc-200 mt-1">
                {score.maxCombo.toLocaleString()}x
                {score.combo != null && score.combo !== score.maxCombo && (
                  <span className="text-xs text-zinc-500 ml-1">(当前 {score.combo}x)</span>
                )}
              </div>
            </div>
          )}
          <div className="bg-white/[0.02] rounded-lg p-3">
            <div className="text-[10px] text-zinc-600 uppercase tracking-wider">评分</div>
            <div className="text-sm font-bold text-zinc-200 mt-1">{score?.grade || '-'}</div>
          </div>
        </div>

        {/* 判定详情 — 按模式区分，使用 score.mode 决定判定名 */}
        {(score?.count300 != null || score?.count100 != null || score?.count50 != null || score?.countMiss != null
          || score?.countGreat != null || score?.countOk != null || score?.countMeh != null || score?.countPerf != null) && (
          <div className="bg-white/[0.02] rounded-lg p-3">
            <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">判定详情</div>
            <div className="grid grid-cols-6 gap-2 text-center">
              {(() => {
                const mode = score?.mode || 'standard';

                // 按模式定义判定名（lazer 新字段 fallback 到 legacy 旧字段）
                const entries = mode === 'mania'
                  ? [
                      { label: 'Perf', value: score.countPerf, color: 'text-yellow-400' },
                      { label: 'Great', value: score.countGreat ?? score.count300, color: 'text-emerald-400' },
                      { label: 'Good', value: score.countGood, color: 'text-green-400' },
                      { label: 'Ok', value: score.countOk ?? score.count100, color: 'text-blue-400' },
                      { label: 'Meh', value: score.countMeh ?? score.count50, color: 'text-amber-400' },
                      { label: 'Miss', value: score.countMiss, color: 'text-red-400' },
                    ]
                  : [
                      { label: '300', value: score.countGreat ?? score.count300, color: 'text-emerald-400' },
                      { label: '100', value: score.countOk ?? score.count100, color: 'text-blue-400' },
                      { label: '50', value: score.countMeh ?? score.count50, color: 'text-amber-400' },
                      { label: 'Miss', value: score.countMiss, color: 'text-red-400' },
                    ];

                // 全部显示，缺失的判定在渲染层显示 -
                return entries;
              })().map(({ label, value, color }) => {
                const valueClass = value == null
                  ? 'text-zinc-600'
                  : value === 0
                    ? 'text-zinc-400'
                    : color;

                return (
                  <div key={label}>
                    <div className={`text-sm font-bold ${valueClass}`}>
                      {value != null ? value.toLocaleString() : '-'}
                    </div>
                    <div className="text-[10px] text-zinc-600">{label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 谱面参数 */}
        {beatmap && (
          <div className="bg-white/[0.02] rounded-lg p-3">
            <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">谱面参数</div>
            <div className="grid grid-cols-3 gap-y-2 text-center">
              {beatmapParams.map((item) => (
                <ParamItem key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
            {beatmap.starRating != null && (
              <div className="mt-2 pt-2 border-t border-white/[0.05] flex items-center justify-between text-xs">
                <span className="text-zinc-500">
                  星级: <OsuStarBadge starRating={beatmap.starRating} size="sm" />
                </span>
                {/* Aim / Speed 难度评级 — 仅 standard 模式有意义 */}
                {score?.mode === 'standard' && (
                  <span className="text-zinc-500">
                    Aim: <span className="text-zinc-300">{beatmap.aimDifficulty?.toFixed(2) || '-'}</span> |
                    Speed: <span className="text-zinc-300">{beatmap.speedDifficulty?.toFixed(2) || '-'}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {loadingBeatmap && !beatmap && (
          <div className="flex items-center justify-center py-4">
            <FaSpinner className="animate-spin text-zinc-500" />
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-2">
          {score?.beatmapId && (
            <button onClick={() => { navigate(`/osu/leaderboard/${score.beatmapId}`); onClose(); }}
              className="flex-1 py-2.5 bg-pink-600 hover:bg-pink-500 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
              <FaExternalLinkAlt size={11} />
              查看排行榜
            </button>
          )}
          <button onClick={onClose}
            className="flex-1 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-sm font-bold rounded-lg transition-colors">
            关闭
          </button>
        </div>
      </div>
    </div>
  );

  // 蒙层 — 两个端共用
  return (
    <>
      <motion.div
        key="overlay"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      {isMobile ? (
        <motion.div
          key="sheet"
          variants={mobileSheetVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a12] rounded-t-2xl max-h-[85vh] overflow-hidden shadow-2xl border-t border-white/[0.05]"
        >
          <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mt-3 mb-1" />
          {panelContent}
        </motion.div>
      ) : (
        <motion.div
          key="panel"
          variants={desktopPanelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-[#0a0a12] border-l border-white/[0.05] shadow-2xl overflow-hidden"
        >
          {panelContent}
        </motion.div>
      )}
    </>
  );
}

function ParamItem({ label, value }) {
  const labelCls = label === 'Keys' ? '' : 'uppercase';

  return (
    <div>
      <div className="text-xs font-bold text-zinc-200">{value != null ? value : '-'}</div>
      <div className={`text-[9px] text-zinc-600 ${labelCls}`}>{label}</div>
    </div>
  );
}
