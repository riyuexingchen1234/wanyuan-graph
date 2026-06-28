export type NodeType = 'substance' | 'process' | 'equipment' | 'facility';

export type NodeStage = 'draft' | 'reviewed';

export type VerificationStatus = 'verified' | 'proposed';

export type EdgeType = 'input' | 'output' | 'equipment_for' | 'composed_of' | 'is_a';

export type SourceType =
  | 'encyclopedia'
  | 'textbook'
  | 'industry_report'
  | 'patent'
  | 'standard'
  | 'official_data'
  | 'company_disclosure'
  | 'expert_interview'
  | 'ai_suggested'
  | 'other';

export interface Source {
  source_type: SourceType;
  description: string;
  url?: string;
  accessed_at?: string;
}

export interface Alias {
  term: string;
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
  chemical_formula?: string;
  purity?: string;
  form?: string;
  typical_temperature?: string;
  typical_pressure?: string;
  typical_duration?: string;
  [key: string]: string | undefined;
}

export interface GraphNode {
  id: string;
  name: string;
  node_type: NodeType;
  definition: string;
  stage: NodeStage;
  external_input?: boolean;
  attributes?: NodeAttributes;
  aliases?: Alias[];
  contextual_names?: ContextualName[];
  chains?: string[];
  primary_chain?: string;
  sources: Source[];
  created_at: string;
  updated_at: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  edge_type: EdgeType;
  verification_status: VerificationStatus;
  evidence: Source[];
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface ChainDef {
  id: string;
  name: string;
  description: string;
  start_substance_ids: string[];
  end_facility_id: string;
  main_path_through?: string[];
  color: string;
  is_viewable: boolean;
}

export interface NodePosition {
  x: number;
  y: number;
  z: number;
  r?: number;
}

export interface GraphData {
  version: string;
  published_at: string;
  chains: Record<string, ChainDef>;
  nodes: GraphNode[];
  edges: GraphEdge[];
  positions?: Record<string, NodePosition>;
}

export type EdgeRole = 'main_axis' | 'branch' | 'cross_chain' | 'equipment' | 'outside';

export interface ValidationError {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface GraphDataProvider {
  getGraphData(): GraphData;
  getNodeById(id: string): GraphNode | undefined;
  getEdgeById(id: string): GraphEdge | undefined;
  getNodesByType(type: NodeType): GraphNode[];

  searchNodes(query: string, chainId?: string, limit?: number): GraphNode[];
  matchesSearch(node: GraphNode, query: string): boolean;

  getInputs(processId: string): GraphNode[];
  getOutputs(processId: string): GraphNode[];
  getProcessesUsing(substanceId: string): { process: GraphNode; edge: GraphEdge }[];
  getProcessesProducing(substanceId: string): { process: GraphNode; edge: GraphEdge }[];
  getEquipmentForProcess(processId: string): GraphNode[];
  getComponents(nodeId: string): GraphNode[];
  getParentFacility(substanceId: string): GraphNode | undefined;

  getUpstreamSubstances(substanceId: string, depth?: number): GraphNode[];
  getDownstreamSubstances(substanceId: string, depth?: number): GraphNode[];

  getChainDef(chainId: string): ChainDef | undefined;
  getViewableChains(): ChainDef[];
  getNodeChains(nodeId: string): string[];
  getNodePrimaryChain(nodeId: string): string | undefined;
  getMainAxisPath(chainId: string): { nodes: GraphNode[]; edges: GraphEdge[] };
  getBranchNodes(mainAxisNodeIds: Set<string>, chainId: string): GraphNode[];
  classifyEdgeForChain(
    edge: GraphEdge,
    chainId: string,
    mainAxisNodeIds: Set<string>
  ): EdgeRole;

  getCrossChainNodes(chainId: string): Array<{ node: GraphNode; otherChains: string[] }>;

  getDisplayName(nodeId: string, chainId?: string): string;

  validateData(): ValidationError[];
}

export const EDGE_TYPE_LABELS: Record<EdgeType, string> = {
  input: '投入',
  output: '产出',
  equipment_for: '使用设备',
  composed_of: '组成',
  is_a: '分类',
};

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  substance: '物质/产品',
  process: '转化过程',
  equipment: '设备',
  facility: '设施/系统',
};

export const NODE_TYPE_COLORS: Record<NodeType, string> = {
  substance: '#3B82F6',
  process: '#10B981',
  equipment: '#F59E0B',
  facility: '#EF4444',
};

export const EDGE_TYPE_LABELS_EXPORT: Record<EdgeType, string> = EDGE_TYPE_LABELS;
