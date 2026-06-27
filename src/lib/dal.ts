import seedData from '../../data/seed/pv-chain.json';
import type {
  GraphData,
  GraphNode,
  GraphEdge,
  GraphDataProvider,
  ChainView,
  NodeChainSummary,
  RelationType,
  NodeType,
} from './types';

/**
 * 万源图谱 数据访问层 (DAL)
 *
 * 所有上层（API / 组件 / 页面）访问图谱数据都应通过 getDataProvider()，
 * 不应直接 import 种子 JSON。
 *
 * 本实现读取 data/seed/pv-chain.json，并在加载时过滤掉所有以 `_` 开头的
 * 内部调试字段（如 _uncertain_type、_uncertain_relation），确保上层拿到的
 * 数据严格符合 schema v0.3。
 */

const RAW = seedData as unknown as GraphData;

/** 递归剔除对象中所有以 `_` 开头的键（含嵌套对象）。 */
function stripInternalFields<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => stripInternalFields(item)) as unknown as T;
  }
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (key.startsWith('_')) continue;
      out[key] = stripInternalFields(value);
    }
    return out as unknown as T;
  }
  return input;
}

const CLEAN_NODES: GraphNode[] = RAW.nodes.map((n) =>
  stripInternalFields<GraphNode>(n)
);
const CLEAN_EDGES: GraphEdge[] = RAW.edges.map((e) =>
  stripInternalFields<GraphEdge>(e)
);

class JsonDataProvider implements GraphDataProvider {
  private nodes: GraphNode[];
  private edges: GraphEdge[];
  private nodeMap: Map<string, GraphNode>;
  /** 节点 -> 关联的所有边（不分方向）。 */
  private adjacency: Map<string, GraphEdge[]>;
  /** parent_type -> 子节点列表。 */
  private childrenMap: Map<string, GraphNode[]>;

  constructor(nodes: GraphNode[], edges: GraphEdge[]) {
    this.nodes = nodes;
    this.edges = edges;
    this.nodeMap = new Map();
    this.adjacency = new Map();
    this.childrenMap = new Map();
    this.buildIndexes();
  }

  private buildIndexes(): void {
    for (const node of this.nodes) {
      this.nodeMap.set(node.id, node);
      this.adjacency.set(node.id, []);
      if (node.parent_type) {
        const list = this.childrenMap.get(node.parent_type) ?? [];
        list.push(node);
        this.childrenMap.set(node.parent_type, list);
      }
    }
    for (const edge of this.edges) {
      const srcList = this.adjacency.get(edge.source);
      if (srcList) srcList.push(edge);
      const tgtList = this.adjacency.get(edge.target);
      if (tgtList) tgtList.push(edge);
    }
  }

  getGraphData(): GraphData {
    return { nodes: this.nodes, edges: this.edges };
  }

  getNodeById(id: string): GraphNode | undefined {
    return this.nodeMap.get(id);
  }

  /**
   * 前缀匹配优先，其次包含匹配；同时考虑 name 与 aliases。
   * 返回结果附带类型标签由 UI 层（NODE_TYPE_LABELS）渲染。
   */
  searchNodes(query: string): GraphNode[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const prefixName: GraphNode[] = [];
    const prefixAlias: GraphNode[] = [];
    const includeName: GraphNode[] = [];
    const includeAlias: GraphNode[] = [];
    const seen = new Set<string>();

    const push = (bucket: GraphNode[], node: GraphNode) => {
      if (seen.has(node.id)) return;
      seen.add(node.id);
      bucket.push(node);
    };

    for (const node of this.nodes) {
      const name = node.name.toLowerCase();
      if (name.startsWith(q)) {
        push(prefixName, node);
      } else if (name.includes(q)) {
        push(includeName, node);
      } else {
        const aliasHit = node.aliases?.find((a) =>
          a.term.toLowerCase().includes(q)
        );
        if (aliasHit) {
          const term = aliasHit.term.toLowerCase();
          if (term.startsWith(q)) push(prefixAlias, node);
          else push(includeAlias, node);
        }
      }
      if (
        prefixName.length +
          prefixAlias.length +
          includeName.length +
          includeAlias.length >=
        50
      ) {
        break;
      }
    }

    return [...prefixName, ...prefixAlias, ...includeName, ...includeAlias].slice(
      0,
      20
    );
  }

  getNodeChildren(parentId: string): GraphNode[] {
    return this.childrenMap.get(parentId) ?? [];
  }

  getNodeParent(childId: string): GraphNode | undefined {
    const child = this.nodeMap.get(childId);
    if (!child || !child.parent_type) return undefined;
    return this.nodeMap.get(child.parent_type);
  }

  getNodeNeighbors(nodeId: string, relationType?: RelationType): GraphNode[] {
    const edges = this.adjacency.get(nodeId);
    if (!edges) return [];
    const ids = new Set<string>();
    for (const edge of edges) {
      if (relationType && edge.relation_type !== relationType) continue;
      const other = edge.source === nodeId ? edge.target : edge.source;
      ids.add(other);
    }
    return Array.from(ids)
      .map((id) => this.nodeMap.get(id))
      .filter((n): n is GraphNode => Boolean(n));
  }

  getChainView(
    nodeId: string,
    relationType: RelationType,
    depth: number
  ): ChainView | undefined {
    const centerNode = this.nodeMap.get(nodeId);
    if (!centerNode) return undefined;

    const visited = new Set<string>([nodeId]);
    const queue: Array<{ id: string; d: number }> = [
      { id: nodeId, d: 0 },
    ];
    while (queue.length > 0) {
      const { id, d } = queue.shift()!;
      if (d >= depth) continue;
      const edges = this.adjacency.get(id) ?? [];
      for (const edge of edges) {
        if (edge.relation_type !== relationType) continue;
        let neighbor: string | null = null;
        if (edge.source === id) neighbor = edge.target;
        else if (edge.target === id) neighbor = edge.source;
        if (neighbor && !visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ id: neighbor, d: d + 1 });
        }
      }
    }

    const nodes = Array.from(visited)
      .map((id) => this.nodeMap.get(id))
      .filter((n): n is GraphNode => Boolean(n));

    const edges = this.edges.filter(
      (e) =>
        e.relation_type === relationType &&
        visited.has(e.source) &&
        visited.has(e.target)
    );

    return {
      center_node: centerNode,
      relation_type: relationType,
      nodes,
      edges,
    };
  }

  getNodeChainSummary(nodeId: string): NodeChainSummary | undefined {
    const node = this.nodeMap.get(nodeId);
    if (!node) return undefined;
    const counts = new Map<
      RelationType,
      { upstream: number; downstream: number }
    >();
    const edges = this.adjacency.get(nodeId) ?? [];
    for (const edge of edges) {
      const rt = edge.relation_type;
      const c = counts.get(rt) ?? { upstream: 0, downstream: 0 };
      if (edge.source === nodeId) c.downstream += 1;
      if (edge.target === nodeId) c.upstream += 1;
      counts.set(rt, c);
    }
    const chains = Array.from(counts.entries()).map(([rt, c]) => ({
      relation_type: rt,
      upstream_count: c.upstream,
      downstream_count: c.downstream,
    }));
    return { node_id: nodeId, chains };
  }
}

let dataProvider: GraphDataProvider | null = null;

export function getDataProvider(): GraphDataProvider {
  if (!dataProvider) {
    dataProvider = new JsonDataProvider(CLEAN_NODES, CLEAN_EDGES);
  }
  return dataProvider;
}

export function setDataProvider(provider: GraphDataProvider): void {
  dataProvider = provider;
}

/* -------------------------------------------------------------------------- */
/* 视觉编码常量（Arco Design 色系）                                             */
/* -------------------------------------------------------------------------- */

export const NODE_TYPE_COLORS: Record<NodeType, string> = {
  material: '#00B42A',
  process: '#FF7D00',
  equipment: '#722ED1',
  product: '#0FC6C2',
  industry: '#165DFF',
  entity: '#86909C',
  demand: '#F53F3F',
};

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  material: '材料',
  process: '工艺',
  equipment: '设备',
  product: '产品',
  industry: '行业',
  entity: '实体',
  demand: '需求',
};

export const RELATION_TYPE_LABELS: Record<RelationType, string> = {
  upstream_of: '上游',
  downstream_of: '下游',
  raw_material_for: '原料供给',
  equipment_for: '设备供给',
  consumable_for: '耗材供给',
  can_be_processed_into: '可加工为',
  applied_in: '应用于',
  structurally_similar_to: '结构相似',
  made_of: '由…构成',
  satisfies: '满足',
};

export const RELATION_TYPE_COLORS: Record<RelationType, string> = {
  upstream_of: '#86909C',
  downstream_of: '#86909C',
  raw_material_for: '#00B42A',
  equipment_for: '#722ED1',
  consumable_for: '#FF7D00',
  can_be_processed_into: '#0FC6C2',
  applied_in: '#EB2F96',
  structurally_similar_to: '#F53F3F',
  made_of: '#86909C',
  satisfies: '#165DFF',
};

/** 主链关系类型——初始视图与「主链」按钮均使用它。 */
export const MAIN_CHAIN_RELATION: RelationType = 'can_be_processed_into';

/**
 * 计算主链节点 id 集合：以 can_be_processed_into 边构成的连通分量中，
 * 包含 material-industrial-silicon 的那一条主链（光伏主产业链）。
 */
export function getMainChainNodeIds(): string[] {
  const provider = getDataProvider();
  const data = provider.getGraphData();
  const chainEdges = data.edges.filter(
    (e) => e.relation_type === MAIN_CHAIN_RELATION
  );
  const adj = new Map<string, string[]>();
  for (const e of chainEdges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    if (!adj.has(e.target)) adj.set(e.target, []);
    adj.get(e.source)!.push(e.target);
    adj.get(e.target)!.push(e.source);
  }
  const start = 'material-industrial-silicon';
  if (!adj.has(start)) {
    // 退化：取任意一个主链节点
    const any = chainEdges[0]?.source;
    if (!any) return [];
    return bfsComponent(any, adj);
  }
  return bfsComponent(start, adj);
}

function bfsComponent(start: string, adj: Map<string, string[]>): string[] {
  const visited = new Set<string>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const next of adj.get(cur) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return Array.from(visited);
}
