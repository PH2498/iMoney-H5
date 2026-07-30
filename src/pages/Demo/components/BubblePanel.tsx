import { Button, Empty, Input, Space } from 'antd-mobile';
import { useState } from 'react';
import { fetchBubble, type BubbleResult } from '@/services/demo';

interface Props {
  onLoaded?: (summary: string) => void;
}

const BubblePanel: React.FC<Props> = ({ onLoaded }) => {
  const [arrText, setArrText] = useState('5,3,8,1,9,2,7');
  const [result, setResult] = useState<BubbleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const sort = async () => {
    setLoading(true);
    setError(false);
    try {
      const arr = arrText
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n));
      const data = await fetchBubble(arr);
      setResult(data);
      onLoaded?.(`swaps: ${data.swaps}`);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return <Empty description="排序失败" />;
  }

  return (
    <Space direction="vertical" block>
      <Input value={arrText} onChange={setArrText} placeholder="逗号分隔的数字，如 5,3,8" />
      <Button loading={loading} onClick={sort} color="primary" size="small">
        冒泡排序
      </Button>
      {result && (
        <Space direction="vertical" block>
          <div>输入：{result.input.join(', ')}</div>
          <div>排序：{result.sorted.join(', ')}</div>
          <div>交换次数：{result.swaps}</div>
        </Space>
      )}
    </Space>
  );
};

export default BubblePanel;
