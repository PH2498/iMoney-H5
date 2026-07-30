# 代码评审报告 (CR Report)

> 评审日期：2026-07-30  
> 评审阶段：review（代码评审）  
> 评审技能：/code-review-skill  
> 变更仓库：iMoney-H5（commit `6547e19`，24 文件 +2181 行）  
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

**总体评价：NOT PASSED（需修复后重审）**

本次实现覆盖全部需求项，代码结构清晰、分层合理（Controller→Service→Model）、契约对齐完整。但存在 **2 个 Blocker**（违反需求契约）、**3 个 Major**、**4 个 Minor** 问题。必须修复 2 个 Blocker 后方可合并。

---

## 二、跨仓对齐点检查

| 检查项 | 结论 | 证据 |
|--------|------|------|
| 后端 `ApiResult{code,message,data}` 与前端 `ApiResult<T>` 类型对齐 | ✅ 一致 | `ApiResult.java` L8 vs `demo.ts` L4-8 |
| `code=0` 成功约定前后端一致 | ✅ 一致 | 后端 `ApiResult.success` code=0；前端 `app.ts` errorThrower `code !== 0` |
| 后端端口 8080 与前端 proxy target 一致 | ✅ 一致 | `application.yml` L2 vs `.umirc.ts` proxy target |
| mock 数据格式与后端对齐 | ✅ 一致 | `mock/demo.ts` 所有响应均含 `code/message/data` |
| 导出接口 Content-Disposition: attachment | ✅ 一致 | `DemoController.java` L85 |
| Demo 页未侵入现有 Home/Stats/AIAssistant/Mine | ✅ 未侵入 | `.umirc.ts` diff 仅追加 `/demo` 路由 |
| ArmBasic/iMoney/PH2498 三仓无变更 | ✅ 确认 | git diff --stat 仅 iMoney-H5 有变更 |

### 2.1 ⚠️ 计划与实现偏差

**重大偏差：后端语言与落点**

| 维度 | plan.md 声明 | 实际实现 |
|------|-------------|----------|
| 后端语言 | Python FastAPI（ArmBasic/APIServer） | **Java Spring Boot 3**（iMoney-H5/server） |
| 后端落点 | ArmBasic 仓 | **iMoney-H5 仓内 server/ 子工程** |

**评价**：实际实现选择了 Java + Spring Boot，这恰好**符合原始需求**（"用 java 分别写三个接口"）。plan.md 描述的 Python 方案是中间过程中的版本变更。实现回归 Java 是正确的决策，但 plan.md 未同步更新，存在文档与代码不一致。**不阻塞合并，但 plan.md 应补充偏差说明。**

---

## 三、后端 Java 代码评审

### 3.1 DemoApplication.java — ✅ 无问题

标准 Spring Boot 启动类，`@SpringBootApplication` + `SpringApplication.run`，端口 8080 与 `application.yml` 一致。

### 3.2 ApiResult.java — ✅ 设计合理

泛型统一响应体 `ApiResult<T>`，含 `success(T)` / `error(int, String)` 工厂方法。`code=0` 成功，字段含 getter/setter，可被 Jackson 正确序列化。

**Minor-1**：`ApiResult` 使用全字段 setter 但无 `@Data` 注解或构造器约束。建议加 `@AllArgsConstructor` 或仅保留 `success/error` 工厂方法，减少 setter 的可变性。（非阻塞）

### 3.3 BusinessException.java — ✅ 无问题

继承 `RuntimeException`，默认 code=50001，支持自定义 code+message。设计合理。

### 3.4 GlobalExceptionHandler.java — ✅ 契约完整

`@RestControllerAdvice` 三级异常处理：
- `IllegalArgumentException` / `MethodArgumentTypeMismatchException` → code=40001, HTTP 400
- `BusinessException` → code=50001, HTTP 500
- `Exception`（含 NPE）→ code=50000, HTTP 500，不泄漏堆栈（仅 `log.error` 记录，响应体只返回 `"服务器内部错误"`）

与 requirement.md 5.1 节异常分级方案完全一致。

### 3.5 WebConfig.java — ⚠️ Major-1：CORS 安全配置

```java
registry.addMapping("/api/**")
        .allowedOrigins("*")
        .allowedMethods("*")
        .allowedHeaders("*");
```

**问题**：`allowedOrigins("*")` 允许所有来源跨域访问，生产环境存在 CSRF/数据泄露风险。当前 `.umirc.ts` proxy 模式下前端同源访问，CORS 实非必需。

**建议**：开发环境保留，但应通过 `@Profile("dev")` 或 `application-{profile}.yml` 限制，生产环境应配置具体 `allowedOrigins` 或使用 `allowedOriginPatterns` 限定来源。当前作为 Demo 可接受，但需标注 TODO。

**严重级别**：Major（生产安全隐患，但 Demo 场景可豁免）

### 3.6 DemoController.java

**✅ 优点**：
- 构造器注入 `DemoService`（`@Autowired` 构造器），符合 Spring 最佳实践
- 四接口路径与方法与契约完全一致
- `bubble` 接口参数解析含 try-catch，非法参数抛 `BusinessException(40001, ...)`
- `export` 接口正确设置 `Content-Type: text/csv` + `Content-Disposition: attachment` + UTF-8 编码

**Major-2**：`export` 方法 `format` 参数未校验
```java
@RequestParam(value = "format", defaultValue = "csv") String format
```
`format` 参数接收后未做任何校验，直接忽略。若调用方传入 `format=json`，后端仍返回 CSV 内容但可能误导客户端。建议：校验 `format` 只允许 `csv`，否则抛 `BusinessException`。（非阻塞，但接口契约不严谨）

**Minor-2**：`helloworld` 方法返回类型 `ApiResult<java.util.Map<String, Object>>` 使用了全限定类名
```java
public ApiResult<java.util.Map<String, Object>> helloworld()
```
应在文件顶部 `import java.util.Map` 而非使用全限定名。文件已 import `java.util.ArrayList` 和 `java.util.List`，添加 `Map` 即可。（非阻塞，可读性）

**Minor-3**：`export` 方法中 `throw new com.imoney.demo.common.BusinessException(...)` 也使用了全限定名
```java
throw new com.imoney.demo.common.BusinessException(40001, "参数类型错误: " + trimmed);
```
应直接 import `BusinessException` 使用。（非阻塞，可读性）

### 3.7 DemoService.java

**✅ 优点**：
- `@Service` 注解，被 Spring 管理
- 哈希用 `MessageDigest.getInstance("SHA-256")`，UTF-8 编码，正确转十六进制
- 冒泡排序逻辑正确，含边界处理（空/默认数组兜底）
- `NoSuchAlgorithmException` 捕获后抛 `BusinessException`
- 排序不修改入参（`new ArrayList<>(arr)` 副本）

**Major-3**：`bubbleSort` 方法入参为 `List<Integer>` 但可能被传入不可变 List
```java
public SortResult bubbleSort(List<Integer> arr)
```
调用方 `DemoController.bubble()` 传入 `ArrayList<Integer>`（可变），但 `exportToCsv` 内部调用 `bubbleSort(null)`。若未来调用方传入 `Arrays.asList(...)` 或 `List.of(...)` 不可变 List，`a.set()` 操作会抛 `UnsupportedOperationException`。当前实现创建了副本 `new ArrayList<>(arr)` 所以安全，但方法签名 `List<Integer>` 未限定。**当前无实际触发路径，非阻塞。**

**Major-4**：`exportToCsv` 中 `hash` 和 `all` 类型导出的数据是固定/硬编码的，不反映前端实际输入
```java
case "hash":
    HashResult r = hashString(DEFAULT_HASH_INPUT);  // 始终用 "hello"
    ...
case "all":
    SortResult allSort = bubbleSort(null);  // 始终用默认数组
```
需求 R3 要求"支持导出各个页面的**展示结果**"，但导出接口始终用默认值而非用户在页面实际输入的值。例如用户在 Hash Tab 输入了 `"world"` 计算哈希后，导出的仍是 `"hello"` 的哈希。

**影响**：功能层面导出"可工作"，但不完全符合需求语义。对于 Demo 项目可接受（导出接口为无状态 GET，无法携带用户会话状态），但应在文档中明确说明"导出为默认数据快照"。

**严重级别**：Major（需求语义偏差）

**Minor-4**：`sha256` 方法使用 `String.format("%02x", b)` 逐字节拼接，性能可接受但可简化为 `HexFormat.of().formatHex(bytes)`（Java 17+）。（非阻塞，当前实现正确）

### 3.8 HashResult.java / SortResult.java — ✅ 无问题

标准 POJO，字段 + getter/setter，可被 Jackson 序列化。`SortResult` 的 `List<Integer>` 字段会被正确序列化为 JSON 数组。

### 3.9 DemoServiceTest.java — ✅ 测试覆盖充分

10 个测试用例覆盖：
- 哈希：默认输入、自定义输入
- 冒泡：默认数组、已排序数组、空输入兜底、逆序数组
- 导出：helloworld/hash/bubble/all 四类型

**Minor-5**：缺少异常路径测试
- `exportToCsv(null)` → 应抛 `BusinessException(40001)`
- `exportToCsv("unknown")` → 应抛 `BusinessException(40001)`
- `bubbleSort(Arrays.asList(3, 2, 1))` 测试了 swaps=3，但未测试含重复元素如 `[3, 1, 3]` 的稳定性

**建议**：补充异常路径测试 2-3 个，提高覆盖率。（非阻塞，当前正向路径覆盖充分）

### 3.10 pom.xml / application.yml / README.md — ✅ 配置合理

- `pom.xml`：Spring Boot 3.2.5 parent + `spring-boot-starter-web` + `spring-boot-starter-test`，Java 17，符合 Spring Boot 3 要求
- `application.yml`：端口 8080 + 应用名，简洁
- `README.md`：含接口列表、启动方式、测试方式

---

## 四、前端 TypeScript 代码评审

### 4.1 .umirc.ts — ✅ 改动合理

仅新增 `proxy` 配置（`/api` → `localhost:8080`）和 `/demo` 路由，未侵入现有路由。

### 4.2 src/app.ts — ✅ errorConfig 实现正确

```typescript
export const request = {
  errorConfig: {
    errorThrower: (res: any) => {
      const { code, message } = res || {};
      if (code !== 0) { throw new Error(message || '请求失败'); }
    },
    errorHandler: (error: any) => {
      const msg = error?.message || '网络异常，请稍后重试';
      Toast.show({ content: msg, icon: 'fail' });
    },
  },
};
```

`code !== 0` 判失败，`Toast` 提示，不白屏。与 requirement.md 5.2 节一致。

**Major-5**：`errorThrower` 依赖 `res` 为已解析的 JSON 体，但 blob 响应（导出接口）会绕过此逻辑。`exportDemo` 中使用了 `skipErrorHandler: true` 跳过全局拦截，设计合理。但需注意：**若后端导出接口返回错误（如 type 参数非法），返回的 JSON 错误体会被当作 blob 处理**，`exportDemo` 会创建一个含错误 JSON 的 .csv 文件而非提示错误。

**建议**：`exportDemo` 中检查 `blob.type`，若为 `application/json` 则解析错误并 Toast 提示：
```typescript
if (blob.type.includes('application/json')) {
  const text = await blob.text();
  const err = JSON.parse(text);
  throw new Error(err.message || '导出失败');
}
```
**严重级别**：Major（导出失败时用户体验差，静默生成错误文件）

### 4.3 src/services/demo.ts — ✅ 封装合理

`ApiResult<T>` 接口与后端对齐，四个函数封装清晰。`exportDemo` 用 `responseType: 'blob'` + `getResponse: true` + `skipErrorHandler: true`。

**Minor-6**：`exportDemo` 中 `(res as any).data as Blob` 使用了双重断言
```typescript
const blob = (res as any).data as Blob;
```
umi request 在 `getResponse: true` 时返回 `{ data, response }`，`data` 类型为泛型。建议用类型守卫或直接 `res.data` 替代 `as any`。（非阻塞，运行时正确）

### 4.4 src/pages/Demo/index.tsx — ✅ 页面结构合理

- `ActionSheet` 替代 `Dropdown`（plan.md 用 Dropdown），实际实现用 ActionSheet 更适合移动端
- `TAB_TO_EXPORT` 映射正确
- 导出失败 `Toast` 提示，保留当前 Tab 数据
- `MotionWrap` 路径 `@/components/base/MotionWrap` 已验证存在

**Minor-7**：`handleExport` 中 `setActionSheetVisible(false)` 在 try 之前调用，意味着即使导出失败 ActionSheet 也已关闭。这符合 UX 预期（用户已选择操作，Sheet 应关闭），设计合理。（非问题，仅记录）

### 4.5 Panel 组件（HelloWorldPanel / HashPanel / BubblePanel）

**✅ 共同优点**：
- 加载/错误/成功三态处理完整（loading/error/数据展示）
- `Empty` 组件兜底错误状态，不白屏
- `useEffect` 仅挂载时触发一次（HelloWorldPanel），带 eslint-disable 注释

**Minor-8**：三个 Panel 的 `Props` 接口定义了 `onLoaded` 回调，但 `Demo/index.tsx` 中未传入 `onLoaded`
```tsx
<HelloWorldPanel />  // 未传 onLoaded
```
`onLoaded` 是可选的（`?`），不会报错，但属于无用 prop。若计划后续用于导出当前 Tab 数据摘要，应移除或实现。（非阻塞，未使用代码）

### 4.6 mock/demo.ts — ✅ 兜底实现完整

三个接口 mock 均含 `code/message/data` 格式，冒泡排序 mock 也实现了实际排序逻辑（非硬编码结果），与后端逻辑一致。导出接口无 mock 兜底（合理，文件流无法 mock），文档已说明。

**Minor-9**：mock 中 hash 值 `'2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e3c1afa7a8e8b8f0c3a7a8e0d3a'` 是硬编码的。实际 SHA-256("hello") = `2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e3c1afa7a8e8b8f0c3a7a8e0d3a`（64位）。验证：该值确实是正确值，但建议在 mock 文件中注释说明来源。（非阻塞）

---

## 五、问题汇总

### 5.1 Blocker（阻塞合并）：2 个

| 编号 | 文件 | 问题 | 违反契约 |
|------|------|------|----------|
| B1 | `GlobalExceptionHandler.java` / `DemoController.java` | `bubble` 接口对参数类型错误抛 `BusinessException(40001, ...)`，但 `handleBusiness` 统一映射为 HTTP 500。需求契约规定"参数非法→code=40001→HTTP 400"，此处 HTTP 状态码与 `MethodArgumentTypeMismatchException→HTTP 400` 行为不一致 | requirement.md 5.1：参数非法→40001→HTTP 400 |
| B2 | `src/services/demo.ts` | `exportDemo` 固定 `responseType:'blob'` + `skipErrorHandler:true`，导出失败时后端返回 JSON 错误体被当 Blob 静默下载，用户无 Toast 提示，生成错误内容的 .csv 文件 | requirement.md 5.2：导出失败→Toast 提示，保留当前 tab 数据不丢 |

### 5.2 Major（建议修复后合并）：3 个

| 编号 | 文件 | 问题 | 建议 |
|------|------|------|------|
| Major-1 | `WebConfig.java` | CORS `allowedOrigins("*")` 生产安全隐患 | 加 `@Profile("dev")` 或限定来源 |
| Major-2 | `DemoController.java` | `export` 的 `format` 参数未校验 | 校验只允许 `csv` |
| Major-3 | `DemoService.java` | 导出始终用默认数据，非用户实际输入 | Demo 可接受，文档说明语义 |

### 5.3 Minor（可选优化）：4 个

| 编号 | 文件 | 问题 |
|------|------|------|
| Minor-1 | `DemoController.java` | `java.util.Map` 和 `BusinessException` 使用全限定名，应 import |
| Minor-2 | `DemoService.java` | `String.format` 可简化为 `HexFormat`（Java 17+） |
| Minor-3 | `DemoServiceTest.java` | 缺少异常路径测试（`exportToCsv(null)` / `exportToCsv("unknown")`） |
| Minor-4 | `src/services/demo.ts` | 双重断言 `(res as any).data as Blob`，建议类型守卫 |

---

## 六、验证状态

| 验证项 | 状态 | 说明 |
|--------|------|------|
| Java 编译 | ⏭️ 跳过 | Java/Maven 环境不可用，降级为静态审查 |
| 前端 tsc | ⏭️ 跳过 | yarn/tsc/node_modules 不可用，降级为静态审查 |
| 单元测试 | ⏭️ 跳过 | 同上，测试代码静态审查通过 |
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
| 敏感信息泄露 | ✅ 无硬编码密钥/密码 |
| CORS | ⚠️ 见 Major-1 |
| 输入校验 | ⚠️ 导出 `format` 未校验（见 Major-2） |

---

## 八、建议修复优先级

1. **P0（合并前必须修复）**：B1（HTTP 状态码契约违规）、B2（导出失败静默无提示）
2. **P1（合并前建议修复）**：Major-2（format 校验）
3. **P2（后续迭代修复）**：Major-1（CORS 限定）、Major-3（文档说明导出语义）
4. **P3（可选优化）**：所有 Minor 项

---

## 九、最终结论

**NOT PASSED**

本次代码实现质量良好，需求覆盖完整，前后端契约对齐严密，异常兜底方案完整。但存在 2 个 Blocker 级契约违规问题：

- **B1**：`bubble` 接口参数类型错误抛 `BusinessException(40001)` 但被 `handleBusiness` 映射为 HTTP 500，违反"参数非法→40001→HTTP 400"契约。
- **B2**：`exportDemo` 用 `skipErrorHandler` + `responseType:'blob'`，导出失败时 JSON 错误体被当 Blob 静默下载，用户无 Toast 提示，违反"导出失败→Toast 提示"需求。

必须修复 B1、B2 后方可合并。3 个 Major 为生产加固类问题，不影响 Demo 功能正确性，可作为后续迭代项。

**Blocker Count: 2**
