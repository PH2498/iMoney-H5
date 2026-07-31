# Tasks: add-employee-dashboard

> 实现阶段（openspec-apply）执行清单。本 propose 阶段不勾选任何完成项。按实现区域分组，测试就近放置。

## 常量与类型

- [ ] 新增 `src/constants/employee.ts`：导出 `EmployeeStatus`、`BudgetCategory` 枚举与导入模板列定义 `IMPORT_TEMPLATE_COLUMNS`。
- [ ] 新增 `src/types/employee.ts`（或并入 constants）：`Employee`、`BudgetItem`、`BudgetWhitelistEntry`、`EmployeeQuery`、`EmployeeImportRow` 类型，与 design.md 一致。

## Model 层（repository 抽象 + localStorage 实现）

- [ ] 新增 `src/models/employee.ts`：定义 `EmployeeRepository` 接口与 `useEmployee` hook（list/search/get/create/update/remove/batchImport），内部注入 `LocalEmployeeRepository`。
- [ ] 新增 `src/models/budget.ts`：定义 `BudgetRepository` 接口与 `useBudget` hook（items/whitelist/validate/create/update/remove），实现白名单校验 `canRecordCost(employeeId)`。
- [ ] 单元测试：`src/models/__tests__/employee.test.ts` 覆盖 CRUD、软删除、唯一工号、分页。
- [ ] 单元测试：`src/models/__tests__/budget.test.ts` 覆盖白名单拦截、金额非负、周期格式。

## Mock 层

- [ ] 新增 `mock/employee.ts`：实现 design.md 列出的 REST 端点 mock（list/get/create/update/delete/batch-import/budget/whitelist），数据持久于内存或 localStorage。

## 基础组件

- [ ] 新增 `src/components/base/EmployeeCard/`：员工卡片（姓名、工号、部门、状态徽标、成本白名单标记）。
- [ ] 新增 `src/components/base/EmployeeForm/`：基于 antd-mobile `Form` 的员工表单，校验必填项与工号唯一。
- [ ] 新增 `src/components/base/BudgetWhitelistSwitch/`：白名单开关 + 可选金额上限输入。
- [ ] 单元测试：EmployeeForm 校验逻辑（工号重复、手机号格式、入职日期格式）。

## 页面

- [ ] 新增 `src/pages/Employee/index.tsx`：看板列表（搜索栏 + 卡片列表 + `InfiniteScroll` 分页 + 新增/导入入口），用 `MotionWrap` + `TabBar` 包裹。
- [ ] 新增 `src/pages/Employee/index.less`。
- [ ] 新增 `src/pages/Employee/Detail/index.tsx`：详情/编辑表单页（路由 `/employee/detail/:id?`，id 为空走新增）。
- [ ] 新增 `src/pages/Employee/Detail/index.less`。
- [ ] 新增 `src/pages/Employee/Import/index.tsx`：批量导入弹层（模板下载 + 文件选择 + 解析校验 + 结果明细）。
- [ ] 新增 `src/pages/Employee/Import/index.less`。
- [ ] 页面级测试：列表搜索、分页、新增、编辑、删除（软删）、导入成功/失败结果展示。

## 成本预算与白名单

- [ ] 在员工详情/编辑内集成成本预算录入区：选择类别、金额、周期，提交前调用 `useBudget.canRecordCost` 校验白名单。
- [ ] 白名单管理 UI：在员工卡片或详情提供 `BudgetWhitelistSwitch`，调用 `PUT /api/budget-whitelist/:employeeId`。
- [ ] 测试：非白名单员工提交成本被拦截并提示。

## 入口与路由

- [ ] 更新 `.umirc.ts`：新增 `routes`（/employee、/employee/detail/:id?）。
- [ ] 更新 `src/constants/index.ts` 的 `TAB_BARS`：新增「人员」`{ key: 'employee', title: '人员', icon: 'UserOutline', path: '/employee' }`（方案 A）。
- [ ] 更新 `src/models/global.ts` 的 `syncTabByPath` 兼容 `/employee`（已用 startsWith，自动兼容，需验证）。
- [ ] 验证 5 Tab 布局，必要时启用滚动/折叠适配。

## CSV 解析与模板

- [ ] 实现轻量 CSV parser（支持引号转义、UTF-8 BOM），或评估引入 papaparse。
- [ ] 实现模板下载（Blob 生成 CSV）。
- [ ] 测试：含 BOM、含逗号转义、空行、重复工号的解析与校验。

## 验收与构建

- [ ] `yarn build` 通过。
- [ ] `yarn format` 通过（prettier）。
- [ ] 手动冒烟：新增→列表→编辑→删除→批量导入→成本录入（白名单拦截）全流程。
