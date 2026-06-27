// 运行时配置

/** 全局初始化数据 */
export async function getInitialState(): Promise<{ appName: string }> {
  return { appName: 'iMoney' };
}
