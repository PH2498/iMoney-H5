# Design: add-employee-dashboard

## Context & Tech Stack（来自仓库实测）

iMoney-H5 技术栈（读 `package.json` 实测）：

- 框架：`@umijs/max` ^4.6.68（Umi Max，含路由/请求/mock 插件能力）。
- UI：`antd-mobile` ^5.42.3 + `ant-design-mobile-chart` ^1.2.2 + `@ant-design/icons` ^6.3.1。
- 动效：`framer-motion` ^12.42.0，页面统一用 `src/components/base/MotionWrap` 包裹。
- 状态：`src/models/global.ts` 为自定义 hook（`useGlobal`）模式，**未引入 dva/redux**，model 即自定义 hook。
- 现有页面统一结构：`<MotionWrap variant="fade"><div className={styles.page}>...</div></MotionWrap><TabBar />`。
- 常量集中在 `src/constants/index.ts`（如 `TAB_BARS`）。
- 无后端请求库显式声明；Umi Max 内置 `request`，MVP 优先用 `mock/` + `localStorage`。

跨仓现状：

- iMoney（Taro 小程序）：仅 `src/pages/index` 脚手架空壳，无人员业务。本提案不落代码，仅约定共享 API 契约。
- PH2498.github.io / ArmBasic：无关，不涉及。

## 入口方案

| 方案 | 路径 | Tab | 说明 |
| --- | --- | --- | --- |
| A（推荐） | `/employee` | 新增 Tab「人员」`UserOutline` | 直达，符合"人员看板"独立模块定位 |
| B | `/mine/employee` | 不新增 Tab，Mine 内入口 | 不动底部布局，但层级深 |

推荐 A。若底部 5 Tab 影响布局，启用 antd-mobile `TabBar` 的 `scroll` 模式或将「AI助手」降级为非 Tab 入口。本提案 specs 以 A 为基准，B 为备选。

## 数据模型

### Employee（员工）

```ts
interface Employee {
  id: string;            // 内部主键（uuid 或时间戳）
  name: string;          // 姓名（必填）
  employeeNo: string;    // 工号（必填，唯一）
  department?: string;   // 部门
  position?: string;     // 职位
  phone?: string;        // 手机号
  entryDate?: string;    // 入职日期 YYYY-MM-DD
  status: 'active' | 'inactive' | 'deleted'; // 在职/离职/已删除(软删)
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### BudgetItem（成本预算项）

```ts
interface BudgetItem {
  id: string;
  employeeId: string;    // 关联员工
  category: string;      // 成本类别（如 薪资/补贴/培训）
  amount: number;        // 金额（元，>=0，保留两位小数）
  period: string;        // 预算周期 YYYY-MM
  remark?: string;
  whitelisted: boolean;  // 是否在成本白名单内（由 budget whitelist 控制）
  createdAt: string;
  updatedAt: string;
}
```

### BudgetWhitelist（成本预算白名单）

```ts
interface BudgetWhitelistEntry {
  employeeId: string;
  enabled: boolean;      // 是否允许该员工录入成本
  maxAmount?: number;    // 可选：该员工成本上限
  updatedAt: string;
}
```

白名单语义（假设①）：未加入白名单或 `enabled=false` 的员工，在录入成本预算时被拦截并提示。

## 架构分层（遵循现有 hook model 模式）

```
src/
  pages/Employee/
    index.tsx            # 看板列表（搜索+卡片列表+分页）
    index.less
    Detail/index.tsx     # 详情/编辑表单
    Detail/index.less
    Import/index.tsx     # 批量导入弹层
    Import/index.less
  models/
    employee.ts          # useEmployee(): list/search/crud/pagination
    budget.ts            # useBudget(): budgetItems/whitelist/validate
  constants/employee.ts  # 字段枚举/白名单状态/导入模板列
  components/base/
    EmployeeCard/
    EmployeeForm/
    BudgetWhitelistSwitch/
  mock/employee.ts       # CRUD + import mock
```

### Model 层接口（repository 抽象，便于切换真实后端）

```ts
// src/models/employee.ts
export interface EmployeeRepository {
  list(query: EmployeeQuery): Promise<{ items: Employee[]; total: number }>;
  get(id: string): Promise<Employee | null>;
  create(dto: Omit<Employee, 'id'|'createdAt'|'updatedAt'|'status'|'deletedAt'>): Promise<Employee>;
  update(id: string, dto: Partial<Employee>): Promise<Employee>;
  remove(id: string, soft?: boolean): Promise<void>;
  batchImport(rows: EmployeeImportRow[]): Promise<{ success: number; failed: { row: number; reason: string }[] }>;
}
```

实现分两个：`LocalEmployeeRepository`（localStorage）与未来 `RemoteEmployeeRepository`（Umi `request` 调真实 API）。调用方只依赖接口。

## 批量导入设计

- 格式：CSV（UTF-8 with BOM），首行为中文字段名（兼容管理后台常见导出）。
- 模板列（顺序固定）：`工号,姓名,部门,职位,手机号,入职日期`。
- 校验规则：
  - 工号必填且唯一（与已存在数据比对，重复行计入 failed）。
  - 姓名必填。
  - 手机号格式（11 位数字，可空）。
  - 入职日期格式 YYYY-MM-DD（可空）。
- 结果：返回 `{ success, failed: [{row, reason}] }`，前端展示成功数与失败明细列表。
- 模板下载：前端用静态 Blob 生成 CSV 模板，无需后端。

## 跨仓 API 契约（向后兼容）

为 iMoney 小程序未来复用预留契约。**仅新增，不修改既有**：

```
GET    /api/employees?keyword=&status=&page=&pageSize=
GET    /api/employees/:id
POST   /api/employees
PUT    /api/employees/:id
DELETE /api/employees/:id
POST   /api/employees/batch-import   (multipart file 或 JSON rows)
GET    /api/budgets?employeeId=&period=
POST   /api/budgets
PUT    /api/budgets/:id
DELETE /api/budgets/:id
GET    /api/budget-whitelist
PUT    /api/budget-whitelist/:employeeId   { enabled, maxAmount? }
```

MVP 阶段以上由 `mock/employee.ts` 实现；切换真实后端时仅需替换 repository 实现，调用方零改动。

## 关键依赖与兼容

- 复用 `antd-mobile` 的 `List`、`Form`、`Dialog`、`Toast`、`PullToRefresh`、` InfiniteScroll`、`Stepper`、`Switch`。
- 复用 `MotionWrap` 与 `TabBar` 既有组件，保持视觉一致。
- CSV 解析：MVP 用轻量手写 parser（不引入 papaparse 以减少依赖），或视情况评估引入。
- 不引入额外路由库，沿用 Umi Max 约定式路由 + `.umirc.ts` 显式路由。

## 不确定项

见 proposal.md「Open Questions / Assumptions」。design 层面待确认：入口方案 A/B、白名单语义、CSV vs Excel。
