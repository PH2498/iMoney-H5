# Proposal: add-employee-dashboard

## What

在 iMoney-H5 移动端后台新增「人员看板」模块：提供员工基本信息录入、增删改查（CRUD）、批量导入、成本预算记录及成本预算白名单管控能力。看板作为新的底部 Tab 入口（或 Mine 下的子页面入口），供管理者在移动端完成人员与成本管理。

## Why

当前 iMoney-H5 仅有 Home / Stats / AIAssistant / Mine 四个面向个人财务与统计的页面，缺少团队/员工维度的人员管理能力。业务方需要：

1. 在移动端随时录入并维护员工基本信息；
2. 按成本预算口径对员工成本进行白名单化管控，避免超预算/非预算人员录入成本；
3. 通过批量导入快速建立/更新人员档案，替代手工逐条录入。

引入本模块后，iMoney-H5 由「个人财务工具」扩展为「团队人员+成本管理」平台，并与 iMoney 小程序共享同一后端员工 API 契约（向后兼容，仅新增字段/接口）。

## Scope

### In Scope（本次提案覆盖）

- 新增页面 `src/pages/Employee/`（看板列表 + 详情/表单）。
- 新增模型 `src/models/employee.ts`：员工列表状态、CRUD 操作、分页、搜索过滤。
- 新增成本预算模型 `src/models/budget.ts`：预算项与白名单维护、白名单校验。
- 新增常量 `src/constants/employee.ts`：字段枚举、白名单状态、导入模板列定义。
- 新增基础组件 `src/components/base/`：员工卡片、表单字段组、批量导入弹层、成本预算白名单开关。
- 新增 Mock 数据 `mock/employee.ts`：模拟后端 CRUD 与导入接口（MVP 阶段无真实后端）。
- 在 `.umirc.ts` 路由与 `src/constants/index.ts` 的 `TAB_BARS` 中新增「人员」入口（见 design.md 的入口方案选项）。
- 数据持久化：MVP 使用浏览器 `localStorage`（封装在 model 层），保留后续切换至真实 API 的接口边界。

### Out of Scope（明确排除，防止范围蔓延）

- 不实现真实后端服务与数据库；MVP 以 Mock + localStorage 完成。
- 不改造 iMoney 小程序端的人员页面（iMoney 当前为脚手架空壳，仅预留 API 契约兼容性说明，不在本提案落代码）。
- 不实现复杂组织架构树/汇报关系/审批流。
- 不实现员工考勤、绩效、薪酬核算（仅记录成本预算，不做计算）。
- 不实现多角色 RBAC 权限体系（仅做成本预算白名单的简单开关，不做用户登录态/角色权限）。
- 不涉及 PH2498.github.io 与 ArmBasic 仓库。

## Affected Areas

- `src/pages/`：新增 `Employee/` 目录。
- `src/models/`：新增 `employee.ts`、`budget.ts`。
- `src/constants/index.ts`：可能新增人员相关常量与 Tab 项。
- `src/components/base/`：新增人员看板相关基础组件。
- `mock/`：新增 `employee.ts`。
- `.umirc.ts`：新增路由项（若采用独立路由方案）。
- 跨仓契约：与 iMoney 小程序约定的员工/预算后端 API 契约（见 design.md），向后兼容。

## Risk

| 风险 | 说明 | 缓解 |
| --- | --- | --- |
| 入口方案不确定 | 需求未明确「人员看板」是独立 Tab 还是 Mine 子页 | 在 design.md 给出两套方案及推荐项，标注为待确认假设；实现阶段按推荐方案落地 |
| 成本预算白名单语义模糊 | "白名单"可能指：①可录入成本的员工白名单 ②成本项白名单 ③导入白名单 | 本提案采用语义①（可管理成本的员工白名单），列为待确认；若为其他语义需调整 budget model |
| 无真实后端 | Mock+localStorage 与真实 API 行为差异（并发、分页、唯一性） | model 层抽象为 repository 接口，切换后端只改实现不改调用方 |
| 批量导入模板未定 | 列字段、格式（CSV/Excel）、校验规则未明确 | 设计默认模板（见 specs），并提供模板下载与校验错误清单 |
| Tab 数量增加影响布局 | 现有 4 个 Tab，加到 5 个可能影响移动端底部布局 | design.md 给出布局适配方案（滑动/折叠） |

## Rollout / Rollback

- Rollout：纯前端新增页面与组件，不触碰既有 Home/Stats/AIAssistant/Mine 逻辑；灰度可按路由开关控制显隐。
- Rollback：删除 `Employee/` 页面、`employee.ts`/`budget.ts` model、新增组件、mock 文件，还原 `.umirc.ts` 与 `constants/index.ts` 中新增项即可，无破坏性数据迁移。

## Open Questions / Assumptions

> 以下为需求澄清阶段识别的待确认项。本提案按假设推进，以便后续 `openspec-apply` 可执行；假设一旦被纠正，需同步更新 specs。

1. **入口位置**（假设：新增独立 Tab「人员」，路径 `/employee`）。备选：作为 Mine 下子页 `/mine/employee`。
2. **成本预算白名单语义**（假设：可录入成本的员工白名单，即未加入白名单的员工不允许记录成本）。备选：成本项白名单。
3. **导入格式**（假设：CSV，UTF-8 with BOM，支持中文字段名）。备选：Excel(.xlsx)。
4. **员工基本信息字段**（假设：见 specs 字段表）。待业务确认必填项。
5. **是否需要软删除**（假设：删除为软删除，保留 `deletedAt`）。
