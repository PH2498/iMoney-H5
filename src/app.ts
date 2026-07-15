// 运行时配置

console.log('你好');

/** 全局初始化数据 */
export async function getInitialState(): Promise<{ appName: string }> {
  return { appName: 'iMoney' };
}
