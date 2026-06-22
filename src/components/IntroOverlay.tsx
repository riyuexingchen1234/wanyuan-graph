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
        
        <div className="w-12 h-0.5 bg-coord-ab mx-auto mb-4" />
        
        <p className="text-arco-lg text-coord-ab mb-8">
          看见被行业分类切断的连接
        </p>

        <div className="text-left space-y-4 mb-8">
          <p className="text-arco-sm text-white/70 leading-relaxed">
            一种材料、一种工艺、一台设备，往往本可以服务多个互不相关的行业，但人们习惯按<span className="text-coord-ab">行业</span>认识世界，导致这些真实存在的连接被切断、被忽视。
          </p>
          <p className="text-arco-sm text-white/70 leading-relaxed">
            本项目把这些被<span className="text-coord-ab">行业语言</span>分散开的信息，重新整理、用统一的客观语言描述，并排放在一起，让原本看不见的连接重新被看见。
          </p>
          <p className="text-arco-sm text-white/70 leading-relaxed">
            从这里开始，体验从<span className="text-coord-ab">光伏</span>到<span className="text-coord-ab">快递包装</span>的跨界之旅。
          </p>
        </div>

        <div className="bg-canvas-800/50 rounded-arco-lg p-4 mb-8 border border-canvas-700">
          <div className="text-arco-xs text-white/50 mb-3">示范路径</div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="px-2 py-1 bg-coord-a/20 text-coord-a rounded-arco-sm text-sm">光伏</span>
            <span className="text-white/40">→</span>
            <span className="px-2 py-1 bg-coord-a/20 text-coord-a rounded-arco-sm text-sm">储能</span>
            <span className="text-white/40">→</span>
            <span className="px-2 py-1 bg-coord-ab/20 text-coord-ab rounded-arco-sm text-sm border border-coord-ab/30">电池隔膜</span>
            <span className="text-white/40">→</span>
            <span className="px-2 py-1 bg-coord-b/20 text-coord-b rounded-arco-sm text-sm">聚乙烯</span>
            <span className="text-white/40">→</span>
            <span className="px-2 py-1 bg-coord-b/20 text-coord-b rounded-arco-sm text-sm">塑料管道 / 包装薄膜</span>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={onStart}
            className="px-6 py-3 bg-coord-ab hover:bg-coord-ab/80 text-white rounded-arco-md text-sm font-medium transition-all hover:scale-105"
          >
            查看示范路径
          </button>
          <button
            onClick={onExplore}
            className="px-6 py-3 bg-transparent border border-white/30 hover:border-white/50 text-white/80 hover:text-white rounded-arco-md text-sm font-medium transition-all"
          >
            自由探索
          </button>
        </div>

        <div className="mt-8 text-arco-xs text-white/40">
          样板路径 Demo · 6 个节点 · 6 条连接
        </div>
      </div>
    </div>
  );
}
