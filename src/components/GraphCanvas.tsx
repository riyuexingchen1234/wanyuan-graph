'use client';

import { useEffect, useRef } from 'react';
import cytoscape, { NodeDefinition, EdgeDefinition } from 'cytoscape';
import cytoscapeDagre from 'cytoscape-dagre';
import type { ChainView, GraphNode } from '../lib/types';
import {
  CYTOSCAPE_CONFIG,
  CYTOSCAPE_STYLESHEET,
  DAGRE_LAYOUT,
} from '../lib/cytoscape-config';

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

  if (loading) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white">
        <span className="text-gray-500 text-sm">加载中…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white">
        <span className="text-gray-500 text-sm mb-4">{error}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
          >
            重试
          </button>
        )}
      </div>
    );
  }

  if (!centerNode) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white">
        <p className="text-gray-500 text-sm">搜索并选择一个节点开始探索</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-white">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
