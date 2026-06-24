import type { GraphNode, GraphEdge, RelationType } from './types';
import type { NodePosition } from '../store/graphStore';

export interface LayoutOptions {
  centerX?: number;
  centerY?: number;
  centerZ?: number;
  rankSep?: number;
  nodeSep?: number;
}

export function computeChainLayout(
  centerNode: GraphNode,
  nodes: GraphNode[],
  edges: GraphEdge[],
  relationType: RelationType,
  options: LayoutOptions = {}
): Map<string, NodePosition> {
  const {
    centerX = 0,
    centerY = 0,
    centerZ = 0,
    rankSep = 5,
    nodeSep = 2.5,
  } = options;

  const positions = new Map<string, NodePosition>();

  positions.set(centerNode.id, { x: centerX, y: centerY, z: centerZ });

  const adjacency: Record<string, GraphEdge[]> = {};
  nodes.forEach((node) => {
    adjacency[node.id] = [];
  });
  edges.forEach((edge) => {
    if (edge.relation_type !== relationType) return;
    if (adjacency[edge.source]) {
      adjacency[edge.source].push(edge);
    }
    if (adjacency[edge.target]) {
      adjacency[edge.target].push(edge);
    }
  });

  const upstreamNodes: string[] = [];
  const downstreamNodes: string[] = [];
  const visited: Record<string, boolean> = { [centerNode.id]: true };
  const queue: Array<{ id: string; depth: number; direction: 'up' | 'down' }> = [];

  const centerEdges = adjacency[centerNode.id] || [];
  centerEdges.forEach((edge) => {
    const neighborId =
      edge.source === centerNode.id ? edge.target : edge.source;
    if (visited[neighborId]) return;

    const isDownstream = edge.source === centerNode.id;
    const direction = isDownstream ? 'down' : 'up';

    visited[neighborId] = true;
    queue.push({ id: neighborId, depth: 1, direction });

    if (direction === 'down') {
      downstreamNodes.push(neighborId);
    } else {
      upstreamNodes.push(neighborId);
    }
  });

  while (queue.length > 0) {
    const { id, depth, direction } = queue.shift()!;
    const nodeEdges = adjacency[id] || [];

    nodeEdges.forEach((edge) => {
      const neighborId = edge.source === id ? edge.target : edge.source;
      if (visited[neighborId]) return;

      visited[neighborId] = true;
      queue.push({ id: neighborId, depth: depth + 1, direction });

      if (direction === 'down') {
        downstreamNodes.push(neighborId);
      } else {
        upstreamNodes.push(neighborId);
      }
    });
  }

  const upRanks: Record<string, number> = {};
  const downRanks: Record<string, number> = {};

  const visitedUp: Record<string, boolean> = { [centerNode.id]: true };
  const upQueue: Array<{ id: string; depth: number }> = [];
  upstreamNodes.forEach((id) => {
    if (!visitedUp[id]) {
      visitedUp[id] = true;
      upQueue.push({ id, depth: 1 });
      upRanks[id] = 1;
    }
  });
  while (upQueue.length > 0) {
    const { id, depth } = upQueue.shift()!;
    const nodeEdges = adjacency[id] || [];
    nodeEdges.forEach((edge) => {
      const neighborId = edge.source === id ? edge.target : edge.source;
      if (visitedUp[neighborId]) return;
      if (upstreamNodes.indexOf(neighborId) === -1) return;
      visitedUp[neighborId] = true;
      upRanks[neighborId] = depth + 1;
      upQueue.push({ id: neighborId, depth: depth + 1 });
    });
  }

  const visitedDown: Record<string, boolean> = { [centerNode.id]: true };
  const downQueue: Array<{ id: string; depth: number }> = [];
  downstreamNodes.forEach((id) => {
    if (!visitedDown[id]) {
      visitedDown[id] = true;
      downQueue.push({ id, depth: 1 });
      downRanks[id] = 1;
    }
  });
  while (downQueue.length > 0) {
    const { id, depth } = downQueue.shift()!;
    const nodeEdges = adjacency[id] || [];
    nodeEdges.forEach((edge) => {
      const neighborId = edge.source === id ? edge.target : edge.source;
      if (visitedDown[neighborId]) return;
      if (downstreamNodes.indexOf(neighborId) === -1) return;
      visitedDown[neighborId] = true;
      downRanks[neighborId] = depth + 1;
      downQueue.push({ id: neighborId, depth: depth + 1 });
    });
  }

  const upRankValues = Object.keys(upRanks).map((k) => upRanks[k]);
  const downRankValues = Object.keys(downRanks).map((k) => downRanks[k]);
  const maxUpRank = upRankValues.length > 0 ? Math.max(...upRankValues) : 0;
  const maxDownRank = downRankValues.length > 0 ? Math.max(...downRankValues) : 0;

  const upByRank: Record<number, string[]> = {};
  Object.keys(upRanks).forEach((id) => {
    const rank = upRanks[id];
    if (!upByRank[rank]) upByRank[rank] = [];
    upByRank[rank].push(id);
  });

  const downByRank: Record<number, string[]> = {};
  Object.keys(downRanks).forEach((id) => {
    const rank = downRanks[id];
    if (!downByRank[rank]) downByRank[rank] = [];
    downByRank[rank].push(id);
  });

  for (let rank = 1; rank <= maxUpRank; rank++) {
    const ids = upByRank[rank] || [];
    const totalWidth = (ids.length - 1) * nodeSep;
    const startY = centerY - totalWidth / 2;
    const x = centerX - rank * rankSep;

    ids.forEach((id, i) => {
      positions.set(id, {
        x,
        y: startY + i * nodeSep,
        z: centerZ,
      });
    });
  }

  for (let rank = 1; rank <= maxDownRank; rank++) {
    const ids = downByRank[rank] || [];
    const totalWidth = (ids.length - 1) * nodeSep;
    const startY = centerY - totalWidth / 2;
    const x = centerX + rank * rankSep;

    ids.forEach((id, i) => {
      positions.set(id, {
        x,
        y: startY + i * nodeSep,
        z: centerZ,
      });
    });
  }

  nodes.forEach((node) => {
    if (!positions.has(node.id)) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 15 + Math.random() * 10;
      positions.set(node.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius * 0.6,
        z: centerZ + (Math.random() - 0.5) * 10,
      });
    }
  });

  return positions;
}

export function computeAmbientLayout(
  nodes: GraphNode[],
  options: { radius?: number; centerX?: number; centerY?: number; centerZ?: number } = {}
): Map<string, NodePosition> {
  const { radius = 30, centerX = 0, centerY = 0, centerZ = 0 } = options;
  const positions = new Map<string, NodePosition>();

  nodes.forEach((node, i) => {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / nodes.length);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;

    const r = radius * (0.7 + Math.random() * 0.3);
    const x = centerX + r * Math.sin(phi) * Math.cos(theta);
    const y = centerY + r * Math.sin(phi) * Math.sin(theta) * 0.6;
    const z = centerZ + r * Math.cos(phi) * 0.8;

    positions.set(node.id, { x, y, z });
  });

  return positions;
}
