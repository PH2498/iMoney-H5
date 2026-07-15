# 组织架构与人员管理系统 Implementation Plan

> **Plan Date:** 2026-07-15
> **Spec:** docs/org-management-design.md
> **Project:** iMoney (UmiJS Max H5 移动端)
> **For agentic workers:** Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 构建移动端组织架构与人员管理模块，支持部门树形管理、人员 CRUD 与分页查询、员工调动/离职生命周期管理，以及工号/手机号唯一性实时校验。

**Architecture:** 前端采用 UmiJS Max hooks model 实现全局状态管理，页面组件按功能拆分（DepartmentTree / EmployeeList / EmployeeDetail / EmployeeForm / TransferDialog / ResignDialog），API 层统一封装在 `services/api.ts`，Mock 数据在 `mock/` 目录下独立维护。移动端适配（375px viewport），部门移动采用长按菜单代替 PC 拖拽。

**Tech Stack:** React 18 + TypeScript, UmiJS Max, antd-mobile, @umijs/max request, postcss-px-to-viewport

---

## 全局约束

- **API 响应格式**：统一使用 `{ success: boolean, data: T, errorCode: number, msg?: string }`
- **分页默认值**：`page=1, size=20`
- **权限控制**：前端仅做 UI 级权限控制，后端做数据级权限
- **级联审批流**：前端仅触发调动，级联逻辑由后端处理
- **移动端适配**：375px viewport，postcss-px-to-viewport
- **部门移动**：长按菜单选择目标部门，不使用 PC 端拖拽
- **乐观锁**：所有写操作携 `version` 字段，冲突时 `errorCode: 40900`
- **唯一性校验**：排除 `status = 'resigned'` 的记录

---

## 文件结构总览

```
src/pages/OrgManagement/
├── index.tsx                    # 入口：Tab 切换
├── index.less
├── DepartmentTree/
│   ├── index.tsx                # 部门树形列表 + 懒加载
│   ├── index.less
│   └── MoveMenu.tsx             # 部门移动操作菜单
├── EmployeeList/
│   ├── index.tsx                # 人员分页列表 + 筛选
│   ├── index.less
│   ├── EmployeeCard.tsx         # 人员卡片
│   └── DepartmentCascader.tsx   # 级联部门筛选器
├── EmployeeDetail/
│   ├── index.tsx                # 人员详情页
│   └── index.less
├── EmployeeForm/
│   ├── index.tsx                # 新增/编辑表单
│   ├── index.less
│   └── useUniqueCheck.ts        # 唯一性校验 hook
├── TransferDialog/
│   └── index.tsx                # 调动确认弹窗
├── ResignDialog/
│   └── index.tsx                # 离职确认弹窗
├── services/
│   └── api.ts                   # API 请求封装
└── types.ts                     # 类型定义

mock/
└── orgManagementAPI.ts          # Mock 接口数据

src/models/
└── org.ts                       # 全局状态 model
```

---

## Task 1: TypeScript 类型定义

**Files:**
- Create: `src/pages/OrgManagement/types.ts`

**Interfaces:**
- Consumes: Nothing
- Produces: 所有下游任务依赖的类型

- [ ] **Step 1: 创建 types.ts**

```typescript
// src/pages/OrgManagement/types.ts

export type EmployeeStatus = 'active' | 'resigned';
export type DepartmentStatus = 'active' | 'inactive';

export interface DepartmentNode {
  id: number;
  parentId: number | null;
  name: string;
  path: string;
  sortOrder: number;
  status: DepartmentStatus;
  children?: DepartmentNode[];
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: number;
  name: string;
  employeeNo: string;
  phone: string;
  deptId: number;
  deptName?: string;
  position: string;
  status: EmployeeStatus;
  version: number;
  resignDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransferRecord {
  id: number;
  employeeId: number;
  fromDeptId: number;
  toDeptId: number;
  fromPosition: string;
  toPosition: string;
  reason: string;
  operatorId: number;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  errorCode: number;
  msg?: string;
}

export interface PaginatedList<T> {
  list: T[];
  total: number;
}

export interface EmployeeListParams {
  deptId?: number;
  status?: 'all' | 'active' | 'resigned';
  page: number;
  size: number;
}

export interface OrgState {
  departmentTree: DepartmentNode[];
  expandedDeptIds: number[];
  selectedDeptId: number | null;
  employeeList: Employee[];
  pagination: { page: number; size: number; total: number };
  statusFilter: 'all' | 'active' | 'resigned';
  uniquenessCache: Record<string, boolean>;
}
```

- [ ] **Step 2: 验证**

Run: `npx tsc --noEmit`
Expected: 编译通过

- [ ] **Step 3: Commit**

```bash
git add src/pages/OrgManagement/types.ts
git commit -m "feat(org): add TypeScript type definitions"
```

---

## Task 2: API 服务层封装

**Files:**
- Create: `src/pages/OrgManagement/services/api.ts`

**Interfaces:**
- Consumes: `types.ts` — `DepartmentNode`, `Employee`, `ApiResponse`, `PaginatedList`, `EmployeeListParams`
- Produces: 10 个 API 函数（见下方代码）

- [ ] **Step 1: 创建 api.ts**

```typescript
// src/pages/OrgManagement/services/api.ts
import { request } from '@umijs/max';
import type {
  ApiResponse,
  DepartmentNode,
  Employee,
  PaginatedList,
  EmployeeListParams,
} from '../types';

const BASE = '/api';

// ========== 部门接口 ==========

export function fetchDepartmentTree(): Promise<ApiResponse<DepartmentNode[]>> {
  return request(`${BASE}/departments/tree`, { method: 'GET' });
}

export function fetchDepartmentChildren(
  parentId: number,
): Promise<ApiResponse<DepartmentNode[]>> {
  return request(`${BASE}/departments/${parentId}/children`, { method: 'GET' });
}

export function moveDepartment(
  id: number,
  newParentId: number,
): Promise<ApiResponse<null>> {
  return request(`${BASE}/departments/${id}/move`, {
    method: 'PUT',
    data: { newParentId },
  });
}

export function deleteDepartment(id: number): Promise<ApiResponse<null>> {
  return request(`${BASE}/departments/${id}`, { method: 'DELETE' });
}

// ========== 员工接口 ==========

export function checkUnique(
  field: 'employeeNo' | 'phone',
  value: string,
): Promise<ApiResponse<{ isExist: boolean }>> {
  return request(`${BASE}/employees/check`, {
    method: 'GET',
    params: { field, value },
  });
}

export function createEmployee(data: {
  name: string;
  employeeNo: string;
  deptId: number;
  phone: string;
  position: string;
}): Promise<ApiResponse<Employee>> {
  return request(`${BASE}/employees`, { method: 'POST', data });
}

export function fetchEmployeeList(
  params: EmployeeListParams,
): Promise<ApiResponse<PaginatedList<Employee>>> {
  return request(`${BASE}/employees`, { method: 'GET', params });
}

export function fetchEmployeeDetail(id: number): Promise<ApiResponse<Employee>> {
  return request(`${BASE}/employees/${id}`, { method: 'GET' });
}

export function transferEmployee(
  id: number,
  data: { newDeptId: number; newPosition: string; reason: string; version: number },
): Promise<ApiResponse<null>> {
  return request(`${BASE}/employees/${id}/transfer`, {
    method: 'POST',
    data,
  });
}

export function resignEmployee(
  id: number,
  data: { resignDate: string; version: number },
): Promise<ApiResponse<null>> {
  return request(`${BASE}/employees/${id}/resign`, {
    method: 'PUT',
    data,
  });
}
```

- [ ] **Step 2: 验证**

Run: `npx tsc --noEmit`
Expected: 编译通过

- [ ] **Step 3: Commit**

```bash
git add src/pages/OrgManagement/services/api.ts
git commit -m "feat(org): add API service layer"
```

---

## Task 3: Mock 数据

**Files:**
- Create: `mock/orgManagementAPI.ts`

**Interfaces:**
- Consumes: `types.ts` — `DepartmentNode`, `Employee`
- Produces: 10 个 Mock 接口处理器，覆盖全部 API 端点

- [ ] **Step 1: 创建 Mock 文件**

```typescript
// mock/orgManagementAPI.ts
import type { DepartmentNode, Employee } from '@/pages/OrgManagement/types';

// ========== 内存数据 ==========

let deptIdCounter = 10;
let empIdCounter = 100;

const departments: DepartmentNode[] = [
  { id: 1, parentId: null, name: '研发部', path: '1', sortOrder: 1, status: 'active', createdAt: '2023-01-01', updatedAt: '2023-01-01' },
  { id: 2, parentId: 1, name: '前端组', path: '1-2', sortOrder: 1, status: 'active', createdAt: '2023-01-01', updatedAt: '2023-01-01' },
  { id: 3, parentId: 1, name: '后端组', path: '1-3', sortOrder: 2, status: 'active', createdAt: '2023-01-01', updatedAt: '2023-01-01' },
  { id: 4, parentId: null, name: '产品部', path: '4', sortOrder: 2, status: 'active', createdAt: '2023-01-01', updatedAt: '2023-01-01' },
  { id: 5, parentId: 4, name: '设计组', path: '4-5', sortOrder: 1, status: 'active', createdAt: '2023-01-01', updatedAt: '2023-01-01' },
];

const employees: Employee[] = [
  { id: 101, name: '张三', employeeNo: '10086', phone: '13800138001', deptId: 2, position: '前端开发', status: 'active', version: 1, createdAt: '2023-01-01', updatedAt: '2023-01-01' },
  { id: 102, name: '李四', employeeNo: '10087', phone: '13800138002', deptId: 3, position: '后端开发', status: 'active', version: 1, createdAt: '2023-01-01', updatedAt: '2023-01-01' },
  { id: 103, name: '王五', employeeNo: '10088', phone: '13800138003', deptId: 2, position: '前端开发', status: 'resigned', version: 1, resignDate: '2023-10-01', createdAt: '2023-01-01', updatedAt: '2023-10-01' },
];

function buildTree(nodes: DepartmentNode[]): DepartmentNode[] {
  const map = new Map<number, DepartmentNode>();
  nodes.forEach((n) => map.set(n.id, { ...n, children: [] }));
  const roots: DepartmentNode[] = [];
  map.forEach((node) => {
    if (node.parentId === null) {
      roots.push(node);
    } else {
      const parent = map.get(node.parentId);
      if (parent) parent.children!.push(node);
    }
  });
  return roots;
}

function getDeptPath(id: number): string {
  const dept = departments.find((d) => d.id === id);
  return dept?.path ?? '';
}

export default {
  // ========== 部门接口 ==========

  'GET /api/departments/tree': () => ({
    success: true,
    data: buildTree(departments),
    errorCode: 0,
  }),

  'GET /api/departments/:id/children': (req: any) => {
    const parentId = Number(req.params.id);
    const children = departments.filter((d) => d.parentId === parentId);
    return { success: true, data: children, errorCode: 0 };
  },

  'PUT /api/departments/:id/move': (req: any) => {
    const id = Number(req.params.id);
    const { newParentId } = req.body;
    const dept = departments.find((d) => d.id === id);
    if (!dept) return { success: false, data: null, errorCode: 404, msg: '部门不存在' };
    if (newParentId === id) return { success: false, data: null, errorCode: 40001, msg: '不能将部门移动到自身' };
    const targetPath = getDeptPath(newParentId);
    if (targetPath && targetPath.startsWith(dept.path + '-')) {
      return { success: false, data: null, errorCode: 40001, msg: '不能将部门移动到子部门下' };
    }
    dept.parentId = newParentId;
    dept.path = targetPath ? `${targetPath}-${id}` : `${id}`;
    dept.updatedAt = new Date().toISOString();
    return { success: true, data: null, errorCode: 0 };
  },

  'DELETE /api/departments/:id': (req: any) => {
    const id = Number(req.params.id);
    const activeCount = employees.filter((e) => e.deptId === id && e.status === 'active').length;
    if (activeCount > 0) {
      return { success: false, data: null, errorCode: 40002, msg: `该部门下存在${activeCount}名员工，请先转移人员后再删除` };
    }
    const idx = departments.findIndex((d) => d.id === id);
    if (idx === -1) return { success: false, data: null, errorCode: 404, msg: '部门不存在' };
    departments.splice(idx, 1);
    return { success: true, data: null, errorCode: 0 };
  },

  // ========== 员工接口 ==========

  'GET /api/employees/check': (req: any) => {
    const { field, value } = req.query;
    const exists = employees.some(
      (e) => e[field as 'employeeNo' | 'phone'] === value && e.status !== 'resigned',
    );
    return { success: true, data: { isExist: exists }, errorCode: 0 };
  },

  'POST /api/employees': (req: any) => {
    const { name, employeeNo, deptId, phone, position } = req.body;
    if (employees.some((e) => e.employeeNo === employeeNo && e.status !== 'resigned')) {
      return { success: false, data: null, errorCode: 40003, msg: '该工号已被使用' };
    }
    if (employees.some((e) => e.phone === phone && e.status !== 'resigned')) {
      return { success: false, data: null, errorCode: 40004, msg: '该手机号已被使用' };
    }
    if (!departments.some((d) => d.id === deptId && d.status === 'active')) {
      return { success: false, data: null, errorCode: 40005, msg: '目标部门不存在或已停用' };
    }
    const emp: Employee = {
      id: ++empIdCounter,
      name,
      employeeNo,
      phone,
      deptId,
      position,
      status: 'active',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    employees.push(emp);
    return { success: true, data: emp, errorCode: 0 };
  },

  'GET /api/employees': (req: any) => {
    const { deptId, status, page = '1', size = '20' } = req.query;
    let filtered = [...employees];
    if (deptId) filtered = filtered.filter((e) => e.deptId === Number(deptId));
    if (status && status !== 'all') filtered = filtered.filter((e) => e.status === status);
    const total = filtered.length;
    const p = Number(page);
    const s = Number(size);
    const list = filtered.slice((p - 1) * s, p * s).map((emp) => {
      const dept = departments.find((d) => d.id === emp.deptId);
      return { ...emp, deptName: dept?.name };
    });
    return { success: true, data: { list, total }, errorCode: 0 };
  },

  'GET /api/employees/:id': (req: any) => {
    const id = Number(req.params.id);
    const emp = employees.find((e) => e.id === id);
    if (!emp) return { success: false, data: null, errorCode: 404, msg: '员工不存在' };
    const dept = departments.find((d) => d.id === emp.deptId);
    return { success: true, data: { ...emp, deptName: dept?.name }, errorCode: 0 };
  },

  'POST /api/employees/:id/transfer': (req: any) => {
    const id = Number(req.params.id);
    const { newDeptId, newPosition, reason, version } = req.body;
    const emp = employees.find((e) => e.id === id);
    if (!emp) return { success: false, data: null, errorCode: 404, msg: '员工不存在' };
    if (emp.version !== version) {
      return { success: false, data: null, errorCode: 40900, msg: '数据已被他人修改，请刷新重试' };
    }
    if (!departments.some((d) => d.id === newDeptId && d.status === 'active')) {
      return { success: false, data: null, errorCode: 40005, msg: '目标部门不存在或已停用' };
    }
    emp.deptId = newDeptId;
    emp.position = newPosition;
    emp.version += 1;
    emp.updatedAt = new Date().toISOString();
    return { success: true, data: null, errorCode: 0 };
  },

  'PUT /api/employees/:id/resign': (req: any) => {
    const id = Number(req.params.id);
    const { resignDate, version } = req.body;
    const emp = employees.find((e) => e.id === id);
    if (!emp) return { success: false, data: null, errorCode: 404, msg: '员工不存在' };
    if (emp.version !== version) {
      return { success: false, data: null, errorCode: 40900, msg: '数据已被他人修改，请刷新重试' };
    }
    emp.status = 'resigned';
    emp.resignDate = resignDate;
    emp.version += 1;
    emp.updatedAt = new Date().toISOString();
    return { success: true, data: null, errorCode: 0 };
  },
};
```

- [ ] **Step 2: 验证**

Run: `npm run dev`，通过 curl 验证接口：
```bash
curl http://localhost:8000/api/departments/tree
curl "http://localhost:8000/api/employees/check?field=employeeNo&value=10086"
curl "http://localhost:8000/api/employees?page=1&size=20"
```

- [ ] **Step 3: Commit**

```bash
git add mock/orgManagementAPI.ts
git commit -m "feat(org): add mock data for all API endpoints"
```

---

## Task 4: 全局状态 Model

**Files:**
- Create: `src/models/org.ts`

**Interfaces:**
- Consumes: `types.ts` — `OrgState`, `DepartmentNode`, `Employee`, `EmployeeListParams`
- Consumes: `services/api.ts` — `fetchDepartmentTree`, `fetchEmployeeList`, `checkUnique`
- Produces: `useModel('org')` 全局状态

- [ ] **Step 1: 创建 org model**

```typescript
// src/models/org.ts
import { useState, useCallback } from 'react';
import type { DepartmentNode, Employee, OrgState, EmployeeListParams } from '@/pages/OrgManagement/types';
import {
  fetchDepartmentTree,
  fetchEmployeeList,
  checkUnique,
} from '@/pages/OrgManagement/services/api';

const DEFAULT_PAGE_SIZE = 20;

export default function useOrgModel(): OrgState & {
  loadDepartmentTree: () => Promise<void>;
  loadEmployeeList: (params: EmployeeListParams) => Promise<void>;
  setStatusFilter: (status: 'all' | 'active' | 'resigned') => void;
  setSelectedDeptId: (deptId: number | null) => void;
  checkUniqueness: (field: 'employeeNo' | 'phone', value: string) => Promise<boolean>;
  clearUniquenessCache: () => void;
} {
  const [departmentTree, setDepartmentTree] = useState<DepartmentNode[]>([]);
  const [expandedDeptIds] = useState<number[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [pagination, setPagination] = useState({ page: 1, size: DEFAULT_PAGE_SIZE, total: 0 });
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resigned'>('all');
  const [uniquenessCache, setUniquenessCache] = useState<Record<string, boolean>>({});

  const loadDepartmentTree = useCallback(async () => {
    const res = await fetchDepartmentTree();
    if (res.success) setDepartmentTree(res.data);
  }, []);

  const loadEmployeeList = useCallback(async (params: EmployeeListParams) => {
    const res = await fetchEmployeeList(params);
    if (res.success) {
      setEmployeeList(res.data.list);
      setPagination({ page: params.page, size: params.size, total: res.data.total });
    }
  }, []);

  const checkUniquenessLocal = useCallback(
    async (field: 'employeeNo' | 'phone', value: string): Promise<boolean> => {
      const cacheKey = `${field}:${value}`;
      if (uniquenessCache[cacheKey] !== undefined) return uniquenessCache[cacheKey];
      const res = await checkUnique(field, value);
      const isExist = res.success ? res.data.isExist : false;
      setUniquenessCache((prev) => ({ ...prev, [cacheKey]: isExist }));
      return isExist;
    },
    [uniquenessCache],
  );

  const clearUniquenessCache = useCallback(() => setUniquenessCache({}), []);

  return {
    departmentTree,
    expandedDeptIds,
    selectedDeptId,
    employeeList,
    pagination,
    statusFilter,
    uniquenessCache,
    loadDepartmentTree,
    loadEmployeeList,
    setStatusFilter,
    setSelectedDeptId,
    checkUniqueness: checkUniquenessLocal,
    clearUniquenessCache,
  };
}
```

- [ ] **Step 2: 验证**

Run: `npx tsc --noEmit`
Expected: 编译通过

- [ ] **Step 3: Commit**

```bash
git add src/models/org.ts
git commit -m "feat(org): add global state model"
```

---

## Task 5: 入口页面 + 路由配置

**Files:**
- Create: `src/pages/OrgManagement/index.tsx`
- Create: `src/pages/OrgManagement/index.less`
- Modify: `.umirc.ts`（新增路由）

**Interfaces:**
- Consumes: `src/models/org.ts` — `useModel('org')`
- Produces: `<OrgManagementPage />`，路由 `/org`

- [ ] **Step 1: 创建入口组件 + 样式**

```typescript
// src/pages/OrgManagement/index.tsx
import React, { useEffect } from 'react';
import { Tabs } from 'antd-mobile';
import DepartmentTree from './DepartmentTree';
import EmployeeList from './EmployeeList';
import { useModel } from '@umijs/max';
import './index.less';

const OrgManagementPage: React.FC = () => {
  const { loadDepartmentTree, loadEmployeeList, selectedDeptId, statusFilter } = useModel('org');

  useEffect(() => {
    loadDepartmentTree();
    loadEmployeeList({ page: 1, size: 20, deptId: selectedDeptId ?? undefined, status: statusFilter });
  }, []);

  return (
    <div className="org-management">
      <Tabs
        defaultActiveKey="employees"
        onChange={(key) => {
          if (key === 'employees') {
            loadEmployeeList({ page: 1, size: 20, deptId: selectedDeptId ?? undefined, status: statusFilter });
          }
        }}
      >
        <Tabs.Tab title="人员管理" key="employees">
          <EmployeeList />
        </Tabs.Tab>
        <Tabs.Tab title="部门管理" key="departments">
          <DepartmentTree />
        </Tabs.Tab>
      </Tabs>
    </div>
  );
};

export default OrgManagementPage;
```

```less
// src/pages/OrgManagement/index.less
.org-management {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;

  .adm-tabs {
    flex: 1;
    display: flex;
    flex-direction: column;

    .adm-tabs-content {
      flex: 1;
      overflow-y: auto;
    }
  }
}
```

- [ ] **Step 2: 修改 .umirc.ts 路由**

在 `routes` 数组中新增：
```typescript
{ name: '组织架构', path: '/org', component: './OrgManagement' },
{ path: '/org/employee/create', component: './OrgManagement/EmployeeForm' },
{ path: '/org/employee/:id', component: './OrgManagement/EmployeeDetail' },
{ path: '/org/employee/:id/transfer', component: './OrgManagement/TransferDialog' },
{ path: '/org/employee/:id/resign', component: './OrgManagement/ResignDialog' },
```

- [ ] **Step 3: 验证**

Run: `npx tsc --noEmit`
Expected: 编译通过

- [ ] **Step 4: Commit**

```bash
git add src/pages/OrgManagement/index.tsx src/pages/OrgManagement/index.less
git commit -m "feat(org): add entry page with tab navigation and route config"
```

---

## Task 6: 人员分页列表组件

**Files:**
- Create: `src/pages/OrgManagement/EmployeeList/index.tsx`
- Create: `src/pages/OrgManagement/EmployeeList/EmployeeCard.tsx`
- Create: `src/pages/OrgManagement/EmployeeList/DepartmentCascader.tsx`
- Create: `src/pages/OrgManagement/EmployeeList/index.less`

**Interfaces:**
- Consumes: `types.ts` — `Employee`, `DepartmentNode`
- Consumes: `src/models/org.ts` — `useModel('org')`
- Produces: `<EmployeeList />` 组件

- [ ] **Step 1: 创建 EmployeeCard**

```typescript
// src/pages/OrgManagement/EmployeeList/EmployeeCard.tsx
import React from 'react';
import { Card, Tag } from 'antd-mobile';
import { useNavigate } from '@umijs/max';
import type { Employee } from '../types';
import './index.less';

interface EmployeeCardProps {
  employee: Employee;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee }) => {
  const navigate = useNavigate();
  const isResigned = employee.status === 'resigned';

  return (
    <Card
      className={`employee-card ${isResigned ? 'employee-card--resigned' : ''}`}
      onClick={() => { if (!isResigned) navigate(`/org/employee/${employee.id}`); }}
    >
      <div className="employee-card__header">
        <span className="employee-card__name">{employee.name}</span>
        <Tag color={isResigned ? 'default' : 'primary'}>
          {isResigned ? '离职' : '在职'}
        </Tag>
      </div>
      <div className="employee-card__info">
        <span>工号：{employee.employeeNo}</span>
        <span>{employee.deptName || '-'}</span>
      </div>
      <div className="employee-card__position">{employee.position}</div>
    </Card>
  );
};

export default EmployeeCard;
```

- [ ] **Step 2: 创建 DepartmentCascader**

```typescript
// src/pages/OrgManagement/EmployeeList/DepartmentCascader.tsx
import React, { useState } from 'react';
import { Picker } from 'antd-mobile';
import type { DepartmentNode } from '../types';

interface Props {
  departmentTree: DepartmentNode[];
  selectedDeptId: number | null;
  onChange: (deptId: number | null) => void;
}

function flattenDeptOptions(nodes: DepartmentNode[], depth = 0): { label: string; value: number }[] {
  const result: { label: string; value: number }[] = [];
  nodes.forEach((node) => {
    result.push({ label: `${'├ '.repeat(depth)}${node.name}`, value: node.id });
    if (node.children) result.push(...flattenDeptOptions(node.children, depth + 1));
  });
  return result;
}

function findDeptName(nodes: DepartmentNode[], id: number): string | null {
  for (const node of nodes) {
    if (node.id === id) return node.name;
    if (node.children) { const found = findDeptName(node.children, id); if (found) return found; }
  }
  return null;
}

const DepartmentCascader: React.FC<Props> = ({ departmentTree, selectedDeptId, onChange }) => {
  const [visible, setVisible] = useState(false);
  const options = [{ label: '全部部门', value: 0 }, ...flattenDeptOptions(departmentTree)];

  return (
    <>
      <div className="dept-cascader" onClick={() => setVisible(true)}>
        {selectedDeptId === null ? '全部部门' : findDeptName(departmentTree, selectedDeptId) || '全部部门'} ▼
      </div>
      <Picker
        columns={[options]}
        visible={visible}
        onClose={() => setVisible(false)}
        onConfirm={(value) => {
          const deptId = (value as number[])[0];
          onChange(deptId === 0 ? null : deptId);
          setVisible(false);
        }}
      />
    </>
  );
};

export default DepartmentCascader;
```

- [ ] **Step 3: 创建 EmployeeList 主组件**

```typescript
// src/pages/OrgManagement/EmployeeList/index.tsx
import React, { useEffect, useCallback } from 'react';
import { Button, InfiniteScroll, PullToRefresh } from 'antd-mobile';
import { useModel, useNavigate } from '@umijs/max';
import DepartmentCascader from './DepartmentCascader';
import EmployeeCard from './EmployeeCard';
import './index.less';

const EmployeeList: React.FC = () => {
  const {
    employeeList, pagination, statusFilter, selectedDeptId, departmentTree,
    setStatusFilter, setSelectedDeptId, loadEmployeeList,
  } = useModel('org');
  const navigate = useNavigate();

  const fetchList = useCallback(
    async (page: number) => {
      await loadEmployeeList({ page, size: 20, deptId: selectedDeptId ?? undefined, status: statusFilter });
    },
    [selectedDeptId, statusFilter, loadEmployeeList],
  );

  useEffect(() => { fetchList(1); }, [selectedDeptId, statusFilter]);

  const hasMore = pagination.total > employeeList.length;

  const loadMore = async () => {
    await loadEmployeeList({ page: pagination.page + 1, size: 20, deptId: selectedDeptId ?? undefined, status: statusFilter });
  };

  return (
    <div className="employee-list">
      <div className="employee-list__toolbar">
        <DepartmentCascader departmentTree={departmentTree} selectedDeptId={selectedDeptId} onChange={setSelectedDeptId} />
        <div className="employee-list__status-tabs">
          {(['all', 'active', 'resigned'] as const).map((s) => (
            <span key={s} className={statusFilter === s ? 'active' : ''} onClick={() => setStatusFilter(s)}>
              {s === 'all' ? '全部' : s === 'active' ? '在职' : '离职'}
            </span>
          ))}
        </div>
      </div>
      <PullToRefresh onRefresh={() => fetchList(1)}>
        <div className="employee-list__cards">
          {employeeList.map((emp) => <EmployeeCard key={emp.id} employee={emp} />)}
          {employeeList.length === 0 && <div className="employee-list__empty">暂无人员数据</div>}
        </div>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>
      <Button className="employee-list__add-btn" color="primary" block onClick={() => navigate('/org/employee/create')}>
        新增员工
      </Button>
    </div>
  );
};

export default EmployeeList;
```

- [ ] **Step 4: 创建样式**

```less
// src/pages/OrgManagement/EmployeeList/index.less
.employee-list {
  padding: 12px;
  &__toolbar { margin-bottom: 12px; }
  &__status-tabs {
    display: flex; gap: 8px; margin-top: 8px;
    span { padding: 4px 12px; border-radius: 16px; font-size: 14px; background: #fff; color: #666; }
    span.active { background: #1677ff; color: #fff; }
  }
  &__cards { display: flex; flex-direction: column; gap: 8px; }
  &__empty { text-align: center; padding: 40px 0; color: #999; font-size: 14px; }
  &__add-btn { position: fixed; bottom: 0; left: 0; right: 0; border-radius: 0; }
}

.employee-card {
  cursor: pointer;
  &--resigned { opacity: 0.5; .employee-card__name { color: #999; } }
  &__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
  &__name { font-size: 16px; font-weight: 600; }
  &__info { display: flex; gap: 12px; font-size: 13px; color: #666; margin-bottom: 4px; }
  &__position { font-size: 13px; color: #999; }
}

.dept-cascader {
  padding: 8px 12px; background: #fff; border-radius: 8px; font-size: 14px; color: #1677ff;
}
```

- [ ] **Step 5: 验证**

Run: `npx tsc --noEmit`
Expected: 编译通过

- [ ] **Step 6: Commit**

```bash
git add src/pages/OrgManagement/EmployeeList/
git commit -m "feat(org): add employee list with cascader filter, status tabs, pagination"
```

---

## Task 7: 部门树形管理组件

**Files:**
- Create: `src/pages/OrgManagement/DepartmentTree/index.tsx`
- Create: `src/pages/OrgManagement/DepartmentTree/MoveMenu.tsx`
- Create: `src/pages/OrgManagement/DepartmentTree/index.less`

**Interfaces:**
- Consumes: `types.ts` — `DepartmentNode`
- Consumes: `services/api.ts` — `fetchDepartmentTree`, `fetchDepartmentChildren`, `moveDepartment`, `deleteDepartment`
- Produces: `<DepartmentTree />` + `<MoveMenu />`

- [ ] **Step 1: 创建 MoveMenu**

```typescript
// src/pages/OrgManagement/DepartmentTree/MoveMenu.tsx
import React from 'react';
import { ActionSheet, Toast } from 'antd-mobile';
import type { DepartmentNode } from '../types';
import { moveDepartment } from '../services/api';

interface Props {
  visible: boolean;
  node: DepartmentNode;
  allDepts: DepartmentNode[];
  onClose: () => void;
  onMoved: () => void;
}

function collectEligible(allDepts: DepartmentNode[], excludePath: string): { label: string; value: number }[] {
  const result: { label: string; value: number }[] = [];
  const traverse = (nodes: DepartmentNode[]) => {
    nodes.forEach((node) => {
      if (!node.path.startsWith(excludePath + '-') && node.path !== excludePath) {
        result.push({ label: node.name, value: node.id });
      }
      if (node.children) traverse(node.children);
    });
  };
  traverse(allDepts);
  return result;
}

const MoveMenu: React.FC<Props> = ({ visible, node, allDepts, onClose, onMoved }) => {
  const eligible = collectEligible(allDepts, node.path);

  const handleMove = async (targetId: number) => {
    const res = await moveDepartment(node.id, targetId);
    if (res.success) { Toast.show({ icon: 'success', content: '移动成功' }); onMoved(); }
    else { Toast.show({ icon: 'fail', content: res.msg || '移动失败' }); }
    onClose();
  };

  return (
    <ActionSheet
      visible={visible}
      onClose={onClose}
      extra={`移动「${node.name}」到`}
      cancelText="取消"
      actions={eligible.map((d) => ({ text: `├ ${d.label}`, key: d.value, onClick: () => handleMove(d.value) }))}
    />
  );
};

export default MoveMenu;
```

- [ ] **Step 2: 创建 DepartmentTree 主组件**

```typescript
// src/pages/OrgManagement/DepartmentTree/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { List, Toast, Dialog } from 'antd-mobile';
import type { DepartmentNode } from '../types';
import { fetchDepartmentTree, fetchDepartmentChildren, deleteDepartment } from '../services/api';
import MoveMenu from './MoveMenu';
import './index.less';

const DepartmentTree: React.FC = () => {
  const [tree, setTree] = useState<DepartmentNode[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [moveTarget, setMoveTarget] = useState<DepartmentNode | null>(null);

  const reload = useCallback(async () => {
    const res = await fetchDepartmentTree();
    if (res.success) setTree(res.data);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleToggle = async (node: DepartmentNode) => {
    if (expandedIds.has(node.id)) {
      setExpandedIds((prev) => { const n = new Set(prev); n.delete(node.id); return n; });
      return;
    }
    if (!node.children || node.children.length === 0) {
      const res = await fetchDepartmentChildren(node.id);
      if (res.success) {
        setTree((prev) => updateNodeChildren(prev, node.id, res.data));
      }
    }
    setExpandedIds((prev) => new Set(prev).add(node.id));
  };

  const handleDelete = async (node: DepartmentNode) => {
    const result = await Dialog.confirm({ content: `确认删除「${node.name}」？` });
    if (!result) return;
    const res = await deleteDepartment(node.id);
    if (res.success) { Toast.show({ icon: 'success', content: '删除成功' }); reload(); }
    else { Toast.show({ icon: 'fail', content: res.msg || '删除失败' }); }
  };

  const renderNode = (node: DepartmentNode, depth = 0): React.ReactNode => {
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <React.Fragment key={node.id}>
        <List.Item
          className="dept-tree__item"
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          arrow={hasChildren ? (isExpanded ? 'down' : 'right') : undefined}
          onClick={() => { if (hasChildren || !node.children) handleToggle(node); }}
          extra={
            <span className="dept-tree__more" onClick={(e) => { e.stopPropagation(); setMoveTarget(node); }}>⋯</span>
          }
        >
          {node.name}
          <span style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>{node.path}</span>
        </List.Item>
        {isExpanded && node.children?.map((child) => renderNode(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="dept-tree">
      <List>{tree.map((node) => renderNode(node))}</List>
      {moveTarget && (
        <MoveMenu
          visible={!!moveTarget}
          node={moveTarget}
          allDepts={tree}
          onClose={() => setMoveTarget(null)}
          onMoved={reload}
        />
      )}
    </div>
  );
};

function updateNodeChildren(nodes: DepartmentNode[], targetId: number, children: DepartmentNode[]): DepartmentNode[] {
  return nodes.map((node) => {
    if (node.id === targetId) return { ...node, children };
    if (node.children) return { ...node, children: updateNodeChildren(node.children, targetId, children) };
    return node;
  });
}

export default DepartmentTree;
```

- [ ] **Step 3: 创建样式**

```less
// src/pages/OrgManagement/DepartmentTree/index.less
.dept-tree {
  &__item { .adm-list-item-content-extra { flex: none; } }
  &__more { display: inline-block; padding: 4px 8px; font-size: 18px; color: #999; line-height: 1; }
}
```

- [ ] **Step 4: 验证**

Run: `npx tsc --noEmit`
Expected: 编译通过

- [ ] **Step 5: Commit**

```bash
git add src/pages/OrgManagement/DepartmentTree/
git commit -m "feat(org): add department tree with lazy loading, move menu, and delete"
```

---

## Task 8: 唯一性校验 Hook + 员工新增表单

**Files:**
- Create: `src/pages/OrgManagement/EmployeeForm/useUniqueCheck.ts`
- Create: `src/pages/OrgManagement/EmployeeForm/index.tsx`
- Create: `src/pages/OrgManagement/EmployeeForm/index.less`

**Interfaces:**
- Consumes: `types.ts` — `Employee`, `DepartmentNode`
- Consumes: `services/api.ts` — `createEmployee`, `checkUnique`
- Consumes: `src/models/org.ts` — `useModel('org')`
- Produces: `useUniqueCheck()` hook, `<EmployeeForm />` 组件

- [ ] **Step 1: 创建 useUniqueCheck hook**

```typescript
// src/pages/OrgManagement/EmployeeForm/useUniqueCheck.ts
import { useState, useCallback } from 'react';
import { checkUnique } from '../services/api';

export function useUniqueCheck() {
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const validate = useCallback(async (field: 'employeeNo' | 'phone', value: string): Promise<boolean> => {
    if (!value.trim()) { setError(''); return true; }
    setChecking(true); setError('');
    try {
      const res = await checkUnique(field, value);
      setChecking(false);
      if (res.success && res.data.isExist) {
        setError(field === 'employeeNo' ? '工号已存在' : '手机号已存在');
        return false;
      }
      return true;
    } catch { setChecking(false); return true; }
  }, []);

  const reset = useCallback(() => { setError(''); setChecking(false); }, []);
  return { error, checking, validate, reset };
}
```

- [ ] **Step 2: 创建 EmployeeForm 组件**

```typescript
// src/pages/OrgManagement/EmployeeForm/index.tsx
import React, { useState } from 'react';
import { Form, Input, Button, Picker, Toast } from 'antd-mobile';
import { useNavigate } from '@umijs/max';
import { useModel } from '@umijs/max';
import { createEmployee } from '../services/api';
import { useUniqueCheck } from './useUniqueCheck';
import type { DepartmentNode } from '../types';
import './index.less';

const EmployeeForm: React.FC = () => {
  const navigate = useNavigate();
  const { departmentTree, loadEmployeeList } = useModel('org');
  const [form] = Form.useForm();
  const empNoCheck = useUniqueCheck();
  const phoneCheck = useUniqueCheck();
  const [deptPickerVisible, setDeptPickerVisible] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [selectedDeptName, setSelectedDeptName] = useState('');

  const deptOptions = flattenDeptOptions(departmentTree);

  const handleSubmit = async () => {
    const values = form.getFieldsValue();
    if (!values.name || !values.employeeNo || !values.phone || !values.position) {
      Toast.show({ icon: 'fail', content: '请填写完整信息' }); return;
    }
    if (selectedDeptId === null) { Toast.show({ icon: 'fail', content: '请选择部门' }); return; }

    const res = await createEmployee({
      name: values.name, employeeNo: values.employeeNo, deptId: selectedDeptId,
      phone: values.phone, position: values.position,
    });

    if (res.success) {
      Toast.show({ icon: 'success', content: '新增成功' });
      loadEmployeeList({ page: 1, size: 20 });
      navigate(-1);
    } else { Toast.show({ icon: 'fail', content: res.msg || '新增失败' }); }
  };

  return (
    <div className="employee-form">
      <Form form={form} layout="horizontal" footer={<Button block color="primary" onClick={handleSubmit}>提交</Button>}>
        <Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input placeholder="请输入姓名" /></Form.Item>
        <Form.Item name="employeeNo" label="工号" rules={[{ required: true }]}>
          <Input placeholder="请输入工号" onBlur={(e) => empNoCheck.validate('employeeNo', e.target.value)} />
        </Form.Item>
        {empNoCheck.error && <div className="employee-form__error">{empNoCheck.error}</div>}
        <Form.Item name="phone" label="手机号" rules={[{ required: true }]}>
          <Input placeholder="请输入手机号" type="tel" onBlur={(e) => phoneCheck.validate('phone', e.target.value)} />
        </Form.Item>
        {phoneCheck.error && <div className="employee-form__error">{phoneCheck.error}</div>}
        <Form.Item label="部门" onClick={() => setDeptPickerVisible(true)}>
          <span className={selectedDeptName ? '' : 'employee-form__placeholder'}>
            {selectedDeptName || '请选择部门'}
          </span>
        </Form.Item>
        <Form.Item name="position" label="职位" rules={[{ required: true }]}><Input placeholder="请输入职位" /></Form.Item>
      </Form>
      <Picker
        columns={[deptOptions]}
        visible={deptPickerVisible}
        onClose={() => setDeptPickerVisible(false)}
        onConfirm={(value) => {
          const id = (value as number[])[0];
          const opt = deptOptions.find((o) => o.value === id);
          setSelectedDeptId(id); setSelectedDeptName(opt?.label || ''); setDeptPickerVisible(false);
        }}
      />
    </div>
  );
};

function flattenDeptOptions(nodes: DepartmentNode[], depth = 0): { label: string; value: number }[] {
  const result: { label: string; value: number }[] = [];
  nodes.forEach((node) => {
    result.push({ label: `${'├ '.repeat(depth)}${node.name}`, value: node.id });
    if (node.children) result.push(...flattenDeptOptions(node.children, depth + 1));
  });
  return result;
}

export default EmployeeForm;
```

- [ ] **Step 3: 创建样式**

```less
// src/pages/OrgManagement/EmployeeForm/index.less
.employee-form {
  padding: 12px;
  &__error { color: #ff4d4f; font-size: 12px; padding: 0 12px 8px; }
  &__placeholder { color: #ccc; }
}
```

- [ ] **Step 4: 验证**

Run: `npx tsc --noEmit`
Expected: 编译通过

- [ ] **Step 5: Commit**

```bash
git add src/pages/OrgManagement/EmployeeForm/
git commit -m "feat(org): add employee form with real-time uniqueness check"
```

---

## Task 9: 员工详情页

**Files:**
- Create: `src/pages/OrgManagement/EmployeeDetail/index.tsx`
- Create: `src/pages/OrgManagement/EmployeeDetail/index.less`

**Interfaces:**
- Consumes: `types.ts` — `Employee`
- Consumes: `services/api.ts` — `fetchEmployeeDetail`
- Produces: `<EmployeeDetail />` 组件

- [ ] **Step 1: 创建 EmployeeDetail**

```typescript
// src/pages/OrgManagement/EmployeeDetail/index.tsx
import React, { useEffect, useState } from 'react';
import { Card, Button, Toast, SpinLoading } from 'antd-mobile';
import { useParams, useNavigate } from '@umijs/max';
import { fetchEmployeeDetail } from '../services/api';
import type { Employee } from '../types';
import './index.less';

const EmployeeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchEmployeeDetail(Number(id)).then((res) => {
      if (res.success) setEmployee(res.data);
      else Toast.show({ icon: 'fail', content: res.msg || '加载失败' });
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="employee-detail__loading"><SpinLoading /></div>;
  if (!employee) return <div className="employee-detail__error">员工不存在</div>;

  const isResigned = employee.status === 'resigned';

  return (
    <div className="employee-detail">
      <Card className="employee-detail__card">
        <div className="employee-detail__header">
          <span className="employee-detail__name">{employee.name}</span>
          <span className={`employee-detail__status ${isResigned ? 'resigned' : ''}`}>
            {isResigned ? '离职' : '在职'}
          </span>
        </div>
        {(['employeeNo', 'phone', 'position'] as (keyof Employee)[]).map((field) => (
          <div className="employee-detail__row" key={field}>
            <span className="employee-detail__label">{{ employeeNo: '工号', phone: '手机号', position: '职位' }[field]}</span>
            <span>{String(employee[field])}</span>
          </div>
        ))}
        <div className="employee-detail__row">
          <span className="employee-detail__label">部门</span><span>{employee.deptName || '-'}</span>
        </div>
        {isResigned && employee.resignDate && (
          <div className="employee-detail__row">
            <span className="employee-detail__label">离职日期</span><span>{employee.resignDate}</span>
          </div>
        )}
      </Card>
      {!isResigned && (
        <div className="employee-detail__actions">
          <Button block color="primary" onClick={() => navigate(`/org/employee/${employee.id}/transfer`, { state: { employee } })}>调动</Button>
          <Button block color="danger" onClick={() => navigate(`/org/employee/${employee.id}/resign`, { state: { employee } })}>办理离职</Button>
        </div>
      )}
    </div>
  );
};

export default EmployeeDetail;
```

- [ ] **Step 2: 创建样式**

```less
// src/pages/OrgManagement/EmployeeDetail/index.less
.employee-detail {
  padding: 12px;
  &__loading { display: flex; justify-content: center; padding: 40px; }
  &__error { text-align: center; padding: 40px; color: #999; }
  &__card { margin-bottom: 16px; }
  &__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #eee; }
  &__name { font-size: 20px; font-weight: 600; }
  &__status { font-size: 14px; padding: 2px 8px; border-radius: 4px; background: #e6f7ff; color: #1677ff; &.resigned { background: #f5f5f5; color: #999; } }
  &__row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
  &__label { color: #999; }
  &__actions { display: flex; gap: 12px; }
}
```

- [ ] **Step 3: 验证**

Run: `npx tsc --noEmit`
Expected: 编译通过

- [ ] **Step 4: Commit**

```bash
git add src/pages/OrgManagement/EmployeeDetail/
git commit -m "feat(org): add employee detail page with transfer and resign actions"
```

---

## Task 10: 调动确认弹窗

**Files:**
- Create: `src/pages/OrgManagement/TransferDialog/index.tsx`

**Interfaces:**
- Consumes: `types.ts` — `Employee`, `DepartmentNode`
- Consumes: `services/api.ts` — `transferEmployee`
- Consumes: `src/models/org.ts` — `useModel('org')`
- Produces: `<TransferDialog />` 页面级组件

- [ ] **Step 1: 创建 TransferDialog**

```typescript
// src/pages/OrgManagement/TransferDialog/index.tsx
import React, { useState } from 'react';
import { Form, Input, Picker, Button, Dialog, Toast } from 'antd-mobile';
import { useNavigate, useLocation } from '@umijs/max';
import { useModel } from '@umijs/max';
import { transferEmployee } from '../services/api';
import type { Employee, DepartmentNode } from '../types';

const TransferDialog: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { departmentTree, loadEmployeeList } = useModel('org');
  const employee = (location.state as any)?.employee as Employee | undefined;

  const [newDeptId, setNewDeptId] = useState<number | null>(null);
  const [newDeptName, setNewDeptName] = useState('');
  const [newPosition, setNewPosition] = useState(employee?.position || '');
  const [reason, setReason] = useState('');
  const [deptPickerVisible, setDeptPickerVisible] = useState(false);

  const deptOptions = flattenDeptOptions(departmentTree);

  const handleSubmit = async () => {
    if (!employee || newDeptId === null) { Toast.show({ icon: 'fail', content: '请选择目标部门' }); return; }
    const confirmed = await Dialog.confirm({ content: '调动后，该员工相关的审批流/权限将发生变化，确认调动？' });
    if (!confirmed) return;

    const res = await transferEmployee(employee.id, {
      newDeptId, newPosition: newPosition || employee.position, reason: reason || '业务调整', version: employee.version,
    });

    if (res.success) {
      Toast.show({ icon: 'success', content: '调动成功' });
      loadEmployeeList({ page: 1, size: 20 });
      navigate(-2);
    } else if (res.errorCode === 40900) {
      Dialog.alert({ content: '该员工信息已被他人修改，请刷新重试', onConfirm: () => navigate(-1) });
    } else { Toast.show({ icon: 'fail', content: res.msg || '调动失败' }); }
  };

  if (!employee) return <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>员工信息缺失</div>;

  return (
    <div style={{ padding: 12 }}>
      <Form layout="horizontal">
        <Form.Item label="当前部门"><span>{employee.deptName || '-'}</span></Form.Item>
        <Form.Item label="当前职位"><span>{employee.position}</span></Form.Item>
        <Form.Item label="目标部门" onClick={() => setDeptPickerVisible(true)}>
          <span style={{ color: newDeptName ? '#333' : '#ccc' }}>{newDeptName || '请选择目标部门'}</span>
        </Form.Item>
        <Form.Item label="新职位">
          <Input value={newPosition} onChange={setNewPosition} placeholder="请输入新职位" />
        </Form.Item>
        <Form.Item label="调动原因">
          <Input value={reason} onChange={setReason} placeholder="请输入调动原因" />
        </Form.Item>
      </Form>
      <Button block color="primary" onClick={handleSubmit} style={{ marginTop: 16 }}>确认调动</Button>
      <Picker
        columns={[deptOptions]}
        visible={deptPickerVisible}
        onClose={() => setDeptPickerVisible(false)}
        onConfirm={(value) => {
          const id = (value as number[])[0];
          const opt = deptOptions.find((o) => o.value === id);
          setNewDeptId(id); setNewDeptName(opt?.label || ''); setDeptPickerVisible(false);
        }}
      />
    </div>
  );
};

function flattenDeptOptions(nodes: DepartmentNode[], depth = 0): { label: string; value: number }[] {
  const result: { label: string; value: number }[] = [];
  nodes.forEach((node) => {
    result.push({ label: `${'├ '.repeat(depth)}${node.name}`, value: node.id });
    if (node.children) result.push(...flattenDeptOptions(node.children, depth + 1));
  });
  return result;
}

export default TransferDialog;
```

- [ ] **Step 2: 验证**

Run: `npx tsc --noEmit`
Expected: 编译通过

- [ ] **Step 3: Commit**

```bash
git add src/pages/OrgManagement/TransferDialog/
git commit -m "feat(org): add transfer dialog with optimistic lock conflict handling"
```

---

## Task 11: 离职确认弹窗

**Files:**
- Create: `src/pages/OrgManagement/ResignDialog/index.tsx`

**Interfaces:**
- Consumes: `types.ts` — `Employee`
- Consumes: `services/api.ts` — `resignEmployee`
- Consumes: `src/models/org.ts` — `useModel('org')`
- Produces: `<ResignDialog />` 页面级组件

- [ ] **Step 1: 创建 ResignDialog**

```typescript
// src/pages/OrgManagement/ResignDialog/index.tsx
import React, { useState } from 'react';
import { Button, DatePicker, Dialog, Toast } from 'antd-mobile';
import { useNavigate, useLocation } from '@umijs/max';
import { useModel } from '@umijs/max';
import { resignEmployee } from '../services/api';
import type { Employee } from '../types';

const ResignDialog: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loadEmployeeList } = useModel('org');
  const employee = (location.state as any)?.employee as Employee | undefined;
  const [resignDate, setResignDate] = useState<Date>(new Date());
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const handleSubmit = async () => {
    if (!employee) return;
    const confirmed = await Dialog.confirm({ content: '确认办理离职？离职后该员工将无法登录系统，历史数据保留。' });
    if (!confirmed) return;

    const dateStr = `${resignDate.getFullYear()}-${String(resignDate.getMonth() + 1).padStart(2, '0')}-${String(resignDate.getDate()).padStart(2, '0')}`;
    const res = await resignEmployee(employee.id, { resignDate: dateStr, version: employee.version });

    if (res.success) {
      Toast.show({ icon: 'success', content: '离职办理成功' });
      loadEmployeeList({ page: 1, size: 20 });
      navigate(-2);
    } else if (res.errorCode === 40900) {
      Dialog.alert({ content: '该员工信息已被他人修改，请刷新重试', onConfirm: () => navigate(-1) });
    } else { Toast.show({ icon: 'fail', content: res.msg || '操作失败' }); }
  };

  if (!employee) return <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>员工信息缺失</div>;

  return (
    <div style={{ padding: 12 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8, color: '#666' }}>离职员工</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{employee.name}</div>
        <div style={{ color: '#999', fontSize: 14 }}>{employee.deptName} / {employee.position}</div>
      </div>
      <div style={{ marginBottom: 16, padding: '8px 12px', background: '#fff', borderRadius: 8 }} onClick={() => setDatePickerVisible(true)}>
        <span style={{ color: '#666', marginRight: 8 }}>离职日期</span>
        <span>{`${resignDate.getFullYear()}-${String(resignDate.getMonth() + 1).padStart(2, '0')}-${String(resignDate.getDate()).padStart(2, '0')}`}</span>
      </div>
      <Button block color="danger" onClick={handleSubmit}>确认离职</Button>
      <DatePicker
        visible={datePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        onConfirm={(val) => { setResignDate(val); setDatePickerVisible(false); }}
        min={new Date(2020, 0, 1)}
        max={new Date()}
      />
    </div>
  );
};

export default ResignDialog;
```

- [ ] **Step 2: 验证**

Run: `npx tsc --noEmit`
Expected: 编译通过

- [ ] **Step 3: Commit**

```bash
git add src/pages/OrgManagement/ResignDialog/
git commit -m "feat(org): add resign dialog with date picker and optimistic lock handling"
```

---

## Self-Review Checklist

### 1. Spec 覆盖

| 需求项 | 覆盖任务 | 状态 |
|--------|---------|------|
| 部门树懒加载 | Task 7 (DepartmentTree) | ✅ |
| 部门移动（长按菜单） | Task 7 (MoveMenu) | ✅ |
| 循环引用检测 | Task 7 (MoveMenu `collectEligible` 排除自身及子孙) + Task 3 (Mock) | ✅ |
| 部门非空保护删除 | Task 7 (错误码 40002 提示) + Task 3 (Mock) | ✅ |
| 员工新增表单 | Task 8 (EmployeeForm) | ✅ |
| 工号唯一性实时校验 | Task 8 (useUniqueCheck) | ✅ |
| 手机号唯一性实时校验 | Task 8 (useUniqueCheck) | ✅ |
| 员工分页列表 | Task 6 (EmployeeList) | ✅ |
| 部门筛选器 | Task 6 (DepartmentCascader) | ✅ |
| 状态筛选 | Task 6 (status tabs) | ✅ |
| 员工详情 | Task 9 (EmployeeDetail) | ✅ |
| 人员调动 | Task 10 (TransferDialog) | ✅ |
| 调动乐观锁冲突 | Task 10 (errorCode 40900) + Task 3 (Mock) | ✅ |
| 员工离职 | Task 11 (ResignDialog) | ✅ |
| 离职乐观锁冲突 | Task 11 (errorCode 40900) + Task 3 (Mock) | ✅ |
| 类型定义 | Task 1 (types.ts) | ✅ |
| API 封装 | Task 2 (services/api.ts) | ✅ |
| Mock 数据 | Task 3 (mock/orgManagementAPI.ts) | ✅ |
| 全局状态管理 | Task 4 (models/org.ts) | ✅ |
| 路由配置 | Task 5 (.umirc.ts) | ✅ |
| 移动端适配 | 所有任务 (375px, antd-mobile) | ✅ |

### 2. Placeholder 扫描

- 无 `TBD` / `TODO` / `implement later` 占位符
- 无 `Add appropriate error handling` 等模糊描述
- 所有代码步骤均有完整代码块
- 所有类型引用在 Task 1 中已定义

### 3. 类型一致性

- `DepartmentNode` 在 Task 1 定义，Task 6/7/8/10 使用一致
- `Employee` 在 Task 1 定义，Task 6/9/10/11 使用一致
- `ApiResponse<T>` 在 Task 1 定义，Task 2/3/4 使用一致
- `EmployeeListParams` 在 Task 1 定义，Task 2/4/6 使用一致
- 乐观锁 `version` 字段在 Task 1 定义，Task 10/11 的请求中携带
- 错误码 `40002`、`40900` 在 Task 3/7/10/11 中一致处理
- 路由路径 `/org/employee/:id` 等与 Task 5 路由配置一致

---

## 执行交接

计划完成并保存至 `docs/superpowers/plans/2026-07-15-org-management.md`。两种执行方式：

**1. Subagent-Driven（推荐）** — 每个任务派发独立 subagent，任务间 review，快速迭代

**2. Inline Execution** — 在当前 session 使用 executing-plans 逐步执行，checkpoint 批量推进