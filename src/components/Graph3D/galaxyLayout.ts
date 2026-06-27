import * as THREE from 'three';
import type { GraphNode, GraphEdge } from '@/lib/types';
import { NODE_TYPE_COLORS } from '@/lib/dal';

/**
 * 3D 星云宏观层布局
 *
 * 按产业分簇：每个簇在其中心坐标处用 fibonacci 球面分布聚集节点，
 * 簇间留有间距，形成"星云团块"视觉。不用力导向（50 节点无需）。
 *
 * 产业归属（基于 seed/pv-chain.json 的真实结构）：
 *   - 光伏 photovoltaic：光伏主链 + 辅材 + 设备 + 应用 + 工艺
 *   - 银浆 silver-paste：industry-silver-paste 及其银浆生产链
 *   - 化工 chemical：EVA/POE/背板/玻璃的深层化工原料（乙烯/醋酸乙烯/高碳α烯烃/PET/氟膜/石英砂）
 *   - 需求 demand：所有 demand-* 终端需求节点
 *
 * 这是基于种子数据的显式归属判断（数据中无 per-node industry 字段）。
 * 未知节点按类型/默认回落到光伏簇，保证未来扩展不崩。
 */

export type ClusterId = 'photovoltaic' | 'silver-paste' | 'chemical' | 'demand';

export const CLUSTER_LABELS: Record<ClusterId, string> = {
  photovoltaic: '光伏产业',
  'silver-paste': '银浆产业',
  chemical: '化工原料',
  demand: '终端需求',
};

export const CLUSTER_ACCENT_COLORS: Record<ClusterId, string> = {
  photovoltaic: '#0FC6C2',
  'silver-paste': '#FFC53D',
  chemical: '#722ED1',
  demand: '#F53F3F',
};

/** 各簇中心坐标（世界空间）。银浆靠近光伏以缩短跨产业桥线。 */
const CLUSTER_CENTERS: Record<ClusterId, [number, number, number]> = {
  photovoltaic: [0, 0, 0],
  'silver-paste': [17, 6, 3],
  chemical: [-16, -4, -5],
  demand: [5, -14, 7],
};

/** 各簇球面分布半径（按节点数量级设定）。 */
const CLUSTER_RADIUS: Record<ClusterId, number> = {
  photovoltaic: 11,
  'silver-paste': 6.5,
  chemical: 5,
  demand: 4.5,
};

/** 银浆产业成员（canonical_id 集合，来自 seed 数据）。 */
const SILVER_PASTE_IDS = new Set<string>([
  'industry-silver-paste',
  'material-silver',
  'material-silver-nitrate',
  'material-silver-powder',
  'material-glass-powder',
  'material-organic-vehicle',
  'material-terpineol',
  'material-ethyl-cellulose',
  'material-silver-paste',
  'material-silver-paste-sp',
  'product-front-silver-paste',
  'product-rear-silver-paste',
]);

/** 化工原料簇成员（光伏辅材的深层上游化工原料）。 */
const CHEMICAL_IDS = new Set<string>([
  'material-ethylene',
  'material-vinyl-acetate',
  'material-high-carbon-alpha-olefin',
  'material-pet-film',
  'material-fluoropolymer-film',
  'material-soda-ash-quartz-sand',
]);

export function getCluster(node: GraphNode): ClusterId {
  if (node.node_type === 'demand') return 'demand';
  if (SILVER_PASTE_IDS.has(node.id)) return 'silver-paste';
  if (CHEMICAL_IDS.has(node.id)) return 'chemical';
  return 'photovoltaic';
}

/** 跨产业连接的"核心"端点（银浆↔光伏桥线的端点，视觉上加大）。 */
const HERO_ENDPOINT_IDS = new Set<string>([
  'material-silver-paste-sp',
  'product-front-silver-paste',
  'product-rear-silver-paste',
  'product-pv-cell',
]);

/** 可确定性复现的伪随机数（mulberry32），保证布局稳定。 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface HeroEdge {
  a: [number, number, number];
  b: [number, number, number];
  sourceId: string;
  targetId: string;
}

export interface ClusterCenterInfo {
  id: ClusterId;
  label: string;
  accent: string;
  position: [number, number, number];
}

export interface GalaxyLayout {
  /** 节点位置，3n。 */
  positions: Float32Array;
  /** 节点颜色（按 node_type），3n。 */
  colors: Float32Array;
  /** 节点大小（像素基数），n。 */
  sizes: Float32Array;
  /** 与数组下标对应的节点 id。 */
  ids: string[];
  nodes: GraphNode[];
  /** 主链骨架（can_be_processed_into）线段顶点，每段两点。 */
  mainChainSegments: Float32Array;
  /** 次要跨簇线段（化工→光伏 / 光伏→需求）顶点。 */
  secondarySegments: Float32Array;
  /** 次要线段每顶点颜色（3 分量）。 */
  secondaryColors: Float32Array;
  /** 核心跨产业连接（银浆↔光伏），高亮加粗。 */
  heroEdges: HeroEdge[];
  clusterCenters: ClusterCenterInfo[];
  positionById: Map<string, [number, number, number]>;
}

/**
 * 构建星云布局。
 *
 * 边在宏观层的处理（满足"只画两类边、避免杂乱"）：
 *   1. can_be_processed_into  → 主链骨架（细线，同簇）
 *   2. 跨簇边 → 视为跨产业连接：
 *      - 银浆↔光伏：核心高亮加粗线（项目核心理念）
 *      - 化工↔光伏 / 光伏↔需求：次要暗色细线（保留结构感，不喧宾夺主）
 *   3. 同簇的 raw_material_for / equipment_for / applied_in 等：不画
 */
export function buildGalaxyLayout(
  nodes: GraphNode[],
  edges: GraphEdge[]
): GalaxyLayout {
  const n = nodes.length;
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const sizes = new Float32Array(n);
  const ids: string[] = new Array(n);
  const positionById = new Map<string, [number, number, number]>();
  const nodeMap = new Map<string, GraphNode>();
  for (const nd of nodes) nodeMap.set(nd.id, nd);

  // 度数（全部关联边）→ 决定点大小
  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }

  // 按簇分组（保留输入顺序）
  const byCluster: Record<ClusterId, GraphNode[]> = {
    photovoltaic: [],
    'silver-paste': [],
    chemical: [],
    demand: [],
  };
  for (const nd of nodes) byCluster[getCluster(nd)].push(nd);

  const tmpColor = new THREE.Color();
  let idx = 0;
  const clusterOrder: ClusterId[] = [
    'photovoltaic',
    'silver-paste',
    'chemical',
    'demand',
  ];

  for (const cluster of clusterOrder) {
    const members = byCluster[cluster];
    const center = CLUSTER_CENTERS[cluster];
    const radius = CLUSTER_RADIUS[cluster];
    const rand = mulberry32(cluster.length * 9973 + members.length * 31 + 7);
    const m = members.length;

    members.forEach((nd, i) => {
      // fibonacci 球面分布
      const t = (i + 0.5) / Math.max(m, 1);
      const phi = Math.acos(1 - 2 * t);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const jitter = radius * 0.12;

      const x =
        center[0] +
        radius * Math.sin(phi) * Math.cos(theta) +
        (rand() - 0.5) * jitter;
      const y =
        center[1] +
        radius * Math.sin(phi) * Math.sin(theta) +
        (rand() - 0.5) * jitter;
      const z =
        center[2] + radius * Math.cos(phi) + (rand() - 0.5) * jitter;

      positions[idx * 3] = x;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = z;

      tmpColor.set(NODE_TYPE_COLORS[nd.node_type]);
      colors[idx * 3] = tmpColor.r;
      colors[idx * 3 + 1] = tmpColor.g;
      colors[idx * 3 + 2] = tmpColor.b;

      const d = degree.get(nd.id) ?? 0;
      let s = 6 + Math.min(d, 6) * 1.4;
      if (nd.node_type === 'industry') s += 3;
      if (nd.node_type === 'demand') s += 2;
      if (HERO_ENDPOINT_IDS.has(nd.id)) s += 4;
      sizes[idx] = Math.min(s, 22);

      ids[idx] = nd.id;
      positionById.set(nd.id, [x, y, z]);
      idx++;
    });
  }

  // 边分类
  const mainChainSegs: number[] = [];
  const secondarySegs: number[] = [];
  const secondaryCols: number[] = [];
  const heroEdges: HeroEdge[] = [];

  const chemColor = new THREE.Color('#3A4256');
  const demandColor = new THREE.Color('#2E8B87');

  for (const e of edges) {
    const pa = positionById.get(e.source);
    const pb = positionById.get(e.target);
    const sa = nodeMap.get(e.source);
    const sb = nodeMap.get(e.target);
    if (!pa || !pb || !sa || !sb) continue;

    const ca = getCluster(sa);
    const cb = getCluster(sb);
    const cross = ca !== cb;

    if (e.relation_type === 'can_be_processed_into') {
      // 主链骨架（数据中均同簇）
      mainChainSegs.push(pa[0], pa[1], pa[2], pb[0], pb[1], pb[2]);
    } else if (cross) {
      const isHero =
        (ca === 'silver-paste' && cb === 'photovoltaic') ||
        (ca === 'photovoltaic' && cb === 'silver-paste');
      if (isHero) {
        heroEdges.push({
          a: pa,
          b: pb,
          sourceId: e.source,
          targetId: e.target,
        });
      } else {
        const isDemand = ca === 'demand' || cb === 'demand';
        const c = isDemand ? demandColor : chemColor;
        secondarySegs.push(pa[0], pa[1], pa[2], pb[0], pb[1], pb[2]);
        secondaryCols.push(c.r, c.g, c.b, c.r, c.g, c.b);
      }
    }
    // 同簇非主链边：跳过（避免杂乱）
  }

  const clusterCenters: ClusterCenterInfo[] = clusterOrder.map((c) => ({
    id: c,
    label: CLUSTER_LABELS[c],
    accent: CLUSTER_ACCENT_COLORS[c],
    position: [
      CLUSTER_CENTERS[c][0],
      CLUSTER_CENTERS[c][1] + CLUSTER_RADIUS[c] + 1.8,
      CLUSTER_CENTERS[c][2],
    ],
  }));

  return {
    positions,
    colors,
    sizes,
    ids,
    nodes,
    mainChainSegments: new Float32Array(mainChainSegs),
    secondarySegments: new Float32Array(secondarySegs),
    secondaryColors: new Float32Array(secondaryCols),
    heroEdges,
    clusterCenters,
    positionById,
  };
}
