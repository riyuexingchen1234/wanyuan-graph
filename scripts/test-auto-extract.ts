/**
 * scripts/test-auto-extract.ts
 *
 * auto-extract MVP 自测：拿一段真实公开文本（T/CPIA 0030 行业标准 + 招股说明书）
 * 跑模式匹配，演示 80% 自动化抽取的最小可用形态。
 *
 * 【预期行为】
 *   - 命中规则的句子 → 输出 ExtractedTriple
 *   - 未命中的句子 → 进 unmatched_hints 留痕
 *   - 调用 buildEdgesFromTriples 时，未注册的术语被跳过（演示"宁缺毋滥"原则）
 *
 * 运行: npx tsx scripts/test-auto-extract.ts
 */

import { extractTriples, buildEdgesFromTriples } from '../src/lib/auto-extract';
import type { GraphEdge } from '../src/lib/types';
import seedData from '../data/seed/pv-chain.json';

const SAMPLE_TEXT = `
白银是银浆的关键原料，占银浆成本88-91%。
白银由银矿开采提炼，是硝酸银的上游。
硝酸银经液相化学还原法制成银粉。
银粉是银浆的主原料。
玻璃粉是银浆的无机粘结剂。
有机载体是银浆的有机相。
正面银浆应用于光伏电池片。
光伏电站满足用电需求。
聚乙烯用于光伏胶膜，但本文不展开。
`;

const seedNodes = (seedData as { nodes: { id: string; name: string; aliases?: { term: string }[] }[] }).nodes;
const termDict = new Map<string, string>();
for (const n of seedNodes) {
  termDict.set(n.name, n.id);
  for (const a of n.aliases ?? []) termDict.set(a.term, n.id);
}

function termToId(term: string): string | undefined {
  return termDict.get(term);
}

let edgeCounter = 1000;
function edgeIdFactory(_h: string, _t: string, _r: string): string {
  return `auto-test-${++edgeCounter}`;
}

console.log('--- 抽取阶段 ---');
const out = extractTriples({
  text: SAMPLE_TEXT,
  source_meta: {
    source_type: 'standard',
    description: 'T/CPIA 0030 行业标准 + 帝科股份招股说明书 合成示例文本',
    url: 'https://example.org/sample',
  },
});

console.log(`\n抽取到 ${out.triples.length} 条三元组：`);
for (const t of out.triples) {
  console.log(
    `  [${t.relation_type}] ${t.head_text} → ${t.tail_text}` +
    `  置信度=${t.confidence}  规则=${t.rule_name}`
  );
  console.log(`    引用: "${t.raw_quote}"`);
}

console.log(`\n未匹配 (${out.unmatched_hints.length} 条)：`);
for (const u of out.unmatched_hints) {
  console.log(`  - "${u.quote}"  (${u.reason})`);
}

console.log('\n--- 建边阶段 ---');
const edges = buildEdgesFromTriples({
  triples: out.triples,
  source_meta: {
    source_type: 'standard',
    description: 'T/CPIA 0030 行业标准 + 帝科股份招股说明书 合成示例文本',
    url: 'https://example.org/sample',
  },
  termToId,
  edgeIdFactory,
  now: '2026-06-28T12:00:00Z',
});

console.log(`\n生成 ${edges.length} 条 GraphEdge：`);
for (const e of edges) {
  console.log(`  ${e.id}: ${e.source} → ${e.target} [${e.relation_type}] (${e.relation_category}) status=${e.verification_status}`);
  console.log(`    proposed_by.method: ${e.proposed_by?.method}`);
  console.log(`    transitions: ${e.transitions?.length} 条, reviewer_chain: ${e.reviewer_chain?.length} 条, dispute_history: ${e.dispute_history?.length} 条`);
  console.log(`    evidence[0]: ${e.evidence?.[0]?.description?.slice(0, 80)}...`);
}

console.log('\n--- 校验阶段：与 schema v0.4 对比 ---');
import { validateGraphData } from '../src/lib/schema-validator';

const valid = validateGraphData({ nodes: [], edges });
console.log(`空数据校验: ${valid.valid ? 'PASS' : 'FAIL ' + valid.errors.join(';')}`);

// 把生成的边加到种子数据里再校验
const merged = {
  nodes: seedNodes,
  edges: [...(seedData as { edges: GraphEdge[] }).edges, ...edges],
};
const mergedValid = validateGraphData(merged);
console.log(`合并种子+生成边 校验: ${mergedValid.valid ? 'PASS' : 'FAIL'}`);
if (!mergedValid.valid) {
  console.log('  errors:');
  mergedValid.errors.forEach((err) => console.log('    -', err));
  process.exit(1);
}

console.log('\n=== 完成 ===');
