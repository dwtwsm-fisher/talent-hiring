
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Candidate, CandidateStatus } from '../types';
import { api } from '../api/client';
import type { JD } from '../types';
import { useDictConfig } from '../hooks/useDictConfig';

type DetailTab = 'resume' | 'assessment' | 'interview' | 'background' | 'offer';

const POSITION_TYPES = ['物业经理', '电梯维修工', '客服主管', '水电维修工', '安保主管', '项目经理'];

export const ResumePool: React.FC = () => {
  const { educationLevels, workYears, resumeTags } = useDictConfig();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [filters, setFilters] = useState({ search: '', positionType: '', company: '', region: '', workYears: '', education: '', status: '' });
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [jds, setJds] = useState<JD[]>([]);
  const [editingTags, setEditingTags] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [aiExtracting, setAiExtracting] = useState(false);
  const [aiSuggestedTags, setAiSuggestedTags] = useState<string[]>([]);
  const [editingRecommended, setEditingRecommended] = useState(false);
  const [selectedJdIds, setSelectedJdIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchCandidates = useCallback((params?: { search?: string; positionType?: string; company?: string; region?: string; workYears?: string; education?: string; status?: string }) => {
    setLoading(true);
    api.candidates.list(params).then((data) => {
      setCandidates(data);
      setSelectedCandidate(prev => {
        if (data.length === 0) return null;
        if (!prev || !data.find(c => c.id === prev.id)) return data[0];
        return prev;
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { api.dict.companies().then(setCompanies).catch(console.error); api.dict.locations().then(setLocations).catch(console.error); api.jds.list().then(setJds).catch(console.error); }, []);
  useEffect(() => { setEditingTags(false); setEditingRecommended(false); setNewTag(''); setAiSuggestedTags([]); setSelectedJdIds((selectedCandidate?.recommendedJds || []).map(r => r.jdId)); }, [selectedCandidate?.id]);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      const params: Record<string, string> = {};
      if (filters.search) params.search = filters.search;
      if (filters.positionType) params.positionType = filters.positionType;
      if (filters.company) params.company = filters.company;
      if (filters.region) params.region = filters.region;
      if (filters.workYears) params.workYears = filters.workYears;
      if (filters.education) params.education = filters.education;
      if (filters.status) params.status = filters.status;
      fetchCandidates(Object.keys(params).length ? params : undefined);
    }, filters.search ? 300 : 0);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [filters]);

  const [activeTab, setActiveTab] = useState<DetailTab>('resume');

  const handleUpdateCandidate = async (updates: Partial<Candidate>) => {
    if (!selectedCandidate) return;
    setSaving(true);
    try {
      await api.candidates.update(selectedCandidate.id, updates);
      setCandidates(prev => prev.map(c => c.id === selectedCandidate.id ? { ...c, ...updates } : c));
      setSelectedCandidate(prev => prev && prev.id === selectedCandidate.id ? { ...prev, ...updates } : prev);
    } catch (e) { console.error(e); alert('保存失败'); }
    setSaving(false);
  };

  const getFetchParams = useCallback(() => {
    const params: Record<string, string> = {};
    if (filters.search) params.search = filters.search;
    if (filters.positionType) params.positionType = filters.positionType;
    if (filters.company) params.company = filters.company;
    if (filters.region) params.region = filters.region;
    if (filters.workYears) params.workYears = filters.workYears;
    if (filters.education) params.education = filters.education;
    if (filters.status) params.status = filters.status;
    return Object.keys(params).length ? params : undefined;
  }, [filters]);

  const handleSetStatus = async (c: Candidate, newStatus: string) => {
    setSaving(true);
    try {
      await api.candidates.update(c.id, { currentStatus: newStatus } as Record<string, unknown>);
      const updated = await api.candidates.get(c.id) as Candidate;
      setCandidates(prev => prev.map(x => x.id === c.id ? { ...x, ...updated } : x));
      setSelectedCandidate(prev => prev?.id === c.id ? { ...prev, ...updated } : prev);
      if (newStatus === CandidateStatus.REJECTED) {
        fetchCandidates(getFetchParams());
      }
    } catch (e) {
      console.error(e);
      alert('操作失败');
    }
    setSaving(false);
  };

  const handleMarkEliminated = async (c: Candidate) => {
    if (!confirm('确定标记为淘汰？将添加面试淘汰记录。')) return;
    setSaving(true);
    try {
      const maxRound = Math.max(0, ...(c.interviewHistory || []).map((i) => i.round));
      await api.candidates.addInterview(c.id, {
        round: maxRound + 1,
        time: new Date().toISOString().slice(0, 16).replace('T', ' '),
        interviewer: '系统',
        feedback: '标记淘汰',
        recommendation: '淘汰',
      });
      await api.candidates.update(c.id, { currentStatus: CandidateStatus.REJECTED } as Record<string, unknown>);
      const updated = await api.candidates.get(c.id) as Candidate;
      setCandidates(prev => prev.map(x => x.id === c.id ? { ...x, ...updated } : x));
      setSelectedCandidate(prev => prev?.id === c.id ? { ...prev, ...updated } : prev);
      fetchCandidates(getFetchParams());
    } catch (e) {
      console.error(e);
      alert('操作失败');
    }
    setSaving(false);
  };

  const handleRescueCandidate = async (c: Candidate) => {
    if (!confirm('确定捞回该候选人？状态将恢复为新简历，可继续发起面试等操作。')) return;
    setSaving(true);
    try {
      await api.candidates.update(c.id, { currentStatus: CandidateStatus.NEW } as Record<string, unknown>);
      const updated = await api.candidates.get(c.id) as Candidate;
      setCandidates(prev => prev.map(x => x.id === c.id ? { ...x, ...updated } : x));
      setSelectedCandidate(prev => prev?.id === c.id ? { ...prev, ...updated } : prev);
      fetchCandidates(getFetchParams());
    } catch (e) {
      console.error(e);
      alert('捞回失败');
    }
    setSaving(false);
  };

  const handleAddTag = (tag?: string) => {
    const t = (tag || newTag).trim();
    if (!t || !selectedCandidate) return;
    const current = selectedCandidate.tags || [];
    if (current.includes(t)) return;
    handleUpdateCandidate({ tags: [...current, t] });
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    if (!selectedCandidate) return;
    handleUpdateCandidate({ tags: (selectedCandidate.tags || []).filter(t => t !== tag) });
  };

  const handleAiExtractTags = async () => {
    if (!selectedCandidate) return;
    setAiExtracting(true);
    setAiSuggestedTags([]);
    try {
      const mergedForExtract = [...(selectedCandidate.tags || []), ...(selectedCandidate.skills || []).filter(s => !(selectedCandidate.tags || []).includes(s))];
      const { tags } = await api.ai.extractTags({
        skills: mergedForExtract,
        experiences: selectedCandidate.experience,
        educations: selectedCandidate.education,
        aiSummary: selectedCandidate.aiSummary,
        appliedPosition: selectedCandidate.appliedPosition,
      });
      const current = selectedCandidate.tags || [];
      setAiSuggestedTags(tags.filter((t) => !current.includes(t)));
    } catch (e) {
      console.error(e);
      setAiSuggestedTags([]);
    }
    setAiExtracting(false);
  };

  const handleAddAiTag = (tag: string) => {
    handleAddTag(tag);
    setAiSuggestedTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleAddAllAiTags = () => {
    if (!selectedCandidate) return;
    const current = selectedCandidate.tags || [];
    const merged = [...new Set([...current, ...aiSuggestedTags])];
    handleUpdateCandidate({ tags: merged });
    setAiSuggestedTags([]);
  };

  const handleOpenRecommendedEdit = () => {
    setSelectedJdIds((selectedCandidate?.recommendedJds || []).map(r => r.jdId));
    setEditingRecommended(true);
  };

  const handleSaveRecommendedJds = async () => {
    if (!selectedCandidate) return;
    setSaving(true);
    try {
      await api.candidates.update(selectedCandidate.id, { recommendedJdIds: selectedJdIds } as Record<string, unknown>);
      const updated = await api.candidates.get(selectedCandidate.id) as Candidate;
      setCandidates(prev => prev.map(c => c.id === selectedCandidate.id ? { ...c, ...updated } : c));
      setSelectedCandidate(prev => prev && prev.id === selectedCandidate.id ? { ...prev, ...updated } : prev);
    } catch (e) { console.error(e); alert('保存失败'); }
    setSaving(false);
    setEditingRecommended(false);
  };

  const renderTabContent = () => {
    if (!selectedCandidate) return null;
    switch (activeTab) {
      case 'resume': {
        const topEdu = selectedCandidate.education?.[0];
        const expList = selectedCandidate.experience || [];
        const isPlaceholder = (v: string) => !v || v.trim() === '待补充';
        return (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* 基本信息（新简历格式：姓名、年龄、性别、电话、邮箱、期望岗位、来源） */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-3">基本信息</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold">姓名</span>
                  <span className="font-bold text-slate-900">{selectedCandidate.name || '—'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold">年龄</span>
                  <span className="font-bold text-slate-900">{selectedCandidate.age != null ? `${selectedCandidate.age}岁` : '—'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold">性别</span>
                  <span className="font-bold text-slate-900">{selectedCandidate.gender || '—'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold">电话</span>
                  <span className={isPlaceholder(selectedCandidate.phone) ? 'text-slate-400 italic' : 'font-bold text-slate-900'}>{selectedCandidate.phone || '待补充'}</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  <span className="text-slate-400 font-bold">邮箱</span>
                  <span className={isPlaceholder(selectedCandidate.email) ? 'text-slate-400 italic' : 'font-bold text-slate-900'}>{selectedCandidate.email || '待补充'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold">期望岗位</span>
                  <span className="font-bold text-blue-600">{selectedCandidate.appliedPosition || '—'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold">来源</span>
                  <span className="font-bold text-slate-900">{selectedCandidate.source || '—'}</span>
                </div>
                {(selectedCandidate.city ?? selectedCandidate.workYears ?? selectedCandidate.expectedSalary ?? selectedCandidate.jobStatusDesc) && (
                  <>
                    {selectedCandidate.city && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-bold">所在城市</span>
                        <span className="font-bold text-slate-900">{selectedCandidate.city}</span>
                      </div>
                    )}
                    {selectedCandidate.workYears && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-bold">工作年限</span>
                        <span className="font-bold text-slate-900">{selectedCandidate.workYears}</span>
                      </div>
                    )}
                    {selectedCandidate.expectedSalary && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-bold">期望薪资</span>
                        <span className="font-bold text-emerald-600">{selectedCandidate.expectedSalary}</span>
                      </div>
                    )}
                    {selectedCandidate.jobStatusDesc && (
                      <div className="flex items-center gap-1.5 col-span-2">
                        <span className="text-slate-400 font-bold">求职状态</span>
                        <span className="font-bold text-slate-900">{selectedCandidate.jobStatusDesc}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            {/* 最高教育背景 */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">最高教育背景</p>
              {topEdu ? (
                <>
                  <p className="font-bold text-slate-900">{topEdu.school} · {topEdu.major}（{topEdu.degree}）</p>
                  {topEdu.duration && <p className="text-[10px] text-slate-400 mt-1">{topEdu.duration}</p>}
                </>
              ) : (
                <p className="text-slate-400 text-xs">暂无</p>
              )}
            </div>
            {/* 职业轨迹（与 Boss 等示例数据一致：公司、职位、时间段；详情可为空） */}
            <div className="space-y-3">
              <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-l-4 border-blue-600 pl-3">职业轨迹</h5>
              {expList.length > 0 ? (
                <div className="space-y-4 relative pl-2">
                  {expList.map((exp, i) => (
                    <div key={i} className="relative pl-6 border-l-2 border-slate-200 ml-0.5">
                      <div className="absolute -left-[9px] top-2 w-2.5 h-2.5 bg-white border-2 border-blue-600 rounded-full"></div>
                      <div className="flex flex-wrap justify-between items-start gap-2 mb-0.5">
                        <p className="font-bold text-slate-800 text-sm">{exp.company}</p>
                        <span className="text-[10px] text-slate-400 font-bold shrink-0">{exp.duration || '—'}</span>
                      </div>
                      <p className="text-xs font-bold text-blue-600 mb-1">{exp.role}</p>
                      {exp.details && <p className="text-xs text-slate-500 leading-relaxed">{exp.details}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-xs py-2">暂无工作经历</p>
              )}
            </div>
          </div>
        );
      }
      case 'assessment':
        return (
          <div className="space-y-4 animate-in fade-in duration-300">
            {selectedCandidate.assessmentHistory.length > 0 ? (
              selectedCandidate.assessmentHistory.map(a => (
                <div key={a.id} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900">{a.type}</span>
                      <span className="bg-green-50 text-green-600 text-[10px] font-black px-2 py-0.5 rounded uppercase">{a.status}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">{a.date} · 结果已分析</p>
                  </div>
                  <p className="text-2xl font-black text-blue-600 italic">{a.score}<span className="text-[10px] font-bold text-slate-300 ml-1">分</span></p>
                </div>
              ))
            ) : <p className="text-center py-10 text-slate-300 italic text-sm">暂无测评记录</p>}
          </div>
        );
      case 'interview':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            {selectedCandidate.interviewHistory.map((h, i) => (
              <div key={i} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="flex justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-lg flex items-center justify-center text-[10px] font-black">{h.round}</span>
                    <p className="text-sm font-bold text-slate-900">第 {h.round} 轮反馈</p>
                  </div>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${h.recommendation === '推进' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {h.recommendation}
                  </span>
                </div>
                <p className="text-xs text-slate-600 italic leading-relaxed">“{h.feedback}”</p>
                <p className="text-[9px] text-slate-400 font-bold mt-3 uppercase tracking-widest">面试官: {h.interviewer} · {h.time}</p>
              </div>
            ))}
          </div>
        );
      case 'background':
        return (
          <div className="animate-in fade-in duration-300">
            {selectedCandidate.backgroundCheck ? (
              <div className="bg-white border border-slate-100 p-8 rounded-3xl shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.9L10 1.55l7.834 3.35a1 1 0 01.666.92v3.374c0 6.1-3.907 11.214-9.5 12.806-5.593-1.592-9.5-6.705-9.5-12.806V5.82a1 1 0 01.666-.92zM10 12.1a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/></svg>
                  </div>
                  <div>
                    <p className="text-base font-black text-slate-900">{selectedCandidate.backgroundCheck.agency}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">状态: {selectedCandidate.backgroundCheck.status}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black italic text-green-600 uppercase tracking-tighter">{selectedCandidate.backgroundCheck.conclusion}</p>
                  <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">最终结论</p>
                </div>
              </div>
            ) : <p className="text-center py-10 text-slate-300 italic text-sm">暂无背调记录</p>}
          </div>
        );
      case 'offer':
        return (
          <div className="animate-in fade-in duration-300">
            {selectedCandidate.offerInfo ? (
              <div className="bg-blue-50/30 border border-blue-100 p-8 rounded-3xl space-y-6">
                <div className="flex justify-between items-center border-b border-blue-50 pb-4">
                  <h5 className="text-base font-black text-slate-900">录用意向确认</h5>
                  <span className="bg-blue-600 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest">{selectedCandidate.offerInfo.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">薪资包</p>
                    <p className="text-xs font-bold text-slate-700 leading-relaxed">{selectedCandidate.offerInfo.salaryStructure}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">预期入职日期</p>
                    <p className="text-xs font-black text-slate-900">{selectedCandidate.offerInfo.expectedJoinDate}</p>
                  </div>
                </div>
              </div>
            ) : <p className="text-center py-10 text-slate-300 italic text-sm">尚未进入 Offer 流程</p>}
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* 顶部智能筛选 */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-widest">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
            智能筛选中心
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="全局模糊搜索 (姓名、标签、ID...)"
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full text-xs border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500/10"
            />
          </div>
          <select value={filters.positionType} onChange={e => setFilters(f => ({ ...f, positionType: e.target.value }))} className="text-xs border-slate-200 rounded-xl py-2 px-3 outline-none">
            <option value="">岗位类型</option>
            {POSITION_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filters.company} onChange={e => setFilters(f => ({ ...f, company: e.target.value }))} className="text-xs border-slate-200 rounded-xl py-2 px-3 outline-none">
            <option value="">所属公司</option>
            {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <select value={filters.region} onChange={e => setFilters(f => ({ ...f, region: e.target.value }))} className="text-xs border-slate-200 rounded-xl py-2 px-3 outline-none">
            <option value="">所属地域</option>
            {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
          </select>
          <select value={filters.workYears} onChange={e => setFilters(f => ({ ...f, workYears: e.target.value }))} className="text-xs border-slate-200 rounded-xl py-2 px-3 outline-none">
            <option value="">工作年限</option>
            {workYears.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
          <select value={filters.education} onChange={ev => setFilters(f => ({ ...f, education: ev.target.value }))} className="text-xs border-slate-200 rounded-xl py-2 px-3 outline-none">
            <option value="">学历要求</option>
            {educationLevels.map(ed => <option key={ed} value={ed}>{ed}</option>)}
          </select>
          <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="text-xs border-slate-200 rounded-xl py-2 px-3 outline-none">
            <option value="">简历状态（默认不含淘汰）</option>
            {Object.values(CandidateStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0 relative">
        {/* 左侧人才列表 */}
        <div className={`w-full lg:w-[460px] flex-shrink-0 overflow-y-auto custom-scrollbar space-y-4 pr-1 ${selectedCandidate ? 'hidden lg:block' : ''}`}>
          {loading ? <p className="p-5 text-slate-400 text-sm">加载中...</p> : candidates.map(candidate => (
            <div 
              key={candidate.id} 
              onClick={() => setSelectedCandidate(candidate)}
              className={`bg-white p-4 rounded-[1.5rem] border-2 transition-all cursor-pointer relative group ${selectedCandidate?.id === candidate.id ? 'border-blue-500 shadow-xl' : 'border-transparent hover:border-slate-200 shadow-sm'}`}
            >
              <div className="flex items-start gap-4 mb-2">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-white font-black text-xl overflow-hidden shadow-inner flex-shrink-0">
                  {candidate.avatar ? <img src={candidate.avatar} className="w-full h-full object-cover" /> : <span>{candidate.name.charAt(0)}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-black text-slate-900 text-lg truncate tracking-tight">{candidate.name}</h4>
                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border border-blue-100/50">AI匹配: {candidate.matchingScore}%</span>
                  </div>
                  <p className="text-slate-600 text-xs font-black">{candidate.appliedPosition} | 5年经验 | 本科</p>
                  <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-tight">
                    {candidate.age}岁 · {candidate.gender} · {candidate.phone}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{candidate.source || 'BOSS直聘'}</p>
                   <span className="bg-red-50 text-red-500 px-2 py-0.5 rounded text-[9px] font-black border border-red-100/50">紧急</span>
                   <div className="mt-2 text-2xl font-black text-blue-600 italic opacity-20 group-hover:opacity-100 transition-opacity">
                    {candidate.matchingScore}
                   </div>
                </div>
              </div>

              {/* AI优先推荐 - 与卡片已有信息左右对齐 */}
              <div className="w-full bg-blue-50/60 p-2.5 rounded-lg border border-blue-100/50 mb-2">
                <p className="text-xs text-blue-700 font-bold flex items-start gap-1.5 leading-snug">
                  <span className="text-blue-600 font-black flex-shrink-0 uppercase">AI优先推荐:</span>
                  <span className="text-slate-700 font-medium text-xs min-w-0">{candidate.matchingReason || '技能完全匹配JD，拥有10年以上大型社区管理背景，危机处理能力出色。'}</span>
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {candidate.wasEliminated && <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-[9px] font-black border border-red-200">曾淘汰</span>}
                {(candidate.hadOffer || candidate.isRehiredExEmployee) && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-black border border-emerald-200">曾入职</span>}
              </div>

              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">
                    {candidate.currentStatus}
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">推荐岗位:</span>
                    {(candidate.recommendedJds?.length ? candidate.recommendedJds : [{ jdId: '', title: candidate.appliedPosition }]).map(r => (
                      <span key={r.jdId || r.title} className="text-[10px] font-bold text-blue-600 underline cursor-pointer decoration-blue-200 hover:text-blue-700">{r.title}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 标签/技能区 - 统一展示（合并原技能图谱与简历标签） */}
              {(() => {
                const items = [...(candidate.tags || []), ...(candidate.skills || []).filter(s => !(candidate.tags || []).includes(s))];
                return items.length > 0 ? (
                <div className="flex flex-wrap gap-1 items-center mb-2 py-1">
                  {items.map((tag, i) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center px-2 py-0.5 rounded-md font-medium border text-[9px] leading-tight ${
                        i % 4 === 0 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        i % 4 === 1 ? 'bg-slate-100 text-slate-700 border-slate-200' :
                        i % 4 === 2 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null;
              })()}

              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-50">
                {candidate.currentStatus === CandidateStatus.REJECTED ? (
                  <button onClick={e => { e.stopPropagation(); handleRescueCandidate(candidate); }} disabled={saving} className="bg-emerald-600 text-white px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50">捞回</button>
                ) : (
                  <button onClick={e => { e.stopPropagation(); handleMarkEliminated(candidate); }} disabled={saving} className="bg-slate-900 text-white px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-md disabled:opacity-50">淘汰</button>
                )}
                <button onClick={e => { e.stopPropagation(); handleSetStatus(candidate, CandidateStatus.PENDING_INTERVIEW); }} disabled={saving} className="bg-white border-2 border-blue-600 text-blue-600 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all disabled:opacity-50">发起面试</button>
                <button onClick={e => { e.stopPropagation(); handleSetStatus(candidate, CandidateStatus.PENDING_ASSESSMENT); }} disabled={saving} className="bg-white border-2 border-blue-600 text-blue-600 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all disabled:opacity-50">发起测评</button>
                <button onClick={e => { e.stopPropagation(); handleSetStatus(candidate, CandidateStatus.BACKGROUND_CHECK); }} disabled={saving} className="bg-white border-2 border-blue-600 text-blue-600 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all disabled:opacity-50">发起背调</button>
                <button onClick={e => { e.stopPropagation(); handleSetStatus(candidate, CandidateStatus.PENDING_OFFER); }} disabled={saving} className="bg-white border-2 border-blue-600 text-blue-600 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all disabled:opacity-50">发起 OFFER</button>
              </div>
            </div>
          ))}
        </div>

        {/* 右侧详情面板 */}
        {selectedCandidate ? (
          <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col min-h-0 animate-in slide-in-from-right-4 duration-500 relative">
            
            {/* 紧凑型页眉 */}
            <div className="flex-shrink-0 px-5 py-3 bg-white/95 backdrop-blur-md border-b border-slate-100 flex justify-between items-center z-30 sticky top-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-900 font-black text-lg tracking-tighter shadow-md ring-2 ring-slate-50 uppercase border border-slate-100">
                  {selectedCandidate.name.charAt(0)}
                </div>
                <div>
                   <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">{selectedCandidate.name}</h3>
                      <span className="bg-indigo-50 text-indigo-600 text-[9px] font-black px-2 py-0.5 rounded-full border border-indigo-100 uppercase tracking-widest">
                        {selectedCandidate.currentStatus}
                      </span>
                   </div>
                   <div className="flex items-center gap-2 mt-0.5 text-slate-400 font-bold text-[10px] uppercase tracking-widest flex-wrap">
                      <span className="text-blue-600 font-black">{selectedCandidate.matchingScore}%</span>
                      <span>AI</span>
                      <span>|</span>
                      <span>{selectedCandidate.phone}</span>
                      <span>|</span>
                      <span>{selectedCandidate.age}岁 · {selectedCandidate.gender}</span>
                   </div>
                </div>
              </div>
            </div>

            {/* 可滚动内容区：AI摘要、标签、推荐岗位、Tab、详情 */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            {/* AI 研判摘要 */}
            <div className="px-5 pt-3">
              <section className="bg-slate-900 text-white p-4 rounded-2xl relative overflow-hidden shadow-md border border-white/5">
                <div className="relative z-10 flex gap-3 items-start">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse mt-1 flex-shrink-0"></div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">AI 智能研判摘要与风险洞察</h4>
                    <p className="text-xs text-slate-200 leading-relaxed font-semibold italic break-words">"{selectedCandidate.aiSummary}"</p>
                  </div>
                </div>
              </section>
            </div>

            {/* 标签/技能 & 推荐岗位 并排紧凑 */}
            <div className="px-5 pt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="text-xs font-black text-slate-900 uppercase">标签/技能</h5>
                  {!editingTags ? (
                    <div className="flex gap-2">
                      <button
                        onClick={handleAiExtractTags}
                        disabled={aiExtracting}
                        className="text-[10px] font-black text-indigo-600 uppercase hover:text-indigo-700 disabled:opacity-50"
                      >
                        {aiExtracting ? 'AI 提取中...' : 'AI 提取'}
                      </button>
                      <button onClick={() => setEditingTags(true)} className="text-[10px] font-black text-blue-600 uppercase">+ 手动添加</button>
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      <input type="text" placeholder="自定义标签" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTag()} className="text-xs px-3 py-1 rounded-lg border border-slate-200 w-24" />
                      <button onClick={() => handleAddTag()} className="text-[10px] font-black text-blue-600">添加</button>
                      <button onClick={() => { setEditingTags(false); setNewTag(''); }} className="text-[10px] font-black text-slate-400">完成</button>
                    </div>
                  )}
                </div>
                {aiSuggestedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className="text-[8px] font-black text-indigo-500 uppercase w-full">AI建议：</span>
                    {aiSuggestedTags.map((t) => (
                      <button key={t} onClick={() => handleAddAiTag(t)} className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-[9px] font-medium text-indigo-700 hover:bg-indigo-100">
                        +{t}
                      </button>
                    ))}
                    <button onClick={handleAddAllAiTags} className="px-2 py-0.5 rounded-full bg-indigo-100 border border-indigo-200 text-[9px] font-bold text-indigo-700 hover:bg-indigo-200">全加</button>
                  </div>
                )}
                {editingTags && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className="text-[8px] font-black text-slate-400 uppercase w-full">快捷：</span>
                    {resumeTags.filter(t => !(selectedCandidate.tags || []).includes(t)).map(t => (
                      <button key={t} onClick={() => handleAddTag(t)} className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[9px] font-medium text-slate-600 hover:bg-blue-50 hover:border-blue-200">
                        +{t}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 py-2 min-h-[2rem]">
                  {(selectedCandidate.tags || []).map((tag, i) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-medium border text-[10px] ${
                        i % 4 === 0 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        i % 4 === 1 ? 'bg-slate-100 text-slate-700 border-slate-200' :
                        i % 4 === 2 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="text-slate-400 hover:text-red-500 ml-0.5 leading-none">×</button>
                    </span>
                  ))}
                  {(!selectedCandidate.tags || selectedCandidate.tags.length === 0) && !editingTags && <span className="text-slate-400 text-xs">暂无标签</span>}
                </div>
              </div>
              <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="text-[10px] font-black text-slate-900 uppercase">推荐岗位</h5>
                  {!editingRecommended ? (
                    <button onClick={handleOpenRecommendedEdit} className="text-[10px] font-black text-blue-600 uppercase">修改</button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={handleSaveRecommendedJds} disabled={saving} className="text-[10px] font-black text-blue-600">保存</button>
                      <button onClick={() => setEditingRecommended(false)} className="text-[10px] font-black text-slate-400">取消</button>
                    </div>
                  )}
                </div>
                {editingRecommended ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {jds.map(jd => (
                      <label key={jd.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedJdIds.includes(jd.id)}
                          onChange={e => setSelectedJdIds(prev => e.target.checked ? [...prev, jd.id] : prev.filter(id => id !== jd.id))}
                          className="rounded"
                        />
                        <span className="text-sm font-bold">{jd.title}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedCandidate.recommendedJds?.length ? selectedCandidate.recommendedJds : selectedCandidate.appliedPosition ? [{ jdId: '', title: selectedCandidate.appliedPosition }] : []).map(r => (
                      <span key={r.jdId || r.title} className="bg-white px-2 py-0.5 rounded text-[9px] font-bold border border-slate-200">{r.title}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tab 页导航 */}
            <div className="px-5 mt-3 border-b border-slate-100 flex gap-4 flex-shrink-0">
              {[
                { id: 'resume', label: '简历信息' },
                { id: 'assessment', label: '测评记录' },
                { id: 'interview', label: '面试评价' },
                { id: 'background', label: '背调信息' },
                { id: 'offer', label: 'OFFER 详情' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as DetailTab)}
                  className={`pb-2 text-[9px] font-black uppercase tracking-wider transition-all relative ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {tab.label}
                  {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full animate-in zoom-in duration-300"></div>}
                </button>
              ))}
            </div>

            {/* Tab 内容区 - 支持下滑显示完整信息 */}
            <div className="px-5 py-4 pb-8 min-h-0">
              {renderTabContent()}
            </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-white rounded-3xl border border-slate-200 border-dashed flex flex-col items-center justify-center text-slate-300 p-12 text-center">
            <svg className="w-24 h-24 mb-6 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            <p className="text-xl font-black uppercase tracking-widest text-slate-200">请选择左侧候选人查看档案</p>
            <p className="text-xs text-slate-400 mt-2">分 Tab 展示模块化信息，更清晰、更完整</p>
          </div>
        )}
      </div>
    </div>
  );
};
