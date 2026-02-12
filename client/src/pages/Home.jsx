import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import FallingIcons from '../components/FallingIcons'; // 引入刚才写的特效
import { useAuth } from '../context/AuthContext'; // 引入登录状态

const Home = () => {
  const { user } = useAuth();

  // 判断按钮跳转逻辑
  let buttonText = "立即报名 MSC 2026";
  let buttonLink = "/register";

  // 如果已登录
  if (user) {
    if (user.isRegistered) {
      buttonText = "查看预选赛成绩 →";
      buttonLink = "/qualifiers";
    } else {
      buttonText = "前往填写报名表";
      buttonLink = "/register";
    }
  } else {
    // 如果未登录，去登录页
    buttonText = "登录 / 注册参赛";
    buttonLink = "/login";
  }

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col items-center justify-center overflow-hidden">
      
      {/* 1. 背景层：飘落特效 */}
      <FallingIcons />

      {/* 2. 内容层 (z-10 确保在特效之上) */}
      <div className="z-10 flex flex-col items-center text-center">
        
        {/* LOGO 动画 */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="relative group"
        >
          {/* Logo 图片 */}
          <img 
            src="/assets/logos.png" 
            alt="MSC 2026 Logo" 
            className="w-[80vw] max-w-[700px] object-contain drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]"
          />
          
          {/* 这里可以加一个发光的光晕层 */}
          <div className="absolute inset-0 bg-white/10 blur-[50px] rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-1000"></div>
        </motion.div>

        {/* 间隔 */}
        <div className="h-16"></div>

        {/* 动态按钮 (去卡片化设计：只有文字和下划线) */}
        <Link to={buttonLink}>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            whileHover={{ scale: 1.05, textShadow: "0 0 8px rgb(255,255,255)" }}
            whileTap={{ scale: 0.95 }}
            className="text-2xl md:text-3xl font-light tracking-[0.2em] text-white border-b border-white/30 pb-2 hover:border-white transition-all duration-300"
          >
            {buttonText}
          </motion.button>
        </Link>

        {/* 装饰性文字 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="mt-6 text-gray-400 text-sm tracking-widest uppercase"
        >
          Rhythm Game Tournament in Sihong
        </motion.p>

      </div>
    </div>
  );
};

export default Home;