# 万源图谱 v2 — 产品需求文档 (PRD)

## Overview
- **Summary**: 一个可探索的网状产业关系图谱。用户从一个节点出发，沿着不同性质的关系（原料供给、设备供给、材料属性延伸等）逐步游走，发现被行业分类和线性叙事遮蔽的真实连接。每条连接都标注可信度与来源，可被反复查证。
- **Purpose**: 解决"真实世界是网状的，但人类讲述世界的方式是树状的"这道落差——让那些从未被同时摆在一起看过的连接，重新变得可以被看见。
- **Target Users**: 对产业结构好奇的人——创业者找方向、投资人看赛道、产品经理解上下游、学生了解行业，以及任何"想知道这玩意还能跟什么扯上关系"的人。

## Goals
- **G1 (核心体验)**：用户能从任意节点出发，沿着不同关系类型逐步探索，5 分钟内至少发现一条他之前不知道的跨行业连接。
- **G2 (可信度)**：每一条连接都有明确的验证状态和可追溯的来源，用户知道哪些是确定的、哪些是待验证的，不会把猜测当事实。
- **G3 (可扩展)**：架构上支持节点量从 20 到 10 万、边量从 0 到 50 万的增长，不需要推倒重来。
- **G4 (数据生产)**：有清晰的数据录入和验证流程，AI 负责搜集候选，人负责判断真假。

## Non-Goals (Out of Scope)
- 不做推荐/评估/价值判断（如"这个方向机会大""那家公司好"）——这些属于分支产品，不是图谱本体
- 不做精确数值级别的材料物性数据库（如熔点、密度精确值）——那是专业材料数据库的领域
- 不做用户系统、权限系统、多人协作工作流（v3 以后再说，v2 阶段用最简单的方式跑通 AI 搜集 + 人工审核）
- 不做实时 AI 生成内容写入图谱本体（所有写入图谱的数据必须可追溯、可重复验证）
- 不爬取商业材料数据库（Total Materia、ASM 等，服务条款禁止）

## Background & Context

### 核心理念
真实世界是网状的。一个具体事物（一家工厂、一种材料）同时连接着多个方向的关系——原料、设备、耗材、产品、资金、人才。但主流信息产品（行业报告、百科、新闻）都用树状/线性方式呈现，导致大量真实存在的连接从未被同时看见。这个项目想做的，就是把那张网如实呈现出来。

### 当前状态
v1 版本存在以下问题，需要推倒重来：
- 数据模型混乱：行业标签写在节点上（违背"节点只回答'这是什么'，归属由关系表达"的原则）
- 关系类型被框死在"只有两类"的框架里（物理流动 vs 材料延伸），没有开放扩展的设计
- 性能架构是"全图加载 + 力导向布局"，节点量稍大就必然卡
- 可信度体系不完善：source_type/evidence 缺失或不规范

### 技术约束
- 前端：Next.js 14 App Router + React 18 + TypeScript + Tailwind CSS
- 图可视化：Cytoscape.js（性能和灵活度的平衡，技术选型清单已确认）
- 数据存储：当前 JSON 文件 → 中期 SQLite → 远期图数据库（按技术选型清单的升级路径）
- 部署：Vercel

### 设计原则
- **渐进式局部展开**：永远不一次性渲染全图。用户聚焦到哪，展开到哪。既是交互原则，也是性能原则。
- **关系类型开放列表**：relation_type 是可扩展的 enum，不是封闭分类。新增关系类型不需要改数据结构。
- **可信度分层**：verified / proposed 二级起步，未来可细化。AI 不做真假判断，人做。
- **数据访问层抽象**：前端/API 不直接读 JSON，通过 DAL（Data Access Layer）访问数据，未来切换存储后端不需要改上层。

## Functional Requirements

### FR-1: 节点系统
- 节点类型：material / process / equipment / product / industry / entity 六种
- 每节点包含：id, name, definition, node_type, stage, parent_type, sources, created_at, updated_at
- 分类学关系通过 parent_type 字段表达（子类/细分类型），不创建边
- 节点有录入阶段：draft（第一阶段最小录入）/ reviewed（第二阶段补充属性和别名）

### FR-2: 关系系统（边）
- 关系类型（开放列表，当前 9 种）：
  - 物理流动供给类：raw_material_for, equipment_for, consumable_for
  - 物理流动泛化类：upstream_of, downstream_of（兜底，过渡用）
  - 加工转化类：can_be_processed_into, made_of
  - 应用类：applied_in
  - 横向相似类：structurally_similar_to
- 每条边包含：id, source, target, relation_type, verification_status, evidence, proposed_by, note, created_at, updated_at
- 验证状态：verified（已验证，至少一条一级来源）/ proposed（有依据但待验证）
- evidence 是 Source 数组，每条有源类型、描述、可选 URL 和获取时间

### FR-3: 搜索与导航
- 节点名称搜索：支持前缀匹配和包含匹配，结果带节点类型标签
- 键盘导航：上下方向键选择、回车确认、ESC 关闭
- 分类学导航：可从子节点跳到父节点，从父节点看到所有子节点

### FR-4: 链路探索（核心交互）
- 从选中节点出发，按指定关系类型 BFS 遍历到指定深度，生成链路视图
- 渐进式展开：默认只显示中心节点 + 直接邻居（深度 1），点击节点展开下一层
- 关系类型切换：同一节点可切换不同关系类型视角，看到完全不同的上下游
- 面包屑导航：记录探索路径，可点击回退

### FR-5: 可信度呈现
- 视觉编码：verified 实线，proposed 虚线 + 橙色
- 边悬停 tooltip：显示关系类型、验证状态、evidence 摘要、来源链接
- 节点详情中关系列表：每条关系标注验证状态圆点
- 画布常驻图例：左下角说明 verified/proposed 含义

### FR-6: 材料属性延伸（特色体验）
- 材料节点有特殊的"材料属性延伸"入口，视觉上与物理流动链明显区分
- 材料延伸视觉模式：紫粉色调背景、粉色连线、材料节点菱形、延伸应用节点圆形
- 材料延伸网可做全局视图（因为材料种类数量有限，性能可承受）

### FR-7: 数据访问层（DAL）抽象
- 定义统一的 GraphDataProvider 接口：getGraphData, getNodeById, searchNodes, getNodeNeighbors, getChainView 等
- 初期实现：JsonDataProvider（读取本地 JSON 文件）
- 接口设计预留 SQLite / 图数据库实现的可能性
- 所有 API 和数据层函数通过 DAL 访问，不直接 import JSON

### FR-8: 数据校验
- 所有写入数据必须通过 schema.json 验证
- 提供 validateGraphData 工具函数
- 节点 ID 唯一性、边的 source/target 必须指向存在的节点等完整性检查

## Non-Functional Requirements

### NFR-1: 性能（面向未来 10 万节点 / 50 万边规模设计）
- 首屏加载 < 1.5s（不含数据的页面骨架）
- 搜索响应 < 200ms（前端搜索 10 万节点内）
- 链路视图生成 < 300ms（深度 3，约 50 个节点）
- 图谱渲染 < 500ms（50 节点以内的链路视图）
- 内存占用：前端常驻数据 < 50MB（10 万节点时）
- 永远不渲染超过 200 个节点的视图（硬限制，防止卡顿）

### NFR-2: 可扩展性
- 新增关系类型不需要改数据结构，只需要新增 enum 值 + 样式
- 切换数据存储（JSON → SQLite → 图数据库）只需新增一个 DataProvider 实现，不影响上层 API 和 UI
- API 接口稳定，前端与数据层解耦

### NFR-3: 可维护性
- 类型定义与 schema.json 严格对应
- 每个函数职责单一，文件不超过 400 行
- 关键模块有清晰的接口边界

### NFR-4: 可靠性
- Cytoscape 实例不泄漏（已验证的崩溃修复模式：isMountedRef + stop + removeAllListeners + destroy）
- 数据加载失败有降级提示和重试
- 找不到节点/关系有友好的空状态

### NFR-5: 可追溯性
- 每一条边都有 verification_status
- verified 边至少有一条 evidence
- proposed 边有 proposed_by 说明提出方式和理由
- 每条 evidence 有 source_type 和 description

## Constraints

### 技术
- 前端框架：Next.js 14 App Router（不可更换，技术选型清单已确认）
- 图可视化：Cytoscape.js（不可更换，技术选型清单已确认）
- 数据存储：当前阶段 JSON 文件，中期 SQLite，远期图数据库（升级路径已确认）

### 业务
- 不做价值判断、不做推荐（属于分支产品范畴）
- AI 不负责判断真假，判断权在人
- 不爬取商业材料数据库

### 依赖
- Cytoscape.js + cytoscape-dagre + dagre（图布局）
- Ajv（schema 验证）
- pdf-parse（年报 PDF 解析，数据采集用）

## Assumptions
- A1: 渐进式局部展开（不渲染全图）可以解决 95% 的性能问题，因为用户一次只会关注一小片区域
- A2: 节点量会快速增长（几千到几万），但大部分节点之间没有直接连接，邻接表存储效率足够
- A3: 材料属性延伸网的节点数量相对有限（几千种材料），做全局视图是可行的
- A4: 用户愿意为"可信度"牺牲一点"丰富度"——宁可少一些连接，也要每条都靠谱
- A5: SQLite 可以支撑 10 万节点 / 50 万边规模的查询性能，到那个量级再考虑图数据库

## Acceptance Criteria

### AC-1: 数据模型与 schema v0.2 严格对齐
- **Given**: 代码库中的类型定义和数据文件
- **When**: 用 schema.json 验证数据文件，并用 TypeScript 编译检查类型
- **Then**: 验证通过，无类型错误；字段名、enum 值、必填项与 schema 完全一致
- **Verification**: `programmatic`
- **Notes**: 包括 Node/Edge/Source 三个核心结构，以及所有子字段

### AC-2: DAL 抽象层存在且可替换
- **Given**: 数据访问层代码
- **When**: 检查所有数据访问是否通过 DAL 接口，API 层和工具函数是否直接 import JSON
- **Then**: 没有任何上层代码直接 import 数据文件，所有数据读写通过 GraphDataProvider 接口
- **Verification**: `programmatic`
- **Notes**: 未来新增 SQLite 实现只需加一个 provider 文件，不改其他代码

### AC-3: 节点浏览体验完整
- **Given**: 用户打开网站
- **When**: 搜索一个节点名称，点击搜索结果
- **Then**: 节点详情面板展示 name、definition、node_type、parent_type、children、sources；sources 可展开查看详情和链接
- **Verification**: `programmatic`（功能存在性）+ `human-judgment`（体验流畅度）

### AC-4: 链路探索体验（核心）
- **Given**: 用户选中一个有多种关系类型的节点（如聚乙烯）
- **When**: 依次切换不同关系类型视角（原料供给、设备供给、材料延伸等）
- **Then**: 每种视角展示不同的上下游节点和边；渐进式展开（点节点展开邻居）；面包屑记录路径可回退
- **Verification**: `programmatic`（功能存在性）+ `human-judgment`（探索流畅度、意外发现感）

### AC-5: 可信度体系可见且可追溯
- **Given**: 图谱画布上有 verified 和 proposed 两种边
- **When**: 用户观察边的样式，悬停边，在节点详情中看关系列表
- **Then**: verified 边为实线，proposed 边为橙色虚线；悬停显示验证状态、evidence 摘要、来源链接；节点详情中每条关系有状态圆点
- **Verification**: `programmatic`（样式存在性）+ `human-judgment`（可信度感知清晰度）

### AC-6: 材料延伸有明显的视觉区分
- **Given**: 用户查看一个材料节点（如聚乙烯）
- **When**: 切换到"材料属性延伸"视角
- **Then**: 画布背景变为紫粉色调，连线为粉色，中心材料节点为菱形，整体氛围与物理流动链明显不同；过渡动画自然
- **Verification**: `human-judgment`
- **Notes**: 核心是"进入了不同视觉空间"的感觉，不只是颜色变化

### AC-7: 性能基准
- **Given**: 1000 节点 / 5000 边的测试数据集
- **When**: 搜索节点（返回 10 条结果）、生成深度 3 的链路视图、渲染 50 节点的图谱
- **Then**: 搜索 < 200ms，链路视图生成 < 300ms，图谱渲染 < 500ms
- **Verification**: `programmatic`
- **Notes**: 当前阶段 20 节点远超标准，此 AC 是为了验证架构方向正确

### AC-8: 数据完整性校验
- **Given**: 数据文件
- **When**: 运行完整性检查（schema 验证 + ID 唯一性 + 边的端点引用存在性）
- **Then**: 所有检查通过
- **Verification**: `programmatic`

### AC-9: 搜索功能
- **Given**: 搜索栏
- **When**: 用户输入关键词
- **Then**: 200ms 内出结果，支持键盘上下选择、回车确认，结果带类型标签
- **Verification**: `programmatic`

### AC-10: 空状态与错误处理
- **Given**: 无节点选中时、搜索无结果时、数据加载失败时
- **When**: 触发各种异常/空状态
- **Then**: 有清晰的提示文案和下一步引导（推荐起始节点、重试按钮等）
- **Verification**: `human-judgment`

## Open Questions

- [ ] **问题 1**：relation_type 是否需要在数据层面增加一个"分组"字段（physical_supply / transformation / application / similarity），还是只在呈现层分组？
  - 影响：数据结构 vs 呈现逻辑的边界
  - 暂定：呈现层分组，数据层只存 relation_type
- [ ] **问题 2**：proposed 边是否需要更细的粒度（如 likely / possible / speculative）？
  - 影响：可信度体系的精细度
  - 暂定：v2 保持二级（verified/proposed），后续根据实际数据量和用户反馈再分
- [ ] **问题 3**：节点 definition 的"权威来源"标准如何统一执行？
  - 影响：数据质量一致性
  - 暂定：有具体来源链接/编号即可，质量靠人工审核逐步提升
- [ ] **问题 4**：SQLite 迁移的触发节点是什么？节点量多少或体验痛点到什么程度？
  - 影响：技术路线图
  - 暂定：节点 > 2000 或 JSON 文件 > 5MB 时启动迁移
