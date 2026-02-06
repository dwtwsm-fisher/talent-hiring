import { supabase } from '../db/supabase.js';

export interface CandidateRow {
  id: string;
  name: string;
  avatar?: string | null;
  age: number;
  gender: string;
  phone: string;
  email: string;
  current_status: string;
  matching_score: number;
  matching_reason?: string | null;
  skills: unknown[];
  applied_position: string;
  match_degree: string;
  source: string;
  city?: string | null;
  work_years?: string | null;
  expected_salary?: string | null;
  job_status_desc?: string | null;
  is_internal_referral: boolean;
  referral_name?: string | null;
  ai_summary: string;
  is_duplicate: boolean;
  tags: unknown[];
  is_rehired_ex_employee: boolean;
  external_source?: string | null;
  external_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateFilter {
  search?: string;
  positionType?: string;
  company?: string;
  region?: string;
  workYears?: string;
  education?: string;
  status?: string;
}

/**
 * Repository 层：封装候选人数据访问逻辑
 * 职责：数据库 CRUD 操作，不包含业务逻辑
 */
export class CandidateRepository {
  /**
   * 查询候选人列表（支持筛选）
   */
  async findAll(filters: CandidateFilter = {}): Promise<CandidateRow[]> {
    const { search, positionType, status } = filters;
    let query = supabase.from('candidates').select('*');

    if (search?.trim()) {
      const s = `%${search.trim()}%`;
      query = query.or(`name.ilike.${s},applied_position.ilike.${s},phone.ilike.${s},email.ilike.${s}`);
    }
    if (positionType?.trim()) {
      query = query.ilike('applied_position', `%${positionType.trim()}%`);
    }
    if (status?.trim()) {
      query = query.eq('current_status', status.trim());
    }

    const { data, error } = await query.order('updated_at', { ascending: false });
    if (error) {
      console.error('CandidateRepository.findAll - 数据库查询错误:', error);
      throw error;
    }
    
    console.log('CandidateRepository.findAll - 查询结果:', data?.length || 0, '条记录');
    return data || [];
  }

  /**
   * 根据 ID 查询单个候选人
   */
  async findById(id: string): Promise<CandidateRow | null> {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  /**
   * 创建候选人
   */
  async create(candidateData: Partial<CandidateRow>): Promise<CandidateRow> {
    const { data, error } = await supabase
      .from('candidates')
      .insert(candidateData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * 更新候选人
   */
  async update(id: string, updates: Partial<CandidateRow>): Promise<CandidateRow> {
    const { data, error } = await supabase
      .from('candidates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * 删除候选人
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * 根据外部来源和ID查询候选人（用于去重）
   */
  async findByExternalId(externalSource: string, externalId: string): Promise<CandidateRow | null> {
    const { data, error } = await supabase
      .from('candidates')
      .select('id')
      .eq('external_source', externalSource)
      .eq('external_id', externalId)
      .maybeSingle();

    if (error) {
      // 如果字段不存在，忽略错误（向后兼容）
      if (error.message?.includes('external') || error.code === 'PGRST204') {
        return null;
      }
      throw error;
    }
    return data;
  }
}
