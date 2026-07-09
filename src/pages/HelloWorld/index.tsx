import MotionWrap from '@/components/base/MotionWrap';
import TabBar from '@/components/base/TabBar';
import styles from './index.less';

interface Props {}

const HelloWorld: React.FC<Props> = () => {
  return (
    <>
      <MotionWrap variant="fade">
        <div className={styles.container}>
          <h1 className={styles.title}>Hello World</h1>
          <p className={styles.desc}>Welcome to iMoney H5</p>
        </div>
      </MotionWrap>
      <TabBar />
    </>
  );
};

export default HelloWorld;