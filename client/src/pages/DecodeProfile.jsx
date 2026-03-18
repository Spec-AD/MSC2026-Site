import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  FaChevronLeft, FaSpinner, FaTrophy, FaCrosshairs, 
  FaShieldAlt, FaChartLine, FaGamepad, FaCheck, FaTimes 
} from 'react-icons/fa';

export default function DecodeProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchDecodeData = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/letter-game/records/${username}`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.msg || '拉取数据失败');
      } finally {
        setLoading(false);
      }
    };
    fetchDecodeData();
  }, [username]);

  // ==========================================
  // 🎭 战术流派评估引擎 (基于保守度 Conservativeness)
  // ==========================================
  const getPlayStyle = (conservativeness) => {
    if (conservativeness === 0) return { title: '未定型 (Unranked)', color: 'text-zinc-500', bg: 'bg-zinc-500/10 border-zinc-500/20' };
    if (conservativeness <= 0.20) return { title: '盲狙刺客 (Blind Sniper)', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' };
    if (conservativeness <= 0.45) return { title: '激进破译者 (Aggressive Decoder)', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' };
    if (conservativeness <= 0.65) return { title: '均衡解密者 (Balanced Solver)', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' };
    if (conservativeness <= 0.85) return { title: '稳健探求者 (Steady Explorer)', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    return { title: '严谨学者 (Prudent Scholar)', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' };
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#0c0c11] flex flex-col items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-purple-500/50 mb-4" />
        <span className="text-xs text-zinc-500 font-bold tracking-widest uppercase">Loading Archives...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full min-h-screen bg-[#0c0c11] flex flex-col items-center justify-center text-zinc-200">
        <h2 className="text-2xl font-bold mb-2">数据受损</h2>
        <p className="text-zinc-500 mb-8">{error}</p>
        <button onClick={() => navigate(-1)} className="px-6 py-3 bg-zinc-200 text-zinc-900 rounded-xl font-bold transition-all active:scale-95">返回</button>
      </div>
    );
  }

  const { user, stats, records } = data;
  const styleInfo = getPlayStyle(stats.conservativeness || 0);

  return (
    <div className="w-full min-h-screen bg-[#0c0c11] text-zinc-200 pb-20 selection:bg-purple-500/30 relative" style={{ fontFamily: "'Quicksand', sans-serif" }}>
      
      {/* 沉浸式背景光效 */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-cyan-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-10 relative z-10">
        
        {/* 1. 顶部导航 */}
        <button onClick={() => navigate(`/profile/${username}`)} className="text-zinc-500 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors mb-8 w-fit">
          <FaChevronLeft /> RETURN TO PROFILE
        </button>

        {/* 2. 玩家身份巨幕 */}
        <div className="flex flex-col md:flex-row items-center gap-6 bg-[#15151e]/80 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl mb-8">
          <img src={user.avatarUrl || '/assets/logos.png'} alt="Avatar" className="w-24 h-24 rounded-full border-4 border-[#0c0c11] shadow-lg object-cover bg-[#0c0c11]" />
          <div className="flex flex-col items-center md:items-start flex-1 min-w-0 text-center md:text-left">
            <div className="flex items-center gap-3 flex-wrap justify-center md:justify-start">
              <h1 className="text-3xl font-black text-white tracking-tight">{user.username}</h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${styleInfo.bg} ${styleInfo.color}`}>
                {styleInfo.title}
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-2 font-medium">
              Letter Decode V2.0 / Global Intelligence Archive
            </p>
          </div>
          <div className="flex flex-col items-center justify-center shrink-0 md:pl-8 md:border-l border-white/5 mt-4 md:mt-0">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Over Value</span>
            <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-cyan-400 drop-shadow-md">
              {(stats.totalOv || 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* 3. 核心统计雷达/数据网格 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-black/30 border border-white/5 rounded-2xl p-5 flex flex-col justify-center items-center text-center">
            <FaCrosshairs className="text-2xl text-cyan-400 opacity-50 mb-2" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Accuracy</span>
            <span className="text-2xl font-black text-cyan-300">{((stats.accuracy || 0) * 100).toFixed(1)}%</span>
          </div>
          <div className="bg-black/30 border border-white/5 rounded-2xl p-5 flex flex-col justify-center items-center text-center">
            <FaShieldAlt className="text-2xl text-purple-400 opacity-50 mb-2" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Conservativeness</span>
            <span className="text-2xl font-black text-purple-300">{((stats.conservativeness || 0) * 100).toFixed(1)}%</span>
          </div>
          <div className="bg-black/30 border border-white/5 rounded-2xl p-5 flex flex-col justify-center items-center text-center">
            <FaGamepad className="text-2xl text-amber-400 opacity-50 mb-2" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Sessions</span>
            <span className="text-2xl font-black text-amber-300">{stats.totalPlays || 0}</span>
          </div>
          <div className="bg-black/30 border border-white/5 rounded-2xl p-5 flex flex-col justify-center items-center text-center">
            <FaChartLine className="text-2xl text-emerald-400 opacity-50 mb-2" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Tracks Cleared</span>
            <span className="text-2xl font-black text-emerald-300">{stats.clearedSongs || 0}</span>
          </div>
        </div>

        {/* 4. Top 100 OV Records (衰减榜单) */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-6 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.6)]"></div>
          <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Best Decode Sessions (OV100)</h2>
        </div>

        {records.length === 0 ? (
          <div className="w-full py-20 bg-[#15151e]/50 border border-white/5 rounded-3xl flex flex-col items-center justify-center text-zinc-500">
            <FaTrophy className="text-5xl opacity-20 mb-4" />
            <p className="font-bold text-sm">暂无战绩档案，等待破译...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {records.map((record, index) => {
              // 计算这局对全球 OV 的实际加权贡献
              const weight = Math.pow(0.95, index);
              const weightedOv = record.totalOv * weight;
              
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.05, 0.5) }}
                  key={record._id} 
                  className={`flex flex-col md:flex-row items-center gap-4 p-4 rounded-2xl border transition-colors
                    ${index === 0 ? 'bg-purple-500/10 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'bg-[#15151e] border-white/5 hover:bg-white/5'}
                  `}
                >
                  {/* 排行标号 */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0
                    ${index === 0 ? 'bg-purple-500 text-white shadow-lg' : 'bg-black/40 text-zinc-600'}
                  `}>
                    #{index + 1}
                  </div>

                  {/* 核心分数值 */}
                  <div className="flex flex-col items-center md:items-start min-w-[100px] shrink-0">
                    <span className={`text-2xl font-black ${index === 0 ? 'text-purple-300' : 'text-white'}`}>
                      {record.totalOv.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                      Weight: {(weight * 100).toFixed(1)}% <span className="text-zinc-600 ml-1">({weightedOv.toFixed(2)})</span>
                    </span>
                  </div>

                  {/* 包含歌曲连击指示器 */}
                  <div className="flex flex-col gap-1 flex-1 min-w-0 w-full items-center md:items-start">
                    <div className="flex gap-1 mb-1">
                      {record.songs.map((song, idx) => (
                        <div 
                          key={idx} title={`${song.title} (${song.actualOv.toFixed(1)} OV)`}
                          className={`w-8 h-2.5 rounded-sm shadow-inner transition-colors ${song.isCleared ? 'bg-emerald-400' : 'bg-rose-500'}`}
                        />
                      ))}
                    </div>
                    {/* Mod 列表 */}
                    <div className="flex gap-1.5 flex-wrap justify-center md:justify-start">
                      {record.mods.length === 0 ? <span className="text-[10px] font-bold text-zinc-600 bg-black/40 px-1.5 py-0.5 rounded">NOMOD</span> : 
                        record.mods.map(mod => (
                          <span key={mod} className="text-[9px] font-bold uppercase tracking-widest text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded">
                            {mod}
                          </span>
                        ))
                      }
                      {record.isFullCombo && <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-900 bg-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded shadow-sm">FC</span>}
                    </div>
                  </div>

                  {/* 日期时间 */}
                  <div className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest shrink-0 text-center md:text-right w-full md:w-auto">
                    {new Date(record.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    <div className="text-zinc-700">{new Date(record.createdAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}