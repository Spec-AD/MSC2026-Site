import { motion } from 'framer-motion';

// 图片数组
const lastYearImages = [
  '/assets/last1.png',
  '/assets/last2.png',
  '/assets/last3.png',
  '/assets/last4.png',
  '/assets/last5.png',
];

const Intro = () => {
  return (
    <div className="w-full min-h-screen text-white overflow-x-hidden pb-24 md:pb-32">
      
      {/* --- 第一部分：主题视觉 --- */}
      <div className="h-screen flex flex-col items-center justify-center relative z-10 px-6">
        
        {/* 背景大字装饰 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[25vw] md:text-[20vw] font-bold text-white/[0.03] md:text-white/5 pointer-events-none select-none whitespace-nowrap">
          THE TOWER
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="text-center"
        >
          <h2 className="text-xs md:text-2xl tracking-[0.2em] md:tracking-[1em] text-blue-300 uppercase mb-4 md:mb-8 ml-1 md:ml-4">
            Maimai Sihong Championship
          </h2>
          
          <h1 className="text-6xl md:text-9xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-t from-white to-gray-400 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
            登塔。
          </h1>
          
          <div className="w-px h-16 md:h-24 bg-gradient-to-b from-white to-transparent mx-auto mt-8 md:mt-12 opacity-50"></div>
        </motion.div>
      </div>

      {/* --- 第二部分：文案介绍 --- */}
      <div className="max-w-4xl mx-auto px-6 md:px-8 py-16 md:py-20 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="space-y-8 md:space-y-12"
        >
          <p className="text-lg md:text-3xl font-light leading-relaxed text-gray-200">
            <span className="font-bold text-white">MSC 2026</span> 是 MSC 系列比赛的第二届。
          </p>
          
          <div className="text-gray-400 text-sm md:text-lg leading-loose md:leading-loose font-light space-y-6">
            <p>
              第一届比赛（MSC 2025）已在 2025 年 7 月成功举办。<br className="hidden md:block"/>
              时光流转，热忱不减。
            </p>
            <p>
              本赛事依然以深入挖掘泗洪及周边地区的潜力新星，<br className="hidden md:block"/>
              促进舞萌玩家群体间友好交流为精神内核，<br className="hidden md:block"/>
              努力呈现出一场精彩绝伦的比赛庆典。
            </p>
          </div>
        </motion.div>
      </div>

      {/* --- 第三部分：无限滚动相册 (Marquee) --- */}
      <div className="w-full py-12 md:py-20 overflow-hidden relative">
        <h3 className="text-center text-xs md:text-xl tracking-[0.3em] md:tracking-[0.5em] text-gray-500 mb-10 md:mb-12 uppercase">
          Memories of MSC 2025
        </h3>

        {/* 遮罩层：增加手机端遮罩宽度，让过渡更柔和 */}
        <div className="absolute inset-y-0 left-0 w-8 md:w-32 bg-gradient-to-r from-black to-transparent z-20 pointer-events-none"></div>
        <div className="absolute inset-y-0 right-0 w-8 md:w-32 bg-gradient-to-l from-black to-transparent z-20 pointer-events-none"></div>

        {/* 滚动容器 */}
        <div className="flex w-full">
          <motion.div
            className="flex gap-4 md:gap-8 px-4"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ 
              repeat: Infinity, 
              ease: "linear", 
              duration: 20 // 稍微调慢一点，让用户能看清图片
            }}
            style={{ width: "fit-content" }} 
          >
            {[...lastYearImages, ...lastYearImages].map((src, index) => (
              <div 
                key={index} 
                /* 修复重点：
                   1. w-[80vw]: 手机端图片宽度占屏幕 80%，视觉冲击力更强，且不再缩成一团
                   2. h-[220px]: 稍微加高一点
                   3. md:w-[600px]: 电脑端保持大尺寸
                */
                className="w-[80vw] h-[220px] md:w-[600px] md:h-[350px] flex-shrink-0 rounded-lg overflow-hidden relative group"
              >
                <img 
                  src={src} 
                  alt={`Review ${index}`} 
                  className="w-full h-full object-cover opacity-80 md:opacity-60 group-hover:opacity-100 transition-opacity duration-500 grayscale md:grayscale group-hover:grayscale-0"
                />
                <div className="absolute inset-0 border border-white/10 group-hover:border-white/50 transition-colors pointer-events-none"></div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* 底部结束语 */}
      <div className="text-center text-gray-600 mt-12 md:mt-20 text-[10px] md:text-sm tracking-[0.2em] uppercase">
        Let's Climb the Tower together.
      </div>
    </div>
  );
};

export default Intro;