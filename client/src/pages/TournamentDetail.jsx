import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTournamentStore, useBracketStore } from '../features/tournament/store';
import { selectStatusLabel, selectStatusColor } from '../features/tournament/store/tournamentStore';
import { createEventSource, getResults, getMyRegistration, updateMyRegistration, getAuditLog } from '../features/tournament/api/tournamentApi';
import { getArchive as getMSC2026Archive } from '../features/msc2026/api/msc2026Api';
import QualifierRanking from '../features/tournament/components/qualifier/QualifierRanking';
import BracketView from '../features/tournament/components/bracket/BracketView';
import ResultPodium from '../features/tournament/components/common/ResultPodium';
import CountdownTimer from '../features/tournament/components/common/CountdownTimer';
import AuditLogView from '../features/tournament/components/detail/AuditLogView';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaArrowLeft, FaSpinner, FaUsers, FaMusic, FaSitemap, FaTrophy,
  FaCalendarAlt, FaCheckCircle, FaCog, FaClipboardList, FaMedal, FaInfoCircle, FaBook,
  FaEdit, FaHistory, FaTimes, FaLock
} from 'react-icons/fa';

const TournamentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  // ---- Stores ----
  const {
    tournament, loading,
    fetchTournament, register: registerAction,
    handleStateChange, handleFinished,
  } = useTournamentStore();
  const {
    matches: bracketMatches, bracketGenerated, rounds,
    fetchBracket, enqueueAnimation,
  } = useBracketStore();

  const [activeTab, setActiveTab] = useState('overview');
  const [isRegistering, setIsRegistering] = useState(false);
  const [formAnswers, setFormAnswers] = useState({});
  const [results, setResults] = useState([]);
  const [resultsLoaded, setResultsLoaded] = useState(false);
  const [mscArchive, setMscArchive] = useState(null);

  // #1: 报名查看/修改
  const [myRegistration, setMyRegistration] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormAnswers, setEditFormAnswers] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  // #5.3: 审计日志
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPublic, setAuditPublic] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);

  const esRef = useRef(null);

  // ---- 参赛令牌（从后端 myRegistration.token 读取） ----
  const playerToken = myRegistration?.token || null;

  // ---- Derived state ----
  const now = new Date();
  const regOpen = tournament?.timeWindows?.registration?.isOpen ?? (
    tournament && tournament.registrationStart && tournament.registrationEnd &&
    now >= new Date(tournament.registrationStart) && now <= new Date(tournament.registrationEnd)
  );
  const alreadyRegistered = user && tournament?.registrations?.some(r =>
    (r.userId?._id || r.userId) === user._id || (r.userId?._id || r.userId)?.toString() === user._id
  );
  const canManage = user && ['ADM', 'CHM', 'TO'].includes(user.role);

  // ---- Data load ----
  const loadData = useCallback(async () => {
    await fetchTournament(id);
  }, [id, fetchTournament]);

  useEffect(() => { loadData(); }, [loadData]);

  // MSC 2026 的赛事大厅记录使用已修正替补归属的公开归档。
  useEffect(() => {
    if (!tournament?._id || !/^MSC\s*2026$/i.test(String(tournament.title || '').trim())) return;
    getMSC2026Archive().then(res => setMscArchive(res.data.data)).catch(() => {});
  }, [tournament?._id, tournament?.title]);

  // #1: 加载当前选手报名信息
  useEffect(() => {
    if (!user || !tournament || !alreadyRegistered) {
      setMyRegistration(null);
      return;
    }
    getMyRegistration(id).then(res => {
      const data = res.data;
      setMyRegistration(data.registration || { formData: {}, modifyCount: 0 });
    }).catch(() => {});
  }, [user, tournament?._id, alreadyRegistered]);

  // Load bracket when tournament is ONGOING+
  useEffect(() => {
    if (tournament && ['ONGOING', 'FINISHED', 'ARCHIVED'].includes(tournament.status)) {
      fetchBracket(id).catch(() => {});
    }
  }, [tournament?.status, id, fetchBracket]);

  // Load results when FINISHED/ARCHIVED
  useEffect(() => {
    if (tournament && ['FINISHED', 'ARCHIVED'].includes(tournament.status) && !resultsLoaded) {
      getResults(id).then(res => {
        const data = res.data;
        const formatted = (data.ranks || []).map(r => ({
          ...r,
          rank: r.rank,
          userId: r.userId || r,
          username: r.username || r.userId?.username,
          avatarUrl: r.avatarUrl || r.userId?.avatarUrl,
          announcement: data.announcement || '',
        }));
        setResults(formatted);
        setResultsLoaded(true);
      }).catch(() => {});
    }
  }, [tournament?.status, id, resultsLoaded]);

  // ---- SSE connection ----
  useEffect(() => {
    if (!tournament || tournament.status === 'ARCHIVED') return;

    const es = createEventSource(id);
    esRef.current = es;

    es.addEventListener('tournament:stateChange', (e) => {
      try {
        const data = JSON.parse(e.data);
        handleStateChange(data);
        addToast(`赛事状态变更: ${selectStatusLabel(data.from)} → ${selectStatusLabel(data.to)}`, 'info');
      } catch {}
    });

    es.addEventListener('tournament:matchResult', (e) => {
      try {
        const data = JSON.parse(e.data);
        enqueueAnimation(data);
      } catch {}
    });

    es.addEventListener('tournament:finished', (e) => {
      try {
        const data = JSON.parse(e.data);
        handleFinished(data);
        addToast(`🏆 冠军诞生: ${data.winnerName}`, 'success');
      } catch {}
    });

    es.onerror = () => {
      // EventSource auto-reconnects; no manual intervention needed
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [tournament?._id, tournament?.status]);

  // ---- Guards ----
  if (loading || !tournament) {
    return <div className="min-h-screen flex items-center justify-center"><FaSpinner className="animate-spin text-4xl text-cyan-500" /></div>;
  }

  const handleRegister = async () => {
    if (!user) return navigate('/login');
    setIsRegistering(true);
    try {
      const res = await registerAction(id, formAnswers);
      addToast(res.msg || '报名成功', 'success');
    } catch (err) { addToast(err.msg || '报名失败', 'error'); }
    finally { setIsRegistering(false); }
  };

  const statusColor = selectStatusColor(tournament.status);
  const statusLabel = selectStatusLabel(tournament.status);
  const isMSC2026Archive = /^MSC\s*2026$/i.test(String(tournament.title || '').trim()) && String(id || '').startsWith('6');
  const publicResults = mscArchive?.standings?.length
    ? mscArchive.standings.map(place => ({
        rank: place.rank,
        userId: place.player,
        username: place.player.username,
        avatarUrl: place.player.avatarUrl,
        note: `MSC 2026 · ${place.resultLabel}`,
      }))
    : results;

  // #5.3: 审计日志 — 赛后公开/赛前仅管理
  const showAuditTab = ['FINISHED', 'ARCHIVED'].includes(tournament?.status) || canManage;

  const tabs = [
    { id: 'overview', label: '概况', icon: FaInfoCircle },
    { id: 'rules', label: '规则', icon: FaBook },
    { id: 'qualifier', label: '预选赛', icon: FaMusic },
    { id: 'groups', label: '分组', icon: FaSitemap },
    { id: 'matches', label: '对局', icon: FaTrophy },
    { id: 'results', label: '结果', icon: FaMedal },
    ...(showAuditTab ? [{ id: 'audit', label: '操作记录', icon: FaHistory }] : []),
  ];

  // Use bracket data when available, fallback to tournament.matches
  const displayMatches = bracketGenerated && bracketMatches.length > 0 ? bracketMatches : (tournament.matches || []);

  return (
    <div className="w-full min-h-screen bg-[#0c0c11] text-zinc-200 pt-20 md:pt-24 pb-20 px-4 md:px-8 relative">
      <div className="max-w-5xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate('/tournaments')} className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm">
            <FaArrowLeft /> 返回赛事大厅
          </button>
          {canManage && !isMSC2026Archive && (
            <button onClick={() => navigate(`/tournament-manage/${id}`)} className="flex items-center gap-2 px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 border border-cyan-500/30 rounded-xl text-sm font-bold transition-all">
              <FaCog /> 管理赛事
            </button>
          )}
        </div>

        {isMSC2026Archive && (
          <div className="mb-8 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="flex items-center gap-2 font-bold text-zinc-200"><FaLock /> MSC 2026 最终战果已归档</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                完整逐组、逐曲、跑图统计与选手最终排名已收录于赛事纪念页。
              </p>
            </div>
            <button onClick={() => navigate('/matches/msc2026')} className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-bold text-zinc-100 transition hover:bg-white/10">
              查看完整战报 <FaTrophy />
            </button>
          </div>
        )}

        {/* Hero */}
        <div className="relative rounded-3xl overflow-hidden mb-8">
          {tournament.coverUrl && (
            <img src={tournament.coverUrl} alt="" className="w-full h-48 md:h-72 object-cover opacity-60" />
          )}
          <div className={`${tournament.coverUrl ? 'absolute inset-0 bg-gradient-to-t from-[#0c0c11] via-[#0c0c11]/60 to-transparent flex flex-col justify-end p-6 md:p-10' : 'p-6 md:p-10'}`}>
            <div className="flex items-center gap-3 mb-3">
              <span className={`px-3 py-1 rounded-xl text-[11px] font-bold uppercase tracking-widest border ${statusColor}`}>
                {statusLabel}
              </span>
              {!tournament.timeApproved && tournament.status !== 'FINISHED' && (
                <span className="px-3 py-1 rounded-xl text-[11px] font-bold uppercase tracking-widest bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">时间待审核</span>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{tournament.title}</h1>
            {tournament.subtitle && <p className="text-zinc-300 text-lg">{tournament.subtitle}</p>}
          </div>
        </div>

        {/* 元信息栏 */}
        <div className="flex flex-wrap gap-6 mb-8 text-sm text-zinc-400">
          {tournament.startTime && (
            <div className="flex items-center gap-2"><FaCalendarAlt className="text-zinc-600" />
              {new Date(tournament.startTime).toLocaleDateString('zh-CN')} — {tournament.endTime ? new Date(tournament.endTime).toLocaleDateString('zh-CN') : 'TBD'}
            </div>
          )}
          <div className="flex items-center gap-2"><FaUsers className="text-zinc-600" /> {tournament.registrations?.length || 0} 人已报名</div>
          {tournament.createdBy && <div className="flex items-center gap-2">主办：{tournament.createdBy.username}</div>}
          {/* 倒计时 */}
          {tournament.status === 'REGISTRATION' && (
            <CountdownTimer
              targetTime={tournament.registrationEnd}
              label="报名截止"
              expiredLabel="报名已截止"
              size="sm"
            />
          )}
          {tournament.status === 'QUALIFYING' && tournament.endTime && (
            <CountdownTimer
              targetTime={tournament.endTime}
              label="预选截止"
              expiredLabel="预选已截止"
              size="sm"
            />
          )}
          {tournament.status === 'REGISTRATION' && tournament.registrationStart && new Date(tournament.registrationStart) > new Date() && (
            <CountdownTimer
              targetTime={tournament.registrationStart}
              label="距报名开始"
              expiredLabel="报名进行中"
              size="sm"
            />
          )}
        </div>

        {/* 报名区域 */}
        {regOpen && !alreadyRegistered && ( // #2: 去掉 status 校验，纯时间窗口控制
          <div className="bg-[#15151e] border border-green-500/20 rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2"><FaClipboardList /> 赛事报名</h3>
            {tournament.registrationForm && tournament.registrationForm.length > 0 && (
              <div className="space-y-4 mb-6">
                {tournament.registrationForm.map((field, idx) => (
                  <div key={idx}>
                    <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">{field.label} {field.required && <span className="text-red-400">*</span>}</label>
                    {field.type === 'textarea' ? (
                      <textarea rows="3" value={formAnswers[field.label] || ''} onChange={e => setFormAnswers({...formAnswers, [field.label]: e.target.value})} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none resize-y" placeholder={field.placeholder} />
                    ) : field.type === 'select' ? (
                      <select value={formAnswers[field.label] || ''} onChange={e => setFormAnswers({...formAnswers, [field.label]: e.target.value})} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none">
                        <option value="">请选择</option>
                        {(field.options || []).map((opt, oi) => <option key={oi} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input type={field.type === 'number' ? 'number' : 'text'} value={formAnswers[field.label] || ''} onChange={e => setFormAnswers({...formAnswers, [field.label]: e.target.value})} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none" placeholder={field.placeholder} />
                    )}
                  </div>
                ))}
              </div>
            )}
            <button onClick={handleRegister} disabled={isRegistering} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
              {isRegistering ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
              {isRegistering ? '报名中...' : '立即报名'}
            </button>
          </div>
        )}
        {/* #1: 已报名 — 预览 + 编辑入口 */}
        {alreadyRegistered && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 text-green-400 font-bold">
                <FaCheckCircle /> 您已成功报名该赛事
              </div>
              {regOpen && ( // #2: 用时间窗口控制，不再检查 status
                <button
                  onClick={async () => {
                    if (!confirm('确定取消报名？')) return;
                    try {
                      const { unregisterFromTournament } = await import('../features/tournament/api/tournamentApi');
                      await unregisterFromTournament(id);
                      addToast('已取消报名', 'success');
                      fetchTournament(id);
                    } catch { addToast('取消报名失败', 'error'); }
                  }}
                  className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-all"
                >
                  取消报名
                </button>
              )}
            </div>
            {/* 🎫 参赛令牌 */}
            {playerToken && (
              <div className="bg-black/30 border border-orange-500/20 rounded-xl p-4 mb-3 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-orange-400">{playerToken}</span>
                </div>
                <div>
                  <p className="text-[10px] text-orange-400/60 font-bold uppercase tracking-wider">参赛令牌</p>
                  <p className="text-xs text-zinc-500">在预选赛阶段使用此令牌标识你的身份</p>
                </div>
              </div>
            )}

            {/* 报名表预览 */}
            {myRegistration === null ? (
              <p className="text-zinc-500 text-sm py-2">报名数据加载中...</p>
            ) : myRegistration?.formData && Object.keys(myRegistration.formData).length > 0 ? (
              <div className="bg-black/30 border border-white/[0.05] rounded-xl p-4 mb-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(myRegistration.formData).map(([label, value]) => (
                    <div key={label}>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-0.5">{label}</span>
                      <span className="text-zinc-200 text-sm">{String(value ?? '') || '-'}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-[10px] text-zinc-600">
                  修改次数: {myRegistration.modifyCount ?? 0} / 1
                </div>
              </div>
            ) : (
              <p className="text-zinc-500 text-sm py-2">该赛事暂无自定义报名信息</p>
            )}
            {/* 编辑按钮（modifyCount < 1 且窗口开放时显示） */}
            {regOpen && (myRegistration?.modifyCount ?? 0) < 1 && (
              <button
                onClick={() => {
                  setEditFormAnswers(myRegistration?.formData || {});
                  setEditModalOpen(true);
                }}
                className="px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
              >
                <FaEdit /> 编辑报名信息
              </button>
            )}
          </div>
        )}

        {/* Tab 导航 */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                activeTab === t.id ? 'bg-zinc-200 text-zinc-900 border-zinc-200' : 'bg-white/[0.03] text-zinc-400 border-white/[0.05] hover:border-zinc-500'
              }`}>
              <t.icon className="text-xs" /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab 内容 */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-[#15151e] border border-white/[0.05] rounded-2xl p-6 md:p-8">
              <div className="prose prose-invert max-w-none whitespace-pre-wrap text-zinc-300 leading-relaxed">
                {tournament.description || '暂无赛事描述。'}
              </div>
            </motion.div>
          )}

          {activeTab === 'rules' && (
            <motion.div key="rules" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-[#15151e] border border-white/[0.05] rounded-2xl p-6 md:p-8">
              <div className="prose prose-invert max-w-none whitespace-pre-wrap text-zinc-300 leading-relaxed">
                {tournament.rules || '暂未制定比赛规则。'}
              </div>
            </motion.div>
          )}

          {activeTab === 'qualifier' && (
            <motion.div key="qualifier" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-[#15151e] border border-white/[0.05] rounded-2xl p-6 md:p-8">
              <div className="space-y-8">
                {/* 预选曲目列表 */}
                {tournament.qualifierSongs && tournament.qualifierSongs.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><FaMusic className="text-orange-400" /> 预选赛曲目</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {tournament.qualifierSongs.map((song, idx) => (
                        <div key={idx} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 font-bold">{idx + 1}</div>
                          <div>
                            <div className="text-white font-bold">{song.songName}</div>
                            <div className="text-xs text-zinc-500">{song.difficulty} · Lv{song.level} · Const {song.constant}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* 预选排名榜 */}
                {/* #2: 预选排行榜入口扩展到 REGISTRATION */}
                {!['DRAFT'].includes(tournament.status) && (
                  <div>
                    <QualifierRanking
                      tournamentId={id}
                      advanceCount={tournament.advanceCount || 8}
                      isManager={canManage}
                      qualifierSongs={tournament.qualifierSongs || []}
                      qualifierStart={tournament.qualifierStart || tournament.registrationStart || tournament.timeWindows?.qualifier?.start}
                      qualifierEnd={tournament.qualifierEnd || tournament.endTime || tournament.timeWindows?.qualifier?.end}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'groups' && (
            <motion.div key="groups" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-[#15151e] border border-white/[0.05] rounded-2xl p-6 md:p-8">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><FaSitemap className="text-purple-400" /> 选手分组</h3>
              {(!tournament.groups || tournament.groups.length === 0) ? (
                <p className="text-zinc-500 text-center py-10">分组尚未公布</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {tournament.groups.map((g, idx) => (
                    <div key={idx} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-5">
                      <h4 className="text-lg font-bold text-purple-400 mb-3">{g.name}</h4>
                      <div className="space-y-2">
                        {(g.players || []).map((p, pi) => (
                          <div key={pi} className="flex items-center gap-3 text-sm">
                            <img src={p.avatarUrl || '/assets/logos.png'} alt="" className="w-8 h-8 rounded-full object-cover bg-black" />
                            <span className="text-zinc-200">{p.username || p}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'matches' && (
            <motion.div key="matches" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-[#15151e] border border-white/[0.05] rounded-2xl p-6 md:p-8">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <FaTrophy className="text-amber-400" /> 正赛对局
              </h3>
              {['ONGOING', 'FINISHED', 'ARCHIVED'].includes(tournament.status) && displayMatches.length > 0 ? (
                <BracketView
                  tournamentId={id}
                  isManager={canManage}
                />
              ) : displayMatches.length > 0 ? (
                <div className="space-y-4">
                  {displayMatches.map((m, idx) => (
                    <div key={idx} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-5">
                      {m.roundName && <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-2">{m.roundName}</div>}
                      {m.round && !m.roundName && <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-2">{m.round}</div>}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img src={m.playerA?.avatarUrl || '/assets/logos.png'} alt="" className="w-10 h-10 rounded-full object-cover bg-black" />
                          <span className={`font-bold ${m.winner === m.playerA?._id || m.winner === m.playerA?.username ? 'text-amber-400' : 'text-white'}`}>
                            {m.playerA?.username || '待定'}
                          </span>
                        </div>
                        <div className="text-center px-4">
                          <div className="text-2xl font-black text-white">{m.scoreA} <span className="text-zinc-600">:</span> {m.scoreB}</div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            m.status === 'ONGOING' ? 'text-green-400' : m.status === 'FINISHED' ? 'text-zinc-500' : 'text-zinc-600'
                          }`}>
                            {m.forfeited ? 'FORFEIT' : m.status === 'ONGOING' ? 'LIVE' : m.status === 'FINISHED' ? 'FINAL' : 'UPCOMING'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-bold ${m.winner === m.playerB?._id || m.winner === m.playerB?.username ? 'text-amber-400' : 'text-white'}`}>
                            {m.playerB?.username || '待定'}
                          </span>
                          <img src={m.playerB?.avatarUrl || '/assets/logos.png'} alt="" className="w-10 h-10 rounded-full object-cover bg-black" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500 text-center py-10">对局信息尚未公布</p>
              )}
            </motion.div>
          )}

          {activeTab === 'results' && (
            <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-[#15151e] border border-white/[0.05] rounded-2xl p-6 md:p-8">
              <ResultPodium
                tournamentId={id}
                results={publicResults.length > 0 ? publicResults : (tournament.results || []).map(r => ({
                  ...r,
                  userId: r.userId || r,
                  username: r.userId?.username || r.username,
                  avatarUrl: r.userId?.avatarUrl || r.avatarUrl,
                  rank: r.rank,
                }))}
                isManager={canManage && !isMSC2026Archive}
              />
            </motion.div>
          )}

          {/* #5.3: 审计日志 Tab */}
          {activeTab === 'audit' && (
            <motion.div key="audit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <AuditLogView
                tournamentId={id}
                isPublic={['FINISHED', 'ARCHIVED'].includes(tournament?.status)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* #1: 编辑报名信息弹窗 */}
        {editModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setEditModalOpen(false)}>
            <div className="bg-[#15151e] border border-white/[0.08] rounded-2xl p-6 md:p-8 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><FaEdit className="text-cyan-400" /> 编辑报名信息</h3>
                <button onClick={() => setEditModalOpen(false)} className="text-zinc-500 hover:text-zinc-300"><FaTimes /></button>
              </div>

              {tournament.registrationForm && tournament.registrationForm.length > 0 && (
                <div className="space-y-4 mb-6">
                  {tournament.registrationForm.map((field, idx) => (
                    <div key={idx}>
                      <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">
                        {field.label} {field.required && <span className="text-red-400">*</span>}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea rows="3" value={editFormAnswers[field.label] || ''} onChange={e => setEditFormAnswers({...editFormAnswers, [field.label]: e.target.value})} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none resize-y" placeholder={field.placeholder} />
                      ) : field.type === 'select' ? (
                        <select value={editFormAnswers[field.label] || ''} onChange={e => setEditFormAnswers({...editFormAnswers, [field.label]: e.target.value})} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none">
                          <option value="">请选择</option>
                          {(field.options || []).map((opt, oi) => <option key={oi} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <input type={field.type === 'number' ? 'number' : 'text'} value={editFormAnswers[field.label] || ''} onChange={e => setEditFormAnswers({...editFormAnswers, [field.label]: e.target.value})} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none" placeholder={field.placeholder} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setEditModalOpen(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 rounded-xl text-sm font-bold transition-all">
                  取消
                </button>
                <button
                  onClick={async () => {
                    setIsEditing(true);
                    try {
                      const res = await updateMyRegistration(id, editFormAnswers);
                      setMyRegistration(prev => ({ ...prev, ...res.data.registration }));
                      addToast(res.data.msg || '报名信息已更新', 'success');
                      setEditModalOpen(false);
                    } catch (err) {
                      addToast(err.response?.data?.msg || '更新失败', 'error');
                    } finally {
                      setIsEditing(false);
                    }
                  }}
                  disabled={isEditing}
                  className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-500/30 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isEditing ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                  {isEditing ? '保存中...' : '保存修改'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentDetail;
