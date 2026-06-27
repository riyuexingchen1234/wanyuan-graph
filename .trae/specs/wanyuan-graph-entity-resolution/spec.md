# 万源图谱 — 数据层完整设计

## Overview

- **Summary**: 设计万源图谱完整数据层架构，覆盖从数据采集、清洗消歧、关系处理、验证存储到数据访问的全链路。建立可持续运转的数据生产管线，而非一次性处理脚本。当前928个节点/319条边是这套管线首次跑通的验证数据集，未来节点量级从数百扩展到十万时架构无需推倒重来。
- **Purpose**: 解决当前数据流水线中实体命名混乱、去重简陋、关系处理粗糙、产业链视角缺失、验证器备而不用、最后一公里手动复制等问题，为交互层（主链横向排布+支链悬挂+跨链视角切换+语境敏感命名）提供完整、可靠、可扩展的数据基础。
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
- **G5 数据质量有保障**: Schema校验、引用完整性、语义一致性、流向无环四层验证自动运行。
- **G6 审计可追溯**: 所有自动化决策有日志、有依据，合并可回滚，人工审核修改有据可查。
- **G7 交互数据就绪**: DAL层为渲染层提供产业链视图查询、语境敏感命名、多名称搜索、主轴/支链邻居遍历等完整接口。

## Non-Goals（本次不做）

- 不实现3D布局算法、视角切换动画、标签动态显示等渲染层逻辑（数据层准备好数据和接口，渲染层实现）。
- 不实现用户系统/多人协作审核UI（审核通过编辑JSON/交互式CLI完成）。
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

系统采用三遍收敛的流水线架构，配合CLI四步工作流（run→review→apply→publish）确保数据质量和操作安全：

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
│            三遍收敛处理管线 (Three-Pass Pipeline)             │
│                                                             │
│  第一遍：基础构建（不依赖chains）                            │
│  ├─ N1 名称规范化 → N2 候选重复检测 → N3 权威来源验证        │
│  ├─ N4 联网验证（可选）→ N5 命名分层 → N7 撞名检测           │
│  ├─ E1a 基础关系提取 → E2 流向标注（全局默认）               │
│  └─ V1(Schema) + V2(节点引用) + V5(撞名)                    │
│                                                             │
│  第二遍：产业链归属+边细化（依赖初始边）                      │
│  ├─ N6 产业链归属推断(chains/primary_chain)                 │
│  ├─ E1b 产业链关系补充 → E3 重复边合并 → E4 边验证          │
│  └─ V1 + V2(边引用) + V3(语义) + V4(流向无环)               │
│                                                             │
│  第三遍：验证+收敛检查                                       │
│  ├─ V1-V5 全量验证                                          │
│  └─ 收敛检查（变化>5%则再迭代一轮，最多3次）                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  决策与审核层 (Review)                        │
│  - 自动决策报告(auto-decisions.json)                         │
│  - 人工可读审核报告(review-report.md)                        │
│  - 交互式CLI审核（pipeline:review）                          │
│  - 用户反馈集成                                             │
└──────────────────────────────┬──────────────────────────────┘
                               │ 确认后 --apply
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  应用层 (Apply) — 原子执行                    │
│  A1 强制全量备份 → A2 节点合并/父子设置/不重复标记            │
│  A3 边迁移/合并 → A4 命名分层填充 → A5 产业链归属写入         │
│  A6 再次通过全部验证 → A7 输出resolved结果                   │
└──────────────────────────────┬──────────────────────────────┘
                               │ 显式 --publish
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              原子发布 (Publish) — 前端生效                    │
│  写临时文件→JSON校验→rename原子替换→保留.prev版本            │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  数据存储层 (Data Store)                      │
│  src/data/graph-data.json  （生产数据，前端直接import）       │
│  data/backups/             （独立备份目录，支持回滚）         │
│  data/processed/           （中间状态）                       │
│  data/runs/                （运行归档）                       │
│  data/feedback/            （用户反馈）                       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              数据访问层 DAL (GraphDataProvider)               │
│  - 节点CRUD/查询/ID重定向                                    │
│  - 产业链视图查询(getChainLayout/getMainAxis/getBranches)    │
│  - 语境敏感命名(getDisplayName)                              │
│  - 多名称搜索(matchesSearch/sortSearchResults)               │
│  - 邻居/父子/关系流向查询                                    │
│  - 边角色分类(classifyEdgeForChain)                          │
│  - reference_only软隐藏过滤                                  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              API层 / 渲染层                                   │
│  /api/graph         全量数据                                  │
│  /api/graph/search  搜索                                      │
│  /api/graph/chains  产业链列表                                │
│  React 3D Components (GraphScene/GraphNode3D/...)           │
└─────────────────────────────────────────────────────────────┘
```

### CLI四步工作流

| 命令 | 作用 | 影响目录 | 前端是否可见 |
|------|------|---------|------------|
| `pipeline run` | dry-run，执行三遍收敛管线，生成review-report和auto-decisions草稿 | data/runs/{run_id}/ | ❌ 不可见 |
| `pipeline:review` | 启动交互式审核CLI，按风险等级逐项审核决策 | data/runs/{run_id}/ | ❌ 不可见 |
| `pipeline apply --run=<id>` | 原子执行审核后决策，在run目录生成resolved-graph-data.json，更新状态文件 | data/runs/{run_id}/、data/processed/、data/backups/ | ❌ 不可见 |
| `pipeline publish --run=<id>` | 原子替换src/data/graph-data.json，前端生效 | src/data/ | ✅ 生效 |

辅助命令：
```bash
pipeline rollback --run=<id>  # 回滚指定run的变更
pipeline quick-rollback       # 5分钟内一键回退上一次发布
pipeline rollback --ai        # 回滚所有AI辅助决策（恢复到启用AI前的备份）
pipeline validate             # 对当前生产数据独立运行全套验证
pipeline feedback:list        # 查看待处理/已处理用户反馈
pipeline chain:validate       # 校验ChainDef合法性
pipeline chain:preview        # 预览产业链主轴/支链
```

---

## 数据模型设计

### 工程可靠性基础设计

#### 并发控制与幂等性

- **run_id格式**：采用`YYYY-MM-DD-HHmmss-{shortuuid4}`格式，短UUID后缀防止同一秒内启动多次产生冲突。
- **文件锁**：pipeline启动时检查`data/pipeline/.lock`，文件存在（含PID和启动时间）则拒绝启动；进程正常/异常退出时通过finally块清理锁文件，保证同一时刻只允许一个pipeline进程运行。
- **原子写入**：所有JSON文件写入采用"写.tmp临时文件→fsync→rename原子替换"模式，杜绝半写文件导致的数据损坏。
- **内容hash**：每个节点/边计算`content_hash = sha1(name + definition + sortedSources + keyAttributes)`，pipeline加载时与持久化hash对比，未变更节点跳过候选检测和重处理，实现增量更新。
- **阻塞索引（Blocking）**：节点规模增长时O(n²)两两比较不可接受，系统通过多组Blocking Key将候选对数量压到O(n·k)（k为块内平均大小，目标k<50）：
  - 中文首字分块（同一首字内比较）
  - 二字前缀分块（name前两字相同）
  - 拼音首字母分块（处理音译/缩写）
  - 类型兼容性分块（按类型兼容性矩阵只比较允许跨类型的组合）

#### 备份与回滚机制

- **独立备份目录**：`data/backups/{backup_id}/`（backup_id=run_id），与run目录解耦，run目录可清理但备份保留。
- **全量备份**：每次apply前备份所有状态文件（graph-data.json、ignored-pairs.json、ai-suggestions.json、chains/配置），不只graph-data.json。
- **备份元数据**：metadata.json记录timestamp、run_id、via_ai、节点/边数量变化摘要、checksum。
- **备份保留策略**：默认保留最近10个或最近30天的备份，手动标记`keep: true`的永久保留。
- **链式合并扁平化**：A→B→C链式引用在apply时扁平化，A的merged_into直接指向C，C的merged_from加入A，避免多级跳转。
- **快速回滚**：publish后保留`graph-data.json.prev`指向发布前版本，支持`pipeline quick-rollback`5分钟内一键回退（无需指定run_id）。
- **AI回滚策略**：不尝试反向拆分合并（复杂度极高易出错），而是恢复到"启用AI前最近一次全量备份"，明确告知用户会丢失该备份后的所有人工决策，并要求二次确认。

### 扩展后的完整类型定义

类型归属明确分为两类：
- **公共类型**（放入`src/lib/types.ts`，pipeline和DAL共用）：NodeType、NodeStage、VerificationStatus、SourceType、RelationType、RelationFlow、ChainDef、ChainRelation、EdgeRole、Alias、ContextualName、NodeAttributes、Source、ProposedBy、AiSuggestion、AiSuggestionType、AiCallLog、GraphNode、GraphEdge、GraphData
- **pipeline内部类型**（放入`scripts/pipeline/types.ts`）：Candidate、Decision、DecisionType、RunContext、MergePlan、ContentHashes、ReviewItem、ReviewItemRisk

修改 [src/lib/types.ts](file:///workspace/src/lib/types.ts)：

#### NodeStage 扩展

```typescript
export type NodeStage = 'draft' | 'reviewed' | 'merged';
// 'merged'：节点已被合并到其他节点，保留ID用于重定向
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

#### RelationFlow

```typescript
export type RelationFlow = 'upstream_to_downstream' | 'downstream_to_upstream' | 'horizontal';
```

语义：
- `upstream_to_downstream`: source是target的上游（A是B的原料 → A在左，B在右）
- `downstream_to_upstream`: source是target的下游（A由B构成 → B在左，A在右）
- `horizontal`: 横向相似/并行关系，不进入产业链主轴，不产生上下游方向

默认关系流向表（在chains.ts中定义，用`Record<RelationType, RelationFlow>`强制TypeScript编译期检查覆盖所有RelationType，遗漏即编译错误）：

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
  is_subclass_of: 'horizontal',                     // 分类从属关系（is-a），不进入任何产业链主轴
};
```

> **设计决策**: applied_in默认流向为upstream_to_downstream，基于"A应用于B"语义判断A是B的输入/装备，B是A的去向。ChainDef中可覆盖此默认值。made_of/equipment_for/consumable_for为反向，因为三者的source都是成品/主体，target是原料/设备/耗材。
>
> **为什么is_subclass_of不进主轴**: is_subclass_of表达分类层级（is-a），不等于产业链流转（part-of/used-for）。例如"人造石墨 parent_type=石墨负极"表示"人造石墨是石墨负极的子类"，不表示"人造石墨可加工为石墨负极"。将is_subclass_of设为horizontal并禁止出现在任何ChainDef.main_axis_relations中，从机制上杜绝分类边混入产业链横向布局导致布局错乱。

#### Alias 扩展

```typescript
export interface Alias {
  term: string;
  context?: string;   // 使用该别名的宽泛语境（"日常口语""台湾地区叫法""行业简称"，不是chain_id）
  note?: string;
  source?: Source;    // 该别名的来源依据
}
```

#### ContextualName

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
  stage: NodeStage;                  // draft | reviewed | merged
  parent_type: string | null;
  reference_only?: boolean;          // 软隐藏标记：文档名/引用节点，默认不展示

  aliases?: Alias[];                 // 完全等价别名（缩写、俗名、简称）
  contextual_names?: ContextualName[];  // 特定产业链视角下的显示名称
  chains?: string[];                 // 该节点出现在哪些产业链
  primary_chain?: string;            // 主产业链ID（默认展开视角、搜索优先）
  merged_from?: string[];            // 主节点：吸收了哪些被合并节点
  merged_into?: string;              // 被合并节点：被合并到了谁
  content_hash?: string;             // 内容hash，用于幂等性判断

  attributes?: NodeAttributes;
  description?: string;
  sources?: Source[];
  created_at: string;
  updated_at: string;
}
```

#### GraphEdge

Edge不加chains字段。边的"主轴/支链角色"是视角相关的，由渲染层根据ChainDef动态判定。

> **为什么边不挂chains**: 同一条边在不同产业链视角下角色可能不同。例如"铜箔→锂电池"的raw_material_for边在battery_chain是主轴边，但在material_chain（材料属性延伸链）可能只是支链。如果静态写入chains字段，新增产业链或调整ChainDef时需要批量更新所有边的chains属性，维护成本极高且易出错。角色动态判定让ChainDef成为唯一真相源。

```typescript
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation_type: RelationType;
  verification_status: VerificationStatus;
  reference_edge?: boolean;          // 软隐藏标记：端点为reference_only的边
  evidence?: Source[];
  proposed_by?: ProposedBy;
  note?: string;
  created_at: string;
  updated_at: string;
}
```

Edge语义细节：
1. **source/target的方向语义**：由relation_type的RELATION_FLOW决定，再由ChainDef可覆盖。不是所有边都是source→target=上游→下游，made_of/equipment_for/consumable_for/downstream_of是反向边。
2. **effective_flow计算统一**：抽到`src/lib/relation-utils.ts`公共模块的`calculateEffectiveFlow(relationType, chainId?)`函数，E阶段和DAL必须调用同一函数，禁止各自实现。
3. **evidence合并**：同一对节点、同一relation_type来自不同数据源时，evidence数组做并集，不丢弃任何来源。

#### GraphData 根级扩展

```typescript
export interface GraphData {
  version: string;       // = run_id，发布版本号
  published_at: string;  // ISO timestamp
  nodes: GraphNode[];
  edges: GraphEdge[];
}
```

### ChainDef 产业链定义（src/lib/chains.ts + data/chains/*.json）

产业链定义支持双来源：内置默认定义（chains.ts）+ JSON配置文件（data/chains/*.json）合并/覆盖，新增产业链只需复制模板JSON填空式配置。

```typescript
export interface ChainRelation {
  type: RelationType;
  flow?: RelationFlow;  // 不填使用RELATION_FLOW默认值
}

export interface ChainDef {
  id: string;
  name: string;
  description: string;
  main_axis_relations: (RelationType | ChainRelation)[];  // 构成横向主轴的关系（不能包含horizontal flow）
  branch_relations: (RelationType | ChainRelation)[];     // 构成支链的关系
  primary_axis?: 'x' | 'y' | 'z';                         // 主轴方向，默认'x'
  root_node_id?: string;                                  // 链的入口/根节点
  branch_depth?: number;                                  // 支链可见跳数，默认1
  is_viewable?: boolean;                                  // 是否作为UI视角列表中可切换项
}
```

> **设计约束**: V层验证强制检查main_axis_relations中的relation_type不能是horizontal flow（如is_subclass_of、structurally_similar_to），防止分类边误入主轴。

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

### reference_only 软隐藏机制

is_document_title节点（国标文档名等）不删除，采用软隐藏方案：
- 节点保留，但chains设为空数组，增加`reference_only: true`标记
- DAL默认过滤：searchNodes/getMainAxisNodes/getBranchNodes跳过reference_only节点
- getNodeById仍可访问（用于来源追溯）
- 端点为reference_only的边标记`reference_edge: true`，DAL默认不返回

> **为什么软隐藏不删除**: 文档名节点包含标准编号、来源URL等元信息，是其他节点名称和定义的判词来源。删除后这些来源追溯链会断裂。软隐藏既保证前端不展示噪声节点，又保留了完整的审计追溯能力。

### Schema验证更新

[schema.json](file:///workspace/schema.json) 需要同步更新：
- NodeStage枚举增加"merged"
- GraphNode增加aliases/contextual_names/chains/primary_chain/merged_from/merged_into/reference_only/content_hash字段
- SourceType枚举增加stats_gov/cninfo/ai_suggested
- 增加ContextualName定义
- Alias增加可选source字段
- GraphEdge增加reference_edge字段
- GraphData增加version/published_at字段

---

## 数据处理流水线详细设计

### 流水线总览

整个处理流程通过CLI命令驱动，每次pipeline运行分配一个run_id（时间戳+短UUID），所有输出归档在`data/runs/{run_id}/`下。

N阶段最终执行顺序：**N1→N2→N3→N4→N5→N7→N6**（撞名检测前移到命名后、产业链归属前，撞名解决后再分配chains）。

完整三遍收敛执行顺序：

**第一遍：基础构建（不依赖chains）**
- 爬取（Crawl）→ N1名称规范化 → N2候选检测（首轮，基于字符串/definition规则）→ N3权威验证 → N4联网验证（可选）→ N5命名分层（初始name/aliases）→ N7撞名检测（初始命名层面）
- E1a：提取来源自带边 + parent_type派生边（不依赖chains）
- E2：流向标注（基于全局RELATION_FLOW默认值）
- V1(Schema) + V2(节点内部引用) + V5(撞名)

**第二遍：产业链归属+边细化（依赖初始边）**
- N6：基于"节点来源数据集"+"初始边邻居链分布"做chains/primary_chain初始推断
- E1b：补充基于chains的关系推导（如有）
- E3：重复边合并（方向无关的规范化去重）
- E4：边验证（含类型兼容、流向合理、merged_into循环检测）
- V1 + V2(边引用) + V3(语义) + V4(无环)

**第三遍：验证+收敛检查**
- V1-V5全量验证
- 对比chains/primary_chain变化率，若变化节点>5%则再跑一轮N6→V（最多迭代3次，防振荡）

CLI命令：
```bash
npx tsx scripts/pipeline.ts run [--web] [--no-crawl] [--ai] [--ai-model=<model>]
npx tsx scripts/pipeline.ts review [--resume] [--undo] [--blind]
npx tsx scripts/pipeline.ts apply --run=<id> [--force]
npx tsx scripts/pipeline.ts publish --run=<id>
npx tsx scripts/pipeline.ts rollback --run=<id> | --ai | quick-rollback
npx tsx scripts/pipeline.ts validate
npx tsx scripts/pipeline.ts status
npx tsx scripts/pipeline.ts feedback:list
npx tsx scripts/pipeline.ts chain:validate --chain=<id>
npx tsx scripts/pipeline.ts chain:preview --chain=<id> --root=<nodeId>
npx tsx scripts/pipeline.ts ai-stats
```

npm scripts：
```json
"scripts": {
  "pipeline": "tsx scripts/pipeline.ts run",
  "pipeline:review": "tsx scripts/pipeline.ts review",
  "pipeline:apply": "tsx scripts/pipeline.ts apply",
  "pipeline:publish": "tsx scripts/pipeline.ts publish",
  "pipeline:rollback": "tsx scripts/pipeline.ts rollback"
}
```

### 阶段0：爬取（Crawl Stage）

**职责**：调度所有已注册爬虫，输出规范化的CrawlResult。dry-run时输出到run目录的raw-snapshot/，apply成功后才正式更新data/raw/。

**CrawlerSource接口**：
```typescript
interface CrawlerSource {
  name: string;                    // 数据源标识
  type: 'auto' | 'manual' | 'generated';
  outputFile: string;              // 输出到data/raw/的文件名
  run(): Promise<CrawlResult>;     // 执行爬取/生成
}

interface CrawlResult {
  metadata: {
    source_id: string;
    source_type: SourceType;
    crawled_at: string;
    record_count: number;
    success: boolean;
    errors?: string[];
    partial_data?: boolean;
  };
  nodes: Omit<GraphNode, 'id'|'created_at'|'updated_at'|'stage'>[];
  edges?: Omit<GraphEdge, 'id'|'created_at'|'updated_at'|'verification_status'>[];
}
```

**现有爬虫改造**：
- 三个现有爬虫保持基本逻辑不变，统一实现`CrawlerSource`接口，注册到crawler registry
- 每个爬虫输出带metadata的CrawlResult
- 支持--no-crawl跳过（使用已有raw数据）
- 支持--save-crawled参数显式持久化爬取结果到data/raw/

**错误处理约定**：
- 单个爬虫失败不阻断pipeline（记录error继续），所有爬虫失败才阻断
- 默认30秒超时，失败自动重试2次（指数退避）
- 增量爬取基于HTTP Last-Modified/ETag

**手动数据接入规范**：
- 手动编写的产业链JSON需符合CrawlResult格式
- 在metadata.source中标注"manual"或"generated"来源
- 推荐命名规范：`{chain_id}-chain.json`

### 阶段N：节点处理管线（Node Pipeline）

#### N1 名称规范化（name-normalizer.ts）

生成norm_name仅用于比对，不修改原name。规则：
1. 全角→半角（Ａ→A，（→(，％→%，全角数字→半角）
2. 去除首尾/多余空白，统一标点
3. 繁简转换（如有）
4. 英文大小写统一（PE不写成pe）
5. 识别并标记**文档性质后缀**（不剥离，仅标记is_document_title）：规范、总规范、通用技术条件、技术条件、试验方法、分类、测定方法、的测定、通用要求、技术要求等。
6. **多信号文档名识别**（不依赖单一规则，综合判断）：
   - 信号D1：name含文档后缀词（规范/标准/规程/方法/技术条件/试验方法/测定方法/通用要求/技术要求）+ source_type=standard → 权重+3
   - 信号D2：definition含"GB/T""GB ""国家标准""规定了...的技术要求""规定了...的试验方法""规定了...的分类""本标准规定了" → 权重+3
   - 信号D3：name长度>15字 + source_type=standard → 权重+1
   - 信号D4：sources.url含"openstd.samr.gov.cn"或其他标准全文站点 → 权重+2
   - is_document_title = 权重≥4（即至少满足D1+D2）；权重=2~3标记is_possible_document（进入review）
7. **英文缩写自动提取**：对name扫描`[A-Z]{2,}[\-\s]?[\u4e00-\u9fff]`模式，英文部分记录为`extracted_abbreviation`，供N5命名分层阶段作为alias候选（note="name中自动提取英文缩写"）。

输出：每个节点附带`norm_name`、`is_document_title`、`is_possible_document`、`extracted_abbreviation?`标志，供后续阶段使用。

#### N2 候选重复对检测（candidate-detector.ts）

**默认同node_type内比较**，但允许material↔product跨类型（中文产业语境下"XX材料"和"XX产品"经常混用，如"电池隔膜"material vs "隔膜"product）。其他跨类型组合（含industry/equipment/process）保持严格类型匹配。

**类型兼容性矩阵**：

| node_type A\node_type B | material | product | equipment | process | industry | entity |
|-------------------------|----------|---------|-----------|---------|----------|--------|
| material | ✅1.0 | ⚠️0.85 | ❌ | ❌ | ❌ | ❌ |
| product | ⚠️0.85 | ✅1.0 | ❌ | ❌ | ❌ | ❌ |
| equipment | ❌ | ❌ | ✅1.0 | ❌ | ❌ | ❌ |
| process | ❌ | ❌ | ❌ | ✅1.0 | ❌ | ❌ |
| industry | ❌ | ❌ | ❌ | ❌ | ✅1.0 | ❌ |
| entity | ❌ | ❌ | ❌ | ❌ | ❌ | ✅1.0 |

> ⚠️=允许比较但权重系数0.85（跨类型），候选标记`type_conflict: true`进入manual_review，不自动merge。❌=不比较（类型差异明显，大概率不是同物）。Blocking索引阶段利用此矩阵减少不必要的两两比较。

多策略加权打分：

| 策略 | 权重 | 触发条件 |
|------|------|---------|
| norm_name完全相等（同类型） | 1.0 | 规范化后完全相同 |
| norm_name完全相等（material↔product跨类型） | 0.85 | 标记type_conflict，进入manual_review |
| 别名反向命中（A.name ∈ B.aliases 或反之） | 0.95 | |
| definition模式词匹配 | 0.9 | 见下方definition_patterns策略 |
| 编辑距离Levenshtein ≥ 0.8 + 长度差≤3 | 0.7 | 短文本简称/全称 |
| 子串包含+类型兼容+长度差≤4 | 0.6 | "锂电池"⊂"锂离子电池" |
| 共同邻居Jaccard ≥ 0.7 + 类型兼容 | 0.5 | 语义相似 |
| slugify ID相同/高度相似 | 0.4 | ID生成导致的重复 |

**definition_patterns策略**（捕捉definition中的明确语义线索）：

用中文模式词正则扫描每个节点的definition，匹配到的术语在节点列表中查找对应name/alias，作为候选对加入：

| 正则模式 | 候选关系 | 说明 |
|---------|---------|------|
| `/又名\|简称\|俗称\|亦称\|也称\|行业[俗称称]\|俗称(.+)/` | merge（高置信） | 明确别名陈述 |
| `/即\|也就是\|亦即(.+)/` | merge（高置信） | 等同关系 |
| `/是(.+)的(子类\|主流类型\|一种\|分支\|细分\|类型)/` | parent_child | A是B的子类 |
| `/属于(.+)(的\|)(子类\|范畴\|大类\|一种)/` | parent_child | A属于B的子类 |
| `/(.+)(的\|)(简称\|缩写\|英文缩写)是/` | merge（别名方向） | 别名反查 |

匹配到的术语需在节点列表中精确匹配（name或aliases.term），匹配后加入候选对，证据source标记为definition_pattern。

置信度分级：
- ≥0.85 → 高置信度（同类型完全相等、别名反向命中、definition明确别名/等同）
- 0.6~0.85 → 中置信度（进入manual_review）
- <0.6 → 不进入候选
- 跨类型候选（material↔product）即使≥0.85也进入manual_review，不自动merge

对高置信度候选还要做**父子关系预过滤**：如果名称A = "[常见修饰词]"+B，且修饰词是技术路线/规格/应用场景修饰（晶体硅、单/多晶、车用、储能用、地面用、薄膜、柔性、高密度等），降权为parent_child候选而非merge候选。

#### N3 权威来源验证（authority-verifier.ts）

**国家级/权威来源是判词，有明确表述时直接出结论。**

判词表：

| 场景 | 判词来源 | 自动结论 |
|------|---------|---------|
| 两名称在**同一国标/统计局**中被等同标注（"X又名Y""X简称Y""X俗称Y"） | standard/stats_gov原文 | **merge**，记录条文为source |
| 两名称在**国标/统计局**中被列为不同条目/不同代码 | standard/stats_gov | **not_duplicate** |
| 两名称在**国标/统计局**中明确层级包含（大类→小类） | standard/stats_gov | **parent_child**，设parent_type |
| 2+独立权威源指向"是同一实体" | 多源交叉 | 高置信度**merge** |
| 不同权威来源结论矛盾 | 权威冲突 | **manual_review**，列各方依据 |
| 权威来源未覆盖 | 无判词 | 候选进入manual_review |
| is_document_title节点，剥离后缀后匹配到其他实体 | standard | 建议**merge**，原全名作为gb_standard的contextual_name；剥离后无匹配且无definition → 建议标记**reference_only**（review） |

关键子流程：

**父子关系排除**：
- 候选对中已有parent_type指向对方 → parent_child
- 国标/统计局分类树明确上下级 → parent_child
- 名称是"[技术修饰词]+[基础名]"结构且修饰词是已知技术路线词 → parent_child优先

**文档名处理**：
- is_document_title=true的standard来源节点（满足多信号综合判断）：
  - 剥离文档后缀词后，在现有节点name/aliases中精确或模糊匹配 → 建议merge（全名作为gb_standard的contextual_name，source信息附加到被匹配实体）
  - 剥离后无匹配 + definition明确描述某实体 → 同样建议merge，definition作为实体的补充source
  - 剥离后无匹配 + definition是标准文本描述（"本标准规定了...的技术要求"）且无对应实体 → 建议标记为**reference_only**（不作为图节点展示，原文信息作为相关节点的source），输出review项
- is_possible_document=true（权重2~3）：不自动处理，进入manual_review列出全部信号让人工判断

#### N4 联网验证（web-verifier.ts，可选）

触发条件：有网络+配置了相关环境变量（--web参数）。

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
- N1阶段自动提取的英文缩写
- 每个alias尽量带source

**contextual_names填充**：
- 节点名称来自某产业链数据 → 对应chain_id的contextual_name（若名称等于name则不存）
- 统计局名 → contextual_name(chain_id="stats_gov")
- 国标非文档全名 → contextual_name(chain_id="gb_standard")
- 其他产业链特定叫法 → 对应chain_id

#### N7 撞名检测（name-collision-detector.ts）

撞名检测在命名分层后、产业链归属前执行，确保命名无冲突后再分配chains。

检查：
- 任意节点的contextual_name.term是否等于另一节点的name
- 任意节点的contextual_name.term是否等于另一节点在同chain下的contextual_name.term
- 同一chain_id下是否有多个节点有相同name或contextual_name（阻断级错误）

撞名严重程度分级：
- **阻断错误**（V3/V5阻断apply）：同一chain_id下多个节点有相同name或contextual_name
- **高优先级警告**：节点contextual_name等于另一节点name（可能是父子/代称）
- 阻断级撞名未解决时--apply拒绝执行（除非--force）

撞名时输出manual_review项，提示三种可能：
- (a) 行业代称（用大类名代指具体材料）→ 保留contextual_name，note标注
- (b) 实际是父子关系 → 改设parent_type，不用该contextual_name
- (c) 不同实体 → 不使用该contextual_name

#### N6 产业链归属（chain-assigner.ts）

推断每个节点的chains和primary_chain（在N7撞名检测通过后执行）：

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

> **设计边界**: primary_chain=null是合法状态。跨链共用材料（如铝合金）无法自动判定主链时保持null，由人工设定；数据层返回null让渲染层决定交互行为（flyTo/弹窗选择/按类型默认）。

### 阶段E：边处理管线（Edge Pipeline）

#### E1 关系提取（edge-extractor.ts）

关系来源分四类：
1. **来源数据自带的边**（CrawlResult.edges，如产业链JSON中手动定义的边、国标提取边、巨潮数据的边）
2. **parent_type派生边**（从节点父子关系生成）——严格区分分类关系(is-a)和产业链流转关系(part-of/used-for)：
   - **同类型父子（material→material, product→product, equipment→equipment, process→process）**：生成`is_subclass_of`边（flow=horizontal，不进入任何产业链主轴），**不**生成can_be_processed_into/downstream_of等流转关系边
   - **跨类型指向industry（*→industry）**：生成`applied_in`边（产品/材料/设备/工艺应用于某行业），这是正确的应用归属关系
   - **其他跨类型组合**：不自动生成边，在review报告中提示"该节点parent_type指向不同类型节点，无产业链边，请人工确认是否需要补充"
   - **重要原则**：parent_type表达分类层级（is-a），不等于产业链流转（part-of/used-for）。
3. **结构推断边**（可配置规则，如"同一parent的子节点之间可能存在structurally_similar_to"——仅作为proposed，需验证）
4. **AI/规则提取边**（如extract-edges-from-standards.ts已有的国标文本关系提取）

**parent_type派生边映射表**：
```typescript
const PARENT_RELATION_MAP: Record<`${NodeType}>${NodeType}`, RelationType | null> = {
  'material>material': 'is_subclass_of',    // 分类关系（is-a），非流转
  'product>product': 'is_subclass_of',      // 分类关系（is-a），非流转
  'equipment>equipment': 'is_subclass_of',  // 分类关系（is-a），非流转
  'process>process': 'is_subclass_of',      // 分类关系（is-a），非流转
  'product>industry': 'applied_in',         // 产品→所属行业（应用归属）
  'material>industry': 'applied_in',        // 材料→应用行业
  'equipment>industry': 'applied_in',       // 设备→应用行业
  'process>industry': 'applied_in',         // 工艺→应用行业
  // 其他组合不自动生成边，输出review提示
};
```

#### E2 关系流向标注（flow-annotator.ts）

为每条边标注**effective_flow**（运行时计算，不写入Edge字段，预计算后缓存）：
1. 默认取RELATION_FLOW[edge.relation_type]
2. 若ChainDef中对该relation_type有flow覆盖，使用ChainDef中的
3. 校验：若effective_flow为horizontal，则该relation_type不应出现在任何ChainDef.main_axis_relations中（V层验证强制检查）

#### E3 重复边合并（edge-merger.ts）

重复边定义：source、target、relation_type三个字段都相同（考虑effective_flow方向后规范化比较）。

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
3. **流向一致**：主轴关系沿链遍历时不应形成环（三色DFS算法，O(V+E)复杂度，发现回边即定位环）
4. **跨类型合理性**（软校验）：
   - material/material、material/product、product/product之间raw_material_for合理
   - equipment/process之间equipment_for合理
   - material/material之间structurally_similar_to合理
   - industry节点一般不与industry外的节点形成upstream_of/downstream_of直接边（软警告）
5. **parent_type无环**：沿parent_type向上遍历不会回到自身
6. **merged_into无环**：沿merged_into链遍历不会循环（V2引用完整性验证）
7. **无孤立边**：source/target都不能是merged节点（必须先resolve到主节点）
8. **main_axis_relations无horizontal**：ChainDef.main_axis_relations中不能包含horizontal flow的relation_type

#### E5 边-产业链关联（运行时推断，不写入字段）

提供工具函数（由DAL封装，前端/布局层禁止重写方向逻辑）：给定chainId，计算某条边属于主轴边/支链边/跨链边/链外边：

```typescript
interface EdgeRole {
  role: 'main_axis' | 'branch' | 'cross_chain' | 'outside';
  direction: 'upstream' | 'downstream' | 'lateral';
  upstreamNode: string;   // 上游节点ID（用于布局左/右判定）
  downstreamNode: string; // 下游节点ID
}

function classifyEdgeForChain(
  edge: GraphEdge,
  chainId: string,
  mainAxisNodeIds: Set<string>
): EdgeRole;
```

逻辑：
1. 解析effective_flow（考虑ChainDef覆盖）
2. 判定upstreamNode/downstreamNode：
   - effective_flow=upstream_to_downstream → upstreamNode=edge.source, downstreamNode=edge.target
   - effective_flow=downstream_to_upstream → upstreamNode=edge.target, downstreamNode=edge.source
   - effective_flow=horizontal → direction='lateral', upstreamNode=downstreamNode=null（lateral无边方向）
3. 判定role：
   - 边的relation_type在chainDef.main_axis_relations中，且两端都在mainAxisNodeIds → 'main_axis'
   - 一端在mainAxisNodeIds，relation_type在chainDef.branch_relations：
     - 若远端节点primary_chain存在且primary_chain !== chainId → 'cross_chain'（跨链支链，交互上可隐约可见/高亮）
     - 否则 → 'branch'（本链支链）
   - 两端都不在mainAxisNodeIds → 'outside'
4. 判定direction：基于effective_flow和upstream/downstreamNode与中心节点的位置关系（在主轴BFS时判定）

> **为什么必须DAL封装**: made_of/equipment_for/consumable_for/downstream_of是反向边，方向推理极易出错。classifyEdgeForChain统一返回{role, direction, upstreamNode, downstreamNode}，避免各层各自实现RELATION_FLOW逻辑导致不一致。

### 阶段V：验证层（Validation）

整合到一个`validateAll()`函数，处理管线各阶段和最终输出都调用。分阶段验证范围明确：
- N阶段结束：V1(Schema) + V2(节点内部引用) + V5(撞名)
- E阶段结束：V1 + V2(边引用) + V3(语义) + V4(无环)
- R/A阶段：全套V1-V5
- `pipeline validate`命令可对当前生产数据独立跑全套验证

| 验证器 | 检查内容 | 失败处理 |
|--------|---------|---------|
| V1 Schema校验 | JSON符合schema.json类型约束 | 阻断流程 |
| V2 引用完整性 | 无悬空边/parent_type/merged_into引用；merged_into无循环；链式引用扁平化 | 阻断流程 |
| V3 语义一致性 | 类型组合合理、contextual_name唯一性、main_axis无horizontal、ChainDef合法 | 警告+部分阻断 |
| V4 流向无环检测 | 主轴关系BFS/DFS遍历无环（三色DFS算法） | 阻断流程 |
| V5 撞名报告 | contextual_name撞名、alias歧义、同链同名阻断 | 警告（进manual_review）/阻断 |

### 阶段R：决策与审核（Review）

#### 用户角色矩阵

系统明确四类用户角色，v1通过CLI命令设计自然区分角色权限（高风险命令加二次确认），不做权限系统。

| 角色 | 核心任务 | v1支撑方式 | 责任边界 |
|------|---------|-----------|---------|
| **数据工程师** | pipeline开发、部署、故障排查、ChainDef配置 | CLI命令、日志、备份、TypeScript类型 | 负责系统稳定性、ChainDef评审 |
| **数据管理员** | 运行pipeline、低/中风险项审核、发布/回滚、处理用户反馈 | CLI+交互式review CLI+反馈文件 | 负责日常运行、低风险决策、发布操作 |
| **产业专家** | 高风险项审核确认、产业链逻辑验证、权威来源确认 | review-report.md（优化版）+交互式CLI+反馈标注 | 负责高风险实体消歧、产业链定义评审 |
| **前端浏览用户** | 浏览图谱、搜索节点、发现错误反馈 | 前端渲染+反馈按钮 | 只使用、反馈问题 |

#### 审核项风险分级

- 🔴 **高风险**（必须逐项确认）：跨类型material↔product合并、节点name变更、primary_chain冲突、边流向冲突、阻断级撞名、用户反馈项
- 🟡 **中风险**：primary_chain=null、is_possible_document判断、普通同类型重复候选、is_subclass_of推断
- 🟢 **低风险**（支持批量接受）：alias补充、contextual_name补充、reference_only标记

#### 交互式CLI审核

v1提供`npm run pipeline:review`交互式审核CLI，替代手动编辑JSON/Markdown：
- 按风险等级🔴🟡🟢排序展示待审核项
- 每项展示：节点A/B卡片式对比（name/definition/sources/邻居摘要/合并影响预览）
- **影响预览**：节点A有X入边/Y出边，节点B有M入边/N出边；合并后预计重定向X+M条边，预计合并Z条重复边；列出主要邻居节点（前5个）；撞名风险高亮
- 快捷键：1=合并(keep A) 2=合并(keep B) 3=父子(A⊃B) 4=父子(B⊃A) 5=不重复 6=跳过 s=保存退出 a=全部接受低风险项
- 每次操作前自动备份auto-decisions.json到`.bak.{timestamp}`
- 支持`--undo`撤销最后一次修改
- 支持`--resume`从上次中断处继续
- 支持`--blind`模式：先隐藏AI建议让人工独立判断，再展示对比（防自动化偏见）
- review-report.md仍生成（作为可读归档），但不再作为主要编辑入口

#### manual_review量预估

基于928节点实测校准：
- v1纯规则baseline：manual_review项≤60项为可接受
- v1.5+AI后：manual_review项≤25项（较baseline降低≥50%）
- 审核效率：平均每项≤3分钟（通过CLI交互+影响预览实现）
- 首次运行review-report首页显示"待审核项：XX项（🔴X/🟡Y/🟢Z），预计审核时间：XX分钟"

#### 输出结构

每次pipeline运行在`data/runs/{run_id}/`下输出：

```
data/runs/2026-06-26-143000-abc123/
├── backup/
│   └── (apply时生成全量备份，同步到data/backups/{run_id}/)
├── raw-snapshot/                     # 本次使用的raw数据快照
│   └── (copy of data/raw/*.json)
├── nodes.normalized.json             # N1输出：带norm_name的节点
├── candidates.json                   # N2输出：候选重复对（含打分）
├── authority-evidence.json           # N3输出：权威来源查证结果
├── auto-decisions.json               # 最终自动决策（机器可读，review时编辑）
├── review-report.md                  # 人工可读审核报告（归档用）
├── merge-log.json                    # apply后才生成
└── resolved-graph-data.json          # apply后才生成
```

#### 决策文件格式（auto-decisions.json）

```json
{
  "run_id": "2026-06-26-143000-abc123",
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
      "confidence": "high",
      "ai_suggestion_id": null,
      "via": "rule"
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

#### ignored-pairs 持久化格式

不重复对持久化在`data/processed/ignored-pairs.json`，记录判定时数据状态，数据变更后自动失效重评：
```json
{
  "version": 1,
  "pairs": [
    {
      "node_a": "id-a",
      "node_b": "id-b",
      "reason": "authority_confirmed_distinct | manual_rejected | ...",
      "decided_at": "ISO-timestamp",
      "decided_by": "auto | manual:<user>",
      "node_a_hash": "...",
      "node_b_hash": "...",
      "authority_basis": ["source_id1", ...]
    }
  ]
}
```

重新pipeline时，如果任一节点content hash变化，对应ignored_pair自动失效进入候选重评。提供`pipeline reset-ignored --pair=id1,id2`手动重置。

#### 数据质量反馈闭环

v1实现文件级反馈入口：
- 前端节点详情面板增加"反馈问题"按钮，点击弹出轻量表单：问题类型（名称错误/关系错误/建议合并/其他）+描述，提交后写入`data/feedback/{timestamp}-{nodeId}.json`
- feedback条目格式：
```json
{
  "id": "fb-{timestamp}",
  "node_id": "xxx",
  "related_node_id": "xxx",
  "issue_type": "name_error | relation_error | suggest_merge | other",
  "description": "...",
  "current_chain_id": "pv_chain",
  "created_at": "ISO-timestamp",
  "resolved": false
}
```
- pipeline集成：每次run时自动加载未resolved的feedback，作为🔴高优先级manual_review项纳入（标记"用户反馈"来源）
- 审核处理后反馈条目标记resolved=true和处理结果
- 提供`pipeline feedback:list`查看待处理/已处理反馈

### 阶段A：应用合并（merge-executor.ts）

通过`--apply`参数显式触发，执行**原子合并**：所有节点/边变更在内存中完成后一次性序列化为JSON，通过tmp+rename替换文件，不出现"节点已merged但边未迁移"的中间态。

执行步骤：
1. **强制全量备份**：所有状态文件复制到data/backups/{run_id}/
2. **加载审核后决策**：读取auto-decisions.json
3. **resolveNodeId预处理**：执行合并前先将所有被合并节点递归resolve到最终主节点，禁止"merged节点作为主节点继续合并其他节点"。resolveNodeId带循环检测+路径压缩：
```typescript
function resolveNodeId(id: string, visited: Set<string> = new Set(), nodeMap: Map<string, GraphNode>): string {
  if (visited.has(id)) throw new Error(`Circular merged_into: ${[...visited, id].join(' -> ')}`);
  const node = nodeMap.get(id);
  if (!node || node.stage !== 'merged' || !node.merged_into) return id;
  visited.add(id);
  const resolved = resolveNodeId(node.merged_into, visited, nodeMap);
  if (resolved !== node.merged_into) node.merged_into = resolved; // 路径压缩
  return resolved;
}
```
4. **链式合并扁平化**：A→B→C链式引用扁平化，A的merged_into直接指向C，C的merged_from加入A
5. **节点合并**：
   - 被合并节点：stage='merged'，merged_into=主节点ID，保留全部原始字段
   - 主节点：merged_from加入被合并ID
   - name/definition按决策设置（definition取最权威最完整的）
   - aliases合并去重，补充source
   - contextual_names合并（同chain_id唯一，决策中已确定）
   - chains取并集，primary_chain按决策
   - sources合并去重
   - updated_at更新
6. **父子关系设置**：parent_child决策的节点对设置parent_type
7. **不重复标记**：not_duplicate决策写入ignored_pairs持久化（含content_hash，下次运行跳过）
8. **reference_only标记**：文档名节点按决策标记reference_only: true
9. **边迁移**：
   - 被合并节点的入边/出边，source/target重定向到主节点
   - 重定向后重复边按E3规则合并
   - edge.id更新，created_at保留最早的，updated_at更新
10. **反向一致性校验**：合并后所有merged节点都有merged_into指向有效主节点；主节点merged_from包含所有被合入节点
11. **全量验证**：V1-V5全部通过才能继续
12. **输出**：
    - resolved-graph-data.json写入run目录
    - merge-log.json写入run目录（详细操作记录，ai辅助操作标记`via: 'ai_assisted'`并记录ai_suggestion_id）
    - 状态文件（ignored-pairs.json、ai-suggestions.json）更新
    - 打印汇总统计

### 阶段P：原子发布（publish）

通过`pipeline publish --run=<id>`显式触发，将resolved-graph-data.json发布到生产环境：
1. 自动运行V1-V5全量验证
2. 展示变更摘要"节点X→Y(Δ+Z)，边A→B(Δ+C)，合并D组"，要求输入`y`确认
3. 写graph-data.json.tmp临时文件
4. JSON合法性校验
5. 将当前src/data/graph-data.json重命名为graph-data.json.prev（保留用于quick-rollback）
6. rename原子替换graph-data.json.tmp→graph-data.json
7. 前端版本感知：DAL初始化时记录version，通过API轮询检测版本变化，提示用户"数据已更新，点击刷新"（非阻断）

---

## LLM混合增强架构

> **核心原则**：AI不直接写入数据。AI只产生"候选建议+置信度+推理依据"，决策由规则+权威验证+人工审核三级共同完成。

### 为什么引入LLM

纯规则方案在产业链领域有以下天花板：
- **召回率受限**：definition_patterns正则只能覆盖有限的语言模式，大量隐含语义关系会漏检
- **跨领域冷启动慢**：每新增一条产业链需补充该领域的document后缀词、修饰词、关系模式
- **manual_review负担重**：规则无法判断的灰色地带全部交给人工，928节点下预计manual_review量达候选总数的30-50%

LLM的预训练知识包含大量产业链常识（光伏/锂电/新能源等热门产业链主干关系准确率90%+），可以大幅提升召回率、降低人工审核量。但LLM在细分材料、边界模糊、关系类型精确判断、标准编号等场景存在不可忽视的幻觉风险（纯LLM抽取F1≈0.68，每5条约1条错误），不能直接作为写入依据。

### 架构定位：AI是候选生成器，不是决策者

```
┌──────────────────────────────────────────────────────┐
│         LLM 候选生成层（高召回，不做最终决策）          │
│  职责：发现规则漏掉的候选，给出理由，不写入             │
│  产出：AiSuggestion[] + AiCallLog[]                   │
└────────────────────┬─────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────┐
│         规则/权威层（高精度，硬约束守门员）             │
│  - 权威来源判词（standard/stats_gov）→ 直接执行        │
│  - Schema/完整性/无环/撞名验证 → 阻断                 │
│  - ChainDef/RELATION_FLOW 流向约束                    │
│  - 高置信度规则匹配 → 自动执行                         │
│  - 可以拒绝AI建议（与权威矛盾/违反约束）               │
└────────────────────┬─────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────┐
│         决策引擎（综合所有证据，产出决策）              │
│  - AI高置信(≥0.85) + 规则通过 + 无权威冲突 → auto     │
│  - AI中置信(0.6-0.85) → auto但标记ai_assisted        │
│  - AI低置信 / 规则冲突 / 权威未覆盖 / 歧义 → manual   │
│  - 规则/权威明确阻断 → 拒绝，记录原因                  │
└────────────────────┬─────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────┐
│         人工审核（处理灰色地带，标注反哺AI）            │
│  - 看到：规则证据 + AI建议+推理 + 原始数据            │
│  - 操作：接受/修改/驳回                                │
│  - 标注结果持久化，可作为未来主动学习训练数据          │
└──────────────────────────────────────────────────────┘
```

### 决策优先级（从高到低，高优先级覆盖低优先级）

1. **权威来源直接判词**（standard/stats_gov/expert_interview中明确的"又名/简称/即"）
2. **硬约束验证**（Schema/引用完整性/流向无环/撞名）
3. **人工审核结论**（accepted/rejected/modified）
4. **高置信规则匹配**（exact_alias/definition_patterns明确匹配）
5. **AI高置信建议**（confidence≥0.85，且不与上述冲突）
6. **AI中置信建议**（confidence 0.6-0.85，进入ai_assisted auto但可被review质疑）
7. **AI低置信/规则弱信号**（全部进入manual_review）

**核心铁律**：
- 权威说什么就是什么，AI和国标矛盾时以国标为准
- AI建议必须附带reasoning，且记录使用的model和prompt_version
- AI不能绕过V层验证，所有AI产出的节点/边都要过V1-V5
- 人工随时可在review界面看到哪些决策是AI辅助做出的，并可一键驳回
- auto-decisions.json中ai_assisted决策必须带ai_suggestion_id引用
- merge-log.json中ai辅助操作标记`via: 'ai_assisted'`
- review-report.md中ai_assisted项明确标记⚠️AI辅助，折叠reasoning默认不展示（防自动化偏见）
- 审核时标记"此AI建议错误"的反馈记入ai-suggestions.json，作为未来prompt优化依据

### LLM能力边界（明确不交给AI的决策）

以下决策即使AI给出高置信，也必须走人工或规则：
- **节点删除**：AI只能建议merge，不能建议delete（delete可能丢失无法恢复的数据）
- **primary_chain跨链强冲突**：当一个节点在多条链中都有密集边连接时（如铜箔在锂电+PCB都重要），primary_chain必须人工裁定
- **权威矛盾仲裁**：两个权威来源给出不同名称/分类时，AI不做仲裁
- **新relation_type创建**：AI可以建议"这看起来像一种新关系"，但新relation_type必须人工审批后加入RelationType枚举
- **ChainDef配置变更**：产业链的主轴/支链关系定义影响全局布局，纯人工决策

### LLM接入点设计

AI不替代现有N/E管线的任何模块，而是作为"额外候选生成器"在以下环节注入建议：

| 接入点 | 文件 | AI输入 | AI输出（AiSuggestion） | 置信度阈值 | 自动应用条件 |
|--------|------|--------|----------------------|-----------|------------|
| **N2补充** | `candidate-detector.ts` | 规则已选出的候选对+漏检的疑似对 | `duplicate_candidate`（含建议merge_keep哪个为name、是否跨类型） | ≥0.85 auto；0.6-0.85 ai_assisted；<0.6 manual | 规则无冲突+无权威冲突 |
| **N2新增** | `candidate-detector.ts` | 所有draft节点对（阻塞索引后子集） | `duplicate_candidate`（规则漏检的语义相似对） | ≥0.85 进review；<0.85 不进入候选（低置信不打扰人工） | 必须经过规则复算+权威验证才可能auto |
| **N1/N5补充** | `name-normalizer.ts`/`name-assigner.ts` | 节点definition、来源上下文 | `alias_candidate`、`contextual_name_candidate`、`document_title_flag` | ≥0.7 auto加入aliases（source=ai_suggested） | 不与已有aliases撞名 |
| **N6补充** | `chain-assigner.ts` | 节点definition+邻居摘要 | `primary_chain_candidate`（含建议chain_id和理由） | ≥0.8 auto；<0.8 manual | 邻居密度规则无强反例 |
| **E1补充** | `edge-extractor.ts` | 节点对+两者definition | `edge_candidate`（含建议relation_type、方向、置信度） | ≥0.85 且通过E2-E4验证后auto | 必须通过流向无环+类型兼容验证 |
| **E1新增** | `edge-extractor.ts` | 单个节点definition文本 | `is_subclass_candidate`（从"X是Y的一种""Y包括X"等语义推断父子） | ≥0.7 进review（is_subclass_of不影响主轴布局，风险低） | 不自动应用，需review |
| **R阶段辅助** | `review-assistant.ts` | manual_review项+所有相关证据 | 为审核者提供"AI判断建议+依据摘要"，帮助人工决策 | n/a（仅供参考） | 不自动应用 |

### 可追溯性设计（AI可审计）

每条AI建议必须满足"三可"：

1. **可溯源**：
   - AiSuggestion记录`model`（如"gpt-4o-mini"）、`prompt_version`（如"v1.2"）、`reasoning`（AI给出的判断依据文本）
   - AiCallLog记录完整的input_summary和output_summary、token消耗、延迟，便于成本审计和错误定位
2. **可驳回**：
   - `reviewed`字段记录人工决策（accepted/rejected/modified）
   - 驳回后AI建议不再被auto应用，但保留在历史记录中供分析
   - 提供`rollback --ai`命令一键回滚所有AI辅助的自动决策，回到纯规则结果
   - 模型升级或prompt版本变更时，可重新对历史AiSuggestion打分，对比新旧决策差异
3. **可回滚**：
   - AI辅助的merge/alias/edge操作在merge-log.json中标记`via: 'ai_assisted'`
   - ai-suggestions.json缓存键：`{task_type}:{model}:{prompt_version}:{nodeA_hash}:{nodeB_hash?}`，内容/prompt/model任一变化则自动失效
   - 提供`--ai-refresh`参数强制忽略缓存重新生成

### Prompt设计原则

1. **领域约束注入**：每个prompt开头明确告诉AI它在处理产业链知识图谱，列出允许的node_type、relation_type、产业链ID枚举，避免开放域幻觉
2. **少样本示例**：每个任务类型提供3-5个产业链领域示例（含正确/错误对照）
3. **输出结构化**：要求JSON输出，字段严格对应AiSuggestion.payload schema，未确定字段填null而非编造
4. **不确定性表达**：要求AI对每条判断给出1-100置信度，且明确要求"不确定就给低分，不要猜"
5. **来源限定**：要求AI只基于提供的节点文本判断，不要引入外部信息（联网验证是独立阶段，由N4负责）
6. **反幻觉指令**：明确告诉AI"如果你不知道，回答不知道，不要编造标准编号、公司名称、化学分子式"

### 分阶段启用策略

LLM接入不是v1必做项，而是按以下节奏启用：

- **v1（当前阶段）**：pipeline纯规则运行，不调用LLM。AiSuggestion/AiCallLog类型预留，代码结构上留出ai-suggester.ts接口位置但默认不启用。928节点先跑纯规则baseline。
- **v1.5（baseline验证后）**：启用N2补充、E1补充、R阶段辅助三个低风险接入点。在928节点上对比纯规则vs AI辅助的manual_review量、错误率，量化AI增益。若指标达标（接受率≥60%、manual_review降低≥50%、高置信错误率<3%、成本<$5），默认启用`--ai`。
- **v2（交互上线后）**：根据v1.5数据，决定是否启用N5/N6/E1新增等接入点；引入主动学习闭环——人工review的accepted/rejected数据定期反馈，用于优化prompt或微调小模型。
- **v2+（规模化后）**：当节点量超过5万，考虑引入本地部署的小模型（如Qwen2.5-7B/14B）做初筛，高难度任务才调用云端大模型，降低成本。

### 与现有代码的集成点

新增文件：
- `scripts/pipeline/ai/ai-suggester.ts` —— AI建议生成入口，封装模型调用、prompt管理、结果解析
- `scripts/pipeline/ai/prompts/` —— 按任务类型存放prompt模板（duplicate-candidate.txt、edge-candidate.txt等），版本化管理
- `scripts/pipeline/ai/ai-decision-gate.ts` —— 决策引擎，综合规则/权威/AI产出决策
- `scripts/pipeline/ai/review-assistant.ts` —— R阶段辅助，为manual_review项附加AI判断摘要
- `data/pipeline/ai-suggestions.json` —— 持久化AiSuggestion（含input_hash），增量处理时复用（同一节点对未变更时不重复调LLM）
- `data/pipeline/ai-call-logs.json` —— 调用日志（可选保留，用于成本分析）

现有模块的修改：
- N2 candidate-detector.ts：在规则检测之后，调用aiSuggester.suggestDuplicates()补充候选，合并去重
- E1 edge-extractor.ts：在来源边+parent_type派生之后，调用aiSuggester.suggestEdges()补充候选边
- V层validator.ts：V层验证不区分规则产出vs AI产出，同等对待，AI产出的边/节点也必须通过全部V验证

---

## 数据访问层（DAL）扩展设计

### DAL预构建缓存

JsonDataProvider加载时一次性构建以下缓存，查询时直接使用，索引增量更新（只有变更节点/边重新索引，不全量重建）：
- nodeMap: Map<id, GraphNode>
- adjacencyList: Map<nodeId, {outgoing: Edge[], incoming: Edge[]}>（区分方向）
- chainNodeMap: Map<chainId, Set<nodeId>>
- edgeRoleCache: Map<`${chainId}:${edgeId}`, EdgeRole>（首次查询时计算缓存）
- nameIndex: 用于多名称搜索

内存估算：10万节点+50万边≈250MB内存，全内存JSON加载可行。

### 扩展后的GraphDataProvider接口

```typescript
export interface GraphDataProvider {
  // —— 基础查询 ——
  getGraphData(): GraphData;
  getNodeById(id: string, includeReferenceOnly?: boolean): GraphNode | undefined;
  getNodeChildren(parentId: string): GraphNode[];
  getNodeParent(childId: string): GraphNode | undefined;
  getNodeNeighbors(nodeId: string, relationType?: RelationType): GraphNode[];
  getNeighborsAtDepth(nodeId: string, depth: number, relationTypes?: RelationType[]): GraphNode[];

  // —— 搜索（支持contextual_names + chain-aware + reference_only过滤）——
  searchNodes(query: string, chainId?: string, limit?: number, offset?: number): GraphNode[];
  matchesSearch(node: GraphNode, query: string): boolean;
  sortSearchResults(nodes: GraphNode[], query: string, currentChainId?: string): GraphNode[];

  // —— 命名 ——
  getDisplayName(nodeId: string, chainId?: string): string;
  getNodeAliases(nodeId: string): Alias[];
  resolveNodeId(id: string): string;  // 处理merged节点重定向（带路径压缩）

  // —— 产业链 ——
  getChainDef(chainId: string): ChainDef | undefined;
  getViewableChains(): ChainDef[];
  getNodeChains(nodeId: string): string[];
  getNodePrimaryChain(nodeId: string): string | undefined;
  isCrossChainNode(nodeId: string, currentChainId: string): boolean;

  // —— 产业链视图（为渲染层服务）——
  getMainAxisNodes(centerNodeId: string, chainId: string, maxDepth?: number): {
    upstream: GraphNode[][];    // 主轴上游节点（按跳数分层）
    center: GraphNode;
    downstream: GraphNode[][];  // 主轴下游节点（按跳数分层）
  };
  getBranchNodes(mainAxisNodeIds: Set<string>, chainId: string): GraphNode[];
  classifyEdgeForChain(edge: GraphEdge, chainId: string, mainAxisNodeIds: Set<string>): EdgeRole;

  // —— 关系流向 ——
  getEffectiveFlow(edge: GraphEdge, chainId?: string): RelationFlow;
  getNodeNeighborsByFlow(nodeId: string, chainId?: string): {
    upstream: GraphNode[];
    downstream: GraphNode[];
    horizontal: GraphNode[];
  };

  // —— 状态查询 ——
  getDataVersion(): string;
}
```

reference_only软隐藏过滤：DAL默认过滤reference_only节点和reference_edge，getNodeById提供includeReferenceOnly参数用于来源追溯场景。

### 工具函数（src/lib/name-display.ts, src/lib/relation-utils.ts）

```typescript
// name-display.ts
function getDisplayName(node: GraphNode, chainId?: string): string;
function matchesSearch(node: GraphNode, query: string): boolean;
function sortSearchResults(nodes: GraphNode[], query: string, currentChainId?: string): GraphNode[];

// relation-utils.ts（E阶段和DAL共用，禁止各自实现）
function calculateEffectiveFlow(relationType: RelationType, chainId?: string): RelationFlow;
```

### API路由更新

现有API路由保持，补充：
- /api/graph/chains — 返回所有可查看产业链列表
- /api/graph/node/[id]/chain/[chainId]/view — 返回产业链视图（主轴+支链）
- /api/graph/node/[id]/display-name?chain=xxx — 返回语境敏感名称
- /api/graph/version — 返回当前数据版本号

API路由是JsonDataProvider的HTTP包装，不重复业务逻辑。前端在静态JSON模式下仍通过import+DAL访问（保持性能优势），API路由为未来SSR/增量加载场景准备。

---

## 与交互层的契约

### 数据层必须保证提供

1. **节点身份稳定**：合并后ID重定向可追溯（resolveNodeId），历史URL/收藏不失效
2. **ChainDef完备**：每条可查看链的main_axis_relations/branch_relations明确，relation_type方向正确
3. **主轴遍历可靠**：getMainAxisNodes沿RELATION_FLOW方向BFS不循环、不遗漏（内建环检测）
4. **名称切换可预测**：getDisplayName(nodeId, chainId)确定性地返回该视角显示名
5. **搜索域完整**：name+all aliases+all contextual_names全部可搜索命中
6. **跨链节点可识别**：支链节点primary_chain !== currentChainId时可视觉标记（DAL提供isCrossChainNode查询接口）
7. **边角色可判断**：classifyEdgeForChain正确返回主轴/支链/外边/跨链边，禁止前端重写方向逻辑
8. **状态可枚举**：节点stage(draft/reviewed/merged)、边verification_status(verified/proposed)可用于视觉样式
9. **版本感知**：getDataVersion()返回当前版本号，支持轮询检测更新
10. **reference_only过滤**：默认不展示文档名/引用节点，需要时可通过includeReferenceOnly访问

### 数据层不负责（交互/渲染层实现）

1. 3D坐标计算（graph-layout.ts职责，数据层提供getMainAxisNodes/getBranchNodes等语义邻居供布局算法用）
2. 相机飞行动画/视角切换过渡
3. 节点标签的视觉样式（颜色/大小/透明度由node_type/stage决定，但实际渲染是渲染层）
4. 主轴边/支链边/外边/跨链边的视觉样式（数据层给出分类，渲染层决定实线/虚线/透明度/高亮）
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
| 跨链节点如何识别？ | 支链节点primary_chain !== "pv_chain"吗？ | isCrossChainNode |
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
| [src/lib/types.ts](file:///workspace/src/lib/types.ts) | NodeStage增加merged；SourceType增加stats_gov/cninfo/ai_suggested；新增RelationFlow/ChainRelation/ChainDef/ContextualName/EdgeRole/AiSuggestion/AiCallLog类型；Alias加source；GraphNode加chains/primary_chain/contextual_names/merged_from/merged_into/reference_only/content_hash；GraphEdge加reference_edge；GraphData加version/published_at |
| [schema.json](file:///workspace/schema.json) | 同步类型扩展 |
| [src/lib/graph-data.ts](file:///workspace/src/lib/graph-data.ts) | JsonDataProvider扩展：新增产业链/命名/流向查询方法；searchNodes支持chainId/contextual_names/offset/reference_only过滤；buildIndexes增加chain索引/adjacencyList/edgeRoleCache预构建缓存 |
| [src/lib/data-validator.ts](file:///workspace/src/lib/data-validator.ts) | validateDataIntegrity扩展：检查merged_into循环/contextual_names.chain_id/chains引用有效性/reference_only一致性；被pipeline调用 |
| [scripts/crawler/utils.ts](file:///workspace/scripts/crawler/utils.ts) | crawledNodeToGraphNode支持新字段（默认值）；generateId改进；保持向后兼容；content_hash计算 |
| [scripts/crawler/merge-data.ts](file:///workspace/scripts/crawler/merge-data.ts) | 保留作为兼容入口，内部可调用新pipeline或标注deprecated |
| [.gitignore](file:///workspace/.gitignore) | 添加data/runs/、data/backups/、data/pipeline/、data/feedback/ |

### 需要新增的文件

**v1（pipeline核心）：**

| 文件 | 说明 |
|------|------|
| `src/lib/chains.ts` | RELATION_FLOW、ChainRelation、ChainDef、CHAIN_DEFS |
| `src/lib/name-display.ts` | getDisplayName/matchesSearch/sortSearchResults |
| `src/lib/relation-utils.ts` | calculateEffectiveFlow等公共函数，E阶段和DAL共用 |
| `scripts/pipeline.ts` | CLI主入口（run/review/apply/publish/rollback/validate等命令） |
| `scripts/pipeline/`目录下核心模块 | N1-N7三遍收敛、E1-E5、V1-V5、R/A阶段、阻塞索引、内容hash、文件锁、原子写入 |
| `scripts/pipeline/review-cli.ts` | 交互式审核CLI（风险分级、快捷键、单条撤销、断点续审、影响预览、--blind模式） |
| `scripts/pipeline/feedback.ts` | 用户反馈加载与处理 |
| `data/processed/ignored-pairs.json` | 不重复对持久化（含content hash，首次pipeline自动生成） |
| `data/chains/*.json` | ChainDef JSON配置（pv_chain/battery_chain/material_chain模板） |
| `data/feedback/`目录 | 用户反馈JSON文件存放 |
| `data/backups/`目录 | 独立备份目录 |

**v1.5（LLM增强）：**

| 文件 | 说明 |
|------|------|
| `scripts/pipeline/ai/ai-suggester.ts` | AI建议生成入口，封装模型调用、prompt管理、结果解析 |
| `scripts/pipeline/ai/ai-decision-gate.ts` | 决策引擎，综合规则/权威/AI产出auto/manual/reject决策 |
| `scripts/pipeline/ai/review-assistant.ts` | 为manual_review项附加AI判断摘要 |
| `scripts/pipeline/ai/prompts/*.txt` | 按任务类型的prompt模板，版本化管理 |
| `data/pipeline/ai-suggestions.json` | AiSuggestion持久化（含input_hash），增量复用避免重复调LLM |

### 文件组织结构

```
scripts/
├── pipeline.ts                     ← CLI主入口
├── pipeline/                       ← pipeline模块目录
│   ├── types.ts                    ← 内部类型（CandidateDecision, RunResult等）
│   ├── crawl/
│   │   ├── index.ts                ← crawler registry，调度所有爬虫
│   │   └── sources/                ← 各数据源适配器
│   │       ├── stats-gov.ts
│   │       ├── gb-standards.ts
│   │       ├── cninfo.ts
│   │       └── manual-chain.ts
│   ├── nodes/
│   │   ├── name-normalizer.ts      ← N1
│   │   ├── candidate-detector.ts   ← N2（含Blocking索引）
│   │   ├── authority-verifier.ts   ← N3
│   │   ├── web-verifier.ts         ← N4（可选）
│   │   ├── name-assigner.ts        ← N5
│   │   ├── name-collision.ts       ← N7
│   │   └── chain-assigner.ts       ← N6
│   ├── edges/
│   │   ├── edge-extractor.ts       ← E1
│   │   ├── flow-annotator.ts       ← E2
│   │   ├── edge-merger.ts          ← E3
│   │   └── edge-validator.ts       ← E4
│   ├── validate/
│   │   ├── schema-validator.ts     ← V1
│   │   ├── integrity-validator.ts  ← V2（含merged_into循环检测）
│   │   ├── semantic-validator.ts   ← V3
│   │   ├── cycle-detector.ts       ← V4（三色DFS）
│   │   └── collision-reporter.ts   ← V5
│   ├── review/
│   │   ├── decision-engine.ts      ← 综合决策（汇总N/E结果生成auto-decisions）
│   │   ├── report-generator.ts     ← 生成review-report.md
│   │   ├── review-cli.ts           ← 交互式审核CLI
│   │   └── ignored-pairs.ts        ← 不重复对持久化管理
│   ├── apply/
│   │   ├── backup-manager.ts       ← 备份/回滚
│   │   ├── node-merger.ts          ← 节点合并执行（含路径压缩+链式扁平化）
│   │   ├── edge-migrator.ts        ← 边迁移执行
│   │   └── merge-executor.ts       ← A阶段总调度（原子执行）
│   ├── publish/
│   │   └── publisher.ts            ← 原子发布（tmp+rename+版本号+.prev备份）
│   ├── ai/                         ← v1.5
│   │   ├── ai-suggester.ts
│   │   ├── ai-decision-gate.ts
│   │   ├── review-assistant.ts
│   │   └── prompts/
│   └── utils/
│       ├── id-resolver.ts          ← merged ID重定向（路径压缩）
│       ├── blocking-index.ts       ← 阻塞索引
│       ├── content-hash.ts         ← 内容hash计算
│       ├── file-lock.ts            ← 文件锁
│       ├── atomic-write.ts         ← 原子写入
│       ├── run-context.ts          ← run_id/目录管理
│       └── logger.ts               ← 结构化日志
├── crawler/                        ← 现有爬虫保留
│   ├── stats-gov-crawler.ts
│   ├── gb-standards-crawler.ts
│   ├── cninfo-crawler.ts
│   ├── extract-edges-from-standards.ts
│   ├── merge-data.ts               ← 保留兼容
│   ├── types.ts
│   ├── utils.ts
│   └── tsconfig.json
└── generate-battery-chain.js       ← 现有保留
```

### 保持不变的文件

- crawler/下三个爬虫（stats-gov/gb-standards/cninfo）—— 被pipeline/crawl/sources/引用
- extract-edges-from-standards.ts —— 作为边提取器被引用
- generate-battery-chain.js —— 电池链生成脚本
- src/app/api/graph/* —— API路由存在，保持，后续扩展链查询接口
- src/components/Graph3D/* —— 渲染层不在本次改动
- src/store/graphStore.ts —— 等交互方案确定后扩展currentChainId
- src/lib/graph-layout.ts —— 等交互方案确定后改造为chain-aware布局

### 增量更新机制

当新数据源加入或已有数据源更新时：
1. 新raw数据放入data/raw/
2. pipeline检测已有graph-data.json作为基线
3. 新节点/新边进入管线，**已reviewed的节点和verified的边不被自动修改**（除非显式--reprocess）
4. 仅对新增节点/边和draft/proposed状态的数据做处理
5. 对已有节点新增的aliases/contextual_names/chains关联，通过增量合并而非全量重做实现
6. content_hash未变化的节点/边跳过候选检测和重处理
7. ignored_pair中任一节点content hash变化时自动失效重评

实现机制：
- 已通过人工审核的决策记录在data/processed/ignored-pairs.json中（含content_hash）
- 节点有stage字段（draft/reviewed/merged），reviewed节点默认不被自动修改名称或合并
- 新数据只产生draft阶段的节点/边，与现有reviewed数据合并时不覆盖reviewed内容
- ai-suggestions.json缓存键基于content_hash，内容不变不重复调LLM

---

## 风险与防护

### 高风险与防护措施

1. **误合并破坏数据**：dry-run默认、强制全量备份、merged节点不删除可回滚、不直接覆盖生产数据、验证阻断、原子合并（无中间态）、链式合并扁平化
2. **contextual_name撞名父类**：N7撞名检测前移、三级撞名分级、阻断级撞名拒绝apply、manual_review提示三种处理可能
3. **简称歧义**（"PC"=聚碳酸酯/个人电脑）：英文缩写不作为name首选、aliases加context和note、搜索返回多结果、歧义简称不放入全局aliases只放入特定chain的contextual_names（v2）
4. **父子关系误判为合并**：技术修饰词识别优先判parent_child、子串包含权重低、definition_patterns识别父子关系、高置信候选父子预过滤
5. **国标文档名误入节点**：多信号is_document_title识别（后缀词+definition关键词+source_type综合权重）、reference_only软隐藏、DAL默认过滤、is_possible_document进入review
6. **流向定义错误导致布局错乱**：RELATION_FLOW作为独立可审查配置（chains.ts）、ChainDef可覆盖、V4三色DFS无环检测、classifyEdgeForChain统一封装方向判定、calculateEffectiveFlow公共模块禁止各自实现
7. **pipeline破坏已有前端**：dry-run不碰持久化状态、apply输出到独立run目录、需显式publish才覆盖src/data/graph-data.json、原子发布（tmp+rename）、publish前自动V1-V5验证、双版本缓冲（.prev）、quick-rollback
8. **parent_type分类边混入产业链主轴**：is_subclass_of为horizontal流向、V3验证强制检查main_axis_relations无horizontal flow、保证不会误用于产业链横向布局
9. **LLM幻觉污染数据**：AI不直接写入数据只产出AiSuggestion、必须经过V层验证+决策引擎、高置信阈值保守（≥0.85才auto）、权威判词优先级高于AI、所有ai_assisted决策标记ai_suggestion_id、`rollback --ai`一键回滚、AI错误反馈记录用于prompt优化
10. **自动化偏见（审核者放松警惕）**：review中ai_assisted决策明确标记⚠️AI辅助、reasoning默认折叠、`--blind`模式先隐藏AI建议让人工独立判断、定期抽样复核AI高置信自动决策
11. **LLM成本失控**：AiCallLog记录token消耗、提供`--ai-model`选择（默认gpt-4o-mini）、ai-suggestions.json持久化缓存（input_hash键）相同输入不重复调用、单次pipeline成本预估<$5、节点量>5万时切换本地小模型初筛

### 设计边界与已知限制

1. **主轴可能是Y形树而非单线**：多个上游原料（如铝合金+硅料同时作为光伏组件的上游）会产生并行分支，这是真实产业链结构的反映。v1接受Y形主轴，布局层处理同跳(rank)节点的y轴偏移；v2可考虑引入"主路径权重"概念来选择主轴主线。
2. **contextual_names必须数据驱动**：如果battery_chain数据里没有"太阳能板"名称的节点，N5(光伏组件)就不会自动获得battery_chain contextual_name，不做AI幻觉式填名。
3. **primary_chain=null是合法状态**：跨链共用材料无法自动判定主链时保持null，由人工设定。
4. **material/product是唯一允许跨类型比较的组合**：中文产业语境下两者经常混用（隔膜/电极/箔材既是材料名也是产品名），industry/equipment/process保持严格类型匹配。
5. **classifyEdgeForChain必须由DAL封装**：反向边的方向推理极易出错，DAL统一返回{role, direction, upstreamNode, downstreamNode}，前端/布局层禁止重写方向逻辑。
6. **dry-run写入边界**：dry-run不碰任何持久化状态，只写data/runs/{run_id}/目录，不修改data/raw/、data/processed/、src/data/等目录。

### v2 进阶方向

1. **ChainDef主路径权重**：为main_axis_relations中的边类型配置权重（can_be_processed_into=1.0, raw_material_for=0.7），主轴BFS时优先选择权重高的路径作为X轴主线，辅材/结构件自动降级为支链或y轴偏移。
2. **歧义简称检测增强**：alias.term等于其他节点的name/contextual_name时标记撞名警告；可能跨领域歧义的简称（"PC""PS""PP"等）不放入全局aliases，只放入特定chain的contextual_names。
3. **cross_chain标记辅助字段**：在DAL返回的节点视图数据中增加`is_cross_chain: boolean`字段，减少前端重复计算。
4. **is_subclass_of层级遍历**：利用is_subclass_of边构建完整分类树，支持"查看同类材料"等横向导航。
5. **LLM混合增强深化**：v1.5启用N2/E1/R低风险接入点，v2扩展到N5/N6/E1新增，引入主动学习闭环（人工review标注反哺prompt优化/模型微调）。
6. **本地小模型初筛**：节点量>5万时部署Qwen2.5-7B/14B等级别的本地模型做初筛，高难度任务才调云端大模型，降低成本。
7. **Web审核后台**：CLI审核之上提供Web UI审核工作台，支持多人协作审核、可视化预览合并效果。

### 权威来源边界

- stats_gov只覆盖industry类型节点
- standard/gb_standard覆盖material/product/equipment的正式术语
- 百科/LLM不构成判词
- 不同权威矛盾→必走manual_review
- applied_in等context_dependent关系类型在ChainDef中可独立配置流向

### 不做的事

- 不做实时数据更新（每次pipeline是批处理）
- 不做分布式处理（单机足够支撑10万节点量级）
- 不做节点编辑UI（通过文件和脚本管理，v2考虑Web后台）
- 不做权限/审核工作流（v1通过CLI命令和操作文档自然区分角色）
- 不做数据可视化的布局和样式

---

## 实施阶段

建议分四阶段实施：

### 阶段一（v1核心）：数据模型+pipeline核心+928节点验证（纯规则baseline）

- 修改types.ts、schema.json（GraphNode增加reference_only/content_hash，GraphData增加version/published_at）
- 创建chains.ts、name-display.ts、relation-utils.ts
- 实现pipeline核心模块：
  - 三遍收敛架构（N1→N2→N3→N4→N5→N7→N6）
  - E1-E5边处理
  - V1-V5验证（含三色DFS无环检测、merged_into循环检测）
  - R阶段决策+交互式CLI审核
  - A阶段原子合并（路径压缩+链式扁平化）
  - P阶段原子发布
- 工程可靠性保障：文件锁+原子写入、阻塞索引(Blocking)、独立备份目录、content_hash幂等性、resolveNodeId路径压缩
- 实现文件级反馈入口（data/feedback/）
- ChainDef支持从data/chains/*.json加载+校验+预览命令
- 扩展JsonDataProvider查询接口（支持reference_only过滤、maxDepth、offset分页、预构建缓存）
- DAL预构建索引和缓存
- 跑通928节点实验（纯规则），输出review-report.md，记录manual_review数量/耗时作为baseline
- 100节点预试校准预估时间

### 阶段二（v2对接）：对接渲染层+API

- 根据交互设计微调ChainDef（main_axis/branch配置）
- graphStore增加currentChainId
- graph-layout.ts改造为chain-aware
- Graph3D组件对接getDisplayName
- 主轴/支链/跨链边视觉区分
- 相机动画扩展
- 补充chain相关API路由
- 节点详情面板增加"反馈问题"按钮
- 上线内部试用，收集人工审核反馈和用户反馈
- 前端版本感知（数据更新提示刷新）

### 阶段三（v1.5 AI）：LLM低风险接入点启用

- 实现ai-suggester.ts、ai-decision-gate.ts及prompt模板
- 启用N2补充、E1补充、R阶段辅助三个低风险接入点
- 在928节点上对比纯规则vs AI辅助的效果：manual_review量、AI建议接受率、AI高置信错误率、单次pipeline成本
- 若指标达标（接受率≥60%、manual_review降低≥50%、高置信错误率<3%、成本<$5），默认启用`--ai`
- 上线`rollback --ai`能力，确保可一键回退到纯规则结果
- `--blind`审核模式防自动化偏见

### 阶段四（v2+规模化）：AI增强深化+性能扩展

- 扩展N5/N6/E1新增接入点
- 引入主动学习闭环（人工review标注反哺prompt优化）
- 节点量>5万时部署本地小模型做初筛
- 评估ChainDef主路径权重等高级特性
- 可选：Web审核后台

---

## 成功标准

1. **pipeline一键可跑**：`npm run pipeline` 在当前928节点上完整执行三遍收敛，输出结构化报告和交互式审核入口
2. **验证自动运行**：pipeline各阶段、apply前、publish前都调用validator，验证不通过阻断流程
3. **权威判词100%执行**：国标/统计局明确"又名/简称/即"的实体，合并准确率100%
4. **实体消歧质量基线**：928节点baseline（纯规则）节点净减少15-35个；人工抽样100个样本检验，规则合并准确率≥90%，召回率≥75%
5. **回滚可靠性**：连续5次apply→rollback循环，数据一致性100%；quick-rollback和rollback --ai可用；原子发布无半写文件
6. **DAL接口覆盖**：十字交叉场景走查100%通过，所有交互需求有对应接口支撑
7. **审核效率达标**：v1纯规则manual_review≤60项，平均每项审核≤3分钟；CLI交互式review可用（风险分级、快捷键、影响预览、断点续审）
8. **零生产事故**：publish后前端无崩溃无报错，主要功能正常；reference_only软隐藏生效无噪声节点
9. **数据可追溯**：100%合并/名称变更都有source依据或审核记录，无黑盒决策；merged_into链可追溯无循环
10. **AI增强质量门**（v1.5）：AI建议接受率≥60%，较baseline manual_review降低≥50%，AI高置信自动决策错误率<3%，单次928节点pipeline AI成本<$5
