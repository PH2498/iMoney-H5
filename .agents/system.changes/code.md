> **文档元信息**
>
> | 项目 | 内容 |
> |------|------|
> | 文档版本 | v1.0 |
> | 作者 | DTCoder（编码实现阶段自动产出） |
> | 创建日期 | 2026-07-30 |
> | 需求来源 | iMoney-H5 `docs/requirements/2026-07-30-demo-and-metrics-clarification.md`（需求澄清阶段产物） |
> | 设计依据 | iMoney-H5 `.agents/system.changes/design.md`（系分设计阶段产物） |
> | 当前阶段 | 编码实现 |

# 算法演示与调用埋点可视化 编码实现

## 1. 实现概述

本阶段依据系分设计 `design.md`，在后端仓库 ArmBasic 新建 Java/Maven Spring Boot 模块，在前端仓库 iMoney-H5 新增 Demo 演示页，完整实现五个接口与对应前端消费能力：

- **F01** HelloWorld 接口（GET /api/demo/hello）
- **F02** 哈希算法接口（POST /api/demo/hash，支持 md5/sha1/sha256）
- **F03** 冒泡排序接口（POST /api/demo/sort，返回排序结果与交换次数）
- **F04** 三 Tab 演示页（前端 /demo 路由）
- **F05/F06** 导出接口 + 导出按钮（POST /api/demo/export，CSV 优先 + XLSX）
- **F07/F08** 后端埋点采集 + 调用统计接口（GET /api/metrics/call-stats）
- **F09/F10** 多维度可视化报表（role/level/dept × line/pie/bar）

## 2. 产物落盘决策

| 项 | 值 |
> |------|------|
> | 选定仓库 | iMoney-H5（核心业务库，design.md 同库归档） |
> | worktree_path | `/root/.agentix/agentic-dev/runs/DEV-966dcd0a-7905-11f1-9649-3b4281182f10-ad687d24-be6e-4da3-8cd9-dfc1632ae96c/worktree/iMoney-H5-main` |
> | 产物相对路径 | `.agents/system.changes/code.md` |
> | 最终物理路径 | `<iMoney-H5 worktree>/.agents/system.changes/code.md` |
> | 决策依据 | design.md 产物同目录，code.md 为编码阶段产物，与系分设计文档同库归档 |

## 3. 跨库接口契约（向后兼容：仅新增）

| 接口 | Method | Path | 入参 | 出参 |
|------|--------|------|------|------|
| W01 HelloWorld | GET | `/api/demo/hello` | — | `{ "result":"OK","msg":"SUCCESS","data":{"message":"HelloWorld"} }` |
| W02 哈希算法 | POST | `/api/demo/hash` | `{ "raw": string, "algorithm"?: string }` | `{ "result":"OK","data":{"algorithm":"sha256","digest":"..."} }` |
| W03 冒泡排序 | POST | `/api/demo/sort` | `{ "items": number[] }` | `{ "result":"OK","data":{"sorted":[...],"swapCount":6} }` |
| W04 导出 | POST | `/api/demo/export` | `{ "tab":"hello"|"hash"|"sort", "format":"csv"|"xlsx" }` | 文件流 |
| W05 调用统计 | GET | `/api/metrics/call-stats` | `dimension=role|level|dept&chartType=line|pie|bar` | `{ "result":"OK","data":{"chartType":"pie","dimension":"dept","series":[{"name":"研发部","value":8}]} }` |

## 4. 代码变更清单

### 4.1 后端 ArmBasic（新建 Java/Maven 模块 `demo-service/`）

| 文件路径 | 说明 |
|----------|------|
| `[ArmBasic] demo-service/pom.xml` | Maven 构建配置（Spring Boot 3.2.5 + Apache POI 5.2.5） |
| `[ArmBasic] demo-service/src/main/resources/application.yml` | 服务配置（端口 8080，埋点存储 memory，调用人来源 header） |
| `[ArmBasic] demo-service/src/main/java/com/antgroup/armbasic/demo/DemoServiceApplication.java` | Spring Boot 入口 |
| `[ArmBasic] .../model/ApiResult.java` | 通用出参 `{result,msg,data}` |
| `[ArmBasic] .../model/CallRecord.java` | 埋点记录实体 |
| `[ArmBasic] .../model/PersonMeta.java` | 人员维度元数据 |
| `[ArmBasic] .../model/SortResult.java` | 冒泡排序出参 `data` |
| `[ArmBasic] .../model/StatsResult.java` | 调用统计出参 `data`（含 `SeriesItem`） |
| `[ArmBasic] .../model/DemoConstants.java` | 枚举与常量（错误码、算法、格式、维度等） |
| `[ArmBasic] .../metrics/PersonMetaRepository.java` | 人员元数据 mock 池（I01） |
| `[ArmBasic] .../metrics/CallerResolver.java` | 调用人解析（S06，从 X-Caller-Id 读取） |
| `[ArmBasic] .../metrics/MetricsStore.java` | 埋点内存存储（ConcurrentLinkedQueue） |
| `[ArmBasic] .../metrics/MetricsService.java` | 统计聚合服务（S04/S05，按维度+图表类型聚合） |
| `[ArmBasic] .../metrics/MetricsFilter.java` | 埋点过滤器（拦截 /api/demo/** 写入埋点） |
| `[ArmBasic] .../service/DemoService.java` | 三接口业务逻辑（S01 哈希 + S02 冒泡排序） |
| `[ArmBasic] .../service/ExportService.java` | 导出服务（S03，CSV + XLSX） |
| `[ArmBasic] .../controller/DemoController.java` | W01~W04 四接口 |
| `[ArmBasic] .../controller/MetricsController.java` | W05 调用统计接口 |
| `[ArmBasic] .../controller/HashRequest.java` | W02 入参 DTO |
| `[ArmBasic] .../controller/SortRequest.java` | W03 入参 DTO |
| `[ArmBasic] .../controller/ExportRequest.java` | W04 入参 DTO |

### 4.2 前端 iMoney-H5

| 文件路径 | 说明 |
|----------|------|
| `[iMoney-H5] .umirc.ts` | 追加 `/demo` 路由 |
| `[iMoney-H5] src/services/demo.ts` | 五个接口的 TypeScript 封装（fetchHello/fetchHash/fetchSort/exportTab/fetchCallStats） |
| `[iMoney-H5] src/pages/Demo/index.tsx` | Demo 演示页主入口（三 Tab + 导出按钮 + 报表入口） |
| `[iMoney-H5] src/pages/Demo/index.less` | 页面样式 |
| `[iMoney-H5] src/pages/Demo/components/HelloWorldTab.tsx` | HelloWorld Tab 组件 |
| `[iMoney-H5] src/pages/Demo/components/HashTab.tsx` | 哈希算法 Tab 组件 |
| `[iMoney-H5] src/pages/Demo/components/SortTab.tsx` | 冒泡排序 Tab 组件 |
| `[iMoney-H5] src/pages/Demo/components/ExportButton.tsx` | 导出按钮组件（F06） |
| `[iMoney-H5] src/pages/Demo/components/ExportButton.less` | 导出按钮样式 |
| `[iMoney-H5] src/pages/Demo/components/MetricsReport.tsx` | 调用报表可视化组件（F09/F10，维度×图表类型切换） |
| `[iMoney-H5] src/pages/Demo/components/MetricsReport.less` | 报表样式 |
| `[iMoney-H5] src/pages/Demo/components/TabCommon.less` | Tab 通用样式 |

## 5. 跨仓对齐点检查

### 5.1 接口契约对齐

| 对齐点 | 后端（ArmBasic） | 前端（iMoney-H5） | 对齐结论 |
|--------|------------------|-------------------|----------|
| W01 路径/方法 | `@GetMapping("/api/demo/hello")` | `request('/api/demo/hello', { method:'GET' })` | ✅ 一致 |
| W02 路径/入参 | `@PostMapping("/api/demo/hash")` + `{raw,algorithm}` | `request('/api/demo/hash', { method:'POST', data:{raw,algorithm} })` | ✅ 一致 |
| W03 路径/入参 | `@PostMapping("/api/demo/sort")` + `{items}` | `request('/api/demo/sort', { method:'POST', data:{items} })` | ✅ 一致 |
| W04 路径/入参 | `@PostMapping("/api/demo/export")` + `{tab,format}` | `request('/api/demo/export', { method:'POST', data:{tab,format}, responseType:'blob' })` | ✅ 一致 |
| W05 路径/入参 | `@GetMapping("/api/metrics/call-stats")` + `?dimension=&chartType=` | `request('/api/metrics/call-stats', { method:'GET', params:{dimension,chartType} })` | ✅ 一致 |
| 通用出参结构 | `ApiResult<T>{result,msg,data}` | `ApiResult<T>{result,msg,data}` | ✅ 一致 |
| 统计 series 格式 | `[{name,value}]` | `{name,value}[]` | ✅ 一致 |

### 5.2 技术栈对齐

| 项 | 设计决策 | 实际实现 | 对齐结论 |
|----|----------|----------|----------|
| 后端语言 | Java（design.md A01 已确认） | Spring Boot 3.2.5 + Java 17 | ✅ 一致 |
| 图表库 | ant-design-mobile-chart@1.2.2（A02） | `import { Line, Pie, Bar } from 'ant-design-mobile-chart'` | ✅ 一致 |
| 哈希默认算法 | sha256（A06） | `DEFAULT_HASH_ALGORITHM = "sha256"` | ✅ 一致 |
| 导出格式 | CSV 优先 + XLSX（A05） | `exportCsv()` + `exportXlsx()` (Apache POI) | ✅ 一致 |
| 埋点范围 | /api/demo/** + export（A07） | `MetricsFilter` 拦截 `path.startsWith("/api/demo")` | ✅ 一致 |
| 调用人来源 | X-Caller-Id，缺失则 mock 池轮询（A08） | `CallerResolver.resolve()` + `PersonMetaRepository.findById()` | ✅ 一致 |
| 埋点存储 | 内存 ConcurrentLinkedQueue（A04） | `MetricsStore` 用 `ConcurrentLinkedQueue<CallRecord>` | ✅ 一致 |

## 6. 业务规则实现验证

| 规则 | 设计要求 | 实现方式 | 结论 |
|------|----------|----------|------|
| R01 | hash raw 非空 | `DemoService.hash()` 抛 `DEMO_002` | ✅ |
| R02 | algorithm 不在枚举回退 sha256 | `DemoConstants.inEnum()` 判断后回退 | ✅ |
| R03 | sort items 非空 | `DemoService.bubbleSort()` 抛 `DEMO_004` | ✅ |
| R04 | tab 枚举校验 | `ExportService.export()` 抛 `DEMO_005` | ✅ |
| R05 | format 不支持回退 csv | `ExportService` 判断后回退 csv | ✅ |
| R06 | dimension/chartType 枚举校验 | `MetricsService.aggregate()` 抛 `METRICS_001/002` | ✅ |
| R10 | series 为空展示空状态 | `MetricsReport` 组件展示"暂无数据" | ✅ |

## 7. 降级与容错

| 场景 | 处理方式 |
|------|----------|
| 导出接口 POI 异常 | `ExportService.exportXlsx()` 捕获异常抛 `DEMO_001` |
| 导出接口前端异常 | `ExportButton` catch 后 Toast 提示，不影响三 Tab 展示 |
| 埋点记录异常 | `MetricsFilter` catch 后静默，不影响主流程 |
| 统计空数据 | `MetricsService` 返回空 series，前端展示"暂无数据" |
| 调用人缺失 | `PersonMetaRepository` 轮询 mock 池分配 |

## 8. 构建与运行说明

### 后端

```bash
cd demo-service
mvn clean package
java -jar target/demo-service-1.0.0.jar
# 服务启动于 http://localhost:8080
```

### 前端

```bash
cd <iMoney-H5 worktree>
yarn install
yarn dev
# 访问 http://localhost:8000/demo
```

### 代理配置（前端开发联调）

`.umirc.ts` 需配置 proxy 将 `/api` 转发至后端 8080 端口（编码阶段未追加，联调时按需添加）：

```ts
proxy: {
  '/api': {
    target: 'http://localhost:8080',
    changeOrigin: true,
  },
},
```

## 9. 验证清单

| 验证项 | 方法 | 预期结果 | 状态 |
|--------|------|----------|------|
| 后端文件结构 | `find demo-service -type f` | 21 个文件（pom+yml+18 Java+1 入口） | ✅ 已验证 |
| 前端文件结构 | `find src/pages/Demo -type f` | 10 个文件（index+5组件+4样式） | ✅ 已验证 |
| 路由追加 | `grep "算法演示" .umirc.ts` | 匹配 `/demo` 路由 | ✅ 已验证 |
| Java public 类约束 | 拆分 DTO 为独立文件 | 每文件一个 public 类 | ✅ 已修复 |
| Tab 切换组件 | 使用 antd-mobile `Tabs` 而非 `TabBar.Item` | 页面内 Tab 切换 | ✅ 已修复 |
| node_modules | 未安装（与设计假设一致） | 编码阶段产出源码，不依赖本地构建 | ✅ 符合预期 |
| 后端编译 | `mvn compile` | 需 JDK17 + Maven 环境 | ⏳ 未执行（环境约束，见降级说明） |
| 前端构建 | `yarn build` | 需 node_modules 安装 | ⏳ 未执行（环境约束，见降级说明） |

## 10. [降级说明] 构建验证降级

后端 `mvn compile` 与前端 `yarn build` 未执行，原因：

1. **后端**：worktree 环境无 JDK17 + Maven，且 `demo-service/` 为新建独立 Maven 工程，属跨库环境依赖问题（满足降级协议条件 2）。
2. **前端**：`node_modules` 未安装，`yarn build` 无法执行（满足降级协议条件 2）。

**已转为静态审查**：跨仓对齐点入参/出参类型匹配已在第 5 节逐项验证通过。代码遵循仓库既有约定（MotionWrap + TabBar + index.less 风格、antd-mobile 组件用法、@umijs/max request 插件、ant-design-mobile-chart 图表组件）。

## 11. 设计产物清点

| 产物 | 路径 | 状态 |
|------|------|------|
| 需求澄清文档 | `[iMoney-H5] docs/requirements/2026-07-30-demo-and-metrics-clarification.md` | ✅ 需求澄清阶段已产出 |
| 系分设计文档 | `[iMoney-H5] .agents/system.changes/design.md` | ✅ 系分生成阶段已产出 |
| 编码实现文档 | `[iMoney-H5] .agents/system.changes/code.md` | ✅ 本文档 |
| 后端代码 | `[ArmBasic] demo-service/` (21 文件) | ✅ 编码实现阶段产出 |
| 前端代码 | `[iMoney-H5] src/pages/Demo/ + src/services/demo.ts + .umirc.ts` (13 文件) | ✅ 编码实现阶段产出 |
