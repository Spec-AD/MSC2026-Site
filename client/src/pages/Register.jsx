import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

const Register = () => {
  const { user, login } = useAuth(); // login这里用来更新本地的用户状态
  const navigate = useNavigate();
  
  // 表单状态
  const [formData, setFormData] = useState({
    nickname: '',
    contactType: 'QQ',
    contactValue: '',
    prizeWish: '',
    intro: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 初始化：如果用户已报名，回填数据（可选）
  useEffect(() => {
    if (user && user.isRegistered) {
      // 如果需要回填可以写在这里，但设计上我们直接显示“已提交”界面
    }
  }, [user]);

  // --- 核心工具函数：计算字符长度 (中日文=2，其他=1) ---
  const getLength = (str) => {
    let len = 0;
    for (let i = 0; i < str.length; i++) {
      // 码点大于127或是特定符号视为宽字符
      if (str.charCodeAt(i) > 127) {
        len += 2;
      } else {
        len += 1;
      }
    }
    return len;
  };

  // --- 输入处理 ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // 1. 昵称长度限制 (20字符)
    if (name === 'nickname') {
      if (getLength(value) > 20) return; // 超过不让输
    }

    // 2. 联系方式验证 (QQ/电话只能输数字)
    if (name === 'contactValue') {
       if ((formData.contactType === 'QQ' || formData.contactType === 'Phone') && !/^\d*$/.test(value)) {
         return; // 只能输数字
       }
    }

    // 3. 奖品期望限制 (500字)
    if (name === 'prizeWish' && value.length > 500) return;

    // 4. 介绍限制 (50字)
    if (name === 'intro' && value.length > 50) return;

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- 提交处理 ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 二次验证：昵称支持中英日数字下划线
    // 正则解释：\u4e00-\u9fa5(汉字) \u0800-\u4e00(日文假名等) \w(数字字母下划线)
    const nicknameRegex = /^[\u4e00-\u9fa5\u0800-\u4e00\w]+$/;
    if (!nicknameRegex.test(formData.nickname)) {
        setError('昵称仅支持中英日文、数字和下划线');
        setLoading(false);
        return;
    }

    try {
      const res = await axios.post('/api/match/register', formData);
      // 提交成功，更新本地 context 里的 user 状态
      if (res.data.success) {
        login(res.data.user, localStorage.getItem('token')); // 刷新 AuthContext
      }
    } catch (err) {
      setError(err.response?.data?.msg || '提交失败');
    } finally {
      setLoading(false);
    }
  };

  // --- 视图 1: 已报名状态 (展示票据) ---
  if (user?.isRegistered) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center pt-20">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 p-10 rounded-lg max-w-2xl w-full flex flex-col items-center relative overflow-hidden"
        >
          {/* 装饰背景字 */}
          <div className="absolute -right-10 -bottom-10 text-9xl text-white/5 font-bold pointer-events-none">PASS</div>
          
          <FaCheckCircle className="text-6xl text-green-400 mb-6" />
          <h2 className="text-3xl font-bold mb-2">报名已提交</h2>
          <p className="text-gray-300 mb-8">请耐心等待预选赛开启</p>
          
          <div className="w-full grid grid-cols-2 gap-6 text-left border-t border-white/10 pt-6">
            <div>
              <label className="text-sm text-gray-400">参赛昵称</label>
              <div className="text-xl font-bold">{user.nickname}</div>
            </div>
            <div>
              <label className="text-sm text-gray-400">联系方式 ({user.contactType})</label>
              <div className="text-xl font-mono">{user.contactValue}</div>
            </div>
            <div className="col-span-2">
              <label className="text-sm text-gray-400">出场介绍</label>
              <div className="text-lg italic text-gray-300">“{user.intro || '暂无介绍'}”</div>
            </div>
          </div>

          <button 
            onClick={() => navigate('/qualifiers')}
            className="mt-10 px-8 py-2 bg-white text-black font-bold hover:scale-105 transition-transform"
          >
            查看预选赛
          </button>
        </motion.div>
      </div>
    );
  }

  // --- 视图 2: 填写表单 ---
  return (
    <div className="w-full min-h-screen flex flex-col items-center pt-24 px-8 pb-20">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl"
      >
        <h1 className="text-4xl font-light mb-2 tracking-widest border-l-4 border-blue-500 pl-4">我要报名</h1>
        <p className="text-gray-400 mb-12 pl-5">Registration Form</p>

        {error && (
          <div className="mb-6 flex items-center gap-2 text-red-400 bg-red-900/20 px-4 py-3 rounded">
            <FaExclamationCircle /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-12">
          
          {/* 1. 参赛昵称 */}
          <div className="relative group">
            <input
              type="text"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              placeholder=" "
              className="block w-full bg-transparent border-b-2 border-gray-600 text-3xl py-2 focus:border-blue-400 transition-colors placeholder-transparent peer font-bold"
              required
            />
            <label className="absolute left-0 -top-6 text-gray-400 text-sm transition-all peer-placeholder-shown:text-2xl peer-placeholder-shown:top-2 peer-focus:-top-6 peer-focus:text-sm peer-focus:text-blue-400">
              参赛昵称 (Nickname)
            </label>
            <div className="absolute right-0 bottom-2 text-sm text-gray-500">
              {getLength(formData.nickname)} / 20
            </div>
            <p className="text-xs text-gray-500 mt-1">支持中英日文、数字、下划线 (汉字占2字符)</p>
          </div>

          {/* 2. 联系方式 (组合输入) */}
          <div className="flex gap-4 items-end">
            <div className="w-1/3 relative">
              <label className="text-sm text-gray-400 mb-1 block">方式</label>
              <select 
                name="contactType"
                value={formData.contactType}
                onChange={handleChange}
                className="w-full bg-transparent border-b-2 border-gray-600 text-xl py-2 focus:border-blue-400 outline-none appearance-none cursor-pointer"
              >
                <option value="QQ" className="bg-gray-900">QQ号</option>
                <option value="Phone" className="bg-gray-900">手机号</option>
                <option value="Email" className="bg-gray-900">电子邮箱</option>
              </select>
            </div>
            <div className="flex-1 relative group">
              <input
                type={formData.contactType === 'Email' ? 'email' : 'text'}
                name="contactValue"
                value={formData.contactValue}
                onChange={handleChange}
                placeholder=" "
                className="block w-full bg-transparent border-b-2 border-gray-600 text-xl py-2 focus:border-blue-400 transition-colors placeholder-transparent peer"
                required
              />
              <label className="absolute left-0 -top-6 text-gray-400 text-sm transition-all peer-placeholder-shown:text-xl peer-placeholder-shown:top-2 peer-focus:-top-6 peer-focus:text-sm peer-focus:text-blue-400">
                联系号码/地址
              </label>
            </div>
          </div>

          {/* 3. 奖品期望 */}
          <div className="relative group">
            <textarea
              name="prizeWish"
              value={formData.prizeWish}
              onChange={handleChange}
              rows="3"
              placeholder=" "
              className="block w-full bg-transparent border-b-2 border-gray-600 text-lg py-2 focus:border-blue-400 transition-colors placeholder-transparent peer resize-none"
            />
            <label className="absolute left-0 -top-6 text-gray-400 text-sm transition-all peer-placeholder-shown:text-lg peer-placeholder-shown:top-2 peer-focus:-top-6 peer-focus:text-sm peer-focus:text-blue-400">
              奖品期望 (Wishlist) - 选填
            </label>
            <div className="absolute right-0 -bottom-6 text-xs text-gray-500">
              {formData.prizeWish.length} / 500
            </div>
          </div>

          {/* 4. 出场介绍 */}
          <div className="relative group mt-4">
            <input
              type="text"
              name="intro"
              value={formData.intro}
              onChange={handleChange}
              placeholder=" "
              className="block w-full bg-transparent border-b-2 border-gray-600 text-lg py-2 focus:border-blue-400 transition-colors placeholder-transparent peer"
            />
            <label className="absolute left-0 -top-6 text-gray-400 text-sm transition-all peer-placeholder-shown:text-lg peer-placeholder-shown:top-2 peer-focus:-top-6 peer-focus:text-sm peer-focus:text-blue-400">
              出场介绍 (One-liner) - 选填
            </label>
            <div className="absolute right-0 -bottom-6 text-xs text-gray-500">
              {formData.intro.length} / 50
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="mt-12 flex justify-end">
             <button 
               type="submit" 
               disabled={loading}
               className="px-10 py-3 bg-white text-black font-bold text-lg hover:bg-blue-400 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {loading ? '提交中...' : '确认并提交报名'}
             </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
};

export default Register;