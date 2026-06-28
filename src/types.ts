export interface Node {
  id: string;
  name: string;
  type: 'material' | 'process' | 'product' | 'demand' | 'entity';
  description: string;
  credibility: 'verified' | 'likely' | 'speculative';
  sources?: string[];
}

export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'supply' | 'demand' | 'material' | 'technology' | 'capital' | 'talent';
  strength: number; // 0-1
  description: string;
  credibility: 'verified' | 'likely' | 'speculative';
  chainId?: string;
}

export interface Chain {
  id: string;
  name: string;
  description: string;
  nodeIds: string[];
  demandType: string;
}

export interface NodePosition {
  x: number;
  y: number;
  z: number;
}

export interface GraphData {
  nodes: Node[];
  relationships: Relationship[];
  chains: Chain[];
}
