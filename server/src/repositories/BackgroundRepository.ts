import { supabase } from '../db/supabase.js';

export interface BackgroundRecordRow {
  id?: string;
  candidate_id: string;
  init_date: string;
  agency: string;
  status: string;
  conclusion: string;
  report_url?: string | null;
}

/**
 * Repository 层：封装背调记录数据访问逻辑
 */
export class BackgroundRepository {
  /**
   * 查询候选人的背调记录
   */
  async findByCandidateId(candidateId: string): Promise<BackgroundRecordRow | null> {
    const { data, error } = await supabase
      .from('background_checks')
      .select('*')
      .eq('candidate_id', candidateId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }
}
