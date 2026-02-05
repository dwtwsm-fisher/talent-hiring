import { api } from '../api/client';
import { Candidate, CandidateStatus } from '../types';

const INTERVIEW_LIST_STATUSES = [CandidateStatus.PENDING_INTERVIEW, CandidateStatus.INTERVIEW];

/**
 * 复用 Hook：候选人数据刷新
 * 统一处理候选人数据的获取和刷新逻辑，避免代码重复
 */
export function useCandidateRefresh() {
  /**
   * 刷新单个候选人数据
   * @param candidateId 候选人ID
   * @returns 更新后的候选人数据
   */
  const refreshCandidate = async (candidateId: string): Promise<Candidate> => {
    const updated = await api.candidates.get(candidateId);
    return updated;
  };

  /**
   * 刷新面试管理相关的候选人列表（仅待面试、面试中状态）
   * @returns 过滤后的候选人列表
   */
  const refreshInterviewCandidateList = async (): Promise<Candidate[]> => {
    const list = await api.candidates.list();
    return list.filter((c) => INTERVIEW_LIST_STATUSES.includes(c.currentStatus as CandidateStatus));
  };

  /**
   * 刷新所有候选人列表（不过滤状态）
   * @param params 可选的筛选参数
   * @returns 候选人列表
   */
  const refreshAllCandidateList = async (params?: {
    search?: string;
    positionType?: string;
    company?: string;
    region?: string;
    workYears?: string;
    education?: string;
    status?: string;
  }): Promise<Candidate[]> => {
    return api.candidates.list(params);
  };

  return {
    refreshCandidate,
    refreshInterviewCandidateList,
    refreshAllCandidateList,
  };
}
