import { loadJSON, saveJSON, createSource, deduplicateEdges } from './utils';
import type { CrawlResult, CrawledEdge, CrawledNode } from './types';
import type { RelationType, SourceType } from '../../src/lib/types';

const INPUT_FILE = '/workspace/data/raw/gb-standards.json';
const OUTPUT_FILE = '/workspace/data/raw/gb-extracted-edges.json';

const NON_ENTITY_PATTERNS = [
  /测试方法$/, /试验方法$/, /技术要求$/, /技术条件$/, /通用要求$/, /通用规范$/,
  /安全要求$/, /安全鉴定$/, /设计要求$/, /性能要求$/, /检验方法$/, /检测方法$/,
  /评定方法$/, /评价方法$/, /验收规范$/, /验收方法$/, /测量方法$/, /测定方法$/,
  /计算方法$/, /分析方法$/, /规范$/, /规程$/, /标准$/, /指南$/, /导则$/,
  /建模导则$/, /控制规范$/, /测试规程$/, /技术规范$/, /管理规范$/,
  /安全规程$/, /应急管理规范$/, /术语$/, /试验程序$/, /鉴定$/, /评定$/,
  /标定的一般规定$/, /型号命名方法$/, /设计鉴定和定型$/,
  /回收处理方法$/, /现场测量$/, /技术规定$/,
  /第[一二三四五六七八九十百千0-9]+[-－]?[一二三四五六七八九十百千0-9]*部分/,
];

const ENTITY_SUFFIXES = [
  '组件', '电池', '玻璃', '胶膜', '材料', '隔膜', '正极材料', '负极材料',
  '管材', '板材', '薄膜', '纤维', '型材', '管件', '坩埚', '单晶', '多晶',
  '硅片', '衬底片', '外延片', '抛光片', '靶材', '基板', '背板',
  '胶粘剂', '粘合剂', '密封材料', '胶粘带', '熔断器', '二极管',
  '控制器', '逆变器', '蓄电池',
  '电缆', '电线', '电容器', '树脂', '聚乙烯', '聚丙烯',
  '热水器', '机器人', '遮阳板', '中空玻璃', '夹层玻璃',
  '储能系统', '预制舱', '硅料', '硅棒',
];

const MATERIAL_BASE_NAMES = [
  '聚乙烯', '聚丙烯', '聚氯乙烯', '聚苯乙烯', '环氧树脂',
  '铜', '铝', '钢', '不锈钢', '硅', '石墨', '炭',
];

interface ExtractedEdge {
  source: string;
  target: string;
  relation_type: RelationType;
  evidence: Array<{ source_type: SourceType; description: string; url?: string; retrieved_at: string }>;
  note: string;
  confidence: number;
}

function isEntityName(name: string): boolean {
  const clean = name.replace(/\s+/g, '');
  
  if (!clean || clean.length < 2) return false;
  if (clean.length > 25) return false;
  
  for (const pattern of NON_ENTITY_PATTERNS) {
    if (pattern.test(clean)) return false;
  }
  
  if (/^(第|其|该|此|这|那|一个|一种)/.test(clean)) return false;
  if (/[，。；：、！？,.?!;:（）()【】\[\]《》]/.test(clean)) return false;
  
  const hasEntitySuffix = ENTITY_SUFFIXES.some(s => clean.endsWith(s));
  
  return hasEntitySuffix;
}

function cleanEntityName(name: string): string {
  let cleaned = name.trim().replace(/\s+/g, '');
  
  const prefixPatterns = [
    /^地面用/, /^航天用/, /^建筑用/, /^户用/, /^家用/, /^工业用/,
    /^食品包装用/, /^农业用/, /^燃气用/, /^给水用/, /^排水用/,
    /^冷热水用/, /^核电厂用/, /^汽车用/, /^电容器用/, /^电线电缆用/,
    /^太阳能光伏照明用/, /^光伏系统用/, /^光伏发电系统用/,
    /^锂离子电池用/, /^锂电池用/, /^电池用/,
    /^光伏组件用/, /^太阳能电池用/, /^光伏用/,
    /^石油化工用/, /^包装用/, /^输水用/, /^埋地用/,
    /^在役/, /^高模量/, /^超高分子量/, /^双向拉伸/, /^交联/,
    /^高密度/, /^低密度/, /^中密度/, /^线性低密度/,
    /^改性/, /^发泡/, /^均聚/, /^共聚/,
    /^流延/, /^金属化/, /^金属箔式/,
    /^晶体硅/, /^双面/, /^退役/, /^薄膜/,
    /^太阳能/, /^光伏/,
    /^铜铟镓硒/, /^碲化镉/,
  ];
  
  let iterations = 0;
  while (iterations < 5) {
    let changed = false;
    for (const p of prefixPatterns) {
      const before = cleaned;
      cleaned = cleaned.replace(p, '');
      if (before !== cleaned) {
        changed = true;
        break;
      }
    }
    if (!changed) break;
    iterations++;
  }
  
  return cleaned;
}

function buildNodeIndex(nodes: CrawledNode[]): {
  exactMap: Map<string, CrawledNode>;
  simplifiedMap: Map<string, CrawledNode>;
  entityNodes: CrawledNode[];
} {
  const exactMap = new Map<string, CrawledNode>();
  const simplifiedMap = new Map<string, CrawledNode>();
  const entityNodes = nodes.filter(n => isEntityName(n.name));
  
  for (const node of entityNodes) {
    const cleanName = node.name.replace(/\s+/g, '');
    exactMap.set(cleanName, node);
    
    const simplified = cleanEntityName(cleanName);
    if (simplified !== cleanName) {
      if (!simplifiedMap.has(simplified) || 
          node.name.length < simplifiedMap.get(simplified)!.name.length) {
        simplifiedMap.set(simplified, node);
      }
    }
  }
  
  return { exactMap, simplifiedMap, entityNodes };
}

function findNodeByName(
  index: ReturnType<typeof buildNodeIndex>,
  name: string
): CrawledNode | null {
  const cleanName = name.trim().replace(/\s+/g, '');
  
  if (index.exactMap.has(cleanName)) {
    return index.exactMap.get(cleanName)!;
  }
  
  const simplified = cleanEntityName(cleanName);
  if (index.simplifiedMap.has(simplified)) {
    return index.simplifiedMap.get(simplified)!;
  }
  if (index.exactMap.has(simplified)) {
    return index.exactMap.get(simplified)!;
  }
  
  let bestMatch: CrawledNode | null = null;
  let bestScore = 0;
  
  for (const node of index.entityNodes) {
    const nodeName = node.name.replace(/\s+/g, '');
    const nodeSimplified = cleanEntityName(nodeName);
    
    if (nodeSimplified === simplified) {
      return node;
    }
    
    if (nodeSimplified.includes(simplified) || simplified.includes(nodeSimplified)) {
      const minLen = Math.min(nodeSimplified.length, simplified.length);
      const maxLen = Math.max(nodeSimplified.length, simplified.length);
      const score = minLen / maxLen;
      
      if (score > 0.75 && score > bestScore) {
        bestScore = score;
        bestMatch = node;
      }
    }
  }
  
  return bestMatch;
}

function extractRuleAYongPattern(
  allNodes: CrawledNode[],
  index: ReturnType<typeof buildNodeIndex>
): ExtractedEdge[] {
  const edges: ExtractedEdge[] = [];
  const pattern = /^(.+?)用(.+)$/;
  
  const processedStandards = new Set<string>();
  
  for (const node of allNodes) {
    if (!node.raw_data?.standard_name) continue;
    const standardNo = node.raw_data.standard_no as string;
    if (processedStandards.has(standardNo)) continue;
    processedStandards.add(standardNo);
    
    const standardName = node.raw_data.standard_name as string;
    const cleanName = standardName.replace(/\s+/g, '');
    
    const match = cleanName.match(pattern);
    if (!match) continue;
    
    let [, leftPart, rightPart] = match;
    
    const application = cleanEntityName(leftPart.trim());
    const material = cleanEntityName(rightPart.trim());
    
    if (!ENTITY_SUFFIXES.some(s => application.endsWith(s)) && application.length > 10) {
      continue;
    }
    if (!ENTITY_SUFFIXES.some(s => material.endsWith(s)) && material.length > 10) {
      continue;
    }
    
    if (application.length < 2 || material.length < 2) continue;
    
    const appNode = findNodeByName(index, application);
    const matNode = findNodeByName(index, material);
    
    if (!appNode || !matNode) continue;
    if (appNode.id === matNode.id) continue;
    
    let relationType: RelationType = 'applied_in';
    let confidence = 0.7;
    
    if (matNode.node_type === 'material') {
      if (appNode.node_type === 'product' || appNode.node_type === 'material') {
        relationType = 'raw_material_for';
        confidence = 0.85;
      }
    } else if (matNode.node_type === 'product') {
      if (appNode.node_type === 'product') {
        relationType = 'applied_in';
        confidence = 0.75;
      }
    }
    
    const source = node.sources.find(s => s.description.includes(standardNo)) || node.sources[0];
    
    edges.push({
      source: matNode.id,
      target: appNode.id,
      relation_type: relationType,
      evidence: [createSource('standard', `${standardNo} ${standardName}`, source?.url)],
      note: `规则A："${application}用${material}" → ${matNode.name} ${relationType} ${appNode.name}`,
      confidence,
    });
  }
  
  return edges;
}

function extractRuleBPartStandard(
  allNodes: CrawledNode[],
  index: ReturnType<typeof buildNodeIndex>
): ExtractedEdge[] {
  const edges: ExtractedEdge[] = [];
  const pattern = /^(.+?)第[一二三四五六七八九十百千0-9]+[-－]?[一二三四五六七八九十百千0-9]*部分[：:](.+)$/;
  
  const processedStandards = new Set<string>();
  
  for (const node of allNodes) {
    if (!node.raw_data?.standard_name) continue;
    const standardNo = node.raw_data.standard_no as string;
    if (processedStandards.has(standardNo)) continue;
    processedStandards.add(standardNo);
    
    const standardName = node.raw_data.standard_name as string;
    const cleanName = standardName.replace(/\s+/g, '');
    
    const match = cleanName.match(pattern);
    if (!match) continue;
    
    let [, parentPart, childPart] = match;
    
    const parent = cleanEntityName(parentPart.trim());
    const child = cleanEntityName(childPart.trim());
    
    if (!ENTITY_SUFFIXES.some(s => parent.endsWith(s)) && parent.length > 10) {
      continue;
    }
    if (!ENTITY_SUFFIXES.some(s => child.endsWith(s)) && child.length > 10) {
      continue;
    }
    
    if (parent.length < 2 || child.length < 2) continue;
    
    const parentNode = findNodeByName(index, parent);
    const childNode = findNodeByName(index, child);
    
    if (!parentNode || !childNode) continue;
    if (parentNode.id === childNode.id) continue;
    
    let relationType: RelationType = 'applied_in';
    let confidence = 0.7;
    
    if (childNode.node_type === 'material' && 
        (parentNode.node_type === 'product' || parentNode.node_type === 'material')) {
      relationType = 'raw_material_for';
      confidence = 0.8;
    } else if (childNode.node_type === 'product' && parentNode.node_type === 'product') {
      const childNameClean = childNode.name.replace(/\s+/g, '');
      const parentNameClean = parentNode.name.replace(/\s+/g, '');
      
      if (childNameClean.length > parentNameClean.length && 
          childNameClean.includes(parentNameClean)) {
        relationType = 'can_be_processed_into';
        confidence = 0.7;
      } else {
        relationType = 'applied_in';
        confidence = 0.65;
      }
    }
    
    const source = node.sources.find(s => s.description.includes(standardNo)) || node.sources[0];
    
    edges.push({
      source: childNode.id,
      target: parentNode.id,
      relation_type: relationType,
      evidence: [createSource('standard', `${standardNo} ${standardName}`, source?.url)],
      note: `规则B：分部分标准"${parent} 第X部分：${child}" → ${childNode.name} ${relationType} ${parentNode.name}`,
      confidence,
    });
  }
  
  return edges;
}

function extractRuleDMaterialHierarchy(
  index: ReturnType<typeof buildNodeIndex>
): ExtractedEdge[] {
  const edges: ExtractedEdge[] = [];
  
  const materialNodes = index.entityNodes.filter(n => n.node_type === 'material');
  
  const baseMaterials = new Map<string, CrawledNode>();
  for (const baseName of MATERIAL_BASE_NAMES) {
    const node = findNodeByName(index, baseName);
    if (node && node.node_type === 'material') {
      baseMaterials.set(baseName, node);
    }
  }
  
  for (const node of materialNodes) {
    const name = node.name.replace(/\s+/g, '');
    const simplified = cleanEntityName(name);
    
    for (const [baseName, baseNode] of baseMaterials) {
      if (node.id === baseNode.id) continue;
      
      if (simplified.startsWith(baseName) && simplified.length > baseName.length + 2) {
        const alreadyExists = edges.some(e => 
          e.source === baseNode.id && e.target === node.id && e.relation_type === 'can_be_processed_into'
        );
        if (alreadyExists) continue;
        
        const confidence = 0.65;
        
        edges.push({
          source: baseNode.id,
          target: node.id,
          relation_type: 'can_be_processed_into',
          evidence: node.sources.length > 0 ? [node.sources[0]] : [],
          note: `规则D：材料衍生 "${baseName}" → "${node.name}"`,
          confidence,
        });
      }
    }
  }
  
  return edges;
}

function extractRuleEProductHierarchy(
  index: ReturnType<typeof buildNodeIndex>
): ExtractedEdge[] {
  const edges: ExtractedEdge[] = [];
  
  const productNodes = index.entityNodes.filter(n => n.node_type === 'product');
  
  const coreProductNames = [
    '光伏组件', '光伏电池', '太阳能电池', '锂离子电池', '锂电池',
    '光伏玻璃', '光伏胶膜', '光伏背板',
  ];
  
  const coreProducts = new Map<string, CrawledNode>();
  for (const name of coreProductNames) {
    const node = findNodeByName(index, name);
    if (node && node.node_type === 'product') {
      coreProducts.set(name, node);
    }
  }
  
  for (const node of productNodes) {
    const name = node.name.replace(/\s+/g, '');
    const simplified = cleanEntityName(name);
    
    for (const [coreName, coreNode] of coreProducts) {
      if (node.id === coreNode.id) continue;
      
      if (simplified.includes(coreName) && simplified.length > coreName.length + 2) {
        const alreadyExists = edges.some(e => 
          e.source === coreNode.id && e.target === node.id && e.relation_type === 'can_be_processed_into'
        );
        if (alreadyExists) continue;
        
        let confidence = 0.6;
        
        if (simplified.startsWith(coreName)) {
          confidence = 0.65;
        }
        
        edges.push({
          source: coreNode.id,
          target: node.id,
          relation_type: 'can_be_processed_into',
          evidence: node.sources.length > 0 ? [node.sources[0]] : [],
          note: `规则E：产品衍生 "${coreNode.name}" → "${node.name}"`,
          confidence,
        });
      }
    }
  }
  
  return edges;
}

function mergeExtractedEdges(edgesList: ExtractedEdge[][]): ExtractedEdge[] {
  const edgeMap = new Map<string, ExtractedEdge>();
  
  for (const edges of edgesList) {
    for (const edge of edges) {
      const key = `${edge.source}-${edge.target}-${edge.relation_type}`;
      const existing = edgeMap.get(key);
      
      if (existing) {
        const mergedEvidence = [...existing.evidence];
        for (const e of edge.evidence) {
          if (!mergedEvidence.some(me => me.url === e.url && me.description === e.description)) {
            mergedEvidence.push(e);
          }
        }
        edgeMap.set(key, {
          ...existing,
          evidence: mergedEvidence,
          confidence: Math.max(existing.confidence, edge.confidence),
          note: `${existing.note}; ${edge.note}`,
        });
      } else {
        edgeMap.set(key, { ...edge });
      }
    }
  }
  
  return Array.from(edgeMap.values());
}

function filterByConfidence(edges: ExtractedEdge[], minConfidence: number): ExtractedEdge[] {
  return edges.filter(e => e.confidence >= minConfidence);
}

function extractedEdgeToCrawledEdge(edge: ExtractedEdge): CrawledEdge {
  return {
    source: edge.source,
    target: edge.target,
    relation_type: edge.relation_type,
    verification_status: 'proposed',
    evidence: edge.evidence,
    note: edge.note,
    raw_data: {
      confidence: edge.confidence,
    },
  };
}

function printStats(edges: ExtractedEdge[], nodes: CrawledNode[]): void {
  console.log('\n=== 提取结果统计 ===');
  console.log(`总提取边数: ${edges.length}`);
  
  const typeCount: Record<string, number> = {};
  const confidenceBuckets = { '0.9+': 0, '0.8-0.9': 0, '0.7-0.8': 0, '0.6-0.7': 0, '0.5-0.6': 0 };
  
  for (const edge of edges) {
    typeCount[edge.relation_type] = (typeCount[edge.relation_type] || 0) + 1;
    
    const c = edge.confidence;
    if (c >= 0.9) confidenceBuckets['0.9+']++;
    else if (c >= 0.8) confidenceBuckets['0.8-0.9']++;
    else if (c >= 0.7) confidenceBuckets['0.7-0.8']++;
    else if (c >= 0.6) confidenceBuckets['0.6-0.7']++;
    else confidenceBuckets['0.5-0.6']++;
  }
  
  console.log('\n各关系类型分布:');
  for (const [type, count] of Object.entries(typeCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count} 条`);
  }
  
  console.log('\n置信度分布:');
  for (const [bucket, count] of Object.entries(confidenceBuckets)) {
    console.log(`  ${bucket}: ${count} 条`);
  }
  
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  console.log('\n=== 高置信度示例 (置信度>=0.8) ===');
  const highConf = edges.filter(e => e.confidence >= 0.8).sort((a, b) => b.confidence - a.confidence);
  highConf.slice(0, 15).forEach((edge, i) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    console.log(`${i + 1}. ${sourceNode?.name || edge.source} → ${targetNode?.name || edge.target}`);
    console.log(`   关系: ${edge.relation_type}, 置信度: ${edge.confidence}`);
    console.log(`   说明: ${edge.note.substring(0, 100)}`);
  });
  
  console.log('\n=== 中等置信度示例 (置信度0.7-0.8) ===');
  const midConf = edges.filter(e => e.confidence >= 0.7 && e.confidence < 0.8).sort((a, b) => b.confidence - a.confidence);
  midConf.slice(0, 15).forEach((edge, i) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    console.log(`${i + 1}. ${sourceNode?.name || edge.source} → ${targetNode?.name || edge.target}`);
    console.log(`   关系: ${edge.relation_type}, 置信度: ${edge.confidence}`);
    console.log(`   说明: ${edge.note.substring(0, 100)}`);
  });
  
  console.log('\n=== 一般置信度示例 (置信度0.6-0.7) ===');
  const lowConf = edges.filter(e => e.confidence >= 0.6 && e.confidence < 0.7).sort((a, b) => b.confidence - a.confidence);
  lowConf.slice(0, 10).forEach((edge, i) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    console.log(`${i + 1}. ${sourceNode?.name || edge.source} → ${targetNode?.name || edge.target}`);
    console.log(`   关系: ${edge.relation_type}, 置信度: ${edge.confidence}`);
    console.log(`   说明: ${edge.note.substring(0, 100)}`);
  });
}

function main(): void {
  console.log('从国家标准数据中提取边关系...');
  console.log(`输入文件: ${INPUT_FILE}`);
  
  const data = loadJSON<CrawlResult>(INPUT_FILE);
  if (!data) {
    console.error('无法读取输入文件');
    process.exit(1);
  }
  
  console.log(`读取到 ${data.nodes.length} 个节点, ${data.edges.length} 条已有边`);
  
  const index = buildNodeIndex(data.nodes);
  console.log(`实体节点数: ${index.entityNodes.length}`);
  console.log(`节点索引：精确匹配 ${index.exactMap.size}, 简化匹配 ${index.simplifiedMap.size}`);
  
  const minConfidence = 0.6;
  console.log(`\n置信度阈值: ${minConfidence}`);
  
  console.log('\n应用规则A: XX用XX 模式...');
  const edgesA = extractRuleAYongPattern(data.nodes, index);
  console.log(`  规则A提取: ${edgesA.length} 条`);
  
  console.log('\n应用规则B: 分部分标准 模式...');
  const edgesB = extractRuleBPartStandard(data.nodes, index);
  console.log(`  规则B提取: ${edgesB.length} 条`);
  
  console.log('\n应用规则D: 材料层级衍生关系...');
  const edgesD = extractRuleDMaterialHierarchy(index);
  console.log(`  规则D提取: ${edgesD.length} 条`);
  
  console.log('\n应用规则E: 产品层级衍生关系...');
  const edgesE = extractRuleEProductHierarchy(index);
  console.log(`  规则E提取: ${edgesE.length} 条`);
  
  console.log('\n合并所有规则结果并去重...');
  const allEdges = mergeExtractedEdges([edgesA, edgesB, edgesD, edgesE]);
  console.log(`合并后: ${allEdges.length} 条`);
  
  console.log(`\n按置信度 ${minConfidence} 过滤...`);
  const filteredEdges = filterByConfidence(allEdges, minConfidence);
  console.log(`过滤后: ${filteredEdges.length} 条`);
  
  const crawledEdges = filteredEdges.map(e => extractedEdgeToCrawledEdge(e));
  const dedupedEdges = deduplicateEdges(crawledEdges);
  console.log(`去重后最终: ${dedupedEdges.length} 条`);
  
  const result: CrawlResult = {
    nodes: data.nodes,
    edges: dedupedEdges,
    metadata: {
      source: '国家标准边关系提取',
      source_url: data.metadata.source_url,
      crawled_at: new Date().toISOString(),
      record_count: dedupedEdges.length,
    },
  };
  
  saveJSON(OUTPUT_FILE, result);
  console.log(`\n结果已保存到: ${OUTPUT_FILE}`);
  
  printStats(filteredEdges, data.nodes);
}

main();
