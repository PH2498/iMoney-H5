# Spec: add-employee-dashboard

## Requirement: 人员看板列表

### Scenario: 查看员工列表

- **Given** 用户进入「人员」看板
- **When** 页面加载完成
- **Then** 显示员工卡片列表，每张卡片含姓名、工号、部门、状态（在职/离职）
- **And** 列表支持关键词搜索（匹配姓名或工号）
- **And** 列表支持按状态过滤（全部/在职/离职）
- **And** 列表支持上拉加载更多（分页，默认每页 20 条）

### Scenario: 空列表

- **Given** 无任何员工数据
- **When** 用户打开看板
- **Then** 显示空状态提示「暂无人员，点击新增或批量导入」

## Requirement: 员工增删改查

### Scenario: 新增员工

- **Given** 用户在看板点击「新增」
- **When** 填写姓名、工号（必填）及其他选填项并提交
- **Then** 校验通过后创建员工，返回列表并显示新卡片
- **And** 工号已存在时，提示「工号重复」，阻止创建

### Scenario: 编辑员工

- **Given** 用户点击某员工卡片进入详情
- **When** 修改字段并保存
- **Then** 更新成功，列表对应卡片刷新

### Scenario: 删除员工（软删除）

- **Given** 用户在员工详情点击「删除」
- **When** 确认删除
- **Then** 员工状态置为 `deleted`，`deletedAt` 记录时间
- **And** 该员工不再出现在默认列表中（状态过滤排除 deleted）
- **And** 该员工关联的历史成本预算记录保留（不级联物理删除）

### Scenario: 必填项缺失

- **Given** 新增/编辑时
- **When** 姓名或工号为空提交
- **Then** 表单校验失败，阻止提交并标注错误字段

## Requirement: 批量导入

### Scenario: 下载导入模板

- **Given** 用户在导入弹层
- **When** 点击「下载模板」
- **Then** 下载 CSV 文件，首行为中文字段名：`工号,姓名,部门,职位,手机号,入职日期`

### Scenario: 导入成功

- **Given** 用户选择符合模板的 CSV 文件
- **When** 点击「开始导入」
- **Then** 解析并逐行校验
- **And** 展示结果：成功条数与失败明细（行号 + 原因）
- **And** 成功的员工出现在列表中

### Scenario: 导入失败明细

- **Given** 导入文件含错误行
- **When** 导入完成
- **Then** 失败明细列出每条：行号、原因（如「工号重复」「姓名为空」「手机号格式错误」「入职日期格式错误」）
- **And** 成功行仍入库，失败行不阻塞整体导入

## Requirement: 成本预算记录

### Scenario: 录入成本预算

- **Given** 员工在成本白名单内（enabled=true）
- **When** 用户在员工详情录入成本类别、金额（>=0）、周期
- **Then** 创建成本预算项成功，金额保留两位小数

### Scenario: 白名单拦截

- **Given** 员工未加入成本白名单或 enabled=false
- **When** 用户尝试录入成本预算
- **Then** 拦截提交并提示「该员工不在成本预算白名单内，无法录入成本」

### Scenario: 金额非法

- **Given** 录入成本
- **When** 金额为负数或非数字
- **Then** 校验失败，提示「金额必须为非负数字」

## Requirement: 成本预算白名单

### Scenario: 加入白名单

- **Given** 用户在员工卡片/详情操作白名单开关
- **When** 开启白名单
- **Then** 该员工 `enabled=true`，可录入成本
- **And** 可选填写该员工成本上限 `maxAmount`

### Scenario: 移出白名单

- **Given** 员工在白名单内
- **When** 关闭白名单开关
- **Then** `enabled=false`，后续成本录入被拦截
- **And** 已存在的成本预算记录保留

## Requirement: 入口与导航

### Scenario: 进入人员看板（方案 A）

- **Given** 底部 Tab 含「人员」
- **When** 点击「人员」Tab
- **Then** 路由至 `/employee`，展示看板列表
- **And** 底部 Tab 高亮「人员」

### Scenario: 进入新增/编辑

- **Given** 用户在看板
- **When** 点击「新增」或某卡片
- **Then** 进入 `/employee/detail/:id?`，空 id 为新增，有 id 为编辑

### Scenario: 跨仓契约兼容（向后兼容）

- **Given** iMoney 小程序未来接入同一后端
- **When** 调用 design.md 列出的 `/api/employees*` 与 `/api/budget*` 端点
- **Then** 契约仅含本提案新增字段/接口，不依赖对既有字段的破坏性修改
