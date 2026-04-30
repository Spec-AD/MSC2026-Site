import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTournamentStore, useBracketStore, useQualifierStore } from '../features/tournament/store';
import { selectStatusLabel, selectStatusColor } from '../features/tournament/store/tournamentStore';
import QualifierScoreMatrix from '../features/tournament/components/qualifier/QualifierScoreMatrix';
import QualifierRanking from '../features/tournament/components/qualifier/QualifierRanking';
import BracketView from '../features/tournament/components/bracket/BracketView';
import GroupAllocationPanel from '../features/tournament/components/bracket/GroupAllocationPanel';
import ResultPodium from '../features/tournament/components/common/ResultPodium';
import SongSearchInput from '../features/tournament/components/common/SongSearchInput';
import {
  FaArrowLeft, FaSpinner, FaUsers, FaMusic, FaSitemap, FaPlus, FaTimes,
  FaTrophy, FaEdit, FaSave, FaClipboardList, FaCheckCircle, FaCalendarAlt,
  FaExchangeAlt, FaUndo, FaForward, FaCog, FaLock, FaPlay, FaArchive,
  FaDownload
} from 'react-icons/fa';

// ---- 状态机映射 ----
const STATUS_ORDER = ['DRAFT', 'REGISTRATION', 'QUALIFYING', 'ONGOING', 'FINISHED', 'ARCHIVED'];
const ALLOWED_TRANSITIONS = {
  DRAFT: ['REGISTRATION'],
  REGISTRATION: ['DRAFT', 'QUALIFYING'],
  QUALIFYING: ['ONGOING'],
  ONGOING: ['FINISHED'],
  FINISHED: ['ONGOING', 'ARCHIVED'],
  ARCHIVED: [],
};

const TRANSITION_LABELS = {
  REGISTRATION: { label: '发布报名', icon: FaPlay, color: 'green' },
  QUALIFYING: { label: '进入预选', icon: FaForward, color: 'purple' },
  ONGOING: { label: '开始正赛', icon: FaTrophy, color: 'amber' },
  FINISHED: { label: '结束赛事', icon: FaCheckCircle, color: 'gray' },
  ARCHIVED: { label: '归档赛事', icon: FaArchive, color: 'zinc' },
  DRAFT: { label: '撤回至草稿', icon: FaUndo, color: 'zinc' },
};

const TournamentManage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  // ---- Stores ----
  const {
    tournament, loading, error,
    fetchTournament, transition, rollback,
    update: updateTournament,
  } = useTournamentStore();
  const {
    matches: bracketMatches, bracketGenerated,
    fetchBracket, generate: generateBracket,
  } = useBracketStore();
  const { songs: qualSongs, setSongs } = useQualifierStore();

  // ---- Local UI state ----
  const [activeTab, setActiveTab] = useState('state'); // default to state machine
  const [isSaving, setIsSaving] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionErrors, setTransitionErrors] = useState([]);

  // 编辑信息
  const [editInfo, setEditInfo] = useState({});
  const [formFields, setFormFields] = useState([]);
  const [localQualSongs, setLocalQualSongs] = useState([]);
  const [scoreData, setScoreData] = useState({ targetUid: '', songName: '', achievement: '', dxScore: '' });
  const [groups, setGroups] = useState([]);
  const [localMatches, setLocalMatches] = useState([]);
  const [results, setResults] = useState([]);
  const [resultAnnouncement, setResultAnnouncement] = useState('');
  const [scoreInputs, setScoreInputs] = useState([]); // 成绩录入面板

  // ---- Data load ----
  const loadTournament = useCallback(async () => {
    try {
      const data = await fetchTournament(id);
      setEditInfo({
        title: data.title, subtitle: data.subtitle || '', description: data.description || '',
        rules: data.rules || '', coverUrl: data.coverUrl || '', status: data.status,
        registrationStart: data.registrationStart ? new Date(data.registrationStart).toISOString().slice(0, 16) : '',
        registrationEnd: data.registrationEnd ? new Date(data.registrationEnd).toISOString().slice(0, 16) : '',
        startTime: data.startTime ? new Date(data.startTime).toISOString().slice(0, 16) : '',
        endTime: data.endTime ? new Date(data.endTime).toISOString().slice(0, 16) : '',
      });
      setFormFields(data.registrationForm || []);
      setLocalQualSongs(data.qualifierSongs || []);
      setSongs(data.qualifierSongs || []);
      setGroups(data.groups || []);
      setLocalMatches(data.matches || []);
      setResults(data.results || []);
      setResultAnnouncement(data.resultAnnouncement || '');
    } catch (err) {
      addToast('加载赛事失败', 'error');
    }
  }, [id, fetchTournament, setSongs, addToast]);

  useEffect(() => { loadTournament(); }, [loadTournament]);

  // Load bracket when tournament is in ONGOING+
  useEffect(() => {
    if (tournament && ['ONGOING', 'FINISHED', 'ARCHIVED'].includes(tournament.status)) {
      fetchBracket(id).catch(() => {});
    }
  }, [tournament?.status, id, fetchBracket]);

  // ---- Guards ----
  if (!user || !['ADM', 'CHM', 'TO'].includes(user.role)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white">
        <h1 className="text-3xl font-bold text-red-500 mb-4">无权访问</h1>
        <button onClick={() => navigate('/tournaments')} className="mt-4 px-6 py-2 bg-white/10 rounded-full hover:bg-white/20">返回赛事大厅</button>
      </div>
    );
  }

  if (loading || !tournament) {
    return <div className="min-h-screen flex items-center justify-center"><FaSpinner className="animate-spin text-4xl text-cyan-500" /></div>;
  }

  const isArchived = tournament.status === 'ARCHIVED';
  const availableTransitions = isArchived ? [] : (ALLOWED_TRANSITIONS[tournament.status] || []);
  const isAdm = user.role === 'ADM';
  const isManager = isAdm || (user.role === 'CHM' && tournament.managers?.includes(user._id));

  // ==================== State Machine Handlers ====================
  const handleTransition = async (targetStatus) => {
    setIsTransitioning(true);
    setTransitionErrors([]);
    try {
      const result = await transition(id, targetStatus);
      addToast(`赛事已推至 ${selectStatusLabel(targetStatus)}`, 'success');
      setTransitionErrors([]);
      // Refresh local state
      await loadTournament();
    } catch (err) {
      const errors = err.errors || [err.msg || '状态切换失败'];
      setTransitionErrors(errors);
      addToast(errors[0], 'error');
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleRollback = async (targetStatus) => {
    if (!isAdm) return;
    if (!window.confirm(`确定要回退赛事到 ${selectStatusLabel(targetStatus)}？此操作可能清空后续阶段数据。`)) return;
    setIsTransitioning(true);
    setTransitionErrors([]);
    try {
      const result = await rollback(id, targetStatus);
      addToast(`赛事已回退至 ${selectStatusLabel(targetStatus)}`, 'success');
      await loadTournament();
    } catch (err) {
      const errors = err.errors || [err.msg || '状态回退失败'];
      setTransitionErrors(errors);
      addToast(errors[0], 'error');
    } finally {
      setIsTransitioning(false);
    }
  };

  // ==================== Legacy Handlers (store-wired) ====================
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const handleSaveInfo = async () => {
    setIsSaving(true);
    try {
      await updateTournament(id, editInfo);
      addToast('赛事信息已更新', 'success');
      loadTournament();
    } catch (err) { addToast(err.msg || '更新失败', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleSaveForm = async () => {
    try {
      const axios = (await import('axios')).default;
      await axios.put(`/api/tournaments/detail/${id}/registration-form`, { fields: formFields }, { headers });
      addToast('报名表已保存', 'success');
    } catch (err) { addToast('保存失败', 'error'); }
  };

  const handleSaveQualSongs = async () => {
    try {
      const axios = (await import('axios')).default;
      await axios.put(`/api/tournaments/detail/${id}/qualifier-songs`, { songs: localQualSongs }, { headers });
      setSongs(localQualSongs);
      addToast('预选赛曲目已保存', 'success');
    } catch (err) { addToast('保存失败', 'error'); }
  };

  const handleSubmitScore = async (e) => {
    e.preventDefault();
    try {
      const axios = (await import('axios')).default;
      const res = await axios.post(`/api/tournaments/detail/${id}/qualifier-scores`, scoreData, { headers });
      addToast(res.data.msg, 'success');
      setScoreData({ ...scoreData, songName: '', achievement: '', dxScore: '' });
    } catch (err) { addToast(err.response?.data?.msg || '录入失败', 'error'); }
  };

  const handleSaveGroups = async () => {
    try {
      const axios = (await import('axios')).default;
      await axios.put(`/api/tournaments/detail/${id}/groups`, { groups }, { headers });
      addToast('分组已保存', 'success');
    } catch (err) { addToast('保存失败', 'error'); }
  };

  const handleSaveMatches = async () => {
    try {
      const axios = (await import('axios')).default;
      await axios.put(`/api/tournaments/detail/${id}/matches`, { matches: localMatches }, { headers });
      addToast('对局已保存', 'success');
    } catch (err) { addToast('保存失败', 'error'); }
  };

  const handleGenerateBracket = async () => {
    try {
      await generateBracket(id);
      addToast('对阵表已生成', 'success');
      fetchBracket(id);
    } catch (err) { addToast(err.msg || '对阵表生成失败', 'error'); }
  };

  const handlePublishResults = async () => {
    try {
      const axios = (await import('axios')).default;
      await axios.put(`/api/tournaments/detail/${id}/results`, { results, resultAnnouncement }, { headers });
      addToast('结果已发布', 'success');
    } catch (err) { addToast('发布失败', 'error'); }
  };

  // ==================== Tab config ====================
  const tabs = [
    { id: 'state', label: '状态机', icon: FaExchangeAlt },
    { id: 'info', label: '基本信息', icon: FaEdit },
    { id: 'form', label: '报名表', icon: FaClipboardList },
    { id: 'registrations', label: '报名情况', icon: FaUsers },
    { id: 'qualifier', label: '预选赛', icon: FaMusic },
    { id: 'groups', label: '分组', icon: FaSitemap },
    { id: 'matches', label: '正赛对局', icon: FaTrophy },
    { id: 'results', label: '结果公布', icon: FaCheckCircle },
  ];

  const inputClass = "w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none transition-colors";
  const btnClass = "px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold tracking-widest rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center gap-2";
  const statusColor = selectStatusColor(tournament.status);
  const statusLabel = selectStatusLabel(tournament.status);

  return (
    <div className="w-full min-h-screen pb-24 text-white px-4 md:px-8 max-w-6xl mx-auto pt-24">
      {/* 返回按钮 & 标题 */}
      <div className="mb-6">
        <button onClick={() => navigate('/tournaments')} className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm mb-4">
          <FaArrowLeft /> 返回赛事大厅
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl md:text-4xl font-black text-white">{tournament.title}</h1>
          <span className={`px-3 py-1 rounded-xl text-[11px] font-bold uppercase tracking-widest border ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
        <p className="text-gray-400 text-sm mt-1">赛事管理控制台 · {tournament._id}</p>
      </div>

      {/* ================================================================ */}
      {/* STATE MACHINE PANEL (always visible P1 核心) */}
      {/* ================================================================ */}
      {activeTab === 'state' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8 mb-8">
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <FaCog className="text-cyan-400" /> 赛事状态机
          </h2>
          <p className="text-gray-500 text-sm mb-6">当前阶段的操作面板。可用操作取决于当前状态和你的权限角色。</p>

          {/* 状态时间轴 */}
          <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
            {STATUS_ORDER.map((s, i) => {
              const idx = STATUS_ORDER.indexOf(tournament.status);
              const isPast = i < idx;
              const isCurrent = i === idx;
              const isFuture = i > idx;
              return (
                <div key={s} className="flex items-center gap-1">
                  <div className={`flex flex-col items-center ${i > 0 ? 'ml-1' : ''}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border transition-all ${
                      isCurrent ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]' :
                      isPast ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      'bg-white/[0.02] text-zinc-600 border-white/[0.05]'
                    }`}>
                      {isPast ? <FaCheckCircle className="text-xs" /> : i + 1}
                    </div>
                    <span className={`text-[10px] mt-1 font-bold uppercase tracking-wider ${
                      isCurrent ? 'text-cyan-400' : isPast ? 'text-emerald-400' : 'text-zinc-600'
                    }`}>
                      {selectStatusLabel(s)}
                    </span>
                  </div>
                  {i < STATUS_ORDER.length - 1 && (
                    <div className={`w-6 md:w-10 h-px mt-[-1rem] ${
                      i < idx ? 'bg-emerald-500/30' : i === idx ? 'bg-gradient-to-r from-cyan-500/50 to-zinc-700' : 'bg-zinc-800'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* 操作按钮区 */}
          {isArchived ? (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center">
              <FaLock className="text-zinc-600 text-3xl mx-auto mb-3" />
              <p className="text-zinc-500 font-bold">赛事已归档，所有操作为只读</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 前进过渡 */}
              {availableTransitions.filter(t => STATUS_ORDER.indexOf(t) > STATUS_ORDER.indexOf(tournament.status)).length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">推进赛事</h3>
                  <div className="flex flex-wrap gap-3">
                    {availableTransitions
                      .filter(t => STATUS_ORDER.indexOf(t) > STATUS_ORDER.indexOf(tournament.status))
                      .map(target => {
                        const meta = TRANSITION_LABELS[target] || { label: target, icon: FaForward, color: 'cyan' };
                        const Icon = meta.icon;
                        const colorMap = {
                          green: 'bg-green-600 hover:bg-green-500 border-green-400',
                          purple: 'bg-purple-600 hover:bg-purple-500 border-purple-400',
                          amber: 'bg-amber-600 hover:bg-amber-500 border-amber-400',
                          gray: 'bg-zinc-600 hover:bg-zinc-500 border-zinc-400',
                          cyan: 'bg-cyan-600 hover:bg-cyan-500 border-cyan-400',
                        };
                        return (
                          <button
                            key={target}
                            onClick={() => handleTransition(target)}
                            disabled={isTransitioning || !isManager}
                            className={`px-5 py-3 text-white font-bold rounded-xl transition-all shadow-lg disabled:opacity-40 flex items-center gap-2 border ${colorMap[meta.color] || colorMap.cyan}`}
                          >
                            {isTransitioning ? <FaSpinner className="animate-spin" /> : <Icon />}
                            {meta.label}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* 回退操作 */}
              {isAdm && availableTransitions.filter(t => STATUS_ORDER.indexOf(t) < STATUS_ORDER.indexOf(tournament.status)).length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-red-400/70 uppercase tracking-wider mb-3">回退操作 (ADM)</h3>
                  <div className="flex flex-wrap gap-3">
                    {availableTransitions
                      .filter(t => STATUS_ORDER.indexOf(t) < STATUS_ORDER.indexOf(tournament.status))
                      .map(target => {
                        const meta = TRANSITION_LABELS[target] || { label: `回退至 ${selectStatusLabel(target)}`, icon: FaUndo, color: 'zinc' };
                        const Icon = meta.icon;
                        return (
                          <button
                            key={target}
                            onClick={() => handleRollback(target)}
                            disabled={isTransitioning}
                            className="px-5 py-3 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 rounded-xl font-bold transition-all disabled:opacity-40 flex items-center gap-2"
                          >
                            {isTransitioning ? <FaSpinner className="animate-spin" /> : <Icon />}
                            回退至 {selectStatusLabel(target)}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* 无可用操作 */}
              {availableTransitions.length === 0 && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center">
                  <p className="text-zinc-500">当前状态无可执行操作</p>
                </div>
              )}

              {/* 过渡错误 */}
              {transitionErrors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <h4 className="text-red-400 font-bold text-sm mb-2">校验失败：</h4>
                  <ul className="list-disc list-inside text-red-300 text-sm space-y-1">
                    {transitionErrors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}

              {/* 操作日志 */}
              {tournament.operationLogs && tournament.operationLogs.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/5">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">操作日志</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {[...tournament.operationLogs].reverse().slice(0, 10).map((log, i) => (
                      <div key={i} className="text-xs text-zinc-500 flex gap-3">
                        <span className="text-zinc-600 font-mono">{new Date(log.operatedAt).toLocaleString('zh-CN')}</span>
                        <span className="text-zinc-400">{log.action}</span>
                        <span>{log.fromStatus} → {log.toStatus}</span>
                        {log.note && <span className="text-zinc-600">— {log.note}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* ================================================================ */}
      {/* Tab 导航 */}
      {/* ================================================================ */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold tracking-wide whitespace-nowrap transition-all border ${
              activeTab === t.id ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-white/5 text-gray-400 border-white/10 hover:border-cyan-500/50'
            }`}>
            <t.icon className="text-xs" /> {t.label}
          </button>
        ))}
      </div>

      {/* ========== 基本信息 ========== */}
      {activeTab === 'info' && (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div><label className="text-xs text-gray-500 font-bold uppercase mb-1 block">赛事标题</label><input value={editInfo.title || ''} onChange={e => setEditInfo({...editInfo, title: e.target.value})} className={inputClass} disabled={isArchived} /></div>
            <div><label className="text-xs text-gray-500 font-bold uppercase mb-1 block">副标题</label><input value={editInfo.subtitle || ''} onChange={e => setEditInfo({...editInfo, subtitle: e.target.value})} className={inputClass} disabled={isArchived} /></div>
          </div>
          <div><label className="text-xs text-gray-500 font-bold uppercase mb-1 block">封面图 URL</label><input value={editInfo.coverUrl || ''} onChange={e => setEditInfo({...editInfo, coverUrl: e.target.value})} className={inputClass} disabled={isArchived} /></div>
          <div><label className="text-xs text-gray-500 font-bold uppercase mb-1 block">赛事描述</label><textarea rows="4" value={editInfo.description || ''} onChange={e => setEditInfo({...editInfo, description: e.target.value})} className={inputClass + " resize-y"} disabled={isArchived} /></div>
          <div><label className="text-xs text-gray-500 font-bold uppercase mb-1 block">比赛规则 (BBCode)</label><textarea rows="8" value={editInfo.rules || ''} onChange={e => setEditInfo({...editInfo, rules: e.target.value})} className={inputClass + " resize-y font-mono text-sm"} disabled={isArchived} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div><label className="text-xs text-gray-500 font-bold uppercase mb-1 block">报名开始</label><input type="datetime-local" value={editInfo.registrationStart || ''} onChange={e => setEditInfo({...editInfo, registrationStart: e.target.value})} className={inputClass} disabled={isArchived} /></div>
            <div><label className="text-xs text-gray-500 font-bold uppercase mb-1 block">报名结束</label><input type="datetime-local" value={editInfo.registrationEnd || ''} onChange={e => setEditInfo({...editInfo, registrationEnd: e.target.value})} className={inputClass} disabled={isArchived} /></div>
            <div><label className="text-xs text-gray-500 font-bold uppercase mb-1 block">比赛开始</label><input type="datetime-local" value={editInfo.startTime || ''} onChange={e => setEditInfo({...editInfo, startTime: e.target.value})} className={inputClass} disabled={isArchived} /></div>
            <div><label className="text-xs text-gray-500 font-bold uppercase mb-1 block">比赛结束</label><input type="datetime-local" value={editInfo.endTime || ''} onChange={e => setEditInfo({...editInfo, endTime: e.target.value})} className={inputClass} disabled={isArchived} /></div>
          </div>
          {!tournament.timeApproved && <p className="text-yellow-400 text-sm flex items-center gap-2"><FaCalendarAlt /> 比赛时间尚待 ADM 审核通过</p>}
          {!isArchived && <button onClick={handleSaveInfo} disabled={isSaving} className={btnClass}>{isSaving ? <FaSpinner className="animate-spin" /> : <FaSave />} 保存信息</button>}
        </div>
      )}

      {/* ========== 报名表设计 ========== */}
      {activeTab === 'form' && (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8 space-y-5">
          <p className="text-gray-400 text-sm mb-4">自定义报名表字段，选手报名时将填写这些信息。</p>
          {formFields.map((field, idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start">
              <input value={field.label} onChange={e => { const f = [...formFields]; f[idx].label = e.target.value; setFormFields(f); }} className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm" placeholder="字段名称" disabled={isArchived} />
              <select value={field.type} onChange={e => { const f = [...formFields]; f[idx].type = e.target.value; setFormFields(f); }} className="bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm" disabled={isArchived}>
                <option value="text">文本</option><option value="number">数字</option><option value="textarea">长文本</option><option value="select">下拉选择</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={field.required} onChange={e => { const f = [...formFields]; f[idx].required = e.target.checked; setFormFields(f); }} disabled={isArchived} /> 必填</label>
              {!isArchived && <button onClick={() => setFormFields(formFields.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 p-1"><FaTimes /></button>}
            </div>
          ))}
          {!isArchived && (
            <div className="flex gap-3">
              <button onClick={() => setFormFields([...formFields, { label: '', type: 'text', required: false, options: [], placeholder: '' }])} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold flex items-center gap-2"><FaPlus /> 添加字段</button>
              <button onClick={handleSaveForm} className={btnClass}><FaSave /> 保存报名表</button>
            </div>
          )}
        </div>
      )}

      {/* ========== 报名情况 ========== */}
      {activeTab === 'registrations' && (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <FaUsers className="text-cyan-400 text-xl" />
            <h3 className="text-xl font-bold">已报名选手 ({tournament.registrations?.length || 0} 人)</h3>
            {!isArchived && isManager && (
              <div className="ml-auto flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      const { exportRegistrationsCSV } = await import('../features/tournament/api/tournamentApi');
                      const res = await exportRegistrationsCSV(id);
                      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url; a.download = `registrations_${id}.csv`; a.click();
                      URL.revokeObjectURL(url);
                      addToast('报名表已导出', 'success');
                    } catch { addToast('导出失败', 'error'); }
                  }}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <FaDownload /> CSV
                </button>
              </div>
            )}
          </div>
          {(!tournament.registrations || tournament.registrations.length === 0) ? (
            <p className="text-gray-500 text-center py-10">暂无选手报名</p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {tournament.registrations.map((reg, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                  <img src={reg.userId?.avatarUrl || '/assets/logos.png'} alt="" className="w-10 h-10 rounded-full object-cover bg-black border border-white/10" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold">{reg.userId?.username || '未知'}</div>
                    <div className="text-xs text-gray-400 font-mono">UID: {reg.userId?.uid}</div>
                  </div>
                  <span className="text-xs text-gray-500">{new Date(reg.registeredAt).toLocaleString('zh-CN')}</span>
                  {!isArchived && isManager && (
                    <button
                      onClick={async () => {
                        if (!confirm(`确定移除 ${reg.userId?.username || '该选手'} 的报名？`)) return;
                        try {
                          const { removeRegistration } = await import('../features/tournament/api/tournamentApi');
                          await removeRegistration(id, reg.userId?._id);
                          addToast('已移除该选手报名', 'success');
                          loadTournament();
                        } catch { addToast('移除失败', 'error'); }
                      }}
                      className="text-red-400 hover:text-red-300 p-1 transition-colors"
                      title="移除报名"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========== 预选赛 ========== */}
      {activeTab === 'qualifier' && (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8 space-y-8">
          {/* 曲目设置 */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><FaMusic className="text-orange-400" /> 预选赛曲目</h3>
            {localQualSongs.map((song, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 mb-3 flex flex-col md:flex-row gap-3 items-start">
                <input value={song.songName} onChange={e => { const s = [...localQualSongs]; s[idx].songName = e.target.value; setLocalQualSongs(s); }} className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm" placeholder="曲目名称" disabled={isArchived} />
                <input value={song.difficulty || ''} onChange={e => { const s = [...localQualSongs]; s[idx].difficulty = e.target.value; setLocalQualSongs(s); }} className="w-32 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm" placeholder="难度" disabled={isArchived} />
                <input type="number" step="0.1" value={song.constant || ''} onChange={e => { const s = [...localQualSongs]; s[idx].constant = parseFloat(e.target.value); setLocalQualSongs(s); }} className="w-24 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm font-mono" placeholder="定数" disabled={isArchived} />
                {!isArchived && <button onClick={() => setLocalQualSongs(localQualSongs.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 p-1"><FaTimes /></button>}
              </div>
            ))}
            {!isArchived && (
              <div className="mb-3">
                <label className="text-xs text-zinc-500 font-bold uppercase mb-1.5 block">从曲库搜索添加</label>
                <SongSearchInput
                  placeholder="搜索曲目名或艺术家..."
                  onSelect={(song) => {
                    setLocalQualSongs(prev => {
                      const name = song.title || '';
                      if (prev.some(s => s.songName === name)) return prev;
                      const levelNames = Array.isArray(song.level) ? song.level : (song.level ? [song.level] : ['MASTER']);
                      const ds = Array.isArray(song.ds) ? song.ds : (song.ds ? [song.ds] : [0]);
                      const highestIdx = ds.length - 1;
                      return [...prev, {
                        songName: name,
                        difficulty: levelNames[highestIdx] || 'MASTER',
                        level: ds[highestIdx] || 3,
                        constant: ds[highestIdx] || 0,
                        coverUrl: song.coverUrl || '',
                        note: '',
                      }];
                    });
                  }}
                />
              </div>
            )}
            {!isArchived && (
              <div className="flex gap-3">
                <button onClick={() => setLocalQualSongs([...localQualSongs, { songName: '', difficulty: 'MASTER', level: 3, constant: 0, note: '' }])} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold flex items-center gap-2"><FaPlus /> 添加曲目</button>
                <button onClick={handleSaveQualSongs} className={btnClass}><FaSave /> 保存曲目</button>
              </div>
            )}
          </div>

          {/* 成绩矩阵 */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><FaTrophy className="text-yellow-400" /> 成绩矩阵</h3>
            <QualifierScoreMatrix
              tournamentId={id}
              songs={localQualSongs}
              registrations={tournament.registrations || []}
              isManager={!isArchived && isManager}
            />
          </div>

          {/* 预选排名 */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><FaTrophy className="text-purple-400" /> 预选排名</h3>
            <QualifierRanking
              tournamentId={id}
              advanceCount={tournament.advanceCount || 8}
              isManager={!isArchived && isManager}
              onAdvance={() => { loadTournament(); addToast('晋级名单已确认，赛事推进至正赛', 'success'); }}
              qualifierSongs={tournament.qualifierSongs || []}
              qualifierStart={tournament.registrationStart}
              qualifierEnd={tournament.endTime}
            />
          </div>
        </div>
      )}

      {/* ========== 分组 ========== */}
      {/* ========== 分组 ========== */}
      {activeTab === 'groups' && (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8">
          <GroupAllocationPanel
            players={tournament.registrations?.map(r => ({
              userId: r.userId?._id || r.userId,
              username: r.userId?.username || '未知',
              avatarUrl: r.userId?.avatarUrl,
              seeding: r.seeding,
            })) || []}
            initialGroups={groups}
            isManager={!isArchived}
            onSave={async (newGroups) => {
              setGroups(newGroups);
              try {
                const axios = (await import('axios')).default;
                await axios.put(`/api/tournaments/detail/${id}/groups`, { groups: newGroups }, { headers });
                addToast('分组已保存', 'success');
              } catch (err) { addToast('保存失败', 'error'); }
            }}
          />
        </div>
      )}

      {/* ========== 正赛对局 ========== */}
      {activeTab === 'matches' && (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8 space-y-6">
          {/* 工具栏 */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-gray-400 text-sm">单败淘汰对阵表。对阵信息由 SSE 实时推送更新。</p>
            {!isArchived && tournament.status === 'QUALIFYING' && !bracketGenerated && (
              <button onClick={handleGenerateBracket} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all flex items-center gap-2 text-sm">
                <FaSitemap /> 生成对阵表
              </button>
            )}
            {!isArchived && bracketGenerated && (tournament.status === 'QUALIFYING' || tournament.status === 'ONGOING') && (
              <button
                onClick={async () => {
                  if (!confirm('重置对阵表将清空所有已生成的 match 数据，确定？')) return;
                  try {
                    const { resetBracket } = await import('../features/tournament/api/tournamentApi');
                    await resetBracket(id);
                    addToast('对阵表已重置', 'success');
                    loadTournament();
                    fetchBracket();
                  } catch { addToast('重置失败', 'error'); }
                }}
                className="px-5 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/30 font-bold rounded-xl transition-all flex items-center gap-2 text-sm"
              >
                <FaUndo /> 重置对阵
              </button>
            )}
          </div>

          {/* 对阵图 */}
          <BracketView
            tournamentId={id}
            isManager={!isArchived}
          />

          {/* 成绩录入面板（手动模式/兼容） */}
          {bracketGenerated && bracketMatches.length > 0 && !isArchived && (
            <div className="mt-6">
              <details className="group">
                <summary className="cursor-pointer text-sm text-zinc-400 hover:text-zinc-200 font-bold flex items-center gap-2 mb-3">
                  <FaEdit /> 录入比赛成绩
                  <span className="text-[10px] text-zinc-600 font-normal group-open:hidden">展开</span>
                  <span className="text-[10px] text-zinc-600 font-normal hidden group-open:inline">收起</span>
                </summary>
                <div className="space-y-3">
                  {bracketMatches
                    .filter(m => m.status !== 'FINISHED' && m.playerA && m.playerB)
                    .map((m, idx) => (
                      <div key={idx} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex flex-wrap items-center gap-3">
                        <span className="text-[10px] text-zinc-500 font-mono w-20">{m.roundName || m.round}</span>
                        <span className="text-xs text-zinc-300 font-bold w-28 truncate">{m.playerA?.username || m.playerA}</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            defaultValue={m.scoreA}
                            onChange={e => { const s = [...scoreInputs]; s[idx] = { ...s[idx], scoreA: Number(e.target.value) }; setScoreInputs(s); }}
                            className="w-16 bg-black/50 border border-white/20 rounded-lg px-2 py-1 text-white text-sm font-mono text-center"
                          />
                          <span className="text-zinc-600">:</span>
                          <input
                            type="number"
                            min="0"
                            defaultValue={m.scoreB}
                            onChange={e => { const s = [...scoreInputs]; s[idx] = { ...s[idx], scoreB: Number(e.target.value) }; setScoreInputs(s); }}
                            className="w-16 bg-black/50 border border-white/20 rounded-lg px-2 py-1 text-white text-sm font-mono text-center"
                          />
                        </div>
                        <span className="text-xs text-zinc-300 font-bold w-28 truncate">{m.playerB?.username || m.playerB}</span>
                        <button
                          onClick={async () => {
                            try {
                              const input = scoreInputs[idx] || {};
                              await useBracketStore.getState().updateMatch(id, m._id, {
                                scoreA: input.scoreA ?? m.scoreA ?? 0,
                                scoreB: input.scoreB ?? m.scoreB ?? 0,
                                status: 'FINISHED',
                              });
                              addToast(`比赛 ${m.bracketPosition} 成绩已录入`, 'success');
                            } catch (err) {
                              addToast(err?.msg || '录入失败', 'error');
                            }
                          }}
                          className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition-all"
                        >
                          <FaCheckCircle /> 完成
                        </button>
                      </div>
                    ))}
                  {bracketMatches.filter(m => m.status !== 'FINISHED' && m.playerA && m.playerB).length === 0 && (
                    <p className="text-zinc-500 text-center py-4 text-xs">所有可用对局已结束</p>
                  )}
                </div>
              </details>
            </div>
          )}

          {/* Manual fallback (无 bracket 时) */}
          {!bracketGenerated && (
            <>
              {tournament.status === 'QUALIFYING' ? (
                <p className="text-gray-500 text-center py-10 text-sm">请点击"生成对阵表"创建单败淘汰对阵。</p>
              ) : (
                <>
                  <p className="text-gray-500 text-center py-6 text-sm">手动对局编辑模式（向后兼容）</p>
                  {!isArchived && (
                    <div className="space-y-5">
                      {localMatches.map((m, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                          <div className="flex flex-col md:flex-row gap-3">
                            <input value={m.round || ''} onChange={e => { const ms = [...localMatches]; ms[idx].round = e.target.value; setLocalMatches(ms); }} className="w-40 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm" placeholder="轮次" />
                            <input value={m.playerA || ''} onChange={e => { const ms = [...localMatches]; ms[idx].playerA = e.target.value; setLocalMatches(ms); }} className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm font-mono" placeholder="选手A (User ID)" />
                            <span className="text-gray-500 self-center font-bold">VS</span>
                            <input value={m.playerB || ''} onChange={e => { const ms = [...localMatches]; ms[idx].playerB = e.target.value; setLocalMatches(ms); }} className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm font-mono" placeholder="选手B (User ID)" />
                            <button onClick={() => setLocalMatches(localMatches.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 p-1"><FaTimes /></button>
                          </div>
                          <div className="flex gap-3">
                            <input type="number" value={m.scoreA || 0} onChange={e => { const ms = [...localMatches]; ms[idx].scoreA = Number(e.target.value); setLocalMatches(ms); }} className="w-24 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm font-mono text-center" placeholder="比分A" />
                            <span className="text-gray-500 self-center">:</span>
                            <input type="number" value={m.scoreB || 0} onChange={e => { const ms = [...localMatches]; ms[idx].scoreB = Number(e.target.value); setLocalMatches(ms); }} className="w-24 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm font-mono text-center" placeholder="比分B" />
                            <select value={m.status || 'PENDING'} onChange={e => { const ms = [...localMatches]; ms[idx].status = e.target.value; setLocalMatches(ms); }} className="bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm">
                              <option value="PENDING">未开始</option><option value="ONGOING">进行中</option><option value="FINISHED">已结束</option>
                            </select>
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-3">
                        <button onClick={() => setLocalMatches([...localMatches, { round: '', playerA: '', playerB: '', scoreA: 0, scoreB: 0, status: 'PENDING', songs: [] }])} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold flex items-center gap-2"><FaPlus /> 添加对局</button>
                        <button onClick={handleSaveMatches} className={btnClass}><FaSave /> 保存对局</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ========== 结果公布 ========== */}
      {/* ========== 结果公布 ========== */}
      {activeTab === 'results' && (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8 space-y-6">
          {/* 工具按钮 */}
          {!isArchived && (
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={async () => {
                  try {
                    const { generateResults } = await import('../features/tournament/api/tournamentApi');
                    const res = await generateResults(id);
                    if (res.data?.data?.results) setResults(res.data.data.results);
                    addToast('最终排名已生成', 'success');
                  } catch { addToast('生成排名失败', 'error'); }
                }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
              >
                <FaCog /> 生成排名
              </button>
              <button
                onClick={async () => {
                  try {
                    const { announceResults } = await import('../features/tournament/api/tournamentApi');
                    const res = await announceResults(id);
                    if (res.data?.data?.announcement) setResultAnnouncement(res.data.data.announcement);
                    addToast('公告已生成', 'success');
                  } catch { addToast('生成公告失败', 'error'); }
                }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
              >
                <FaEdit /> 生成公告
              </button>
            </div>
          )}
          {/* 领奖台展示 */}
          <ResultPodium
            tournamentId={id}
            results={results.map(r => ({
              rank: r.rank,
              userId: r.userId || r,
              username: r.userId?.username || r.username,
              avatarUrl: r.userId?.avatarUrl || r.avatarUrl,
              note: r.note,
              announcement: resultAnnouncement,
            }))}
            isManager={!isArchived}
          />

          {/* 手动编辑面板（折叠） */}
          {!isArchived && (
            <details className="group">
              <summary className="cursor-pointer text-sm text-zinc-400 hover:text-zinc-200 font-bold flex items-center gap-2">
                <FaEdit /> 编辑名次与公告
                <span className="text-[10px] text-zinc-600 font-normal group-open:hidden">展开</span>
                <span className="text-[10px] text-zinc-600 font-normal hidden group-open:inline">收起</span>
              </summary>
              <div className="mt-4 space-y-4">
                <p className="text-gray-400 text-sm">设置最终名次和比赛结果公告。</p>
                {results.map((r, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-start">
                    <input type="number" value={r.rank || ''} onChange={e => { const rs = [...results]; rs[idx].rank = Number(e.target.value); setResults(rs); }} className="w-24 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm text-center" placeholder="名次" />
                    <input value={r.userId || ''} onChange={e => { const rs = [...results]; rs[idx].userId = e.target.value; setResults(rs); }} className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm font-mono" placeholder="User ID" />
                    <input value={r.note || ''} onChange={e => { const rs = [...results]; rs[idx].note = e.target.value; setResults(rs); }} className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm" placeholder="备注" />
                    <button onClick={() => setResults(results.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 p-1"><FaTimes /></button>
                  </div>
                ))}
                <div className="flex gap-3">
                  <button onClick={() => setResults([...results, { rank: results.length + 1, userId: '', note: '' }])} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold flex items-center gap-2"><FaPlus /> 添加名次</button>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">结果公告内容</label>
                  <textarea rows="6" value={resultAnnouncement} onChange={e => setResultAnnouncement(e.target.value)} className={inputClass + " resize-y font-mono text-sm"} placeholder="输入比赛结果公告..." />
                </div>
                <button onClick={handlePublishResults} className={btnClass}><FaCheckCircle /> 发布结果</button>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

export default TournamentManage;
