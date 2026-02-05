import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabase.js';
import { getDictDefault, getDictValue } from '../utils/dict.js';

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
    city: row.city,
    workYears: row.work_years,
    expectedSalary: row.expected_salary,
    jobStatusDesc: row.job_status_desc,
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
      // 从数据库获取"已淘汰"状态值，禁止硬编码
      const rejectedStatus = await getDictValue('candidate_status', '已淘汰');
      query = query.neq('current_status', rejectedStatus);
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
          id: i.id,
          round: i.round,
          time: i.time,
          interviewer: i.interviewer,
          feedback: i.feedback,
          recommendation: i.recommendation,
          method: i.method,
          location: i.location,
          status: i.status,
          conclusion: i.conclusion,
          ratings: i.ratings || undefined,
          tags: i.tags || undefined,
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
      id: i.id,
      round: i.round,
      time: i.time,
      interviewer: i.interviewer,
      feedback: i.feedback,
      recommendation: i.recommendation,
      method: i.method,
      location: i.location,
      status: i.status,
      conclusion: i.conclusion,
      ratings: i.ratings || undefined,
      tags: i.tags || undefined,
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

// Boss 直聘 geek 报文单条 -> 本系统 candidate + experiences + education
// defaultStatus: 必须从数据库获取，禁止硬编码
function mapBossGeekToCandidate(geek: Record<string, unknown>, defaultStatus: string) {
  const card = (geek.geekCard || geek) as Record<string, unknown>;
  const name = (card.name ?? geek.name ?? '') as string;
  const genderNum = (card.gender ?? 0) as number;
  const gender = genderNum === 1 ? '女' : '男';
  const ageDesc = (geek.ageDesc ?? card.ageDesc ?? '') as string;
  const ageMatch = ageDesc.match(/(\d+)/);
  const age = ageMatch ? parseInt(ageMatch[1], 10) : 0;
  const headUrl = (card.headUrl ?? '') as string;
  const geekDesc = (card.geekDesc as Record<string, unknown>) || {};
  const aiSummary = (geekDesc.name ?? card.geekDesc ?? '') as string;
  const expect = (card.expect as Record<string, unknown>) || {};
  const current = (card.current as Record<string, unknown>) || {};
  let appliedPosition = ((expect.name ?? current.name ?? '') as string).trim();
  if (!appliedPosition && (current.name as string)) {
    const parts = (current.name as string).split(/[·\s]/);
    appliedPosition = parts[parts.length - 1] || (current.name as string);
  }
  if (!appliedPosition) appliedPosition = '未知';
  const tags = (card.matches || []) as string[];
  const encryptGeekId = (card.encryptGeekId ?? '') as string;
  const city = (card.city ?? '') as string;
  const workYears = (card.workYear ?? '') as string;
  const expectedSalary = (card.salary ?? '') as string;
  const jobStatusDesc = (geek.applyStatusDesc ?? '') as string;

  const experiences: { company: string; role: string; duration: string; details: string; highlights: string[] }[] = [];
  const worksTop = (geek.works || []) as Array<{ company?: { value?: string }; position?: { value?: string } }>;
  const workList = (card.workList || card.works || []) as Array<{ name?: string; dateRange?: string }>;
  const cardFields = (geek.cardFields || card.cardFields || []) as Array<{ kind?: string; dateRange?: string }>;
  const workDurations = cardFields.filter((c: { kind?: string }) => c.kind === 'WORK' || c.kind === 'MATCH_WORK').map((c: { dateRange?: string }) => (c.dateRange ?? '') as string);
  const toDetails = (c: string, r: string, d: string) =>
    d ? `在${c}担任${r}，任职时间${d}。` : `在${c}担任${r}。`;

  if (worksTop.length > 0) {
    worksTop.forEach((w, i) => {
      const company = (w.company?.value ?? '').trim() || '未知';
      const role = (w.position?.value ?? '').trim() || '未知';
      const duration = workDurations[i] ?? workList[i]?.dateRange ?? '';
      experiences.push({ company, role, duration, details: toDetails(company, role, duration), highlights: [] });
    });
  } else if (workList.length > 0) {
    workList.forEach((w, i) => {
      const raw = (w.name ?? '').toString();
      const sep = raw.includes('|') ? '|' : '·';
      const parts = raw.split(sep).map((s) => s.trim());
      const role = parts[0] || '未知';
      const company = parts[1] || parts[0] || '未知';
      const duration = (w.dateRange ?? workDurations[i] ?? '') as string;
      experiences.push({ company, role, duration, details: toDetails(company, role, duration), highlights: [] });
    });
  }

  const eduSchool = (card.eduSchool ?? '') as string;
  const eduMajor = (card.eduMajor ?? '') as string;
  const degree = (card.highestDegreeName ?? '') as string;
  const education = {
    school: eduSchool || '未知',
    major: eduMajor || '未知',
    degree: degree || '未知',
    duration: '',
  };

  return {
    candidate: {
      name: name || '未知',
      avatar: headUrl || null,
      age: Math.max(0, age),
      gender,
      phone: '待补充',
      email: '待补充',
      current_status: defaultStatus,
      matching_score: 0,
      matching_reason: null,
      skills: [],
      applied_position: appliedPosition,
      match_degree: '中',
      source: 'Boss直聘',
      is_internal_referral: false,
      referral_name: null,
      ai_summary: aiSummary || '',
      is_duplicate: false,
      is_rehired_ex_employee: false,
      tags,
      city: city || null,
      work_years: workYears || null,
      expected_salary: expectedSalary || null,
      job_status_desc: jobStatusDesc || null,
      external_source: encryptGeekId ? 'boss_zhipin' : null,
      external_id: encryptGeekId || null,
    },
    experiences,
    education,
  };
}

// 简历导入（Boss 直聘报文，支持单条或批量；按 external_id 去重）
router.post('/import', async (req: Request, res: Response) => {
  try {
    // 从数据库获取默认状态值，禁止硬编码
    const defaultStatus = await getDictDefault('candidate_status');
    
    const body = req.body;
    let geeks: Record<string, unknown>[] = [];
    if (body && body.zpData && Array.isArray((body.zpData as { geeks?: unknown[] }).geeks)) {
      geeks = (body.zpData as { geeks: Record<string, unknown>[] }).geeks;
    } else if (body && Array.isArray(body.geeks)) {
      geeks = body.geeks;
    } else if (Array.isArray(body)) {
      geeks = body;
    }
    const details: { index: number; name: string; status: 'created' | 'skipped' | 'error'; id?: string; error?: string }[] = [];
    let imported = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < geeks.length; i++) {
      const geek = geeks[i];
      const name = ((geek.geekCard || geek) as Record<string, unknown>).name as string || '未知';
      try {
        const { candidate, experiences, education } = mapBossGeekToCandidate(geek, defaultStatus);
        let skipDedup = false;
        if (candidate.external_source && candidate.external_id) {
          const { data: existing, error: dedupErr } = await supabase
            .from('candidates')
            .select('id')
            .eq('external_source', candidate.external_source)
            .eq('external_id', candidate.external_id)
            .maybeSingle();
          if (dedupErr && (dedupErr.message?.includes('external') || dedupErr.code === 'PGRST204')) {
            skipDedup = true;
          } else if (existing) {
            skipped++;
            details.push({ index: i, name, status: 'skipped' });
            continue;
          }
        }
        const insertPayload: Record<string, unknown> = {
          name: candidate.name,
          avatar: candidate.avatar,
          age: candidate.age,
          gender: candidate.gender,
          phone: candidate.phone,
          email: candidate.email,
          current_status: candidate.current_status,
          matching_score: candidate.matching_score,
          matching_reason: candidate.matching_reason,
          skills: candidate.skills,
          applied_position: candidate.applied_position,
          match_degree: candidate.match_degree,
          source: candidate.source,
          city: candidate.city,
          work_years: candidate.work_years,
          expected_salary: candidate.expected_salary,
          job_status_desc: candidate.job_status_desc,
          is_internal_referral: candidate.is_internal_referral,
          referral_name: candidate.referral_name,
          ai_summary: candidate.ai_summary,
          is_duplicate: candidate.is_duplicate,
          is_rehired_ex_employee: candidate.is_rehired_ex_employee,
          tags: candidate.tags,
        };
        if (!skipDedup && candidate.external_source != null && candidate.external_id != null) {
          insertPayload.external_source = candidate.external_source;
          insertPayload.external_id = candidate.external_id;
        }
        const { data: inserted, error: insertErr } = await supabase
          .from('candidates')
          .insert(insertPayload)
          .select('id')
          .single();
        if (insertErr) throw insertErr;
        const candidateId = inserted.id;
        if (experiences.length) {
          await supabase.from('experiences').insert(
            experiences.map((e, idx) => ({
              candidate_id: candidateId,
              company: e.company,
              role: e.role,
              duration: e.duration,
              details: e.details,
              highlights: e.highlights || [],
              sort_order: idx,
            }))
          );
        }
        if (education.school || education.major || education.degree) {
          await supabase.from('educations').insert({
            candidate_id: candidateId,
            school: education.school,
            major: education.major,
            degree: education.degree,
            duration: education.duration,
            sort_order: 0,
          });
        }
        imported++;
        details.push({ index: i, name, status: 'created', id: candidateId });
      } catch (err) {
        failed++;
        details.push({ index: i, name, status: 'error', error: (err as Error).message });
      }
    }

    res.status(200).json({ imported, skipped, failed, details });
  } catch (err) {
    console.error('Candidates import error:', err);
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
        current_status: body.currentStatus || await getDictDefault('candidate_status'),
        matching_score: body.matchingScore ?? 0,
        matching_reason: body.matchingReason || null,
        skills: body.skills || [],
        applied_position: body.appliedPosition,
        match_degree: body.matchDegree || '中',
        source: body.source || '未知',
        city: body.city ?? null,
        work_years: body.workYears ?? null,
        expected_salary: body.expectedSalary ?? null,
        job_status_desc: body.jobStatusDesc ?? null,
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
      'skills', 'appliedPosition', 'matchDegree', 'source', 'city', 'workYears', 'expectedSalary', 'jobStatusDesc',
      'isInternalReferral', 'referralName', 'aiSummary', 'isDuplicate',
      'isRehiredExEmployee', 'tags',
    ];
    const dbFields: Record<string, string> = {
      currentStatus: 'current_status', matchingScore: 'matching_score', matchingReason: 'matching_reason',
      appliedPosition: 'applied_position', matchDegree: 'match_degree', isInternalReferral: 'is_internal_referral',
      referralName: 'referral_name', aiSummary: 'ai_summary', isDuplicate: 'is_duplicate',
      isRehiredExEmployee: 'is_rehired_ex_employee',
      workYears: 'work_years', expectedSalary: 'expected_salary', jobStatusDesc: 'job_status_desc',
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

// 子资源：面试记录（支持 status/conclusion/ratings/tags）
router.post('/:id/interviews', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const recommendation = body.recommendation ?? (body.conclusion === '通过' ? '推进' : body.conclusion === '淘汰' ? '淘汰' : '待定');
    const insertPayload: Record<string, unknown> = {
      candidate_id: req.params.id,
      round: body.round ?? 1,
      time: body.time ?? '',
      interviewer: body.interviewer ?? '',
      feedback: body.feedback ?? '',
      recommendation,
      method: body.method ?? null,
      location: body.location ?? null,
    };
    if (body.status != null) insertPayload.status = body.status;
    if (body.conclusion != null) insertPayload.conclusion = body.conclusion;
    if (body.ratings != null) insertPayload.ratings = body.ratings;
    if (body.tags != null) insertPayload.tags = body.tags;

    const { data, error } = await supabase
      .from('interview_records')
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw error;

    // 查询公司名称
    let companyName = null;
    if (data.interviewer) {
      // 如果面试官名称匹配员工账号，可以获取公司信息
      // 这里简化处理，不查询公司信息
    }

    res.status(201).json({
      id: data.id,
      round: data.round,
      time: data.time,
      interviewer: data.interviewer,
      feedback: data.feedback,
      recommendation: data.recommendation,
      method: data.method,
      location: data.location,
      status: data.status,
      conclusion: data.conclusion,
      ratings: data.ratings,
      tags: data.tags,
    });
  } catch (err) {
    console.error('Interview create error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 更新面试记录
router.put('/:id/interviews/:interviewId', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const updates: Record<string, unknown> = {};

    if (body.round != null) updates.round = body.round;
    if (body.time != null) updates.time = body.time;
    if (body.interviewer != null) updates.interviewer = body.interviewer;
    if (body.feedback != null) updates.feedback = body.feedback;
    if (body.method != null) updates.method = body.method;
    if (body.location !== undefined) updates.location = body.location;
    if (body.status != null) updates.status = body.status;
    if (body.conclusion != null) updates.conclusion = body.conclusion;
    if (body.recommendation != null) updates.recommendation = body.recommendation;
    if (body.ratings != null) updates.ratings = body.ratings;
    if (body.tags != null) updates.tags = body.tags;

    const { data, error } = await supabase
      .from('interview_records')
      .update(updates)
      .eq('id', req.params.interviewId)
      .eq('candidate_id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      id: data.id,
      round: data.round,
      time: data.time,
      interviewer: data.interviewer,
      feedback: data.feedback,
      recommendation: data.recommendation,
      method: data.method,
      location: data.location,
      status: data.status,
      conclusion: data.conclusion,
      ratings: data.ratings,
      tags: data.tags,
    });
  } catch (err) {
    console.error('Interview update error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 删除面试记录
router.delete('/:id/interviews/:interviewId', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from('interview_records')
      .delete()
      .eq('id', req.params.interviewId)
      .eq('candidate_id', req.params.id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    console.error('Interview delete error:', err);
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
