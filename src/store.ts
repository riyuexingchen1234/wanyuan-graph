import { create } from 'zustand';
import { Relationship, NodePosition, GraphData } from './types';

interface GraphState {
  data: GraphData | null;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  nodePositions: Map<string, NodePosition>;
  cameraTarget: { position: [number, number, number]; lookAt: [number, number, number] } | null;
  
  setData: (data: GraphData) => void;
  selectNode: (nodeId: string | null) => void;
  setHoveredNode: (nodeId: string | null) => void;
  setNodePositions: (positions: Map<string, NodePosition>) => void;
  setCameraTarget: (target: { position: [number, number, number]; lookAt: [number, number, number] } | null) => void;
  
  getConnectedNodes: (nodeId: string) => { upstream: string[]; downstream: string[]; crossChain: string[] };
  getNodeRelationships: (nodeId: string) => Relationship[];
}

export const useGraphStore = create<GraphState>((set, get) => ({
  data: null,
  selectedNodeId: null,
  hoveredNodeId: null,
  nodePositions: new Map(),
  cameraTarget: null,
  
  setData: (data) => set({ data }),
  
  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  
  setHoveredNode: (nodeId) => set({ hoveredNodeId: nodeId }),
  
  setNodePositions: (positions) => set({ nodePositions: positions }),
  
  setCameraTarget: (target) => set({ cameraTarget: target }),
  
  getConnectedNodes: (nodeId) => {
    const state = get();
    if (!state.data) return { upstream: [], downstream: [], crossChain: [] };
    
    const upstream: string[] = [];
    const downstream: string[] = [];
    const crossChain: string[] = [];
    
    // 找出当前节点所在的主产业链
    const mainChains = state.data.chains.filter(chain => chain.nodeIds.includes(nodeId));
    const mainChainNodeIds = new Set(mainChains.flatMap(chain => chain.nodeIds));
    
    state.data.relationships.forEach(rel => {
      if (rel.sourceId === nodeId) {
        downstream.push(rel.targetId);
        // 检查是否是跨产业链连接
        if (!mainChainNodeIds.has(rel.targetId)) {
          crossChain.push(rel.targetId);
        }
      }
      if (rel.targetId === nodeId) {
        upstream.push(rel.sourceId);
        if (!mainChainNodeIds.has(rel.sourceId)) {
          crossChain.push(rel.sourceId);
        }
      }
    });
    
    return { upstream, downstream, crossChain };
  },
  
  getNodeRelationships: (nodeId) => {
    const state = get();
    if (!state.data) return [];
    return state.data.relationships.filter(
      rel => rel.sourceId === nodeId || rel.targetId === nodeId
    );
  }
}));
