import { create } from 'zustand';
import { GraphData } from './types';

export type CameraMode = 'orbit' | 'flying' | 'focused';

interface GraphState {
  data: GraphData | null;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  isDragging: boolean;
  cameraMode: CameraMode;

  setData: (data: GraphData) => void;
  selectNode: (nodeId: string | null) => void;
  setHoveredNode: (nodeId: string | null) => void;
  setDragging: (dragging: boolean) => void;
  setCameraMode: (mode: CameraMode) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  data: null,
  selectedNodeId: null,
  hoveredNodeId: null,
  isDragging: false,
  cameraMode: 'orbit',

  setData: (data) => set({ data }),

  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId });
    if (nodeId) {
      set({ cameraMode: 'flying' });
    } else {
      set({ cameraMode: 'orbit' });
    }
  },

  setHoveredNode: (nodeId) => set({ hoveredNodeId: nodeId }),
  setDragging: (dragging) => set({ isDragging: dragging }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
}));
