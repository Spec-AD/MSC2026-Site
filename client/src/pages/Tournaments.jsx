import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { 
  FaCalendarAlt, FaUsers, FaArrowRight, 
  FaTimes, FaLock, FaCheckCircle, FaPenNib, FaMusic, FaSitemap, FaInfoCircle, FaMedal
} from 'react-icons/fa';
import { useToast } from '../context/ToastContext';

const Tournaments = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); 

  const [selectedTournament, setSelectedTournament] = useState(null);
  const [now, setNow] = useState(Date.now());
  const { addToast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const tournamentList = [
    {
      id: 'msc-2026',
      title: 'MSC 2026',
      subtitle: '第二届 MSC 官方锦标赛',
      status: 'ONGOING', 
      statusLabel: '正在进行',
      date: '2026.01.01 - 2026.07.13',
      participants: '已开启报名', 
      coverUrl: '/assets/register_banner.png', // 建议使用真实的横幅图
      hasStages: true,
      isHero: true // 标记为主推赛事
    },
    {
      id: 'summer-cup',
      title: '夏季社区友谊赛',
      subtitle: '娱乐向社区交流赛 (代号)',
      status: 'UPCOMING',
      statusLabel: '筹备中',
      date: 'COMING SOON',
      participants: '-',
      coverUrl: '/assets/bg.png', 
      hasStages: false,
      isHero: false
    }
  ];

  const mscStages = [
    {
      id: 'register', title: '赛事报名', desc: '提交参赛信息，获取预选赛资格', icon: FaPenNib,
      start: new Date('2026-01-01T00:00:00').getTime(), end: new Date('2026-07-01T23:59:59').getTime(),
      alwaysOpen: false, route: '/register' 
    },
    {
      id: 'qualifier', title: '预选海选', desc: '完成指定曲目，角逐正赛名额', icon: FaMusic,
      alwaysOpen: true, route: '/qualifiers'
    },
    {
      id: 'groups', title: '选手分组', desc: '查看正赛分组名单与对阵表', icon: FaSitemap,
      start: new Date('2026-07-04T00:00:00').getTime(), end: Infinity,
      alwaysOpen: false, route: '/groups' 
    },
    {
      id: 'main', title: '正赛对局', desc: '正赛赛程跟踪与战况速递', icon: FaInfoCircle,
      start: new Date('2026-07-04T00:00:00').getTime(), end: Infinity,
      alwaysOpen: false, route: '/main-event'
    },
    {
      id: 'results', title: '赛事结果', desc: '最终名次公示与赛后总结', icon: FaMedal,
      start: new Date('2026-07-13T00:00:00').getTime(), end: Infinity,
      alwaysOpen: false, route: '/results'
    }
  ];

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

        {/* --- 赛事矩阵布局 --- */}
        <div className="flex flex-col gap-6 md:gap-8">
          
          {/* 主推赛事 (Hero) */}
          {tournamentList.filter(t => t.isHero).map((tourney, index) => (
            <motion.div 
              key={tourney.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              onClick={() => { if (tourney.hasStages) setSelectedTournament(tourney.id); }}
              className={`group relative bg-[#15151e] border border-white/[0.05] rounded-3xl overflow-hidden transition-all duration-500 shadow-sm ${tourney.hasStages ? 'cursor-pointer hover:border-amber-500/30 hover:shadow-[0_8px_30px_rgba(251,191,36,0.1)]' : ''}`}
            >
              <div className="relative w-full aspect-[21/10] md:aspect-[21/7] bg-[#0a0a0c] overflow-hidden">
                <img 
                  src={tourney.coverUrl} alt={tourney.title} 
                  className="w-full h-full object-cover opacity-60 grayscale-[20%] group-hover:grayscale-0 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#15151e] via-[#15151e]/40 to-transparent pointer-events-none" />
                
                {/* 状态徽章 */}
                <div className="absolute top-6 right-6 md:top-8 md:right-8">
                  <span className={`px-4 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-widest backdrop-blur-md border ${tourney.status === 'ONGOING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-zinc-800/50 text-zinc-300 border-white/[0.05]'}`}>
                    {tourney.statusLabel}
                  </span>
                </div>

                <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 pr-6">
                  <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 drop-shadow-md tracking-tight group-hover:text-amber-50 transition-colors">
                    {tourney.title}
                  </h2>
                  <p className="text-zinc-300 text-sm md:text-base font-medium drop-shadow-sm">
                    {tourney.subtitle}
                  </p>
                </div>
              </div>

              {/* 底部信息栏 */}
              <div className="px-6 py-5 md:px-8 md:py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#15151e]">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2.5 text-sm text-zinc-400 font-medium">
                    <FaCalendarAlt className="text-zinc-600" />
                    <span style={{ fontFamily: "'Quicksand', sans-serif" }}>{tourney.date}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-zinc-400 font-medium">
                    <FaUsers className="text-zinc-600" />
                    <span>{tourney.participants}</span>
                  </div>
                </div>

                {user?.isRegistered && tourney.id === 'msc-2026' ? (
                  <div className="px-6 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm">
                    <FaCheckCircle /> 您已报名
                  </div>
                ) : (
                  <button 
                    disabled={!tourney.hasStages}
                    className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm active:scale-95 ${tourney.hasStages ? 'bg-zinc-200 hover:bg-white text-zinc-900 shadow-sm' : 'bg-[#1a1a24] text-zinc-600 cursor-not-allowed border border-white/[0.05]'}`}
                  >
                    {tourney.hasStages ? <>进入赛事通道 <FaArrowRight className="text-xs ml-1" /></> : '暂未开放'}
                  </button>
                )}
              </div>
            </motion.div>
          ))}

          {/* 次级赛事网格 (Sub) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tournamentList.filter(t => !t.isHero).map((tourney, index) => (
              <motion.div 
                key={tourney.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
                onClick={() => { if (tourney.hasStages) setSelectedTournament(tourney.id); }}
                className={`group relative bg-[#15151e] border border-white/[0.05] rounded-3xl overflow-hidden transition-all duration-300 shadow-sm ${tourney.hasStages ? 'cursor-pointer hover:bg-[#1a1a24] hover:-translate-y-1 hover:border-white/[0.1]' : 'opacity-80 grayscale-[40%]'}`}
              >
                <div className="h-32 md:h-40 relative overflow-hidden bg-[#0a0a0c] border-b border-white/[0.05]">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-transparent group-hover:scale-105 transition-transform duration-700"></div>
                  
                  <div className="absolute top-4 right-4">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest backdrop-blur-md border ${tourney.status === 'ONGOING' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800/50 text-zinc-400 border-white/[0.05]'}`}>
                      {tourney.statusLabel}
                    </span>
                  </div>
                </div>

                <div className="p-6 relative flex flex-col h-[calc(100%-8rem)] md:h-[calc(100%-10rem)]">
                  <div className="mb-5">
                    <h2 className="text-xl font-bold text-zinc-100 mb-1.5 group-hover:text-white transition-colors truncate">
                      {tourney.title}
                    </h2>
                    <p className="text-zinc-500 text-xs font-medium truncate">
                      {tourney.subtitle}
                    </p>
                  </div>

                  <div className="space-y-2 mb-6 mt-auto">
                    <div className="flex items-center gap-2.5 text-xs text-zinc-400 font-medium">
                      <FaCalendarAlt className="text-zinc-600" />
                      <span style={{ fontFamily: "'Quicksand', sans-serif" }}>{tourney.date}</span>
                    </div>
                  </div>

                  <button 
                    disabled={!tourney.hasStages}
                    className={`w-full py-3 mt-auto rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-xs active:scale-95 ${tourney.hasStages ? 'bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.05]' : 'bg-transparent text-zinc-600 cursor-not-allowed border border-white/[0.02]'}`}
                  >
                    {tourney.hasStages ? '进入赛事' : '暂未开放'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

        </div>

        {/* ========================================================= */}
        {/* 赛事阶段全屏悬浮窗 (Modal) */}
        {/* ========================================================= */}
        <AnimatePresence>
          {selectedTournament === 'msc-2026' && (
            <motion.div 
              initial={{ opacity: 0, backdropFilter: 'blur(0px)' }} 
              animate={{ opacity: 1, backdropFilter: 'blur(12px)' }} 
              exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              className="fixed inset-0 z-[200] bg-[#0c0c11]/80 flex items-center justify-center p-4 md:p-8"
              onClick={() => setSelectedTournament(null)}
            >
              <motion.div 
                initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-3xl bg-[#15151e] border border-white/[0.05] rounded-3xl shadow-2xl overflow-hidden relative flex flex-col max-h-[85vh] md:max-h-[90vh]"
              >
                {/* Modal 头部 */}
                <div className="bg-[#1a1a24] p-6 md:p-8 border-b border-white/[0.05] relative flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-5">
                  <div>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-1 h-3.5 bg-amber-400 rounded-full shadow-[0_0_6px_rgba(251,191,36,0.5)]"></div>
                      <h3 className="text-[11px] uppercase tracking-widest text-amber-400 font-bold">
                        Tournament Hub
                      </h3>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight">
                      MSC 2026 赛事通道
                    </h2>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => navigate('/tournament-info')}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.05] rounded-xl transition-all text-sm font-bold active:scale-95"
                    >
                      <FaInfoCircle />
                      赛事规章
                    </button>

                    <button 
                      onClick={() => setSelectedTournament(null)}
                      className="w-10 h-10 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] text-zinc-400 hover:text-white rounded-full flex items-center justify-center transition-colors active:scale-90"
                    >
                      <FaTimes />
                    </button>
                  </div>
                </div>

                {/* Modal 阶段列表主体 */}
                <div className="p-6 md:p-10 overflow-y-auto flex-1 custom-scrollbar bg-[#15151e]">
                  <div className="relative border-l-2 border-white/[0.05] ml-4 md:ml-6 space-y-8 pb-4">
                    
                    {mscStages.map((stage) => {
                      const isClickable = stage.alwaysOpen || (now >= stage.start && now <= stage.end);
                      const Icon = stage.icon;

                      return (
                        <div key={stage.id} className="relative pl-8 md:pl-12 group">
                          {/* 时间轴节点 */}
                          <div className={`absolute -left-[17px] top-2 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 z-10 
                            ${isClickable ? 'bg-amber-400 border-amber-400 text-zinc-900 group-hover:scale-110 shadow-[0_0_10px_rgba(251,191,36,0.3)]' : 'bg-[#15151e] border-zinc-700 text-zinc-600'}`}
                          >
                            {isClickable ? <Icon className="text-[13px]" /> : <FaLock className="text-[11px]" />}
                          </div>

                          {/* 阶段卡片 */}
                          <div 
                            onClick={() => {
                              if (isClickable && stage.route) navigate(stage.route);
                            }}
                            className={`p-5 md:p-6 rounded-2xl border transition-all duration-300 ${isClickable ? 'bg-[#1a1a24] border-white/[0.05] cursor-pointer hover:bg-white/[0.04] hover:border-amber-500/30 hover:-translate-y-1 hover:shadow-lg' : 'bg-transparent border-transparent cursor-not-allowed opacity-40'}`}
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div>
                                <h3 className={`text-lg md:text-xl font-bold ${isClickable ? 'text-zinc-100 group-hover:text-amber-50' : 'text-zinc-500'}`}>
                                  {stage.title}
                                </h3>
                                <p className={`mt-1.5 text-sm ${isClickable ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                  {stage.desc}
                                </p>
                                
                                {!stage.alwaysOpen && (
                                  <div 
                                    className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-md bg-black/40 text-zinc-500 border border-white/[0.05] uppercase tracking-widest"
                                    style={{ fontFamily: "'Quicksand', sans-serif" }}
                                  >
                                    <FaCalendarAlt className="text-[10px]" /> 
                                    {new Date(stage.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
                                    {' - '} 
                                    {stage.end === Infinity ? 'TBD' : new Date(stage.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </div>
                                )}
                              </div>

                              <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.02] border border-white/[0.05]">
                                {isClickable ? <FaArrowRight className="text-zinc-400 group-hover:translate-x-1 group-hover:text-amber-400 transition-all" /> : <FaLock className="text-zinc-700" />}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default Tournaments;