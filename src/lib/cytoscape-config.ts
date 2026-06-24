import {
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  RELATION_TYPE_COLORS,
  RELATION_TYPE_LABELS,
} from './graph-data';
import type { NodeType, RelationType, VerificationStatus } from './types';

export const NODE_SIZES = {
  center: 60,
  normal: 40,
  crossIndustry: 50,
} as const;

export function getNodeColor(type: NodeType): string {
  return NODE_TYPE_COLORS[type] || '#86909C';
}

export function getEdgeColor(relationType: RelationType): string {
  return RELATION_TYPE_COLORS[relationType] || '#86909C';
}

export function getNodeSize(isCenter: boolean): number {
  return isCenter ? NODE_SIZES.center : NODE_SIZES.normal;
}

export const DAGRE_LAYOUT = {
  name: 'dagre',
  rankDir: 'LR',
  rankSep: 120,
  nodeSep: 60,
  animate: true,
  animationDuration: 600,
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
      'background-color': (ele: any) => {
        const type = ele.data('node_type') as NodeType;
        return getNodeColor(type);
      },
      'background-opacity': 1,
      'border-width': 2,
      'border-color': '#0a0f1c',
      'overlay-opacity': 0,
      'text-valign': 'bottom',
      'text-halign': 'center',
      'text-margin-y': 8,
      'font-size': 11,
      color: '#C9CDD4',
      'text-outline-width': 3,
      'text-outline-color': '#0a0f1c',
      'font-weight': 500,
      label: 'data(name)',
      'z-index': 10,
      'text-wrap': 'wrap',
      'text-max-width': 80,
    },
  },
  {
    selector: 'node.center',
    style: {
      width: NODE_SIZES.center,
      height: NODE_SIZES.center,
      'font-size': 14,
      'font-weight': 700,
      'z-index': 20,
      'overlay-color': (ele: any) => {
        const type = ele.data('node_type') as NodeType;
        return getNodeColor(type);
      },
      'overlay-opacity': 0.4,
      'overlay-padding': 8,
      'border-width': 3,
      'border-color': '#FFFFFF',
    },
  },
  {
    selector: 'node.cross-industry',
    style: {
      width: NODE_SIZES.crossIndustry,
      height: NODE_SIZES.crossIndustry,
      'border-width': 4,
      'border-style': 'double',
      'border-color': '#FFFFFF',
    },
  },
  {
    selector: 'node.material-extension-center',
    style: {
      shape: 'diamond',
      width: 70,
      height: 70,
      'background-color': '#EB2F96',
      'background-gradient-stop-colors': '#EB2F96 #FF85C0',
      'background-gradient-stop-positions': '0% 100%',
      'background-gradient-direction': 'diagonal',
      'border-width': 3,
      'border-color': '#FF85C0',
      'overlay-color': '#EB2F96',
      'overlay-opacity': 0.4,
      'overlay-padding': 16,
      'font-size': 14,
      'font-weight': 700,
      color: '#FFE4F0',
      'text-outline-color': '#1a0a15',
      'text-outline-width': 4,
      'z-index': 25,
      'text-margin-y': 12,
    },
  },
  {
    selector: 'node.material-extension-app',
    style: {
      shape: 'ellipse',
      width: 48,
      height: 48,
      'background-color': '#722ED1',
      'background-gradient-stop-colors': '#722ED1 #9254DE',
      'background-gradient-stop-positions': '0% 100%',
      'background-gradient-direction': 'diagonal',
      'border-width': 2,
      'border-color': '#EB2F96',
      'overlay-color': '#EB2F96',
      'overlay-opacity': 0.15,
      'overlay-padding': 8,
      color: '#E9D7FF',
      'text-outline-color': '#0f0a20',
      'text-outline-width': 3,
      'font-size': 11,
    },
  },
  {
    selector: 'node.material-extension-app:selected',
    style: {
      'border-width': 3,
      'border-color': '#FF85C0',
      'overlay-opacity': 0.4,
      'overlay-padding': 10,
    },
  },
  {
    selector: 'edge',
    style: {
      width: 2,
      'curve-style': 'bezier',
      'target-arrow-shape': 'triangle',
      'target-arrow-color': '#4E5969',
      'arrow-scale': 0.8,
      'line-color': '#4E5969',
      'line-opacity': 0.6,
      'z-index': 1,
    },
  },
  {
    selector: 'edge.verified',
    style: {
      'line-style': 'solid',
      width: 2.5,
      'line-opacity': 0.7,
    },
  },
  {
    selector: 'edge.proposed',
    style: {
      'line-style': 'dashed',
      'line-dash-pattern': [8, 6],
      width: 2,
      'line-color': '#FF7D00',
      'target-arrow-color': '#FF7D00',
      'line-opacity': 0.5,
    },
  },
  {
    selector: 'edge.material-extension',
    style: {
      'line-color': '#EB2F96',
      'target-arrow-color': '#EB2F96',
      'source-arrow-color': '#EB2F96',
      width: 2.5,
      'line-opacity': 0.7,
      'line-style': 'dashed',
      'line-dash-pattern': [8, 5],
      'arrow-scale': 1,
      'curve-style': 'bezier',
      'target-arrow-shape': 'triangle',
      'target-arrow-fill': 'filled',
    },
  },
  {
    selector: 'edge.material-extension.verified',
    style: {
      'line-color': '#EB2F96',
      'target-arrow-color': '#EB2F96',
      'line-style': 'solid',
      width: 3,
      'line-opacity': 0.8,
    },
  },
  {
    selector: 'edge.material-extension.proposed',
    style: {
      'line-color': '#FF7D00',
      'target-arrow-color': '#FF7D00',
      'line-style': 'dashed',
      'line-dash-pattern': [8, 6],
      width: 2,
      'line-opacity': 0.6,
    },
  },
];

export { NODE_TYPE_LABELS, RELATION_TYPE_LABELS };
