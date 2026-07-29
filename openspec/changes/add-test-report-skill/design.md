# Design: add-test-report-skill

> 变更涉及架构、数据模型、安全过滤与跨框架解析抽象，故撰写本设计文档。

## 总体架构

Skill 采用三段式流水线，顺序固定：

```
[1 框架检测/模式判定] → [2 结果收集] → [3 报告生成]
```

### 1. 框架检测与模式判定
- **执行模式**：先检测项目使用的测试框架与运行命令，优先级：
  a. 用户显式指定命令（`test_command`）；
  b. `package.json scripts.test`、`pyproject.toml`、`Cargo.toml` 等项目配置；
  c. 框架特征文件推断（`jest.config.*`、`vitest.config.*`、`pytest.ini`）。
- **解析模式**：跳过执行，直接读取用户指定的 `result_file`（满足 US4 / FR1.3）。
- 模式判定失败（执行模式下无法运行命令）须给出明确诊断，不得生成空报告冒充成功（FR1.4）。

### 2. 结果收集
- 执行模式下：运行测试命令并捕获 reporter 输出（JSON / JUnit XML）。
- 解析模式下：读取指定结果文件。
- 结果文件交由对应的**插件式解析器**归一化为内部统一模型。

### 3. 报告生成
- 将统一模型渲染为 Markdown（默认）/ HTML（P1）/ JSON（伴随产物，P1）。
- 落盘到 `reports/test-report-<YYYYMMDD-HHmmss>.md`，允许 `output_path` 覆盖。
- 生成后向用户返回报告路径 + 结果摘要 + 失败时 1~3 条关键失败原因（FR3.3）。

## 数据模型（统一结果模型）

所有解析器输出归一化为以下结构，缺失字段标注 `"未获取"`（NFR2）：

```
TestRunResult:
  meta:
    project_name: string
    generated_at: string         # 生成时间
    command: string             # 执行命令
    framework: string           # 框架/版本
    environment: string         # 执行环境摘要
  summary:
    total: int
    passed: int
    failed: int
    skipped: int
    pass_rate: float            # 百分比
    duration_ms: int
    overall_status: enum(✅, ❌)
  failures: FailureItem[]       # 有失败时必选
  suites: TestSuite[]           # 用例明细，按文件分组
  coverage: CoverageData | null # 若可获取
  appendix:
    source_file: string         # 原始结果文件路径
    tool_version: string        # 生成工具版本

FailureItem:
  name: string                  # 用例名
  file: string                  # 所属文件
  error_message: string         # 错误信息
  stack_key_lines: string[]     # 堆栈关键行（截断至可读长度）

TestSuite:
  file: string
  cases: TestCase[]
  duration_ms: int

TestCase:
  name: string
  status: enum(passed, failed, skipped)
  duration_ms: int

CoverageData:
  statements_pct: float | "未获取"
  branches_pct: float | "未获取"
  functions_pct: float | "未获取"
  lines_pct: float | "未获取"
  below_threshold_files: string[]   # 低于阈值的文件清单
```

## 解析器插件式结构（NFR5）

- 定义统一解析器接口：`parse(rawResult) -> TestRunResult`。
- P0 实现 3 个解析器：
  - `JestJsonParser`：解析 Jest `json` reporter 输出。
  - `VitestJsonParser`：解析 Vitest `json` reporter 输出。
  - `JUnitXmlParser`：解析 JUnit XML（跨语言兜底）。
- P1 实现 `PytestParser`。
- 解析器注册表按框架特征文件 / 文件扩展名 / 内容特征路由。
- 新增框架仅需实现接口并注册，不影响既有解析器。

## 安全（NFR3）

- 报告中不得泄露环境变量、密钥类内容。
- 错误堆栈须过滤敏感路径外的凭据信息：对堆栈行做敏感模式匹配（如 `password=`、`token=`、`AKIA*` 等），命中则替换为 `***`。
- 报告头"执行环境摘要"仅包含框架/版本、Node/Python 版本、OS 类型，不包含环境变量值。

## 性能（NFR1）

- 结果解析与报告生成（不含测试执行本身）应在 5 秒内完成（1000 用例规模）。
- 用例明细默认展示全部，超过 200 条时截断并注明（FR2.4）。

## 幂等性（NFR4）

- 同一结果文件多次生成报告，内容一致（`generated_at` 时间戳字段除外）。
- 解析与渲染为纯函数，不写回原始结果文件。
