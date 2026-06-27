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
      name: '商品',
      path: '/product',
      component: './Product',
    },
    {
      name: '我的',
      path: '/mine',
      component: './Mine',
    },
  ],
  npmClient: 'yarn',
});
