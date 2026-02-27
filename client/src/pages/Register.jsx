import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { FaCheckCircle, FaExclamationCircle, FaChevronDown } from 'react-icons/fa';
import { useToast } from '../context/ToastContext';

const Register = () => {
  const { user, login } = useAuth(); 
  const navigate = useNavigate();
  const { addToast } = useToast();
  
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
      <div className="w-full h-full min-h-screen flex flex-col items-center justify-center pt-20 px-4 md:px-0 pb-24">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 p-6 md:p-10 rounded-lg max-w-2xl w-full flex flex-col items-center relative overflow-hidden"
        >
          <div className="absolute -right-6 -bottom-6 md:-right-10 md:-bottom-10 text-7xl md:text-9xl text-white/5 font-bold pointer-events-none">PASS</div>
          
          <FaCheckCircle className="text-5xl md:text-6xl text-green-400 mb-6" />
          <h2 className="text-2xl md:text-3xl font-bold mb-2">报名已提交</h2>
          <p className="text-gray-300 mb-8 text-sm md:text-base">你知道吗，MSC的全称其实非常土</p>
          
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
            className="mt-10 w-full md:w-auto px-8 py-3 bg-white text-black font-bold hover:scale-105 transition-transform active:scale-95 rounded"
          >
            查看预选赛
          </button>
        </motion.div>
      </div>
    );
  }

  // --- 视图 2: 填写表单 ---
  return (
    // 修改 1: items-start 实现左对齐，pb-32 防止底部遮挡
    <div className="w-full min-h-screen flex flex-col items-start md:items-center pt-12 md:pt-24 px-6 md:px-8 pb-32">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl"
      >
        <h1 className="text-2xl md:text-4xl font-light mb-2 tracking-widest border-l-4 border-blue-500 pl-4 text-white">我要报名</h1>
        <p className="text-gray-400 text-xs md:text-sm mb-8 md:mb-12 pl-5 uppercase tracking-tighter">Registration Form</p>

        {error && (
          <div className="mb-6 flex items-center gap-2 text-red-400 bg-red-900/20 px-4 py-3 rounded text-sm border border-red-500/30">
            <FaExclamationCircle /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 md:gap-10">
          
          {/* 1. 参赛昵称 */}
          <div className="w-full">
            <label className="text-gray-400 text-xs md:text-sm block mb-1.5 ml-1">
              参赛昵称 (Nickname) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="nickname"
                value={formData.nickname}
                onChange={handleChange}
                placeholder="请输入合法名称"
                /* 修改 2: 块状样式，h-12 增加高度，bg-white/5 增加点击感知 */
                className="block w-full h-12 px-4 bg-white/5 border border-white/10 rounded focus:border-blue-400 focus:bg-white/10 transition-all text-base md:text-xl text-white outline-none placeholder-gray-600 font-bold"
                required
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] md:text-xs text-gray-500">
                {getLength(formData.nickname)} / 20
              </div>
            </div>
          </div>

          {/* 2. 联系方式 (垂直排列 + 下拉优化) */}
          <div className="flex flex-col gap-4 w-full">
            
            {/* 方式选择 */}
            <div className="w-full">
              <label className="text-gray-400 text-xs md:text-sm block mb-1.5 ml-1">联系方式</label>
              <div className="relative">
                <select 
                  name="contactType"
                  value={formData.contactType}
                  onChange={handleChange}
                  className="block w-full h-12 px-4 bg-white/5 border border-white/10 rounded appearance-none focus:border-blue-400 outline-none text-white text-base md:text-lg cursor-pointer"
                >
                  <option value="QQ" className="bg-gray-900">QQ号</option>
                  <option value="Phone" className="bg-gray-900">手机号</option>
                  <option value="Email" className="bg-gray-900">电子邮箱</option>
                </select>
                {/* 自定义下拉箭头 */}
                <FaChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-xs" />
              </div>
            </div>
            
            {/* 号码输入 */}
            <div className="w-full">
              <label className="text-gray-400 text-xs md:text-sm block mb-1.5 ml-1">号码/地址 (ID/Value)</label>
              <input
                type={formData.contactType === 'Email' ? 'email' : 'text'}
                name="contactValue"
                value={formData.contactValue}
                onChange={handleChange}
                placeholder={`请输入${formData.contactType}`}
                className="block w-full h-12 px-4 bg-white/5 border border-white/10 rounded focus:border-blue-400 focus:bg-white/10 transition-all text-base md:text-lg text-white outline-none placeholder-gray-600 font-mono"
                required
              />
            </div>
          </div>

          {/* 3. 奖品期望 */}
          <div className="w-full">
            <div className="flex justify-between items-center mb-1.5 ml-1">
              <label className="text-gray-400 text-xs md:text-sm">奖品期望 (Wishlist)</label>
              <span className="text-[10px] text-gray-600">{formData.prizeWish.length}/500</span>
            </div>
            <textarea
              name="prizeWish"
              value={formData.prizeWish}
              onChange={handleChange}
              rows="3"
              placeholder="如果有想要的奖品，可以在这里许愿..."
              className="block w-full p-4 bg-white/5 border border-white/10 rounded focus:border-blue-400 focus:bg-white/10 transition-all text-sm md:text-base text-white outline-none placeholder-gray-600 resize-none"
            />
          </div>

          {/* 4. 出场介绍 */}
          <div className="w-full">
             <div className="flex justify-between items-center mb-1.5 ml-1">
              <label className="text-gray-400 text-xs md:text-sm">出场介绍 (One-liner)</label>
              <span className="text-[10px] text-gray-600">{formData.intro.length}/50</span>
            </div>
            <input
              type="text"
              name="intro"
              value={formData.intro}
              onChange={handleChange}
              placeholder="一句话介绍自己"
              className="block w-full h-12 px-4 bg-white/5 border border-white/10 rounded focus:border-blue-400 focus:bg-white/10 transition-all text-sm md:text-base text-white outline-none placeholder-gray-600"
            />
          </div>

          {/* 提交按钮 */}
          <div className="mt-6 md:mt-8">
             <button 
               type="submit" 
               disabled={loading}
               className="w-full h-14 bg-white text-black font-bold text-lg md:text-xl rounded hover:bg-blue-400 hover:text-white transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-white/10"
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