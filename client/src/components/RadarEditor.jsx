import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import RadarChart from './RadarChart';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { FaTimes, FaSpinner, FaSave, FaGlobeAsia, FaUser, FaLock } from 'react-icons/fa';

const DIMS = [
  { key: 'stamina',   label: '耐力',  desc: '谱面对体力的考验',      color: '#f472b6' },
  { key: 'tech',      label: '技巧',  desc: '谱面对技巧和熟练度的考验',          color: '#fbbf24' },
  { key: 'stable',    label: '稳定',  desc: '谱面对稳定性的考验',        color: '#34d399' },
  { key: 'accuracy',  label: '准度',  desc: '谱面对节奏和抓准的考验',    color: '#38bdf8' },
  { key: 'burst', label: '爆发',  desc: '谱面对短时间爆发能力的考验',    color: '#a78bfa' },
];

const DEFAULT_VALUES = { stamina: 5, tech: 5, stable: 5, accuracy: 5, burst: 5 };

function DimSlider({ dimKey, label, desc, color, value, onChange, disabled }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-bold" style={{ color }}>{label}</span>
          <span className="text-[10px] text-zinc-600">{desc}</span>
        </div>
        <span
          className="text-lg font-black w-10 text-right"
          style={{ color, fontFamily: "'Quicksand', sans-serif" }}
        >
          {Number(value).toFixed(1)}
        </span>
      </div>
      <div className="relative flex items-center h-6">
        {/* 轨道背景 */}
        <div className="absolute w-full h-1.5 rounded-full bg-[#0c0c11]" />
        {/* 进度 */}
        <div
          className="absolute h-1.5 rounded-full transition-all"
          style={{ width: `${(value / 10) * 100}%`, background: color, opacity: 0.7 }}
        />
        <input
          type="range"
          min="0" max="10" step="0.1"
          value={value}
          onChange={e => onChange(dimKey, parseFloat(e.target.value))}
          disabled={disabled}
          className="relative w-full opacity-0 h-6 cursor-pointer disabled:cursor-not-allowed"
          style={{ zIndex: 2 }}
        />
        {/* 自定义滑块把手 */}
        <div
          className="absolute w-3.5 h-3.5 rounded-full border-2 border-[#0c0c11] pointer-events-none transition-all"
          style={{
            left: `calc(${(value / 10) * 100}% - 7px)`,
            background: color,
            boxShadow: `0 0 8px ${color}80`
          }}
        />
      </div>
    </div>
  );
}

/**
 * 🌟 RadarEditor - 五维雷达图可视化编辑器
 * @param {string} songId
 * @param {number} diffIndex - 当前难度索引
 * @param {string} diffName - 难度名称
 * @param {object} globalRadar - 全站综合雷达数据 { stamina, star, ... }
 * @param {function} onClose
 */
export default function RadarEditor({ songId, diffIndex, diffName, globalRadar, onClose, onSaved }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isAdmin = user?.role === 'ADM';

  const [myVote, setMyVote] = useState(null);
  const [localValues, setLocalValues] = useState({ ...DEFAULT_VALUES });
  const [adminValues, setAdminValues] = useState(globalRadar ? { ...globalRadar } : { ...DEFAULT_VALUES });
  const [mode, setMode] = useState('personal'); // 'personal' | 'admin'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasScore, setHasScore] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const [voteRes] = await Promise.all([
          axios.get(`/api/songs/${songId}/radar/my-vote`, {
            params: { diffIndex },
            headers
          }).catch(() => ({ data: { myVote: null } }))
        ]);

        if (voteRes.data.myVote) {
          setMyVote(voteRes.data.myVote);
          setLocalValues({ ...DEFAULT_VALUES, ...voteRes.data.myVote });
          setHasScore(true);
        }

        // 试探是否有成绩（如果能拿到 myVote 说明有成绩；否则后端会拒绝投票请求）
        setHasScore(!!voteRes.data.myVote || true); // 暂时允许尝试提交
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchData();
    else setLoading(false);
  }, [songId, diffIndex, user]);

  const handleChange = useCallback((key, val) => {
    if (mode === 'admin') {
      setAdminValues(prev => ({ ...prev, [key]: val }));
    } else {
      setLocalValues(prev => ({ ...prev, [key]: val }));
    }
  }, [mode]);

  const handleSave = async () => {
    setSaving(true);
    const token = localStorage.getItem('token');
    try {
      if (mode === 'admin') {
        await axios.put(`/api/songs/${songId}/radar/base`, {
          diffIndex,
          values: adminValues
        }, { headers: { Authorization: `Bearer ${token}` } });
        addToast('你的投票已更新！', 'success');
      } else {
        await axios.post(`/api/songs/${songId}/radar/vote`, {
          diffIndex,
          values: localValues
        }, { headers: { Authorization: `Bearer ${token}` } });
        addToast('你的评价已提交！感谢贡献社区数据', 'success');
      }
      onSaved?.();
    } catch (err) {
      addToast(err.response?.data?.msg || '提交失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const activeValues = mode === 'admin' ? adminValues : localValues;

  // 双轨数据集
  const datasets = [];
  if (globalRadar) {
    datasets.push({
      values: globalRadar,
      color: 'rgba(255,255,255,0.3)',
      fillColor: 'rgba(255,255,255,0.05)',
      label: '全站综合',
      dashed: false
    });
  }
  datasets.push({
    values: activeValues,
    color: mode === 'admin' ? '#fbbf24' : '#818cf8',
    fillColor: mode === 'admin' ? 'rgba(251,191,36,0.15)' : 'rgba(129,140,248,0.18)',
    label: mode === 'admin' ? '管理员锚点' : '我的评价',
    dashed: true
  });

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="relative z-10 bg-[#15151e] border border-white/[0.08] rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
        style={{ fontFamily: "'Quicksand', sans-serif" }}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
          <div>
            <h2 className="text-lg font-black text-zinc-100">谱面五维评价</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{diffName} · 你的评价将贡献到全站数据</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        <div className="p-6 flex flex-col md:flex-row gap-6">
          {/* 左侧：雷达图预览 */}
          <div className="flex flex-col items-center gap-3 md:w-[240px] shrink-0">
            <RadarChart
              datasets={datasets}
              size={220}
              showLabels
              showGrid
              className="drop-shadow-lg"
            />

            {/* 图例 */}
            <div className="flex flex-col gap-1.5 w-full px-2">
              {globalRadar && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <div className="w-4 h-0.5 bg-white/30" />
                  <span>全站综合</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs" style={{ color: mode === 'admin' ? '#fbbf24' : '#818cf8' }}>
                <div className="w-4 h-0.5 border-t-2 border-dashed" style={{ borderColor: mode === 'admin' ? '#fbbf24' : '#818cf8' }} />
                <span>{mode === 'admin' ? '管理员锚点' : '我的评价'}</span>
              </div>
            </div>

            {/* 模式切换（仅管理员） */}
            {isAdmin && (
              <div className="w-full bg-[#0c0c11] border border-white/[0.05] rounded-xl p-1 flex gap-1 mt-2">
                <button
                  onClick={() => setMode('personal')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    mode === 'personal'
                      ? 'bg-indigo-500/20 text-indigo-300'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <FaUser className="text-[10px]" /> 个人
                </button>
                <button
                  onClick={() => setMode('admin')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    mode === 'admin'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <FaGlobeAsia className="text-[10px]" /> 管理锚点
                </button>
              </div>
            )}
          </div>

          {/* 右侧：滑块 */}
          <div className="flex-1 flex flex-col gap-5">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <FaSpinner className="animate-spin text-2xl text-indigo-400" />
              </div>
            ) : (
              <>
                {!user && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500 bg-[#0c0c11] border border-white/[0.05] rounded-xl p-3">
                    <FaLock />
                    <span>登录后可提交你的评价，共同建设社区数据</span>
                  </div>
                )}

                {mode === 'personal' && myVote && (
                  <div className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2">
                    你已投过票，修改后提交将覆盖上次评价
                  </div>
                )}

                <div className="flex flex-col gap-4">
                  {DIMS.map(dim => (
                    <DimSlider
                      key={dim.key}
                      dimKey={dim.key}
                      label={dim.label}
                      desc={dim.desc}
                      color={dim.color}
                      value={activeValues[dim.key] ?? 5}
                      onChange={handleChange}
                      disabled={!user || (mode === 'admin' && !isAdmin)}
                    />
                  ))}
                </div>

                {/* 底部描述 */}
                {mode === 'admin' && (
                  <p className="text-[10px] text-amber-400/60 mt-2">
                    ⚓ 此值为贝叶斯平滑锚点，在玩家数据稀少时起主导作用
                  </p>
                )}
                {mode === 'personal' && (
                  <p className="text-[10px] text-zinc-600 mt-2">
                    你的权重由成绩和 Rating 综合决定
                  </p>
                )}

                {user && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="mt-2 w-full py-3 rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{
                      background: mode === 'admin'
                        ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
                        : 'linear-gradient(135deg, #6366f1, #818cf8)',
                      color: mode === 'admin' ? '#1c1100' : '#fff'
                    }}
                  >
                    {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                    {mode === 'admin' ? '保存管理员锚点' : '提交我的评价'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}