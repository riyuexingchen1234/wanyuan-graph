export type NodeType = 'material' | 'process' | 'equipment' | 'product' | 'industry' | 'entity';

export type NodeStage = 'draft' | 'reviewed' | 'merged';

export type VerificationStatus = 'verified' | 'proposed';

export type SourceType =
  | 'patent'
  | 'standard'
  | 'stats_gov'
  | 'industry_report'
  | 'news'
  | 'expert_interview'
  | 'official_data'
  | 'encyclopedia'
  | 'cninfo'
  | 'ai_suggested'
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
  | 'is_subclass_of';

export type RelationFlow = 'upstream_to_downstream' | 'downstream_to_upstream' | 'horizontal';

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
  source?: Source;
}

export interface ContextualName {
  term: string;
  chain_id: string;
  note?: string;
  source?: Source;
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
  contextual_names?: ContextualName[];
  chains?: string[];
  primary_chain?: string;
  merged_from?: string[];
  merged_into?: string;
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

export interface ChainRelation {
  type: RelationType;
  flow?: RelationFlow;
}

export interface ChainDef {
  id: string;
  name: string;
  description: string;
  main_axis_relations: (RelationType | ChainRelation)[];
  branch_relations: (RelationType | ChainRelation)[];
  primary_axis?: 'x' | 'y' | 'z';
  root_node_id?: string;
  branch_depth?: number;
  is_viewable?: boolean;
}

export interface EdgeRole {
  role: 'main_axis' | 'branch' | 'cross_chain' | 'outside';
  direction: 'upstream' | 'downstream' | 'lateral';
  upstreamNode: string;
  downstreamNode: string;
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
  searchNodes(query: string, chainId?: string, limit?: number): GraphNode[];
  matchesSearch(node: GraphNode, query: string): boolean;
  getNodeChildren(parentId: string): GraphNode[];
  getNodeParent(childId: string): GraphNode | undefined;
  getNodeNeighbors(nodeId: string, relationType?: RelationType): GraphNode[];
  getDisplayName(nodeId: string, chainId?: string): string;
  getNodeAliases(nodeId: string): Alias[];
  resolveNodeId(id: string): string;
  getChainDef(chainId: string): ChainDef | undefined;
  getViewableChains(): ChainDef[];
  getNodeChains(nodeId: string): string[];
  getNodePrimaryChain(nodeId: string): string | undefined;
  getMainAxisNodes(centerNodeId: string, chainId: string): {
    upstream: GraphNode[][];
    center: GraphNode;
    downstream: GraphNode[][];
  };
  getBranchNodes(mainAxisNodeIds: Set<string>, chainId: string): GraphNode[];
  classifyEdgeForChain(edge: GraphEdge, chainId: string, mainAxisNodeIds: Set<string>): EdgeRole;
  getEffectiveFlow(edge: GraphEdge, chainId?: string): RelationFlow;
  getNodeNeighborsByFlow(nodeId: string, chainId?: string): {
    upstream: GraphNode[];
    downstream: GraphNode[];
    horizontal: GraphNode[];
  };
  getChainView(nodeId: string, relationType: RelationType, depth: number): ChainView | undefined;
  getNodeChainSummary(nodeId: string): NodeChainSummary | undefined;
}
