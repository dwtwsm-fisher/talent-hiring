import { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  EDUCATION_LEVELS,
  WORK_YEARS,
  SALARY_RANGES,
  DEFAULT_RESUME_TAGS,
} from '../constants';

/** 从 API 获取可持久化的字典配置，失败时回退到 constants 默认值 */
export function useDictConfig() {
  const [educationLevels, setEducationLevels] = useState<string[]>(EDUCATION_LEVELS as unknown as string[]);
  const [workYears, setWorkYears] = useState<string[]>(WORK_YEARS as unknown as string[]);
  const [salaryRanges, setSalaryRanges] = useState<string[]>(SALARY_RANGES as unknown as string[]);
  const [resumeTags, setResumeTags] = useState<string[]>(DEFAULT_RESUME_TAGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      api.dict.educationLevels().then((r) => r.map((x) => x.name)).catch(() => EDUCATION_LEVELS as unknown as string[]),
      api.dict.workYears().then((r) => r.map((x) => x.name)).catch(() => WORK_YEARS as unknown as string[]),
      api.dict.salaryRanges().then((r) => r.map((x) => x.name)).catch(() => SALARY_RANGES as unknown as string[]),
      api.dict.resumeTags().then((r) => r.map((x) => x.name)).catch(() => DEFAULT_RESUME_TAGS),
    ]).then(([edu, wy, sal, tags]) => {
      setEducationLevels(edu);
      setWorkYears(wy);
      setSalaryRanges(sal);
      setResumeTags(tags);
    }).finally(() => setLoaded(true));
  }, []);

  return { educationLevels, workYears, salaryRanges, resumeTags, loaded };
}
