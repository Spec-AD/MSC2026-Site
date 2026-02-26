import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaTrophy, FaCalendarAlt, FaUsers, FaArrowRight, FaStar } from 'react-icons/fa';

const Tournaments = () => {
  const navigate = useNavigate();

  // 赛事列表数据 (未来如果比赛变多，可以将这里改为从后端 API 拉取)
  const tournamentList = [
    {
      id: 'msc-2026',
      title: 'MSC 2026 预选赛',
      subtitle: 'Maimai DX Standard Championship',
      status: 'ONGOING', // 状态：ONGOING (进行中), UPCOMING (未开始), ENDED (已结束)
      date: '2026.03.01 - 2026.03.15',
      participants: '全球海选', 
      coverUrl: '/assets/bg.png', // 建议后期替换成你们 MSC 2026 的专属炫酷海报
      themeColor: 'from-orange-500 to-yellow-500',
      badgeColor: 'bg-green-500/20 text-green-400 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.3)]',
      route: '/qualifier' // 点击后跳转的路由
    },
    // 下面是一个“敬请期待”的占位卡片，让大厅看起来更丰满
    {
      id: 'summer-cup',
      title: 'Purebeat Summer Cup',
      subtitle: '夏日双排 2v2 娱乐赛',
      status: 'UPCOMING',
      date: 'COMING SOON IN AUG 2026',
      participants: '组队报名',
      coverUrl: '/assets/bg.png', 
      themeColor: 'from-blue-500 to-cyan-500',
      badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.3)]',
      route: null // 未开始的比赛不跳转
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
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`group relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden transition-all duration-500 shadow-xl ${tourney.route ? 'cursor-pointer hover:border-white/40 hover:-translate-y-2 hover:shadow-2xl' : 'opacity-80 grayscale-[30%]'}`}
            onClick={() => {
              if (tourney.route) navigate(tourney.route);
            }}
          >
            {/* 上半部分：赛事海报 & 状态角标 */}
            <div className="h-56 relative overflow-hidden bg-gray-900">
              <img 
                src={tourney.coverUrl} 
                alt={tourney.title} 
                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              
              {/* 状态角标 (如 ONGOING, UPCOMING) */}
              <div className={`absolute top-4 right-4 border px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest backdrop-blur-md ${tourney.badgeColor}`}>
                {tourney.status}
              </div>
            </div>

            {/* 下半部分：赛事详细信息 */}
            <div className="p-6 md:p-8 relative">
              {/* 悬浮的主题色小图标 */}
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

              {/* 操作按钮 */}
              <button 
                disabled={!tourney.route}
                className={`w-full py-4 rounded-xl font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${tourney.route ? 'bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 hover:border-white shadow-lg' : 'bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700'}`}
              >
                {tourney.route ? (
                  <>Enter Tournament <FaArrowRight /></>
                ) : (
                  'UNAVAILABLE'
                )}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Tournaments;