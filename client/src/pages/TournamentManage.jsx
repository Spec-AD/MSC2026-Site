import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  FaArrowLeft, FaSpinner, FaUsers, FaMusic, FaSitemap, FaPlus, FaTimes, 
  FaTrophy, FaEdit, FaSave, FaClipboardList, FaCheckCircle, FaCalendarAlt
} from 'react-icons/fa';

const TournamentManage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  // 编辑状态
  const [editInfo, setEditInfo] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // 报名表编辑
  const [formFields, setFormFields] = useState([]);

  // 预选赛曲目
  const [qualSongs, setQualSongs] = useState([]);

  // 成绩录入
  const [scoreData, setScoreData] = useState({ targetUid: '', songName: '', achievement: '', dxScore: '' });

  // 分组
  const [groups, setGroups] = useState([]);

  // 正赛对局
  const [matches, setMatches] = useState([]);

  // 结果
  const [results, setResults] = useState([]);
  const [resultAnnouncement, setResultAnnouncement] = useState('');

  useEffect(() => {
    fetchTournament();
  }, [id]);

  const fetchTournament = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/tournaments/detail/${id}`);
      setTournament(res.data);
      setEditInfo({
        title: res.data.title, subtitle: res.data.subtitle || '', description: res.data.description || '',
        rules: res.data.rules || '', coverUrl: res.data.coverUrl || '', status: res.data.status,
        registrationStart: res.data.registrationStart ? new Date(res.data.registrationStart).toISOString().slice(0, 16) : '',
        registrationEnd: res.data.registrationEnd ? new Date(res.data.registrationEnd).toISOString().slice(0, 16) : '',
        startTime: res.data.startTime ? new Date(res.data.startTime).toISOString().slice(0, 16) : '',
        endTime: res.data.endTime ? new Date(res.data.endTime).toISOString().slice(0, 16) : ''
      });
      setFormFields(res.data.registrationForm || []);
      setQualSongs(res.data.qualifierSongs || []);
      setGroups(res.data.groups || []);
      setMatches(res.data.matches || []);
      setResults(res.data.results || []);
      setResultAnnouncement(res.data.resultAnnouncement || '');
    } catch (err) { addToast('加载赛事失败', 'error'); }
    finally { setLoading(false); }
  };

  if (!user || !['ADM', 'CHM', 'TO'].includes(user.role)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white">
        <h1 className="text-3xl font-bold text-red-500 mb-4">无权访问</h1>
        <button onClick={() => navigate('/tournaments')} className="mt-4 px-6 py-2 bg-white/10 rounded-full hover:bg-white/20">返回赛事大厅</button>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><FaSpinner className="animate-spin text-4xl text-cyan-500" /></div>;
  if (!tournament) return <div className="min-h-screen flex items-center justify-center text-white">赛事不存在</div>;

  const handleSaveInfo = async () => {
    setIsSaving(true);
    try {
      await axios.put(`/api/tournaments/detail/${id}`, editInfo, { headers });
      addToast('赛事信息已更新', 'success');
      fetchTournament();
    } catch (err) { addToast(err.response?.data?.msg || '更新失败', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleSaveForm = async () => {
    try {
      await axios.put(`/api/tournaments/detail/${id}/registration-form`, { fields: formFields }, { headers });
      addToast('报名表已保存', 'success');
    } catch (err) { addToast('保存失败', 'error'); }
  };

  const handleSaveQualSongs = async () => {
    try {
      await axios.put(`/api/tournaments/detail/${id}/qualifier-songs`, { songs: qualSongs }, { headers });
      addToast('预选赛曲目已保存', 'success');
    } catch (err) { addToast('保存失败', 'error'); }
  };

  const handleSubmitScore = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`/api/tournaments/detail/${id}/qualifier-scores`, scoreData, { headers });
      addToast(res.data.msg, 'success');
      setScoreData({ ...scoreData, songName: '', achievement: '', dxScore: '' });
    } catch (err) { addToast(err.response?.data?.msg || '录入失败', 'error'); }
  };

  const handleSaveGroups = async () => {
    try {
      await axios.put(`/api/tournaments/detail/${id}/groups`, { groups }, { headers });
      addToast('分组已保存', 'success');
    } catch (err) { addToast('保存失败', 'error'); }
  };

  const handleSaveMatches = async () => {
    try {
      await axios.put(`/api/tournaments/detail/${id}/matches`, { matches }, { headers });
      addToast('对局已保存', 'success');
    } catch (err) { addToast('保存失败', 'error'); }
  };

  const handlePublishResults = async () => {
    try {
      await axios.put(`/api/tournaments/detail/${id}/results`, { results, resultAnnouncement }, { headers });
      addToast('结果已发布', 'success');
    } catch (err) { addToast('发布失败', 'error'); }
  };

  const tabs = [
    { id: 'info', label: '基本信息', icon: FaEdit },
    { id: 'form', label: '报名表', icon: FaClipboardList },
    { id: 'registrations', label: '报名情况', icon: FaUsers },
    { id: 'qualifier', label: '预选赛', icon: FaMusic },
    { id: 'groups', label: '分组', icon: FaSitemap },
    { id: 'matches', label: '正赛对局', icon: FaTrophy },
    { id: 'results', label: '结果公布', icon: FaCheckCircle },
  ];

  const inputClass = "w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none transition-colors";
  const btnClass = "px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold tracking-widest rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center gap-2";

  return (
    <div className="w-full min-h-screen pb-24 text-white px-4 md:px-8 max-w-6xl mx-auto pt-24">
      {/* 返回按钮 & 标题 */}
      <div className="mb-8">
        <button onClick={() => navigate('/tournaments')} className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm mb-4">
          <FaArrowLeft /> 返回赛事大厅
        </button>
        <h1 className="text-3xl md:text-4xl font-black text-white">{tournament.title}</h1>
        <p className="text-gray-400 text-sm mt-1">赛事管理控制台</p>
      </div>

      {/* Tab 导航 */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold tracking-wide whitespace-nowrap transition-all border ${
              activeTab === t.id ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-white/5 text-gray-400 border-white/10 hover:border-cyan-500/50'
            }`}>
            <t.icon className="text-xs" /> {t.label}
          </button>
        ))}
      </div>

      {/* ========== 基本信息 ========== */}
      {activeTab === 'info' && (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div><label className="text-xs text-gray-500 font-bold uppercase mb-1 block">赛事标题</label><input value={editInfo.title || ''} onChange={e => setEditInfo({...editInfo, title: e.target.value})} className={inputClass} /></div>
            <div><label className="text-xs text-gray-500 font-bold uppercase mb-1 block">副标题</label><input value={editInfo.subtitle || ''} onChange={e => setEditInfo({...editInfo, subtitle: e.target.value})} className={inputClass} /></div>
          </div>
          <div><label className="text-xs text-gray-500 font-bold uppercase mb-1 block">封面图 URL</label><input value={editInfo.coverUrl || ''} onChange={e => setEditInfo({...editInfo, coverUrl: e.target.value})} className={inputClass} /></div>
          <div><label className="text-xs text-gray-500 font-bold uppercase mb-1 block">赛事描述</label><textarea rows="4" value={editInfo.description || ''} onChange={e => setEditInfo({...editInfo, description: e.target.value})} className={inputClass + " resize-y"} /></div>
          <div><label className="text-xs text-gray-500 font-bold uppercase mb-1 block">比赛规则 (BBCode)</label><textarea rows="8" value={editInfo.rules || ''} onChange={e => setEditInfo({...editInfo, rules: e.target.value})} className={inputClass + " resize-y font-mono text-sm"} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div><label className="text-xs text-gray-500 font-bold uppercase mb-1 block">报名开始</label><input type="datetime-local" value={editInfo.registrationStart || ''} onChange={e => setEditInfo({...editInfo, registrationStart: e.target.value})} className={inputClass} /></div>
            <div><label className="text-xs text-gray-500 font-bold uppercase mb-1 block">报名结束</label><input type="datetime-local" value={editInfo.registrationEnd || ''} onChange={e => setEditInfo({...editInfo, registrationEnd: e.target.value})} className={inputClass} /></div>
            <div><label className="text-xs text-gray-500 font-bold uppercase mb-1 block">比赛开始</label><input type="datetime-local" value={editInfo.startTime || ''} onChange={e => setEditInfo({...editInfo, startTime: e.target.value})} className={inputClass} /></div>
            <div><label className="text-xs text-gray-500 font-bold uppercase mb-1 block">比赛结束</label><input type="datetime-local" value={editInfo.endTime || ''} onChange={e => setEditInfo({...editInfo, endTime: e.target.value})} className={inputClass} /></div>
          </div>
          {!tournament.timeApproved && <p className="text-yellow-400 text-sm flex items-center gap-2"><FaCalendarAlt /> 比赛时间尚待 ADM 审核通过</p>}
          <button onClick={handleSaveInfo} disabled={isSaving} className={btnClass}>{isSaving ? <FaSpinner className="animate-spin" /> : <FaSave />} 保存信息</button>
        </div>
      )}

      {/* ========== 报名表设计 ========== */}
      {activeTab === 'form' && (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8 space-y-5">
          <p className="text-gray-400 text-sm mb-4">自定义报名表字段，选手报名时将填写这些信息。</p>
          {formFields.map((field, idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start">
              <input value={field.label} onChange={e => { const f = [...formFields]; f[idx].label = e.target.value; setFormFields(f); }} className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm" placeholder="字段名称" />
              <select value={field.type} onChange={e => { const f = [...formFields]; f[idx].type = e.target.value; setFormFields(f); }} className="bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm">
                <option value="text">文本</option><option value="number">数字</option><option value="textarea">长文本</option><option value="select">下拉选择</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={field.required} onChange={e => { const f = [...formFields]; f[idx].required = e.target.checked; setFormFields(f); }} /> 必填</label>
              <button onClick={() => setFormFields(formFields.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 p-1"><FaTimes /></button>
            </div>
          ))}
          <div className="flex gap-3">
            <button onClick={() => setFormFields([...formFields, { label: '', type: 'text', required: false, options: [], placeholder: '' }])} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold flex items-center gap-2"><FaPlus /> 添加字段</button>
            <button onClick={handleSaveForm} className={btnClass}><FaSave /> 保存报名表</button>
          </div>
        </div>
      )}

      {/* ========== 报名情况 ========== */}
      {activeTab === 'registrations' && (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <FaUsers className="text-cyan-400 text-xl" />
            <h3 className="text-xl font-bold">已报名选手 ({tournament.registrations?.length || 0} 人)</h3>
          </div>
          {(!tournament.registrations || tournament.registrations.length === 0) ? (
            <p className="text-gray-500 text-center py-10">暂无选手报名</p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {tournament.registrations.map((reg, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                  <img src={reg.userId?.avatarUrl || '/assets/logos.png'} alt="" className="w-10 h-10 rounded-full object-cover bg-black border border-white/10" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold">{reg.userId?.username || '未知'}</div>
                    <div className="text-xs text-gray-400 font-mono">UID: {reg.userId?.uid}</div>
                  </div>
                  <span className="text-xs text-gray-500">{new Date(reg.registeredAt).toLocaleString('zh-CN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========== 预选赛 ========== */}
      {activeTab === 'qualifier' && (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8 space-y-8">
          {/* 曲目设置 */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><FaMusic className="text-orange-400" /> 预选赛曲目</h3>
            {qualSongs.map((song, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 mb-3 flex flex-col md:flex-row gap-3 items-start">
                <input value={song.songName} onChange={e => { const s = [...qualSongs]; s[idx].songName = e.target.value; setQualSongs(s); }} className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm" placeholder="曲目名称" />
                <input value={song.difficulty || ''} onChange={e => { const s = [...qualSongs]; s[idx].difficulty = e.target.value; setQualSongs(s); }} className="w-32 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm" placeholder="难度" />
                <button onClick={() => setQualSongs(qualSongs.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 p-1"><FaTimes /></button>
              </div>
            ))}
            <div className="flex gap-3">
              <button onClick={() => setQualSongs([...qualSongs, { songName: '', difficulty: 'MASTER', level: 3, constant: 0, note: '' }])} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold flex items-center gap-2"><FaPlus /> 添加曲目</button>
              <button onClick={handleSaveQualSongs} className={btnClass}><FaSave /> 保存曲目</button>
            </div>
          </div>
          {/* 成绩录入 */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><FaTrophy className="text-yellow-400" /> 录入选手成绩</h3>
            <form onSubmit={handleSubmitScore} className="flex flex-col md:flex-row gap-3">
              <input type="number" value={scoreData.targetUid} onChange={e => setScoreData({...scoreData, targetUid: e.target.value})} className="bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white flex-1" placeholder="选手 UID" required />
              <input value={scoreData.songName} onChange={e => setScoreData({...scoreData, songName: e.target.value})} className="bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white flex-1" placeholder="曲目名称" required />
              <input type="number" step="0.0001" value={scoreData.achievement} onChange={e => setScoreData({...scoreData, achievement: e.target.value})} className="bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white w-40 font-mono" placeholder="达成率" required />
              <input type="number" value={scoreData.dxScore} onChange={e => setScoreData({...scoreData, dxScore: e.target.value})} className="bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white w-32 font-mono" placeholder="DX分" />
              <button type="submit" className={btnClass}>录入</button>
            </form>
          </div>
        </div>
      )}

      {/* ========== 分组 ========== */}
      {activeTab === 'groups' && (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8 space-y-5">
          <p className="text-gray-400 text-sm">设置选手分组。每个组输入组名和选手的 User ID（逗号分隔）。</p>
          {groups.map((g, idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-start">
              <input value={g.name} onChange={e => { const gs = [...groups]; gs[idx].name = e.target.value; setGroups(gs); }} className="w-40 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm" placeholder="组名 (如 A组)" />
              <input value={(g.players || []).join(',')} onChange={e => { const gs = [...groups]; gs[idx].players = e.target.value.split(',').map(s => s.trim()).filter(Boolean); setGroups(gs); }} className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm font-mono" placeholder="Player IDs (逗号分隔)" />
              <button onClick={() => setGroups(groups.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 p-1"><FaTimes /></button>
            </div>
          ))}
          <div className="flex gap-3">
            <button onClick={() => setGroups([...groups, { name: '', players: [] }])} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold flex items-center gap-2"><FaPlus /> 添加分组</button>
            <button onClick={handleSaveGroups} className={btnClass}><FaSave /> 保存分组</button>
          </div>
        </div>
      )}

      {/* ========== 正赛对局 ========== */}
      {activeTab === 'matches' && (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8 space-y-5">
          <p className="text-gray-400 text-sm">配置正赛对局。设置轮次、选手A/B的User ID。成绩在比赛进行中实时录入。</p>
          {matches.map((m, idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex flex-col md:flex-row gap-3">
                <input value={m.round || ''} onChange={e => { const ms = [...matches]; ms[idx].round = e.target.value; setMatches(ms); }} className="w-40 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm" placeholder="轮次" />
                <input value={m.playerA || ''} onChange={e => { const ms = [...matches]; ms[idx].playerA = e.target.value; setMatches(ms); }} className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm font-mono" placeholder="选手A (User ID)" />
                <span className="text-gray-500 self-center font-bold">VS</span>
                <input value={m.playerB || ''} onChange={e => { const ms = [...matches]; ms[idx].playerB = e.target.value; setMatches(ms); }} className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm font-mono" placeholder="选手B (User ID)" />
                <button onClick={() => setMatches(matches.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 p-1"><FaTimes /></button>
              </div>
              <div className="flex gap-3">
                <input type="number" value={m.scoreA || 0} onChange={e => { const ms = [...matches]; ms[idx].scoreA = Number(e.target.value); setMatches(ms); }} className="w-24 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm font-mono text-center" placeholder="比分A" />
                <span className="text-gray-500 self-center">:</span>
                <input type="number" value={m.scoreB || 0} onChange={e => { const ms = [...matches]; ms[idx].scoreB = Number(e.target.value); setMatches(ms); }} className="w-24 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm font-mono text-center" placeholder="比分B" />
                <select value={m.status || 'PENDING'} onChange={e => { const ms = [...matches]; ms[idx].status = e.target.value; setMatches(ms); }} className="bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm">
                  <option value="PENDING">未开始</option><option value="ONGOING">进行中</option><option value="FINISHED">已结束</option>
                </select>
              </div>
            </div>
          ))}
          <div className="flex gap-3">
            <button onClick={() => setMatches([...matches, { round: '', playerA: '', playerB: '', scoreA: 0, scoreB: 0, status: 'PENDING', songs: [] }])} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold flex items-center gap-2"><FaPlus /> 添加对局</button>
            <button onClick={handleSaveMatches} className={btnClass}><FaSave /> 保存对局</button>
          </div>
        </div>
      )}

      {/* ========== 结果公布 ========== */}
      {activeTab === 'results' && (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8 space-y-5">
          <p className="text-gray-400 text-sm">设置最终名次和比赛结果公告。</p>
          {results.map((r, idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-start">
              <input type="number" value={r.rank || ''} onChange={e => { const rs = [...results]; rs[idx].rank = Number(e.target.value); setResults(rs); }} className="w-24 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm text-center" placeholder="名次" />
              <input value={r.userId || ''} onChange={e => { const rs = [...results]; rs[idx].userId = e.target.value; setResults(rs); }} className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm font-mono" placeholder="User ID" />
              <input value={r.note || ''} onChange={e => { const rs = [...results]; rs[idx].note = e.target.value; setResults(rs); }} className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm" placeholder="备注" />
              <button onClick={() => setResults(results.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 p-1"><FaTimes /></button>
            </div>
          ))}
          <button onClick={() => setResults([...results, { rank: results.length + 1, userId: '', note: '' }])} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold flex items-center gap-2"><FaPlus /> 添加名次</button>
          <div className="mt-6">
            <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">结果公告内容</label>
            <textarea rows="6" value={resultAnnouncement} onChange={e => setResultAnnouncement(e.target.value)} className={inputClass + " resize-y font-mono text-sm"} placeholder="输入比赛结果公告..." />
          </div>
          <button onClick={handlePublishResults} className={btnClass}><FaCheckCircle /> 发布结果</button>
        </div>
      )}
    </div>
  );
};

export default TournamentManage;