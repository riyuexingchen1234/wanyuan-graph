'use client';

import { useMemo } from 'react';
import { useGraphStore } from '@/store/graphStore';
import EdgeReviewer from './EdgeReviewer';

/**
 * 当前选中节点的全部「边状态机审核面板」。
 *
 * 设计要点：
 *   - 仅客户端组件（用到 useGraphStore）
 *   - 边按 verification_status 排序：verified-* 在前，proposed/auto-extracted 居中，disputed/deprecated 在后
 *   - 每条边是一个 EdgeReviewer（带状态机操作按钮 + 审核轨迹折叠）
 *   - 标题栏显示「共 N 条边 / 各状态计数」
 */
export default function EdgeReviewerList() {
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const edges = useGraphStore((s) => s.edges);

  const myEdges = useMemo(() => {
    if (!selectedNodeId) return [];
    return edges.filter((e) => e.source === selectedNodeId || e.target === selectedNodeId);
  }, [edges, selectedNodeId]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      'verified-expert': 0,
      'verified-community': 0,
      proposed: 0,
      'auto-extracted': 0,
      disputed: 0,
      deprecated: 0,
    };
    for (const e of myEdges) c[e.verification_status] = (c[e.verification_status] ?? 0) + 1;
    return c;
  }, [myEdges]);

  if (!selectedNodeId) {
    return (
      <div className="text-xs text-ink-3 p-3 text-center">
        点击图谱中任一节点，查看其关联边的状态机操作面板
      </div>
    );
  }

  if (myEdges.length === 0) {
    return (
      <div className="text-xs text-ink-3 p-3 text-center">
        该节点无关联边
      </div>
    );
  }

  // 排序：verified-* 在前，disputed/deprecated 在后，其他居中
  const order: Record<string, number> = {
    'verified-expert': 0,
    'verified-community': 1,
    proposed: 2,
    'auto-extracted': 3,
    disputed: 4,
    deprecated: 5,
  };
  const sorted = [...myEdges].sort((a, b) => {
    const oa = order[a.verification_status] ?? 9;
    const ob = order[b.verification_status] ?? 9;
    return oa - ob;
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] text-ink-2 px-1">
        <span className="font-medium">共 {myEdges.length} 条边</span>
        <span className="flex items-center gap-1.5">
          {Object.entries(counts).map(([s, n]) => (
            n > 0 ? <span key={s}>{s.replace('verified-', 'v-')}: {n}</span> : null
          ))}
        </span>
      </div>
      {sorted.map((e) => (
        <EdgeReviewer key={e.id} edge={e} />
      ))}
    </div>
  );
}
