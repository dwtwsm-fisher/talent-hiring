
import React, { useState, useEffect } from 'react';
import { JD, Priority } from '../types';
import { api } from '../api/client';

export const Dashboard: React.FC = () => {
  const [urgentJDs, setUrgentJDs] = useState<JD[]>([]);

  useEffect(() => {
    api.jds.list().then((jds) => setUrgentJDs(jds.filter(jd => jd.priority === Priority.URGENT))).catch(console.error);
  }, []);

  const stats = [
    { label: '简历待办', count: 24, icon: '📄', color: 'blue' },
    { label: '测评待办', count: 12, icon: '✍️', color: 'indigo' },
    { label: '面试待办', count: 8, icon: '🤝', color: 'emerald' },
    { label: '背调待办', count: 3, icon: '🔍', color: 'amber' },
    { label: 'Offer待办', count: 5, icon: '🎉', color: 'rose' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">你好, 招聘专家! 👋</h2>
          <p className="text-slate-500">这是您今天的招聘概览和待办事项。</p>
        </div>
        <div className="text-sm text-slate-500 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-100">
          2024年5月20日 星期一
        </div>
      </div>

      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-red-500 rounded-full"></span>
          紧急在招岗位
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {urgentJDs.map(jd => (
            <div key={jd.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2">
                <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Urgent</span>
              </div>
              <h4 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">{jd.title}</h4>
              <p className="text-slate-500 text-sm mb-4">{jd.department} | {jd.location}</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-slate-400">相关候选人</p>
                  <p className="text-xl font-bold text-slate-900">12 <span className="text-xs font-normal text-slate-400">位</span></p>
                </div>
                <button className="text-blue-600 text-sm font-medium hover:underline">查看详情 →</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold mb-6">AI 智能待办</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className={`p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-${stat.color}-200 hover:bg-${stat.color}-50 transition-all cursor-pointer`}>
                <div className="text-2xl mb-2">{stat.icon}</div>
                <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                <p className={`text-2xl font-bold text-slate-900`}>{stat.count}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">最新动态</h3>
            <button className="text-xs text-blue-600 font-medium">全部标为已读</button>
          </div>
          <div className="space-y-4 flex-1">
            {[
              { type: 'interview', user: '张建国', content: '完成了第二轮面试', time: '10分钟前' },
              { type: 'offer', user: '李小梅', content: '已接受岗位Offer', time: '1小时前' },
              { type: 'assessment', user: '王小伟', content: '测评结果评分 98/100', time: '2小时前' },
            ].map((news, i) => (
              <div key={i} className="flex gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                <div className="flex-1">
                  <p className="text-sm text-slate-900">
                    <span className="font-semibold">{news.user}</span> {news.content}
                  </p>
                  <p className="text-xs text-slate-400">{news.time}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
