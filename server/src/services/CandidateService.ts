import { CandidateRepository, CandidateRow, CandidateFilter } from '../repositories/CandidateRepository.js';
import { InterviewRepository } from '../repositories/InterviewRepository.js';
import { ExperienceRepository } from '../repositories/ExperienceRepository.js';
import { EducationRepository } from '../repositories/EducationRepository.js';
import { JDRepository } from '../repositories/JDRepository.js';
import { AssessmentRepository } from '../repositories/AssessmentRepository.js';
import { BackgroundRepository } from '../repositories/BackgroundRepository.js';
import { OfferRepository } from '../repositories/OfferRepository.js';
import { getDictValue, getDictDefault } from '../utils/dict.js';
import { supabase } from '../db/supabase.js'; // 暂时保留，用于 candidate_jds 关联查询（TODO: 移到 Repository）

export interface CandidateDTO {
  id: string;
  name: string;
  avatar: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  currentStatus: string;
  matchingScore: number;
  matchingReason?: string;
  skills: string[];
  appliedPosition: string;
  matchDegree: string;
  source: string;
  city?: string;
  workYears?: string;
  expectedSalary?: string;
  jobStatusDesc?: string;
  isInternalReferral: boolean;
  referralName?: string;
  aiSummary: string;
  isDuplicate: boolean;
  wasEliminated: boolean;
  hadOffer: boolean;
  isRehiredExEmployee: boolean;
  tags: string[];
  linkedJds: { jdId: string; title: string; isRecommended?: boolean }[];
  recommendedJds: { jdId: string; title: string }[];
  experience: unknown[];
  education: unknown[];
  assessmentHistory: unknown[];
  interviewHistory: unknown[];
  backgroundCheck?: unknown;
  offerInfo?: unknown;
}

/**
 * Service 层：封装候选人业务逻辑
 * 职责：业务规则、数据转换、跨 Repository 协调
 */
export class CandidateService {
  constructor(
    private candidateRepo: CandidateRepository,
    private interviewRepo: InterviewRepository,
    private experienceRepo: ExperienceRepository,
    private educationRepo: EducationRepository,
    private jdRepo: JDRepository,
    private assessmentRepo: AssessmentRepository,
    private backgroundRepo: BackgroundRepository,
    private offerRepo: OfferRepository
  ) {}

  /**
   * 将数据库行转换为 DTO
   */
  private mapRowToDTO(
    row: CandidateRow,
    linkedJds?: { jdId: string; title: string; isRecommended?: boolean }[]
  ): CandidateDTO {
    const rec = linkedJds?.filter((l) => l.isRecommended) || [];
    const interviewHistory = (row as { interviewHistory?: unknown[] }).interviewHistory || [];
    const offerInfo = (row as { offerInfo?: unknown }).offerInfo;
    const wasEliminated = (interviewHistory as { recommendation?: string }[]).some(
      (i) => i.recommendation === '淘汰'
    );
    const hadOffer = !!offerInfo;

    return {
      id: row.id,
      name: row.name,
      avatar: row.avatar || `https://picsum.photos/seed/${row.id}/200/200`,
      age: row.age,
      gender: row.gender,
      phone: row.phone,
      email: row.email,
      currentStatus: row.current_status,
      matchingScore: row.matching_score,
      matchingReason: row.matching_reason || undefined,
      skills: (row.skills || []) as string[],
      appliedPosition: row.applied_position,
      matchDegree: row.match_degree,
      source: row.source,
      city: row.city || undefined,
      workYears: row.work_years || undefined,
      expectedSalary: row.expected_salary || undefined,
      jobStatusDesc: row.job_status_desc || undefined,
      isInternalReferral: row.is_internal_referral || false,
      referralName: row.referral_name || undefined,
      aiSummary: row.ai_summary || '',
      isDuplicate: row.is_duplicate || false,
      wasEliminated,
      hadOffer,
      isRehiredExEmployee: row.is_rehired_ex_employee || false,
      tags: (row.tags || []) as string[],
      linkedJds: linkedJds || [],
      recommendedJds: rec.map((r) => ({ jdId: r.jdId, title: r.title })),
      experience: (row as { experience?: unknown[] }).experience || [],
      education: (row as { education?: unknown[] }).education || [],
      assessmentHistory: (row as { assessmentHistory?: unknown[] }).assessmentHistory || [],
      interviewHistory: (row as { interviewHistory?: unknown[] }).interviewHistory || [],
      backgroundCheck: (row as { backgroundCheck?: unknown }).backgroundCheck,
      offerInfo: (row as { offerInfo?: unknown }).offerInfo,
    };
  }

  /**
   * 获取候选人列表（含关联数据）
   */
  async getCandidates(filters: CandidateFilter = {}): Promise<CandidateDTO[]> {
    // 应用状态筛选（排除已淘汰，除非明确筛选）
    let candidates = await this.candidateRepo.findAll(filters);

    if (!filters.status) {
      // 默认排除已淘汰简历
      const rejectedStatus = await getDictValue('candidate_status', '已淘汰');
      candidates = candidates.filter((c) => c.current_status !== rejectedStatus);
    }

    // 应用公司/地区筛选（通过 JD 关联）
    // TODO: 这部分逻辑应该移到 Repository 层或创建专门的筛选方法
    if (filters.company || filters.region) {
      const linkedJds = await this.jdRepo.findAll();
      const jdMap = new Map(linkedJds.map((j) => [j.id, j]));

      // 注意：这里仍需要直接访问数据库来获取关联关系
      // 理想情况下应该在 JDRepository 中添加方法来处理这个关联查询
      const { data: cjData } = await supabase
        .from('candidate_jds')
        .select('candidate_id, jd_id');

      const candidateJdMap = new Map<string, string[]>();
      (cjData || []).forEach((r: { candidate_id: string; jd_id: string }) => {
        if (!candidateJdMap.has(r.candidate_id)) {
          candidateJdMap.set(r.candidate_id, []);
        }
        candidateJdMap.get(r.candidate_id)!.push(r.jd_id);
      });

      candidates = candidates.filter((c) => {
        const jdIds = candidateJdMap.get(c.id) || [];
        const jds = jdIds.map((id) => jdMap.get(id)).filter(Boolean);

        if (filters.company) {
          const matches = jds.some((jd) => jd?.company?.includes(filters.company!));
          if (!matches) return false;
        }
        if (filters.region) {
          const matches = jds.some((jd) => jd?.location?.includes(filters.region!));
          if (!matches) return false;
        }
        return true;
      });
    }

    // 加载关联数据
    const candidatesWithRelations = await Promise.all(
      candidates.map(async (candidate) => {
        const linkedJds = await this.jdRepo.findLinkedJds(candidate.id);
        const interviews = await this.interviewRepo.findByCandidateId(candidate.id);
        const experiences = await this.experienceRepo.findByCandidateId(candidate.id);
        const educations = await this.educationRepo.findByCandidateId(candidate.id);

        // 通过 Repository 层加载关联数据
        const assessments = await this.assessmentRepo.findByCandidateId(candidate.id);
        const bgCheck = await this.backgroundRepo.findByCandidateId(candidate.id);
        const offer = await this.offerRepo.findByCandidateId(candidate.id);

        return {
          ...candidate,
          interviewHistory: interviews,
          experience: experiences,
          education: educations,
          assessmentHistory: assessments,
          backgroundCheck: bgCheck || undefined,
          offerInfo: offer || undefined,
        };
      })
    );

    // 为每个候选人加载关联 JD
    const result: CandidateDTO[] = [];
    for (const c of candidatesWithRelations) {
      const linkedJds = await this.jdRepo.findLinkedJds(c.id);
      result.push(this.mapRowToDTO(c, linkedJds));
    }
    return result;
  }

  /**
   * 根据 ID 获取候选人（含关联数据）
   */
  async getCandidateById(id: string): Promise<CandidateDTO | null> {
    const candidate = await this.candidateRepo.findById(id);
    if (!candidate) return null;

    const linkedJds = await this.jdRepo.findLinkedJds(id);
    const interviews = await this.interviewRepo.findByCandidateId(id);
    const experiences = await this.experienceRepo.findByCandidateId(id);
    const educations = await this.educationRepo.findByCandidateId(id);

    // 通过 Repository 层加载关联数据
    const assessments = await this.assessmentRepo.findByCandidateId(id);
    const bgCheck = await this.backgroundRepo.findByCandidateId(id);
    const offer = await this.offerRepo.findByCandidateId(id);

    const candidateWithRelations = {
      ...candidate,
      interviewHistory: interviews,
      experience: experiences,
      education: educations,
      assessmentHistory: assessments,
      backgroundCheck: bgCheck || undefined,
      offerInfo: offer || undefined,
    };

    return this.mapRowToDTO(candidateWithRelations, linkedJds);
  }

  /**
   * 创建候选人
   */
  async createCandidate(candidateData: Partial<CandidateRow>): Promise<CandidateDTO> {
    // 业务逻辑：设置默认值
    const defaultStatus = await getDictDefault('candidate_status');
    const candidate = await this.candidateRepo.create({
      ...candidateData,
      current_status: candidateData.current_status || defaultStatus,
      matching_score: candidateData.matching_score ?? 0,
      skills: candidateData.skills || [],
      tags: candidateData.tags || [],
      is_internal_referral: candidateData.is_internal_referral || false,
      ai_summary: candidateData.ai_summary || '',
      is_duplicate: candidateData.is_duplicate || false,
      is_rehired_ex_employee: candidateData.is_rehired_ex_employee || false,
    } as CandidateRow);

    return this.mapRowToDTO(candidate);
  }

  /**
   * 更新候选人
   */
  async updateCandidate(id: string, updates: Partial<CandidateRow>): Promise<CandidateDTO> {
    const candidate = await this.candidateRepo.update(id, updates);
    return this.mapRowToDTO(candidate);
  }

  /**
   * 删除候选人
   */
  async deleteCandidate(id: string): Promise<void> {
    await this.candidateRepo.delete(id);
  }
}

// 导出单例实例（依赖注入）
export const candidateService = new CandidateService(
  new CandidateRepository(),
  new InterviewRepository(),
  new ExperienceRepository(),
  new EducationRepository(),
  new JDRepository(),
  new AssessmentRepository(),
  new BackgroundRepository(),
  new OfferRepository()
);
