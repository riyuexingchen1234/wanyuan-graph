import { useState } from 'react';

interface LegendProps {
  isHidden?: boolean;
}

export default function Legend({ isHidden = false }: LegendProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isHidden) return null;

  return (
    <div className="absolute bottom-4 left-4 z-20">
      <div className="bg-white/95 backdrop-blur rounded-arco-lg shadow-arco-2 overflow-hidden">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center justify-between w-full px-4 py-2 hover:bg-surface-2 transition-colors"
        >
          <span className="text-arco-xs text-ink-1 font-medium">图例</span>
          <svg
            className={`w-4 h-4 text-ink-3 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {!isCollapsed && (
          <div className="px-4 py-3 space-y-3">
            <div className="space-y-1.5">
              <div className="text-arco-xs text-ink-3 font-medium">节点类型</div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-coord-a" />
                <span className="text-arco-xs text-ink-2">坐标系 A (产业链)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-coord-b" />
                <span className="text-arco-xs text-ink-2">坐标系 B (材料)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-coord-ab" />
                <span className="text-arco-xs text-ink-2">交汇点 (AB)</span>
              </div>
            </div>

            <div className="border-t border-line-1 pt-3 space-y-1.5">
              <div className="text-arco-xs text-ink-3 font-medium">连接状态</div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-ink-2" />
                <span className="text-arco-xs text-ink-2">已验证</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-ink-3" style={{ borderTop: '1px dashed currentColor' }} />
                <span className="text-arco-xs text-ink-2">待验证</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}