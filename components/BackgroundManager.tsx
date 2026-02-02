
import React, { useState, useEffect } from 'react';
import { Candidate, BackgroundRecord } from '../types';
import { api } from '../api/client';

type BgStatus = '待发起' | '进行中' | '已完成' | '已取消' | '已超时';
type DetailTab = 'settings' | 'results';

interface VerificationItem {
  label: string;
  status: '已核实' | '核实中' | '无记录' | '良好' | '待核实';
  details?: string;
}

interface EnhancedBackground extends BackgroundRecord {
  candidateId: string;
  agencyName: string;
  requirementDesc?: string;
  timeLimit?: string;
  checkItems: string[];
  budget?: string;
  type?: string;
  remark?: string;
  history?: { date: string; event: string }[];
  verificationResults: {
    education: VerificationItem;
    work: VerificationItem;
    criminal: VerificationItem;
    credit: VerificationItem;
  };
  abnormalInfo?: {
    title: string;
    content: string;
  };
}

const CHECK_OPTIONS = ['教育履历', '工作履历', '犯罪记录', '信用记录', '职业资格', '离职原因'];
const STATUS_OPTIONS = ['已核实', '核实中', '无记录', '良好', '待核实'];

export const BackgroundManager: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    api.candidates.list().then((data) => {
      setCandidates(data);
      if (data.length > 0) setSelectedCandidate(data[0]);
    }).catch(console.error);
  }, []);
  const [activeTab, setActiveTab] = useState<DetailTab>('results');
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [isEditingResults, setIsEditingResults] = useState(false);

  // 从 API 候选人数据构建背调展示（含默认扩展字段）
  const buildCurrentCheck = (): EnhancedBackground | null => {
    if (!selectedCandidate) return null;
    const bg = selectedCandidate.backgroundCheck;
    if (!bg) return null;
    const edu = selectedCandidate.education?.[0];
    const exp = selectedCandidate.experience?.[0];
    const eduDetail = edu ? `${edu.school} - ${edu.major} (${edu.degree}) ${edu.duration} - ${bg.status === '已完成' ? '已核实' : '核实中'}` : '学历信息核实中';
    const workDetail = exp ? `${exp.company} - ${exp.role} (${exp.duration}) - ${bg.status === '已完成' ? '已核实' : '核实中'}` : '工作经历核实中';
    return {
      ...bg,
      candidateId: selectedCandidate.id,
      agencyName: bg.agency,
      type: '标准背调',
      budget: '300元',
      timeLimit: '3个工作日',
      remark: bg.status === '进行中' ? '背调进行中，待机构反馈结果。' : bg.status === '已完成' ? `背调结论：${bg.conclusion}` : '待确认背调结果。',
      requirementDesc: '重点核实候选人工作履历与教育背景真实性。',
      checkItems: ['教育履历', '工作履历', '犯罪记录', '信用记录'],
      verificationResults: {
        education: { label: '教育履历', status: bg.conclusion === '合格' ? '已核实' : '核实中', details: eduDetail },
        work: { label: '工作履历', status: bg.status === '已完成' ? '已核实' : '核实中', details: workDetail },
        criminal: { label: '犯罪记录', status: '无记录' },
        credit: { label: '信用记录', status: '良好' }
      },
      abnormalInfo: bg.conclusion === '不合格' ? { title: '背调异常', content: '核实结果存在不符项' } : undefined
    };
  };

  const currentCheck = buildCurrentCheck();

  const handleUpdateCheck = (_updatedData: Partial<EnhancedBackground>) => {
    setIsEditingConfig(false);
    setIsEditingResults(false);
    // 可通过 API 更新背调结果
  };

  const getBadgeColor = (status: string) => {
    switch (status) {
      case '已核实': return 'text-green-600 bg-green-50';
      case '核实中': return 'text-blue-600 bg-blue-50';
      case '无记录': case '良好': return 'text-emerald-600 bg-emerald-50';
      default: return 'text-slate-400 bg-slate-50';
    }
  };

  const renderResultDetails = (check: EnhancedBackground) => (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-xl border border-slate-100">
        <h4 className="text-base font-black text-slate-900">结果详情</h4>
        <button 
          onClick={() => setIsEditingResults(!isEditingResults)}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isEditingResults ? 'bg-slate-900 text-white' : 'border border-blue-600 text-blue-600 hover:bg-blue-50'}`}
        >
          {isEditingResults ? '取消编辑' : '录入/修改结果'}
        </button>
      </div>

      <div className="space-y-6">
        <h5 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-slate-800" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/></svg>
          背调结果汇总
        </h5>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(check.verificationResults).map(([key, item]) => (
            <div key={key} className="bg-slate-50/50 p-4 rounded-xl border border-slate-50 shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-600">{item.label}</span>
                {!isEditingResults ? (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${getBadgeColor(item.status)}`}>
                    {item.status}
                  </span>
                ) : (
                  <select 
                    value={item.status}
                    onChange={(e) => {
                      const newResults = { ...check.verificationResults };
                      newResults[key as keyof typeof check.verificationResults].status = e.target.value as any;
                      handleUpdateCheck({ verificationResults: newResults });
                    }}
                    className="text-[10px] font-black bg-white border border-slate-200 rounded px-1 outline-none"
                  >
                    {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-slate-50">
        {Object.entries(check.verificationResults).map(([key, item]) => (
          <div key={key} className="flex flex-col gap-1">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}核实明细</label>
             {!isEditingResults ? (
               <p className="text-sm text-slate-700 font-medium">{item.details || '暂无详细描述'}</p>
             ) : (
               <input 
                 type="text"
                 value={item.details || ''}
                 onChange={(e) => {
                   const newResults = { ...check.verificationResults };
                   newResults[key as keyof typeof check.verificationResults].details = e.target.value;
                   handleUpdateCheck({ verificationResults: newResults });
                 }}
                 className="w-full bg-slate-50 border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
               />
             )}
          </div>
        ))}
      </div>

      <div className="pt-6 border-t border-slate-50">
        <h5 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>
          备注信息
        </h5>
        {!isEditingResults ? (
          <p className="text-sm text-slate-600 font-medium leading-relaxed italic border-l-4 border-slate-100 pl-4 py-1">
            {check.remark || '暂无备注信息'}
          </p>
        ) : (
          <textarea 
            value={check.remark || ''}
            onChange={(e) => handleUpdateCheck({ remark: e.target.value })}
            rows={3}
            className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        )}
      </div>

      {isEditingResults && (
        <button 
          onClick={() => setIsEditingResults(false)}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all"
        >
          完成并保存核实结果
        </button>
      )}
    </div>
  );

  const renderSettingsSection = (check: EnhancedBackground) => (
    <div className="space-y-10 animate-in fade-in duration-500 pb-12">
      <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-xl border border-slate-100">
        <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          背调设置
        </h4>
        <button 
          onClick={() => setIsEditingConfig(!isEditingConfig)}
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isEditingConfig ? 'bg-slate-900 text-white' : 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50'}`}
        >
          {isEditingConfig ? '取消修改' : '编辑配置'}
        </button>
      </div>

      {!isEditingConfig ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10 bg-white p-2">
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">背调机构</p>
            <p className="text-base font-black text-slate-900 tracking-tight">{check.agencyName || '未指定'}</p>
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">背调类型</p>
            <p className="text-base font-black text-slate-900 tracking-tight">{check.type || '标准背调'}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">调查内容</p>
            <div className="flex flex-wrap gap-2">
              {check.checkItems.map(item => (
                <span key={item} className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-xs font-black border border-blue-100 uppercase tracking-widest">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">费用预算</p>
            <p className="text-base font-black text-blue-600 italic">{check.budget || '300元'}</p>
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">背调时效</p>
            <p className="text-base font-black text-slate-900 tracking-tight">{check.timeLimit || '标准 (3个工作日)'}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8 bg-slate-50/30 p-8 rounded-3xl border border-slate-100 shadow-inner animate-in zoom-in-95 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">背调机构</label>
              <input 
                type="text" 
                defaultValue={check.agencyName}
                onChange={(e) => check.agencyName = e.target.value}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">背调类型</label>
              <select 
                defaultValue={check.type}
                onChange={(e) => check.type = e.target.value}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
              >
                <option>标准背调</option>
                <option>高管背调</option>
                <option>简易核实</option>
              </select>
            </div>
            <div className="md:col-span-2 space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">调查内容 (多选)</label>
              <div className="flex flex-wrap gap-2 bg-white p-4 rounded-xl border border-slate-200">
                {CHECK_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    onClick={() => {
                      const newItems = check.checkItems.includes(opt) 
                        ? check.checkItems.filter(i => i !== opt)
                        : [...check.checkItems, opt];
                      handleUpdateCheck({ checkItems: newItems });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border-2 ${check.checkItems.includes(opt) ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-100'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">费用预算</label>
              <input 
                type="text" 
                defaultValue={check.budget}
                onChange={(e) => check.budget = e.target.value}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">背调时效</label>
              <input 
                type="text" 
                defaultValue={check.timeLimit}
                onChange={(e) => check.timeLimit = e.target.value}
                placeholder="如: 3个工作日"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
              />
            </div>
          </div>
          <button 
            onClick={() => setIsEditingConfig(false)}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-[0.98]"
          >
            保存背调配置修改
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col space-y-6 max-w-7xl mx-auto">
      {/* 顶部导航与全局筛选 */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
        <div className="flex gap-4">
          <div className="w-40">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">背调状态</label>
            <select className="w-full text-sm border-slate-200 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500/20">
              <option>全部状态</option>
              <option>待发起</option>
              <option>进行中</option>
              <option>已完成</option>
            </select>
          </div>
          <div className="w-48">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">快速检索</label>
            <input type="text" placeholder="候选人姓名..." className="w-full text-sm border-slate-200 rounded-xl py-2 px-3 outline-none" />
          </div>
        </div>
        <button className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all uppercase tracking-widest">设置配置</button>
      </div>

      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
        {/* 左侧候选人列表 */}
        <div className="w-1/3 flex flex-col space-y-4 overflow-y-auto custom-scrollbar pr-2 pb-12">
          {candidates.map(candidate => {
            const bg = candidate.backgroundCheck;
            return (
              <div 
                key={candidate.id}
                onClick={() => { setSelectedCandidate(candidate); setIsEditingConfig(false); setIsEditingResults(false); }}
                className={`bg-white p-5 rounded-[1.5rem] border-2 cursor-pointer transition-all relative group shadow-sm ${selectedCandidate?.id === candidate.id ? 'border-blue-500 shadow-xl scale-[1.02]' : 'border-transparent hover:border-slate-200'}`}
              >
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-white font-black overflow-hidden shadow-inner">
                    {candidate.avatar ? <img src={candidate.avatar} className="w-full h-full object-cover" alt="" /> : candidate.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-slate-900 truncate tracking-tight">{candidate.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{candidate.appliedPosition}</p>
                  </div>
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm ${
                    bg?.status === '已完成' ? 'bg-green-100 text-green-700' : 
                    bg?.status === '进行中' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {bg?.status || '待发起'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 右侧工作区 */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
          {selectedCandidate ? (
            currentCheck ? (
              <div className="flex flex-col h-full">
                {/* Tab 导航 */}
                <div className="px-10 bg-white border-b border-slate-100 flex gap-16 pt-8">
                  {[
                    { id: 'settings', label: '背调设置' },
                    { id: 'results', label: '结果详情' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id as DetailTab); setIsEditingConfig(false); setIsEditingResults(false); }}
                      className={`pb-5 text-[12px] font-black uppercase tracking-[0.15em] transition-all relative ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {tab.label}
                      {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full animate-in zoom-in duration-300"></div>}
                    </button>
                  ))}
                </div>

                {/* 内容滚动区 */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
                  {activeTab === 'results' ? (
                    renderResultDetails(currentCheck)
                  ) : (
                    renderSettingsSection(currentCheck)
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                <div className="w-20 h-20 mb-6 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                </div>
                <p className="text-lg font-bold text-slate-700">{selectedCandidate.name} 暂未发起背调</p>
                <p className="text-sm text-slate-500 mt-2 mb-6">选择背调机构并配置调查内容后发起</p>
                <button className="bg-blue-600 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
                  发起背调
                </button>
              </div>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 italic p-12 text-center bg-slate-50/20">
              <svg className="w-20 h-20 mb-6 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              <p className="text-xl font-black uppercase tracking-widest text-slate-200">请选择左侧候选人查看背调详情</p>
              <p className="text-xs text-slate-400 mt-2">支持背调配置修改与核实结果多维度展示</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
