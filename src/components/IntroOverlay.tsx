'use client';

interface IntroOverlayProps {
  onStart: () => void;
  onExplore: () => void;
}

export default function IntroOverlay({ onStart, onExplore }: IntroOverlayProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white">
      <div className="max-w-[600px] mx-6 text-center">
        <h1 className="text-3xl font-bold text-black mb-2">万源图谱</h1>
        <p className="text-base text-gray-500 mb-8">发现真实世界的连接</p>

        <div className="text-left space-y-6 mb-8">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center flex-shrink-0">
              <span className="text-gray-700 text-xs font-bold">1</span>
            </div>
            <div>
              <p className="text-black text-sm font-medium mb-1">一个节点，多种视角</p>
              <p className="text-gray-500 text-xs">
                真实世界是网状的。一台注塑机，同时属于原料链、设备链、产品链等多条不同性质的链路。
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center flex-shrink-0">
              <span className="text-gray-700 text-xs font-bold">2</span>
            </div>
            <div>
              <p className="text-black text-sm font-medium mb-1">材料属性延伸</p>
              <p className="text-gray-500 text-xs">
                聚乙烯不仅是塑料杯的原料，也能做成电池隔膜——同一种材料，通往完全不同的行业。
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center flex-shrink-0">
              <span className="text-gray-700 text-xs font-bold">3</span>
            </div>
            <div>
              <p className="text-black text-sm font-medium mb-1">每条连接都有可信度</p>
              <p className="text-gray-500 text-xs">
                实线代表已验证的真实连接，虚线代表有依据但待验证的潜在可能性。
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={onStart}
            className="px-6 py-3 bg-black text-white rounded hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            开始探索
          </button>
          <button
            onClick={onExplore}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            自由浏览
          </button>
        </div>
      </div>
    </div>
  );
}
