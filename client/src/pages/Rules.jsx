import { motion } from 'framer-motion';
import { FaUserShield, FaBan, FaExclamationTriangle } from 'react-icons/fa';

const Rules = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3 
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 }, // 手机端 y 轴位移稍微减小，更自然
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    /* 优化：
       - pt-16 (手机) -> pt-24 (电脑)
       - px-6 (手机) -> px-8 (电脑)
    */
    <div className="w-full min-h-screen flex flex-col items-center pt-16 md:pt-24 px-6 md:px-8 pb-20 relative overflow-hidden">
      
      {/* 1. 标题区域 */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 md:mb-20 z-10"
      >
        <h2 className="text-blue-400 tracking-[0.3em] md:tracking-[0.5em] text-xs md:text-sm uppercase font-bold mb-4">
          Regulations
        </h2>
        {/* 优化：text-4xl (手机) -> text-6xl (电脑) */}
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-widest drop-shadow-2xl">
          参赛须知
        </h1>
        <div className="w-12 md:w-16 h-1 bg-blue-500 mx-auto mt-6 md:mt-8"></div>
      </motion.div>

      {/* 2. 规则列表区域 */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        /* 优化：gap-12 (手机) -> gap-16 (电脑) */
        className="max-w-4xl w-full flex flex-col gap-12 md:gap-16 z-10"
      >
        
        {/* 规则 01: 账号一致性 */}
        <motion.div 
          variants={itemVariants}
          className="relative group px-2 md:px-0"
        >
          {/* 优化：背景大数字在手机端缩小为 6rem，防止遮挡文字 */}
          <div className="absolute -left-2 -top-6 md:-left-4 md:-top-10 text-[6rem] md:text-[10rem] font-black text-white/[0.03] md:text-white/5 select-none pointer-events-none transition-colors group-hover:text-blue-500/10 z-0">
            01
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row gap-4 md:gap-6 items-center md:items-center text-center md:text-left">
            <div className="p-3 md:p-4 bg-blue-500/20 rounded-full border border-blue-500/30 text-blue-300 text-2xl md:text-3xl">
              <FaUserShield />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">账号一致性验证</h3>
              <p className="text-gray-300 text-base md:text-lg leading-relaxed font-light">
                选手必须使用和<span className="text-blue-400 font-bold mx-1">预选赛提交成绩相同</span>的舞萌账号进行正赛。
              </p>
            </div>
          </div>
        </motion.div>

        {/* 规则 02: 反作弊 */}
        <motion.div 
          variants={itemVariants}
          className="relative group px-2 md:px-0"
        >
          {/* 背景大数字 */}
          <div className="absolute -left-2 -top-6 md:-left-4 md:-top-10 text-[6rem] md:text-[10rem] font-black text-white/[0.03] md:text-white/5 select-none pointer-events-none transition-colors group-hover:text-red-500/10 z-0">
            02
          </div>

          <div className="relative z-10 flex flex-col md:flex-row gap-4 md:gap-6 items-center md:items-center text-center md:text-left">
            <div className="p-3 md:p-4 bg-red-500/20 rounded-full border border-red-500/30 text-red-300 text-2xl md:text-3xl">
              <FaBan />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">公平竞技红线</h3>
              <p className="text-gray-300 text-base md:text-lg leading-relaxed font-light">
                严禁使用第三方插件或外部力量获得成绩。
                <br className="hidden md:block" />
                违者将<span className="text-red-400 font-bold mx-1 border-b border-red-500/50 pb-0.5">取消一切成绩</span>，两年内禁赛。
              </p>
            </div>
          </div>
        </motion.div>

      </motion.div>

      {/* 3. 底部装饰：巨大的警示图标 (背景)
          优化：手机端缩小尺寸，防止产生横向滚动条
       */}
      <div className="fixed bottom-0 right-0 opacity-[0.03] md:opacity-5 pointer-events-none z-0 translate-x-1/4 translate-y-1/4">
        <FaExclamationTriangle className="text-[20rem] md:text-[40rem] text-white" />
      </div>

    </div>
  );
};

export default Rules;