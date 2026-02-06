import React, { useState, useEffect, useMemo } from 'react';
import { Candidate, InterviewRecord, CandidateStatus } from '../types';
import { api } from '../api/client';
import { useConstants } from '../hooks/useConstants';
import { useCandidateRefresh } from '../hooks/useCandidateRefresh';

type InterviewStatus = '待面试' | '面试中' | '已完成' | '已取消';

interface EnhancedInterview extends InterviewRecord {
  id?: string;
  candidateId: string;
  status?: InterviewStatus | string | null;
  method?: '视频' | '现场' | string | null;
  location?: string | null;
  ratings?: Record<string, number>;
  conclusion?: string | null;
  tags?: string[];
}

export const InterviewManager: React.FC = () => {
  // 从数据库加载常量
  const constants = useConstants();
  const EVALUATION_DIMENSIONS = constants.evaluationDimensions;
  const PRESET_TAGS = constants.presetTags;
  const INTERVIEW_METHODS = constants.interviewMethods;
  const INTERVIEW_CONCLUSIONS = constants.interviewConclusions;
  
  // 复用 Hook：候选人数据刷新
  const { refreshCandidate, refreshInterviewCandidateList } = useCandidateRefresh();
  
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]); // 存储所有候选人（未筛选）
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // 筛选条件状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('全部状态');
  const [filterDate, setFilterDate] = useState('');


  useEffect(() => {
    // 使用复用 Hook 刷新候选人列表
    refreshInterviewCandidateList().then(setAllCandidates).catch(console.error);
    // 加载启用的员工账号列表
    api.users.getEnabled().then(setEnabledUsers).catch(console.error);
  }, [refreshInterviewCandidateList]);

  // 实时筛选逻辑（使用 useMemo 自动响应筛选条件变化）
  const filteredCandidates = useMemo(() => {
    let filtered = [...allCandidates];
    
    // 应用搜索关键词筛选（搜索候选人、面试官、岗位）
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.trim().toLowerCase();
      filtered = filtered.filter((candidate) => {
        // 搜索候选人姓名
        if (candidate.name.toLowerCase().includes(keyword)) return true;
        
        // 搜索岗位
        if (candidate.appliedPosition.toLowerCase().includes(keyword)) return true;
        
        // 搜索面试官（在面试记录中）
        if (candidate.interviewHistory?.some((i) => 
          i.interviewer && i.interviewer.toLowerCase().includes(keyword)
        )) return true;
        
        return false;
      });
    }
    
    // 应用状态筛选（仅基于候选人的当前状态，与显示的标签一致）
    if (filterStatus !== '全部状态') {
      filtered = filtered.filter((candidate) => {
        // 直接匹配候选人的当前状态
        return candidate.currentStatus === filterStatus;
      });
    }
    
    // 应用时间筛选（基于候选人的面试记录时间）
    if (filterDate) {
      const filterDateObj = new Date(filterDate);
      const filterYear = filterDateObj.getFullYear();
      const filterMonth = filterDateObj.getMonth();
      const filterDay = filterDateObj.getDate();
      
      filtered = filtered.filter((candidate) => {
        return candidate.interviewHistory?.some((i) => {
          if (!i.time || i.time === '待定') return false;
          try {
            const interviewDate = new Date(i.time.replace(/-/g, '/'));
            return interviewDate.getFullYear() === filterYear &&
                   interviewDate.getMonth() === filterMonth &&
                   interviewDate.getDate() === filterDay;
          } catch (e) {
            return false;
          }
        }) || false;
      });
    }
    
    return filtered;
  }, [allCandidates, searchKeyword, filterStatus, filterDate]);

  // 当筛选结果变化时，更新 candidates 状态并处理选中候选人
  useEffect(() => {
    setCandidates(filteredCandidates);
    
    // 如果当前选中的候选人不在筛选结果中，选择第一个
    if (filteredCandidates.length > 0) {
      const currentSelectedId = selectedCandidate?.id;
      const stillSelected = filteredCandidates.find((c) => c.id === currentSelectedId);
      if (!stillSelected) {
        setSelectedCandidate(filteredCandidates[0]);
      }
    } else {
      setSelectedCandidate(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCandidates]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [activeTab, setActiveTab] = useState<'record' | 'input' | 'schedule' | 'resume'>('record');
  // 初始化状态值从数据库常量获取
  const [localConclusion, setLocalConclusion] = useState<string>(constants.interviewConclusions[0] || '通过');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 发起面试（新建面试安排）表单状态
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleRound, setScheduleRound] = useState<number>(1);
  const [scheduleInterviewer, setScheduleInterviewer] = useState('');
  const [scheduleMethod, setScheduleMethod] = useState<string>(constants.interviewMethods[0] || '现场');
  const [scheduleLocation, setScheduleLocation] = useState('');
  const [scheduleRemarks, setScheduleRemarks] = useState('');
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [enabledUsers, setEnabledUsers] = useState<{ id: string; name: string; role: string; description: string }[]>([]);

  // 录入面试信息表单状态
  const [inputDate, setInputDate] = useState('');
  const [inputRound, setInputRound] = useState<number>(1);
  const [inputInterviewer, setInputInterviewer] = useState('');
  const [inputMethod, setInputMethod] = useState<string>(constants.interviewMethods[0] || '现场');
  const [inputLocation, setInputLocation] = useState('');
  const [inputRemarks, setInputRemarks] = useState('');
  const [detailedFeedback, setDetailedFeedback] = useState('');
  // 动态初始化 ratings 基于评估维度
  const initialRatings = useMemo(() => {
    const ratingsObj: Record<string, number> = {};
    EVALUATION_DIMENSIONS.forEach(dim => {
      ratingsObj[dim.id] = 0;
    });
    return ratingsObj;
  }, [EVALUATION_DIMENSIONS]);
  const [ratings, setRatings] = useState<Record<string, number>>(initialRatings);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');

  // 辅助函数：检查是否有面试结论（只要conclusion存在且非空，就认为有结论）
  const hasInterviewConclusion = (interview: { conclusion?: string | null; recommendation?: string | null }): boolean => {
    // 检查 conclusion 字段（新格式）
    if (interview.conclusion) {
      if (typeof interview.conclusion === 'string' && interview.conclusion.trim() !== '') {
        return true;
      }
    }
    
    // 检查 recommendation 字段（旧格式或兼容格式）
    // 只有"推进"或"淘汰"算是有结论，"待定"不算有结论
    if (interview.recommendation) {
      if (typeof interview.recommendation === 'string') {
        const rec = interview.recommendation.trim();
        // 只有"推进"或"淘汰"算是有结论
        if (rec === '推进' || rec === '淘汰') {
          return true;
        }
      }
    }
    
    return false;
  };

  // 从 API 返回的 interviewHistory 构建展示列表
  // 只显示有面试结论的记录，并避免重复展示，同时应用筛选条件
  const candidateInterviews = useMemo((): EnhancedInterview[] => {
    if (!selectedCandidate?.interviewHistory?.length) return [];
    
    // 过滤：只显示有结论的记录（包括 conclusion 字段或 recommendation 为"推进"/"淘汰"的记录）
    let filtered = selectedCandidate.interviewHistory.filter((i) => 
      hasInterviewConclusion(i)
    );
    
    // 应用状态筛选
    if (filterStatus !== '全部状态') {
      filtered = filtered.filter((i) => {
        const status = i.status || '已完成';
        return status === filterStatus;
      });
    }
    
    // 应用时间筛选
    if (filterDate) {
      const filterDateObj = new Date(filterDate);
      const filterYear = filterDateObj.getFullYear();
      const filterMonth = filterDateObj.getMonth();
      const filterDay = filterDateObj.getDate();
      
      filtered = filtered.filter((i) => {
        if (!i.time || i.time === '待定') return false;
        try {
          const interviewDate = new Date(i.time.replace(/-/g, '/'));
          return interviewDate.getFullYear() === filterYear &&
                 interviewDate.getMonth() === filterMonth &&
                 interviewDate.getDate() === filterDay;
        } catch (e) {
          return false;
        }
      });
    }
    
    if (!filtered.length) return [];
    
    // 去重：基于 id 优先，如果没有 id 则基于 round + time 组合
    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();
    const uniqueInterviews: EnhancedInterview[] = [];
    
    for (const i of filtered) {
      // 如果有 id，使用 id 去重
      if (i.id) {
        if (seenIds.has(i.id)) continue;
        seenIds.add(i.id);
      } else {
        // 如果没有 id，使用 round + time 组合去重
        const key = `${i.round}-${i.time}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
      }
      
      // 处理结论字段：优先使用 conclusion，如果没有则根据 recommendation 转换
      let finalConclusion = i.conclusion;
      if (!finalConclusion && i.recommendation) {
        // 将 recommendation 转换为 conclusion 格式
        if (i.recommendation === '推进') {
          finalConclusion = '通过';
        } else if (i.recommendation === '淘汰') {
          finalConclusion = '淘汰';
        }
        // "待定" 不转换，保持 undefined
      }
      
      uniqueInterviews.push({
        ...i,
        id: i.id,
        candidateId: selectedCandidate.id,
        status: (i.status as InterviewStatus) ?? '已完成',
        method: (i.method as '视频' | '现场') ?? '现场',
        location: i.location ?? undefined,
        ratings: i.ratings,
        conclusion: finalConclusion ?? undefined,
        tags: i.tags ?? [],
      });
    }
    
    // 按轮次和时间排序（轮次优先，同轮次内按时间倒序）
    return uniqueInterviews.sort((a, b) => {
      // 先按轮次排序
      if (a.round !== b.round) {
        return a.round - b.round;
      }
      // 同轮次内按时间倒序（最新的在前）
      try {
        const timeA = new Date(a.time.replace(/-/g, '/')).getTime();
        const timeB = new Date(b.time.replace(/-/g, '/')).getTime();
        return timeB - timeA;
      } catch (e) {
        return 0;
      }
    });
  }, [selectedCandidate?.id, selectedCandidate?.interviewHistory, filterStatus, filterDate]);

  // 获取最近的面试安排（只显示没有面试结论的记录）
  const latestSchedule = useMemo((): EnhancedInterview | null => {
    if (!selectedCandidate?.interviewHistory?.length) return null;
    
    const schedules = selectedCandidate.interviewHistory
      .filter((i) => {
        // 优先检查：如果已经录入过面试结论，则不显示（无论状态如何）
        if (hasInterviewConclusion(i)) return false;
        
        // 显示所有没有结论的记录（不限制状态）
        return true;
      })
      .sort((a, b) => {
        // 按时间排序，最新的在前
        // 如果时间为"待定"则排在最后
        if (a.time === '待定' && b.time !== '待定') return 1;
        if (a.time !== '待定' && b.time === '待定') return -1;
        if (a.time === '待定' && b.time === '待定') return 0;
        
        try {
          const timeA = new Date(a.time.replace(/-/g, '/')).getTime();
          const timeB = new Date(b.time.replace(/-/g, '/')).getTime();
          return timeB - timeA;
        } catch (e) {
          return 0;
        }
      });
    if (schedules.length === 0) return null;
    const latest = schedules[0];
    return {
      ...latest,
      id: latest.id,
      candidateId: selectedCandidate.id,
      status: (latest.status as InterviewStatus) || '待面试',
      method: (latest.method as '视频' | '现场') ?? '现场',
      location: latest.location ?? undefined,
    };
  }, [selectedCandidate?.id, selectedCandidate?.interviewHistory]);

  // 获取所有面试安排（只显示没有面试结论的记录）
  const scheduledInterviews = useMemo((): EnhancedInterview[] => {
    if (!selectedCandidate?.interviewHistory?.length) return [];
    
    const filtered = selectedCandidate.interviewHistory
      .filter((i) => {
        // 优先检查：如果已经录入过面试结论，则不显示（无论状态如何）
        const hasConclusion = hasInterviewConclusion(i);
        if (hasConclusion) {
          return false;
        }
        
        // 显示所有没有结论的记录（包括待面试、面试中等状态）
        // 不限制状态，只要没有结论就显示
        return true;
      })
      .map((i) => ({
        ...i,
        id: i.id,
        candidateId: selectedCandidate.id,
        status: (i.status as InterviewStatus) || '待面试',
        method: (i.method as '视频' | '现场') ?? '现场',
        location: i.location ?? undefined,
      }))
      .sort((a, b) => {
        // 按时间排序，如果时间为"待定"则排在最后
        if (a.time === '待定' && b.time !== '待定') return 1;
        if (a.time !== '待定' && b.time === '待定') return -1;
        if (a.time === '待定' && b.time === '待定') return 0;
        
        try {
          const timeA = new Date(a.time.replace(/-/g, '/')).getTime();
          const timeB = new Date(b.time.replace(/-/g, '/')).getTime();
          return timeA - timeB; // 按时间升序
        } catch (e) {
          return 0;
        }
      });
    
    return filtered;
  }, [selectedCandidate?.id, selectedCandidate?.interviewHistory]);

  // 切换候选人时默认下一轮
  useEffect(() => {
    if (!selectedCandidate?.interviewHistory?.length) {
      setInputRound(1);
      setScheduleRound(1);
      return;
    }
    const maxRound = Math.max(...selectedCandidate.interviewHistory.map((i) => i.round));
    setInputRound(maxRound + 1);
    setScheduleRound(maxRound + 1);
  }, [selectedCandidate?.id, selectedCandidate?.interviewHistory]);

  // 当有最近面试安排时，自动填充录入面试信息的基本信息（只读）
  useEffect(() => {
    if (latestSchedule && activeTab === 'input') {
      // 将时间字符串转换为 datetime-local 格式
      const timeStr = latestSchedule.time;
      if (timeStr && timeStr !== '待定') {
        try {
          const date = new Date(timeStr.replace(/-/g, '/'));
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            setInputDate(`${year}-${month}-${day}T${hours}:${minutes}`);
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
      setInputRound(latestSchedule.round);
      setInputInterviewer(latestSchedule.interviewer || '');
      setInputMethod((latestSchedule.method as '现场' | '视频') || '现场');
      setInputLocation(latestSchedule.location || '');
      setInputRemarks(latestSchedule.feedback || '');
      // 清空标签和评价（因为这是新的面试录入）
      setSelectedTags([]);
      setDetailedFeedback('');
      setRatings({ skills: 0, comm: 0, team: 0, learning: 0, adapt: 0 });
    }
  }, [latestSchedule, activeTab]);

  const handleAddRound = () => {
    setIsScheduling(true);
  };

  const resetScheduleForm = () => {
    setScheduleDate('');
    setScheduleRound(candidateInterviews.length ? Math.max(...candidateInterviews.map((i) => i.round)) + 1 : 1);
    setScheduleInterviewer('');
    setScheduleMethod(constants.interviewMethods[0] || '现场');
    setScheduleLocation('');
    setScheduleRemarks('');
    setScheduleError(null);
    setEditingScheduleId(null);
  };

  const handleConfirmSchedule = async () => {
    if (!selectedCandidate) {
      setScheduleError('请先选择候选人');
      return;
    }
    
    // 检查常量是否已加载
    if (!constants.loaded) {
      setScheduleError('系统配置加载中，请稍候...');
      return;
    }
    
    setScheduleLoading(true);
    setScheduleError(null);
    try {
      // 从数据库获取常量值，禁止硬编码
      const interviewStatuses = constants.interviewStatuses || [];
      const interviewConclusions = constants.interviewConclusions || [];
      
      // 获取默认状态（待面试）
      const defaultStatus = interviewStatuses.find(s => s === '待面试') || interviewStatuses[0];
      if (!defaultStatus) {
        throw new Error('无法获取面试状态配置，请刷新页面重试');
      }
      
      // 获取默认结论（待定）- 通常"待定"是最后一个选项
      const defaultConclusion = interviewConclusions.find(c => c === '待定') || interviewConclusions[interviewConclusions.length - 1];
      if (!defaultConclusion) {
        throw new Error('无法获取面试结论配置，请刷新页面重试');
      }
      
      const timeStr = scheduleDate
        ? new Date(scheduleDate).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' }).replace(/\//g, '-')
        : '待定';
      
      if (editingScheduleId) {
        // 更新已有面试安排
        await api.candidates.updateInterview(selectedCandidate.id, editingScheduleId, {
          round: scheduleRound,
          time: timeStr,
          interviewer: scheduleInterviewer || '待指派',
          method: scheduleMethod,
          location: scheduleLocation || null,
          feedback: scheduleRemarks || '',
          status: defaultStatus,
        });
      } else {
        // 新建面试安排
        await api.candidates.addInterview(selectedCandidate.id, {
          round: scheduleRound,
          time: timeStr,
          interviewer: scheduleInterviewer || '待指派',
          method: scheduleMethod,
          location: scheduleLocation || null,
          feedback: scheduleRemarks || '',
          recommendation: defaultConclusion,
          status: defaultStatus,
        });
      }
      
      // 使用复用 Hook 刷新候选人数据
      const updated = await refreshCandidate(selectedCandidate.id);
      setSelectedCandidate(updated);
      
      // 使用复用 Hook 刷新候选人列表
      const filtered = await refreshInterviewCandidateList();
      setAllCandidates(filtered);
      
      resetScheduleForm();
      setIsScheduling(false);
      setActiveTab('schedule');
    } catch (err) {
      // 改进错误处理：显示更详细的错误信息
      const error = err as Error;
      console.error('新建面试安排失败:', error);
      const errorMessage = error.message || '提交失败，请检查网络连接或稍后重试';
      setScheduleError(errorMessage);
      
      // 如果是网络错误，提供更友好的提示
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        setScheduleError('网络连接失败，请检查网络后重试');
      } else if (errorMessage.includes('400') || errorMessage.includes('Bad Request')) {
        setScheduleError('数据格式错误，请检查输入内容');
      } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
        setScheduleError('服务器错误，请稍后重试');
      }
    } finally {
      setScheduleLoading(false);
    }
  };

  const resetInputForm = () => {
    setInputDate('');
    setInputRound(candidateInterviews.length ? Math.max(...candidateInterviews.map((i) => i.round)) + 1 : 1);
    setInputInterviewer('');
    setInputMethod(constants.interviewMethods[0] || '现场');
    setInputLocation('');
    setInputRemarks('');
    setDetailedFeedback('');
    setRatings({ skills: 0, comm: 0, team: 0, learning: 0, adapt: 0 });
    setSelectedTags([]);
    setLocalConclusion(constants.interviewConclusions[0] || '通过');
    setSubmitError(null);
  };

  const handleSubmitInterview = async () => {
    // 检查前置条件
    if (!selectedCandidate) {
      setSubmitError('请先选择候选人');
      return;
    }
    
    if (!latestSchedule) {
      setSubmitError('请先在"面试安排"中创建面试安排，然后才能录入面试信息');
      return;
    }
    
    // 检查常量是否已加载
    if (!constants.loaded) {
      setSubmitError('系统配置加载中，请稍候...');
      return;
    }
    
    setSubmitLoading(true);
    setSubmitError(null);
    try {
      // 从数据库获取常量值，禁止硬编码
      const interviewStatuses = constants.interviewStatuses || [];
      const interviewConclusions = constants.interviewConclusions || [];
      const candidateStatuses = constants.candidateStatuses || [];
      
      // 获取"已完成"状态
      const completedStatus = interviewStatuses.find(s => s === '已完成') || interviewStatuses[interviewStatuses.length - 1];
      if (!completedStatus) {
        throw new Error('无法获取面试状态配置，请刷新页面重试');
      }
      
      // 获取"已淘汰"候选人状态
      const rejectedStatus = candidateStatuses.find(s => s === '已淘汰') || candidateStatuses[candidateStatuses.length - 1];
      if (!rejectedStatus) {
        throw new Error('无法获取候选人状态配置，请刷新页面重试');
      }
      
      // 确定 recommendation：如果结论是第一个（通常是"通过"），则为"推进"，否则为"淘汰"
      const firstConclusion = interviewConclusions[0];
      const recommendation = firstConclusion && localConclusion === firstConclusion ? '推进' : '淘汰';
      
      const timeStr = inputDate ? new Date(inputDate).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' }).replace(/\//g, '-') : '待定';
      const feedbackText = [inputRemarks, detailedFeedback].filter(Boolean).join('\n\n') || '（无详细反馈）';
      
      // 如果存在对应的面试安排，更新它；否则创建新记录
      if (latestSchedule.id) {
        // 更新已有的面试安排，添加结论和评价信息
        const payload = {
          round: inputRound,
          time: timeStr,
          interviewer: inputInterviewer || '待补充',
          method: inputMethod,
          location: inputLocation || null,
          feedback: feedbackText,
          recommendation,
          conclusion: localConclusion,
          status: completedStatus,
          ratings,
          tags: selectedTags,
        };
        await api.candidates.updateInterview(selectedCandidate.id, latestSchedule.id, payload);
      } else {
        // 创建新的面试记录
        const payload = {
          round: inputRound,
          time: timeStr,
          interviewer: inputInterviewer || '待补充',
          method: inputMethod,
          location: inputLocation || null,
          feedback: feedbackText,
          recommendation,
          conclusion: localConclusion,
          status: completedStatus,
          ratings,
          tags: selectedTags,
        };
        await api.candidates.addInterview(selectedCandidate.id, payload);
      }
      
      // 检查结论是否为淘汰（支持多种可能的淘汰值）
      const rejectionConclusions = interviewConclusions.filter(c => c.includes('淘汰') || c === '淘汰');
      if (rejectionConclusions.includes(localConclusion)) {
        // 使用从数据库获取的状态值，禁止硬编码
        await api.candidates.update(selectedCandidate.id, { currentStatus: rejectedStatus });
      }
      
      // 使用复用 Hook 刷新候选人数据
      const filtered = await refreshInterviewCandidateList();
      setAllCandidates(filtered);
      const updated = await refreshCandidate(selectedCandidate.id);
      setSelectedCandidate(updated);
      
      // 若当前候选人已淘汰且不在左侧列表，则选中第一个
      if (rejectionConclusions.includes(localConclusion) && !filtered.some((c) => c.id === selectedCandidate.id)) {
        setSelectedCandidate(filtered[0] ?? null);
      }
      
      resetInputForm();
      setActiveTab('record');
    } catch (err) {
      // 改进错误处理：显示更详细的错误信息
      const error = err as Error;
      console.error('提交面试记录失败:', error);
      
      let errorMessage = error.message || '提交失败，请检查网络连接或稍后重试';
      
      // 根据错误类型提供更友好的提示
      if (errorMessage.includes('无法连接到服务器') || errorMessage.includes('Failed to fetch') || errorMessage.includes('fetch')) {
        errorMessage = `无法连接到后端服务器。请检查：
1. 后端服务器是否已启动（在 server 目录运行 npm run dev）
2. 服务器地址是否正确（当前: ${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'}）
3. 网络连接是否正常`;
      } else if (errorMessage.includes('400') || errorMessage.includes('Bad Request')) {
        errorMessage = '数据格式错误，请检查输入内容';
      } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
        errorMessage = '服务器错误，请稍后重试';
      } else if (errorMessage.includes('网络连接失败') || errorMessage.includes('network')) {
        errorMessage = '网络连接失败，请检查网络后重试';
      }
      
      setSubmitError(errorMessage);
    } finally {
      setSubmitLoading(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const addCustomTag = () => {
    const trimmedTag = customTag.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag) && !PRESET_TAGS.includes(trimmedTag)) {
      setSelectedTags([...selectedTags, trimmedTag]);
      setCustomTag('');
    }
  };


  // 生成轮次选项（根据当前候选人的面试记录动态生成，支持无限轮次）
  const getRoundOptions = () => {
    const options = [];
    
    // 获取当前候选人的最大轮次
    const candidateMaxRound = selectedCandidate?.interviewHistory?.length 
      ? Math.max(...selectedCandidate.interviewHistory.map(i => i.round))
      : 0;
    
    // 计算需要显示的最大轮次：
    // 1. 至少显示到候选人的最大轮次+1（自动追加下一轮）
    // 2. 如果当前选中的轮次更大，也要包含
    // 3. 至少显示到第10轮（如果记录较少）
    const nextRound = candidateMaxRound + 1;
    const maxRoundToShow = Math.max(
      nextRound,           // 自动追加到下一轮
      scheduleRound,       // 当前选中的轮次
      inputRound,          // 录入表单的轮次
      10                   // 至少显示到第10轮
    );
    
    // 所有轮次统一显示为"第X轮"格式
    for (let i = 1; i <= maxRoundToShow; i++) {
      options.push({ value: i, label: `第${i}轮` });
    }
    
    return options;
  };

  const StarRating = ({ value, onChange, readonly = false }: { value: number, onChange?: (v: number) => void, readonly?: boolean }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onChange?.(star)}
          className={`w-3.5 h-3.5 transition-all transform ${!readonly ? 'hover:scale-110 cursor-pointer' : 'cursor-default'} ${star <= value ? 'text-blue-500 fill-current' : 'text-slate-200'}`}
        >
          <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
    </div>
  );

  return (
    <div className="h-full flex flex-col space-y-6 max-w-7xl mx-auto">
      {/* Top Filter Area */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">快速检索</label>
            <input 
              type="text" 
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索候选人、面试官、岗位..." 
              className="w-full text-xs bg-slate-50 border-none rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-blue-500/10 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">面试状态</label>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs bg-slate-50 border-none rounded-xl py-2.5 px-3 outline-none"
            >
              <option>全部状态</option>
              <option>待面试</option>
              <option>面试中</option>
              <option>已完成</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">时间区间</label>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full text-xs bg-slate-50 border-none rounded-xl py-2.5 px-3 outline-none" 
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
        {/* Left: Candidate List（仅待面试、面试中） */}
        <div className="w-1/3 flex flex-col space-y-4 overflow-y-auto custom-scrollbar pr-2 pb-12">
          {candidates.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
              <p className="text-sm font-bold">暂无待面试或面试中的候选人</p>
              <p className="text-xs mt-2">请在简历库中将候选人状态设为「待面试」或「面试中」</p>
            </div>
          ) : (
          candidates.map(candidate => {
            // 获取最高学历
            const topEdu = candidate.education && candidate.education.length > 0 
              ? candidate.education[0].degree 
              : '—';
            // 获取工作年限（如果有）
            const workYearsText = candidate.workYears || '—';
            // 合并标签和技能
            const allTags = [...(candidate.tags || []), ...(candidate.skills || []).filter(s => !(candidate.tags || []).includes(s))];
            
            return (
            <div 
              key={candidate.id}
              onClick={() => { setSelectedCandidate(candidate); setIsScheduling(false); setActiveTab('resume'); }}
              className={`bg-white p-4 rounded-[1.5rem] border-2 transition-all cursor-pointer relative group ${selectedCandidate?.id === candidate.id ? 'border-blue-500 shadow-xl' : 'border-transparent hover:border-slate-200 shadow-sm'}`}
            >
              <div className="flex items-start gap-4 mb-2">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-white font-black text-xl overflow-hidden shadow-inner flex-shrink-0">
                  {candidate.avatar ? <img src={candidate.avatar} className="w-full h-full object-cover" alt="" /> : <span>{candidate.name.charAt(0)}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-black text-slate-900 text-lg truncate tracking-tight">{candidate.name}</h4>
                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border border-blue-100/50">AI匹配: {candidate.matchingScore}%</span>
                  </div>
                  <p className="text-slate-600 text-xs font-black">{candidate.appliedPosition} | {workYearsText} | {topEdu}</p>
                  <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-tight">
                    {candidate.age}岁 · {candidate.gender} · {candidate.phone || '待补充'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{candidate.source || '—'}</p>
                  <div className="mt-2 text-2xl font-black text-blue-600 italic opacity-20 group-hover:opacity-100 transition-opacity">
                    {candidate.matchingScore}
                  </div>
                </div>
              </div>

              {/* AI优先推荐 */}
              {candidate.matchingReason && (
                <div className="w-full bg-blue-50/60 p-2.5 rounded-lg border border-blue-100/50 mb-2">
                  <p className="text-xs text-blue-700 font-bold flex items-start gap-1.5 leading-snug">
                    <span className="text-blue-600 font-black flex-shrink-0 uppercase">AI优先推荐:</span>
                    <span className="text-slate-700 font-medium text-xs min-w-0">{candidate.matchingReason}</span>
                  </p>
                </div>
              )}

              {/* 状态标签和推荐岗位 */}
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                    candidate.currentStatus === '面试中' ? 'bg-blue-100 text-blue-700' : 
                    candidate.currentStatus === 'Offer中' ? 'bg-indigo-100 text-indigo-700' : 
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {candidate.currentStatus === 'Offer中' ? 'OFFER中' : candidate.currentStatus}
                  </span>
                  {candidate.recommendedJds && candidate.recommendedJds.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">推荐岗位:</span>
                      {candidate.recommendedJds.map(r => (
                        <span key={r.jdId || r.title} className="text-[10px] font-bold text-blue-600 underline cursor-pointer decoration-blue-200 hover:text-blue-700">{r.title}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 标签/技能区 */}
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-1 items-center mb-2 py-1">
                  {allTags.slice(0, 6).map((tag, i) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center px-2 py-0.5 rounded-md font-medium border text-[9px] leading-tight ${
                        i % 4 === 0 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        i % 4 === 1 ? 'bg-slate-100 text-slate-700 border-slate-200' :
                        i % 4 === 2 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                  {allTags.length > 6 && (
                    <span className="text-[9px] text-slate-400 font-bold">+{allTags.length - 6}</span>
                  )}
                </div>
              )}
            </div>
          )})
          )}
        </div>

        {/* Right: Interview Details */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
          {selectedCandidate ? (
            <div className="flex flex-col h-full">
              {/* Profile Header Bar */}
              <div className="p-8 border-b border-slate-100 bg-white flex justify-between items-center">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-white rounded-2xl border border-slate-200 p-1 shadow-sm">
                    <img src={selectedCandidate.avatar} className="w-full h-full rounded-xl object-cover" alt="" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedCandidate.name}</h3>
                      <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">面试管理</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-bold mt-1">
                      应聘岗位：{selectedCandidate.appliedPosition} | <span className="text-blue-600 font-black">AI 匹配度：{selectedCandidate.matchingScore}%</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
                {isScheduling ? (
                  <div className="max-w-3xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-3">
                       <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                       <h4 className="text-xl font-black text-slate-900 tracking-tight">{editingScheduleId ? '修改面试安排' : '新建面试安排'}</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">面试日期与时间</label>
                        <input
                          type="datetime-local"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10"
                        />
                      </div>
                              <div className="space-y-2 relative">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">面试轮次</label>
                                <select
                                  value={scheduleRound}
                                  onChange={(e) => setScheduleRound(Number(e.target.value))}
                                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 appearance-none"
                                >
                                  {getRoundOptions().map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                                <p className="absolute -bottom-6 left-0 text-[10px] font-bold text-slate-300 italic">不限定轮次，可随时发起面试</p>
                              </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">面试官</label>
                        <select
                          value={scheduleInterviewer}
                          onChange={(e) => setScheduleInterviewer(e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10"
                        >
                          <option value="">请选择面试官</option>
                          {enabledUsers.map((user) => (
                            <option key={user.id} value={user.name}>
                              {user.name} {user.description ? `(${user.description})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">面试方式</label>
                        <select
                          value={scheduleMethod}
                          onChange={(e) => setScheduleMethod(e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10"
                        >
                          {INTERVIEW_METHODS.map(method => (
                            <option key={method} value={method}>{method}面试</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">面试地点 / 链接</label>
                        <input
                          type="text"
                          value={scheduleLocation}
                          onChange={(e) => setScheduleLocation(e.target.value)}
                          placeholder="会议室名称或视频会议链接"
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">备注说明</label>
                        <textarea
                          rows={4}
                          value={scheduleRemarks}
                          onChange={(e) => setScheduleRemarks(e.target.value)}
                          placeholder="备注说明..."
                          className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
                        />
                      </div>
                    </div>
                    {scheduleError && (
                      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
                        <p className="text-red-700 text-sm font-bold mb-2">提交失败</p>
                        <p className="text-red-600 text-xs whitespace-pre-line">{scheduleError}</p>
                      </div>
                    )}
                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        disabled={scheduleLoading}
                        onClick={handleConfirmSchedule}
                        className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-2xl shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-1 transition-all active:scale-95 uppercase tracking-widest disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {scheduleLoading ? '提交中...' : editingScheduleId ? '确认修改' : '确认安排面试'}
                      </button>
                      {editingScheduleId && (
                        <button
                          type="button"
                          onClick={() => {
                            resetScheduleForm();
                            setIsScheduling(false);
                          }}
                          className="px-10 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all"
                        >
                          取消
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    {/* Tab Navigation */}
                    <div className="flex gap-12 border-b border-slate-100 mb-8">
                       <button 
                        onClick={() => setActiveTab('resume')}
                        className={`pb-4 text-[13px] font-black uppercase tracking-widest relative transition-all ${activeTab === 'resume' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}
                       >
                         候选人简历详情
                       </button>
                       <button 
                        onClick={() => setActiveTab('record')}
                        className={`pb-4 text-[13px] font-black uppercase tracking-widest relative transition-all ${activeTab === 'record' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}
                       >
                         面试记录
                       </button>
                       <button 
                        onClick={() => setActiveTab('schedule')}
                        className={`pb-4 text-[13px] font-black uppercase tracking-widest relative transition-all ${activeTab === 'schedule' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}
                       >
                         面试安排
                       </button>
                       <button 
                        onClick={() => setActiveTab('input')}
                        className={`pb-4 text-[13px] font-black uppercase tracking-widest relative transition-all ${activeTab === 'input' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}
                       >
                         录入面试信息
                       </button>
                    </div>

                    {activeTab === 'resume' ? (
                      <div className="space-y-4 animate-in fade-in duration-300 pb-12">
                        {selectedCandidate ? (
                          <>
                            {/* 基本信息（参考简历库格式） */}
                            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-3">基本信息</p>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400 font-bold">姓名</span>
                                  <span className="font-bold text-slate-900">{selectedCandidate.name || '—'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400 font-bold">年龄</span>
                                  <span className="font-bold text-slate-900">{selectedCandidate.age != null ? `${selectedCandidate.age}岁` : '—'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400 font-bold">性别</span>
                                  <span className="font-bold text-slate-900">{selectedCandidate.gender || '—'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400 font-bold">电话</span>
                                  <span className={!selectedCandidate.phone || selectedCandidate.phone.trim() === '待补充' ? 'text-slate-400 italic' : 'font-bold text-slate-900'}>{selectedCandidate.phone || '待补充'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 col-span-2">
                                  <span className="text-slate-400 font-bold">邮箱</span>
                                  <span className={!selectedCandidate.email || selectedCandidate.email.trim() === '待补充' ? 'text-slate-400 italic' : 'font-bold text-slate-900'}>{selectedCandidate.email || '待补充'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400 font-bold">期望岗位</span>
                                  <span className="font-bold text-blue-600">{selectedCandidate.appliedPosition || '—'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400 font-bold">来源</span>
                                  <span className="font-bold text-slate-900">{selectedCandidate.source || '—'}</span>
                                </div>
                                {selectedCandidate.city && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400 font-bold">所在城市</span>
                                    <span className="font-bold text-slate-900">{selectedCandidate.city}</span>
                                  </div>
                                )}
                                {selectedCandidate.workYears && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400 font-bold">工作年限</span>
                                    <span className="font-bold text-slate-900">{selectedCandidate.workYears}</span>
                                  </div>
                                )}
                                {selectedCandidate.expectedSalary && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400 font-bold">期望薪资</span>
                                    <span className="font-bold text-emerald-600">{selectedCandidate.expectedSalary}</span>
                                  </div>
                                )}
                                {selectedCandidate.jobStatusDesc && (
                                  <div className="flex items-center gap-1.5 col-span-2">
                                    <span className="text-slate-400 font-bold">求职状态</span>
                                    <span className="font-bold text-slate-900">{selectedCandidate.jobStatusDesc}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 最高教育背景 */}
                            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">最高教育背景</p>
                              {selectedCandidate.education && selectedCandidate.education.length > 0 ? (
                                <>
                                  {(() => {
                                    const topEdu = selectedCandidate.education[0];
                                    return (
                                      <>
                                        <p className="font-bold text-slate-900">{topEdu.school} · {topEdu.major}（{topEdu.degree}）</p>
                                        {topEdu.duration && <p className="text-[10px] text-slate-400 mt-1">{topEdu.duration}</p>}
                                      </>
                                    );
                                  })()}
                                </>
                              ) : (
                                <p className="text-slate-400 text-xs">暂无</p>
                              )}
                            </div>

                            {/* 职业轨迹（参考简历库格式） */}
                            <div className="space-y-3">
                              <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-l-4 border-blue-600 pl-3">职业轨迹</h5>
                              {selectedCandidate.experience && selectedCandidate.experience.length > 0 ? (
                                <div className="space-y-4 relative pl-2">
                                  {selectedCandidate.experience.map((exp, i) => (
                                    <div key={i} className="relative pl-6 border-l-2 border-slate-200 ml-0.5">
                                      <div className="absolute -left-[9px] top-2 w-2.5 h-2.5 bg-white border-2 border-blue-600 rounded-full"></div>
                                      <div className="flex flex-wrap justify-between items-start gap-2 mb-0.5">
                                        <p className="font-bold text-slate-800 text-sm">{exp.company}</p>
                                        <span className="text-[10px] text-slate-400 font-bold shrink-0">{exp.duration || '—'}</span>
                                      </div>
                                      <p className="text-xs font-bold text-blue-600 mb-1">{exp.role}</p>
                                      {exp.details && <p className="text-xs text-slate-500 leading-relaxed">{exp.details}</p>}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-slate-400 text-xs py-2">暂无工作经历</p>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-20">
                            <p className="text-xl font-black uppercase tracking-widest text-slate-200">暂无候选人信息</p>
                          </div>
                        )}
                      </div>
                    ) : activeTab === 'record' ? (
                      <div className="space-y-8 animate-in fade-in duration-300">
                        {candidateInterviews.length > 0 ? (
                          candidateInterviews.map((int) => (
                            <div key={int.id ?? `round-${int.round}-${int.time}`} className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                              <div className="flex justify-between items-center mb-10">
                                <div className="flex items-center gap-4">
                                  <span className="bg-slate-200 px-5 py-1.5 rounded-xl text-[11px] font-black text-slate-700 tracking-[0.15em]">
                                    第{int.round}轮
                                  </span>
                                </div>
                                <span className="text-base font-black text-slate-900 tracking-tight">{int.time}</span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-10 mb-10 px-2">
                                <div>
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">面试官</p>
                                   <p className="text-base font-black text-slate-800">{int.interviewer}</p>
                                </div>
                                <div>
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">面试方式</p>
                                   <p className="text-base font-black text-slate-800">{int.method} {int.location ? `· ${int.location}` : ''}</p>
                                </div>
                              </div>

                              {/* 显示面试状态 */}
                              <div className="px-2 mb-6">
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">面试状态：</span>
                                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                    int.status === '已完成' ? 'bg-green-100 text-green-700' :
                                    int.status === '面试中' ? 'bg-blue-100 text-blue-700' :
                                    int.status === '待面试' ? 'bg-yellow-100 text-yellow-700' :
                                    int.status === '已取消' ? 'bg-red-100 text-red-700' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>
                                    {int.status || '待定'}
                                  </span>
                                </div>
                              </div>

                              {/* Evaluation Results & Conclusion Row */}
                              {(int.status === '已完成' || int.conclusion) && (
                                <div className="px-2 mb-10 animate-in slide-in-from-top-2 duration-500">
                                   <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                      {/* Left: Ratings */}
                                      {(int.ratings && Object.keys(int.ratings).length > 0) && (
                                        <div className="lg:col-span-7 space-y-4">
                                           <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">评估得分</h6>
                                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8">
                                              {EVALUATION_DIMENSIONS.map(dim => (
                                                <div key={dim.id} className="flex justify-between items-center bg-white/60 px-4 py-2.5 rounded-xl shadow-sm border border-slate-100/50">
                                                  <span className="text-[10px] font-bold text-slate-600">{dim.label}</span>
                                                  <StarRating value={int.ratings?.[dim.id] || 0} readonly />
                                                </div>
                                              ))}
                                           </div>
                                        </div>
                                      )}
                                      {/* Right: Conclusion Box */}
                                      <div className={`${(int.ratings && Object.keys(int.ratings).length > 0) ? 'lg:col-span-5' : 'lg:col-span-12'} flex flex-col justify-end`}>
                                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">面试结论</p>
                                         {int.conclusion ? (
                                           <div className={`p-6 rounded-[2rem] border-2 flex items-center justify-center gap-4 shadow-xl ${int.conclusion === '通过' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${int.conclusion === '通过' ? 'bg-green-600' : 'bg-red-600'} text-white shadow-lg`}>
                                                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                   {int.conclusion === '通过' 
                                                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
                                                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M6 18L18 6M6 6l12 12" />
                                                   }
                                                 </svg>
                                              </div>
                                              <span className="text-xl font-black uppercase tracking-[0.2em] italic">{int.conclusion}</span>
                                           </div>
                                         ) : (
                                           <div className="p-6 rounded-[2rem] border-2 border-slate-200 bg-slate-50 flex items-center justify-center gap-4 shadow-xl">
                                              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-300 text-white shadow-lg">
                                                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                 </svg>
                                              </div>
                                              <span className="text-xl font-black uppercase tracking-[0.2em] italic text-slate-500">待定</span>
                                           </div>
                                         )}
                                      </div>
                                   </div>
                                </div>
                              )}

                              {/* Talent Tags Display Area */}
                              {int.tags && int.tags.length > 0 && (
                                <div className="px-2 mb-8">
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">人才标签</p>
                                   <div className="flex flex-wrap gap-3">
                                      {int.tags.map(tag => (
                                        <span key={tag} className="bg-white border border-blue-100 text-blue-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                                          {tag}
                                        </span>
                                      ))}
                                   </div>
                                </div>
                              )}

                              <div className="px-2">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">反馈记录</p>
                                <div className="bg-white border border-slate-100 rounded-2xl p-8 min-h-[120px] flex flex-col justify-center shadow-inner">
                                  <p className="text-sm text-slate-600 font-medium italic leading-relaxed">
                                    “{int.feedback || '暂无面试反馈记录，请在面试结束后录入。'}”
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-20">
                             <p className="text-xl font-black uppercase tracking-widest text-slate-200">暂无面试历史</p>
                          </div>
                        )}
                      </div>
                    ) : activeTab === 'schedule' ? (
                      <div className="space-y-6 animate-in fade-in duration-300 pb-12">
                        <div className="flex justify-between items-center mb-6">
                          <h4 className="text-lg font-black text-slate-900 tracking-tight">面试安排管理</h4>
                          <button
                            onClick={() => {
                              resetScheduleForm();
                              setEditingScheduleId(null);
                              setIsScheduling(true);
                            }}
                            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                            新建面试安排
                          </button>
                        </div>
                        {scheduledInterviews.length > 0 ? (
                          <div className="space-y-4">
                            {scheduledInterviews.map((schedule) => (
                              <div key={schedule.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-xs font-black">
                                        {`第${schedule.round}轮`}
                                      </span>
                                      <span className="text-sm font-bold text-slate-700">{schedule.time}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-3">
                                      <div>
                                        <p className="text-[10px] text-slate-400 font-bold mb-1">面试官</p>
                                        <p className="text-sm font-bold text-slate-800">{schedule.interviewer || '待指派'}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-slate-400 font-bold mb-1">面试方式</p>
                                        <p className="text-sm font-bold text-slate-800">{schedule.method ? `${schedule.method}面试` : '面试'} {schedule.location ? `· ${schedule.location}` : ''}</p>
                                      </div>
                                      {schedule.feedback && (
                                        <div className="col-span-2">
                                          <p className="text-[10px] text-slate-400 font-bold mb-1">备注</p>
                                          <p className="text-sm text-slate-600">{schedule.feedback}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-2 ml-4">
                                    {/* 修改按钮：所有没有结论的面试安排都可以修改 */}
                                    <button
                                      onClick={() => {
                                        const timeStr = schedule.time;
                                        let dateStr = '';
                                        if (timeStr && timeStr !== '待定') {
                                          try {
                                            const date = new Date(timeStr.replace(/-/g, '/'));
                                            if (!isNaN(date.getTime())) {
                                              const year = date.getFullYear();
                                              const month = String(date.getMonth() + 1).padStart(2, '0');
                                              const day = String(date.getDate()).padStart(2, '0');
                                              const hours = String(date.getHours()).padStart(2, '0');
                                              const minutes = String(date.getMinutes()).padStart(2, '0');
                                              dateStr = `${year}-${month}-${day}T${hours}:${minutes}`;
                                            }
                                          } catch (e) {
                                            // 时间解析失败，保持为空
                                          }
                                        }
                                        setScheduleDate(dateStr);
                                        setScheduleRound(schedule.round);
                                        setScheduleInterviewer(schedule.interviewer || '');
                                        setScheduleMethod((schedule.method as string) || constants.interviewMethods[0] || '现场');
                                        setScheduleLocation(schedule.location || '');
                                        setScheduleRemarks(schedule.feedback || '');
                                        setEditingScheduleId(schedule.id || null);
                                        setIsScheduling(true);
                                      }}
                                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all"
                                    >
                                      修改
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (!schedule.id || !confirm('确定取消此面试安排？')) return;
                                        try {
                                          // 删除面试安排
                                          await api.candidates.deleteInterview(selectedCandidate!.id, schedule.id);
                                          // 使用复用 Hook 刷新候选人数据
                                          const updated = await refreshCandidate(selectedCandidate!.id);
                                          setSelectedCandidate(updated);
                                          
                                          // 使用复用 Hook 刷新候选人列表
                                          const filtered = await refreshInterviewCandidateList();
                                          setAllCandidates(filtered);
                                        } catch (err) {
                                          console.error('取消面试安排失败:', err);
                                          alert('取消失败');
                                        }
                                      }}
                                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-all"
                                    >
                                      取消
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-20 bg-slate-50 rounded-2xl">
                            <p className="text-slate-400 text-sm font-bold mb-2">暂无面试安排</p>
                            <p className="text-slate-300 text-xs">点击右上角按钮创建第一个面试安排</p>
                          </div>
                        )}
                      </div>
                    ) : activeTab === 'input' ? (
                      <div className="space-y-10 animate-in fade-in duration-300 pb-12">
                        {/* 0. 面试基本信息（只读，来自最近面试安排） */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                            <h5 className="text-[14px] font-black text-slate-900 tracking-tight">面试基本信息</h5>
                            {latestSchedule && (
                              <span className="text-[10px] text-slate-400 font-medium">（来自最近面试安排）</span>
                            )}
                          </div>
                          {latestSchedule ? (
                            <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 p-8">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">面试日期与时间</label>
                                  <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600">
                                    {latestSchedule.time || '待定'}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">面试轮次</label>
                                  <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600">
                                    {`第${latestSchedule.round}轮`}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">面试官</label>
                                  <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600">
                                    {latestSchedule.interviewer || '待指派'}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">面试方式</label>
                                  <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600">
                                    {latestSchedule.method ? `${latestSchedule.method}面试` : '面试'}
                                  </div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">面试地点 / 链接</label>
                                  <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600">
                                    {latestSchedule.location || '-'}
                                  </div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">备注说明</label>
                                  <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 min-h-[60px]">
                                    {latestSchedule.feedback || '-'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 p-8">
                              <p className="text-sm text-slate-400 text-center py-4">暂无最近的面试安排，请先在"面试安排"中创建</p>
                            </div>
                          )}
                        </div>

                        {/* 只有当有面试安排时才显示录入功能 */}
                        {latestSchedule ? (
                          <>
                            {/* 1. 评估维度 */}
                        <div className="space-y-6">
                           <div className="flex items-center gap-3 mb-4">
                              <svg className="w-5 h-5 text-slate-800 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                              <h5 className="text-[14px] font-black text-slate-900 tracking-tight">评估维度</h5>
                           </div>
                           <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 p-8 space-y-4">
                              {EVALUATION_DIMENSIONS.map(dim => (
                                <div key={dim.id} className="bg-white p-6 rounded-2xl flex justify-between items-center shadow-sm border border-slate-50">
                                   <span className="text-sm font-black text-slate-700">{dim.label}</span>
                                   <StarRating 
                                      value={ratings[dim.id]} 
                                      onChange={(v) => setRatings({...ratings, [dim.id]: v})} 
                                   />
                                </div>
                              ))}
                           </div>
                        </div>

                        {/* 2. 人才标签录入 */}
                        <div className="space-y-4">
                           <div className="flex items-center gap-3">
                              <svg className="w-5 h-5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
                              <h5 className="text-[14px] font-black text-slate-900 tracking-tight">人才标签</h5>
                           </div>
                           <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 p-8 space-y-8">
                              {/* 所有标签显示区域（预设标签 + 自定义标签） */}
                              <div className="flex flex-wrap gap-3">
                                 {/* 预设标签 */}
                                 {PRESET_TAGS.map(tag => (
                                    <button
                                      key={tag}
                                      onClick={() => toggleTag(tag)}
                                      className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border-2 transition-all ${selectedTags.includes(tag) ? 'bg-blue-600 text-white border-blue-600 shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                                    >
                                      {tag}
                                    </button>
                                 ))}
                                 {/* 自定义标签（只显示已选中的自定义标签） */}
                                 {selectedTags
                                    .filter(tag => !PRESET_TAGS.includes(tag))
                                    .map(tag => (
                                       <button
                                          key={tag}
                                          onClick={() => toggleTag(tag)}
                                          className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border-2 transition-all ${selectedTags.includes(tag) ? 'bg-blue-600 text-white border-blue-600 shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                                       >
                                          {tag}
                                       </button>
                                    ))}
                              </div>
                              {/* 添加自定义标签输入区域 */}
                              <div className="flex gap-3">
                                 <input 
                                    type="text" 
                                    value={customTag}
                                    onChange={(e) => setCustomTag(e.target.value)}
                                    placeholder="输入自定义标签，回车添加"
                                    onKeyDown={(e) => {
                                       if (e.key === 'Enter') {
                                          e.preventDefault();
                                          addCustomTag();
                                       }
                                    }}
                                    className="flex-1 bg-white border border-slate-200 rounded-xl px-5 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10 shadow-sm"
                                 />
                                 <button 
                                    onClick={addCustomTag}
                                    className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[11px] font-black uppercase shadow-lg active:scale-95 transition-all hover:bg-slate-800"
                                 >
                                    添加
                                 </button>
                              </div>
                           </div>
                        </div>

                        {/* 3. 录入面试评价 - Text Area */}
                        <div className="space-y-4">
                           <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">详细评价录入</h5>
                           <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col min-h-[450px]">
                             <textarea 
                              rows={12} 
                              value={detailedFeedback}
                              onChange={(e) => setDetailedFeedback(e.target.value)}
                              placeholder="在此录入候选人的面试评价、综合表现及反馈记录..." 
                              className="w-full flex-1 bg-white border-none rounded-2xl p-8 text-sm outline-none focus:ring-2 focus:ring-blue-500/10 leading-relaxed shadow-inner resize-none mb-8"
                             />
                             
                             {/* 面试结论选择项 - Radio单选模式 */}
                             <div className="flex flex-col gap-5 border-t border-slate-100 pt-8">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">面试结论</label>
                                <div className="flex gap-5">
                                   {INTERVIEW_CONCLUSIONS.map(opt => (
                                      <label 
                                        key={opt}
                                        className="flex items-center gap-2 cursor-pointer"
                                      >
                                        <input
                                          type="radio"
                                          name="interviewConclusion"
                                          value={opt}
                                          checked={localConclusion === opt}
                                          onChange={(e) => setLocalConclusion(e.target.value)}
                                          className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                        />
                                        <span className="text-[12px] font-black uppercase tracking-widest text-slate-700">{opt}</span>
                                      </label>
                                   ))}
                                </div>
                             </div>

                             {submitError && (
                               <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mt-4">
                                 <p className="text-red-700 text-sm font-bold mb-2">提交失败</p>
                                 <p className="text-red-600 text-xs whitespace-pre-line">{submitError}</p>
                               </div>
                             )}
                             <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-10 pt-8 border-t-2 border-slate-100 bg-slate-50/50 -mx-8 -mb-8 px-8 pb-8 rounded-b-[2rem]">
                                <p className="text-[11px] text-slate-500 font-bold">提交后将同步至面试记录，若结论为「淘汰」将更新候选人状态。</p>
                                <button
                                  disabled={submitLoading}
                                  onClick={handleSubmitInterview}
                                  className="bg-blue-600 text-white px-14 py-4 rounded-2xl font-black text-[13px] uppercase tracking-widest shadow-2xl shadow-blue-500/40 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                                >
                                  {submitLoading ? '提交中...' : '录入并同步反馈'}
                                </button>
                             </div>
                           </div>
                        </div>
                          </>
                        ) : (
                          <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 p-12 text-center">
                            <p className="text-base text-slate-400 font-bold mb-2">暂无面试安排</p>
                            <p className="text-sm text-slate-300">请先在"面试安排"中创建面试安排，然后才能录入面试信息。</p>
                          </div>
                        )}
                      </div>
                    ) : activeTab === 'input' ? (
                      <div className="space-y-10 animate-in fade-in duration-300 pb-12">
                        {/* 0. 面试基本信息（只读，来自最近面试安排） */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                            <h5 className="text-[14px] font-black text-slate-900 tracking-tight">面试基本信息</h5>
                            {latestSchedule && (
                              <span className="text-[10px] text-slate-400 font-medium">（来自最近面试安排）</span>
                            )}
                          </div>
                          {latestSchedule ? (
                            <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 p-8">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">面试日期与时间</label>
                                  <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600">
                                    {latestSchedule.time || '待定'}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">面试轮次</label>
                                  <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600">
                                    {`第${latestSchedule.round}轮`}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">面试官</label>
                                  <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600">
                                    {latestSchedule.interviewer || '待指派'}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">面试方式</label>
                                  <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600">
                                    {latestSchedule.method ? `${latestSchedule.method}面试` : '面试'}
                                  </div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">面试地点 / 链接</label>
                                  <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600">
                                    {latestSchedule.location || '-'}
                                  </div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">备注说明</label>
                                  <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 min-h-[60px]">
                                    {latestSchedule.feedback || '-'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 p-8">
                              <p className="text-sm text-slate-400 text-center py-4">暂无最近的面试安排，请先在"面试安排"中创建</p>
                            </div>
                          )}
                        </div>

                        {/* 只有当有面试安排时才显示录入功能 */}
                        {latestSchedule ? (
                          <>
                            {/* 1. 评估维度 */}
                            <div className="space-y-6">
                               <div className="flex items-center gap-3 mb-4">
                                  <svg className="w-5 h-5 text-slate-800 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                  <h5 className="text-[14px] font-black text-slate-900 tracking-tight">评估维度</h5>
                               </div>
                               <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 p-8 space-y-4">
                                  {EVALUATION_DIMENSIONS.map(dim => (
                                    <div key={dim.id} className="bg-white p-6 rounded-2xl flex justify-between items-center shadow-sm border border-slate-50">
                                       <span className="text-sm font-black text-slate-700">{dim.label}</span>
                                       <StarRating 
                                          value={ratings[dim.id]} 
                                          onChange={(v) => setRatings({...ratings, [dim.id]: v})} 
                                       />
                                    </div>
                                  ))}
                               </div>
                            </div>

                            {/* 2. 人才标签录入 */}
                            <div className="space-y-4">
                               <div className="flex items-center gap-3">
                                  <svg className="w-5 h-5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
                                  <h5 className="text-[14px] font-black text-slate-900 tracking-tight">人才标签</h5>
                               </div>
                               <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 p-8 space-y-8">
                                  {/* 所有标签显示区域（预设标签 + 自定义标签） */}
                                  <div className="flex flex-wrap gap-3">
                                     {/* 预设标签 */}
                                     {PRESET_TAGS.map(tag => (
                                        <button
                                          key={tag}
                                          onClick={() => toggleTag(tag)}
                                          className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border-2 transition-all ${selectedTags.includes(tag) ? 'bg-blue-600 text-white border-blue-600 shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                                        >
                                          {tag}
                                        </button>
                                     ))}
                                     {/* 自定义标签（只显示已选中的自定义标签） */}
                                     {selectedTags
                                        .filter(tag => !PRESET_TAGS.includes(tag))
                                        .map(tag => (
                                           <button
                                              key={tag}
                                              onClick={() => toggleTag(tag)}
                                              className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border-2 transition-all ${selectedTags.includes(tag) ? 'bg-blue-600 text-white border-blue-600 shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                                           >
                                              {tag}
                                           </button>
                                        ))}
                                  </div>
                                  {/* 添加自定义标签输入区域 */}
                                  <div className="flex gap-3">
                                     <input 
                                        type="text" 
                                        value={customTag}
                                        onChange={(e) => setCustomTag(e.target.value)}
                                        placeholder="输入自定义标签，回车添加"
                                        onKeyDown={(e) => {
                                           if (e.key === 'Enter') {
                                              e.preventDefault();
                                              addCustomTag();
                                           }
                                        }}
                                        className="flex-1 bg-white border border-slate-200 rounded-xl px-5 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10 shadow-sm"
                                     />
                                     <button 
                                        onClick={addCustomTag}
                                        className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[11px] font-black uppercase shadow-lg active:scale-95 transition-all hover:bg-slate-800"
                                     >
                                        添加
                                     </button>
                                  </div>
                               </div>
                            </div>

                            {/* 3. 录入面试评价 - Text Area */}
                            <div className="space-y-4">
                               <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">详细评价录入</h5>
                               <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col min-h-[450px]">
                                 <textarea 
                                  rows={12} 
                                  value={detailedFeedback}
                                  onChange={(e) => setDetailedFeedback(e.target.value)}
                                  placeholder="在此录入候选人的面试评价、综合表现及反馈记录..." 
                                  className="w-full flex-1 bg-white border-none rounded-2xl p-8 text-sm outline-none focus:ring-2 focus:ring-blue-500/10 leading-relaxed shadow-inner resize-none mb-8"
                                 />
                                 
                                 {/* 面试结论选择项 - Radio单选模式 */}
                                 <div className="flex flex-col gap-5 border-t border-slate-100 pt-8">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">面试结论</label>
                                    <div className="flex gap-5">
                                       {['通过', '淘汰'].map(opt => (
                                          <label 
                                            key={opt}
                                            className="flex items-center gap-2 cursor-pointer"
                                          >
                                            <input
                                              type="radio"
                                              name="interviewConclusion"
                                              value={opt}
                                              checked={localConclusion === opt}
                                              onChange={(e) => setLocalConclusion(e.target.value)}
                                              className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                            />
                                            <span className="text-[12px] font-black uppercase tracking-widest text-slate-700">{opt}</span>
                                          </label>
                                       ))}
                                    </div>
                                 </div>

                                 {submitError && (
                                   <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mt-4">
                                     <p className="text-red-700 text-sm font-bold mb-2">提交失败</p>
                                     <p className="text-red-600 text-xs whitespace-pre-line">{submitError}</p>
                                   </div>
                                 )}
                                 <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-10 pt-8 border-t-2 border-slate-100 bg-slate-50/50 -mx-8 -mb-8 px-8 pb-8 rounded-b-[2rem]">
                                    <p className="text-[11px] text-slate-500 font-bold">提交后将同步至面试记录，若结论为「淘汰」将更新候选人状态。</p>
                                    <button
                                      disabled={submitLoading}
                                      onClick={handleSubmitInterview}
                                      className="bg-blue-600 text-white px-14 py-4 rounded-2xl font-black text-[13px] uppercase tracking-widest shadow-2xl shadow-blue-500/40 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                                    >
                                      {submitLoading ? '提交中...' : '录入并同步反馈'}
                                    </button>
                                 </div>
                               </div>
                            </div>
                          </>
                        ) : (
                          <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 p-12 text-center">
                            <p className="text-base text-slate-400 font-bold mb-2">暂无面试安排</p>
                            <p className="text-sm text-slate-300">请先在"面试安排"中创建面试安排，然后才能录入面试信息。</p>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 italic p-12 text-center bg-slate-50/20">
              <svg className="w-24 h-24 mb-6 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              <p className="text-xl font-black uppercase tracking-widest text-slate-200">请选择左侧候选人管理面试流程</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
