
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { JDManager } from './components/JDManager';
import { ResumePool } from './components/ResumePool';
import { InterviewManager } from './components/InterviewManager';
import { AssessmentManager } from './components/AssessmentManager';
import { BackgroundManager } from './components/BackgroundManager';
import { OfferManager } from './components/OfferManager';
import { DataAnalysis } from './components/DataAnalysis';
import { Settings } from './components/Settings';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'jd':
        return <JDManager />;
      case 'resumes':
        return <ResumePool />;
      case 'interviews':
        return <InterviewManager />;
      case 'assessments':
        return <AssessmentManager />;
      case 'background':
        return <BackgroundManager />;
      case 'offers':
        return <OfferManager />;
      case 'data':
        return <DataAnalysis />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-xl font-medium uppercase tracking-widest">模块开发中...</p>
            <p className="text-sm mt-2">{activeTab.toUpperCase()} 模块正在迭代中，敬请期待</p>
          </div>
        );
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default App;
