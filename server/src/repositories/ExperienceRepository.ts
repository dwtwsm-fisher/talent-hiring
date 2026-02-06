import { supabase } from '../db/supabase.js';

export interface ExperienceRow {
  id?: string;
  candidate_id: string;
  company: string;
  role: string;
  duration: string;
  details: string;
  highlights?: unknown[];
  sort_order?: number;
}

/**
 * Repository 层：封装工作经历数据访问逻辑
 */
export class ExperienceRepository {
  /**
   * 查询候选人的所有工作经历
   */
  async findByCandidateId(candidateId: string): Promise<ExperienceRow[]> {
    const { data, error } = await supabase
      .from('experiences')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * 批量创建或更新工作经历
   */
  async upsertMany(candidateId: string, experiences: Omit<ExperienceRow, 'candidate_id' | 'id'>[]): Promise<ExperienceRow[]> {
    // 先删除旧记录
    await supabase.from('experiences').delete().eq('candidate_id', candidateId);

    // 插入新记录
    if (experiences.length === 0) return [];

    const records = experiences.map((exp, idx) => ({
      ...exp,
      candidate_id: candidateId,
      sort_order: idx,
    }));

    const { data, error } = await supabase
      .from('experiences')
      .insert(records)
      .select();

    if (error) throw error;
    return data || [];
  }
}
