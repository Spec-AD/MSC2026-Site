import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { 
  FaTrophy, FaCalendarAlt, FaUsers, FaArrowRight, FaStar, 
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

  // 赛事列表数据 (去除了原先的高饱和度颜色配置，转为状态标识)
  const tournamentList = [
    {
      id: 'msc-2026',
      title: 'MSC 2026',
      subtitle: '第二届 MSC 官方锦标赛',
      status: 'ONGOING', 
      statusLabel: '进行中',
      date: '2026.01.01 - 2026.07.13',
      participants: '已开启报名', 
      coverUrl: '/assets/bg.png', 
      hasStages: true 
    },
    {
      id: 'summer-cup',
      title: '夏季友谊赛 (代号)',
      subtitle: '娱乐向社区交流赛',
      status: 'UPCOMING',
      statusLabel: '筹备中',
      date: '敬请期待',
      participants: '-',
      coverUrl: '/assets/bg.png', 
      hasStages: false
    }
  ];

  // MSC 2026 流程阶段配置 (文字已本地化，剥离中二感)
  const mscStages = [
    {
      id: 'register',
      title: '赛事报名',
      desc: '提交参赛信息，获取预选赛资格',
      icon: FaPenNib,
      start: new Date('2026-01-01T00:00:00').getTime(),
      end: new Date('2026-07-01T23:59:59').getTime(),
      alwaysOpen: false,
      route: '/register' 
    },
    {
      id: 'qualifier',
      title: '预选海选',
      desc: '完成指定曲目，角逐正赛名额',
      icon: FaMusic,
      alwaysOpen: true, 
      route: '/qualifiers'
    },
    {
      id: 'groups',
      title: '选手分组',
      desc: '查看正赛分组名单与对阵表',
      icon: FaSitemap,
      start: new Date('2026-07-04T00:00:00').getTime(),
      end: Infinity,
      alwaysOpen: false,
      route: '/groups' 
    },
    {
      id: 'main',
      title: '正赛对局',
      desc: '正赛赛程跟踪与战况速递',
      icon: FaInfoCircle,
      start: new Date('2026-07-04T00:00:00').getTime(),
      end: Infinity,
      alwaysOpen: false,
      route: '/main-event'
    },
    {
      id: 'results',
      title: '赛事结果',
      desc: '最终名次公示与赛后总结',
      icon: FaMedal,
      start: new Date('2026-07-13T00:00:00').getTime(),
      end: Infinity,
      alwaysOpen: false,
      route: '/results'
    }
  ];

  return (
    <div className="w-full min-h-screen bg-[#111115] text-zinc-200 pt-20 md:pt-24 pb-20 px-4 md:px-8 font-sans selection:bg-zinc-600/40 relative">
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* --- 头部标题区 --- */}
        <div className="mb-10 md:mb-12 border-b border-white/[0.05] pb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
            <FaTrophy className="text-amber-400" />
            赛事大厅
          </h1>
          <p className="text-sm text-zinc-500 mt-2 font-medium flex items-center gap-2">
            <FaStar className="text-zinc-400" />
            探索并参与 PUREBEAT 官方及合作赛事
          </p>
        </div>

        {/* --- 赛事卡片矩阵 --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournamentList.map((tourney, index) => (
            <motion.div 
              key={tourney.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1, duration: 0.4 }}
              className={`group relative bg-[#18181c] border border-white/[0.05] rounded-3xl overflow-hidden transition-all duration-300 shadow-sm ${tourney.hasStages ? 'cursor-pointer hover:bg-[#1a1a20] hover:-translate-y-1 hover:shadow-md hover:border-white/[0.1]' : 'opacity-70 grayscale-[30%]'}`}
              onClick={() => {
                if (tourney.hasStages) setSelectedTournament(tourney.id);
              }}
            >
              {/* 海报区域 */}
              <div className="h-48 md:h-52 relative overflow-hidden bg-[#0a0a0c] border-b border-white/[0.05]">
                <img 
                  src={tourney.coverUrl} alt={tourney.title} 
                  className="w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700"
                />
                
                {/* 状态徽章 */}
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-lg text-xs font-bold backdrop-blur-md border ${tourney.status === 'ONGOING' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800/50 text-zinc-300 border-white/[0.05]'}`}>
                  {tourney.statusLabel}
                </div>
              </div>

              {/* 信息区域 */}
              <div className="p-6 md:p-8 relative flex flex-col">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-zinc-100 mb-1.5 group-hover:text-white transition-colors">
                    {tourney.title}
                  </h2>
                  <p className="text-zinc-400 text-sm font-medium">
                    {tourney.subtitle}
                  </p>
                </div>

                <div className="space-y-2.5 mb-8">
                  <div className="flex items-center gap-3 text-sm text-zinc-300 font-medium">
                    <div className="w-6 flex justify-center"><FaCalendarAlt className="text-zinc-500" /></div>
                    {tourney.date}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-300 font-medium">
                    <div className="w-6 flex justify-center"><FaUsers className="text-zinc-500" /></div>
                    {tourney.participants}
                  </div>
                </div>

                {/* 底部按钮 */}
                {user?.isRegistered && tourney.id === 'msc-2026' ? (
                  <div className="w-full py-3.5 mt-auto rounded-xl font-bold transition-all flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm">
                    <FaCheckCircle /> 您已报名
                  </div>
                ) : (
                  <button 
                    disabled={!tourney.hasStages}
                    className={`w-full py-3.5 mt-auto rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm active:scale-95 ${tourney.hasStages ? 'bg-zinc-200 hover:bg-white text-zinc-900 shadow-sm' : 'bg-[#141418] text-zinc-500 cursor-not-allowed border border-white/[0.05]'}`}
                  >
                    {tourney.hasStages ? <>进入赛事 <FaArrowRight className="text-xs" /></> : '暂未开放'}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* ========================================================= */}
        {/* 赛事阶段全屏悬浮窗 (Modal) */}
        {/* ========================================================= */}
        <AnimatePresence>
          {selectedTournament === 'msc-2026' && (
            <motion.div 
              initial={{ opacity: 0, backdropFilter: 'blur(0px)' }} 
              animate={{ opacity: 1, backdropFilter: 'blur(8px)' }} 
              exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              className="fixed inset-0 z-[200] bg-[#0a0a0c]/80 flex items-center justify-center p-4 md:p-8"
              onClick={() => setSelectedTournament(null)}
            >
              <motion.div 
                initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-3xl bg-[#18181c] border border-white/[0.05] rounded-[2rem] shadow-2xl overflow-hidden relative flex flex-col max-h-[85vh] md:max-h-[90vh]"
              >
                {/* Modal 头部 */}
                <div className="bg-[#141418] p-6 md:p-8 border-b border-white/[0.05] relative flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-5">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight">
                      MSC 2026 赛事通道
                    </h2>
                    <p className="text-zinc-500 text-sm font-medium mt-1">请选择您要进入的阶段环节</p>
                  </div>
                  
                  {/* 右侧操作区 */}
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => navigate('/tournament-info')}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.05] rounded-xl transition-all text-sm font-semibold active:scale-95"
                    >
                      <FaInfoCircle />
                      了解详情
                    </button>

                    <button 
                      onClick={() => setSelectedTournament(null)}
                      className="w-10 h-10 bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white rounded-full flex items-center justify-center transition-colors active:scale-90"
                    >
                      <FaTimes />
                    </button>
                  </div>
                </div>

                {/* Modal 阶段列表主体 (干净的时间轴) */}
                <div className="p-6 md:p-10 overflow-y-auto flex-1 custom-scrollbar bg-[#18181c]">
                  <div className="relative border-l-[3px] border-white/[0.05] ml-4 md:ml-6 space-y-8 pb-2">
                    
                    {mscStages.map((stage, index) => {
                      const isClickable = stage.alwaysOpen || (now >= stage.start && now <= stage.end);
                      const Icon = stage.icon;

                      return (
                        <div key={stage.id} className="relative pl-8 md:pl-10 group">
                          {/* 时间轴节点 (圆圈) */}
                          <div className={`absolute -left-[22px] top-1 w-10 h-10 rounded-full border-[3px] flex items-center justify-center transition-all duration-300 z-10 
                            ${isClickable ? 'bg-[#1a1a20] border-zinc-200 text-zinc-100 group-hover:scale-110' : 'bg-[#141418] border-zinc-800 text-zinc-600'}`}
                          >
                            {isClickable ? <Icon className="text-[15px]" /> : <FaLock className="text-sm" />}
                          </div>

                          {/* 阶段卡片 */}
                          <div 
                            onClick={() => {
                              if (isClickable && stage.route) navigate(stage.route);
                            }}
                            className={`p-5 md:p-6 rounded-2xl border transition-all duration-300 ${isClickable ? 'bg-[#141418] border-white/[0.05] cursor-pointer hover:bg-[#1a1a20] hover:border-zinc-500/50 hover:-translate-y-1 hover:shadow-sm' : 'bg-transparent border-transparent cursor-not-allowed opacity-50'}`}
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div>
                                <h3 className={`text-lg md:text-xl font-bold ${isClickable ? 'text-zinc-100 group-hover:text-white' : 'text-zinc-500'}`}>
                                  {stage.title}
                                </h3>
                                <p className={`mt-1.5 text-[15px] ${isClickable ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                  {stage.desc}
                                </p>
                                
                                {/* 开放时间提示 */}
                                {!stage.alwaysOpen && (
                                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-white/[0.03] text-zinc-500 border border-white/[0.05]">
                                    <FaCalendarAlt /> 
                                    {new Date(stage.start).toLocaleDateString()} - {stage.end === Infinity ? 'TBD' : new Date(stage.end).toLocaleDateString()}
                                  </div>
                                )}
                              </div>

                              {/* 操作提示箭头 */}
                              <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.02] border border-white/[0.05]">
                                {isClickable ? <FaArrowRight className="text-zinc-400 group-hover:translate-x-1 group-hover:text-zinc-100 transition-all" /> : <FaLock className="text-zinc-700" />}
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