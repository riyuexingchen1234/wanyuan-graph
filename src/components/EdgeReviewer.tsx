'use client';

import { useState } from 'react';
import type { GraphEdge, VerificationStatus, ReviewerAction, ReviewerRole } from '@/lib/types';
import { useGraphStore } from '@/store/graphStore';
import { ALLOWED_TRANSITIONS } from '@/lib/state-machine';
import { RELATION_TYPE_COLORS, RELATION_TYPE_LABELS } from '@/lib/dal';

/* -------------------------------------------------------------------------- */
/* 视觉编码                                                                  */
/* -------------------------------------------------------------------------- */

const STATUS_COLORS: Record<VerificationStatus, { bg: string; fg: string; label: string }> = {
  'auto-extracted': { bg: '#F4F5F7', fg: '#4E5969', label: '自动抽取' },
  proposed: { bg: '#FFF7E8', fg: '#FF7D00', label: '待审' },
  disputed: { bg: '#FFECE8', fg: '#F53F3F', label: '质疑中' },
  deprecated: { bg: '#E5E6EB', fg: '#86909C', label: '已废弃' },
  'verified-community': { bg: '#E8F4FF', fg: '#165DFF', label: '社区确认' },
  'verified-expert': { bg: '#E8FFEA', fg: '#00B42A', label: '专家确认' },
};

/**
 * 状态机动作 → ReviewerAction 映射。
 * 每个目标状态对应一个语义动作。
 */
const ACTION_FOR_TARGET: Record<VerificationStatus, ReviewerAction> = {
  'auto-extracted': 'restored',
  proposed: 'restored',
  disputed: 'disputed',
  deprecated: 'downgraded',
  'verified-community': 'approved',
  'verified-expert': 'approved',
};

const ROLE_FOR_TARGET: Record<VerificationStatus, ReviewerRole> = {
  'auto-extracted': 'admin',
  proposed: 'admin',
  disputed: 'community',
  deprecated: 'admin',
  'verified-community': 'community',
  'verified-expert': 'expert',
};

const ACTION_LABELS: Record<ReviewerAction, string> = {
  approved: '通过',
  downgraded: '废弃',
  disputed: '质疑',
  restored: '退回',
};

/* -------------------------------------------------------------------------- */
/* EdgeReviewer：单条边的状态机操作区                                        */
/* -------------------------------------------------------------------------- */

interface EdgeReviewerProps {
  edge: GraphEdge;
  /** 当前用户标识（演示用：principal-demo） */
  actorId?: string;
}

export default function EdgeReviewer({ edge, actorId = 'principal-demo' }: EdgeReviewerProps) {
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<VerificationStatus | null>(null);
  const [saved, setSaved] = useState<boolean>(false);
  const setEdges = useGraphStore((s) => s.setEdges);
  const edges = useGraphStore((s) => s.edges);

  const allowed = ALLOWED_TRANSITIONS[edge.verification_status];
  const isTerminal = allowed.length === 0;
  const sc = STATUS_COLORS[edge.verification_status];

  const onAction = async (to: VerificationStatus) => {
    setError(null);
    setSaved(false);
    setPending(to);

    try {
      const res = await fetch(`/api/edges/${edge.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          actor_id: actorId,
          actor_role: ROLE_FOR_TARGET[to],
          action: ACTION_FOR_TARGET[to],
          reason: `UI 触发: ${edge.verification_status} → ${to}`,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const body = (await res.json()) as { edge: GraphEdge };
      // 用服务端返回的新边替换 store 中的边（持久化已经成功）
      const newEdges = edges.map((e) => (e.id === body.edge.id ? body.edge : e));
      setEdges(newEdges);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="border border-line-1 rounded-arco-sm p-2.5 bg-white">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span
          className="px-1.5 py-0.5 text-[10px] rounded-arco-sm font-medium"
          style={{ backgroundColor: sc.bg, color: sc.fg }}
        >
          {sc.label}
        </span>
        <span
          className="px-1.5 py-0.5 text-[10px] rounded-arco-sm"
          style={{
            backgroundColor: `${RELATION_TYPE_COLORS[edge.relation_type]}1A`,
            color: RELATION_TYPE_COLORS[edge.relation_type],
          }}
        >
          {RELATION_TYPE_LABELS[edge.relation_type]}
        </span>
      </div>

      {isTerminal ? (
        <div className="text-[10px] text-ink-3 mt-1">
          终态：无可允许的状态转换
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1 mt-1">
            {allowed.map((to) => {
              const target = STATUS_COLORS[to];
              const action = ACTION_FOR_TARGET[to];
              const isPending = pending === to;
              return (
                <button
                  key={to}
                  onClick={() => onAction(to)}
                  disabled={pending !== null}
                  className="px-2 py-0.5 text-[10px] rounded-arco-sm border transition-colors hover:opacity-80 disabled:opacity-40 disabled:cursor-wait"
                  style={{
                    borderColor: target.fg,
                    color: target.fg,
                    backgroundColor: 'white',
                  }}
                  title={`审核动作: ${ACTION_LABELS[action]}（${edge.verification_status} → ${to}）`}
                >
                  {isPending ? '...' : `${ACTION_LABELS[action]}→${target.label}`}
                </button>
              );
            })}
          </div>
          {error && (
            <div className="text-[10px] text-arco-danger mt-1.5 bg-red-50 p-1.5 rounded">
              状态机拒绝: {error}
            </div>
          )}
          {saved && !error && (
            <div className="text-[10px] text-arco-success mt-1.5 bg-green-50 p-1.5 rounded">
              ✓ 已持久化到 seed JSON
            </div>
          )}
        </>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[10px] text-ink-3 hover:text-ink-1 mt-1.5 inline-flex items-center gap-1"
      >
        审核轨迹 ({edge.reviewer_chain?.length ?? 0})
        <span className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {expanded && (
        <div className="mt-1.5 space-y-1">
          {(edge.reviewer_chain ?? []).length === 0 ? (
            <div className="text-[10px] text-ink-3">尚无审核记录</div>
          ) : (
            (edge.reviewer_chain ?? []).map((c, i) => (
              <div key={i} className="text-[10px] text-ink-2 bg-surface-2 p-1.5 rounded">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="px-1 bg-arco-primary text-white rounded">
                    {c.reviewer_role}
                  </span>
                  <span className="font-medium">{ACTION_LABELS[c.action]}</span>
                  <span className="text-ink-3">
                    {c.from_status}→{c.to_status}
                  </span>
                </div>
                <div className="text-ink-3">
                  {c.reviewer_id} · {c.reviewed_at?.slice(0, 10)}
                </div>
                {c.note && <div className="text-ink-3 mt-0.5">{c.note}</div>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
