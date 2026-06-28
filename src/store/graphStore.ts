import { create } from 'zustand';
import type { GraphData, GraphNode, GraphEdge, ChainDef, NodePosition } from '../lib/types';
import { getGraphDataProvider } from '../lib/graph-data';

export type Vec3 = [number, number, number];

interface GraphStore {
  data: GraphData | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
  chains: ChainDef[];
  positions: Map<string, NodePosition>;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  focusChainId: string | null;
  cameraTarget: Vec3;
  cameraPosition: Vec3;
  initialCameraPosition: Vec3;
  initialCameraTarget: Vec3;
  isFlying: boolean;
  flyStartPos: Vec3;
  flyStartTarget: Vec3;
  flyEndPos: Vec3;
  flyEndTarget: Vec3;
  flyProgress: number;
  flyDuration: number;
  flyGeneration: number;
  init: () => void;
  flyTo: (nodeId: string) => void;
  resetView: () => void;
  setHovered: (id: string | null) => void;
  setSelected: (id: string | null) => void;
  startFlight: (endPos: Vec3, endTarget: Vec3) => void;
}

function computeInitialCamera(nodes: GraphNode[], positions: Map<string, NodePosition>): { position: Vec3; target: Vec3 } {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  let hasAny = false;
  for (const node of nodes) {
    const p = positions.get(node.id);
    if (!p) continue;
    hasAny = true;
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  if (!hasAny) {
    return { position: [0, 30, 60], target: [0, 0, 0] };
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  const sizeX = maxX - minX;
  const sizeY = maxY - minY;
  const sizeZ = maxZ - minZ;
  const maxDim = Math.max(sizeX, sizeY, sizeZ, 30);
  const dist = maxDim * 1.3;
  return { position: [cx, cy + dist * 0.25, cz + dist], target: [cx, cy, cz] };
}

function pcaMainDirection(nodes: GraphNode[], positions: Map<string, NodePosition>): Vec3 {
  if (nodes.length < 2) return [0, 0, 1];
  let cx = 0, cy = 0, cz = 0;
  for (const n of nodes) {
    const p = positions.get(n.id);
    if (!p) continue;
    cx += p.x; cy += p.y; cz += p.z;
  }
  cx /= nodes.length; cy /= nodes.length; cz /= nodes.length;
  let xx = 0, yy = 0, zz = 0, xy = 0, xz = 0, yz = 0;
  for (const n of nodes) {
    const p = positions.get(n.id);
    if (!p) continue;
    const dx = p.x - cx, dy = p.y - cy, dz = p.z - cz;
    xx += dx * dx; yy += dy * dy; zz += dz * dz;
    xy += dx * dy; xz += dx * dz; yz += dy * dz;
  }
  const n = nodes.length;
  const mat = [
    [xx / n, xy / n, xz / n],
    [xy / n, yy / n, yz / n],
    [xz / n, yz / n, zz / n],
  ];
  let vec: Vec3 = [1, 0, 0];
  for (let i = 0; i < 20; i++) {
    const nx = mat[0][0] * vec[0] + mat[0][1] * vec[1] + mat[0][2] * vec[2];
    const ny = mat[1][0] * vec[0] + mat[1][1] * vec[1] + mat[1][2] * vec[2];
    const nz = mat[2][0] * vec[0] + mat[2][1] * vec[1] + mat[2][2] * vec[2];
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    vec = [nx / len, ny / len, nz / len];
  }
  return vec;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  data: null,
  nodes: [],
  edges: [],
  chains: [],
  positions: new Map(),
  selectedNodeId: null,
  hoveredNodeId: null,
  focusChainId: null,
  cameraTarget: [0, 0, 0],
  cameraPosition: [0, 30, 60],
  initialCameraPosition: [0, 30, 60],
  initialCameraTarget: [0, 0, 0],
  isFlying: false,
  flyStartPos: [0, 0, 0],
  flyStartTarget: [0, 0, 0],
  flyEndPos: [0, 0, 0],
  flyEndTarget: [0, 0, 0],
  flyProgress: 0,
  flyDuration: 1,
  flyGeneration: 0,

  init: () => {
    const provider = getGraphDataProvider();
    const data = provider.getGraphData();
    const posMap = new Map<string, NodePosition>();
    if (data.positions) {
      for (const [id, pos] of Object.entries(data.positions)) {
        posMap.set(id, pos);
      }
    }
    const chains = provider.getViewableChains();
    const { position: initPos, target: initTarget } = computeInitialCamera(data.nodes, posMap);
    set({
      data,
      nodes: data.nodes,
      edges: data.edges,
      chains,
      positions: posMap,
      cameraPosition: initPos,
      cameraTarget: initTarget,
      initialCameraPosition: initPos,
      initialCameraTarget: initTarget,
    });
  },

  flyTo: (nodeId: string) => {
    const { positions, nodes } = get();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const pos = positions.get(nodeId);
    if (!pos) return;
    const provider = getGraphDataProvider();
    const nodePos: Vec3 = [pos.x, pos.y, pos.z];

    const chainId = node.primary_chain;
    let viewDir: Vec3 = [0, 0.3, 1];
    let distance = 18;

    if (chainId) {
      const mainAxis = provider.getMainAxisPath(chainId);
      if (mainAxis.nodes.length >= 2) {
        const v = pcaMainDirection(mainAxis.nodes, positions);
        const up: Vec3 = [0, 1, 0];
        let side = cross(v, up);
        if (Math.abs(side[0]) < 0.01 && Math.abs(side[1]) < 0.01 && Math.abs(side[2]) < 0.01) {
          side = cross(v, [1, 0, 0]);
        }
        side = normalize(side);
        let chainLen = 0;
        for (let i = 1; i < mainAxis.nodes.length; i++) {
          const p0 = positions.get(mainAxis.nodes[i - 1].id);
          const p1 = positions.get(mainAxis.nodes[i].id);
          if (p0 && p1) {
            const d = sub([p1.x, p1.y, p1.z], [p0.x, p0.y, p0.z]);
            chainLen += Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
          }
        }
        distance = Math.max(12, Math.min(25, chainLen * 0.35));
        viewDir = normalize(add(scale(side, 0.8), scale(up, 0.25)));
      }
    }

    const endTarget: Vec3 = nodePos;
    const endPos: Vec3 = add(nodePos, scale(viewDir, distance));

    set({ focusChainId: chainId || null, selectedNodeId: nodeId });
    get().startFlight(endPos, endTarget);
  },

  startFlight: (endPos: Vec3, endTarget: Vec3) => {
    const { cameraPosition, cameraTarget, flyGeneration } = get();
    set({
      isFlying: true,
      flyStartPos: [...cameraPosition] as Vec3,
      flyStartTarget: [...cameraTarget] as Vec3,
      flyEndPos: endPos,
      flyEndTarget: endTarget,
      flyProgress: 0,
      flyDuration: 1,
      flyGeneration: flyGeneration + 1,
    });
  },

  resetView: () => {
    const { initialCameraPosition, initialCameraTarget } = get();
    set({
      selectedNodeId: null,
      focusChainId: null,
    });
    get().startFlight(initialCameraPosition, initialCameraTarget);
  },

  setHovered: (id: string | null) => set({ hoveredNodeId: id }),
  setSelected: (id: string | null) => set({ selectedNodeId: id }),
}));
