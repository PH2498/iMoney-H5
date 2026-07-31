# 需求澄清设计文档 — 算法演示与调用埋点可视化

- 日期：2026-07-30
- 阶段：需求澄清（brainstorming）
- 文档类型：需求澄清 / 设计规格（非代码产物）

## 1. 需求陈述

三个后端接口（helloworld、哈希算法、冒泡排序）；前端新增页面三 Tab 展示执行结果；导出按钮 + 后台导出接口导出各 Tab 结果；后端埋点采集调用次数与调用人；前端可视化报表按人员类型/层级/部门多维度、折线图/饼图/柱状图展示调用情况。

## 2. 落点决策

| 端 | 仓库 | 技术栈 | 依据 |
|----|------|--------|------|
| 后端 | **ArmBasic** | Python + Flask | 用户指定后端仓库；ArmBasic 为 Python 工程（`AISpeechInteraction/speech_ai.py`、`FaceRecognitionModule/*.py`），不强制 Java，沿用 Python |
| 前端 | **iMoney-H5** | UmiJS Max + React + TypeScript | 唯一 Web H5 工程，已启用 `request` 插件，适配 Tab/导出/图表 |

## 3. 子系统拆解

| # | 子系统 | 端 | 仓库 | 优先级 |
|---|--------|----|------|--------|
| 1 | 三接口（hello/hash/sort） | 后端 | ArmBasic | P0 |
| 2 | 三 Tab 演示页 | 前端 | iMoney-H5 | P0 |
| 3 | 导出接口 + 导出按钮 | 后端+前端 | ArmBasic / iMoney-H5 | P1 |
| 4 | 埋点采集（调用次数 + 调用人） | 后端 | ArmBasic | P2 |
| 5 | 可视化报表（折线/饼/柱 + 多维度） | 前端 | iMoney-H5 | P3 |

## 4. 接口契约（后端 ↔ 前端，向后兼容：仅新增）

| 接口 | Method | Path | 入参 | 出参 |
|------|--------|------|------|------|
| HelloWorld | GET | `/api/demo/hello` | — | `{ "message": "HelloWorld" }` |
| 哈希算法 | POST | `/api/demo/hash` | `{ "raw": string, "algorithm"?: string }` | `{ "algorithm": string, "digest": string }` |
| 冒泡排序 | POST | `/api/demo/sort` | `{ "items": number[] }` | `{ "sorted": number[], "swapCount": number }` |
| 导出 | POST | `/api/demo/export` | `{ "tab": "hello"\|"hash"\|"sort", "format": "csv"\|"xlsx" }` | 文件流 |
| 调用统计 | GET | `/api/metrics/call-stats` | `dimension=role\|level\|dept`, `chartType=line\|pie\|bar` | 聚合数据 |

- 哈希 `algorithm` 默认 `sha256`，支持 md5/sha1/sha256
- 导出 CSV 优先
- 埋点覆盖 `/api/demo/**` 与 `/api/demo/export`，人员维度由后端 mock 元数据

埋点数据模型：`callTime` / `apiName` / `callerId` / `callerName` / `role` / `level` / `dept`

调用统计响应示例：
```json
{ "chartType": "pie", "dimension": "dept",
  "series": [{ "name": "研发部", "value": 8 }, { "name": "产品部", "value": 5 }] }
```

## 5. 后端落点（ArmBasic）

- 新增 `DemoService/` 模块（沿用现仓模块化目录风格：独立目录 + `requirements.txt` + 入口 `*.py`）
- 依赖：`Flask`、`hashlib`（标准库）、`openpyxl`（xlsx 导出）
- 入口 `app.py`：Flask 路由承载 5 个接口 + 埋点中间件 + 内存埋点存储（MVP）

## 6. 前端落点（iMoney-H5）

- 新增路由 `/demo` → `./Demo`（`.umirc.ts` routes 追加一行）
- 新增 `src/pages/Demo/`：`index.tsx`（三 Tab + 导出按钮 + 报表入口）+ `components/`（HelloWorldTab/HashTab/SortTab/ExportButton/MetricsReport）
- 图表库：`echarts`（折线/饼/柱全覆盖），编码阶段引入
- 网络层：`import { request } from '@umijs/max'`，导出接口 `responseType: 'blob'`

## 7. 待确认项（已按默认值定稿）

| 项 | 默认值 |
|----|--------|
| 后端语言 | Python（Flask），不强制 Java |
| 人员维度数据来源 | 后端 mock 人员元数据 |
| 导出格式 | CSV 优先，支持 XLSX |
| 图表库 | echarts |
| 哈希默认算法 | sha256 |
| 埋点范围 | 所有 `/api/demo/**` 与 `/api/demo/export` 均埋点 |

## 8. 设计产物清点

| 产物 | 路径 | 状态 |
|------|------|------|
| 需求澄清设计文档 | `[iMoney-H5] docs/requirements/2026-07-30-demo-and-metrics-clarification.md` | ✅ 本文档 |

> 需求澄清阶段门控：禁止修改代码文件，后端/前端代码均不在本阶段产出。
