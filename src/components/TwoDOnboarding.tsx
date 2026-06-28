'use client';

import { useState, useEffect, useRef } from 'react';
import type { GraphNode } from '@/lib/types';
import { NODE_TYPE_LABELS } from '@/lib/dal';

interface TwoDOnboardingProps {
  /** 当前选中的中心节点（2D 视图刚切换时） */
  node: GraphNode;
  /** 关闭回调 */
  onClose: () => void;
  /** 关系类型切换提示（点击会触发 onRelationTypeHint） */
  onRelationTypeHint?: () => void;
}

/**
 * 2D 视图首次进入引导卡。
 *
 * 用户从 3D 点击节点进入 2D 时弹一次，3-4 秒后自动淡出。
 * 包含 4 块：当前节点身份 / 3 个可操作 / 返回宏观。
 *
 * 关闭后，右下角的 "?" 按钮可随时重新打开。
 */
export default function TwoDOnboarding({ node, onClose, onRelationTypeHint }: TwoDOnboardingProps) {
  const [visible, setVisible] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 6 秒后自动淡出（如果用户没手动关）
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 400); // 等待淡出动画
    }, 6000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onClose]);

  if (dismissed) return null;

  return (
    <div
      className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none transition-opacity duration-400 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="pointer-events-auto bg-white/95 backdrop-blur-sm rounded-arco-md shadow-arco-3 max-w-[420px] p-4 border border-arco-primary/30">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-arco-xs text-arco-primary font-medium tracking-wider mb-0.5">
              2D 微观层 · 首次进入
            </div>
            <div className="text-base font-medium text-ink-1">
              你在看：{node.name}
            </div>
            <div className="text-arco-xs text-ink-3 mt-0.5">
              {NODE_TYPE_LABELS[node.node_type] ?? node.node_type} · {node.id}
            </div>
          </div>
          <button
            onClick={() => {
              setDismissed(true);
              setTimeout(onClose, 200);
            }}
            className="text-ink-3 hover:text-ink-1 text-xl leading-none flex-shrink-0 ml-3"
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className="space-y-2 text-arco-sm text-ink-2 mt-3">
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-arco-primary text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
              1
            </span>
            <div>
              <div className="font-medium text-ink-1">切换关系类型（顶部下拉）</div>
              <div className="text-arco-xs text-ink-3">看不同视角的连接网——原料 / 设备 / 工艺等</div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-arco-primary text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
              2
            </span>
            <div>
              <div className="font-medium text-ink-1">点击图中其他节点</div>
              <div className="text-arco-xs text-ink-3">继续下钻，探索上下游</div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-arco-primary text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
              3
            </span>
            <div>
              <div className="font-medium text-ink-1">右侧审核 / 质疑每条边</div>
              <div className="text-arco-xs text-ink-3">底部的「状态机审核」是审核员入口；悬停边看 ⚑ 质疑</div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-ink-4 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
              ↩
            </span>
            <div>
              <div className="font-medium text-ink-1">左下角「返回宏观」 → 回到 3D</div>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-line-1 text-arco-xs text-ink-3">
          6 秒后自动关闭。右下角 <kbd className="px-1 py-0.5 bg-surface-2 rounded text-[10px]">?</kbd> 按钮可随时重新打开。
        </div>
      </div>
    </div>
  );
}
