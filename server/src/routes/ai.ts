import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { config } from '../config/index.js';

const router = Router();

function getAIClient() {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY 未配置');
  }
  return new GoogleGenAI({ apiKey: config.geminiApiKey });
}

// AI 生成 JD
router.post('/generate-jd', async (req: Request, res: Response) => {
  try {
    const { title, department, location, salary, keywords } = req.body;

    if (!title) {
      return res.status(400).json({ error: '请提供岗位名称 (title)' });
    }

    const ai = getAIClient();
    const prompt = `你是一个专业的物业公司HR。请根据以下信息生成一份标准且吸引人的职位描述（JD）。
    岗位名称: ${title}
    部门: ${department || ''}
    工作地点: ${location || ''}
    薪资范围: ${salary || ''}
    核心关键词: ${keywords || ''}
    
    输出要求：
    1. 包含"岗位职责"和"任职要求"
    2. 语言互联网化，专业且简洁
    3. 结合物业管理行业特点
  `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const text = (response as { text?: string }).text ?? '';

    res.json({ text: text || 'AI 生成失败，请稍后重试。' });
  } catch (err) {
    console.error('AI generate JD error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// AI 提取简历标签（当前模拟，后续接入千问）
router.post('/extract-tags', async (req: Request, res: Response) => {
  try {
    const { skills, experiences, educations, aiSummary, appliedPosition } = req.body;

    // 模拟：基于简历内容提取标签
    const text = [
      Array.isArray(skills) ? skills.join(' ') : '',
      aiSummary || '',
      appliedPosition || '',
      Array.isArray(experiences)
        ? experiences.map((e: { company?: string; role?: string; details?: string }) =>
            [e.company, e.role, e.details].filter(Boolean).join(' ')
          ).join(' ')
        : '',
      Array.isArray(educations)
        ? educations.map((e: { degree?: string; major?: string; school?: string }) =>
            [e.degree, e.major, e.school].filter(Boolean).join(' ')
          ).join(' ')
        : '',
    ].join(' ').toLowerCase();

    const tagKeywords: Record<string, string[]> = {
      物业经验: ['物业', '小区', '社区', '物业管理'],
      业主关系: ['业主', '客户', '关系', '满意度'],
      危机处理: ['危机', '应急', '突发事件', '抢修'],
      成本控制: ['成本', '预算', '节约'],
      团队管理: ['团队', '管理', '主管', '经理'],
      客服能力: ['客服', '接待', '投诉', '咨询'],
      持电工证: ['电工', '电工证', '电气'],
      持特种设备证: ['特种设备', '电梯', '维保'],
      内推: ['内推'],
      重点培养: ['重点', '培养', '潜质'],
      大型社区经验: ['大型', '1000', '户以上', '高端社区'],
      设施维护: ['设施', '维护', '维修', '保养'],
      合规意识: ['合规', '法规', '标准'],
      沟通协调: ['沟通', '协调', '协作'],
      应急响应: ['应急', '响应', '抢修'],
      星级物业背景: ['星级', '万科', '龙湖', '绿城', '碧桂园'],
      项目管理: ['项目', '管理'],
    };

    const suggested = Object.entries(tagKeywords)
      .filter(([, kws]) => kws.some((kw) => text.includes(kw)))
      .map(([tag]) => tag);

    // 若无匹配则返回常用标签
    const fallback = ['物业经验', '沟通协调', '团队管理'];
    const tags = suggested.length > 0 ? suggested : fallback;

    res.json({ tags });
  } catch (err) {
    console.error('AI extract tags error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// AI 简历摘要
router.post('/summarize-resume', async (req: Request, res: Response) => {
  try {
    const { resumeText } = req.body;

    if (!resumeText) {
      return res.status(400).json({ error: '请提供简历内容 (resumeText)' });
    }

    const ai = getAIClient();
    const prompt = `请用一句话总结以下物业管理行业候选人的核心亮点和潜在风险：\n${resumeText}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const text = (response as { text?: string }).text ?? '';

    res.json({ text: text || '无法生成摘要' });
  } catch (err) {
    console.error('AI summarize resume error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
