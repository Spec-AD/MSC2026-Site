import { motion } from 'framer-motion';
import { FaUserShield, FaBan, FaExclamationTriangle } from 'react-icons/fa';

const Rules = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3 // 子元素依次延迟出现
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center pt-24 px-8 pb-20 relative overflow-hidden">
      
      {/* 1. 标题区域 */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-20 z-10"
      >
        <h2 className="text-blue-400 tracking-[0.5em] text-sm uppercase font-bold mb-4">
          Regulations
        </h2>
        <h1 className="text-5xl md:text-6xl font-black text-white tracking-widest drop-shadow-2xl">
          参赛须知
        </h1>
        <div className="w-16 h-1 bg-blue-500 mx-auto mt-8"></div>
      </motion.div>

      {/* 2. 规则列表区域 */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-4xl w-full flex flex-col gap-16 z-10"
      >
        
        {/* 规则 01: 账号一致性 */}
        <motion.div 
          variants={itemVariants}
          className="relative group pl-10 md:pl-0"
        >
          {/* 背景大数字水印 */}
          <div className="absolute -left-4 -top-10 text-[10rem] font-black text-white/5 select-none pointer-events-none transition-colors group-hover:text-blue-500/10 z-0">
            01
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div className="p-4 bg-blue-500/20 rounded-full border border-blue-500/30 text-blue-300 text-3xl">
              <FaUserShield />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">账号一致性验证</h3>
              <p className="text-gray-300 text-lg leading-relaxed font-light">
                任何选手必须使用和<span className="text-blue-400 font-bold mx-1">预选赛提交成绩相同</span>的舞萌账号进行正赛，否则不予参加正赛。
              </p>
            </div>
          </div>
        </motion.div>

        {/* 规则 02: 反作弊 */}
        <motion.div 
          variants={itemVariants}
          className="relative group pl-10 md:pl-0"
        >
          {/* 背景大数字水印 */}
          <div className="absolute -left-4 -top-10 text-[10rem] font-black text-white/5 select-none pointer-events-none transition-colors group-hover:text-red-500/10 z-0">
            02
          </div>

          <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div className="p-4 bg-red-500/20 rounded-full border border-red-500/30 text-red-300 text-3xl">
              <FaBan />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">公平竞技红线</h3>
              <p className="text-gray-300 text-lg leading-relaxed font-light">
                严禁使用第三方外挂软件或借助外部力量获得非正当成绩。
                <br />
                违者将<span className="text-red-400 font-bold mx-1 border-b border-red-500/50 pb-0.5">取消本次赛事一切成绩</span>，并两年内不得参加 MSC 系列比赛。
              </p>
            </div>
          </div>
        </motion.div>

      </motion.div>

      {/* 底部装饰：巨大的警示图标 (背景) */}
      <div className="fixed bottom-0 right-0 opacity-5 pointer-events-none z-0 translate-x-1/3 translate-y-1/4">
        <FaExclamationTriangle className="text-[40rem] text-white" />
      </div>

    </div>
  );
};

export default Rules;