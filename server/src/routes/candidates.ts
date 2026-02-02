import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabase.js';

const router = Router();

function mapRowToCandidate(
  row: Record<string, unknown>,
  linkedJds?: { jdId: string; title: string; isRecommended?: boolean }[]
) {
  const rec = linkedJds?.filter((l) => l.isRecommended) || [];
  const interviewHistory = (row.interviewHistory || []) as { recommendation?: string }[];
  const offerInfo = (row as { offerInfo?: unknown }).offerInfo;
  const wasEliminated = interviewHistory.some((i) => i.recommendation === '淘汰');
  const hadOffer = !!offerInfo;
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar || 'https://picsum.photos/seed/' + row.id + '/200/200',
    age: row.age,
    gender: row.gender,
    phone: row.phone,
    email: row.email,
    currentStatus: row.current_status,
    matchingScore: row.matching_score,
    matchingReason: row.matching_reason,
    skills: row.skills || [],
    appliedPosition: row.applied_position,
    matchDegree: row.match_degree,
    source: row.source,
    isInternalReferral: row.is_internal_referral || false,
    referralName: row.referral_name,
    aiSummary: row.ai_summary || '',
    isDuplicate: row.is_duplicate || false,
    wasEliminated,
    hadOffer,
    isRehiredExEmployee: row.is_rehired_ex_employee || false,
    tags: row.tags || [],
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

async function fetchLinkedJds(candidateId: string) {
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

// 获取所有候选人（含嵌套数据，支持筛选）
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, positionType, company, region, workYears, education, status } = req.query as Record<string, string | undefined>;
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
    } else {
      // 默认排除已淘汰简历，除非用户明确筛选淘汰状态
      query = query.neq('current_status', '已淘汰');
    }

    const { data: candidates, error: candidatesError } = await query.order('updated_at', { ascending: false });

    if (candidatesError) throw candidatesError;

    let filtered = candidates || [];
    if (company?.trim() || region?.trim()) {
      const cjRes = await supabase.from('candidate_jds').select('candidate_id, jd_id');
      const jdRes = await supabase.from('jds').select('id, company, location, title');
      const jdMap = new Map((jdRes.data || []).map((j: { id: string; company?: string; location?: string; title?: string }) => [j.id, j]));
      const matchCids = new Set<string>();
      (cjRes.data || []).forEach((r: { candidate_id: string; jd_id: string }) => {
        const jd = jdMap.get(r.jd_id);
        if (!jd) return;
        if (company?.trim() && !(jd.company || '').toLowerCase().includes(company.toLowerCase())) return;
        if (region?.trim() && !(jd.location || '').toLowerCase().includes(region.toLowerCase())) return;
        matchCids.add(r.candidate_id);
      });
      for (const c of filtered) {
        if (matchCids.has(c.id)) continue;
        const jdsByTitle = (jdRes.data || []).filter(
          (j: { title?: string }) => (j.title || '').toLowerCase().includes((c.applied_position || '').toLowerCase())
        );
        for (const jd of jdsByTitle) {
          const ok1 = !company?.trim() || (jd.company || '').toLowerCase().includes(company.toLowerCase());
          const ok2 = !region?.trim() || (jd.location || '').toLowerCase().includes(region.toLowerCase());
          if (ok1 && ok2) {
            matchCids.add(c.id);
            break;
          }
        }
      }
      filtered = filtered.filter((c) => matchCids.has(c.id));
    }
    if (workYears?.trim()) {
      const expRes = await supabase.from('experiences').select('candidate_id, duration');
      const expMap = new Map<string, string[]>();
      (expRes.data || []).forEach((e: { candidate_id: string; duration: string }) => {
        const arr = expMap.get(e.candidate_id) || [];
        arr.push(e.duration);
        expMap.set(e.candidate_id, arr);
      });
      const term = workYears.trim().toLowerCase();
      filtered = filtered.filter((c) => {
        const durations = expMap.get(c.id) || [];
        return durations.some((d) => d.toLowerCase().includes(term));
      });
    }
    if (education?.trim()) {
      const eduRes = await supabase.from('educations').select('candidate_id, degree');
      const eduMap = new Map<string, string[]>();
      (eduRes.data || []).forEach((e: { candidate_id: string; degree: string }) => {
        const arr = eduMap.get(e.candidate_id) || [];
        arr.push(e.degree);
        eduMap.set(e.candidate_id, arr);
      });
      filtered = filtered.filter((c) => {
        const degrees = eduMap.get(c.id) || [];
        return degrees.some((d) => d.toLowerCase().includes(education.toLowerCase()));
      });
    }

    const result = await Promise.all(
      filtered.map(async (c) => {
        const [expRes, eduRes, assRes, intRes, bgRes, offerRes] = await Promise.all([
          supabase.from('experiences').select('*').eq('candidate_id', c.id).order('sort_order'),
          supabase.from('educations').select('*').eq('candidate_id', c.id).order('sort_order'),
          supabase.from('assessment_records').select('*').eq('candidate_id', c.id).order('date', { ascending: false }),
          supabase.from('interview_records').select('*').eq('candidate_id', c.id).order('round'),
          supabase.from('background_records').select('*').eq('candidate_id', c.id).maybeSingle(),
          supabase.from('offer_records').select('*').eq('candidate_id', c.id).maybeSingle(),
        ]);

        const experience = (expRes.data || []).map((e) => ({
          company: e.company,
          role: e.role,
          duration: e.duration,
          details: e.details,
          highlights: e.highlights || [],
        }));

        const education = (eduRes.data || []).map((e) => ({
          school: e.school,
          major: e.major,
          degree: e.degree,
          duration: e.duration,
        }));

        const assessmentHistory = (assRes.data || []).map((a) => ({
          id: a.id,
          date: a.date,
          status: a.status,
          score: a.score,
          type: a.type,
          result: a.result,
        }));

        const interviewHistory = (intRes.data || []).map((i) => ({
          round: i.round,
          time: i.time,
          interviewer: i.interviewer,
          feedback: i.feedback,
          recommendation: i.recommendation,
        }));

        const backgroundCheck = bgRes.data
          ? {
              initDate: bgRes.data.init_date,
              agency: bgRes.data.agency,
              status: bgRes.data.status,
              conclusion: bgRes.data.conclusion,
              reportUrl: bgRes.data.report_url,
            }
          : undefined;

        const offerInfo = offerRes.data
          ? {
              initDate: offerRes.data.init_date,
              salaryStructure: offerRes.data.salary_structure,
              status: offerRes.data.status,
              expectedJoinDate: offerRes.data.expected_join_date,
            }
          : undefined;

        const linkedJds = await fetchLinkedJds(c.id);

        return mapRowToCandidate(
          {
            ...c,
            experience,
            education,
            assessmentHistory,
            interviewHistory,
            backgroundCheck,
            offerInfo,
          },
          linkedJds
        );
      })
    );

    res.json(result);
  } catch (err) {
    console.error('Candidates list error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 获取单个候选人
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { data: c, error: candidatesError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (candidatesError || !c) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const [expRes, eduRes, assRes, intRes, bgRes, offerRes] = await Promise.all([
      supabase.from('experiences').select('*').eq('candidate_id', c.id).order('sort_order'),
      supabase.from('educations').select('*').eq('candidate_id', c.id).order('sort_order'),
      supabase.from('assessment_records').select('*').eq('candidate_id', c.id).order('date', { ascending: false }),
      supabase.from('interview_records').select('*').eq('candidate_id', c.id).order('round'),
      supabase.from('background_records').select('*').eq('candidate_id', c.id).maybeSingle(),
      supabase.from('offer_records').select('*').eq('candidate_id', c.id).maybeSingle(),
    ]);

    const experience = (expRes.data || []).map((e) => ({
      company: e.company,
      role: e.role,
      duration: e.duration,
      details: e.details,
      highlights: e.highlights || [],
    }));

    const education = (eduRes.data || []).map((e) => ({
      school: e.school,
      major: e.major,
      degree: e.degree,
      duration: e.duration,
    }));

    const assessmentHistory = (assRes.data || []).map((a) => ({
      id: a.id,
      date: a.date,
      status: a.status,
      score: a.score,
      type: a.type,
      result: a.result,
    }));

    const interviewHistory = (intRes.data || []).map((i) => ({
      round: i.round,
      time: i.time,
      interviewer: i.interviewer,
      feedback: i.feedback,
      recommendation: i.recommendation,
    }));

    const backgroundCheck = bgRes.data
      ? {
          initDate: bgRes.data.init_date,
          agency: bgRes.data.agency,
          status: bgRes.data.status,
          conclusion: bgRes.data.conclusion,
          reportUrl: bgRes.data.report_url,
        }
      : undefined;

    const offerInfo = offerRes.data
      ? {
          initDate: offerRes.data.init_date,
          salaryStructure: offerRes.data.salary_structure,
          status: offerRes.data.status,
          expectedJoinDate: offerRes.data.expected_join_date,
        }
      : undefined;

    const linkedJds = await fetchLinkedJds(c.id);

    res.json(
      mapRowToCandidate(
        {
          ...c,
          experience,
          education,
          assessmentHistory,
          interviewHistory,
          backgroundCheck,
          offerInfo,
        },
        linkedJds
      )
    );
  } catch (err) {
    console.error('Candidate get error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 创建候选人
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .insert({
        name: body.name,
        avatar: body.avatar || null,
        age: body.age,
        gender: body.gender,
        phone: body.phone,
        email: body.email,
        current_status: body.currentStatus || '新简历',
        matching_score: body.matchingScore ?? 0,
        matching_reason: body.matchingReason || null,
        skills: body.skills || [],
        applied_position: body.appliedPosition,
        match_degree: body.matchDegree || '中',
        source: body.source || '未知',
        is_internal_referral: body.isInternalReferral || false,
        referral_name: body.referralName || null,
        ai_summary: body.aiSummary || '',
        is_duplicate: body.isDuplicate || false,
        is_rehired_ex_employee: body.isRehiredExEmployee || false,
        tags: body.tags || [],
      })
      .select()
      .single();

    if (candidateError) throw candidateError;

    const exp = (body.experience || []).map((e: Record<string, unknown>, i: number) => ({
      candidate_id: candidate.id,
      company: e.company,
      role: e.role,
      duration: e.duration,
      details: e.details,
      highlights: e.highlights || [],
      sort_order: i,
    }));

    const edu = (body.education || []).map((e: Record<string, unknown>, i: number) => ({
      candidate_id: candidate.id,
      school: e.school,
      major: e.major,
      degree: e.degree,
      duration: e.duration,
      sort_order: i,
    }));

    if (exp.length) await supabase.from('experiences').insert(exp);
    if (edu.length) await supabase.from('educations').insert(edu);

    res.status(201).json(mapRowToCandidate({ ...candidate, experience: body.experience || [], education: body.education || [], assessmentHistory: [], interviewHistory: [], backgroundCheck: undefined, offerInfo: undefined }));
  } catch (err) {
    console.error('Candidate create error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 更新候选人
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    const fields = [
      'name', 'avatar', 'age', 'gender', 'phone', 'email', 'currentStatus', 'matchingScore', 'matchingReason',
      'skills', 'appliedPosition', 'matchDegree', 'source', 'isInternalReferral', 'referralName', 'aiSummary', 'isDuplicate',
      'isRehiredExEmployee', 'tags',
    ];
    const dbFields: Record<string, string> = {
      currentStatus: 'current_status', matchingScore: 'matching_score', matchingReason: 'matching_reason',
      appliedPosition: 'applied_position', matchDegree: 'match_degree', isInternalReferral: 'is_internal_referral',
      referralName: 'referral_name', aiSummary: 'ai_summary', isDuplicate: 'is_duplicate',
      isRehiredExEmployee: 'is_rehired_ex_employee',
    };

    for (const f of fields) {
      const key = dbFields[f] || f;
      if (body[f] !== undefined) updates[key] = body[f];
    }

    const { data: candidate, error } = await supabase
      .from('candidates')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    if (Array.isArray(body.recommendedJdIds)) {
      await supabase.from('candidate_jds').delete().eq('candidate_id', req.params.id).eq('is_recommended', true);
      for (const jdId of body.recommendedJdIds as string[]) {
        if (!jdId) continue;
        await supabase.from('candidate_jds').upsert(
          { candidate_id: req.params.id, jd_id: jdId, is_recommended: true },
          { onConflict: 'candidate_id,jd_id' }
        );
      }
    }
    if (Array.isArray(body.linkedJdIds)) {
      const links = body.linkedJdIds as { jdId: string; isRecommended?: boolean }[];
      await supabase.from('candidate_jds').delete().eq('candidate_id', req.params.id);
      for (const l of links) {
        const jdId = typeof l === 'object' && l !== null && 'jdId' in l ? l.jdId : String(l);
        if (!jdId) continue;
        await supabase.from('candidate_jds').insert({
          candidate_id: req.params.id,
          jd_id: jdId,
          is_recommended: typeof l === 'object' && l !== null && l.isRecommended === true,
        });
      }
    }

    const linkedJds = await fetchLinkedJds(req.params.id);
    res.json(mapRowToCandidate(candidate, linkedJds));
  } catch (err) {
    console.error('Candidate update error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 删除候选人
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.from('candidates').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    console.error('Candidate delete error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 子资源：测评记录
router.post('/:id/assessments', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const { data, error } = await supabase
      .from('assessment_records')
      .insert({
        candidate_id: req.params.id,
        type: body.type,
        date: body.date,
        status: body.status || '待完成',
        score: body.score ?? null,
        result: body.result || '',
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      id: data.id,
      date: data.date,
      status: data.status,
      score: data.score,
      type: data.type,
      result: data.result,
    });
  } catch (err) {
    console.error('Assessment create error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 子资源：面试记录
router.post('/:id/interviews', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const { data, error } = await supabase
      .from('interview_records')
      .insert({
        candidate_id: req.params.id,
        round: body.round,
        time: body.time,
        interviewer: body.interviewer,
        feedback: body.feedback,
        recommendation: body.recommendation,
        method: body.method,
        location: body.location,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      round: data.round,
      time: data.time,
      interviewer: data.interviewer,
      feedback: data.feedback,
      recommendation: data.recommendation,
    });
  } catch (err) {
    console.error('Interview create error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 子资源：背调记录
router.post('/:id/background', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const { data, error } = await supabase
      .from('background_records')
      .upsert({
        candidate_id: req.params.id,
        init_date: body.initDate,
        agency: body.agency,
        status: body.status || '进行中',
        conclusion: body.conclusion || '待确认',
        report_url: body.reportUrl || null,
      }, { onConflict: 'candidate_id' })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      initDate: data.init_date,
      agency: data.agency,
      status: data.status,
      conclusion: data.conclusion,
      reportUrl: data.report_url,
    });
  } catch (err) {
    console.error('Background create error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 子资源：Offer 记录
router.post('/:id/offer', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const { data, error } = await supabase
      .from('offer_records')
      .upsert({
        candidate_id: req.params.id,
        init_date: body.initDate,
        salary_structure: body.salaryStructure,
        status: body.status || '待确认',
        expected_join_date: body.expectedJoinDate,
      }, { onConflict: 'candidate_id' })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      initDate: data.init_date,
      salaryStructure: data.salary_structure,
      status: data.status,
      expectedJoinDate: data.expected_join_date,
    });
  } catch (err) {
    console.error('Offer create error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
