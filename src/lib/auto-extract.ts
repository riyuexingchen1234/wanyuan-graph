/**
 * 万源图谱 — 80% 自动化生产链路：原文 → 边三元组
 *
 * 这是 production-workflow.md 中"步骤 2: AI 结构化抽取"的最小可运行骨架。
 *
 * 【实事求是声明】
 * 本 MVP 实现的是**规则模式匹配**，不是 LLM 调用。
 * 沙箱内无 LLM API，且项目处于"骨架验证"阶段，模式匹配已能覆盖部分
 * 标准化文本（如 T/CPIA 团体标准摘录、招股说明书格式段落）。
 * 真实生产环境的 80% 自动化应替换为 LLM 抽取——本文件暴露的接口
 *  （extractTriples + ExtractedTriple）设计为可平滑替换，调用方无需改动。
 *
 * 模式库（v0.4 起按"规则 + 词典"持续扩展）：
 *   1. 原料关系:  "X 是 Y 的原料" / "X 由 Y 制成" / "X for Y"
 *   2. 工艺关系:  "X 经 Y 加工为 Z" / "X 通过 Y 处理"
 *   3. 应用关系:  "X 应用于 Y" / "X 用于 Y"
 *   4. 标准定义:  "X 是 Y 的术语" / "GB/T XXXX 规定 X 是 Y"
 *
 * 每条规则都有：
 *   - relation_type (映射到 schema 的 RelationType 枚举)
 *   - relation_category (映射到 schema 的 RelationCategory 枚举)
 *   - confidence (0-1，反映规则强度)
 *   - raw_quote (原文片段，作为 evidence 引用)
 */

import type {
  RelationType,
  RelationCategory,
  ProposedBy,
  GraphEdge,
  Source,
  SourceType,
} from './types';

/** 自动抽取产出的原始三元组（未经规范化、未经人审）。 */
export interface ExtractedTriple {
  /** 头实体原文，如"白银" */
  head_text: string;
  /** 尾实体原文，如"硝酸银" */
  tail_text: string;
  /** 推断的关系类型 */
  relation_type: RelationType;
  /** 推断的关系大类 */
  relation_category: RelationCategory;
  /** 置信度 0-1 */
  confidence: number;
  /** 原文引用片段（用于 evidence） */
  raw_quote: string;
  /** 触发该匹配的规则名（用于审计） */
  rule_name: string;
}

export interface ExtractInput {
  /** 原始文本（已 OCR / 已抓取 / 已分段） */
  text: string;
  /** 来源元信息（用于构造 evidence） */
  source_meta: {
    source_type: SourceType;
    description: string;
    url?: string;
  };
  /** 已知节点词典（用于术语归一化；可选） */
  known_terms?: Set<string>;
}

export interface ExtractOutput {
  triples: ExtractedTriple[];
  /** 文本中未匹配到规则的疑似关系，仅作 audit 留痕 */
  unmatched_hints: Array<{ quote: string; reason: string }>;
}

/* -------------------------------------------------------------------------- */
/* 规则库                                                                    */
/* -------------------------------------------------------------------------- */

interface PatternRule {
  name: string;
  relation_type: RelationType;
  relation_category: RelationCategory;
  /** 正则匹配 (头, 尾) — 必须有两个捕获组 */
  regex: RegExp;
  confidence: number;
}

/**
 * 规则注册表。每条规则的 confidence 反映模式强度（强模板 > 弱模板）。
 * v0.4 起按生产经验持续扩展。
 */
const RULES: PatternRule[] = [
  {
    name: 'A_是_B_的_原料',
    relation_type: 'raw_material_for',
    relation_category: 'production_raw_material',
    regex: /([一-龥\w·]+)\s*(?:是|为|作为)\s*([一-龥\w·]+)\s*的\s*(?:主要|关键)?\s*原料/,
    confidence: 0.8,
  },
  {
    name: 'A_是_B_的上游',
    relation_type: 'upstream_of',
    relation_category: 'production_raw_material',
    regex: /([一-龥\w·]+)\s*是\s*([一-龥\w·]+)\s*的\s*上游/,
    confidence: 0.7,
  },
  {
    name: 'A_由_B_制成',
    relation_type: 'can_be_processed_into',
    relation_category: 'production_process',
    regex: /([一-龥\w·]+)\s*(?:由|经)\s*([一-龥\w·]+)\s*(?:制成|加工|生产)/,
    confidence: 0.75,
  },
  {
    name: 'A_应用于_B',
    relation_type: 'applied_in',
    relation_category: 'product_business',
    // 【修复】非贪婪 head + "应用于" 作为整体；否则贪婪 head 会把"应"字吞掉，
    // 退化成匹配"用于"。两段规则分开后，引擎优先尝试"应用于"整词。
    regex: /([一-龥\w·]+?)\s*应用于\s*([一-龥\w·]+)/,
    confidence: 0.75,
  },
  {
    name: 'A_用于_B',
    relation_type: 'applied_in',
    relation_category: 'product_business',
    regex: /([一-龥\w·]+)\s*(?:用于|用在)\s*([一-龥\w·]+)/,
    confidence: 0.7,
  },
  {
    name: 'A_满足_B_需求',
    relation_type: 'satisfies',
    relation_category: 'product_business',
    regex: /([一-龥\w·]+)\s*(?:满足|响应|服务)\s*([一-龥\w·]+)\s*(?:需求|应用)/,
    confidence: 0.75,
  },
  {
    name: 'A_由_B_构成',
    relation_type: 'made_of',
    relation_category: 'production_raw_material',
    regex: /([一-龥\w·]+)\s*(?:由|含)\s*([一-龥\w·]+)\s*(?:构成|组成)/,
    confidence: 0.7,
  },
];

/* -------------------------------------------------------------------------- */
/* 抽取主流程                                                                */
/* -------------------------------------------------------------------------- */

/** 把输入文本按句号/分号/换行切成"句子块"，逐块匹配。 */
function segmentText(text: string): string[] {
  return text
    .split(/[。；;\n\r]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4);
}

export function extractTriples(input: ExtractInput): ExtractOutput {
  const segments = segmentText(input.text);
  // 同一句子 + 同一关系类型：去重，保留置信度最高那条（修 [应用于/用于] 双匹配问题）
  const bestByQuoteAndType = new Map<string, ExtractedTriple>();
  const seen = new Set<string>();
  const triples: ExtractedTriple[] = [];
  const unmatched_hints: Array<{ quote: string; reason: string }> = [];

  for (const seg of segments) {
    let matchedAny = false;
    for (const rule of RULES) {
      const m = seg.match(rule.regex);
      if (!m) continue;
      matchedAny = true;
      const head = m[1]?.trim();
      const tail = m[2]?.trim();
      if (!head || !tail || head === tail) continue;
      const dedupKey = `${seg}|${rule.relation_type}`;
      const existing = bestByQuoteAndType.get(dedupKey);
      if (existing && existing.confidence >= rule.confidence) continue;
      bestByQuoteAndType.set(dedupKey, {
        head_text: head,
        tail_text: tail,
        relation_type: rule.relation_type,
        relation_category: rule.relation_category,
        confidence: rule.confidence,
        raw_quote: seg,
        rule_name: rule.name,
      });
    }
    if (!matchedAny) {
      // 简单提示：含原料/工艺/应用关键词但未匹配
      if (/(原料|工艺|设备|应用|满足|上游|下游|构成|制成)/.test(seg) && seg.length >= 8) {
        unmatched_hints.push({
          quote: seg,
          reason: '含关系关键词但未匹配任何规则',
        });
      }
    }
  }

  // 把 best 收集 + 全局去重 (head|relation|tail)
  for (const t of Array.from(bestByQuoteAndType.values())) {
    const key = `${t.head_text}|${t.relation_type}|${t.tail_text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    triples.push(t);
  }

  return { triples, unmatched_hints };
}

/* -------------------------------------------------------------------------- */
/* 把 ExtractedTriple 转成 GraphEdge（auto-extracted 状态）                  */
/* -------------------------------------------------------------------------- */

export interface BuildEdgesInput {
  triples: ExtractedTriple[];
  source_meta: {
    source_type: SourceType;
    description: string;
    url?: string;
  };
  /** 术语归一化：把原文术语映射到节点 id。未能映射的边会被跳过。 */
  termToId: (term: string) => string | undefined;
  /** 边 id 生成器（保证全局唯一） */
  edgeIdFactory: (head: string, tail: string, relation: RelationType) => string;
  /** 当前时间（可注入，便于测试） */
  now?: string;
}

export function buildEdgesFromTriples(input: BuildEdgesInput): GraphEdge[] {
  const { triples, source_meta, termToId, edgeIdFactory, now } = input;
  const ts = now ?? new Date().toISOString();
  const edges: GraphEdge[] = [];

  for (const t of triples) {
    const headId = termToId(t.head_text);
    const tailId = termToId(t.tail_text);
    if (!headId || !tailId) continue; // 术语未注册：留待人工补节点，不产出边
    const evidence: Source = {
      source_type: source_meta.source_type,
      description: `${source_meta.description} | 规则: ${t.rule_name} | 置信度: ${t.confidence} | 引用: "${t.raw_quote}"`,
      url: source_meta.url,
      retrieved_at: ts,
    };
    const proposed_by: ProposedBy = {
      method: 'auto_crawler',
      reasoning: `自动模式匹配: ${t.rule_name}; 原文="${t.raw_quote}"`,
      proposed_at: ts,
    };
    edges.push({
      id: edgeIdFactory(headId, tailId, t.relation_type),
      source: headId,
      target: tailId,
      relation_type: t.relation_type,
      relation_category: t.relation_category,
      verification_status: 'auto-extracted',
      evidence: [evidence],
      proposed_by,
      transitions: [
        { from: 'auto-extracted', to: 'auto-extracted', at: ts, actor_id: 'auto-extract', reason: 'initial extraction' },
      ],
      dispute_history: [],
      reviewer_chain: [],
      created_at: ts,
      updated_at: ts,
    });
  }

  return edges;
}
