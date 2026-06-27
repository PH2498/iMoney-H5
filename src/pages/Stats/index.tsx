import MotionWrap from '@/components/base/MotionWrap';
import TabBar from '@/components/base/TabBar';
import styles from './index.less';

interface Props {}

const StatsPage: React.FC<Props> = () => {
  return (
    <>
      <MotionWrap variant="fade">
        <div className={styles.page}>
          <h1 className={styles.title}>统计</h1>
          <p className={styles.desc}>数据统计页面</p>
        </div>
      </MotionWrap>
      <TabBar />
    </>
  );
};

export default StatsPage;
