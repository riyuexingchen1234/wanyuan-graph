# 万源图谱 v2 重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于 schema.json v0.2 完全重构万源图谱前端，建立"节点定义 → 物理流动链 → 材料属性延伸网 → 可信度体系"的完整体验，让用户能亲手探索一张真实可追溯的产业关系网。

**Architecture:** 分六阶段递进，每阶段产出可独立验证的工作软件。第一阶段打类型系统与节点数据的根基；第二阶段做节点浏览体验；第三阶段做物理流动链主体验（渐进式局部展开）；第四阶段做材料属性延伸网（差异化灵魂）；第五阶段完善可信度与溯源；第六阶段打磨 demo。

**Tech Stack:** Next.js 14 App Router + TypeScript + React 18 + Tailwind CSS + Cytoscape.js + cytoscape-dagre + dagre

---

## 文件结构总览

### 第一阶段新增/修改文件
| 文件 | 操作 | 职责 |
|------|------|------|
| `src/lib/types.ts` | 重写 | 严格对应 schema v0.2 的 TypeScript 类型：Node/Edge/Source/NodeType/RelationType/VerificationStatus/SourceType 等 |
| `src/data/nodes-draft.json` | 新建 | 第一阶段节点数据（draft 状态，仅 name/definition/node_type/parent_type/sources） |
| `src/lib/graph-data.ts` | 重写 | 数据层：getGraphData/getNodeById/searchNodes/getNodeChildren/getParentNode 等，edge 相关暂返回空 |
| `src/app/api/graph/route.ts` | 重写 | API：`GET /api/graph`（全量节点+空边）、`GET /api/graph?node={id}`（节点详情+子类列表+父节点） |
| `src/lib/schema-validator.ts` | 修改 | 适配新 schema（路径从 `schema.json` 读取，验证结构一致性） |

### 第二阶段新增/修改文件
| 文件 | 操作 | 职责 |
|------|------|------|
| `src/components/SearchBar.tsx` | 重写 | 搜索节点名称，结果显示节点类型标签，回车选中 |
| `src/components/NodeDetail.tsx` | 重写 | 节点详情面板：name/definition/node_type/stage/parent_type/sources/子节点列表 |
| `src/components/IntroOverlay.tsx` | 重写 | 引导页：说明当前处于节点录入阶段，介绍项目理念 |
| `src/app/page.tsx` | 重写 | 主页面交互：搜索 → 选中节点 → 显示详情；画布区域显示占位提示 |

### 第三阶段新增/修改文件
| 文件 | 操作 | 职责 |
|------|------|------|
| `src/data/graph-data.json` | 新建 | 完整图谱数据（节点 + 边），从 nodes-draft 扩展，录入第一批边 |
| `src/lib/graph-data.ts` | 修改 | 扩展边查询函数：getNodeNeighbors/getNodeChainSummary/getChainView 等 |
| `src/lib/cytoscape-config.ts` | 重写 | Cytoscape 样式与布局配置（按节点类型着色、按关系类型着色、verified/proposed 视觉区分、dagre 布局） |
| `src/components/GraphCanvas.tsx` | 重写 | 图谱画布：渐进式局部展开、按关系类型过滤、dagre 层次布局、边悬停 tooltip |
| `src/components/NodeDetail.tsx` | 修改 | 增加"关系"区域：按 relation_type 分组展示直接连接 |
| `src/app/page.tsx` | 修改 | 增加链路视图切换、面包屑导航 |
| `src/app/api/graph/route.ts` | 修改 | 增加 `GET /api/graph?node={id}&chain={relationType}&depth={n}` 链路视图接口 |

### 第四阶段新增/修改文件
| 文件 | 操作 | 职责 |
|------|------|------|
| `src/data/graph-data.json` | 修改 | 录入材料延伸边（applied_in/can_be_processed_into） |
| `src/components/NodeDetail.tsx` | 修改 | 材料节点增加"材料属性延伸"特殊入口（粉色左边框、独立卡片） |
| `src/components/GraphCanvas.tsx` | 修改 | 材料延伸视觉模式（紫粉色调、粉色连线、菱形材料节点、星图感布局） |
| `src/lib/cytoscape-config.ts` | 修改 | 增加材料延伸主题的样式变体 |

### 第五阶段新增/修改文件
| 文件 | 操作 | 职责 |
|------|------|------|
| `src/components/GraphCanvas.tsx` | 修改 | 边详情面板：点击边展开完整 evidence 列表 |
| `src/components/NodeDetail.tsx` | 修改 | sources 区域可展开查看来源详情 |
| `src/app/page.tsx` | 修改 | 画布左下角增加可信度图例 |

### 第六阶段新增/修改文件
| 文件 | 操作 | 职责 |
|------|------|------|
| `src/app/page.tsx` | 修改 | 推荐起始节点、首次使用引导高亮 |
| `src/components/IntroOverlay.tsx` | 修改 | 完善 demo 引导文案 |

### 删除/归档文件
| 文件 | 操作 | 原因 |
|------|------|------|
| `src/data/sample-data.json` | 移至 `scripts/data-collection/output/sample-data-old-backup.json` | 旧格式数据，不再使用 |
| `src/components/KeyboardShortcuts.tsx` | 删除 | 不再需要快捷键面板 |
| `src/app/api/graph/search/route.ts` | 删除 | 搜索功能合并到主 API 路由 |
| `workspace/types.ts`（根目录） | 删除 | 旧类型定义，已被 src/lib/types.ts 取代 |
| `workspace/sample-data.json`（根目录） | 删除 | 旧示例数据，已被 src/data/ 取代 |

---

## 第一阶段：类型系统与数据骨架

### Task 1.1: 重写 TypeScript 类型定义（schema v0.2 对齐）

**Files:**
- Modify: `src/lib/types.ts`

**Goal:** 类型定义与 schema.json v0.2 严格对应，消除旧模型的遗留字段。

- [ ] **Step 1: 备份旧 types.ts**

```bash
cp src/lib/types.ts src/lib/types.old.ts.bak
```

Expected: 文件复制成功。

- [ ] **Step 2: 写入新的类型定义**

```typescript
// 万源图谱 - TypeScript 类型定义
// 严格对应 schema.json v0.2

/** 节点本体类型 */
export type NodeType =
  | 'material'   // 材料
  | 'process'    // 工艺
  | 'equipment'  // 设备
  | 'product'    // 产品（具体物品）
  | 'industry'   // 行业（归类型节点）
  | 'entity';    // 实体（具体经营实体，预留）

/** 节点录入阶段 */
export type NodeStage = 'draft' | 'reviewed';

/** 验证状态 */
export type VerificationStatus = 'verified' | 'proposed';

/** 关系类型（开放列表，可扩展） */
export type RelationType =
  | 'upstream_of'
  | 'downstream_of'
  | 'raw_material_for'
  | 'equipment_for'
  | 'consumable_for'
  | 'can_be_processed_into'
  | 'applied_in'
  | 'structurally_similar_to'
  | 'made_of';

/** 来源类型 */
export type SourceType =
  | 'patent'
  | 'standard'
  | 'industry_report'
  | 'news'
  | 'expert_interview'
  | 'official_data'
  | 'encyclopedia'
  | 'other';

/** 可追溯的证据来源 */
export interface Source {
  source_type: SourceType;
  description: string;
  url?: string;
  retrieved_at?: string;
}

/** 图谱节点 */
export interface GraphNode {
  id: string;
  name: string;
  definition: string;
  node_type: NodeType;
  stage: NodeStage;
  parent_type: string | null;
  aliases?: Array<{
    term: string;
    context?: string;
    note?: string;
  }>;
  attributes?: {
    physical?: Record<string, string>;
    chemical?: Record<string, string>;
    process_capability?: Record<string, string>;
    cost_tier?: string;
  };
  description?: string;
  sources?: Source[];
  created_at: string;
  updated_at: string;
}

/** 提出方式（仅 proposed 状态适用） */
export interface ProposedBy {
  method: 'expert_submission' | 'user_submission' | 'ai_pattern_match' | 'editorial_research';
  reasoning?: string;
  proposed_at: string;
}

/** 图谱边（关系） */
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
}

/** 完整图谱数据 */
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** 节点详情 + 分类学关系（API 返回） */
export interface NodeDetailResult {
  node: GraphNode;
  children: GraphNode[];   // 子节点（parent_type = 本节点 id）
  parent: GraphNode | null; // 父节点
}

/** 节点链路摘要（各关系类型的上下游数量） */
export interface NodeChainSummary {
  node_id: string;
  chains: Array<{
    relation_type: RelationType;
    upstream_count: number;
    downstream_count: number;
  }>;
}

/** 链路视图（BFS 局部展开） */
export interface ChainView {
  center_node: GraphNode;
  relation_type: RelationType;
  nodes: GraphNode[];
  edges: GraphEdge[];
  depth: number;
}
```

- [ ] **Step 3: 验证 TypeScript 编译通过**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 没有类型错误（可能有其他文件的旧类型引用错误，属于预期范围，后续任务修复）。

- [ ] **Step 4: 提交**

```bash
git add src/lib/types.ts
git commit -m "refactor(types): 重写类型定义，对齐 schema v0.2

- Node/Edge/Source 严格对应 schema.json 定义
- 节点类型: material/process/equipment/product/industry/entity
- 关系类型: 开放列表 9 种
- 新增 NodeDetailResult/NodeChainSummary/ChainView 等 API 返回类型
- 旧文件备份为 types.old.ts.bak"
```

---

### Task 1.2: 创建第一版节点数据（draft 状态）

**Files:**
- Create: `src/data/nodes-draft.json`

**Goal:** 围绕样板路径录入 20 个左右 draft 节点，每个节点有 definition + 至少一条 source。

- [ ] **Step 1: 创建 nodes-draft.json**

```json
{
  "nodes": [
    {
      "id": "material-polyethylene",
      "name": "聚乙烯",
      "definition": "由乙烯单体聚合而成的热塑性树脂，包括乙烯与少量α-烯烃的共聚物，是聚烯烃中产量最大的通用塑料，不特指某一密度规格。",
      "node_type": "material",
      "stage": "draft",
      "parent_type": null,
      "sources": [
        {
          "source_type": "standard",
          "description": "国家标准 GB/T 11115-2009《聚乙烯（PE）树脂》",
          "url": "https://openstd.samr.gov.cn",
          "retrieved_at": "2026-06-23T00:00:00Z"
        }
      ],
      "created_at": "2026-06-23T00:00:00Z",
      "updated_at": "2026-06-23T00:00:00Z"
    },
    {
      "id": "material-hdpe",
      "name": "高密度聚乙烯",
      "definition": "在较低压力下由乙烯聚合制得的高结晶度热塑性树脂，密度区间0.940～0.965g/cm³，又称低压聚乙烯，是聚乙烯按密度划分的一个子类。",
      "node_type": "material",
      "stage": "draft",
      "parent_type": "material-polyethylene",
      "sources": [
        {
          "source_type": "encyclopedia",
          "description": "中国大百科全书-高密度聚乙烯词条",
          "url": "https://www.zgbk.com/ecph/words?ID=200332",
          "retrieved_at": "2026-06-23T00:00:00Z"
        },
        {
          "source_type": "standard",
          "description": "国家标准 GB/T 11115-2009《聚乙烯（PE）树脂》中按密度分类的HDPE品类",
          "retrieved_at": "2026-06-23T00:00:00Z"
        }
      ],
      "created_at": "2026-06-23T00:00:00Z",
      "updated_at": "2026-06-23T00:00:00Z"
    },
    {
      "id": "material-ldpe",
      "name": "低密度聚乙烯",
      "definition": "在高压（100～300MPa）条件下由乙烯经自由基聚合制得的支链化结构聚乙烯，密度区间0.910～0.925g/cm³，又称高压聚乙烯，是聚乙烯按密度划分的一个子类。",
      "node_type": "material",
      "stage": "draft",
      "parent_type": "material-polyethylene",
      "sources": [
        {
          "source_type": "standard",
          "description": "国家标准 GB/T 11115-2009《聚乙烯（PE）树脂》中按密度分类的LDPE品类",
          "retrieved_at": "2026-06-23T00:00:00Z"
        }
      ],
      "created_at": "2026-06-23T00:00:00Z",
      "updated_at": "2026-06-23T00:00:00Z"
    },
    {
      "id": "material-lldpe",
      "name": "线性低密度聚乙烯",
      "definition": "在较低压力下由乙烯与α-烯烃共聚制得的线性结构聚乙烯，密度区间0.910～0.925g/cm³，兼具低密度聚乙烯的韧性与高密度聚乙烯的强度，是聚乙烯按密度划分的一个子类。",
      "node_type": "material",
      "stage": "draft",
      "parent_type": "material-polyethylene",
      "sources": [
        {
          "source_type": "standard",
          "description": "国家标准 GB/T 11115-2009《聚乙烯（PE）树脂》中按密度分类的LLDPE品类",
          "retrieved_at": "2026-06-23T00:00:00Z"
        }
      ],
      "created_at": "2026-06-23T00:00:00Z",
      "updated_at": "2026-06-23T00:00:00Z"
    },
    {
      "id": "material-polypropylene",
      "name": "聚丙烯",
      "definition": "由丙烯单体聚合制得的热塑性树脂，按甲基排列分为等规、无规、间规三种立体结构，是仅次于聚乙烯的第二大通用热塑性树脂，不特指某一立构规格。",
      "node_type": "material",
      "stage": "draft",
      "parent_type": null,
      "sources": [
        {
          "source_type": "industry_report",
          "description": "中国石化化工产品手册-合成树脂分册-聚丙烯(PP)定义",
          "url": "http://hgxs.sinopec.com/hgxs/Resource/pdf/p3.pdf",
          "retrieved_at": "2026-06-23T00:00:00Z"
        }
      ],
      "created_at": "2026-06-23T00:00:00Z",
      "updated_at": "2026-06-23T00:00:00Z"
    },
    {
      "id": "material-ethylene",
      "name": "乙烯",
      "definition": "化学式为C₂H₄的烯烃单体，是合成聚乙烯及其他高分子化合物的最基础原料，常温下为气体。",
      "node_type": "material",
      "stage": "draft",
      "parent_type": null,
      "sources": [
        {
          "source_type": "encyclopedia",
          "description": "百度百科-乙烯词条",
          "url": "https://baike.baidu.com/item/乙烯",
          "retrieved_at": "2026-06-23T00:00:00Z"
        }
      ],
      "created_at": "2026-06-23T00:00:00Z",
      "updated_at": "2026-06-23T00:00:00Z"
    },
    {
      "id": "material-propylene",
      "name": "丙烯",
      "definition": "化学式为C₃H₆的烯烃单体，是合成聚丙烯及其他高分子化合物的最基础原料，常温下为气体。",
      "node_type": "material",
      "stage": "draft",
      "parent_type": null,
      "sources": [
        {
          "source_type": "encyclopedia",
          "description": "百度百科-丙烯词条",
          "url": "https://baike.baidu.com/item/丙烯",
          "retrieved_at": "2026-06-23T00:00:00Z"
        }
      ],
      "created_at": "2026-06-23T00:00:00Z",
      "updated_at": "2026-06-23T00:00:00Z"
    },
    {
      "id": "product-battery-separator",
      "name": "电池隔膜",
      "definition": "置于锂离子电池正负极之间、具有微孔结构的绝缘高分子薄膜，用于物理隔离正负极电子传导并为锂离子迁移提供通道，是锂电池四大核心材料之一。",
      "node_type": "product",
      "stage": "draft",
      "parent_type": null,
      "sources": [
        {
          "source_type": "expert_interview",
          "description": "物理化学学报《锂离子电池隔膜的功能化改性及表征技术》（莫英等，2022）",
          "url": "http://www.ccspublishing.org.cn/article/doi/10.3866/PKU.WHXB202107030",
          "retrieved_at": "2026-06-23T00:00:00Z"
        }
      ],
      "created_at": "2026-06-23T00:00:00Z",
      "updated_at": "2026-06-23T00:00:00Z"
    },
    {
      "id": "product-plastic-cup",
      "name": "塑料杯",
      "definition": "以塑料为原料制成的杯状容器，主要用于盛装饮用水、饮料等液体，是日用消费品中常见的塑料制品。",
      "node_type": "product",
      "stage": "draft",
      "parent_type": null,
      "sources": [
        {
          "source_type": "encyclopedia",
          "description": "百度百科-塑料杯词条",
          "url": "https://baike.baidu.com/item/塑料杯",
          "retrieved_at": "2026-06-23T00:00:00Z"
        }
      ],
      "created_at": "2026-06-23T00:00:00Z",
      "updated_at": "2026-06-23T00:00:00Z"
    },
    {
      "id": "product-packaging-film",
      "name": "包装薄膜",
      "definition": "用于食品、日用品包装的塑料薄膜制品，以聚乙烯为主要原料，执行国家标准 GB/T 4456《包装用聚乙烯吹塑薄膜》。",
      "node_type": "product",
      "stage": "draft",
      "parent_type": null,
      "sources": [
        {
          "source_type": "standard",
          "description": "国家标准 GB/T 4456《包装用聚乙烯吹塑薄膜》",
          "retrieved_at": "2026-06-23T00:00:00Z"
        }
      ],
      "created_at": "2026-06-23T00:00:00Z",
      "updated_at": "2026-06-23T00:00:00Z"
    },
    {
      "id": "product-plastic-pipe",
      "name": "塑料管道",
      "definition": "用于给水、排水、燃气输送的塑料管材，以聚乙烯管材为主流产品之一，执行国家标准 GB/T 13663《给水用聚乙烯管材》。",
      "node_type": "product",
      "stage": "draft",
      "parent_type": null,
      "sources": [
        {
          "source_type": "standard",
          "description": "国家标准 GB/T 13663《给水用聚乙烯管材》",
          "retrieved_at": "2026-06-23T00:00:00Z"
        }
      ],
      "created_at": "2026-06-23T00:00:00Z",
      "updated_at": "2026-06-23T00:00:00Z"
    },
    {
      "id": "product-agricultural-film",
      "name": "农用薄膜",
      "definition": "用于农业地面覆盖保温的塑料薄膜，包括地膜和棚膜，以聚乙烯为主要原料，执行国家标准 GB 13735《聚乙烯吹塑农用地面覆盖薄膜》。",
      "node_type": "product",
      "stage": "draft",
      "parent_type": null,
      "sources": [
        {
          "source_type": "standard",
          "description": "国家标准 GB 13735《聚乙烯吹塑农用地面覆盖薄膜》",
          "retrieved_at": "2026-06-23T00:00:00Z"
        }
      ],
      "created_at": "2026-06-23T00:00:00Z",
      "updated_at": "2026-06-23T00:00:00Z"
    },
    {
      "id": "equipment-injection-molding-machine",
      "name": "注塑机",
      "definition": "通过螺杆或柱塞将塑料熔体注射到模具型腔中，经保压、冷却、固化定型后获得各种形状塑料制品的塑料机械，又称注射成型机。",
      "node_type": "equipment",
      "stage": "draft",
      "parent_type": null,
      "sources": [
        {
          "source_type": "encyclopedia",
          "description": "中国大百科全书-注射机词条",
          "url": "https://www.zgbk.com/ecph/words?ID=75196",
          "retrieved_at": "2026-06-23T00:00:00Z"
        }
      ],
      "created_at": "2026-06-23T00:00:00Z",
      "updated_at": "2026-06-23T00:00:00Z"
    },
    {
      "id": "process-injection-molding",
      "name": "注塑工艺",
      "definition": "将塑料原料加热熔融后，通过高压注射填入闭合模具型腔，经保压冷却固化定型获得塑料制品的循环成型工艺。",
      "node_type": "process",
      "stage": "draft",
      "parent_type": null,
      "sources": [
        {
          "source_type": "encyclopedia",
          "description": "百度百科-注塑成型词条",
          "url": "https://baike.baidu.com/item/注塑成型",
          "retrieved_at": "2026-06-23T00:00:00Z"
        }
      ],
      "created_at": "2026-06-23T00:00:00Z",
      "updated_at": "2026-06-23T00:00:00Z"
    },
    {
      "id": "equipment-mold",
      "name": "模具",
      "definition": "在注塑、吹塑等塑料成型工艺中，用于赋予熔融塑料以特定形状和尺寸的金属型腔工具，是塑料制品成型的核心工装。",
      "node_type": "equipment",
      "stage": "draft",
      "parent_type": null,
      "sources": [
        {
          "source_type": "encyclopedia",
          "description": "百度百科-模具词条",
          "url": "https://baike.baidu.com/item/模具",
          "retrieved_at": "2026-06-23T00:00:00Z"
        }
      ],
      "created_at": "2026-06-23T00:00:00Z",
      "updated_at": "2026-06-23T00:00:00Z"
    },
    {
      "id": "process-blown-film",
      "name": "吹膜工艺",
      "definition": "将塑料原料经挤出机熔融塑化后，通过环形模头挤出形成管状薄膜，并借助压缩空气吹胀冷却定型的塑料薄膜成型工艺。",
      "node_type": "process",
      "stage": "draft",
      "parent_type": null,
      "sources": [
        {
          "source_type": "encyclopedia",
          "description": "百度百科-吹膜词条",
          "url": "https://baike.baidu.com/item/吹膜",
          "retrieved_at": "2026-06-23T00:00:00Z"
        }
      ],
      "created_at": "2026-06-23T00:00:00Z",
      "updated_at": "2026-06-23T00:00:00Z"
    },
    {
      "id": "industry-photovoltaic",
      "name": "光伏行业",
      "definition": "围绕太阳能光伏发电技术形成的产业，核心是利用半导体材料的光生伏特效应将太阳光能直接转换为电能，涵盖硅料、硅片、电池片、组件、电站等环节。",
      "node_type": "industry",
      "stage": "draft",
      "parent_type": null,
      "sources": [
        {
          "source_type": "news",
          "description": "新华网《光伏产业链的各环节分别有何特点？》",
          "url": "https://app.xinhuanet.com/news/article.html?articleId=202605087ccb66a8e9474b8199f84ac240cf84ed",
          "retrieved_at": "2026-06-23T00:00:00Z"
        }
      ],
      "created_at": "2026-06-23T00:00:00Z",
      "updated_at": "2026-06-23T00:00:00Z"
    },
    {
      "id": "industry-lithium-battery",
      "name": "锂电池行业",
      "definition": "围绕锂离子电池研发、制造与应用形成的产业，以正极、负极、电解液、隔膜为核心材料，产品覆盖动力电池、储能电池、消费电池等领域。",
      "node_type": "industry",
      "stage": "draft",
      "parent_type": null,
      "sources": [
        {
          "source_type": "encyclopedia",
          "description": "百度百科-锂离子电池词条",
          "url": "https://baike.baidu.com/item/锂离子电池",
          "retrieved_at": "2026-06-23T00:00:00Z"
        }
      ],
      "created_at": "2026-06-23T00:00:00Z",
      "updated_at": "2026-06-23T00:00:00Z"
    },
    {
      "id": "industry-energy-storage",
      "name": "储能行业",
      "definition": "围绕电能存储与释放技术形成的产业，以锂电池储能为主流方案，用于解决光伏、风电等新能源发电的间歇性问题，涵盖储能设备制造与系统集成。",
      "node_type": "industry",
      "stage": "draft",
      "parent_type": null,
      "sources": [
        {
          "source_type": "industry_report",
          "description": "行业研究-储能产业定义",
          "retrieved_at": "2026-06-23T00:00:00Z"
        }
      ],
      "created_at": "2026-06-23T00:00:00Z",
      "updated_at": "2026-06-23T00:00:00Z"
    },
    {
      "id": "industry-petrochemical",
      "name": "石油化工",
      "definition": "以石油和天然气为原料，通过裂解、分离等工艺生产乙烯、丙烯等基础化工原料及下游合成材料的产业，是聚乙烯、聚丙烯等塑料原料的上游。",
      "node_type": "industry",
      "stage": "draft",
      "parent_type": null,
      "sources": [
        {
          "source_type": "encyclopedia",
          "description": "百度百科-石油化工词条",
          "url": "https://baike.baidu.com/item/石油化工",
          "retrieved_at": "2026-06-23T00:00:00Z"
        }
      ],
      "created_at": "2026-06-23T00:00:00Z",
      "updated_at": "2026-06-23T00:00:00Z"
    }
  ],
  "edges": []
}
```

- [ ] **Step 2: 用 schema-validator 验证数据合法性**

```bash
node -e "
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const schema = require('./schema.json');
const data = require('./src/data/nodes-draft.json');
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const valid = validate(data);
if (valid) {
  console.log('VALID: ' + data.nodes.length + ' nodes, ' + data.edges.length + ' edges');
} else {
  console.error('INVALID:');
  console.error(JSON.stringify(validate.errors, null, 2));
  process.exit(1);
}
"
```

Expected: 输出 `VALID: 20 nodes, 0 edges`。

- [ ] **Step 3: 归档旧 sample-data.json**

```bash
mkdir -p scripts/data-collection/output
mv src/data/sample-data.json scripts/data-collection/output/sample-data-old-backup.json
```

Expected: 文件移动成功。

- [ ] **Step 4: 提交**

```bash
git add src/data/nodes-draft.json scripts/data-collection/output/sample-data-old-backup.json
git add -u
git commit -m "feat(data): 创建第一版 draft 节点数据（20 个节点）

- 围绕样板路径录入：聚乙烯及其子类、聚丙烯、乙烯、丙烯
- 产品类：电池隔膜、塑料杯、包装薄膜、塑料管道、农用薄膜
- 设备/工艺类：注塑机、注塑工艺、模具、吹膜工艺
- 行业类：光伏、锂电池、储能、石油化工
- 每个节点有 definition + 至少一条 source
- 归档旧 sample-data.json 到 backup"
```

---

### Task 1.3: 重写数据层（graph-data.ts）

**Files:**
- Modify: `src/lib/graph-data.ts`

**Goal:** 数据层函数适配新 schema。第一阶段只实现节点相关函数，边相关函数返回空结果。

- [ ] **Step 1: 备份旧 graph-data.ts**

```bash
cp src/lib/graph-data.ts src/lib/graph-data.old.ts.bak
```

- [ ] **Step 2: 重写 graph-data.ts**

```typescript
import graphDataJson from '../data/nodes-draft.json';
import type {
  GraphData,
  GraphNode,
  GraphEdge,
  NodeDetailResult,
  NodeChainSummary,
  ChainView,
  RelationType,
} from './types';

const graphData = graphDataJson as GraphData;

const nodeMap = new Map<string, GraphNode>();
for (const node of graphData.nodes) {
  nodeMap.set(node.id, node);
}

/** 返回完整图谱数据（nodes + edges） */
export function getGraphData(): GraphData {
  return graphData;
}

/** 根据 id 获取单个节点 */
export function getNodeById(id: string): GraphNode | undefined {
  return nodeMap.get(id);
}

/** 获取节点详情 + 分类学关系（父节点 + 子节点） */
export function getNodeDetail(id: string): NodeDetailResult | undefined {
  const node = nodeMap.get(id);
  if (!node) return undefined;

  const parent = node.parent_type ? nodeMap.get(node.parent_type) ?? null : null;

  const children = graphData.nodes.filter(
    (n) => n.parent_type === id
  );

  return { node, children, parent };
}

/** 按名称搜索节点（前缀匹配 + 包含匹配） */
export function searchNodes(query: string): GraphNode[] {
  if (!query || query.trim().length === 0) return [];
  const q = query.trim().toLowerCase();

  const results = graphData.nodes.filter(
    (node) =>
      node.name.toLowerCase().includes(q) ||
      node.id.toLowerCase().includes(q)
  );

  // 名称以查询词开头的排前面
  results.sort((a, b) => {
    const aStartsWith = a.name.toLowerCase().startsWith(q);
    const bStartsWith = b.name.toLowerCase().startsWith(q);
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;
    return 0;
  });

  return results;
}

/** 获取节点的子节点列表（分类学子类） */
export function getNodeChildren(parentId: string): GraphNode[] {
  return graphData.nodes.filter((n) => n.parent_type === parentId);
}

/** 获取节点的父节点 */
export function getParentNode(nodeId: string): GraphNode | null {
  const node = nodeMap.get(nodeId);
  if (!node || !node.parent_type) return null;
  return nodeMap.get(node.parent_type) ?? null;
}

// ===== 以下为边相关函数，第一阶段返回空结果，后续阶段补充 =====

/** 获取节点的直接邻居节点（按关系类型过滤） */
export function getNodeNeighbors(
  nodeId: string,
  relationType?: RelationType
): Array<{ node: GraphNode; edge: GraphEdge; direction: 'upstream' | 'downstream' }> {
  const results: Array<{
    node: GraphNode;
    edge: GraphEdge;
    direction: 'upstream' | 'downstream';
  }> = [];

  for (const edge of graphData.edges) {
    if (relationType && edge.relation_type !== relationType) continue;
    if (edge.source !== nodeId && edge.target !== nodeId) continue;

    const isSource = edge.source === nodeId;
    const otherId = isSource ? edge.target : edge.source;
    const otherNode = nodeMap.get(otherId);
    if (!otherNode) continue;

    results.push({
      node: otherNode,
      edge,
      direction: isSource ? 'downstream' : 'upstream',
    });
  }

  return results;
}

/** 获取节点的链路摘要（各关系类型的上下游数量） */
export function getNodeChainSummary(nodeId: string): NodeChainSummary | undefined {
  if (!nodeMap.has(nodeId)) return undefined;

  const chainMap = new Map<
    string,
    { relation_type: RelationType; upstream_count: number; downstream_count: number }
  >();

  for (const edge of graphData.edges) {
    if (edge.source !== nodeId && edge.target !== nodeId) continue;

    const rt = edge.relation_type;
    if (!chainMap.has(rt)) {
      chainMap.set(rt, { relation_type: rt, upstream_count: 0, downstream_count: 0 });
    }
    const entry = chainMap.get(rt)!;

    if (edge.source === nodeId) {
      entry.downstream_count++;
    } else {
      entry.upstream_count++;
    }
  }

  return {
    node_id: nodeId,
    chains: Array.from(chainMap.values()),
  };
}

/** 获取链路视图（BFS 沿指定关系类型遍历到指定深度） */
export function getChainView(
  nodeId: string,
  relationType: RelationType,
  depth: number = 2
): ChainView | undefined {
  const centerNode = nodeMap.get(nodeId);
  if (!centerNode) return undefined;

  const visited = new Set<string>([nodeId]);
  const nodeSet = new Set<string>([nodeId]);
  const edgeList: GraphEdge[] = [];

  interface QueueItem {
    id: string;
    currentDepth: number;
  }

  const queue: QueueItem[] = [{ id: nodeId, currentDepth: 0 }];

  while (queue.length > 0) {
    const { id, currentDepth } = queue.shift()!;
    if (currentDepth >= depth) continue;

    for (const edge of graphData.edges) {
      if (edge.relation_type !== relationType) continue;
      if (edge.source !== id && edge.target !== id) continue;

      const neighborId = edge.source === id ? edge.target : edge.source;

      if (!nodeSet.has(neighborId)) {
        const neighbor = nodeMap.get(neighborId);
        if (neighbor) {
          nodeSet.add(neighborId);
          edgeList.push(edge);

          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push({ id: neighborId, currentDepth: currentDepth + 1 });
          }
        }
      }
    }
  }

  const nodes = Array.from(nodeSet)
    .map((nid) => nodeMap.get(nid))
    .filter((n): n is GraphNode => n !== undefined);

  return {
    center_node: centerNode,
    relation_type: relationType,
    nodes,
    edges: edgeList,
    depth,
  };
}
```

- [ ] **Step 3: 验证编译**

```bash
npx tsc --noEmit 2>&1 | grep -E "(error|graph-data)" | head -10
```

Expected: 可能有其他文件的类型错误，但 graph-data.ts 本身无错误。

- [ ] **Step 4: 提交**

```bash
git add src/lib/graph-data.ts src/lib/graph-data.old.ts.bak
git commit -m "refactor(data): 重写数据层，适配 schema v0.2

- getGraphData/getNodeById/searchNodes/getNodeDetail/getNodeChildren/getParentNode
- 边相关函数返回空结果（第一阶段无边）
- 旧文件备份为 graph-data.old.ts.bak"
```

---

### Task 1.4: 重写 API 路由

**Files:**
- Modify: `src/app/api/graph/route.ts`
- Delete: `src/app/api/graph/search/route.ts`

**Goal:** 统一 API 入口，支持全量数据查询和单节点详情查询。

- [ ] **Step 1: 删除旧的 search 路由**

```bash
rm -rf src/app/api/graph/search
```

- [ ] **Step 2: 重写主 API 路由**

```typescript
import { NextResponse } from 'next/server';
import {
  getGraphData,
  getNodeDetail,
  getNodeChainSummary,
  getChainView,
} from '@/lib/graph-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const node = searchParams.get('node');
  const chain = searchParams.get('chain');
  const depthParam = searchParams.get('depth');

  // GET /api/graph?node={id}&chain={relationType}&depth={n} → 链路视图
  if (node && chain) {
    const depth = depthParam ? parseInt(depthParam, 10) : 2;
    const result = getChainView(node, chain as any, isNaN(depth) ? 2 : depth);
    if (!result) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  // GET /api/graph?node={id} → 节点详情 + 分类学关系 + 链路摘要
  if (node) {
    const detail = getNodeDetail(node);
    if (!detail) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }
    const chainSummary = getNodeChainSummary(node);
    return NextResponse.json(
      { ...detail, chainSummary: chainSummary ?? { node_id: node, chains: [] } },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // GET /api/graph → 完整图谱数据
  const graph = getGraphData();
  return NextResponse.json(graph, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
```

- [ ] **Step 3: 验证 API 编译通过**

```bash
npx tsc --noEmit 2>&1 | grep -E "api/graph" | head -5
```

Expected: 无 API 路由相关错误。

- [ ] **Step 4: 提交**

```bash
git add src/app/api/graph/route.ts
git add -u
git commit -m "refactor(api): 重写 API 路由，统一入口

- GET /api/graph → 完整图谱数据
- GET /api/graph?node={id} → 节点详情+分类学关系+链路摘要
- GET /api/graph?node={id}&chain={type}&depth={n} → 链路视图
- 删除旧的 /api/graph/search 路由（搜索功能合并）"
```

---

### Task 1.5: 第一阶段验证 — 数据层可用

- [ ] **Step 1: 运行构建，检查错误**

```bash
npm run build 2>&1 | tail -30
```

Expected: 构建可能失败（组件仍引用旧类型），但 API 和数据层应无错误。记录错误数量和类型。

- [ ] **Step 2: 验证 API 接口（启动 dev server 测试）**

```bash
# 启动 dev server（后台）
npm run dev &
sleep 5

# 测试全量数据接口
curl -s http://localhost:3000/api/graph | node -e "
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  const data = JSON.parse(Buffer.concat(chunks).toString());
  console.log('Nodes:', data.nodes?.length);
  console.log('Edges:', data.edges?.length);
  process.exit(data.nodes?.length > 0 ? 0 : 1);
});
"
```

Expected: 输出 `Nodes: 20` 和 `Edges: 0`。

- [ ] **Step 3: 测试单节点详情接口**

```bash
curl -s "http://localhost:3000/api/graph?node=material-polyethylene" | node -e "
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  const data = JSON.parse(Buffer.concat(chunks).toString());
  console.log('Node:', data.node?.name);
  console.log('Children:', data.children?.length);
  console.log('Parent:', data.parent?.name ?? null);
  console.log('Chains:', data.chainSummary?.chains?.length);
  process.exit(data.node ? 0 : 1);
});
"
```

Expected: 输出 `Node: 聚乙烯`，`Children: 3`（HDPE/LDPE/LLDPE），`Parent: null`，`Chains: 0`。

- [ ] **Step 4: 停止 dev server**

```bash
pkill -f "next dev" || true
```

- [ ] **Step 5: 提交第一阶段完成标记**

```bash
git commit --allow-empty -m "phase1: 数据层与类型系统完成

- 类型定义对齐 schema v0.2
- 20 个 draft 节点，每个有 definition + source
- 数据层函数：节点查询、搜索、分类学关系
- API 路由：全量/单节点/链路视图
- 边相关函数就绪但返回空（等待第三阶段录入边数据）"
```

---

## 第二阶段：节点浏览体验

### Task 2.1: 重写搜索栏组件

**Files:**
- Modify: `src/components/SearchBar.tsx`

**Goal:** 搜索节点名称，结果显示节点类型标签，支持键盘导航，回车选中。

- [ ] **Step 1: 备份旧 SearchBar.tsx**

```bash
cp src/components/SearchBar.tsx src/components/SearchBar.old.tsx.bak
```

- [ ] **Step 2: 重写 SearchBar 组件**

```tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { GraphNode, NodeType } from '../lib/types';

/** 节点类型中文标签 */
const NODE_TYPE_LABELS: Record<NodeType, string> = {
  material: '材料',
  process: '工艺',
  equipment: '设备',
  product: '产品',
  industry: '行业',
  entity: '实体',
};

/** 节点类型颜色 */
const NODE_TYPE_COLORS: Record<NodeType, string> = {
  material: '#00B42A',
  process: '#0FC6C2',
  equipment: '#722ED1',
  product: '#165DFF',
  industry: '#86909C',
  entity: '#C9CDD4',
};

interface SearchBarProps {
  onSelect: (node: GraphNode) => void;
  placeholder?: string;
}

export default function SearchBar({
  onSelect,
  placeholder = '搜索节点...',
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GraphNode[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 搜索防抖
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/graph`);
        const data = await res.json();
        const allNodes: GraphNode[] = data.nodes || [];
        const q = query.trim().toLowerCase();
        const filtered = allNodes.filter(
          (n) =>
            n.name.toLowerCase().includes(q) ||
            n.id.toLowerCase().includes(q)
        );
        filtered.sort((a, b) => {
          const aSw = a.name.toLowerCase().startsWith(q);
          const bSw = b.name.toLowerCase().startsWith(q);
          if (aSw && !bSw) return -1;
          if (!aSw && bSw) return 1;
          return 0;
        });
        setResults(filtered.slice(0, 10));
        setShowDropdown(true);
        setSelectedIndex(0);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showDropdown || results.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            onSelect(results[selectedIndex]);
            setQuery('');
            setShowDropdown(false);
          }
          break;
        case 'Escape':
          setShowDropdown(false);
          break;
      }
    },
    [showDropdown, results, selectedIndex, onSelect]
  );

  const handleSelect = (node: GraphNode) => {
    onSelect(node);
    setQuery('');
    setShowDropdown(false);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setShowDropdown(true)}
          placeholder={placeholder}
          className="
            w-full px-4 py-3 pl-10
            bg-canvas-800/80 backdrop-blur
            border border-canvas-700
            rounded-arco-lg
            text-ink-1 text-sm
            placeholder:text-ink-4
            focus:outline-none focus:ring-2 focus:ring-arco-primary/50 focus:border-arco-primary
            transition-all
          "
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-ink-4 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* 搜索结果下拉 */}
      {showDropdown && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="
            absolute top-full left-0 right-0 mt-2
            bg-canvas-800/95 backdrop-blur
            border border-canvas-700
            rounded-arco-lg
            shadow-arco-3
            overflow-hidden
            z-50
          "
        >
          {results.map((node, index) => (
            <button
              key={node.id}
              onClick={() => handleSelect(node)}
              className={`
                w-full px-4 py-2.5 flex items-center gap-3
                text-left transition-colors
                ${index === selectedIndex ? 'bg-arco-primary/10' : 'hover:bg-canvas-700/50'}
              `}
            >
              <span
                className="px-2 py-0.5 rounded text-xs text-white flex-shrink-0"
                style={{ backgroundColor: NODE_TYPE_COLORS[node.node_type] }}
              >
                {NODE_TYPE_LABELS[node.node_type]}
              </span>
              <span className="text-ink-1 text-sm truncate flex-1">
                {node.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {showDropdown && query.trim() && results.length === 0 && !loading && (
        <div
          className="
            absolute top-full left-0 right-0 mt-2
            bg-canvas-800/95 backdrop-blur
            border border-canvas-700
            rounded-arco-lg
            p-4
            text-center
            z-50
          "
        >
          <p className="text-ink-4 text-sm">未找到匹配的节点</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 验证编译**

```bash
npx tsc --noEmit 2>&1 | grep -i "SearchBar" | head -5
```

Expected: 无 SearchBar 相关错误。

- [ ] **Step 4: 提交**

```bash
git add src/components/SearchBar.tsx src/components/SearchBar.old.tsx.bak
git commit -m "refactor(ui): 重写 SearchBar 组件，适配 v2 节点类型

- 搜索节点名称，结果带类型标签
- 键盘导航（上下方向键/回车/ESC）
- 防抖搜索 + 点击外部关闭"
```

---

### Task 2.2: 重写节点详情面板

**Files:**
- Modify: `src/components/NodeDetail.tsx`

**Goal:** 展示节点的 name/definition/node_type/stage/parent_type/sources/子节点列表。无边时不显示关系区域。

- [ ] **Step 1: 备份旧 NodeDetail.tsx**

```bash
cp src/components/NodeDetail.tsx src/components/NodeDetail.old.tsx.bak
```

- [ ] **Step 2: 重写 NodeDetail 组件**

```tsx
'use client';

import { useState } from 'react';
import type { GraphNode, NodeType, Source, SourceType } from '../lib/types';

/** 节点类型中文标签 */
const NODE_TYPE_LABELS: Record<NodeType, string> = {
  material: '材料',
  process: '工艺',
  equipment: '设备',
  product: '产品',
  industry: '行业',
  entity: '实体',
};

/** 节点类型颜色 */
const NODE_TYPE_COLORS: Record<NodeType, string> = {
  material: '#00B42A',
  process: '#0FC6C2',
  equipment: '#722ED1',
  product: '#165DFF',
  industry: '#86909C',
  entity: '#C9CDD4',
};

/** 来源类型中文标签 */
const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  patent: '专利',
  standard: '标准',
  industry_report: '行业报告',
  news: '新闻报道',
  expert_interview: '专家访谈',
  official_data: '官方数据',
  encyclopedia: '百科',
  other: '其他',
};

interface NodeDetailProps {
  node: GraphNode | null;
  children: GraphNode[];
  parent: GraphNode | null;
  loading?: boolean;
  onClose: () => void;
  onNodeClick: (nodeId: string) => void;
}

function Skeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-6 w-32 bg-canvas-700 rounded" />
      <div className="h-4 w-16 bg-canvas-700 rounded" />
      <div className="h-20 bg-canvas-700 rounded" />
      <div className="space-y-2">
        <div className="h-4 w-20 bg-canvas-700 rounded" />
        <div className="h-4 w-full bg-canvas-700 rounded" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-canvas-800 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </div>
      <p className="text-ink-3 text-sm">搜索并选择一个节点</p>
      <p className="text-ink-4 text-xs mt-1">查看定义与分类</p>
    </div>
  );
}

function SourceItem({ source }: { source: Source }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="py-1.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
      >
        <span className="px-1.5 py-0.5 bg-canvas-700 rounded text-xs text-ink-3">
          {SOURCE_TYPE_LABELS[source.source_type] || source.source_type}
        </span>
        <span className="text-ink-2 text-xs flex-1 truncate">
          {source.description}
        </span>
        <svg
          className={`w-3 h-3 text-ink-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-2 pl-2 border-l-2 border-canvas-700 space-y-1">
          <p className="text-ink-3 text-xs">{source.description}</p>
          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-arco-primary text-xs hover:underline inline-block"
            >
              查看来源
            </a>
          )}
          {source.retrieved_at && (
            <p className="text-ink-4 text-[10px]">
              获取时间：{new Date(source.retrieved_at).toLocaleDateString('zh-CN')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function NodeDetail({
  node,
  children,
  parent,
  loading,
  onClose,
  onNodeClick,
}: NodeDetailProps) {
  if (loading) {
    return (
      <div className="w-[380px] h-full bg-surface-1 shadow-arco-3 rounded-l-arco-lg overflow-hidden">
        <Skeleton />
      </div>
    );
  }

  if (!node) {
    return (
      <div className="w-[380px] h-full bg-surface-1 shadow-arco-3 rounded-l-arco-lg overflow-hidden">
        <EmptyState />
      </div>
    );
  }

  const nodeColor = NODE_TYPE_COLORS[node.node_type];
  const nodeLabel = NODE_TYPE_LABELS[node.node_type];

  return (
    <div className="w-[380px] h-full bg-surface-1 shadow-arco-3 rounded-l-arco-lg overflow-hidden flex flex-col">
      {/* 顶部色条 */}
      <div className="h-1" style={{ backgroundColor: nodeColor }} />

      <div className="flex-1 overflow-y-auto">
        <div className="p-5">
          {/* 标题区 */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-arco-xl font-semibold text-ink-1">{node.name}</h2>
              <div className="flex gap-2 mt-2">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-arco-sm text-xs text-white"
                  style={{ backgroundColor: nodeColor }}
                >
                  {nodeLabel}
                </span>
                {node.stage === 'draft' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-arco-sm text-xs bg-warning/20 text-warning">
                    草稿
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-ink-3 hover:text-ink-1 hover:bg-surface-2 rounded-arco-sm transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 定义 */}
          <div className="pt-4 border-t border-line-1">
            <div className="text-ink-4 text-xs font-medium mb-2">定义</div>
            <p className="text-ink-1 text-sm leading-relaxed">{node.definition}</p>
          </div>

          {/* 分类学关系 */}
          <div className="pt-4 border-t border-line-1">
            <div className="text-ink-4 text-xs font-medium mb-3">分类学关系</div>

            {/* 父节点 */}
            {parent ? (
              <div className="mb-3">
                <div className="text-ink-3 text-xs mb-1.5">父类</div>
                <button
                  onClick={() => onNodeClick(parent.id)}
                  className="flex items-center gap-2 px-3 py-2 bg-surface-2 hover:bg-surface-3 rounded-arco-sm transition-colors w-full text-left"
                >
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] text-white"
                    style={{ backgroundColor: NODE_TYPE_COLORS[parent.node_type] }}
                  >
                    {NODE_TYPE_LABELS[parent.node_type]}
                  </span>
                  <span className="text-ink-1 text-sm">{parent.name}</span>
                  <svg className="w-4 h-4 text-ink-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="mb-3">
                <div className="text-ink-3 text-xs mb-1.5">父类</div>
                <p className="text-ink-4 text-xs italic">顶层分类，无父类</p>
              </div>
            )}

            {/* 子节点 */}
            <div>
              <div className="text-ink-3 text-xs mb-1.5">
                子类 <span className="text-ink-4">({children.length})</span>
              </div>
              {children.length > 0 ? (
                <div className="space-y-1">
                  {children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => onNodeClick(child.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-surface-2 hover:bg-surface-3 rounded-arco-sm transition-colors w-full text-left"
                    >
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] text-white"
                        style={{ backgroundColor: NODE_TYPE_COLORS[child.node_type] }}
                      >
                        {NODE_TYPE_LABELS[child.node_type]}
                      </span>
                      <span className="text-ink-1 text-sm">{child.name}</span>
                      <svg className="w-4 h-4 text-ink-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-ink-4 text-xs italic">暂无子类</p>
              )}
            </div>
          </div>

          {/* 来源 */}
          {node.sources && node.sources.length > 0 && (
            <div className="pt-4 border-t border-line-1">
              <div className="text-ink-4 text-xs font-medium mb-2">
                来源 <span className="text-ink-4">({node.sources.length})</span>
              </div>
              <div className="space-y-1">
                {node.sources.map((source, idx) => (
                  <SourceItem key={idx} source={source} />
                ))}
              </div>
            </div>
          )}

          {/* 关系区域（无边时不显示） */}
          {/* 第三阶段再实现 */}

          {/* 元信息 */}
          <div className="pt-4 mt-4 border-t border-line-1 text-ink-4 text-[10px] space-y-0.5">
            <p>ID: {node.id}</p>
            <p>创建: {new Date(node.created_at).toLocaleDateString('zh-CN')}</p>
            <p>更新: {new Date(node.updated_at).toLocaleDateString('zh-CN')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 验证编译**

```bash
npx tsc --noEmit 2>&1 | grep -i "NodeDetail" | head -5
```

Expected: 无 NodeDetail 相关错误。

- [ ] **Step 4: 提交**

```bash
git add src/components/NodeDetail.tsx src/components/NodeDetail.old.tsx.bak
git commit -m "refactor(ui): 重写 NodeDetail 组件，适配 v2 节点结构

- 展示 name/definition/node_type/stage
- 分类学关系：父节点 + 子节点列表（可点击跳转）
- 来源列表（可展开查看详情和链接）
- 无边时不显示关系区域（第三阶段补充）"
```

---

### Task 2.3: 重写引导页

**Files:**
- Modify: `src/components/IntroOverlay.tsx`

**Goal:** 介绍项目理念，说明当前处于节点录入阶段（第一阶段）。

- [ ] **Step 1: 备份旧 IntroOverlay.tsx**

```bash
cp src/components/IntroOverlay.tsx src/components/IntroOverlay.old.tsx.bak
```

- [ ] **Step 2: 重写 IntroOverlay 组件**

```tsx
'use client';

import { useState } from 'react';

interface IntroOverlayProps {
  onClose: () => void;
}

export default function IntroOverlay({ onClose }: IntroOverlayProps) {
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (closing) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-canvas-900/90 backdrop-blur-sm">
      <div className="max-w-lg w-full mx-4 bg-canvas-800/95 backdrop-blur rounded-2xl border border-canvas-700 shadow-arco-4 p-8 animate-fade-in">
        {/* Logo / 标题 */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-arco-primary to-purple-500 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">万源图谱</h1>
          <p className="text-ink-3 text-sm mt-1">看见被行业分类切断的真实连接</p>
        </div>

        {/* 正文 */}
        <div className="space-y-4 mb-8">
          <p className="text-white/70 text-sm leading-relaxed">
            真实世界是网状的——一种材料可能同时出现在十个不同行业里，一家工厂同时挂在原料链、设备链、耗材链等好几条链路上。
          </p>
          <p className="text-white/70 text-sm leading-relaxed">
            但人类讲述世界的方式习惯是树状的——一条主线、一个因果链。这道落差，让大量真实存在的连接从未被同时摆在一起看过。
          </p>
          <p className="text-white/70 text-sm leading-relaxed">
            这个工具想做的事很简单：把那张本来就存在的网，如实地呈现出来，让你能亲手去探索它。
          </p>
        </div>

        {/* 当前阶段提示 */}
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            <span className="text-warning text-xs font-medium">第一阶段：节点录入中</span>
          </div>
          <p className="text-white/50 text-xs mt-1.5">
            当前优先录入节点的定义与分类学关系，产业链连接（边）将在下一阶段逐步补充。你现在可以搜索节点、查看定义和分类。
          </p>
        </div>

        {/* 节点类型展示 */}
        <div className="bg-canvas-700/40 rounded-lg p-4 mb-6">
          <div className="text-white/50 text-xs mb-3">节点类型</div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="px-2 py-1 rounded text-xs text-white" style={{ backgroundColor: '#00B42A' }}>材料</span>
            <span className="px-2 py-1 rounded text-xs text-white" style={{ backgroundColor: '#0FC6C2' }}>工艺</span>
            <span className="px-2 py-1 rounded text-xs text-white" style={{ backgroundColor: '#722ED1' }}>设备</span>
            <span className="px-2 py-1 rounded text-xs text-white" style={{ backgroundColor: '#165DFF' }}>产品</span>
            <span className="px-2 py-1 rounded text-xs text-white" style={{ backgroundColor: '#86909C' }}>行业</span>
          </div>
        </div>

        {/* 开始按钮 */}
        <button
          onClick={handleClose}
          className="w-full py-3 bg-arco-primary hover:bg-arco-primary-hover text-white rounded-lg font-medium text-sm transition-colors"
        >
          开始探索
        </button>

        <p className="text-center text-white/30 text-[10px] mt-4">
          所有数据均可追溯来源，可信度标注为已验证/待验证
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 验证编译**

```bash
npx tsc --noEmit 2>&1 | grep -i "IntroOverlay" | head -5
```

Expected: 无 IntroOverlay 相关错误。

- [ ] **Step 4: 提交**

```bash
git add src/components/IntroOverlay.tsx src/components/IntroOverlay.old.tsx.bak
git commit -m "refactor(ui): 重写 IntroOverlay 引导页

- 介绍项目核心理念（网状世界 vs 树状叙事）
- 说明当前处于第一阶段：节点录入中
- 展示节点类型"
```

---

### Task 2.4: 重写主页面（第二阶段交互）

**Files:**
- Modify: `src/app/page.tsx`

**Goal:** 搜索 → 选中节点 → 显示详情面板；画布区域显示"节点录入阶段"占位提示。

- [ ] **Step 1: 备份旧 page.tsx**

```bash
cp src/app/page.tsx src/app/page.old.tsx.bak
```

- [ ] **Step 2: 重写 page.tsx**

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import SearchBar from '../components/SearchBar';
import NodeDetail from '../components/NodeDetail';
import IntroOverlay from '../components/IntroOverlay';
import type { GraphNode } from '../lib/types';

const INTRO_SHOWN_KEY = 'wanyuan-intro-shown';

export default function Home() {
  const [showIntro, setShowIntro] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [childNodes, setChildNodes] = useState<GraphNode[]>([]);
  const [parentNode, setParentNode] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hasShown = sessionStorage.getItem(INTRO_SHOWN_KEY);
    if (hasShown) {
      setShowIntro(false);
    }
  }, []);

  const handleCloseIntro = () => {
    sessionStorage.setItem(INTRO_SHOWN_KEY, '1');
    setShowIntro(false);
  };

  const fetchNodeDetail = useCallback(async (nodeId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/graph?node=${encodeURIComponent(nodeId)}`);
      if (!res.ok) return;
      const data = await res.json();
      setSelectedNode(data.node);
      setChildNodes(data.children || []);
      setParentNode(data.parent || null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleNodeSelect = (node: GraphNode) => {
    fetchNodeDetail(node.id);
  };

  const handleNodeClick = (nodeId: string) => {
    fetchNodeDetail(nodeId);
  };

  const handleCloseDetail = () => {
    setSelectedNode(null);
    setChildNodes([]);
    setParentNode(null);
  };

  return (
    <main className="w-screen h-screen relative overflow-hidden bg-canvas-900">
      {/* 画布区域（第二阶段：占位提示） */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* 星空背景 */}
        <div className="absolute inset-0 bg-gradient-to-br from-canvas-900 via-canvas-800 to-canvas-900" />
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(2px 2px at 20px 30px, #fff, transparent),
              radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent),
              radial-gradient(1px 1px at 90px 40px, #fff, transparent),
              radial-gradient(2px 2px at 160px 120px, rgba(255,255,255,0.9), transparent),
              radial-gradient(1px 1px at 230px 80px, #fff, transparent),
              radial-gradient(2px 2px at 300px 150px, rgba(255,255,255,0.7), transparent),
              radial-gradient(1px 1px at 370px 60px, #fff, transparent),
              radial-gradient(2px 2px at 450px 200px, rgba(255,255,255,0.8), transparent)
            `,
            backgroundSize: '500px 250px',
            backgroundRepeat: 'repeat',
          }}
        />

        {/* 光晕装饰 */}
        <div
          className="absolute top-0 left-0 w-[400px] h-[400px]"
          style={{
            background: 'radial-gradient(circle, rgba(22,93,255,0.08) 0%, transparent 70%)',
            filter: 'blur(40px)',
            transform: 'translate(-25%, -25%)',
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-[400px] h-[400px]"
          style={{
            background: 'radial-gradient(circle, rgba(0,180,42,0.06) 0%, transparent 70%)',
            filter: 'blur(40px)',
            transform: 'translate(25%, 25%)',
          }}
        />

        {/* 搜索栏（顶部） */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
          <SearchBar onSelect={handleNodeSelect} placeholder="搜索一个节点，开始探索..." />
        </div>

        {/* 中心占位提示 */}
        {!selectedNode && (
          <div className="relative z-10 text-center max-w-md px-6">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-canvas-800/80 flex items-center justify-center">
              <svg className="w-10 h-10 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-ink-2 mb-2">第一阶段：节点录入中</h2>
            <p className="text-ink-4 text-sm leading-relaxed mb-6">
              产业链连接网络将在下一阶段构建。当前你可以搜索节点，查看定义、分类关系和来源依据。
            </p>

            {/* 推荐节点 */}
            <div className="text-ink-4 text-xs mb-3">推荐从这里开始</div>
            <div className="flex flex-wrap gap-2 justify-center">
              {['material-polyethylene', 'equipment-injection-molding-machine', 'industry-photovoltaic'].map((id) => {
                const names: Record<string, string> = {
                  'material-polyethylene': '聚乙烯',
                  'equipment-injection-molding-machine': '注塑机',
                  'industry-photovoltaic': '光伏行业',
                };
                return (
                  <button
                    key={id}
                    onClick={() => fetchNodeDetail(id)}
                    className="px-3 py-1.5 bg-canvas-800/80 hover:bg-canvas-700 border border-canvas-700 rounded-lg text-ink-2 text-sm transition-colors"
                  >
                    {names[id]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 左下角阶段信息 */}
        <div
          className="absolute bottom-4 left-4 z-10 pointer-events-none"
          style={{
            background: 'rgba(10,14,26,0.85)',
            borderRadius: '8px',
            padding: '12px 16px',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            <span className="text-white/60 text-xs">第一阶段：节点录入</span>
          </div>
          <p className="text-white/30 text-[10px] mt-1">
            关系网络将在下一阶段逐步补充
          </p>
        </div>
      </div>

      {/* 节点详情面板（右侧滑出） */}
      {selectedNode && (
        <div className="absolute right-0 top-0 bottom-0 z-20 flex">
          <NodeDetail
            node={selectedNode}
            children={childNodes}
            parent={parentNode}
            loading={loading}
            onClose={handleCloseDetail}
            onNodeClick={handleNodeClick}
          />
        </div>
      )}

      {/* 引导页 */}
      {showIntro && <IntroOverlay onClose={handleCloseIntro} />}
    </main>
  );
}
```

- [ ] **Step 3: 运行构建验证**

```bash
npm run build 2>&1 | tail -40
```

Expected: 构建成功（可能有警告，但无错误）。验证首页能打开，搜索能找到节点，点击后详情面板正常显示。

- [ ] **Step 4: 提交**

```bash
git add src/app/page.tsx src/app/page.old.tsx.bak
git commit -m "refactor(ui): 重写主页面，第二阶段节点浏览体验

- 搜索栏顶部居中
- 中心占位提示 + 推荐节点（聚乙烯/注塑机/光伏）
- 节点详情面板右侧滑出
- 左下角阶段信息
- 适配 v2 数据模型和类型定义"
```

---

### Task 2.5: 清理废弃文件

- [ ] **Step 1: 删除不再使用的组件/文件**

```bash
rm -f src/components/KeyboardShortcuts.tsx
rm -f src/lib/types.old.ts.bak
rm -f src/lib/graph-data.old.ts.bak
rm -f src/components/SearchBar.old.tsx.bak
rm -f src/components/NodeDetail.old.tsx.bak
rm -f src/components/IntroOverlay.old.tsx.bak
rm -f src/app/page.old.tsx.bak
rm -f types.ts
rm -f sample-data.json
```

- [ ] **Step 2: 确认 .gitignore 已包含备份目录**

```bash
grep "backup" .gitignore || echo "*.bak" >> .gitignore
```

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "cleanup: 删除废弃文件，清理备份

- 删除 KeyboardShortcuts 组件
- 删除旧的类型定义和组件备份
- 删除根目录遗留的 types.ts 和 sample-data.json"
```

---

### Task 2.6: 第二阶段验证 — 端到端体验

- [ ] **Step 1: 启动 dev server**

```bash
npm run dev &
sleep 5
```

- [ ] **Step 2: 验证首页加载**

```bash
curl -s http://localhost:3000/ | grep -c "万源图谱"
```

Expected: 输出大于 0。

- [ ] **Step 3: 验证搜索接口**

```bash
curl -s "http://localhost:3000/api/graph" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log('Total nodes:', d.nodes.length);
const pe = d.nodes.find((n:any)=>n.id==='material-polyethylene');
console.log('PE children:', d.nodes.filter((n:any)=>n.parent_type==='material-polyethylene').length);
"
```

Expected: Total nodes: 20, PE children: 3。

- [ ] **Step 4: 停止 dev server**

```bash
pkill -f "next dev" || true
```

- [ ] **Step 5: 提交第二阶段完成标记**

```bash
git commit --allow-empty -m "phase2: 节点浏览体验完成

- 搜索栏：节点名称搜索 + 类型标签 + 键盘导航
- 节点详情：definition + 分类学关系 + 来源可追溯
- 引导页：项目理念介绍 + 当前阶段说明
- 主页面：搜索 → 详情 → 分类学跳转 完整流程
- 画布区域占位：第一阶段节点录入中"
```

---

## 第三阶段：物理流动链（主体验）

> 注：第三至六阶段为后续计划，细节将在第二阶段完成后根据实际情况细化。此处提供框架和关键任务清单。

### Task 3.1: 录入第一批边数据（30-50 条）

**Files:**
- Modify: `src/data/graph-data.json`（从 nodes-draft 扩展，重命名为 graph-data.json）

**内容：**
- 塑料杯产业链：原料链（聚丙烯→塑料杯）、设备链（注塑机→塑料杯）、耗材链（模具→塑料杯）
- 光伏-储能-电池隔膜路径
- 聚乙烯延伸：包装薄膜/塑料管道/农用薄膜
- 石油化工 → 乙烯/丙烯 → 聚乙烯/聚丙烯
- 关系类型优先使用细分类型：raw_material_for / equipment_for / consumable_for / can_be_processed_into
- 兜底用 upstream_of / downstream_of
- 每条边有 verification_status（大部分 proposed，少数 verified）
- 每条边至少有一条 evidence（Source 数组）

### Task 3.2: 重写 Cytoscape 配置

**Files:**
- Modify: `src/lib/cytoscape-config.ts`

**内容：**
- 节点颜色按 node_type 区分（material=绿、product=蓝、equipment=紫、process=青、industry=灰、entity=浅灰）
- 边颜色按 relation_type 区分
- verified 边：实线、width 3px
- proposed 边：虚线（dash-pattern [8,6]）、width 2px、橙色
- dagre 布局配置（rankDir LR, rankSep 120, nodeSep 50）
- breadthfirst 降级配置

### Task 3.3: 重写 GraphCanvas 组件

**Files:**
- Modify: `src/components/GraphCanvas.tsx`

**内容：**
- 渐进式局部展开：初始显示中心节点+直接邻居
- 点击节点展开/收起其邻居
- 按关系类型过滤
- dagre 层次布局（左到右）
- 边悬停 tooltip（关系类型 + 验证状态 + evidence 摘要）
- isMountedRef 守卫 + 完整 cleanup（防崩溃）
- 切换链路时的淡出淡入过渡

### Task 3.4: NodeDetail 增加关系区域

**Files:**
- Modify: `src/components/NodeDetail.tsx`

**内容：**
- 按 relation_type 分组展示直接连接
- 每条关系：对端节点名 + 方向 + 验证状态圆点
- 点击关系跳转到对应节点
- 切换链路视角的入口（各关系类型标签可点击）

### Task 3.5: 主页面增加链路视图 + 面包屑

**Files:**
- Modify: `src/app/page.tsx`

**内容：**
- 选中节点后，详情面板显示可切换的链路类型
- 选择链路类型后，GraphCanvas 渲染该链路视图
- 面包屑导航记录探索路径，可点击回退
- 左下角可信度图例

---

## 第四阶段：材料属性延伸网

### Task 4.1: 录入材料延伸边

### Task 4.2: 材料节点详情增加"材料属性延伸"特殊入口

### Task 4.3: GraphCanvas 材料延伸视觉模式

---

## 第五阶段：可信度与溯源体系完善

### Task 5.1: Source 类型视觉编码

### Task 5.2: 边详情面板（完整 evidence 列表）

### Task 5.3: 节点 sources 区域完善

---

## 第六阶段：Demo 打磨

### Task 6.1: 推荐起始节点优化

### Task 6.2: 首次使用引导

### Task 6.3: 性能优化

---

## 自检清单

**1. Spec 覆盖度检查：**

| 需求 | 对应任务 |
|------|----------|
| schema v0.2 类型对齐 | Task 1.1 |
| draft 节点录入（20个，每个有 definition + source） | Task 1.2 |
| 节点分类学关系（parent_type 字段，子类关系不用边） | Task 1.2, Task 2.2 |
| 数据层函数（getGraphData/getNodeById/searchNodes 等） | Task 1.3 |
| API 路由（全量/单节点/链路视图） | Task 1.4 |
| 搜索功能 | Task 2.1 |
| 节点详情面板（definition/分类学/sources） | Task 2.2 |
| 引导页（节点录入阶段说明） | Task 2.3 |
| 主页面交互（搜索→详情→分类学跳转） | Task 2.4 |
| 物理流动链主体验 | 第三阶段 |
| 材料属性延伸网 | 第四阶段 |
| 可信度体系 | 第五阶段 |
| Demo 打磨 | 第六阶段 |

**2. 占位符检查：**

- 无 TBD/TODO/implement later
- 每个步骤都有具体代码或命令
- 每个任务都有明确的文件路径
- 第三至六阶段为框架性规划，标注了"细节将在第二阶段完成后细化"

**3. 类型一致性检查：**

- 类型定义在 Task 1.1 定义，后续任务均引用
- NodeType/RelationType/SourceType 等枚举与 schema.json 一致
- 函数签名在 graph-data.ts 定义，API 和 UI 层消费
- 数据流向：JSON → graph-data.ts → API → UI 组件，每一层的类型都对上

**4. 与项目理念的一致性：**

- 节点不携带行业标签 ✅（schema v0.2 已移除 industry_tags）
- 子类关系用 parent_type 表达，不用边 ✅
- 第一阶段只做节点，不做边 ✅（符合"先把节点录入跑通"的思路）
- 可信度体系从第一条数据开始就有 ✅（sources 字段）
- 物理流动链是地基，材料延伸网是阁楼上的密室 ✅（阶段顺序正确）
- 不做价值判断/推荐 ✅（引导页只展示，不推荐）
