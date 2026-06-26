# 万源图谱 — 数据层完整设计

## Overview

- **Summary**: 设计万源图谱完整数据层架构，覆盖从数据采集、清洗消歧、关系处理、验证存储到数据访问的全链路。建立可持续运转的数据生产管线，而非一次性处理脚本。当前928个节点/319条边是这套管线首次跑通的验证数据集，未来节点量级从数百扩展到十万时架构无需推倒重来。
- **Purpose**: 解决当前数据流水线中实体命名混乱、去重简陋、关系处理粗糙、产业链视角缺失、验证器备而不用、最后一公里手动复制等问题，为即将设计完成的交互层（主链横向排布+支链悬挂+跨链视角切换+语境敏感命名）提供完整、可靠、可扩展的数据基础。
- **核心原则**:
  1. **权威是判词不是判据**——国家级/权威机构有明确表述时直接按判词执行，人工审核是核查执行是否忠实于权威来源，而非重新做决定。
  2. **数据层与渲染层分离**——数据层只回答"是什么"（节点、关系、命名、归属），渲染层决定"怎么放"（坐标、动画、视觉样式），两者通过清晰的DAL接口契约对接。
  3. **边不挂chains**——同一条边在不同产业链视角下主轴/支链角色不同，角色由渲染层根据ChainDef动态判定，不静态写入数据。
  4. **dry-run优先，人工确认后apply**——所有自动化处理先输出建议，强制备份后才能写入，支持回滚。
  5. **分层验证**——Schema校验、引用完整性、语义一致性、流向无环，层层把关。

---

## Goals

- **G1 实体消歧准确**: 同物异名节点被合并，同名异义节点被区分，判定依据可追溯到权威来源。
- **G2 命名分层完备**: 建立通用锚点名(name) + 等价别名(aliases) + 分产业链语境名(contextual_names)三层命名，同一节点在不同产业链视角下自动显示该链约定俗成的名称。
- **G3 产业链归属明确**: 每个节点标注所属链(chains)和主链(primary_chain)；关系类型有明确流向(upstream_to_downstream/downstream_to_upstream/horizontal)，支撑横向主轴布局。
- **G4 流水线可持续运转**: 一键命令从爬取到输出完整流程，支持新增数据源增量更新，不重做全量。
- **G5 数据质量有保障**: Schema校验、引用完整性、语义一致性、流向无环四层验证自动运行；validator不再备而不用。
- **G6 审计可追溯**: 所有自动化决策有日志、有依据，合并可回滚，人工审核修改有据可查。
- **G7 交互数据就绪**: DAL层为渲染层提供产业链视图查询、语境敏感命名、多名称搜索、主轴/支链邻居遍历等完整接口，等交互方案完成后可直接对接。

## Non-Goals（本次不做）

- 不实现3D布局算法、视角切换动画、标签动态显示等渲染层逻辑（数据层准备好数据和接口，渲染层实现）。
- 不实现用户系统/多人协作审核UI（审核通过编辑JSON/Markdown文件完成）。
- 不迁移到SQLite/图数据库（当前JSON文件够用，架构预留迁移点）。
- 不爬取商业数据库（Total Materia等服务条款禁止）。
- 不做数据写入UI/节点管理后台（v2阶段通过脚本+文件管理，后续版本考虑）。

---

## 现状分析（2026-06-26实测）

### 现有流水线

```
数据源层 (data/raw/)                    处理层                  输出层
┌─────────────────────┐
│ stats-gov-crawler   │───→ stats-gov-industries.json
│ gb-standards-crawler│───→ gb-standards.json
│ cninfo-crawler      │───→ cninfo-result.json
│ extract-edges-from- │───→ gb-extracted-edges.json
│   standards.ts      │
│ (手动)              │───→ pv-industry-chain.json
│ (JS脚本)            │───→ battery-industry-chain.json
│ (手动)              │───→ material-industry-chain.json
└─────────────────────┘          │
                                 ▼
                       merge-data.ts
                       (质量过滤→ID去重→
                        parent_type修复→
                        层级边生成→draft合并)
                                 │
                                 ▼
                     data/processed/merged-graph-data.json
                                 │
                            (手动cp) ← ⚠️ 最后一公里断裂
                                 │
                                 ▼
                     src/data/graph-data.json
                                 │
                                 ▼
                     JsonDataProvider (DAL)
                                 │
                            ┌────┴────┐
                            ▼         ▼
                        前端组件    /api/graph/*（存在但未被使用）
```

### 现有问题清单

| # | 问题 | 严重程度 | 位置 |
|---|------|---------|------|
| P1 | 去重仅按ID精确匹配，无法识别"锂离子电池"vs"锂电池"这类近似重复 | 高 | utils.ts deduplicateNodes |
| P2 | 无实体消歧机制，同物异名导致节点分裂、边断裂 | 高 | 不存在 |
| P3 | 无产业链归属(chains/primary_chain)，无法表达"同一节点在不同产业链视角" | 高 | 不存在 |
| P4 | 无contextual_names体系，节点只有一个name，无法支持跨链名称变化 | 高 | 不存在 |
| P5 | 关系类型无流向定义，布局时无法判断"source在左还是右" | 高 | 不存在 |
| P6 | 数据验证器(data-validator.ts)完备但merge-data.ts未调用，备而不用 | 中 | merge-data.ts |
| P7 | 最后一公里需要手动cp到src/data/，易遗漏 | 中 | 缺失自动化 |
| P8 | 无增量更新机制，每次全量重跑全量合并 | 中 | 不存在 |
| P9 | 边的处理粗糙：层级边生成硬编码relation_type映射，无流向验证 | 中 | merge-data.ts generateBasicEdges |
| P10 | 重复边处理简单（同source-target-type去重），不合并evidence/不处理跨来源冲突 | 中 | utils.ts deduplicateEdges |
| P11 | 无ChainDef定义，产业链概念隐式存在于数据文件名中 | 中 | 不存在 |
| P12 | 无merged_into/merged_from等合并追溯字段，误合不可逆 | 高 | 不存在 |
| P13 | DAL(JsonDataProvider)不支持按产业链查询、不支持contextual_names搜索、不支持关系流向 | 高 | graph-data.ts |
| P14 | API路由(/api/graph)存在但前端直接import JSON，API未被消费 | 低 | route.ts/SearchBar |
| P15 | 无备份/回滚机制 | 中 | 不存在 |

### 当前数据现状

- 总节点928（industry:94, product:671, material:147, equipment:14, process:2）
- 总边319条
- 有aliases的节点79个（基本是统计局行业代码别名C/26/38等）
- 简单名称包含检测发现疑似重复124组（大部分实际是父子关系）
- 数据来源：3个自动爬虫 + 1个国标边提取脚本 + 3个人工/半自动产业链JSON

---

## 架构总览

### 目标流水线

```
┌─────────────────────────────────────────────────────────────┐
│                    数据源层 (Data Sources)                    │
│  Crawlers(自动爬取)  │  Manual/Chains(人工/半自动)  │  Future │
│  - stats-gov         │  - pv_chain.json            │  - 海关 │
│  - gb-standards      │  - battery_chain.json       │  - 专利 │
│  - cninfo            │  - material_chain.json      │  - 百科 │
│                      │  - 专家贡献/用户提交          │  - ...  │
└──────────────┬──────────────────────┬───────────────────────┘
               │ 输出统一CrawlResult格式
               ▼
┌─────────────────────────────────────────────────────────────┐
│                    原始数据层 (Raw Data Store)                │
│  data/raw/*.json  (按来源分文件，保留爬取原始形态)              │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  节点处理管线 (Node Pipeline)                 │
│  N1 名称规范化 → N2 候选重复检测 → N3 权威来源验证            │
│  N4 实体消歧决策 → N5 命名分层(name/aliases/contextual_names)│
│  N6 产业链归属(chains/primary_chain) → N7 撞名检测           │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  边处理管线 (Edge Pipeline)                   │
│  E1 关系提取(从parent_type/来源/规则)                        │
│  E2 关系流向标注(RELATION_FLOW)                              │
│  E3 重复边合并(跨来源evidence合并, 冲突标记)                  │
│  E4 关系验证(端点存在/流向合理/无冗余反向边)                  │
│  E5 边的产业链归属推断（动态，不写入字段）                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    验证层 (Validation)                        │
│  V1 Schema校验 → V2 引用完整性 → V3 语义一致性               │
│  V4 流向无环检测(主轴关系) → V5 撞名/冲突报告                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  决策与审核层 (Review)                        │
│  - 自动决策报告(auto-decisions.json)                         │
│  - 人工审核报告(review-report.md)                            │
│  - 决策修改（编辑auto-decisions.json）                       │
└──────────────────────────────┬──────────────────────────────┘
                               │ 确认后 --apply
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  应用层 (Apply)                              │
│  A1 强制备份 → A2 节点合并/父子设置/不重复标记               │
│  A3 边迁移/合并 → A4 命名分层填充 → A5 产业链归属写入        │
│  A6 再次通过全部验证 → A7 输出                               │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  数据存储层 (Data Store)                      │
│  src/data/graph-data.json  （生产数据，前端直接import）       │
│  data/backup/              （备份，支持回滚）                 │
│  data/processed/           （中间产物）                       │
│  logs/                     （变更日志）                       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              数据访问层 DAL (GraphDataProvider)               │
│  - 节点CRUD/查询                                             │
│  - 产业链视图查询(getChainLayout/getMainAxis/getBranches)    │
│  - 语境敏感命名(getDisplayName)                              │
│  - 多名称搜索(matchesSearch/sortSearchResults)               │
│  - 邻居/父子/关系查询                                        │
│  - ID重定向(resolveNodeId 处理merged节点)                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              API层 / 渲染层（API已存在，渲染层待交互设计）     │
│  /api/graph         全量数据                                  │
│  /api/graph/search  搜索                                      │
│  React 3D Components (GraphScene/GraphNode3D/...)           │
└─────────────────────────────────────────────────────────────┘
```

---

## 数据模型设计

### 扩展后的完整类型定义

修改 [src/lib/types.ts](file:///workspace/src/lib/types.ts)：

#### NodeStage 扩展

```typescript
export type NodeStage = 'draft' | 'reviewed' | 'merged';
// 新增 'merged'：节点已被合并到其他节点，保留ID用于重定向
```

#### SourceType 扩展

```typescript
export type SourceType =
  | 'patent'
  | 'standard'           // 国家标准（判词级）
  | 'stats_gov'          // 国家统计局（判词级）
  | 'industry_report'
  | 'news'
  | 'expert_interview'
  | 'official_data'      // 官方数据（海关、政府公报等，判词级）
  | 'encyclopedia'
  | 'cninfo'             // 上市公司公告（线索级）
  | 'ai_suggested'       // AI/LLM建议（仅供参考，不构成证据）
  | 'other';
```

> 来源可信度分层：判词级（standard/stats_gov/official_data）> 高可信（patent/industry_report）> 线索级（cninfo/news/encyclopedia/other）> 参考级（ai_suggested）。

#### RelationFlow（新增）

```typescript
export type RelationFlow = 'upstream_to_downstream' | 'downstream_to_upstream' | 'horizontal';
```

语义：
- `upstream_to_downstream`: source是target的上游（A是B的原料 → A在左，B在右）
- `downstream_to_upstream`: source是target的下游（A由B构成 → B在左，A在右）
- `horizontal`: 横向相似/并行关系，不进入产业链主轴，不产生上下游方向

默认关系流向表（在chains.ts中定义）：

```typescript
export const RELATION_FLOW: Record<RelationType, RelationFlow> = {
  raw_material_for: 'upstream_to_downstream',       // 原料→产品
  can_be_processed_into: 'upstream_to_downstream',  // 原料→加工产物
  upstream_of: 'upstream_to_downstream',            // 上游→下游
  applied_in: 'upstream_to_downstream',             // 材料/技术/组件→应用领域（应用是下游方向）
  made_of: 'downstream_to_upstream',                // 成品←构成材料
  equipment_for: 'downstream_to_upstream',          // 装备←被服务主体
  consumable_for: 'downstream_to_upstream',         // 耗材←被服务工艺
  downstream_of: 'downstream_to_upstream',          // 下游←上游
  structurally_similar_to: 'horizontal',            // 横向相似，不进入主轴
};
```

> **⚠️ 决策点**: applied_in默认流向为upstream_to_downstream，基于"A应用于B"语义判断A是B的输入/装备，B是A的去向。ChainDef中可覆盖此默认值。made_of/equipment_for/consumable_for为反向，因为三者的source都是成品/主体，target是原料/设备/耗材。

#### Alias 扩展

```typescript
export interface Alias {
  term: string;
  context?: string;   // 使用该别名的宽泛语境（"日常口语""台湾地区叫法""行业简称"，不是chain_id）
  note?: string;
  source?: Source;    // 该别名的来源依据（扩展：原无source，现补上）
}
```

#### ContextualName（新增）

```typescript
export interface ContextualName {
  term: string;       // 该产业链视角下节点的显示名称
  chain_id: string;   // 所属产业链ID
  note?: string;      // 如"行业内常用大类名代指，热塑性树脂实际包含PE/PP/PVC等"
  source?: Source;    // 该叫法的来源依据
}
```

**约束**：
1. 一个节点在同一chain_id下最多一个contextual_name（该链唯一主显示名）。
2. 若某chain下显示名就是name本身，不冗余存储contextual_name（name是默认回退）。
3. aliases存完全等价叫法（任何语境可互换），contextual_names是语境相关显示名（切换视角时变化）。
4. 同一产业链内存在的其他叫法（非主显示名的俗称）放入aliases，alias.context标注使用范围。

#### GraphNode 扩展

```typescript
export interface GraphNode {
  id: string;
  name: string;                      // 通用锚点名（最短、最无歧义、跨行业通用）
  definition: string;
  node_type: NodeType;
  stage: NodeStage;                  // draft | reviewed | merged（新增merged）
  parent_type: string | null;

  aliases?: Alias[];                 // 完全等价别名（缩写、俗名、简称）
  contextual_names?: ContextualName[];  // 特定产业链视角下的显示名称
  chains?: string[];                 // 该节点出现在哪些产业链
  primary_chain?: string;            // 主产业链ID（默认展开视角、搜索优先）
  merged_from?: string[];            // 主节点：吸收了哪些被合并节点
  merged_into?: string;              // 被合并节点：被合并到了谁

  attributes?: NodeAttributes;
  description?: string;
  sources?: Source[];
  created_at: string;
  updated_at: string;
}
```

#### GraphEdge 保持结构，但语义明确

Edge不加chains字段。边的"主轴/支链角色"是视角相关的，由渲染层根据ChainDef动态判定。

但需要明确Edge的两个语义细节：

1. **source/target的方向语义**：由relation_type的RELATION_FLOW决定。不是所有边都是source→target=上游→下游，made_of/equipment_for/consumable_for/downstream_of是反向边。
2. **evidence合并**：同一对节点、同一relation_type来自不同数据源时，evidence数组做并集，不丢弃任何来源。

```typescript
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation_type: RelationType;
  verification_status: VerificationStatus;
  evidence?: Source[];
  proposed_by?: ProposedBy;
  note?: string;
  created_at: string;
  updated_at: string;
  // 注意：不加chains字段
}
```

### ChainDef 产业链定义（新增 src/lib/chains.ts）

```typescript
export interface ChainRelation {
  type: RelationType;
  flow?: RelationFlow;  // 不填使用RELATION_FLOW默认值
}

export interface ChainDef {
  id: string;
  name: string;
  description: string;
  main_axis_relations: (RelationType | ChainRelation)[];  // 构成横向主轴的关系
  branch_relations: (RelationType | ChainRelation)[];     // 构成支链的关系
  primary_axis?: 'x' | 'y' | 'z';                         // 主轴方向，默认'x'
  root_node_id?: string;                                  // 链的入口/根节点
  branch_depth?: number;                                  // 支链可见跳数，默认1
  is_viewable?: boolean;                                  // 是否作为UI视角列表中可切换项
}
```

预置产业链定义：

| chain_id | 名称 | is_viewable | 说明 |
|----------|------|-------------|------|
| `pv_chain` | 光伏产业链 | true | 从工业硅到光伏电站 |
| `battery_chain` | 电池储能产业链 | true | 从矿产到电池系统与储能应用 |
| `material_chain` | 材料属性延伸链 | true | 基于结构相似和跨领域应用的横向材料网 |
| `stats_gov` | 国家统计局分类 | false | 判词来源，不做视角切换 |
| `gb_standard` | 国家标准术语 | false | 判词来源，不做视角切换 |

预置CHAIN_DEFS初版：

```typescript
export const CHAIN_DEFS: Record<string, ChainDef> = {
  pv_chain: {
    id: 'pv_chain',
    name: '光伏产业链',
    description: '从工业硅到光伏电站的光伏产业链条',
    main_axis_relations: ['raw_material_for', 'can_be_processed_into', 'upstream_of', 'downstream_of'],
    branch_relations: ['applied_in', 'equipment_for', 'consumable_for', 'structurally_similar_to', 'made_of'],
    primary_axis: 'x',
    branch_depth: 1,
    is_viewable: true,
  },
  battery_chain: {
    id: 'battery_chain',
    name: '电池储能产业链',
    description: '从矿产资源到电池系统与储能应用',
    main_axis_relations: ['raw_material_for', 'can_be_processed_into', 'made_of', 'downstream_of', 'upstream_of'],
    branch_relations: ['applied_in', 'equipment_for', 'consumable_for', 'structurally_similar_to'],
    primary_axis: 'x',
    branch_depth: 1,
    is_viewable: true,
  },
  material_chain: {
    id: 'material_chain',
    name: '材料属性延伸链',
    description: '基于材料结构相似性和跨领域应用的横向材料网络',
    main_axis_relations: [
      'structurally_similar_to',
      { type: 'applied_in', flow: 'upstream_to_downstream' },
      'can_be_processed_into',
    ],
    branch_relations: ['raw_material_for', 'made_of', 'equipment_for'],
    primary_axis: 'x',
    branch_depth: 1,
    is_viewable: true,
  },
  stats_gov: {
    id: 'stats_gov',
    name: '国家统计局分类',
    description: 'GB/T 4754-2017 国民经济行业分类',
    main_axis_relations: [],
    branch_relations: [],
    is_viewable: false,
  },
  gb_standard: {
    id: 'gb_standard',
    name: '国家标准术语',
    description: 'GB标准中的正式术语名称',
    main_axis_relations: [],
    branch_relations: [],
    is_viewable: false,
  },
};
```

### Schema验证更新

[schema.json](file:///workspace/schema.json) 需要同步更新：
- NodeStage枚举增加"merged"
- GraphNode增加aliases/contextual_names/chains/primary_chain/merged_from/merged_into字段
- SourceType枚举增加stats_gov/cninfo/ai_suggested
- 增加ContextualName定义
- Alias增加可选source字段

---

## 数据处理流水线详细设计

### 流水线总览

整个处理流程通过一个CLI命令驱动：

```bash
# 完整pipeline（爬取→处理→验证→输出报告，不修改生产数据）
npm run pipeline              # 默认dry-run
npm run pipeline -- --web     # 启用联网验证
npm run pipeline -- --apply   # 审核完成后应用
npm run pipeline -- --no-crawl # 跳过爬取，仅处理现有raw数据

# 单独运行某阶段（调试用）
npm run pipeline:crawl        # 仅爬取
npm run pipeline:process      # 仅处理（节点+边）
npm run pipeline:validate     # 仅验证
npm run pipeline:apply        # 应用已审核决策
npm run pipeline:rollback -- --run=2026-06-26-143000  # 回滚
```

每次pipeline运行分配一个run_id（时间戳），所有输出归档在`data/runs/{run_id}/`下。

### 阶段0：爬取（Crawl Stage）

**职责**：调度所有已注册爬虫，输出规范化的CrawlResult到data/raw/。

**现有爬虫改造**：
- 三个现有爬虫（stats-gov-crawler、gb-standards-crawler、cninfo-crawler）保持基本逻辑不变
- 统一实现`CrawlerSource`接口，注册到crawler registry
- 每个爬虫输出带metadata（source名称、爬取时间、记录数）的CrawlResult
- 支持--no-crawl跳过（使用已有raw数据）

**手动数据接入规范**：
- 手动编写的产业链JSON（pv/battery/material_chain）需符合CrawlResult格式
- 在metadata.source中标注"manual"或"generated"来源
- 推荐命名规范：`{chain_id}-chain.json`

**CrawlerSource接口（新增）**：
```typescript
interface CrawlerSource {
  name: string;                    // 数据源标识
  type: 'auto' | 'manual' | 'generated';
  outputFile: string;              // 输出到data/raw/的文件名
  run(): Promise<CrawlResult>;     // 执行爬取/生成
}
```

### 阶段N：节点处理管线（Node Pipeline）

#### N1 名称规范化（name-normalizer.ts）

生成norm_name仅用于比对，不修改原name。规则：
1. 全角→半角（Ａ→A，（→(，％→%，全角数字→半角）
2. 去除首尾/多余空白，统一标点
3. 繁简转换（如有）
4. 英文大小写统一（PE不写成pe）
5. 识别并标记**文档性质后缀**（不剥离，仅标记）：规范、总规范、通用技术条件、技术条件、试验方法、分类、测定方法、的测定、通用要求、技术要求等。含这些后缀且source_type是standard的节点，标记为`is_document_title`。

输出：每个节点附带一个`norm_name`和`is_document_title`标志，供后续阶段使用。

#### N2 候选重复对检测（candidate-detector.ts）

**仅在node_type相同的节点间比较**，跨类型不比较。

多策略加权打分：

| 策略 | 权重 | 触发条件 |
|------|------|---------|
| norm_name完全相等 | 1.0 | 规范化后完全相同 |
| 别名反向命中（A.name ∈ B.aliases 或反之） | 0.95 | |
| 编辑距离Levenshtein ≥ 0.8 + 长度差≤3 | 0.7 | 短文本简称/全称 |
| 子串包含+同类型+长度差≤4 | 0.6 | "锂电池"⊂"锂离子电池" |
| 共同邻居Jaccard ≥ 0.7 + 同类型 | 0.5 | 语义相似 |
| slugify ID相同/高度相似 | 0.4 | ID生成导致的重复 |

置信度分级：
- ≥0.85 → 高置信度
- 0.6~0.85 → 中置信度
- <0.6 → 不进入候选

对高置信度候选还要做**父子关系预过滤**：如果名称A = "[常见修饰词]"+B，且修饰词是技术路线/规格/应用场景修饰（晶体硅、单/多晶、车用、储能用、地面用、薄膜、柔性、高密度等），降权为parent_child候选而非merge候选。

#### N3 权威来源验证（authority-verifier.ts，核心判词阶段）

⚠️ **国家级/权威来源是判词，有明确表述时直接出结论。**

判词表：

| 场景 | 判词来源 | 自动结论 |
|------|---------|---------|
| 两名称在**同一国标/统计局**中被等同标注（"X又名Y""X简称Y""X俗称Y"） | standard/stats_gov原文 | **merge**，记录条文为source |
| 两名称在**国标/统计局**中被列为不同条目/不同代码 | standard/stats_gov | **not_duplicate** |
| 两名称在**国标/统计局**中明确层级包含（大类→小类） | standard/stats_gov | **parent_child**，设parent_type |
| 2+独立权威源指向"是同一实体" | 多源交叉 | 高置信度**merge** |
| 不同权威来源结论矛盾 | 权威冲突 | **manual_review**，列各方依据 |
| 权威来源未覆盖 | 无判词 | 候选进入manual_review |
| is_document_title节点，剥离后缀后匹配到其他实体 | standard | 建议**merge**，原全名作为gb_standard的contextual_name；剥离后无匹配且无definition → 建议**降级为source引用**（review） |

关键子流程：

**父子关系排除**：
- 候选对中已有parent_type指向对方 → parent_child
- 国标/统计局分类树明确上下级 → parent_child
- 名称是"[技术修饰词]+[基础名]"结构且修饰词是已知技术路线词 → parent_child优先

**文档名处理**：
- is_document_title=true的standard来源节点：
  - 剥离文档后缀后匹配 → merge建议（全名进gb_standard contextual_name）
  - 剥离后无匹配且definition<5字 → review（可能应降级为source）

#### N4 联网验证（web-verifier.ts，可选）

触发条件：有网络+配置了相关环境变量。

| 数据源 | 用途 | 可信度 |
|--------|------|--------|
| openstd.samr.gov.cn 国标全文系统 | 查询标准术语定义 | 判词级（standard） |
| 海关总署/商务部官网 | 商品名称/税号对应关系 | 判词级（official_data） |
| 百度百科/维基百科 | 词条重定向关系 | 线索级（encyclopedia） |
| LLM（LLM_API_KEY配置时） | 对manual_review项提供判断建议 | 参考级（ai_suggested），不构成证据 |

硬规则：
- 联网结果**不单独触发merge**，必须配合本地权威源
- 所有联网结果保存source（url+retrieved_at）
- 查询失败不影响主流程，候选降级manual_review

#### N5 命名分层（name-assigner.ts）

对每个节点/每个merge决策确定三层命名：

**通用名(name)选取规则**（优先级高→低）：
1. 权威来源明确指定的通用名（非文档全名）
2. 最短、最无歧义、最常用的名称（"聚乙烯"优于"聚乙烯树脂"优于"PE"）
3. 多链数据中出现频次最高的名称
4. 英文/缩写不作为首选（除非无中文名）
5. 含文档后缀的国标名不作为name首选

**aliases填充**：
- 简称/缩写/英文名/俗名/古称
- 不同地区的非官方叫法
- 权威来源明确标注的"又名""俗称""简称"
- 每个alias尽量带source

**contextual_names填充**：
- 节点名称来自某产业链数据 → 对应chain_id的contextual_name（若名称等于name则不存）
- 统计局名 → contextual_name(chain_id="stats_gov")
- 国标非文档全名 → contextual_name(chain_id="gb_standard")
- 其他产业链特定叫法 → 对应chain_id

#### N6 产业链归属（chain-assigner.ts）

推断每个节点的chains和primary_chain：

**chains推断**（并集）：
- 节点来源数据集中涉及哪些链
- 边邻居（一跳/二跳）密集分布在哪些链
- sources中有stats_gov/gb_standard不自动加入可切换链（那两个是分类体系不是视角）

**primary_chain推断**（优先级高→低）：
1. 权威来源明确归属（国标/统计局分类直接对应某个可切换链）
2. 节点主要来源的链（来自pv数据→pv_chain）
3. 边连接密度最高的可切换链
4. node_type默认：material→material_chain，product/equipment按来源，industry按行业代码映射
5. 无法判定 → primary_chain=null（人工设定）

#### N7 撞名检测（name-collision-detector.ts）

检查：
- 任意节点的contextual_name.term是否等于另一节点的name
- 任意节点的contextual_name.term是否等于另一节点在同chain下的contextual_name.term

撞名时输出manual_review项，提示三种可能：
- (a) 行业代称（用大类名代指具体材料）→ 保留contextual_name，note标注
- (b) 实际是父子关系 → 改设parent_type，不用该contextual_name
- (c) 不同实体 → 不使用该contextual_name

### 阶段E：边处理管线（Edge Pipeline）

#### E1 关系提取（edge-extractor.ts）

关系来源分四类：
1. **来源数据自带的边**（CrawlResult.edges，如产业链JSON中手动定义的边、国标提取边、巨潮数据的边）
2. **parent_type派生边**（从节点父子关系生成）——改进现有generateBasicEdges逻辑：
   - material→material父类：can_be_processed_into（子类可加工为父类？需复核方向）
   - product/equipment/material→industry：applied_in（产品/设备/材料应用于某行业）
   - 不能硬编码单一映射，要根据node_type pair选择合适的relation_type
3. **结构推断边**（可配置规则，如"同一parent的子节点之间可能存在structurally_similar_to"——仅作为proposed，需验证）
4. **AI/规则提取边**（如extract-edges-from-standards.ts已有的国标文本关系提取）

**重要改进**：parent_type派生边的relation_type映射表：
```typescript
const PARENT_RELATION_MAP: Record<`${NodeType}>${NodeType}`, RelationType | null> = {
  'material>material': 'can_be_processed_into',  // 具体材料→父类材料（子类是父类的细分加工产物）
  'product>product': 'downstream_of',            // 产品子分类
  'product>industry': 'applied_in',              // 产品→所属行业
  'material>industry': 'applied_in',             // 材料→应用行业
  'equipment>industry': 'applied_in',            // 设备→应用行业
  'process>industry': 'applied_in',              // 工艺→应用行业
  // 其他组合不自动生成边
};
```

#### E2 关系流向标注（flow-annotator.ts）

为每条边标注**effective_flow**（运行时计算，不写入Edge字段）：
1. 默认取RELATION_FLOW[edge.relation_type]
2. 若ChainDef中对该relation_type有flow覆盖，使用ChainDef中的
3. 校验：若effective_flow为horizontal，则该relation_type不应出现在任何ChainDef.main_axis_relations中

#### E3 重复边合并（edge-merger.ts）

重复边定义：source、target、relation_type三个字段都相同。

合并规则：
- evidence数组取并集（去重：同url+description的evidence不重复）
- verification_status取最高级别（verified > proposed）
- proposed_by保留多个（若有）
- note拼接（去重）
- 冲突检测：若两条重复边verification_status一verified一proposed，evidence矛盾 → 标记edge_conflict，输出warning

**反向边处理**：A→B raw_material_for 与 B→A made_of 互为反向，不视为重复。两者同时存在时保留两条，但可在报告中提示（可能存在冗余）。

#### E4 关系验证（edge-validator.ts）

验证每条边：
1. **端点存在**：source和target都指向存在的节点（merged节点要resolve到主节点）
2. **类型合法**：relation_type是已知枚举值
3. **流向一致**：主轴关系沿链遍历时不应形成环（cycle detection）
4. **跨类型合理性**（软校验）：
   - material/material、material/product、product/product之间raw_material_for合理
   - equipment/process之间equipment_for合理
   - material/material之间structurally_similar_to合理
   - industry节点一般不与industry外的节点形成upstream_of/downstream_of直接边（软警告）
5. **parent_type无环**：沿parent_type向上遍历不会回到自身
6. **无孤立边**：source/target都不能是merged节点（必须先resolve到主节点）

#### E5 边-产业链关联（运行时推断，不写入字段）

提供工具函数：给定chainId，计算某条边属于主轴边/支链边/链外边：

```typescript
function classifyEdgeForChain(
  edge: GraphEdge,
  chainId: string,
  mainAxisNodeIds: Set<string>
): 'main_axis' | 'branch' | 'outside';
```

逻辑：
- 边的relation_type在chainDef.main_axis_relations中，且两端都在mainAxisNodeIds → 'main_axis'
- 一端在mainAxisNodeIds，relation_type在chainDef.branch_relations → 'branch'
- 其他 → 'outside'

### 阶段V：验证层（Validation）

整合到一个`validateAll()`函数，处理管线各阶段和最终输出都调用：

| 验证器 | 检查内容 | 失败处理 | 现有实现 |
|--------|---------|---------|---------|
| V1 Schema校验 | JSON符合schema.json类型约束 | 阻断流程 | data-validator.ts ✅已有 |
| V2 引用完整性 | 无悬空边/parent_type/merged_into引用 | 阻断流程 | data-validator.ts ✅已有，需扩展merged_into/contextual_names检查 |
| V3 语义一致性 | 类型组合合理、无环、contextual_name唯一性 | 警告+部分阻断 | 待实现 |
| V4 流向无环检测 | 主轴关系BFS遍历无环 | 阻断流程 | 待实现 |
| V5 撞名报告 | contextual_name撞名、alias歧义 | 警告（进manual_review） | 待实现 |

**改进现状**：merge-data.ts当前未调用任何验证器。新设计中merge/处理管线每个阶段结束后都跑验证，验证不通过阻断apply。

### 阶段R：决策与审核（Review）

#### 输出结构

每次pipeline运行在`data/runs/{run_id}/`下输出：

```
data/runs/2026-06-26-143000/
├── backup/
│   └── graph-data.json.bak           # 运行前自动备份生产数据
├── raw-snapshot/                     # 本次使用的raw数据快照
│   └── (copy of data/raw/*.json)
├── nodes.normalized.json             # N1输出：带norm_name的节点
├── candidates.json                   # N2输出：候选重复对（含打分）
├── authority-evidence.json           # N3输出：权威来源查证结果
├── auto-decisions.json               # 最终自动决策（机器可读）
├── review-report.md                  # 人工可读审核报告
├── merge-log.json                    # apply后才生成
└── resolved-graph-data.json          # apply后才生成（待手动替换）
```

#### 决策文件格式（auto-decisions.json）

```json
{
  "run_id": "2026-06-26-143000",
  "summary": {
    "total_nodes_input": 928,
    "total_edges_input": 319,
    "candidates_found": 45,
    "auto_merge": 12,
    "auto_parent_child": 18,
    "auto_not_duplicate": 5,
    "manual_review": 10,
    "edge_conflicts": 3,
    "name_collisions": 4,
    "validation_errors": 0,
    "validation_warnings": 7
  },
  "node_decisions": [
    {
      "decision_type": "merge",
      "primary_node_id": "material-lithium-ion-battery",
      "merged_node_ids": ["product-lithium-battery"],
      "primary_name": "锂离子电池",
      "authority_basis": [
        {"source_type": "standard", "detail": "GB/T 2900.XX-XXXX 3.2条：锂电池是锂离子电池的简称", "url": "..."}
      ],
      "aliases_add": [{"term": "锂电池", "context": "行业简称", "source": {...}}],
      "aliases_remove": [],
      "contextual_names_add": [],
      "contextual_names_remove": [],
      "chains_assigned": ["battery_chain", "material_chain"],
      "primary_chain_assigned": "battery_chain",
      "parent_type_set": null,
      "edges_to_redirect": 3,
      "confidence": "high"
    }
  ],
  "edge_decisions": [
    {
      "decision_type": "merge_duplicate",
      "edge_ids": ["edge-1", "edge-5"],
      "kept_edge_id": "edge-1",
      "evidence_merged": true
    }
  ],
  "ignored_pairs": [
    {"node_a": "...", "node_b": "...", "reason": "authority_confirmed_distinct"}
  ]
}
```

#### 审核报告（review-report.md）结构

1. **执行摘要**：输入/输出数量、各类决策数量统计、验证结果总览
2. **权威直接判决列表**（自动执行，列出供核查）：
   - 自动合并（含判词来源）
   - 自动父子关系设置
   - 自动不重复（说明为什么不是同一物）
3. **边处理报告**：自动合并的重复边、派生边、冲突警告
4. **需要人工审核项**（逐组列出）：
   - 节点A信息（name/definition/sources/现有边）
   - 节点B信息
   - 相似度得分和各项证据
   - 权威查证结果（如有）
   - 撞名警告（如有）
   - 建议处理方向
   - 选择项：[ ]合并 [ ]父子（指定方向）[ ]不重复 [ ]其他
5. **产业链归属预览**：primary_chain=null的节点列表、chains数量异常的节点
6. **命名变更预览**：哪些节点name会变化、变化依据
7. **验证警告列表**：语义不一致、流向疑点等软警告
8. **回滚指引**：如何回滚本次操作

#### 人工审核流程

1. 运行dry-run → 2. 打开review-report.md通读 → 3. 对manual_review项标注选择（可在.md中勾选，或编辑auto-decisions.json） → 4. 修正任何明显错误决策 → 5. 运行--apply

### 阶段A：应用合并（merge-executor.ts）

通过`--apply`参数显式触发，执行步骤：

1. **强制备份**：当前`src/data/graph-data.json`复制到run目录backup/
2. **加载审核后决策**：读取auto-decisions.json
3. **节点合并**：
   - 被合并节点：stage='merged'，merged_into=主节点ID，保留全部原始字段
   - 主节点：merged_from加入被合并ID
   - name/definition按决策设置（definition取最权威最完整的）
   - aliases合并去重，补充source
   - contextual_names合并（同chain_id唯一，决策中已确定）
   - chains取并集，primary_chain按决策
   - sources合并去重
   - updated_at更新
4. **父子关系设置**：parent_child决策的节点对设置parent_type
5. **不重复标记**：not_duplicate决策写入ignored_pairs持久化（下次运行跳过）
6. **边迁移**：
   - 被合并节点的入边/出边，source/target重定向到主节点
   - 重定向后重复边按E3规则合并
   - edge.id更新，created_at保留最早的，updated_at更新
7. **反向一致性校验**：合并后所有merged节点都有merged_into指向有效主节点；主节点merged_from包含所有被合入节点
8. **全量验证**：V1-V5全部通过才能继续
9. **输出**：
   - resolved-graph-data.json写入run目录
   - merge-log.json写入run目录（详细操作记录）
   - 打印汇总统计
10. **不自动覆盖**src/data/graph-data.json，需手动确认后cp或用`--publish`参数

### 命令行接口

```bash
npx tsx scripts/pipeline.ts [command] [options]

命令：
  (无) / run     完整pipeline（crawl→process→review输出），默认dry-run
  crawl          仅运行所有爬虫，更新data/raw/
  process        仅运行处理管线（N+E+V），不crawl
  validate       仅对当前src/data/graph-data.json运行全部验证
  apply          对指定run_id应用审核后的决策
  publish        将resolved-graph-data.json复制到src/data/graph-data.json（需先apply）
  rollback       回滚指定run_id的变更（从backup恢复）
  status         显示最近几次run的状态

选项：
  --web          启用联网验证
  --no-crawl     跳过爬取阶段
  --run=<id>     指定run_id（apply/rollback时必须）
  --force        忽略验证警告强制apply（不推荐）
  --chains=<id>  只处理指定链（调试用）
```

一键命令写进package.json：
```json
"scripts": {
  "pipeline": "tsx scripts/pipeline.ts run",
  "pipeline:apply": "tsx scripts/pipeline.ts apply",
  "pipeline:rollback": "tsx scripts/pipeline.ts rollback"
}
```

### 文件组织

```
scripts/
├── pipeline.ts                     ← 新：主CLI入口
├── pipeline/                       ← 新：pipeline模块目录
│   ├── types.ts                    ← 内部类型（CandidateDecision, RunResult等）
│   ├── crawl/
│   │   ├── index.ts                ← crawler registry，调度所有爬虫
│   │   └── sources/                ← 各数据源适配器（把现有crawler包装为CrawlerSource）
│   │       ├── stats-gov.ts
│   │       ├── gb-standards.ts
│   │       ├── cninfo.ts
│   │       └── manual-chain.ts     ← 手动产业链JSON接入
│   ├── nodes/
│   │   ├── name-normalizer.ts      ← N1
│   │   ├── candidate-detector.ts   ← N2
│   │   ├── authority-verifier.ts   ← N3
│   │   ├── web-verifier.ts         ← N4
│   │   ├── name-assigner.ts        ← N5
│   │   ├── chain-assigner.ts       ← N6
│   │   └── name-collision.ts       ← N7
│   ├── edges/
│   │   ├── edge-extractor.ts       ← E1
│   │   ├── flow-annotator.ts       ← E2（运行时推断用）
│   │   ├── edge-merger.ts          ← E3
│   │   └── edge-validator.ts       ← E4
│   ├── validate/
│   │   ├── schema-validator.ts     ← V1（包装现有data-validator）
│   │   ├── integrity-validator.ts  ← V2（包装+扩展现有）
│   │   ├── semantic-validator.ts   ← V3
│   │   ├── cycle-detector.ts       ← V4
│   │   └── collision-reporter.ts   ← V5
│   ├── review/
│   │   ├── decision-engine.ts      ← 综合决策（汇总N/E结果生成auto-decisions）
│   │   ├── report-generator.ts     ← 生成review-report.md
│   │   └── ignored-pairs.ts        ← 不重复对持久化管理
│   ├── apply/
│   │   ├── backup-manager.ts       ← 备份/回滚
│   │   ├── node-merger.ts          ← 节点合并执行
│   │   ├── edge-migrator.ts        ← 边迁移执行
│   │   └── merge-executor.ts       ← A阶段总调度
│   └── utils/
│       ├── id-resolver.ts          ← merged ID重定向
│       ├── run-context.ts          ← run_id/目录管理
│       └── logger.ts               ← 结构化日志
├── crawler/                        ← 现有爬虫保留（pipeline/crawl/sources/引用这些）
│   ├── stats-gov-crawler.ts
│   ├── gb-standards-crawler.ts
│   ├── cninfo-crawler.ts
│   ├── extract-edges-from-standards.ts
│   ├── merge-data.ts               ← 保留兼容，新pipeline上线后可废弃
│   ├── types.ts
│   ├── utils.ts
│   └── tsconfig.json
└── generate-battery-chain.js       ← 现有保留
```

### 增量更新机制

当新数据源加入或已有数据源更新时：
1. 新raw数据放入data/raw/
2. pipeline检测已有graph-data.json作为基线
3. 新节点/新边进入管线，**已reviewed的节点和verified的边不被自动修改**（除非显式--reprocess）
4. 仅对新增节点/边和draft/proposed状态的数据做处理
5. 对已有节点新增的aliases/contextual_names/chains关联，通过增量合并而非全量重做实现

实现机制：
- 已通过人工审核的决策记录在data/processed/ignored-pairs.json和data/processed/reviewed-*.json中
- 节点有stage字段（draft/reviewed/merged），reviewed节点默认不被自动修改名称或合并
- 新数据只产生draft阶段的节点/边，与现有reviewed数据合并时不覆盖reviewed内容

---

## 数据访问层（DAL）扩展设计

### 扩展后的GraphDataProvider接口

```typescript
export interface GraphDataProvider {
  // —— 基础查询（已有，保留）——
  getGraphData(): GraphData;
  getNodeById(id: string): GraphNode | undefined;
  getNodeChildren(parentId: string): GraphNode[];
  getNodeParent(childId: string): GraphNode | undefined;
  getNodeNeighbors(nodeId: string, relationType?: RelationType): GraphNode[];

  // —— 搜索（扩展支持contextual_names + chain-aware）——
  searchNodes(query: string, chainId?: string, limit?: number): GraphNode[];
  matchesSearch(node: GraphNode, query: string): boolean;

  // —— 命名（新增）——
  getDisplayName(nodeId: string, chainId?: string): string;
  getNodeAliases(nodeId: string): Alias[];
  resolveNodeId(id: string): string;  // 处理merged节点重定向

  // —— 产业链（新增）——
  getChainDef(chainId: string): ChainDef | undefined;
  getViewableChains(): ChainDef[];
  getNodeChains(nodeId: string): string[];
  getNodePrimaryChain(nodeId: string): string | undefined;

  // —— 产业链视图（新增，为渲染层服务）——
  getMainAxisNodes(centerNodeId: string, chainId: string): {
    upstream: GraphNode[];    // 主轴上游节点（中心左边）
    center: GraphNode;
    downstream: GraphNode[];  // 主轴下游节点（中心右边）
  };
  getBranchNodes(mainAxisNodeIds: Set<string>, chainId: string): GraphNode[];
  classifyEdgeForChain(edgeId: string, chainId: string, mainAxisNodeIds: Set<string>):
    'main_axis' | 'branch' | 'outside';

  // —— 关系流向（新增）——
  getEffectiveFlow(edge: GraphEdge, chainId?: string): RelationFlow;
  getNodeNeighborsByFlow(nodeId: string, chainId?: string): {
    upstream: GraphNode[];
    downstream: GraphNode[];
    horizontal: GraphNode[];
  };

  // —— 状态查询（新增）——
  getChainView?(nodeId: string, relationType: RelationType, depth: number): ChainView | undefined;  // 保留旧接口
  getNodeChainSummary?(nodeId: string): NodeChainSummary | undefined;  // 保留旧接口
}
```

### 现有JsonDataProvider改造

- 现有[graph-data.ts](file:///workspace/src/lib/graph-data.ts)中的JsonDataProvider是基础，需要：
  - searchNodes增加chainId参数，搜索域扩展到contextual_names
  - 新增产业链查询方法
  - 新增命名方法
  - 新增关系流向方法
  - 构建索引时缓存chainMap、effectiveFlowMap
- setDataProvider机制保留（支持未来切换到API Provider或DB Provider）

### 工具函数（新增 src/lib/name-display.ts）

```typescript
function getDisplayName(node: GraphNode, chainId?: string): string;
function matchesSearch(node: GraphNode, query: string): boolean;
function sortSearchResults(nodes: GraphNode[], query: string, currentChainId?: string): GraphNode[];
```

### API路由更新

现有API路由（[/api/graph/route.ts](file:///workspace/src/app/api/graph/route.ts)和search）保持，补充：
- /api/graph/chains — 返回所有可查看产业链列表
- /api/graph/node/[id]/chain/[chainId]/view — 返回产业链视图（主轴+支链）
- /api/graph/node/[id]/display-name?chain=xxx — 返回语境敏感名称

API路由是JsonDataProvider的HTTP包装，不重复业务逻辑。但前端在静态JSON模式下仍通过import+DAL访问（保持现状的性能优势），API路由为未来SSR/增量加载场景准备。

---

## 与交互层的契约

等用户交互方案设计完成后，需要与数据层对齐以下契约：

### 数据层必须保证提供

1. **节点身份稳定**：合并后ID重定向可追溯（resolveNodeId），历史URL/收藏不失效
2. **ChainDef完备**：每条可查看链的main_axis_relations/branch_relations明确，relation_type方向正确
3. **主轴遍历可靠**：getMainAxisNodes沿RELATION_FLOW方向BFS不循环、不遗漏
4. **名称切换可预测**：getDisplayName(nodeId, chainId)确定性地返回该视角显示名
5. **搜索域完整**：name+all aliases+all contextual_names全部可搜索命中
6. **跨链节点可识别**：支链节点primary_chain !== currentChainId时可视觉标记（DAL提供查询接口）
7. **边角色可判断**：classifyEdgeForChain正确返回主轴/支链/外边
8. **状态可枚举**：节点stage(draft/reviewed/merged)、边verification_status(verified/proposed)可用于视觉样式

### 数据层不负责（交互/渲染层实现）

1. 3D坐标计算（graph-layout.ts职责，数据层提供getMainAxisNodes/getBranchNodes等语义邻居供布局算法用）
2. 相机飞行动画/视角切换过渡
3. 节点标签的视觉样式（颜色/大小/透明度由node_type/stage决定，但实际渲染是渲染层）
4. 主轴边/支链边/外边的视觉样式（数据层给出分类，渲染层决定实线/虚线/透明度）
5. 产业链切换UI控件（Tab/面包屑/导航路径展示）
6. 用户点击支链跨链节点时是否自动切换视角（交互决策，数据层提供primary_chain信息支撑）

### 十字交叉场景走查（验证数据层支撑）

用户场景：当前只展开光伏链（X轴横向），改性塑料链是Y轴支链（十字交叉）。点击交叉节点（改性PE颗粒）默认显示光伏链主名称，沿光伏链支链可见改性塑料链节点。点击支链节点（如塑料助剂）切换为改性塑料链视角。

| 交互步骤 | 数据层需要回答 | 支撑函数 |
|---------|--------------|---------|
| 点击光伏组件b1 | b1的primary_chain是什么？ | getNodePrimaryChain |
| 沿光伏链展开主轴b0-b1-b2-b3 | 从b1出发沿main_axis_relations双向BFS，谁在上游谁在下游？ | getMainAxisNodes(使用RELATION_FLOW) |
| 主轴节点显示什么名字？ | 每个节点在pv_chain下的显示名？ | getDisplayName(id, "pv_chain") |
| 支链节点c0/c1/c2是哪些？ | 主轴节点通过branch_relations连出的非主轴节点 | getBranchNodes |
| 支链节点为何"隐约可见"？ | 渲染层根据classifyEdgeForChain返回'branch'加透明度 | classifyEdgeForChain |
| 跨链节点如何识别？ | 支链节点primary_chain !== "pv_chain"吗？ | getNodePrimaryChain |
| 点击支链c1（primary_chain=material_chain） | 切换到material_chain视角，新主轴？ | getNodePrimaryChain(c1) + getMainAxisNodes(c1, "material_chain") |
| 切换后所有节点改名？ | 全局currentChainId变为material_chain，所有节点getDisplayName(id, "material_chain") | getDisplayName |
| 改性PE颗粒显示什么？ | 它在material_chain有contextual_name"改性PE塑料" | getDisplayName |
| 原光伏链节点b2现在是什么？ | 如果b2在material_chain主轴中则是主轴节点，否则支链或不可见 | getMainAxisNodes + classifyEdgeForChain |
| 搜索"PE膜"命中改性PE？ | "PE膜"是它在pv_chain的contextual_name或alias | matchesSearch + searchNodes(chainId="material_chain") |
| 搜索结果排序？ | 当前链contextual_name匹配优先于其他链 | sortSearchResults |

**结论**：数据层通过上述DAL接口可以完整支撑该场景。

---

## 现有代码改造清单

### 需要修改的现有文件

| 文件 | 改动 |
|------|------|
| [src/lib/types.ts](file:///workspace/src/lib/types.ts) | NodeStage增加merged；SourceType增加stats_gov/cninfo/ai_suggested；新增RelationFlow/ChainRelation/ChainDef/ContextualName类型；Alias加source；GraphNode加chains/primary_chain/contextual_names/merged_from/merged_into |
| [schema.json](file:///workspace/schema.json) | 同步类型扩展 |
| [src/lib/graph-data.ts](file:///workspace/src/lib/graph-data.ts) | JsonDataProvider扩展：新增产业链/命名/流向查询方法；searchNodes支持chainId和contextual_names；buildIndexes增加chain索引 |
| [src/lib/data-validator.ts](file:///workspace/src/lib/data-validator.ts) | validateDataIntegrity扩展：检查merged_into/contextual_names.chain_id/chains引用有效性；被pipeline调用 |
| [scripts/crawler/utils.ts](file:///workspace/scripts/crawler/utils.ts) | crawledNodeToGraphNode支持新字段（默认值）；generateId改进；保持向后兼容 |
| [scripts/crawler/merge-data.ts](file:///workspace/scripts/crawler/merge-data.ts) | 保留作为兼容入口，内部可调用新pipeline或标注deprecated |
| [.gitignore](file:///workspace/.gitignore) | 添加data/runs/、data/backup/ |

### 需要新增的文件

| 文件 | 说明 |
|------|------|
| `src/lib/chains.ts` | RELATION_FLOW、ChainRelation、ChainDef、CHAIN_DEFS |
| `src/lib/name-display.ts` | getDisplayName/matchesSearch/sortSearchResults |
| `scripts/pipeline.ts` | CLI主入口 |
| `scripts/pipeline/`目录下所有模块 | 见文件组织章节 |
| `data/processed/ignored-pairs.json` | 不重复对持久化（首次pipeline自动生成） |

### 保持不变的文件

- crawler/下三个爬虫（stats-gov/gb-standards/cninfo）—— 被pipeline/crawl/sources/引用
- extract-edges-from-standards.ts —— 作为边提取器被引用
- generate-battery-chain.js —— 电池链生成脚本
- src/app/api/graph/* —— API路由存在，保持，后续扩展链查询接口
- src/components/Graph3D/* —— 渲染层不在本次改动
- src/store/graphStore.ts —— 等交互方案确定后扩展currentChainId
- src/lib/graph-layout.ts —— 等交互方案确定后改造为chain-aware布局

---

## 风险与边界

### 高风险与防护

1. **误合并破坏数据**：dry-run默认、强制备份、merged节点不删除可回滚、不直接覆盖生产数据、验证阻断
2. **contextual_name撞名父类**：撞名检测+manual_review
3. **简称歧义**（"PC"=聚碳酸酯/个人电脑）：英文缩写不作为name，aliases加note，搜索返回多结果
4. **父子关系误判为合并**：技术修饰词识别优先判parent_child；子串包含权重低
5. **国标文档名误入节点**：is_document_title标记+剥离+review
6. **流向定义错误导致布局错乱**：RELATION_FLOW作为独立可审查配置文件；ChainDef可覆盖；cycle detection验证
7. **pipeline破坏已有前端**：输出到独立目录，需显式publish才覆盖src/data/graph-data.json；publish前可在测试环境验证

### 权威来源边界

- stats_gov只覆盖industry类型节点
- standard/gb_standard覆盖material/product/equipment的正式术语
- 百科/LLM不构成判词
- 不同权威矛盾→必走manual_review
- applied_in等context_dependent关系类型在ChainDef中可独立配置流向

### 不做的事

- 不做实时数据更新（每次pipeline是批处理）
- 不做分布式处理（单机足够支撑10万节点量级）
- 不做节点编辑UI（通过文件和脚本管理）
- 不做权限/审核工作流
- 不做数据可视化的布局和样式

---

## 实施阶段建议

考虑到交互方案还在设计中，建议分两阶段实施：

### 阶段一（当前，可立即开始）：数据模型+pipeline核心+928节点验证
- 修改types.ts、schema.json
- 创建chains.ts、name-display.ts
- 实现pipeline的核心模块（N1-N7、E1-E5、V1-V5）
- 扩展JsonDataProvider的查询接口
- 跑通928节点实验，输出review-report.md
- **等交互方案完成后**，根据交互需求调整DAL接口细节

### 阶段二（交互方案完成后）：对接渲染层+API
- 根据交互设计微调ChainDef（main_axis/branch配置）
- graphStore增加currentChainId
- graph-layout.ts改造为chain-aware
- Graph3D组件对接getDisplayName
- 主轴/支链边视觉区分
- 相机动画扩展
- 补充chain相关API路由

---

## 成功标准

1. **pipeline一键可跑**：`npm run pipeline` 在当前928节点上能完整执行，输出结构化报告
2. **验证自动运行**：merge-data.ts和未来pipeline都调用validator，验证不通过阻断发布
3. **权威判词执行**：能从gb-standards/stats-gov数据中识别出"又名/简称/分类层级"并自动判决
4. **928节点清洗后质量提升**：节点净减少10-50（重复合并），aliases/contextual_names/chains/primary_chain合理填充
5. **回滚可用**：任意apply都能rollback到之前状态
6. **DAL接口覆盖**：扩展后的GraphDataProvider满足"十字交叉"场景所有数据查询需求
7. **manual_review可控**：不超过候选总数20%
8. **零破坏**：pipeline运行后不手动替换文件前，前端现有功能完全不受影响
