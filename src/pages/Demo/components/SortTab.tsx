import { useState } from 'react';
import { Button, Toast, TextArea } from 'antd-mobile';
import { fetchSort } from '@/services/demo';
import styles from './TabCommon.less';

/** F04 冒泡排序 Tab — 展示 POST /api/demo/sort 执行结果 */
const SortTab: React.FC = () => {
  const [inputText, setInputText] = useState('5, 3, 8, 1, 2');
  const [sorted, setSorted] = useState<number[]>([]);
  const [swapCount, setSwapCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleExecute = async () => {
    // 解析输入数字数组
    const items = inputText
      .split(/[\s,]+/)
      .filter((s) => s.trim())
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));

    if (items.length === 0) {
      Toast.show({ content: 'items 不能为空', icon: 'fail' });
      return;
    }

    setLoading(true);
    try {
      const result = await fetchSort(items);
      setSorted(result.sorted);
      setSwapCount(result.swapCount);
      Toast.show({ content: '执行成功', icon: 'success' });
    } catch (e) {
      Toast.show({ content: '执行失败，请检查后端服务', icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.tabContent}>
      <p className={styles.hint}>输入逗号分隔的整数数组，执行冒泡排序。</p>
      <TextArea
        placeholder="如：5, 3, 8, 1, 2"
        value={inputText}
        onChange={setInputText}
        rows={2}
      />
      <Button
        color="primary"
        size="middle"
        block
        loading={loading}
        onClick={handleExecute}
        style={{ marginTop: 12 }}
      >
        执行冒泡排序
      </Button>
      {sorted.length > 0 && (
        <div className={styles.resultBox}>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>排序结果：</span>
            <span className={styles.resultValue}>[{sorted.join(', ')}]</span>
          </div>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>交换次数：</span>
            <span className={styles.resultValue}>{swapCount}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SortTab;
