import { useState } from 'react';
import { Button, Toast } from 'antd-mobile';
import { fetchHello } from '@/services/demo';
import styles from './TabCommon.less';

/** F04 HelloWorld Tab — 展示 GET /api/demo/hello 执行结果 */
const HelloWorldTab: React.FC = () => {
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleExecute = async () => {
    setLoading(true);
    try {
      const result = await fetchHello();
      setMessage(result.message);
      Toast.show({ content: '执行成功', icon: 'success' });
    } catch (e) {
      Toast.show({ content: '执行失败，请检查后端服务', icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.tabContent}>
      <p className={styles.hint}>
        点击执行调用 HelloWorld 接口，返回固定文案。
      </p>
      <Button
        color="primary"
        size="middle"
        block
        loading={loading}
        onClick={handleExecute}
      >
        执行 HelloWorld
      </Button>
      {message && (
        <div className={styles.resultBox}>
          <span className={styles.resultLabel}>返回结果：</span>
          <span className={styles.resultValue}>{message}</span>
        </div>
      )}
    </div>
  );
};

export default HelloWorldTab;
