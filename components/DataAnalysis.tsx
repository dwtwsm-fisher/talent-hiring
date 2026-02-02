
import React, { useState } from 'react';

export const DataAnalysis: React.FC = () => {
  const [period, setPeriod] = useState('本月');

  // Mock data for recruitment funnel
  const funnelData = [
    { label: '简历获取', count: 482, color: 'bg-blue-500' },
    { label: '通过初筛', count: 156, color: 'bg-indigo-500' },
    { label: '完成测评', count: 84, color: 'bg-violet-500' },
    { label: '进入面试', count: 42, color: 'bg-purple-500' },
    { label: '通过背调', count: 12, color: 'bg-fuchsia-500' },
    { label: '发放Offer', count: 8, color: 'bg-pink-500' },
    { label: '成功入职', count: 6, color: 'bg-rose-500' },
  ];

  const statsCards = [
    { label: '平均招聘周期', value: '18.5', unit: '天', trend: '-2.4%', up: false, desc: '较上月缩短' },
    { label: 'Offer 接受率', value: '85.2', unit: '%', trend: '+5.1%', up: true, desc: '较上月提升' },
    { label: '简历初筛通过率', value: '32.4', unit: '%', trend: '+1.2%', up: true, desc: 'AI 过滤效能提升' },
    { label: '招聘成本 (人均)', value: '3,240', unit: '元', trend: '-12%', up: false, desc: '渠道优化显着' },
  ];

  return (
    <div className="h-full flex flex-col space-y-6 max-w-7xl mx-auto">
      {/* Header & Global Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI 招聘数据洞察</h2>
          <p className="text-sm text-slate-500 font-medium">自动聚合全流程数据，提供智能化招聘流程优化建议</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          {['今日', '本周', '本月', '本季', '全年'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${period === p ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {p}
            </button>
          ))}
          <div className="w-px h-4 bg-slate-200 mx-2"></div>
          <button className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors" title="导出报表">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
               <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${card.up ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                 {card.trend}
               </span>
            </div>
            <div className="flex items-baseline gap-1">
               <h4 className="text-3xl font-black text-slate-900 italic">{card.value}</h4>
               <span className="text-sm font-bold text-slate-400 uppercase">{card.unit}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">{card.desc}</p>
            <div className={`absolute -right-2 -bottom-2 w-16 h-16 rounded-full opacity-5 group-hover:scale-150 transition-transform duration-700 ${card.up ? 'bg-green-500' : 'bg-blue-500'}`}></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Funnel Visualization */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
           <div className="flex justify-between items-end mb-10">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">招聘转化漏斗</h3>
                <p className="text-xs text-slate-400 mt-1">Recruitment Funnel Conversion</p>
              </div>
              <div className="text-right">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">最终转化率</p>
                 <p className="text-2xl font-black text-blue-600 italic">1.24%</p>
              </div>
           </div>
           
           <div className="space-y-4">
              {funnelData.map((item, idx) => {
                const percentage = (item.count / funnelData[0].count) * 100;
                return (
                  <div key={idx} className="relative h-10 flex items-center group">
                    <div 
                      className={`absolute left-0 top-0 bottom-0 ${item.color} rounded-r-xl transition-all duration-1000 ease-out group-hover:brightness-110 shadow-sm`}
                      style={{ width: `${Math.max(percentage, 5)}%`, opacity: 0.1 + (idx * 0.12) }}
                    ></div>
                    <div className="relative flex justify-between w-full px-4 items-center">
                       <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">{item.label}</span>
                       <div className="flex items-center gap-4">
                          <span className="text-sm font-black text-slate-900 italic">{item.count}</span>
                          <span className="w-12 text-right text-[10px] font-bold text-slate-400">{percentage.toFixed(1)}%</span>
                       </div>
                    </div>
                  </div>
                );
              })}
           </div>
        </div>

        {/* AI Insight Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-6">
           <div className="bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-125 transition-transform duration-500">
                 <svg className="w-16 h-16 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>
              </div>
              <div className="relative z-10 space-y-6">
                 <h4 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    AI 智能洞察建议
                 </h4>
                 <div className="space-y-4">
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                       <p className="text-xs font-bold text-blue-300 mb-1">流程瓶颈识别</p>
                       <p className="text-xs text-slate-400 leading-relaxed italic">"测评到面试的转化率低于行业均值 15%，建议简化测评难度或调整测评在流程中的位置。"</p>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                       <p className="text-xs font-bold text-emerald-300 mb-1">渠道质量分析</p>
                       <p className="text-xs text-slate-400 leading-relaxed italic">"Boss直聘渠道虽然简历量大，但入职转化率仅为0.8%；内推渠道转化率高达12%，建议加大内推奖励。"</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex-1">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">热门招聘岗位 TOP 3</h4>
              <div className="space-y-4">
                 {[
                   { title: '物业经理', count: 124, progress: 85 },
                   { title: '客服主管', count: 86, progress: 60 },
                   { title: '工程部主管', count: 54, progress: 40 },
                 ].map((job, idx) => (
                   <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-end">
                         <span className="text-xs font-bold text-slate-800">{job.title}</span>
                         <span className="text-[10px] font-black text-slate-400 italic">{job.count} 人申请</span>
                      </div>
                      <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                         <div className="h-full bg-blue-500 rounded-full" style={{ width: `${job.progress}%` }}></div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* Detailed Module Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
         {/* Interview Module Report */}
         <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-3">面试效率分析</h5>
            <div className="space-y-4">
               <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase">平均面试轮次</span>
                  <span className="text-slate-900 font-black italic">2.4 轮</span>
               </div>
               <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase">面试到 Offer 转化</span>
                  <span className="text-indigo-600 font-black italic">19.0%</span>
               </div>
               <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase">通过率 (一轮)</span>
                  <span className="text-slate-900 font-black italic">42%</span>
               </div>
            </div>
         </div>

         {/* Assessment Module Report */}
         <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-3">测评质量分析</h5>
            <div className="space-y-4">
               <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase">测评完成率</span>
                  <span className="text-slate-900 font-black italic">76.5%</span>
               </div>
               <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase">高分段占比 ({'>'}90)</span>
                  <span className="text-emerald-600 font-black italic">12.0%</span>
               </div>
               <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase">平均得分</span>
                  <span className="text-slate-900 font-black italic">72.8 分</span>
               </div>
            </div>
         </div>

         {/* Offer & Onboarding Report */}
         <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-3">入职与留存</h5>
            <div className="space-y-4">
               <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase">Offer 弃约率</span>
                  <span className="text-red-600 font-black italic">14.8%</span>
               </div>
               <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase">试用期转正率</span>
                  <span className="text-slate-900 font-black italic">92.0%</span>
               </div>
               <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase">离职风险预警 (AI)</span>
                  <span className="text-amber-500 font-black italic">低</span>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};
