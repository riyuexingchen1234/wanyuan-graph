/**
 * 万源图谱 — 6 档可信度状态机 (v0.4)
 *
 * 状态转换规则以 schema.json#definitions/AllowedTransitions 为单一可信源。
 * 业务层（API / 脚本 / 审核流）应统一调用本模块做强制校验，
 * 不应在分散的 if/else 里硬编码规则。
 *
 * 6 档状态：
 *   auto-extracted → proposed / deprecated
 *   proposed       → verified-community / verified-expert / disputed / deprecated
 *   disputed       → verified-community / verified-expert / deprecated / proposed
 *   verified-community → disputed / verified-expert / deprecated
 *   verified-expert    → disputed / deprecated
 *   deprecated     → (终态，无转换)
 */

import type {
  GraphEdge,
  VerificationStatus,
  ReviewerChainEntry,
  ReviewerRole,
  ReviewerAction,
  TransitionRecord,
} from './types';

/** 状态机的全部转换规则。deprecated 是终态，用空数组表示。 */
export const ALLOWED_TRANSITIONS: Readonly<
  Record<VerificationStatus, readonly VerificationStatus[]>
> = Object.freeze({
  'auto-extracted': ['proposed', 'deprecated'],
  proposed: ['verified-community', 'verified-expert', 'disputed', 'deprecated'],
  disputed: ['verified-community', 'verified-expert', 'deprecated', 'proposed'],
  'verified-community': ['disputed', 'verified-expert', 'deprecated'],
  'verified-expert': ['disputed', 'deprecated'],
  deprecated: [],
});

/** 终态：不可再转换。 */
export const TERMINAL_STATUSES: ReadonlySet<VerificationStatus> = new Set<VerificationStatus>([
  'deprecated',
]);

export class StateMachineError extends Error {
  constructor(
    public readonly from: VerificationStatus,
    public readonly to: VerificationStatus,
    public readonly edgeId: string
  ) {
    super(
      `非法状态转换: edge=${edgeId}, ${from} → ${to}。` +
        `允许的转换: [${ALLOWED_TRANSITIONS[from].join(', ') || '(终态)'}].`
    );
    this.name = 'StateMachineError';
  }
}

/** 判定 from → to 是否合法。 */
export function canTransition(
  from: VerificationStatus,
  to: VerificationStatus
): boolean {
  if (from === to) return false; // 同状态不算转换
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * 应用一次状态转换，返回新边对象（不可变）。
 * 副作用：
 *   - 追加 transitions 记录
 *   - 追加 reviewer_chain 记录（如果提供 actor + role）
 *   - 更新 verification_status / reviewed_by / reviewed_at
 *
 * 不会：
 *   - 自动写 evidence（证据由调用方管理）
 *   - 自动写 note
 */
export interface ApplyTransitionInput {
  edge: GraphEdge;
  to: VerificationStatus;
  actor_id: string;
  actor_role: ReviewerRole;
  action: ReviewerAction;
  reason?: string;
  /** 用于覆盖 reviewed_by / reviewed_at；默认 = 当前时间 */
  at?: string;
}

export function applyTransition(
  input: ApplyTransitionInput
): GraphEdge {
  const { edge, to, actor_id, actor_role, action, reason, at } = input;
  const from = edge.verification_status;

  if (!canTransition(from, to)) {
    throw new StateMachineError(from, to, edge.id);
  }

  const now = at ?? new Date().toISOString();

  const transition: TransitionRecord = {
    from,
    to,
    at: now,
    actor_id,
    reason,
  };

  const chainEntry: ReviewerChainEntry = {
    reviewer_id: actor_id,
    reviewer_role: actor_role,
    action,
    from_status: from,
    to_status: to,
    reviewed_at: now,
    note: reason,
  };

  // verified-* 状态必填 reviewed_by / reviewed_at；其他清空（避免被误读为已审）
  const isVerifiedNow = to === 'verified-community' || to === 'verified-expert';
  const nextReviewedBy = isVerifiedNow ? actor_id : null;
  const nextReviewedAt = isVerifiedNow ? now : null;

  return {
    ...edge,
    verification_status: to,
    reviewed_by: nextReviewedBy,
    reviewed_at: nextReviewedAt,
    transitions: [...(edge.transitions ?? []), transition],
    reviewer_chain: [...(edge.reviewer_chain ?? []), chainEntry],
    updated_at: now,
  };
}

/**
 * 校验一条边的 transitions / reviewer_chain 序列与当前 verification_status 一致。
 * 用于种子数据一致性检查。
 */
export function validateEdgeStateConsistency(edge: GraphEdge): {
  ok: boolean;
  reason?: string;
} {
  const transitions = edge.transitions ?? [];
  const finalStatus = edge.verification_status;
  const chain = edge.reviewer_chain ?? [];

  // 1. transitions 序列最后一步应等于当前 status
  if (transitions.length > 0) {
    const last = transitions[transitions.length - 1];
    if (last.to !== finalStatus) {
      return {
        ok: false,
        reason: `transitions 最后一步 to=${last.to} 与 verification_status=${finalStatus} 不一致`,
      };
    }
  }

  // 2. reviewer_chain 最后一条的 to_status 应等于当前 status
  if (chain.length > 0) {
    const last = chain[chain.length - 1];
    if (last.to_status !== finalStatus) {
      return {
        ok: false,
        reason: `reviewer_chain 最后一条 to_status=${last.to_status} 与 verification_status=${finalStatus} 不一致`,
      };
    }
  }

  // 3. transitions 序列每一步必须合法：上一步的 to == 本步的 from（连续性），
  //    且 from → to 在 AllowedTransitions 中
  let prev: VerificationStatus | null = null;
  for (const t of transitions) {
    if (prev !== null) {
      if (prev !== t.from) {
        return {
          ok: false,
          reason: `transitions 不连续: 上一步 to=${prev}，下一步 from=${t.from}`,
        };
      }
      if (!canTransition(t.from, t.to)) {
        return {
          ok: false,
          reason: `transitions 含非法单步: ${t.from} → ${t.to}`,
        };
      }
    } else if (!canTransition(t.from, t.to)) {
      // 第一步也要合法
      return {
        ok: false,
        reason: `transitions 第一步非法: ${t.from} → ${t.to}`,
      };
    }
    prev = t.to;
  }

  // 4. verified-* 状态必须有 reviewed_by / reviewed_at 非空
  if (finalStatus === 'verified-community' || finalStatus === 'verified-expert') {
    if (!edge.reviewed_by || !edge.reviewed_at) {
      return {
        ok: false,
        reason: `verified 状态 (${finalStatus}) 缺 reviewed_by / reviewed_at`,
      };
    }
  }

  return { ok: true };
}
