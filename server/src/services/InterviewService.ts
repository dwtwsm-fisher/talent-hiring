import { InterviewRepository, InterviewRecordRow } from '../repositories/InterviewRepository.js';
import { CandidateRepository } from '../repositories/CandidateRepository.js';
import { getDictValue, getDictDefault } from '../utils/dict.js';

/**
 * Service 层：封装面试记录业务逻辑
 */
export class InterviewService {
  constructor(
    private interviewRepo: InterviewRepository,
    private candidateRepo: CandidateRepository
  ) {}

  /**
   * 创建面试记录
   */
  async createInterview(candidateId: string, interviewData: Partial<InterviewRecordRow>): Promise<InterviewRecordRow> {
    // 业务逻辑：设置默认值
    const defaultRecommendation = '待定';
    const defaultStatus = await getDictDefault('interview_status').catch(() => '待面试');

    const interview = await this.interviewRepo.create({
      candidate_id: candidateId,
      round: interviewData.round ?? 1,
      time: interviewData.time ?? '',
      interviewer: interviewData.interviewer ?? '',
      feedback: interviewData.feedback ?? '',
      recommendation: interviewData.recommendation ?? defaultRecommendation,
      method: interviewData.method ?? null,
      location: interviewData.location ?? null,
      status: interviewData.status ?? defaultStatus,
      conclusion: interviewData.conclusion ?? null,
      ratings: interviewData.ratings ?? null,
      tags: interviewData.tags ?? null,
    } as InterviewRecordRow);

    return interview;
  }

  /**
   * 更新面试记录
   */
  async updateInterview(
    candidateId: string,
    interviewId: string,
    updates: Partial<InterviewRecordRow>
  ): Promise<InterviewRecordRow> {
    // 业务逻辑：验证候选人存在
    const candidate = await this.candidateRepo.findById(candidateId);
    if (!candidate) {
      throw new Error('候选人不存在');
    }

    const interview = await this.interviewRepo.update(interviewId, updates);
    return interview;
  }

  /**
   * 删除面试记录
   */
  async deleteInterview(candidateId: string, interviewId: string): Promise<void> {
    // 业务逻辑：验证候选人存在
    const candidate = await this.candidateRepo.findById(candidateId);
    if (!candidate) {
      throw new Error('候选人不存在');
    }

    await this.interviewRepo.delete(interviewId);
  }

  /**
   * 获取候选人的所有面试记录
   */
  async getInterviewsByCandidateId(candidateId: string): Promise<InterviewRecordRow[]> {
    return this.interviewRepo.findByCandidateId(candidateId);
  }
}

// 导出单例实例
export const interviewService = new InterviewService(
  new InterviewRepository(),
  new CandidateRepository()
);
