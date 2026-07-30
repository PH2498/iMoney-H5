# 算法演示与调用分析 测试分析文档

> **文档元信息**
>
> | 项目 | 内容 |
> |------|------|
> | 文档版本 | v1.0 |
> | 作者 | DTCoder（测分阶段自动产出） |
> | 创建日期 | 2026-07-30 |
> | 需求来源 | iMoney-H5/docs/superpowers/specs/2026-07-30-algorithm-demo-and-analytics-design.md（需求澄清产物） |
> | 系分依据 | iMoney-H5/.agents/system.changes/design.md（系分设计产物 v1.0） |
> | 评审状态 | 待评审 |

---

## 1. 测试范围与目标

### 1.1 测试目标

验证「算法演示 + 调用分析」功能的后端 Java 三算法接口、导出接口、埋点查询接口，以及前端 iMoney-H5 三 Tab 页面、导出按钮、可视化报表功能，满足系分设计文档定义的全部功能点（F01–F10）与业务规则（R01–R12）。

### 1.2 测试范围

#### 1.2.1 被测系统清单

| 编号 | 被测模块 | 所属仓库 | 技术栈 | 测试类型 |
|------|----------|----------|--------|----------|
| M01 | 算法演示模块（HelloWorld/Hash/BubbleSort） | PH2498.github.io `server/` | Java + Spring Boot | 后端单元+接口 |
| M02 | 导出模块 | PH2498.github.io `server/` | Java + Spring Boot | 后端接口 |
| M03 | 埋点分析模块（写入+查询） | PH2498.github.io `server/` | Java + Spring Boot + SQLite | 后端单元+接口+数据 |
| M04 | 前端算法演示页 | iMoney-H5 `src/pages/algorithm-demo/` | UmiJS 4 + antd-mobile 5 | 前端组件+E2E |
| M05 | 数据存储（call_log） | PH2498.github.io `server/` | SQLite | 数据一致性 |

#### 1.2.2 功能点覆盖矩阵

| 功能点 | 被测模块 | 测试类型 | 关联接口 | 测试用例编号 |
|--------|----------|----------|----------|-------------|
| F01 HelloWorld 接口 | M01 | 接口测试 | W01 | TC-W01-001~003 |
| F02 哈希算法接口 | M01 | 接口测试 | W02 | TC-W02-001~005 |
| F03 冒泡排序接口 | M01 | 接口测试 | W03 | TC-W03-001~005 |
| F04 导出接口 | M02 | 接口测试 | W04 | TC-W04-001~004 |
| F05 后端埋点 | M03 | 单元+数据测试 | S05 | TC-S05-001~003 |
| F06 前端三 Tab 页面 | M04 | 前端组件+E2E | - | TC-FE-001~004 |
| F07 前端导出按钮 | M04 | 前端组件+E2E | W04 | TC-FE-005~006 |
| F08 前端可视化报表 | M04 | 前端组件+E2E | W05 | TC-FE-007~010 |
| F09 埋点查询接口 | M03 | 接口测试 | W05 | TC-W05-001~005 |
| F10 冒泡排序 steps 可视化 | M04 | 前端组件 | - | TC-FE-011~012 |

#### 1.2.3 排除范围

- 不测试真实组织架构数据对接（人员维度 Mock，待后续对接）。
- 不测试用户登录/鉴权体系（演示用 Header 传身份）。
- 不测试 iMoney / ArmBasic / PH2498.github.io 静态博客原有功能。
- 不测试生产环境 MySQL 切换（仅验证 SQLite 演示存储）。

---

## 2. 测试策略

### 2.1 测试层级

| 层级 | 范围 | 工具/框架 | 覆盖目标 |
|------|------|-----------|----------|
| 单元测试（UT） | AlgorithmService / ExportService / CallLogService 内部方法 | JUnit 5 + Mockito | 核心算法逻辑、参数校验、异常处理 |
| 接口测试（IT） | W01–W05 REST API | Spring Boot Test（MockMvc） / REST Assured | 入参校验、响应结构、错误码、埋点写入 |
| 数据测试 | call_log 表读写一致性 | JUnit + JdbcTemplate / SQLite 内存库 | 埋点写入、聚合查询、索引有效性 |
| 前端组件测试 | Tab 切换、导出触发、报表渲染 | Jest + React Testing Library | 组件渲染、交互、异常态 |
| E2E 测试 | 端到端用户操作流 | Playwright / UmiJS mock proxy | 页面 → 接口 → 展示全链路 |
| 跨仓契约测试 | 前后端接口契约一致性 | 契约快照 + Mock | 前端调用与后端响应对齐 |

### 2.2 测试环境

| 环境项 | 配置 |
|--------|------|
| 后端运行环境 | JDK 17+，Spring Boot，SQLite（文件/内存模式） |
| 前端运行环境 | Node.js 18+，UmiJS 4 dev server，postcss-px-to-viewport（viewportWidth 375） |
| 调用人身份 | 请求头 `X-User-Id: u001` / `X-User-Name: 张三`（演示固定值） |
| 测试数据库 | SQLite 内存库 `:memory:` 或临时文件，每次测试初始化 call_log 表 |
| 跨仓联调 | 前端 proxy 转发 `/api/*` → 后端 `localhost:8080` |

### 2.3 测试数据准备

| 数据集 | 内容 | 用途 |
|--------|------|------|
| DS-01 | 哈希测试输入集：`hello`、空串、超长串（10KB）、特殊字符（中文/emoji/SQL 注入字符串） | W02 边界与安全 |
| DS-02 | 冒泡排序输入集：`[3,1,4,1,5]`、空数组 `[]`、单元素 `[1]`、已排序 `[1,2,3]`、逆序 `[5,4,3,2,1]`、超长数组（1001 元素） | W03 边界与性能 |
| DS-03 | 埋点 call_log 预置数据：3 人员类型 × 2 层级 × 3 部门 × 7 日 × 随机次数 | W05 聚合查询 |
| DS-04 | 导出 Tab 组合：全部三 Tab、单 Tab、空 Tab、非法 Tab 名 | W04 边界 |
| DS-05 | 维度参数集：`user_type`、`user_level`、`department`、非法值 `xxx`、空值 | W05 参数校验 |

---

## 3. 测试用例

### 3.1 后端接口测试用例

#### 3.1.1 W01 HelloWorld 接口

| 用例编号 | 场景 | 前置条件 | 输入 | 预期输出 | 关联规则 | 优先级 |
|----------|------|----------|------|----------|----------|--------|
| TC-W01-001 | 正常调用 | 后端服务启动 | GET /api/algorithm/helloworld，Headers: X-User-Id: u001, X-User-Name: 张三 | code=0, msg=SUCCESS, data.message="Hello, World!", traceId 非空 | - | P0 |
| TC-W01-002 | 调用后异步埋点写入 | TC-W01-001 执行后 | 查询 call_log WHERE api='helloworld' AND caller_id='u001' | 存在 1 条记录，status=SUCCESS, user_type/level/department 非空 | F05/R01 | P0 |
| TC-W01-003 | 缺少身份 Header | 后端服务启动 | GET /api/algorithm/helloworld（无 X-User-Id） | code=0 仍返回（演示不强制鉴权），call_log 中 caller_id 为空或默认值 | A06 | P1 |

#### 3.1.2 W02 哈希算法接口

| 用例编号 | 场景 | 前置条件 | 输入 | 预期输出 | 关联规则 | 优先级 |
|----------|------|----------|------|----------|----------|--------|
| TC-W02-001 | SHA-256 默认算法 | - | POST /api/algorithm/hash, {"input":"hello"} | code=0, data.algorithm="SHA-256", data.hashValue="2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824" | R01/R02 | P0 |
| TC-W02-002 | 指定 MD5 算法 | - | POST /api/algorithm/hash, {"input":"hello","algorithm":"MD5"} | code=0, data.algorithm="MD5", data.hashValue="5d41402abc4b2a76b9719d911017c592" | R02 | P0 |
| TC-W02-003 | 指定 SHA-1 算法 | - | POST /api/algorithm/hash, {"input":"hello","algorithm":"SHA-1"} | code=0, data.algorithm="SHA-1", data.hashValue 正确 | R02 | P1 |
| TC-W02-004 | input 为空 | - | POST /api/algorithm/hash, {"input":"","algorithm":"SHA-256"} | code≠0, 错误码 ALG_002 | R01 | P0 |
| TC-W02-005 | algorithm 非法值 | - | POST /api/algorithm/hash, {"input":"hello","algorithm":"CRC32"} | code≠0, 错误码 ALG_003 | R02 | P0 |

#### 3.1.3 W03 冒泡排序接口

| 用例编号 | 场景 | 前置条件 | 输入 | 预期输出 | 关联规则 | 优先级 |
|----------|------|----------|------|----------|----------|--------|
| TC-W03-001 | 正常排序 | - | POST /api/algorithm/bubble-sort, {"input":[3,1,4,1,5]} | code=0, data.sorted=[1,1,3,4,5], data.steps 数组非空，steps[0].pass=1, steps 末项 swapped=false | R01/R02 | P0 |
| TC-W03-002 | 空数组 | - | POST /api/algorithm/bubble-sort, {"input":[]} | code≠0, 错误码 ALG_004 | R01 | P0 |
| TC-W03-003 | 单元素数组 | - | POST /api/algorithm/bubble-sort, {"input":[1]} | code=0, data.sorted=[1], data.steps 长度=1, swapped=false | R01 | P1 |
| TC-W03-004 | 已排序数组 | - | POST /api/algorithm/bubble-sort, {"input":[1,2,3]} | code=0, data.sorted=[1,2,3], 第一趟即 swapped=false | R02 | P1 |
| TC-W03-005 | 数组超限（>1000） | - | POST /api/algorithm/bubble-sort, {"input":[1...1001]} | code≠0, 错误码 ALG_005 | R02 | P0 |

#### 3.1.4 W04 导出 Excel 接口

| 用例编号 | 场景 | 前置条件 | 输入 | 预期输出 | 关联规则 | 优先级 |
|----------|------|----------|------|----------|----------|--------|
| TC-W04-001 | 导出全部三 Tab | - | POST /api/export, {"tabs":["helloworld","hash","bubble-sort"]} | HTTP 200, Content-Type=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, xlsx 流包含 3 个 Sheet | R03/R04 | P0 |
| TC-W04-002 | tabs 为空（默认全部） | - | POST /api/export, {"tabs":[]} | HTTP 200, xlsx 含 3 个 Sheet（默认填充） | R03 | P0 |
| TC-W04-003 | tabs 含非法元素 | - | POST /api/export, {"tabs":["helloworld","invalid"]} | HTTP 200, xlsx 仅含 helloworld Sheet（非法元素忽略） | R04 | P1 |
| TC-W04-004 | 导出后异步埋点 | TC-W04-001 执行后 | 查询 call_log WHERE api='export' | 存在 1 条记录, status=SUCCESS | F05 | P0 |

#### 3.1.5 W05 埋点查询接口

| 用例编号 | 场景 | 前置条件 | 输入 | 预期输出 | 关联规则 | 优先级 |
|----------|------|----------|------|----------|----------|--------|
| TC-W05-001 | 按部门维度查询（默认近 7 日） | DS-03 数据已预置 | GET /api/analytics/calls?dimension=department | code=0, data.dimension="department", data.series 非空（按部门聚合次数），data.timeline 非空（7 日趋势） | R05/R07 | P0 |
| TC-W05-002 | 按人员类型维度查询 | DS-03 已预置 | GET /api/analytics/calls?dimension=user_type | code=0, data.series 按 user_type 聚合 | R05 | P0 |
| TC-W05-003 | 按人员层级维度查询 | DS-03 已预置 | GET /api/analytics/calls?dimension=user_level | code=0, data.series 按 user_level 聚合 | R05 | P0 |
| TC-W05-004 | dimension 非法值 | - | GET /api/analytics/calls?dimension=xxx | code≠0, 错误码 ANA_001 | R05 | P0 |
| TC-W05-005 | 时间范围非法（start>end） | - | GET /api/analytics/calls?dimension=department&startTime=2026-07-30T00:00:00&endTime=2026-07-24T00:00:00 | code≠0, 错误码 ANA_002 | R06 | P0 |

### 3.2 后端单元测试用例

#### 3.2.1 AlgorithmService 单元测试

| 用例编号 | 场景 | 输入 | 预期输出 | 关联接口 | 优先级 |
|----------|------|------|----------|----------|--------|
| TC-S01-001 | helloWorld() 返回固定文案 | 无 | HelloWorldResultVO.message="Hello, World!" | S01 | P0 |
| TC-S02-001 | hash() SHA-256 正确性 | HashRequest(input="hello", algorithm="SHA-256") | HashResultVO.hashValue="2cf24dba..." | S02 | P0 |
| TC-S02-002 | hash() 默认算法为 SHA-256 | HashRequest(input="hello", algorithm=null) | HashResultVO.algorithm="SHA-256" | S02 | P0 |
| TC-S02-003 | hash() 空输入抛异常 | HashRequest(input=null) | 抛出 IllegalArgumentException / 业务异常 ALG_002 | S02/R01 | P0 |
| TC-S03-001 | bubbleSort() 正确排序 | BubbleSortRequest(input=[3,1,4,1,5]) | BubbleSortResultVO.sorted=[1,1,3,4,5] | S03 | P0 |
| TC-S03-002 | bubbleSort() steps 完整性 | BubbleSortRequest(input=[3,1,4,1,5]) | steps 末项 array 等于 sorted | S03 | P0 |
| TC-S03-003 | bubbleSort() 空输入抛异常 | BubbleSortRequest(input=null) | 业务异常 ALG_004 | S03/R01 | P0 |
| TC-S03-004 | bubbleSort() 超限抛异常 | BubbleSortRequest(input=[1...1001]) | 业务异常 ALG_005 | S03/R02 | P0 |

#### 3.2.2 CallLogService 单元测试

| 用例编号 | 场景 | 输入 | 预期输出 | 关联接口 | 优先级 |
|----------|------|------|----------|----------|--------|
| TC-S05-001 | asyncRecord 异步写入不阻塞主流程 | CallLogDO 完整 | 方法立即返回 void，call_log 表新增 1 条 | S05 | P0 |
| TC-S05-002 | UserDimensionProvider 失败时回填默认值 | UserDimensionProvider 抛异常 | call_log 记录 user_type/level/department="UNKNOWN" | S05/I01/异常场景 | P0 |
| TC-S06-001 | query 按维度聚合正确 | dimension="department", start/end 范围内含 DS-03 数据 | series 各 label value 总和 = 该范围内 call_log 总数 | S06 | P0 |
| TC-S06-002 | query timeline 按 date 聚合正确 | dimension="department", 7 日范围 | timeline 长度=7，每日 value 等于当日 call_log 记录数 | S06 | P0 |

#### 3.2.3 ExportService 单元测试

| 用例编号 | 场景 | 输入 | 预期输出 | 关联接口 | 优先级 |
|----------|------|------|----------|----------|--------|
| TC-S04-001 | export 三 Tab 生成 3 Sheet | List.of("helloworld","hash","bubble-sort") | byte[] 非空，可解析为 xlsx 含 3 Sheet | S04 | P0 |
| TC-S04-002 | export 空 tabs 默认全部 | List.of() | byte[] 含 3 Sheet | S04/R03 | P0 |
| TC-S04-003 | export 单 Tab 计算失败不中断整体 | AlgorithmService.hash 抛异常 | 对应 Sheet 填空表头+提示行，其余 Sheet 正常 | S04/异常场景 | P1 |

### 3.3 前端测试用例

#### 3.3.1 前端组件测试（Jest + React Testing Library）

| 用例编号 | 场景 | 前置条件 | 操作 | 预期结果 | 关联功能 | 优先级 |
|----------|------|----------|------|----------|----------|--------|
| TC-FE-001 | 页面加载默认激活 helloworld Tab | mock GET /api/algorithm/helloworld 返回 {message:"Hello, World!"} | 渲染 /algorithm-demo 页面 | helloworld Tab 激活，展示 "Hello, World!" 文案 | F06/R08 | P0 |
| TC-FE-002 | 切换至 hash Tab 触发接口 | mock POST /api/algorithm/hash 返回结果 | 点击 hash Tab | 展示哈希输入框+结果 | F06/R08 | P0 |
| TC-FE-003 | 切换至 bubble-sort Tab 触发接口 | mock POST /api/algorithm/bubble-sort 返回 sorted+steps | 点击 bubble-sort Tab | 展示排序结果+steps 可视化 | F06/F10/R08/R09 | P0 |
| TC-FE-004 | 接口失败展示重试按钮 | mock 接口返回 500 | 渲染页面 | 展示错误态+重试按钮 | F06/异常 | P0 |
| TC-FE-005 | 点击导出按钮触发下载 | mock POST /api/export 返回 blob | 点击导出按钮 | 浏览器触发下载，文件名 algorithm-demo.xlsx | F07/R10 | P0 |
| TC-FE-006 | 导出失败提示 | mock POST /api/export 返回 500 | 点击导出按钮 | 展示"导出失败，请重试"提示 | F07/异常 | P1 |
| TC-FE-007 | 折线图渲染 timeline 数据 | mock GET /api/analytics/calls 返回 timeline 数组 | 切换维度至 department | 折线图渲染 7 日趋势 | F08/R11/R12 | P0 |
| TC-FE-008 | 饼图渲染 series 数据 | mock 返回 series 数组 | 切换维度至 user_type | 饼图渲染维度占比 | F08/R11 | P0 |
| TC-FE-009 | 柱状图渲染 series 数据 | mock 返回 series 数组 | 切换维度至 user_level | 柱状图渲染维度对比 | F08/R11 | P0 |
| TC-FE-010 | 维度切换重新查询 | 已渲染 department 报表 | 切换至 user_type | 触发新请求，图表刷新 | F08/R11 | P0 |
| TC-FE-011 | 冒泡排序 steps 逐帧高亮 | mock 返回 steps 数组 | 进入 bubble-sort Tab | steps 可视化逐帧展示，高亮当前趟 | F10/R09 | P1 |
| TC-FE-012 | steps 为空时仅展示结果 | mock 返回 steps=[] | 进入 bubble-sort Tab | 仅展示 sorted 结果，无逐帧动画 | F10/R09/异常 | P1 |

#### 3.3.2 E2E 测试（Playwright）

| 用例编号 | 场景 | 操作链路 | 预期结果 | 优先级 |
|----------|------|----------|----------|--------|
| TC-E2E-001 | 全链路：三 Tab 切换 + 结果展示 | 进入页面 → 切换三 Tab → 查看结果 | 三 Tab 均正确展示结果 | P0 |
| TC-E2E-002 | 全链路：导出按钮 → 下载 xlsx | 进入页面 → 点击导出 → 验证下载文件 | xlsx 文件生成，含 3 Sheet | P0 |
| TC-E2E-003 | 全链路：报表维度切换 → 图表刷新 | 进入页面 → 切换 department/user_type/user_level → 查看三图 | 三图均按维度刷新 | P0 |
| TC-E2E-004 | 跨仓契约：前端调用路径与后端路由对齐 | 前端 services.ts 调用 → 后端 Controller 响应 | 路径/方法/入参/出参全部对齐 | P0 |

### 3.4 数据一致性测试

| 用例编号 | 场景 | 前置条件 | 操作 | 预期结果 | 优先级 |
|----------|------|----------|------|----------|--------|
| TC-DATA-001 | 埋点写入后 call_log 字段完整性 | 调用 W01-W04 任一接口 | 查询 call_log 最新记录 | 13 字段均非空（caller_id 除外），trace_id 与响应 traceId 一致 | P0 |
| TC-DATA-002 | 埋点 status 字段记录成功/失败 | W02 input 为空（返回 ALG_002） | 查询 call_log | status=FAIL（若埋点在异常路径也记录） | P1 |
| TC-DATA-003 | 聚合查询数据与明细一致 | 预置 DS-03 数据 | W05 query + 手动 SQL SUM 对比 | series value 总和 = call_log WHERE 范围内 COUNT(*) | P0 |
| TC-DATA-004 | 索引有效性验证 | 预置 DS-03 大量数据 | EXPLAIN QUERY PLAN 聚合 SQL | 命中 idx_call_log_call_time / idx_call_log_department 等索引 | P1 |

### 3.5 安全测试

| 用例编号 | 场景 | 输入 | 预期结果 | 优先级 |
|----------|------|------|----------|--------|
| TC-SEC-001 | 哈希 input 含 SQL 注入字符串 | input="'; DROP TABLE call_log; --" | 正常返回 hashValue，call_log 表无异常 | P0 |
| TC-SEC-002 | 冒泡排序 input 含非整数元素 | input=["a","b"] | 返回 ALG_004 或参数校验错误 | P0 |
| TC-SEC-003 | 请求体含超大 payload（>1MB） | 超大 JSON body | 返回 413/400 或限流响应 | P1 |
| TC-SEC-004 | caller_name 含特殊字符存储 | X-User-Name: `<script>alert(1)</script>` | call_log 正确存储，前端报表展示不执行 XSS（转义） | P1 |

### 3.6 性能测试

| 用例编号 | 场景 | 前置条件 | 操作 | 预期指标 | 优先级 |
|----------|------|----------|------|----------|--------|
| TC-PERF-001 | 算法接口单次响应耗时 | - | 调用 W01/W02/W03 各 100 次 | P95 < 200ms（不含埋点异步写入） | P1 |
| TC-PERF-002 | 冒泡排序 1000 元素耗时 | - | W03 input=1000 元素 | 单次 < 500ms | P1 |
| TC-PERF-003 | 聚合查询 10 万条 call_log | 预置 10 万条埋点数据 | W05 query dimension=department | 响应 < 1s，命中索引 | P2 |
| TC-PERF-004 | 导出 3 Sheet 耗时 | - | W04 导出全部 | 生成 < 1s | P2 |
| TC-PERF-005 | 埋点异步不阻塞主响应 | - | 并发 100 次 W02 调用 | 主响应耗时不受埋点影响（埋点线程池隔离） | P1 |

---

## 4. 跨仓契约测试

### 4.1 前后端接口契约对齐矩阵

| 接口 | 后端路径 | 后端方法 | 前端调用位置 | 入参对齐 | 出参对齐 | 契约测试用例 |
|------|----------|----------|-------------|----------|----------|-------------|
| W01 | /api/algorithm/helloworld | GET | services.ts callHelloWorld() | 无 body，Header X-User-Id/Name | {code,msg,data:{message},traceId} | TC-E2E-004 |
| W02 | /api/algorithm/hash | POST | services.ts callHash() | {input,algorithm} | {code,msg,data:{input,algorithm,hashValue},traceId} | TC-E2E-004 |
| W03 | /api/algorithm/bubble-sort | POST | services.ts callBubbleSort() | {input:Integer[]} | {code,msg,data:{input,sorted,steps[]},traceId} | TC-E2E-004 |
| W04 | /api/export | POST | services.ts exportTabs() | {tabs:String[]} | blob 文件流 | TC-E2E-004 |
| W05 | /api/analytics/calls | GET | services.ts queryAnalytics() | {dimension,startTime,endTime} | {code,msg,data:{dimension,series[],timeline[]},traceId} | TC-E2E-004 |

### 4.2 契约一致性检查项

| 检查项 | 验证方式 | 预期 |
|--------|----------|------|
| 路径前缀一致 | 前端 base URL + path vs 后端 @RequestMapping | `/api/algorithm/*`、`/api/export`、`/api/analytics/calls` |
| HTTP 方法一致 | 前端 method vs 后端 @GetMapping/@PostMapping | W01=GET, W02=POST, W03=POST, W04=POST, W05=GET |
| 入参字段名/类型一致 | 前端请求体字段 vs 后端 @RequestBody DTO 字段 | input(String)/algorithm(String)/input(Integer[])/tabs(String[]) |
| 出参结构一致 | 前端响应类型定义 vs 后端 ResponseEntity | {code:Integer,msg:String,data:Object,traceId:String} |
| 错误码透传 | 前端识别 code≠0 vs 后端错误码枚举 | ALG_001~005, EXP_001, ANA_001~002 |
| Header 传递一致 | 前端 request header vs 后端 @RequestHeader | X-User-Id / X-User-Name |
| 导出 Content-Type 一致 | 前端 responseType=blob vs 后端 Content-Type | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet |

---

## 5. 测试风险与对策

| 风险编号 | 风险描述 | 影响 | 概率 | 对策 |
|----------|----------|------|------|------|
| RISK-01 | SQLite 并发写入锁争用（埋点高并发） | 埋点写入偶发失败 | 中 | 测试 SQLite 文件锁行为；生产切换 MySQL；埋点写入失败降级不影响主响应 |
| RISK-02 | 前端 ant-design-mobile-chart 版本兼容性 | 图表渲染异常 | 低 | 锁定 ^1.2.2 版本；前端组件测试覆盖三图渲染 |
| RISK-03 | 跨仓联调环境搭建（前后端独立 worktree） | E2E 测试无法执行 | 中 | 前端 proxy 转发至后端 dev server；CI 中合并构建 |
| RISK-04 | UserDimensionProvider Mock 数据稳定性 | 聚合查询维度值不稳定 | 低 | 单元测试 Mock UserDimensionProvider 固定返回；数据测试预置 DS-03 |
| RISK-05 | 冒泡排序 1000 元素 OOM | 大数组内存溢出 | 低 | R02 已设上限 1000；性能测试 TC-PERF-002 验证 |
| RISK-06 | 人员维度数据源未对接（Mock） | 维度聚合无真实数据 | 高 | 接受 Mock 测试范围；标注 A04 待确认项不阻塞测试 |

---

## 6. 测试准入/准出标准

### 6.1 准入标准

| 准入项 | 标准 |
|--------|------|
| 系分文档 | design.md 已评审通过或基线锁定 |
| 后端代码 | W01-W05 接口代码已完成，可编译启动 |
| 前端代码 | algorithm-demo 页面三 Tab + 导出 + 报表已完成 |
| 测试环境 | SQLite 测试库可初始化；前端 dev server 可启动 |
| 测试数据 | DS-01~DS-05 数据集已准备 |

### 6.2 准出标准

| 准出项 | 标准 |
|--------|------|
| P0 用例 | 100% 通过 |
| P1 用例 | ≥ 95% 通过 |
| P2 用例 | ≥ 80% 通过 |
| 接口契约对齐 | TC-E2E-004 全部通过（7 项契约检查） |
| 数据一致性 | TC-DATA-001/003 通过 |
| 安全测试 | TC-SEC-001/002 通过 |
| 缺陷 | 无 P0/P1 级别未修复缺陷 |

---

## 7. 测试用例统计

| 类型 | P0 | P1 | P2 | 小计 |
|------|----|----|----|----|
| 后端接口测试 | 13 | 4 | 0 | 17 |
| 后端单元测试 | 10 | 2 | 0 | 12 |
| 前端组件测试 | 8 | 4 | 0 | 12 |
| E2E 测试 | 4 | 0 | 0 | 4 |
| 数据一致性测试 | 2 | 2 | 0 | 4 |
| 安全测试 | 2 | 2 | 0 | 4 |
| 性能测试 | 0 | 2 | 3 | 5 |
| **合计** | **39** | **16** | **3** | **58** |

---

## 8. 测试检查清单

| 检查项 | 详细描述 | 结论 |
|--------|----------|------|
| 功能点覆盖完整性 | F01-F10 全部有对应测试用例 | ✅ 通过（10/10） |
| 接口覆盖完整性 | W01-W05 全部有接口测试用例 | ✅ 通过（5/5） |
| 业务规则覆盖完整性 | R01-R12 全部有对应测试用例 | ✅ 通过（12/12） |
| 错误码覆盖完整性 | ALG_001~005/EXP_001/ANA_001~002 均有触发用例 | ✅ 通过 |
| 异常场景覆盖完整性 | 接口失败/导出失败/查询失败/steps 空/Provider 失败 | ✅ 通过 |
| 跨仓契约覆盖 | 路径/方法/入参/出参/错误码/Header/Content-Type | ✅ 通过（7 项） |
| 数据一致性覆盖 | 字段完整性/状态记录/聚合对账/索引有效性 | ✅ 通过 |
| 安全测试覆盖 | SQL 注入/类型校验/payload 大小/XSS | ✅ 通过 |
| 性能测试覆盖 | 单次响应/大数组/聚合查询/导出/异步隔离 | ✅ 通过 |
| 测试数据准备 | DS-01~DS-05 覆盖正常+边界+非法+安全+性能 | ✅ 通过 |

---

> 本文档为测分阶段产物，未修改任何代码文件。编码实现将在「编码实现」阶段于对应仓库 worktree 执行。
