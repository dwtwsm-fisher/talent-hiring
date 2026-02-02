
import React, { useState, useEffect } from 'react';
import { Candidate, OfferRecord } from '../types';
import { api } from '../api/client';

type OfferStatus = '待发起' | '已发送' | '已接受' | '已拒绝';

interface EnhancedOffer extends OfferRecord {
  candidateId: string;
  probationPeriod: string;
  requirements: string[];
  feedbackNotes?: string;
  history: { date: string; action: string; note?: string }[];
}

export const OfferManager: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    api.candidates.list().then((data) => {
      setCandidates(data);
      if (data.length > 0) setSelectedCandidate(data[0]);
    }).catch(console.error);
  }, []);
  const [viewState, setViewState] = useState<'details' | 'create'>('details');

  // Mock Offer Data
  const [offers, setOffers] = useState<EnhancedOffer[]>([
    {
      candidateId: 'C002',
      initDate: '2024-05-16',
      salaryStructure: '12,000元/月 + 2,000元/月绩效奖金 + 500元餐补',
      status: '待确认' as any, // Mapping from types.ts
      expectedJoinDate: '2024-06-01',
      probationPeriod: '3个月 (80% 薪资)',
      requirements: ['提供原单位离职证明', '有效期内体检报告', '学历证书原件复印件'],
      feedbackNotes: '候选人对入职日期无异议，目前正在等待背调最终报告。',
      history: [
        { date: '2024-05-16 10:00', action: '生成 Offer 草案', note: '基于物业客服主管标准薪资生成' },
        { date: '2024-05-16 14:00', action: 'Offer 已通过内部审批' }
      ]
    }
  ]);

  const currentOffer = offers.find(o => o.candidateId === selectedCandidate?.id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case '已接受': return 'bg-green-100 text-green-700';
      case '已拒绝': return 'bg-red-100 text-red-700';
      case '已发送': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 max-w-7xl mx-auto">
      {/* Top Filter Area */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="w-48">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Offer 状态</label>
            <select className="w-full text-sm border-slate-200 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500/20">
              <option>全部状态</option>
              <option>待发起</option>
              <option>已发送</option>
              <option>已接受</option>
              <option>已拒绝</option>
            </select>
          </div>
          <div className="w-48">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">关联岗位</label>
            <select className="w-full text-sm border-slate-200 rounded-xl py-2 px-3 outline-none">
              <option>全部岗位</option>
              <option>物业经理</option>
              <option>客服主管</option>
              <option>秩序维护员</option>
            </select>
          </div>
          <div className="w-48">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">入职时间区间</label>
            <input type="date" className="w-full text-sm border-slate-200 rounded-xl py-2 px-3 outline-none" />
          </div>
          <button className="bg-blue-600 text-white font-bold text-sm px-8 py-2 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all self-end mb-0.5">
            筛选录用项
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
        {/* Left: Offer List */}
        <div className="w-1/3 flex flex-col space-y-4 overflow-y-auto custom-scrollbar pr-2">
          {candidates.map(candidate => {
            const offer = offers.find(o => o.candidateId === candidate.id);
            return (
              <div 
                key={candidate.id}
                onClick={() => { setSelectedCandidate(candidate); setViewState('details'); }}
                className={`bg-white p-4 rounded-2xl border-2 cursor-pointer transition-all relative group ${selectedCandidate?.id === candidate.id ? 'border-blue-500 shadow-lg scale-[1.02]' : 'border-transparent hover:border-slate-200 shadow-sm'}`}
              >
                <div className="flex gap-4 items-center">
                  <img src={candidate.avatar} className="w-12 h-12 rounded-xl object-cover" alt="" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 truncate">{candidate.name}</h4>
                    <p className="text-[10px] text-slate-500 truncate uppercase tracking-tighter">{candidate.appliedPosition}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${offer ? getStatusColor(offer.status as any) : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                      {offer?.status || '待发起'}
                    </span>
                    {offer && <span className="text-[10px] font-bold text-slate-400 italic">Expected: {offer.expectedJoinDate}</span>}
                  </div>
                </div>
                
                {/* Hover Actions */}
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                  {!offer ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedCandidate(candidate); setViewState('create'); }}
                      className="bg-blue-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20"
                    >
                      录用发起 Offer
                    </button>
                  ) : (
                    <button className="bg-white border border-slate-200 text-slate-600 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors">
                      查看详情
                    </button>
                  )}
                  {offer && (
                    <button className="bg-red-50 text-red-600 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100">
                      取消 Offer
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Offer Details / Form Area */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
          {selectedCandidate ? (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/20">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white rounded-2xl border border-slate-200 p-1 shadow-sm">
                    <img src={selectedCandidate.avatar} className="w-full h-full rounded-xl object-cover" alt="" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">{selectedCandidate.name} <span className="text-sm font-normal text-slate-400 ml-2">录取详情管理</span></h3>
                    <p className="text-xs text-slate-500 font-medium">应聘岗位：{selectedCandidate.appliedPosition} | 渠道：{selectedCandidate.source}</p>
                  </div>
                </div>
                {!currentOffer && viewState !== 'create' && (
                  <button onClick={() => setViewState('create')} className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-xs font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all">
                    新建录用通知
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                {viewState === 'create' ? (
                  <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="text-center">
                       <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">生成录用通知书</h4>
                       <p className="text-sm text-slate-400 mt-2">请详细配置薪资结构及入职要求，确认后将自动下发 Offer</p>
                    </div>

                    <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 space-y-8">
                       <div className="grid grid-cols-2 gap-6">
                          <div>
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">预期入职日期</label>
                             <input type="date" className="w-full bg-white border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
                          </div>
                          <div>
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">试用期期限</label>
                             <select className="w-full bg-white border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-700 outline-none shadow-sm">
                                <option>3 个月 (标准)</option>
                                <option>6 个月</option>
                                <option>不设试用期</option>
                             </select>
                          </div>
                       </div>

                       <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">薪资结构说明</label>
                          <textarea rows={3} placeholder="例：基本工资 10,000 + 绩效 2,000 + 通讯补贴 200..." className="w-full bg-white border-slate-200 rounded-2xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"></textarea>
                       </div>

                       <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">入职所需材料</label>
                          <div className="grid grid-cols-2 gap-3">
                             {['离职证明原件', '体检合格报告', '学历证书原件', '银行卡复印件', '照片1寸2张', '社保缴纳凭证'].map(item => (
                               <label key={item} className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-blue-500 transition-all group">
                                  <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                                  <span className="text-[11px] font-bold text-slate-600 group-hover:text-blue-600 transition-colors">{item}</span>
                               </label>
                             ))}
                          </div>
                       </div>

                       <div className="pt-4 flex gap-4">
                          <button 
                            className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-2xl shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-1 transition-all"
                            onClick={() => setViewState('details')}
                          >
                            发送正式 Offer 通知
                          </button>
                          <button onClick={() => setViewState('details')} className="px-10 bg-white border border-slate-200 text-slate-500 py-4 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all">取消</button>
                       </div>
                    </div>
                  </div>
                ) : currentOffer ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in duration-500">
                    {/* Left Panel: Status & Salary */}
                    <div className="lg:col-span-5 space-y-8">
                       <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-8 relative overflow-hidden group">
                          <div className={`absolute top-0 right-0 w-32 h-32 -mr-10 -mt-10 rounded-full opacity-5 ${
                            currentOffer.status === '已接受' ? 'bg-green-500' : 'bg-blue-500'
                          }`}></div>
                          
                          <div className="flex justify-between items-center relative z-10">
                             <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">录用状态监控</h5>
                             <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${getStatusColor(currentOffer.status as any)}`}>
                               {currentOffer.status || '待确认'}
                             </span>
                          </div>

                          <div className="space-y-5 relative z-10">
                             <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-3">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">薪资结构 (Package)</p>
                                <p className="text-sm font-bold leading-relaxed">{currentOffer.salaryStructure}</p>
                             </div>
                             
                             <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">预期入职</p>
                                   <p className="text-sm font-black text-slate-900 tracking-tight">{currentOffer.expectedJoinDate}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">试用期</p>
                                   <p className="text-sm font-black text-slate-900 tracking-tight">{currentOffer.probationPeriod}</p>
                                </div>
                             </div>
                          </div>

                          <div className="pt-6 border-t border-slate-50 space-y-4">
                            <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">录用处置</h6>
                            <div className="grid grid-cols-2 gap-3">
                               <button className="bg-green-600 text-white py-3 rounded-xl font-black text-[10px] shadow-lg shadow-green-500/20 hover:scale-[1.03] transition-all uppercase tracking-widest">确认已接受</button>
                               <button className="bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-black text-[10px] hover:bg-slate-50 transition-all uppercase tracking-widest">沟通延期</button>
                               <button className="col-span-2 bg-red-50 text-red-600 py-3 rounded-xl font-black text-[10px] hover:bg-red-100 transition-all uppercase tracking-widest">候选人拒绝</button>
                            </div>
                          </div>
                       </div>

                       <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
                          <h6 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">沟通反馈记录</h6>
                          <p className="text-xs text-blue-900 font-medium leading-relaxed italic">“{currentOffer.feedbackNotes}”</p>
                       </div>
                    </div>

                    {/* Right Panel: Requirements & Flow */}
                    <div className="lg:col-span-7 space-y-10">
                       <section className="space-y-6">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             <span className="w-1 h-3 bg-blue-600 rounded-full"></span>
                             入职所需必备材料
                          </h5>
                          <div className="grid grid-cols-2 gap-3">
                             {currentOffer.requirements.map(req => (
                               <div key={req} className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                  <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                     <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                                  </div>
                                  <span className="text-xs font-bold text-slate-700">{req}</span>
                               </div>
                             ))}
                          </div>
                       </section>

                       <section className="space-y-6">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             <span className="w-1 h-3 bg-slate-900 rounded-full"></span>
                             录用流转日志
                          </h5>
                          <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-slate-100">
                             {currentOffer.history.map((h, i) => (
                               <div key={i} className="flex gap-8 relative">
                                  <div className={`w-6 h-6 rounded-full bg-white border-2 flex-shrink-0 z-10 flex items-center justify-center ${i === 0 ? 'border-blue-600' : 'border-slate-200'}`}>
                                     <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                                  </div>
                                  <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex-1">
                                     <div className="flex justify-between items-center mb-1">
                                        <p className="text-sm font-black text-slate-800">{h.action}</p>
                                        <p className="text-[10px] text-slate-400 font-bold">{h.date}</p>
                                     </div>
                                     {h.note && <p className="text-xs text-slate-500 mt-1">{h.note}</p>}
                                  </div>
                               </div>
                             ))}
                          </div>
                       </section>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                     <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-dashed border-slate-200">
                        <svg className="w-12 h-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                     </div>
                     <p className="text-xl font-black uppercase tracking-widest text-slate-200">暂无 Offer 记录</p>
                     <button onClick={() => setViewState('create')} className="mt-4 text-blue-600 font-black text-xs hover:underline uppercase tracking-widest">点击发起录用通知</button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 italic text-sm font-bold uppercase tracking-widest p-12 text-center">
               <svg className="w-20 h-20 mb-6 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
               请选择左侧候选人以管理其 Offer 流程
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
