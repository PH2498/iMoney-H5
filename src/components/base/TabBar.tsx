import { TAB_BARS } from '@/constants';
import { useModel, useLocation, history } from '@umijs/max';
import { AnimatePresence, motion } from 'framer-motion';
import * as Icons from '@ant-design/icons';
import type { ReactNode } from 'react';
import styles from './TabBar.less';

interface Props {}

/** 单个 Tab 项 */
interface TabItemProps {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

const iconComponents: Record<string, React.ComponentType> = {
  AppOutline: (Icons as Record<string, React.ComponentType>).AppstoreOutlined,
  BarChartOutline: (Icons as Record<string, React.ComponentType>).BarChartOutlined,
  RobotOutline: (Icons as Record<string, React.ComponentType>).RobotOutlined,
  UserOutline: (Icons as Record<string, React.ComponentType>).UserOutlined,
};

/** 单个 Tab 按钮 */
const TabItem: React.FC<TabItemProps> = ({ icon, label, active, onClick }) => {
  return (
    <button
      className={`${styles.tabItem} ${active ? styles.tabItemActive : ''}`}
      onClick={onClick}
    >
      <AnimatePresence mode="wait">
        {active && (
          <motion.span
            className={styles.activeBg}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          />
        )}
      </AnimatePresence>
      <span className={styles.iconWrap}>{icon}</span>
      <span className={styles.label}>{label}</span>
    </button>
  );
};

/** 底部玻璃拟态 TabBar 导航栏 */
const TabBar: React.FC<Props> = () => {
  const { activeTab, setActiveTab } = useModel('global');
  const location = useLocation();

  const handleTabClick = (path: string, key: string) => {
    setActiveTab(key);
    history.push(path);
  };

  /** 当前路由是否匹配 tab */
  const isTabActive = (path: string, key: string) => {
    if (activeTab === key) return true;
    return location.pathname.startsWith(path);
  };

  return (
    <div className={styles.wrapper}>
      <nav className={styles.tabbar}>
        {TAB_BARS.map((tab) => {
          const IconComp = iconComponents[tab.icon];
          const active = isTabActive(tab.path, tab.key);

          return (
            <TabItem
              key={tab.key}
              icon={<IconComp />}
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
