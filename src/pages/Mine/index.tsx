import MotionWrap from '@/components/base/MotionWrap';
import styles from './index.less';

interface Props {}

const MinePage: React.FC<Props> = () => {
  return (
    <MotionWrap variant="slideUp">
      <div className={styles.page}>
        <h1 className={styles.title}>我的</h1>
        <p className={styles.desc}>个人中心页面</p>
      </div>
    </MotionWrap>
  );
};

export default MinePage;
