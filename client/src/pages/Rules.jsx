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
    hidden: { opacity: 0, x: -20 }, // 改为从左侧滑入，配合左对齐
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    /* 优化 1: items-start (手机左对齐) md:items-center (电脑居中) 
       优化 2: pb-24 防止底部被导航栏遮挡
    */
    <div className="w-full min-h-screen flex flex-col items-start md:items-center pt-20 md:pt-24 px-6 md:px-8 pb-24 relative overflow-hidden text-white">
      
      {/* 1. 标题区域 */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        /* 优化：手机端 text-left (左对齐) */
        className="text-left md:text-center mb-10 md:mb-20 z-10 w-full max-w-4xl"
      >
        <h2 className="text-blue-400 tracking-[0.2em] md:tracking-[0.5em] text-xs md:text-sm uppercase font-bold mb-2 md:mb-4 ml-1">
          Regulations
        </h2>
        
        <h1 className="text-3xl md:text-6xl font-black tracking-widest drop-shadow-2xl">
          参赛须知
        </h1>
        {/* 装饰线：手机端不再居中 (mx-auto -> md:mx-auto) */}
        <div className="w-12 md:w-16 h-1 bg-blue-500 mr-auto md:mx-auto mt-4 md:mt-8"></div>
      </motion.div>

      {/* 2. 规则列表区域 */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-4xl w-full flex flex-col gap-8 md:gap-16 z-10"
      >
        
        {/* 规则 01: 账号一致性 */}
        <motion.div 
          variants={itemVariants}
          className="relative group w-full"
        >
          {/* 背景大数字：位置微调，手机端更靠左上，透明度降低 */}
          <div className="absolute -left-4 -top-2 md:-left-8 md:-top-10 text-[5rem] md:text-[10rem] font-black text-white/[0.05] select-none pointer-events-none z-0 leading-none">
            01
          </div>
          
          {/* 核心布局修复：
             手机端：flex-row (并排) + items-start (顶部对齐) + text-left (左对齐)
             电脑端：保持 flex-row + items-center + text-left
          */}
          <div className="relative z-10 flex flex-row items-start md:items-center gap-4 md:gap-8">
            
            {/* 图标：固定宽度，防止被文字挤压 */}
            <div className="flex-shrink-0 w-12 h-12 md:w-20 md:h-20 flex items-center justify-center bg-blue-500/10 md:bg-blue-500/20 rounded-xl md:rounded-full border border-blue-500/20 md:border-blue-500/30 text-blue-300 text-xl md:text-3xl mt-1 md:mt-0">
              <FaUserShield />
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg md:text-2xl font-bold text-white mb-1 md:mb-2">账号一致性验证</h3>
              {/* 正文：手机端 text-sm，leading-relaxed 增加行间距让阅读不累 */}
              <p className="text-gray-400 text-sm md:text-lg leading-7 md:leading-relaxed font-light">
                选手必须使用和<span className="text-blue-400 font-bold mx-1">预选赛提交成绩相同</span>的舞萌账号进行正赛。
              </p>
            </div>
          </div>
        </motion.div>

        {/* 规则 02: 反作弊 */}
        <motion.div 
          variants={itemVariants}
          className="relative group w-full"
        >
          <div className="absolute -left-4 -top-2 md:-left-8 md:-top-10 text-[5rem] md:text-[10rem] font-black text-white/[0.05] select-none pointer-events-none z-0 leading-none">
            02
          </div>

          <div className="relative z-10 flex flex-row items-start md:items-center gap-4 md:gap-8">
            <div className="flex-shrink-0 w-12 h-12 md:w-20 md:h-20 flex items-center justify-center bg-red-500/10 md:bg-red-500/20 rounded-xl md:rounded-full border border-red-500/20 md:border-red-500/30 text-red-300 text-xl md:text-3xl mt-1 md:mt-0">
              <FaBan />
            </div>
            <div className="flex-1">
              <h3 className="text-lg md:text-2xl font-bold text-white mb-1 md:mb-2">公平竞技红线</h3>
              <p className="text-gray-400 text-sm md:text-lg leading-7 md:leading-relaxed font-light">
                严禁使用第三方插件或外部力量获得成绩。
                {/* 手机端自然换行，电脑端特定位置换行 */}
                <br className="hidden md:block" />
                违者将<span className="text-red-400 font-bold mx-1 border-b border-red-500/50 pb-0.5">取消一切成绩</span>，两年内禁赛。
              </p>
            </div>
          </div>
        </motion.div>

      </motion.div>

      {/* 3. 底部装饰：再次缩小手机端尺寸，避免干扰内容 */}
      <div className="fixed bottom-0 right-0 opacity-[0.05] pointer-events-none z-0 translate-x-1/3 translate-y-1/3">
        <FaExclamationTriangle className="text-[15rem] md:text-[40rem] text-white" />
      </div>

    </div>
  );
};

export default Rules;