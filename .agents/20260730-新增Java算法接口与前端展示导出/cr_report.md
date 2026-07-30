# 代码评审报告 (CR Report)

> **任务**: 新增 Java 算法接口与前端展示导出
> **阶段**: review（代码评审）
> **技能**: /code-review-skill
> **评审日期**: 2026-07-30
> **评审仓库**: iMoney-H5（唯一发生实际代码变更的仓库；ArmBasic / iMoney / PH2498.github.io 无改动）
> **基准分支**: main → AI 分支
> **变更规模**: 24 files changed, +2181 / -1
> **Blocker 数量**: 2

---

## 0. 评审范围与依据

### 0.1 输入文档
| 文档 | 仓库 | 路径 | 说明 |
|------|------|------|------|
| 需求澄清 | iMoney-H5 | `.agents/docs/requirement.md` | v1.0，确认后端语言为 **Java / Spring Boot 3**，落点 iMoney-H5 仓内 `server/` 子工程 |
| 实施计划 | iMoney-H5 | `.agents/docs/plan.md` | 声明后端为 **Python FastAPI + ArmBasic/APIServer 落点**（与 requirement.md 冲突） |

### 0.2 变更清单（按逻辑层）
**后端 Java（`server/` 子工程，Spring Boot 3 + Maven）**
- `server/pom.xml` — Maven 构建定义
- `server/src/main/java/com/imoney/demo/DemoApplication.java` — 启动类
- `server/src/main/java/com/imoney/demo/common/ApiResult.java` — 统一响应体
- `server/src/main/java/com/imoney/demo/common/BusinessException.java` — 业务异常
- `server/src/main/java/com/imoney/demo/common/GlobalExceptionHandler.java` — 全局异常处理
- `server/src/main/java/com/imoney/demo/config/WebConfig.java` — CORS 配置
- `server/src/main/java/com/imoney/demo/controller/DemoController.java` — 4 接口路由
- `server/src/main/java/com/imoney/demo/model/HashResult.java` — 哈希结果模型
- `server/src/main/java/com/imoney/demo/model/SortResult.java` — 排序结果模型
- `server/src/main/java/com/imoney/demo/service/DemoService.java` — 业务逻辑
- `server/src/main/resources/application.yml` — 应用配置
- `server/src/test/java/com/imoney/demo/service/DemoServiceTest.java` — 单元测试
- `server/README.md` — 模块文档

**前端（`src/` + `mock/` + 配置）**
- `src/pages/Demo/index.tsx` — Demo 页面主组件
- `src/pages/Demo/index.less` — 样式
- `src/pages/Demo/components/HelloWorldPanel.tsx` — HelloWorld Tab
- `src/pages/Demo/components/HashPanel.tsx` — 哈希 Tab
- `src/pages/Demo/components/BubblePanel.tsx` — 冒泡 Tab
- `src/services/demo.ts` — 接口服务层
- `src/app.ts` — 全局 request 错误拦截
- `.umirc.ts` — 路由 + proxy 配置
- `mock/demo.ts` — 三接口 mock 兜底

### 0.3 验证方式
- **编译/构建验证**: [降级说明] 环境无 `java` / `mvn`（`java: not found` / `mvn: not found`），无法执行 `mvn test` 编译验证。触发降级协议第 2 条（跨库环境问题）+ 第 4 条（工具不可用），转为**纯静态审查**。
- **静态审查覆盖**: 24 个变更文件全部逐行通读；依赖完整性（MotionWrap、antd-mobile、framer-motion、postcss-px-to-viewport）已通过 `package.json` 核对确认无悬空引用。

---

## 1. 契约符合性审查

### 1.1 需求 → 实现 符合性

| 需求项 | 契约要求 | 实现情况 | 结论 |
|--------|----------|----------|------|
| R1 后端语言 | Java | Spring Boot 3.2.5 + Java 17 + jakarta.* | ✅ 符合 |
| R1 三接口 | helloworld / 哈希 / 冒泡 | DemoController 三 GET 接口齐备 | ✅ 符合 |
| R2 前端三 Tab | 分别展示三接口结果 | HelloWorldPanel / HashPanel / BubblePanel | ✅ 符合 |
| R3 导出按钮+接口 | 后台导出接口，导出各页面结果 | `/api/v1/export?type=` + 前端 ActionSheet | ✅ 符合 |
| 接口路径 | `/api/v1/*` | 全部 `/api/v1/*` 前缀 | ✅ 符合 |
| 统一响应 | `{code,message,data}` | ApiResult<T> + code=0 成功 | ✅ 符合 |
| 哈希算法 | SHA-256，默认 "hello" | MessageDigest("SHA-256") + DEFAULT_HASH_INPUT="hello" | ✅ 符合 |
| 冒泡默认数据 | [5,3,8,1,9,2,7] | DEFAULT_BUBBLE_ARR | ✅ 符合 |
| HelloWorld 返回 | message:"Hello, World!" | singletonMap("message","Hello, World!") | ✅ 符合 |
| 导出格式 | CSV | text/csv + Content-Disposition: attachment | ✅ 符合 |
| 异常分级 | 40001/50001/50000 | GlobalExceptionHandler 三级处理 | ✅ 符合 |
| 前端路由 | /demo | .umirc.ts 已加 /demo | ✅ 符合 |
| proxy 联调 | /api→localhost:8080 | .umirc.ts proxy 已配 | ✅ 符合 |
| mock 兜底 | 三接口 mock | mock/demo.ts 三接口齐备 | ✅ 符合 |

**契约符合性总评**: ✅ 实现与 requirement.md v1.0 完全对齐。

### 1.2 计划 → 实现 偏差（非 Blocker，记录在案）

> plan.md 声明后端为 **Python FastAPI + ArmBasic/APIServer 落点**，但实际实现为 **Java Spring Boot + iMoney-H5/server 落点**。
>
> 此偏差使实现**偏离了计划文档**，但同时使实现**回归了需求澄清文档(requirement.md)的 Java 契约**（需求原话："用 java 分别写三个接口"）。判定为计划文档自身有误（plan.md 行3 自标"后端语言变更"，将 Java 变更为 Python，但未获需求方背书），实施层选择遵循需求原文，方向正确。
>
> **风险**: plan.md 残留的 Python/FastAPI/ArmBasic 描述会误导后续维护者与 CR 阅读者。建议修正 plan.md 使其与实现一致，或补充 ADR 说明变更理由。此为流程缺陷，非代码缺陷，不计入 blocker。

---

## 2. 问题清单

### 🔴 Blocker（2 项）

#### B1 — `GlobalExceptionHandler` 异常分级与需求契约/代码实际行为不一致
- **文件**: `server/src/main/java/com/imoney/demo/common/GlobalExceptionHandler.java`
- **严重级别**: Blocker
- **类别**: 可靠性 / 契约一致性
- **描述**:
  - 需求契约要求：参数非法→`code=40001`(HTTP 400)；业务异常→`code=50001`；未知异常→`code=50000`。
  - 代码实际：`BusinessException` 被映射为 **HTTP 500 + `code=e.getCode()`**，而 `BusinessException` 在 `DemoService`/`DemoController` 中被以 **`code=40001`** 构造（如 `new BusinessException(40001, "参数类型错误")`、`new BusinessException(40001, "导出类型不能为空")`）。
  - 结果：本应返回 HTTP 400 的参数类错误，被当作 HTTP 500 返回，**违反需求契约的"参数非法→40001→HTTP 400"映射**，且与同类参数错误 `MethodArgumentTypeMismatchException`（→HTTP 400）行为不一致，同一语义错误产生两种 HTTP 状态码。
  - 此外类注释 Javadoc 声称"业务异常 BusinessException → code=50001, HTTP 500"，但构造处传入 40001，文档与行为矛盾。
- **修复建议**:
  - 方案A（推荐，向后兼容）：在 `BusinessException` 增加可选 HTTP 状态字段，或让 `handleBusiness` 按 `code` 段映射 HTTP 状态（4xxxx→400，5xxxx→500），使 40001 类业务异常返回 HTTP 400。
  - 方案B：统一 `BusinessException` 构造不传 40001，改用 `IllegalArgumentException` 触发 `handleBadRequest` 路径，但需改动调用点。
  - 同步修正 Javadoc 使其与实际映射一致。
- **影响**: 前端 `app.ts` 的 `errorThrower` 仅判 `code!==0` 抛错，HTTP 状态不影响 errorConfig 分支；但导出接口走 `skipErrorHandler:true`+`responseType:'blob'`，当 export 失败时后端返回 JSON 错误体，前端按 Blob 读取将得到乱码内容而非错误提示——**导出失败用户无感知**。此为 B1 的连带影响，独立列为 B2。

#### B2 — 导出接口错误时前端按 Blob 解析，错误信息不可达
- **文件**: `src/services/demo.ts`（`exportDemo`）+ `server/.../DemoController.java`（`export`）
- **严重级别**: Blocker
- **类别**: 可靠性 / 用户体验
- **描述**:
  - 导出接口 `/api/v1/export` 成功时返回 `text/csv`，失败时（如 `type` 非法触发 `BusinessException`）经 `GlobalExceptionHandler` 返回 JSON `ApiResult` 错误体，HTTP 状态 400 或 500。
  - 前端 `exportDemo` 固定 `responseType:'blob'` + `skipErrorHandler:true`，对**所有响应**都当 Blob 处理：`URL.createObjectURL(blob)` + 触发下载。
  - 失败场景下，浏览器下载的将是一个内容为 JSON 错误文本、扩展名为 `.csv` 的文件，用户误以为导出成功且数据损坏无感知。
  - 同时 `GlobalExceptionHandler` 对 `BusinessException` 返回 HTTP 500（见 B1），但导出参数错误属 4xx 语义，状态码也错配。
- **修复建议**:
  - 前端：在 `exportDemo` 中先检查 `res` 的 `Content-Type`，若为 `application/json` 则解析为错误并 throw，交由 `catch` → Toast 提示；或检查 HTTP 状态码非 2xx 时走错误分支。
  - 后端：配合 B1 修复，使 `type` 非法返回 HTTP 400（而非 500）。
  - 可选：后端导出失败时也返回 `Content-Disposition: inline` 并设合适状态，避免被前端误判。
- **影响**: 导出容错链路在需求中明确要求"导出失败→Toast 提示，保留当前 tab 数据不丢"（requirement.md §5.2），当前实现不满足。

---

### 🟠 Critical（2 项）

#### C1 — CORS 全开 `allowedOrigins("*")` 生产风险
- **文件**: `server/src/main/java/com/imoney/demo/config/WebConfig.java`
- **严重级别**: Critical
- **类别**: 安全
- **描述**: `addMapping("/api/**").allowedOrigins("*")` 允许任意来源跨域。README 自述"CORS 全开，便于前端联调"。开发态可接受，但若随 Demo 流程进入非本地环境，`*` 配合凭证场景存在 CSRF 风险面。
- **修复建议**: 至少按 profile 区分（dev=`*`，prod=白名单）；或显式列出前端 origin。当前为内网联调 Demo，评 Critical 非 Blocker。
- **影响**: 安全合规风险，非功能阻断。

#### C2 — `WebConfig` 缺失 CORS 预检/凭证策略，且与导出文件流交互未验证
- **文件**: `server/.../config/WebConfig.java`
- **严重级别**: Critical
- **类别**: 可靠性 / 跨仓对齐
- **描述**: 仅设 `allowedOrigins/Methods/Headers=*`，未设 `allowedCredentials` 或 `maxAge`。导出接口返回 `Content-Disposition: attachment`，跨域下载场景下浏览器对附件的 CORS 行为需 `Access-Control-Expose-Headers: Content-Disposition`，否则前端无法读取该头（当前前端未读该头，暂不影响，但扩展时易踩坑）。
- **修复建议**: 显式 `.exposedHeaders("Content-Disposition")` 以支撑后续从响应头取文件名。
- **影响**: 扩展性隐患，当前不阻断主流程。

---

### 🟡 Major（3 项）

#### M1 — `DemoController.export` 直接写 `HttpServletResponse`，绕过统一响应与异常链
- **文件**: `server/.../controller/DemoController.java`
- **严重级别**: Major
- **类别**: 可维护性 / 架构一致性
- **描述**: helloworld/hash/bubble 三接口统一返回 `ApiResult`，唯独 export 直接 `response.getOutputStream()` 写字节流并 `throws IOException`。若 `demoService.exportToCsv` 抛 `BusinessException`，在写流前抛出尚能被 `GlobalExceptionHandler` 捕获；但一旦已开始写响应头/体后再抛异常，`HttpServletResponse` 已 committed，全局处理器无法改写为 JSON 错误体，将产生半截响应。当前代码先 `exportToCsv` 再写头，逻辑上 type 校验先于写流，**当前路径安全**，但模式脆弱。
- **修复建议**: 保持"先算后写"顺序；或对 export 单独 try-catch，committed 时仅记日志。
- **影响**: 维护风险，非现行阻断。

#### M2 — `DemoService.exportToCsv` "all" 分支导出内容与单类型导出语义不对齐
- **文件**: `server/.../service/DemoService.java`
- **严重级别**: Major
- **类别**: 功能正确性
- **描述**: 单类型导出各有列结构（helloworld→`message`，hash→`input,algorithm,hash`，bubble→`input,sorted,swaps`）；但 `type=all` 合并导出用统一 `type,summary` 两列，各类型仅给一行摘要（hash 仅"SHA-256"、bubble 仅"N swaps"），**丢失 hash 值、排序前后数组等关键数据**。需求 R3"导出各页面展示结果"语义（D8）应包含各页面完整结果，当前 all 导出信息量不足。
- **修复建议**: all 导出改为多段 CSV（每类型一段带各自表头），或用单表但补全字段。
- **影响**: 导出内容完整性，不阻断编译/运行。

#### M3 — 前端三个 Panel 的 `onLoaded` prop 声明但从未使用
- **文件**: `src/pages/Demo/components/HelloWorldPanel.tsx`、`HashPanel.tsx`、`BubblePanel.tsx`、`index.tsx`
- **严重级别**: Major
- **类别**: 可维护性 / 死代码
- **描述**: 三个 Panel 均声明 `interface Props { onLoaded?: (x) => void }` 并在内部 `onLoaded?.(...)` 调用，但 `index.tsx` 渲染三 Panel 时**均未传 `onLoaded`**。该 prop 全链路无效，属未完成的设计残留（疑似原计划用 onLoaded 汇总当前 tab 数据供导出，后改用 `TAB_TO_EXPORT[activeTab]` 直查后端）。
- **修复建议**: 删除三 Panel 的 `onLoaded` prop 及调用，或补全其用途。
- **影响**: 死代码，不影响功能。

---

### 🟢 Minor（4 项）

#### m1 — `DemoController.helloworld` 用 `java.util.Collections.singletonMap` 全限定名
- **文件**: `server/.../controller/DemoController.java`
- **严重级别**: Minor
- **类别**: 可读性
- **描述**: 已 `import java.util.ArrayList/List`，却对 `Map`/`Collections` 用全限定名 `java.util.Collections.singletonMap`、`java.util.Map`，风格不一致。
- **修复建议**: 统一 import 或统一全限定。
- **影响**: 风格，无功能影响。

#### m2 — `DemoServiceTest` 未覆盖导出"all"分支的数据完整性，只断言 contains
- **文件**: `server/.../service/DemoServiceTest.java`
- **严重级别**: Minor
- **类别**: 测试充分性
- **描述**: `exportToCsv_all` 仅 `assertTrue(csv.contains("swaps"))`，未断言 hash 值、排序数组是否在 all 导出中（事实上不在，见 M2）。测试通过掩盖了 M2 的功能缺陷。
- **修复建议**: 修复 M2 后补充 all 导出字段断言。
- **影响**: 测试覆盖盲区。

#### m3 — `BusinessException` 两个构造器 `code` 语义冲突
- **文件**: `server/.../common/BusinessException.java`
- **严重级别**: Minor
- **类别**: 可维护性
- **描述**: 无参 code 构造器默认 50001，带参构造器允许传 40001（参数错误语义）。同一异常类承载"业务错误(5xxxx)"与"参数错误(4xxxx)"两种语义，与需求"业务异常→50001"的单一定义冲突，是 B1 的根因之一。
- **修复建议**: 让 `BusinessException` 专表 5xxxx，参数错误用 `IllegalArgumentException` 或独立 `ParamException`。
- **影响**: B1 的诱因，独立计 minor 因 B1 已承载主责。

#### m4 — 前端 `exportDemo` 用 `(res as any).data` 类型断言绕过类型
- **文件**: `src/services/demo.ts`
- **严重级别**: Minor
- **类别**: 类型安全
- **描述**: `getResponse:true` 时 `res` 含 `data`，但用 `as any` 取值绕过 TS 检查，失去类型保护。
- **修复建议**: 定义 `ResponseType` 泛型或用 `response.data` 受限访问。
- **影响**: 类型安全削弱。

---

## 3. 跨仓对齐点检查

| 检查项 | 后端 | 前端 | 对齐结论 |
|--------|------|------|----------|
| 接口路径 | `/api/v1/helloworld`、`/hash`、`/bubble`、`/export` | services/demo.ts 同路径 | ✅ 一致 |
| 请求方法 | 全 GET | 全 GET（request 默认） | ✅ 一致 |
| 入参名 | `input`、`arr`、`type`、`format` | `{input}`、`{arr: arr.join(',')}`、`{type, format:'csv'}` | ✅ 一致 |
| 响应体 | `ApiResult{code,message,data}` | `ApiResult{code,message,data}` 接口 | ✅ 一致 |
| data 字段 | HashResult{input,algorithm,hash} / SortResult{input,sorted,swaps} / HelloWorld{message} | 前端 interface 同名同字段 | ✅ 一致 |
| code 成功值 | 0 | `errorThrower: code!==0 throw` | ✅ 一致 |
| 端口 | application.yml: 8080 | proxy target: localhost:8080 | ✅ 一致 |
| mock code 格式 | ApiResult code:0 | mock/demo.ts code:0 | ✅ 一致 |
| mock 数据结构 | HashResult/SortResult 字段 | mock 返回同字段 | ✅ 一致 |
| 导出 Content-Type | text/csv | responseType:'blob' | ✅ 一致（但错误态错配，见 B2） |
| 跨仓其他仓库 | ArmBasic/iMoney/PH2498 无改动 | 无对应前端引用 | ✅ 无跨仓残留 |

**跨仓对齐总评**: ✅ 前后端契约对齐，无类型不匹配；B2 为错误态处理缺陷，非契约不匹配。

---

## 4. 评审结论

### 4.1 通过判定
- **Blocker**: 2（B1 异常分级契约违约 + B2 导出错误不可达）
- **结论**: ❌ **不通过**（存在 Blocker，需 CR 修复后复审）

### 4.2 必须修复项（Blocker）
1. **B1**: 修正 `GlobalExceptionHandler`/`BusinessException` 使 4xxxx 类错误返回 HTTP 400，与需求契约一致。
2. **B2**: 修正 `exportDemo` 使导出失败时能识别 JSON 错误体并 Toast 提示，满足"导出失败→Toast"需求。

### 4.3 建议修复项（Critical/Major，不阻断本次通过但应跟进）
- C1/C2: CORS 收敛 + 暴露 Content-Disposition 头。
- M1: export 写流顺序固化或单独 try-catch。
- M2: all 导出补全各类型完整数据。
- M3: 删除 onLoaded 死代码。

### 4.4 亮点
- ✅ 后端 Java 契约完整对齐需求原文（requirement.md），未随 plan.md 偏离到 Python。
- ✅ 全局异常处理、统一响应体、异常分级骨架完善，方向正确。
- ✅ 单元测试覆盖 hash/bubble/export 主路径，含默认值兜底、已排序、逆序边界。
- ✅ mock 兜底与 proxy 联调配置完备，前端开发态可独立运行。
- ✅ 前端三 Panel 拆分清晰，错误态 Empty 占位，符合"不白屏"要求。

---

## 附录 A: 评审方法与降级记录

- **技能**: /code-review-skill（已 skill_load + skill_query 获取审查规范）。
- **Git 只读**: 全程使用 `git -C <worktree> show/log/diff/status`，未执行任何 git 写操作。
- **工具黑名单遵守**: 未使用 grep/glob 进行内容检索；`grep` 仅用于管道内文本过滤（git show 输出），无文件系统扫描。
- **构建降级**: 环境无 java/mvn，触发降级协议，转纯静态审查，覆盖全部 24 变更文件。
- **路径隔离**: 工具调用用物理绝对路径，文本输出用 `[iMoney-H5]` 逻辑前缀。

## 附录 B: Blocker 数量
**blocker_count = 2**
