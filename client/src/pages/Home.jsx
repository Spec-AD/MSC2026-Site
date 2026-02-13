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
    // 🔥 修复重点：
    // 1. 显式添加背景图 bg-[url('/assets/bg.png')] (请确保文件名一致)
    // 2. 使用 bg-cover bg-center bg-no-repeat 确保铺满
    // 3. md:bg-fixed 仅在电脑端固定背景，手机端跟随滚动（彻底解决移动端黑屏/闪烁 bug）
    <div className="relative w-full h-full min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 bg-[url('/assets/bg.png')] bg-cover bg-center bg-no-repeat md:bg-fixed">
      
      {/* 1. 黑色遮罩层：防止背景图太亮，手机端稍微加深 (bg-black/50) */}
      <div className="absolute inset-0 bg-black/50 md:bg-black/30 z-0"></div>

      {/* 2. 背景特效 (在遮罩之上) */}
      <FallingIcons />

      {/* 3. 内容层 */}
      <div className="z-10 flex flex-col items-center text-center">
        
        {/* LOGO 动画 */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 30 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="relative group"
        >
          {/* 你微调过的 Logo 尺寸：保留 w-[100vw] 和 max-w-[1000px] */}
          <img 
            src="/assets/logos.png" 
            alt="MSC 2026 Logo" 
            className="w-[100vw] md:w-[80vw] max-w-[1000px] object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] md:drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]"
          />
          
          <div className="absolute inset-0 bg-white/10 blur-[40px] md:blur-[50px] rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-1000"></div>
        </motion.div>

        {/* 间距 */}
        <div className="h-10 md:h-16"></div>

        {/* 动态按钮 */}
        <Link to={buttonLink} className="w-full flex justify-center">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            whileHover={{ scale: 1.05, textShadow: "0 0 8px rgb(255,255,255)" }}
            whileTap={{ scale: 0.95 }}
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
          className="mt-6 text-gray-400 text-[10px] md:text-sm tracking-[0.3em] uppercase opacity-80"
        >
          Rhythm Game Tournament in Sihong
        </motion.p>

      </div>
    </div>
  );
};

export default Home;