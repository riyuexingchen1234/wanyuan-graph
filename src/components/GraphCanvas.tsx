import { useEffect, useRef, useCallback, useState } from 'react';
import cytoscape, { NodeDefinition, EdgeDefinition } from 'cytoscape';
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
import { GHOST_NODES } from '../lib/ghost-nodes';

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
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, text: '' });

  const getGhostNodeColor = (coordSystem: string) => {
    switch (coordSystem) {
      case 'A': return '#165DFF';
      case 'B': return '#00B42A';
      case 'AB': return '#FF7D00';
      default: return '#4E5969';
    }
  };

  const createElements = useCallback((nodes: GraphNode[], edges: GraphEdge[]): Array<NodeDefinition | EdgeDefinition> => {
    const degrees = calculateNodeDegrees({ nodes, edges });
    
    const cyNodes: NodeDefinition[] = nodes.map(node => ({
      group: 'nodes',
      data: {
        ...node,
        label: node.name,
        degree: degrees[node.id],
        color: getNodeColor(node.coordinate_systems),
        isGhost: false,
      },
      style: getNodeStyle(node.coordinate_systems, degrees[node.id]),
    }));

    const ghostNodes: NodeDefinition[] = GHOST_NODES.map(ghost => ({
      group: 'nodes',
      data: {
        id: ghost.id,
        label: ghost.name,
        isGhost: true,
        coordinate_system: ghost.coordinate_system,
        hint: ghost.hint,
      },
      position: { x: ghost.x, y: ghost.y },
      style: {
        'background-color': getGhostNodeColor(ghost.coordinate_system),
        'background-opacity': 0.15,
        'border-width': '1px',
        'border-style': 'dashed',
        'border-color': getGhostNodeColor(ghost.coordinate_system),
        'width': '20px',
        'height': '20px',
        'overlay-opacity': 0,
        'label': ghost.name,
        'font-size': '10px',
        'color': '#4E5969',
        'text-opacity': 0.5,
        'text-valign': 'bottom',
        'text-margin-y': '4px',
      },
    }));

    const cyEdges: EdgeDefinition[] = edges.map(edge => ({
      group: 'edges',
      data: {
        ...edge,
        relation_label: RELATION_LABELS[edge.relation_type] || '',
      },
      style: getEdgeStyle(edge.relation_type, edge.verification_status),
    }));

    return [...cyNodes, ...ghostNodes, ...cyEdges] as Array<NodeDefinition | EdgeDefinition>;
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
          selector: 'node[isGhost="true"]',
          style: {
            'shadow-blur': 0,
            'shadow-opacity': 0,
          },
        },
        {
          selector: 'node[isGhost="true"]:hover',
          style: {
            'background-opacity': 0.3,
            'border-width': '2px',
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
      ] as any,
      layout: {
        name: 'preset',
        positions: (node: any) => {
          if (node.data('isGhost')) {
            return { x: node.data('x') || 0, y: node.data('y') || 0 };
          }
          return { x: 0, y: 0 };
        },
        fit: true,
        padding: 50,
      } as any,
      ...CYTOSCAPE_CONFIG,
    });

    cy.layout(COSE_LAYOUT).run();

    cyRef.current = cy;
    
    if (onCyReady) {
      onCyReady(cy);
    }

    let selectedNode: any | null = null;

    cy.on('tap', 'node', (event) => {
      const node = event.target;
      const nodeId = node.data('id');
      const isGhost = node.data('isGhost');

      if (isGhost) {
        alert('此节点为预览，完整图谱开发中');
        return;
      }
      
      onNodeSelect(nodeId);
      
      selectedNode = node;
      node.select();
      
      cy.elements()
        .not(node)
        .not(`edge[source="${nodeId}"], edge[target="${nodeId}"]`)
        .not('[isGhost="true"]')
        .animate({
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
      const isGhost = node.data('isGhost');
      
      if (isGhost) {
        const hint = node.data('hint');
        const position = node.renderedPosition();
        setTooltip({
          show: true,
          x: position.x + 15,
          y: position.y - 10,
          text: hint || '',
        });
      } else {
        node.style({ 'color': '#FFFFFF' });
      }
    });

    cy.on('mouseout', 'node', (event) => {
      const node = event.target;
      const isGhost = node.data('isGhost');
      
      if (isGhost) {
        setTooltip({ show: false, x: 0, y: 0, text: '' });
      } else if (!node.selected()) {
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
      const isGhost = node.data('isGhost');
      
      if (isGhost) return;
      
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
        if (node.data('isGhost')) return false;
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
        cyRef.current.center(node);
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
      
      {tooltip.show && (
        <div
          className="absolute z-50 px-3 py-1.5 bg-canvas-900/95 backdrop-blur rounded-arco-sm shadow-arco-2 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <span className="text-arco-xs text-white/80">{tooltip.text}</span>
        </div>
      )}
    </div>
  );
}