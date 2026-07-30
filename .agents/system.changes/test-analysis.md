# 成本统计报表 — 测试分析文档

| 项目 | 值 |
|---|---|
| 文档日期 | 2026-07-30 |
| 阶段 | 测分 |
| 采用技能 | dtazziboot-generate-test-analysis-doc |
| 需求来源 | docs/cost-report/2026-07-30-cost-statistics-requirement.md |
| 系分来源 | .agents/system.changes/design.md |
| 目标仓库 | iMoney-H5 |
| 状态 | 待评审 |

---

## 1. 测试范围与策略

### 1.1 测试目标

验证成本统计报表功能（Dashboard + 成本分析页）在功能正确性、异常兜底、数据展示、跨仓对齐等方面满足需求澄清文档 §12 验收标准和系分设计文档功能模块设计。

### 1.2 测试范围矩阵

| 模块 | 系分模块 | 覆盖范围 | 测试类型 |
|---|---|---|---|
| A. 路由入口 | §5.2 | `/stats` redirect、子路由渲染、TabBar 高亮 | 功能 + 兼容性 |
| B. Dashboard | §5.3 | KPI 卡片、趋势折线、构成环形图、部门排名柱状图、时间粒度切换 | 功能 + 异常 + 性能 |
| C. 成本分析页 | §5.4 | 维度筛选器、成本类型切换、维度对比图、明细列表分页、汇总统计 | 功能 + 异常 |
| D. 数据层 | §5.5 | useModel + useRequest 封装、Mock 接口、数据兜底、三级降级 | 功能 + 异常 + 集成 |
| E. 共享组件 | §5.6 | 10 个 cost 组件渲染、空状态、加载态、动画 | 功能 + 单元 |
| API 契约 | §4 | 3 个接口入参/出参/错误码 | 集成 + 契约 |
| 异常兜底 | §6 | 空数据/超时/网络错误/渲染失败/字段缺失/路由不匹配 | 异常专项 |
| 跨仓对齐 | §7 | 无跨库依赖、TabBar 兼容、路由冲突、Mock 先例 | 静态审查 |

### 1.3 测试策略

| 策略层 | 方法 | 工具/框架 | 优先级 |
|---|---|---|---|
| 单元测试 | 组件渲染、数据兜底逻辑、金额格式化 | Jest + React Testing Library | P0 |
| 集成测试 | Model ↔ Service ↔ Mock 调用链 | Jest + MSW（或 Umi Mock） | P0 |
| 接口契约测试 | 3 个 API 入参/出参/错误码 | Mock 拦截 + 断言 | P0 |
| 异常场景测试 | 空数据/超时/网络错误/渲染失败 | Mock 故障注入 | P1 |
| 性能测试 | 趋势图 12 周期上限、明细分页 20 条、大额折叠 | 手动/性能观测 | P1 |
| 兼容性测试 | TabBar startsWith 逻辑、子路由渲染、MotionWrap 动画 | 手动验证 | P2 |
| 静态审查 | 跨仓对齐、依赖版本、路由冲突 | 代码审查 | P2 |

### 1.4 测试环境

| 项 | 配置 |
|---|---|
| 仓库 | iMoney-H5 worktree |
| 基座 | Umi Max 4 + antd-mobile 5 + ant-design-mobile-chart 1.2.2 |
| 数据来源 | Umi Mock（`mock/cost.ts`），开发期 Mock-first |
| 后端 | iMoney-Server（未挂载，编码阶段申请，当前以 Mock 替代） |
| 浏览器/设备 | Chrome DevTools 移动端模拟 + 真机验证（iOS/Android） |

---

## 2. 测试数据设计

### 2.1 Mock 数据集

基于系分设计 §4.2 响应示例，设计以下 Mock 数据集覆盖正常/边界/异常场景。

| 数据集 | 用途 | 关键特征 |
|---|---|---|
| DS_NORMAL | 正常场景 | 12 个月趋势数据、4 个部门、人力+项目成本均 > 0 |
| DS_EMPTY | 空数据场景 | trend=[]、departmentRank=[]、list=[] |
| DS_NULL_FIELD | 字段缺失场景 | kpi.totalCost=null、trend[0].laborCost 缺失 |
| DS_LARGE_AMOUNT | 大额数据场景 | totalCost=1280000.50（≥10000，验证万元折叠） |
|DS_SINGLE | 单条数据 | list 仅 1 条、total=1（验证边界分页） |
| DS_PAGINATION | 分页数据 | list=20 条、total=100（验证分页加载更多） |
| DS_ALL_LABOR | 纯人力成本 | costType=labor、projectCost=0 |
| DS_ALL_PROJECT | 纯项目成本 | costType=project、laborCost=0 |

### 2.2 筛选维度测试矩阵

| 维度 | 枚举值 | 测试覆盖 |
|---|---|---|
| dimension | department / project / businessLine / person | 4 种维度各覆盖 |
| costType | labor / project / all | 3 种类型各覆盖 |
| granularity | year / quarter / month | 3 种粒度各覆盖 |
| year | 2026（默认） | 默认值 + 切换验证 |

---

## 3. 测试用例

### 3.1 模块 A：路由入口（§5.2）

| 用例 ID | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|---|---|---|---|---|---|
| TC-A-001 | `/stats` 默认重定向至 Dashboard | 无 | 访问 `/stats` | 自动 redirect 至 `/stats/dashboard`，渲染 Dashboard 组件 | P0 |
| TC-A-002 | `/stats/dashboard` 直接访问 | 无 | 访问 `/stats/dashboard` | 正常渲染 Dashboard，KPI 卡片 + 趋势图 + 环形图 + 柱状图 | P0 |
| TC-A-003 | `/stats/analysis` 直接访问 | 无 | 访问 `/stats/analysis` | 正常渲染分析页，筛选器 + 对比图 + 明细列表 | P0 |
| TC-A-004 | 未知子路由回退 | 无 | 访问 `/stats/unknown` | 回退至 Dashboard | P1 |
| TC-A-005 | TabBar stats 高亮 | 在 `/stats/*` 子路由 | 检查底部 TabBar | stats Tab 高亮（`pathname.startsWith('/stats')` 为 true） | P1 |
| TC-A-006 | Stats 入口渲染 Outlet 容器 | 无 | 访问 `/stats/dashboard` | Stats/index.tsx 渲染 `<Outlet />`，子路由内容正确渲染于容器内 | P1 |

### 3.2 模块 B：Dashboard 总览（§5.3）

| 用例 ID | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|---|---|---|---|---|---|
| TC-B-001 | KPI 卡片正常展示 | DS_NORMAL | 进入 Dashboard | KPI 卡片展示：总成本/人力成本/项目成本/同比率，数值正确 | P0 |
| TC-B-002 | 趋势折线图渲染 | DS_NORMAL | 进入 Dashboard | 折线图展示近 12 个月趋势，含 totalCost/laborCost/projectCost 三条线 | P0 |
| TC-B-003 | 构成环形图渲染 | DS_NORMAL | 进入 Dashboard | 环形图展示人力 vs 项目成本占比 | P0 |
| TC-B-004 | 部门排名柱状图渲染 | DS_NORMAL | 进入 Dashboard | 柱状图展示部门成本排名（研发部/市场部等） | P0 |
| TC-B-005 | 时间粒度切换月→季 | DS_NORMAL | 点击「季」Tab | 触发重新请求，趋势图展示 4 个季度数据，period 格式 `2026-Q1` | P0 |
| TC-B-006 | 时间粒度切换季→年 | DS_NORMAL | 点击「年」Tab | 触发重新请求，趋势图展示近年数据，period 格式 `2026` | P1 |
| TC-B-007 | 大额金额万元折叠 | DS_LARGE_AMOUNT | 进入 Dashboard | totalCost=1280000.50 → 展示「128.00万元」，保留 2 位小数 | P1 |
| TC-B-008 | KPI 空数据兜底 | DS_EMPTY | 进入 Dashboard | KPI 卡片展示 `--`，图表展示「暂无数据」占位 | P0 |
| TC-B-009 | KPI 字段缺失兜底 | DS_NULL_FIELD | 进入 Dashboard | kpi.totalCost=null → `?? 0` 兜底为 0，不报错 | P0 |
| TC-B-010 | 趋势数据上限 12 周期 | DS_NORMAL | 月粒度 | 趋势折线仅展示近 12 个月数据点 | P1 |
| TC-B-011 | API 超时/网络错误兜底 | Mock 故障 | 进入 Dashboard | 展示重试按钮 + 空状态图，不白屏 | P1 |
| TC-B-012 | 图表渲染异常降级 | 注入图表渲染异常 | 进入 Dashboard | 外层 try-catch 捕获，降级为纯文字统计展示 | P1 |

### 3.3 模块 C：成本分析页（§5.4）

| 用例 ID | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|---|---|---|---|---|---|
| TC-C-001 | 默认维度 department | DS_NORMAL | 进入分析页 | 默认 dimension=department，展示部门维度对比柱状图 | P0 |
| TC-C-002 | 默认成本类型 all | DS_NORMAL | 进入分析页 | 默认 costType=all，展示全部成本类型 | P0 |
| TC-C-003 | 维度切换 department→project | DS_NORMAL | 切换维度为 project | 触发重新请求，对比图展示项目维度数据 | P0 |
| TC-C-004 | 维度切换→businessLine | DS_NORMAL | 切换维度为 businessLine | 触发重新请求，对比图展示业务线维度 | P1 |
| TC-C-005 | 维度切换→person | DS_NORMAL | 切换维度为 person | 触发重新请求，对比图展示人员维度 | P1 |
| TC-C-006 | 成本类型切换 all→labor | DS_ALL_LABOR | 切换为 labor | 触发重新请求，仅展示人力成本，projectCost=0 | P0 |
| TC-C-007 | 成本类型切换→project | DS_ALL_PROJECT | 切换为 project | 触发重新请求，仅展示项目成本，laborCost=0 | P0 |
| TC-C-008 | 筛选指定部门 | DS_NORMAL | 筛选部门=研发部 | 列表仅展示研发部记录，汇总统计更新 | P0 |
| TC-C-009 | 明细列表分页 | DS_PAGINATION | 滚动到底部 | 下拉加载更多，每页 20 条，total=100 时可分 5 页 | P0 |
| TC-C-010 | 汇总统计卡片展示 | DS_NORMAL | 进入分析页 | 展示合计/均值/最值（avgCost/maxCost/minCost/count） | P0 |
| TC-C-011 | 筛选选项为空兜底 | DS_EMPTY(options) | 进入分析页 | 下拉框展示「暂无选项」 | P1 |
| TC-C-012 | 分析结果为空兜底 | DS_EMPTY | 筛选无匹配数据 | 对比图「暂无数据」，列表展示空状态 | P0 |
| TC-C-013 | 分页加载失败兜底 | Mock 分页故障 | 滚动加载更多 | 展示「加载失败，点击重试」 | P1 |
| TC-C-014 | 筛选联动重新请求 | DS_NORMAL | 快速切换维度+类型 | 每次变更均触发重新请求，无竞态残留 | P1 |

### 3.4 模块 D：数据层（§5.5）

| 用例 ID | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|---|---|---|---|---|---|
| TC-D-001 | useModel('costStats') 初始化 | 无 | 组件挂载 | model 初始化，dashboardParams={year:2026,granularity:'month'} | P0 |
| TC-D-002 | Dashboard 请求 refreshDeps | 无 | 切换 granularity | dashboardParams 变更触发 useRequest 自动刷新 | P0 |
| TC-D-003 | Analysis 请求 refreshDeps | 无 | 切换 dimension | analysisParams 变更触发 useRequest 自动刷新 | P0 |
| TC-D-004 | Options 请求初始化 | 无 | 分析页挂载 | fetchCostOptions 自动执行，返回筛选选项 | P0 |
| TC-D-005 | 字段缺失 `?? 0` 兜底 | DS_NULL_FIELD | 请求返回 | data?.kpi?.totalCost ?? 0 = 0，不报错 | P0 |
| TC-D-006 | 金额非法 `Number(x)|0` | Mock amount='abc' | 请求返回 | Number('abc')=NaN → 0，不展示 NaN | P1 |
| TC-D-007 | 数组缺失兜底 | DS_EMPTY | 请求返回 | data?.trend ?? [] = []，图表空状态 | P0 |
| TC-D-008 | 整体失败返回 null | Mock 500 | 请求返回 | 返回 null，组件层展示空状态 | P0 |
| TC-D-009 | 三级降级链路 | 依次断开后端→Mock | 请求 | 真实后端失败→Umi Mock→空状态占位 | P1 |

### 3.5 模块 E：共享组件（§5.6）

| 用例 ID | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|---|---|---|---|---|---|
| TC-E-001 | KpiCard 渲染 | 传入正常数据 | 渲染 | 展示 4 个数值（总/人力/项目/同比率） | P0 |
| TC-E-002 | CostTrendChart 渲染 | 传入 trend 数组 | 渲染 | 折线图正确渲染，ant-design-mobile-chart Line | P0 |
| TC-E-003 | CostCompositionChart 渲染 | 传入 composition | 渲染 | 环形图正确渲染，Pie/Ring | P0 |
| TC-E-004 | DepartmentRankChart 渲染 | 传入 departmentRank | 渲染 | 柱状图正确渲染，Column | P0 |
| TC-E-005 | DimensionBarChart 渲染 | 传入 chartData | 渲染 | 维度对比柱状图正确渲染 | P0 |
| TC-E-006 | GranularityTab 切换 | 无 | 点击 Tab | 正确切换 year/quarter/month | P1 |
| TC-E-007 | CostTypeTab 切换 | 无 | 点击 Tab | 正确切换 labor/project/all | P1 |
| TC-E-008 | CostFilterBar 级联 | optionsReq 返回数据 | 选择筛选条件 | 下拉/级联正确展示选项 | P1 |
| TC-E-009 | CostDetailList 分页 | 传入 list+total | 滚动加载 | 每页 20 条，下拉加载更多 | P0 |
| TC-E-010 | CostSummaryCard 展示 | 传入 summary | 渲染 | 展示合计/均值/最值 | P0 |
| TC-E-011 | 空状态 Empty 组件 | 空数据 | 渲染 | 统一 `<Empty />` 占位 | P1 |
| TC-E-012 | 加载态 Skeleton | loading=true | 渲染 | 骨架屏展示 | P1 |
| TC-E-013 | MotionWrap 动画 | 无 | 组件挂载/卸载 | fade/slideUp 动画生效，与现有页面一致 | P2 |

### 3.6 API 契约测试（§4）

| 用例 ID | 接口 | 场景 | 预期结果 | 优先级 |
|---|---|---|---|---|
| TC-API-001 | `GET /api/cost/dashboard` | 正常请求 year=2026&granularity=month | code=0, data 含 kpi/trend/composition/departmentRank | P0 |
| TC-API-002 | `GET /api/cost/dashboard` | granularity=quarter | trend period 格式 `2026-Q1` | P1 |
| TC-API-003 | `GET /api/cost/dashboard` | granularity=year | trend period 格式 `2026` | P1 |
| TC-API-004 | `GET /api/cost/dashboard` | year 缺失 | 使用默认当前年份 | P1 |
| TC-API-005 | `GET /api/cost/analysis` | 正常请求 dimension=department | code=0, data 含 summary/chartData/list/total | P0 |
| TC-API-006 | `GET /api/cost/analysis` | dimension 缺失 | code=COST_001 参数非法 | P0 |
| TC-API-007 | `GET /api/cost/analysis` | page+pageSize 分页 | list 长度=pageSize，total 正确 | P0 |
| TC-API-008 | `GET /api/cost/analysis` | 筛选 department+costType | list 过滤正确 | P0 |
| TC-API-009 | `GET /api/cost/options` | 正常请求 | code=0, data 含 departments/projects/businessLines/persons | P0 |
| TC-API-010 | `GET /api/cost/options` | 各数组非空 | 4 个数组均有数据 | P1 |
| TC-API-011 | 通用错误码 | DB 查询失败 | code=COST_002 | P1 |
| TC-API-012 | 通用错误码 | 聚合超时 | code=COST_003 | P2 |

### 3.7 异常兜底专项（§6）

| 用例 ID | 异常场景 | 触发方式 | 预期兜底 | 优先级 |
|---|---|---|---|---|
| TC-ERR-001 | API 超时/网络错误 | Mock 延迟 10s / 断网 | useRequest errorThrower + 重试按钮 + 空状态图 | P1 |
| TC-ERR-002 | 接口返回空数据 | DS_EMPTY | 图表「暂无数据」，KPI `--` | P0 |
| TC-ERR-003 | 接口字段缺失/null | DS_NULL_FIELD | `?? 0` 兜底，金额 `Number(x)|0` | P0 |
| TC-ERR-004 | 图表渲染异常 | 注入渲染错误 | try-catch 降级纯文字统计 | P1 |
| TC-ERR-005 | 大额数据卡顿 | DS_PAGINATION | 趋势图限 12 周期，列表分页 20 条 | P1 |
| TC-ERR-006 | 路由不匹配 | 访问 `/stats/unknown` | redirect 回退 Dashboard | P1 |
| TC-ERR-007 | 筛选选项为空 | DS_EMPTY(options) | 下拉框「暂无选项」 | P1 |
| TC-ERR-008 | 分页加载失败 | Mock 分页 500 | 「加载失败，点击重试」 | P1 |
| TC-ERR-009 | 三级降级链路 | 依次断开后端→Mock | 真实后端→Umi Mock→空状态占位 | P1 |

---

## 4. 跨仓对齐测试结论（静态审查）

| 检查项 | 系分结论 | 测试验证方式 | 结论 |
|---|---|---|---|
| 跨库接口依赖 | 无，iMoney-H5 独立模块 | 静态审查：确认无 iMoney/ArmBasic/PH2498 依赖 | ✅ 无需跨仓联调 |
| 跨库契约兼容性 | 全部新增 API，向后兼容 | 契约测试 TC-API-* 覆盖 | ✅ 向后兼容 |
| iMoney 小程序同步 | 不需要 | 静态审查：iMoney 无统计模块 | ✅ 无需同步 |
| 图表依赖 | ant-design-mobile-chart ^1.2.2 已有 | 静态审查 package.json | ✅ 已验证 |
| antd-mobile 依赖 | ^5.42.3 已有 | 静态审查 package.json | ✅ 已验证 |
| 路由冲突 | 无，新增子路由不冲突 | TC-A-* 覆盖 | ✅ 无冲突 |
| TabBar 兼容 | startsWith('/stats') 天然兼容 | TC-A-005 验证 | ✅ 天然兼容 |
| 后端仓库 | iMoney-Server 未挂载 | 当前以 Mock 替代，编码阶段申请 | ⏳ 编码阶段 |

---

## 5. 测试准入/准出标准

### 5.1 准入标准

| 项 | 标准 |
|---|---|
| 代码实现 | 编码阶段完成，所有组件文件已创建（§9 组件清单） |
| Mock 接口 | `mock/cost.ts` 已实现 3 个接口（dashboard/analysis/options） |
| 路由配置 | `.umirc.ts` 已配置 `/stats` redirect + 子路由 |
| 依赖 | ant-design-mobile-chart / antd-mobile / framer-motion 已安装 |

### 5.2 准出标准

| 项 | 标准 |
|---|---|
| P0 用例 | 100% 通过 |
| P1 用例 | ≥95% 通过 |
| P2 用例 | ≥80% 通过 |
| 致命缺陷 | 0 个 |
| 严重缺陷 | 0 个 |
| 一般缺陷 | ≤5 个且不阻塞核心流程 |
| 验收标准 | 需求文档 §12 的 8 条全部满足 |

---

## 6. 风险与依赖

| 风险/依赖 | 说明 | 缓解措施 |
|---|---|---|
| 后端仓库未挂载 | iMoney-Server 当前不可用，无法联调真实 API | 开发期以 Umi Mock 替代，TC-API-* 基于 Mock 验证契约；后端接入后补充真实联调 |
| 真机兼容性 | 移动端图表渲染可能因设备差异表现不同 | 增加真机验证（iOS/Android），关注 ant-design-mobile-chart 兼容性 |
| 竞态条件 | 分析页快速切换筛选条件可能导致请求竞态 | TC-C-014 验证 refreshDeps 机制，关注 useRequest 取消机制 |
| 大额数据性能 | 明细列表数据量大时可能卡顿 | TC-ERR-005 验证分页 + 趋势图上限兜底 |

---

## 7. 测试用例统计

| 优先级 | 用例数 |
|---|---|
| P0 | 33 |
| P1 | 24 |
| P2 | 4 |
| **合计** | **61** |

| 模块 | 用例数 |
|---|---|
| A. 路由入口 | 6 |
| B. Dashboard | 12 |
| C. 成本分析页 | 14 |
| D. 数据层 | 9 |
| E. 共享组件 | 13 |
| API 契约 | 12 |
| 异常兜底 | 9 |
| 跨仓对齐（静态） | 8 |

---

> 本阶段为测分，仅产出测试分析文档，未修改任何代码文件。编码实现阶段按系分设计文档执行，测试执行阶段按本文档用例执行。
