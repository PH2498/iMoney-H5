# 代码评审报告 (Code Review Report)

> **仓库**：iMoney-H5
> **分支**：AI/task-DEV-966dcd0a-7905-11f1-9649-3b4281182f10-31dbbaa6-1293-4092-b2d6-717e720a9ea2
> **阶段**：review（代码评审）
> **技能**：/code-review-skill
> **评审日期**：2026-07-30
> **变更范围**：server/ Java 子工程（Spring Boot 3 + Maven）+ 前端 src/pages/Demo（共 24 文件，+2181/-1）
> **验证方法**：静态审查（java/mvn 构建工具不可用，按防超时降级协议转为静态审查 + 跨仓对齐点校验）
> **评审结论**：**PASSED**（Blocker = 0，无阻塞合并项；1 项 Major 为需求符合性缺口需关注，5 项 Minor 可选优化）

---

## 1. 评审概述

本次评审针对需求「用 Java 分别写三个接口 helloworld、哈希算法以及冒泡排序；前端新增一个页面，三个 tab 分别展示不同执行结果；新增导出按钮，后台提供导出接口，支持导出各个页面的展示结果」的代码实现。

评审覆盖后端 Java 全量链路（Controller / Service / Common 异常体系 / Model / Config）与既有评审产物，复核前序阶段提出的 Blocker 是否已修复，并开展独立静态审查。

### 1.1 评审范围（受审文件清单）

| # | 文件（逻辑路径） | 说明 |
|---|---|---|
| 1 | `server/.../common/BusinessException.java` | 业务异常（5xxxx，HTTP 500） |
| 2 | `server/.../common/ParamException.java` | 参数异常（4xxxx，HTTP 400） |
| 3 | `server/.../common/GlobalExceptionHandler.java` | 全局异常处理器 |
| 4 | `server/.../common/ApiResult.java` | 统一响应封装 |
| 5 | `server/.../controller/DemoController.java` | Demo 接口路由 |
| 6 | `server/.../service/DemoService.java` | 哈希/冒泡/导出业务逻辑 |
| 7 | `server/.../model/HashResult.java` | 哈希结果模型 |
| 8 | `server/.../model/SortResult.java` | 排序结果模型 |
| 9 | `server/.../config/WebConfig.java` | CORS 配置 |

> 注：上述 4-9 为本次评审为完成深度链路审查而扩展读取的关联文件，不在 inputs 清单但属同一变更集，纳入审查以覆盖跨层契约一致性。

### 1.2 接口契约（来自 requirement.md / plan.md，作为评审基准）

| 接口 | 方法 | 路径 | 入参（默认值） | 返回 |
|------|------|------|----------------|------|
| HelloWorld | GET | `/api/v1/helloworld` | 无 | `{code:0,data:{message:"Hello, World!"}}` |
| 哈希 | GET | `/api/v1/hash?input=` | `input:String`（默认 `"hello"`） | `{code:0,data:{input,algorithm:"SHA-256",hash}}` |
| 冒泡 | GET | `/api/v1/bubble?arr=` | `arr:逗号分隔int`（默认 `[5,3,8,1,9,2,7]`） | `{code:0,data:{input,sorted,swaps}}` |
| 导出 | GET | `/api/v1/export?type=&format=csv` | `type:helloworld\|hash\|bubble\|all` | CSV 文件流 `Content-Disposition: attachment` |

---

## 2. 前序 Blocker 复核（回归验证）

前序阶段提出 2 个 Blocker，本次逐项复核修复状态：

### B1：bubble 接口参数错误抛出异常类型错误 → **已修复 ✅**

- **原问题**：参数解析失败抛 `BusinessException`（HTTP 500），应抛参数类异常（HTTP 400）。
- **复核证据**：
  - `DemoController.java:73-74`：`catch (NumberFormatException e) { throw new ParamException("参数类型错误: " + trimmed); }` —— 参数解析失败抛 `ParamException`（4xxxx），非 `BusinessException`。
  - `GlobalExceptionHandler.java:27`：`@ExceptionHandler({IllegalArgumentException.class, MethodArgumentTypeMismatchException.class, ParamException.class})` → `handleBadRequest` → HTTP 400。
  - `BusinessException.java:18-24`：构造器强制 `code >= 50000`，否则抛 `IllegalArgumentException`，从构造层阻断 4xxxx 误用，语义分离彻底。
- **结论**：参数错误已正确映射 HTTP 400，语义分离到位。**通过**。

### B2：导出接口未做 Content-Type/格式校验 → **已修复 ✅**

- **原问题**：导出接口直接写流，未校验 format，后端返回 JSON 错误体时前端无法识别。
- **复核证据**：
  - `DemoController.java:94-96`：`if (!"csv".equalsIgnoreCase(format)) { throw new ParamException("不支持的导出格式: " + format + "，仅支持 csv"); }` —— format 校验在写流之前（行 97 `exportToCsv`、行 99+ 才 setHeader/写流）。
  - `DemoController.java:97`：`String csv = demoService.exportToCsv(type)` 含 type 校验（`DemoService.java:73-74,90` switch default 抛 `ParamException`），同样在写流前抛出。
  - 异常在写流之前抛出 → 由 `GlobalExceptionHandler` 捕获 → 返回 JSON 错误体（`ApiResult.error`），response 未 committed，HTTP 状态正确。
  - `WebConfig.java:23`：`exposedHeaders("Content-Disposition")` 暴露导出文件名头，支撑前端读取。
- **结论**：格式/类型校验前置，写流阶段 try-catch 防护（committed 仅记日志，未 committed 重新抛出）。**通过**。

---

## 3. 独立静态审查发现（按严重级别）

### 🔴 Blocker（阻塞合并）—— 共 0 项

无。未发现安全漏洞、崩溃、编译破坏、数据丢失或注入向量（当前受控输入下）。

---

### 🟠 Major（应修复，影响需求符合性）—— 共 1 项

#### Major-1：导出接口返回默认数据快照，不反映前端用户实际输入值，与需求存在功能符合性差距

- **文件**：`server/src/main/java/com/imoney/demo/service/DemoService.java:72-92`
- **现象**：
  - `exportToCsv` 的 `hash` 分支（行 80）固定调用 `hashString(DEFAULT_HASH_INPUT)`（即 `"hello"`），`bubble` 分支（行 83）固定调用 `bubbleSort(null)`（触发默认数组 `[5,3,8,1,9,2,7]`）。
  - 即：用户在前端哈希 tab 输入 `"world"` 并展示对应哈希后，点击导出 → 得到的是 `"hello"` 的哈希，而非用户当前展示的 `"world"` 结果。冒泡 tab 同理。
- **需求基线**：需求第 3 条「支持导出各个页面的**展示结果**」——「展示结果」语义为用户当前页面所展示的数据，而非固定默认值。
- **影响**：功能可运行（导出有 CSV 产出），但导出内容与页面展示内容在用户改输入时不一致，属需求符合性缺口。
- **缓解现状**：方法 javadoc（行 64-68）已显式说明「导出为默认数据快照，不反映前端用户当前输入值」，并注明「导出接口为无状态 GET，无法携带会话状态」。该文档化降低了隐蔽性，但未消除需求差距。
- **建议修复（向后兼容，新增而非改动）**：
  - 在导出接口新增可选查询参数 `input`（hash 用）与 `arr`（bubble 用），缺省时回退当前默认行为（保持向后兼容）。
  - 示例：`GET /api/v1/export?type=hash&input=world&format=csv` → 导出 `"world"` 的哈希。
  - 前端导出按钮携带当前 tab 的用户输入值调用导出接口。
  - 该改动为新增参数/行为，不破坏既有契约，符合「跨库接口变更始终向后兼容：新增字段/接口」原则。
- **严重级别判定**：需求明确要求导出展示结果，当前实现偏离该语义；但因导出功能本身可用、已文档化、且修复路径向后兼容不阻塞，定为 Major（应修复，非阻塞合并）。

---

### 🟡 Minor（可选优化，不阻塞）—— 共 5 项

#### Minor-1：sha256 异常使用 BusinessException(50000)，与「未知异常」保留码语义混淆

- **文件**：`server/src/main/java/com/imoney/demo/service/DemoService.java:127-129`
- **现象**：`throw new BusinessException(50000, "SHA-256 not available");`
- **问题**：`GlobalExceptionHandler` 中 `50000` 是 `handleUnknown`（未知异常）的保留码（行 47）。此处 SHA-256 不可用属**已知**业务/环境错误，却复用未知异常码，语义混淆。`BusinessException` 构造器要求 `code >= 50000`，`50000` 恰好通过校验但落在此语义边界。
- **建议**：改用独立码段，如 `50002`（算法不可用），与未知异常 `50000` 区分，便于日志与监控定位。
- **影响**：无功能破坏（HTTP 500 正确返回），仅语义/可观测性优化。

#### Minor-2：ApiResult 不可变性声明与实现不一致

- **文件**：`server/src/main/java/com/imoney/demo/common/ApiResult.java:3-8, 15-22`
- **现象**：javadoc 声称「不可变对象：仅通过工厂方法 success()/error() 构造，不暴露 setter」，但实际暴露了 `public ApiResult()` 无参构造器与 `public ApiResult(int, String, T)` 三参构造器，调用方可绕过工厂方法直接构造，不可变性未被强制。
- **建议**：将构造器设为 `private`/包级私有，仅保留 `success()`/`error()` 工厂方法对外；或删除 javadoc 中的不可变声明以与实现一致。
- **影响**：无运行时风险，设计一致性优化。

#### Minor-3：CSV 转义不一致且 quote() 未转义内部双引号

- **文件**：`server/src/main/java/com/imoney/demo/service/DemoService.java:79-81, 84-86, 143-145`
- **现象**：
  - `quote()`（行 143-145）仅在外层包裹双引号，若值内含 `"` 不会转义（应为 `""` 转义），属潜在 CSV 注入/格式破坏隐患。
  - `hash` 分支（行 81）未使用 `quote()`，直接拼接；`bubble` 分支（行 84-85）使用 `quote()`，两分支转义策略不一致。
- **当前风险评估**：所有导出值均为受控输入（`hello`、SHA-256、十六进制哈希、整数），无 `"` 或 `,` 或换行注入向量，**当前无实际触发**。
- **建议**：统一使用 `quote()`；并在 `quote()` 内对 `"`/`\n`/`\r` 做标准 RFC 4180 转义（`"` → `""`），为未来接入用户输入导出预留安全垫。
- **影响**：当前无风险，属潜在缺陷防御性优化。

#### Minor-4：导出 "all" 多段 CSV 使用 `#` 注释行，非 RFC 4180 标准

- **文件**：`server/src/main/java/com/imoney/demo/service/DemoService.java:97-120`
- **现象**：`exportAll()` 在每段前插入 `# HelloWorld` / `# Hash` / `# Bubble` 注释行。RFC 4180 标准不支持注释，严格 CSV 解析器（如某些库默认配置）可能将其误解析为数据行。
- **建议**：若需多段导出，可考虑用一个统一的 CSV（合并列）或使用分节空行分隔；或在文档中明确「非标准 CSV，需注释感知解析器（如 pandas comment='#'）」。
- **影响**：对 Excel/常见解析器通常可接受，属兼容性提示。

#### Minor-5：bubble 接口 arr 入参无长度上限，潜在 DoS

- **文件**：`server/src/main/java/com/imoney/demo/controller/DemoController.java:63-77`
- **现象**：`arr` 经 `split(",")` 解析后逐项 `Integer.parseInt`，无元素数量上限。超大输入（如数万元素）将触发 O(n²) 冒泡排序，存在 CPU DoS 隐患。
- **当前风险评估**：Demo 场景可接受，无生产暴露面（CORS 限 localhost + dev profile）。
- **建议**：增加 `arr` 元素数上限校验（如 `if (parsed.size() > 1000) throw new ParamException(...)`），防御性编程。
- **影响**：Demo 场景无实际风险，生产化前应处理。

---

## 4. 跨仓对齐点检查

| 对齐维度 | 结论 | 证据 |
|---|---|---|
| 接口路径 | ✅ 对齐 | `/api/v1/{helloworld,hash,bubble,export}` 与 requirement.md §3 一致 |
| HTTP 方法 | ✅ 对齐 | 四接口均为 GET |
| 入参契约 | ✅ 对齐 | helloworld 无参；hash `input`（required=false，默认 hello）；bubble `arr`（required=false，默认数组）；export `type`+`format` |
| 响应体 | ✅ 对齐 | `{code:0,data:{...}}` 经 `ApiResult.success()`；异常经 `ApiResult.error()` |
| 导出契约 | ✅ 对齐 | `Content-Disposition: attachment; filename=*.csv`，`Content-Type: text/csv` |
| 前后端端口 | ✅ 对齐 | `.umirc.ts` proxy `/api`→`localhost:8080`；WebConfig CORS 允许 `localhost:*` |
| 异常分级 | ✅ 对齐 | 4xxxx→400，5xxxx→500，未知→50000，不泄漏堆栈 |
| 其他仓库 | ✅ 无改动 | ArmBasic / iMoney / PH2498.github.io 本次无变更，无跨库依赖耦合 |

**CORS 配置复核（纠正既有报告误报）**：
- 既有 cr_report.md 记录 Major-1 为「CORS `allowedOrigins("*")` 生产安全隐患」。
- 实际代码 `WebConfig.java:12-24`：`@Profile("dev")` 仅 dev 环境激活；`allowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*")` 限定本地来源，**非** `allowedOrigins("*")`；`exposedHeaders("Content-Disposition")` 合理。
- **结论**：CORS 配置已做来源限定与 profile 隔离，既有 Major-1 系误报，本次评审予以撤销。该文件不在阻断项。

---

## 5. 评审结论

| 指标 | 数值 |
|---|---|
| Blocker | **0** |
| Major | 1（Major-1：导出默认数据 vs 需求展示结果，向后兼容可修复） |
| Minor | 5（均为可选优化，不阻塞合并） |
| 前序 Blocker 复核 | B1 ✅已修复 / B2 ✅已修复 |
| 跨仓对齐 | ✅ 全部通过 |
| 验证方法 | 静态审查（构建工具不可用，按降级协议执行） |

### 5.1 合并建议

- **允许合并**：无 Blocker，前序 2 个 Blocker 均已修复并复核通过，跨仓对齐全部通过。
- **建议在合并前/合并后跟进 Major-1**：导出接口新增可选 `input`/`arr` 参数以导出用户实际展示结果，向后兼容不破坏既有契约。若 Demo 验收口径允许「导出默认数据快照」语义，可在文档中明确该取舍后直接合并。
- Minor 1-5 作为后续迭代项，不阻塞当前合并。

### 5.2 降级说明

构建工具（`java`/`mvn`）在当前环境不可用，按「防超时与降级协议」第 1 条（单仓库构建命令未执行成功/不可用）转为静态审查。静态审查覆盖：编译可达性（import/符号/语法人工核验）、异常链路、接口契约、安全风险点、跨仓对齐。该降级不影响 Demo 功能正确性结论。

---

**Blocker Count: 0**
