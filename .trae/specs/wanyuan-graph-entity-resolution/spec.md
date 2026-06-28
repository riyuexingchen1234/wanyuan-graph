# 万源图谱数据层设计 v2

> 物质转化网络模型。节点代表世界上具体存在的事物，边代表物质的转化、组成、使用关系。

---

## 1. 核心建模原则

### 1.1 本体论基础

模型基于**"持续实体-发生实体"二分法**（参考BFO顶层本体ISO 21838-2和IOF工业本体）：

- **持续实体（Continuant）**：在时间中保持同一性的事物——物质、设备、设施
- **发生实体（Occurrent）**：在时间中展开、有始有终的事物——转化过程

世界上的物质不会凭空出现或消失，它们通过**过程（process）** 从一种形态转化为另一种形态。面粉不会直接"变成"面包，它必须经过"烘烤"这个过程。石英砂不会直接"变成"硅片，必须经过冶炼、提纯、拉晶、切割等一系列过程。

**过程是连接物质的桥梁**。这是本模型与传统产业链图谱（"行业A→行业B"直接相连、没有过程节点）的根本区别。

### 1.2 黄金链式结构

任何有向物质流路径，必须严格遵循：

```
substance ──(input)──→ process ──(output)──→ substance ──(input)──→ process ──(output)──→ ...
```

- **process之间不直接连边**——过程必须通过物质节点串联
- **substance之间不直接连物质转化边**——物质转化必须经过process
- 这不是教条，是遍历算法正确性的基础：没有这个约束就无法可靠计算上游/下游路径，也无法在视觉上正确布局
- composed_of和is_a是非流边（不参与物质流遍历），连接substance到substance，不受此约束

### 1.3 什么可以是节点

**节点 = 具体事物（Concrete Entity）**。判断一个概念是否应该是节点的标准：

1. **它是物理存在的吗？** 摸得着、有质量、占据空间，或者是一个真实发生的物质形态转化事件
2. **它有身份同一性吗？** 经过这个process后，产出物是一个新东西（有新名称、新功能、新形态），而不是同一东西的简单搬运
3. **如果删掉它，产业链上是否会出现无法解释的跳跃？** 例如没有"层压"这个过程，"EVA胶膜"怎么跑到"光伏组件"里去的就说不清楚

**不是节点的东西（坚决不创建）：**
- 行业/产业标签（如"光伏产业""制造业"）——是分类，不是东西
- 文档/标准/方法名称（如"GB/T 9535地面用晶体硅光伏组件设计鉴定和定型"）——是信息，不是物质，存为source引用
- 抽象概念（如"新能源""绿色能源""清洁能源"）——是词，不是物
- 属性/参数（如"高温""150μm""高效率"）——是事物的特征，不是事物本身
- 公司/组织（v1不纳入，v2视需求评估）

### 1.4 v1范围

- 只构建2-3条产业链的核心网络（光伏、锂电池，加一条可选的简单民生链如面粉→面包用于概念验证）
- 节点总数控制在200以内，每条边必须有来源
- **零孤立节点**——每个substance至少是一个process的input或output（或被其他节点composed_of引用）；每个process至少有1个input和1个output；每个equipment至少equipment_for一个process
- 核心网络中的每个节点和边必须达到verified质量；proposed状态允许但必须标记且不能出现在主轴上
- 辅料/外购件按截断规则处理（见3.4节），不展开其上游

---

## 2. 节点类型（node_type）

只有四种，没有其他。

| node_type | 中文名 | 定义 | 典型例子 | 视觉默认 |
|-----------|--------|------|---------|---------|
| `substance` | 物质/物料/产品 | 物理存在的材料、中间品、成品、零部件，有确定化学成分或组成 | 石英砂、工业硅、多晶硅、硅片、电池片、光伏组件、EVA胶膜、银浆、碳酸锂、铜箔、铝箔 | 圆形（原料）→ 圆角矩形（加工品/成品） |
| `process` | 转化过程 | 物质发生化学/物理形态永久改变的加工步骤；必须有input和output | 碳热还原冶炼、CVD还原、直拉单晶、金刚线切片、扩散制结、丝网印刷+烧结、真空层压、注液、化成 | 菱形 |
| `equipment` | 设备 | 参与process但不被消耗的工具/机器/装置 | 电弧炉、单晶炉、切片机、扩散炉、PECVD设备、层压机、串焊机、卷绕机、注液机 | 方形 |
| `facility` | 设施/终端系统 | 多条物质链最终组装成的复杂终端系统，是用户认知中有独立名称的最终产物 | 光伏电站、电动车、储能电站 | 六边形（大） |

**不设置的类型及原因：**
- ~~industry~~：分类标签，不是节点
- ~~material/product区分~~：石英砂是material，光伏组件是product，但它们本质都是substance，只是在链中位置不同；material/product是链视角下的相对角色，不是固有类型
- ~~entity~~：太模糊，无信息量
- ~~document~~：文档不是节点，其信息存为Source

---

## 3. 边类型（edge_type）

只有五种，边类型与连接对象严格绑定，标注者不会混淆。

### 3.1 主轴边（物质流，参与上下游遍历）

| edge_type | 方向约束 | 语义 | 视觉 |
|-----------|---------|------|------|
| `input` | substance → process | 该物质作为原料/辅料/耗材投入此过程，被消耗或转化 | 实线，按链主轴颜色，粗 |
| `output` | process → substance/facility | 该过程产出的物质或设施 | 实线，按链主轴颜色，粗 |

这两种边共同构成物质转化的有向流动网络。沿output方向是下游，沿input反方向是上游。

### 3.2 辅助边（非物质流，弱显示）

| edge_type | 方向约束 | 语义 | 视觉 |
|-----------|---------|------|------|
| `equipment_for` | equipment → process | 该设备用于执行此过程（设备不被消耗） | 细线，灰色 |
| `composed_of` | substance/facility → substance | A静态上由B构成（B在A中仍保持其物质形态，未经过化学变化融入A） | 点虚线，浅灰色，默认折叠 |
| `is_a` | substance → substance | A是B的一种（分类关系） | 不直接绘制，作为筛选/分组条件 |

### 3.3 边类型与节点类型的合法性矩阵

| 源\目标 | substance | process | equipment | facility |
|---------|-----------|---------|-----------|----------|
| **substance** | composed_of / is_a | **input** | ❌ | composed_of |
| **process** | **output** | ❌ | ❌ | **output** |
| **equipment** | ❌ | **equipment_for** | ❌ | ❌ |
| **facility** | composed_of | ❌ | ❌ | is_a |

不符合此矩阵的边是无效边，数据校验时必须报错。

### 3.4 截断规则（避免网络无限扩展）

产业链从自然界延伸到终端产品，理论上可以追溯到矿石、石油、空气。v1必须有明确截断：

**展开上游（创建process节点）的物质：**
- 主链上的关键物质（石英砂→工业硅→多晶硅→硅片→电池片→组件→电站，每个箭头之间都有process）
- 四大主材及其核心前驱体（锂电：正极材料及其前驱体、负极材料、电解液、隔膜）
- 跨多产业链的关键通用金属（铜、铝）——至少追溯到金属锭/金属原材料这一层，确保跨链发现有效

**直接作为外部输入substance（不创建上游process）：**
- 通用化工辅料（硫酸、纯碱、NMP溶剂、氩气、氢气等）
- 通用工业材料（标准件、通用电缆、密封胶）
- 外购电子元器件/系统（BMS、逆变器芯片、接线盒旁路二极管）
- 能源/电力（不是substance，不作为节点）
- 辅料的辅料（EVA的上游乙烯不展开）

**截断标记：** 外部输入substance的定义中注明"外部输入，v1不展开上游"，可视化时用特殊边框样式（如虚线边框）提示用户"这个东西的上游还没画"。

### 3.5 composed_of 与 input 的区分原则

两者不互斥，可以同时存在（同一条BOM物料既通过lay_up过程投入组件，又是组件的组成部分）。区分标准：

- **input必然存在**：只要B里的物质通过某个process进入A，就必须有input边
- **composed_of只在以下情况添加**：B在最终产物A中仍以其原始物质形态可辨识地存在（玻璃仍是玻璃、边框仍是边框）
- **不添加composed_of的情况**：B在过程中发生了化学/形态转化，不再以原始形态存在于A中（银浆烧结后变成电极合金，不再是浆料，不composed_of电池片；EVA交联固化后不再是胶膜，不composed_of组件——但实际行业惯例中EVA仍算组件组成部分，这里按行业惯例保留）

**实操判断：如果你能拿物理工具从A上把B拆下来还认得出是B，就加composed_of。**

### 3.6 过程粒度原则

v1的process粒度遵循：

- **必须拆分为独立process的情况**：
  - 产出了新物质（有新名称、新功能），如多晶硅→单晶硅棒（直拉单晶）
  - 使用了完全不同的核心设备，如烧结（烧结炉）和丝网印刷（印刷机）
  - 是独立的工艺步骤，行业内有公认名称，如"制绒""扩散""层压""注液""化成"

- **合并为一个process的情况**：
  - 纯检测/分选/测试步骤（不改变物质，只判断质量），如IV测试、分容分选——这些不是转化过程，v1省略
  - 连续的清洗/干燥等纯准备步骤，不改变物质化学本质——可简化合并
  - 同一设备内连续完成的多步处理，如"涂布+干燥"是涂布机内连续完成的，合并为"涂布干燥"

- **不无限细分**：
  - 不拆到单个化学反应（那是CAS/Reaxys的尺度，不是产业链尺度）
  - 不拆到企业SOP的工步级别（如"上料""下料""吹扫"不是产业链级过程）

### 3.7 中间产物节点规则

**严格遵循黄金链式结构（见1.2节）**——每个process必须有明确的output substance，即使只是"提纯后的同一物质"也要创建节点。

原因：
1. "粗三氯氢硅"和"高纯三氯氢硅"是不同的东西（前者不能直接进还原炉），混为一个节点会导致遍历错误
2. 视觉上无法体现"物质经过过程发生了变化"
3. 后续扩展属性（纯度、规格）必须挂载在具体状态节点上

**简化例外**：硅片经过制绒、扩散、刻蚀、PECVD镀膜多步处理，但直到烧结完成欧姆接触前，它都还是"硅片"（不具备发电能力）。这些连续处理步骤的output都指向silicon_wafer（制绒后硅片/扩散后硅片...仍是硅片），直到sintering过程output solar_cell（电池片，功能性质变）。这不是违反黄金链——多个process可以连续加工同一个substance节点，只要最终有一个质变点产生新节点即可。判断标准：**功能性质变才创建新节点，物理/化学中间处理不创建。**

---

## 4. 产业链视图（Chain View）

### 4.1 产业链是什么

产业链不是数据中的一种节点类型，而是**对物质转化网络的一种视角（View）**。网络本身是一张无中心的图，产业链是这张图中从起点到终点的一条或一组主要物质流路径。

例如"光伏产业链"是从石英砂（或更上游的硅石矿）出发，经过一系列process，最终到达光伏电站的主路径，以及这条主路径上直接投入的辅料/设备构成的视图。

### 4.2 ChainDef定义

```typescript
interface ChainDef {
  id: string;                    // 'pv_chain'
  name: string;                  // '光伏产业链'
  description: string;
  start_substance_ids: string[]; // 链的起点物质（如石英砂）
  end_facility_id: string;       // 链的终点设施（如光伏电站）
  main_path_through: string[];   // 主链必经的关键节点ID，用于主路径识别
  color: string;                 // 该链的主题色
  is_viewable: boolean;
}
```

产业链不靠"关系类型白名单"定义（旧模型的main_axis_relations/branch_relations思路），而靠**起点-终点-关键路径**定义。主轴是从start到end之间的物质流主路径（BFS沿着input/output边找最短路径或关键路径），支链是主链节点作为input投入的其他process（但这些process的output不在主链继续向下游延伸到end_facility）。

### 4.3 边角色判定（classifyEdgeForChain）

给定一个chain和一个主轴节点集合mainAxisNodeIds（所有在该链主轴路径上的substance/process节点），边的角色：

| 角色 | 判定条件 | 视觉处理 |
|------|---------|---------|
| `main_axis` | 边连接mainAxisNodeIds内的两个节点，且沿主轴方向参与物质流 | 实线、链主题色、粗 |
| `branch` | 边一端在mainAxisNodeIds内，另一端节点的物质流入了主链substance但不在主链继续延伸（如EVA胶膜input到lay_up过程，但EVA自己的上游process不在主链） | 细线、降低透明度 |
| `cross_chain` | 边连接到属于其他产业链primary_chain的substance节点（如光伏链中的铝边框连接到铝，铝同时属于锂电链） | 虚线、特殊颜色（金色），提示"通往其他产业链" |
| `equipment` | equipment_for边，设备节点在mainAxisNodeIds内或关联到主轴process | 细线、灰色 |
| `outside` | 边两端都不在mainAxisNodeIds内 | 不显示 |

### 4.4 主轴布局方向

沿主轴路径的process和substance节点，按物质流方向（start→end）在X轴上排列。process节点和substance节点交替出现（黄金链），Y轴可做同层偏移处理Y形分支（如同一process产出的不同物质）。

### 4.5 跨链节点

跨链节点（cross_chain）的价值在于：它是用户发现"原来这个东西还能用在别的产业里"的入口。

识别条件：一个substance节点参与了两个不同ChainDef的主路径物质流（通过input/output边追溯）。例如：
- **铜**（电解铜）：在光伏链中通过焊带、电缆进入电站；在锂电链中通过铜箔进入电芯
- **铝**（电解铝）：在光伏链中加工为铝边框；在锂电链中加工为铝箔/铝壳
- **石墨/碳材料**：在锂电中是负极核心材料；在光伏中作为热场材料（设备部件）——但v1锂电负极用人造石墨，光伏热场碳材料不展开，交叉性弱

为了让跨链发现有效，关键通用金属（铜、铝）必须向上追溯到共同的原材料节点（铜锭/铝锭），不能直接把"铜箔""焊带""电缆""铝边框""铝箔"都作为外部输入截断——那样这些节点就失去了共同祖先，图遍历无法发现它们都是铜/铝。

### 4.6 节点的primary_chain和chains

- `chains: string[]`：该节点参与哪些产业链的物质流（自动计算，不人工标注）
- `primary_chain?: string`：该节点的"主场"产业链（当节点属于多个链时，它在哪个链中最核心）。这个值影响该节点被其他链引用时的"隐约可见"样式和默认显示名
- primary_chain的自动判断：节点在哪个链的主路径上且离链终点最远（即最"上游"的链），或由人工标注

### 4.7 名称随产业链切换（contextual_names）

同一物质在不同产业链语境下可能有不同常用名，这是产品核心交互（切换产业链后节点名称变化）。例如：
- 光伏链中叫"光伏组件"，在改装房车产业链中可能叫"太阳能板"
- 锂电中叫"铝箔"，在其他语境下可能叫"正极集流体"（但这是专业名不是常用名，v1谨慎添加）

contextual_names字段允许为同一substance在不同chain_id下注册显示名，视觉上切换产业链时平滑更新节点标签。默认显示name字段，当前chain有contextual_name时覆盖显示。

---

## 5. 数据结构定义

### 5.1 Node

```typescript
type NodeType = 'substance' | 'process' | 'equipment' | 'facility';

type NodeStage = 'draft' | 'reviewed';
// 不设'merged'状态——节点不合并，只做is_a关联或aliases别名（v1不做大规模实体对齐）

type VerificationStatus = 'verified' | 'proposed';

interface Source {
  source_type:
    | 'encyclopedia'      // 百科词条（维基/百度百科）
    | 'textbook'           // 教科书/行业手册
    | 'industry_report'    // 券商/咨询公司研报
    | 'patent'             // 专利文献
    | 'standard'           // 国家标准/行业标准
    | 'official_data'      // 统计局/行业协会官方数据
    | 'company_disclosure' // 上市公司年报/招股书
    | 'expert_interview'   // 专家访谈
    | 'ai_suggested'       // AI建议（低置信度来源）
    | 'other';
  description: string;     // 来源描述，如"维基百科：多晶硅词条，2024年版"
  url?: string;
  accessed_at?: string;
}

interface Alias {
  term: string;
  note?: string;
  source?: Source;
}

interface ContextualName {
  term: string;
  chain_id: string;
  note?: string;
  source?: Source;
}

interface NodeAttributes {
  // 物质属性（substance专用，可选填）
  chemical_formula?: string;      // 化学式（如Si, SiO2, LiFePO4）
  purity?: string;                // 纯度规格
  form?: string;                  // 形态（如粉状、棒状、箔材、液态）
  // 过程属性（process专用，可选填）
  typical_temperature?: string;   // 典型温度
  typical_pressure?: string;      // 典型压力
  typical_duration?: string;      // 典型时长
  // 通用
  [key: string]: string | undefined;
}

interface GraphNode {
  id: string;                     // 英文snake_case，如 silica_sand, cvd_reduction
  name: string;                   // 中文标准名，如"石英砂""高纯多晶硅"
  node_type: NodeType;
  definition: string;             // 一句话定义，这个东西是什么
  stage: NodeStage;
  external_input?: boolean;       // 【截断规则】是否为外部输入（v1不展开上游）
  attributes?: NodeAttributes;
  aliases?: Alias[];
  contextual_names?: ContextualName[];
  chains?: string[];              // 自动计算：参与哪些chain
  primary_chain?: string;         // 主场产业链
  sources: Source[];              // 至少1个来源（verified节点必须有）
  created_at: string;
  updated_at: string;
}
```

### 5.2 Edge

```typescript
type EdgeType = 'input' | 'output' | 'equipment_for' | 'composed_of' | 'is_a';

interface GraphEdge {
  id: string;
  source: string;                 // 源节点ID
  target: string;                 // 目标节点ID
  edge_type: EdgeType;
  verification_status: VerificationStatus;
  evidence: Source[];             // 边的来源证据（至少1条）
  note?: string;                  // 备注（如"湿法路线"、"P型电池"）
  created_at: string;
  updated_at: string;
}
```

### 5.3 ChainDef

```typescript
interface ChainDef {
  id: string;
  name: string;
  description: string;
  start_substance_ids: string[];
  end_facility_id: string;
  main_path_through?: string[];   // 主轴必经节点ID（用于BFS路径选择提示）
  color: string;
  is_viewable: boolean;
}
```

### 5.4 GraphData（最终数据文件）

```typescript
interface GraphData {
  version: string;                // 语义化版本，如 '1.0.0'
  published_at: string;
  chains: Record<string, ChainDef>;
  nodes: GraphNode[];
  edges: GraphEdge[];
}
```

---

## 6. 数据生产流程

v1节点量小（目标<200节点），**不需要复杂的自动化pipeline**。采用以下轻量流程：

### 6.1 流程概览

```
1. 骨架构建（手工）
   └─ 确定chain的start→end主路径
   └─ 列出主路径上的substance节点（每步质变点）
   └─ 为每个物质转化步骤创建process节点
   └─ 列出辅料/设备清单

2. 节点数据填充（手工+AI辅助）
   └─ 为每个节点填name/definition/attributes
   └─ 为每个节点查找来源（百科、教材、研报）
   └─ AI可用于：生成definition初稿、推荐别名、列举设备清单
   └─ 人工核验每个节点数据

3. 边数据填充（手工）
   └─ 按黄金链式结构连接substance→process→substance
   └─ 添加equipment_for边
   └─ 添加composed_of边（终端系统的组成部分）
   └─ 每条边必须标注evidence来源

4. 校验（自动化）
   └─ 运行数据校验脚本（见6.2节）
   └─ 修复校验错误

5. 提交审核（人工）
   └─ 整条链review一遍，检查逻辑一致性
   └─ 在可视化中预览，看布局是否合理

6. 发布
   └─ 写入graph-data.json
   └─ 版本号+1
```

### 6.2 自动化校验规则（必须通过）

运行`npm run validate:graph`自动检查：

1. **类型合法性**：所有边必须符合3.3节的类型矩阵，不符合报错
2. **黄金链完整性**：每个process至少有1个input和1个output；主轴上不得出现process→process或substance→substance的流边（composed_of/is_a除外）
3. **无孤立节点**：每个节点至少通过一条边与其他节点相连
4. **无悬空引用**：边的source/target必须指向存在的节点
5. **无自环**：边的source≠target
6. **无重复边**：同一对(source, target, edge_type)不得重复
7. **外部输入标记一致性**：标记为external_input的substance不得有来自其他process的input边（它必须是起点）
8. **facility终点**：ChainDef的end_facility_id必须存在且node_type=facility
9. **无环（可选警告）**：物质流网络应是DAG（有向无环图），沿output方向不应回到已访问节点；composed_of/is_a边不参与无环检测
10. **来源完备性**：verified节点/边必须有至少1个source；proposed可以无source但必须标注proposed
11. **跨链金属追溯**：铜、铝等关键金属如果作为外部输入截断，必须警告——应该追溯到共同原材料节点
12. **命名唯一性**：同一name不得用于两个不同id的节点（避免撞名）

### 6.3 v1为什么不做复杂pipeline

旧spec设计了N1-N7/E1-E5/V1-V5/R/A复杂流水线，目标是处理几万节点、持续爬取、AI审核的场景。v1只有200个以内节点，这些基础设施是过度设计：
- 节点数量少到一个人可以用文本编辑器直接管理
- 没有重复节点问题（人工构建的节点都是先想清楚再加的）
- 没有增量爬取需求（v1数据源是手工查阅的百科/教材/研报，不是爬虫）
- 实体对齐是v2+扩展到多产业链时才需要的事

**当节点量超过500或需要频繁接入新数据源时，再引入自动化pipeline。** 届时新数据模型已经稳定，流水线的设计会更有针对性。

---

## 7. LLM在数据生产中的角色（v1）

LLM不是数据决策者，是高效的**研究助手和候选生成器**：

### 7.1 适合用LLM做的事
- **列举清单**："光伏电池片制绒步骤需要哪些化学试剂？""锂电池隔膜湿法工艺需要哪些设备？"——LLM对行业常识列举准确率高，可作为起点清单，人工核验
- **生成definition初稿**：给LLM一个节点名，让它写一句话定义，人工修改
- **发现可能遗漏的节点**："从石英砂到光伏组件，除了已经列出的XX，还可能需要哪些关键辅料？"
- **别名建议**："这个物质在不同行业有哪些其他叫法？"
- **辅助来源查找**："维基百科/国标中有没有关于XX的词条？"（给出提示词，人工去查）

### 7.2 绝不让LLM直接做的事
- **不直接写入节点或边**：LLM的输出只是候选，必须人工核验后手动加入数据
- **不判断两个物质是否同一物**：同物异名判断由人做，LLM可以建议但不自动合并
- **不决定边类型**：边类型必须由人根据3.1-3.3节规则判断
- **不决定process粒度**：过程拆分粒度由人根据3.6节原则判断

### 7.3 使用纪律
- 任何从LLM获取的信息，必须找到至少一个非LLM来源验证（百科词条、教材内容、研报图表），才能标记为verified
- 如果找不到其他来源验证，最多标为proposed，并在note中注明"LLM建议，待验证"
- 记录LLM模型版本和日期（模型知识更新会改变答案）

---

## 8. 数据访问层（DAL）接口

前端和API通过DAL查询网络数据。所有查询逻辑在DAL层封装，前端不直接遍历原始edges数组。

```typescript
interface GraphDataProvider {
  // 基础查询
  getGraphData(): GraphData;
  getNodeById(id: string): GraphNode | undefined;
  getEdgeById(id: string): GraphEdge | undefined;
  getNodesByType(type: NodeType): GraphNode[];
  
  // 搜索
  searchNodes(query: string, chainId?: string, limit?: number): GraphNode[];
  matchesSearch(node: GraphNode, query: string): boolean;
  
  // 邻居查询（按边类型）
  getInputs(processId: string): GraphNode[];        // process的所有input物质
  getOutputs(processId: string): GraphNode[];      // process的所有output物质
  getProcessesUsing(substanceId: string): {      // 该物质作为input进入哪些process
    process: GraphNode;
    edge: GraphEdge;
  }[];
  getProcessesProducing(substanceId: string): {  // 哪些process产出该物质
    process: GraphNode;
    edge: GraphEdge;
  }[];
  getEquipmentForProcess(processId: string): GraphNode[]; // 该process用哪些设备
  getComponents(substanceId: string): GraphNode[]; // composed_of子组件
  getParentFacility(substanceId: string): GraphNode | undefined;
  
  // 上下游遍历（物质流）
  getUpstreamSubstances(substanceId: string, depth?: number): GraphNode[];  // 沿input反方向
  getDownstreamSubstances(substanceId: string, depth?: number): GraphNode[]; // 沿output方向
  
  // 产业链视图
  getChainDef(chainId: string): ChainDef | undefined;
  getViewableChains(): ChainDef[];
  getNodeChains(nodeId: string): string[];        // 节点参与哪些chain（自动计算）
  getNodePrimaryChain(nodeId: string): string | undefined;
  getMainAxisPath(chainId: string): {            // 获取链主路径（substance和process交替）
    nodes: GraphNode[];   // 按流顺序: substance, process, substance, process...
    edges: GraphEdge[];
  };
  getBranchNodes(mainAxisNodeIds: Set<string>, chainId: string): GraphNode[];
  classifyEdgeForChain(
    edge: GraphEdge, chainId: string, mainAxisNodeIds: Set<string>
  ): 'main_axis' | 'branch' | 'cross_chain' | 'equipment' | 'outside';
  
  // 跨链查询
  getCrossChainNodes(chainId: string): Array<{
    node: GraphNode;
    otherChains: string[];
  }>;
  
  // 名称
  getDisplayName(nodeId: string, chainId?: string): string;
  
  // 校验
  validateData(): ValidationError[];
}

interface ValidationError {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}
```

---

## 9. 视觉设计约束（数据层对渲染层的契约）

数据层为视觉交互提供以下保证，渲染层可以依赖：

1. **黄金链可布局性**：沿任何chain的主路径，substance和process节点严格交替出现（substance→process→substance→process...），布局算法可以直接将它们在X轴上交替排列，不需要额外处理分支类型
2. **物质流方向明确**：input/output边有确定方向，主轴箭头永远从start指向end，不需要猜测
3. **跨链节点可识别**：chains字段长度>1的substance就是跨链节点，可以渲染为特殊样式
4. **外部输入可识别**：external_input=true的节点用虚线边框，提示用户"上游未展开"
5. **设备节点可分离**：equipment_for边连接到主轴process但不是substance，渲染层可以将设备节点放在主轴Y轴下方/上方作为辅助
6. **composed_of默认折叠**：静态组成边默认不显示（避免视觉 clutter），悬停/点击节点时才展开
7. **is_a不直接绘制**：分类边作为筛选/分组条件，不作为可视边
8. **每个节点有可读definition**：悬停/侧栏可以显示一句话定义

---

## 10. 文件结构

```
data/
  graph-data.json              # 唯一的数据源（v1）
  chains/
    pv_chain.json              # 光伏链定义（可选，可直接写在graph-data.json中）
    battery_chain.json         # 锂电链定义
  sources/
    source-mapping.json        # 来源索引（去重用）

scripts/
  validate-graph.ts            # 数据校验脚本（6.2节规则）
  add-node.ts                  # 辅助脚本：交互式添加节点（可选）
  add-edge.ts                  # 辅助脚本：交互式添加边（可选）
  export-plantuml.ts           # 导出PlantUML图（用于review）
  export-stats.ts              # 统计节点/边数、孤立点等

src/lib/
  types.ts                     # 数据类型定义（本文件第5节）
  chains.ts                    # ChainDef内置配置
  graph-data.ts                # JsonDataProvider DAL实现
  graph-validator.ts           # 校验逻辑

.vscode/或scripts/
  graph-snippets/              # 添加节点的代码模板（可选）
```

v1不创建pipeline/、crawler/、review-cli/等复杂目录——YAGNI。

---

## 11. 数据示例：光伏产业链极简骨架

```
石英砂(silica_sand) ──input→ [碳热还原冶炼](smelting) ──output→ 工业硅(metallurgical_silicon)
工业硅 ──input→ [三氯氢硅合成](tcs_synthesis) ──output→ 粗三氯氢硅(crude_trichlorosilane)
粗TCS ──input→ [多级精馏](rectification) ──output→ 高纯三氯氢硅(pure_trichlorosilane)
高纯TCS ──input→ [CVD氢还原](cvd_reduction) ──output→ 高纯多晶硅(polysilicon)
多晶硅 ──input→ [直拉单晶生长](crystal_pulling) ──output→ 单晶硅棒(monocrystalline_ingot)
单晶硅棒 ──input→ [晶棒整形](ingot_preparation) ──output→ 单晶硅方棒(silicon_square_brick)
方棒 ──input→ [金刚线切片](wafer_slicing) ──output→ 硅片(silicon_wafer)
硅片 ──input→ [制绒](texturing) ──output→ 硅片
制绒后硅片 ──input→ [扩散制结](diffusion) ──output→ 硅片
扩散后硅片 ──input→ [后处理](cell_post_process) ──output→ 硅片  [刻蚀+PECVD合并为一个后处理]
硅片 ──input→ [丝网印刷+烧结](screen_print_sintering) ──output→ 光伏电池片(solar_cell)
电池片 ──input→ [串焊](cell_stringing) ──output→ 电池串(cell_string)
电池串 ──input→ [叠层铺设](lay_up) ──output→ 组件叠层件(module_layup)
  └─ 辅料inputs: pv_glass, eva_film, eva_film, backsheet
组件叠层件 ──input→ [真空层压](lamination) ──output→ 层压件(laminated_module)
层压件 ──input→ [装框接线盒](framing_jbox) ──output→ 光伏组件(pv_module)
  └─ 辅料inputs: aluminum_frame, junction_box, sealant
光伏组件 ──input→ [电站安装](power_station_installation) ──output→ 光伏电站(pv_power_station, facility)
  └─ 辅料inputs: mounting_structure, inverter, combiner_box, dc_ac_cable
```

（详细节点/边/设备列表见纸面验证文档，数据写入graph-data.json时补全。）

---

## 12. 与旧模型的差异（供开发参考）

| 方面 | 旧模型（v1 spec） | 新模型（v2 spec） |
|------|------------------|------------------|
| 核心范式 | 实体对齐+产业链视角下的多关系图 | 物质转化网络（substance→process→substance） |
| 节点类型 | material/product/equipment/process/industry/entity（6种） | substance/process/equipment/facility（4种） |
| 边类型 | 10种（upstream_of, raw_material_for...），边界模糊 | 5种（input/output/equipment_for/composed_of/is_a），有严格类型矩阵 |
| 过程节点 | 概念上有但实际无数据（仅2个） | 核心骨架，与substance交替构成主链 |
| industry节点 | 有（97个），引发大量方向错误边 | 不创建 |
| 文档节点 | 被错标为product（222个），产生荒谬边 | 不创建，文档信息作为Source引用 |
| 边方向 | 依赖RELATION_FLOW映射表，方向容易错 | input/output方向天然明确，不会反 |
| 产业链定义 | 靠relation_type白名单（main_axis_relations） | 靠start→end主路径定义 |
| 跨链发现 | 依赖structurally_similar_to边 | 依赖共同上游substance节点（如铜锭、铝锭） |
| 数据生产 | 复杂pipeline（N1-N7/E1-E5/V1-V5/R/A/P） | v1手工+AI辅助+自动校验，<200节点 |
| 数据规模目标 | 处理现有944节点+增量扩展 | v1精选2-3条链<200节点，质量>数量 |
| LLM角色 | 多层接入候选生成+决策门 | 仅作研究助手，不直接写入数据 |
| 孤立节点 | 80%（756/944） | 零容忍（校验规则强制） |
| 黄金链式结构 | 未强调，process间、substance间可直接连边 | 强制约束，process不连process，substance间流边不直连 |

---

## 13. 成功标准（v1）

数据质量目标，上线前必须达到：

1. **节点<200个，零孤立**——每个节点至少连一条边
2. **每条边符合类型矩阵**——校验脚本零error
3. **黄金链完整性**——光伏和锂电主路径上substance/process严格交替，无process→process或substance→substance流边
4. **主轴路径可遍历**——从石英砂沿output方向能走到光伏电站；从锂辉石沿output方向能走到电池包
5. **跨链发现有效**——至少识别出铜、铝两个跨链共用金属节点，且追溯到共同原材料节点（铜/铝原材料节点在两条链的BFS中都能到达）
6. **每个verified节点/边有至少一个来源**——没有无来源的硬数据
7. **proposed边占比<10%**——主轴边100% verified
8. **无方向错误**——沿output方向永远是下游，不存在"组件→（output）→玻璃"这种反物理边
9. **可视化验证**——在Cytoscape/2D视图中布局主链，节点不重叠，流向清晰，支链和跨链节点隐约可见
10. **交互走查通过**——点击光伏组件能展开光伏主轴；点击铝边框能找到铝的共同节点并切换到锂电链视角；名称切换正常

---

## 14. 未来扩展方向（v2+，v1不做）

- 更多产业链（钢铁、化工、食品、建筑、纺织）
- 能源/能耗作为特殊边类型
- 副产物/废弃物/循环经济建模
- BOM定量数据（投入产出比、转化率）
- 公司/组织节点（哪个公司生产什么）
- 工厂节点（facility扩展到具体产地）
- 自动化pipeline（当节点量>500时重新设计）
- 用户反馈系统（节点详情页"反馈问题"按钮）
- Web审核后台（多协作者场景）
- 本地LLM部署（规模化候选生成）
- is_a层级浏览（点击正极材料能看到LFP/NCM/NCA子类）
