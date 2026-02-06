import { supabase } from '../db/supabase.js';

/**
 * Repository 层：封装 JD（职位）数据访问逻辑
 */
export class JDRepository {
  /**
   * 查询候选人的关联 JD
   */
  async findLinkedJds(candidateId: string): Promise<{ jdId: string; title: string; isRecommended?: boolean }[]> {
    const { data } = await supabase
      .from('candidate_jds')
      .select('jd_id, is_recommended')
      .eq('candidate_id', candidateId);

    if (!data?.length) return [];

    const jdIds = data.map((d) => d.jd_id);
    const { data: jds } = await supabase.from('jds').select('id, title').in('id', jdIds);
    const jdMap = new Map((jds || []).map((j) => [j.id, j.title]));

    return data.map((d) => ({
      jdId: d.jd_id,
      title: jdMap.get(d.jd_id) || '',
      isRecommended: d.is_recommended,
    }));
  }

  /**
   * 查询所有 JD（用于筛选）
   */
  async findAll(): Promise<{ id: string; company?: string; location?: string; title?: string }[]> {
    const { data, error } = await supabase.from('jds').select('id, company, location, title');
    if (error) throw error;
    return data || [];
  }
}
