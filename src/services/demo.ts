import { request } from '@umijs/max';

/** 后端统一响应体 */
export interface ApiResult<T> {
  code: number;
  message: string;
  data: T;
}

export interface HelloWorldResult {
  message: string;
}

export interface HashResult {
  input: string;
  algorithm: string;
  hash: string;
}

export interface BubbleResult {
  input: number[];
  sorted: number[];
  swaps: number;
}

export type ExportType = 'helloworld' | 'hash' | 'bubble' | 'all';

/** HelloWorld 接口 */
export async function fetchHelloworld() {
  const res = await request<ApiResult<HelloWorldResult>>('/api/v1/helloworld');
  return res.data;
}

/** 哈希接口 */
export async function fetchHash(input?: string) {
  const res = await request<ApiResult<HashResult>>('/api/v1/hash', {
    params: input ? { input } : {},
  });
  return res.data;
}

/** 冒泡排序接口 */
export async function fetchBubble(arr?: number[]) {
  const res = await request<ApiResult<BubbleResult>>('/api/v1/bubble', {
    params: arr && arr.length ? { arr: arr.join(',') } : {},
  });
  return res.data;
}

/**
 * 导出接口：触发浏览器下载 CSV。
 *
 * 后端成功时返回 text/csv（Blob），失败时返回 application/json（ApiResult 错误体）。
 * 本函数先检查 Content-Type：若为 JSON 则解析为错误并 throw，交由调用方 Toast 提示。
 */
export async function exportDemo(type: ExportType) {
  const res = await request<Blob>('/api/v1/export', {
    params: { type, format: 'csv' },
    responseType: 'blob',
    getResponse: true,
    skipErrorHandler: true,
  });

  const blob: Blob = res.data;
  const contentType = res.response?.headers?.['content-type'] || '';

  // 后端失败时返回 JSON 错误体，需解析后 throw 交由调用方提示
  if (contentType.includes('application/json')) {
    const text = await blob.text();
    let errMsg = '导出失败';
    try {
      const errResult = JSON.parse(text) as ApiResult<unknown>;
      if (errResult?.message) {
        errMsg = errResult.message;
      }
    } catch {
      // JSON 解析失败，使用默认错误消息
    }
    throw new Error(errMsg);
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
