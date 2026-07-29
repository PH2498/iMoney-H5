# Tasks: add-test-report-skill

> 有序、可勾选的实现计划。测试置于其验证的代码附近，不在 propose 阶段勾选完成。

## 阶段 M1（P0）：Jest/Vitest JSON + JUnit XML 解析、Markdown 报告、执行/解析双模式

### T1. Skill 骨架与配置
- [ ] T1.1 创建 Skill 目录结构：`SKILL.md` + `scripts/` + `templates/`
- [ ] T1.2 在 `SKILL.md` 定义触发意图、可配置项及默认值（test_command/result_file/output_format/output_path/coverage/fail_threshold）
- [ ] T1.3 定义统一结果模型 TypeScript 类型（`TestRunResult` 及子结构），缺失字段标注 `"未获取"`

### T2. 解析器插件框架
- [ ] T2.1 定义解析器统一接口 `parse(rawResult): TestRunResult`
- [ ] T2.2 实现解析器注册表，按框架特征文件 / 文件扩展名 / 内容特征路由
- [ ] T2.3 为注册表编写路由单元测试（给定特征文件名，断言命中正确解析器）

### T3. P0 解析器实现
- [ ] T3.1 实现 `JestJsonParser`：解析 Jest `json` reporter 输出，提取 summary/failures/suites/coverage
  - [ ] T3.1.1 准备 Jest JSON 样本 fixtures
  - [ ] T3.1.2 单元测试：断言用例数、通过率、失败用例错误信息与堆栈截断正确
- [ ] T3.2 实现 `VitestJsonParser`：解析 Vitest `json` reporter 输出
  - [ ] T3.2.1 准备 Vitest JSON 样本 fixtures
  - [ ] T3.2.2 单元测试：断言归一化结果与 Jest 解析器一致（统一模型对齐）
- [ ] T3.3 实现 `JUnitXmlParser`：解析 JUnit XML 跨语言兜底格式
  - [ ] T3.3.1 准备 JUnit XML 样本 fixtures（含 testsuite/testcase/failure 节点）
  - [ ] T3.3.2 单元测试：断言跨框架结果均归一化为统一模型

### T4. 框架检测与模式判定
- [ ] T4.1 实现框架检测器：优先级 用户指定 > package.json scripts.test / pyproject / Cargo > 特征文件推断
- [ ] T4.2 实现执行模式与解析模式分支：无 `result_file` 走执行，有 `result_file` 走解析
- [ ] T4.3 实现执行失败诊断：命令级错误（非用例失败）返回明确诊断，不生成空报告（FR1.4）
  - [ ] T4.3.1 单元测试：模拟命令无法运行，断言返回诊断且无报告文件

### T5. Markdown 报告渲染
- [ ] T5.1 实现 Markdown 模板：报告头 / 结果摘要（✅/❌）/ 失败用例分析 / 用例明细（>200 截断）/ 覆盖率 / 附录，章节顺序固定（FR2）
- [ ] T5.2 实现失败用例堆栈关键行截断逻辑（截断至可读长度）
- [ ] T5.3 实现用例明细 >200 条截断并注明逻辑（FR2.4）
  - [ ] T5.3.1 单元测试：构造 250 条用例，断言截断且注明

### T6. 安全与幂等
- [ ] T6.1 实现敏感信息过滤：堆栈行匹配 `password=`/`token=`/`AKIA*` 等模式替换为 `***`（NFR3）
  - [ ] T6.1.1 单元测试：含敏感模式的堆栈断言被脱敏
- [ ] T6.2 验证幂等性：同一结果文件多次生成，内容一致（generated_at 除外）（NFR4）
- [ ] T6.3 验证报告头不泄露环境变量值，仅含框架版本/Node/Python/OS（NFR3）

### T7. 集成与落盘
- [ ] T7.1 实现默认落盘 `reports/test-report-<YYYYMMDD-HHmmss>.md`，支持 `output_path` 覆盖（FR3.2）
- [ ] T7.2 实现生成后返回报告路径 + 摘要（通过率、失败数）+ 失败时 1~3 条关键原因（FR3.3）
- [ ] T7.3 端到端测试（执行模式）：含 Jest 的 TS 项目触发"生成测试报告"，断言摘要数据与框架原始输出一致（AC1）
- [ ] T7.4 端到端测试（解析模式）：提供 JUnit XML 走解析模式，断言不触发执行即可出报告（AC3）

## 阶段 M2（P1）：pytest、覆盖率、fail_threshold

- [ ] T8.1 实现 `PytestParser`（JUnit XML / JSON report）
- [ ] T8.2 实现覆盖率章节：语句/分支/函数/行覆盖率总表 + 低于阈值文件清单
  - [ ] T8.2.1 单元测试：覆盖率存在时正确呈现；不存在时标注"未获取"且其余章节正常（AC5）
- [ ] T8.3 实现 `fail_threshold`：通过率低于阈值时结论标记不达标
- [ ] T8.4 端到端：失败用例报告含用例名、文件路径、错误信息（AC2）

## 阶段 M3（P1）：HTML 输出、JSON 伴随产物

- [ ] T9.1 实现 HTML 渲染模板
- [ ] T9.2 实现 JSON 结构化伴随产物输出

## 阶段 M4（P2，后续迭代）：历史趋势、更多框架

- [ ] T10.1 历史趋势对比分析（列为后续迭代候选）
- [ ] T10.2 新增 Go test / cargo test 解析器

## 验收对照

| AC | 对应任务 |
|----|---------|
| AC1 Jest/Vitest TS 项目产出符合结构 Markdown，摘要一致 | T7.3 |
| AC2 失败用例含用例名、文件路径、错误信息 | T8.4 / T5.1 |
| AC3 JUnit XML 解析模式不触发执行出报告 | T7.4 |
| AC4 结果文件损坏返回明确错误而非空报告 | T2.3 / T4.3（解析失败诊断） |
| AC5 覆盖率缺失标注"未获取"，其余正常 | T8.2.1 |
