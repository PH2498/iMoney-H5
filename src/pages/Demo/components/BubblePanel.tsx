import { Button, Empty, Input, Space, Toast } from 'antd-mobile';
import { useState } from 'react';
import { fetchBubble, type BubbleResult } from '@/services/demo';

const BubblePanel: React.FC = () => {
  const [arrText, setArrText] = useState('5,3,8,1,9,2,7');
  const [result, setResult] = useState<BubbleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const sort = async () => {
    setLoading(true);
    setError(false);
    try {
      const parts = arrText.split(',');
      const arr: number[] = [];
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed === '') continue;
        const parsed = parseInt(trimmed, 10);
        if (Number.isNaN(parsed)) {
          Toast.show({ content: '输入包含非数字，请检查', icon: 'fail' });
          return;
        }
        arr.push(parsed);
      }
      if (arr.length === 0) {
        Toast.show({ content: '请输入数字', icon: 'fail' });
        return;
      }
      const data = await fetchBubble(arr);
      setResult(data);
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
