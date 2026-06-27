import { create } from 'zustand';
import type { RelationType } from '../lib/types';
import { MAIN_CHAIN_RELATION } from '../lib/dal';

/**
 * 图谱探索页状态（双层架构：3D 星云宏观层 + 2D 微观层）。
 *
 * viewMode：
 *   - 'galaxy'：3D 星云宏观层（默认入口）
 *   - 'detail'：2D 微观层（Cytoscape），聚焦某个节点的关系网
 *
 * 2D 微观层的可见网络由三层共同决定：
 *   1. relationType —— 当前查看的关系类型，决定哪些边参与渲染。
 *   2. selectedNodeId —— 当前选中（聚焦）节点，驱动详情面板与「中心」高亮。
 *   3. expandedNodeIds —— 已被点击展开的直接邻居节点集合（在当前 relationType 下累加）。
 *
 * 切换关系类型时，会重置展开集合为 { selectedNodeId }，从而呈现
 * 「同一节点，切换关系类型看到完全不同的网络」。
 */

export type ViewMode = 'galaxy' | 'detail';

interface GraphState {
  viewMode: ViewMode;
  selectedNodeId: string | null;
  relationType: RelationType;
  expandedNodeIds: Set<string>;

  setViewMode: (mode: ViewMode) => void;
  selectNode: (id: string) => void;
  setRelationType: (rt: RelationType) => void;
  resetView: () => void;
  clearSelection: () => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  viewMode: 'galaxy',
  selectedNodeId: null,
  relationType: MAIN_CHAIN_RELATION,
  expandedNodeIds: new Set<string>(),

  setViewMode: (mode) => set({ viewMode: mode }),

  selectNode: (id) =>
    set((state) => {
      const next = new Set(state.expandedNodeIds);
      next.add(id);
      return { selectedNodeId: id, expandedNodeIds: next };
    }),

  setRelationType: (rt) =>
    set((state) => {
      // 切换关系类型：保留选中节点作为新网络的起点，重置展开集合。
      const next = new Set<string>();
      if (state.selectedNodeId) next.add(state.selectedNodeId);
      return { relationType: rt, expandedNodeIds: next };
    }),

  resetView: () =>
    set({
      selectedNodeId: null,
      relationType: MAIN_CHAIN_RELATION,
      expandedNodeIds: new Set<string>(),
    }),

  clearSelection: () => set({ selectedNodeId: null }),
}));
