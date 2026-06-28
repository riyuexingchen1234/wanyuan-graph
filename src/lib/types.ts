export type NodeType = 'material' | 'process' | 'equipment' | 'product' | 'industry' | 'entity' | 'demand';

export type NodeStage = 'draft' | 'reviewed';

/**
 * 【v0.4】6 档可信度状态机。v0.3 旧值映射：verified→verified-expert，proposed→proposed。
 */
export type VerificationStatus =
  | 'auto-extracted'
  | 'proposed'
  | 'disputed'
  | 'deprecated'
  | 'verified-community'
  | 'verified-expert';

/**
 * 【v0.4】关系大类（8 类生产关系，抽象自 DB33/T 1322—2023 浙江省产业链图谱构建指南）。
 */
export type RelationCategory =
  | 'production_raw_material'
  | 'production_component'
  | 'auxiliary_material'
  | 'production_equipment'
  | 'auxiliary_equipment'
  | 'production_process'
  | 'technical_service'
  | 'product_business';

/**
 * 【v0.4】质疑裁决结果。
 */
export type DisputeResolution = 'pending' | 'upheld' | 'rejected';

/**
 * 【v0.4】审核人角色。
 */
export type ReviewerRole = 'community' | 'expert' | 'admin';

/**
 * 【v0.4】审核动作。
 */
export type ReviewerAction = 'approved' | 'downgraded' | 'disputed' | 'restored';

/**
 * 【v0.4】质疑类型。
 */
export type ChallengeType =
  | 'evidence_unavailable'
  | 'source_misquote'
  | 'factual_error'
  | 'definition_drift'
  | 'other'
  | string; // 业务可扩展新值

export type SourceType =
  | 'patent'
  | 'standard'
  | 'industry_report'
  | 'news'
  | 'expert_interview'
  | 'official_data'
  | 'encyclopedia'
  | 'other';

export type RelationType =
  | 'upstream_of'
  | 'downstream_of'
  | 'raw_material_for'
  | 'equipment_for'
  | 'consumable_for'
  | 'can_be_processed_into'
  | 'applied_in'
  | 'structurally_similar_to'
  | 'made_of'
  | 'satisfies'
  | 'derived_from'
  | 'references';

export type ProposedByMethod =
  | 'expert_submission'
  | 'user_submission'
  | 'ai_pattern_match'
  | 'editorial_research'
  | 'auto_crawler'; // v0.4 新增，用于 auto-extracted 状态的来源

export interface Source {
  source_type: SourceType;
  description: string;
  url?: string;
  retrieved_at?: string;
}

export interface Alias {
  term: string;
  context?: string;
  note?: string;
}

export interface NodeAttributes {
  physical?: Record<string, string>;
  chemical?: Record<string, string>;
  process_capability?: Record<string, string>;
  cost_tier?: string;
}

export interface ProposedBy {
  method: ProposedByMethod;
  reasoning: string;
  proposed_at: string;
}

/**
 * 【v0.4新增】质疑历史条目。
 */
export interface DisputeRecord {
  dispute_id: string;
  challenger_id: string;
  challenge_type: ChallengeType;
  challenge_text: string;
  filed_at: string;
  resolution: DisputeResolution;
  resolved_by?: string | null;
  resolved_at?: string | null;
}

/**
 * 【v0.4新增】多级审核轨迹条目。
 */
export interface ReviewerChainEntry {
  reviewer_id: string;
  reviewer_role: ReviewerRole;
  action: ReviewerAction;
  from_status: VerificationStatus;
  to_status: VerificationStatus;
  reviewed_at: string;
  note?: string;
}

/**
 * 【v0.4新增】状态转换记录，与 reviewer_chain 配套。
 */
export interface TransitionRecord {
  from: VerificationStatus;
  to: VerificationStatus;
  at: string;
  actor_id?: string;
  reason?: string;
}

export interface GraphNode {
  id: string;
  name: string;
  definition: string;
  node_type: NodeType;
  stage: NodeStage;
  parent_type: string | null;
  canonical_id?: string | null;
  aliases?: Alias[];
  attributes?: NodeAttributes;
  description?: string;
  sources?: Source[];
  created_at: string;
  updated_at: string;
  /** 【v0.4新增】节点本体的可信度（与 Edge 同 6 档状态机） */
  verification_status?: VerificationStatus;
  /** 【v0.4新增】节点本体最近一次被审核的时间，null 表示从未被审核 */
  last_verified_at?: string | null;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation_type: RelationType;
  /** 【v0.4新增】关系大类（8 类生产关系）。v0.3 旧数据迁移时允许 undefined，由迁移脚本补全 */
  relation_category?: RelationCategory;
  verification_status: VerificationStatus;
  evidence?: Source[];
  proposed_by?: ProposedBy;
  note?: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  /** 【v0.4新增】多级审核轨迹 */
  reviewer_chain?: ReviewerChainEntry[];
  /** 【v0.4新增】质疑历史 */
  dispute_history?: DisputeRecord[];
  /** 【v0.4新增】状态转换序列 */
  transitions?: TransitionRecord[];
  created_at: string;
  updated_at: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ChainView {
  center_node: GraphNode;
  relation_type: RelationType;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface NodeChainSummary {
  node_id: string;
  chains: Array<{
    relation_type: RelationType;
    upstream_count: number;
    downstream_count: number;
  }>;
}

export interface GraphDataProvider {
  getGraphData(): GraphData;
  getNodeById(id: string): GraphNode | undefined;
  searchNodes(query: string): GraphNode[];
  getNodeChildren(parentId: string): GraphNode[];
  getNodeParent(childId: string): GraphNode | undefined;
  getNodeNeighbors(nodeId: string, relationType?: RelationType): GraphNode[];
  getChainView(nodeId: string, relationType: RelationType, depth: number): ChainView | undefined;
  getNodeChainSummary(nodeId: string): NodeChainSummary | undefined;
}
