import { supabase } from '../db/supabase.js';

export interface EducationRow {
  id?: string;
  candidate_id: string;
  school: string;
  major: string;
  degree: string;
  duration: string;
  sort_order?: number;
}

/**
 * Repository 层：封装教育经历数据访问逻辑
 */
export class EducationRepository {
  /**
   * 查询候选人的所有教育经历
   */
  async findByCandidateId(candidateId: string): Promise<EducationRow[]> {
    const { data, error } = await supabase
      .from('education')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * 批量创建或更新教育经历
   */
  async upsertMany(candidateId: string, educations: Omit<EducationRow, 'candidate_id' | 'id'>[]): Promise<EducationRow[]> {
    // 先删除旧记录
    await supabase.from('education').delete().eq('candidate_id', candidateId);

    // 插入新记录
    if (educations.length === 0) return [];

    const records = educations.map((edu, idx) => ({
      ...edu,
      candidate_id: candidateId,
      sort_order: idx,
    }));

    const { data, error } = await supabase
      .from('education')
      .insert(records)
      .select();

    if (error) throw error;
    return data || [];
  }
}
