import { useState } from 'react';
import { Tabs } from 'antd-mobile';
import MotionWrap from '@/components/base/MotionWrap';
import TabBar from '@/components/base/TabBar';
import HelloWorldTab from './components/HelloWorldTab';
import HashTab from './components/HashTab';
import SortTab from './components/SortTab';
import ExportButton from './components/ExportButton';
import MetricsReport from './components/MetricsReport';
import styles from './index.less';

/** 当前激活的 Tab 标识 */
type TabKey = 'hello' | 'hash' | 'sort';

const TAB_ITEMS: { key: TabKey; title: string }[] = [
  { key: 'hello', title: 'HelloWorld' },
  { key: 'hash', title: '哈希算法' },
  { key: 'sort', title: '冒泡排序' },
];

const DemoPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('hello');

  return (
    <>
      <MotionWrap variant="fade">
        <div className={styles.page}>
          <h1 className={styles.title}>算法演示</h1>
          <p className={styles.desc}>三接口执行结果展示 · 调用埋点可视化</p>

          {/* 导出按钮（F06） */}
          <div className={styles.exportBar}>
            <ExportButton tab={activeTab} />
          </div>

          {/* 三 Tab 切换（F04） */}
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as TabKey)}
          >
            {TAB_ITEMS.map((tab) => (
              <Tabs.Tab key={tab.key} title={tab.title} />
            ))}
          </Tabs>

          {/* Tab 内容区 */}
          <div className={styles.content}>
            {activeTab === 'hello' && <HelloWorldTab />}
            {activeTab === 'hash' && <HashTab />}
            {activeTab === 'sort' && <SortTab />}
          </div>

          {/* 调用报表可视化（F09/F10） */}
          <div className={styles.reportSection}>
            <h2 className={styles.sectionTitle}>调用情况报表</h2>
            <MetricsReport />
          </div>
        </div>
      </MotionWrap>
      <TabBar />
    </>
  );
};

export default DemoPage;
