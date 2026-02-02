
import React from 'react';
import { JD, Candidate, Priority, JDStatus, CandidateStatus } from './types';

/** 学历要求（JD 管理、简历检索统一） */
export const EDUCATION_LEVELS = ['高中', '高中及以上', '大专', '大专及以上', '本科', '本科及以上', '硕士'] as const;

/** 工作年限（JD 管理、简历检索统一） */
export const WORK_YEARS = ['1年以下', '1-3年', '2年以上', '3-5年', '5-10年', '10年以上'] as const;

/** 薪资范围建议（JD 管理） */
export const SALARY_RANGES = ['4k-6k', '5k-8k', '6k-9k', '8k-12k', '10k-15k', '12k-18k', '15k-25k', '20k-35k', '25k-40k', '面议'] as const;

/** 简历标签默认建议（物业行业） */
export const DEFAULT_RESUME_TAGS = [
  '物业经验', '业主关系', '危机处理', '成本控制', '团队管理', '客服能力',
  '持电工证', '持特种设备证', '内推', '重点培养', '大型社区经验', '设施维护',
  '合规意识', '沟通协调', '应急响应', '星级物业背景', '项目管理',
  '财务预算', '业主维护',
];

export const MOCK_JDS: JD[] = [
  {
    id: 'JD001',
    title: '物业经理',
    department: '住宅管理部',
    company: '万象物业',
    location: '上海',
    salary: '15k-25k',
    priority: Priority.URGENT,
    status: JDStatus.PUBLISHED,
    createTime: '2024-05-10',
    description: '全面负责物业项目的日常运营管理，提升业主满意度。',
    requirements: ['5年以上物业管理经验', '具备大型社区管理背景', '出色的沟通与应急处理能力'],
    educationRequirement: '本科及以上',
    experienceRequirement: '5-10年'
  },
  {
    id: 'JD002',
    title: '电梯维修工',
    department: '工程部',
    company: '万象物业',
    location: '北京',
    salary: '8k-12k',
    priority: Priority.URGENT,
    status: JDStatus.PUBLISHED,
    createTime: '2024-05-12',
    description: '负责小区电梯的日常巡检、维护与紧急抢修。',
    requirements: ['持有特种设备作业人员证', '3年以上电梯维修经验', '能接受轮班制'],
    educationRequirement: '中专及以上',
    experienceRequirement: '3年以上'
  }
];

export const MOCK_CANDIDATES: Candidate[] = [
  {
    id: 'C001',
    name: '张建国',
    avatar: 'https://picsum.photos/seed/user1/200/200',
    age: 38,
    gender: '男',
    phone: '13812345678',
    email: 'zhangjg@example.com',
    currentStatus: CandidateStatus.INTERVIEW,
    matchingScore: 92,
    matchingReason: '技能完全匹配JD，拥有10年以上大型社区管理背景，危机处理能力出色。',
    skills: ['团队管理', '财务预算', '危机处理', '业主维护'],
    appliedPosition: '物业经理',
    matchDegree: '高',
    source: 'Boss直聘',
    isInternalReferral: false,
    aiSummary: '拥有10年物业行业背景，曾管理过1000户以上的住宅小区，匹配度极高，但最近半年跳槽频率稍快。',
    experience: [
      { company: '万科物业', role: '项目经理', duration: '2018-2023', details: '负责某高端社区全方位管理，包括客服、工程及安保。', highlights: ['业主满意度提升20%', '年度优秀经理'] },
      { company: '绿城服务', role: '主管', duration: '2013-2018', details: '基层服务起步，晋升至项目主管。', highlights: ['标准化流程落地'] }
    ],
    education: [{ school: '清华大学', major: '工商管理', degree: '本科', duration: '2008-2012' }],
    assessmentHistory: [
      { id: 'A001', type: '管理潜质测评', date: '2024-05-12', status: '已完成', score: 88, result: '建议作为核心管理人才培养' }
    ],
    interviewHistory: [
      { round: 1, time: '2024-05-14 10:00', interviewer: '李总', feedback: '对物业行业理解深刻，沟通从容。', recommendation: '推进' }
    ],
    backgroundCheck: { initDate: '2024-05-15', agency: '全信调查', status: '进行中', conclusion: '待确认' },
    isDuplicate: false
  },
  {
    id: 'C002',
    name: '李小梅',
    avatar: 'https://picsum.photos/seed/user2/200/200',
    age: 26,
    gender: '女',
    phone: '13987654321',
    email: 'lixm@example.com',
    currentStatus: CandidateStatus.OFFER,
    matchingScore: 85,
    skills: ['前台接待', '文秘', '投诉处理', '外语能力'],
    appliedPosition: '客服主管',
    matchDegree: '高',
    source: '51job',
    isInternalReferral: true,
    referralName: 'W.J.',
    aiSummary: '沟通能力强，具有亲和力，之前在星级酒店有前台经验。',
    experience: [{ company: '希尔顿酒店', role: '前台接待', duration: '2020-2024', details: '处理宾客入住及日常诉求。' }],
    education: [{ school: '浙江传媒学院', major: '公共关系', degree: '本科', duration: '2016-2020' }],
    assessmentHistory: [],
    interviewHistory: [
      { round: 1, time: '2024-05-11', interviewer: '王经理', feedback: '专业性良好。', recommendation: '推进' },
      { round: 2, time: '2024-05-13', interviewer: '陈总', feedback: '稳定性较好。', recommendation: '推进' }
    ],
    offerInfo: { initDate: '2024-05-16', salaryStructure: '10k + 2k绩效', status: '待确认', expectedJoinDate: '2024-06-01' }
  }
];

export const Icons = {
  Dashboard: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
  JD: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
  Resume: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>,
  Interview: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
  Assessment: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>,
  Background: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
  Offer: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
  Analysis: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>,
  Settings: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
};