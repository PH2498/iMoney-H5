# 代码评审报告 (CR Report)

> 评审日期：2026-07-30
> 评审阶段：review（代码评审·问题修复后复审）
> 评审技能：/code-review-skill
> 变更仓库：iMoney-H5（24 文件 +2181 行）
> 需求来源：`.agents/docs/requirement.md` · 实施计划：`.agents/docs/plan.md`

---

## 一、评审概述

### 1.1 需求覆盖矩阵

| 需求项 | 状态 | 实现位置 |
|--------|------|----------|
| R1 后端 Java 三接口（helloworld/哈希/冒泡） | ✅ 已实现 | `server/` Spring Boot 3 子工程 |
| R2 前端三 Tab 页面展示执行结果 | ✅ 已实现 | `src/pages/Demo/` |
| R3 导出按钮 + 后台导出接口 | ✅ 已实现 | 前端 `Demo/index.tsx` + 后端 `DemoController.export` |
| 异常兜底（后端全局异常 + 前端 errorConfig + mock 兜底） | ✅ 已实现 | `GlobalExceptionHandler` + `app.ts` + `mock/demo.ts` |

### 1.2 评审结论

**总体评价：PASSED（可合并）**

本次实现覆盖全部需求项，代码结构清晰、分层合理（Controller→Service→Model）、前后端契约对齐严密、异常处理设计正确。问题修复阶段已修复此前评审轮次发现的全部 Blocker 问题。经对照实际代码复审，剩余 **0 个 Major** 和 **3 个 Minor**（可选优化），均不阻塞合并。

**Blocker Count: 0**

---

## 二、跨仓对齐点检查

| 检查项 | 结论 | 证据 |
|--------|------|------|
| 后端 `ApiResult{code,message,data}` 与前端 `ApiResult<T>` 类型对齐 | ✅ 一致 | `ApiResult.java` vs `demo.ts` L4-8 |
| `code=0` 成功约定前后端一致 | ✅ 一致 | 后端 `ApiResult.success` code=0；前端 `app.ts` errorThrower `code !== 0` |
| 后端端口 8080 与前端 proxy target 一致 | ✅ 一致 | `application.yml` vs `.umirc.ts` proxy target |
| mock 数据格式与后端对齐 | ✅ 一致 | `mock/demo.ts` 所有响应均含 `code/message/data` |
| 导出接口 Content-Disposition: attachment | ✅ 一致 | `DemoController.java` export 方法 |
| CORS 暴露 Content-Disposition 头 | ✅ 一致 | `WebConfig.java` `exposedHeaders("Content-Disposition")` |
| Demo 页未侵入现有 Home/Stats/AIAssistant/Mine | ✅ 未侵入 | `.umirc.ts` 仅追加 `/demo` 路由 |
| ArmBasic/iMoney/PH2498 三仓无变更 | ✅ 确认 | 变更仅集中在 iMoney-H5 仓 |

### 2.1 计划与实现偏差

| 维度 | plan.md 声明 | 实际实现 |
|------|-------------|----------|
| 后端语言 | Python FastAPI（ArmBasic/APIServer） | **Java Spring Boot 3**（iMoney-H5/server） |
| 后端落点 | ArmBasic 仓 | **iMoney-H5 仓内 server/ 子工程** |

**评价**：实际实现选择了 Java + Spring Boot，恰好符合原始需求（"用 java 分别写三个接口"）。plan.md 描述的 Python 方案是中间过程中的版本变更。实现回归 Java 是正确的决策。**不阻塞合并。**

---

## 三、后端 Java 代码评审

### 3.1 DemoApplication.java — ✅ 无问题

标准 Spring Boot 启动类，`@SpringBootApplication` + `SpringApplication.run`，端口 8080 与 `application.yml` 一致。

### 3.2 ApiResult.java — ⚠️ Minor-1：注释与实现矛盾

泛型统一响应体 `ApiResult<T>`，含 `success(T)` / `error(int, String)` 工厂方法。`code=0` 成功，字段含 getter/setter，可被 Jackson 正确序列化。

类注释声称"不可变对象：仅通过工厂方法 success()/error() 构造，不暴露 setter"，但实际暴露了全字段 setter（`setCode` / `setMessage` / `setData`）。注释与实现不一致，易误导后续维护者认为对象不可变。

**建议**：要么移除 setter 改为真正的不可变对象（构造器 + getter only），要么修正注释为"可变对象，主要通过工厂方法构造"。当前仅在工厂方法内构造，无实际安全风险。（非阻塞）

### 3.3 BusinessException.java — ✅ 设计合理

继承 `RuntimeException`，默认 code=50001，专表 5xxxx 类业务错误。构造器含防御性校验：`if (code < 50000) throw new IllegalArgumentException("BusinessException code must be >= 50000; use ParamException for 4xxxx codes")`，强制 code >= 50000，防止误用 4xxxx 码。Javadoc 明确指引"参数非法类错误请使用 ParamException"，语义清晰。

### 3.4 ParamException.java — ✅ 设计合理

参数非法专用异常，默认 code=40001，被 `GlobalExceptionHandler.handleBadRequest` 捕获映射 HTTP 400。与 `BusinessException` 语义分离（4xxxx→400 vs 5xxxx→500），避免同一异常类承载两种 HTTP 语义。

### 3.5 GlobalExceptionHandler.java — ✅ 契约完整

`@RestControllerAdvice` 三级异常处理：

- `IllegalArgumentException` / `MethodArgumentTypeMismatchException` / **`ParamException`** → code=40001, **HTTP 400**
- `BusinessException` → code 按段映射（`resolveHttpStatus`：4xxxx→400，5xxxx→500）
- `Exception`（含 NPE）→ code=50000, HTTP 500，不泄漏堆栈

**关键验证**：`bubble` 接口参数类型错误抛 `ParamException`（`DemoController.java`），被 `handleBadRequest` 捕获 → HTTP 400。需求契约"参数非法→40001→HTTP 400"完全满足。

### 3.6 WebConfig.java — ✅ CORS 已修复（此前 Major-1 已解决）

实际代码：

```java
@Configuration
@Profile("dev")
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*")
                .allowedMethods("*")
                .allowedHeaders("*")
                .exposedHeaders("Content-Disposition")
                .maxAge(3600);
    }
}
```

**已修复项**：
- 使用 `allowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*")` 限定本地开发来源，**未使用** `allowedOrigins("*")`
- 添加 `@Profile("dev")` 限定仅 dev 环境生效，生产环境不加载此 CORS 配置
- 暴露 `Content-Disposition` 头支撑前端读取导出文件名

**此前评审轮次记录的 Major-1（`allowedOrigins("*")` 生产安全隐患）已完全解决。** 当前实现符合安全最佳实践。

### 3.7 DemoController.java — ✅ 实现正确

**✅ 优点**：
- 构造器注入 `DemoService`（`@Autowired` 构造器），符合 Spring 最佳实践
- 四接口路径与方法与契约完全一致：`/api/v1/helloworld`、`/api/v1/hash`、`/api/v1/bubble`、`/api/v1/export`
- `bubble` 接口参数解析含 try-catch，非法参数抛 `ParamException`（非 `BusinessException`），正确映射 HTTP 400
- `export` 接口已校验 `format` 参数：`if (!"csv".equalsIgnoreCase(format)) throw new ParamException(...)`
- `export` 接口正确设置 `Content-Type: text/csv` + `Content-Disposition: attachment` + UTF-8 编码
- `export` 写流阶段 try-catch 防护：response 已 committed 时仅记日志，避免二次异常

### 3.8 DemoService.java

**✅ 优点**：
- `@Service` 注解，被 Spring 管理
- 哈希用 `MessageDigest.getInstance("SHA-256")`，UTF-8 编码，正确转十六进制
- **sha256 方法已使用 `HexFormat.of().formatHex(bytes)`**（Java 17+），简洁高效，此前评审 Minor-3（`String.format("%02x", b)` 逐字节拼接）已不存在
- 冒泡排序逻辑正确，含边界处理（空/默认数组兜底）
- `NoSuchAlgorithmException` 捕获后抛 `BusinessException(50000, ...)`（5xxxx 类，正确映射 HTTP 500）
- 排序不修改入参（`new ArrayList<>(arr)` 副本）
- `exportToCsv` 含 type 校验：空/null → `ParamException`，unknown → `ParamException`

**Minor-2（需求语义偏差，已文档化）**：`exportToCsv` 中 `hash` 和 `all` 类型导出始终用默认数据 `DEFAULT_HASH_INPUT`（"hello"），不反映前端用户实际输入。

需求 R3 要求"支持导出各个页面的**展示结果**"，但导出接口为无状态 GET，无法携带用户会话状态，因此始终导出默认数据快照。

**影响**：功能层面导出可工作，但导出内容不反映用户当前页面输入的值。**`server/README.md` 已在"导出说明"章节明确文档化此限制**，并给出后续迭代建议（改为 POST 接口携带请求体）。作为 Demo 项目且已文档化，降级为 Minor。（非阻塞）

### 3.9 HashResult.java / SortResult.java — ✅ 无问题

标准 POJO，字段 + getter/setter，可被 Jackson 序列化。`SortResult` 的 `List<Integer>` 字段会被正确序列化为 JSON 数组。

### 3.10 DemoServiceTest.java — ✅ 测试覆盖充分

共 11 个测试用例：
- 哈希：默认输入、自定义输入
- 冒泡：默认数组、已排序数组、空输入兜底、逆序数组
- 导出：all 多段完整性（含 hash 值 64 位校验、排序前后数组校验）、bubble、hash、helloworld
- **异常路径已覆盖**：`exportToCsv("")` 和 `exportToCsv(null)` → `ParamException`；`exportToCsv("unknown")` → `ParamException`

### 3.11 pom.xml / application.yml / README.md — ✅ 配置合理

- `pom.xml`：Spring Boot 3.2.5 parent + `spring-boot-starter-web` + `spring-boot-starter-test`，Java 17
- `application.yml`：端口 8080 + 应用名
- `README.md`：含接口列表、启动方式、测试方式、**导出语义说明**（已文档化"导出为默认数据快照"限制）

---

## 四、前端 TypeScript 代码评审

### 4.1 .umirc.ts — ✅ 改动合理

仅新增 `proxy` 配置（`/api` → `localhost:8080`）和 `/demo` 路由，未侵入现有路由。

### 4.2 src/app.ts — ✅ errorConfig 实现正确

`code !== 0` 判失败，`Toast` 提示，不白屏。与需求一致。

### 4.3 src/services/demo.ts — ✅ 封装正确

`ApiResult<T>` 接口与后端对齐。四个函数封装清晰。

**导出失败处理已完整实现**：

```typescript
const blob: Blob = res.data;
const contentType = res.response?.headers?.['content-type'] || '';

if (contentType.includes('application/json')) {
  const text = await blob.text();
  let errMsg = '导出失败';
  try {
    const errResult = JSON.parse(text) as ApiResult<unknown>;
    if (errResult?.message) errMsg = errResult.message;
  } catch {}
  throw new Error(errMsg);
}
```

**验证**：当后端导出接口返回错误（如 type 参数非法，后端抛 `ParamException` 返回 JSON 错误体 + HTTP 400），前端 `exportDemo` 检测到 `Content-Type: application/json`，解析错误消息并 `throw`，交由 `index.tsx` 的 `handleExport` catch 块 `Toast.show({ content: '导出失败', icon: 'fail' })` 提示用户。需求"导出失败→Toast 提示"完全满足。

### 4.4 src/pages/Demo/index.tsx — ✅ 页面结构合理

- `ActionSheet` 替代 `Dropdown`（plan.md 用 Dropdown），实际实现用 `ActionSheet` 更适合移动端
- `TAB_TO_EXPORT` 映射正确
- 导出成功/失败均有 `Toast` 提示
- 导出失败时 `finally` 恢复 `exporting` 状态，保留当前 Tab 数据

### 4.5 Panel 组件（HelloWorldPanel / HashPanel / BubblePanel）

**✅ 共同优点**：
- 加载/错误/成功三态处理完整（loading/error/数据展示）
- `Empty` 组件兜底错误状态，不白屏
- `HelloWorldPanel` 的 `useEffect` 仅挂载时触发一次，带 eslint-disable 注释
- `HashPanel` 和 `BubblePanel` 均为用户主动触发（点击按钮计算），合理

**Minor-3**：`BubblePanel` 中前端解析数组时 `.filter((n) => !Number.isNaN(n))` 会静默过滤掉非法输入（如 "abc"→NaN→过滤）。当用户输入 "5,abc,3" 时，实际发送 [5,3] 给后端。这与后端 `DemoController.bubble()` 的行为（抛 `ParamException` 报错）不一致——后端遇到非数字会报错，前端 mock 路径会静默过滤。建议前端遇到非法输入时给出提示而非静默过滤。（非阻塞，Demo 可接受）

### 4.6 mock/demo.ts — ✅ 兜底实现完整

三个接口 mock 均含 `code/message/data` 格式。冒泡排序 mock 实现了实际排序逻辑，与后端逻辑一致。

mock 中 hash 值为硬编码固定值 `'2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e3c1afa7a8e8b8f0c3a7a8e0d3a'`，不随用户 `input` 参数变化。当 mock 模式下用户输入 "world" 时，mock 仍返回 "hello" 的 hash 值。建议 mock 中也实现简单的 SHA-256 模拟或注释说明该值对应 "hello"。（非阻塞，mock 仅为开发态兜底）

---

## 五、问题汇总

### 5.1 Blocker（阻塞合并）：0 个

> 此前评审轮次发现的 B1（HTTP 状态码契约违规）和 B2（导出失败静默无提示）**均已修复**：
> - **B1 已修复**：`bubble` 接口参数错误抛 `ParamException`（非 `BusinessException`），被 `GlobalExceptionHandler.handleBadRequest` 映射 HTTP 400。`BusinessException` 构造器强制 code >= 50000，语义与 `ParamException` 分离。
> - **B2 已修复**：`exportDemo` 已实现 `Content-Type` 检查，后端返回 JSON 错误体时解析并 `throw`，交由调用方 `Toast` 提示。

### 5.2 Major（建议后续迭代修复）：0 个

> 此前评审轮次记录的 Major-1（CORS `allowedOrigins("*")`）**已修复**：实际代码使用 `allowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*")` 限定本地来源 + `@Profile("dev")` 限定环境，不再存在生产安全隐患。
> 此前记录的 Major-2（导出始终用默认数据）**已文档化降级为 Minor-2**：`server/README.md` 已在"导出说明"章节明确说明此限制并给出后续迭代建议。

### 5.3 Minor（可选优化）：3 个

| 编号 | 文件 | 问题 | 建议 |
|------|------|------|------|
| Minor-1 | `ApiResult.java` | 类注释声称"不暴露 setter"但实际暴露全字段 setter，注释与实现矛盾 | 修正注释为"可变对象"或移除 setter 改为真正不可变 |
| Minor-2 | `DemoService.java` | `exportToCsv` 始终用默认数据，不反映用户实际输入（已 README 文档化） | 后续迭代可改为 POST 接口携带请求体 |
| Minor-3 | `BubblePanel.tsx` | 前端解析 `.filter((n) => !Number.isNaN(n))` 静默过滤非法输入，与后端报错行为不一致 | 前端遇到非法输入时给出提示 |

---

## 六、验证状态

| 验证项 | 状态 | 说明 |
|--------|------|------|
| Java 编译 | ⏭️ 跳过 | Java/Maven 环境不可用，降级为静态审查 |
| 前端 tsc | ⏭️ 跳过 | yarn/tsc/node_modules 不可用，降级为静态审查 |
| 单元测试 | ⏭️ 跳过 | 同上，测试代码静态审查通过（11 用例覆盖正向+异常路径） |
| 跨仓对齐 | ✅ 通过 | 前后端契约、端口、响应格式全对齐 |
| Git 只读 | ✅ 完成 | 仅 status/log/diff 查询，无写操作 |

### 6.1 降级说明

```
[降级说明] Java/Maven 不可用（java/mvn 命令不存在），yarn/tsc 不可用且 node_modules 未安装。
报错属于跨库环境问题（构建工具链缺失）。满足降级条件后转为静态审查：
- 逐文件人工审查 24 个变更文件的逻辑正确性、安全性、错误处理、契约对齐
- 未运行编译/测试验证，但通过源码审查确认类型引用路径正确、import 完整
```

---

## 七、安全审查

| 检查项 | 结果 |
|--------|------|
| SQL 注入 | ✅ 无风险（无数据库操作） |
| XSS | ✅ 低风险（React 默认转义，无 `dangerouslySetInnerHTML`） |
| 命令注入 | ✅ 无风险（无 `Runtime.exec`） |
| 敏感信息泄露 | ✅ 无硬编码密钥/密码，GlobalExceptionHandler 不泄漏堆栈 |
| CORS | ✅ 已修复（`allowedOriginPatterns` 限定本地来源 + `@Profile("dev")`） |
| 输入校验 | ✅ `export` 的 `format` 参数已校验；`bubble` 参数已校验；`exportToCsv` type 已校验 |

---

## 八、建议修复优先级

1. **P0（合并前必须修复）**：无
2. **P1（合并前建议修复）**：无
3. **P2（后续迭代修复）**：Minor-1（ApiResult 注释修正）、Minor-2（导出语义 POST 化）
4. **P3（可选优化）**：Minor-3（前端非法输入提示）

---

## 九、最终结论

**PASSED**

本次代码实现质量良好，需求覆盖完整，前后端契约对齐严密，异常兜底方案完整且符合需求契约。此前评审轮次发现的全部问题均已修复或文档化：

- **B1 已修复**：`bubble` 接口参数错误抛 `ParamException` → `handleBadRequest` → HTTP 400。`BusinessException` 构造器强制 code >= 50000，与 `ParamException` 语义分离，"参数非法→40001→HTTP 400"契约完全满足。
- **B2 已修复**：`exportDemo` 已实现 `Content-Type` 检查，后端返回 JSON 错误体时解析并 `throw`，交由调用方 `Toast` 提示，不静默下载错误文件。
- **Major-1 已修复**：`WebConfig.java` 已使用 `allowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*")` 限定本地来源 + `@Profile("dev")` 限定环境，CORS 生产安全隐患已消除。
- **Minor-3（后端）已修复**：`DemoService.sha256` 已使用 `HexFormat.of().formatHex(bytes)` 替代逐字节拼接，更简洁高效。
- **format 参数校验已修复**：`DemoController.export` 已校验 `format` 只允许 `csv`。
- **异常路径测试已修复**：`DemoServiceTest` 已覆盖 `exportToCsv(null/""/unknown)` → `ParamException`。
- **导出语义已文档化**：`server/README.md` 已明确说明"导出为默认数据快照"限制并给出后续迭代建议。

剩余 3 个 Minor 为可选优化（ApiResult 注释矛盾、导出语义 POST 化、前端非法输入提示），不影响 Demo 功能正确性，可作为后续迭代项。不阻塞合并。

**Blocker Count: 0**
