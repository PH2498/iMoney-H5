import { ActionSheet, Button, Tabs, Toast } from 'antd-mobile';
import { useState } from 'react';
import MotionWrap from '@/components/base/MotionWrap';
import { exportDemo, type ExportType } from '@/services/demo';
import BubblePanel from './components/BubblePanel';
import HashPanel from './components/HashPanel';
import HelloWorldPanel from './components/HelloWorldPanel';
import styles from './index.less';

type TabKey = 'helloworld' | 'hash' | 'bubble';

const TAB_TO_EXPORT: Record<TabKey, ExportType> = {
  helloworld: 'helloworld',
  hash: 'hash',
  bubble: 'bubble',
};

const DemoPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('helloworld');
  const [exporting, setExporting] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  const handleExport = async (type: ExportType) => {
    setActionSheetVisible(false);
    setExporting(true);
    try {
      await exportDemo(type);
      Toast.show({ content: '导出成功', icon: 'success' });
    } catch {
      Toast.show({ content: '导出失败', icon: 'fail' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <MotionWrap variant="fade">
      <div className={styles.page}>
        <div className={styles.header}>
          <span className={styles.title}>演示</span>
          <Button
            color="primary"
            size="small"
            loading={exporting}
            onClick={() => setActionSheetVisible(true)}
          >
            导出
          </Button>
        </div>
        <Tabs activeKey={activeTab} onChange={(k) => setActiveTab(k as TabKey)}>
          <Tabs.Tab title="HelloWorld" key="helloworld">
            <div className={styles.content}>
              <HelloWorldPanel />
            </div>
          </Tabs.Tab>
          <Tabs.Tab title="哈希" key="hash">
            <div className={styles.content}>
              <HashPanel />
            </div>
          </Tabs.Tab>
          <Tabs.Tab title="冒泡" key="bubble">
            <div className={styles.content}>
              <BubblePanel />
            </div>
          </Tabs.Tab>
        </Tabs>
      </div>
      <ActionSheet
        visible={actionSheetVisible}
        actions={[
          {
            text: '导出当前 Tab',
            key: 'current',
            onClick: () => handleExport(TAB_TO_EXPORT[activeTab]),
          },
          {
            text: '导出全部',
            key: 'all',
            onClick: () => handleExport('all'),
          },
        ]}
        onClose={() => setActionSheetVisible(false)}
        cancelText="取消"
      />
    </MotionWrap>
  );
};

export default DemoPage;
