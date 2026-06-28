import { create } from 'zustand';
import type { GraphEdge, RelationType, ReviewerRole, ReviewerAction } from '../lib/types';
import { MAIN_CHAIN_RELATION } from '../lib/dal';
import { applyTransition as applyStateMachineTransition } from '../lib/state-machine';

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
 *
 * edges：审核员/状态机操作的边集合。初次进入页面时由 page.tsx 用 provider.getGraphData().edges 灌入。
 *   客户端的 applyEdgeTransition 修改这里的边，不写回 JSON（演示用；生产环境需 API + 数据库）。
 */

export type ViewMode = 'galaxy' | 'detail';

interface GraphState {
  viewMode: ViewMode;
  selectedNodeId: string | null;
  relationType: RelationType;
  expandedNodeIds: Set<string>;
  /** 全部边（含已应用客户端状态变更）。 */
  edges: GraphEdge[];

  setViewMode: (mode: ViewMode) => void;
  selectNode: (id: string) => void;
  setRelationType: (rt: RelationType) => void;
  resetView: () => void;
  clearSelection: () => void;
  setEdges: (edges: GraphEdge[]) => void;
  /**
   * 客户端应用一次状态机转换。失败时返回错误信息（用于 UI 提示）。
   * 不写回 JSON / DB——纯演示用。生产环境应改为 API 调用。
   */
  applyEdgeTransition: (params: {
    edgeId: string;
    to: GraphEdge['verification_status'];
    actor_id: string;
    actor_role: ReviewerRole;
    action: ReviewerAction;
    reason?: string;
  }) => { ok: true } | { ok: false; error: string };
}

export const useGraphStore = create<GraphState>((set) => ({
  viewMode: 'galaxy',
  selectedNodeId: null,
  relationType: MAIN_CHAIN_RELATION,
  expandedNodeIds: new Set<string>(),
  edges: [],

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

  setEdges: (edges) => set({ edges }),

  applyEdgeTransition: (params) => {
    let result: { ok: true } | { ok: false; error: string } = { ok: true };
    set((state) => {
      const idx = state.edges.findIndex((e) => e.id === params.edgeId);
      if (idx === -1) {
        result = { ok: false, error: `未找到边 ${params.edgeId}` };
        return state;
      }
      try {
        const next = applyStateMachineTransition({
          edge: state.edges[idx],
          to: params.to,
          actor_id: params.actor_id,
          actor_role: params.actor_role,
          action: params.action,
          reason: params.reason,
        });
        const newEdges = state.edges.slice();
        newEdges[idx] = next;
        return { edges: newEdges };
      } catch (e) {
        result = { ok: false, error: e instanceof Error ? e.message : String(e) };
        return state;
      }
    });
    return result;
  },
}));
