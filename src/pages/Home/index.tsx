import { Button } from 'antd-mobile';
import MotionWrap from '@/components/base/MotionWrap';
import styles from './index.less';

interface Props {}

const HomePage: React.FC<Props> = () => {
  return (
    <MotionWrap variant="fade">
      <div className={styles.page}>
        <h1 className={styles.title}>首页</h1>
        <p className={styles.desc}>欢迎使用 iMoney H5</p>
        <Button color="primary" size="large" block>
          开始使用
        </Button>
      </div>
    </MotionWrap>
  );
};

export default HomePage;
