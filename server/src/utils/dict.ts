import { supabase } from '../db/supabase.js';

// 字典值缓存（避免频繁查询数据库）
const dictCache = new Map<string, Map<string, string>>();
const defaultCache = new Map<string, string>();

/**
 * 获取字典值（带缓存）
 * @param dictType 字典类型，如 'candidate_status'
 * @param name 字典项名称，如 '新简历'
 * @returns 字典项的值（name），如果不存在则返回 name 本身
 */
export async function getDictValue(dictType: string, name: string): Promise<string> {
  const cacheKey = `${dictType}:${name}`;
  
  // 检查缓存
  if (!dictCache.has(dictType)) {
    dictCache.set(dictType, new Map());
  }
  const typeCache = dictCache.get(dictType)!;
  if (typeCache.has(name)) {
    return typeCache.get(name)!;
  }

  // 从数据库查询
  const { data, error } = await supabase
    .from('data_dictionary')
    .select('name')
    .eq('dict_type', dictType)
    .eq('name', name)
    .single();

  if (error || !data) {
    // 如果数据库中不存在，记录警告并返回原值（向后兼容）
    console.warn(`Dictionary value not found: ${dictType}:${name}, using provided value as fallback`);
    typeCache.set(name, name);
    return name;
  }

  // 缓存并返回
  typeCache.set(name, data.name);
  return data.name;
}

/**
 * 获取字典类型的默认值（按 sort_order 排序的第一个值）
 * @param dictType 字典类型，如 'candidate_status'
 * @returns 默认值，如果不存在则返回空字符串
 */
export async function getDictDefault(dictType: string): Promise<string> {
  // 检查缓存
  if (defaultCache.has(dictType)) {
    return defaultCache.get(dictType)!;
  }

  // 从数据库查询（按 sort_order 排序，取第一个）
  const { data, error } = await supabase
    .from('data_dictionary')
    .select('name')
    .eq('dict_type', dictType)
    .order('sort_order', { ascending: true })
    .limit(1)
    .single();

  if (error || !data) {
    console.error(`Dictionary default not found: ${dictType}`);
    return '';
  }

  // 缓存并返回
  defaultCache.set(dictType, data.name);
  return data.name;
}

/**
 * 获取字典类型的所有值（带缓存）
 * @param dictType 字典类型，如 'candidate_status'
 * @returns 字典项名称数组
 */
export async function getDictValues(dictType: string): Promise<string[]> {
  // 检查缓存
  if (dictCache.has(dictType)) {
    const typeCache = dictCache.get(dictType)!;
    return Array.from(typeCache.values());
  }

  // 从数据库查询
  const { data, error } = await supabase
    .from('data_dictionary')
    .select('name')
    .eq('dict_type', dictType)
    .order('sort_order', { ascending: true });

  if (error || !data || data.length === 0) {
    console.warn(`Dictionary values not found: ${dictType}`);
    return [];
  }

  // 构建缓存
  const typeCache = new Map<string, string>();
  const values = data.map(item => {
    typeCache.set(item.name, item.name);
    return item.name;
  });
  dictCache.set(dictType, typeCache);

  return values;
}

/**
 * 清除字典缓存（用于数据字典更新后刷新缓存）
 * @param dictType 可选的字典类型，如果提供则只清除该类型的缓存，否则清除所有缓存
 */
export function clearDictCache(dictType?: string): void {
  if (dictType) {
    dictCache.delete(dictType);
    defaultCache.delete(dictType);
  } else {
    dictCache.clear();
    defaultCache.clear();
  }
}
