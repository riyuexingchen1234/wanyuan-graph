# 万源图谱 — 实体消歧与产业链命名体系设计文档

## Overview
- **Summary**: 对当前图谱中928个节点进行自动化实体消歧（同名异义/同物异名）处理，以国家级/权威机构数据作为判词确定标准名称，建立"通用锚点名 + 别名 + 分产业链语境显示名"的三层命名体系，同时为"主链横向排布 + 支链隐约可见 + 点击跨链节点切换产业链视角"的交互模型提供完整的数据层支撑。
- **Purpose**: 解决数据录入过程中命名不一致（同物异名、同名异义、简称全称混用、不同行业叫法不同）造成的节点分裂、边断裂、搜索不准问题；同时为后续"十字交叉视角切换"交互模型提供数据基础。
- **核心原则**: 权威来源是判词不是判据——当国家级/权威机构数据有明确表述时直接自动执行；人工审核是对照权威来源核查执行是否正确，而非重新做决定。

## Goals
- **G1 (消歧准确)**: 识别并合并数据中确实指向同一实体的重复节点，判定依据可追溯到权威来源。
- **G2 (命名分层)**: 建立通用名(name)、等价别名(aliases)、分产业链语境名(contextual_names)三层命名体系，同一节点在不同产业链视角下自动显示该链约定俗成的名称。
- **G3 (产业链归属)**: 每个节点标注所属产业链列表(chains)和主产业链(primary_chain)，为视角切换提供锚点。
- **G4 (可审计可回滚)**: 所有自动化决策输出审核报告，合并前强制备份，合并后有完整变更日志，支持回滚。
- **G5 (交互数据就绪)**: 数据模型完整支撑"主链横向+支链悬挂+点击跨链节点切换视角"的交互模式，不需要后续再次改动数据结构。

## Non-Goals (本次不做)
- **不实现前端交互逻辑**：本次只做数据层清洗和字段填充，3D布局/视角切换动画/名称动态显示留给后续渲染层工作。
- **不直接覆盖生产数据**：脚本默认dry-run，合并结果输出到独立目录，确认后手动替换`src/data/graph-data.json`。
- **不大规模扩展节点数量**：本次处理以消歧、合并、命名为核心，不新增节点（仅可能新增aliases/contextual_names）。
- **不处理边的chain归属**：边不加chains字段——同一条边在不同视角下角色不同，由渲染层根据当前ChainDef动态判定主轴/支链。
- **不做用户系统/协作审核**：审核通过编辑JSON/Markdown文件完成，不做审核UI。
- **不爬取商业数据库**（Total Materia等服务条款禁止）。

---

## Background & Context

### 当前数据现状（2026-06-26 实测）
- **总节点数**: 928个（industry:94, product:671, material:147, equipment:14, process:2）
- **总边数**: 319条
- **已有aliases的节点**: 79个（主要是统计局行业代码别名C/26/38等，材料/产品的俗名、行业别称几乎缺失）
- **简单名称包含检测发现疑似重复**: 124组（其中大量实际是父子分类关系，非重复）
- **现有去重脚本**: `scripts/crawler/deduplicate-nodes.ts` 仅做完全同名精确匹配，无法处理"锂离子电池"vs"锂电池"这类近似重复。

### 已有的本地权威数据源
| 数据源 | 位置 | 可信级别 | 消歧用途 |
|--------|------|---------|---------|
| 国家统计局国民经济行业分类(GB/T 4754-2017) | `data/raw/stats-gov-industries.json` | 最高（官方法定分类） | industry类型节点的标准名、分类层级判词 |
| 国家标准(GB)爬取数据 | `data/raw/gb-standards.json` | 高（国家正式标准） | material/product/equipment的正式术语、同名异义判词 |
| 巨潮资讯(上市公司公告) | `data/raw/cninfo-result.json` | 中（企业实务用法） | 行业实际叫法发现，contextual_names候选 |
| 光伏产业链人工梳理 | `data/raw/pv-industry-chain.json` | 中 | pv_chain语境名来源、边关系来源 |
| 锂电池产业链人工梳理 | `data/raw/battery-industry-chain.json` | 中 | battery_chain语境名来源、边关系来源 |
| 新材料/化工产业链 | `data/raw/material-industry-chain.json` | 中 | material_chain语境名来源 |
| 国标提取边 | `data/raw/gb-extracted-edges.json` | 中 | 共同邻居证据辅助 |

### 方案选择
在三种方案中选择了**方案2：常用名作为标准名+权威名作为别名/语境名**：
- 方案1（权威名优先）被否决：国标名往往冗长（如"地面用晶体硅光伏电池总规范"），不适合作为主显示名。
- 方案3（多名称平等无标准名）被否决：schema改动大，搜索/列表缺少确定性锚点。
- 方案2选择理由：标准名(name)取行业内最常用、最简洁、无歧义的通用名，权威名作为contextual_names按产业链/标准体系统一存放，兼顾权威性和实用性。

---

## 数据模型设计

### 类型扩展（修改 `src/lib/types.ts`）

#### 新增类型：关系流向

```typescript
export type RelationFlow = 'upstream_to_downstream' | 'downstream_to_upstream' | 'horizontal';
```

关系流向说明：
- `upstream_to_downstream`: source是target的上游，布局时source在左，target在右
- `downstream_to_upstream`: source是target的下游（如made_of中source是成品、target是原料），布局时target在左，source在右
- `horizontal`: 横向相似关系，不进入产业链主轴

默认关系流向映射表（与types.ts同位置新增）：

```typescript
export const RELATION_FLOW: Record<RelationType, RelationFlow> = {
  raw_material_for: 'upstream_to_downstream',       // 原料→产品
  can_be_processed_into: 'upstream_to_downstream',  // 原料→加工产物
  upstream_of: 'upstream_to_downstream',            // 上游→下游
  applied_in: 'upstream_to_downstream',             // 材料/技术→应用领域（应用是下游方向）
  made_of: 'downstream_to_upstream',                // 成品←原料（target是source的构成材料）
  equipment_for: 'downstream_to_upstream',          // 装备←主体（target是被服务的主体）
  consumable_for: 'downstream_to_upstream',         // 耗材←工艺（target是被服务的工艺）
  downstream_of: 'downstream_to_upstream',          // 下游←上游
  structurally_similar_to: 'horizontal',            // 横向相似，不进入主轴
};
```

> **⚠️ 关键决策点**: applied_in默认流向为upstream_to_downstream，基于"A应用于B"语义判断A是B的输入/装备，B是A的去向（下游）。ChainDef中可以覆盖此默认值。made_of/equipment_for/consumable_for为反向，因为这三者的主语是成品/主体，source是成品，target是原料/设备/耗材。

#### 新增类型：产业链定义

```typescript
export interface ChainRelation {
  type: RelationType;
  flow?: RelationFlow;  // 不填则使用RELATION_FLOW默认值
}

export interface ChainDef {
  id: string;
  name: string;
  description: string;
  main_axis_relations: (RelationType | ChainRelation)[];  // 构成横向主轴的关系
  branch_relations: (RelationType | ChainRelation)[];     // 构成支链的关系
  primary_axis?: 'x' | 'y' | 'z';                         // 主轴方向，默认'x'
  root_node_id?: string;                                  // 链的起始节点（可选）
  branch_depth?: number;                                  // 支链可见深度，默认1
}
```

预置产业链定义（新增 `src/lib/chains.ts`）：

| chain_id | 名称 | 说明 | 是否作为可切换视角 |
|----------|------|------|-----------------|
| `pv_chain` | 光伏产业链 | 从硅料到光伏电站 | 是 |
| `battery_chain` | 电池储能产业链 | 从矿产到电池系统 | 是 |
| `material_chain` | 材料属性延伸链 | 基于结构相似性和应用领域的横向材料网 | 是 |
| `stats_gov` | 国家统计局分类 | 官方法定行业分类，用于名称消歧 | **否**（仅作判词来源和contextual_name标记） |
| `gb_standard` | 国家标准术语 | GB标准中的正式术语名称 | **否**（同上） |

预置ChainDef具体配置（以下为初版配置，实现阶段根据实际数据关系验证后可调整）：

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
  },
  battery_chain: {
    id: 'battery_chain',
    name: '电池储能产业链',
    description: '从矿产资源到电池系统与储能应用',
    main_axis_relations: ['raw_material_for', 'can_be_processed_into', 'made_of', 'downstream_of', 'upstream_of'],
    branch_relations: ['applied_in', 'equipment_for', 'consumable_for', 'structurally_similar_to'],
    primary_axis: 'x',
    branch_depth: 1,
  },
  material_chain: {
    id: 'material_chain',
    name: '材料属性延伸链',
    description: '基于材料结构相似性和跨领域应用的横向材料网络',
    main_axis_relations: ['structurally_similar_to', { type: 'applied_in', flow: 'upstream_to_downstream' }, 'can_be_processed_into'],
    branch_relations: ['raw_material_for', 'made_of', 'equipment_for'],
    primary_axis: 'x',
    branch_depth: 1,
  },
  // stats_gov / gb_standard 不作为可切换视角，不出现在UI视角列表中
};
```

#### 扩展 GraphNode

```typescript
export interface Alias {
  term: string;
  context?: string;  // 使用该别名的宽泛语境说明（不是chain_id，是"日常口语""台湾地区叫法"之类）
  note?: string;
  source?: Source;   // 该别名的权威来源（新增）
}

export interface ContextualName {
  term: string;      // 该产业链视角下节点的显示名称
  chain_id: string;  // 所属产业链ID
  note?: string;     // 如"行业内常用大类名代指，热塑性树脂实际包含PE/PP/PVC等"
  source?: Source;   // 该叫法的来源依据
}

export interface GraphNode {
  id: string;
  name: string;                      // 通用锚点名（最短、最无歧义、跨行业通用）
  definition: string;
  node_type: NodeType;
  stage: 'draft' | 'reviewed' | 'merged';  // 新增 'merged' 状态
  parent_type: string | null;

  aliases?: Alias[];                 // 完全等价别名（缩写、俗名、简称）
  contextual_names?: ContextualName[];  // 特定产业链下的显示名称
  chains?: string[];                 // 该节点出现在哪些产业链
  primary_chain?: string;            // 主产业链ID（默认展开视角、搜索优先）
  merged_from?: string[];            // 主节点上：我吸收了哪些被合并节点的ID
  merged_into?: string;              // 被合并节点上：我被合并到了哪个节点ID

  attributes?: NodeAttributes;
  description?: string;
  sources?: Source[];
  created_at: string;
  updated_at: string;
}
```

> **⚠️ 约束**:
> 1. 一个节点在同一个chain_id下**最多有一个**contextual_name（该链唯一主显示名）。
> 2. 如果某chain下显示名称就是name本身，**不需要冗余存储**contextual_name——name本身就是默认回退。
> 3. aliases用于存储完全等价的叫法（任何语境下可互换），contextual_names是语境相关显示名（切换视角时变化）。
> 4. 同一产业链内存在的其他叫法（非主显示名的俗称），放入aliases，alias的context标注使用范围。

#### GraphEdge 保持不变

Edge不加chains字段。理由：同一条边在不同视角下角色不同（主轴边或支链边），角色由渲染层根据当前ChainDef动态判定，不应静态写入数据。

---

## 处理流水线设计

整体7阶段流程，前5阶段自动化执行（不修改数据），第6阶段输出审核报告供人工检查，第7阶段根据审核结果应用合并。

```
原始数据(928节点/319边)
  │
  ▼
[阶段1] 名称规范化（生成norm_name用于比对，不改原名）
  │
  ▼
[阶段2] 候选重复对检测（多策略加权打分）
  │
  ▼
[阶段3] 本地权威来源交叉验证（判词判定）
  │
  ▼
[阶段4] 联网权威来源补充（可选，有网络/API Key时执行）
  │
  ▼
[阶段5] 自动分类决策（生成建议+判词依据）
  │
  ▼
[阶段6] 输出审核报告（人工核查）
  │
  ▼
[阶段7] 应用合并（备份→合并→迁移边→写日志→验证）
  │
  ▼
清洗后数据
```

### 阶段1：名称规范化

对每个节点的name生成标准化的norm_name，**仅用于比对，不修改原name**：

规范化规则：
1. 全角字符→半角（`Ａ`→`A`，`（`→`(`，`％`→`%`）
2. 去除首尾及多余空白
3. 繁简转换（如有）
4. 统一常见英文大小写（`pe`→`PE`，但中文名称不做转换）
5. 识别并标记**文档性质后缀**（仅标记不剥离）："规范"、"总规范"、"通用技术条件"、"技术条件"、"试验方法"、"分类"、"测定方法"、"的测定"等。含这些后缀的名称来源是gb_standard时，提示该名称可能是标准文档名而非实体名。

### 阶段2：候选重复对检测（多策略加权打分）

仅在**node_type相同**的节点之间比较，避免跨类型误报。

| 策略 | 适用情况 | 权重 | 说明 |
|------|---------|------|------|
| 规范化后完全相等 | 格式差异 | 1.0 | norm_name完全相同 |
| 别名反向命中 | A的name是B的alias，或反之 | 0.95 | |
| 编辑距离相似度 | 短文本简称/全称 | 0.7 | Levenshtein ≥ 0.8 且名字长度差 ≤ 3 |
| 子串包含+同类型 | "锂电池"⊂"锂离子电池" | 0.6 | 长度差 ≤ 4（排除明显父子关系） |
| 共同邻居Jaccard重叠 | 语义相似 | 0.5 | ≥ 0.7 且同node_type |
| ID(slugify后)相似 | ID生成不规范导致的重复 | 0.4 | |

**置信度分级**：
- 综合分 ≥ 0.85 → **高置信度**
- 0.6 ≤ 综合分 < 0.85 → **中置信度**（需权威验证）
- < 0.6 → 不进入候选列表

### 阶段3：本地权威来源交叉验证（核心判词阶段）

**⚠️ 此阶段是设计核心：国家级/权威来源是判词，不是判据。有明确判词时直接出结论，不需要"建议"。**

判词执行规则：

| 场景 | 判词来源 | 自动结论 |
|------|---------|---------|
| 两个名称在**同一国标/统计局分类**中被等同标注（如"X又名Y""X简称Y"） | 国标/统计局原文 | **直接判merge**，记录权威条文作为source |
| 两个名称在**国标/统计局**中被列为不同条目/不同代码 | 国标/统计局 | **直接判not_duplicate**（不同实体） |
| 两个名称在**国标/统计局**中存在明确层级包含关系（大类→小类） | 国标/统计局 | **直接判parent_child**，设置parent_type |
| 多来源（2+独立权威源）都指向"两个名称是同一实体" | 多源交叉 | **高置信度merge** |
| 不同权威来源互相矛盾 | 权威源冲突 | **manual_review**，列出各方依据交人 |
| 权威来源未覆盖 | 无判词 | 中置信度候选进入manual_review |

**关键子判断——父子关系排除**：
- 如果候选对中一个是另一个的`parent_type` → 判parent_child
- 如果在国标/统计局分类树中是明确上下级 → 判parent_child
- 如果名称是"[修饰词]+[另一名称]"结构且修饰词是常见技术路线修饰（如"晶体硅"、"单/多晶"、"车用"、"储能用"、"地面用"） → 优先判parent_child而非merge

**关键子判断——文档名→实体名处理**：
- 含文档性质后缀（"规范""总规范""技术条件"）且来源为gb_standard的节点：
  - 剥离后缀后的实体名若匹配到其他节点 → 提供merge建议，原始全名作为contextual_name(chain_id="gb_standard")
  - 若剥离后无匹配且无definition支撑 → 标记为review（可能不应作为图节点，应降级为source引用）

### 阶段4：联网权威补充（可选）

触发条件：有网络连接且配置了相关环境变量。

| 数据源 | 用途 | 限制 |
|--------|------|------|
| 国标全文公开系统(openstd.samr.gov.cn) | 查询标准术语和定义 | 限速，反爬，结果保存url+retrieved_at |
| 百度百科/维基百科 | 词条重定向关系（"锂电池"是否重定向到"锂离子电池"） | 可信度Level3（百科可编辑），仅作交叉印证 |
| LLM（如配LLM_API_KEY） | 将候选名称+定义发给LLM判断 | LLM可能幻觉，仅作为判断建议来源，其输出不构成判词，写入proposed_by |

**硬规则**：
- 联网结果**只能补充证据，不能单独触发自动merge**（必须配合本地权威源）
- 查询失败不影响主流程，该候选降级manual_review
- 所有联网结果保存source记录（url+retrieved_at）

### 阶段5：自动分类决策

对每个候选对给出一个决策：

| 决策类型 | 触发条件 | 自动处理 |
|---------|---------|---------|
| `merge` | 权威判词确认同一实体 + 高置信度打分 | 选定name，明确哪些名称→aliases、哪些→contextual_names |
| `parent_child` | 权威判词确认层级关系 | 保持独立节点，设parent_type |
| `not_duplicate` | 权威判词确认不同实体 | 加入"已确认不重复"列表，下次运行不再重复检测 |
| `manual_review` | 证据矛盾/无权威覆盖/中置信度 | 列出所有证据交人判断 |

**自动选name规则**（merge决策中，选定主节点的name）：
1. 权威来源明确指定标准名 → 用权威名（但国标文档全名不作为name首选）
2. 否则选**最短且无歧义**的名称（"聚乙烯"优于"聚乙烯树脂"优于"PE"）
3. 英文/缩写（PE/PP/PVC）不作为name首选（除非无中文名）
4. 含文档性质后缀的国标名不作为name首选
5. 多产业链数据中出现频次最高的名称优先

**自动标记chains和primary_chain**：
- chains：该节点的边连接、来源数据覆盖了哪些链 → 并集
- primary_chain推断优先级（高→低）：
  1. 权威来源明确归属（国标/统计局分类对应的链）
  2. 节点来源数据集中的链（来自pv产业链数据→pv_chain）
  3. 边连接密度（该节点在哪条链有最多关联边）
  4. 节点类型默认：material→material_chain，product/equipment按来源，industry按行业代码
  5. 无法判定 → primary_chain=null，人工设定

**自动标记contextual_names**：
- 该节点名称来自哪条产业链数据 → 对应chain_id的contextual_name（若名称与name相同则不冗余存储）
- 来自统计局数据 → contextual_name(chain_id="stats_gov")
- 来自国标数据（非文档全名）→ contextual_name(chain_id="gb_standard")
- 简称/缩写/英文名/俗称 → aliases（标注context）

**撞名检测**：
- 生成contextual_name时检查：该term是否与其他节点的name/contextual_name冲突
- 冲突时标记manual_review，提示三种可能：
  - (a) 行业代称（用大类名代指具体材料）→ 保留contextual_name，note中说明
  - (b) 实际是父子关系 → 改设parent_type
  - (c) 不同实体 → 不使用该contextual_name

### 阶段6：输出审核报告

生成两份输出：

**1. 机器可读决策文件** `auto-decisions.json`：
```json
{
  "run_id": "2026-06-26-143000",
  "summary": {
    "total_candidates": 45,
    "auto_merge": 12,
    "auto_parent_child": 18,
    "auto_not_duplicate": 5,
    "manual_review": 10
  },
  "decisions": [
    {
      "decision_type": "merge",
      "primary_node_id": "material-lithium-ion-battery",
      "merged_node_ids": ["product-lithium-battery"],
      "primary_name": "锂离子电池",
      "evidence": [
        {"source": "gb_standard", "detail": "GB/T 2900.XX-XXXX中'锂电池'为'锂离子电池'的简称", "url": "..."}
      ],
      "aliases_add": [{"term": "锂电池", "context": "行业简称", "source": {...}}],
      "contextual_names_add": [],
      "chains_assigned": ["battery_chain", "material_chain"],
      "primary_chain_assigned": "battery_chain",
      "edges_to_redirect": 3
    }
  ]
}
```

**2. 人工可读报告** `review-report.md`：包含执行摘要、权威直接判决列表（自动执行，列出供核查）、需要人工审核项（含双方信息/得分/证据/建议选项）、产业链归属预览、撞名警告、名称规范化统计。

人工审核项提供明确选择：
- [ ] A. 合并为一个节点
- [ ] B. 父子关系（指定谁是父谁是子）
- [ ] C. 不合并（确认为不同实体）
- [ ] D. 其他（说明）

### 阶段7：应用合并

执行前提：通过 `--apply` 参数显式触发。

执行步骤：
1. **备份**：将当前`src/data/graph-data.json`复制到`backup/graph-data-pre-resolve-YYYY-MM-DD-HHmmss.json`
2. **节点合并**：
   - 被合并节点：stage设为`merged`，`merged_into`指向主节点ID，保留所有原始字段
   - 主节点：`merged_from`加入被合并节点ID
   - name/definition按审核决策设置（definition取最权威最完整的）
   - aliases合并去重，补充source
   - contextual_names合并，同chain_id唯一（决策中已确定）
   - chains取并集，primary_chain按决策设置
   - sources合并去重
3. **边迁移**：
   - 所有指向被合并节点的边，source/target重定向到主节点ID
   - 重定向后若产生重复边（同source/target/relation_type），合并evidence，保留verification_status较高的
4. **父子关系设置**：parent_child决策的节点对设置parent_type
5. **不重复标记**：not_duplicate决策的节点对，可写入一个忽略列表供下次运行跳过
6. **生成变更日志**：`merge-log.json`，记录每个操作（操作类型、节点ID、变更前、变更后、依据）
7. **一致性验证**：
   - 无悬空边引用（所有edge.source/edge.target都存在于nodes）
   - 所有merged节点都有merged_into指向有效主节点
   - 所有parent_type引用有效节点
   - contextual_names的chain_id都存在于ChainDef
   - 数据通过schema.json校验
8. **输出结果**：写入`resolved-graph-data.json`到输出目录（**不直接覆盖**src/data/graph-data.json，需手动替换确认）

---

## 交互模型与数据层契约

虽然本次不实现交互逻辑，但数据模型必须能支撑以下交互场景。这里明确数据层与渲染层的契约。

### 场景：十字交叉视角切换

**初始状态**：用户点击节点b1（光伏组件）
- 数据层提供：b1.primary_chain = "pv_chain"
- 渲染层行为：以b1为中心，沿pv_chain.main_axis_relations（考虑RELATION_FLOW流向）双向BFS，沿upstream_to_downstream方向向右，downstream_to_upstream方向向左，得到主轴节点序列b0-b1-b2-b3，沿X轴横向排列
- 支链节点：主轴节点通过pv_chain.branch_relations连出的、不在主轴集合内的一跳邻居，沿Y/Z轴方向排布，视觉淡化（"隐约可见"）
- 名称显示：全局currentChainId="pv_chain"，所有节点调用getDisplayName(node, "pv_chain")，有pv_chain contextual_name显示它，否则显示name
- 跨链提示：支链节点的primary_chain !== "pv_chain"时，可视觉上标记为"跨链节点"

**切换动作**：用户点击支链节点c0（其primary_chain="rv_chain"）
- 数据层提供：c0.primary_chain = "rv_chain"
- 渲染层行为：切换全局currentChainId="rv_chain"，以c0为中心重新沿rv_chain.main_axis_relations BFS得到新主轴c0-c1-c2，重新布局
- 名称切换：所有节点统一按rv_chain视角显示名称，此时c1（即光伏组件）因为有contextual_name(chain_id="rv_chain", term="太阳能板")，显示为"太阳能板"
- 历史记录：navigationPath/browseHistory记录切换路径

### 展示层工具函数契约

数据层需要提供以下工具函数（供后续渲染层使用）：

```typescript
// 获取节点在指定产业链下的显示名
function getDisplayName(node: GraphNode, chainId?: string): string;

// 判断节点名称是否匹配搜索词（匹配name+aliases+contextual_names）
function matchesSearch(node: GraphNode, query: string): boolean;

// 搜索结果排序（当前产业链优先，主链次之，名称匹配度优先）
function sortSearchResults(nodes: GraphNode[], query: string, currentChainId?: string): GraphNode[];

// 获取节点在指定链下的主轴邻居（用于布局）
function getMainAxisNeighbors(nodeId: string, chainId: string, edges: GraphEdge[]): {upstream: string[], downstream: string[]};

// 获取节点在指定链下的支链邻居
function getBranchNeighbors(nodeId: string, chainId: string, edges: GraphEdge[], mainAxisNodeIds: Set<string>): string[];

// 根据旧ID查找节点（处理merged节点重定向）
function resolveNodeId(nodeId: string, nodes: GraphNode[]): string;
```

### 搜索逻辑

- **匹配域**：name + 所有aliases.term + 所有contextual_names.term（搜"太阳能板"也能命中光伏组件节点）
- **结果显示名**：按currentChainId选对应名称
- **结果排序优先级**：
  1. name精确匹配
  2. name前缀匹配
  3. 当前视角contextual_name匹配
  4. 主产业链contextual_name匹配
  5. alias匹配
  6. 其他contextual_name匹配

---

## 脚本文件组织

在`scripts/crawler/`下新增实体消歧脚本，采用模块化拆分：

```
scripts/crawler/
├── resolve-entities.ts             ← 主入口，CLI命令解析
├── entity-resolution/
│   ├── types.ts                    ← 内部类型定义（CandidateDecision, MergeAction等）
│   ├── name-normalizer.ts          ← 阶段1: 名称规范化
│   ├── candidate-detector.ts       ← 阶段2: 候选对检测+加权打分
│   ├── authority-verifier.ts       ← 阶段3: 本地权威来源验证（核心判词逻辑）
│   ├── web-verifier.ts             ← 阶段4: 联网补充（可选）
│   ├── decision-engine.ts          ← 阶段5: 自动决策（merge/parent_child/not_duplicate/manual_review）
│   ├── chain-assigner.ts           ← chains/primary_chain/contextual_names推断
│   ├── name-collision-detector.ts  ← contextual_name撞名检测
│   ├── report-generator.ts         ← 阶段6: 生成review-report.md和auto-decisions.json
│   ├── merge-executor.ts           ← 阶段7: 应用合并（备份+节点合并+边迁移+验证）
│   └── backup-manager.ts           ← 备份/回滚工具
├── entity-resolution-logs/         ← 输出目录（.gitignore，运行时生成）
│   └── YYYY-MM-DD-HHmmss/
│       ├── backup/
│       │   └── graph-data.json.bak
│       ├── candidates.json
│       ├── auto-decisions.json
│       ├── review-report.md
│       ├── merge-log.json
│       └── resolved-graph-data.json
└── (现有文件不变)
```

### CLI 使用方式

```bash
# 检测+自动决策，不修改数据（dry-run默认模式）
npx tsx scripts/crawler/resolve-entities.ts

# 同上，启用联网验证
npx tsx scripts/crawler/resolve-entities.ts --web

# 应用合并（读取同目录auto-decisions.json）
npx tsx scripts/crawler/resolve-entities.ts --apply --run=2026-06-26-143000

# 回滚某次操作
npx tsx scripts/crawler/resolve-entities.ts --rollback --run=2026-06-26-143000
```

### 使用流程
1. 运行dry-run → 2. 查看review-report.md → 3. 如有需要编辑auto-decisions.json修正决策 → 4. 运行--apply → 5. 检查resolved-graph-data.json满意后手动替换src/data/graph-data.json → 6. 若有问题使用--rollback恢复

---

## 风险与注意事项

### 高风险点
1. **误合并破坏数据**：最严重的风险。防护措施：dry-run优先、强制备份、merged节点不删除（可回滚）、变更日志完整、不直接覆盖生产数据。
2. **contextual_name撞名父类**（如"热塑性树脂"是PE的父类名）：撞名检测+manual_review标记。
3. **简称歧义**（"PC"可能是聚碳酸酯/个人电脑）：英文缩写不自动作为name，aliases中加note标注歧义，搜索时多结果返回。
4. **父子关系误判为合并**：子串包含策略权重较低(0.6)，且"[技术修饰词]+[基础名]"结构优先判parent_child。
5. **国标文档名误入节点集合**：文档后缀识别+manual_review标记。

### 权威来源边界
- 统计局数据只覆盖industry类型，不覆盖material/product，material/product以国标为主要判词。
- 百科/LLM永远不构成判词，仅作为线索。
- 不同权威矛盾时必走manual_review，不擅自选边。

---

## 未完成部分（后续工作清单）

### 本设计已覆盖（实施阶段需实现）
- [ ] types.ts扩展：Alias加source、GraphNode加chains/primary_chain/contextual_names/merged_from/merged_into/stage新增merged
- [ ] 新增src/lib/chains.ts：RELATION_FLOW流向表、ChainDef类型、CHAIN_DEFS预置链定义
- [ ] 新增src/lib/name-display.ts：getDisplayName/matchesSearch/sortSearchResults等展示层工具函数
- [ ] scripts/crawler/entity-resolution/下所有模块（name-normalizer→merge-executor）
- [ ] resolve-entities.ts主CLI入口
- [ ] schema.json更新以匹配扩展后的节点结构

### 本设计预留但不实施（渲染层/交互层后续任务）
- [ ] graphStore扩展：增加currentChainId全局状态、视角切换action
- [ ] graph-layout.ts改造：根据currentChainId的ChainDef.main_axis_relations动态布局主轴/支链，使用RELATION_FLOW决定方向
- [ ] Graph3D组件：节点标签使用getDisplayName(node, currentChainId)动态显示
- [ ] 主轴边/支链边视觉区分（主轴粗实线高亮、支链细线淡化、非链边极淡或隐藏）
- [ ] 相机飞行动画扩展：视角切换时主轴从"横向旧链"过渡到"横向新链"的动画
- [ ] 跨链节点视觉提示（支链中primary_chain !== currentChainId的节点特殊标记）
- [ ] 搜索API/搜索组件适配：多链名称匹配+按当前链排序
- [ ] 产业链切换UI控件（视角切换按钮/面包屑）
- [ ] ChainDef配置管理UI（未来新增产业链时的配置界面）

### 设计中预留的扩展点
- 新增产业链：在CHAIN_DEFS中添加条目，为相关节点补contextual_names即可，不需要改数据结构
- 新增relation_type：在RELATION_FLOW中添加流向定义，在对应ChainDef中配置属于主轴还是支链
- 节点量增长到需要数据库：数据访问层抽象（DAL）切换不影响实体消歧逻辑
- LLM辅助审核：接入LLM为manual_review项提供判断建议（不构成判词）

---

## 成功标准

实验运行后判断是否成功：
1. 节点净减少10-50个（重复合并，不大量删节点——大部分"疑似重复"实际是父子关系）
2. 每个被处理节点的决策都有明确依据记录（source可追溯）
3. 合并后通过schema校验，无悬空边、无效parent_type引用、无效chain_id
4. aliases/contextual_names填充合理：material/product节点普遍有跨链语境名，industry节点有统计局代码别名
5. 搜索任何常见别名/语境名都能命中对应节点
6. manual_review项不超过总候选数的20%（权威源覆盖率足够）
7. 回滚机制验证通过（备份可完整恢复到处理前状态）
