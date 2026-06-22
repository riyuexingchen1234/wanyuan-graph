import type { GraphData } from './types';

export const RELATION_LABELS: Record<string, string> = {
  upstream_of: '上游',
  downstream_of: '下游',
  can_be_processed_into: '可加工为',
  applied_in: '应用于',
  structurally_similar_to: '相似',
  made_of: '材料',
};

export function getNodeSize(degree: number): number {
  if (degree >= 3) return 48;
  if (degree >= 2) return 40;
  if (degree >= 1) return 36;
  return 32;
}

export function getNodeColor(coordinateSystems: string[]): string {
  const hasA = coordinateSystems.includes('A');
  const hasB = coordinateSystems.includes('B');
  
  if (hasA && hasB) return '#FF7D00';
  if (hasA) return '#165DFF';
  return '#00B42A';
}

export function getOverlayColor(coordinateSystems: string[]): string {
  return getNodeColor(coordinateSystems);
}

export function isIntersectionNode(coordinateSystems: string[]): boolean {
  return coordinateSystems.includes('A') && coordinateSystems.includes('B');
}

export function calculateNodeDegrees(data: GraphData): Record<string, number> {
  const degrees: Record<string, number> = {};
  
  data.nodes.forEach(node => {
    degrees[node.id] = 0;
  });
  
  data.edges.forEach(edge => {
    degrees[edge.source] = (degrees[edge.source] || 0) + 1;
    degrees[edge.target] = (degrees[edge.target] || 0) + 1;
  });
  
  return degrees;
}

export function getNodeStyle(coordinateSystems: string[], degree: number): Record<string, unknown> {
  const color = getNodeColor(coordinateSystems);
  const overlayColor = getOverlayColor(coordinateSystems);
  const size = getNodeSize(degree);
  const isAB = isIntersectionNode(coordinateSystems);
  
  return {
    shape: 'ellipse',
    width: size,
    height: size,
    'background-color': color,
    'border-width': 0,
    'overlay-color': color,
    'overlay-opacity': isAB ? 0.5 : 0.35,
    'text-valign': 'bottom',
    'text-halign': 'center',
    'text-margin-y': 8,
    'font-size': 11,
    'color': '#C9CDD4',
    'text-outline-width': 3,
    'text-outline-color': '#0a0f1c',
    'font-weight': 500,
    'z-index': 10,
    'shadow-blur': 20,
  };
}

export function getEdgeStyle(relationType: string, verificationStatus: string): Record<string, unknown> {
  const isVerified = verificationStatus === 'verified';
  
  return {
    width: 1.5,
    'curve-style': 'bezier',
    'target-arrow-shape': 'none',
    'line-color': isVerified ? '#4E5969' : '#FF7D00',
    'line-style': isVerified ? 'solid' : 'dashed',
    'line-opacity': isVerified ? 0.5 : 0.4,
    'label': RELATION_LABELS[relationType] || '',
    'font-size': 10,
    'color': '#86909C',
    'text-outline-width': 2,
    'text-outline-color': '#1D2129',
    'z-index': 1,
  };
}

export const COSE_LAYOUT = {
  name: 'cose',
  animate: true,
  animationDuration: 500,
  nodeRepulsion: 8000,
  idealEdgeLength: 120,
  randomize: true,
  componentSpacing: 100,
  nodeOverlap: 20,
  refresh: 20,
  fit: true,
  padding: 50,
};

export const CYTOSCAPE_CONFIG = {
  minZoom: 0.3,
  maxZoom: 3,
  wheelSensitivity: 0.1,
  autounselectify: false,
};
