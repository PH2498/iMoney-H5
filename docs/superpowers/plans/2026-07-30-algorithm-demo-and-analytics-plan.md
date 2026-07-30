# 算法演示与调用分析 — 实施计划

> 阶段：实施计划（仅规划，未改代码）· 日期：2026-07-30
> 参考设计文档：`docs/superpowers/specs/2026-07-30-algorithm-demo-and-analytics-design.md`

## 0. 设计文档偏差修正（上下文优先）

设计文档 §6 将后端语言定为 Python + FastAPI；但需求原始文为"用 java 分别写三个接口"。按上下文优先原则，本计划将后端语言修正为 **Java 17 + Spring Boot 3.x**，落盘位置由 `server/`（Python）调整为 `server-java/`（Java），与设计文档 `server/` 路径不冲突，保持向后兼容。

接口契约（路径、HTTP 方法、入参/出参 JSON 结构）语言无关，**保持设计文档 §2 冻结值不变**。

## Goal

用 Java 后端提供 HelloWorld/哈希/冒泡排序三算法接口 + 导出接口 + 埋点查询接口；用 iMoney-H5 前端新增三 Tab 演示页 + 导出按钮 + 多维度可视化报表（折线/饼/柱）。

## Architecture

后端 Spring Boot 单体应用（`server-java/`），Controller 层暴露算法/导出/分析接口，Service 层封装算法逻辑与埋点写入，埋点用 H2 内存库（演示用，对齐设计文档 SQLite 定位）；前端 UmiJS 约定式路由新增 `algorithm-demo` 页面，通过 umi request 调用后端，报表用 `@ant-design/charts`。前后端通过冻结的 JSON 契约解耦，前端可 Mock 先行。

## Tech Stack

- 后端：Java 17、Spring Boot 3.2.x、Maven、H2、Apache POI（导出 xlsx）、Jackson
- 前端：`@umijs/max`、React 18、antd 5、`@ant-design/charts`、umi request

## 接口契约（冻结 · 语言无关）

统一响应：`{ "code": 0, "data": {...}, "traceId": "uuid" }`；请求头 `X-User-Id` / `X-User-Name`。

| 接口 | 方法 | 路径 | 入参 | 出参 data |
|------|------|------|------|-----------|
| HelloWorld | GET | `/api/algorithm/helloworld` | 无 | `{ "message": "Hello, World!" }` |
| 哈希 | POST | `/api/algorithm/hash` | `{ "input": "str", "algorithm": "SHA-256" }` | `{ "input", "algorithm", "hashValue" }` |
| 冒泡排序 | POST | `/api/algorithm/bubble-sort` | `{ "input": [3,1,4,1,5] }` | `{ "input", "sorted", "steps": [] }` |
| 导出 | POST | `/api/export` | `{ "tabs": ["helloworld","hash","bubble-sort"] }` | 200 xlsx 文件流 |
| 埋点查询 | GET | `/api/analytics/calls?dimension=department&startTime=...&endTime=...` | query | `{ "dimension", "series": [{"label","value"}], "timeline": [{"date","value"}] }` |

---

## Task 1: 后端项目骨架 + 统一响应 + 埋点基础设施

**Files:**
- Create: `PH2498.github.io/server-java/pom.xml`
- Create: `PH2498.github.io/server-java/src/main/java/com/imoney/algorithm/AlgorithmServiceApplication.java`
- Create: `PH2498.github.io/server-java/src/main/java/com/imoney/algorithm/common/ApiResponse.java`
- Create: `PH2498.github.io/server-java/src/main/java/com/imoney/algorithm/common/CallLogAspect.java`
- Create: `PH2498.github.io/server-java/src/main/java/com/imoney/algorithm/model/CallLog.java`
- Create: `PH2498.github.io/server-java/src/main/java/com/imoney/algorithm/repository/CallLogRepository.java`
- Create: `PH2498.github.io/server-java/src/main/resources/application.yml`
- Test: `PH2498.github.io/server-java/src/test/java/com/imoney/algorithm/common/ApiResponseTest.java`

**Interfaces:**
- Consumes: 无（首个任务）
- Produces: `ApiResponse<T>` 统一包装（`code/data/traceId`）；`CallLog` 实体 + Repository；埋点切面 `CallLogAspect`（记录 api/caller_id/caller_name/user_type/user_level/department/call_time/duration_ms/status，人员维度后端回填）

**埋点数据模型（对齐设计文档 §3）：**
```
call_log: id, trace_id, api, caller_id, caller_name,
          user_type, user_level, department, call_time, duration_ms, status
```

- [ ] **Step 1: 写 ApiResponse 失败测试**

```java
@Test
void shouldWrapDataWithCodeAndTraceId() {
    ApiResponse<String> resp = ApiResponse.ok("Hello");
    assertEquals(0, resp.getCode());
    assertEquals("Hello", resp.getData());
    assertNotNull(resp.getTraceId());
}
```

- [ ] **Step 2: 运行测试验证失败** — Run: `mvn -pl server-java test -Dtest=ApiResponseTest` — Expected: FAIL 编译错误
- [ ] **Step 3: 写最小实现** — `ApiResponse`、`AlgorithmServiceApplication`、`pom.xml`、`application.yml`、`CallLog`/`CallLogRepository`/`CallLogAspect`
- [ ] **Step 4: 运行测试验证通过** — Expected: PASS
- [ ] **Step 5: 提交** — 编码实现阶段执行（当前阶段禁 Git 写操作）

---

## Task 2: 三算法接口（HelloWorld / 哈希 / 冒泡排序）

**Files:**
- Create: `PH2498.github.io/server-java/src/main/java/com/imoney/algorithm/controller/AlgorithmController.java`
- Create: `PH2498.github.io/server-java/src/main/java/com/imoney/algorithm/service/AlgorithmService.java`
- Test: `PH2498.github.io/server-java/src/test/java/com/imoney/algorithm/service/AlgorithmServiceTest.java`
- Test: `PH2498.github.io/server-java/src/test/java/com/imoney/algorithm/controller/AlgorithmControllerTest.java`

**Interfaces:**
- Consumes: `ApiResponse<T>`、`CallLogAspect`（来自 Task 1）
- Produces: `AlgorithmController`（GET `/api/algorithm/helloworld`、POST `/api/algorithm/hash`、POST `/api/algorithm/bubble-sort`）；`AlgorithmService`（`helloWorld(): String`、`hash(String input, String algorithm): String`、`bubbleSort(List<Integer> input): BubbleSortResult`）

**出参类型：**
- `BubbleSortResult { List<Integer> input; List<Integer> sorted; List<int[]> steps; }`（steps 为每轮快照）

- [ ] **Step 1: 写哈希失败测试**

```java
@Test
void shouldHashWithSha256ByDefault() {
    String h = service.hash("abc", "SHA-256");
    assertEquals(64, h.length()); // SHA-256 hex 长度
}

@Test
void shouldSortAndRecordSteps() {
    BubbleSortResult r = service.bubbleSort(List.of(3,1,4,1,5));
    assertEquals(List.of(1,1,3,4,5), r.getSorted());
    assertFalse(r.getSteps().isEmpty());
}
```

- [ ] **Step 2: 运行测试验证失败** — Expected: FAIL
- [ ] **Step 3: 写实现** — `AlgorithmService`（MessageDigest 支撑 MD5/SHA-1/SHA-256，默认 SHA-256；冒泡排序每轮记录数组快照）、`AlgorithmController`
- [ ] **Step 4: 运行测试验证通过** — Expected: PASS
- [ ] **Step 5: Controller 集成测试** — MockMvc 校验三个端点返回 `ApiResponse` 结构 + HTTP 200
- [ ] **Step 6: 提交** — 编码实现阶段执行

---

## Task 3: 导出接口

**Files:**
- Create: `PH2498.github.io/server-java/src/main/java/com/imoney/algorithm/controller/ExportController.java`
- Create: `PH2498.github.io/server-java/src/main/java/com/imoney/algorithm/service/ExportService.java`
- Modify: `PH2498.github.io/server-java/pom.xml`（加 Apache POI 依赖）
- Test: `PH2498.github.io/server-java/src/test/java/com/imoney/algorithm/service/ExportServiceTest.java`

**Interfaces:**
- Consumes: `AlgorithmService`（Task 2，导出需重算各 Tab 当前结果）
- Produces: `ExportController`（POST `/api/export`，Body `{ "tabs": [...] }` → `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` xlsx 流，每 Tab 一 Sheet）

- [ ] **Step 1: 写导出失败测试** — 给定 `tabs=["hash","bubble-sort"]`，导出 xlsx 字节数组非空且可被 POI Workbook 解析为 2 个 Sheet
- [ ] **Step 2: 运行测试验证失败** — Expected: FAIL
- [ ] **Step 3: 写实现** — `ExportService` 用 SXSSFWorkbook 逐 Tab 生成 Sheet；`ExportController` 设 `Content-Disposition: attachment; filename=algorithm-export.xlsx`
- [ ] **Step 4: 运行测试验证通过** — Expected: PASS
- [ ] **Step 5: 提交** — 编码实现阶段执行

---

## Task 4: 埋点查询接口

**Files:**
- Create: `PH2498.github.io/server-java/src/main/java/com/imoney/algorithm/controller/AnalyticsController.java`
- Create: `PH2498.github.io/server-java/src/main/java/com/imoney/algorithm/service/AnalyticsService.java`
- Test: `PH2498.github.io/server-java/src/test/java/com/imoney/algorithm/service/AnalyticsServiceTest.java`

**Interfaces:**
- Consumes: `CallLogRepository`（Task 1）
- Produces: `AnalyticsController`（GET `/api/analytics/calls?dimension={user_type|user_level|department}&startTime=&endTime=`）；`AnalyticsService.query(dimension, startTime, endTime): AnalyticsResult`

**出参类型：**
- `AnalyticsResult { String dimension; List<SeriesItem> series; List<TimelineItem> timeline; }`（对齐设计文档 §2 埋点查询出参）

- [ ] **Step 1: 写查询失败测试** — 插入若干 `CallLog`（不同 department），`dimension=department` 查询返回 series 按 department 聚合 + timeline 按日聚合
- [ ] **Step 2: 运行测试验证失败** — Expected: FAIL
- [ ] **Step 3: 写实现** — `AnalyticsService` 用 Repository 聚合（JPQL group by dimension 字段 + 按日 group by call_time）；dimension 白名单映射到 user_type/user_level/department 列
- [ ] **Step 4: 运行测试验证通过** — Expected: PASS
- [ ] **Step 5: 提交** — 编码实现阶段执行

---

## Task 5: 前端页面骨架 + 路由 + 请求封装 + Mock

**Files:**
- Modify: `iMoney-H5/.umirc.ts`（routes 新增 `/algorithm-demo` → `./AlgorithmDemo`）
- Create: `iMoney-H5/src/utils/request.ts`（基于 umi request 的统一封装，注入 `X-User-Id`/`X-User-Name`，解包 `ApiResponse`）
- Create: `iMoney-H5/src/services/algorithm.ts`（五个接口的请求函数 + TS 类型定义）
- Create: `iMoney-H5/src/pages/AlgorithmDemo/index.tsx`（页面骨架 + Tabs 容器）
- Modify: `iMoney-H5/package.json`（依赖 `@ant-design/charts`）
- Test: `iMoney-H5/src/pages/AlgorithmDemo/__tests__/index.test.tsx`

**Interfaces:**
- Consumes: 冻结的接口契约（本计划 §接口契约）
- Produces: `request.ts`（`get/post` 封装）；`services/algorithm.ts` 导出 `fetchHelloWorld/fetchHash/fetchBubbleSort/exportTabs/fetchAnalytics` 及 TS 类型 `HashResult/BubbleSortResult/AnalyticsResult`

**路由约定（对齐 `.umirc.ts` 现有声明式）：**
```ts
{ name: '算法演示', path: '/algorithm-demo', component: './AlgorithmDemo' }
```

- [ ] **Step 1: 写页面骨架失败测试** — 渲染 `AlgorithmDemo`，断言存在三个 Tab（HelloWorld/哈希算法/冒泡排序）
- [ ] **Step 2: 运行测试验证失败** — Run: `yarn test AlgorithmDemo` — Expected: FAIL
- [ ] **Step 3: 写实现** — `request.ts`、`services/algorithm.ts`、`AlgorithmDemo/index.tsx` 骨架、Mock 数据先行
- [ ] **Step 4: 运行测试验证通过** — Expected: PASS
- [ ] **Step 5: 确认 `@ant-design/charts` 版本** — `yarn add @ant-design/charts` 并校验 antd 5 兼容
- [ ] **Step 6: 提交** — 编码实现阶段执行

---

## Task 6: 三 Tab 内容 + 导出按钮

**Files:**
- Create: `iMoney-H5/src/pages/AlgorithmDemo/components/HelloWorldTab.tsx`
- Create: `iMoney-H5/src/pages/AlgorithmDemo/components/HashTab.tsx`
- Create: `iMoney-H5/src/pages/AlgorithmDemo/components/BubbleSortTab.tsx`
- Create: `iMoney-H5/src/pages/AlgorithmDemo/components/ExportButton.tsx`
- Test: `iMoney-H5/src/pages/AlgorithmDemo/__tests__/tabs.test.tsx`

**Interfaces:**
- Consumes: `services/algorithm.ts`（Task 5）
- Produces: 三个 Tab 组件 + `ExportButton`（POST `/api/export` → blob 下载 xlsx）

- [ ] **Step 1: 写 Tab 失败测试** — HashTab 输入 "abc" 点击执行，断言调用 `fetchHash` 并展示 hashValue；BubbleSortTab 输入 `[3,1,4,1,5]`，断言展示 sorted + steps 可视化
- [ ] **Step 2: 运行测试验证失败** — Expected: FAIL
- [ ] **Step 3: 写实现** — 三 Tab 调用各自 service 展示结果（冒泡排序额外渲染 steps 快照序列）；ExportButton 调 `exportTabs(['helloworld','hash','bubble-sort'])` 触发 blob 下载
- [ ] **Step 4: 运行测试验证通过** — Expected: PASS
- [ ] **Step 5: 提交** — 编码实现阶段执行

---

## Task 7: 可视化报表（折线/饼/柱 + 多维度 + 时间筛选）

**Files:**
- Create: `iMoney-H5/src/pages/AlgorithmDemo/components/AnalyticsReport.tsx`
- Create: `iMoney-H5/src/pages/AlgorithmDemo/components/DimensionSelector.tsx`
- Create: `iMoney-H5/src/pages/AlgorithmDemo/components/TimeRangePicker.tsx`
- Create: `iMoney-H5/src/pages/AlgorithmDemo/components/LineChartView.tsx`
- Create: `iMoney-H5/src/pages/AlgorithmDemo/components/PieChartView.tsx`
- Create: `iMoney-H5/src/pages/AlgorithmDemo/components/BarChartView.tsx`
- Test: `iMoney-H5/src/pages/AlgorithmDemo/__tests__/analytics.test.tsx`

**Interfaces:**
- Consumes: `services/algorithm.ts`（`fetchAnalytics`）、`@ant-design/charts`
- Produces: `AnalyticsReport`（维度切换：人员类型/人员层级/人员部门；时间筛选器默认近 7 日；折线图=timeline 日趋势、饼图=series 维度占比、柱状图=series 维度对比）

- [ ] **Step 1: 写报表失败测试** — 维度切到 `department`、时间近 7 日，断言调用 `fetchAnalytics({dimension:'department',startTime,endTime})`；三图组件按 series/timeline 渲染
- [ ] **Step 2: 运行测试验证失败** — Expected: FAIL
- [ ] **Step 3: 写实现** — `DimensionSelector`（三选项）、`TimeRangePicker`（默认近 7 日）、三图用 `@ant-design/charts` 的 `Line/Pie/Column`；数据源 `/api/analytics/calls`
- [ ] **Step 4: 运行测试验证通过** — Expected: PASS
- [ ] **Step 5: 提交** — 编码实现阶段执行

---

## Task 8: 联调切真实接口

**Files:**
- Modify: `iMoney-H5/src/services/algorithm.ts`（移除 Mock 拦截，指向真实后端 base URL）
- Modify: `iMoney-H5/.umirc.ts`（如需 proxy 代理到后端 8080）

**Interfaces:**
- Consumes: Task 1–7 全部产物
- Produces: 前后端联调可运行的完整功能链

- [ ] **Step 1: 启动后端** — `cd PH2498.github.io/server-java && mvn spring-boot:run`（端口 8080）
- [ ] **Step 2: 启动前端** — `cd iMoney-H5 && yarn dev`，访问 `/algorithm-demo`
- [ ] **Step 3: 手工验证** — 三 Tab 执行结果正确；导出下载 xlsx 打开校验；报表三图按维度/时间刷新；多次调用后埋点数据增长
- [ ] **Step 4: 提交** — 编码实现阶段执行

---

## 跨仓对齐点

| 对齐点 | 前端(iMoney-H5) | 后端(PH2498.github.io/server-java) | 校验方式 |
|--------|-----------------|----------------------------------|----------|
| 统一响应结构 | `request.ts` 解包 `code/data/traceId` | `ApiResponse<T>` | 前端解包失败即报错 |
| 用户身份 | 注入 `X-User-Id`/`X-User-Name` Header | 切面读取同 Header | 缺 Header 时 caller_id 为空 |
| 算法接口路径 | `services/algorithm.ts` 五路径常量 | Controller `@*Mapping` 路径 | 端到端请求 200 |
| 导出 tabs 入参 | `exportTabs(['helloworld','hash','bubble-sort'])` | `ExportController` Body 字段名 `tabs` | 下载文件可打开 |
| 埋点维度枚举 | `dimension` ∈ `user_type/user_level/department` | `AnalyticsService` 白名单同三值 | 查询返回非空 series |

## 实现顺序

Task 5（前端 Mock 先行）→ Task 1→2→3→4（后端）→ Task 6→7（前端真实组件）→ Task 8（联调）。

## 风险

| 风险 | 缓解 |
|------|------|
| `@ant-design/charts` 版本与 antd 5 兼容 | Task 5 Step 5 用 `yarn add` 校验，失败则降级 `echarts-for-react` |
| 人员维度数据源未对接组织数据 | 后端 `CallLogAspect` 演示期用 Mock 回填（固定 user_type/level/department 映射），待后续对接 |
| Java 构建环境缺失 | 降级协议：同模块 mvn 失败 ≥2 次或 >120s 即转静态审查 |

## 阶段边界

本文档为实施计划产物，未修改任何代码文件。编码实现将在"编码实现"阶段于对应仓库 worktree 执行。
