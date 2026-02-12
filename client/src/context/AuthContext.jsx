import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// 1. 创建上下文
const AuthContext = createContext(null);

// 2. 提供者组件 (包裹整个应用)
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // 存储当前用户信息
  const [loading, setLoading] = useState(true); // 是否正在检查登录状态

  
  axios.defaults.baseURL = 'https://msc2026.zeabur.app';

  // 3. 核心逻辑：应用启动时，检查本地 Token 实现自动登录
  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = localStorage.getItem('token');

      if (token) {
        // 如果有 token，先设置给 axios，这样后续请求都会带上
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          // 请求后端验证 token 有效性
          const res = await axios.get('/api/auth/me');
          setUser(res.data); // 验证成功，写入用户状态
        } catch (error) {
          console.error("自动登录失败:", error);
          logout(); // 验证失败（如token过期），清除残留
        }
      }
      setLoading(false); // 检查结束，加载完成
    };

    checkLoggedIn();
  }, []);

  // 4. 登录动作
  const login = (userData, token) => {
    localStorage.setItem('token', token); // 存入本地
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`; // 设置请求头
    setUser(userData); // 更新状态
  };

  // 5. 登出动作
  const logout = () => {
    localStorage.removeItem('token'); // 清除本地
    delete axios.defaults.headers.common['Authorization']; // 清除请求头
    setUser(null); // 清空状态
  };

  // 6. 注册后自动登录 (通常注册完直接算登录成功)
  const registerAction = (userData, token) => {
    login(userData, token);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, registerAction, loading }}>
      {!loading && children} 
    </AuthContext.Provider>
  );
};

// 7. 自定义 Hook：方便其他组件调用 (比如 const { user } = useAuth();)
export const useAuth = () => {
  return useContext(AuthContext);

};
