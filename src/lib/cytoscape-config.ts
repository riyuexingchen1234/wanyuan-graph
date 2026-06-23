import type { NodeType, ChainType, VerificationStatus } from './types';

/** 节点类型 → 颜色映射 */
export const NODE_TYPE_COLORS: Record<NodeType, string> = {
  industry: '#165DFF',
  material: '#00B42A',
  product: '#0FC6C2',
  equipment: '#722ED1',
  consumable: '#FF7D00',
  service: '#86909C',
  endpoint: '#C9CDD4',
};

/** 节点类型 → 中文标签 */
export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  industry: '行业',
  material: '材料',
  product: '产品',
  equipment: '设备',
  consumable: '耗材',
  service: '服务',
  endpoint: '终端',
};

/** 节点尺寸常量 */
export const NODE_SIZES = {
  center: 60,
  normal: 40,
  crossIndustry: 50,
} as const;

/** 获取节点颜色 */
export function getNodeColor(type: NodeType): string {
  return NODE_TYPE_COLORS[type] || '#86909C';
}

/** 获取边颜色（按 relation_type 从 chain_types 取色） */
export function getEdgeColor(
  relationType: string,
  chainTypes: ChainType[]
): string {
  const chainType = chainTypes.find((ct) => ct.type === relationType);
  return chainType?.color || '#4E5969';
}

/** 获取节点尺寸 */
export function getNodeSize(
  isCenter: boolean,
  isCrossIndustry: boolean
): number {
  if (isCenter) return NODE_SIZES.center;
  if (isCrossIndustry) return NODE_SIZES.crossIndustry;
  return NODE_SIZES.normal;
}

/** 获取节点样式 */
export function getNodeStyle(
  type: NodeType,
  isCenter: boolean,
  isCrossIndustry: boolean
): Record<string, unknown> {
  const color = getNodeColor(type);
  const size = getNodeSize(isCenter, isCrossIndustry);

  return {
    shape: 'ellipse',
    width: size,
    height: size,
    'background-color': color,
    'border-width': isCrossIndustry ? 4 : 0,
    'border-style': isCrossIndustry ? 'double' : 'solid',
    'border-color': isCrossIndustry ? '#FFFFFF' : color,
    'overlay-color': color,
    'overlay-opacity': isCenter ? 0.5 : 0.35,
    'text-valign': 'bottom',
    'text-halign': 'center',
    'text-margin-y': 8,
    'font-size': isCenter ? 14 : 11,
    'color': '#C9CDD4',
    'text-outline-width': 3,
    'text-outline-color': '#0a0f1c',
    'font-weight': isCenter ? 700 : 500,
    'z-index': isCenter ? 20 : 10,
    'shadow-blur': isCenter ? 30 : 20,
  };
}

/** 获取边样式 */
export function getEdgeStyle(
  relationType: string,
  verificationStatus: VerificationStatus,
  chainTypes: ChainType[]
): Record<string, unknown> {
  const isVerified = verificationStatus === 'verified';
  const color = getEdgeColor(relationType, chainTypes);

  const style: Record<string, unknown> = {
    width: 1.5,
    'curve-style': 'bezier',
    'target-arrow-shape': 'none',
    'line-color': color,
    'line-style': isVerified ? 'solid' : 'dashed',
    'line-opacity': isVerified ? 0.6 : 0.4,
    'font-size': 10,
    'color': '#86909C',
    'text-outline-width': 2,
    'text-outline-color': '#1D2129',
    'z-index': 1,
  };

  if (!isVerified) {
    style['line-dash-pattern'] = [8, 6];
  }

  return style;
}

/** Dagre 层次有向布局（左→右，上游在左下游在右） */
export const DAGRE_LAYOUT = {
  name: 'dagre',
  rankDir: 'LR',
  rankSep: 120,
  nodeSep: 50,
  animate: true,
  animationDuration: 800,
};

/** Breadthfirst 降级布局 */
export const BFS_LAYOUT = {
  name: 'breadthfirst',
  directed: true,
  spacingFactor: 1.2,
  animate: true,
  animationDuration: 800,
};

/** Cytoscape 全局配置 */
export const CYTOSCAPE_CONFIG = {
  minZoom: 0.3,
  maxZoom: 3,
  wheelSensitivity: 0.1,
  autounselectify: false,
};
