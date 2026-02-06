import { supabase } from '../db/supabase.js';

export interface AssessmentRecordRow {
  id?: string;
  candidate_id: string;
  date: string;
  status: string;
  score?: number | null;
  type: string;
  result: string;
}

/**
 * Repository 层：封装测评记录数据访问逻辑
 */
export class AssessmentRepository {
  /**
   * 查询候选人的所有测评记录
   */
  async findByCandidateId(candidateId: string): Promise<AssessmentRecordRow[]> {
    const { data, error } = await supabase
      .from('assessment_records')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}
