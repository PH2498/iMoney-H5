# 需求澄清规格 v1.0

> 阶段：clarify（需求澄清）｜技能：brainstorming｜确认项均已按默认值填写

## 1. 需求概述
- R1 后端（Java）：三接口 helloworld / 哈希 / 冒泡排序
- R2 前端：新增 Demo 页面，三个 tab 分别展示三接口执行结果
- R3 导出：前端导出按钮 + 后台导出接口，支持导出各页面展示结果

## 2. 落点与技术栈
| 层 | 仓库 | 落点 | 技术栈 |
|----|------|------|--------|
| 前端 | iMoney-H5 | `src/pages/Demo/` | Umi Max + React + antd-mobile |
| 后端 | iMoney-H5 | `server/`（新建子工程） | Spring Boot 3 + Maven |

## 3. 接口契约（默认值已填）
| 接口 | 方法 | 路径 | 入参（默认值） | 返回 |
|------|------|------|----------------|------|
| HelloWorld | GET | `/api/v1/helloworld` | 无 | `{code:0,data:{message:"Hello, World!"}}` |
| 哈希 | GET | `/api/v1/hash?input=` | `input:String`（默认 `"hello"`） | `{code:0,data:{input,algorithm:"SHA-256",hash}}` |
| 冒泡 | GET | `/api/v1/bubble?arr=` | `arr:逗号分隔int`（默认 `[5,3,8,1,9,2,7]`） | `{code:0,data:{input,sorted,swaps}}` |
| 导出 | GET | `/api/v1/export?type=&format=csv` | `type:helloworld\|hash\|bubble\|all` | CSV 文件流 `Content-Disposition: attachment` |

## 4. 前端页面规格
- 路由 `/demo`（name "演示"），component `./Demo`，不侵入现有 Home/Stats/AIAssistant/Mine
- Tabs：`HelloWorld | 哈希 | 冒泡`，每 tab 调对应接口渲染结果
- 顶部导出按钮：导出当前 tab 结果；下拉可选"导出全部"
- `.umirc.ts` 增 `proxy`：`/api` → `http://localhost:8080`

## 5. 异常兜底方案（新增）
### 5.1 后端
- 全局异常处理器 `@RestControllerAdvice`（`GlobalExceptionHandler`）
- 统一响应 `ApiResult<T>`：`{code,message,data}`，`code=0` 成功
- 异常分级：
  - 参数非法（`IllegalArgumentException`/`MethodArgumentTypeMismatchException`）→ `code=40001`, HTTP 400
  - 业务异常 `BusinessException` → `code=50001`
  - 未知异常（`Exception`/`NullPointerException`）→ `code=50000`, HTTP 500，不泄漏堆栈
- 接口入参为空/缺失时用默认值兜底（不报错），体现容错

### 5.2 前端
- umi `request` 的 `errorConfig` 统一拦截：网络/超时/HTTP 非 2xx → `Toast` 提示 + `Empty` 占位，不白屏
- 导出失败 → `Toast` 提示，保留当前 tab 数据不丢

### 5.3 跨仓契约兜底
- 后端未启动时前端 `mock/` 兜底（新增三接口 mock），开发态可独立运行

## 6. 确认项默认值汇总
| 编号 | 项 | 默认值 |
|------|----|--------|
| D1 | Java 后端落点 | iMoney-H5 仓内 `server/` 子工程 |
| D2 | Java 框架 | Spring Boot 3 + Maven |
| D3 | 哈希算法 | SHA-256，默认 input `"hello"` |
| D4 | 冒泡默认数据 | `[5,3,8,1,9,2,7]` |
| D5 | HelloWorld 返回 | `message:"Hello, World!"` |
| D6 | tab↔接口映射 | Tab1→helloworld, Tab2→hash, Tab3→bubble |
| D7 | 导出格式 | CSV |
| D8 | "导出各页面"语义 | 当前 tab 导出 + `type=all` 合并导出 |
| D9 | 联调方式 | `.umirc.ts` proxy `/api`→`localhost:8080`，mock 兜底 |
| D10 | 前端路由 | `/demo` |
| D11 | tab 组件 | antd-mobile `Tabs` |

## 7. 下一步
进入「编码实现」阶段，按 R1(后端三接口)→R3(导出接口)→R2(前端 Demo 页面) 顺序产出，每步跑构建/启动验证。
