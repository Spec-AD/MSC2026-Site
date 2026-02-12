import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

const Register = () => {
  const { user, login } = useAuth(); 
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    nickname: '',
    contactType: 'QQ',
    contactValue: '',
    prizeWish: '',
    intro: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const getLength = (str) => {
    let len = 0;
    for (let i = 0; i < str.length; i++) {
      if (str.charCodeAt(i) > 127) {
        len += 2;
      } else {
        len += 1;
      }
    }
    return len;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'nickname') {
      if (getLength(value) > 20) return;
    }
    if (name === 'contactValue') {
       if ((formData.contactType === 'QQ' || formData.contactType === 'Phone') && !/^\d*$/.test(value)) {
         return;
       }
    }
    if (name === 'prizeWish' && value.length > 500) return;
    if (name === 'intro' && value.length > 50) return;

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const nicknameRegex = /^[\u4e00-\u9fa5\u0800-\u4e00\w]+$/;
    if (!nicknameRegex.test(formData.nickname)) {
        setError('昵称仅支持中英日文、数字和下划线');
        setLoading(false);
        return;
    }

    try {
      const res = await axios.post('/api/match/register', formData);
      if (res.data.success) {
        login(res.data.user, localStorage.getItem('token'));
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
      <div className="w-full h-full min-h-screen flex flex-col items-center justify-center pt-20 px-4 md:px-0">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          /* 优化：p-6 (手机) -> p-10 (电脑) */
          className="bg-white/10 backdrop-blur-md border border-white/20 p-6 md:p-10 rounded-lg max-w-2xl w-full flex flex-col items-center relative overflow-hidden"
        >
          <div className="absolute -right-6 -bottom-6 md:-right-10 md:-bottom-10 text-7xl md:text-9xl text-white/5 font-bold pointer-events-none">PASS</div>
          
          <FaCheckCircle className="text-5xl md:text-6xl text-green-400 mb-6" />
          <h2 className="text-2xl md:text-3xl font-bold mb-2">报名已提交</h2>
          <p className="text-gray-300 mb-8 text-sm md:text-base">请耐心等待预选赛开启</p>
          
          {/* 优化：grid-cols-1 (手机) -> grid-cols-2 (电脑) */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 text-left border-t border-white/10 pt-6">
            <div>
              <label className="text-xs text-gray-400">参赛昵称</label>
              <div className="text-lg md:text-xl font-bold">{user.nickname}</div>
            </div>
            <div>
              <label className="text-xs text-gray-400">联系方式 ({user.contactType})</label>
              <div className="text-lg md:text-xl font-mono">{user.contactValue}</div>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-400">出场介绍</label>
              <div className="text-base md:text-lg italic text-gray-300 break-words">“{user.intro || '暂无介绍'}”</div>
            </div>
          </div>

          <button 
            onClick={() => navigate('/qualifiers')}
            className="mt-10 w-full md:w-auto px-8 py-3 bg-white text-black font-bold hover:scale-105 transition-transform active:scale-95"
          >
            查看预选赛
          </button>
        </motion.div>
      </div>
    );
  }

  // --- 视图 2: 填写表单 ---
  return (
    <div className="w-full min-h-screen flex flex-col items-center pt-20 md:pt-24 px-6 md:px-8 pb-20">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl"
      >
        <h1 className="text-2xl md:text-4xl font-light mb-2 tracking-widest border-l-4 border-blue-500 pl-4 text-white">我要报名</h1>
        <p className="text-gray-400 text-xs md:text-sm mb-8 md:mb-12 pl-5 uppercase tracking-tighter">Registration Form</p>

        {error && (
          <div className="mb-6 flex items-center gap-2 text-red-400 bg-red-900/20 px-4 py-3 rounded text-sm">
            <FaExclamationCircle /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-10 md:gap-12">
          
          {/* 1. 参赛昵称 */}
          <div className="relative group">
            <input
              type="text"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              placeholder=" "
              /* 优化：text-xl (手机) -> text-3xl (电脑) */
              className="block w-full bg-transparent border-b-2 border-gray-600 text-xl md:text-3xl py-2 focus:border-blue-400 transition-colors placeholder-transparent peer font-bold text-white outline-none"
              required
            />
            <label className="absolute left-0 -top-6 text-gray-400 text-xs md:text-sm transition-all peer-placeholder-shown:text-xl md:peer-placeholder-shown:text-2xl peer-placeholder-shown:top-2 peer-focus:-top-6 peer-focus:text-xs md:peer-focus:text-sm peer-focus:text-blue-400">
              参赛昵称 (Nickname)
            </label>
            <div className="absolute right-0 bottom-2 text-[10px] md:text-sm text-gray-500">
              {getLength(formData.nickname)} / 20
            </div>
          </div>

          {/* 2. 联系方式 (组合输入) */}
          <div className="flex flex-col md:flex-row gap-8 md:gap-4 items-stretch md:items-end">
            <div className="w-full md:w-1/3 relative">
              <label className="text-xs text-gray-400 mb-1 block">联系方式</label>
              <select 
                name="contactType"
                value={formData.contactType}
                onChange={handleChange}
                className="w-full bg-transparent border-b-2 border-gray-600 text-lg md:text-xl py-2 focus:border-blue-400 outline-none appearance-none cursor-pointer text-white"
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
                className="block w-full bg-transparent border-b-2 border-gray-600 text-lg md:text-xl py-2 focus:border-blue-400 transition-colors placeholder-transparent peer text-white outline-none"
                required
              />
              <label className="absolute left-0 -top-6 text-gray-400 text-xs md:text-sm transition-all peer-placeholder-shown:text-lg md:peer-placeholder-shown:text-xl peer-placeholder-shown:top-2 peer-focus:-top-6 peer-focus:text-xs md:peer-focus:text-sm peer-focus:text-blue-400">
                号码/地址 (ID/Value)
              </label>
            </div>
          </div>

          {/* 3. 奖品期望 */}
          <div className="relative group">
            <textarea
              name="prizeWish"
              value={formData.prizeWish}
              onChange={handleChange}
              rows="2"
              placeholder=" "
              className="block w-full bg-transparent border-b-2 border-gray-600 text-base md:text-lg py-2 focus:border-blue-400 transition-colors placeholder-transparent peer resize-none text-white outline-none"
            />
            <label className="absolute left-0 -top-6 text-gray-400 text-xs md:text-sm transition-all peer-placeholder-shown:text-base md:peer-placeholder-shown:text-lg peer-placeholder-shown:top-2 peer-focus:-top-6 peer-focus:text-xs md:peer-focus:text-sm peer-focus:text-blue-400">
              奖品期望 (Wishlist) - 选填
            </label>
            <div className="absolute right-0 -bottom-5 text-[10px] text-gray-500">
              {formData.prizeWish.length} / 500
            </div>
          </div>

          {/* 4. 出场介绍 */}
          <div className="relative group mt-2">
            <input
              type="text"
              name="intro"
              value={formData.intro}
              onChange={handleChange}
              placeholder=" "
              className="block w-full bg-transparent border-b-2 border-gray-600 text-base md:text-lg py-2 focus:border-blue-400 transition-colors placeholder-transparent peer text-white outline-none"
            />
            <label className="absolute left-0 -top-6 text-gray-400 text-xs md:text-sm transition-all peer-placeholder-shown:text-base md:peer-placeholder-shown:text-lg peer-placeholder-shown:top-2 peer-focus:-top-6 peer-focus:text-xs md:peer-focus:text-sm peer-focus:text-blue-400">
              出场介绍 (One-liner) - 选填
            </label>
            <div className="absolute right-0 -bottom-5 text-[10px] text-gray-500">
              {formData.intro.length} / 50
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="mt-8 md:mt-12 flex justify-center md:justify-end">
             <button 
               type="submit" 
               disabled={loading}
               className="w-full md:w-auto px-10 py-4 bg-white text-black font-bold text-lg hover:bg-blue-400 hover:text-white transition-all disabled:opacity-50 active:scale-95"
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