import sampleData from '../data/sample-data.json';
import { validateGraphData } from './schema-validator';
import type {
  GraphData,
  GraphNode,
  GraphEdge,
  ChainType,
  NodeChainInfo,
  ChainView,
  RelationType,
} from './types';

let graphData: GraphData;

const validationResult = validateGraphData(sampleData);
if (!validationResult.valid) {
  console.error('Graph data validation failed:', validationResult.errors);
  throw new Error('Invalid graph data');
}
graphData = sampleData as GraphData;

// 预构建查找索引
const nodeMap = new Map<string, GraphNode>();
graphData.nodes.forEach((node) => nodeMap.set(node.id, node));

const chainTypeMap = new Map<string, ChainType>();
graphData.chain_types.forEach((ct) => chainTypeMap.set(ct.type, ct));

/** 返回完整图数据 */
export function getGraphData(): GraphData {
  return graphData;
}

/** 获取单个节点 */
export function getNodeById(id: string): GraphNode | undefined {
  return nodeMap.get(id);
}

/** 返回该节点参与的所有链路信息 */
export function getNodeChains(nodeId: string): NodeChainInfo | undefined {
  const node = nodeMap.get(nodeId);
  if (!node) return undefined;

  // 按 relation_type 分组统计上下游数量
  const chainCounts = new Map<string, { upstream: number; downstream: number }>();

  for (const edge of graphData.edges) {
    if (edge.source !== nodeId && edge.target !== nodeId) continue;

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

  const chains = Array.from(chainCounts.entries()).map(([rt, counts]) => {
    const chainType = chainTypeMap.get(rt);
    return {
      relation_type: rt,
      chain_label: chainType?.label || rt,
      chain_color: chainType?.color || '#86909C',
      upstream_count: counts.upstream,
      downstream_count: counts.downstream,
    };
  });

  // 检测跨行业交叉
  const crossIndustryNodes = getCrossIndustryNodes(nodeId);
  const connectedIndustries = new Set<string>();
  node.industry_tags.forEach((t) => connectedIndustries.add(t));
  crossIndustryNodes.forEach((n) => {
    n.industry_tags.forEach((t) => connectedIndustries.add(t));
  });

  return {
    node_id: nodeId,
    chains,
    cross_industry: crossIndustryNodes.length > 0,
    connected_industries: Array.from(connectedIndustries),
  };
}

/** 返回指定节点在指定关系类型下的链路视图 */
export function getChainView(
  nodeId: string,
  relationType: RelationType,
  depth: number = 3
): ChainView | undefined {
  const centerNode = nodeMap.get(nodeId);
  if (!centerNode) return undefined;

  const chainType = chainTypeMap.get(relationType);

  // BFS 遍历：仅沿指定 relation_type 的边扩展
  const visitedNodes = new Set<string>([nodeId]);
  const queue: Array<{ id: string; currentDepth: number }> = [
    { id: nodeId, currentDepth: 0 },
  ];

  while (queue.length > 0) {
    const { id, currentDepth } = queue.shift()!;
    if (currentDepth >= depth) continue;

    for (const edge of graphData.edges) {
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

  // 收集所有连接已访问节点的边
  const edges = graphData.edges.filter(
    (edge) =>
      edge.relation_type === relationType &&
      visitedNodes.has(edge.source) &&
      visitedNodes.has(edge.target)
  );

  const nodes = Array.from(visitedNodes)
    .map((id) => nodeMap.get(id))
    .filter((n): n is GraphNode => n !== undefined);

  // 标记跨行业交叉点：industry_tags 与中心节点无交集
  const centerTags = new Set(centerNode.industry_tags);
  const crossIndustryNodes = nodes.filter(
    (n) => n.id !== nodeId && !n.industry_tags.some((tag) => centerTags.has(tag))
  );

  return {
    center_node: centerNode,
    relation_type: relationType,
    chain_type: chainType || {
      type: relationType,
      label: relationType,
      description: '',
      color: '#86909C',
    },
    nodes,
    edges,
    cross_industry_nodes: crossIndustryNodes,
  };
}

/** 按名称和别名搜索节点 */
export function searchNodes(query: string): GraphNode[] {
  const lowerQuery = query.toLowerCase();
  return graphData.nodes
    .filter((node) => {
      const nameMatch = node.name.toLowerCase().includes(lowerQuery);
      const aliasMatch =
        node.aliases?.some((alias) =>
          alias.toLowerCase().includes(lowerQuery)
        ) ?? false;
      return nameMatch || aliasMatch;
    })
    .slice(0, 20);
}

/** 找出与该节点连接但属于不同行业的节点 */
export function getCrossIndustryNodes(nodeId: string): GraphNode[] {
  const node = nodeMap.get(nodeId);
  if (!node) return [];

  const nodeTags = new Set(node.industry_tags);
  const result: GraphNode[] = [];
  const seen = new Set<string>();

  for (const edge of graphData.edges) {
    if (edge.source !== nodeId && edge.target !== nodeId) continue;

    const neighborId = edge.source === nodeId ? edge.target : edge.source;
    if (seen.has(neighborId)) continue;
    seen.add(neighborId);

    const neighbor = nodeMap.get(neighborId);
    if (!neighbor) continue;

    // industry_tags 无交集即为跨行业
    const hasOverlap = neighbor.industry_tags.some((tag) => nodeTags.has(tag));
    if (!hasOverlap) {
      result.push(neighbor);
    }
  }

  return result;
}
