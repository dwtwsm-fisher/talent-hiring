
import React, { useState, useEffect, useMemo } from 'react';
import { JD, Priority, JDStatus } from '../types';
import { api } from '../api/client';
import { generateJD } from '../geminiService';
import { useDictConfig } from '../hooks/useDictConfig';

const ASSESSMENT_DIMENSIONS_KEY = 'jd_assessment_dimensions';

export type AssessmentLevel = 'high' | 'medium' | 'low';

interface AssessmentDimension {
  id: string;
  name: string;
  level: AssessmentLevel;
  desc: string;
}

const defaultDimensions: AssessmentDimension[] = [
  { id: '1', name: '专业技能', level: 'high', desc: '物业管理、设施维护、法律法规知识' },
  { id: '2', name: '危机处理', level: 'high', desc: '突发事件响应、压力管理' },
  { id: '3', name: '沟通协调', level: 'medium', desc: '业主关系处理、团队协作' },
  { id: '4', name: '成长潜力', level: 'medium', desc: '学习能力、职业规划匹配度' },
];

function migrateDimension(d: { weight?: number; level?: AssessmentLevel; id?: string; name?: string; desc?: string }): AssessmentDimension {
  const id = d.id ?? String(Date.now() + Math.random());
  const name = d.name ?? '未命名';
  const desc = d.desc ?? '';
  if (d.level && ['high', 'medium', 'low'].includes(d.level)) {
    return { id, name, level: d.level, desc };
  }
  const weight = d.weight ?? 0;
  const level: AssessmentLevel = weight >= 40 ? 'high' : weight >= 20 ? 'medium' : 'low';
  return { id, name, level, desc };
}

function loadDimensions(): AssessmentDimension[] {
  try {
    const saved = localStorage.getItem(ASSESSMENT_DIMENSIONS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((d: Record<string, unknown>) => migrateDimension(d as { weight?: number; level?: AssessmentLevel; id?: string; name?: string; desc?: string }));
      }
    }
  } catch (_) {}
  return defaultDimensions;
}

function saveDimensions(dims: AssessmentDimension[]) {
  localStorage.setItem(ASSESSMENT_DIMENSIONS_KEY, JSON.stringify(dims));
}

export const JDManager: React.FC = () => {
  const { educationLevels, workYears, salaryRanges } = useDictConfig();
  const [jds, setJds] = useState<JD[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJd, setSelectedJd] = useState<JD | null>(null);
  const [searchFilters, setSearchFilters] = useState({ company: '', location: '', keyword: '', status: '' });

  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    api.jds.list().then((data) => {
      setJds(data);
      if (data.length > 0) setSelectedJd(prev => prev ? prev : data[0]);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filteredJds = useMemo(() => {
    return jds.filter(jd => {
      if (searchFilters.company && !(jd.company || '').toLowerCase().includes(searchFilters.company.toLowerCase())) return false;
      if (searchFilters.location && !jd.location.toLowerCase().includes(searchFilters.location.toLowerCase())) return false;
      if (searchFilters.keyword && !jd.title.toLowerCase().includes(searchFilters.keyword.toLowerCase()) && !(jd.description || '').toLowerCase().includes(searchFilters.keyword.toLowerCase())) return false;
      if (searchFilters.status && jd.status !== searchFilters.status) return false;
      return true;
    });
  }, [jds, searchFilters]);

  useEffect(() => {
    api.dict.companies().then(setCompanies).catch(console.error);
    api.dict.locations().then(setLocations).catch(console.error);
  }, []);

  // 解析岗位名称：若以工作地点开头则拆分
  const parseTitleWithLocation = (title: string, locList: { name: string }[]) => {
    const sorted = [...locList].sort((a, b) => b.name.length - a.name.length);
    for (const loc of sorted) {
      if (title.startsWith(loc.name + '-')) {
        return { location: loc.name, baseTitle: title.slice(loc.name.length + 1) };
      }
    }
    return { location: '', baseTitle: title };
  };

  // 左侧选中 JD 时，同步到右侧表单
  useEffect(() => {
    if (selectedJd) {
      const { location: parsedLoc, baseTitle } = parseTitleWithLocation(selectedJd.title, locations);
      setFormData({
        title: parsedLoc ? baseTitle : selectedJd.title,
        department: selectedJd.department,
        company: selectedJd.company || '',
        location: parsedLoc || selectedJd.location,
        salary: selectedJd.salary,
        priority: selectedJd.priority,
        education: selectedJd.educationRequirement || '',
        experience: selectedJd.experienceRequirement || '',
        keywords: Array.isArray(selectedJd.requirements) ? selectedJd.requirements.join('、') : ''
      });
      setAiResult('');
    } else if (!selectedJd) {
      setFormData({
        title: '',
        department: '',
        company: '',
        location: '',
        salary: '',
        priority: Priority.NORMAL,
        education: '',
        experience: '',
        keywords: ''
      });
      setAiResult('');
    }
  }, [selectedJd, locations]);

  const [activeTab, setActiveTab] = useState<'create' | 'dimensions'>('create');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [customDimensions, setCustomDimensions] = useState<AssessmentDimension[]>(() => loadDimensions());
  const [newDimensionName, setNewDimensionName] = useState('');
  const [newDimensionDesc, setNewDimensionDesc] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    department: '',
    company: '',
    location: '',
    salary: '',
    priority: Priority.NORMAL,
    education: '',
    experience: '',
    keywords: ''
  });

  const handleAiGenerate = async () => {
    if (!formData.keywords?.trim()) {
      alert('请先填写职责关键词');
      return;
    }
    setIsGenerating(true);
    setAiResult('');
    try {
      const result = await generateJD({
        title: formData.title || '岗位',
        department: formData.department || '',
        location: formData.location || '',
        salary: formData.salary || '',
        keywords: formData.keywords,
      });
      setAiResult(result || '生成失败');
    } catch (e) {
      console.error(e);
      setAiResult('AI 生成失败，请稍后重试。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddDimension = () => {
    if (!newDimensionName.trim()) return;
    const id = String(Date.now());
    const newDim: AssessmentDimension = {
      id,
      name: newDimensionName.trim(),
      level: 'medium',
      desc: newDimensionDesc.trim() || '自定义新增评估要求',
    };
    const updated = [...customDimensions, newDim];
    setCustomDimensions(updated);
    saveDimensions(updated);
    setNewDimensionName('');
    setNewDimensionDesc('');
  };

  const handleUpdateDimension = (id: string, updates: Partial<AssessmentDimension>) => {
    const updated = customDimensions.map(d =>
      d.id === id ? { ...d, ...updates } : d
    );
    setCustomDimensions(updated);
    saveDimensions(updated);
  };

  const handleDeleteDimension = (id: string) => {
    if (!confirm('确定删除该维度？')) return;
    const updated = customDimensions.filter(d => d.id !== id);
    setCustomDimensions(updated);
    saveDimensions(updated);
  };

  const handleSaveJd = async () => {
    if (!selectedJd) return;
    setIsSaving(true);
    const base = (formData.title || '').trim();
    const finalTitle = formData.location && !base.startsWith(formData.location + '-')
      ? `${formData.location}-${base}`
      : base;
    try {
      const payload = {
        title: finalTitle,
        department: formData.department,
        company: formData.company,
        location: formData.location,
        salary: formData.salary,
        priority: formData.priority,
        description: selectedJd.description,
        educationRequirement: formData.education,
        experienceRequirement: formData.experience,
        requirements: formData.keywords ? formData.keywords.split(/[,，、]/).map(s => s.trim()).filter(Boolean) : selectedJd.requirements || [],
      };
      await api.jds.update(selectedJd.id, payload);
      setJds(prev => prev.map(j => j.id === selectedJd.id ? { ...j, ...payload, createTime: j.createTime, status: j.status } : j));
      setSelectedJd(prev => prev?.id === selectedJd.id ? { ...prev, ...payload, createTime: prev.createTime, status: prev.status } : prev);
    } catch (e) {
      console.error(e);
      alert('保存失败');
    }
    setIsSaving(false);
  };

  const handlePublishJd = async () => {
    if (!selectedJd) return;
    setIsSaving(true);
    try {
      await api.jds.update(selectedJd.id, { status: JDStatus.PUBLISHED });
      setJds(prev => prev.map(j => j.id === selectedJd.id ? { ...j, status: JDStatus.PUBLISHED } : j));
      setSelectedJd(prev => prev?.id === selectedJd.id ? { ...prev, status: JDStatus.PUBLISHED } : prev);
    } catch (e) {
      console.error(e);
      alert('发布失败');
    }
    setIsSaving(false);
  };

  const handleRevokeJd = async () => {
    if (!selectedJd) return;
    if (!confirm('确定撤销发布？JD 状态将恢复为草稿。')) return;
    setIsSaving(true);
    try {
      await api.jds.update(selectedJd.id, { status: JDStatus.DRAFT });
      setJds(prev => prev.map(j => j.id === selectedJd.id ? { ...j, status: JDStatus.DRAFT } : j));
      setSelectedJd(prev => prev?.id === selectedJd.id ? { ...prev, status: JDStatus.DRAFT } : prev);
    } catch (e) {
      console.error(e);
      alert('撤销失败');
    }
    setIsSaving(false);
  };

  const handleArchiveJd = async () => {
    if (!selectedJd) return;
    if (!confirm('确定归档？该 JD 招聘已完成，归档后将不再展示在常规列表中。')) return;
    setIsSaving(true);
    try {
      await api.jds.update(selectedJd.id, { status: JDStatus.ARCHIVED });
      setJds(prev => prev.map(j => j.id === selectedJd.id ? { ...j, status: JDStatus.ARCHIVED } : j));
      setSelectedJd(prev => prev?.id === selectedJd.id ? { ...prev, status: JDStatus.ARCHIVED } : prev);
    } catch (e) {
      console.error(e);
      alert('归档失败');
    }
    setIsSaving(false);
  };

  const handleDeleteJd = async () => {
    if (!selectedJd) return;
    if (!confirm('确定删除该 JD？此操作不可恢复。')) return;
    setIsSaving(true);
    try {
      await api.jds.delete(selectedJd.id);
      const remaining = jds.filter(j => j.id !== selectedJd.id);
      setJds(remaining);
      setSelectedJd(remaining.length > 0 ? remaining[0] : null);
    } catch (e) {
      console.error(e);
      alert('删除失败');
    }
    setIsSaving(false);
  };

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">JD 智能管理</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => { setSelectedJd(null); setActiveTab('create'); }}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
          >
            + 新建 JD
          </button>
          <button 
            onClick={() => setActiveTab('dimensions')}
            className={`px-6 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${activeTab === 'dimensions' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white text-slate-500 border border-slate-200'}`}
          >
            岗位评估要求
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* 左侧岗位列表 + 搜索 */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 overflow-hidden flex flex-col shadow-sm">
          <div className="p-5 border-b border-slate-50 space-y-3">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">维度搜索</div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={searchFilters.company}
                onChange={e => setSearchFilters(f => ({ ...f, company: e.target.value }))}
                className="w-full text-[10px] bg-slate-50 border-none rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500/10 outline-none appearance-none"
              >
                <option value="">公司名称</option>
                {companies.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <select
                value={searchFilters.location}
                onChange={e => setSearchFilters(f => ({ ...f, location: e.target.value }))}
                className="w-full text-[10px] bg-slate-50 border-none rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500/10 outline-none appearance-none"
              >
                <option value="">地域/城市</option>
                {locations.map(l => (
                  <option key={l.id} value={l.name}>{l.name}</option>
                ))}
              </select>
              <select
                value={searchFilters.status}
                onChange={e => setSearchFilters(f => ({ ...f, status: e.target.value }))}
                className="w-full text-[10px] bg-slate-50 border-none rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500/10 outline-none appearance-none col-span-2"
              >
                <option value="">JD 状态（全部）</option>
                {Object.values(JDStatus).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <input 
              type="text" 
              placeholder="岗位名称关键词" 
              value={searchFilters.keyword}
              onChange={e => setSearchFilters(f => ({ ...f, keyword: e.target.value }))}
              className="w-full text-xs bg-slate-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500/20 outline-none shadow-inner"
            />
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {loading ? (
              <p className="p-5 text-slate-400 text-sm">加载中...</p>
            ) : filteredJds.length === 0 ? (
              <p className="p-5 text-slate-400 text-sm">{jds.length === 0 ? '暂无职位，请创建' : '未找到匹配的职位'}</p>
            ) : (
              filteredJds.map(jd => (
                <div 
                  key={jd.id} 
                  onClick={() => { setSelectedJd(jd); setActiveTab('create'); }}
                  className={`p-5 rounded-2xl hover:bg-slate-50 cursor-pointer border-2 transition-all group ${
                    selectedJd?.id === jd.id ? 'border-blue-500 bg-blue-50/30 shadow-md' : 'border-transparent hover:border-slate-100'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-black text-slate-900 text-base group-hover:text-blue-600 transition-colors">{jd.title}</h4>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${
                      jd.status === JDStatus.PUBLISHED ? 'bg-green-50 text-green-600' :
                      jd.status === JDStatus.ARCHIVED ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {jd.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold">{jd.department} · {jd.location}</span>
                    {jd.priority === Priority.URGENT && (
                      <span className="text-red-500 font-black uppercase tracking-widest">紧急</span>
                    )}
                  </div>
                  <div className="text-right mt-2">
                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">{jd.company}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 右侧工作区 */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-10 overflow-y-auto custom-scrollbar shadow-sm">
          {activeTab === 'create' ? (
            <div className="space-y-10 animate-in fade-in duration-300">
              {selectedJd && (
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-500">
                    正在编辑：<span className="text-blue-600">{selectedJd.title}</span>
                    <span className={`ml-3 px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      selectedJd.status === JDStatus.PUBLISHED ? 'bg-green-50 text-green-600' :
                      selectedJd.status === JDStatus.ARCHIVED ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {selectedJd.status}
                    </span>
                  </p>
                  <div className="flex items-center gap-2">
                    {selectedJd.status !== JDStatus.PUBLISHED && selectedJd.status !== JDStatus.ARCHIVED && (
                      <>
                        <button
                          onClick={handlePublishJd}
                          disabled={isSaving}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-all"
                        >
                          JD发布
                        </button>
                        <button
                          onClick={handleDeleteJd}
                          disabled={isSaving}
                          className="px-4 py-2 rounded-xl text-xs font-bold border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-all"
                        >
                          删除
                        </button>
                      </>
                    )}
                    {selectedJd.status === JDStatus.PUBLISHED && (
                      <>
                        <button
                          onClick={handleRevokeJd}
                          disabled={isSaving}
                          className="px-4 py-2 rounded-xl text-xs font-bold border border-amber-500 text-amber-600 hover:bg-amber-50 disabled:opacity-50 transition-all"
                        >
                          撤销发布
                        </button>
                        <button
                          onClick={handleArchiveJd}
                          disabled={isSaving}
                          className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-400 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-all"
                        >
                          JD归档
                        </button>
                      </>
                    )}
                    <button
                      onClick={handleSaveJd}
                      disabled={isSaving}
                      className="px-6 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-all"
                    >
                      {isSaving ? '保存中...' : '保存修改'}
                    </button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-900 uppercase tracking-tight">岗位名称</label>
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="如: 物业经理（保存时自动加上工作地点前缀）" 
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-900 uppercase tracking-tight">所属部门</label>
                  <input 
                    type="text" 
                    value={formData.department}
                    onChange={e => setFormData({...formData, department: e.target.value})}
                    placeholder="加: 管理部" 
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-900 uppercase tracking-tight">岗位优先级</label>
                  <select 
                    value={formData.priority}
                    onChange={e => setFormData({...formData, priority: e.target.value as Priority})}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                  >
                    <option value={Priority.NORMAL}>普通</option>
                    <option value={Priority.URGENT}>紧急</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-900 uppercase tracking-tight">所属公司</label>
                  <select 
                    value={formData.company}
                    onChange={e => setFormData({...formData, company: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                  >
                    <option value="">请选择公司</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-900 uppercase tracking-tight">工作地点</label>
                  <select 
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                  >
                    <option value="">请选择工作地点</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.name}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-900 uppercase tracking-tight">薪资范围</label>
                  <input
                    type="text"
                    list="salary-ranges"
                    value={formData.salary}
                    onChange={e => setFormData({...formData, salary: e.target.value})}
                    placeholder="选择或输入，如: 15k-25k"
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <datalist id="salary-ranges">
                    {salaryRanges.map(r => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-900 uppercase tracking-tight">学历要求</label>
                  <select
                    value={formData.education}
                    onChange={e => setFormData({...formData, education: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                  >
                    <option value="">请选择学历</option>
                    {educationLevels.map(ed => (
                      <option key={ed} value={ed}>{ed}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-900 uppercase tracking-tight">工作经验要求</label>
                  <select
                    value={formData.experience}
                    onChange={e => setFormData({...formData, experience: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                  >
                    <option value="">请选择工作年限</option>
                    {workYears.map(wy => (
                      <option key={wy} value={wy}>{wy}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-900 uppercase tracking-tight">职责关键词</label>
                <textarea 
                  rows={4}
                  value={formData.keywords}
                  onChange={e => setFormData({...formData, keywords: e.target.value})}
                  placeholder="请输入核心关键词，如：业主维系、成本控制、危机处理..." 
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
                ></textarea>
              </div>
              <div className="flex justify-end pt-4">
                <button 
                  onClick={handleAiGenerate}
                  disabled={isGenerating}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white px-10 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-3 shadow-lg shadow-blue-500/30"
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      生成中...
                    </>
                  ) : (
                    'AI JD 生成'
                  )}
                </button>
              </div>
              {aiResult && (
                <div className="mt-8 border-2 border-blue-50 bg-blue-50/20 rounded-3xl p-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-blue-900 uppercase tracking-tight">AI 生成预览</h3>
                    <button 
                      onClick={() => navigator.clipboard.writeText(aiResult)}
                      className="text-xs font-black uppercase tracking-widest bg-white text-slate-600 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50"
                    >
                      复制
                    </button>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-blue-50 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap font-medium">
                    {aiResult}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-10 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">岗位评估要求</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="要求名称"
                    value={newDimensionName}
                    onChange={e => setNewDimensionName(e.target.value)}
                    className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <input
                    type="text"
                    placeholder="描述"
                    value={newDimensionDesc}
                    onChange={e => setNewDimensionDesc(e.target.value)}
                    className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button 
                    onClick={handleAddDimension}
                    disabled={!newDimensionName.trim()}
                    className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all whitespace-nowrap"
                  >
                    + 新增
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {customDimensions.map((dim) => (
                  <div key={dim.id} className="bg-slate-50 border border-slate-100 p-8 rounded-3xl transition-all hover:bg-white hover:shadow-xl hover:border-blue-100 group">
                    <div className="flex-1 space-y-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-black text-slate-900 text-lg uppercase tracking-tight">{dim.name}</span>
                        <div className="flex items-center gap-4">
                          <select
                            value={dim.level}
                            onChange={e => handleUpdateDimension(dim.id, { level: e.target.value as AssessmentLevel })}
                            className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                          >
                            <option value="high">高</option>
                            <option value="medium">中</option>
                            <option value="low">低</option>
                          </select>
                          <button
                            onClick={() => handleDeleteDimension(dim.id)}
                            className="text-red-500 text-xs font-bold hover:underline"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 font-bold leading-relaxed">{dim.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-8 bg-amber-50/50 rounded-3xl border border-amber-100 flex gap-4 items-start shadow-sm">
                <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <p className="text-sm text-amber-900 font-bold leading-relaxed">
                  岗位评估要求将影响简历库中人才的 AI 匹配逻辑。请根据岗位实际关注点选择「高」「中」「低」要求。配置已自动保存至本地。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
