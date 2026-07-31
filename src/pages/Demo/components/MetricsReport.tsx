import { useEffect, useState } from 'react';
import { Button, Selector, Space, Toast } from 'antd-mobile';
import { Line, Pie, Bar } from 'ant-design-mobile-chart';
import {
  fetchCallStats,
  type Dimension,
  type ChartType,
  type CallStatsResult,
} from '@/services/demo';
import styles from './MetricsReport.less';

/** 维度选项 */
const DIMENSION_OPTIONS = [
  { label: '人员类型', value: 'role' },
  { label: '人员层级', value: 'level' },
  { label: '人员部门', value: 'dept' },
];

/** 图表类型选项 */
const CHART_OPTIONS = [
  { label: '折线图', value: 'line' },
  { label: '饼图', value: 'pie' },
  { label: '柱状图', value: 'bar' },
];

/**
 * F09/F10 调用报表可视化组件
 * 按维度（role/level/dept）和图表类型（line/pie/bar）展示调用情况。
 */
const MetricsReport: React.FC = () => {
  const [dimension, setDimension] = useState<Dimension>('dept');
  const [chartType, setChartType] = useState<ChartType>('pie');
  const [stats, setStats] = useState<CallStatsResult | null>(null);
  const [loading, setLoading] = useState(false);

  /** 加载统计数据 */
  const loadStats = async (dim: Dimension, ct: ChartType) => {
    setLoading(true);
    try {
      const result = await fetchCallStats(dim, ct);
      setStats(result);
    } catch (e) {
      // 降级：内存埋点存储为空时聚合返回空 series，不报错
      Toast.show({ content: '暂无调用统计数据', icon: 'fail' });
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats(dimension, chartType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimension, chartType]);

  /** 构建图表数据 */
  const chartData = (stats?.series || []).map((item) => ({
    name: item.name,
    value: item.value,
  }));

  /** 渲染图表 */
  const renderChart = () => {
    if (loading) {
      return <div className={styles.loading}>加载中...</div>;
    }
    if (!chartData.length) {
      return <div className={styles.empty}>暂无数据</div>;
    }

    switch (chartType) {
      case 'line':
        return (
          <Line
            data={chartData}
            xField="name"
            yField="value"
            height={240}
          />
        );
      case 'pie':
        return (
          <Pie
            data={chartData}
            angleField="value"
            colorField="name"
            height={240}
          />
        );
      case 'bar':
        return (
          <Bar
            data={chartData}
            xField="name"
            yField="value"
            height={240}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      <Space direction="vertical" block style={{ '--gap': '12px' }}>
        {/* 维度选择 */}
        <div className={styles.controlRow}>
          <span className={styles.controlLabel}>维度</span>
          <Selector
            options={DIMENSION_OPTIONS}
            value={[dimension]}
            onChange={(v) => v[0] && setDimension(v[0] as Dimension)}
          />
        </div>

        {/* 图表类型选择 */}
        <div className={styles.controlRow}>
          <span className={styles.controlLabel}>图表</span>
          <Selector
            options={CHART_OPTIONS}
            value={[chartType]}
            onChange={(v) => v[0] && setChartType(v[0] as ChartType)}
          />
        </div>

        {/* 刷新按钮 */}
        <Button
          size="small"
          onClick={() => loadStats(dimension, chartType)}
          loading={loading}
        >
          刷新数据
        </Button>

        {/* 图表渲染区 */}
        <div className={styles.chartArea}>{renderChart()}</div>
      </Space>
    </div>
  );
};

export default MetricsReport;
