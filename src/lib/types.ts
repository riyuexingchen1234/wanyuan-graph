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

export interface Source {
  source_type: 'patent' | 'standard' | 'industry_report' | 'news' | 'expert_interview' | 'official_data' | 'other';
  description: string;
  url?: string;
  retrieved_at?: string;
}

export interface ProposedBy {
  method: 'expert_submission' | 'user_submission' | 'ai_pattern_match' | 'editorial_research';
  reasoning: string;
  proposed_at: string;
}

export interface GraphNode {
  id: string;
  name: string;
  node_type: 'material' | 'process' | 'equipment' | 'product' | 'industry';
  coordinate_systems: ('A' | 'B')[];
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
  relation_type: 'upstream_of' | 'downstream_of' | 'can_be_processed_into' | 'applied_in' | 'structurally_similar_to' | 'made_of';
  verification_status: 'verified' | 'proposed';
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

export interface NeighborNode {
  node: GraphNode;
  edge: GraphEdge;
}

export interface NodeWithNeighbors {
  node: GraphNode;
  upstream: NeighborNode[];
  downstream: NeighborNode[];
  related: NeighborNode[];
  edges: GraphEdge[];
}