import graphDataJson from '../data/graph-data.json';
import nodesDraft from '../data/nodes-draft.json';
import type {
  GraphData,
  GraphNode,
  GraphEdge,
  GraphDataProvider,
  ChainView,
  NodeChainSummary,
  RelationType,
} from './types';

class JsonDataProvider implements GraphDataProvider {
  private data: GraphData;
  private nodeMap: Map<string, GraphNode>;
  private adjacencyList: Map<string, GraphEdge[]>;
  private childrenMap: Map<string, GraphNode[]>;

  constructor(rawData: GraphData) {
    this.data = rawData;
    this.nodeMap = new Map();
    this.adjacencyList = new Map();
    this.childrenMap = new Map();
    this.buildIndexes();
  }

  private buildIndexes(): void {
    for (const node of this.data.nodes) {
      this.nodeMap.set(node.id, node);
      this.adjacencyList.set(node.id, []);

      if (node.parent_type) {
        if (!this.childrenMap.has(node.parent_type)) {
          this.childrenMap.set(node.parent_type, []);
        }
        this.childrenMap.get(node.parent_type)!.push(node);
      }
    }

    for (const edge of this.data.edges) {
      if (this.adjacencyList.has(edge.source)) {
        this.adjacencyList.get(edge.source)!.push(edge);
      }
      if (this.adjacencyList.has(edge.target)) {
        this.adjacencyList.get(edge.target)!.push(edge);
      }
    }
  }

  getGraphData(): GraphData {
    return this.data;
  }

  getNodeById(id: string): GraphNode | undefined {
    return this.nodeMap.get(id);
  }

  searchNodes(query: string): GraphNode[] {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return [];

    const results: GraphNode[] = [];
    for (const node of this.data.nodes) {
      const nameMatch = node.name.toLowerCase().includes(lowerQuery);
      const aliasMatch =
        node.aliases?.some((a) => a.term.toLowerCase().includes(lowerQuery)) ??
        false;
      if (nameMatch || aliasMatch) {
        results.push(node);
      }
      if (results.length >= 20) break;
    }
    return results;
  }

  getNodeChildren(parentId: string): GraphNode[] {
    return this.childrenMap.get(parentId) ?? [];
  }

  getNodeParent(childId: string): GraphNode | undefined {
    const child = this.nodeMap.get(childId);
    if (!child || !child.parent_type) return undefined;
    return this.nodeMap.get(child.parent_type);
  }

  getNodeNeighbors(
    nodeId: string,
    relationType?: RelationType
  ): GraphNode[] {
    const edges = this.adjacencyList.get(nodeId);
    if (!edges) return [];

    const neighborIds = new Set<string>();
    for (const edge of edges) {
      if (relationType && edge.relation_type !== relationType) continue;
      const neighborId = edge.source === nodeId ? edge.target : edge.source;
      neighborIds.add(neighborId);
    }

    return Array.from(neighborIds)
      .map((id) => this.nodeMap.get(id))
      .filter((n): n is GraphNode => n !== undefined);
  }

  getChainView(
    nodeId: string,
    relationType: RelationType,
    depth: number
  ): ChainView | undefined {
    const centerNode = this.nodeMap.get(nodeId);
    if (!centerNode) return undefined;

    const visitedNodes = new Set<string>([nodeId]);
    const queue: Array<{ id: string; currentDepth: number }> = [
      { id: nodeId, currentDepth: 0 },
    ];

    while (queue.length > 0) {
      const { id, currentDepth } = queue.shift()!;
      if (currentDepth >= depth) continue;

      const edges = this.adjacencyList.get(id) ?? [];
      for (const edge of edges) {
        if (edge.relation_type !== relationType) continue;

        let neighborId: string | null = null;
        if (edge.source === id) {
          neighborId = edge.target;
        } else if (edge.target === id) {
          neighborId = edge.source;
        }

        if (neighborId && !visitedNodes.has(neighborId)) {
          visitedNodes.add(neighborId);
          queue.push({ id: neighborId, currentDepth: currentDepth + 1 });
        }
      }
    }

    const edges = this.data.edges.filter(
      (edge) =>
        edge.relation_type === relationType &&
        visitedNodes.has(edge.source) &&
        visitedNodes.has(edge.target)
    );

    const nodes = Array.from(visitedNodes)
      .map((id) => this.nodeMap.get(id))
      .filter((n): n is GraphNode => n !== undefined);

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

    const chainCounts = new Map<string, { upstream: number; downstream: number }>();
    const edges = this.adjacencyList.get(nodeId) ?? [];

    for (const edge of edges) {
      const rt = edge.relation_type;
      if (!chainCounts.has(rt)) {
        chainCounts.set(rt, { upstream: 0, downstream: 0 });
      }
      const counts = chainCounts.get(rt)!;

      if (edge.source === nodeId) {
        counts.downstream++;
      }
      if (edge.target === nodeId) {
        counts.upstream++;
      }
    }

    const chains = Array.from(chainCounts.entries()).map(
      ([rt, counts]) => ({
        relation_type: rt as RelationType,
        upstream_count: counts.upstream,
        downstream_count: counts.downstream,
      })
    );

    return {
      node_id: nodeId,
      chains,
    };
  }
}

let dataProvider: GraphDataProvider | null = null;

export function getDataProvider(): GraphDataProvider {
  if (!dataProvider) {
    const graphData = (graphDataJson?.nodes?.length > 0
      ? graphDataJson
      : { nodes: (nodesDraft as any).nodes || nodesDraft, edges: [] }) as GraphData;
    if (!graphData.edges) {
      graphData.edges = [];
    }
    dataProvider = new JsonDataProvider(graphData);
  }
  return dataProvider;
}

export function setDataProvider(provider: GraphDataProvider): void {
  dataProvider = provider;
}

export const NODE_TYPE_COLORS: Record<string, string> = {
  material: '#00B42A',
  process: '#FF7D00',
  equipment: '#722ED1',
  product: '#0FC6C2',
  industry: '#165DFF',
  entity: '#86909C',
};

export const NODE_TYPE_LABELS: Record<string, string> = {
  material: '材料',
  process: '工艺',
  equipment: '设备',
  product: '产品',
  industry: '行业',
  entity: '实体',
};

export const RELATION_TYPE_LABELS: Record<string, string> = {
  upstream_of: '上游',
  downstream_of: '下游',
  raw_material_for: '原料供给',
  equipment_for: '设备供给',
  consumable_for: '耗材供给',
  can_be_processed_into: '可加工为',
  applied_in: '应用于',
  structurally_similar_to: '结构相似',
  made_of: '由...构成',
};

export const RELATION_TYPE_COLORS: Record<string, string> = {
  upstream_of: '#86909C',
  downstream_of: '#86909C',
  raw_material_for: '#00B42A',
  equipment_for: '#722ED1',
  consumable_for: '#FF7D00',
  can_be_processed_into: '#0FC6C2',
  applied_in: '#EB2F96',
  structurally_similar_to: '#F53F3F',
  made_of: '#86909C',
};
