import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { applyTransition, validateEdgeStateConsistency, StateMachineError } from '@/lib/state-machine';
import type { GraphEdge, ReviewerAction, ReviewerRole, VerificationStatus } from '@/lib/types';

/**
 * POST /api/edges/[id]/transition
 *
 * 审核员 / 质疑者 / 管理员触发一次状态机转换。流程：
 *   1. 读 data/seed/pv-chain.json
 *   2. 找到目标边
 *   3. 调 state-machine.applyTransition（带强类型转换校验）
 *   4. 写回 JSON 文件
 *   5. 返回新边
 *
 * 【重要声明（实事求是）】
 *   - 当前实现直接读写 JSON 文件，不是 DB。生产环境必须替换为事务性存储。
 *   - 单用户 demo，不做并发控制（多用户同时改会丢更新）。生产环境需乐观锁/版本号。
 *   - 不做身份验证（actor_id 来自 body，客户端可任意填写）。生产环境需接用户系统。
 *   - 不做权限校验：任何人都能审核任何边。生产环境需审核员资质系统。
 *
 * Body: { to, actor_id, actor_role, action, reason? }
 * Returns: 200 { edge } | 400 { error } | 404 { error }
 */
const SEED_PATH = join(process.cwd(), 'data', 'seed', 'pv-chain.json');

interface TransitionBody {
  to?: VerificationStatus;
  actor_id?: string;
  actor_role?: ReviewerRole;
  action?: ReviewerAction;
  reason?: string;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const edgeId = params.id;
  let body: TransitionBody;
  try {
    body = (await request.json()) as TransitionBody;
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON' }, { status: 400 });
  }

  const { to, actor_id, actor_role, action, reason } = body;
  if (!to || !actor_id || !actor_role || !action) {
    return NextResponse.json(
      { error: 'Missing required fields: to, actor_id, actor_role, action' },
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

  // 3. 状态机转换
  let updated: GraphEdge;
  try {
    updated = applyTransition({
      edge: raw.edges[idx],
      to,
      actor_id,
      actor_role,
      action,
      reason,
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

  // 4. 一致性二次校验（防御性：state machine 写完后再确认序列合法）
  const consistency = validateEdgeStateConsistency(updated);
  if (!consistency.ok) {
    return NextResponse.json(
      { error: `一致性校验失败: ${consistency.reason}` },
      { status: 500 }
    );
  }

  // 5. 写回
  raw.edges[idx] = updated;
  try {
    writeFileSync(SEED_PATH, JSON.stringify(raw, null, 2), 'utf-8');
  } catch (e) {
    return NextResponse.json(
      { error: `写 seed 文件失败: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ edge: updated }, { status: 200 });
}
