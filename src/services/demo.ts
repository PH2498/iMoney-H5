import { request } from '@umijs/max';

/** W01 HelloWorld 出参 */
export interface HelloResult {
  message: string;
}

/** W02 哈希出参 */
export interface HashResult {
  algorithm: string;
  digest: string;
}

/** W03 冒泡排序出参 */
export interface SortResult {
  sorted: number[];
  swapCount: number;
}

/** 通用出参结构 */
interface ApiResult<T> {
  result: string;
  msg: string;
  data: T;
}

/** W05 调用统计出参 */
export interface CallStatsResult {
  chartType: string;
  dimension: string;
  series: { name: string; value: number }[];
}

/** 导出 tab 类型 */
export type ExportTab = 'hello' | 'hash' | 'sort';

/** 导出格式 */
export type ExportFormat = 'csv' | 'xlsx';

/** 统计维度 */
export type Dimension = 'role' | 'level' | 'dept';

/** 图表类型 */
export type ChartType = 'line' | 'pie' | 'bar';

/**
 * W01 HelloWorld — GET /api/demo/hello
 */
export async function fetchHello(): Promise<HelloResult> {
  const res = await request<ApiResult<HelloResult>>('/api/demo/hello', {
    method: 'GET',
  });
  return res.data;
}

/**
 * W02 哈希算法 — POST /api/demo/hash
 */
export async function fetchHash(
  raw: string,
  algorithm?: string,
): Promise<HashResult> {
  const res = await request<ApiResult<HashResult>>('/api/demo/hash', {
    method: 'POST',
    data: { raw, algorithm },
  });
  return res.data;
}

/**
 * W03 冒泡排序 — POST /api/demo/sort
 */
export async function fetchSort(items: number[]): Promise<SortResult> {
  const res = await request<ApiResult<SortResult>>('/api/demo/sort', {
    method: 'POST',
    data: { items },
  });
  return res.data;
}

/**
 * W04 导出 — POST /api/demo/export（文件流）
 */
export async function exportTab(
  tab: ExportTab,
  format: ExportFormat = 'csv',
): Promise<Blob> {
  const blob = await request<Blob>('/api/demo/export', {
    method: 'POST',
    data: { tab, format },
    responseType: 'blob',
  });
  return blob;
}

/**
 * W05 调用统计 — GET /api/metrics/call-stats
 */
export async function fetchCallStats(
  dimension: Dimension,
  chartType: ChartType,
): Promise<CallStatsResult> {
  const res = await request<ApiResult<CallStatsResult>>(
    '/api/metrics/call-stats',
    {
      method: 'GET',
      params: { dimension, chartType },
    },
  );
  return res.data;
}
