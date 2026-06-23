'use client';

import { useEffect, useRef } from 'react';
import cytoscape, { NodeDefinition, EdgeDefinition } from 'cytoscape';
import dagre from 'dagre';
import cytoscapeDagre from 'cytoscape-dagre';
import type { ChainView } from '../lib/types';
import {
  getNodeStyle,
  getEdgeStyle,
  getNodeColor,
  DAGRE_LAYOUT,
  BFS_LAYOUT,
  CYTOSCAPE_CONFIG,
} from '../lib/cytoscape-config';

// 注册 dagre 扩展（仅一次，仅在客户端）
let useDagre = true;
if (typeof window !== 'undefined') {
  try {
    cytoscape.use(cytoscapeDagre as unknown as cytoscape.Ext);
  } catch (e) {
    useDagre = false;
    console.warn('dagre 注册失败，降级为 breadthfirst 布局', e);
  }
}

interface GraphCanvasProps {
  chainView: ChainView | null;
  onNodeSelect: (id: string) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export default function GraphCanvas({
  chainView,
  onNodeSelect,
  loading,
  error,
  onRetry,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    if (!chainView || chainView.nodes.length === 0) return;
    if (!containerRef.current) return;

    isMountedRef.current = true;

    // 清理旧实例
    if (cyRef.current) {
      try {
        cyRef.current.stop(true, true);
        cyRef.current.removeAllListeners();
        cyRef.current.destroy();
      } catch {
        // 忽略
      }
      cyRef.current = null;
    }

    const centerId = chainView.center_node.id;
    const crossIndustryIds = new Set(
      chainView.cross_industry_nodes.map((n) => n.id)
    );
    const chainTypes = [chainView.chain_type];

    // 构建节点
    const cyNodes: NodeDefinition[] = chainView.nodes.map((node) => {
      const isCenter = node.id === centerId;
      const isCrossIndustry = crossIndustryIds.has(node.id);
      return {
        group: 'nodes',
        data: {
          id: node.id,
          label: node.name,
          nodeType: node.type,
          color: getNodeColor(node.type),
          isCenter,
          isCrossIndustry,
          description: node.description || '',
        },
        style: getNodeStyle(node.type, isCenter, isCrossIndustry),
      };
    });

    // 构建边
    const cyEdges: EdgeDefinition[] = chainView.edges.map((edge) => ({
      group: 'edges',
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        relation_type: edge.relation_type,
        verification_status: edge.verification_status,
        evidence: edge.evidence || '',
      },
      style: getEdgeStyle(
        edge.relation_type,
        edge.verification_status,
        chainTypes
      ),
    }));

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...cyNodes, ...cyEdges],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            'background-opacity': 1,
            'overlay-color': 'data(color)',
            'overlay-opacity': 0.35,
            'shadow-blur': 20,
            'label': 'data(label)',
          },
        },
        {
          selector: 'node[isCenter="true"]',
          style: {
            'overlay-opacity': 0.5,
            'shadow-blur': 30,
            'font-weight': 700,
            'font-size': 14,
          },
        },
        {
          selector: 'node[isCrossIndustry="true"]',
          style: {
            'border-width': 4,
            'border-style': 'double',
            'border-color': '#FFFFFF',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'overlay-opacity': 0.6,
          },
        },
        {
          selector: 'node:hover',
          style: {
            'overlay-opacity': 0.6,
          },
        },
        {
          selector: 'edge',
          style: {
            'curve-style': 'bezier',
            'target-arrow-shape': 'none',
            'width': 1.5,
            'label': '',
          },
        },
        {
          selector: 'edge:hover',
          style: {
            'width': 3,
            'line-opacity': 1,
          },
        },
      ] as any,
      layout: (useDagre ? DAGRE_LAYOUT : BFS_LAYOUT) as any,
      ...CYTOSCAPE_CONFIG,
    });

    cyRef.current = cy;

    // 居中显示
    cy.fit(undefined, 50);

    // 点击非中心节点 → 触发 onNodeSelect
    cy.on('tap', 'node', (event) => {
      if (!isMountedRef.current || !cyRef.current) return;
      const node = event.target;
      const nodeId = node.data('id');
      const isCenter = node.data('isCenter');

      if (isCenter) return;

      onNodeSelect(nodeId);
    });

    // 点击空白 → 取消选择
    cy.on('tap', (event) => {
      if (!isMountedRef.current || !cyRef.current) return;
      if (event.target === cy) {
        cy.elements().deselect();
      }
    });

    // 鼠标悬停高亮
    cy.on('mouseover', 'node', (event) => {
      if (!isMountedRef.current || !cyRef.current) return;
      const node = event.target;
      node.style({ 'overlay-opacity': 0.6 });
    });

    cy.on('mouseout', 'node', (event) => {
      if (!isMountedRef.current || !cyRef.current) return;
      const node = event.target;
      const isCenter = node.data('isCenter');
      node.style({ 'overlay-opacity': isCenter ? 0.5 : 0.35 });
    });

    cy.on('mouseover', 'edge', (event) => {
      if (!isMountedRef.current || !cyRef.current) return;
      const edge = event.target;
      edge.style({ width: 3, 'line-opacity': 1 });
    });

    cy.on('mouseout', 'edge', (event) => {
      if (!isMountedRef.current || !cyRef.current) return;
      const edge = event.target;
      const isVerified = edge.data('verification_status') === 'verified';
      edge.style({
        width: 1.5,
        'line-opacity': isVerified ? 0.6 : 0.4,
      });
    });

    return () => {
      isMountedRef.current = false;
      if (cyRef.current) {
        try {
          cyRef.current.stop(true, true);
          cyRef.current.removeAllListeners();
          cyRef.current.destroy();
        } catch {
          // 忽略
        }
        cyRef.current = null;
      }
    };
  }, [chainView, onNodeSelect]);

  if (loading) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-canvas-900 via-canvas-800 to-canvas-900">
        <div className="flex gap-2 mb-4">
          <div className="w-3 h-3 rounded-full bg-warning animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-3 h-3 rounded-full bg-warning animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-3 h-3 rounded-full bg-warning animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-ink-4 text-sm">正在构建链路视图…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-canvas-900 via-canvas-800 to-canvas-900">
        <div className="w-12 h-12 rounded-full bg-error/20 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="text-ink-4 text-sm mb-4">{error}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-arco-primary hover:bg-arco-primary-hover text-white rounded-arco-md text-sm transition-colors"
          >
            重试
          </button>
        )}
      </div>
    );
  }

  if (!chainView) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-canvas-900 via-canvas-800 to-canvas-900">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-canvas-800 flex items-center justify-center mb-4 mx-auto">
            <svg className="w-8 h-8 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-ink-3 text-sm">搜索并选择一个节点开始探索</p>
          <p className="text-ink-4 text-xs mt-1">选择链路类型后查看链路视图</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 星空背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-canvas-900 via-canvas-800 to-canvas-900" />
      <div
        className="absolute inset-0 opacity-60 pointer-events-none animate-starfield"
        style={{
          backgroundImage: `
            radial-gradient(2px 2px at 20px 30px, #fff, transparent),
            radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent),
            radial-gradient(1px 1px at 90px 40px, #fff, transparent),
            radial-gradient(2px 2px at 160px 120px, rgba(255,255,255,0.9), transparent),
            radial-gradient(1px 1px at 230px 80px, #fff, transparent),
            radial-gradient(2px 2px at 300px 150px, rgba(255,255,255,0.7), transparent),
            radial-gradient(1px 1px at 370px 60px, #fff, transparent),
            radial-gradient(2px 2px at 450px 200px, rgba(255,255,255,0.8), transparent)
          `,
          backgroundSize: '500px 250px',
          backgroundRepeat: 'repeat',
        }}
      />

      {/* 光晕装饰 */}
      <div
        className="absolute top-0 left-0 w-[400px] h-[400px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(22,93,255,0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
          transform: 'translate(-25%, -25%)',
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-[400px] h-[400px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0,180,42,0.06) 0%, transparent 70%)',
          filter: 'blur(40px)',
          transform: 'translate(25%, 25%)',
        }}
      />

      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
