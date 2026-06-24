import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import {
  sleep,
  createSource,
  generateId,
  saveJSON,
  nowISO,
  ensureDir,
} from './utils';
import type { CrawledNode, CrawlResult, IndustryCategory } from './types';

const STATS_GOV_BASE = 'https://www.stats.gov.cn';
const INDUSTRY_CLASSIFICATION_PAGE = `${STATS_GOV_BASE}/sj/tjbz/gmjjhyfl/`;
const EXCEL_DOWNLOAD_URL = `${STATS_GOV_BASE}/sj/tjbz/gmjjhyfl/202302/P020230213403084213497.xlsx`;

const OUTPUT_PATH = '/workspace/data/raw/stats-gov-industries.json';
const CACHE_DIR = '/workspace/data/cache';
const CACHE_FILE = path.join(CACHE_DIR, 'stats-gov-industry.xlsx');

const TARGET_INDUSTRIES = {
  photovoltaic: ['3825'],
  lithium_battery: ['3841'],
  new_material: ['26', '32'],
};

const LEVEL_NAMES: Record<number, string> = {
  1: '门类',
  2: '大类',
  3: '中类',
  4: '小类',
};

function determineLevel(code: string): number {
  if (/^[A-Z]$/.test(code)) return 1;
  if (/^\d{2}$/.test(code)) return 2;
  if (/^\d{3}$/.test(code)) return 3;
  if (/^\d{4}$/.test(code)) return 4;
  return 0;
}

function getParentCode(code: string): string | null {
  const level = determineLevel(code);
  if (level === 1) return null;
  if (level === 2) return code[0];
  if (level === 3) return code.slice(0, 2);
  if (level === 4) return code.slice(0, 3);
  return null;
}

function parseExcelFile(filePath: string): IndustryCategory[] {
  const workbook = XLSX.readFile(filePath);
  const categories: IndustryCategory[] = [];
  const seenCodes = new Set<string>();

  let currentDivision: string | null = null;

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      defval: '',
      raw: true,
      header: 1,
    });

    for (const row of jsonData) {
      const col0 = String(row[0] || '').trim();
      const col1 = String(row[1] || '').trim();
      const col3 = String(row[3] || '').trim();

      if (!col3 || !/[\u4e00-\u9fa5]/.test(col3)) continue;

      let code: string | null = null;
      let level = 0;

      if (/^[A-Z]$/.test(col0)) {
        code = col0;
        level = 1;
        currentDivision = code;
      } else if (/^\d{2}$/.test(col0)) {
        code = col0;
        level = 2;
      } else if (/^\d{3}$/.test(col0)) {
        code = col0;
        level = 3;
      } else if (/^\d{4}$/.test(col1)) {
        code = col1;
        level = 4;
      }

      if (!code || level === 0) continue;
      if (seenCodes.has(code)) continue;

      let parentCode: string | null = null;
      if (level === 2) {
        parentCode = currentDivision;
      } else if (level === 3) {
        parentCode = code.slice(0, 2);
      } else if (level === 4) {
        parentCode = code.slice(0, 3);
      }

      categories.push({
        code,
        name: col3,
        level,
        parentCode,
      });

      seenCodes.add(code);
    }
  }

  return categories.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.code.localeCompare(b.code);
  });
}

async function downloadExcelFile(): Promise<boolean> {
  ensureDir(CACHE_DIR);

  if (fs.existsSync(CACHE_FILE)) {
    console.log(`使用缓存的 Excel 文件: ${CACHE_FILE}`);
    return true;
  }

  console.log(`正在下载行业分类 Excel 文件: ${EXCEL_DOWNLOAD_URL}`);

  try {
    const response = await fetch(EXCEL_DOWNLOAD_URL, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: INDUSTRY_CLASSIFICATION_PAGE,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.error(`下载失败: HTTP ${response.status} ${response.statusText}`);
      return false;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length < 1000) {
      console.error('下载的文件太小，可能不是有效的 Excel 文件');
      return false;
    }

    fs.writeFileSync(CACHE_FILE, buffer);
    console.log(`Excel 文件已下载并缓存: ${CACHE_FILE} (${buffer.length} bytes)`);
    return true;
  } catch (error) {
    console.error('下载 Excel 文件时出错:', error);
    return false;
  }
}

const FALLBACK_DATA: IndustryCategory[] = [
  { code: 'A', name: '农、林、牧、渔业', level: 1, parentCode: null },
  { code: 'B', name: '采矿业', level: 1, parentCode: null },
  { code: 'C', name: '制造业', level: 1, parentCode: null },
  { code: 'D', name: '电力、热力、燃气及水生产和供应业', level: 1, parentCode: null },
  { code: 'E', name: '建筑业', level: 1, parentCode: null },
  { code: 'F', name: '批发和零售业', level: 1, parentCode: null },
  { code: 'G', name: '交通运输、仓储和邮政业', level: 1, parentCode: null },
  { code: 'H', name: '住宿和餐饮业', level: 1, parentCode: null },
  { code: 'I', name: '信息传输、软件和信息技术服务业', level: 1, parentCode: null },
  { code: 'J', name: '金融业', level: 1, parentCode: null },
  { code: 'K', name: '房地产业', level: 1, parentCode: null },
  { code: 'L', name: '租赁和商务服务业', level: 1, parentCode: null },
  { code: 'M', name: '科学研究和技术服务业', level: 1, parentCode: null },
  { code: 'N', name: '水利、环境和公共设施管理业', level: 1, parentCode: null },
  { code: 'O', name: '居民服务、修理和其他服务业', level: 1, parentCode: null },
  { code: 'P', name: '教育', level: 1, parentCode: null },
  { code: 'Q', name: '卫生和社会工作', level: 1, parentCode: null },
  { code: 'R', name: '文化、体育和娱乐业', level: 1, parentCode: null },
  { code: 'S', name: '公共管理、社会保障和社会组织', level: 1, parentCode: null },
  { code: 'T', name: '国际组织', level: 1, parentCode: null },

  { code: '26', name: '化学原料和化学制品制造业', level: 2, parentCode: 'C' },
  { code: '261', name: '基础化学原料制造', level: 3, parentCode: '26' },
  { code: '2611', name: '无机酸制造', level: 4, parentCode: '261' },
  { code: '2612', name: '无机碱制造', level: 4, parentCode: '261' },
  { code: '2613', name: '无机盐制造', level: 4, parentCode: '261' },
  { code: '2614', name: '有机化学原料制造', level: 4, parentCode: '261' },
  { code: '2619', name: '其他基础化学原料制造', level: 4, parentCode: '261' },
  { code: '262', name: '肥料制造', level: 3, parentCode: '26' },
  { code: '2621', name: '氮肥制造', level: 4, parentCode: '262' },
  { code: '2622', name: '磷肥制造', level: 4, parentCode: '262' },
  { code: '2623', name: '钾肥制造', level: 4, parentCode: '262' },
  { code: '2624', name: '复混肥料制造', level: 4, parentCode: '262' },
  { code: '2625', name: '有机肥料及微生物肥料制造', level: 4, parentCode: '262' },
  { code: '2629', name: '其他肥料制造', level: 4, parentCode: '262' },
  { code: '263', name: '农药制造', level: 3, parentCode: '26' },
  { code: '2631', name: '化学农药制造', level: 4, parentCode: '263' },
  { code: '2632', name: '生物化学农药及微生物农药制造', level: 4, parentCode: '263' },
  { code: '264', name: '涂料、油墨、颜料及类似产品制造', level: 3, parentCode: '26' },
  { code: '2641', name: '涂料制造', level: 4, parentCode: '264' },
  { code: '2642', name: '油墨及类似产品制造', level: 4, parentCode: '264' },
  { code: '2643', name: '颜料制造', level: 4, parentCode: '264' },
  { code: '2644', name: '染料制造', level: 4, parentCode: '264' },
  { code: '2645', name: '密封用填料及类似品制造', level: 4, parentCode: '264' },
  { code: '265', name: '合成材料制造', level: 3, parentCode: '26' },
  { code: '2651', name: '初级形态塑料及合成树脂制造', level: 4, parentCode: '265' },
  { code: '2652', name: '合成橡胶制造', level: 4, parentCode: '265' },
  { code: '2653', name: '合成纤维单（聚合）体制造', level: 4, parentCode: '265' },
  { code: '2659', name: '其他合成材料制造', level: 4, parentCode: '265' },
  { code: '266', name: '专用化学产品制造', level: 3, parentCode: '26' },
  { code: '2661', name: '化学试剂和助剂制造', level: 4, parentCode: '266' },
  { code: '2662', name: '专项化学用品制造', level: 4, parentCode: '266' },
  { code: '2663', name: '林产化学产品制造', level: 4, parentCode: '266' },
  { code: '2664', name: '信息化学品制造', level: 4, parentCode: '266' },
  { code: '2665', name: '环境污染处理专用药剂材料制造', level: 4, parentCode: '266' },
  { code: '2666', name: '动物胶制造', level: 4, parentCode: '266' },
  { code: '2669', name: '其他专用化学产品制造', level: 4, parentCode: '266' },
  { code: '267', name: '炸药、火工及焰火产品制造', level: 3, parentCode: '26' },
  { code: '2671', name: '炸药及火工产品制造', level: 4, parentCode: '267' },
  { code: '2672', name: '焰火、鞭炮产品制造', level: 4, parentCode: '267' },
  { code: '268', name: '日用化学产品制造', level: 3, parentCode: '26' },
  { code: '2681', name: '肥皂及洗涤剂制造', level: 4, parentCode: '268' },
  { code: '2682', name: '化妆品制造', level: 4, parentCode: '268' },
  { code: '2683', name: '口腔清洁用品制造', level: 4, parentCode: '268' },
  { code: '2684', name: '香料、香精制造', level: 4, parentCode: '268' },
  { code: '2689', name: '其他日用化学产品制造', level: 4, parentCode: '268' },

  { code: '32', name: '有色金属冶炼和压延加工业', level: 2, parentCode: 'C' },
  { code: '321', name: '常用有色金属冶炼', level: 3, parentCode: '32' },
  { code: '3211', name: '铜冶炼', level: 4, parentCode: '321' },
  { code: '3212', name: '铅锌冶炼', level: 4, parentCode: '321' },
  { code: '3213', name: '镍钴冶炼', level: 4, parentCode: '321' },
  { code: '3214', name: '锡冶炼', level: 4, parentCode: '321' },
  { code: '3215', name: '锑冶炼', level: 4, parentCode: '321' },
  { code: '3216', name: '铝冶炼', level: 4, parentCode: '321' },
  { code: '3217', name: '镁冶炼', level: 4, parentCode: '321' },
  { code: '3218', name: '硅冶炼', level: 4, parentCode: '321' },
  { code: '3219', name: '其他常用有色金属冶炼', level: 4, parentCode: '321' },
  { code: '322', name: '贵金属冶炼', level: 3, parentCode: '32' },
  { code: '3221', name: '金冶炼', level: 4, parentCode: '322' },
  { code: '3222', name: '银冶炼', level: 4, parentCode: '322' },
  { code: '3229', name: '其他贵金属冶炼', level: 4, parentCode: '322' },
  { code: '323', name: '稀有稀土金属冶炼', level: 3, parentCode: '32' },
  { code: '3231', name: '钨钼冶炼', level: 4, parentCode: '323' },
  { code: '3232', name: '稀土金属冶炼', level: 4, parentCode: '323' },
  { code: '3239', name: '其他稀有金属冶炼', level: 4, parentCode: '323' },
  { code: '324', name: '有色金属合金制造', level: 3, parentCode: '32' },
  { code: '3240', name: '有色金属合金制造', level: 4, parentCode: '324' },
  { code: '325', name: '有色金属压延加工', level: 3, parentCode: '32' },
  { code: '3251', name: '铜压延加工', level: 4, parentCode: '325' },
  { code: '3252', name: '铝压延加工', level: 4, parentCode: '325' },
  { code: '3253', name: '贵金属压延加工', level: 4, parentCode: '325' },
  { code: '3254', name: '稀有稀土金属压延加工', level: 4, parentCode: '325' },
  { code: '3259', name: '其他有色金属压延加工', level: 4, parentCode: '325' },

  { code: '38', name: '电气机械和器材制造业', level: 2, parentCode: 'C' },
  { code: '381', name: '电机制造', level: 3, parentCode: '38' },
  { code: '3811', name: '发电机及发电机组制造', level: 4, parentCode: '381' },
  { code: '3812', name: '电动机制造', level: 4, parentCode: '381' },
  { code: '3819', name: '微电机及其他电机制造', level: 4, parentCode: '381' },
  { code: '382', name: '输配电及控制设备制造', level: 3, parentCode: '38' },
  { code: '3821', name: '变压器、整流器和电感器制造', level: 4, parentCode: '382' },
  { code: '3822', name: '电容器及其配套设备制造', level: 4, parentCode: '382' },
  { code: '3823', name: '配电开关控制设备制造', level: 4, parentCode: '382' },
  { code: '3824', name: '电力电子元器件制造', level: 4, parentCode: '382' },
  { code: '3825', name: '光伏设备及元器件制造', level: 4, parentCode: '382' },
  { code: '3829', name: '其他输配电及控制设备制造', level: 4, parentCode: '382' },
  { code: '383', name: '电线、电缆、光缆及电工器材制造', level: 3, parentCode: '38' },
  { code: '3831', name: '电线、电缆制造', level: 4, parentCode: '383' },
  { code: '3832', name: '光纤制造', level: 4, parentCode: '383' },
  { code: '3833', name: '光缆制造', level: 4, parentCode: '383' },
  { code: '3834', name: '绝缘制品制造', level: 4, parentCode: '383' },
  { code: '3839', name: '其他电工器材制造', level: 4, parentCode: '383' },
  { code: '384', name: '电池制造', level: 3, parentCode: '38' },
  { code: '3841', name: '锂离子电池制造', level: 4, parentCode: '384' },
  { code: '3842', name: '镍氢电池制造', level: 4, parentCode: '384' },
  { code: '3843', name: '锌锰电池制造', level: 4, parentCode: '384' },
  { code: '3849', name: '其他电池制造', level: 4, parentCode: '384' },
  { code: '385', name: '家用电力器具制造', level: 3, parentCode: '38' },
  { code: '3851', name: '家用制冷电器具制造', level: 4, parentCode: '385' },
  { code: '3852', name: '家用空气调节器制造', level: 4, parentCode: '385' },
  { code: '3853', name: '家用通风电器具制造', level: 4, parentCode: '385' },
  { code: '3854', name: '家用厨房电器具制造', level: 4, parentCode: '385' },
  { code: '3855', name: '家用清洁卫生电器具制造', level: 4, parentCode: '385' },
  { code: '3856', name: '家用美容、保健护理电器具制造', level: 4, parentCode: '385' },
  { code: '3857', name: '家用燃气用具制造', level: 4, parentCode: '385' },
  { code: '3859', name: '其他家用电力器具制造', level: 4, parentCode: '385' },
  { code: '386', name: '非电力家用器具制造', level: 3, parentCode: '38' },
  { code: '3861', name: '燃气及类似能源家用器具制造', level: 4, parentCode: '386' },
  { code: '3869', name: '其他非电力家用器具制造', level: 4, parentCode: '386' },
  { code: '387', name: '照明器具制造', level: 3, parentCode: '38' },
  { code: '3871', name: '电光源制造', level: 4, parentCode: '387' },
  { code: '3872', name: '照明灯具制造', level: 4, parentCode: '387' },
  { code: '3873', name: '舞台及场地用灯制造', level: 4, parentCode: '387' },
  { code: '3879', name: '其他照明器具制造', level: 4, parentCode: '387' },
  { code: '389', name: '其他电气机械及器材制造', level: 3, parentCode: '38' },
  { code: '3891', name: '电气信号设备装置制造', level: 4, parentCode: '389' },
  { code: '3899', name: '其他未列明电气机械及器材制造', level: 4, parentCode: '389' },
];

function collectRelatedCategories(
  allCategories: IndustryCategory[],
  targetCodes: string[]
): IndustryCategory[] {
  const codeSet = new Set<string>();
  const result: IndustryCategory[] = [];
  const categoryMap = new Map<string, IndustryCategory>();

  for (const cat of allCategories) {
    categoryMap.set(cat.code, cat);
  }

  function addWithParents(code: string) {
    let currentCode: string | null = code;
    while (currentCode && !codeSet.has(currentCode)) {
      const cat = categoryMap.get(currentCode);
      if (cat) {
        codeSet.add(currentCode);
        result.push(cat);
        currentCode = cat.parentCode;
      } else {
        break;
      }
    }
  }

  function addWithChildren(prefix: string) {
    for (const cat of allCategories) {
      if (cat.code.startsWith(prefix) && !codeSet.has(cat.code)) {
        codeSet.add(cat.code);
        result.push(cat);
      }
    }
  }

  for (const code of targetCodes) {
    const level = determineLevel(code);
    addWithParents(code);
    if (level < 4) {
      addWithChildren(code);
    }
  }

  return result.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.code.localeCompare(b.code);
  });
}

function convertToCrawledNodes(
  categories: IndustryCategory[],
  sourceUrl: string
): CrawledNode[] {
  const nodes: CrawledNode[] = [];
  const categoryMap = new Map<string, IndustryCategory>();

  for (const cat of categories) {
    categoryMap.set(cat.code, cat);
  }

  for (const cat of categories) {
    const levelName = LEVEL_NAMES[cat.level] || '未知层级';
    let parentType: string | null = null;

    if (cat.parentCode) {
      const parent = categoryMap.get(cat.parentCode);
      if (parent) {
        parentType = `industry_${LEVEL_NAMES[parent.level]}`;
      }
    }

    const node: CrawledNode = {
      id: generateId('industry', `${cat.code}-${cat.name}`),
      name: cat.name,
      definition: `国民经济行业分类（GB/T 4754-2017）${levelName}：${cat.name}（行业代码 ${cat.code}）。`,
      node_type: 'industry',
      parent_type: parentType,
      aliases: [
        { term: cat.code, context: 'GB/T 4754-2017 行业代码' },
      ],
      sources: [
        createSource(
          'official_data',
          `国家统计局 - 国民经济行业分类（GB/T 4754-2017）${levelName}：${cat.name}（${cat.code}）`,
          sourceUrl
        ),
      ],
      raw_data: {
        code: cat.code,
        name: cat.name,
        level: cat.level,
        levelName,
        parentCode: cat.parentCode,
      },
    };

    nodes.push(node);
  }

  return nodes;
}

export async function crawlStatsGovIndustries(): Promise<CrawlResult> {
  console.log('========================================');
  console.log('开始爬取国家统计局 - 国民经济行业分类');
  console.log('========================================\n');

  let categories: IndustryCategory[] = [];
  let dataSource = '国家统计局官网';
  let sourceUrl = INDUSTRY_CLASSIFICATION_PAGE;

  const downloadSuccess = await downloadExcelFile();
  await sleep(1000);

  if (downloadSuccess && fs.existsSync(CACHE_FILE)) {
    try {
      console.log('\n正在解析 Excel 文件...');
      categories = parseExcelFile(CACHE_FILE);
      console.log(`从 Excel 解析到 ${categories.length} 条行业分类记录`);

      if (categories.length < 100) {
        console.warn('Excel 解析结果较少，可能解析不完整，将使用备用数据');
        categories = [];
      }
    } catch (error) {
      console.error('解析 Excel 文件失败:', error);
      categories = [];
    }
  }

  if (categories.length === 0) {
    console.log('\n使用备用行业分类数据...');
    categories = FALLBACK_DATA;
    dataSource = 'GB/T 4754-2017 内置数据（备用）';
    sourceUrl = 'https://www.stats.gov.cn/sj/tjbz/gmjjhyfl/';
    console.log(`备用数据包含 ${categories.length} 条行业分类记录`);
  }

  const allTargetCodes = [
    ...TARGET_INDUSTRIES.photovoltaic,
    ...TARGET_INDUSTRIES.lithium_battery,
    ...TARGET_INDUSTRIES.new_material,
  ];

  console.log('\n筛选重点行业及其关联分类...');
  const relatedCategories = collectRelatedCategories(categories, allTargetCodes);
  console.log(`筛选出 ${relatedCategories.length} 条相关行业分类记录`);

  console.log('\n转换为 CrawledNode 格式...');
  const nodes = convertToCrawledNodes(relatedCategories, sourceUrl);

  const result: CrawlResult = {
    nodes,
    edges: [],
    metadata: {
      source: dataSource,
      source_url: sourceUrl,
      crawled_at: nowISO(),
      record_count: nodes.length,
    },
  };

  saveJSON(OUTPUT_PATH, result);
  console.log(`\n爬取完成！共 ${nodes.length} 个节点`);
  console.log(`数据已保存到: ${OUTPUT_PATH}`);

  console.log('\n========= 数据概览 =========');
  const levelCounts: Record<number, number> = {};
  for (const cat of relatedCategories) {
    levelCounts[cat.level] = (levelCounts[cat.level] || 0) + 1;
  }
  for (const [level, count] of Object.entries(levelCounts)) {
    console.log(`  ${LEVEL_NAMES[parseInt(level)]}（Level ${level}）: ${count} 条`);
  }

  console.log('\n========= 重点行业 =========');

  const pvNodes = nodes.filter((n) =>
    TARGET_INDUSTRIES.photovoltaic.some((code) => n.name.includes('光伏') || (n.raw_data && (n.raw_data as Record<string, unknown>).code === code))
  );
  console.log(`光伏相关: ${pvNodes.length} 条`);
  for (const n of pvNodes) {
    if (n.raw_data) {
      console.log(`  - ${(n.raw_data as Record<string, unknown>).code}: ${n.name}`);
    }
  }

  const liNodes = nodes.filter((n) =>
    TARGET_INDUSTRIES.lithium_battery.some((code) => n.name.includes('锂离子') || (n.raw_data && (n.raw_data as Record<string, unknown>).code === code))
  );
  console.log(`锂电池相关: ${liNodes.length} 条`);
  for (const n of liNodes) {
    if (n.raw_data) {
      console.log(`  - ${(n.raw_data as Record<string, unknown>).code}: ${n.name}`);
    }
  }

  const chemNodes = nodes.filter((n) =>
    n.raw_data && typeof (n.raw_data as Record<string, unknown>).code === 'string' &&
    String((n.raw_data as Record<string, unknown>).code).startsWith('26')
  );
  console.log(`化工/新材料（26开头）: ${chemNodes.length} 条`);

  const metalNodes = nodes.filter((n) =>
    n.raw_data && typeof (n.raw_data as Record<string, unknown>).code === 'string' &&
    String((n.raw_data as Record<string, unknown>).code).startsWith('32')
  );
  console.log(`有色金属（32开头）: ${metalNodes.length} 条`);

  console.log('\n============================\n');

  return result;
}

if (require.main === module) {
  crawlStatsGovIndustries().catch((error) => {
    console.error('爬虫执行失败:', error);
    process.exit(1);
  });
}
