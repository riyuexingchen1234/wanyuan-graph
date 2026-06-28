import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { applyTransition, validateEdgeStateConsistency, StateMachineError } from '@/lib/state-machine';
import type { GraphEdge, DisputeRecord, ReviewerRole } from '@/lib/types';

const SEED_PATH = join(process.cwd(), 'data', 'seed', 'pv-chain.json');

/**
 * POST /api/edges/[id]/challenge
 *
 * 质疑者入口：任意用户对任意边发起质疑。
 * 副作用：
 *   1. 边状态 → disputed
 *   2. transitions 追加 { from: 原状态, to: disputed, actor_id: 质疑者 }
 *   3. reviewer_chain 追加 entry（action=disputed, role=community 或 admin）
 *   4. dispute_history 追加结构化记录（challenger_id, challenge_type, challenge_text）
 *
 * 不会自动改 evidence / 不会自动修改边内容——质疑是触发复核流程，不是判决。
 *
 * 【重要限制（实事求是）】
 *   - 单用户 demo，无身份验证（challenger_id 来自 body）
 *   - 同一质疑者对同一边 3 次被驳回会触发 7 天禁言（决策 #7），但本接口不实施禁言——留到用户系统接入后
 *   - dispute_history 永久保留，不删除（即使后续质疑被驳回）
 *
 * Body: { challenger_id, challenge_type, challenge_text, evidence_url? }
 * Returns: 200 { edge } | 400 { error } | 404 { error } | 500 { error }
 */
interface ChallengeBody {
  challenger_id?: string;
  challenge_type?: string;
  challenge_text?: string;
  evidence_url?: string;
}

const VALID_CHALLENGE_TYPES = [
  'evidence_unavailable',
  'source_misquote',
  'direction_reversed',
  'granularity_wrong',
  'relation_type_wrong',
  'node_definition_unclear',
  'outdated_source',
  'obvious_error',
  'context_ambiguity',
  'general_doubt',
] as const;

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const edgeId = params.id;
  let body: ChallengeBody;
  try {
    body = (await request.json()) as ChallengeBody;
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON' }, { status: 400 });
  }

  const { challenger_id, challenge_type, challenge_text, evidence_url } = body;
  if (!challenger_id || !challenge_type || !challenge_text) {
    return NextResponse.json(
      { error: 'Missing required fields: challenger_id, challenge_type, challenge_text' },
      { status: 400 }
    );
  }
  if (challenge_text.length < 30) {
    return NextResponse.json(
      { error: 'challenge_text 必须 ≥ 30 字（避免无意义质疑）' },
      { status: 400 }
    );
  }
  if (!VALID_CHALLENGE_TYPES.includes(challenge_type as typeof VALID_CHALLENGE_TYPES[number])) {
    return NextResponse.json(
      {
        error: `challenge_type 必须是: ${VALID_CHALLENGE_TYPES.join(', ')}`,
      },
      { status: 400 }
    );
  }

  // 1. 读 seed JSON
  let raw: { nodes: unknown[]; edges: GraphEdge[] };
  try {
    const text = readFileSync(SEED_PATH, 'utf-8');
    raw = JSON.parse(text);
  } catch (e) {
    return NextResponse.json(
      { error: `读 seed 文件失败: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }

  // 2. 找边
  const idx = raw.edges.findIndex((e: GraphEdge) => e.id === edgeId);
  if (idx === -1) {
    return NextResponse.json({ error: `未找到边 ${edgeId}` }, { status: 404 });
  }

  // 3. 状态机: 任意状态 → disputed（除 deprecated 终态外都合法）
  //    【注意】如果边已经在 disputed 状态，跳过状态机转换（避免 disputed→disputed 非法跳），
  //    直接在 dispute_history 追加。
  const original = raw.edges[idx];
  if (original.verification_status === 'deprecated') {
    return NextResponse.json(
      { error: '已废弃的边不能再被质疑' },
      { status: 400 }
    );
  }

  let updated: GraphEdge;
  if (original.verification_status === 'disputed') {
    // 已经在 disputed：跳过状态转换，只克隆边用于追加 dispute_history
    updated = { ...original };
  } else {
    try {
      updated = applyTransition({
        edge: original,
        to: 'disputed',
        actor_id: challenger_id,
        actor_role: 'community' as ReviewerRole,
        action: 'disputed',
        reason: `[质疑] ${challenge_type}: ${challenge_text.slice(0, 50)}${challenge_text.length > 50 ? '...' : ''}`,
      });
    } catch (e) {
      if (e instanceof StateMachineError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      return NextResponse.json(
        { error: e instanceof Error ? e.message : String(e) },
        { status: 500 }
      );
    }
  }

  // 4. 追加 dispute_history 结构化记录
  const now = new Date().toISOString();
  const disputeRecord: DisputeRecord = {
    dispute_id: `dispute-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    challenger_id,
    challenge_type,
    challenge_text,
    filed_at: now,
    resolution: 'pending',
    resolved_by: null,
    resolved_at: null,
  };
  // 把 evidence_url 拼接到 challenge_text（v0.4 schema 中 DisputeRecord 无 url 字段，
  // 暂时以文本方式记录，等 schema 扩展再加）
  if (evidence_url) {
    disputeRecord.challenge_text += `\n[附] ${evidence_url}`;
  }
  updated = {
    ...updated,
    dispute_history: [...(updated.dispute_history ?? []), disputeRecord],
  };

  // 5. 一致性二次校验
  const consistency = validateEdgeStateConsistency(updated);
  if (!consistency.ok) {
    return NextResponse.json(
      { error: `一致性校验失败: ${consistency.reason}` },
      { status: 500 }
    );
  }

  // 6. 写回
  raw.edges[idx] = updated;
  try {
    writeFileSync(SEED_PATH, JSON.stringify(raw, null, 2), 'utf-8');
  } catch (e) {
    return NextResponse.json(
      { error: `写 seed 文件失败: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { edge: updated, dispute: disputeRecord },
    { status: 200 }
  );
}
