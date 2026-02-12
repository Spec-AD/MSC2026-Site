import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import FallingIcons from '../components/FallingIcons'; 
import { useAuth } from '../context/AuthContext'; 

const Home = () => {
  const { user } = useAuth();

  let buttonText = "立即报名 MSC 2026";
  let buttonLink = "/register";

  if (user) {
    if (user.isRegistered) {
      buttonText = "查看预选赛成绩 →";
      buttonLink = "/qualifiers";
    } else {
      buttonText = "前往填写报名表";
      buttonLink = "/register";
    }
  } else {
    buttonText = "登录 / 注册参赛";
    buttonLink = "/login";
  }

  return (
    // 优化：增加了 px-6 防止文字在极窄屏幕贴边
    <div className="relative w-full h-full min-h-screen flex flex-col items-center justify-center overflow-hidden px-6">
      
      {/* 1. 背景层 */}
      <FallingIcons />

      {/* 2. 内容层 */}
      <div className="z-10 flex flex-col items-center text-center">
        
        {/* LOGO 动画 */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 30 }} // 手机端 y 轴位移减小一点更丝滑
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="relative group"
        >
          {/* 优化：
             - 手机端使用 w-[90vw] 让 Logo 尽可能醒目
             - 电脑端保持 max-w-[700px]
          */}
          <img 
            src="/assets/logos.png" 
            alt="MSC 2026 Logo" 
            className="w-[90vw] md:w-[80vw] max-w-[700px] object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] md:drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]"
          />
          
          <div className="absolute inset-0 bg-white/10 blur-[40px] md:blur-[50px] rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-1000"></div>
        </motion.div>

        {/* 优化：间距自适应
           - 手机端间距缩小到 h-10，防止内容被推到底部之外
           - 电脑端保持 h-16
        */}
        <div className="h-10 md:h-16"></div>

        {/* 动态按钮 */}
        <Link to={buttonLink} className="w-full flex justify-center">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            whileHover={{ scale: 1.05, textShadow: "0 0 8px rgb(255,255,255)" }}
            whileTap={{ scale: 0.95 }}
            /* 优化：
               - text-xl (手机) -> text-3xl (电脑)
               - tracking 更换为更适合手机阅读的宽度
            */
            className="text-xl md:text-3xl font-light tracking-[0.15em] md:tracking-[0.2em] text-white border-b border-white/30 pb-2 hover:border-white transition-all duration-300 whitespace-nowrap"
          >
            {buttonText}
          </motion.button>
        </Link>

        {/* 装饰性文字 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          /* 优化：手机端字号调小 (text-[10px]) 增加精致感 
          */
          className="mt-6 text-gray-400 text-[10px] md:text-sm tracking-[0.3em] uppercase opacity-80"
        >
          Rhythm Game Tournament in Sihong
        </motion.p>

      </div>
    </div>
  );
};

export default Home;