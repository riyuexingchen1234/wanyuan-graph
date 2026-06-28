'use client';

interface GraphCanvasProps {
  centerNode?: any | null;
  chainView?: any | null;
  mode?: 'default' | 'material-extension';
  onNodeSelect?: (id: string) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export default function GraphCanvas({
  centerNode,
  loading,
  error,
  onRetry,
}: GraphCanvasProps) {
  if (loading) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white">
        <span className="text-gray-500 text-sm">加载中…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white">
        <span className="text-gray-500 text-sm mb-4">{error}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
          >
            重试
          </button>
        )}
      </div>
    );
  }

  if (!centerNode) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white">
        <p className="text-gray-500 text-sm">选择产业链或节点开始探索</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-white flex items-center justify-center">
      <div className="text-center text-gray-500">
        <p className="text-lg font-medium mb-2">{centerNode.name}</p>
        <p className="text-sm">3D图形视图待完善</p>
      </div>
    </div>
  );
}
