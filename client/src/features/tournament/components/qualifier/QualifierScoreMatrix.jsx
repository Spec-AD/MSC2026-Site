// ============================================================
// QualifierScoreMatrix.jsx — 预选赛成绩录入 (#5.1 UX 改造)
// b1.7.06 | 选手列表 → 展开 Modal 逐人录入 + 旧成绩自动回填
// 全量矩阵作为降级选项（仅高级管理员可切）
// ============================================================
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQualifierStore } from '../../store/qualifierStore';
import { getPlayerScores } from '../../api/tournamentApi';
import {
  FaMusic, FaUpload, FaSpinner, FaSave, FaCheck,
  FaTimes, FaExclamationTriangle, FaSearch,
  FaChevronDown, FaChevronUp, FaChevronRight, FaUser, FaList,
  FaTable, FaCheckCircle, FaCircle, FaEdit
} from 'react-icons/fa';

// ---- CSV 解析（与旧版一致） ----
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
  });
}

const ACHIEVEMENT_GRADES = [
  { min: 100.5, label: 'SSS+', color: 'text-yellow-300' },
  { min: 100, label: 'SSS', color: 'text-yellow-400' },
  { min: 99.5, label: 'SS+', color: 'text-orange-300' },
  { min: 99, label: 'SS', color: 'text-orange-400' },
  { min: 98, label: 'S+', color: 'text-amber-300' },
  { min: 97, label: 'S', color: 'text-amber-400' },
  { min: 94, label: 'AAA', color: 'text-green-400' },
  { min: 90, label: 'AA', color: 'text-cyan-400' },
  { min: 0, label: 'A', color: 'text-zinc-400' },
];

function getGrade(achievement) {
  for (const g of ACHIEVEMENT_GRADES) {
    if (achievement >= g.min) return g;
  }
  return ACHIEVEMENT_GRADES[ACHIEVEMENT_GRADES.length - 1];
}

// ============================================================
// Modal: 选手成绩录入面板
// ============================================================
const ScoreEntryModal = ({
  player,
  songs,
  tournamentId,
  cachedScores,
  onCacheScore,
  onRemoveCachedScore,
  onClose,
  onSubmit,
  submitting,
  submitResult,
}) => {
  const userId = player.userId?._id || player.userId;
  const [localScores, setLocalScores] = useState({}); // { [songName]: { achievement, dxScore } }
  const [loaded, setLoaded] = useState(false);
  const [loadingSubmitted, setLoadingSubmitted] = useState(false);

  // 加载已提交成绩做回填
  useEffect(() => {
    if (!tournamentId || !userId || loaded) return;
    setLoadingSubmitted(true);
    getPlayerScores(tournamentId, userId)
      .then(res => {
        const submitted = res.data?.scores || [];
        const filled = {};
        submitted.forEach(s => {
          filled[s.songName] = { achievement: s.achievement ?? '', dxScore: s.dxScore ?? '' };
        });
        // 也把缓存中的成绩叠加进去
        songs.forEach(song => {
          const cached = cachedScores.find(
            c => c.userId === userId && c.songName === song.songName
          );
          if (cached) {
            filled[song.songName] = { achievement: cached.achievement ?? '', dxScore: cached.dxScore ?? '' };
          }
        });
        setLocalScores(filled);
        setLoaded(true);
      })
      .catch(() => setLoaded(true))
      .finally(() => setLoadingSubmitted(false));
  }, [tournamentId, userId, songs, cachedScores, loaded]);

  const handleChange = (songName, field, value) => {
    const prev = localScores[songName] || { achievement: '', dxScore: '' };
    const updated = { ...prev, [field]: value };
    setLocalScores({ ...localScores, [songName]: updated });

    // 同步写入 cachedScores
    const achievement = field === 'achievement' ? parseFloat(value) : (prev.achievement !== '' ? parseFloat(prev.achievement) : 0);
    const dxScore = field === 'dxScore' ? parseInt(value, 10) || 0 : (prev.dxScore !== '' ? parseInt(prev.dxScore, 10) : 0);

    if (field === 'achievement' && (isNaN(achievement) || achievement === 0)) {
      const newDx = updated.dxScore !== '' ? parseInt(updated.dxScore, 10) || 0 : 0;
      // If both empty, remove
      if (updated.dxScore === '') {
        onRemoveCachedScore(userId, songName);
        return;
      }
      onCacheScore({ userId, songName, achievement: 0, dxScore: newDx });
      return;
    }
    if (!isNaN(achievement) && achievement > 0) {
      onCacheScore({ userId, songName, achievement, dxScore: dxScore || 0 });
    }
  };

  // 判断某曲目状态
  const getSongStatus = (songName) => {
    const cached = cachedScores.find(c => c.userId === userId && c.songName === songName);
    if (cached) return { submitted: false, label: '待提交', color: 'text-yellow-400', dot: 'bg-yellow-400' };
    // 没有缓存但有 localScores（从已提交加载的）
    const local = localScores[songName];
    if (local && local.achievement !== '') return { submitted: true, label: '已提交', color: 'text-emerald-400', dot: 'bg-emerald-400' };
    return { submitted: false, label: '未录入', color: 'text-zinc-600', dot: 'bg-zinc-600' };
  };

  const username = player.userId?.username || '未知';
  const avatarUrl = player.userId?.avatarUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#15151e] border border-white/[0.08] rounded-2xl w-full max-w-xl mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-4">
            <img src={avatarUrl || '/assets/logos.png'} alt="" className="w-12 h-12 rounded-full object-cover bg-black border border-white/10" />
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {username}
                <span className="text-[10px] text-zinc-500 font-normal">UID: {typeof userId === 'string' ? userId.slice(-6) : '—'}</span>
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><FaTimes /></button>
        </div>

        {/* 成绩编辑区 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loadingSubmitted && (
            <div className="flex items-center justify-center py-8">
              <FaSpinner className="animate-spin text-cyan-500 text-lg" />
              <span className="ml-3 text-zinc-500 text-sm">加载已提交成绩...</span>
            </div>
          )}

          {!loadingSubmitted && songs.map((song, idx) => {
            const local = localScores[song.songName] || { achievement: '', dxScore: '' };
            const grade = local.achievement !== '' ? getGrade(Number(local.achievement)) : null;
            const status = getSongStatus(song.songName);

            return (
              <div key={idx} className="bg-black/40 border border-white/[0.05] rounded-xl p-4 hover:border-white/10 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-sm">{song.songName}</span>
                    <span className="text-[10px] text-zinc-500">{song.difficulty} · Lv{song.level}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                    <span className={`text-[10px] font-bold ${status.color}`}>{status.label}</span>
                  </div>
                </div>

                <div className="flex gap-3 items-center">
                  {/* 达成率 */}
                  <div className="flex-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">达成率</label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      max="101"
                      value={local.achievement}
                      onChange={e => handleChange(song.songName, 'achievement', e.target.value)}
                      placeholder="0.0000"
                      className={`w-full bg-black/40 border rounded-lg px-3 py-2 text-center text-xs font-mono outline-none transition-all focus:ring-1 ${
                        !status.submitted
                          ? 'border-cyan-500/50 text-cyan-300 focus:ring-cyan-500/30'
                          : 'border-emerald-500/30 text-emerald-300 focus:ring-emerald-500/20'
                      } ${grade ? grade.color : 'text-zinc-400'}`}
                    />
                  </div>
                  {/* DX 分 */}
                  <div className="w-28">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">DX Score</label>
                    <input
                      type="number"
                      min="0"
                      value={local.dxScore}
                      onChange={e => handleChange(song.songName, 'dxScore', e.target.value)}
                      placeholder="0"
                      className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-center text-xs font-mono text-zinc-400 outline-none transition-all focus:ring-1 focus:border-white/20 focus:ring-white/10 placeholder:text-zinc-700"
                    />
                  </div>
                  {/* 评级 */}
                  <div className="w-10 text-center pt-5">
                    {grade && (
                      <span className={`text-xs font-bold ${grade.color}`}>{grade.label}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 底部操作 */}
        <div className="p-6 pt-4 border-t border-white/[0.05] space-y-3">
          {/* 提交结果 */}
          {submitResult && (
            <div className={`px-4 py-2.5 rounded-xl border text-xs flex items-center gap-2 ${
              submitResult.errors?.length
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              {submitResult.errors?.length ? <FaExclamationTriangle /> : <FaCheck />}
              <span>已录入 {submitResult.updated} 条</span>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 rounded-xl text-sm font-bold transition-all">
              关闭
            </button>
            <button
              onClick={async () => {
                await onSubmit(userId);
                // 提交后重置 loaded，下次 Modal 打开时重新拉取已提交成绩回填
                setLoaded(false);
              }}
              disabled={submitting}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/30 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <FaSpinner className="animate-spin" /> : <FaSave />}
              {submitting ? '提交中...' : '批量提交'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// 全量矩阵视图（降级选项 — 只读预览，编辑请切换回选手列表模式）
// ============================================================
const FullMatrixView = ({
  songs,
  registrations,
  cachedScores,
  getCellData,
  isManager,
}) => {
  if (songs.length === 0) return null;

  return (
    <>
      {/* 只读提示 */}
      {isManager && (
        <div className="px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-3">
          <p className="text-xs text-amber-400 flex items-center gap-2">
            <FaExclamationTriangle className="flex-shrink-0" />
            全量矩阵仅为只读预览，编辑请切换到选手列表模式
          </p>
        </div>
      )}
    <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
      <table className="w-full text-sm border-collapse min-w-[600px]">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="text-left px-4 py-3 text-xs text-zinc-500 font-bold uppercase tracking-wider bg-white/[0.02] min-w-[140px] sticky left-0 z-10 border-r border-white/[0.05]">选手</th>
            {songs.map((song, i) => (
              <th key={i} className="px-4 py-3 text-center text-xs text-zinc-400 font-bold bg-white/[0.02] min-w-[130px]">
                <div className="truncate max-w-[120px]">{song.songName}</div>
                <div className="text-[10px] text-zinc-600 font-normal mt-0.5">{song.difficulty} · Lv{song.level}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {registrations.length === 0 ? (
            <tr><td colSpan={songs.length + 1} className="text-center text-zinc-600 py-10 text-sm">暂无选手报名</td></tr>
          ) : (
            registrations.map((reg, rIdx) => {
              const userId = reg.userId?._id || reg.userId;
              const username = reg.userId?.username || '未知';
              const avatarUrl = reg.userId?.avatarUrl;
              return (
                <tr key={userId} className={`border-b border-white/[0.04] transition-colors ${rIdx % 2 === 0 ? '' : 'bg-white/[0.01]'} hover:bg-white/[0.03]`}>
                  <td className="px-4 py-3 sticky left-0 bg-[#0c0c11] border-r border-white/[0.05] z-10">
                    <div className="flex items-center gap-2">
                      <img src={avatarUrl || '/assets/logos.png'} alt="" className="w-7 h-7 rounded-full object-cover bg-black border border-white/10 flex-shrink-0" />
                      <span className="text-zinc-200 font-medium text-xs truncate max-w-[90px]">{username}</span>
                    </div>
                  </td>
                  {songs.map((song, sIdx) => {
                    const cell = getCellData(userId, song.songName);
                    const grade = cell.achievement !== '' ? getGrade(Number(cell.achievement)) : null;
                    const isPending = cachedScores.some(s => s.userId === userId && s.songName === song.songName);
                    return (
                      <td key={sIdx} className="px-2 py-2 text-center">
                        {isManager ? (
                          <div className="relative flex gap-1 items-center justify-center">
                            <input type="number" step="0.0001" min="0" max="101"
                              value={cell.achievement}
                              readOnly
                              placeholder="达成率"
                              className={`w-[72px] bg-black/40 border rounded-lg px-1.5 py-1.5 text-center text-[11px] font-mono outline-none cursor-not-allowed opacity-70 ${
                                isPending ? 'border-cyan-500/50 text-cyan-300' : 'border-white/[0.08] text-zinc-400'
                              } ${grade ? grade.color : ''}`} />
                            <input type="number" min="0" value={cell.dxScore} placeholder="DX" readOnly
                              className="w-[56px] bg-black/40 border border-white/[0.08] rounded-lg px-1.5 py-1.5 text-center text-[11px] font-mono text-zinc-400 cursor-not-allowed opacity-70" />
                          </div>
                        ) : (
                          <div className={`font-mono text-xs font-bold ${grade ? grade.color : 'text-zinc-700'}`}>
                            {cell.achievement !== '' ? (
                              <div><div>{Number(cell.achievement).toFixed(4)}</div>
                                <div className="text-[10px] opacity-70">{grade?.label}{cell.dxScore !== '' && ` · ${cell.dxScore}DX`}</div>
                              </div>
                            ) : '—'}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
    </>
  );
};

// ============================================================
// 主组件
// ============================================================
const QualifierScoreMatrix = ({
  tournamentId,
  songs = [],
  registrations = [],
  isManager = false,
}) => {
  const {
    scores: cachedScores,
    cacheScore, removeCachedScore, clearCachedScores,
    submitScores,
  } = useQualifierStore();

  // ---- 本地状态 ----
  const [selectedPlayer, setSelectedPlayer] = useState(null); // 展开 Modal 的选手
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFullMatrix, setShowFullMatrix] = useState(false);

  // CSV 导入
  const [csvErrors, setCsvErrors] = useState([]);
  const [csvPreviewing, setCsvPreviewing] = useState(false);
  const [csvPreviewData, setCsvPreviewData] = useState([]);
  const fileInputRef = useRef(null);

  // ---- 工具函数 ----
  const getCellData = (userId, songName) => {
    const cached = cachedScores.find(s => s.userId === userId && s.songName === songName);
    return cached
      ? { achievement: cached.achievement ?? '', dxScore: cached.dxScore ?? '' }
      : { achievement: '', dxScore: '' };
  };

  // ---- 缓存操作 ----
  const handleCacheScore = (entry) => cacheScore(entry);
  const handleRemoveCachedScore = (userId, songName) => removeCachedScore(userId, songName);

  // ---- 提交 ----
  const handleSubmit = async (targetUserId = null) => {
    const toSubmit = targetUserId
      ? cachedScores.filter(s => s.userId === targetUserId)
      : cachedScores;

    if (toSubmit.length === 0) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await submitScores(tournamentId, toSubmit);
      setSubmitResult(res.data);
    } catch (err) {
      setSubmitResult({ updated: 0, skipped: 0, errors: [err.msg || '提交失败'] });
    } finally {
      setSubmitting(false);
    }
  };

  // ---- CSV 导入 ----
  const handleCSVUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const rows = parseCSV(evt.target.result);
        const errors = [];
        const parsed = [];
        rows.forEach((row, i) => {
          const userId = row['userId'] || row['user_id'] || row['uid'];
          const songName = row['songName'] || row['song_name'] || row['曲目'];
          const achievement = parseFloat(row['achievement'] || row['达成率'] || '0');
          const dxScore = parseInt(row['dxScore'] || row['dx_score'] || '0', 10);
          if (!userId) { errors.push(`第 ${i + 2} 行：缺少 userId`); return; }
          if (!songName) { errors.push(`第 ${i + 2} 行：缺少 songName`); return; }
          if (isNaN(achievement) || achievement < 0 || achievement > 101) {
            errors.push(`第 ${i + 2} 行：achievement 不合法 (${row['achievement']})`);
            return;
          }
          const songExists = songs.some(s => s.songName === songName);
          if (!songExists) { errors.push(`第 ${i + 2} 行：曲目"${songName}"不在预选赛曲目列表中`); return; }
          parsed.push({ userId, songName, achievement, dxScore });
        });
        setCsvErrors(errors);
        setCsvPreviewData(parsed);
        setCsvPreviewing(true);
      } catch (err) { setCsvErrors(['CSV 解析失败：' + err.message]); }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  }, [songs]);

  const handleCSVImport = useCallback(() => {
    csvPreviewData.forEach(entry => cacheScore(entry));
    setCsvPreviewing(false);
    setCsvPreviewData([]);
    setCsvErrors([]);
  }, [csvPreviewData, cacheScore]);

  // ---- 搜索/过滤 ----
  const filteredRegs = registrations.filter(reg => {
    if (!searchQuery) return true;
    const username = reg.userId?.username || '';
    return username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // 计算每位选手的录入进度
  const playerProgress = {};
  registrations.forEach(reg => {
    const userId = reg.userId?._id || reg.userId;
    let done = 0;
    songs.forEach(s => {
      const cached = cachedScores.find(c => c.userId === userId && c.songName === s.songName);
      if (cached) done++;
    });
    playerProgress[userId] = { done, total: songs.length };
  });

  // ---- 空状态 ----
  if (songs.length === 0) {
    return (
      <div className="text-zinc-500 text-center py-12 text-sm">
        <FaMusic className="text-2xl mx-auto mb-3 text-zinc-700" />
        尚未设置预选赛曲目，请在曲目设置中添加
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 工具栏 */}
      {isManager && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 border border-cyan-500/30 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all"
            >
              <FaUpload /> 导入 CSV
            </button>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />

            {cachedScores.length > 0 && (
              <>
                <span className="text-[11px] text-zinc-500">{cachedScores.length} 条待提交</span>
                <button
                  onClick={() => handleSubmit()}
                  disabled={submitting}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {submitting ? <FaSpinner className="animate-spin" /> : <FaSave />} 全部提交
                </button>
                <button
                  onClick={clearCachedScores}
                  className="px-2.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all"
                >
                  <FaTimes /> 清空
                </button>
              </>
            )}

            {/* 全量矩阵切换 */}
            <button
              onClick={() => setShowFullMatrix(!showFullMatrix)}
              className={`px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5 border transition-all ${
                showFullMatrix
                  ? 'bg-purple-600/20 text-purple-400 border-purple-500/30'
                  : 'bg-white/5 text-zinc-400 border-white/10 hover:border-white/20'
              }`}
            >
              {showFullMatrix ? <FaList /> : <FaTable />}
              {showFullMatrix ? '选手列表' : '全量矩阵'}
            </button>
          </div>
        </div>
      )}

      {/* 提交结果 */}
      <AnimatePresence>
        {submitResult && !selectedPlayer && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`px-4 py-3 rounded-xl border text-sm flex items-center gap-3 ${
              submitResult.errors?.length
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}
          >
            {submitResult.errors?.length ? <FaExclamationTriangle /> : <FaCheck />}
            <span>已录入 {submitResult.updated} 条{submitResult.skipped > 0 && `，跳过 ${submitResult.skipped} 条`}</span>
            <button onClick={() => setSubmitResult(null)} className="ml-auto opacity-60 hover:opacity-100"><FaTimes /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSV 预览 */}
      <AnimatePresence>
        {csvPreviewing && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-zinc-900/50 border border-white/10 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">CSV 预览 — {csvPreviewData.length} 条数据</h4>
              <button onClick={() => setCsvPreviewing(false)} className="text-zinc-500 hover:text-zinc-300"><FaTimes /></button>
            </div>
            {csvErrors.length > 0 && (
              <div className="space-y-1">
                {csvErrors.map((e, i) => (
                  <p key={i} className="text-red-400 text-xs flex items-center gap-2"><FaExclamationTriangle className="flex-shrink-0" />{e}</p>
                ))}
              </div>
            )}
            <div className="max-h-40 overflow-y-auto space-y-1 text-xs font-mono text-zinc-300">
              {csvPreviewData.slice(0, 20).map((row, i) => (
                <div key={i} className="flex gap-3 px-2 py-1 bg-white/[0.03] rounded-lg">
                  <span className="text-zinc-500 w-4">{i + 1}</span>
                  <span className="text-cyan-400 flex-1 truncate">{row.userId}</span>
                  <span className="text-amber-400 w-28 truncate">{row.songName}</span>
                  <span className="text-emerald-400 w-16 text-right">{row.achievement}</span>
                </div>
              ))}
              {csvPreviewData.length > 20 && <p className="text-zinc-600 text-center">... 共 {csvPreviewData.length} 条</p>}
            </div>
            {csvPreviewData.length > 0 && (
              <button onClick={handleCSVImport} className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition-all">
                导入至待提交队列
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== 选手列表视图（默认） ========== */}
      {!showFullMatrix && (
        <>
          {/* 搜索框 */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索选手..."
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-600"
            />
          </div>

          {/* 选手列表 */}
          {filteredRegs.length === 0 ? (
            <div className="text-zinc-500 text-center py-12 text-sm">
              <FaUser className="text-2xl mx-auto mb-3 text-zinc-700" />
              {searchQuery ? '没有匹配的选手' : '暂无选手报名'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filteredRegs
                .sort((a, b) => {
                  const aId = a.userId?._id || a.userId;
                  const bId = b.userId?._id || b.userId;
                  const aDone = playerProgress[aId]?.done || 0;
                  const bDone = playerProgress[bId]?.done || 0;
                  // 未录入的排前面
                  return aDone - bDone;
                })
                .map((reg) => {
                  const userId = reg.userId?._id || reg.userId;
                  const username = reg.userId?.username || '未知';
                  const avatarUrl = reg.userId?.avatarUrl;
                  const progress = playerProgress[userId] || { done: 0, total: songs.length };
                  const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
                  const isComplete = progress.done === progress.total;
                  const hasAny = progress.done > 0;

                  return (
                    <button
                      key={userId}
                      onClick={() => {
                        setSelectedPlayer(reg);
                        setSubmitResult(null);
                      }}
                      className="flex items-center gap-4 w-full text-left px-5 py-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] hover:border-white/10 transition-all group"
                    >
                      {/* 头像 */}
                      <img src={avatarUrl || '/assets/logos.png'} alt="" className="w-10 h-10 rounded-full object-cover bg-black border border-white/10 flex-shrink-0" />

                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">{username}</span>
                          {/* 状态标签 */}
                          {isComplete && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1">
                              <FaCheckCircle /> 完成
                            </span>
                          )}
                          {!isComplete && hasAny && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-bold flex items-center gap-1">
                              <FaEdit /> 部分录入
                            </span>
                          )}
                          {!hasAny && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800/50 text-zinc-500 border border-zinc-700/30 font-bold">
                              未录入
                            </span>
                          )}
                        </div>

                        {/* 进度条 */}
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isComplete ? 'bg-emerald-500' : hasAny ? 'bg-cyan-500' : 'bg-zinc-700'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-zinc-500">{progress.done}/{progress.total}</span>
                        </div>
                      </div>

                      {/* 展开箭头 */}
                      <FaChevronRight className="text-zinc-600 group-hover:text-zinc-400 transition-colors text-xs" />
                    </button>
                  );
                })}
            </div>
          )}
        </>
      )}

      {/* ========== 全量矩阵视图（降级） ========== */}
      {showFullMatrix && (
        <FullMatrixView
          songs={songs}
          registrations={registrations}
          cachedScores={cachedScores}
          getCellData={getCellData}
          handleCellEdit={() => {}}
          isManager={isManager}
        />
      )}

      {/* 选手成绩录入 Modal */}
      {selectedPlayer && (
        <ScoreEntryModal
          player={selectedPlayer}
          songs={songs}
          tournamentId={tournamentId}
          cachedScores={cachedScores}
          onCacheScore={handleCacheScore}
          onRemoveCachedScore={handleRemoveCachedScore}
          onClose={() => { setSelectedPlayer(null); setSubmitResult(null); }}
          onSubmit={(userId) => handleSubmit(userId)}
          submitting={submitting}
          submitResult={submitResult}
        />
      )}

      {/* CSV 格式提示 */}
      {isManager && (
        <div className="px-4 py-3 bg-white/[0.02] border border-white/[0.05] rounded-xl text-xs text-zinc-500 font-mono">
          <span className="text-zinc-400 font-bold">CSV 格式：</span>
          {' '}userId,songName,achievement,dxScore
        </div>
      )}
    </div>
  );
};

export default QualifierScoreMatrix;
