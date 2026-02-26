import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { 
  FaTrophy, FaCalendarAlt, FaUsers, FaArrowRight, FaStar, 
  FaTimes, FaLock, FaCheckCircle, FaPenNib, FaMusic, FaSitemap, FaInfoCircle, FaMedal
} from 'react-icons/fa';

const Tournaments = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // 获取当前登录用户信息

  // 控制悬浮窗的显示状态
  const [selectedTournament, setSelectedTournament] = useState(null);
  
  // 当前时间，用于判断阶段是否开放
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // 每秒更新一次当前时间，确保状态实时切换
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 赛事列表数据
  const tournamentList = [
    {
      id: 'msc-2026',
      title: 'MSC 2026',
      subtitle: '第二届MSC官方赛事',
      status: 'ONGOING', 
      date: '2026.01.01 - 2026.07.13',
      participants: '报名参赛', 
      coverUrl: '/assets/bg.png', 
      themeColor: 'from-orange-500 to-yellow-500',
      badgeColor: 'bg-green-500/20 text-green-400 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.3)]',
      hasStages: true // 表示点击后弹出阶段选择框
    },
    {
      id: 'summer-cup',
      title: '敬请期待...',
      subtitle: '-',
      status: 'UPCOMING',
      date: '-',
      participants: '-',
      coverUrl: '/assets/bg.png', 
      themeColor: 'from-blue-500 to-cyan-500',
      badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.3)]',
      hasStages: false
    }
  ];

  // MSC 2026 的 5 个流程阶段配置
  const mscStages = [
    {
      id: 'register',
      title: 'REGISTRATION / 赛事报名',
      desc: '提交参赛信息，获取预选赛资格',
      icon: FaPenNib,
      start: new Date('2026-01-01T00:00:00').getTime(),
      end: new Date('2026-07-01T23:59:59').getTime(),
      alwaysOpen: false,
      route: '/register' // 指向你原本做好的报名页路由
    },
    {
      id: 'qualifier',
      title: 'QUALIFIERS / 预选赛 (海选)',
      desc: '指定曲目打分，角逐正赛名额',
      icon: FaMusic,
      alwaysOpen: true, // 预选赛任何时候都可点击
      route: '/qualifiers'
    },
    {
      id: 'groups',
      title: 'GROUP STAGE / 选手分组',
      desc: '查看正赛分组名单与对阵表',
      icon: FaSitemap,
      start: new Date('2026-07-04T00:00:00').getTime(),
      end: Infinity,
      alwaysOpen: false,
      route: '/groups' // 留空或填未来路由
    },
    {
      id: 'main',
      title: 'MAIN EVENT / 正赛详情',
      desc: '正赛赛程跟踪与战况速递',
      icon: FaInfoCircle,
      start: new Date('2026-07-04T00:00:00').getTime(),
      end: Infinity,
      alwaysOpen: false,
      route: '/main-event'
    },
    {
      id: 'results',
      title: 'RESULTS / 赛事结果',
      desc: '最终名次公示',
      icon: FaMedal,
      start: new Date('2026-07-13T00:00:00').getTime(),
      end: Infinity,
      alwaysOpen: false,
      route: '/results'
    }
  ];

  return (
    <div className="w-full min-h-screen pb-24 text-white px-4 md:px-8 max-w-7xl mx-auto pt-24">
      
      {/* --- 头部标题区 --- */}
      <div className="mb-12 border-b border-white/10 pb-6">
        <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 drop-shadow-lg flex items-center gap-4">
          <FaTrophy className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
          TOURNAMENTS.
        </h1>
        <p className="text-gray-400 font-mono text-sm tracking-[0.2em] uppercase mt-4 flex items-center gap-2">
          <FaStar className="text-yellow-500" />
          Purebeat Official & Authorized Competitions
        </p>
      </div>

      {/* --- 赛事卡片矩阵 --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tournamentList.map((tourney, index) => (
          <motion.div 
            key={tourney.id}
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
            className={`group relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden transition-all duration-500 shadow-xl ${tourney.hasStages ? 'cursor-pointer hover:border-orange-500/50 hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(249,115,22,0.2)]' : 'opacity-80 grayscale-[30%]'}`}
            onClick={() => {
              if (tourney.hasStages) setSelectedTournament(tourney.id);
            }}
          >
            {/* 赛事海报区域 */}
            <div className="h-56 relative overflow-hidden bg-gray-900">
              <img 
                src={tourney.coverUrl} alt={tourney.title} 
                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              
              <div className={`absolute top-4 right-4 border px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest backdrop-blur-md ${tourney.badgeColor}`}>
                {tourney.status}
              </div>
            </div>

            {/* 赛事信息区域 */}
            <div className="p-6 md:p-8 relative">
              <div className={`absolute -top-8 right-8 w-16 h-16 bg-gradient-to-br ${tourney.themeColor} rounded-2xl rotate-12 flex items-center justify-center shadow-lg group-hover:rotate-0 group-hover:scale-110 transition-all duration-500 z-10`}>
                <FaTrophy className="text-3xl text-white drop-shadow-md" />
              </div>

              <h2 className="text-2xl md:text-3xl font-black italic tracking-tight text-white mb-1 drop-shadow-md">
                {tourney.title}
              </h2>
              <p className="text-gray-400 text-sm font-bold tracking-wider mb-6">
                {tourney.subtitle}
              </p>

              <div className="space-y-3 mb-8 border-t border-white/10 pt-6">
                <div className="flex items-center gap-3 text-sm text-gray-300 font-mono">
                  <FaCalendarAlt className="text-gray-500 text-lg" />
                  {tourney.date}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-300 font-mono">
                  <FaUsers className="text-gray-500 text-lg" />
                  {tourney.participants}
                </div>
              </div>

              {/* 按钮与“已报名”状态 */}
              {user?.isRegistered && tourney.id === 'msc-2026' ? (
                <div className="w-full py-4 rounded-xl font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 bg-green-500/20 text-green-400 border border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                  <FaCheckCircle className="text-xl" /> YOU ARE REGISTERED
                </div>
              ) : (
                <button 
                  disabled={!tourney.hasStages}
                  className={`w-full py-4 rounded-xl font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${tourney.hasStages ? 'bg-white/10 hover:bg-orange-600 text-white border border-white/20 hover:border-orange-500 shadow-lg' : 'bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700'}`}
                >
                  {tourney.hasStages ? <>ENTER TOURNAMENT <FaArrowRight /></> : 'UNAVAILABLE'}
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
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
            onClick={() => setSelectedTournament(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl bg-gray-900 border border-orange-500/30 rounded-3xl shadow-[0_0_50px_rgba(249,115,22,0.2)] overflow-hidden relative flex flex-col max-h-[90vh]"
            >
              {/* Modal 头部 */}
              <div className="bg-black/60 p-6 md:p-8 border-b border-orange-500/20 relative flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter text-orange-500 drop-shadow-md">
                    TOURNAMENT STAGES
                  </h2>
                  <p className="text-gray-400 font-mono text-sm tracking-widest mt-1">MSC 2026 赛事规程与通道</p>
                </div>
                <button 
                  onClick={() => setSelectedTournament(null)}
                  className="w-10 h-10 bg-white/10 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <FaTimes />
                </button>
              </div>

              {/* Modal 阶段列表主体 */}
              <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
                <div className="relative border-l-2 border-orange-500/20 ml-6 md:ml-10 space-y-8 pb-4">
                  
                  {mscStages.map((stage, index) => {
                    const isClickable = stage.alwaysOpen || (now >= stage.start && now <= stage.end);
                    const Icon = stage.icon;

                    return (
                      <div key={stage.id} className="relative pl-8 md:pl-12 group">
                        {/* 时间轴节点 (圆圈) */}
                        <div className={`absolute -left-[25px] md:-left-[25px] top-1 w-12 h-12 rounded-full border-4 flex items-center justify-center transition-all duration-300 z-10 
                          ${isClickable ? 'bg-gray-900 border-orange-500 text-orange-400 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(249,115,22,0.5)]' : 'bg-gray-800 border-gray-600 text-gray-500'}`}
                        >
                          {isClickable ? <Icon className="text-xl" /> : <FaLock className="text-lg" />}
                        </div>

                        {/* 阶段卡片 */}
                        <div 
                          onClick={() => {
                            if (isClickable && stage.route) navigate(stage.route);
                          }}
                          className={`p-5 md:p-6 rounded-2xl border transition-all duration-300 ${isClickable ? 'bg-white/5 border-orange-500/30 cursor-pointer hover:bg-orange-500/10 hover:border-orange-500 hover:-translate-y-1 hover:shadow-lg' : 'bg-gray-800/30 border-gray-700/50 cursor-not-allowed opacity-60 grayscale'}`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <h3 className={`text-xl md:text-2xl font-black italic tracking-wide ${isClickable ? 'text-white' : 'text-gray-500'}`}>
                                {stage.title}
                              </h3>
                              <p className={`mt-1 text-sm ${isClickable ? 'text-gray-300' : 'text-gray-600'}`}>
                                {stage.desc}
                              </p>
                              
                              {/* 开放时间提示 */}
                              {!stage.alwaysOpen && (
                                <div className="mt-3 inline-flex items-center gap-2 text-xs font-mono px-2 py-1 rounded bg-black/40 text-gray-400 border border-white/5">
                                  <FaCalendarAlt /> 
                                  {new Date(stage.start).toLocaleDateString()} - {stage.end === Infinity ? 'TBD' : new Date(stage.end).toLocaleDateString()}
                                </div>
                              )}
                            </div>

                            {/* 操作提示箭头 */}
                            <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-black/40">
                              {isClickable ? <FaArrowRight className="text-orange-400 group-hover:translate-x-1 transition-transform" /> : <FaLock className="text-gray-600" />}
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
  );
};

export default Tournaments;