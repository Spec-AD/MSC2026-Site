import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  FaUser, FaShieldAlt, FaLock, FaSave, FaSpinner, 
  FaSignOutAlt, FaExclamationTriangle, FaUsers, FaEnvelope, FaArrowRight, FaTimes
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 状态组
  const [profileData, setProfileData] = useState({ location: '', occupation: '', website: '', twitter: '', birthday: '' });
  const [privacyData, setPrivacyData] = useState({ isB50Visible: false, isChuniB50Visible: false });
  const [securityData, setSecurityData] = useState({ email: '', boundAccounts: [] });
  
  // ==========================================
  // 安全中心流程状态
  // ==========================================
  const [changeStep, setChangeStep] = useState(0); // 0: 展示态, 1: 验证旧邮箱, 2: 绑定新邮箱
  
  const [bindEmail, setBindEmail] = useState('');     // 初次绑定的邮箱输入
  const [otpCode, setOtpCode] = useState('');         // 初次绑定的验证码
  
  const [oldOtp, setOldOtp] = useState('');           // 换绑：旧邮箱验证码
  const [newEmail, setNewEmail] = useState('');       // 换绑：新邮箱
  const [newOtp, setNewOtp] = useState('');           // 换绑：新邮箱验证码
  
  const [sendingOtp, setSendingOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);       // 初次绑定倒计时
  const [oldCountdown, setOldCountdown] = useState(0); // 换绑旧邮箱倒计时
  const [newCountdown, setNewCountdown] = useState(0); // 换绑新邮箱倒计时

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchSettings();
  }, [user]);

  // 全局倒计时引擎
  useEffect(() => {
    let t1, t2, t3;
    if (countdown > 0) t1 = setTimeout(() => setCountdown(countdown - 1), 1000);
    if (oldCountdown > 0) t2 = setTimeout(() => setOldCountdown(oldCountdown - 1), 1000);
    if (newCountdown > 0) t3 = setTimeout(() => setNewCountdown(newCountdown - 1), 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [countdown, oldCountdown, newCountdown]);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/users/settings/me', { headers: { Authorization: `Bearer ${token}` } });
      const data = res.data;
      
      setProfileData({
        location: data.location || '', occupation: data.occupation || '',
        website: data.website || '', twitter: data.twitter || '', birthday: data.birthday || ''
      });
      setPrivacyData({ 
        isB50Visible: data.isB50Visible || false,
        isChuniB50Visible: data.isChuniB50Visible || false // 载入中二隐私状态
      });
      setSecurityData({ email: data.email || '', boundAccounts: data.boundAccounts || [] });
    } catch (err) {
      addToast('拉取设置失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/users/settings/profile', profileData, { headers: { Authorization: `Bearer ${token}` } });
      addToast('资料更新成功！', 'success');
    } catch (err) {
      addToast(err.response?.data?.msg || '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrivacy = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/users/settings/privacy', privacyData, { headers: { Authorization: `Bearer ${token}` } });
      addToast('隐私设置已更新！', 'success');
    } catch (err) {
      addToast('保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  // --- 邮箱验证流核心逻辑 ---
  const sendEmailOtp = async (targetEmail, targetType, setTimerFunc) => {
    if (!targetEmail || !targetEmail.includes('@')) return addToast('请输入有效的邮箱地址', 'error');
    setSendingOtp(true);
    try {
      await axios.post('/api/auth/send-otp', { email: targetEmail, type: targetType });
      addToast('验证码已发送至邮箱，请注意查收', 'success');
      setTimerFunc(60);
    } catch (err) {
      addToast(err.response?.data?.msg || '发送失败', 'error');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleInitialBind = async () => {
    if (!otpCode || otpCode.length !== 6) return addToast('请输入6位验证码', 'error');
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/users/settings/bind-email', { email: bindEmail, otp: otpCode }, { headers: { Authorization: `Bearer ${token}` } });
      addToast('邮箱绑定成功！', 'success');
      // 🔥 毫秒级 UI 无缝切换
      setSecurityData(prev => ({ ...prev, email: bindEmail }));
      setBindEmail(''); setOtpCode('');
    } catch (err) {
      addToast(err.response?.data?.msg || '绑定失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !oldOtp || !newOtp) return addToast('请填完所有信息', 'error');
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/users/settings/change-email', { newEmail, oldOtp, newOtp }, { headers: { Authorization: `Bearer ${token}` } });
      addToast('邮箱换绑成功！', 'success');
      // 🔥 毫秒级 UI 无缝切换，回到展示态
      setSecurityData(prev => ({ ...prev, email: newEmail }));
      setChangeStep(0);
      setOldOtp(''); setNewEmail(''); setNewOtp('');
    } catch (err) {
      addToast(err.response?.data?.msg || '换绑失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!window.confirm('⚠️ 警告：账号注销进入犹豫期后，系统将通知管理员。注销成功后，您的绑定邮箱将被永久拉黑，用户名将在180天内无法再次注册。确定继续？')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/users/settings/request-deletion', {}, { headers: { Authorization: `Bearer ${token}` } });
      addToast('已提交注销申请', 'success');
      logout();
      navigate('/');
    } catch (err) {
      addToast(err.response?.data?.msg || '提交失败', 'error');
    }
  };

  if (loading) return <div className="h-screen bg-[#0c0c11] flex items-center justify-center"><FaSpinner className="animate-spin text-3xl text-cyan-500" /></div>;

  return (
    <div className="min-h-screen bg-[#0c0c11] text-zinc-200 pt-24 pb-12 px-6">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
        
        {/* 左侧边栏 */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
          <h2 className="text-2xl font-bold mb-4 ml-2 tracking-tight">系统设置</h2>
          <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'profile' ? 'bg-[#15151e] border border-white/5 text-cyan-400' : 'text-zinc-500 hover:bg-[#15151e]/50 hover:text-zinc-300'}`}>
            <FaUser /> 个人资料
          </button>
          <button onClick={() => setActiveTab('privacy')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'privacy' ? 'bg-[#15151e] border border-white/5 text-cyan-400' : 'text-zinc-500 hover:bg-[#15151e]/50 hover:text-zinc-300'}`}>
            <FaLock /> 隐私设置
          </button>
          <button onClick={() => setActiveTab('security')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'security' ? 'bg-[#15151e] border border-white/5 text-cyan-400' : 'text-zinc-500 hover:bg-[#15151e]/50 hover:text-zinc-300'}`}>
            <FaShieldAlt /> 安全中心
          </button>
        </div>

        {/* 右侧内容区 */}
        <div className="flex-1 bg-[#15151e]/80 backdrop-blur-md border border-white/[0.05] rounded-[2rem] p-6 md:p-10 shadow-xl">
          
          {/* ========================================================= */}
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="animate-fade-in flex flex-col gap-6">
              <h3 className="text-xl font-bold text-white border-b border-white/5 pb-4 mb-2">丰富个人名片</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">当前位置 Location</label>
                  <input type="text" value={profileData.location} onChange={e => setProfileData({...profileData, location: e.target.value})} placeholder="如：Earth" className="w-full bg-[#0c0c11] border border-white/5 rounded-xl p-3 text-sm focus:border-cyan-500 outline-none transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">职业 Occupation</label>
                  <input type="text" value={profileData.occupation} onChange={e => setProfileData({...profileData, occupation: e.target.value})} placeholder="如：Student" className="w-full bg-[#0c0c11] border border-white/5 rounded-xl p-3 text-sm focus:border-cyan-500 outline-none transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">X (Twitter)</label>
                  <div className="flex bg-[#0c0c11] border border-white/5 rounded-xl overflow-hidden focus-within:border-cyan-500 transition-colors">
                    <span className="p-3 text-zinc-500 bg-[#15151e] border-r border-white/5">@</span>
                    <input type="text" value={profileData.twitter} onChange={e => setProfileData({...profileData, twitter: e.target.value.replace('@', '')})} placeholder="Username" className="w-full bg-transparent p-3 text-sm outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">个人网站 Website</label>
                  <input type="text" value={profileData.website} onChange={e => setProfileData({...profileData, website: e.target.value})} placeholder="https://" className="w-full bg-[#0c0c11] border border-white/5 rounded-xl p-3 text-sm focus:border-cyan-500 outline-none transition-colors" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">生日 Birthday</label>
                  <input type="text" value={profileData.birthday} onChange={e => setProfileData({...profileData, birthday: e.target.value})} placeholder="MM-DD (如: 10-24)" className="w-full bg-[#0c0c11] border border-white/5 rounded-xl p-3 text-sm focus:border-cyan-500 outline-none font-mono transition-colors" />
                </div>
              </div>

              <button onClick={handleSaveProfile} disabled={saving} className="mt-4 w-fit px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-zinc-900 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                {saving ? <FaSpinner className="animate-spin" /> : <FaSave />} 储存更改
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* PRIVACY TAB */}
          {activeTab === 'privacy' && (
            <div className="animate-fade-in flex flex-col gap-6">
              <h3 className="text-xl font-bold text-white border-b border-white/5 pb-4 mb-2">数据展示权限</h3>
              
              <div className="flex flex-col gap-4">
                {/* 舞萌 DX 隐私开关 */}
                <div className="flex items-center justify-between bg-[#0c0c11] border border-white/[0.05] rounded-xl p-5">
                  <div className="flex flex-col">
                    <span className="text-base font-bold text-cyan-400">公开 Maimai DX 成绩数据</span>
                    <span className="text-xs text-zinc-500 mt-1 max-w-sm leading-relaxed">允许其他用户查看你的舞萌 Best 50 及乐曲成绩。</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" className="sr-only peer" checked={privacyData.isB50Visible} onChange={(e) => setPrivacyData({...privacyData, isB50Visible: e.target.checked})} />
                    <div className="w-11 h-6 bg-[#222228] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>

                {/* CHUNITHM 隐私开关 */}
                <div className="flex items-center justify-between bg-[#0c0c11] border border-white/[0.05] rounded-xl p-5">
                  <div className="flex flex-col">
                    <span className="text-base font-bold text-yellow-400">公开 CHUNITHM 成绩数据</span>
                    <span className="text-xs text-zinc-500 mt-1 max-w-sm leading-relaxed">允许其他用户查看你的中二 B30+R20 及乐曲成绩。</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" className="sr-only peer" checked={privacyData.isChuniB50Visible} onChange={(e) => setPrivacyData({...privacyData, isChuniB50Visible: e.target.checked})} />
                    <div className="w-11 h-6 bg-[#222228] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                  </label>
                </div>
              </div>

              <button onClick={handleSavePrivacy} disabled={saving} className="mt-2 w-fit px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-zinc-900 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                {saving ? <FaSpinner className="animate-spin" /> : <FaSave />} 储存更改
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="animate-fade-in flex flex-col gap-8">
              <h3 className="text-xl font-bold text-white border-b border-white/5 pb-4">账号与安全</h3>
              
              {/* Email Binding Engine */}
              <div className="bg-[#0c0c11] border border-white/5 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-2"><FaShieldAlt className="text-emerald-500" /> 邮箱绑定与保护</h4>
                  {changeStep > 0 && (
                    <button onClick={() => setChangeStep(0)} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
                      <FaTimes /> 取消换绑
                    </button>
                  )}
                </div>

                {!securityData.email ? (
                  // --- 状态A：从未绑定过 ---
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      <input type="email" value={bindEmail} onChange={e => setBindEmail(e.target.value)} placeholder="输入您的邮箱地址" className="flex-1 bg-[#15151e] border border-white/5 rounded-lg p-3 text-sm focus:border-cyan-500 outline-none" />
                      <button onClick={() => sendEmailOtp(bindEmail, 'BIND', setCountdown)} disabled={sendingOtp || countdown > 0} className="px-4 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-sm font-bold whitespace-nowrap transition-colors disabled:opacity-50">
                        {countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={otpCode} onChange={e => setOtpCode(e.target.value)} placeholder="6位验证码" maxLength={6} className="w-1/3 bg-[#15151e] border border-white/5 rounded-lg p-3 text-sm font-mono focus:border-cyan-500 outline-none text-center tracking-widest" />
                      <button onClick={handleInitialBind} disabled={saving || !otpCode} className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-zinc-900 rounded-lg font-bold text-sm transition-all disabled:opacity-50 active:scale-95">
                        立即绑定
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">强烈建议绑定邮箱，用于触发新设备登录保护及找回密码功能。</p>
                  </div>
                ) : (
                  // --- 状态B：已绑定，控制流转 ---
                  <AnimatePresence mode="wait">
                    {changeStep === 0 && (
                      <motion.div key="step0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-between bg-[#15151e] p-3 rounded-lg border border-white/5">
                        <div className="flex items-center gap-3">
                          <FaEnvelope className="text-zinc-500" />
                          <span className="text-sm font-mono text-zinc-300">{securityData.email.replace(/(.{2}).*(@.*)/, "$1***$2")}</span>
                          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">Protected</span>
                        </div>
                        <button onClick={() => setChangeStep(1)} className="text-xs font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 px-3 py-1.5 rounded transition-colors">
                          更换绑定
                        </button>
                      </motion.div>
                    )}

                    {changeStep === 1 && (
                      <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-3">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Step 1 / 2 : 验证原邮箱</span>
                        <div className="flex gap-2">
                          <input type="text" value={securityData.email.replace(/(.{2}).*(@.*)/, "$1***$2")} disabled className="flex-1 bg-[#15151e] border border-white/5 rounded-lg p-3 text-sm font-mono text-zinc-500 outline-none" />
                          <button onClick={() => sendEmailOtp(securityData.email, 'UNBIND', setOldCountdown)} disabled={sendingOtp || oldCountdown > 0} className="px-4 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-sm font-bold whitespace-nowrap transition-colors disabled:opacity-50">
                            {oldCountdown > 0 ? `${oldCountdown}s 后重发` : '获取验证码'}
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input type="text" value={oldOtp} onChange={e => setOldOtp(e.target.value)} placeholder="旧邮箱验证码" maxLength={6} className="w-1/3 bg-[#15151e] border border-white/5 rounded-lg p-3 text-sm font-mono focus:border-cyan-500 outline-none text-center tracking-widest" />
                          <button onClick={() => { if(oldOtp.length === 6) setChangeStep(2); else addToast('请输入完整的验证码','error'); }} className="flex-1 bg-zinc-200 hover:bg-white text-zinc-900 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2">
                            下一步 <FaArrowRight />
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {changeStep === 2 && (
                      <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-3">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Step 2 / 2 : 绑定新邮箱</span>
                        <div className="flex gap-2">
                          <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="输入新的邮箱地址" className="flex-1 bg-[#15151e] border border-white/5 rounded-lg p-3 text-sm focus:border-cyan-500 outline-none" />
                          <button onClick={() => sendEmailOtp(newEmail, 'BIND', setNewCountdown)} disabled={sendingOtp || newCountdown > 0} className="px-4 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-sm font-bold whitespace-nowrap transition-colors disabled:opacity-50">
                            {newCountdown > 0 ? `${newCountdown}s 后重发` : '获取验证码'}
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input type="text" value={newOtp} onChange={e => setNewOtp(e.target.value)} placeholder="新邮箱验证码" maxLength={6} className="w-1/3 bg-[#15151e] border border-white/5 rounded-lg p-3 text-sm font-mono focus:border-cyan-500 outline-none text-center tracking-widest" />
                          <button onClick={handleChangeEmail} disabled={saving || !newOtp} className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-zinc-900 rounded-lg font-bold text-sm transition-all disabled:opacity-50 active:scale-95">
                            {saving ? <FaSpinner className="animate-spin mx-auto" /> : '确认换绑'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>

              {/* Multi-Account (WIP Preview) */}
              <div className="bg-[#0c0c11] border border-white/5 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-2"><FaUsers className="text-blue-400" /> 多账号绑定管理</h4>
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold border border-blue-500/30 uppercase tracking-wider">WIP</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">您可以将其他小号绑定至此主账号，以便在同一设备上快捷无缝切换（冷却期限制 24 小时）。</p>
              </div>

              {/* Danger Zone */}
              <div className="border border-rose-500/30 bg-rose-500/5 rounded-xl p-5 mt-4">
                <h4 className="text-sm font-bold text-rose-400 mb-2 flex items-center gap-2"><FaExclamationTriangle /> 危险操作</h4>
                <p className="text-xs text-rose-400/70 mb-5 leading-relaxed">
                  注销账号后，该账号相关的绑定邮箱将被永久拉黑。你的用户名将进入长达 180 天的保护期，在此期间任何人都无法注册此名。
                </p>
                <div className="flex gap-3">
                  <button onClick={() => { logout(); navigate('/login'); }} className="px-5 py-2.5 bg-[#15151e] border border-white/5 hover:bg-white/5 text-zinc-300 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                    <FaSignOutAlt /> 退出当前登录
                  </button>
                  <button onClick={handleRequestDeletion} className="px-5 py-2.5 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/50 rounded-lg text-sm font-bold transition-colors">
                    申请注销账号
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}