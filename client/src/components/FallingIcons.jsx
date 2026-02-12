import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const FallingIcons = () => {
  // 生成 20 个随机粒子
  const [icons, setIcons] = useState([]);

  useEffect(() => {
    // 在客户端挂载后生成随机位置，防止服务端渲染不一致（虽然是SPA，但好习惯）
    const newIcons = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // 0-100% 的水平位置
      delay: Math.random() * 5, // 随机延迟
      duration: Math.random() * 5 + 8 // 8-13秒的飘落时间，越慢越优雅
    }));
    setIcons(newIcons);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {icons.map((icon) => (
        <motion.img
          key={icon.id}
          src="/assets/icon.png" // 确保你的 icon.png 放在了 public/assets 下
          alt=""
          className="absolute w-8 h-8 opacity-0" // 初始透明
          initial={{ y: -100, x: `${icon.x}vw`, opacity: 0, rotate: 0 }}
          animate={{
            y: '110vh', // 飘到底部
            opacity: [0, 0.8, 0], // 淡入 -> 变亮 -> 淡出
            rotate: 360 // 旋转一圈
          }}
          transition={{
            duration: icon.duration,
            repeat: Infinity,
            delay: icon.delay,
            ease: "linear"
          }}
        />
      ))}
    </div>
  );
};

export default FallingIcons;