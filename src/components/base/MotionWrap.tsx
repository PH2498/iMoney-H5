import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface Props {
  /** 子元素 */
  children: ReactNode;
  /** 是否展示，控制 AnimatePresence 出场/离场 */
  show?: boolean;
  /** 动画变体类型 */
  variant?: 'fade' | 'slideUp' | 'slideLeft' | 'scale';
}

/** 页面入场淡入上滑 */
const fadeSlideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

/** 左侧滑入 */
const slideLeft = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
};

/** 缩放弹性 */
const scale = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

const variantsMap = {
  fade: fadeSlideUp,
  slideUp: fadeSlideUp,
  slideLeft,
  scale,
};

/**
 * 统一动画封装组件
 * 页面/弹窗/列表入场动画统一使用
 */
const MotionWrap: React.FC<Props> = ({
  children,
  show = true,
  variant = 'fade',
}) => {
  const selected = variantsMap[variant];

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          initial={selected.initial}
          animate={selected.animate}
          exit={selected.exit}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 24,
          }}
          style={{ willChange: 'transform, opacity' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MotionWrap;
