import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabase.js';

const router = Router();

// 按类型获取数据字典列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    let query = supabase.from('data_dictionary').select('*').order('sort_order');

    const validTypes = ['company', 'location', 'education_level', 'work_year', 'salary_range', 'resume_tag'];
    if (type && validTypes.includes(type as string)) {
      query = query.eq('dict_type', type);
    }

    const { data, error } = await query;

    if (error) throw error;

    const items = (data || []).map((row) => ({
      id: row.id,
      dictType: row.dict_type,
      name: row.name,
      sortOrder: row.sort_order,
    }));

    res.json(items);
  } catch (err) {
    console.error('Dict list error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 获取公司列表
router.get('/companies', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('data_dictionary')
      .select('*')
      .eq('dict_type', 'company')
      .order('sort_order');

    if (error) throw error;

    res.json((data || []).map((r) => ({ id: r.id, name: r.name })));
  } catch (err) {
    console.error('Companies list error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 获取学历要求列表
router.get('/education-levels', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('data_dictionary')
      .select('*')
      .eq('dict_type', 'education_level')
      .order('sort_order');
    if (error) throw error;
    res.json((data || []).map((r) => ({ id: r.id, name: r.name })));
  } catch (err) {
    console.error('Education levels list error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 获取工作年限列表
router.get('/work-years', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('data_dictionary')
      .select('*')
      .eq('dict_type', 'work_year')
      .order('sort_order');
    if (error) throw error;
    res.json((data || []).map((r) => ({ id: r.id, name: r.name })));
  } catch (err) {
    console.error('Work years list error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 获取薪资范围建议列表
router.get('/salary-ranges', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('data_dictionary')
      .select('*')
      .eq('dict_type', 'salary_range')
      .order('sort_order');
    if (error) throw error;
    res.json((data || []).map((r) => ({ id: r.id, name: r.name })));
  } catch (err) {
    console.error('Salary ranges list error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 获取简历标签建议列表
router.get('/resume-tags', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('data_dictionary')
      .select('*')
      .eq('dict_type', 'resume_tag')
      .order('sort_order');
    if (error) throw error;
    res.json((data || []).map((r) => ({ id: r.id, name: r.name })));
  } catch (err) {
    console.error('Resume tags list error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 获取工作地点列表
router.get('/locations', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('data_dictionary')
      .select('*')
      .eq('dict_type', 'location')
      .order('sort_order');

    if (error) throw error;

    res.json((data || []).map((r) => ({ id: r.id, name: r.name })));
  } catch (err) {
    console.error('Locations list error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 新增
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (!body.dictType || !body.name) {
      return res.status(400).json({ error: 'dictType 和 name 为必填项' });
    }

    const validTypes = ['company', 'location', 'education_level', 'work_year', 'salary_range', 'resume_tag'];
    if (!validTypes.includes(body.dictType)) {
      return res.status(400).json({ error: `dictType 必须是: ${validTypes.join(', ')}` });
    }

    const { data, error } = await supabase
      .from('data_dictionary')
      .insert({
        dict_type: body.dictType,
        name: body.name,
        sort_order: body.sortOrder ?? 0,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      id: data.id,
      dictType: data.dict_type,
      name: data.name,
      sortOrder: data.sort_order,
    });
  } catch (err) {
    console.error('Dict create error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 更新
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.sortOrder !== undefined) updates.sort_order = body.sortOrder;

    const { data, error } = await supabase
      .from('data_dictionary')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      id: data.id,
      dictType: data.dict_type,
      name: data.name,
      sortOrder: data.sort_order,
    });
  } catch (err) {
    console.error('Dict update error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 删除
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.from('data_dictionary').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    console.error('Dict delete error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
