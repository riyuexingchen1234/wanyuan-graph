import { create } from 'zustand';
import type { GraphNode, GraphEdge, RelationType } from '../lib/types';
import { computeFocusLayout, computeAmbientLayout } from '../lib/graph-layout';

export interface NodePosition {
  x: number;
  y: number;
  z: number;
}

interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  positions: Map<string, NodePosition>;
  depths: Map<string, number>;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  focusNodeId: string | null;
  cameraTarget: NodePosition;
  cameraDistance: number;
  mode: 'ambient' | 'focus';
  relationType: RelationType;
  navigationPath: string[];
  browseHistory: string[];

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
  navigateToNode: (id: string) => void;
  navigateBack: (index: number) => void;
  clearBrowseHistory: () => void;
  initBrowseHistory: () => void;
  resetView: () => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  positions: new Map(),
  depths: new Map(),
  selectedNodeId: null,
  hoveredNodeId: null,
  focusNodeId: null,
  cameraTarget: { x: 0, y: 0, z: 0 },
  cameraDistance: 30,
  mode: 'ambient',
  relationType: 'raw_material_for' as RelationType,
  navigationPath: [],
  browseHistory: [],

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
    const { nodes, edges, mode, focusNodeId } = get();
    if (nodes.length === 0) {
      set({ positions: new Map(), depths: new Map() });
      return;
    }

    let result;

    if (mode === 'focus' && focusNodeId) {
      const centerNode = nodes.find((n) => n.id === focusNodeId);
      if (centerNode) {
        result = computeFocusLayout(centerNode, nodes, edges, {
          centerX: 0,
          centerY: 0,
          centerZ: 0,
          rankSep: 5,
          nodeSep: 2.5,
          layerSep: 4,
        });
      } else {
        result = computeAmbientLayout(nodes, { radius: 25 });
      }
    } else {
      result = computeAmbientLayout(nodes, { radius: 25 });
    }

    set({ positions: result.positions, depths: result.depths });
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

  navigateToNode: (id) => {
    const { navigationPath, flyToNode, browseHistory } = get();
    const lastIndex = navigationPath.lastIndexOf(id);
    if (lastIndex !== -1) {
      set({ navigationPath: navigationPath.slice(0, lastIndex + 1) });
    } else {
      set({ navigationPath: [...navigationPath, id] });
    }
    const filteredHistory = browseHistory.filter((h) => h !== id);
    const updatedHistory = [id, ...filteredHistory].slice(0, 20);
    set({ browseHistory: updatedHistory });
    try {
      localStorage.setItem('browse-history', JSON.stringify(updatedHistory));
    } catch (e) {
      console.error('Failed to save browse history', e);
    }
    flyToNode(id);
  },

  navigateBack: (index) => {
    const { navigationPath, flyToNode } = get();
    if (index < 0 || index >= navigationPath.length) return;
    const targetId = navigationPath[index];
    set({ navigationPath: navigationPath.slice(0, index + 1) });
    flyToNode(targetId);
  },

  clearBrowseHistory: () => {
    set({ browseHistory: [] });
    try {
      localStorage.removeItem('browse-history');
    } catch (e) {
      console.error('Failed to clear browse history', e);
    }
  },

  initBrowseHistory: () => {
    try {
      const saved = localStorage.getItem('browse-history');
      if (saved) {
        set({ browseHistory: JSON.parse(saved) });
      }
    } catch (e) {
      console.error('Failed to load browse history', e);
    }
  },

  resetView: () => {
    const result = computeAmbientLayout(get().nodes, { radius: 25 });
    set({
      cameraTarget: { x: 0, y: 0, z: 0 },
      cameraDistance: 30,
      focusNodeId: null,
      selectedNodeId: null,
      mode: 'ambient',
      navigationPath: [],
      positions: result.positions,
      depths: result.depths,
    });
  },
}));
