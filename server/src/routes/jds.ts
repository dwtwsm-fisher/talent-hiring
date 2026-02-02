import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabase.js';

const router = Router();

// 获取所有 JD
router.get('/', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('jds')
      .select('*')
      .order('create_time', { ascending: false });

    if (error) throw error;

    const jds = (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      department: row.department,
      company: row.company,
      location: row.location,
      salary: row.salary,
      priority: row.priority,
      status: row.status,
      createTime: row.create_time,
      description: row.description,
      requirements: row.requirements || [],
      educationRequirement: row.education_requirement,
      experienceRequirement: row.experience_requirement,
    }));

    res.json(jds);
  } catch (err) {
    console.error('JD list error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 获取单个 JD
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('jds')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'JD not found' });

    res.json({
      id: data.id,
      title: data.title,
      department: data.department,
      company: data.company,
      location: data.location,
      salary: data.salary,
      priority: data.priority,
      status: data.status,
      createTime: data.create_time,
      description: data.description,
      requirements: data.requirements || [],
      educationRequirement: data.education_requirement,
      experienceRequirement: data.experience_requirement,
    });
  } catch (err) {
    console.error('JD get error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 创建 JD
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const { data, error } = await supabase
      .from('jds')
      .insert({
        title: body.title,
        department: body.department,
        company: body.company || null,
        location: body.location,
        salary: body.salary,
        priority: body.priority || '普通',
        status: body.status || '草稿',
        create_time: body.createTime || new Date().toISOString().slice(0, 10),
        description: body.description || '',
        requirements: body.requirements || [],
        education_requirement: body.educationRequirement || null,
        experience_requirement: body.experienceRequirement || null,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      id: data.id,
      title: data.title,
      department: data.department,
      company: data.company,
      location: data.location,
      salary: data.salary,
      priority: data.priority,
      status: data.status,
      createTime: data.create_time,
      description: data.description,
      requirements: data.requirements || [],
      educationRequirement: data.education_requirement,
      experienceRequirement: data.experience_requirement,
    });
  } catch (err) {
    console.error('JD create error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 更新 JD
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.title !== undefined) updates.title = body.title;
    if (body.department !== undefined) updates.department = body.department;
    if (body.company !== undefined) updates.company = body.company;
    if (body.location !== undefined) updates.location = body.location;
    if (body.salary !== undefined) updates.salary = body.salary;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.status !== undefined) updates.status = body.status;
    if (body.description !== undefined) updates.description = body.description;
    if (body.requirements !== undefined) updates.requirements = body.requirements;
    if (body.educationRequirement !== undefined) updates.education_requirement = body.educationRequirement;
    if (body.experienceRequirement !== undefined) updates.experience_requirement = body.experienceRequirement;

    const { data, error } = await supabase
      .from('jds')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      id: data.id,
      title: data.title,
      department: data.department,
      company: data.company,
      location: data.location,
      salary: data.salary,
      priority: data.priority,
      status: data.status,
      createTime: data.create_time,
      description: data.description,
      requirements: data.requirements || [],
      educationRequirement: data.education_requirement,
      experienceRequirement: data.experience_requirement,
    });
  } catch (err) {
    console.error('JD update error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 删除 JD
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.from('jds').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    console.error('JD delete error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
