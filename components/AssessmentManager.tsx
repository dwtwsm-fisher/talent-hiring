
import React, { useState, useEffect } from 'react';
import { Candidate, AssessmentRecord } from '../types';
import { api } from '../api/client';

type AssessmentStatus = '待发起' | '待完成' | '已完成' | '已逾期';

interface ScoreDetails {
  group1: number; group2: number; group3: number; group4: number;
  group5: number; group6: number; group7: number; group8: number;
}

interface AssessmentQuestion {
  id: number;
  text: string;
  points: number;
}

interface EnhancedAssessment extends AssessmentRecord {
  candidateId: string;
  link?: string;
  reminderPeriod?: string;
  scoreBreakdown?: ScoreDetails;
  questionScores?: number[]; // 64个小题的原始得分
}

const DEFAULT_DIMENSIONS = [
  { id: 'group1', label: '创业与行动', color: 'blue' },
  { id: 'group2', label: '健康与习惯', color: 'emerald' },
  { id: 'group3', label: '生活与消费', color: 'amber' },
  { id: 'group4', label: '奉献与忠诚', color: 'indigo' },
  { id: 'group5', label: '权力与控制', color: 'rose' },
  { id: 'group6', label: '研究与技术', color: 'sky' },
  { id: 'group7', label: '家庭与情感', color: 'pink' },
  { id: 'group8', label: '规则与修养', color: 'violet' },
];

const INITIAL_QUESTIONS = [
  "我满脑子创业，并有所行动", "我会理财，让钱能生钱", "我比其它朋友或同学收入相对较高", "我有独特的项目并形成了行动力", "对我未来的事情分析较准", "我为团队成功可以得罪人", "我善于外交", "我经常做而不是经常说",
  "我吃饭很在意营养而且并不多吃", "我一天睡眠平均不少于七小时", "我很平淡看待钱", "我时常忘记苦恼的事情", "我几乎没有仇人，我不恨别人，并不报怨社会制度", "我每周都运动，不少于二小时", "我可以为了身体停下工作", "我明白不良的习惯对身体的危害",
  "我认为生命是艳丽的，我可以着装与众不同", "我没有手机简直不能生活", "我知道很多种时尚品牌", "我经常参加娱乐活动", "我身上至少有二件饰品，包括美丽的包", "对我一件物品动情即买之", "我经常没钱，并借钱，一年至少一次", "我对度假与玩有兴趣",
  "我想有更多的压力，只要事业可以更好", "我强调付出，从不强调收入", "我认为只要是为公司着想，突破制度也有必要", "我想一生都不停工作", "我常常为公司的发展写出报告或文字", "我经常谈出我对公司发展的看法", "我没有吃过回扣等公司严防的事情", "我经常做家务或公司事务，别人并没有要求的前提下",
  "我与别人谈话是为了影响或控制别人", "我没有给别人进行情感性打过分", "我不会拍马屁", "我能控制混乱的局面", "我喜欢人力资源管理胜过研究与技术", "我想做管官的官，让下级为此而快乐", "我喜欢哲学，并了解宗教", "我认为能处理好下级的分配问题，让他们没有怨言",
  "我喜欢物理", "我有特殊的创意，并尝试有效果", "我有专利或专利级的产品或技术", "我学习力强并精通某一方面", "我不在意工作对我的回报，而在于兴趣", "我经常思考或工作的不知时间", "我爱看科普类栏目", "我逻辑力强",
  "我认为家是第一位的", "我工作不是为了钱，而是情感", "我不说假话", "我为了爱人失去了很多", "我认为承诺比生命更重要", "我会因为情感而放弃工作或生活的城市", "我时常想起初恋", "我发现爱情对我的激励作用很大",
  "我经常原谅别人", "我认为我身后有追随者", "我认为有品味，而从不说脏话", "我是一个项目的专家，并培训别人为胜任力者", "我出席各级名流活动", "我决不拿不属于自己的东西", "我教他们做好事", "我赞同现行的规则，并主动提出见解而不是报怨"
];

export const AssessmentManager: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    api.candidates.list().then((data) => {
      setCandidates(data);
      if (data.length > 0) setSelectedCandidate(data[0]);
    }).catch(console.error);
  }, []);
  const [viewState, setViewState] = useState<'details' | 'config' | 'initiate' | 'summary'>('details');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState(DEFAULT_DIMENSIONS);
  
  // 题目与分值配置状态
  const [questions, setQuestions] = useState<AssessmentQuestion[]>(
    INITIAL_QUESTIONS.map((text, i) => ({ id: i + 1, text, points: 2 }))
  );

  // 模拟已完成的 64 题得分 (0-2分)
  const [mockQuestionScores] = useState<number[]>(
    Array.from({ length: 64 }, () => Math.floor(Math.random() * 3))
  );

  // Mocked state for assessments
  const [assessments] = useState<EnhancedAssessment[]>([
    {
      id: 'HRDA-001',
      candidateId: 'C001',
      type: '人力资源发展取向测评',
      date: '2024-05-18',
      status: '已完成',
      score: 112,
      result: '该候选人表现出极强的管理潜质与规则意识，在权力控制与规则修养维度得分极高，完全契合大型住宅项目的管理需求。其创业精神与行动力指标也处于优异水平。',
      link: 'https://talent-hiring.com/assess/C001-hrda',
      reminderPeriod: '3天',
      scoreBreakdown: {
        group1: 14, group2: 12, group3: 8, group4: 15,
        group5: 10, group6: 12, group7: 12, group8: 16
      },
      questionScores: mockQuestionScores
    }
  ]);

  const currentAssessment = assessments.find(a => a.candidateId === selectedCandidate?.id);

  const calculateAggregates = (breakdown?: ScoreDetails) => {
    if (!breakdown) return { A: 0, B: 0, C: 0 };
    return {
      A: breakdown.group1 + breakdown.group4 + breakdown.group5 + breakdown.group8,
      B: breakdown.group2 + breakdown.group3 + breakdown.group6 + breakdown.group7,
      C: breakdown.group5 + breakdown.group6 + breakdown.group7 + breakdown.group8
    };
  };

  const aggregates = calculateAggregates(currentAssessment?.scoreBreakdown);

  const handleInitiate = () => {
    const token = Math.random().toString(36).substring(7);
    setGeneratedLink(`https://talent-hiring.com/assess/${token}`);
  };

  const updateQuestionText = (id: number, text: string) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, text } : q));
  };

  const updateQuestionPoints = (id: number, points: string) => {
    const num = parseInt(points) || 0;
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, points: num } : q));
  };

  return (
    <div className="h-full flex flex-col space-y-6 max-w-7xl mx-auto">
      {/* 顶部筛选区 */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="w-48">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">测评状态</label>
            <select className="w-full text-sm border-slate-200 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500/20">
              <option>全部状态</option>
              <option>待发起</option>
              <option>已完成</option>
              <option>已逾期</option>
            </select>
          </div>
          <div className="w-48">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">岗位关联</label>
            <select className="w-full text-sm border-slate-200 rounded-xl py-2 px-3 outline-none">
              <option>全部岗位</option>
              <option>物业经理</option>
              <option>客服主管</option>
            </select>
          </div>
          <div className="flex-1">
             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">快速检索</label>
             <input type="text" placeholder="候选人姓名..." className="w-full text-sm border-slate-200 rounded-xl py-2 px-3 outline-none" />
          </div>
          <button className="bg-blue-600 text-white font-bold text-sm px-8 py-2 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all self-end">检索结果</button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
        {/* 左侧候选人列表 */}
        <div className="w-1/3 flex flex-col space-y-4 overflow-y-auto custom-scrollbar pr-2 pb-12">
          {candidates.map(candidate => {
            const assessment = assessments.find(a => a.candidateId === candidate.id);
            return (
              <div 
                key={candidate.id}
                onClick={() => { setSelectedCandidate(candidate); setViewState('details'); }}
                className={`bg-white p-4 rounded-[1.5rem] border-2 cursor-pointer transition-all relative group shadow-sm ${selectedCandidate?.id === candidate.id && viewState !== 'summary' ? 'border-blue-500 shadow-xl scale-[1.02]' : 'border-transparent hover:border-slate-200'}`}
              >
                <div className="flex gap-4 items-center">
                  <img src={candidate.avatar} className="w-12 h-12 rounded-xl object-cover shadow-inner" alt="" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-slate-900 truncate tracking-tight">{candidate.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{candidate.appliedPosition}</p>
                  </div>
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm ${assessment?.status === '已完成' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {assessment?.status || '待发起'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 右侧工作区 */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
          {selectedCandidate ? (
            <div className="flex flex-col h-full">
              {/* 页头导航 */}
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/20">
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 text-blue-600 shadow-sm">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedCandidate.name}</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">测评全流程管理与结果洞察</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {viewState === 'summary' ? (
                    <button onClick={() => setViewState('details')} className="px-8 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-black transition-all uppercase tracking-widest shadow-xl">返回详情</button>
                  ) : (
                    <>
                      {currentAssessment?.status === '已完成' && (
                        <button onClick={() => setViewState('summary')} className="px-6 py-2.5 border-2 border-blue-600 text-blue-600 rounded-xl text-xs font-black hover:bg-blue-50 transition-all uppercase tracking-widest shadow-sm">分数总结页</button>
                      )}
                      <button onClick={() => setViewState('config')} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-black hover:bg-slate-50 transition-all uppercase tracking-widest">配置题目</button>
                      <button onClick={() => setViewState('initiate')} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all uppercase tracking-widest active:scale-95">发起测评</button>
                    </>
                  )}
                </div>
              </div>

              {/* 主要内容区 */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
                {viewState === 'summary' && currentAssessment?.scoreBreakdown ? (
                  /* 独立报表全屏视图 */
                  <div className="max-w-4xl mx-auto p-4 animate-in fade-in zoom-in-95 duration-500">
                    <div className="border-[3px] border-slate-900 bg-white p-16 font-serif text-slate-900 shadow-2xl relative">
                       <h2 className="text-4xl font-black text-center mb-16 tracking-[0.3em] uppercase">人才测评结果报告书</h2>
                       
                       <div className="grid grid-cols-2 gap-x-16 gap-y-10 mb-16 text-xl font-bold">
                          <div className="flex items-end border-b-2 border-slate-900 pb-2">
                             <span className="w-28 flex-shrink-0">姓 名：</span>
                             <span className="flex-1 text-center font-black">{selectedCandidate.name}</span>
                          </div>
                          <div className="flex items-end border-b-2 border-slate-900 pb-2">
                             <span className="w-28 flex-shrink-0">年 龄：</span>
                             <span className="flex-1 text-center font-black">{selectedCandidate.age}</span>
                          </div>
                          <div className="flex items-end border-b-2 border-slate-900 pb-2">
                             <span className="w-28 flex-shrink-0">性 别：</span>
                             <span className="flex-1 text-center font-black">{selectedCandidate.gender}</span>
                          </div>
                          <div className="flex items-end border-b-2 border-slate-900 pb-2">
                             <span className="w-28 flex-shrink-0">职 位：</span>
                             <span className="flex-1 text-center font-black">{selectedCandidate.appliedPosition}</span>
                          </div>
                       </div>

                       <div className="border-[3px] border-slate-900">
                          <div className="bg-slate-100 text-center py-5 border-b-[3px] border-slate-900 font-black text-2xl tracking-[0.4em] uppercase">得分情况</div>
                          <div className="grid grid-cols-12 text-center text-base">
                             <div className="col-span-4 border-r-[3px] border-b-2 border-slate-900 p-4 font-black bg-slate-50/50">编号组合</div>
                             <div className="col-span-2 border-r-[3px] border-b-2 border-slate-900 p-4 font-black bg-slate-50/50">得分</div>
                             <div className="col-span-4 border-r-[3px] border-b-2 border-slate-900 p-4 font-black bg-slate-50/50">编号组合</div>
                             <div className="col-span-2 border-b-2 border-slate-900 p-4 font-black bg-slate-50/50">得分</div>

                             <div className="col-span-4 border-r-2 border-b border-slate-800 p-5">01-08 合计 (一)</div>
                             <div className="col-span-2 border-r-2 border-b border-slate-800 p-5 font-black">{currentAssessment.scoreBreakdown.group1}</div>
                             <div className="col-span-4 border-r-2 border-b border-slate-800 p-5">33-40 合计 (五)</div>
                             <div className="col-span-2 border-b border-slate-800 p-5 font-black">{currentAssessment.scoreBreakdown.group5}</div>

                             <div className="col-span-4 border-r-2 border-b border-slate-800 p-5">09-16 合计 (二)</div>
                             <div className="col-span-2 border-r-2 border-b border-slate-800 p-5 font-black">{currentAssessment.scoreBreakdown.group2}</div>
                             <div className="col-span-4 border-r-2 border-b border-slate-800 p-5">41-48 合计 (六)</div>
                             <div className="col-span-2 border-b border-slate-800 p-5 font-black">{currentAssessment.scoreBreakdown.group6}</div>

                             <div className="col-span-4 border-r-2 border-b border-slate-800 p-5">17-24 合计 (三)</div>
                             <div className="col-span-2 border-r-2 border-b border-slate-800 p-5 font-black">{currentAssessment.scoreBreakdown.group3}</div>
                             <div className="col-span-4 border-r-2 border-b border-slate-800 p-5">49-56 合计 (七)</div>
                             <div className="col-span-2 border-b border-slate-800 p-5 font-black">{currentAssessment.scoreBreakdown.group7}</div>

                             <div className="col-span-4 border-r-2 border-b-[3px] border-slate-900 p-5">25-32 合计 (四)</div>
                             <div className="col-span-2 border-r-2 border-b-[3px] border-slate-900 p-5 font-black">{currentAssessment.scoreBreakdown.group4}</div>
                             <div className="col-span-4 border-r-2 border-b-[3px] border-slate-900 p-5">57-64 合计 (八)</div>
                             <div className="col-span-2 border-b-[3px] border-slate-900 p-5 font-black">{currentAssessment.scoreBreakdown.group8}</div>

                             <div className="col-span-4 border-r-[3px] border-b-2 border-slate-900 p-6 font-black bg-slate-50 text-slate-700 tracking-tight">一、四、五、八项相加得分</div>
                             <div className="col-span-2 border-r-[3px] border-b-2 border-slate-900 p-6 font-black text-2xl text-blue-700 italic">{aggregates.A}</div>
                             <div className="col-span-4 border-r-[3px] border-b-2 border-slate-900 p-6 font-black bg-slate-50 text-slate-700 tracking-tight">二、三、六、七项相加得分</div>
                             <div className="col-span-2 border-b-2 border-slate-900 p-6 font-black text-2xl text-indigo-700 italic">{aggregates.B}</div>

                             <div className="col-span-4 border-r-[3px] border-b-[3px] border-slate-900 p-6 font-black bg-slate-50 text-slate-700 tracking-tight">五、六、七、八项相加得分</div>
                             <div className="col-span-2 border-r-[3px] border-b-[3px] border-slate-900 p-6 font-black text-2xl text-emerald-700 italic">{aggregates.C}</div>
                             <div className="col-span-6 border-b-[3px] border-slate-900 bg-slate-50"></div>

                             <div className="col-span-4 border-r-[3px] p-10 font-black text-3xl uppercase tracking-[0.3em] bg-slate-100 flex items-center justify-center italic text-slate-900">总分</div>
                             <div className="col-span-8 p-10 text-6xl font-black italic tracking-tighter text-slate-900 flex items-center justify-center drop-shadow-sm">{currentAssessment.score}</div>
                          </div>
                       </div>
                    </div>
                  </div>
                ) : currentAssessment?.status === '已完成' ? (
                  /* 详情页复合视图 */
                  <div className="space-y-12 pb-20 animate-in fade-in duration-500">
                    
                    {/* 得分项明细 */}
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-12 shadow-sm relative overflow-hidden">
                       <h5 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-12 flex items-center gap-3">
                          <svg className="w-6 h-6 text-blue-600 fill-current drop-shadow-md" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                          得分项明细 (Scoring Breakdown)
                       </h5>
                       <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-12">
                          {dimensions.map((dim) => {
                            const score = currentAssessment.scoreBreakdown?.[dim.id as keyof ScoreDetails] || 0;
                            return (
                              <div key={dim.id} className="space-y-5">
                                 <div className="flex justify-between items-end">
                                    <span className="text-xs font-black text-slate-500 uppercase tracking-tight">{dim.label}</span>
                                    <span className={`text-base font-black text-${dim.color}-600 italic tracking-tight`}>
                                       {score} <span className="text-[11px] text-slate-300 font-normal ml-1 uppercase tracking-tighter">/ 16</span>
                                    </span>
                                 </div>
                                 <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-50">
                                    <div 
                                       className={`h-full bg-${dim.color}-500 rounded-full shadow-lg shadow-${dim.color}-500/20 transition-all duration-1000 ease-out relative`} 
                                       style={{ width: `${(score / 16) * 100}%` }}
                                    >
                                       <div className="absolute top-0 right-0 h-full w-4 bg-white/20 skew-x-12 animate-pulse"></div>
                                    </div>
                                  </div>
                              </div>
                            );
                          })}
                       </div>
                    </div>

                    {/* 子项得分详情 (题项映射) */}
                    <div className="bg-slate-50/50 border border-slate-100 rounded-[2.5rem] p-10">
                       <div className="flex items-center justify-between mb-10">
                          <div>
                            <h6 className="text-base font-black text-slate-900 uppercase tracking-widest">子项得分详情 (Itemized Details)</h6>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">展现题目得分与分值映射</p>
                          </div>
                          <span className="text-[10px] bg-white border border-slate-200 px-4 py-1.5 rounded-xl font-black text-slate-400 uppercase tracking-widest shadow-sm">
                             配置参考当前已同步量表
                          </span>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          {dimensions.map((dim, idx) => (
                            <div key={dim.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-5 hover:border-blue-200 transition-all group">
                               <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                  <div className="flex items-center gap-4">
                                     <span className={`px-2 py-0.5 bg-${dim.color}-600 text-white rounded text-[10px] font-black italic shadow-sm`}>G{idx+1}</span>
                                     <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{dim.label}</span>
                                  </div>
                                  <span className="text-[11px] font-black text-slate-400 italic">SUM: {currentAssessment.scoreBreakdown?.[dim.id as keyof ScoreDetails]}</span>
                               </div>
                               <div className="grid grid-cols-4 gap-2">
                                  {currentAssessment.questionScores?.slice(idx * 8, (idx + 1) * 8).map((qScore, qIdx) => {
                                    const actualNum = idx * 8 + qIdx + 1;
                                    return (
                                      <div key={qIdx} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center transition-all group-hover:bg-white group-hover:border-blue-100">
                                         <p className="text-[8px] font-black text-slate-300 uppercase tracking-tighter mb-0.5">#{actualNum}</p>
                                         <p className={`text-sm font-black ${qScore === 2 ? 'text-green-600' : qScore === 1 ? 'text-blue-600' : 'text-slate-300'}`}>{qScore}</p>
                                      </div>
                                    );
                                  })}
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>

                    {/* 分数总结内容区 (嵌入详情页表格) */}
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 shadow-sm">
                       <h6 className="text-base font-black text-slate-900 uppercase tracking-widest mb-10 flex items-center gap-2">
                          <svg className="w-5 h-5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 2v-6m-8 13h11a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                          分数总结概览 (Summary Overview)
                       </h6>
                       <div className="border-[3px] border-slate-900 overflow-hidden text-slate-900 font-serif">
                          <div className="grid grid-cols-12 text-center text-xs">
                             <div className="col-span-4 border-r-[3px] border-b-2 border-slate-900 p-4 font-black bg-slate-50 uppercase tracking-widest">编号组合</div>
                             <div className="col-span-2 border-r-[3px] border-b-2 border-slate-900 p-4 font-black bg-slate-50 uppercase tracking-widest">得分</div>
                             <div className="col-span-4 border-r-[3px] border-b-2 border-slate-900 p-4 font-black bg-slate-50 uppercase tracking-widest">编号组合</div>
                             <div className="col-span-2 border-b-2 border-slate-900 p-4 font-black bg-slate-50 uppercase tracking-widest">得分</div>
                             
                             {[
                                { l: '01-08合计 (一)', r: currentAssessment.scoreBreakdown?.group1, l2: '33-40合计 (五)', r2: currentAssessment.scoreBreakdown?.group5 },
                                { l: '09-16合计 (二)', r: currentAssessment.scoreBreakdown?.group2, l2: '41-48合计 (六)', r2: currentAssessment.scoreBreakdown?.group6 },
                                { l: '17-24合计 (三)', r: currentAssessment.scoreBreakdown?.group3, l2: '49-56合计 (七)', r2: currentAssessment.scoreBreakdown?.group7 },
                                { l: '25-32合计 (四)', r: currentAssessment.scoreBreakdown?.group4, l2: '57-64合计 (八)', r2: currentAssessment.scoreBreakdown?.group8 },
                             ].map((row, i) => (
                               <React.Fragment key={i}>
                                  <div className={`col-span-4 border-r-2 border-b border-slate-800 p-4 italic ${i === 3 ? 'border-b-[3px] border-b-slate-900' : ''}`}>{row.l}</div>
                                  <div className={`col-span-2 border-r-[3px] border-b border-slate-800 p-4 font-black text-sm ${i === 3 ? 'border-b-[3px] border-b-slate-900' : ''}`}>{row.r}</div>
                                  <div className={`col-span-4 border-r-2 border-b border-slate-800 p-4 italic ${i === 3 ? 'border-b-[3px] border-b-slate-900' : ''}`}>{row.l2}</div>
                                  <div className={`col-span-2 border-b border-slate-800 p-4 font-black text-sm ${i === 3 ? 'border-b-[3px] border-b-slate-900' : ''}`}>{row.r2}</div>
                               </React.Fragment>
                             ))}

                             <div className="col-span-4 border-r-[3px] border-b-2 border-slate-900 p-5 font-black bg-slate-50/50">一、四、五、八合计</div>
                             <div className="col-span-2 border-r-[3px] border-b-2 border-slate-900 p-5 font-black text-lg text-blue-600 italic">{aggregates.A}</div>
                             <div className="col-span-4 border-r-[3px] border-b-2 border-slate-900 p-5 font-black bg-slate-50/50">二、三、六、七合计</div>
                             <div className="col-span-2 border-b-2 border-slate-900 p-5 font-black text-lg text-indigo-600 italic">{aggregates.B}</div>

                             <div className="col-span-4 border-r-[3px] border-b-[3px] border-slate-900 p-5 font-black bg-slate-50/50">五、六、七、八合计</div>
                             <div className="col-span-2 border-r-[3px] border-b-[3px] border-slate-900 p-5 font-black text-lg text-emerald-600 italic">{aggregates.C}</div>
                             <div className="col-span-6 border-b-[3px] border-slate-900 bg-slate-50/30"></div>

                             <div className="col-span-4 border-r-[3px] p-8 font-black text-2xl uppercase tracking-[0.4em] bg-slate-100 flex items-center justify-center italic text-slate-900">总分</div>
                             <div className="col-span-8 p-8 text-5xl font-black italic tracking-tighter text-slate-900 flex items-center justify-center drop-shadow-sm">{currentAssessment.score}</div>
                          </div>
                       </div>
                    </div>

                    {/* AI 深度结果解析 - 底部深色质感卡片 */}
                    <div className="bg-[#0f172a] text-white p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden group border border-white/5">
                       <div className="absolute top-0 right-0 p-16 opacity-5 group-hover:scale-125 transition-transform duration-1000">
                          <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>
                       </div>
                       <div className="relative z-10 space-y-8">
                          <h6 className="text-[12px] font-black text-blue-400 uppercase tracking-[0.3em] flex items-center gap-3">
                             <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.6)]"></span>
                             AI 深度结果解析 (Recursive Analytics)
                          </h6>
                          <div className="pl-8 border-l-[3px] border-white/10">
                            <p className="text-2xl text-slate-200 font-bold leading-relaxed italic tracking-tight">“{currentAssessment.result}”</p>
                            <p className="text-[10px] text-slate-500 mt-10 font-medium italic">— 系统自动分析得出，仅供 HR 招聘决策参考</p>
                          </div>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 py-24 opacity-50">
                     <p className="text-3xl font-black uppercase tracking-[0.3em] text-slate-200 drop-shadow-sm">未检索到测评记录</p>
                     <button onClick={() => setViewState('initiate')} className="mt-10 text-blue-600 font-black text-xs hover:underline uppercase tracking-[0.2em] border-2 border-blue-50 px-12 py-4 rounded-3xl bg-white shadow-xl hover:-translate-y-1 transition-all">立即发起新测评</button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 italic p-16 text-center bg-slate-50/20">
               <svg className="w-24 h-24 mb-8 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
               <p className="text-2xl font-black uppercase tracking-widest text-slate-200">请选择左侧候选人查看详情</p>
               <p className="text-sm text-slate-400 mt-4 font-bold">查看 64 题细节分布与 AI 深度研判报告</p>
            </div>
          )}
        </div>
      </div>

      {/* 题目配置逻辑 (Config View) */}
      {viewState === 'config' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] w-full max-w-6xl h-[90vh] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex flex-col animate-in zoom-in-95 duration-300">
             {/* 页头 */}
             <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-white px-12 relative">
               <div className="space-y-1">
                  <h4 className="text-2xl font-black text-slate-900 tracking-tight uppercase">量表维度与题项配置</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Scale Dimension & Items Mapping</p>
               </div>
               <button onClick={() => setViewState('details')} className="p-3 hover:bg-slate-50 rounded-full transition-colors text-slate-400">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
               </button>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar p-12 space-y-16 bg-slate-50/20">
                {/* 1. 维度权重配置 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   {dimensions.map((dim, i) => (
                      <div key={dim.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 transition-all hover:shadow-md">
                         <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-300 uppercase italic">GROUP {i+1}</span>
                            <div className={`w-2.5 h-2.5 rounded-full bg-${dim.color}-500 shadow-sm animate-pulse`}></div>
                         </div>
                         <input 
                            type="text" 
                            defaultValue={dim.label}
                            placeholder="维度名称"
                            className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-black outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white transition-all shadow-inner"
                          />
                      </div>
                   ))}
                </div>

                {/* 2. 题目明细映射配置 (对齐原型图) */}
                <div className="space-y-8">
                   <div className="flex items-center gap-3 border-l-[6px] border-slate-900 pl-4 py-1">
                      <h5 className="text-[13px] font-black text-slate-900 uppercase tracking-widest">题目详细内容 (MAPPING LIST)</h5>
                   </div>

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-6">
                      {questions.map((q) => (
                        <div key={q.id} className="flex gap-6 p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:border-blue-200 hover:shadow-xl transition-all group items-start relative overflow-hidden">
                           {/* 题号标识 */}
                           <span className="w-12 h-12 flex-shrink-0 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center text-[13px] font-black text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                             {q.id.toString().padStart(2, '0')}
                           </span>

                           <div className="flex-1 space-y-4">
                              {/* 题干编辑 */}
                              <textarea 
                                value={q.text}
                                onChange={(e) => updateQuestionText(q.id, e.target.value)}
                                rows={2}
                                className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-700 outline-none resize-none focus:ring-0 leading-relaxed placeholder:text-slate-200"
                                placeholder="输入题目描述内容..."
                              />
                              
                              {/* 分值编辑 */}
                              <div className="flex items-center gap-4 pt-2 border-t border-slate-50">
                                 <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">POINTS</span>
                                 <div className="flex items-center gap-2">
                                   <input 
                                     type="text" 
                                     value={q.points}
                                     onChange={(e) => updateQuestionPoints(q.id, e.target.value)}
                                     className="w-16 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-center text-xs font-black text-blue-600 outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white"
                                   />
                                   <div className="h-[1px] w-12 border-b border-slate-200 border-dashed"></div>
                                 </div>
                              </div>
                           </div>
                           
                           {/* 装饰性元素 */}
                           <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-blue-50/50 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>

             {/* 页脚 */}
             <div className="p-8 border-t border-slate-100 bg-white flex justify-end px-12 gap-4">
                <button 
                  onClick={() => setViewState('details')}
                  className="px-10 bg-slate-50 text-slate-400 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-slate-100 hover:text-slate-600 transition-all"
                >
                   取消修改
                </button>
                <button 
                  onClick={() => setViewState('details')}
                  className="bg-slate-900 text-white px-16 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-900/20 hover:bg-black hover:-translate-y-0.5 active:scale-95 transition-all"
                >
                   保存配置修改
                </button>
             </div>
          </div>
        </div>
      )}

      {/* 测评发起弹窗 (保留原有风格) */}
      {viewState === 'initiate' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 px-10">
              <h4 className="text-2xl font-black text-slate-900 tracking-tight uppercase">发起候选人测评</h4>
              <button onClick={() => setViewState('details')} className="p-2 hover:bg-white rounded-full transition-colors">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-12 space-y-10">
              {!generatedLink ? (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">选择测评量表</label>
                    <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 transition-all">
                        <option>人力资源发展取向测评 (64 题)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">链接有效期</label>
                      <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold text-slate-700 outline-none shadow-sm">
                          <option>3 天</option>
                          <option>7 天</option>
                      </select>
                    </div>
                  </div>
                  <button onClick={handleInitiate} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-sm shadow-2xl shadow-blue-500/30 hover:bg-blue-700 transition-all uppercase tracking-widest active:scale-95">确认并生成唯一加密链接</button>
                </div>
              ) : (
                <div className="bg-blue-50/50 p-10 rounded-[2.5rem] border-2 border-blue-100 space-y-8 animate-in zoom-in-95 duration-300">
                   <div className="text-center">
                      <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/10">
                         <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 01-1.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      </div>
                      <h5 className="text-2xl font-black text-blue-900 tracking-tight uppercase">链接已生成就绪</h5>
                      <p className="text-[10px] text-blue-600 mt-2 font-black tracking-widest uppercase">Candidates Link Encryption Ready</p>
                   </div>
                   <div className="bg-white p-6 rounded-2xl border border-blue-200 flex items-center justify-between gap-4 shadow-sm">
                      <code className="text-xs text-blue-800 font-black truncate flex-1 tracking-tight">{generatedLink}</code>
                      <button className="bg-blue-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-blue-700 active:scale-95 transition-all">复制链接</button>
                   </div>
                   <div className="flex gap-4">
                      <button className="flex-1 bg-white border-2 border-blue-200 text-blue-600 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all">答题界面预览</button>
                      <button className="flex-1 bg-slate-900 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-black shadow-xl transition-all">立即通过邮件发送</button>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
