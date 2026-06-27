/** 项目名称 */
export const APP_NAME = 'iMoney';

/** 底部 Tab 导航项 */
export const TAB_BARS = [
  { key: 'home', title: '首页', icon: 'AppOutline', path: '/home' },
  { key: 'stats', title: '统计', icon: 'BarChartOutline', path: '/stats' },
  { key: 'ai-assistant', title: 'AI助手', icon: 'RobotOutline', path: '/ai-assistant' },
  { key: 'mine', title: '我的', icon: 'UserOutline', path: '/mine' },
] as const;
