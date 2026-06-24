import * as fs from 'fs';
import * as path from 'path';
import type { CrawledNode, CrawledEdge, CrawlResult } from './types';
import type { GraphNode, GraphEdge, SourceType } from '../../src/lib/types';

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateId(type: string, name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[\s/\\()（）·]+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${type}-${slug}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function saveJSON(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function loadJSON<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return null;
  }
}

export function createSource(
  sourceType: SourceType,
  description: string,
  url?: string
): { source_type: SourceType; description: string; url?: string; retrieved_at: string } {
  return {
    source_type: sourceType,
    description,
    ...(url ? { url } : {}),
    retrieved_at: nowISO(),
  };
}

export function crawledNodeToGraphNode(node: CrawledNode): GraphNode {
  const now = nowISO();
  return {
    id: node.id,
    name: node.name,
    definition: node.definition,
    node_type: node.node_type,
    stage: 'draft',
    parent_type: node.parent_type,
    ...(node.aliases && node.aliases.length > 0 ? { aliases: node.aliases } : {}),
    sources: node.sources,
    created_at: now,
    updated_at: now,
  };
}

export function crawledEdgeToGraphEdge(
  edge: CrawledEdge,
  index: number
): GraphEdge {
  const now = nowISO();
  return {
    id: `edge-${edge.source}-${edge.target}-${edge.relation_type}-${index}`,
    source: edge.source,
    target: edge.target,
    relation_type: edge.relation_type,
    verification_status: edge.verification_status,
    evidence: edge.evidence,
    ...(edge.note ? { note: edge.note } : {}),
    created_at: now,
    updated_at: now,
  };
}

export function mergeCrawlResults(results: CrawlResult[]): CrawlResult {
  const nodeMap = new Map<string, CrawledNode>();
  const edgeMap = new Map<string, CrawledEdge>();

  for (const result of results) {
    for (const node of result.nodes) {
      const existing = nodeMap.get(node.id);
      if (existing) {
        const mergedSources = [...existing.sources];
        for (const s of node.sources) {
          if (!mergedSources.some(ms => ms.url === s.url && ms.description === s.description)) {
            mergedSources.push(s);
          }
        }
        nodeMap.set(node.id, { ...existing, sources: mergedSources });
      } else {
        nodeMap.set(node.id, node);
      }
    }
    for (const edge of result.edges) {
      const key = `${edge.source}-${edge.target}-${edge.relation_type}`;
      const existing = edgeMap.get(key);
      if (existing) {
        const mergedEvidence = [...existing.evidence];
        for (const e of edge.evidence) {
          if (!mergedEvidence.some(me => me.url === e.url && me.description === e.description)) {
            mergedEvidence.push(e);
          }
        }
        edgeMap.set(key, { ...existing, evidence: mergedEvidence });
      } else {
        edgeMap.set(key, edge);
      }
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
    metadata: {
      source: 'merged',
      source_url: '',
      crawled_at: nowISO(),
      record_count: nodeMap.size + edgeMap.size,
    },
  };
}

export function deduplicateNodes(nodes: CrawledNode[]): CrawledNode[] {
  const seen = new Set<string>();
  return nodes.filter(node => {
    if (seen.has(node.id)) return false;
    seen.add(node.id);
    return true;
  });
}

export function deduplicateEdges(edges: CrawledEdge[]): CrawledEdge[] {
  const seen = new Set<string>();
  return edges.filter(edge => {
    const key = `${edge.source}-${edge.target}-${edge.relation_type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
