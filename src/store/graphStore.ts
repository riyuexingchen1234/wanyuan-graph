import { create } from 'zustand';
import type { GraphNode, GraphEdge } from '../lib/types';

export interface NodePosition {
  x: number;
  y: number;
  z: number;
}

interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  positions: Map<string, NodePosition>;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  focusNodeId: string | null;
  cameraTarget: NodePosition;
  cameraDistance: number;

  setNodes: (nodes: GraphNode[]) => void;
  setEdges: (edges: GraphEdge[]) => void;
  setPositions: (positions: Map<string, NodePosition>) => void;
  setSelectedNodeId: (id: string | null) => void;
  setHoveredNodeId: (id: string | null) => void;
  setFocusNodeId: (id: string | null) => void;
  setCameraTarget: (pos: NodePosition) => void;
  setCameraDistance: (d: number) => void;
  flyToNode: (id: string) => void;
  resetView: () => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  nodes: [],
  edges: [],
  positions: new Map(),
  selectedNodeId: null,
  hoveredNodeId: null,
  focusNodeId: null,
  cameraTarget: { x: 0, y: 0, z: 0 },
  cameraDistance: 20,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setPositions: (positions) => set({ positions }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setHoveredNodeId: (id) => set({ hoveredNodeId: id }),
  setFocusNodeId: (id) => set({ focusNodeId: id }),
  setCameraTarget: (pos) => set({ cameraTarget: pos }),
  setCameraDistance: (d) => set({ cameraDistance: d }),

  flyToNode: (id) => {
    set((state) => {
      const pos = state.positions.get(id);
      if (!pos) return {};
      return {
        focusNodeId: id,
        selectedNodeId: id,
        cameraTarget: pos,
        cameraDistance: 10,
      };
    });
  },

  resetView: () =>
    set({
      cameraTarget: { x: 0, y: 0, z: 0 },
      cameraDistance: 20,
      focusNodeId: null,
      selectedNodeId: null,
    }),
}));
