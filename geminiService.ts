import { api } from './api/client';

export const generateJD = async (params: {
  title: string;
  department: string;
  location: string;
  salary: string;
  keywords: string;
}) => {
  try {
    const res = await api.ai.generateJD(params);
    return res.text;
  } catch (error) {
    console.error('AI Generation Error:', error);
    return 'AI 生成失败，请稍后重试或手动输入。';
  }
};

export const summarizeResume = async (resumeText: string) => {
  try {
    const res = await api.ai.summarizeResume(resumeText);
    return res.text;
  } catch (error) {
    console.error('AI Summarize Error:', error);
    return '无法生成摘要';
  }
};
