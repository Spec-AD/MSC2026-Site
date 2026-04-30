// ============================================================
// QualifierScoreMatrix.jsx — 预选赛成绩矩阵
// P2 组件 | 依据：Tournament_API_Contract §1.2 + spec §十 批量录入
// 横轴：选手 | 纵轴：曲目 | 支持批量提交 + CSV 导入（papaparse）
// ============================================================
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQualifierStore } from '../../store/qualifierStore';
import {
  FaMusic, FaUpload, FaSpinner, FaSave, FaCheck,
  FaTimes, FaExclamationTriangle, FaPlus
} from 'react-icons/fa';

// 轻量 CSV 解析（不引入 papaparse，减少 bundle；后续按需升级）
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

const QualifierScoreMatrix = ({
  tournamentId,
  songs = [],          // QualifierSong[]
  registrations = [],  // Registration[]
  isManager = false,
}) => {
  const {
    scores: cachedScores,
    cacheScore, removeCachedScore, clearCachedScores,
    submitScores,
  } = useQualifierStore();

  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null); // { updated, skipped, errors }
  const [csvErrors, setCsvErrors] = useState([]);
  const [csvPreviewing, setCsvPreviewing] = useState(false);
  const [csvPreviewData, setCsvPreviewData] = useState([]);
  const fileInputRef = useRef(null);

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

          // 验证曲目是否在 songs 列表中
          const songExists = songs.some(s => s.songName === songName);
          if (!songExists) {
            errors.push(`第 ${i + 2} 行：曲目"${songName}"不在预选赛曲目列表中`);
            return;
          }

          parsed.push({ userId, songName, achievement, dxScore });
        });

        setCsvErrors(errors);
        setCsvPreviewData(parsed);
        setCsvPreviewing(true);
      } catch (err) {
        setCsvErrors(['CSV 解析失败：' + err.message]);
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = ''; // 允许重复上传同一文件
  }, [songs]);

  const handleCSVImport = useCallback(() => {
    csvPreviewData.forEach(entry => cacheScore(entry));
    setCsvPreviewing(false);
    setCsvPreviewData([]);
    setCsvErrors([]);
  }, [csvPreviewData, cacheScore]);

  // ---- 批量提交 ----
  const handleSubmit = async () => {
    if (cachedScores.length === 0) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await submitScores(tournamentId, cachedScores);
      setSubmitResult(res.data);
    } catch (err) {
      setSubmitResult({ updated: 0, skipped: 0, errors: [err.msg || '提交失败'] });
    } finally {
      setSubmitting(false);
    }
  };

  // ---- 单格直接编辑（Achievement + DX Score） ----
  const getCellData = (userId, songName) => {
    const cached = cachedScores.find(s => s.userId === userId && s.songName === songName);
    return cached
      ? { achievement: cached.achievement ?? '', dxScore: cached.dxScore ?? '' }
      : { achievement: '', dxScore: '' };
  };

  const handleCellEdit = (userId, songName, field, value) => {
    const prev = cachedScores.find(s => s.userId === userId && s.songName === songName);
    if (!prev && (field === 'achievement' ? isNaN(parseFloat(value)) : isNaN(parseInt(value, 10)))) return;

    const achievement = field === 'achievement' ? parseFloat(value) : (prev?.achievement ?? 0);
    const dxScore = field === 'dxScore' ? parseInt(value, 10) || 0 : (prev?.dxScore ?? 0);

    if (isNaN(achievement) || achievement === 0) {
      removeCachedScore(userId, songName);
      return;
    }
    cacheScore({ userId, songName, achievement, dxScore });
  };

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
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
          >
            <FaUpload /> 导入 CSV
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />

          {cachedScores.length > 0 && (
            <>
              <span className="text-xs text-zinc-500">{cachedScores.length} 条待提交</span>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {submitting ? <FaSpinner className="animate-spin" /> : <FaSave />} 批量提交
              </button>
              <button
                onClick={clearCachedScores}
                className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
              >
                <FaTimes /> 清空
              </button>
            </>
          )}
        </div>
      )}

      {/* 提交结果 */}
      <AnimatePresence>
        {submitResult && (
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
            {submitResult.errors?.length
              ? <FaExclamationTriangle />
              : <FaCheck />}
            <span>
              已录入 {submitResult.updated} 条
              {submitResult.skipped > 0 && `，跳过 ${submitResult.skipped} 条`}
              {submitResult.errors?.length > 0 && `，${submitResult.errors.length} 条错误`}
            </span>
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
              {csvPreviewData.length > 20 && (
                <p className="text-zinc-600 text-center">... 共 {csvPreviewData.length} 条</p>
              )}
            </div>
            {csvPreviewData.length > 0 && (
              <button
                onClick={handleCSVImport}
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition-all"
              >
                导入至待提交队列
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 成绩矩阵表格 */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="w-full text-sm border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-bold uppercase tracking-wider bg-white/[0.02] min-w-[140px] sticky left-0 z-10 border-r border-white/[0.05]">
                选手
              </th>
              {songs.map((song, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-center text-xs text-zinc-400 font-bold bg-white/[0.02] min-w-[130px]"
                >
                  <div className="truncate max-w-[120px]">{song.songName}</div>
                  <div className="text-[10px] text-zinc-600 font-normal mt-0.5">
                    {song.difficulty} · Lv{song.level} · Const {song.constant}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {registrations.length === 0 ? (
              <tr>
                <td colSpan={songs.length + 1} className="text-center text-zinc-600 py-10 text-sm">
                  暂无选手报名
                </td>
              </tr>
            ) : (
              registrations.map((reg, rIdx) => {
                const userId = reg.userId?._id || reg.userId;
                const username = reg.userId?.username || '未知';
                const avatarUrl = reg.userId?.avatarUrl;

                return (
                  <tr
                    key={userId}
                    className={`border-b border-white/[0.04] transition-colors ${rIdx % 2 === 0 ? '' : 'bg-white/[0.01]'} hover:bg-white/[0.03]`}
                  >
                    {/* 选手列（sticky） */}
                    <td className="px-4 py-3 sticky left-0 bg-[#0c0c11] border-r border-white/[0.05] z-10">
                      <div className="flex items-center gap-2">
                        <img
                          src={avatarUrl || '/assets/logos.png'}
                          alt=""
                          className="w-7 h-7 rounded-full object-cover bg-black border border-white/10 flex-shrink-0"
                        />
                        <span className="text-zinc-200 font-medium text-xs truncate max-w-[90px]">{username}</span>
                      </div>
                    </td>

                    {/* 成绩列 */}
                    {songs.map((song, sIdx) => {
                      const cell = getCellData(userId, song.songName);
                      const grade = cell.achievement !== '' ? getGrade(Number(cell.achievement)) : null;
                      const isPending = cachedScores.some(
                        s => s.userId === userId && s.songName === song.songName
                      );

                      return (
                        <td key={sIdx} className="px-2 py-2 text-center">
                          {isManager ? (
                            <div className="relative flex gap-1 items-center">
                              <input
                                type="number"
                                step="0.0001"
                                min="0"
                                max="101"
                                value={cell.achievement}
                                onChange={e => handleCellEdit(userId, song.songName, 'achievement', e.target.value)}
                                placeholder="达成率"
                                className={`w-[72px] bg-black/40 border rounded-lg px-1.5 py-1.5 text-center text-[11px] font-mono outline-none transition-all focus:ring-1 ${
                                  isPending
                                    ? 'border-cyan-500/50 text-cyan-300 focus:ring-cyan-500/30'
                                    : 'border-white/[0.08] text-zinc-400 focus:border-white/20 focus:ring-white/10'
                                } ${grade ? grade.color : ''}`}
                              />
                              <input
                                type="number"
                                min="0"
                                value={cell.dxScore}
                                onChange={e => handleCellEdit(userId, song.songName, 'dxScore', e.target.value)}
                                placeholder="DX"
                                className="w-[56px] bg-black/40 border border-white/[0.08] rounded-lg px-1.5 py-1.5 text-center text-[11px] font-mono text-zinc-400 outline-none transition-all focus:ring-1 focus:border-white/20 focus:ring-white/10 placeholder:text-zinc-700"
                              />
                              {isPending && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-500 rounded-full" />
                              )}
                            </div>
                          ) : (
                            <div className={`font-mono text-xs font-bold ${grade ? grade.color : 'text-zinc-700'}`}>
                              {cell.achievement !== '' ? (
                                <div>
                                  <div>{Number(cell.achievement).toFixed(4)}</div>
                                  <div className="text-[10px] opacity-70">
                                    {grade?.label}
                                    {cell.dxScore !== '' && ` · ${cell.dxScore}DX`}
                                  </div>
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
