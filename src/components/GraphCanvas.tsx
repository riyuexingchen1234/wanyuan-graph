'use client';

import { useEffect, useRef } from 'react';
import cytoscape, { NodeDefinition, EdgeDefinition } from 'cytoscape';
import dagre from 'dagre';
import cytoscapeDagre from 'cytoscape-dagre';
import type { ChainView, GraphNode } from '../lib/types';
import {
  CYTOSCAPE_CONFIG,
  CYTOSCAPE_STYLESHEET,
  DAGRE_LAYOUT,
} from '../lib/cytoscape-config';
import { NODE_TYPE_COLORS } from '../lib/graph-data';

let dagreRegistered = false;
function registerDagre() {
  if (dagreRegistered || typeof window === 'undefined') return;
  try {
    cytoscape.use(cytoscapeDagre as unknown as cytoscape.Ext);
    dagreRegistered = true;
  } catch (e) {
    console.warn('dagre 注册失败', e);
  }
}

registerDagre();

interface GraphCanvasProps {
  centerNode: GraphNode | null;
  chainView: ChainView | null;
  mode?: 'default' | 'material-extension';
  onNodeSelect: (id: string) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export default function GraphCanvas({
  centerNode,
  chainView,
  mode = 'default',
  onNodeSelect,
  loading,
  error,
  onRetry,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    if (!centerNode) return;
    if (!containerRef.current) return;

    isMountedRef.current = true;

    if (cyRef.current) {
      try {
        cyRef.current.stop(true, true);
        cyRef.current.removeAllListeners();
        cyRef.current.destroy();
      } catch {
        // ignore
      }
      cyRef.current = null;
    }

    const centerId = centerNode.id;
    const isMaterialExt = mode === 'material-extension';

    let nodes: GraphNode[] = [];
    let edges: any[] = [];

    if (chainView && chainView.nodes.length > 1) {
      nodes = chainView.nodes;
      edges = chainView.edges;
    } else {
      nodes = [centerNode];
    }

    const cyNodes: NodeDefinition[] = nodes.map((node) => {
      const isCenter = node.id === centerId;
      const classes: string[] = [];

      if (isCenter) classes.push('center');
      if (isMaterialExt && isCenter) classes.push('material-extension-center');
      if (isMaterialExt && !isCenter) classes.push('material-extension-app');

      return {
        group: 'nodes',
        data: {
          id: node.id,
          name: node.name,
          node_type: node.node_type,
          is_center: isCenter,
          definition: node.definition,
        },
        classes: classes.join(' '),
      };
    });

    const cyEdges: EdgeDefinition[] = edges.map((edge) => {
      const classes: string[] = [];
      classes.push(edge.verification_status);
      if (isMaterialExt) classes.push('material-extension');

      return {
        group: 'edges',
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          relation_type: edge.relation_type,
          verification_status: edge.verification_status,
          evidence_count: edge.evidence?.length ?? 0,
          note: edge.note || '',
        },
        classes: classes.join(' '),
      };
    });

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...cyNodes, ...cyEdges],
      style: CYTOSCAPE_STYLESHEET as any,
      layout: (dagreRegistered ? DAGRE_LAYOUT : { name: 'grid' }) as any,
      ...CYTOSCAPE_CONFIG,
    });

    cyRef.current = cy;

    cy.fit(undefined, 80);

    cy.on('tap', 'node', (event) => {
      if (!isMountedRef.current || !cyRef.current) return;
      const node = event.target;
      const nodeId = node.data('id');
      const isCenter = node.data('is_center');

      if (isCenter) return;
      onNodeSelect(nodeId);
    });

    cy.on('tap', (event) => {
      if (!isMountedRef.current || !cyRef.current) return;
      if (event.target === cy) {
        cy.elements().deselect();
      }
    });

    return () => {
      isMountedRef.current = false;
      if (cyRef.current) {
        try {
          cyRef.current.stop(true, true);
          cyRef.current.removeAllListeners();
          cyRef.current.destroy();
        } catch {
          // ignore
        }
        cyRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerNode?.id, chainView, mode, onNodeSelect]);

  const bgClass =
    mode === 'material-extension'
      ? 'bg-gradient-to-br from-[#1a1530] via-[#0f0a20] to-[#0a0510]'
      : 'bg-gradient-to-br from-canvas-900 via-canvas-800 to-canvas-900';

  if (loading) {
    return (
      <div className={`absolute inset-0 flex flex-col items-center justify-center ${bgClass}`}>
        <div className="flex gap-2 mb-4">
          <div
            className="w-3 h-3 rounded-full bg-warning animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="w-3 h-3 rounded-full bg-warning animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <div
            className="w-3 h-3 rounded-full bg-warning animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
        <span className="text-ink-4 text-sm">正在构建视图…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`absolute inset-0 flex flex-col items-center justify-center ${bgClass}`}>
        <div className="w-12 h-12 rounded-full bg-error/20 flex items-center justify-center mb-4">
          <svg
            className="w-6 h-6 text-error"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
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

  if (!centerNode) {
    return (
      <div className={`absolute inset-0 flex flex-col items-center justify-center ${bgClass}`}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-canvas-800/60 flex items-center justify-center mb-4 mx-auto">
            <svg
              className="w-8 h-8 text-ink-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <p className="text-ink-3 text-sm">搜索并选择一个节点开始探索</p>
          <p className="text-ink-4 text-xs mt-1">从任意节点出发，发现真实世界的连接</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div className={`absolute inset-0 ${bgClass}`} />

      {mode !== 'material-extension' && (
        <>
          <div
            className="absolute inset-0 opacity-60 pointer-events-none"
            style={{
              backgroundImage: `
                radial-gradient(2px 2px at 20px 30px, #fff, transparent),
                radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent),
                radial-gradient(1px 1px at 90px 40px, #fff, transparent),
                radial-gradient(2px 2px at 160px 120px, rgba(255,255,255,0.9), transparent),
                radial-gradient(1px 1px at 230px 80px, #fff, transparent)
              `,
              backgroundSize: '500px 250px',
              backgroundRepeat: 'repeat',
            }}
          />
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
        </>
      )}

      {mode === 'material-extension' && (
        <>
          <div
            className="absolute inset-0 opacity-50 pointer-events-none"
            style={{
              backgroundImage: `
                radial-gradient(2px 2px at 20px 30px, #EB2F96, transparent),
                radial-gradient(1.5px 1.5px at 80px 90px, #722ED1, transparent),
                radial-gradient(1px 1px at 150px 50px, #FF85C0, transparent),
                radial-gradient(2px 2px at 220px 140px, rgba(235,47,150,0.7), transparent),
                radial-gradient(1.5px 1.5px at 300px 80px, #9254DE, transparent),
                radial-gradient(1px 1px at 350px 160px, #EB2F96, transparent)
              `,
              backgroundSize: '400px 200px',
              backgroundRepeat: 'repeat',
            }}
          />
          <div
            className="absolute top-0 left-0 w-[500px] h-[500px] pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(235,47,150,0.15) 0%, transparent 60%)',
              filter: 'blur(40px)',
              transform: 'translate(-20%, -20%)',
            }}
          />
          <div
            className="absolute bottom-0 right-0 w-[500px] h-[500px] pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(114,46,209,0.15) 0%, transparent 60%)',
              filter: 'blur(40px)',
              transform: 'translate(20%, 20%)',
            }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(235,47,150,0.08) 0%, rgba(114,46,209,0.05) 40%, transparent 70%)',
              filter: 'blur(30px)',
            }}
          />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-[#0a0510]/50" />
        </>
      )}

      <div ref={containerRef} className="w-full h-full relative z-10" />
    </div>
  );
}
