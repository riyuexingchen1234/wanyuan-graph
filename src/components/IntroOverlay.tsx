import { useEffect, useState } from 'react';

interface IntroOverlayProps {
  onStart: () => void;
  onExplore: () => void;
}

export default function IntroOverlay({ onStart, onExplore }: IntroOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`
        fixed inset-0 z-[100] flex items-center justify-center
        bg-canvas-900/95 backdrop-blur-md
        transition-all duration-700 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
    >
      <div className="max-w-[680px] mx-6 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 rounded-full bg-arco-primary/20 flex items-center justify-center mx-auto mb-4 border border-arco-primary/30">
            <svg
              className="w-8 h-8 text-arco-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-white mb-2">万源图谱</h1>
        <p className="text-arco-base text-white/60 mb-6">发现真实世界的连接</p>

        <div className="w-12 h-0.5 bg-arco-primary mx-auto mb-8" />

        <div className="text-left space-y-5 mb-8">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-arco-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-arco-primary text-xs font-bold">1</span>
            </div>
            <div>
              <p className="text-white text-sm font-medium mb-1">一个节点，多种视角</p>
              <p className="text-white/60 text-xs leading-relaxed">
                真实世界是网状的。一台注塑机，同时属于原料链、设备链、产品链等多条不同性质的链路。本图谱把节点作为唯一实体，用<span className="text-arco-primary">关系类型</span>区分不同的连接视角。
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-pink-400 text-xs font-bold">2</span>
            </div>
            <div>
              <p className="text-white text-sm font-medium mb-1">材料属性延伸</p>
              <p className="text-white/60 text-xs leading-relaxed">
                基于材料底层属性的潜在应用延伸，是物理流动链之外的另一条探索路径。聚乙烯不仅是塑料杯的原料，也能做成电池隔膜——<span className="text-pink-400">同一种材料，通往完全不同的行业</span>。
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-warning text-xs font-bold">3</span>
            </div>
            <div>
              <p className="text-white text-sm font-medium mb-1">每条连接都有可信度</p>
              <p className="text-white/60 text-xs leading-relaxed">
                <span className="text-success">实线</span>代表已验证的真实连接，<span className="text-warning">虚线</span>代表有依据但待验证的潜在可能性。所有数据均可追溯来源，不把猜测当事实。
              </p>
            </div>
          </div>
        </div>

        <div className="bg-canvas-800/50 rounded-arco-lg p-4 mb-8 border border-canvas-700">
          <div className="text-arco-xs text-white/50 mb-3">当前状态</div>
          <div className="text-arco-sm text-white/70">
            第一阶段：节点录入中，关系数据逐步补充
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={onStart}
            className="px-6 py-3 bg-arco-primary hover:bg-arco-primary-hover text-white rounded-arco-md text-sm font-medium transition-all hover:scale-105"
          >
            开始探索
          </button>
          <button
            onClick={onExplore}
            className="px-6 py-3 bg-transparent border border-white/30 hover:border-white/50 text-white/80 hover:text-white rounded-arco-md text-sm font-medium transition-all"
          >
            自由浏览
          </button>
        </div>

        <div className="mt-8 text-arco-xs text-white/30">
          多关系类型产业链图谱 · v0.2
        </div>
      </div>
    </div>
  );
}
