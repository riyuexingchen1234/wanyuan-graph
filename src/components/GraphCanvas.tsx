import { useEffect, useRef, useCallback } from 'react';
import cytoscape from 'cytoscape';
import type { GraphData, GraphNode, GraphEdge } from '../lib/types';
import {
  getNodeStyle,
  getEdgeStyle,
  COSE_LAYOUT,
  CYTOSCAPE_CONFIG,
  isIntersectionNode,
  calculateNodeDegrees,
  getNodeColor,
  RELATION_LABELS,
} from '../lib/cytoscape-config';

interface GraphCanvasProps {
  data: GraphData;
  selectedNodeId: string | null;
  onNodeSelect: (id: string) => void;
  onCyReady?: (cy: cytoscape.Core) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export default function GraphCanvas({
  data,
  selectedNodeId,
  onNodeSelect,
  onCyReady,
  loading,
  error,
  onRetry,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const pulseIntervalRef = useRef<number | null>(null);

  const createElements = useCallback((nodes: GraphNode[], edges: GraphEdge[]) => {
    const degrees = calculateNodeDegrees({ nodes, edges });
    
    const cyNodes = nodes.map(node => ({
      group: 'nodes',
      data: {
        id: node.id,
        label: node.name,
        node_type: node.node_type,
        coordinate_systems: node.coordinate_systems,
        degree: degrees[node.id],
        color: getNodeColor(node.coordinate_systems),
        ...node,
      },
      style: getNodeStyle(node.coordinate_systems, degrees[node.id]),
    }));

    const cyEdges = edges.map(edge => ({
      group: 'edges',
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        relation_type: edge.relation_type,
        relation_label: RELATION_LABELS[edge.relation_type] || '',
        verification_status: edge.verification_status,
        ...edge,
      },
      style: getEdgeStyle(edge.relation_type, edge.verification_status),
    }));

    return [...cyNodes, ...cyEdges];
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    if (pulseIntervalRef.current) {
      clearInterval(pulseIntervalRef.current);
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: createElements(data.nodes, data.edges),
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            'background-opacity': 1,
            'shadow-blur': 20,
            'shadow-color': 'data(color)',
            'shadow-opacity': 0.5,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'overlay-opacity': 0.5,
            width: 52,
            height: 52,
            'shadow-blur': 30,
          },
        },
        {
          selector: 'node:hover',
          style: {
            'overlay-opacity': 0.4,
            'color': '#FFFFFF',
            'shadow-blur': 25,
          },
        },
        {
          selector: 'edge',
          style: {
            'target-arrow-shape': 'none',
            'curve-style': 'bezier',
            'label': '',
          },
        },
        {
          selector: 'edge:hover',
          style: {
            'line-width': 3,
            'line-opacity': 1,
            'label': 'data(relation_label)',
          },
        },
      ],
      layout: COSE_LAYOUT,
      ...CYTOSCAPE_CONFIG,
    });

    cyRef.current = cy;
    
    if (onCyReady) {
      onCyReady(cy);
    }

    let selectedNode: cytoscape.Node | null = null;

    cy.on('tap', 'node', (event) => {
      const node = event.target;
      const nodeId = node.data('id');
      
      onNodeSelect(nodeId);
      
      selectedNode = node;
      node.select();
      
      cy.elements().not(node).not(`edge[source="${nodeId}"], edge[target="${nodeId}"]`).animate({
        style: { opacity: 0.15 },
      }, { duration: 200 });
      
      node.animate({
        position: {
          x: cy.width() / 2,
          y: cy.height() / 2,
        },
      }, {
        duration: 500,
        easing: 'ease-out',
      });
      
      cy.animate({ zoom: 1.5 }, { duration: 500 });
    });

    cy.on('tap', (event) => {
      if (event.target === cy) {
        onNodeSelect('');
        
        cy.elements().animate({
          style: { opacity: 1 },
        }, { duration: 200 });
        
        cy.elements().deselect();
        selectedNode = null;
      }
    });

    cy.on('mouseover', 'node', (event) => {
      const node = event.target;
      node.style({ 'color': '#FFFFFF' });
    });

    cy.on('mouseout', 'node', (event) => {
      const node = event.target;
      if (!node.selected()) {
        node.style({ 'color': '#C9CDD4' });
      }
    });

    cy.on('mouseover', 'edge', (event) => {
      const edge = event.target;
      edge.style({
        'line-width': 3,
        'line-opacity': 1,
      });
    });

    cy.on('mouseout', 'edge', (event) => {
      const edge = event.target;
      const isVerified = edge.data('verification_status') === 'verified';
      edge.style({
        'line-width': 1.5,
        'line-opacity': isVerified ? 0.5 : 0.4,
      });
    });

    cy.on('dbltap', 'node', (event) => {
      const node = event.target;
      cy.animate({
        zoom: 1.5,
        pan: {
          x: cy.width() / 2 - node.position().x,
          y: cy.height() / 2 - node.position().y,
        },
      }, { duration: 500 });
    });

    pulseIntervalRef.current = window.setInterval(() => {
      const intersectionNodes = cy.nodes().filter((node) => {
        const coords = node.data('coordinate_systems');
        return isIntersectionNode(coords);
      });

      intersectionNodes.forEach((node) => {
        const currentOpacity = node.style('overlay-opacity');
        const newOpacity = currentOpacity === '0.35' ? 0.6 : 0.35;
        node.animate({ style: { 'overlay-opacity': newOpacity } }, { duration: 1000 });
      });
    }, 2000);

    return () => {
      cy.destroy();
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current);
      }
    };
  }, [data, onNodeSelect, onCyReady, createElements]);

  useEffect(() => {
    if (!cyRef.current) return;

    if (selectedNodeId) {
      const node = cyRef.current.getElementById(selectedNodeId);
      if (node.length > 0) {
        node.select();
        node.center();
      }
    } else {
      cyRef.current.elements().deselect();
    }
  }, [selectedNodeId]);

  if (loading) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-canvas-900 via-canvas-800 to-canvas-900">
        <div className="flex gap-2 mb-4">
          <div className="w-3 h-3 rounded-full bg-warning animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-3 h-3 rounded-full bg-warning animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-3 h-3 rounded-full bg-warning animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-ink-4 text-sm">正在构建图谱…</span>
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

  return (
    <div className="relative w-full h-full overflow-hidden">
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