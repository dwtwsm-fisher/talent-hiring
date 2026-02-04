import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabase.js';

const router = Router();

// 获取所有员工账号（支持按状态和角色筛选）
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, role } = req.query as Record<string, string | undefined>;
    let query = supabase.from('user_accounts').select('*').order('created_at', { ascending: false });

    if (status?.trim()) {
      query = query.eq('status', status.trim());
    }
    if (role?.trim()) {
      query = query.eq('role', role.trim());
    }

    const { data, error } = await query;

    if (error) throw error;

    // 获取所有公司ID
    const companyIds = (data || []).map((row: any) => row.company_id).filter((id: any) => id != null);
    const companyMap = new Map<string, string>();
    
    if (companyIds.length > 0) {
      const { data: companies } = await supabase
        .from('data_dictionary')
        .select('id, name')
        .in('id', companyIds);
      
      (companies || []).forEach((c: any) => {
        companyMap.set(c.id, c.name);
      });
    }

    const users = (data || []).map((row: any) => ({
      id: row.id,
      username: row.username,
      name: row.name,
      role: row.role,
      status: row.status,
      description: row.description || '',
      companyId: row.company_id || null,
      companyName: row.company_id ? companyMap.get(row.company_id) || null : null,
      lastLogin: row.last_login ? new Date(row.last_login).toLocaleString('zh-CN') : '-',
    }));

    res.json(users);
  } catch (err) {
    console.error('Users list error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 获取启用的员工账号（用于下拉选择）
router.get('/enabled', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('id, name, role, description, company_id')
      .eq('status', '启用')
      .order('name');

    if (error) throw error;

    // 获取公司信息
    const companyIds = (data || []).map((r: any) => r.company_id).filter((id: any) => id != null);
    const companyMap = new Map<string, string>();
    
    if (companyIds.length > 0) {
      const { data: companies } = await supabase
        .from('data_dictionary')
        .select('id, name')
        .in('id', companyIds);
      
      (companies || []).forEach((c: any) => {
        companyMap.set(c.id, c.name);
      });
    }

    res.json((data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      description: r.description || '',
      companyName: r.company_id ? companyMap.get(r.company_id) || null : null,
    })));
  } catch (err) {
    console.error('Enabled users list error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 创建员工账号
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const insertPayload: Record<string, unknown> = {
      username: body.username,
      name: body.name,
      password_hash: body.passwordHash || null,
      role: body.role || '面试官',
      status: body.status || '启用',
      description: body.description || null,
    };
    if (body.companyId != null) {
      insertPayload.company_id = body.companyId;
    }

    const { data, error } = await supabase
      .from('user_accounts')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) throw error;

    // 查询公司名称
    let companyName = null;
    if (data.company_id) {
      const { data: company } = await supabase
        .from('data_dictionary')
        .select('name')
        .eq('id', data.company_id)
        .single();
      companyName = company?.name || null;
    }

    res.status(201).json({
      id: data.id,
      username: data.username,
      name: data.name,
      role: data.role,
      status: data.status,
      description: data.description || '',
      companyId: data.company_id || null,
      companyName,
      lastLogin: '-',
    });
  } catch (err) {
    console.error('User create error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 更新员工账号
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.name != null) updates.name = body.name;
    if (body.role != null) updates.role = body.role;
    if (body.status != null) updates.status = body.status;
    if (body.description != null) updates.description = body.description;
    if (body.passwordHash != null) updates.password_hash = body.passwordHash;
    if (body.companyId !== undefined) updates.company_id = body.companyId || null;

    const { data, error } = await supabase
      .from('user_accounts')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) throw error;

    // 查询公司名称
    let companyName = null;
    if (data.company_id) {
      const { data: company } = await supabase
        .from('data_dictionary')
        .select('name')
        .eq('id', data.company_id)
        .single();
      companyName = company?.name || null;
    }

    res.json({
      id: data.id,
      username: data.username,
      name: data.name,
      role: data.role,
      status: data.status,
      description: data.description || '',
      companyId: data.company_id || null,
      companyName,
      lastLogin: data.last_login ? new Date(data.last_login).toLocaleString('zh-CN') : '-',
    });
  } catch (err) {
    console.error('User update error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 删除员工账号
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.from('user_accounts').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    console.error('User delete error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
