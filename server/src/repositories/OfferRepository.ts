import { supabase } from '../db/supabase.js';

export interface OfferRecordRow {
  id?: string;
  candidate_id: string;
  init_date: string;
  salary_structure: string;
  status: string;
  expected_join_date: string;
}

/**
 * Repository 层：封装 Offer 记录数据访问逻辑
 */
export class OfferRepository {
  /**
   * 查询候选人的 Offer 记录
   */
  async findByCandidateId(candidateId: string): Promise<OfferRecordRow | null> {
    const { data, error } = await supabase
      .from('offer_records')
      .select('*')
      .eq('candidate_id', candidateId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }
}
