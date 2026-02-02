
import React, { useState } from 'react';
import { Icons } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Navbar: React.FC = () => {
  return (
    <nav className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl hover:scale-105 transition-transform cursor-pointer">
          T
        </div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Talent Hiring System
        </h1>
      </div>

      <div className="flex-1"></div>

      <div className="flex items-center gap-6">
        <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <div className="flex items-center gap-3 border-l pl-6 border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-900 leading-tight">HR 专家</p>
            <p className="text-xs text-slate-500">万象物业管理公司</p>
          </div>
          <img src="https://picsum.photos/seed/admin/100/100" className="w-10 h-10 rounded-full border-2 border-white shadow-sm cursor-pointer" alt="User" />
        </div>
      </div>
    </nav>
  );
};

const Sidebar: React.FC<{ activeTab: string, setActiveTab: (t: string) => void }> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: '工作台', icon: Icons.Dashboard },
    { id: 'jd', label: 'JD管理', icon: Icons.JD },
    { id: 'resumes', label: '简历库', icon: Icons.Resume },
    { id: 'interviews', label: '面试管理', icon: Icons.Interview },
    { id: 'assessments', label: '测评管理', icon: Icons.Assessment },
    { id: 'background', label: '背调管理', icon: Icons.Background },
    { id: 'offers', label: 'Offer管理', icon: Icons.Offer },
    { id: 'data', label: '数据分析', icon: Icons.Analysis },
    { id: 'settings', label: '系统设置', icon: Icons.Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="py-6 flex-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-6 py-3 transition-colors ${
              activeTab === item.id 
              ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600 font-medium' 
              : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <item.icon />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className="p-6 border-t border-slate-100">
        <div className="bg-slate-900 text-white rounded-xl p-4 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-medium opacity-70">系统版本</p>
            <p className="text-sm font-bold">V2.1 旗舰版</p>
          </div>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-blue-500 rounded-full blur-2xl opacity-50"></div>
        </div>
      </div>
    </aside>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 bg-slate-50 overflow-y-auto custom-scrollbar p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
