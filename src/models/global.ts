// H5 全局共享状态
import { useState } from 'react';

const useGlobal = () => {
  /** 当前激活的底部 tab 索引 */
  const [activeTab, setActiveTab] = useState<number>(0);

  return {
    activeTab,
    setActiveTab,
  };
};

export default useGlobal;
