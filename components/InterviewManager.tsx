import React, { useState, useEffect, useMemo } from 'react';
import { Candidate, InterviewRecord, CandidateStatus } from '../types';
import { api } from '../api/client';

const INTERVIEW_LIST_STATUSES = [CandidateStatus.PENDING_INTERVIEW, CandidateStatus.INTERVIEW];

type InterviewStatus = '待面试' | '进行中' | '已完成' | '已取消';

interface EnhancedInterview extends InterviewRecord {
  id?: string;
  candidateId: string;
  status?: InterviewStatus | string | null;
  method?: '视频' | '现场' | string | null;
  location?: string | null;
  ratings?: Record<string, number>;
  conclusion?: string | null;
  tags?: string[];
}

const EVALUATION_DIMENSIONS = [
  { id: 'skills', label: '专业技能' },
  { id: 'comm', label: '沟通能力' },
  { id: 'team', label: '团队合作' },
  { id: 'learning', label: '学习能力' },
  { id: 'adapt', label: '适应能力' },
];

const PRESET_TAGS = ['高潜力', '物业专家', '技术大牛', '沟通达人', '执行力强', '经验丰富'];

export const InterviewManager: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    api.candidates.list().then((data) => {
      const list = data.filter((c) => INTERVIEW_LIST_STATUSES.includes(c.currentStatus as CandidateStatus));
      setCandidates(list);
      if (list.length > 0) setSelectedCandidate(list[0]);
      else setSelectedCandidate(null);
    }).catch(console.error);
    // 加载启用的员工账号列表
    api.users.getEnabled().then(setEnabledUsers).catch(console.error);
  }, []);
  const [isScheduling, setIsScheduling] = useState(false);
  const [activeTab, setActiveTab] = useState<'record' | 'input'>('record');
  const [localConclusion, setLocalConclusion] = useState<string>('通过');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 发起面试（新建面试安排）表单状态
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleRound, setScheduleRound] = useState<number>(1);
  const [scheduleInterviewer, setScheduleInterviewer] = useState('');
  const [scheduleMethod, setScheduleMethod] = useState<'现场' | '视频'>('现场');
  const [scheduleLocation, setScheduleLocation] = useState('');
  const [scheduleRemarks, setScheduleRemarks] = useState('');
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [enabledUsers, setEnabledUsers] = useState<{ id: string; name: string; role: string; description: string }[]>([]);

  // 录入面试信息表单状态
  const [inputDate, setInputDate] = useState('');
  const [inputRound, setInputRound] = useState<number>(1);
  const [inputInterviewer, setInputInterviewer] = useState('');
  const [inputMethod, setInputMethod] = useState<'现场' | '视频'>('现场');
  const [inputLocation, setInputLocation] = useState('');
  const [inputRemarks, setInputRemarks] = useState('');
  const [detailedFeedback, setDetailedFeedback] = useState('');
  const [ratings, setRatings] = useState<Record<string, number>>({
    skills: 0, comm: 0, team: 0, learning: 0, adapt: 0
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');

  // 从 API 返回的 interviewHistory 构建展示列表
  const candidateInterviews = useMemo((): EnhancedInterview[] => {
    if (!selectedCandidate?.interviewHistory?.length) return [];
    return selectedCandidate.interviewHistory.map((i) => ({
      ...i,
      id: i.id,
      candidateId: selectedCandidate.id,
      status: (i.status as InterviewStatus) ?? '已完成',
      method: (i.method as '视频' | '现场') ?? '现场',
      location: i.location ?? undefined,
      ratings: i.ratings,
      conclusion: i.conclusion ?? undefined,
      tags: i.tags ?? [],
    }));
  }, [selectedCandidate?.id, selectedCandidate?.interviewHistory]);

  // 切换候选人时默认下一轮
  useEffect(() => {
    if (!selectedCandidate?.interviewHistory?.length) {
      setInputRound(1);
      setScheduleRound(1);
      return;
    }
    const maxRound = Math.max(...selectedCandidate.interviewHistory.map((i) => i.round));
    setInputRound(maxRound + 1);
    setScheduleRound(maxRound + 1);
  }, [selectedCandidate?.id, selectedCandidate?.interviewHistory]);

  const handleAddRound = () => {
    setIsScheduling(true);
  };

  const resetScheduleForm = () => {
    setScheduleDate('');
    setScheduleRound(candidateInterviews.length ? Math.max(...candidateInterviews.map((i) => i.round)) + 1 : 1);
    setScheduleInterviewer('');
    setScheduleMethod('现场');
    setScheduleLocation('');
    setScheduleRemarks('');
    setScheduleError(null);
  };

  const handleConfirmSchedule = async () => {
    if (!selectedCandidate) return;
    setScheduleLoading(true);
    setScheduleError(null);
    try {
      const timeStr = scheduleDate
        ? new Date(scheduleDate).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' }).replace(/\//g, '-')
        : '待定';
      await api.candidates.addInterview(selectedCandidate.id, {
        round: scheduleRound,
        time: timeStr,
        interviewer: scheduleInterviewer || '待指派',
        method: scheduleMethod,
        location: scheduleLocation || null,
        feedback: scheduleRemarks || '',
        recommendation: '待定',
        status: '待面试',
      });
      const updated = await api.candidates.get(selectedCandidate.id);
      setSelectedCandidate(updated);
      resetScheduleForm();
      setIsScheduling(false);
      setActiveTab('record');
    } catch (err) {
      setScheduleError((err as Error).message);
    } finally {
      setScheduleLoading(false);
    }
  };

  const resetInputForm = () => {
    setInputDate('');
    setInputRound(candidateInterviews.length ? Math.max(...candidateInterviews.map((i) => i.round)) + 1 : 1);
    setInputInterviewer('');
    setInputMethod('现场');
    setInputLocation('');
    setInputRemarks('');
    setDetailedFeedback('');
    setRatings({ skills: 0, comm: 0, team: 0, learning: 0, adapt: 0 });
    setSelectedTags([]);
    setLocalConclusion('通过');
    setSubmitError(null);
  };

  const handleSubmitInterview = async () => {
    if (!selectedCandidate) return;
    setSubmitLoading(true);
    setSubmitError(null);
    try {
      const timeStr = inputDate ? new Date(inputDate).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' }).replace(/\//g, '-') : '待定';
      const feedbackText = [inputRemarks, detailedFeedback].filter(Boolean).join('\n\n') || '（无详细反馈）';
      const payload = {
        round: inputRound,
        time: timeStr,
        interviewer: inputInterviewer || '待补充',
        method: inputMethod,
        location: inputLocation || null,
        feedback: feedbackText,
        recommendation: localConclusion === '通过' ? '推进' : '淘汰',
        conclusion: localConclusion,
        status: '已完成',
        ratings,
        tags: selectedTags,
      };
      await api.candidates.addInterview(selectedCandidate.id, payload);
      if (localConclusion === '淘汰') {
        await api.candidates.update(selectedCandidate.id, { currentStatus: '已淘汰' });
      }
      const list = await api.candidates.list();
      const filtered = list.filter((c) => INTERVIEW_LIST_STATUSES.includes(c.currentStatus as CandidateStatus));
      setCandidates(filtered);
      const updated = await api.candidates.get(selectedCandidate.id);
      setSelectedCandidate(updated);
      // 若当前候选人已淘汰且不在左侧列表，则选中第一个
      if (localConclusion === '淘汰' && !filtered.some((c) => c.id === selectedCandidate.id)) {
        setSelectedCandidate(filtered[0] ?? null);
      }
      resetInputForm();
      setActiveTab('record');
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const addCustomTag = () => {
    if (customTag && !selectedTags.includes(customTag)) {
      setSelectedTags([...selectedTags, customTag]);
      setCustomTag('');
    }
  };

  const StarRating = ({ value, onChange, readonly = false }: { value: number, onChange?: (v: number) => void, readonly?: boolean }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onChange?.(star)}
          className={`w-3.5 h-3.5 transition-all transform ${!readonly ? 'hover:scale-110 cursor-pointer' : 'cursor-default'} ${star <= value ? 'text-blue-500 fill-current' : 'text-slate-200'}`}
        >
          <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
    </div>
  );

  return (
    <div className="h-full flex flex-col space-y-6 max-w-7xl mx-auto">
      {/* Top Filter Area */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">快速检索</label>
            <input 
              type="text" 
              placeholder="搜索候选人、面试官、岗位..." 
              className="w-full text-xs bg-slate-50 border-none rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-blue-500/10 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">面试状态</label>
            <select className="w-full text-xs bg-slate-50 border-none rounded-xl py-2.5 px-3 outline-none">
              <option>全部状态</option>
              <option>待面试</option>
              <option>进行中</option>
              <option>已完成</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">面试轮次</label>
            <select className="w-full text-xs bg-slate-50 border-none rounded-xl py-2.5 px-3 outline-none">
              <option>全部轮次</option>
              <option>第一轮 初试</option>
              <option>第二轮 复试</option>
              <option>第三轮 终审</option>
            </select>
          </div>
          <div className="flex gap-3">
             <div className="flex-1 space-y-1">
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">时间区间</label>
               <input type="date" className="w-full text-xs bg-slate-50 border-none rounded-xl py-2.5 px-3 outline-none" />
             </div>
             <button className="bg-blue-600 text-white font-black text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all uppercase tracking-widest">
                应用筛选
             </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
        {/* Left: Candidate List（仅待面试、面试中） */}
        <div className="w-1/3 flex flex-col space-y-4 overflow-y-auto custom-scrollbar pr-2 pb-12">
          {candidates.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
              <p className="text-sm font-bold">暂无待面试或面试中的候选人</p>
              <p className="text-xs mt-2">请在简历库中将候选人状态设为「待面试」或「面试中」</p>
            </div>
          ) : (
          candidates.map(candidate => (
            <div 
              key={candidate.id}
              onClick={() => { setSelectedCandidate(candidate); setIsScheduling(false); setActiveTab('record'); }}
              className={`bg-white p-5 rounded-[1.5rem] border-2 cursor-pointer transition-all relative group shadow-sm ${selectedCandidate?.id === candidate.id ? 'border-blue-500 shadow-xl scale-[1.02]' : 'border-transparent hover:border-slate-200'}`}
            >
              <div className="flex gap-4 items-center">
                <img src={candidate.avatar} className="w-12 h-12 rounded-xl object-cover shadow-inner" alt="" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-slate-900 truncate tracking-tight">{candidate.name}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{candidate.appliedPosition} · {candidate.matchingScore}%</p>
                </div>
                <div className="text-right">
                   <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm ${
                     candidate.currentStatus === '面试中' ? 'bg-blue-50 text-blue-600' : 
                     candidate.currentStatus === 'Offer中' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                   }`}>
                     {candidate.currentStatus === 'Offer中' ? 'OFFER中' : candidate.currentStatus}
                   </span>
                </div>
              </div>
            </div>
          ))
          )}
        </div>

        {/* Right: Interview Details */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
          {selectedCandidate ? (
            <div className="flex flex-col h-full">
              {/* Profile Header Bar */}
              <div className="p-8 border-b border-slate-100 bg-white flex justify-between items-center">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-white rounded-2xl border border-slate-200 p-1 shadow-sm">
                    <img src={selectedCandidate.avatar} className="w-full h-full rounded-xl object-cover" alt="" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedCandidate.name}</h3>
                      <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">面试管理</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-bold mt-1">
                      应聘岗位：{selectedCandidate.appliedPosition} | <span className="text-blue-600 font-black">AI 匹配度：{selectedCandidate.matchingScore}%</span>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsScheduling(!isScheduling)}
                  className="bg-blue-600 text-white font-black text-xs px-8 py-3 rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all uppercase tracking-widest active:scale-95"
                >
                  {isScheduling ? '查看历史记录' : '发起面试'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
                {isScheduling ? (
                  <div className="max-w-3xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-3">
                       <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                       <h4 className="text-xl font-black text-slate-900 tracking-tight">新建面试安排</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">面试日期与时间</label>
                        <input
                          type="datetime-local"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10"
                        />
                      </div>
                      <div className="space-y-2 relative">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">面试轮次</label>
                        <select
                          value={scheduleRound}
                          onChange={(e) => setScheduleRound(Number(e.target.value))}
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 appearance-none"
                        >
                          <option value={1}>第一轮 初试</option>
                          <option value={2}>第二轮 复试</option>
                          <option value={3}>第三轮 终审</option>
                        </select>
                        <p className="absolute -bottom-6 left-0 text-[10px] font-bold text-slate-300 italic">不限定轮次，可随时发起面试</p>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">面试官</label>
                        <select
                          value={scheduleInterviewer}
                          onChange={(e) => setScheduleInterviewer(e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10"
                        >
                          <option value="">请选择面试官</option>
                          {enabledUsers.map((user) => (
                            <option key={user.id} value={user.name}>
                              {user.name} {user.description ? `(${user.description})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">面试方式</label>
                        <select
                          value={scheduleMethod}
                          onChange={(e) => setScheduleMethod(e.target.value as '现场' | '视频')}
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10"
                        >
                          <option value="现场">现场面试</option>
                          <option value="视频">视频面试</option>
                        </select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">面试地点 / 链接</label>
                        <input
                          type="text"
                          value={scheduleLocation}
                          onChange={(e) => setScheduleLocation(e.target.value)}
                          placeholder="会议室名称或视频会议链接"
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">备注说明</label>
                        <textarea
                          rows={4}
                          value={scheduleRemarks}
                          onChange={(e) => setScheduleRemarks(e.target.value)}
                          placeholder="备注说明..."
                          className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
                        />
                      </div>
                    </div>
                    {scheduleError && (
                      <p className="text-red-600 text-sm font-bold">{scheduleError}</p>
                    )}
                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        disabled={scheduleLoading}
                        onClick={handleConfirmSchedule}
                        className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-2xl shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-1 transition-all active:scale-95 uppercase tracking-widest disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {scheduleLoading ? '提交中...' : '确认安排面试'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    {/* Tab Navigation */}
                    <div className="flex gap-12 border-b border-slate-100 mb-8">
                       <button 
                        onClick={() => setActiveTab('record')}
                        className={`pb-4 text-[13px] font-black uppercase tracking-widest relative transition-all ${activeTab === 'record' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}
                       >
                         面试记录
                       </button>
                       <button 
                        onClick={() => setActiveTab('input')}
                        className={`pb-4 text-[13px] font-black uppercase tracking-widest relative transition-all ${activeTab === 'input' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}
                       >
                         录入面试信息
                       </button>
                    </div>

                    {activeTab === 'record' ? (
                      <div className="space-y-8 animate-in fade-in duration-300">
                        {candidateInterviews.length > 0 ? (
                          candidateInterviews.map((int) => (
                            <div key={int.id ?? `round-${int.round}-${int.time}`} className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                              <div className="flex justify-between items-center mb-10">
                                <div className="flex items-center gap-4">
                                  <span className="bg-slate-200 px-5 py-1.5 rounded-xl text-[11px] font-black uppercase text-slate-700 tracking-[0.15em]">
                                    ROUND {int.round}
                                  </span>
                                </div>
                                <span className="text-base font-black text-slate-900 tracking-tight">{int.time}</span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-10 mb-10 px-2">
                                <div>
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">面试官</p>
                                   <p className="text-base font-black text-slate-800">{int.interviewer}</p>
                                </div>
                                <div>
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">面试方式</p>
                                   <p className="text-base font-black text-slate-800">{int.method} {int.location ? `· ${int.location}` : ''}</p>
                                </div>
                              </div>

                              {/* Evaluation Results & Conclusion Row */}
                              {int.status === '已完成' && (
                                <div className="px-2 mb-10 animate-in slide-in-from-top-2 duration-500">
                                   <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                      {/* Left: Ratings */}
                                      <div className="lg:col-span-7 space-y-4">
                                         <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">评估得分</h6>
                                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8">
                                            {EVALUATION_DIMENSIONS.map(dim => (
                                              <div key={dim.id} className="flex justify-between items-center bg-white/60 px-4 py-2.5 rounded-xl shadow-sm border border-slate-100/50">
                                                <span className="text-[10px] font-bold text-slate-600">{dim.label}</span>
                                                <StarRating value={int.ratings?.[dim.id] || 0} readonly />
                                              </div>
                                            ))}
                                         </div>
                                      </div>
                                      {/* Right: Conclusion Box */}
                                      <div className="lg:col-span-5 flex flex-col justify-end">
                                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">面试结论</p>
                                         <div className={`p-6 rounded-[2rem] border-2 flex items-center justify-center gap-4 shadow-xl ${int.conclusion === '通过' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${int.conclusion === '通过' ? 'bg-green-600' : 'bg-red-600'} text-white shadow-lg`}>
                                               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                 {int.conclusion === '通过' 
                                                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
                                                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M6 18L18 6M6 6l12 12" />
                                                 }
                                               </svg>
                                            </div>
                                            <span className="text-xl font-black uppercase tracking-[0.2em] italic">{int.conclusion}</span>
                                         </div>
                                      </div>
                                   </div>
                                </div>
                              )}

                              {/* Talent Tags Display Area */}
                              {int.tags && int.tags.length > 0 && (
                                <div className="px-2 mb-8">
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">人才标签</p>
                                   <div className="flex flex-wrap gap-3">
                                      {int.tags.map(tag => (
                                        <span key={tag} className="bg-white border border-blue-100 text-blue-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                                          {tag}
                                        </span>
                                      ))}
                                   </div>
                                </div>
                              )}

                              <div className="px-2">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">反馈记录</p>
                                <div className="bg-white border border-slate-100 rounded-2xl p-8 min-h-[120px] flex flex-col justify-center shadow-inner">
                                  <p className="text-sm text-slate-600 font-medium italic leading-relaxed">
                                    “{int.feedback || '暂无面试反馈记录，请在面试结束后录入。'}”
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-20">
                             <p className="text-xl font-black uppercase tracking-widest text-slate-200">暂无面试历史</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-10 animate-in fade-in duration-300 pb-12">
                        {/* 0. 面试基本信息 */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                            <h5 className="text-[14px] font-black text-slate-900 tracking-tight">面试基本信息</h5>
                          </div>
                          <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">面试日期与时间</label>
                                <input
                                  type="datetime-local"
                                  value={inputDate}
                                  onChange={(e) => setInputDate(e.target.value)}
                                  className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">面试轮次</label>
                                <select
                                  value={inputRound}
                                  onChange={(e) => setInputRound(Number(e.target.value))}
                                  className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10"
                                >
                                  <option value={1}>第一轮 初试</option>
                                  <option value={2}>第二轮 复试</option>
                                  <option value={3}>第三轮 终审</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">面试官</label>
                                <select
                                  value={inputInterviewer}
                                  onChange={(e) => setInputInterviewer(e.target.value)}
                                  className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10"
                                >
                                  <option value="">请选择面试官</option>
                                  {enabledUsers.map((user) => (
                                    <option key={user.id} value={user.name}>
                                      {user.name} {user.description ? `(${user.description})` : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">面试方式</label>
                                <select
                                  value={inputMethod}
                                  onChange={(e) => setInputMethod(e.target.value as '现场' | '视频')}
                                  className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10"
                                >
                                  <option value="现场">现场面试</option>
                                  <option value="视频">视频面试</option>
                                </select>
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">面试地点 / 链接</label>
                                <input
                                  type="text"
                                  value={inputLocation}
                                  onChange={(e) => setInputLocation(e.target.value)}
                                  placeholder="会议室名称或视频会议链接"
                                  className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10"
                                />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">备注说明</label>
                                <textarea
                                  rows={2}
                                  value={inputRemarks}
                                  onChange={(e) => setInputRemarks(e.target.value)}
                                  placeholder="备注说明..."
                                  className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 1. 评估维度 */}
                        <div className="space-y-6">
                           <div className="flex items-center gap-3 mb-4">
                              <svg className="w-5 h-5 text-slate-800 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                              <h5 className="text-[14px] font-black text-slate-900 tracking-tight">评估维度</h5>
                           </div>
                           <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 p-8 space-y-4">
                              {EVALUATION_DIMENSIONS.map(dim => (
                                <div key={dim.id} className="bg-white p-6 rounded-2xl flex justify-between items-center shadow-sm border border-slate-50">
                                   <span className="text-sm font-black text-slate-700">{dim.label}</span>
                                   <StarRating 
                                      value={ratings[dim.id]} 
                                      onChange={(v) => setRatings({...ratings, [dim.id]: v})} 
                                   />
                                </div>
                              ))}
                           </div>
                        </div>

                        {/* 2. 人才标签录入 */}
                        <div className="space-y-4">
                           <div className="flex items-center gap-3">
                              <svg className="w-5 h-5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
                              <h5 className="text-[14px] font-black text-slate-900 tracking-tight">人才标签</h5>
                           </div>
                           <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 p-8 space-y-8">
                              <div className="flex flex-wrap gap-3">
                                 {PRESET_TAGS.map(tag => (
                                    <button
                                      key={tag}
                                      onClick={() => toggleTag(tag)}
                                      className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border-2 transition-all ${selectedTags.includes(tag) ? 'bg-blue-600 text-white border-blue-600 shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                                    >
                                      {tag}
                                    </button>
                                 ))}
                              </div>
                              <div className="flex gap-3">
                                 <input 
                                    type="text" 
                                    value={customTag}
                                    onChange={(e) => setCustomTag(e.target.value)}
                                    placeholder="输入自定义标签，回车添加"
                                    onKeyDown={(e) => e.key === 'Enter' && addCustomTag()}
                                    className="flex-1 bg-white border border-slate-200 rounded-xl px-5 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10 shadow-sm"
                                 />
                                 <button 
                                    onClick={addCustomTag}
                                    className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[11px] font-black uppercase shadow-lg active:scale-95 transition-all"
                                 >
                                    添加
                                 </button>
                              </div>
                           </div>
                        </div>

                        {/* 3. 录入面试评价 - Text Area */}
                        <div className="space-y-4">
                           <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">详细评价录入</h5>
                           <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col min-h-[450px]">
                             <textarea 
                              rows={12} 
                              value={detailedFeedback}
                              onChange={(e) => setDetailedFeedback(e.target.value)}
                              placeholder="在此录入候选人的面试评价、综合表现及反馈记录..." 
                              className="w-full flex-1 bg-white border-none rounded-2xl p-8 text-sm outline-none focus:ring-2 focus:ring-blue-500/10 leading-relaxed shadow-inner resize-none mb-8"
                             />
                             
                             {/* 面试结论选择项 */}
                             <div className="flex flex-col gap-5 border-t border-slate-100 pt-8">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">面试结论</label>
                                <div className="flex flex-wrap gap-5">
                                   {['通过', '淘汰'].map(opt => (
                                      <button 
                                        key={opt}
                                        onClick={() => setLocalConclusion(opt)}
                                        className={`px-12 py-3 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all border-2 ${
                                           localConclusion === opt 
                                           ? 'bg-blue-600 text-white border-blue-600 shadow-2xl shadow-blue-500/30' 
                                           : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                                        }`}
                                      >
                                        {opt}
                                      </button>
                                   ))}
                                </div>
                             </div>

                             {submitError && (
                               <p className="text-red-600 text-sm font-bold mt-4">{submitError}</p>
                             )}
                             <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-10 pt-8 border-t-2 border-slate-100 bg-slate-50/50 -mx-8 -mb-8 px-8 pb-8 rounded-b-[2rem]">
                                <p className="text-[11px] text-slate-500 font-bold">提交后将同步至面试记录，若结论为「淘汰」将更新候选人状态。</p>
                                <button
                                  disabled={submitLoading}
                                  onClick={handleSubmitInterview}
                                  className="bg-blue-600 text-white px-14 py-4 rounded-2xl font-black text-[13px] uppercase tracking-widest shadow-2xl shadow-blue-500/40 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                                >
                                  {submitLoading ? '提交中...' : '录入并同步反馈'}
                                </button>
                             </div>
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 italic p-12 text-center bg-slate-50/20">
              <svg className="w-24 h-24 mb-6 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              <p className="text-xl font-black uppercase tracking-widest text-slate-200">请选择左侧候选人管理面试流程</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
