# 成本统计报表 — 需求澄清文档

| 项目 | 值 |
|---|---|
| 文档日期 | 2026-07-30 |
| 阶段 | 需求澄清 |
| 采用技能 | brainstorming |
| 状态 | 待评审 |

---

## 1. 需求与目标

开发成本统计报表，统计企业各项成本支出。前端新建成本统计分析页面 + Dashboard，按部门/项目/业务线/人员/月份/季度/年度维度展示，区分人力成本与项目成本。

**核心目标**：① Dashboard 总览成本概况与趋势；② 多维度成本分析页支持筛选下钻；③ 区分人力/项目成本分别统计。

---

## 2. 前后端仓库规划

### 2.1 仓库现状（已验证）

| 仓库 | 技术栈 | 角色 |
|---|---|---|
| iMoney-H5 | Umi Max 4 + antd-mobile 5 + ant-design-mobile-chart | ✅ 前端（已含 Stats 页面骨架 + 图表库 + mock/ 目录） |
| iMoney | Taro 4.2 小程序 | 前端（无统计基础设施，本期不涉及） |
| ArmBasic / PH2498 | iOS 原生 / Jekyll 博客 | 无关 |

### 2.2 后端仓库决策

跨仓工作区**无现成后端仓库**。为保障前后端闭环，规划如下：

| 项 | 决策 |
|---|---|
| 后端仓库名 | `iMoney-Server`（需新建，当前跨仓工作区暂未挂载） |
| 技术栈 | Node.js + Express + TypeScript（轻量，与前端同语言降低维护成本） |
| 数据库 | SQLite（开发期）→ 可切换 MySQL（生产） |
| 接入方式 | 前端 iMoney-H5 通过 `.umirc.ts` proxy 代理至后端；开发期 Mock 降级 |
| 落地优先级 | 编码阶段先以 Mock 驱动前端开发，后端仓库接入后切换真实 API |

> 当前阶段无法直接创建新仓库挂载到跨仓工作区。编码实现阶段需申请挂载 `iMoney-Server` worktree，或临时将后端代码置于 iMoney-H5 内 `server/` 目录作为 BFF 过渡。

### 2.3 数据来源

Mock 优先 + API 契约规范（§6）。iMoney-H5 已配 `request:{}`，`mock/` 已有 `userAPI.ts` 先例。

---

## 3. 维度模型

| 维度 | 字段 | 成本类型 | 字段 |
|---|---|---|---|
| 部门 | `department` | 人力成本 | `laborCost` |
| 项目 | `project` | 项目成本 | `projectCost` |
| 业务线 | `businessLine` | | |
| 人员 | `person` | | |
| 月份/季度/年度 | `month`/`quarter`/`year` | | |

时间粒度层级：`year → quarter → month`，支持同比/环比。

---

## 4. 页面结构

```
/stats → 改造为成本报表入口
  ├── /stats/dashboard   成本总览 Dashboard
  └── /stats/analysis    成本分析页
```

### Dashboard 总览（/stats/dashboard）

| 区块 | 图表 |
|---|---|
| KPI 卡片（总成本/人力/项目/同比率） | 数值卡片 |
| 成本趋势（按月） | 折线图 |
| 成本构成（人力 vs 项目） | 环形图 |
| 部门成本排名 | 柱状图 |
| 时间粒度切换（年/季/月） | Tab |

### 成本分析页（/stats/analysis）

| 区块 | 交互 |
|---|---|
| 维度筛选器（部门/项目/业务线/人员/时间） | 下拉/级联 |
| 成本类型切换（人力/项目/全部） | Tab |
| 维度对比图 | 柱状图/条形图 |
| 明细列表 | 可滚动列表 |
| 汇总统计（合计/均值/最值） | 统计卡片 |

---

## 5. 数据模型

```typescript
interface CostRecord {
  id: string;
  department: string;
  project: string;
  businessLine: string;
  person?: string;               // 人力成本时必填
  costType: 'labor' | 'project';
  amount: number;                // 元
  date: string;                  // YYYY-MM-DD
  year: number; quarter: number; month: number;
  remark?: string;
}

interface CostSummary {
  dimension: string; totalCost: number; laborCost: number; projectCost: number; count: number;
}
interface CostTrend { period: string; totalCost: number; laborCost: number; projectCost: number; }
```

数据流：`Component → useModel('costStats') → useRequest(API) → Mock/Backend`

---

## 6. API 契约规范（Mock-first）

后端实现时对齐以下契约，前端无需改动即可切换。

### 6.1 Dashboard 聚合

`GET /api/cost/dashboard?year=2026&granularity=month`

Response: `{ kpi: {totalCost, laborCost, projectCost, yoyChangeRate}, trend: CostTrend[], composition: {laborCost, projectCost}, departmentRank: CostSummary[] }`

### 6.2 成本分析明细

`GET /api/cost/analysis?dimension=department&costType=labor&year=2026&quarter=1`

Query: `dimension | costType(labor/project/all) | year | quarter | month | department | project | businessLine | person`

Response: `{ summary: {totalCost, laborCost, projectCost, avgCost, maxCost, minCost, count}, chartData: CostSummary[], list: CostRecord[], total: number }`

### 6.3 筛选选项

`GET /api/cost/options` → `{ departments: [], projects: [], businessLines: [], persons: [] }`

---

## 7. 异常兜底方案

### 7.1 前端异常兜底

| 异常场景 | 兜底策略 |
|---|---|
| API 请求超时/网络错误 | `useRequest` 配置 `errorThrower` + 全局 ErrorBoundary，展示重试按钮 + 空状态图 |
| 接口返回空数据 | 图表区域展示"暂无数据"占位，KPI 卡片展示 `--` |
| 接口字段缺失/null | 数据层做 `?? 0` 兜底，金额统一 `Number(x) \|\| 0` |
| 图表渲染异常 | ant-design-mobile-chart 外层 try-catch，异常时降级为纯文字统计 |
| 大额数据渲染卡顿 | 趋势图默认仅展示近 12 个月，明细列表分页（每页 20 条） |
| 路由不匹配 | `/stats` 自动 redirect 至 `/stats/dashboard`，未知子路由回退 |

### 7.2 后端异常兜底（iMoney-Server）

| 异常场景 | 兜底策略 |
|---|---|
| DB 查询失败 | 返回统一错误体 `{ code: 500, message, data: null }`，记录日志 |
| 聚合计算超时 | 查询超时 5s 中断，返回缓存上次结果 + `stale: true` 标记 |
| 入参非法 | 参数校验中间件拦截，返回 400 + 字段级错误信息 |
| 服务未启动 | 前端 proxy 失败时自动降级至 Umi Mock（开发期） |

### 7.3 降级链路

```
真实后端 (iMoney-Server)  ──失败──▶  Umi Mock (mock/cost.ts)  ──失败──▶  空状态占位
```

前端 `request` 拦截器统一处理：HTTP 非 2xx → 业务 code 非 0 → 网络异常，三级降级。

---

## 8. 前端组件规划（编码阶段参考）

| 组件路径 | 职责 |
|---|---|
| `src/pages/Stats/index.tsx` | 改造为报表入口（TabBar 已有"统计"入口） |
| `src/pages/Stats/Dashboard/index.tsx` | Dashboard 总览 |
| `src/pages/Stats/Analysis/index.tsx` | 成本分析页 |
| `src/components/cost/KpiCard.tsx` | KPI 数值卡片 |
| `src/components/cost/CostTrendChart.tsx` | 趋势折线图 |
| `src/components/cost/CostCompositionChart.tsx` | 构成环形图 |
| `src/components/cost/DimensionBarChart.tsx` | 维度对比柱状图 |
| `src/components/cost/CostFilterBar.tsx` | 筛选器 |
| `src/components/cost/CostDetailList.tsx` | 明细列表 |
| `src/models/costStats.ts` | Umi model 数据层 |
| `mock/cost.ts` | Mock 接口 |

技术对齐：图表 `ant-design-mobile-chart`（已装）、UI `antd-mobile`（已装）、数据流 `useModel`、请求 `useRequest`、动画 `framer-motion` + `MotionWrap`。

---

## 9. 路由调整方案（编码阶段不改当前文件）

`.umirc.ts` 现有 `{ name:'统计', path:'/stats', component:'./Stats' }` → 调整为含子路由嵌套，新增 `/stats/dashboard`、`/stats/analysis`。

---

## 10. 已确认默认值

> 用户要求确认项按默认值填写，以下为已落定的默认决策。

| 确认项 | 默认值 | 依据 |
|---|---|---|
| 目标仓库 | 仅 iMoney-H5 | 唯一具备图表库 + Stats 骨架的仓库 |
| 数据来源 | Mock 驱动 + API 契约规范 | 无后端仓库，先 Mock 后对接 |
| MVP 范围 | Dashboard + 分析页（分层展示） | 需求明确要两者 |
| 后端技术栈 | Node.js + Express + TypeScript | 与前端同语言，降低维护成本 |
| 数据库 | SQLite（开发）→ MySQL（生产） | 开发零配置，生产可切换 |
| 金额单位 | 元，展示保留 2 位小数，大额折叠万元 | 财务统计通用规范 |
| 权限控制 | 本期不做，预留路由守卫扩展点 | YAGNI，后续按需加 |
| 分页 | 明细列表每页 20 条 | 移动端性能考量 |
| 时间范围默认 | 当年（2026）+ 月粒度 | 最常用查询场景 |

---

## 11. 跨仓对齐检查

| 检查项 | 结论 |
|---|---|
| 跨库接口依赖 | 无。成本报表为 iMoney-H5 独立模块 |
| 跨库契约兼容性 | 全部新增 API，向后兼容 |
| iMoney 小程序同步 | 不需要，无统计基础设施 |
| 图表依赖 | `ant-design-mobile-chart ^1.2.2` 已在 package.json |
| 路由冲突 | 无，新增子路由不冲突 |
| 后端仓库 | 需新建 `iMoney-Server`，当前工作区未挂载 |

---

## 12. 验收标准

1. `/stats` 进入成本报表，默认展示 Dashboard
2. Dashboard 含 KPI 卡片 + 趋势折线 + 构成环形图 + 部门排名柱状图
3. 可切换年/季/月时间粒度
4. 分析页支持维度筛选 + 成本类型切换
5. 明细列表正确展示筛选数据
6. 数据来源 Mock 接口，契约符合 §6
7. 异常场景有兜底（空数据/超时/渲染失败均有占位或降级）
8. 风格与现有 iMoney-H5（antd-mobile + MotionWrap）一致
