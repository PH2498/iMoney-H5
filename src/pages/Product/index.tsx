import MotionWrap from '@/components/base/MotionWrap';
import styles from './index.less';

interface Props {}

const ProductPage: React.FC<Props> = () => {
  return (
    <MotionWrap variant="slideUp">
      <div className={styles.page}>
        <h1 className={styles.title}>商品</h1>
        <p className={styles.desc}>商品列表页面</p>
      </div>
    </MotionWrap>
  );
};

export default ProductPage;
