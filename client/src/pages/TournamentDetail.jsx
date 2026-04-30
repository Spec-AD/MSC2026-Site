import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTournamentStore, useBracketStore } from '../features/tournament/store';
import { selectStatusLabel, selectStatusColor } from '../features/tournament/store/tournamentStore';
import { createEventSource } from '../features/tournament/api/tournamentApi';
import QualifierRanking from '../features/tournament/components/qualifier/QualifierRanking';
import BracketView from '../features/tournament/components/bracket/BracketView';
import ResultPodium from '../features/tournament/components/common/ResultPodium';
import CountdownTimer from '../features/tournament/components/common/CountdownTimer';
import { getResults } from '../features/tournament/api/tournamentApi';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaArrowLeft, FaSpinner, FaUsers, FaMusic, FaSitemap, FaTrophy,
  FaCalendarAlt, FaCheckCircle, FaCog, FaClipboardList, FaMedal, FaInfoCircle, FaBook
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
  const esRef = useRef(null);

  // ---- Data load ----
  const loadData = useCallback(async () => {
    await fetchTournament(id);
  }, [id, fetchTournament]);

  useEffect(() => { loadData(); }, [loadData]);

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

  const now = new Date();
  const regOpen = tournament.registrationStart && tournament.registrationEnd &&
    now >= new Date(tournament.registrationStart) && now <= new Date(tournament.registrationEnd);
  const alreadyRegistered = user && tournament.registrations?.some(r =>
    (r.userId?._id || r.userId) === user._id || (r.userId?._id || r.userId)?.toString() === user._id
  );
  const canManage = user && ['ADM', 'CHM', 'TO'].includes(user.role);

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

  const tabs = [
    { id: 'overview', label: '概况', icon: FaInfoCircle },
    { id: 'rules', label: '规则', icon: FaBook },
    { id: 'qualifier', label: '预选赛', icon: FaMusic },
    { id: 'groups', label: '分组', icon: FaSitemap },
    { id: 'matches', label: '对局', icon: FaTrophy },
    { id: 'results', label: '结果', icon: FaMedal },
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
          {canManage && (
            <button onClick={() => navigate(`/tournament-manage/${id}`)} className="flex items-center gap-2 px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 border border-cyan-500/30 rounded-xl text-sm font-bold transition-all">
              <FaCog /> 管理赛事
            </button>
          )}
        </div>

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
        {regOpen && !alreadyRegistered && tournament.status === 'REGISTRATION' && (
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
        {alreadyRegistered && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3 text-green-400 font-bold">
              <FaCheckCircle /> 您已成功报名该赛事
            </div>
            {tournament.status === 'REGISTRATION' && (
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
                {['QUALIFYING', 'ONGOING', 'FINISHED', 'ARCHIVED'].includes(tournament.status) && (
                  <div>
                    <QualifierRanking
                      tournamentId={id}
                      advanceCount={tournament.advanceCount || 8}
                      isManager={canManage}
                      qualifierSongs={tournament.qualifierSongs || []}
                      qualifierStart={tournament.registrationStart}
                      qualifierEnd={tournament.endTime}
                    />
                  </div>
                )}
                {tournament.status === 'REGISTRATION' && (
                  <p className="text-zinc-500 text-center py-6 text-sm">预选赛尚未开始，请关注后续公告。</p>
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
                results={results.length > 0 ? results : (tournament.results || []).map(r => ({
                  ...r,
                  userId: r.userId || r,
                  username: r.userId?.username || r.username,
                  avatarUrl: r.userId?.avatarUrl || r.avatarUrl,
                  rank: r.rank,
                }))}
                isManager={canManage}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TournamentDetail;
