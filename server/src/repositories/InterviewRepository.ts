import { supabase } from '../db/supabase.js';

export interface InterviewRecordRow {
  id?: string;
  candidate_id: string;
  round: number;
  time: string;
  interviewer: string;
  feedback: string;
  recommendation: string;
  method?: string | null;
  location?: string | null;
  status?: string | null;
  conclusion?: string | null;
  ratings?: Record<string, number> | null;
  tags?: string[] | null;
  created_at?: string;
}

/**
 * Repository 层：封装面试记录数据访问逻辑
 * 职责：数据库 CRUD 操作，不包含业务逻辑
 */
export class InterviewRepository {
  /**
   * 查询候选人的所有面试记录
   */
  async findByCandidateId(candidateId: string): Promise<InterviewRecordRow[]> {
    const { data, error } = await supabase
      .from('interview_records')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('round', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * 根据 ID 查询面试记录
   */
  async findById(id: string): Promise<InterviewRecordRow | null> {
    const { data, error } = await supabase
      .from('interview_records')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  /**
   * 创建面试记录
   */
  async create(interviewData: InterviewRecordRow): Promise<InterviewRecordRow> {
    const { data, error } = await supabase
      .from('interview_records')
      .insert(interviewData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * 更新面试记录
   */
  async update(id: string, updates: Partial<InterviewRecordRow>): Promise<InterviewRecordRow> {
    const { data, error } = await supabase
      .from('interview_records')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * 删除面试记录
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('interview_records')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
