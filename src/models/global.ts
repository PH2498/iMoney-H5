// H5 全局共享状态
import { TAB_BARS } from '@/constants';
import { useCallback, useState } from 'react';

const useGlobal = () => {
  /** 当前激活的底部 tab key */
  const [activeTab, setActiveTab] = useState<string>('home');

  /** 根据路由路径同步底部 tab 激活状态 */
  const syncTabByPath = useCallback((pathname: string) => {
    const match = TAB_BARS.find((tab) => pathname.startsWith(tab.path));
    if (match) {
      setActiveTab(match.key);
    }
  }, []);

  return {
    activeTab,
    setActiveTab,
    syncTabByPath,
  };
};

export default useGlobal;
