import MotionWrap from '@/components/base/MotionWrap';
import TabBar from '@/components/base/TabBar';
import styles from './index.less';

interface Props {}

const AIAssistantPage: React.FC<Props> = () => {
  return (
    <>
      <MotionWrap variant="slideUp">
        <div className={styles.page}>
          <h1 className={styles.title}>AI助手</h1>
          <p className={styles.desc}>智能助手页面</p>
        </div>
      </MotionWrap>
      <TabBar />
    </>
  );
};

export default AIAssistantPage;
