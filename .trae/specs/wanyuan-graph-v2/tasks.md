# 万源图谱 v2 — 实施计划 (Tasks)

## [ ] Task 1: 类型系统与 DAL 抽象层
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 重写 `src/lib/types.ts`，严格对齐 schema.json v0.2：Node / Edge / Source / GraphData 四个核心接口
  - 定义 `GraphDataProvider` 接口，包含所有数据访问方法签名
  - 实现 `JsonDataProvider`（读取本地 JSON 文件）作为初始 provider
  - 所有现有数据访问代码改为通过 provider 接口访问，不再直接 import JSON
  - 关键方法：`getGraphData()`, `getNodeById(id)`, `searchNodes(query)`, `getNodeChildren(parentId)`, `getNodeNeighbors(nodeId, relationType?)`, `getChainView(nodeId, relationType, depth)`, `getNodeChainSummary(nodeId)`
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-1.1: TypeScript 编译无错误，类型定义与 schema.json 字段一一对应
  - `programmatic` TR-1.2: 所有 API 路由和工具函数通过 GraphDataProvider 访问数据，无直接 import JSON 的代码
  - `programmatic` TR-1.3: `getNodeById` / `searchNodes` / `getNodeChildren` 三个基础函数功能正常
- **Notes**: 这是整个重构的地基。DAL 接口设计要考虑未来 SQLite 实现的可能性，方法签名不要太"JSON 味"。

## [ ] Task 2: 节点数据录入与校验工具
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 创建 `src/data/nodes-draft.json`，结构 `{ nodes: [], edges: [] }`
  - 录入 20+ 个 draft 节点，围绕样板路径：
    - 材料类：聚乙烯(PE) + HDPE/LDPE/LLDPE 三个子类、聚丙烯(PP)、乙烯、丙烯
    - 产品类：电池隔膜、塑料杯、包装薄膜、塑料管道、农用薄膜
    - 设备/工艺类：注塑机、注塑工艺、模具、吹膜工艺
    - 行业类：光伏行业、锂电池行业、储能行业、石油化工行业
  - 每个节点必须有：id(type-slug 格式)、name、definition、node_type、stage=draft、parent_type、至少一条 source
  - definition 必须是"这个名称精确指代什么"的定义，不是特性描述
  - 编写 `src/lib/data-validator.ts`：schema 验证 + ID 唯一性 + 边端点引用检查 + parent_type 引用检查
  - 备份：将现有 graph-data.json 和 sample-data.json 移到 scripts/data-collection/output/
- **Acceptance Criteria Addressed**: AC-1, AC-8
- **Test Requirements**:
  - `programmatic` TR-2.1: 运行数据校验工具通过所有检查
  - `programmatic` TR-2.2: 至少 20 个节点，覆盖 5 种以上 node_type
  - `human-judgement` TR-2.3: 随机抽查 5 个节点的 definition，确认是定义而非特性描述
  - `human-judgement` TR-2.4: 每个节点至少有一条可信来源（encyclopedia/standard/official_data）

## [ ] Task 3: API 层重构
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**:
  - 重写 `src/app/api/graph/route.ts`，支持以下查询：
    - `GET /api/graph` → 返回完整图数据（nodes + edges）
    - `GET /api/graph?node={id}` → 返回节点详情 + 子节点列表 + 链路摘要
    - `GET /api/graph?node={id}&chain={relationType}&depth={n}` → 返回链路视图
    - `GET /api/graph/search?q={query}` → 搜索节点（合并到 graph route 或保留独立 search）
  - API 返回格式统一，错误处理完整
  - 删除不再需要的旧 API 路由
- **Acceptance Criteria Addressed**: AC-3, AC-9
- **Test Requirements**:
  - `programmatic` TR-3.1: 三个 API 端点均可正确返回数据
  - `programmatic` TR-3.2: 无效 node id 返回 404，无效参数返回 400
  - `programmatic` TR-3.3: 搜索接口响应时间 < 200ms（20 节点规模下）

## [ ] Task 4: 搜索栏与节点详情面板
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - 重写 `src/components/SearchBar.tsx`：
    - 搜索结果显示节点名称 + 节点类型标签（颜色区分）
    - 支持键盘上下选择、回车确认、ESC 关闭
    - 搜索逻辑调用 API 或本地 searchNodes
  - 重写 `src/components/NodeDetail.tsx`：
    - 展示节点基本信息：name、node_type 标签、definition
    - 分类学关系：父节点（可点击跳转）、子节点列表（可点击跳转）
    - 来源列表：每条 source 显示类型图标 + description + url（可点击）
    - 关系链路口：按 relation_type 分组的链路摘要标签（当前阶段无数据时显示"暂无关系数据"）
    - stage 标识（draft/reviewed）
  - 节点类型颜色映射：material=#00B42A, process=#FF7D00, equipment=#722ED1, product=#0FC6C2, industry=#165DFF, entity=#86909C
- **Acceptance Criteria Addressed**: AC-3, AC-9, AC-10
- **Test Requirements**:
  - `programmatic` TR-4.1: 搜索功能正常，结果带类型标签
  - `programmatic` TR-4.2: 节点详情展示所有必要字段，父/子节点可点击跳转
  - `human-judgement` TR-4.3: 来源列表清晰，可点击跳转至来源 URL
  - `human-judgement` TR-4.4: 整体排版清晰，信息层级合理

## [ ] Task 5: GraphCanvas 重构（渐进式局部展开）
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - 重写 `src/components/GraphCanvas.tsx`，核心改为"渐进式局部展开"：
    - 初始显示中心节点 + 直接邻居（深度 1）
    - 点击邻居节点，展开该节点的直接邻居（深度 +1）
    - 支持指定关系类型过滤边
    - 中心节点尺寸更大，位置居中
  - 保留 isMountedRef 守卫 + 完整 cleanup 模式（防崩溃）
  - 注册 cytoscape-dagre，使用 dagre 布局（LR 方向，上游在左下游在右）
  - 更新 cytoscape-config.ts：
    - 节点颜色按 node_type 区分
    - verified 边：实线，width 3px，颜色按 relation_type
    - proposed 边：虚线 dash-pattern [8,6]，width 2px，橙色 #FF7D00
    - 边 tooltip：悬停显示关系类型、验证状态、evidence 摘要
  - 点击节点触发 onNodeSelect 回调
- **Acceptance Criteria Addressed**: AC-4, AC-5, AC-7
- **Test Requirements**:
  - `programmatic` TR-5.1: 初始渲染中心节点 + 直接邻居，不渲染全图
  - `programmatic` TR-5.2: 点击邻居节点可展开下一层
  - `programmatic` TR-5.3: verified/proposed 边样式区分正确
  - `human-judgement` TR-5.4: dagre 布局合理，节点不重叠，方向正确
  - `human-judgement` TR-5.5: 边悬停 tooltip 信息完整、不遮挡内容

## [ ] Task 6: 主页面交互整合
- **Priority**: high
- **Depends On**: Task 4, Task 5
- **Description**:
  - 重写 `src/app/page.tsx` 交互逻辑：
    - 初始状态：搜索栏 + 引导文案 + 推荐起始节点（3-5 个）
    - 选中节点 → 显示节点详情面板 + 画布显示该节点 + 直接邻居
    - 切换关系类型 → 画布刷新为该关系类型下的链路视图
    - 点击画布中的节点 → 该节点成为新中心，详情面板更新
    - 面包屑导航：记录探索路径（节点名 + 关系类型），可点击回退
  - 可信度图例：画布左下角固定，说明 verified/proposed 含义
  - 空状态处理：无数据时显示"第一阶段：节点录入中"提示
  - 推荐起始节点：空状态下显示 3 个不同类型的推荐节点按钮
- **Acceptance Criteria Addressed**: AC-3, AC-4, AC-5, AC-10
- **Test Requirements**:
  - `programmatic` TR-6.1: 完整的探索流程：搜索 → 选节点 → 切关系 → 点邻居 → 面包屑回退
  - `programmatic` TR-6.2: 可信度图例常驻画布左下角
  - `human-judgement` TR-6.3: 整体交互流畅，状态切换无卡顿
  - `human-judgement` TR-6.4: 推荐起始节点引导清晰

## [ ] Task 7: 材料属性延伸视觉模式
- **Priority**: medium
- **Depends On**: Task 6
- **Description**:
  - 录入材料延伸边：聚乙烯 → 电池隔膜/包装薄膜/塑料管道/农用薄膜（applied_in 或 can_be_processed_into）
  - 在 GraphCanvas 中实现材料延伸视觉模式：
    - 背景：紫粉色调渐变（中心 #1a1530 → 边缘 #0a0510）
    - 连线：粉色 #EB2F96
    - 中心材料节点：70px，菱形或六边形
    - 延伸应用节点：圆形，带粉色光晕（overlay-color + overlay-opacity）
    - 切换时过渡动画：淡出 → 切换 → 淡入（300ms）
  - 节点详情面板中的材料延伸入口：
    - 仅 material 类型节点显示
    - 粉色左边框 + 半透明粉色背景 + 独立卡片
    - 标题旁小字说明"基于材料底层属性的潜在应用延伸"
  - 更新 chain_types / 关系类型配置，增加材料延伸的展示名称和颜色
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `programmatic` TR-7.1: 材料节点详情中显示材料延伸入口
  - `programmatic` TR-7.2: 切换到材料延伸视角时，画布样式变化
  - `human-judgement` TR-7.3: 视觉区分明显，有"进入不同空间"的感觉
  - `human-judgement` TR-7.4: 过渡动画自然流畅

## [ ] Task 8: 引导页与体验打磨
- **Priority**: medium
- **Depends On**: Task 6, Task 7
- **Description**:
  - 更新 `src/components/IntroOverlay.tsx`：
    - 介绍物理流动链概念（一个节点，多种链路视角）
    - 介绍材料属性延伸概念（材料底层属性 → 意想不到的应用）
    - 介绍可信度标注体系（已验证/待验证）
    - 说明当前处于节点录入阶段
  - 推荐起始节点优化：覆盖不同类型（材料/行业/设备），每个有一句话说明"从这里开始探索什么"
  - 节点详情面板底部增加"直接关联关系"列表（当边数据存在时）
  - 错误边界：API 请求失败时有重试按钮和友好提示
- **Acceptance Criteria Addressed**: AC-3, AC-10
- **Test Requirements**:
  - `programmatic` TR-8.1: 引导页文案包含三个核心概念
  - `human-judgement` TR-8.2: 新人首次打开，不看讲解也能猜出怎么用
  - `human-judgement` TR-8.3: 错误状态有明确提示和恢复路径

## [ ] Task 9: 性能验证与构建
- **Priority**: high
- **Depends On**: Task 8
- **Description**:
  - 运行 `npm run build` 确保构建通过
  - 创建性能测试脚本（可选）：模拟 1000 节点数据，验证搜索和链路边际性能
  - Lighthouse 性能检测（首屏、交互）
  - 检查 Cytoscape 无内存泄漏（热重载不崩溃）
  - 清理无用文件和代码（旧的 v1 废弃组件、工具函数）
- **Acceptance Criteria Addressed**: AC-7, AC-8
- **Test Requirements**:
  - `programmatic` TR-9.1: `npm run build` 成功，0 error 0 warning（或已知可接受 warning）
  - `programmatic` TR-9.2: 无未使用的 import 和变量（TypeScript strict 模式）
  - `human-judgement` TR-9.3: 开发模式下热重载 5 次以上，Cytoscape 不崩溃
