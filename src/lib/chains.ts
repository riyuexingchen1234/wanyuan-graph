import type { ChainDef, EdgeType } from './types';

export const FLOW_EDGE_TYPES: EdgeType[] = ['input', 'output'];

export function isFlowEdge(edgeType: EdgeType): boolean {
  return edgeType === 'input' || edgeType === 'output';
}

export function getUpstreamNodeId(
  sourceId: string,
  targetId: string,
  edgeType: EdgeType
): string | null {
  if (edgeType === 'input') return sourceId;
  if (edgeType === 'output') return targetId;
  return null;
}

export function getDownstreamNodeId(
  sourceId: string,
  targetId: string,
  edgeType: EdgeType
): string | null {
  if (edgeType === 'input') return targetId;
  if (edgeType === 'output') return sourceId;
  return null;
}

export const DEFAULT_CHAIN_COLORS: Record<string, string> = {
  pv_chain: '#FF8C00',
  battery_chain: '#3B82F6',
};

export function getChainColor(chain: ChainDef): string {
  return chain.color || DEFAULT_CHAIN_COLORS[chain.id] || '#6B7280';
}
