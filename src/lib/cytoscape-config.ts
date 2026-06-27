import type { NodeType, RelationType } from './types';
import { NODE_TYPE_COLORS } from './dal';

export const NODE_SIZES = {
  center: 46,
  normal: 34,
} as const;

export function getNodeColor(type: NodeType): string {
  return NODE_TYPE_COLORS[type] || '#86909C';
}

/** Dagre 布局：左→右，呈现产业链流向。 */
export const DAGRE_LAYOUT = {
  name: 'dagre',
  rankDir: 'LR',
  rankSep: 110,
  nodeSep: 55,
  edgeSep: 20,
  animate: false,
} as const;

export const CYTOSCAPE_CONFIG = {
  minZoom: 0.25,
  maxZoom: 3,
  wheelSensitivity: 0.15,
  autounselectify: false,
} as const;

/**
 * Cytoscape 样式表。
 *
 * 可信度视觉编码（核心）：
 *   - proposed 边 → 橙色 (#FF7D00) 虚线
 *   - verified 边 → 深色 (#1D2129) 实线
 *
 * 节点视觉区分：按 node_type 取色，颜色经 data(color) 注入；
 * 选中/中心节点放大并加粗描边。
 */
export const CYTOSCAPE_STYLESHEET = [
  {
    selector: 'node',
    style: {
      shape: 'ellipse',
      width: NODE_SIZES.normal,
      height: NODE_SIZES.normal,
      'background-color': 'data(color)',
      'background-opacity': 0.9,
      'border-width': 2,
      'border-color': 'data(borderColor)',
      'border-opacity': 1,
      label: 'data(name)',
      'text-valign': 'bottom',
      'text-halign': 'center',
      'text-margin-y': 6,
      'font-size': 12,
      color: '#1D2129',
      'text-outline-width': 2,
      'text-outline-color': '#FFFFFF',
      'font-weight': 400,
      'z-index': 10,
    },
  },
  {
    selector: 'node.center',
    style: {
      width: NODE_SIZES.center,
      height: NODE_SIZES.center,
      'font-size': 13,
      'font-weight': 700,
      'border-width': 3,
      'z-index': 30,
    },
  },
  {
    selector: 'node:selected',
    style: {
      'border-width': 3,
      'border-color': '#165DFF',
      'z-index': 25,
    },
  },
  {
    selector: 'edge',
    style: {
      width: 1.5,
      'curve-style': 'bezier',
      'target-arrow-shape': 'triangle',
      'arrow-scale': 0.9,
      'line-color': '#1D2129',
      'target-arrow-color': '#1D2129',
      'line-opacity': 0.85,
      'z-index': 1,
    },
  },
  // verified：实线深色
  {
    selector: 'edge.verified',
    style: {
      'line-style': 'solid',
      'line-color': '#1D2129',
      'target-arrow-color': '#1D2129',
      width: 1.8,
    },
  },
  // proposed：橙色虚线（种子数据全部为 proposed）
  {
    selector: 'edge.proposed',
    style: {
      'line-style': 'dashed',
      'line-dash-pattern': [6, 4],
      'line-color': '#FF7D00',
      'target-arrow-color': '#FF7D00',
      width: 1.5,
    },
  },
  {
    selector: 'edge:selected',
    style: {
      width: 2.5,
      'line-color': '#165DFF',
      'target-arrow-color': '#165DFF',
      'z-index': 5,
    },
  },
];

/** 关系类型切换按钮的展示顺序（仅含种子数据中实际存在的关系类型 + 任务要求项）。 */
export const SWITCHABLE_RELATIONS: RelationType[] = [
  'can_be_processed_into',
  'raw_material_for',
  'equipment_for',
  'consumable_for',
  'applied_in',
];
