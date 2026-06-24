import type { GraphNode, GraphEdge, RelationType } from './types';
import type { NodePosition } from '../store/graphStore';

export interface FocusLayoutOptions {
  centerX?: number;
  centerY?: number;
  centerZ?: number;
  rankSep?: number;
  nodeSep?: number;
  layerSep?: number;
}

export interface LayoutResult {
  positions: Map<string, NodePosition>;
  depths: Map<string, number>;
}

const MAIN_PLANE_TYPES: RelationType[] = [
  'raw_material_for',
  'can_be_processed_into',
  'made_of',
];

const UP_TYPES: RelationType[] = ['applied_in'];
const DOWN_TYPES: RelationType[] = ['equipment_for'];
const FRONT_TYPES: RelationType[] = ['downstream_of', 'consumable_for'];
const BACK_TYPES: RelationType[] = ['upstream_of'];

export function computeFocusLayout(
  centerNode: GraphNode,
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: FocusLayoutOptions = {}
): LayoutResult {
  const {
    centerX = 0,
    centerY = 0,
    centerZ = 0,
    rankSep = 5,
    nodeSep = 2.5,
    layerSep = 4,
  } = options;

  const positions = new Map<string, NodePosition>();
  const depths = new Map<string, number>();

  positions.set(centerNode.id, { x: centerX, y: centerY, z: centerZ });
  depths.set(centerNode.id, 0);

  const adjacency: Record<string, GraphEdge[]> = {};
  nodes.forEach((node) => {
    adjacency[node.id] = [];
  });
  edges.forEach((edge) => {
    if (adjacency[edge.source]) adjacency[edge.source].push(edge);
    if (adjacency[edge.target]) adjacency[edge.target].push(edge);
  });

  const visited = new Set<string>([centerNode.id]);
  const queue: Array<{ id: string; depth: number }> = [{ id: centerNode.id, depth: 0 }];

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    const nodeEdges = adjacency[id] || [];

    for (const edge of nodeEdges) {
      const neighborId = edge.source === id ? edge.target : edge.source;
      if (visited.has(neighborId)) continue;
      if (!nodes.find((n) => n.id === neighborId)) continue;

      visited.add(neighborId);
      depths.set(neighborId, depth + 1);
      queue.push({ id: neighborId, depth: depth + 1 });

      const pos = calculateNodePosition(
        edge.relation_type,
        edge.source === id,
        depth + 1,
        centerX,
        centerY,
        centerZ,
        rankSep,
        nodeSep,
        layerSep,
        positions,
        adjacency,
        neighborId
      );

      positions.set(neighborId, pos);
    }
  }

  return { positions, depths };
}

function calculateNodePosition(
  relationType: RelationType,
  isOutgoing: boolean,
  depth: number,
  cx: number,
  cy: number,
  cz: number,
  rankSep: number,
  nodeSep: number,
  layerSep: number,
  existingPositions: Map<string, NodePosition>,
  adjacency: Record<string, GraphEdge[]>,
  nodeId: string
): NodePosition {
  const dist = depth * rankSep;

  if (MAIN_PLANE_TYPES.includes(relationType)) {
    const x = isOutgoing ? cx + dist : cx - dist;
    const y = getOffsetY(nodeId, existingPositions, x, nodeSep);
    return { x, y, z: cz };
  }

  if (UP_TYPES.includes(relationType)) {
    const y = cy + dist;
    const x = getOffsetX(nodeId, existingPositions, y, nodeSep);
    return { x, y, z: cz + depth * 0.5 };
  }

  if (DOWN_TYPES.includes(relationType)) {
    const y = cy - dist;
    const x = getOffsetX(nodeId, existingPositions, y, nodeSep);
    return { x, y, z: cz - depth * 0.5 };
  }

  if (FRONT_TYPES.includes(relationType)) {
    const z = cz + dist;
    const angle = getAngleOffset(nodeId, existingPositions, z, nodeSep, 'front');
    return {
      x: cx + Math.cos(angle) * depth * 1.5,
      y: cy + Math.sin(angle) * depth * 1.2,
      z,
    };
  }

  if (BACK_TYPES.includes(relationType)) {
    const z = cz - dist;
    const angle = getAngleOffset(nodeId, existingPositions, z, nodeSep, 'back');
    return {
      x: cx + Math.cos(angle) * depth * 1.5,
      y: cy + Math.sin(angle) * depth * 1.2,
      z,
    };
  }

  const angle = hashAngle(nodeId) + depth * 0.7;
  const radius = dist * 1.2;
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle * 0.8) * radius * 0.7,
    z: cz + Math.sin(angle * 1.3) * depth * layerSep * 0.6,
  };
}

function getOffsetY(
  nodeId: string,
  positions: Map<string, NodePosition>,
  targetX: number,
  nodeSep: number
): number {
  const sameXNodes: string[] = [];
  positions.forEach((pos, id) => {
    if (Math.abs(pos.x - targetX) < 0.1) sameXNodes.push(id);
  });

  const count = sameXNodes.length;
  if (count === 0) return 0;

  const totalHeight = (count - 1) * nodeSep;
  const index = hashIndex(nodeId, count);
  return -totalHeight / 2 + index * nodeSep;
}

function getOffsetX(
  nodeId: string,
  positions: Map<string, NodePosition>,
  targetY: number,
  nodeSep: number
): number {
  const sameYNodes: string[] = [];
  positions.forEach((pos, id) => {
    if (Math.abs(pos.y - targetY) < 0.1) sameYNodes.push(id);
  });

  const count = sameYNodes.length;
  if (count === 0) return 0;

  const totalWidth = (count - 1) * nodeSep;
  const index = hashIndex(nodeId, count);
  return -totalWidth / 2 + index * nodeSep;
}

function getAngleOffset(
  nodeId: string,
  positions: Map<string, NodePosition>,
  targetZ: number,
  nodeSep: number,
  side: 'front' | 'back'
): number {
  const sameZNds: string[] = [];
  positions.forEach((pos, id) => {
    if (Math.abs(pos.z - targetZ) < 0.1) sameZNds.push(id);
  });

  const count = sameZNds.length;
  const baseAngle = side === 'front' ? 0 : Math.PI;
  const spread = Math.PI * 0.6;

  if (count <= 1) return baseAngle;

  const index = hashIndex(nodeId, count);
  return baseAngle - spread / 2 + (index / (count - 1)) * spread;
}

function hashIndex(str: string, max: number): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash) % max;
}

function hashAngle(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return (Math.abs(hash) % 1000) / 1000 * Math.PI * 2;
}

export function computeAmbientLayout(
  nodes: GraphNode[],
  options: { radius?: number; centerX?: number; centerY?: number; centerZ?: number } = {}
): LayoutResult {
  const { radius = 30, centerX = 0, centerY = 0, centerZ = 0 } = options;
  const positions = new Map<string, NodePosition>();
  const depths = new Map<string, number>();

  nodes.forEach((node, i) => {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / nodes.length);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;

    const r = radius * (0.7 + Math.random() * 0.3);
    const x = centerX + r * Math.sin(phi) * Math.cos(theta);
    const y = centerY + r * Math.sin(phi) * Math.sin(theta) * 0.6;
    const z = centerZ + r * Math.cos(phi) * 0.8;

    positions.set(node.id, { x, y, z });
    depths.set(node.id, 99);
  });

  return { positions, depths };
}
