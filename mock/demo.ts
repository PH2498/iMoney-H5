// Demo 接口 mock 兜底：code 格式对齐后端 ApiResult
// 后端未启动时，前端开发态可独立运行
export default {
  'GET /api/v1/helloworld': (_req: any, res: any) => {
    res.json({
      code: 0,
      message: 'success',
      data: { message: 'Hello, World!' },
    });
  },
  'GET /api/v1/hash': (req: any, res: any) => {
    const input = req?.query?.input || 'hello';
    res.json({
      code: 0,
      message: 'success',
      data: {
        input,
        algorithm: 'SHA-256',
        hash: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e3c1afa7a8e8b8f0c3a7a8e0d3a',
      },
    });
  },
  'GET /api/v1/bubble': (req: any, res: any) => {
    const arrParam = req?.query?.arr as string | undefined;
    let input = [5, 3, 8, 1, 9, 2, 7];
    if (arrParam) {
      const parsed = arrParam
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n));
      if (parsed.length) {
        input = parsed;
      }
    }
    // 简单冒泡模拟
    const sorted = [...input];
    let swaps = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      for (let j = 0; j < sorted.length - 1 - i; j++) {
        if (sorted[j] > sorted[j + 1]) {
          [sorted[j], sorted[j + 1]] = [sorted[j + 1], sorted[j]];
          swaps++;
        }
      }
    }
    res.json({
      code: 0,
      message: 'success',
      data: { input, sorted, swaps },
    });
  },
};
