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
        bg-canvas-900/90 backdrop-blur-sm
        transition-all duration-700 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
    >
      <div className="max-w-[680px] mx-6 text-center animate-fade-in">
        <h1 className="text-4xl font-bold text-white mb-4">万源图谱</h1>

        <div className="w-12 h-0.5 bg-arco-primary mx-auto mb-4" />

        <p className="text-arco-lg text-arco-primary mb-8">
          多关系类型产业链探索
        </p>

        <div className="text-left space-y-4 mb-8">
          <p className="text-arco-sm text-white/70 leading-relaxed">
            一个节点（如<span className="text-arco-primary">注塑机</span>）可能同时参与产品链、原料链、设备链、耗材链等多条链路。本图谱把节点作为唯一实体，用<span className="text-arco-primary">关系类型</span>区分不同的链路。
          </p>
          <p className="text-arco-sm text-white/70 leading-relaxed">
            选择一个节点后，可以<span className="text-arco-primary">切换视角</span>查看它在不同链路中的上下游关系。跨行业的交叉点会被特别标记，揭示被行业分类切断的真实连接。
          </p>
          <p className="text-arco-sm text-white/70 leading-relaxed">
            从这里开始，搜索一个节点，选择一条链路，沿着产业链探索下去。
          </p>
        </div>

        <div className="bg-canvas-800/50 rounded-arco-lg p-4 mb-8 border border-canvas-700">
          <div className="text-arco-xs text-white/50 mb-3">链路类型</div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="px-2 py-1 rounded-arco-sm text-sm text-white" style={{ backgroundColor: '#165DFF' }}>
              产品链
            </span>
            <span className="px-2 py-1 rounded-arco-sm text-sm text-white" style={{ backgroundColor: '#00B42A' }}>
              原料链
            </span>
            <span className="px-2 py-1 rounded-arco-sm text-sm text-white" style={{ backgroundColor: '#722ED1' }}>
              设备链
            </span>
            <span className="px-2 py-1 rounded-arco-sm text-sm text-white" style={{ backgroundColor: '#FF7D00' }}>
              耗材链
            </span>
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

        <div className="mt-8 text-arco-xs text-white/40">
          多关系类型产业链图谱 Demo
        </div>
      </div>
    </div>
  );
}
