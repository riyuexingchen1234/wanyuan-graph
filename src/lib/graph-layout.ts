import type { GraphNode, GraphEdge, RelationType } from './types';
import type { NodePosition } from '../store/graphStore';

export interface FocusLayoutOptions {
  centerX?: number;
  centerY?: number;
  centerZ?: number;
  mainGap?: number;
  branchConeAngle?: number;
  branchMinDepth?: number;
  branchMaxDepth?: number;
  mainPlaneZ?: number;
  ancestorOffsetY?: number;
}

export interface LayoutResult {
  positions: Map<string, NodePosition>;
  depths: Map<string, number>;
  cameraTarget: NodePosition;
  cameraDistance: number;
  mainChain: string[];
}

const MAIN_CHAIN_RELATIONS: RelationType[] = ['upstream_of', 'downstream_of'];

function pseudoRandom(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return (Math.abs(hash) % 10000) / 10000;
}

function buildAdjacency(nodes: GraphNode[], edges: GraphEdge[]) {
  const adj: Record<string, Array<{ neighborId: string; edge: GraphEdge; direction: 'up' | 'down' | 'other' }>> = {};
  nodes.forEach((n) => { adj[n.id] = []; });
  edges.forEach((edge) => {
    const isMainChain = MAIN_CHAIN_RELATIONS.includes(edge.relation_type);
    let direction: 'up' | 'down' | 'other' = 'other';
    if (isMainChain) {
      if (edge.relation_type === 'upstream_of') direction = 'down';
      else if (edge.relation_type === 'downstream_of') direction = 'up';
    } else {
      if (edge.relation_type === 'made_of') direction = 'up';
      else if (edge.relation_type === 'can_be_processed_into') direction = 'down';
      else if (edge.relation_type === 'raw_material_for') direction = 'up';
      else if (edge.relation_type === 'consumable_for') direction = 'up';
      else if (edge.relation_type === 'equipment_for') direction = 'down';
      else if (edge.relation_type === 'applied_in') direction = 'down';
    }
    adj[edge.source].push({ neighborId: edge.target, edge, direction });
    adj[edge.target].push({ neighborId: edge.source, edge, direction: direction === 'up' ? 'down' : direction === 'down' ? 'up' : 'other' });
  });
  return adj;
}

function findMainChain(
  startNode: GraphNode,
  adj: ReturnType<typeof buildAdjacency>
): string[] {
  const directChildren = new Set<string>();
  (adj[startNode.id] || []).forEach(({ neighborId }) => directChildren.add(neighborId));

  const upstreamEnds: string[] = [];
  const downstreamEnds: string[] = [];

  directChildren.forEach((id) => {
    const upstream = (adj[id] || []).filter((n) => n.direction === 'up' && directChildren.has(n.neighborId));
    const downstream = (adj[id] || []).filter((n) => n.direction === 'down' && directChildren.has(n.neighborId));
    if (upstream.length === 0 && downstream.length > 0) upstreamEnds.push(id);
    if (downstream.length === 0 && upstream.length > 0) downstreamEnds.push(id);
  });

  if (upstreamEnds.length === 0 || downstreamEnds.length === 0) {
    return Array.from(directChildren);
  }

  const chainStart = upstreamEnds[0];
  const chainOrder: string[] = [chainStart];
  const visited = new Set<string>([chainStart]);
  let current = chainStart;

  while (true) {
    const nextNodes = (adj[current] || [])
      .filter((n) => n.direction === 'down' && directChildren.has(n.neighborId) && !visited.has(n.neighborId));
    if (nextNodes.length === 0) break;
    const next = nextNodes[0].neighborId;
    chainOrder.push(next);
    visited.add(next);
    current = next;
  }

  return chainOrder;
}

export function computeIndustryFocusLayout(
  industryNode: GraphNode,
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: FocusLayoutOptions = {}
): LayoutResult {
  const {
    centerX = 0,
    centerY = 0,
    centerZ = 0,
    mainGap = 5,
    branchConeAngle = Math.PI / 5,
    branchMinDepth = 6,
    branchMaxDepth = 18,
    mainPlaneZ = 12,
    ancestorOffsetY = 10,
  } = options;

  const positions = new Map<string, NodePosition>();
  const depths = new Map<string, number>();
  const adj = buildAdjacency(nodes, edges);

  const focusX = centerX;
  const focusY = centerY;
  const focusZ = centerZ;

  const mainChain = findMainChain(industryNode, adj);
  const mainChainSet = new Set(mainChain);

  const ancestorPos = {
    x: focusX,
    y: focusY + ancestorOffsetY,
    z: focusZ + mainPlaneZ,
  };
  positions.set(industryNode.id, ancestorPos);
  depths.set(industryNode.id, 0);

  const mainCount = mainChain.length;
  const mainStartX = focusX - ((mainCount - 1) * mainGap) / 2;

  mainChain.forEach((nodeId, i) => {
    positions.set(nodeId, {
      x: mainStartX + i * mainGap,
      y: focusY,
      z: focusZ + mainPlaneZ,
    });
    depths.set(nodeId, 1);
  });

  const branchNodesByMain: Record<string, string[]> = {};
  mainChain.forEach((id) => { branchNodesByMain[id] = []; });

  const visited = new Set<string>([industryNode.id, ...mainChain]);
  const queue: Array<{ id: string; parentMainId: string; side: 'up' | 'down'; hopDist: number }> = [];

  mainChain.forEach((mainId) => {
    (adj[mainId] || []).forEach(({ neighborId, direction }) => {
      if (visited.has(neighborId)) return;
      if (direction === 'other') return;
      visited.add(neighborId);
      branchNodesByMain[mainId].push(neighborId);
      queue.push({
        id: neighborId,
        parentMainId: mainId,
        side: direction,
        hopDist: 1,
      });
    });
  });

  const upstreamByMain: Record<string, string[]> = {};
  const downstreamByMain: Record<string, string[]> = {};
  mainChain.forEach((id) => {
    upstreamByMain[id] = [];
    downstreamByMain[id] = [];
  });

  while (queue.length > 0) {
    const { id, parentMainId, side, hopDist } = queue.shift()!;
    if (side === 'up') {
      upstreamByMain[parentMainId].push(id);
    } else {
      downstreamByMain[parentMainId].push(id);
    }

    (adj[id] || []).forEach(({ neighborId, direction }) => {
      if (visited.has(neighborId)) return;
      if (mainChainSet.has(neighborId)) return;
      if (direction === 'other') return;
      visited.add(neighborId);
      queue.push({
        id: neighborId,
        parentMainId,
        side,
        hopDist: hopDist + 1,
      });
    });
  }

  const tanHalfAngle = Math.tan(branchConeAngle / 2);
  const depthRange = branchMaxDepth - branchMinDepth;

  function placeBranchNodes(
    branchList: string[],
    mainNodeId: string,
    isUpstream: boolean
  ) {
    if (branchList.length === 0) return;

    const mainPos = positions.get(mainNodeId)!;
    const thetaStart = isUpstream ? 0.05 : Math.PI + 0.05;
    const thetaEnd = isUpstream ? Math.PI - 0.05 : 2 * Math.PI - 0.05;

    branchList.forEach((nodeId, idx) => {
      let theta: number;
      if (branchList.length === 1) {
        theta = isUpstream ? Math.PI / 2 : (3 * Math.PI) / 2;
      } else {
        const t = idx / (branchList.length - 1);
        theta = thetaStart + t * (thetaEnd - thetaStart);
        theta += (pseudoRandom(nodeId) - 0.5) * 0.3;
      }

      const sinTheta = Math.sin(theta);
      const depth = branchMinDepth + Math.abs(sinTheta) * depthRange;
      const r = depth * tanHalfAngle;

      const xOff = r * Math.cos(theta);
      const yOff = r * sinTheta;
      const zOff = -depth;

      const hopJitter = (pseudoRandom(nodeId + 'j') - 0.5) * 0.8;

      positions.set(nodeId, {
        x: mainPos.x + xOff + hopJitter,
        y: mainPos.y + yOff + hopJitter * 0.5,
        z: mainPos.z + zOff,
      });
      depths.set(nodeId, isUpstream ? 2 : 2);
    });
  }

  mainChain.forEach((mainId) => {
    placeBranchNodes(upstreamByMain[mainId], mainId, true);
    placeBranchNodes(downstreamByMain[mainId], mainId, false);
  });

  nodes.forEach((n) => {
    if (!positions.has(n.id)) {
      const rand = pseudoRandom(n.id);
      const rand2 = pseudoRandom(n.id + '2');
      const theta = rand * Math.PI * 2;
      const phi = Math.acos(2 * rand2 - 1);
      const r = 40 + rand * 15;
      positions.set(n.id, {
        x: focusX + r * Math.sin(phi) * Math.cos(theta),
        y: focusY + r * Math.sin(phi) * Math.sin(theta) * 0.5,
        z: focusZ + r * Math.cos(phi) * 0.6 - 20,
      });
      depths.set(n.id, 10);
    }
  });

  return {
    positions,
    depths,
    cameraTarget: { x: focusX, y: focusY + 2, z: focusZ + mainPlaneZ - 2 },
    cameraDistance: 42,
    mainChain,
  };
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
    mainGap = 5,
  } = options;

  if (centerNode.node_type === 'industry') {
    return computeIndustryFocusLayout(centerNode, nodes, edges, options);
  }

  const positions = new Map<string, NodePosition>();
  const depths = new Map<string, number>();
  const adj = buildAdjacency(nodes, edges);

  positions.set(centerNode.id, { x: centerX, y: centerY, z: centerZ });
  depths.set(centerNode.id, 0);

  const upstreamNodes: string[] = [];
  const downstreamNodes: string[] = [];
  const otherNodes: string[] = [];

  const visited = new Set<string>([centerNode.id]);

  function collectDirectional(startId: string, collected: string[], targetDir: 'up' | 'down') {
    const q: Array<{ id: string; depth: number }> = [{ id: startId, depth: 1 }];
    const v = new Set<string>([centerNode.id]);
    while (q.length > 0) {
      const { id, depth } = q.shift()!;
      (adj[id] || []).forEach(({ neighborId, direction }) => {
        if (v.has(neighborId)) return;
        if (direction !== targetDir && direction !== 'other') {
          if (direction === (targetDir === 'up' ? 'down' : 'up')) return;
        }
        v.add(neighborId);
        collected.push(neighborId);
        depths.set(neighborId, depth);
        q.push({ id: neighborId, depth: depth + 1 });
      });
    }
  }

  (adj[centerNode.id] || []).forEach(({ neighborId, direction }) => {
    if (visited.has(neighborId)) return;
    visited.add(neighborId);
    if (direction === 'up') {
      upstreamNodes.push(neighborId);
      depths.set(neighborId, 1);
    } else if (direction === 'down') {
      downstreamNodes.push(neighborId);
      depths.set(neighborId, 1);
    } else {
      otherNodes.push(neighborId);
      depths.set(neighborId, 1);
    }
  });

  function expandDirection(startIds: string[], dir: 'up' | 'down', collected: string[]) {
    const q = startIds.map((id) => ({ id, depth: depths.get(id) || 1 }));
    while (q.length > 0) {
      const { id, depth } = q.shift()!;
      (adj[id] || []).forEach(({ neighborId, direction }) => {
        if (visited.has(neighborId)) return;
        if (direction !== dir && direction !== 'other') return;
        visited.add(neighborId);
        collected.push(neighborId);
        depths.set(neighborId, depth + 1);
        q.push({ id: neighborId, depth: depth + 1 });
      });
    }
  }

  expandDirection(upstreamNodes, 'up', upstreamNodes);
  expandDirection(downstreamNodes, 'down', downstreamNodes);
  expandDirection(otherNodes, 'other', otherNodes);

  function placeLinear(nodeIds: string[], direction: number) {
    const byDepth: Record<number, string[]> = {};
    nodeIds.forEach((id) => {
      const d = depths.get(id) || 1;
      if (!byDepth[d]) byDepth[d] = [];
      byDepth[d].push(id);
    });

    Object.entries(byDepth).forEach(([dStr, ids]) => {
      const d = parseInt(dStr);
      const totalHeight = (ids.length - 1) * 3;
      ids.forEach((id, i) => {
        const rand = pseudoRandom(id);
        positions.set(id, {
          x: centerX + direction * d * mainGap,
          y: centerY - totalHeight / 2 + i * 3 + (rand - 0.5) * 0.5,
          z: centerZ + 12,
        });
      });
    });
  }

  placeLinear(upstreamNodes, -1);
  placeLinear(downstreamNodes, 1);

  otherNodes.forEach((id, i) => {
    const angle = pseudoRandom(id) * Math.PI * 2;
    const dist = (depths.get(id) || 1) * 4;
    positions.set(id, {
      x: centerX + Math.cos(angle) * dist,
      y: centerY + Math.sin(angle) * dist,
      z: centerZ + 12 - Math.abs(Math.sin(angle)) * 4,
    });
  });

  nodes.forEach((n) => {
    if (!positions.has(n.id)) {
      const rand = pseudoRandom(n.id);
      const rand2 = pseudoRandom(n.id + '2');
      positions.set(n.id, {
        x: centerX + (rand - 0.5) * 60,
        y: centerY + (rand2 - 0.5) * 40,
        z: centerZ - 10 - rand * 20,
      });
      depths.set(n.id, 10);
    }
  });

  return {
    positions,
    depths,
    cameraTarget: { x: centerX, y: centerY, z: centerZ + 10 },
    cameraDistance: 35,
    mainChain: [],
  };
}

export function computeAmbientLayout(
  nodes: GraphNode[],
  options: { radius?: number; centerX?: number; centerY?: number; centerZ?: number } = {}
): LayoutResult {
  const { radius = 40, centerX = 0, centerY = 0, centerZ = -60 } = options;
  const positions = new Map<string, NodePosition>();
  const depths = new Map<string, number>();

  nodes.forEach((node, i) => {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / nodes.length);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;

    const r = radius * (0.7 + pseudoRandom(node.id) * 0.3);
    const x = centerX + r * Math.sin(phi) * Math.cos(theta);
    const y = centerY + r * Math.sin(phi) * Math.sin(theta) * 0.5;
    const z = centerZ + r * Math.cos(phi) * 0.8;

    positions.set(node.id, { x, y, z });
    depths.set(node.id, 99);
  });

  return {
    positions,
    depths,
    cameraTarget: { x: 0, y: 0, z: -80 },
    cameraDistance: 100,
    mainChain: [],
  };
}
