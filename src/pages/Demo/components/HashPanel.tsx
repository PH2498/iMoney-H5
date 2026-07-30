import { Button, Empty, Form, Input, Space } from 'antd-mobile';
import { useState } from 'react';
import { fetchHash, type HashResult } from '@/services/demo';

interface Props {
  onLoaded?: (summary: string) => void;
}

const HashPanel: React.FC<Props> = ({ onLoaded }) => {
  const [input, setInput] = useState('hello');
  const [result, setResult] = useState<HashResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const compute = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchHash(input);
      setResult(data);
      onLoaded?.(`${data.algorithm}: ${data.input}`);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return <Empty description="计算失败" />;
  }

  return (
    <Space direction="vertical" block>
      <Form layout="horizontal">
        <Form.Item label="输入">
          <Input value={input} onChange={setInput} placeholder="输入待哈希字符串" />
        </Form.Item>
      </Form>
      <Button loading={loading} onClick={compute} color="primary" size="small">
        计算哈希
      </Button>
      {result && (
        <Space direction="vertical" block>
          <div>算法：{result.algorithm}</div>
          <div>输入：{result.input}</div>
          <div style={{ wordBreak: 'break-all' }}>哈希：{result.hash}</div>
        </Space>
      )}
    </Space>
  );
};

export default HashPanel;
