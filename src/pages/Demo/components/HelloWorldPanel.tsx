import { Button, Empty, Space } from 'antd-mobile';
import { useEffect, useState } from 'react';
import { fetchHelloworld } from '@/services/demo';

const HelloWorldPanel: React.FC = () => {
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchHelloworld();
      setMessage(data.message);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return <Empty description="加载失败" />;
  }

  return (
    <Space direction="vertical" block>
      <div style={{ minHeight: 24 }}>{message}</div>
      <Button loading={loading} onClick={load} color="primary" size="small">
        刷新
      </Button>
    </Space>
  );
};

export default HelloWorldPanel;
