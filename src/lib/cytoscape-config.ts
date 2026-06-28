import type { NodeType, RelationType } from './types';
import { NODE_TYPE_COLORS } from './dal';

export { isCrossIndustryEdge } from './dal';

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
 * Cytoscape 样式表（v0.4 — 6 档可信度全量视觉编码）
 *
 * 可信度视觉编码（核心）：
 *   - auto-extracted   → 灰色实线（脚本直接产出，未经任何人核验）
 *   - proposed         → 橙色虚线（有人提交依据，但未通过任何审核）
 *   - verified-community → 蓝色实线（社区共识，3+ 独立用户附议）
 *   - verified-expert    → 绿色实线（行业专家/资质审核员终审，可作权威引用）
 *   - disputed         → 红色粗实线（被质疑，原 verified 等级失效）
 *   - deprecated       → 灰色点线（已废弃，不参与下游推理）
 *
 * 跨产业连接（cross-industry）是"被行业分类切断的连接"——视觉上金色加粗，
 * 优先级覆盖 verified/proposed 的颜色，但仍保留基础可信度视觉（线型/亮度）。
 *
 * 节点视觉区分：按 node_type 取色，颜色经 data(color) 注入；
 * 选中/中心节点放大并加粗描边。
 */
export const STATUS_COLORS: Record<string, string> = {
  'auto-extracted': '#86909C',
  proposed: '#FF7D00',
  disputed: '#F53F3F',
  deprecated: '#C9CDD4',
  'verified-community': '#165DFF',
  'verified-expert': '#00B42A',
};

export const STATUS_LABELS: Record<string, string> = {
  'auto-extracted': '自动抽取',
  proposed: '待审',
  disputed: '质疑中',
  deprecated: '已废弃',
  'verified-community': '社区确认',
  'verified-expert': '专家确认',
};

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
      'border-width': 4,
      'border-color': '#165DFF',
      'z-index': 30,
      'transition-property':
        'border-width, border-color, background-color, width, height',
      'transition-duration': '300ms',
    },
  },
  // 中心节点的脉冲外圈：单独的 halo 节点（位置重合在中心节点后）
  {
    selector: 'node.center-halo',
    style: {
      shape: 'ellipse',
      'background-color': '#165DFF',
      'background-opacity': 0,
      'border-width': 3,
      'border-color': '#165DFF',
      'border-opacity': 0.35,
      width: NODE_SIZES.center + 4,
      height: NODE_SIZES.center + 4,
      label: '',
      'text-opacity': 0,
      events: 'no',
      'z-index': 5,
      'transition-property': 'border-opacity, width, height',
      'transition-duration': '1200ms',
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
  // 边默认（兜底）
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
  // v0.4 — 6 档可信度视觉编码
  {
    selector: 'edge.auto-extracted',
    style: {
      'line-style': 'solid',
      'line-color': '#86909C',
      'target-arrow-color': '#86909C',
      'line-opacity': 0.5,
      width: 1.2,
    },
  },
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
    selector: 'edge.verified-community',
    style: {
      'line-style': 'solid',
      'line-color': '#165DFF',
      'target-arrow-color': '#165DFF',
      width: 1.8,
    },
  },
  {
    selector: 'edge.verified-expert',
    style: {
      'line-style': 'solid',
      'line-color': '#00B42A',
      'target-arrow-color': '#00B42A',
      width: 2.2,
      'font-weight': 700,
    },
  },
  {
    selector: 'edge.disputed',
    style: {
      'line-style': 'solid',
      'line-color': '#F53F3F',
      'target-arrow-color': '#F53F3F',
      width: 2.5,
      'line-opacity': 1,
    },
  },
  {
    selector: 'edge.deprecated',
    style: {
      'line-style': 'dotted',
      'line-color': '#C9CDD4',
      'target-arrow-color': '#C9CDD4',
      'line-opacity': 0.4,
      width: 1,
    },
  },
  // 跨产业连接：金色加粗（覆盖基础可信度颜色），但保留线型（虚/实）反映状态
  // 优先级：cross-industry 后于状态色
  {
    selector: 'edge.cross-industry',
    style: {
      'line-color': '#FFC53D',
      'target-arrow-color': '#FFC53D',
      width: 3,
      'z-index': 2,
    },
  },
  {
    selector: 'edge.cross-industry.proposed',
    style: {
      'line-style': 'dashed',
      'line-dash-pattern': [8, 4],
    },
  },
  {
    selector: 'edge.cross-industry.verified-expert',
    style: {
      'line-color': '#00B42A',
      'target-arrow-color': '#00B42A',
      width: 3.5,
    },
  },
  {
    selector: 'edge.cross-industry.disputed',
    style: {
      'line-color': '#F53F3F',
      'target-arrow-color': '#F53F3F',
      width: 3.5,
    },
  },
  {
    selector: 'edge.cross-industry.verified-community',
    style: {
      'line-color': '#165DFF',
      'target-arrow-color': '#165DFF',
      width: 3.2,
    },
  },
  {
    selector: 'edge:selected',
    style: {
      width: 3.5,
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
