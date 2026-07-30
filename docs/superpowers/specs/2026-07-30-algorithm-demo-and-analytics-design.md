# 算法演示与调用分析 — 需求澄清设计文档

> 阶段：需求澄清（仅设计，未改代码）· 日期：2026-07-30

## 1. 仓库与技术栈

| 角色 | 仓库 | 技术栈 | 落盘位置 |
|------|------|--------|----------|
| 前端 | iMoney-H5 | UmiJS 4 + React 18 + antd 5 | worktree 根，`src/pages/algorithm-demo/` |
| 后端 | PH2498.github.io | Python 3 + FastAPI | worktree 根，`server/` 子目录 |

> PH2498.github.io 为静态博客仓，新增 `server/` 子目录对原有静态内容零干扰。

## 2. 接口契约（前后端冻结 · 向后兼容）

统一响应结构：`{ "code": 0, "data": {...}, "traceId": "uuid" }`，请求头携带 `X-User-Id` / `X-User-Name`。

### 算法接口

| 接口 | 方法 | 路径 | 入参 | 出参 data |
|------|------|------|------|-----------|
| HelloWorld | GET | `/api/algorithm/helloworld` | 无 | `{ "message": "Hello, World!" }` |
| 哈希 | POST | `/api/algorithm/hash` | `{ "input": "str", "algorithm": "SHA-256" }` | `{ "input", "algorithm", "hashValue" }` |
| 冒泡排序 | POST | `/api/algorithm/bubble-sort` | `{ "input": [3,1,4,1,5] }` | `{ "input", "sorted", "steps": [] }` |

- `algorithm` 可选 MD5 / SHA-1 / SHA-256，默认 SHA-256。
- `steps` 为排序过程快照数组，供前端可视化。

### 导出接口

```
POST /api/export  Body: { "tabs": ["helloworld","hash","bubble-sort"] }
→ 200 application/vnd.openxmlformats (xlsx 文件流，多 Sheet 每 Tab 一 Sheet)
```

### 埋点查询接口

```
GET /api/analytics/calls?dimension=department&startTime=...&endTime=...
→ { "dimension", "series": [{"label","value"}], "timeline": [{"date","value"}] }
```

## 3. 埋点数据模型

后端各接口处理时异步写入 `call_log` 表（演示用 SQLite）：

```
call_log: id, trace_id, api, caller_id, caller_name,
          user_type, user_level, department, call_time, duration_ms, status
```

人员维度字段（user_type / user_level / department）由后端在写入时回填，前端不采集。

## 4. 前端页面（iMoney-H5）

路由 `/algorithm-demo`，结构：

```
AlgorithmDemoPage
├─ Tabs（三 Tab：HelloWorld / 哈希算法 / 冒泡排序）
│   各 Tab 调用对应算法接口，展示结果（冒泡排序额外可视化 steps）
├─ 工具栏：导出按钮 → POST /api/export 下载 xlsx
└─ 调用报表区
    ├─ 维度切换：人员类型 / 人员层级 / 人员部门
    ├─ 时间筛选器（默认近 7 日）
    └─ 折线图（日趋势）+ 饼图（维度占比）+ 柱状图（维度对比）
```

图表库：`@ant-design/charts`（antd 5 生态，编码阶段确认依赖）。数据源 `/api/analytics/calls`。

## 5. 子系统分解

| 子项目 | 范围 | 仓库 | 状态 |
|--------|------|------|------|
| SP1 后端服务 | 三算法接口 + 导出 + 埋点 | PH2498.github.io `server/` | 🟢 契约已冻结 |
| SP2 前端演示页 | 三 Tab + 导出按钮 | iMoney-H5 | 🟢 契约已冻结，可 Mock 先行 |
| SP3 可视化报表 | 折线/饼/柱 + 多维度 | iMoney-H5 | 🟢 契约已冻结，可 Mock 先行 |

实现顺序：SP2/SP3 Mock 先行 → SP1 后端实现 → 联调切真实接口。

## 6. 默认值确认项

| 项 | 默认值 |
|----|--------|
| 后端语言/框架 | Python + FastAPI |
| 导出格式 | Excel .xlsx 多 Sheet |
| 调用人身份 | Header X-User-Id / X-User-Name |
| 报表时间范围 | 默认近 7 日，支持筛选 |
| 图表库 | @ant-design/charts |
| 埋点存储 | SQLite（演示用） |

## 7. 风险

| 风险 | 缓解 |
|------|------|
| @ant-design/charts 依赖版本未确认 | 编码阶段在 iMoney-H5 package.json 确认 |
| 人员维度数据源未对接 | 后端回填，待 SP1 对接组织数据 |

## 8. 阶段边界

本文档为需求澄清产物，未修改任何代码文件。编码实现将在"编码实现"阶段于对应仓库 worktree 执行。
