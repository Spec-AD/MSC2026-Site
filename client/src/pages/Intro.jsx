import { motion } from 'framer-motion';

// 图片数组 (方便后续增删)
const lastYearImages = [
  '/assets/last1.png',
  '/assets/last2.png',
  '/assets/last3.png',
  '/assets/last4.png',
  '/assets/last5.png',
];

const Intro = () => {
  return (
    <div className="w-full min-h-screen text-white overflow-x-hidden pb-32">
      
      {/* --- 第一部分：主题视觉 --- */}
      <div className="h-screen flex flex-col items-center justify-center relative z-10">
        
        {/* 背景大字装饰 (极淡) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[20vw] font-bold text-white/5 pointer-events-none select-none whitespace-nowrap">
          THE TOWER
        </div>

        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="text-center"
        >
          <h2 className="text-xl md:text-2xl tracking-[1em] text-blue-300 uppercase mb-8 ml-4">
            Maimai Sihong Championship
          </h2>
          
          <h1 className="text-8xl md:text-9xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-t from-white to-gray-400 drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
            登塔。
          </h1>
          
          <div className="w-px h-24 bg-gradient-to-b from-white to-transparent mx-auto mt-12"></div>
        </motion.div>
      </div>

      {/* --- 第二部分：文案介绍 --- */}
      <div className="max-w-4xl mx-auto px-8 py-20 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="space-y-12"
        >
          <p className="text-2xl md:text-3xl font-light leading-relaxed text-gray-200">
            <span className="font-bold text-white">MSC 2026</span> 是 MSC 系列比赛的第二届。
          </p>
          
          <div className="text-gray-400 text-lg leading-loose font-light">
            <p className="mb-8">
              第一届比赛（MSC 2025）已在 2025 年 7 月成功举办。<br/>
              时光流转，热忱不减。
            </p>
            <p>
              本赛事依然以深入挖掘泗洪及周边地区的潜力新星，<br/>
              促进舞萌玩家群体间友好交流为精神内核，<br/>
              努力呈现出一场精彩绝伦的比赛庆典。
            </p>
          </div>
        </motion.div>
      </div>

      {/* --- 第三部分：无限滚动相册 (Marquee) --- */}
      <div className="w-full py-20 overflow-hidden relative">
        <h3 className="text-center text-xl tracking-[0.5em] text-gray-500 mb-12 uppercase">
          Memories of MSC 2025
        </h3>

        {/* 遮罩层：让左右两侧图片淡出，增强融合感 */}
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black to-transparent z-20 pointer-events-none"></div>
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black to-transparent z-20 pointer-events-none"></div>

        {/* 滚动容器 */}
        <div className="flex w-full">
          <motion.div
            className="flex gap-8 px-4"
            // 动画逻辑：向左平移 100% 的自身宽度
            // 为了实现无缝，我们需要渲染两组同样的图片
            animate={{ x: ["0%", "-50%"] }}
            transition={{ 
              repeat: Infinity, 
              ease: "linear", 
              duration: 20 // 20秒滚完一圈，可调整速度
            }}
            style={{ width: "fit-content" }} 
          >
            {/* 渲染两组图片以实现无缝循环 */}
            {[...lastYearImages, ...lastYearImages].map((src, index) => (
              <div 
                key={index} 
                className="w-[400px] h-[250px] md:w-[600px] md:h-[350px] flex-shrink-0 rounded-lg overflow-hidden relative group"
              >
                {/* 图片 */}
                <img 
                  src={src} 
                  alt={`Review ${index}`} 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500 grayscale group-hover:grayscale-0"
                />
                
                {/* 边框高亮装饰 */}
                <div className="absolute inset-0 border border-white/10 group-hover:border-white/50 transition-colors pointer-events-none"></div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* 底部结束语 */}
      <div className="text-center text-gray-600 mt-20 text-sm">
        Let's Climb the Tower together.
      </div>
    </div>
  );
};

export default Intro;