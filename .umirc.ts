import { defineConfig } from '@umijs/max';

export default defineConfig({
  model: {},
  initialState: {},
  request: {},
  extraPostCSSPlugins: [
    require('postcss-px-to-viewport')({
      viewportWidth: 375,
      unitPrecision: 5,
      viewportUnit: 'vw',
      selectorBlackList: [],
      minPixelValue: 1,
      mediaQuery: false,
    }),
  ],
  routes: [
    {
      path: '/',
      redirect: '/home',
    },
    {
      name: '首页',
      path: '/home',
      component: './Home',
    },
    {
      name: '统计',
      path: '/stats',
      component: './Stats',
    },
    {
      name: 'AI助手',
      path: '/ai-assistant',
      component: './AIAssistant',
    },
    {
      name: '我的',
      path: '/mine',
      component: './Mine',
    },
  ],
  npmClient: 'yarn',
});
