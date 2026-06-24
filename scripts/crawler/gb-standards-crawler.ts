import * as cheerio from 'cheerio';
import { sleep, generateId, createSource, saveJSON, nowISO, deduplicateNodes } from './utils';
import type { CrawledNode, CrawlResult, NodeType } from './types';

const BASE_URL = 'https://openstd.samr.gov.cn/bzgk/std';
const SEARCH_URL = `${BASE_URL}/std_list`;
const DETAIL_URL = `${BASE_URL}/newGbInfo`;

const SEARCH_KEYWORDS = {
  photovoltaic: ['光伏', '太阳能电池', '组件', '硅片', '多晶硅'],
  lithium_battery: ['锂离子电池', '动力电池', '正极材料', '负极材料', '隔膜', '电解液'],
  new_material: ['聚乙烯', '聚丙烯', '合成树脂', '有色金属'],
};

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Referer': 'https://openstd.samr.gov.cn/bzgk/gb/index',
};

interface StandardBasicInfo {
  recordId: string;
  standardNo: string;
  standardName: string;
  category: string;
  status: string;
  publishDate: string;
  implementDate: string;
  isAdopted: boolean;
  language: string;
  searchKeyword: string;
  industryCategory: string;
}

interface StandardDetail extends StandardBasicInfo {
  englishName?: string;
  scope?: string;
  definition?: string;
  detailUrl: string;
}

async function fetchWithRetry(url: string, retries = 3, delay = 2000): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { headers: DEFAULT_HEADERS });
      if (response.ok) {
        return await response.text();
      }
      console.warn(`  请求失败 (${response.status})，重试 ${i + 1}/${retries}`);
    } catch (error) {
      console.warn(`  请求异常，重试 ${i + 1}/${retries}:`, (error as Error).message);
    }
    if (i < retries - 1) {
      await sleep(delay * (i + 1));
    }
  }
  throw new Error(`请求失败，已重试 ${retries} 次: ${url}`);
}

function extractRecordId(onclick: string | undefined): string | null {
  if (!onclick) return null;
  const match = onclick.match(/showInfo\(['"]([^'"]+)['"]\)/);
  return match ? match[1] : null;
}

async function searchStandards(keyword: string, industryCategory: string, maxPages = 5): Promise<StandardBasicInfo[]> {
  const results: StandardBasicInfo[] = [];
  const seenRecordIds = new Set<string>();
  
  console.log(`  搜索关键词: "${keyword}"`);
  
  for (let page = 1; page <= maxPages; page++) {
    const url = `${SEARCH_URL}?p.p1=0&p.p90=circulation_date&p.p91=desc&p.p2=${encodeURIComponent(keyword)}&page=${page}&pageSize=50`;
    
    try {
      const html = await fetchWithRetry(url);
      const $ = cheerio.load(html);
      
      const table = $('table').eq(5);
      const rows = table.find('tr').slice(1);
      
      if (rows.length === 0) {
        console.log(`    第 ${page} 页: 无数据，停止翻页`);
        break;
      }
      
      let pageNewCount = 0;
      rows.each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 9) return;
        
        const standardNo = cells.eq(1).text().trim();
        const language = cells.eq(2).text().trim();
        const isAdopted = cells.eq(3).text().trim() === '采';
        const standardName = cells.eq(4).text().trim();
        const category = cells.eq(5).text().trim();
        const status = cells.eq(6).text().trim();
        const publishDate = cells.eq(7).text().trim();
        const implementDate = cells.eq(8).text().trim();
        
        const onclick = cells.eq(1).find('a').attr('onclick') || cells.eq(9).find('button').attr('onclick');
        const recordId = extractRecordId(onclick);
        
        if (!recordId || !standardName) return;
        if (seenRecordIds.has(recordId)) return;
        
        seenRecordIds.add(recordId);
        pageNewCount++;
        
        results.push({
          recordId,
          standardNo,
          standardName,
          category,
          status,
          publishDate,
          implementDate,
          isAdopted,
          language,
          searchKeyword: keyword,
          industryCategory,
        });
      });
      
      console.log(`    第 ${page} 页: 获取 ${pageNewCount} 条新标准`);
      
      if (rows.length < 50) {
        console.log(`    已到最后一页`);
        break;
      }
      
      await sleep(1000);
    } catch (error) {
      console.error(`  搜索第 ${page} 页失败:`, (error as Error).message);
      break;
    }
  }
  
  console.log(`  "${keyword}" 共获取 ${results.length} 条标准`);
  return results;
}

async function fetchStandardDetail(basic: StandardBasicInfo): Promise<StandardDetail> {
  const detail: StandardDetail = {
    ...basic,
    detailUrl: `${DETAIL_URL}?hcno=${basic.recordId}`,
  };
  
  try {
    const html = await fetchWithRetry(detail.detailUrl);
    const $ = cheerio.load(html);
    
    const tables = $('table');
    
    if (tables.length > 1) {
      const infoTable = tables.eq(1);
      const rows = infoTable.find('tr');
      
      rows.each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 2) {
          const label = cells.eq(0).text().trim();
          const value = cells.eq(1).text().trim();
          
          if (label.includes('英文标准名称')) {
            detail.englishName = value;
          }
        }
      });
    }
    
    const bodyText = $('body').text();
    
    const scopePatterns = [
      /本标准(?:规定|适用于)[\s\S]{20,500}/,
      /适用范围[：:][\s\S]{20,500}/,
      /范围[：:][\s\S]{20,500}/,
    ];
    
    for (const pattern of scopePatterns) {
      const match = bodyText.match(pattern);
      if (match) {
        detail.scope = match[0].trim().substring(0, 500);
        break;
      }
    }
    
    const defPatterns = [
      /术语和定义[\s\S]{50,1000}/,
      /定义[：:][\s\S]{50,1000}/,
    ];
    
    for (const pattern of defPatterns) {
      const match = bodyText.match(pattern);
      if (match) {
        detail.definition = match[0].trim().substring(0, 1000);
        break;
      }
    }
    
  } catch (error) {
    console.warn(`  获取详情失败 (${basic.standardNo}):`, (error as Error).message);
  }
  
  return detail;
}

function isPlausibleProductName(name: string): boolean {
  const invalidPatterns = [
    /方法$/, /规范$/, /要求$/, /规程$/, /导则$/, /标准$/, /试验$/,
    /测试$/, /检测$/, /测定$/, /测量$/, /计算$/, /设计$/, /管理$/,
    /系统$/, /设备$/, /装置$/, /技术$/, /通则$/, /总则$/,
    /第[0-9一二三四五六七八九十]+部分/, /第\d+部分/,
    /及以下/, /及以上/, /以及/, /与其/, /和其/, /与其他/,
    /^及/, /^其/, /^该/, /^此/,
  ];
  
  for (const pattern of invalidPatterns) {
    if (pattern.test(name)) return false;
  }
  
  if (name.length < 2 || name.length > 20) return false;
  
  const chineseChars = (name.match(/[\u4e00-\u9fa5]/g) || []).length;
  if (chineseChars < 2) return false;
  
  return true;
}

function cleanNodeName(name: string): string {
  let cleaned = name.trim();
  
  cleaned = cleaned.replace(/^[\s·\-—_（）()【】\[\]、,，.。]+/, '');
  cleaned = cleaned.replace(/[\s·\-—_（）()【】\[\]、,，.。]+$/, '');
  
  const prefixPatterns = [
    /^用/, /^及/, /^其/, /^的/, /^和/, /^与/, /^或/, /^在/,
    /^.*?用(?=[\u4e00-\u9fa5]{2,})/,
  ];
  
  for (const pattern of prefixPatterns) {
    if (pattern.test(cleaned)) {
      const newName = cleaned.replace(pattern, '');
      if (newName.length >= 2 && /^[\u4e00-\u9fa5]/.test(newName)) {
        cleaned = newName;
        break;
      }
    }
  }
  
  return cleaned;
}

function extractNodesFromStandards(standards: StandardDetail[]): CrawledNode[] {
  const nodes: CrawledNode[] = [];
  const seenNodeIds = new Set<string>();
  
  const productMaterialPatterns: Array<{ 
    pattern: RegExp; 
    nodeType: NodeType; 
    parentType: string | null;
    extractFrom: 'name' | 'both';
  }> = [
    { 
      pattern: /([\u4e00-\u9fa5]{2,8}光伏组件|[\u4e00-\u9fa5]{0,6}太阳能电池[\u4e00-\u9fa5]{0,4}片?|[\u4e00-\u9fa5]{0,6}光伏电池[\u4e00-\u9fa5]{0,4}|多晶硅[\u4e00-\u9fa5]{0,4}|单晶硅[\u4e00-\u9fa5]{0,4}|[\u4e00-\u9fa5]{0,4}硅片)/g, 
      nodeType: 'product', 
      parentType: '光伏产品',
      extractFrom: 'both'
    },
    { 
      pattern: /([\u4e00-\u9fa5]{2,6}正极材料|[\u4e00-\u9fa5]{2,6}负极材料|[\u4e00-\u9fa5]{0,4}隔膜|[\u4e00-\u9fa5]{0,4}电解液|[\u4e00-\u9fa5]{0,4}电解质)/g, 
      nodeType: 'material', 
      parentType: '锂电池材料',
      extractFrom: 'both'
    },
    { 
      pattern: /([\u4e00-\u9fa5]{0,6}聚乙烯[\u4e00-\u9fa5]{0,4}|[\u4e00-\u9fa5]{0,6}聚丙烯[\u4e00-\u9fa5]{0,4}|[\u4e00-\u9fa5]{0,4}合成树脂[\u4e00-\u9fa5]{0,4}|[\u4e00-\u9fa5]{0,6}聚氯乙烯[\u4e00-\u9fa5]{0,4}|[\u4e00-\u9fa5]{0,6}聚苯乙烯[\u4e00-\u9fa5]{0,4})/g, 
      nodeType: 'material', 
      parentType: '高分子材料',
      extractFrom: 'both'
    },
    { 
      pattern: /([\u4e00-\u9fa5]{0,6}锂离子电池[\u4e00-\u9fa5]{0,4}|[\u4e00-\u9fa5]{0,6}动力电池[\u4e00-\u9fa5]{0,4}|[\u4e00-\u9fa5]{0,6}储能电池[\u4e00-\u9fa5]{0,4})/g, 
      nodeType: 'product', 
      parentType: '锂电池产品',
      extractFrom: 'both'
    },
    {
      pattern: /([\u4e00-\u9fa5]{2,6}有色金属[\u4e00-\u9fa5]{0,4})/g,
      nodeType: 'material',
      parentType: '金属材料',
      extractFrom: 'name'
    },
  ];
  
  for (const std of standards) {
    const source = createSource(
      'standard',
      `${std.standardNo} ${std.standardName}`,
      std.detailUrl
    );
    
    const textsToSearch: string[] = [std.standardName];
    if (std.scope) textsToSearch.push(std.scope);
    
    for (const { pattern, nodeType, parentType, extractFrom } of productMaterialPatterns) {
      const searchTexts = extractFrom === 'both' ? textsToSearch : [std.standardName];
      
      for (const text of searchTexts) {
        const matches = text.match(pattern);
        if (!matches) continue;
        
        for (const name of matches) {
          let cleanName = cleanNodeName(name);
          
          if (!isPlausibleProductName(cleanName)) continue;
          
          const nodeId = generateId(nodeType, cleanName);
          
          if (seenNodeIds.has(nodeId)) {
            const existing = nodes.find(n => n.id === nodeId);
            if (existing && !existing.sources.some(s => s.url === std.detailUrl)) {
              existing.sources.push(source);
            }
            continue;
          }
          
          seenNodeIds.add(nodeId);
          
          let definition = `出自国家标准《${std.standardName}》(${std.standardNo})。`;
          if (std.scope) {
            definition += `\n\n标准范围：${std.scope.substring(0, 200)}`;
          }
          
          const node: CrawledNode = {
            id: nodeId,
            name: cleanName,
            definition,
            node_type: nodeType,
            parent_type: parentType,
            sources: [source],
            raw_data: {
              standard_no: std.standardNo,
              standard_name: std.standardName,
              search_keyword: std.searchKeyword,
              industry_category: std.industryCategory,
            },
          };
          
          nodes.push(node);
        }
      }
    }
  }
  
  return deduplicateNodes(nodes);
}

export async function crawlGbStandards(): Promise<CrawlResult> {
  console.log('='.repeat(60));
  console.log('开始爬取国家标准全文公开系统...');
  console.log('='.repeat(60));
  
  const allStandards: StandardDetail[] = [];
  const allBasicInfos: StandardBasicInfo[] = [];
  const seenRecordIds = new Set<string>();
  
  for (const [industry, keywords] of Object.entries(SEARCH_KEYWORDS)) {
    console.log(`\n【${industry}】类关键词:`);
    
    for (const keyword of keywords) {
      const basics = await searchStandards(keyword, industry, 3);
      
      for (const basic of basics) {
        if (!seenRecordIds.has(basic.recordId)) {
          seenRecordIds.add(basic.recordId);
          allBasicInfos.push(basic);
        }
      }
      
      await sleep(1500);
    }
  }
  
  console.log(`\n共获取到 ${allBasicInfos.length} 条唯一标准记录`);
  console.log(`\n开始获取标准详情...`);
  
  for (let i = 0; i < allBasicInfos.length; i++) {
    const basic = allBasicInfos[i];
    console.log(`  [${i + 1}/${allBasicInfos.length}] ${basic.standardNo} - ${basic.standardName.substring(0, 30)}`);
    
    const detail = await fetchStandardDetail(basic);
    allStandards.push(detail);
    
    await sleep(800);
  }
  
  console.log(`\n开始提取产品/材料节点...`);
  const nodes = extractNodesFromStandards(allStandards);
  console.log(`提取到 ${nodes.length} 个节点`);
  
  const result: CrawlResult = {
    nodes,
    edges: [],
    metadata: {
      source: '国家标准全文公开系统',
      source_url: 'https://openstd.samr.gov.cn/bzgk/gb/index',
      crawled_at: nowISO(),
      record_count: allStandards.length,
    },
  };
  
  const outputPath = '/workspace/data/raw/gb-standards.json';
  saveJSON(outputPath, result);
  console.log(`\n数据已保存到: ${outputPath}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('爬取完成！');
  console.log('='.repeat(60));
  
  return result;
}

if (require.main === module) {
  crawlGbStandards().catch(console.error);
}
