import type { GraphNode, GraphEdge, NodePosition } from './types';

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

      const angle = hashAngle(neighborId) + depth * 0.7;
      const dist = (depth + 1) * rankSep;
      positions.set(neighborId, {
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle * 0.8) * dist * 0.7,
        z: centerZ + Math.sin(angle * 1.3) * dist * 0.5,
      });
    }
  }

  return { positions, depths };
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
    const phi = Math.acos(1 - (2 * (i + 0.5)) / Math.max(nodes.length, 1));
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;

    const r = radius * (0.7 + (Math.abs(hashCode(node.id)) % 100) / 333);
    const x = centerX + r * Math.sin(phi) * Math.cos(theta);
    const y = centerY + r * Math.sin(phi) * Math.sin(theta) * 0.6;
    const z = centerZ + r * Math.cos(phi) * 0.8;

    positions.set(node.id, { x, y, z });
    depths.set(node.id, 99);
  });

  return { positions, depths };
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash;
}
