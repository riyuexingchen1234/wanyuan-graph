import * as fs from 'fs';
import * as path from 'path';
import {
  crawledNodeToGraphNode,
  crawledEdgeToGraphEdge,
  deduplicateNodes,
  deduplicateEdges,
  generateId,
  nowISO,
  createSource,
  saveJSON,
} from './utils';
import type { CrawledNode, CrawledEdge, CrawlResult } from './types';
import type { GraphData, GraphNode, GraphEdge, RelationType } from '../../src/lib/types';

const RAW_DIR = path.join(__dirname, '../../data/raw');
const PROCESSED_DIR = path.join(__dirname, '../../data/processed');
const PROJECT_DATA_DIR = path.join(__dirname, '../../src/data');

function loadCrawlResult(filename: string): CrawlResult | null {
  const filePath = path.join(RAW_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`文件不存在: ${filePath}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as CrawlResult;
  } catch (e) {
    console.error(`加载文件失败: ${filename}`, e);
    return null;
  }
}

function fixParentTypeRefs(nodes: CrawledNode[]): CrawledNode[] {
  const nameToId = new Map<string, string>();
  for (const node of nodes) {
    nameToId.set(node.name, node.id);
  }

  return nodes.map(node => {
    if (!node.parent_type) return node;
    if (node.parent_type.startsWith('industry-') ||
        node.parent_type.startsWith('material-') ||
        node.parent_type.startsWith('product-') ||
        node.parent_type.startsWith('equipment-')) {
      return node;
    }
    const matchedId = nameToId.get(node.parent_type);
    if (matchedId) {
      return { ...node, parent_type: matchedId };
    }
    return { ...node, parent_type: null };
  });
}

function generateBasicEdges(nodes: CrawledNode[]): CrawledEdge[] {
  const edges: CrawledEdge[] = [];
  const idToNode = new Map(nodes.map(n => [n.id, n]));

  for (const node of nodes) {
    if (!node.parent_type) continue;
    const parent = idToNode.get(node.parent_type);
    if (!parent) continue;

    let relationType: RelationType = 'downstream_of';
    if (node.node_type === 'material' && parent.node_type === 'material') {
      relationType = 'can_be_processed_into';
    } else if (node.node_type === 'product' && parent.node_type === 'industry') {
      relationType = 'applied_in';
    } else if (node.node_type === 'material' && parent.node_type === 'industry') {
      relationType = 'applied_in';
    }

    edges.push({
      source: node.id,
      target: parent.id,
      relation_type: relationType,
      verification_status: 'proposed',
      evidence: [
        createSource(
          'official_data',
          `分类层级关系：${node.name} 属于 ${parent.name}`,
          node.sources[0]?.url
        ),
      ],
      note: '基于行业分类层级生成的关系',
    });
  }

  return edges;
}

function filterQualityNodes(nodes: CrawledNode[]): CrawledNode[] {
  return nodes.filter(node => {
    if (!node.definition || node.definition.length < 5) return false;
    if (!node.name || node.name.length < 2) return false;
    if (node.name.length > 30) return false;
    if (node.sources.length === 0) return false;
    return true;
  });
}

function addExistingDraftNodes(nodes: CrawledNode[]): CrawledNode[] {
  const existingPath = path.join(PROJECT_DATA_DIR, 'nodes-draft.json');
  if (!fs.existsSync(existingPath)) return nodes;

  try {
    const existingData = JSON.parse(fs.readFileSync(existingPath, 'utf-8')) as { nodes: GraphNode[] };
    const existingIds = new Set(nodes.map(n => n.id));

    for (const existingNode of existingData.nodes) {
      if (existingIds.has(existingNode.id)) continue;
      nodes.push({
        id: existingNode.id,
        name: existingNode.name,
        definition: existingNode.definition,
        node_type: existingNode.node_type,
        parent_type: existingNode.parent_type,
        aliases: existingNode.aliases,
        sources: existingNode.sources || [],
      });
    }
  } catch (e) {
    console.warn('加载现有节点数据失败:', e);
  }

  return nodes;
}

export function mergeAndCleanData(): GraphData {
  console.log('开始合并和清洗数据...');

  const results: CrawlResult[] = [];

  const statsGov = loadCrawlResult('stats-gov-industries.json');
  if (statsGov) {
    console.log(`  - 国家统计局数据: ${statsGov.nodes.length} 个节点`);
    results.push(statsGov);
  }

  const cninfo = loadCrawlResult('cninfo-result.json');
  if (cninfo) {
    console.log(`  - 巨潮资讯数据: ${cninfo.nodes.length} 个节点, ${cninfo.edges.length} 条边`);
    results.push(cninfo);
  }

  const gbStd = loadCrawlResult('gb-standards.json');
  if (gbStd) {
    console.log(`  - 国家标准数据: ${gbStd.nodes.length} 个节点`);
    results.push(gbStd);
  }

  let allNodes: CrawledNode[] = [];
  let allEdges: CrawledEdge[] = [];

  for (const result of results) {
    allNodes.push(...result.nodes);
    allEdges.push(...result.edges);
  }

  console.log(`\n原始数据总计: ${allNodes.length} 个节点, ${allEdges.length} 条边`);

  allNodes = filterQualityNodes(allNodes);
  console.log(`质量过滤后: ${allNodes.length} 个节点`);

  allNodes = fixParentTypeRefs(allNodes);
  allNodes = deduplicateNodes(allNodes);
  console.log(`去重后: ${allNodes.length} 个节点`);

  const generatedEdges = generateBasicEdges(allNodes);
  allEdges.push(...generatedEdges);
  allEdges = deduplicateEdges(allEdges);
  console.log(`生成层级关系边后: ${allEdges.length} 条边`);

  allNodes = addExistingDraftNodes(allNodes);
  console.log(`合并现有draft节点后: ${allNodes.length} 个节点`);

  const graphNodes: GraphNode[] = allNodes.map(crawledNodeToGraphNode);
  const graphEdges: GraphEdge[] = allEdges.map((edge, idx) => crawledEdgeToGraphEdge(edge, idx));

  const graphData: GraphData = {
    nodes: graphNodes,
    edges: graphEdges,
  };

  saveJSON(path.join(PROCESSED_DIR, 'merged-graph-data.json'), graphData);
  console.log(`\n合并完成，数据已保存到 data/processed/merged-graph-data.json`);
  console.log(`最终: ${graphNodes.length} 个节点, ${graphEdges.length} 条边`);

  return graphData;
}

if (require.main === module) {
  mergeAndCleanData();
}
