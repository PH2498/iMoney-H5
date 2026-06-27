import { TAB_BARS } from '@/constants';
import {
  AppstoreFilled,
  AppstoreOutlined,
  BarChartOutlined,
  FundFilled,
  RobotFilled,
  RobotOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { history, useLocation, useModel } from '@umijs/max';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import styles from './TabBar.less';

interface Props {}

interface TabItemProps {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

interface IconPair {
  outline: React.ComponentType;
  filled?: React.ComponentType;
}

/** 图标映射：非激活轮廓 / 激活实心 */
const iconMap: Record<string, IconPair> = {
  AppOutline: { outline: AppstoreOutlined, filled: AppstoreFilled },
  BarChartOutline: { outline: BarChartOutlined, filled: FundFilled },
  RobotOutline: { outline: RobotOutlined, filled: RobotFilled },
  UserOutline: { outline: UserOutlined },
};

/** 单个 Tab 按钮 */
const TabItem: React.FC<TabItemProps> = ({ icon, label, active, onClick }) => {
  return (
    <motion.button
      type="button"
      className={`${styles.tabItem} ${active ? styles.tabItemActive : ''}`}
      onClick={onClick}
      whileTap={{ scale: active ? 0.96 : 0.92 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      style={{ willChange: 'transform' }}
    >
      {active && (
        <motion.span
          className={styles.liquidIndicator}
          layoutId="liquidTabIndicator"
          transition={{
            type: 'spring',
            stiffness: 380,
            damping: 32,
            mass: 0.8,
          }}
          style={{ willChange: 'transform, opacity' }}
        />
      )}
      <motion.span
        className={styles.iconWrap}
        animate={{
          scale: active ? 1.08 : 1,
          y: active ? -1 : 0,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 26 }}
      >
        {icon}
      </motion.span>
      <motion.span
        className={styles.label}
        animate={{
          opacity: active ? 1 : 0.72,
          y: active ? 0 : 1,
        }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
      >
        {label}
      </motion.span>
    </motion.button>
  );
};

/** 底部 Liquid Glass TabBar */
const TabBar: React.FC<Props> = () => {
  const { activeTab, setActiveTab, syncTabByPath } = useModel('global');
  const location = useLocation();

  useEffect(() => {
    syncTabByPath(location.pathname);
  }, [location.pathname, syncTabByPath]);

  const handleTabClick = (path: string, key: string) => {
    if (activeTab === key) return;
    setActiveTab(key);
    history.push(path);
  };

  const isTabActive = (path: string, key: string) => {
    return location.pathname.startsWith(path) || activeTab === key;
  };

  return (
    <div className={styles.wrapper}>
      <nav className={styles.tabbar} aria-label="底部导航">
        <span className={styles.glassSpecular} aria-hidden />
        <span className={styles.glassSheen} aria-hidden />
        {TAB_BARS.map((tab) => {
          const icons = iconMap[tab.icon];
          const active = isTabActive(tab.path, tab.key);
          const IconComp =
            active && icons.filled ? icons.filled : icons.outline;

          return (
            <TabItem
              key={tab.key}
              icon={
                <span
                  className={
                    active ? styles.iconActive : styles.iconInactive
                  }
                >
                  <IconComp />
                </span>
              }
              label={tab.title}
              active={active}
              onClick={() => handleTabClick(tab.path, tab.key)}
            />
          );
        })}
      </nav>
    </div>
  );
};

export default TabBar;
