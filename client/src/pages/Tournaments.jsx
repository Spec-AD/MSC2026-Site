import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  FaCalendarAlt, FaUsers, FaArrowRight, 
  FaCheckCircle, FaPlus, FaTrophy
} from 'react-icons/fa';
import { useToast } from '../context/ToastContext';

const Tournaments = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); 

  const { addToast } = useToast();
  const [dynamicTournaments, setDynamicTournaments] = useState([]);
  const [isLoadingDynamic, setIsLoadingDynamic] = useState(false);

  useEffect(() => {
    const fetchDynamic = async () => {
      setIsLoadingDynamic(true);
      try {
        const res = await axios.get('/api/tournaments/list');
        setDynamicTournaments(res.data);
      } catch (err) { console.error('获取赛事列表失败', err); }
      finally { setIsLoadingDynamic(false); }
    };
    fetchDynamic();
  }, []);

  const canCreateTournament = user && ['ADM', 'CHM', 'TO'].includes(user.role);

  // 次级赛事（非主推的占位/动态赛事）
  const placeholderTournaments = [
    {
      id: 'summer-cup',
      title: '夏季社区友谊赛',
      subtitle: '娱乐向社区交流赛 (代号)',
      status: 'UPCOMING',
      statusLabel: '筹备中',
      date: 'COMING SOON',
      participants: '-',
      isPlaceholder: true,
    }
  ];

  // 主推赛事（取动态列表第一条，无则用纯占位）
  const featuredTournament = dynamicTournaments.length > 0
    ? { ...dynamicTournaments[0], isDynamic: true }
    : null;

  const dtStatusLabels = {
    'REGISTRATION': '报名中', 'QUALIFYING': '预选中',
    'ONGOING': '进行中', 'FINISHED': '已结束',
    'DRAFT': '草稿', 'ARCHIVED': '已归档',
  };

  return (
    <div className="w-full min-h-screen bg-[#0c0c11] text-zinc-200 pt-20 md:pt-24 pb-20 px-4 md:px-8 font-sans selection:bg-indigo-500/30 relative overflow-x-hidden">
      
      {/* ==================================================== */}
      {/* 背景：高级晕影与环境散光 */}
      {/* ==================================================== */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-cyan-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* --- 头部标题区 --- */}
        <div className="mb-10 text-left">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div>
            <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">
              赛事大厅
            </h1>
          </div>
          <p className="text-sm text-zinc-500 mt-3 font-medium">
            探索并参与 PUREBEAT 官方及合作赛事
          </p>
        </div>

        {/* --- 赛事列表 --- */}
        <div className="flex flex-col gap-6 md:gap-8">
          
          {/* ═══ 主推赛事 (Hero) ═══ */}
          <AnimatePresence mode="wait">
            {isLoadingDynamic && !featuredTournament ? (
              <motion.div
                key="loading-hero"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-[#15151e] border border-white/[0.05] rounded-3xl overflow-hidden"
              >
                <div className="w-full aspect-[21/10] md:aspect-[21/7] bg-[#0a0a0c] animate-pulse flex items-center justify-center">
                  <div className="text-zinc-700 text-sm font-medium">加载中...</div>
                </div>
              </motion.div>
            ) : featuredTournament ? (
              <motion.div
                key={featuredTournament._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/tournament/${featuredTournament._id}`)}
                className="group relative bg-[#15151e] border border-white/[0.05] rounded-3xl overflow-hidden transition-all duration-500 shadow-sm cursor-pointer hover:border-amber-500/30 hover:shadow-[0_8px_30px_rgba(251,191,36,0.1)]"
              >
                <div className="relative w-full aspect-[21/10] md:aspect-[21/7] bg-[#0a0a0c] overflow-hidden">
                  {featuredTournament.coverUrl ? (
                    <img 
                      src={featuredTournament.coverUrl} alt={featuredTournament.title} 
                      className="w-full h-full object-cover opacity-60 grayscale-[20%] group-hover:grayscale-0 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-900/20 to-purple-900/20" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#15151e] via-[#15151e]/40 to-transparent pointer-events-none" />
                  
                  {/* 状态徽章 */}
                  <div className="absolute top-6 right-6 md:top-8 md:right-8">
                    <span className={`px-4 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-widest backdrop-blur-md border ${
                      ['REGISTRATION', 'QUALIFYING', 'ONGOING'].includes(featuredTournament.status)
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-zinc-800/50 text-zinc-300 border-white/[0.05]'
                    }`}>
                      {dtStatusLabels[featuredTournament.status] || featuredTournament.status}
                    </span>
                  </div>

                  <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 pr-6">
                    <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 drop-shadow-md tracking-tight group-hover:text-amber-50 transition-colors">
                      {featuredTournament.title}
                    </h2>
                    <p className="text-zinc-300 text-sm md:text-base font-medium drop-shadow-sm">
                      {featuredTournament.subtitle || 'PureBeat 官方赛事'}
                    </p>
                  </div>
                </div>

                {/* 底部信息栏 */}
                <div className="px-6 py-5 md:px-8 md:py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#15151e]">
                  <div className="flex flex-wrap items-center gap-6">
                    {featuredTournament.startTime && (
                      <div className="flex items-center gap-2.5 text-sm text-zinc-400 font-medium">
                        <FaCalendarAlt className="text-zinc-600" />
                        <span style={{ fontFamily: "'Quicksand', sans-serif" }}>
                          {new Date(featuredTournament.startTime).toLocaleDateString('zh-CN')}
                          {featuredTournament.endTime ? ` — ${new Date(featuredTournament.endTime).toLocaleDateString('zh-CN')}` : ''}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2.5 text-sm text-zinc-400 font-medium">
                      <FaUsers className="text-zinc-600" />
                      <span>{featuredTournament.registrationCount || 0} 人已报名</span>
                    </div>
                    {featuredTournament.advanceCount && (
                      <div className="flex items-center gap-2.5 text-sm text-zinc-400 font-medium">
                        <FaTrophy className="text-zinc-600" />
                        <span>晋级 {featuredTournament.advanceCount} 人</span>
                      </div>
                    )}
                  </div>

                  <button className="px-8 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm active:scale-95 bg-zinc-200 hover:bg-white text-zinc-900 shadow-sm">
                    进入赛事通道 <FaArrowRight className="text-xs ml-1" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty-hero"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-[#15151e] border border-white/[0.05] rounded-3xl overflow-hidden"
              >
                <div className="w-full aspect-[21/10] md:aspect-[21/7] bg-[#0a0a0c] flex items-center justify-center">
                  <div className="text-center">
                    <FaTrophy className="text-4xl md:text-6xl text-zinc-800 mx-auto mb-3" />
                    <p className="text-zinc-600 text-sm font-medium">暂无可用的主推赛事</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══ 赛事网格 ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 动态赛事 */}
            {dynamicTournaments.map((dt, index) => {
              // 跳过已在 Hero 展示的
              if (index === 0) return null;
              return (
                <motion.div
                  key={dt._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
                  onClick={() => navigate(`/tournament/${dt._id}`)}
                  className="group relative bg-[#15151e] border border-white/[0.05] rounded-3xl overflow-hidden transition-all duration-300 shadow-sm cursor-pointer hover:bg-[#1a1a24] hover:-translate-y-1 hover:border-white/[0.1]"
                >
                  <div className="h-32 md:h-40 relative overflow-hidden bg-[#0a0a0c] border-b border-white/[0.05]">
                    {dt.coverUrl ? (
                      <img src={dt.coverUrl} alt="" className="w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 to-transparent group-hover:scale-105 transition-transform duration-700"></div>
                    )}
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest backdrop-blur-md border ${
                        ['REGISTRATION', 'QUALIFYING', 'ONGOING'].includes(dt.status)
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-zinc-800/50 text-zinc-400 border-white/[0.05]'
                      }`}>
                        {dtStatusLabels[dt.status] || dt.status}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 relative flex flex-col h-[calc(100%-8rem)] md:h-[calc(100%-10rem)]">
                    <div className="mb-5">
                      <h2 className="text-xl font-bold text-zinc-100 mb-1.5 group-hover:text-white transition-colors truncate">{dt.title}</h2>
                      {dt.subtitle && <p className="text-zinc-500 text-xs font-medium truncate">{dt.subtitle}</p>}
                    </div>
                    <div className="space-y-2 mb-6 mt-auto">
                      <div className="flex items-center gap-2.5 text-xs text-zinc-400 font-medium">
                        <FaUsers className="text-zinc-600" />
                        <span>{dt.registrationCount || 0} 人已报名</span>
                      </div>
                      {dt.startTime && (
                        <div className="flex items-center gap-2.5 text-xs text-zinc-400 font-medium">
                          <FaCalendarAlt className="text-zinc-600" />
                          <span>{new Date(dt.startTime).toLocaleDateString('zh-CN')}</span>
                        </div>
                      )}
                    </div>
                    <button className="w-full py-3 mt-auto rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-xs active:scale-95 bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.05]">
                      查看详情 <FaArrowRight className="text-[10px]" />
                    </button>
                  </div>
                </motion.div>
              );
            })}

            {/* 占位赛事（纯展示） */}
            {placeholderTournaments.map((tourney, index) => (
              <motion.div 
                key={tourney.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                className="group relative bg-[#15151e] border border-white/[0.05] rounded-3xl overflow-hidden transition-all duration-300 shadow-sm opacity-80 grayscale-[40%] cursor-default"
              >
                <div className="h-32 md:h-40 relative overflow-hidden bg-[#0a0a0c] border-b border-white/[0.05]">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-transparent"></div>
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest backdrop-blur-md border bg-zinc-800/50 text-zinc-400 border-white/[0.05]">
                      {tourney.statusLabel}
                    </span>
                  </div>
                </div>

                <div className="p-6 relative flex flex-col h-[calc(100%-8rem)] md:h-[calc(100%-10rem)]">
                  <div className="mb-5">
                    <h2 className="text-xl font-bold text-zinc-100 mb-1.5 truncate">{tourney.title}</h2>
                    <p className="text-zinc-500 text-xs font-medium truncate">{tourney.subtitle}</p>
                  </div>
                  <div className="space-y-2 mb-6 mt-auto">
                    <div className="flex items-center gap-2.5 text-xs text-zinc-400 font-medium">
                      <FaCalendarAlt className="text-zinc-600" />
                      <span style={{ fontFamily: "'Quicksand', sans-serif" }}>{tourney.date}</span>
                    </div>
                  </div>
                  <button disabled className="w-full py-3 mt-auto rounded-xl font-bold flex items-center justify-center gap-2 text-xs bg-transparent text-zinc-600 cursor-not-allowed border border-white/[0.02]">
                    暂未开放
                  </button>
                </div>
              </motion.div>
            ))}

            {/* 加载骨架 */}
            {isLoadingDynamic && dynamicTournaments.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-1 md:col-span-2 flex items-center justify-center py-16"
              >
                <div className="text-zinc-600 text-sm">加载赛事列表中...</div>
              </motion.div>
            )}
          </div>

          {/* 管理员创建赛事按钮 */}
          {canCreateTournament && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 flex justify-center">
              <button
                onClick={() => {
                  const title = window.prompt('请输入新赛事的标题：');
                  if (!title) return;
                  const token = localStorage.getItem('token');
                  axios.post('/api/tournaments/create', { title }, { headers: { Authorization: `Bearer ${token}` } })
                    .then(res => {
                      addToast(res.data.msg, 'success');
                      navigate(`/tournament-manage/${res.data.data._id}`);
                    })
                    .catch(err => addToast(err.response?.data?.msg || '创建失败', 'error'));
                }}
                className="flex items-center gap-3 px-8 py-4 bg-[#15151e] border border-dashed border-white/[0.1] hover:border-cyan-500/40 rounded-2xl text-zinc-400 hover:text-cyan-400 transition-all group"
              >
                <FaPlus className="text-lg group-hover:rotate-90 transition-transform" />
                <span className="font-bold tracking-wide">创建新赛事</span>
              </button>
            </motion.div>
          )}

        </div>

      </div>
    </div>
  );
};

export default Tournaments;
