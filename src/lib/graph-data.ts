import graphDataJson from '../data/graph-data.json';
import type {
  GraphData,
  GraphNode,
  GraphEdge,
  GraphDataProvider,
  ChainView,
  NodeChainSummary,
  RelationType,
  Alias,
  ChainDef,
  EdgeRole,
  RelationFlow,
} from './types';
import { CHAIN_DEFS, RELATION_FLOW, getEffectiveFlow as getFlowForType, isMainAxisRelation, isBranchRelation } from './chains';

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

  searchNodes(query: string, chainId?: string, limit: number = 20): GraphNode[] {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return [];

    const results: GraphNode[] = [];
    for (const node of this.data.nodes) {
      if (this.matchesSearch(node, lowerQuery)) {
        results.push(node);
      }
      if (results.length >= limit) break;
    }
    return results;
  }

  matchesSearch(node: GraphNode, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    if (node.name.toLowerCase().includes(lowerQuery)) return true;
    if (node.aliases?.some((a) => a.term.toLowerCase().includes(lowerQuery))) return true;
    if (node.contextual_names?.some((c) => c.term.toLowerCase().includes(lowerQuery))) return true;
    return false;
  }

  getDisplayName(nodeId: string, chainId?: string): string {
    const node = this.nodeMap.get(this.resolveNodeId(nodeId));
    if (!node) return nodeId;
    if (chainId && node.contextual_names) {
      const cn = node.contextual_names.find((c) => c.chain_id === chainId);
      if (cn) return cn.term;
    }
    return node.name;
  }

  getNodeAliases(nodeId: string): Alias[] {
    const node = this.nodeMap.get(this.resolveNodeId(nodeId));
    return node?.aliases ?? [];
  }

  resolveNodeId(id: string): string {
    const node = this.nodeMap.get(id);
    if (node?.merged_into) {
      return this.resolveNodeId(node.merged_into);
    }
    return id;
  }

  getChainDef(chainId: string): ChainDef | undefined {
    return CHAIN_DEFS[chainId];
  }

  getViewableChains(): ChainDef[] {
    return Object.values(CHAIN_DEFS).filter((c) => c.is_viewable);
  }

  getNodeChains(nodeId: string): string[] {
    const node = this.nodeMap.get(this.resolveNodeId(nodeId));
    return node?.chains ?? [];
  }

  getNodePrimaryChain(nodeId: string): string | undefined {
    const node = this.nodeMap.get(this.resolveNodeId(nodeId));
    return node?.primary_chain;
  }

  getMainAxisNodes(centerNodeId: string, chainId: string): {
    upstream: GraphNode[][];
    center: GraphNode;
    downstream: GraphNode[][];
  } {
    const resolvedId = this.resolveNodeId(centerNodeId);
    const center = this.nodeMap.get(resolvedId);
    if (!center) throw new Error(`Node not found: ${centerNodeId}`);

    const chainDef = CHAIN_DEFS[chainId];
    if (!chainDef) return { upstream: [], center, downstream: [] };

    const mainAxisTypes = new Set<string>();
    for (const rel of chainDef.main_axis_relations) {
      mainAxisTypes.add(typeof rel === 'string' ? rel : rel.type);
    }

    const upstream: GraphNode[][] = [];
    const downstream: GraphNode[][] = [];

    const bfs = (startId: string, direction: 'up' | 'down'): GraphNode[][] => {
      const layers: GraphNode[][] = [];
      const visited = new Set<string>([startId]);
      let currentQueue: string[] = [startId];

      while (currentQueue.length > 0) {
        const nextQueue: string[] = [];
        const layerNodes: GraphNode[] = [];

        for (const nodeId of currentQueue) {
          const edges = this.adjacencyList.get(nodeId) ?? [];
          for (const edge of edges) {
            if (!mainAxisTypes.has(edge.relation_type)) continue;

            const flow = getFlowForType(edge.relation_type, chainId);
            let neighborId: string | null = null;
            let isForward: boolean = false;

            if (flow === 'upstream_to_downstream') {
              if (edge.source === nodeId) { neighborId = edge.target; isForward = true; }
              else if (edge.target === nodeId) { neighborId = edge.source; isForward = false; }
              else { neighborId = null; isForward = false; }
            } else if (flow === 'downstream_to_upstream') {
              if (edge.target === nodeId) { neighborId = edge.source; isForward = true; }
              else if (edge.source === nodeId) { neighborId = edge.target; isForward = false; }
              else { neighborId = null; isForward = false; }
            } else {
              neighborId = null;
              isForward = false;
              continue;
            }

            if (!neighborId || visited.has(neighborId)) continue;
            visited.add(neighborId);

            const goesDownstream = (direction === 'down') === isForward;
            if (goesDownstream) {
              const resolved = this.resolveNodeId(neighborId);
              const neighbor = this.nodeMap.get(resolved);
              if (neighbor) {
                layerNodes.push(neighbor);
                nextQueue.push(neighborId);
              }
            }
          }
        }

        if (layerNodes.length > 0) layers.push(layerNodes);
        currentQueue = nextQueue;
      }
      return layers;
    };

    return {
      upstream: bfs(resolvedId, 'up'),
      center,
      downstream: bfs(resolvedId, 'down'),
    };
  }

  getBranchNodes(mainAxisNodeIds: Set<string>, chainId: string): GraphNode[] {
    const chainDef = CHAIN_DEFS[chainId];
    if (!chainDef) return [];

    const branchTypes = new Set<string>();
    for (const rel of chainDef.branch_relations) {
      branchTypes.add(typeof rel === 'string' ? rel : rel.type);
    }

    const branchNodeIds = new Set<string>();
    for (const nodeId of Array.from(mainAxisNodeIds)) {
      const edges = this.adjacencyList.get(nodeId) ?? [];
      for (const edge of edges) {
        if (!branchTypes.has(edge.relation_type)) continue;
        const neighborId = edge.source === nodeId ? edge.target : edge.source;
        const resolved = this.resolveNodeId(neighborId);
        if (!mainAxisNodeIds.has(resolved)) {
          branchNodeIds.add(resolved);
        }
      }
    }

    return Array.from(branchNodeIds)
      .map((id) => this.nodeMap.get(id))
      .filter((n): n is GraphNode => n !== undefined);
  }

  classifyEdgeForChain(edge: GraphEdge, chainId: string, mainAxisNodeIds: Set<string>): EdgeRole {
    const chainDef = CHAIN_DEFS[chainId];
    const relType = edge.relation_type;
    const sourceResolved = this.resolveNodeId(edge.source);
    const targetResolved = this.resolveNodeId(edge.target);
    const sourceInMain = mainAxisNodeIds.has(sourceResolved);
    const targetInMain = mainAxisNodeIds.has(targetResolved);

    const flow = getFlowForType(relType, chainId);
    let upstreamNode: string;
    let downstreamNode: string;
    let direction: 'upstream' | 'downstream' | 'lateral';

    if (flow === 'upstream_to_downstream') {
      upstreamNode = sourceResolved;
      downstreamNode = targetResolved;
      direction = 'downstream';
    } else if (flow === 'downstream_to_upstream') {
      upstreamNode = targetResolved;
      downstreamNode = sourceResolved;
      direction = 'upstream';
    } else {
      upstreamNode = sourceResolved;
      downstreamNode = targetResolved;
      direction = 'lateral';
    }

    if (chainDef) {
      if (isMainAxisRelation(chainDef, relType) && sourceInMain && targetInMain) {
        return { role: 'main_axis', direction, upstreamNode, downstreamNode };
      }
      if (isBranchRelation(chainDef, relType) && (sourceInMain || targetInMain)) {
        const farNode = sourceInMain ? targetResolved : sourceResolved;
        const farNodeObj = this.nodeMap.get(farNode);
        const isCross = farNodeObj?.primary_chain != null && farNodeObj.primary_chain !== chainId;
        return {
          role: isCross ? 'cross_chain' : 'branch',
          direction,
          upstreamNode,
          downstreamNode,
        };
      }
    }

    return { role: 'outside', direction, upstreamNode, downstreamNode };
  }

  getEffectiveFlow(edge: GraphEdge, chainId?: string): RelationFlow {
    return getFlowForType(edge.relation_type, chainId);
  }

  getNodeNeighborsByFlow(nodeId: string, chainId?: string): {
    upstream: GraphNode[];
    downstream: GraphNode[];
    horizontal: GraphNode[];
  } {
    const resolvedId = this.resolveNodeId(nodeId);
    const edges = this.adjacencyList.get(resolvedId) ?? [];
    const upstream: GraphNode[] = [];
    const downstream: GraphNode[] = [];
    const horizontal: GraphNode[] = [];
    const seen = new Set<string>();

    for (const edge of edges) {
      const flow = getFlowForType(edge.relation_type, chainId);
      const neighborId = edge.source === resolvedId ? edge.target : edge.source;
      if (seen.has(neighborId)) continue;
      seen.add(neighborId);

      const resolved = this.resolveNodeId(neighborId);
      const neighbor = this.nodeMap.get(resolved);
      if (!neighbor) continue;

      if (flow === 'horizontal') {
        horizontal.push(neighbor);
      } else {
        const isSource = edge.source === resolvedId;
        const goesDownstream =
          (flow === 'upstream_to_downstream' && isSource) ||
          (flow === 'downstream_to_upstream' && !isSource);
        if (goesDownstream) downstream.push(neighbor);
        else upstream.push(neighbor);
      }
    }

    return { upstream, downstream, horizontal };
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
    const graphData = graphDataJson as GraphData;
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
  is_subclass_of: '是...子类',
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
  is_subclass_of: '#C9CDD4',
};
