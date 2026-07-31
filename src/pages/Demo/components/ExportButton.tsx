import { useState } from 'react';
import { Button, Toast, Selector } from 'antd-mobile';
import { exportTab } from '@/services/demo';
import type { ExportTab, ExportFormat } from '@/services/demo';
import styles from './ExportButton.less';

interface Props {
  tab: ExportTab;
}

/** 格式选项 */
const FORMAT_OPTIONS = [
  { label: 'CSV', value: 'csv' },
  { label: 'XLSX', value: 'xlsx' },
];

/**
 * F06 导出按钮组件
 * 调用 W04 POST /api/demo/export，下载文件流。
 */
const ExportButton: React.FC<Props> = ({ tab }) => {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const blob = await exportTab(tab, format);
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `demo-${tab}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      Toast.show({ content: '导出成功', icon: 'success' });
    } catch (e) {
      // 导出接口异常时前端可降级提示，不影响三 Tab 展示能力
      Toast.show({ content: '导出失败，可稍后重试', icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Selector
        options={FORMAT_OPTIONS}
        value={[format]}
        onChange={(v) => v[0] && setFormat(v[0] as ExportFormat)}
        style={{ '--color': '#1677ff' }}
      />
      <Button
        color="primary"
        size="small"
        loading={loading}
        onClick={handleExport}
      >
        导出 {tab}
      </Button>
    </div>
  );
};

export default ExportButton;
