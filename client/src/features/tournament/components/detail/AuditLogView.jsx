// ============================================================
// AuditLogView.jsx — 审计日志时间线组件
// b1.7.06 | #5.3 审计日志系统
// 赛后全公开/赛前仅管理
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { getAuditLog } from '../../api/tournamentApi';
import { useToast } from '../../../../context/ToastContext';
import {
  FaSpinner, FaHistory, FaInfoCircle, FaExclamationTriangle,
  FaArrowRight, FaChevronLeft, FaChevronRight,
  FaUndo, FaForward, FaMusic, FaEdit, FaSave, FaUsers,
  FaSitemap, FaTrophy, FaArchive, FaCheckCircle
} from 'react-icons/fa';

const ACTION_CONFIG = {
  transition:         { label: '状态变更', color: 'text-blue-400',    bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: FaForward },
  rollback:           { label: '回退',     color: 'text-red-400',     bg: 'bg-red-500/10',   border: 'border-red-500/20',   icon: FaUndo },
  score_entry:        { label: '成绩录入',  color: 'text-emerald-400', bg: 'bg-emerald-500/10',border: 'border-emerald-500/20',icon: FaMusic },
  score_edit:         { label: '成绩修改',  color: 'text-yellow-400',  bg: 'bg-yellow-500/10', border: 'border-yellow-500/20',icon: FaEdit },
  match_update:       { label: '比赛更新',  color: 'text-purple-400',  bg: 'bg-purple-500/10', border: 'border-purple-500/20',icon: FaTrophy },
  bracket_generate:   { label: '对阵表生成', color: 'text-cyan-400',   bg: 'bg-cyan-500/10',  border: 'border-cyan-500/20',  icon: FaSitemap },
  group_update:       { label: '分组修改',  color: 'text-indigo-400',  bg: 'bg-indigo-500/10', border: 'border-indigo-500/20',icon: FaUsers },
  registration_modify:{ label: '报名修改',  color: 'text-green-400',   bg: 'bg-green-500/10',  border: 'border-green-500/20', icon: FaEdit },
  info_edit:          { label: '信息编辑',  color: 'text-zinc-400',    bg: 'bg-zinc-500/10',  border: 'border-zinc-500/20',  icon: FaInfoCircle },
  form_edit:          { label: '表单编辑',  color: 'text-zinc-400',    bg: 'bg-zinc-500/10',  border: 'border-zinc-500/20',  icon: FaEdit },
  qualifier_songs_update: { label: '预选曲目更新', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', icon: FaMusic },
  archive:            { label: '归档',      color: 'text-zinc-600',    bg: 'bg-zinc-800/30',  border: 'border-zinc-700/30',  icon: FaArchive },
};

const ACTION_LABELS = Object.fromEntries(
  Object.entries(ACTION_CONFIG).map(([k, v]) => [k, v.label])
);

/** 格式化相对时间 */
function formatTime(isoStr) {
  const d = new Date(isoStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHr < 24) return `${diffHr} 小时前`;
  if (diffDay < 7) return `${diffDay} 天前`;
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const AuditLogView = ({
  tournamentId,
  isPublic = false, // true=赛后公开(只读), false=管理端(完整+筛选)
}) => {
  const { addToast } = useToast();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 筛选（仅管理端）
  const [actionFilter, setActionFilter] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAuditLog(tournamentId);
      const data = res.data;
      setLogs(data.logs || []);
    } catch (err) {
      setError(err.response?.data?.msg || '加载操作记录失败');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    if (tournamentId) loadLogs();
  }, [tournamentId, loadLogs]);

  // ---- 过滤 ----
  let filteredLogs = [...logs];

  if (actionFilter.length > 0) {
    filteredLogs = filteredLogs.filter(l => actionFilter.includes(l.action));
  }
  if (dateFrom) {
    const from = new Date(dateFrom);
    filteredLogs = filteredLogs.filter(l => new Date(l.operatedAt) >= from);
  }
  if (dateTo) {
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    filteredLogs = filteredLogs.filter(l => new Date(l.operatedAt) <= to);
  }

  // ---- 分页 ----
  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);
  const pagedLogs = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ---- 操作类型选择器 ----
  const actionOptions = Object.keys(ACTION_CONFIG);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <FaSpinner className="animate-spin text-2xl text-cyan-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 md:p-8 text-center">
        <FaExclamationTriangle className="text-2xl text-red-400 mx-auto mb-3" />
        <p className="text-red-400 text-sm">{error}</p>
        <button onClick={loadLogs} className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-all">
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#15151e] border border-white/[0.05] rounded-2xl p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <FaHistory className="text-purple-400" />
          操作记录
          {isPublic && <span className="text-[10px] text-zinc-500 font-normal">（赛后公开）</span>}
        </h3>
        <span className="text-xs text-zinc-500">{filteredLogs.length} 条记录</span>
      </div>

      {/* 管理端筛选栏 */}
      {!isPublic && (
        <div className="flex flex-wrap gap-3 mb-6 p-4 bg-black/30 border border-white/[0.05] rounded-xl">
          {/* 日期范围 */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-zinc-500 uppercase font-bold">从</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-zinc-500 uppercase font-bold">至</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
              className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
            />
          </div>

          {/* 操作类型筛选 */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] text-zinc-500 uppercase font-bold mr-1">类型</span>
            {actionOptions.map(action => {
              const cfg = ACTION_CONFIG[action];
              const isActive = actionFilter.includes(action);
              return (
                <button
                  key={action}
                  onClick={() => {
                    setActionFilter(prev =>
                      isActive ? prev.filter(a => a !== action) : [...prev, action]
                    );
                    setPage(1);
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                    isActive
                      ? `${cfg.bg} ${cfg.color} ${cfg.border}`
                      : 'bg-white/[0.03] text-zinc-500 border-white/[0.05] hover:border-white/20'
                  }`}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {actionFilter.length > 0 && (
            <button
              onClick={() => { setActionFilter([]); setPage(1); }}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 underline"
            >
              清除筛选
            </button>
          )}
        </div>
      )}

      {/* 空状态 */}
      {pagedLogs.length === 0 && (
        <div className="text-center py-16">
          <FaHistory className="text-3xl text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">暂无操作记录</p>
        </div>
      )}

      {/* 时间线列表 */}
      {pagedLogs.length > 0 && (
        <div className="space-y-2">
          {pagedLogs.map((log, idx) => {
            const cfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.info_edit;
            const Icon = cfg.icon;

            let detailText = cfg.label;
            if (log.fromStatus && log.toStatus) {
              detailText += `: ${log.fromStatus} → ${log.toStatus}`;
            }
            if (log.note) {
              detailText += ` · ${log.note}`;
            }

            return (
              <div
                key={idx}
                className="flex items-start gap-4 px-4 py-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/[0.05]"
              >
                {/* 图标 */}
                <div className={`w-8 h-8 rounded-lg ${cfg.bg} border ${cfg.border} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <Icon className={`text-xs ${cfg.color}`} />
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">{log.operatedBy?.username || (log.operatedBy === null ? '系统' : '未知')}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${cfg.color} ${cfg.bg}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">{detailText}</p>
                </div>

                {/* 时间 */}
                <div className="text-[10px] text-zinc-600 flex-shrink-0 whitespace-nowrap pt-1" title={new Date(log.operatedAt).toLocaleString('zh-CN')}>
                  {formatTime(log.operatedAt)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-400 rounded-lg text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <FaChevronLeft />
          </button>
          <span className="text-xs text-zinc-500">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-400 rounded-lg text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <FaChevronRight />
          </button>
        </div>
      )}
    </div>
  );
};

export default AuditLogView;
