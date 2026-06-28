import {
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
} from './types';
import type { NodeType, VerificationStatus } from './types';

export const NODE_SIZES = {
  center: 50,
  normal: 40,
} as const;

export function getNodeColor(type: NodeType): string {
  return NODE_TYPE_COLORS[type] || '#86909C';
}

export const DAGRE_LAYOUT = {
  name: 'dagre',
  rankDir: 'LR',
  rankSep: 100,
  nodeSep: 50,
  animate: false,
};

export const CYTOSCAPE_CONFIG = {
  minZoom: 0.3,
  maxZoom: 3,
  wheelSensitivity: 0.1,
  autounselectify: false,
};

export const CYTOSCAPE_STYLESHEET = [
  {
    selector: 'node',
    style: {
      shape: 'ellipse',
      width: NODE_SIZES.normal,
      height: NODE_SIZES.normal,
      'background-color': '#ffffff',
      'background-opacity': 1,
      'border-width': 1,
      'border-color': '#000000',
      'text-valign': 'bottom',
      'text-halign': 'center',
      'text-margin-y': 4,
      'font-size': 12,
      color: '#000000',
      'text-outline-width': 0,
      'font-weight': 400,
      label: 'data(name)',
      'z-index': 10,
    },
  },
  {
    selector: 'node.center',
    style: {
      width: NODE_SIZES.center,
      height: NODE_SIZES.center,
      'font-size': 13,
      'font-weight': 600,
      'border-width': 2,
      'z-index': 20,
    },
  },
  {
    selector: 'node:selected',
    style: {
      'border-width': 2,
      'border-color': '#000000',
    },
  },
  {
    selector: 'edge',
    style: {
      width: 1,
      'curve-style': 'bezier',
      'target-arrow-shape': 'triangle',
      'target-arrow-color': '#000000',
      'arrow-scale': 0.8,
      'line-color': '#000000',
      'line-opacity': 1,
      'z-index': 1,
    },
  },
  {
    selector: 'edge.verified',
    style: {
      'line-style': 'solid',
      width: 1.5,
    },
  },
  {
    selector: 'edge.proposed',
    style: {
      'line-style': 'dashed',
      'line-dash-pattern': [6, 4],
      width: 1,
    },
  },
];

export { NODE_TYPE_LABELS };
