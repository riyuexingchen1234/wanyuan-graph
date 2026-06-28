'use client';

import { useEffect, useRef } from 'react';
import cytoscape, { NodeDefinition, EdgeDefinition, Core } from 'cytoscape';
import cytoscapeDagre from 'cytoscape-dagre';
import type { GraphNode, GraphEdge, RelationType, VerificationStatus } from '../lib/types';
import {
  CYTOSCAPE_CONFIG,
  CYTOSCAPE_STYLESHEET,
  DAGRE_LAYOUT,
  getNodeColor,
  isCrossIndustryEdge,
} from '../lib/cytoscape-config';

let dagreRegistered = false;
function registerDagre() {
  if (dagreRegistered || typeof window === 'undefined') return;
  try {
    cytoscape.use(cytoscapeDagre as unknown as cytoscape.Ext);
    dagreRegistered = true;
  } catch (e) {
    console.warn('cytoscape-dagre 注册失败', e);
  }
}
registerDagre();

export interface EdgeHoverInfo {
  relationType: RelationType;
  verificationStatus: VerificationStatus;
  reasoning: string;
  note: string;
  sourceName: string;
  targetName: string;
  x: number;
  y: number;
}

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  onNodeSelect: (id: string) => void;
  onEdgeHover: (info: EdgeHoverInfo | null) => void;
}

export default function GraphCanvas({
  nodes,
  edges,
  selectedNodeId,
  onNodeSelect,
  onEdgeHover,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const isMountedRef = useRef(false);

  // 用 ref 保存最新回调，避免每次渲染重新绑定 cytoscape 事件。
  const onSelectRef = useRef(onNodeSelect);
  const onHoverRef = useRef(onEdgeHover);
  useEffect(() => {
    onSelectRef.current = onNodeSelect;
  }, [onNodeSelect]);
  useEffect(() => {
    onHoverRef.current = onEdgeHover;
  }, [onEdgeHover]);

  // 创建 Cytoscape 实例（仅一次）
  useEffect(() => {
    if (!containerRef.current) return;
    registerDagre();

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: CYTOSCAPE_STYLESHEET as unknown as cytoscape.StylesheetStyle[],
      layout: { name: 'grid' },
      ...CYTOSCAPE_CONFIG,
    });
    cyRef.current = cy;
    isMountedRef.current = true;

    cy.on('tap', 'node', (event) => {
      if (!isMountedRef.current) return;
      const id = event.target.data('id') as string;
      onSelectRef.current(id);
    });

    const emitHover = (event: cytoscape.EventObject, hide = false) => {
      if (!isMountedRef.current) return;
      if (hide) {
        onHoverRef.current(null);
        return;
      }
      const edge = event.target;
      const cy = cyRef.current;
      if (!cy) return;
      const sourceName = cy.getElementById(edge.data('source')).data('name') as string;
      const targetName = cy.getElementById(edge.data('target')).data('name') as string;
      const pos = event.renderedPosition;
      onHoverRef.current({
        relationType: edge.data('relation_type') as RelationType,
        verificationStatus: edge.data('verification_status') as VerificationStatus,
        reasoning: (edge.data('reasoning') as string) || '',
        note: (edge.data('note') as string) || '',
        sourceName,
        targetName,
        x: pos.x,
        y: pos.y,
      });
    };

    cy.on('mouseover', 'edge', (e) => emitHover(e));
    cy.on('mousemove', 'edge', (e) => emitHover(e));
    cy.on('mouseout', 'edge', () => emitHover({} as cytoscape.EventObject, true));

    cy.on('tap', (event) => {
      if (!isMountedRef.current) return;
      if (event.target === cy) {
        cy.elements().deselect();
        onHoverRef.current(null);
      }
    });

    return () => {
      isMountedRef.current = false;
      try {
        cy.stop(true, true);
        cy.removeAllListeners();
        cy.destroy();
      } catch {
        // ignore
      }
      cyRef.current = null;
    };
  }, []);

  // 增量同步元素（节点 / 边），结构变化时重排布局
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !isMountedRef.current) return;

    const desiredNodeIds = new Set(nodes.map((n) => n.id));
    const desiredEdgeIds = new Set(edges.map((e) => e.id));
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    let removed = false;
    cy.nodes().forEach((n) => {
      // halo 节点由选中态 effect 管理，不参与 diff 同步
      if (n.data('isHalo')) return;
      if (!desiredNodeIds.has(n.id())) {
        cy.remove(n);
        removed = true;
      }
    });
    cy.edges().forEach((e) => {
      if (!desiredEdgeIds.has(e.id())) {
        cy.remove(e);
        removed = true;
      }
    });

    const existingNodeIds = new Set(cy.nodes().map((n) => n.id()));
    let added = false;
    const cyNodes: NodeDefinition[] = [];
    for (const node of nodes) {
      if (existingNodeIds.has(node.id)) continue;
      added = true;
      const color = getNodeColor(node.node_type);
      cyNodes.push({
        group: 'nodes',
        data: {
          id: node.id,
          name: node.name,
          node_type: node.node_type,
          color,
          borderColor: color,
          definition: node.definition,
          is_center: node.id === selectedNodeId,
        },
        classes: node.id === selectedNodeId ? 'center' : '',
      });
    }
    if (cyNodes.length) cy.add(cyNodes);

    const existingEdgeIds = new Set(cy.edges().map((e) => e.id()));
    const cyEdges: EdgeDefinition[] = [];
    for (const edge of edges) {
      if (existingEdgeIds.has(edge.id)) continue;
      added = true;
      // 跨产业判定：被行业分类切断的连接是核心理念的价值载体
      const srcNode = nodeMap.get(edge.source);
      const tgtNode = nodeMap.get(edge.target);
      const isCross = srcNode && tgtNode ? isCrossIndustryEdge(srcNode, tgtNode) : false;
      cyEdges.push({
        group: 'edges',
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          relation_type: edge.relation_type,
          verification_status: edge.verification_status,
          reasoning: edge.proposed_by?.reasoning ?? '',
          note: edge.note ?? '',
          cross_industry: isCross,
        },
        classes: `${edge.verification_status}${isCross ? ' cross-industry' : ''}`,
      });
    }
    if (cyEdges.length) cy.add(cyEdges);

    // 元素增删后重新布局；仅选中态变化不在此处理。
    if (added || removed) {
      const layoutOpts = dagreRegistered
        ? (DAGRE_LAYOUT as unknown as cytoscape.LayoutOptions)
        : ({ name: 'grid' } as cytoscape.LayoutOptions);
      cy.layout(layoutOpts).run();
      cy.fit(undefined, 60);
      // 布局后重置中心节点和 halo 位置
      if (selectedNodeId) {
        const sel = cy.getElementById(selectedNodeId);
        const halo = cy.getElementById(`__halo_${selectedNodeId}`);
        if (sel.length && halo.length) {
          const pos = sel.position();
          halo.position(pos);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  // 选中态变化：仅切换 class，不重排布局
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !isMountedRef.current) return;
    cy.nodes().removeClass('center');
    cy.nodes().removeClass('center-halo');
    cy.$(':selected').unselect();
    if (selectedNodeId) {
      const sel = cy.getElementById(selectedNodeId);
      if (sel && sel.length) {
        sel.addClass('center');
        sel.select();
        // 同步位置添加 halo 节点
        const pos = sel.position();
        const haloId = `__halo_${selectedNodeId}`;
        const existingHalo = cy.getElementById(haloId);
        if (existingHalo.length) {
          existingHalo.position(pos);
        } else {
          cy.add({
            group: 'nodes',
            data: { id: haloId, name: '', isHalo: true },
            position: { x: pos.x, y: pos.y },
            classes: 'center-halo',
            grabbable: false,
            pannable: true,
            selectable: false,
          });
        }
      }
    }
    // 清理其他 halo
    cy.nodes('[?isHalo]').forEach((h) => {
      if (!selectedNodeId || h.id() !== `__halo_${selectedNodeId}`) {
        cy.remove(h);
      }
    });
  }, [selectedNodeId]);

  // 脉冲动画：toggle halo 节点的 border-opacity 实现呼吸效果
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !selectedNodeId) return;
    const haloId = `__halo_${selectedNodeId}`;
    let toggle = false;
    const id = setInterval(() => {
      const halo = cy.getElementById(haloId);
      if (!halo || !halo.length) return;
      toggle = !toggle;
      halo.style('border-opacity', toggle ? 0.55 : 0.15);
      halo.style('width', toggle ? 60 : 52);
      halo.style('height', toggle ? 60 : 52);
    }, 700);
    return () => clearInterval(id);
  }, [selectedNodeId]);

  // 销毁时清理所有 halo 节点
  useEffect(() => {
    return () => {
      const cy = cyRef.current;
      if (!cy) return;
      cy.nodes('[?isHalo]').remove();
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-surface-1">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
