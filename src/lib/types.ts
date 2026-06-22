// 万源图谱 - TypeScript 类型定义
// 字段名和含义严格对齐根目录 schema.json，不得自行简化或更改。

/** 坐标系：A=产业链关系网，B=材料属性延伸网 */
export type CoordinateSystem = "A" | "B";

/** 节点本体类型 */
export type NodeType = "material" | "process" | "equipment" | "product" | "industry";

/** 边的连接类型 */
export type RelationType =
  | "upstream_of"
  | "downstream_of"
  | "can_be_processed_into"
  | "applied_in"
  | "structurally_similar_to"
  | "made_of";

/** 边的可信度状态：verified=已验证，proposed=待验证 */
export type VerificationStatus = "verified" | "proposed";

/** 来源类型 */
export type SourceType =
  | "patent"
  | "standard"
  | "industry_report"
  | "news"
  | "expert_interview"
  | "official_data"
  | "other";

/** 假设提出途径 */
export type ProposedMethod =
  | "expert_submission"
  | "user_submission"
  | "ai_pattern_match"
  | "editorial_research";

/** 行话/俗名映射层：同一事物在不同行业、不同地区的别称 */
export interface Alias {
  term: string;
  context?: string;
  note?: string;
}

/** 客观属性层：不依赖应用场景的固有特性 */
export interface NodeAttributes {
  physical?: Record<string, string>;
  chemical?: Record<string, string>;
  process_capability?: Record<string, string>;
  cost_tier?: string;
}

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
  node_type: NodeType;
  coordinate_systems: CoordinateSystem[];
  aliases?: Alias[];
  attributes?: NodeAttributes;
  description?: string;
  sources?: Source[];
  created_at: string;
  updated_at: string;
}

/** 仅 proposed 状态适用：记录该假设的提出方式 */
export interface ProposedBy {
  method: ProposedMethod;
  reasoning?: string;
  proposed_at?: string;
}

/** 图谱连接 */
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

/** 节点详情 + 直接关联的邻居节点 */
export interface NodeWithNeighbors {
  node: GraphNode;
  upstream: GraphNode[];
  downstream: GraphNode[];
  related: GraphNode[];
  edges: GraphEdge[];
}
