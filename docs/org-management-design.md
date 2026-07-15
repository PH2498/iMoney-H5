# 组织架构与人员管理系统 — 需求澄清与设计文档

> 生成时间：2026-07-15  
> 阶段：clarify（需求澄清）  
> 技能：brainstorming  
> 项目：iMoney (UmiJS Max H5 移动端)

---

## 一、项目上下文

| 维度 | 现状 |
|------|------|
| 框架 | UmiJS Max (React 18 + TypeScript) |
| 平台 | H5 移动端 (viewportWidth=375, postcss-px-to-viewport) |
| UI 组件库 | antd-mobile (推断，基于 @ant-design/icons 依赖) |
| 状态管理 | UmiJS Max built-in hooks model (`src/models/`) |
| 请求层 | @umijs/max request 插件 |
| Mock | `mock/` 目录 |
| API 响应格式 | `{ success: boolean, data: T, errorCode: number, msg?: string }` |
| 路由 | `.umirc.ts` 配置式路由 |

---

## 二、移动端适配决策

### 2.1 布局方案（自主裁定）

原始需求描述"左侧部门树 + 右侧人员列表"为 PC 端布局，375px 屏幕无法承载。

**采用方案**：顶部部门筛选器 + 下方人员分页列表，部门管理独立入口。

```
┌──────────────────────────┐
│  [部门选择器: 全部 ▼]    │  ← 级联下拉
│  [在职] [离职]           │  ← 状态筛选 Tab
├──────────────────────────┤
│  ┌─────────────────────┐ │
│  │ 张三  10086  前端组  │ │  ← 人员卡片列表
│  │ 在职               │ │
│  ├─────────────────────┤ │
│  │ 李四  10087  后端组  │ │
│  │ 在职               │ │
│  └─────────────────────┘ │
│       [加载更多]          │  ← 分页
└──────────────────────────┘
```

### 2.2 拖拽交互替代

PC 端拖拽在移动端体验差，**采用"长按 → 操作菜单 → 选择目标部门"**：

```
部门管理页:
┌──────────────────────────┐
│  研发部              ›   │
│    前端组   ⠇ 长按菜单   │
│                       ┌──┴──────────────┐
│                       │ 移动到此部门      │
│                       │ ├ 研发二部        │
│                       │ ├ 产品部          │
│                       │ └ 设计部          │
│                       │ 取消              │
│                       └─────────────────┘
```

---

## 三、数据模型

```
┌─────────────────────┐       ┌──────────────────────────┐
│     Department      │       │        Employee          │
├─────────────────────┤       ├──────────────────────────┤
│ id          int PK  │──┐    │ id            int PK     │
│ parent_id   int?    │  │    │ name          string     │
│ name        string  │  │    │ employee_no   string UK  │
│ path        string  │  │    │ phone         string UK  │
│ sort_order  int     │  │    │ dept_id       int FK ────┤
│ status      enum    │  │    │ position      string     │
│ created_at  datetime│  │    │ status   enum(在职/离职) │
│ updated_at  datetime│  │    │ version       int        │
└─────────────────────┘  │    │ resign_date   date?      │
                         │    │ created_at    datetime   │
┌─────────────────────┐  │    │ updated_at    datetime   │
│  TransferRecord     │  │    └──────────────────────────┘
├─────────────────────┤  │
│ id          int PK  │  │
│ employee_id int FK ─┼──┘
│ from_dept_id int    │
│ to_dept_id   int    │
│ from_position str   │
│ to_position  str    │
│ reason       string │
│ operator_id  int    │
│ created_at   datetime│
└─────────────────────┘
```

### 字段说明

| 表 | 字段 | 说明 |
|----|------|------|
| Department | `path` | 物化路径，如 `1-2-5`，用于加速子树查询和循环引用检测 |
| Department | `parent_id` | 可为 NULL（根节点），自引用外键 |
| Employee | `employee_no` | 工号，全局唯一索引 |
| Employee | `phone` | 手机号，全局唯一索引 |
| Employee | `status` | `active`(在职) / `resigned`(离职)，逻辑删除 |
| Employee | `version` | 乐观锁版本号，并发控制 |
| TransferRecord | `from_dept_id` / `to_dept_id` | 调动前后部门快照 |
| TransferRecord | `from_position` / `to_position` | 调动前后职位快照 |

---

## 四、核心校验规则

| 编号 | 规则 | 触发场景 | 校验逻辑 | 错误码 |
|------|------|---------|---------|--------|
| R1 | 循环引用检测 | 部门移动 | `newParentId` 不能等于自身 id，且 `newParentId` 的 `path` 不能以 `{self.path}-` 为前缀 | 40001 |
| R2 | 部门非空保护 | 删除部门 | `SELECT COUNT(*) FROM employee WHERE dept_id = ? AND status = 'active'` > 0 时拒绝 | 40002 |
| R3 | 工号唯一性 | 新增/编辑 | 全局唯一（排除 `status = 'resigned'` 的记录） | 40003 |
| R4 | 手机号唯一性 | 新增/编辑 | 全局唯一（排除 `status = 'resigned'` 的记录） | 40004 |
| R5 | 部门合法性 | 新增/调动 | `dept_id` 必须存在于 `department` 表且 `status = 'active'` | 40005 |
| R6 | 乐观锁冲突 | 并发写操作 | 请求 `version` 与数据库 `version` 不一致时拒绝 | 40900 |

---

## 五、组件树

```
src/pages/OrgManagement/
├── index.tsx                    # 入口：Tab 切换 (部门管理 / 人员管理)
├── index.less
├── DepartmentTree/
│   ├── index.tsx                # 部门树形列表 (移动端适配，懒加载)
│   ├── index.less
│   └── MoveMenu.tsx             # 部门移动操作菜单（长按弹出）
├── EmployeeList/
│   ├── index.tsx                # 人员分页列表 + 部门筛选 + 状态筛选
│   ├── index.less
│   └── EmployeeCard.tsx         # 人员卡片组件
├── EmployeeDetail/
│   ├── index.tsx                # 人员详情页（含调动/离职入口）
│   └── index.less
├── EmployeeForm/
│   ├── index.tsx                # 新增/编辑表单
│   ├── index.less
│   └── useUniqueCheck.ts        # 工号/手机号唯一性实时校验 hook
├── TransferDialog/
│   └── index.tsx                # 调动确认弹窗
├── ResignDialog/
│   └── index.tsx                # 离职确认弹窗
├── services/
│   └── api.ts                   # API 请求封装（基于 @umijs/max request）
└── types.ts                     # TypeScript 类型定义
```

---

## 六、状态管理

```typescript
// src/models/org.ts — UmiJS Max hooks model

interface OrgState {
  // 部门
  departmentTree: DepartmentNode[];
  expandedDeptIds: number[];
  selectedDeptId: number | null;

  // 员工列表
  employeeList: Employee[];
  pagination: { page: number; size: number; total: number };
  statusFilter: 'all' | 'active' | 'resigned';

  // 缓存
  uniquenessCache: Record<string, boolean>;  // key: "employeeNo:10086"
}
```

状态通过 `useModel('org')` 在任意组件中访问。

---

## 七、API 协议

### 通用响应格式

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  errorCode: number;
  msg?: string;
}
```

### 接口清单

| 接口 | 方法 | 路径 | 请求 | 响应 |
|------|------|------|------|------|
| 部门树 | GET | `/api/departments/tree` | — | `ApiResponse<DepartmentNode[]>` |
| 懒加载子部门 | GET | `/api/departments/{id}/children` | — | `ApiResponse<DepartmentNode[]>` |
| 部门移动 | PUT | `/api/departments/{id}/move` | `{ newParentId }` | `ApiResponse<null>` |
| 删除部门 | DELETE | `/api/departments/{id}` | — | `ApiResponse<null>` |
| 唯一性校验 | GET | `/api/employees/check` | `?field=employeeNo&value=10086` | `ApiResponse<{ isExist: boolean }>` |
| 新增员工 | POST | `/api/employees` | `{ name, employeeNo, deptId, phone, position }` | `ApiResponse<Employee>` |
| 员工列表 | GET | `/api/employees` | `?deptId=&status=&page=&size=` | `ApiResponse<{ list: Employee[], total: number }>` |
| 员工详情 | GET | `/api/employees/{id}` | — | `ApiResponse<Employee>` |
| 人员调动 | POST | `/api/employees/{id}/transfer` | `{ newDeptId, newPosition, reason, version }` | `ApiResponse<null>` |
| 员工离职 | PUT | `/api/employees/{id}/resign` | `{ resignDate, version }` | `ApiResponse<null>` |

---

## 八、路由配置

```typescript
// .umirc.ts 新增路由
{
  name: '组织架构',
  path: '/org',
  component: './OrgManagement',
  // 可选：底部 Tab 可见
  // hideInMenu: false,
}
```

---

## 九、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 移动端树形交互体验差 | 用户操作困难 | 级联选择器 + 独立部门管理页，避免复杂树操作 |
| 大数据量部门树渲染 | 页面卡顿 | 懒加载子节点，仅展开时请求 |
| 并发冲突 | 数据丢失 | 乐观锁 + 明确提示"请刷新重试"，自动重新加载 |
| 离职员工数据遗漏 | 历史查询不完整 | 所有查询默认排除离职员工，需显式传 `status=resigned` |
| API 响应格式不一致 | 前后端对接错误 | 统一为项目现有 `{ success, data, errorCode }` 格式 |

---

## 十、待确认项（已自主裁定）

以下为需求中未明确但已根据最佳实践作出的决策，若需调整请在后续阶段提出。

| 事项 | 裁定结果 | 理由 |
|------|---------|------|
| 布局方案 | 顶部筛选 + 列表，部门管理独立页 | 移动端 375px 无法承载左右分栏 |
| 拖拽替代 | 长按菜单选择目标部门 | 移动端无 hover 态，拖拽误触率高 |
| API 响应格式 | 沿用项目现有 `{ success, data, errorCode }` | 避免协议分裂，保持项目一致性 |
| 权限控制 | 前端仅做 UI 级权限控制，后端做数据级权限 | 前端权限不可信，安全由后端保障 |
| 级联审批流更新 | 前端仅触发调动，级联逻辑由后端处理 | 前端不感知审批流细节 |
| 分页默认值 | `page=1, size=20` | 移动端标准分页大小 |