# 成本统计报表 — 实施计划

| 项目 | 值 |
|---|---|
| 文档日期 | 2026-07-30 |
| 阶段 | 实施计划 |
| 采用技能 | /writing-plans |
| 上游文档 | docs/cost-report/2026-07-30-cost-statistics-requirement.md |
| 状态 | 待执行 |

> 我正在使用 writing-plans 技能创建此实施计划。

---

## 1. 目标

在 iMoney-H5 前端开发成本统计报表，包含 Dashboard 总览页和多维度成本分析页，按部门/项目/业务线/人员/月份/季度/年度维度展示，区分人力成本与项目成本。数据来源采用 Mock-first 策略 + API 契约规范，后端仓库 `iMoney-Server` 接入后切换真实 API，前端无需改动。

**核心目标**：
- Dashboard 总览成本概况与趋势（KPI 卡片 + 趋势折线 + 构成环形图 + 部门排名柱状图）
- 多维度成本分析页支持筛选下钻（维度筛选器 + 成本类型切换 + 维度对比图 + 明细列表）
- 区分人力/项目成本分别统计
- 异常场景全链路兜底（空数据/超时/渲染失败均有占位或降级）

---

## 2. 架构

### 2.1 路由结构

```
/stats → 改造为成本报表入口（TabBar 已有"统计"入口）
  ├── /stats/dashboard   成本总览 Dashboard（默认）
  └── /stats/analysis    成本分析页
```

- `/stats` 自动 redirect 至 `/stats/dashboard`
- TabBar `isTabActive` 使用 `location.pathname.startsWith(path)` 判断，`/stats/dashboard` 和 `/stats/analysis` 会正确高亮统计 Tab（已验证 TabBar.tsx 第 102-104 行）

### 2.2 数据流

```
Component → useModel('costStats') → useRequest(API) → Mock/Backend
```

- 页面组件通过 `useModel('costStats')` 获取数据与方法
- `costStats` model 内部使用 `useRequest` 调用 `src/services/cost.ts` 中的 request 函数
- 开发期：Umi Mock（`mock/cost.ts`）拦截 `/api/cost/*` 请求
- 生产期：`.umirc.ts` proxy 代理至 `iMoney-Server` 后端

### 2.3 降级链路

```
真实后端 (iMoney-Server)  ──失败──▶  Umi Mock (mock/cost.ts)  ──失败──▶  空状态占位
```

前端 `request` 拦截器统一处理：HTTP 非 2xx → 业务 code 非 0 → 网络异常，三级降级。

---

## 3. 技术栈（已验证）

| 技术 | 版本 | 用途 | 状态 |
|---|---|---|---|
| Umi Max | `^4.6.68` | 框架（model/request/initialState 已启用） | ✅ 已安装 |
| antd-mobile | `^5.42.3` | UI 组件库 | ✅ 已安装 |
| ant-design-mobile-chart | `^1.2.2` | 移动端图表库 | ✅ 已安装 |
| framer-motion | `^12.42.0` | 动画 | ✅ 已安装 |
| @ant-design/icons | `^6.3.1` | 图标 | ✅ 已安装 |

**无需新增任何依赖。**

---

## 4. 全局约束

1. **仓库隔离**：所有改动仅限 iMoney-H5 仓库，不涉及 iMoney/ArmBasic/PH2498
2. **契约兼容**：全部新增 API，向后兼容，不修改现有接口
3. **Mock-first**：编码阶段以 Mock 驱动前端开发，后端接入后切换无需改前端
4. **金额单位**：元，展示保留 2 位小数，大额折叠万元（>10000 元显示为 X.XX 万元）
5. **分页**：明细列表每页 20 条
6. **时间范围默认**：当年（2026）+ 月粒度
7. **风格一致**：与现有 iMoney-H5（antd-mobile + MotionWrap + framer-motion）保持一致
8. **权限控制**：本期不做，预留路由守卫扩展点
9. **不破坏现有 TabBar**：Stats 子路由不影响 TabBar 高亮逻辑（已验证 `startsWith` 判断）

---

## 5. 任务清单

### T1. 类型定义与 API 契约层

**文件**：`src/services/cost.ts`（新建）

- [ ] T1.1 定义数据模型接口
  - `CostRecord`：`{ id, department, project, businessLine, person?, costType: 'labor' | 'project', amount: number, date: string, year: number, quarter: number, month: number, remark? }`
  - `CostSummary`：`{ dimension: string, totalCost: number, laborCost: number, projectCost: number, count: number }`
  - `CostTrend`：`{ period: string, totalCost: number, laborCost: number, projectCost: number }`
  - `CostKpi`：`{ totalCost, laborCost, projectCost, yoyChangeRate }`
  - `DashboardResponse`：`{ kpi: CostKpi, trend: CostTrend[], composition: { laborCost, projectCost }, departmentRank: CostSummary[] }`
  - `AnalysisSummary`：`{ totalCost, laborCost, projectCost, avgCost, maxCost, minCost, count }`
  - `AnalysisResponse`：`{ summary: AnalysisSummary, chartData: CostSummary[], list: CostRecord[], total: number }`
  - `OptionsResponse`：`{ departments: string[], projects: string[], businessLines: string[], persons: string[] }`
- [ ] T1.2 定义 query 参数类型
  - `DashboardQuery`：`{ year: number, granularity: 'year' | 'quarter' | 'month' }`
  - `AnalysisQuery`：`{ dimension, costType: 'labor' | 'project' | 'all', year?, quarter?, month?, department?, project?, businessLine?, person? }`
- [ ] T1.3 实现 request 函数（使用 Umi `request`）
  - `getDashboard(query: DashboardQuery): Promise<DashboardResponse>`
  - `getAnalysis(query: AnalysisQuery): Promise<AnalysisResponse>`
  - `getOptions(): Promise<OptionsResponse>`
  - 路径前缀 `/api/cost/`，与 Mock 对齐

**验证**：`npx tsc --noEmit` 无类型错误

---

### T2. Mock 数据层

**文件**：`mock/cost.ts`（新建）

参照 `mock/userAPI.ts` 模式：`{ 'GET /api/cost/...': (req, res) => res.json({...}) }`

- [ ] T2.1 生成 Mock 成本记录数据集
  - 覆盖 2025-2026 年，含 4 个部门、6 个项目、3 条业务线、8 个人员
  - 人力成本（costType=labor）含 person 字段，项目成本（costType=project）不含 person
  - 每条记录含 year/quarter/month 字段
- [ ] T2.2 实现 `GET /api/cost/dashboard`
  - 入参：`year`, `granularity`
  - 出参：`{ kpi: { totalCost, laborCost, projectCost, yoyChangeRate }, trend: CostTrend[], composition: { laborCost, projectCost }, departmentRank: CostSummary[] }`
  - 按 granularity 聚合 trend 数据（month→12 条，quarter→4 条，year→按年）
- [ ] T2.3 实现 `GET /api/cost/analysis`
  - 入参：`dimension, costType, year, quarter, month, department, project, businessLine, person`
  - 按 dimension 分组聚合 chartData
  - 按 costType 过滤（all→全部，labor→仅人力，project→仅项目）
  - 出参：`{ summary: { totalCost, laborCost, projectCost, avgCost, maxCost, minCost, count }, chartData: CostSummary[], list: CostRecord[], total: number }`
  - list 分页（每页 20 条，支持 `page` 参数）
- [ ] T2.4 实现 `GET /api/cost/options`
  - 返回去重的部门/项目/业务线/人员列表

**验证**：`yarn dev` 启动后 `curl localhost:8000/api/cost/options` 返回正确 JSON

---

### T3. Umi Model 数据层

**文件**：`src/models/costStats.ts`（新建）

参照 `src/models/global.ts` 的 `useModel` Hook 模式

- [ ] T3.1 定义 model state 类型
  - `dashboardData: DashboardResponse | null`
  - `analysisData: AnalysisResponse | null`
  - `options: OptionsResponse | null`
  - `loading: { dashboard: boolean, analysis: boolean }`
- [ ] T3.2 实现 `useDashboard(query: DashboardQuery)` 方法
  - 使用 `useRequest(getDashboard)`，返回 `{ data, loading, error, refresh }`
  - `?? 0` 兜底：金额字段统一 `Number(x) || 0`
- [ ] T3.3 实现 `useAnalysis(query: AnalysisQuery)` 方法
  - 使用 `useRequest(getAnalysis)`，返回 `{ data, loading, error, refresh }`
- [ ] T3.4 实现 `useOptions()` 方法
  - 使用 `useRequest(getOptions)`，返回 `{ data, loading }`

**验证**：`npx tsc --noEmit` 无类型错误

---

### T4. 路由改造

**文件**：`.umirc.ts`（修改）

- [ ] T4.1 将 `/stats` 路由改为嵌套子路由结构
  - 现状（第 27-31 行）：`{ name: '统计', path: '/stats', component: './Stats' }`
  - 目标：`{ path: '/stats', component: './Stats', routes: [{ path: '/stats', redirect: '/stats/dashboard' }, { path: '/stats/dashboard', component: './Stats/Dashboard' }, { path: '/stats/analysis', component: './Stats/Analysis' }] }`
- [ ] T4.2 保留 `name: '统计'`（TabBar 文案不变）
- [ ] T4.3 添加 `proxy` 配置（预留后端接入）
  - `proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } }`
  - 开发期 Mock 优先（Umi 在有 mock 文件时自动拦截）

**验证**：`yarn dev` 启动后访问 `/stats` 自动跳转 `/stats/dashboard`，不报 404

---

### T5. 报表入口页改造

**文件**：`src/pages/Stats/index.tsx`（修改）

- [ ] T5.1 将 `StatsPage` 从占位页改为布局容器
  - 保留 `MotionWrap` + `TabBar` 结构
  - 中间内容区改为 `<Outlet />`（Umi 子路由出口）
  - 添加 Dashboard / Analysis 页面切换 Tab（antd-mobile `Tabs`）
  - Tab 切换时调用 `history.push('/stats/dashboard')` 或 `history.push('/stats/analysis')`
  - 根据 `useLocation().pathname` 同步当前激活 Tab
- [ ] T5.2 更新 `src/pages/Stats/index.less`
  - 调整布局适配子页面滚动（内容区 `flex: 1; overflow-y: auto`，TabBar 固定底部）

**验证**：页面渲染无报错，Tab 切换正常，子页面内容显示在 Outlet 区域

---

### T6. Dashboard 总览页

**文件**：`src/pages/Stats/Dashboard/index.tsx`（新建）

- [ ] T6.1 实现页面主体
  - 使用 `useModel('costStats')` 获取 `useDashboard`
  - 默认 query：`{ year: 2026, granularity: 'month' }`
  - 时间粒度切换 Tab（年/季/月），切换时更新 query 并 refresh
  - 布局：KPI 卡片行 → 趋势图 → 构成图 + 部门排名（双列）
- [ ] T6.2 实现 KPI 卡片子组件 `src/components/cost/KpiCard.tsx`
  - Props：`{ label: string, value: number | string, yoyRate?: number, loading?: boolean }`
  - 金额展示：>10000 元折叠为 "X.XX 万元"，保留 2 位小数
  - loading 时展示骨架屏
  - 空数据展示 `--`
- [ ] T6.3 实现趋势折线图子组件 `src/components/cost/CostTrendChart.tsx`
  - 使用 `ant-design-mobile-chart` 折线图
  - 双线：总成本 + 人力成本（或项目成本）
  - 默认仅展示近 12 个月
  - 外层 try-catch，异常降级为纯文字统计
  - 空数据展示"暂无数据"占位
- [ ] T6.4 实现构成环形图子组件 `src/components/cost/CostCompositionChart.tsx`
  - 使用 `ant-design-mobile-chart` 环形图
  - 两段：人力成本 vs 项目成本
  - 中心展示总成本
  - 空数据降级
- [ ] T6.5 实现部门排名柱状图子组件 `src/components/cost/DepartmentRankChart.tsx`
  - 使用 `ant-design-mobile-chart` 柱状图
  - 按 totalCost 降序排列
  - 空数据降级

**验证**：Dashboard 页面展示 4 个区块，时间粒度切换正常，Mock 数据正确渲染

---

### T7. 成本分析页

**文件**：`src/pages/Stats/Analysis/index.tsx`（新建）

- [ ] T7.1 实现页面主体
  - 使用 `useModel('costStats')` 获取 `useAnalysis` 和 `useOptions`
  - 默认 query：`{ dimension: 'department', costType: 'all', year: 2026 }`
  - 布局：筛选器栏 → 成本类型 Tab → 维度对比图 + 汇总卡片 → 明细列表
- [ ] T7.2 实现筛选器子组件 `src/components/cost/CostFilterBar.tsx`
  - Props：`{ options: OptionsResponse, query: AnalysisQuery, onChange: (query) => void }`
  - 维度选择：部门/项目/业务线/人员（SegmentedControl 或 Picker）
  - 时间筛选：年份 Picker + 季度/月份级联
  - 具体维度值筛选：部门/项目/业务线/人员 下拉
  - 筛选变更时回调 onChange
- [ ] T7.3 实现维度对比柱状图子组件 `src/components/cost/DimensionBarChart.tsx`
  - 使用 `ant-design-mobile-chart` 柱状图/条形图
  - 根据 dimension 动态展示对应维度的成本对比
  - 空数据降级
- [ ] T7.4 实现汇总统计卡片子组件 `src/components/cost/CostSummaryCard.tsx`
  - Props：`{ summary: AnalysisSummary, loading?: boolean }`
  - 展示合计/均值/最大值/最小值/记录数
  - loading 骨架屏
- [ ] T7.5 实现明细列表子组件 `src/components/cost/CostDetailList.tsx`
  - Props：`{ list: CostRecord[], total: number, loading?: boolean }`
  - 可滚动列表（antd-mobile `List`）
  - 每条记录展示：日期 + 部门 + 项目 + 人员 + 成本类型 + 金额
  - 分页：每页 20 条，触底加载更多
  - 空数据展示"暂无数据"

**验证**：分析页筛选正确联动图表和列表，成本类型切换正常，分页加载正常

---

### T8. 异常兜底

- [ ] T8.1 实现图表组件统一错误边界 `src/components/cost/ChartErrorBoundary.tsx`
  - 包裹所有 `ant-design-mobile-chart` 组件
  - try-catch 捕获渲染异常
  - 异常时降级为纯文字统计展示
- [ ] T8.2 实现空状态占位组件 `src/components/cost/EmptyState.tsx`
  - Props：`{ text?: string }`，默认"暂无数据"
  - 居中展示图标 + 文案
- [ ] T8.3 数据层 null/undefined 兜底
  - `costStats` model 中金额字段统一 `Number(x) || 0`
  - 数组字段统一 `Array.isArray(x) ? x : []`
- [ ] T8.4 request 错误处理
  - `useRequest` 配置 `errorThrower`
  - 全局 ErrorBoundary 捕获，展示重试按钮 + 空状态图
  - HTTP 非 2xx → 业务 code 非 0 → 网络异常，三级降级

**验证**：断开 Mock（临时重命名 mock 文件），页面展示空状态不崩溃

---

### T9. 验收测试

- [ ] T9.1 `npx tsc --noEmit` 全项目类型检查通过
- [ ] T9.2 `yarn dev` 启动成功，无编译错误
- [ ] T9.3 访问 `/stats` 自动跳转 `/stats/dashboard`，不报 404
- [ ] T9.4 Dashboard 展示 KPI 卡片 + 趋势折线 + 构成环形图 + 部门排名柱状图
- [ ] T9.5 Dashboard 时间粒度切换（年/季/月）正常联动
- [ ] T9.6 分析页维度筛选 + 成本类型切换正常联动
- [ ] T9.7 分析页明细列表分页加载正常（每页 20 条）
- [ ] T9.8 Mock 数据契约符合需求文档 §6（3 个接口入参/出参匹配）
- [ ] T9.9 异常兜底：空数据展示占位、断开 Mock 不崩溃
- [ ] T9.10 风格与现有 iMoney-H5 一致（antd-mobile + MotionWrap + framer-motion）
- [ ] T9.11 TabBar 统计入口在子路由下高亮正常
- [ ] T9.12 跨仓对齐检查：无跨库依赖，全部新增 API 向后兼容

---

## 6. 依赖关系

```
T1（类型+API契约） ──▶ T2（Mock） ──▶ T3（Model）
                                      │
                   T4（路由） ◀───────┤
                         │            │
                   T5（入口页） ◀─────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
        T6（Dashboard）        T7（分析页）
              │                     │
              └──────────┬──────────┘
                         ▼
                    T8（异常兜底）
                         │
                         ▼
                    T9（验收测试）
```

**关键路径**：T1 → T2 → T3 → T4 → T5 → T6/T7（可并行）→ T8 → T9

**可并行任务**：T6 和 T7 在 T5 完成后可并行开发（依赖相同的 T1-T3 基础设施）。

---

## 7. 文件变更清单

### 新建文件

| 文件路径 | 用途 |
|---|---|
| `src/services/cost.ts` | 类型定义 + request 函数 |
| `mock/cost.ts` | Mock 接口（3 个） |
| `src/models/costStats.ts` | Umi model 数据层 |
| `src/pages/Stats/Dashboard/index.tsx` | Dashboard 总览页 |
| `src/pages/Stats/Dashboard/index.less` | Dashboard 样式 |
| `src/pages/Stats/Analysis/index.tsx` | 成本分析页 |
| `src/pages/Stats/Analysis/index.less` | 分析页样式 |
| `src/components/cost/KpiCard.tsx` | KPI 数值卡片 |
| `src/components/cost/CostTrendChart.tsx` | 趋势折线图 |
| `src/components/cost/CostCompositionChart.tsx` | 构成环形图 |
| `src/components/cost/DepartmentRankChart.tsx` | 部门排名柱状图 |
| `src/components/cost/CostFilterBar.tsx` | 筛选器 |
| `src/components/cost/DimensionBarChart.tsx` | 维度对比柱状图 |
| `src/components/cost/CostSummaryCard.tsx` | 汇总统计卡片 |
| `src/components/cost/CostDetailList.tsx` | 明细列表 |
| `src/components/cost/ChartErrorBoundary.tsx` | 图表错误边界 |
| `src/components/cost/EmptyState.tsx` | 空状态占位 |

### 修改文件

| 文件路径 | 改动内容 |
|---|---|
| `.umirc.ts` | `/stats` 路由改为嵌套子路由；添加 proxy 配置 |
| `src/pages/Stats/index.tsx` | 占位页改为布局容器 + 子路由 Outlet + Tab 切换 |
| `src/pages/Stats/index.less` | 布局适配子页面滚动 |

### 不变文件（跨仓对齐）

| 仓库 | 结论 |
|---|---|
| iMoney | 不涉及，无统计基础设施 |
| ArmBasic | 不涉及，iOS 原生 |
| PH2498.github.io | 不涉及，Jekyll 博客 |

---

## 8. 跨仓对齐检查

| 检查项 | 结论 |
|---|---|
| 跨库接口依赖 | 无。成本报表为 iMoney-H5 独立模块 |
| 跨库契约兼容性 | 全部新增 API，向后兼容 |
| iMoney 小程序同步 | 不需要，无统计基础设施 |
| 图表依赖 | `ant-design-mobile-chart ^1.2.2` 已在 package.json |
| 路由冲突 | 无，新增子路由不冲突 |
| 后端仓库 | 需新建 `iMoney-Server`，当前工作区未挂载；编码阶段先 Mock 驱动 |
| TabBar 高亮 | `startsWith` 判断兼容子路由（已验证 TabBar.tsx 第 102-104 行） |

---

## 9. 风险与降级

| 风险 | 降级策略 |
|---|---|
| `ant-design-mobile-chart` API 与需求图表类型不完全匹配 | 先查图表库文档确认可用图表类型，不匹配时降级为 antd-mobile 原生组件 + CSS 自绘 |
| 后端仓库未挂载 | Mock 驱动开发，proxy 配置预留，接入后切换 |
| 大额 Mock 数据渲染卡顿 | 趋势图默认近 12 个月，明细列表分页 20 条/页 |
| 图表组件渲染异常 | ChartErrorBoundary 包裹，异常降级纯文字统计 |
| `proxy` 配置导致 Mock 失效 | Umi 在有 mock 文件时优先拦截，proxy 仅在 Mock 不匹配时生效 |
