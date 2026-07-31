import { useState } from 'react';
import { Button, Toast, TextArea, Selector, Space } from 'antd-mobile';
import { fetchHash } from '@/services/demo';
import styles from './TabCommon.less';

/** 算法选项 */
const ALGORITHM_OPTIONS = [
  { label: 'SHA256', value: 'sha256' },
  { label: 'MD5', value: 'md5' },
  { label: 'SHA1', value: 'sha1' },
];

/** F04 哈希算法 Tab — 展示 POST /api/demo/hash 执行结果 */
const HashTab: React.FC = () => {
  const [raw, setRaw] = useState('hello');
  const [algorithm, setAlgorithm] = useState<string>('sha256');
  const [digest, setDigest] = useState<string>('');
  const [actualAlgo, setActualAlgo] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleExecute = async () => {
    if (!raw.trim()) {
      Toast.show({ content: 'raw 不能为空', icon: 'fail' });
      return;
    }
    setLoading(true);
    try {
      const result = await fetchHash(raw, algorithm);
      setDigest(result.digest);
      setActualAlgo(result.algorithm);
      Toast.show({ content: '执行成功', icon: 'success' });
    } catch (e) {
      Toast.show({ content: '执行失败，请检查后端服务', icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.tabContent}>
      <p className={styles.hint}>输入原文，选择算法，计算哈希摘要。</p>
      <Space direction="vertical" block style={{ '--gap': '12px' }}>
        <TextArea
          placeholder="请输入原文"
          value={raw}
          onChange={setRaw}
          rows={3}
          maxLength={500}
          showCount
        />
        <Selector
          options={ALGORITHM_OPTIONS}
          value={[algorithm]}
          onChange={(v) => v[0] && setAlgorithm(v[0] as string)}
        />
        <Button
          color="primary"
          size="middle"
          block
          loading={loading}
          onClick={handleExecute}
        >
          计算哈希
        </Button>
        {digest && (
          <div className={styles.resultBox}>
            <div className={styles.resultRow}>
              <span className={styles.resultLabel}>实际算法：</span>
              <span className={styles.resultValue}>{actualAlgo}</span>
            </div>
            <div className={styles.resultRow}>
              <span className={styles.resultLabel}>摘要：</span>
              <span className={styles.resultValue} style={{ wordBreak: 'break-all' }}>
                {digest}
              </span>
            </div>
          </div>
        )}
      </Space>
    </div>
  );
};

export default HashTab;
