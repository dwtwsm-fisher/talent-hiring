
export enum Priority {
  URGENT = '紧急',
  NORMAL = '普通'
}

export enum JDStatus {
  DRAFT = '草稿',
  PUBLISHED = '已发布',
  ARCHIVED = '已归档'
}

export enum CandidateStatus {
  NEW = '新简历',
  PENDING_ASSESSMENT = '待测评',
  ASSESSMENT = '测评中',
  PENDING_INTERVIEW = '待面试',
  INTERVIEW = '面试中',
  BACKGROUND_CHECK = '背调中',
  PENDING_OFFER = '待Offer',
  OFFER = 'Offer中',
  HIRED = '已入职',
  REJECTED = '已淘汰'
}

export interface JD {
  id: string;
  title: string;
  department: string;
  company?: string;
  location: string;
  salary: string;
  priority: Priority;
  status: JDStatus;
  createTime: string;
  description: string;
  requirements: string[];
  educationRequirement?: string;
  experienceRequirement?: string;
}

export interface AssessmentRecord {
  id: string;
  date: string;
  status: '待完成' | '已完成' | '逾期';
  score?: number;
  type: string;
  result: string;
}

export interface InterviewRecord {
  id?: string;
  round: number;
  time: string;
  interviewer: string;
  feedback: string;
  recommendation: '推进' | '淘汰' | '待定';
  method?: string | null;
  location?: string | null;
  status?: string | null;
  conclusion?: string | null;
  ratings?: Record<string, number>;
  tags?: string[];
}

export interface BackgroundRecord {
  initDate: string;
  agency: string;
  status: '进行中' | '已完成' | '待确认';
  conclusion: '合格' | '不合格' | '待确认';
  reportUrl?: string;
}

export interface OfferRecord {
  initDate: string;
  salaryStructure: string;
  status: '已发' | '已接受' | '已拒绝' | '待确认';
  expectedJoinDate: string;
}

export interface Candidate {
  id: string;
  name: string;
  avatar: string;
  age: number;
  gender: '男' | '女';
  phone: string;
  email: string;
  currentStatus: CandidateStatus;
  matchingScore: number;
  matchingReason?: string;
  skills: string[];
  appliedPosition: string;
  matchDegree: '高' | '中' | '低';
  source: string;
  /** 所在城市（Boss 等来源） */
  city?: string;
  /** 工作年限（Boss 等来源） */
  workYears?: string;
  /** 期望薪资（Boss 等来源） */
  expectedSalary?: string;
  /** 求职状态描述，如 离职-随时到岗（Boss 等来源） */
  jobStatusDesc?: string;
  isInternalReferral: boolean;
  referralName?: string;
  aiSummary: string;
  experience: Experience[];
  education: Education[];
  isDuplicate?: boolean;
  /** 是否在职（暂不可判断，已移除） */
  isInService?: boolean;
  /** 曾淘汰：面试环节中被淘汰（由面试记录推导） */
  wasEliminated?: boolean;
  /** 曾入职：系统中曾被 offer 过（由 offer 记录推导） */
  hadOffer?: boolean;
  /** 曾入职（手动标记，如离职再招等） */
  isRehiredExEmployee?: boolean;
  /** 简历标签 */
  tags?: string[];
  /** 关联岗位（多对多） */
  linkedJds?: { jdId: string; title: string; isRecommended?: boolean }[];
  /** 推荐岗位列表（快捷展示） */
  recommendedJds?: { jdId: string; title: string }[];
  assessmentHistory: AssessmentRecord[];
  interviewHistory: InterviewRecord[];
  backgroundCheck?: BackgroundRecord;
  offerInfo?: OfferRecord;
}

export interface Experience {
  company: string;
  role: string;
  duration: string;
  details: string;
  highlights?: string[];
}

export interface Education {
  school: string;
  major: string;
  degree: string;
  duration: string;
}