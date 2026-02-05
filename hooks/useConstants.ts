import { useState, useEffect } from 'react';
import { api } from '../api/client';

interface DictItem {
  id: string;
  name: string;
}

interface EvaluationDimension {
  id: string;
  label: string;
}

interface Constants {
  evaluationDimensions: EvaluationDimension[];
  presetTags: string[];
  interviewStatuses: string[];
  interviewConclusions: string[];
  interviewMethods: string[];
  candidateStatuses: string[];
  userRoles: string[];
  userStatuses: string[];
  loaded: boolean;
}

/** 从数据库获取所有业务常量 */
export function useConstants() {
  const [constants, setConstants] = useState<Constants>({
    evaluationDimensions: [],
    presetTags: [],
    interviewStatuses: [],
    interviewConclusions: [],
    interviewMethods: [],
    candidateStatuses: [],
    userRoles: [],
    userStatuses: [],
    loaded: false,
  });

  useEffect(() => {
    Promise.all([
      // 评估维度：需要转换为 { id, label } 格式
      // 使用 name 的拼音首字母或索引作为 id，确保稳定性
      api.dict.evaluationDimensions()
        .then((items: DictItem[]) => items.map((item, idx) => {
          // 尝试从名称生成稳定的 id（如：专业技能 -> skills）
          const idMap: Record<string, string> = {
            '专业技能': 'skills',
            '沟通能力': 'comm',
            '团队合作': 'team',
            '学习能力': 'learning',
            '适应能力': 'adapt',
          };
          return {
            id: idMap[item.name] || `dim_${idx}`,
            label: item.name,
          };
        }))
        .catch(() => []),
      
      // 预设标签
      api.dict.presetTags()
        .then((items: DictItem[]) => items.map(item => item.name))
        .catch(() => []),
      
      // 面试状态
      api.dict.interviewStatuses()
        .then((items: DictItem[]) => items.map(item => item.name))
        .catch(() => []),
      
      // 面试结论
      api.dict.interviewConclusions()
        .then((items: DictItem[]) => items.map(item => item.name))
        .catch(() => []),
      
      // 面试方式
      api.dict.interviewMethods()
        .then((items: DictItem[]) => items.map(item => item.name))
        .catch(() => []),
      
      // 候选人状态
      api.dict.candidateStatuses()
        .then((items: DictItem[]) => items.map(item => item.name))
        .catch(() => []),
      
      // 用户角色
      api.dict.userRoles()
        .then((items: DictItem[]) => items.map(item => item.name))
        .catch(() => []),
      
      // 用户状态
      api.dict.userStatuses()
        .then((items: DictItem[]) => items.map(item => item.name))
        .catch(() => []),
    ]).then(([
      evaluationDimensions,
      presetTags,
      interviewStatuses,
      interviewConclusions,
      interviewMethods,
      candidateStatuses,
      userRoles,
      userStatuses,
    ]) => {
      setConstants({
        evaluationDimensions: evaluationDimensions as EvaluationDimension[],
        presetTags: presetTags as string[],
        interviewStatuses: interviewStatuses as string[],
        interviewConclusions: interviewConclusions as string[],
        interviewMethods: interviewMethods as string[],
        candidateStatuses: candidateStatuses as string[],
        userRoles: userRoles as string[],
        userStatuses: userStatuses as string[],
        loaded: true,
      });
    }).catch((err) => {
      console.error('Failed to load constants:', err);
      setConstants(prev => ({ ...prev, loaded: true }));
    });
  }, []);

  return constants;
}
