import { create } from 'zustand';
import type { GraphNode, GraphEdge, RelationType } from '../lib/types';
import { computeChainLayout, computeAmbientLayout } from '../lib/graph-layout';

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
  mode: 'ambient' | 'focus';
  relationType: RelationType;

  setNodes: (nodes: GraphNode[]) => void;
  setEdges: (edges: GraphEdge[]) => void;
  setMode: (mode: 'ambient' | 'focus') => void;
  setRelationType: (rt: RelationType) => void;
  setSelectedNodeId: (id: string | null) => void;
  setHoveredNodeId: (id: string | null) => void;
  setCameraTarget: (pos: NodePosition) => void;
  setCameraDistance: (d: number) => void;

  computeLayout: () => void;
  flyToNode: (id: string) => void;
  resetView: () => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  positions: new Map(),
  selectedNodeId: null,
  hoveredNodeId: null,
  focusNodeId: null,
  cameraTarget: { x: 0, y: 0, z: 0 },
  cameraDistance: 30,
  mode: 'ambient',
  relationType: 'raw_material_for' as RelationType,

  setNodes: (nodes) => {
    set({ nodes });
    get().computeLayout();
  },
  setEdges: (edges) => {
    set({ edges });
    get().computeLayout();
  },
  setMode: (mode) => {
    set({ mode });
    get().computeLayout();
  },
  setRelationType: (rt) => {
    set({ relationType: rt });
    get().computeLayout();
  },
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setHoveredNodeId: (id) => set({ hoveredNodeId: id }),
  setCameraTarget: (pos) => set({ cameraTarget: pos }),
  setCameraDistance: (d) => set({ cameraDistance: d }),

  computeLayout: () => {
    const { nodes, edges, mode, focusNodeId, relationType } = get();
    if (nodes.length === 0) {
      set({ positions: new Map() });
      return;
    }

    let positions: Map<string, NodePosition>;

    if (mode === 'focus' && focusNodeId) {
      const centerNode = nodes.find((n) => n.id === focusNodeId);
      if (centerNode) {
        positions = computeChainLayout(centerNode, nodes, edges, relationType, {
          centerX: 0,
          centerY: 0,
          centerZ: 0,
          rankSep: 5,
          nodeSep: 2.5,
        });
      } else {
        positions = computeAmbientLayout(nodes, { radius: 25 });
      }
    } else {
      positions = computeAmbientLayout(nodes, { radius: 25 });
    }

    set({ positions });
  },

  flyToNode: (id) => {
    set({
      focusNodeId: id,
      selectedNodeId: id,
      mode: 'focus',
    });
    get().computeLayout();
    const pos = get().positions.get(id);
    if (pos) {
      set({
        cameraTarget: { ...pos },
        cameraDistance: 15,
      });
    }
  },

  resetView: () =>
    set({
      cameraTarget: { x: 0, y: 0, z: 0 },
      cameraDistance: 30,
      focusNodeId: null,
      selectedNodeId: null,
      mode: 'ambient',
      positions: computeAmbientLayout(get().nodes, { radius: 25 }),
    }),
}));
