# Specification: add-test-report-skill

## FR1: 测试执行与结果收集

### Requirement: 框架与命令自动识别

Skill 须自动识别项目使用的测试框架与运行命令，识别优先级为：用户显式指定 > 项目配置（package.json scripts.test / pyproject.toml / Cargo.toml）> 框架特征文件推断（jest.config.* / vitest.config.* / pytest.ini）。

#### Scenario: 用户显式指定测试命令
- **Given** 用户在触发指令中显式提供 `test_command`（如 `npm test -- --json`）
- **When** Skill 进入执行模式
- **Then** Skill 使用用户指定命令运行测试，不做额外推断

#### Scenario: 从 package.json 自动检测
- **Given** 项目存在 `package.json` 且 `scripts.test` 非空，且用户未指定 `test_command`
- **When** Skill 进入执行模式
- **Then** Skill 读取 `scripts.test` 作为测试命令运行

#### Scenario: 无法识别框架且无显式命令
- **Given** 项目无任何测试框架配置文件，`package.json` 也无 `scripts.test`，用户未指定 `test_command`
- **When** Skill 进入执行模式
- **Then** Skill 返回明确诊断信息说明无法自动检测测试命令，不生成报告

### Requirement: P0 框架与结果格式支持

首期支持以下框架 / 结果格式（P0）：
- JavaScript/TypeScript：Jest、Vitest（JSON reporter）；
- Python：pytest（JUnit XML / JSON report）；
- 通用：JUnit XML（跨语言兜底）。

#### Scenario: 解析 Jest JSON 结果
- **Given** 存在 Jest `json` reporter 输出文件
- **When** Skill 使用 JestJsonParser 解析
- **Then** 提取用例总数、通过/失败/跳过数、各用例耗时、失败用例错误信息与堆栈，归一化为统一结果模型

#### Scenario: 解析 JUnit XML 兜底格式
- **Given** 存在 JUnit XML 格式结果文件（来自任意框架）
- **When** Skill 使用 JUnitXmlParser 解析
- **Then** 正确提取 testsuite/testcase 节点数据，归一化为统一结果模型

### Requirement: 执行模式与解析模式

支持两种工作模式：
- 执行模式：Skill 触发测试运行并收集结果；
- 解析模式：跳过执行，直接解析用户指定的已有结果文件（满足 US4）。

#### Scenario: 执行模式完整流程
- **Given** 项目已配置测试框架，用户触发"生成测试报告"且未指定 `result_file`
- **When** Skill 进入执行模式
- **Then** 运行测试命令 → 收集 reporter 输出 → 解析 → 生成报告，最终返回报告路径与摘要

#### Scenario: 解析模式跳过执行
- **Given** 用户提供已有结果文件路径（如 `junit.xml`）并指定解析模式
- **When** Skill 进入解析模式
- **Then** 跳过测试执行，直接解析该文件生成报告

### Requirement: 测试执行失败诊断

测试执行失败（非用例失败，而是命令无法运行）时，须给出明确诊断信息，不得生成空报告冒充成功。

#### Scenario: 测试命令无法运行
- **Given** 测试命令因依赖缺失、配置错误等原因无法运行（非用例失败）
- **When** Skill 尝试执行后捕获到命令级错误
- **Then** 返回明确诊断信息（含错误原因、退出码、建议），不生成报告文件

## FR2: 报告内容（标准结构）

### Requirement: 报告章节顺序固定

生成的报告必须包含以下章节，顺序固定：
1. 报告头：项目名、生成时间、执行命令、框架/版本、执行环境摘要；
2. 结果摘要：用例总数、通过/失败/跳过数、通过率、总耗时；整体结论用 ✅ / ❌ 标识；
3. 失败用例分析（有失败时必选）：每条含用例名、所属文件、错误信息、堆栈关键行（截断至可读长度）；
4. 用例明细：按测试文件分组，各用例耗时，默认展示全部，超过 200 条截断并注明；
5. 覆盖率（若可获取）：语句/分支/函数/行覆盖率总表，及低于阈值的文件清单；
6. 附录：原始结果文件路径、生成工具版本。

#### Scenario: 完整结构报告
- **Given** 一份有效的测试结果文件，包含通过、失败、跳过用例与覆盖率数据
- **When** Skill 生成 Markdown 报告
- **Then** 报告依次包含报告头、结果摘要（含 ✅/❌）、失败用例分析、用例明细、覆盖率、附录六个章节，顺序固定

#### Scenario: 用例明细截断
- **Given** 用例总数超过 200 条
- **When** 生成用例明细章节
- **Then** 截断展示并明确注明截断说明，其余章节正常呈现

#### Scenario: 无失败用例时省略失败分析章节标记
- **Given** 结果中无失败用例
- **When** 生成报告
- **Then** 失败用例分析章节标注"无失败用例"或省略该章节，其余章节正常；整体结论为 ✅

## FR3: 输出格式与落盘

### Requirement: 默认 Markdown，可扩展 HTML/JSON

- 默认输出 Markdown（.md）；P1 支持 HTML；JSON（结构化数据）作为可选伴随产物。
- 默认输出路径 `reports/test-report-<YYYYMMDD-HHmmss>.md`，允许用户指定路径。

#### Scenario: 默认 Markdown 落盘
- **Given** 用户触发报告生成且未指定 `output_format` 与 `output_path`
- **When** 报告生成完成
- **Then** 生成 `reports/test-report-<YYYYMMDD-HHmmss>.md` 文件并落盘

#### Scenario: 用户指定输出路径
- **Given** 用户指定 `output_path` 为自定义目录
- **When** 报告生成完成
- **Then** 报告落盘到用户指定目录，文件名仍含时间戳

### Requirement: 生成后返回摘要

生成后向用户返回：报告路径 + 结果摘要（通过率、失败数），失败时附最关键的 1~3 条失败原因。

#### Scenario: 返回路径与摘要
- **Given** 报告已生成落盘
- **When** Skill 完成生成
- **Then** 向用户返回报告绝对/相对路径、通过率、失败数；若存在失败，附 1~3 条最关键失败原因

## FR4: Skill 交互约定

### Requirement: 触发意图与可配置项

触发意图示例："生成测试报告"、"跑一下测试并出报告"、"把这个 junit.xml 转成测试报告"。
可配置项均有默认值，用户可覆盖。

#### Scenario: 默认配置生成
- **Given** 用户仅说"生成测试报告"，未提供任何配置项
- **When** Skill 执行
- **Then** 使用全部默认值（test_command=自动检测、output_format=markdown、output_path=reports/、coverage=auto、fail_threshold=无）完成生成

#### Scenario: 覆盖配置项
- **Given** 用户指定 `output_format=html` 与 `fail_threshold=80`
- **When** Skill 执行
- **Then** 使用用户指定值覆盖默认值，通过率低于 80% 时报告结论标记为不达标

### Requirement: HTML 输出与 JSON 伴随产物（P1）

P1 阶段支持 HTML 输出格式；JSON 作为结构化数据的可选伴随产物。HTML 报告须包含与 Markdown 相同的六大章节，顺序固定。

#### Scenario: HTML 输出格式
- **Given** 用户指定 `output_format=html`
- **When** Skill 生成报告
- **Then** 产出 `.html` 文件，包含与 Markdown 等价的六大章节，章节顺序固定，内容数据一致

#### Scenario: JSON 伴随产物
- **Given** 用户指定 `output_format=json` 或请求结构化数据伴随产物
- **When** Skill 生成报告
- **Then** 产出 `.json` 文件，内容为统一结果模型 `TestRunResult` 的完整序列化，可被程序化消费

#### Scenario: 多格式同时输出
- **Given** 用户同时指定 Markdown 与 JSON 伴随产物
- **When** Skill 生成报告
- **Then** 两份文件落盘，数据一致（时间戳字段除外），路径均向用户返回

## FR5: 覆盖率（P1）

### Requirement: 覆盖率章节呈现

覆盖率数据存在时呈现语句/分支/函数/行覆盖率总表，并列出低于阈值的文件清单；不存在时标注"未获取"，其余章节正常。

#### Scenario: 覆盖率数据存在
- **Given** 测试结果或 coverage 目录包含语句、分支、函数、行覆盖率数据
- **When** Skill 生成覆盖率章节
- **Then** 呈现四项覆盖率百分比总表，并列出低于阈值的文件清单

#### Scenario: 覆盖率数据不存在
- **Given** 测试结果无覆盖率数据，且 `coverage` 配置为 `auto` 或 `off`
- **When** Skill 生成报告
- **Then** 覆盖率章节标注"未获取"，其余章节正常呈现，不因覆盖率缺失而中断报告生成

#### Scenario: coverage 强制开启
- **Given** 用户指定 `coverage=on`，但项目未配置覆盖率收集
- **When** Skill 尝试收集覆盖率失败
- **Then** 覆盖率章节标注"未获取"并附简要说明（如"未检测到 coverage 输出"），不生成空数据冒充

## NFR1: 性能

### Requirement: 解析与报告生成性能

结果解析与报告生成（不含测试执行本身）应在 5 秒内完成（1000 用例规模）。

#### Scenario: 1000 用例规模性能
- **Given** 一份包含 1000 条用例的测试结果文件
- **When** Skill 执行解析与报告生成（不含测试执行）
- **Then** 总耗时不超过 5 秒

#### Scenario: 大规模用例明细截断性能
- **Given** 用例总数超过 200 条，触发用例明细截断逻辑
- **When** Skill 生成用例明细章节
- **Then** 截断展示并在截断说明中注明总数与展示条数，生成耗时不因规模而显著增长

## NFR2: 健壮性

### Requirement: 结果文件异常降级输出

结果文件格式异常、字段缺失时降级输出，缺失项标注"未获取"，不得崩溃或静默丢数据。

#### Scenario: 结果文件字段缺失
- **Given** 结果文件缺少部分字段（如缺少耗时或跳过数）
- **When** Skill 解析该文件
- **Then** 缺失字段标注"未获取"，已存在的字段正常呈现，不崩溃

#### Scenario: 结果文件格式损坏
- **Given** 结果文件格式损坏（如 JSON 语法错误或 XML 结构不合法）
- **When** Skill 尝试解析
- **Then** 返回明确错误说明（含文件路径与解析失败原因），不生成空报告冒充成功

#### Scenario: 部分用例数据不完整
- **Given** 部分用例缺少错误信息或堆栈
- **When** Skill 生成失败用例分析章节
- **Then** 该用例的错误信息或堆栈字段标注"未获取"，其余字段正常呈现，不影响其他用例展示

## NFR3: 安全

### Requirement: 敏感信息过滤

报告中不得泄露环境变量、密钥类内容；错误堆栈须过滤敏感路径外的凭据信息。

#### Scenario: 堆栈含敏感凭据
- **Given** 失败用例堆栈中包含 `password=`、`token=` 或 `AKIA*` 等敏感模式
- **When** Skill 生成失败用例分析章节
- **Then** 敏感内容替换为 `***`，堆栈结构保留可读

#### Scenario: 报告头不泄露环境变量
- **Given** 执行环境中存在环境变量
- **When** Skill 生成报告头"执行环境摘要"
- **Then** 仅包含框架版本、Node/Python 版本、OS 类型，不包含任何环境变量值

#### Scenario: 自定义命令含密钥参数
- **Given** 用户指定的 `test_command` 中含密钥类参数
- **When** Skill 将命令写入报告头
- **Then** 密钥类参数脱敏为 `***`，命令结构保留

## NFR4: 幂等性

### Requirement: 同一结果多次生成一致

同一结果文件多次生成报告，内容一致（时间戳字段除外）。

#### Scenario: 多次生成内容一致
- **Given** 同一份测试结果文件
- **When** Skill 连续两次生成报告
- **Then** 两次报告内容一致，仅 `generated_at` 时间戳字段不同

#### Scenario: 解析不写回原始文件
- **Given** Skill 解析一份结果文件
- **When** 解析与报告生成完成
- **Then** 原始结果文件内容未被修改

## NFR5: 可维护性

### Requirement: 插件式解析器结构

框架解析器采用插件式结构，新增框架支持不影响既有解析器。

#### Scenario: 新增框架解析器
- **Given** 既有 JestJsonParser、VitestJsonParser、JUnitXmlParser 已实现并注册
- **When** 新增一个框架解析器（如 Go test）
- **Then** 仅需实现统一 `parse()` 接口并注册，不修改任何既有解析器代码，既有解析器行为不变

#### Scenario: 解析器路由隔离
- **Given** 注册表中有多个解析器
- **When** 按框架特征文件路由到特定解析器
- **Then** 仅调用该解析器，不误触其他解析器，路由错误时返回明确诊断

## 验收标准场景（Acceptance Criteria）

### AC1: Jest/Vitest TS 项目完整报告

#### Scenario: AC1 验收
- **Given** 一个含 Jest 或 Vitest 的 TypeScript 项目
- **When** 执行"生成测试报告"指令
- **Then** 产出符合 FR2 结构的 Markdown 报告，摘要数据（用例数、通过率、失败数）与框架原始输出一致

### AC2: 失败用例分析完整性

#### Scenario: AC2 验收
- **Given** 测试结果中存在失败用例
- **When** 生成报告
- **Then** 失败用例分析章节包含每条失败用例的用例名、文件路径、错误信息

### AC3: 解析模式不触发执行

#### Scenario: AC3 验收
- **Given** 提供一份 JUnit XML 文件
- **When** 走解析模式生成报告
- **Then** 不触发任何测试执行即可产出报告

### AC4: 结果文件损坏明确报错

#### Scenario: AC4 验收
- **Given** 提供一份损坏的结果文件
- **When** Skill 尝试解析
- **Then** 返回明确错误说明而非空报告

### AC5: 覆盖率缺失标注未获取

#### Scenario: AC5 验收
- **Given** 测试结果无覆盖率数据
- **When** 生成报告
- **Then** 覆盖率章节标注"未获取"，其余章节正常呈现
