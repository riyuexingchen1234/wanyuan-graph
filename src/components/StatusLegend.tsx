'use client';

import { STATUS_COLORS, STATUS_LABELS } from '@/lib/cytoscape-config';

/**
 * 2D 视图右下角的状态图例。
 *
 * 显示 6 档可信度视觉编码 + 跨产业连接特殊样式。
 * 用户在 2D 视图能一眼看懂边的颜色/线型对应什么状态。
 */
export default function StatusLegend() {
  const order: Array<keyof typeof STATUS_COLORS> = [
    'verified-expert',
    'verified-community',
    'proposed',
    'auto-extracted',
    'disputed',
    'deprecated',
  ];

  return (
    <div className="absolute bottom-4 right-4 z-20 bg-black/55 backdrop-blur-md border border-white/10 rounded-arco-md px-3.5 py-3 shadow-arco-3 max-w-[260px]">
      <div className="text-[11px] text-white/45 mb-2 tracking-wider">
        边的可信度（v0.4 6 档）
      </div>
      <div className="space-y-1.5">
        {order.map((status) => (
          <div key={status} className="flex items-center gap-2">
            {/* 用 SVG 画线型示意，避免用 cytoscape 节点 */}
            <svg width="28" height="6" className="flex-shrink-0">
              <line
                x1="0"
                y1="3"
                x2="28"
                y2="3"
                stroke={STATUS_COLORS[status]}
                strokeWidth={status === 'deprecated' ? 1 : status === 'disputed' ? 2.5 : status === 'verified-expert' ? 2.2 : 1.5}
                strokeDasharray={
                  status === 'proposed' ? '5,3' :
                  status === 'deprecated' ? '1,2' :
                  undefined
                }
                strokeLinecap="round"
              />
            </svg>
            <span className="text-[11px] text-white/70">
              {STATUS_LABELS[status]}
            </span>
          </div>
        ))}
      </div>

      <div className="text-[11px] text-white/45 mt-3 mb-2 tracking-wider">
        跨产业连接
      </div>
      <div className="flex items-center gap-2">
        <svg width="28" height="6" className="flex-shrink-0">
          <line x1="0" y1="3" x2="28" y2="3" stroke="#FFC53D" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <span className="text-[11px] text-white/70">金色加粗（被行业切断的连接）</span>
      </div>
    </div>
  );
}
