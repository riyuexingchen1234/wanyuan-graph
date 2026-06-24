import { sleep, createSource, generateId, saveJSON, nowISO, ensureDir } from './utils';
import type { CrawledNode, CrawledEdge, CrawlResult } from './types';
import type { NodeType, RelationType, VerificationStatus } from '../../src/lib/types';
import * as path from 'path';

const CNINFO_BASE = 'http://www.cninfo.com.cn';
const SZSE_STOCK_LIST_URL = `${CNINFO_BASE}/new/data/szse_stock.json`;
const ANNOUNCEMENT_QUERY_URL = `${CNINFO_BASE}/new/hisAnnouncement/query`;

const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const REQUEST_INTERVAL = 1000;

export interface StockInfo {
  code: string;
  name: string;
  pinyin: string;
  category: string;
  orgId: string;
}

export interface Announcement {
  secCode: string;
  secName: string;
  orgId: string;
  announcementId: string;
  announcementTitle: string;
  announcementTime: number;
  adjunctUrl: string;
  adjunctType: string;
}

export interface IndustryKeyword {
  keyword: string;
  industryName: string;
  nodeType: NodeType;
  relatedProducts: string[];
}

const INDUSTRY_KEYWORDS: IndustryKeyword[] = [
  {
    keyword: '光伏',
    industryName: '光伏产业',
    nodeType: 'industry',
    relatedProducts: ['太阳能电池', '光伏组件', '逆变器', '光伏玻璃', '硅料', '硅片', '光伏电站'],
  },
  {
    keyword: '锂电池',
    industryName: '锂电池产业',
    nodeType: 'industry',
    relatedProducts: ['锂离子电池', '正极材料', '负极材料', '电解液', '隔膜', '动力电池', '储能电池'],
  },
  {
    keyword: '新材料',
    industryName: '新材料产业',
    nodeType: 'industry',
    relatedProducts: ['半导体材料', '新能源材料', '高性能纤维', '复合材料', '稀土功能材料', '先进陶瓷材料'],
  },
];

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': `${CNINFO_BASE}/`,
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      console.warn(`请求失败 (尝试 ${i + 1}/${retries + 1}): ${url} - ${lastError.message}`);

      if (i < retries) {
        const delay = RETRY_DELAY * Math.pow(2, i);
        await sleep(delay);
      }
    }
  }

  throw new Error(`请求失败，已重试 ${retries + 1} 次: ${lastError?.message}`);
}

export async function fetchSZSEStockList(): Promise<StockInfo[]> {
  try {
    console.log('正在获取深市股票列表...');
    const response = await fetchWithRetry(SZSE_STOCK_LIST_URL, {
      method: 'GET',
    });

    const data = await response.json() as any;
    const stocks: StockInfo[] = (data.stockList || []).map((item: any) => ({
      code: item.code,
      name: item.zwjc,
      pinyin: item.pinyin,
      category: item.category,
      orgId: item.orgId,
    }));

    console.log(`获取到 ${stocks.length} 只深市股票`);
    return stocks;
  } catch (error) {
    console.error('获取深市股票列表失败:', error);
    return [];
  }
}

export interface AnnouncementQueryParams {
  searchKey?: string;
  pageNum?: number;
  pageSize?: number;
  category?: string;
  seDate?: string;
  column?: string;
}

export async function fetchAnnouncements(
  params: AnnouncementQueryParams
): Promise<{ total: number; announcements: Announcement[] }> {
  try {
    const formData = new URLSearchParams();
    formData.append('pageNum', String(params.pageNum || 1));
    formData.append('pageSize', String(params.pageSize || 30));
    formData.append('tabName', 'fulltext');
    formData.append('column', params.column || 'szse');
    formData.append('plate', '');
    formData.append('stock', '');
    formData.append('searchkey', params.searchKey || '');
    formData.append('secid', '');
    formData.append('category', params.category || '');
    formData.append('trade', '');
    formData.append('seDate', params.seDate || '');
    formData.append('sortName', 'time');
    formData.append('sortType', 'desc');
    formData.append('isHLtitle', 'true');

    const response = await fetchWithRetry(ANNOUNCEMENT_QUERY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json() as any;
    const announcements: Announcement[] = (data.announcements || []).map((item: any) => ({
      secCode: item.secCode,
      secName: item.secName,
      orgId: item.orgId,
      announcementId: item.announcementId,
      announcementTitle: item.announcementTitle?.replace(/<[^>]+>/g, '') || '',
      announcementTime: item.announcementTime,
      adjunctUrl: item.adjunctUrl,
      adjunctType: item.adjunctType,
    }));

    return {
      total: data.totalAnnouncement || data.totalRecordNum || 0,
      announcements,
    };
  } catch (error) {
    console.error('获取公告列表失败:', error);
    return { total: 0, announcements: [] };
  }
}

export async function searchIndustryCompanies(
  keyword: string,
  maxPages = 5
): Promise<Map<string, { code: string; name: string; announcementCount: number; announcements: Announcement[] }>> {
  const companyMap = new Map<string, { code: string; name: string; announcementCount: number; announcements: Announcement[] }>();

  console.log(`正在搜索关键词 "${keyword}" 相关的上市公司公告...`);

  for (let page = 1; page <= maxPages; page++) {
    const result = await fetchAnnouncements({
      searchKey: keyword,
      pageNum: page,
      pageSize: 30,
      seDate: '2024-01-01~2026-06-01',
    });

    if (result.announcements.length === 0) {
      break;
    }

    for (const ann of result.announcements) {
      const key = ann.secCode;
      if (!companyMap.has(key)) {
        companyMap.set(key, {
          code: ann.secCode,
          name: ann.secName,
          announcementCount: 0,
          announcements: [],
        });
      }
      const company = companyMap.get(key)!;
      company.announcementCount++;
      if (company.announcements.length < 10) {
        company.announcements.push(ann);
      }
    }

    console.log(`  第 ${page} 页: ${result.announcements.length} 条公告，累计 ${companyMap.size} 家公司`);

    if (page < maxPages) {
      await sleep(REQUEST_INTERVAL);
    }
  }

  console.log(`搜索完成，共找到 ${companyMap.size} 家与 "${keyword}" 相关的上市公司`);
  return companyMap;
}

export function extractIndustryNodes(
  industryKeyword: IndustryKeyword,
  companies: Map<string, { code: string; name: string; announcementCount: number; announcements: Announcement[] }>
): { nodes: CrawledNode[]; edges: CrawledEdge[] } {
  const nodes: CrawledNode[] = [];
  const edges: CrawledEdge[] = [];
  const nodeIds = new Set<string>();

  const industryNodeId = generateId(industryKeyword.nodeType, industryKeyword.industryName);

  if (!nodeIds.has(industryNodeId)) {
    const industryNode: CrawledNode = {
      id: industryNodeId,
      name: industryKeyword.industryName,
      definition: `中国上市公司行业分类：${industryKeyword.industryName}，包含多家主营业务涉及${industryKeyword.keyword}的上市公司。数据来源于巨潮资讯网公开披露信息。`,
      node_type: industryKeyword.nodeType,
      parent_type: null,
      sources: [
        createSource(
          'official_data',
          `巨潮资讯网 - ${industryKeyword.industryName}相关上市公司公告`,
          CNINFO_BASE
        ),
      ],
      raw_data: {
        keyword: industryKeyword.keyword,
        companyCount: companies.size,
      },
    };
    nodes.push(industryNode);
    nodeIds.add(industryNodeId);
  }

  for (const productName of industryKeyword.relatedProducts) {
    const productNodeId = generateId('product', productName);
    if (!nodeIds.has(productNodeId)) {
      const productNode: CrawledNode = {
        id: productNodeId,
        name: productName,
        definition: `${industryKeyword.industryName}领域的重要产品/材料：${productName}。数据来源于巨潮资讯网上市公司公开信息分析。`,
        node_type: 'product',
        parent_type: industryKeyword.industryName,
        sources: [
          createSource(
            'official_data',
            `巨潮资讯网 - ${industryKeyword.industryName}相关产品：${productName}`,
            CNINFO_BASE
          ),
        ],
        raw_data: {
          industry: industryKeyword.industryName,
          keyword: industryKeyword.keyword,
        },
      };
      nodes.push(productNode);
      nodeIds.add(productNodeId);

      const edge: CrawledEdge = {
        source: industryNodeId,
        target: productNodeId,
        relation_type: 'downstream_of' as RelationType,
        verification_status: 'proposed' as VerificationStatus,
        evidence: [
          createSource(
            'official_data',
            `${productName}属于${industryKeyword.industryName}产业链`,
            CNINFO_BASE
          ),
        ],
        note: '基于行业关键词关联提取',
      };
      edges.push(edge);
    }
  }

  const sortedCompanies = Array.from(companies.values()).sort(
    (a, b) => b.announcementCount - a.announcementCount
  );

  return { nodes, edges };
}

export async function crawlCninfoIndustries(): Promise<CrawlResult> {
  console.log('='.repeat(60));
  console.log('开始爬取巨潮资讯网数据...');
  console.log('='.repeat(60));

  const allNodes: CrawledNode[] = [];
  const allEdges: CrawledEdge[] = [];
  const allCompanyData: Record<string, any> = {};

  const stocks = await fetchSZSEStockList();
  await sleep(REQUEST_INTERVAL);

  for (const industryKeyword of INDUSTRY_KEYWORDS) {
    console.log('\n' + '-'.repeat(60));
    console.log(`正在处理行业: ${industryKeyword.industryName}`);
    console.log('-'.repeat(60));

    const companies = await searchIndustryCompanies(industryKeyword.keyword, 5);

    allCompanyData[industryKeyword.keyword] = {
      industryName: industryKeyword.industryName,
      companyCount: companies.size,
      companies: Array.from(companies.values()).sort(
        (a, b) => b.announcementCount - a.announcementCount
      ),
    };

    const { nodes, edges } = extractIndustryNodes(industryKeyword, companies);
    allNodes.push(...nodes);
    allEdges.push(...edges);

    await sleep(REQUEST_INTERVAL * 2);
  }

  const uniqueNodeIds = new Set<string>();
  const uniqueNodes: CrawledNode[] = [];
  for (const node of allNodes) {
    if (!uniqueNodeIds.has(node.id)) {
      uniqueNodeIds.add(node.id);
      uniqueNodes.push(node);
    } else {
      const existing = uniqueNodes.find(n => n.id === node.id)!;
      for (const source of node.sources) {
        if (!existing.sources.some(s => s.url === source.url && s.description === source.description)) {
          existing.sources.push(source);
        }
      }
    }
  }

  const uniqueEdgeKeys = new Set<string>();
  const uniqueEdges: CrawledEdge[] = [];
  for (const edge of allEdges) {
    const key = `${edge.source}-${edge.target}-${edge.relation_type}`;
    if (!uniqueEdgeKeys.has(key)) {
      uniqueEdgeKeys.add(key);
      uniqueEdges.push(edge);
    }
  }

  const result: CrawlResult = {
    nodes: uniqueNodes,
    edges: uniqueEdges,
    metadata: {
      source: '巨潮资讯网',
      source_url: CNINFO_BASE,
      crawled_at: nowISO(),
      record_count: uniqueNodes.length + uniqueEdges.length,
    },
  };

  const outputDir = path.join('/workspace', 'data', 'raw');
  ensureDir(outputDir);

  const resultPath = path.join(outputDir, 'cninfo-result.json');
  saveJSON(resultPath, result);
  console.log(`\n主结果已保存到: ${resultPath}`);

  const companyDataPath = path.join(outputDir, 'cninfo-companies.json');
  saveJSON(companyDataPath, {
    metadata: {
      source: '巨潮资讯网',
      source_url: CNINFO_BASE,
      crawled_at: nowISO(),
      total_stocks: stocks.length,
    },
    industries: allCompanyData,
  });
  console.log(`公司详情数据已保存到: ${companyDataPath}`);

  console.log('\n' + '='.repeat(60));
  console.log('爬取完成！');
  console.log(`  节点数量: ${uniqueNodes.length}`);
  console.log(`  关系数量: ${uniqueEdges.length}`);
  console.log(`  涉及行业: ${INDUSTRY_KEYWORDS.length} 个`);
  console.log('='.repeat(60));

  return result;
}

if (require.main === module) {
  crawlCninfoIndustries().catch(error => {
    console.error('爬虫执行失败:', error);
    process.exit(1);
  });
}
