import type { GraphNode, GraphEdge, Source, NodeType, RelationType, VerificationStatus } from '../../src/lib/types';

export interface CrawledNode {
  id: string;
  name: string;
  definition: string;
  node_type: NodeType;
  parent_type: string | null;
  aliases?: Array<{ term: string; context?: string; note?: string }>;
  sources: Source[];
  raw_data?: Record<string, unknown>;
}

export interface CrawledEdge {
  source: string;
  target: string;
  relation_type: RelationType;
  verification_status: VerificationStatus;
  evidence: Source[];
  note?: string;
  raw_data?: Record<string, unknown>;
}

export interface CrawlResult {
  nodes: CrawledNode[];
  edges: CrawledEdge[];
  metadata: {
    source: string;
    source_url: string;
    crawled_at: string;
    record_count: number;
  };
}

export interface CrawlerConfig {
  name: string;
  source: string;
  baseUrl: string;
  rateLimit: number;
  timeout: number;
}

export interface IndustryCategory {
  code: string;
  name: string;
  level: number;
  parentCode: string | null;
  description?: string;
}

export type IndustryType = 'photovoltaic' | 'lithium_battery' | 'new_material';
