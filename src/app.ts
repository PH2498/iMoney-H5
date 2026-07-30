// 运行配置
import { Toast } from 'antd-mobile';

/** 全局初始化数据 */
export async function getInitialState(): Promise<{ appName: string }> {
  return { appName: 'iMoney' };
}

/** request 错误统一拦截 */
export const request = {
  errorConfig: {
    errorThrower: (res: any) => {
      const { code, message } = res || {};
      if (code !== 0) {
        throw new Error(message || '请求失败');
      }
    },
    errorHandler: (error: any) => {
      const msg = error?.message || '网络异常，请稍后重试';
      Toast.show({ content: msg, icon: 'fail' });
    },
  },
};
