// 万源图谱 - 数据加载与查询工具函数
// 数据源：src/data/sample-data.json（样板数据）。
// 模块加载时用 schema-validator 校验，校验失败仅在控制台打印警告，不阻断运行。

import sampleData from "@/data/sample-data.json";
import { validateGraphData } from "./schema-validator";
import type {
  GraphData,
  GraphNode,
  GraphEdge,
  NodeWithNeighbors,
} from "./types";

const data = sampleData as unknown as GraphData;

// 模块加载时校验数据，失败则打印警告（不阻断运行）
const validation = validateGraphData(sampleData);
if (!validation.valid) {
  console.warn("[graph-data] sample-data.json 校验失败：");
  validation.errors.forEach((err) => console.warn(`  - ${err}`));
}

/** 返回完整的节点和边数据 */
export function getFullGraph(): GraphData {
  return data;
}

/** 按 id 查找单个节点 */
export function getNodeById(id: string): GraphNode | null {
  return data.nodes.find((n) => n.id === id) ?? null;
}

/**
 * 返回指定节点及其直接关联的邻居节点。
 * - upstream: 通过 upstream_of / made_of 边，找到指向当前节点的源节点
 * - downstream: 通过 upstream_of / made_of 边，找到当前节点指向的目标节点
 * - related: 通过 structurally_similar_to / can_be_processed_into / applied_in 边，找到关联节点
 * - edges: 所有与该节点直接相关的边
 */
export function getNodeWithNeighbors(id: string): NodeWithNeighbors | null {
  const node = getNodeById(id);
  if (!node) return null;

  const upstream: GraphNode[] = [];
  const downstream: GraphNode[] = [];
  const related: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const edge of data.edges) {
    if (edge.source !== id && edge.target !== id) continue;
    edges.push(edge);

    const isSource = edge.source === id;
    const neighborId = isSource ? edge.target : edge.source;
    const neighbor = getNodeById(neighborId);
    if (!neighbor) continue;

    if (edge.relation_type === "upstream_of" || edge.relation_type === "made_of") {
      if (isSource) {
        // 当前节点指向目标 → 目标是下游
        downstream.push(neighbor);
      } else {
        // 源节点指向当前节点 → 源是上游
        upstream.push(neighbor);
      }
    } else if (
      edge.relation_type === "structurally_similar_to" ||
      edge.relation_type === "can_be_processed_into" ||
      edge.relation_type === "applied_in"
    ) {
      related.push(neighbor);
    }
  }

  return { node, upstream, downstream, related, edges };
}

/**
 * 在节点的 name 和 aliases.term 字段中做大小写不敏感的包含匹配。
 * 返回匹配的节点列表（最多 20 条）。
 */
export function searchNodes(keyword: string): GraphNode[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return [];

  const results = data.nodes.filter((n) => {
    if (n.name.toLowerCase().includes(kw)) return true;
    return (n.aliases ?? []).some((a) => a.term.toLowerCase().includes(kw));
  });

  return results.slice(0, 20);
}
