'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import SearchBar from '../components/SearchBar';
import { useGraphStore } from '../store/graphStore';
import type { GraphNode, RelationType } from '../lib/types';
import nodesDraft from '../data/nodes-draft.json';

const GraphScene = dynamic(
  () => import('../components/Graph3D/GraphScene'),
  { ssr: false }
);

const RECOMMENDED_NODES = [
  { id: 'material-polyethylene', name: '聚乙烯', desc: '最通用的塑料材料' },
  { id: 'industry-photovoltaic', name: '光伏行业', desc: '新能源产业链' },
  { id: 'equipment-injection-molding-machine', name: '注塑机', desc: '塑料加工核心设备' },
  { id: 'industry-lithium-battery', name: '锂电池行业', desc: '动力电池产业链' },
];

const NODE_TYPE_LABELS: Record<string, string> = {
  material: '材料',
  product: '产品',
  equipment: '设备',
  process: '工艺',
  industry: '行业',
  entity: '实体',
};

export default function Home() {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [mode, setMode] = useState<'ambient' | 'focus'>('ambient');

  const { flyToNode, resetView, setNodes, setEdges, selectedNodeId } = useGraphStore();

  const allNodes = useMemo(() => nodesDraft.nodes as GraphNode[], []);
  const allEdges = useMemo(() => nodesDraft.edges as any[], []);

  useEffect(() => {
    setNodes(allNodes);
    setEdges(allEdges);
  }, [allNodes, allEdges, setNodes, setEdges]);

  const handleNodeSelect = useCallback(
    (id: string) => {
      const node = allNodes.find((n) => n.id === id);
      if (!node) return;
      setSelectedNode(node);
      setMode('focus');
      flyToNode(id);
    },
    [allNodes, flyToNode]
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedNode(null);
    setMode('ambient');
    resetView();
  }, [resetView]);

  const selectedNodeData = useMemo(() => {
    if (!selectedNodeId) return null;
    return allNodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, allNodes]);

  const displayNode = selectedNode || selectedNodeData;

  return (
    <div className="h-screen w-full flex overflow-hidden bg-white">
      <div className="flex-1 relative">
        <header className="absolute top-4 left-4 z-30 flex items-center gap-3">
          <div className="bg-white border border-gray-200 rounded px-5 py-3">
            <h1 className="text-lg font-semibold text-black">万源图谱</h1>
            <p className="text-xs text-gray-500">发现真实世界的连接</p>
          </div>
        </header>

        <div className="absolute top-4 right-4 z-40 w-[320px]">
          <SearchBar onNodeSelect={handleNodeSelect} />
        </div>

        {mode === 'ambient' && !displayNode && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-black mb-2">
                从一个节点出发，探索真实世界的连接
              </h2>
              <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto">
                搜索任意节点，沿着不同类型的关系逐步游走
              </p>

              <div className="flex flex-col items-center gap-3 pointer-events-auto">
                <p className="text-gray-400 text-xs">或者从这些节点开始：</p>
                <div className="flex gap-3 flex-wrap justify-center">
                  {RECOMMENDED_NODES.map((node) => (
                    <button
                      key={node.id}
                      onClick={() => handleNodeSelect(node.id)}
                      className="px-4 py-3 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-left max-w-[200px] bg-white/80"
                    >
                      <div className="text-black text-sm font-medium">
                        {node.name}
                      </div>
                      <div className="text-gray-500 text-xs mt-1">{node.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="w-full h-full">
          <GraphScene
            nodes={allNodes}
            edges={allEdges}
            centerNodeId={selectedNodeId}
            relationType="raw_material_for"
            mode={mode}
          />
        </div>

        {displayNode && (
          <div className="absolute bottom-4 left-4 z-30 bg-white border border-gray-200 rounded px-4 py-3">
            <div className="text-xs text-gray-500 mb-2">图例</div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-black" />
                <span className="text-xs text-gray-700">已验证</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-0.5"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(to right, #000 0, #000 4px, transparent 4px, transparent 7px)',
                  }}
                />
                <span className="text-xs text-gray-700">待验证</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {displayNode && (
        <div className="w-[360px] h-full bg-white border-l border-gray-200 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-xs text-gray-700 bg-gray-100"
              >
                {NODE_TYPE_LABELS[displayNode.node_type] || displayNode.node_type}
              </span>
            </div>
            <button
              onClick={handleCloseDetail}
              className="text-gray-400 hover:text-black transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <h2 className="text-xl font-semibold text-black mb-3">
              {displayNode.name}
            </h2>

            <div className="mb-4">
              <div className="text-sm font-medium text-black mb-2">定义</div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {displayNode.definition}
              </p>
            </div>

            {displayNode.parent_type && (
              <div className="pt-4 border-t border-gray-200">
                <div className="text-sm font-medium text-black mb-2">父类型</div>
                <button
                  onClick={() => handleNodeSelect(displayNode.parent_type!)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {allNodes.find((n) => n.id === displayNode.parent_type)?.name ||
                    displayNode.parent_type}
                </button>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <div className="text-sm font-medium text-black mb-2">相关关系</div>
              <div className="space-y-2">
                {allEdges
                  .filter(
                    (e) =>
                      e.source === displayNode.id || e.target === displayNode.id
                  )
                  .slice(0, 10)
                  .map((edge) => {
                    const otherId =
                      edge.source === displayNode.id
                        ? edge.target
                        : edge.source;
                    const otherNode = allNodes.find((n) => n.id === otherId);
                    if (!otherNode) return null;
                    const direction =
                      edge.source === displayNode.id ? '→' : '←';
                    return (
                      <button
                        key={edge.id}
                        onClick={() => handleNodeSelect(otherId)}
                        className="w-full text-left p-2 rounded hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-6 text-center">
                            {direction}
                          </span>
                          <span className="text-sm text-black">
                            {otherNode.name}
                          </span>
                          <span className="text-xs text-gray-400 ml-auto">
                            {edge.relation_type}
                          </span>
                        </div>
                        {edge.verification_status === 'proposed' && (
                          <div className="text-xs text-gray-400 ml-8 mt-0.5">
                            待验证
                          </div>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
