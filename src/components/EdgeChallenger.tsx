'use client';

import { useState } from 'react';
import type { GraphEdge, DisputeRecord } from '@/lib/types';
import { useGraphStore } from '@/store/graphStore';

/**
 * 质疑者入口表单。
 *
 * 任何用户（不需资质）对任何边发起质疑：
 *   - 填质疑类型 + 描述（≥ 30 字）+ 可选证据链接
 *   - 提交 → 边状态 → disputed，dispute_history 追加结构化记录
 *   - 任何用户对同一边的 3 次被驳回 → 7 天禁言（决策 #7，本 UI 不实施禁言逻辑）
 *
 * 这是质疑者手册（docs/challenger-handbook.md）的 UI 入口。
 */

const CHALLENGE_TYPES: Array<{ value: string; label: string; hint: string }> = [
  { value: 'evidence_unavailable', label: '证据链接失效', hint: '标准/报告/页面打不开' },
  { value: 'source_misquote', label: '源内容与边声明不符', hint: '原文讲 A，边说成 B' },
  { value: 'direction_reversed', label: '关系方向反了', hint: 'source/target 写反' },
  { value: 'granularity_wrong', label: '节点粒度不当', hint: '太粗或太细' },
  { value: 'relation_type_wrong', label: '关系类型错', hint: '应选其他 type' },
  { value: 'node_definition_unclear', label: '节点定义模糊', hint: '多人理解不一致' },
  { value: 'outdated_source', label: '标准已更新', hint: '旧版被新版替代' },
  { value: 'obvious_error', label: '明显错误', hint: '错连 / 错标' },
  { value: 'context_ambiguity', label: '跨语境歧义', hint: '本边未标注语境' },
  { value: 'general_doubt', label: '感觉不对（其他）', hint: '说不出具体，但觉可疑' },
];

const MIN_TEXT_LENGTH = 30;

interface EdgeChallengerProps {
  edge: GraphEdge;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EdgeChallenger({ edge, onClose, onSuccess }: EdgeChallengerProps) {
  const [challengerId, setChallengerId] = useState<string>('challenger-demo');
  const [challengeType, setChallengeType] = useState<string>('general_doubt');
  const [challengeText, setChallengeText] = useState<string>('');
  const [evidenceUrl, setEvidenceUrl] = useState<string>('');
  const [pending, setPending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ record: DisputeRecord } | null>(null);
  const setEdges = useGraphStore((s) => s.setEdges);
  const edges = useGraphStore((s) => s.edges);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (challengeText.length < MIN_TEXT_LENGTH) {
      setError(`质疑描述至少 ${MIN_TEXT_LENGTH} 字（当前 ${challengeText.length} 字）。` +
        '这避免了"就是觉得不对"这类无意义质疑——质疑者手册第七节 FAQ。');
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/edges/${edge.id}/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenger_id: challengerId,
          challenge_type: challengeType,
          challenge_text: challengeText,
          evidence_url: evidenceUrl || undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const body = (await res.json()) as { edge: GraphEdge; dispute: DisputeRecord };
      const newEdges = edges.map((x) => (x.id === body.edge.id ? body.edge : x));
      setEdges(newEdges);
      setSuccess({ record: body.dispute });
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40" onClick={onClose}>
        <div
          className="bg-white rounded-arco-md shadow-arco-3 max-w-[440px] w-full mx-4 p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-arco-success text-base font-medium mb-2">
            ✓ 质疑已提交
          </div>
          <p className="text-arco-sm text-ink-2 mb-3">
            边 <code className="px-1.5 py-0.5 bg-surface-2 rounded text-arco-xs">{edge.id}</code> 状态已置为 disputed。
          </p>
          <div className="bg-red-50 border border-arco-danger/30 rounded-arco-sm p-3 mb-4">
            <div className="text-arco-xs text-ink-3 mb-1">质疑记录 ID</div>
            <div className="text-arco-xs font-mono text-ink-1 break-all">
              {success.record.dispute_id}
            </div>
            <div className="text-arco-xs text-ink-3 mt-2">
              记录已全图留痕。审核员复核后会通过 reviewer_chain 反馈。
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2 bg-arco-primary text-white rounded-arco-sm hover:opacity-90 transition-opacity text-arco-sm"
          >
            关闭
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40" onClick={onClose}>
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-arco-md shadow-arco-3 max-w-[520px] w-full mx-4 p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-base font-medium text-ink-1 mb-1">质疑此边</div>
            <div className="text-arco-xs text-ink-3">
              <code className="px-1.5 py-0.5 bg-surface-2 rounded">{edge.id}</code>
              <span className="mx-1.5">·</span>
              <span>{edge.source} → {edge.target}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-3 hover:text-ink-1 text-xl leading-none"
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-arco-xs text-ink-2 mb-1 font-medium">
              质疑者 ID（演示用，可任意）
            </label>
            <input
              type="text"
              value={challengerId}
              onChange={(e) => setChallengerId(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-line-1 rounded-arco-sm text-arco-sm focus:border-arco-primary focus:outline-none"
              placeholder="你的 ID（演示版可填任意）"
            />
          </div>

          <div>
            <label className="block text-arco-xs text-ink-2 mb-1 font-medium">
              质疑类型
            </label>
            <select
              value={challengeType}
              onChange={(e) => setChallengeType(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-line-1 rounded-arco-sm text-arco-sm focus:border-arco-primary focus:outline-none"
            >
              {CHALLENGE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}（{t.hint}）
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-arco-xs text-ink-2 mb-1 font-medium">
              质疑描述（≥ {MIN_TEXT_LENGTH} 字）
              <span className="text-ink-3 font-normal ml-1.5">
                当前 {challengeText.length} 字
              </span>
            </label>
            <textarea
              value={challengeText}
              onChange={(e) => setChallengeText(e.target.value)}
              rows={4}
              className="w-full px-2.5 py-1.5 border border-line-1 rounded-arco-sm text-arco-sm focus:border-arco-primary focus:outline-none resize-y"
              placeholder="请说清楚：是什么让你觉得这条边有问题？哪个具体证据或推理不成立？"
            />
            {challengeText.length > 0 && challengeText.length < MIN_TEXT_LENGTH && (
              <div className="text-arco-xs text-arco-warning mt-1">
                还差 {MIN_TEXT_LENGTH - challengeText.length} 字
              </div>
            )}
          </div>

          <div>
            <label className="block text-arco-xs text-ink-2 mb-1 font-medium">
              证据链接（可选）
            </label>
            <input
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-line-1 rounded-arco-sm text-arco-sm focus:border-arco-primary focus:outline-none"
              placeholder="https://...（如标准/报告/页面，证明你质疑的依据）"
            />
          </div>

          {error && (
            <div className="text-arco-xs text-arco-danger bg-red-50 p-2 rounded-arco-sm">
              {error}
            </div>
          )}

          <div className="bg-surface-2 rounded-arco-sm p-3 text-arco-xs text-ink-3">
            <strong className="text-ink-2">提示：</strong>
            提交后，该边会进入 disputed 状态，原 verified 等级失效。
            审核员复核后会通过 reviewer_chain 反馈结果。质疑记录永久留痕，不删除。
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border border-line-1 text-ink-2 rounded-arco-sm hover:bg-surface-2 transition-colors text-arco-sm"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={pending}
            className="px-3 py-1.5 bg-arco-danger text-white rounded-arco-sm hover:opacity-90 transition-opacity text-arco-sm disabled:opacity-50 disabled:cursor-wait"
          >
            {pending ? '提交中…' : '提交质疑'}
          </button>
        </div>
      </form>
    </div>
  );
}
