// ============================================================
// TournamentWizard.jsx — 多步骤赛事创建向导
// P5 | spec §六.6.1 + §十一 — 草稿恢复(localStorage + 版本戳)
// ============================================================
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft, FaArrowRight, FaSave, FaTrash, FaSpinner,
  FaCheckCircle, FaExclamationTriangle, FaClock, FaCog,
  FaFileAlt, FaMusic, FaEye, FaPlus, FaTimes
} from 'react-icons/fa';
import SongSearchInput from './SongSearchInput';
import { createTournament } from '../../api/tournamentApi';

const WIZARD_DRAFT_KEY = 'purebeat_tournament_draft';
const WIZARD_VERSION = 1;

const STEPS = [
  { id: 'basic', label: '基本信息', icon: FaFileAlt },
  { id: 'schedule', label: '时间安排', icon: FaClock },
  { id: 'rules', label: '规则与报名', icon: FaCog },
  { id: 'qualifier', label: '预选设置', icon: FaMusic },
  { id: 'review', label: '确认发布', icon: FaEye },
];

const INITIAL_STATE = {
  title: '',
  subtitle: '',
  description: '',
  coverUrl: '',
  rules: '',
  registrationStart: '',
  registrationEnd: '',
  startTime: '',
  endTime: '',
  registrationForm: [],
  qualifierSongs: [],
  advanceCount: 8,
  seeding: 'qualifier',
};

const TournamentWizard = ({ onComplete }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(WIZARD_DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed._version === WIZARD_VERSION) {
          return parsed;
        }
      }
    } catch {}
    return INITIAL_STATE;
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const draftTimer = useRef(null);

  // 自动保存草稿（防抖 2s）
  useEffect(() => {
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      localStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify({ ...form, _version: WIZARD_VERSION }));
    }, 2000);
    return () => { if (draftTimer.current) clearTimeout(draftTimer.current); };
  }, [form]);

  const update = useCallback((key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setErrors(prev => ({ ...prev, [key]: null }));
  }, []);

  const updateField = useCallback((key) => (e) => {
    update(key, e.target.value);
  }, [update]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(WIZARD_DRAFT_KEY);
    setForm(INITIAL_STATE);
  }, []);

  // 验证当前步骤
  const validateStep = useCallback((s) => {
    const errs = {};
    if (s === 0) {
      if (!form.title.trim()) errs.title = '赛事标题不能为空';
    }
    if (s === 1) {
      if (!form.registrationStart) errs.registrationStart = '请设置报名开始时间';
      if (!form.registrationEnd) errs.registrationEnd = '请设置报名截止时间';
      if (!form.startTime) errs.startTime = '请设置赛事开始时间';
      if (form.registrationStart && form.registrationEnd &&
          new Date(form.registrationStart) >= new Date(form.registrationEnd)) {
        errs.registrationEnd = '报名截止时间需晚于开始时间';
      }
      if (form.registrationEnd && form.startTime &&
          new Date(form.registrationEnd) >= new Date(form.startTime)) {
        errs.startTime = '赛事开始时间需晚于报名截止时间';
      }
    }
    if (s === 3) {
      if (form.qualifierSongs.length === 0) {
        errs.qualifierSongs = '请至少添加一首预选赛曲目';
      }
      if (form.advanceCount < 2) errs.advanceCount = '晋级人数不能少于 2';
    }
    setErrors(prev => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  }, [form]);

  const nextStep = useCallback(() => {
    if (validateStep(step)) {
      setStep(s => Math.min(s + 1, STEPS.length - 1));
    }
  }, [step, validateStep]);

  const prevStep = useCallback(() => {
    setStep(s => Math.max(s - 1, 0));
  }, []);

  const addFormField = useCallback(() => {
    setForm(prev => ({
      ...prev,
      registrationForm: [...prev.registrationForm, { label: '', type: 'text', required: false, placeholder: '' }],
    }));
  }, []);

  const updateFormField = useCallback((idx, key, val) => {
    setForm(prev => {
      const fields = [...prev.registrationForm];
      fields[idx] = { ...fields[idx], [key]: val };
      return { ...prev, registrationForm: fields };
    });
  }, []);

  const removeFormField = useCallback((idx) => {
    setForm(prev => ({
      ...prev,
      registrationForm: prev.registrationForm.filter((_, i) => i !== idx),
    }));
  }, []);

  const addQualSong = useCallback((song) => {
    setForm(prev => {
      const existing = prev.qualifierSongs.find(s => s.songName === (song.title || ''));
      if (existing) return prev; // 去重
      const levelNames = Array.isArray(song.level) ? song.level : (song.level ? [song.level] : ['MASTER']);
      const ds = Array.isArray(song.ds) ? song.ds : (song.ds ? [song.ds] : [0]);
      const highestIdx = ds.length - 1;
      return {
        ...prev,
        qualifierSongs: [
          ...prev.qualifierSongs,
          {
            songName: song.title || '',
            difficulty: levelNames[highestIdx] || 'MASTER',
            level: ds[highestIdx] || 3,
            constant: ds[highestIdx] || 0,
            coverUrl: song.coverUrl || '',
            note: '',
          },
        ],
      };
    });
  }, []);

  const removeQualSong = useCallback((idx) => {
    setForm(prev => ({
      ...prev,
      qualifierSongs: prev.qualifierSongs.filter((_, i) => i !== idx),
    }));
  }, []);

  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await createTournament(form);
      localStorage.removeItem(WIZARD_DRAFT_KEY);
      setSubmitResult({ success: true, data: res.data });
      onComplete?.(res.data);
    } catch (err) {
      setSubmitResult({ success: false, msg: err.response?.data?.msg || '创建失败' });
    } finally {
      setSubmitting(false);
    }
  };

  const hasDraft = (() => {
    try {
      const saved = localStorage.getItem(WIZARD_DRAFT_KEY);
      if (!saved) return false;
      const parsed = JSON.parse(saved);
      return parsed._version === WIZARD_VERSION && parsed.title;
    } catch { return false; }
  })();

  const inputClass = 'w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-600';
  const errorClass = 'text-red-400 text-xs mt-1 flex items-center gap-1';

  return (
    <div className="max-w-3xl mx-auto">
      {/* 步骤进度 */}
      <div className="flex items-center justify-between mb-8 px-2">
        {STEPS.map((s, i) => {
          const isCurrent = i === step;
          const isComplete = i < step;
          return (
            <div key={s.id} className="flex flex-col items-center flex-1 relative">
              {/* 连接线 */}
              {i > 0 && (
                <div className={`absolute top-4 right-1/2 w-full h-0.5 ${i <= step ? 'bg-cyan-500/50' : 'bg-white/[0.06]'}`} style={{ transform: 'translateY(-50%)' }} />
              )}
              <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                isComplete ? 'bg-cyan-500 text-white' :
                isCurrent ? 'bg-cyan-500/20 text-cyan-400 border-2 border-cyan-500' :
                'bg-white/[0.04] text-zinc-600 border border-white/[0.08]'
              }`}>
                {isComplete ? <FaCheckCircle /> : <s.icon className="text-[11px]" />}
              </div>
              <div className={`text-[10px] mt-1.5 font-bold text-center ${isComplete || isCurrent ? 'text-zinc-300' : 'text-zinc-600'}`}>
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* 草稿恢复提示 */}
      {step === 0 && hasDraft && (
        <div className="flex items-center justify-between bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-3 mb-4">
          <span className="text-xs text-cyan-300">检测到未完成的创建草稿</span>
          <button onClick={clearDraft} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
            <FaTrash size={10} /> 清除
          </button>
        </div>
      )}

      {/* 步骤内容 */}
      <div className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8 min-h-[300px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Step 0: 基本信息 */}
            {step === 0 && (
              <div className="space-y-5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><FaFileAlt className="text-cyan-400" /> 基本信息</h3>
                <div>
                  <label className="text-xs text-zinc-500 font-bold uppercase mb-1.5 block">赛事标题 *</label>
                  <input value={form.title} onChange={updateField('title')} className={inputClass} placeholder="输入赛事名称" autoFocus />
                  {errors.title && <p className={errorClass}><FaExclamationTriangle size={10} />{errors.title}</p>}
                </div>
                <div>
                  <label className="text-xs text-zinc-500 font-bold uppercase mb-1.5 block">副标题</label>
                  <input value={form.subtitle} onChange={updateField('subtitle')} className={inputClass} placeholder="可选：副标题或标语" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 font-bold uppercase mb-1.5 block">封面图 URL</label>
                  <input value={form.coverUrl} onChange={updateField('coverUrl')} className={inputClass} placeholder="可选：赛事封面图片链接" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 font-bold uppercase mb-1.5 block">赛事简介</label>
                  <textarea rows="4" value={form.description} onChange={updateField('description')} className={`${inputClass} resize-y`} placeholder="描述赛事内容、注意事项等" />
                </div>
              </div>
            )}

            {/* Step 1: 时间安排 */}
            {step === 1 && (
              <div className="space-y-5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><FaClock className="text-cyan-400" /> 时间安排</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-500 font-bold uppercase mb-1.5 block">报名开始 *</label>
                    <input type="datetime-local" value={form.registrationStart} onChange={updateField('registrationStart')} className={inputClass} />
                    {errors.registrationStart && <p className={errorClass}><FaExclamationTriangle size={10} />{errors.registrationStart}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-bold uppercase mb-1.5 block">报名截止 *</label>
                    <input type="datetime-local" value={form.registrationEnd} onChange={updateField('registrationEnd')} className={inputClass} />
                    {errors.registrationEnd && <p className={errorClass}><FaExclamationTriangle size={10} />{errors.registrationEnd}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-bold uppercase mb-1.5 block">赛事开始 *</label>
                    <input type="datetime-local" value={form.startTime} onChange={updateField('startTime')} className={inputClass} />
                    {errors.startTime && <p className={errorClass}><FaExclamationTriangle size={10} />{errors.startTime}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-bold uppercase mb-1.5 block">赛事结束</label>
                    <input type="datetime-local" value={form.endTime} onChange={updateField('endTime')} className={inputClass} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: 规则与报名表 */}
            {step === 2 && (
              <div className="space-y-5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><FaCog className="text-cyan-400" /> 规则与报名表</h3>
                <div>
                  <label className="text-xs text-zinc-500 font-bold uppercase mb-1.5 block">比赛规则（支持 BBCode）</label>
                  <textarea rows="6" value={form.rules} onChange={updateField('rules')} className={`${inputClass} resize-y font-mono text-sm`} placeholder="输入比赛规则..." />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 font-bold uppercase mb-1.5 block">报名表自定义字段</label>
                  {form.registrationForm.map((field, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2 bg-white/[0.03] rounded-xl p-3">
                      <input value={field.label} onChange={e => updateFormField(idx, 'label', e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs outline-none" placeholder="字段名" />
                      <select value={field.type} onChange={e => updateFormField(idx, 'type', e.target.value)} className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs outline-none">
                        <option value="text">文本</option><option value="number">数字</option>
                        <option value="textarea">多行</option><option value="select">下拉</option>
                      </select>
                      <label className="flex items-center gap-1 text-[10px] text-zinc-500 cursor-pointer whitespace-nowrap">
                        <input type="checkbox" checked={field.required} onChange={e => updateFormField(idx, 'required', e.target.checked)} className="accent-cyan-500" /> 必填
                      </label>
                      <button onClick={() => removeFormField(idx)} className="text-red-400 hover:text-red-300 p-1"><FaTimes size={10} /></button>
                    </div>
                  ))}
                  <button onClick={addFormField} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all">
                    <FaPlus /> 添加字段
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: 预选设置 */}
            {step === 3 && (
              <div className="space-y-5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><FaMusic className="text-cyan-400" /> 预选赛设置</h3>
                <div>
                  <label className="text-xs text-zinc-500 font-bold uppercase mb-1.5 block">晋级人数</label>
                  <input type="number" min="2" max="128" value={form.advanceCount} onChange={e => update('advanceCount', Number(e.target.value))} className="w-32 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50" />
                  {errors.advanceCount && <p className={errorClass}><FaExclamationTriangle size={10} />{errors.advanceCount}</p>}
                </div>
                <div>
                  <label className="text-xs text-zinc-500 font-bold uppercase mb-1.5 block">种子策略</label>
                  <select value={form.seeding} onChange={e => update('seeding', e.target.value)} className="w-48 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50">
                    <option value="qualifier">按预选排名</option>
                    <option value="random">随机分配</option>
                    <option value="manual">手动设置</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 font-bold uppercase mb-1.5 block">预选赛曲目</label>
                  <SongSearchInput
                    placeholder="搜索并选择曲目..."
                    onSelect={addQualSong}
                  />
                  {errors.qualifierSongs && <p className={errorClass}><FaExclamationTriangle size={10} />{errors.qualifierSongs}</p>}
                  <div className="mt-3 space-y-2">
                    {form.qualifierSongs.map((song, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5">
                        {song.coverUrl ? (
                          <img src={song.coverUrl} alt="" className="w-8 h-8 rounded-lg object-cover bg-black" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                            <FaMusic className="text-orange-400 text-[10px]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-xs font-bold truncate">{song.songName}</div>
                          <div className="text-[10px] text-zinc-500">{song.difficulty} · Lv{song.level} · Const {song.constant}</div>
                        </div>
                        <button onClick={() => removeQualSong(idx)} className="text-zinc-500 hover:text-red-400 transition-colors p-1"><FaTimes size={10} /></button>
                      </div>
                    ))}
                    {form.qualifierSongs.length === 0 && (
                      <p className="text-zinc-600 text-xs text-center py-4">尚未选择曲目</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: 确认发布 */}
            {step === 4 && (
              <div className="space-y-5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><FaEye className="text-cyan-400" /> 确认发布</h3>
                <div className="bg-white/[0.03] rounded-xl p-5 space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-zinc-500">标题</span><span className="text-white font-bold">{form.title}</span></div>
                  {form.subtitle && <div className="flex justify-between"><span className="text-zinc-500">副标题</span><span className="text-zinc-300">{form.subtitle}</span></div>}
                  <div className="flex justify-between"><span className="text-zinc-500">报名</span><span className="text-zinc-300">{new Date(form.registrationStart).toLocaleString('zh-CN')} ~ {new Date(form.registrationEnd).toLocaleString('zh-CN')}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">正赛</span><span className="text-zinc-300">{new Date(form.startTime).toLocaleString('zh-CN')} {form.endTime ? `~ ${new Date(form.endTime).toLocaleString('zh-CN')}` : ''}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">预选曲目</span><span className="text-zinc-300">{form.qualifierSongs.length} 首</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">晋级人数</span><span className="text-zinc-300">{form.advanceCount} 人</span></div>
                  {form.registrationForm.length > 0 && <div className="flex justify-between"><span className="text-zinc-500">报名字段</span><span className="text-zinc-300">{form.registrationForm.length} 个自定义字段</span></div>}
                </div>

                <AnimatePresence>
                  {submitResult && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`px-4 py-3 rounded-xl border text-sm flex items-center gap-3 ${
                        submitResult.success
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}
                    >
                      {submitResult.success ? <FaCheckCircle /> : <FaExclamationTriangle />}
                      <span>{submitResult.success ? '赛事创建成功！' : submitResult.msg}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/20"
                >
                  {submitting ? <FaSpinner className="animate-spin" /> : <FaSave />}
                  {submitting ? '创建中...' : '🎉 创建赛事'}
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 导航按钮 */}
      <div className="flex justify-between mt-6">
        <button
          onClick={step === 0 ? () => navigate('/tournaments') : prevStep}
          className="px-6 py-3 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
        >
          <FaArrowLeft /> {step === 0 ? '返回' : '上一步'}
        </button>
        {step < STEPS.length - 1 && (
          <button
            onClick={nextStep}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
          >
            下一步 <FaArrowRight />
          </button>
        )}
      </div>
    </div>
  );
};

export default TournamentWizard;
