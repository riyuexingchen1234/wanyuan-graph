export type NodeType = 'material' | 'process' | 'equipment' | 'product' | 'industry' | 'entity';

export type NodeStage = 'draft' | 'reviewed';

export type VerificationStatus = 'verified' | 'proposed';

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
  | 'made_of';

export type ProposedByMethod =
  | 'expert_submission'
  | 'user_submission'
  | 'ai_pattern_match'
  | 'editorial_research';

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

export interface GraphNode {
  id: string;
  name: string;
  definition: string;
  node_type: NodeType;
  stage: NodeStage;
  parent_type: string | null;
  aliases?: Alias[];
  attributes?: NodeAttributes;
  description?: string;
  sources?: Source[];
  created_at: string;
  updated_at: string;
}

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
