'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import SearchBar from '../components/SearchBar';
import NodeDetail from '../components/NodeDetail';
import type { GraphNode, GraphEdge, ChainDef, NodeType } from '@/lib/types';
import { NODE_TYPE_LABELS, NODE_TYPE_COLORS } from '@/lib/types';
import { getGraphDataProvider } from '@/lib/graph-data';

export default function Home() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [chains, setChains] = useState<ChainDef[]>([]);

  useEffect(() => {
    const provider = getGraphDataProvider();
    const data = provider.getGraphData();
    setNodes(data.nodes);
    setEdges(data.edges);
    setChains(provider.getViewableChains());
  }, []);

  const handleNodeSelect = useCallback((id: string) => {
    setSelectedNodeId(id);
    setSelectedChainId(null);
  }, []);

  const handleChainSelect = useCallback((id: string) => {
    setSelectedChainId(id);
    setSelectedNodeId(null);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const displayNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, nodes]);

  const selectedChain = useMemo(() => {
    if (!selectedChainId) return null;
    return chains.find((c) => c.id === selectedChainId) || null;
  }, [selectedChainId, chains]);

  const nodesByType = useMemo(() => {
    const grouped: Record<NodeType, GraphNode[]> = {
      substance: [],
      process: [],
      equipment: [],
      facility: [],
    };
    for (const node of nodes) {
      if (grouped[node.node_type]) {
        grouped[node.node_type].push(node);
      }
    }
    return grouped;
  }, [nodes]);

  const chainMainAxis = useMemo(() => {
    if (!selectedChainId) return null;
    const provider = getGraphDataProvider();
    return provider.getMainAxisPath(selectedChainId);
  }, [selectedChainId, nodes]);

  return (
    <div className="h-screen w-full flex overflow-hidden bg-gray-50">
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-black">万源图谱</h1>
          <p className="text-xs text-gray-500 mt-1">产业链知识图谱</p>
        </div>

        <div className="p-3 border-b border-gray-200">
          <SearchBar onNodeSelect={handleNodeSelect} placeholder="搜索节点..." />
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-3">
            <h2 className="text-sm font-semibold text-gray-700 mb-2 px-1">产业链 ({chains.length})</h2>
            <div className="space-y-1">
              {chains.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => handleChainSelect(chain.id)}
                  className={`w-full text-left p-2 rounded transition-colors ${
                    selectedChainId === chain.id
                      ? 'bg-gray-100 border border-gray-300'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: chain.color }}
                    />
                    <span className="text-sm text-black font-medium truncate">
                      {chain.name}
                    </span>
                  </div>
                  {chain.description && (
                    <p className="text-xs text-gray-500 mt-1 ml-5 line-clamp-2">
                      {chain.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 border-t border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-2 px-1">
              节点统计: {nodes.length}
            </h2>
            <div className="space-y-3">
              {(Object.keys(nodesByType) as NodeType[]).map((type) => {
                const typeNodes = nodesByType[type];
                if (typeNodes.length === 0) return null;
                return (
                  <div key={type}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: NODE_TYPE_COLORS[type] }}
                      />
                      <span className="text-xs font-medium text-gray-600">
                        {NODE_TYPE_LABELS[type]} ({typeNodes.length})
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {typeNodes.slice(0, 8).map((node) => (
                        <button
                          key={node.id}
                          onClick={() => handleNodeSelect(node.id)}
                          className={`w-full text-left px-2 py-1 rounded text-sm transition-colors ${
                            selectedNodeId === node.id
                              ? 'bg-gray-100 text-black font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-black'
                          }`}
                        >
                          <span className="truncate block">{node.name}</span>
                        </button>
                      ))}
                      {typeNodes.length > 8 && (
                        <p className="text-xs text-gray-400 px-2">
                          ...还有 {typeNodes.length - 8} 个节点
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {selectedChain && chainMainAxis ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: selectedChain.color }}
                  />
                  <h2 className="text-2xl font-bold text-black">{selectedChain.name}</h2>
                </div>
                {selectedChain.description && (
                  <p className="text-gray-600">{selectedChain.description}</p>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">主链路 (黄金链)</h3>
                <div className="flex items-center flex-wrap gap-2">
                  {chainMainAxis.nodes.map((node, index) => (
                    <div key={node.id} className="flex items-center gap-2">
                      <button
                        onClick={() => handleNodeSelect(node.id)}
                        className="px-3 py-2 bg-white border border-gray-200 rounded hover:border-gray-400 transition-colors text-left"
                      >
                        <div
                          className="text-xs px-1.5 py-0.5 rounded inline-block mb-1"
                          style={{
                            backgroundColor: `${NODE_TYPE_COLORS[node.node_type]}20`,
                            color: NODE_TYPE_COLORS[node.node_type],
                          }}
                        >
                          {NODE_TYPE_LABELS[node.node_type]}
                        </div>
                        <div className="text-sm font-medium text-black">{node.name}</div>
                      </button>
                      {index < chainMainAxis.nodes.length - 1 && (
                        <svg
                          className="w-5 h-5 text-gray-400 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-black">{chainMainAxis.nodes.length}</div>
                  <div className="text-xs text-gray-500">主链路节点</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-black">{chainMainAxis.edges.length}</div>
                  <div className="text-xs text-gray-500">主链路边</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-black">
                    {nodes.filter((n) => n.chains?.includes(selectedChain.id)).length}
                  </div>
                  <div className="text-xs text-gray-500">链上节点</div>
                </div>
              </div>
            </div>
          </div>
        ) : !displayNode ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <svg
              className="w-16 h-16 mb-4 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <p className="text-lg font-medium text-gray-500">选择产业链或节点开始探索</p>
            <p className="text-sm text-gray-400 mt-1">从左侧列表选择，或使用上方搜索框</p>

            <div className="mt-8 grid grid-cols-4 gap-6">
              {(Object.keys(nodesByType) as NodeType[]).map((type) => (
                <div key={type} className="text-center">
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
                    style={{ backgroundColor: `${NODE_TYPE_COLORS[type]}20` }}
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: NODE_TYPE_COLORS[type] }}
                    />
                  </div>
                  <div className="text-sm font-medium text-gray-600">
                    {NODE_TYPE_LABELS[type]}
                  </div>
                  <div className="text-xs text-gray-400">{nodesByType[type].length} 个</div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <p className="text-xs text-gray-400">
                共 {nodes.length} 个节点，{edges.length} 条边，{chains.length} 条产业链
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <p className="text-gray-500 mb-4">3D 图形视图待完善</p>
              <p className="text-sm text-gray-400">当前选中节点：{displayNode.name}</p>
            </div>
          </div>
        )}
      </div>

      {displayNode && (
        <NodeDetail
          node={displayNode}
          edges={edges}
          allNodes={nodes}
          onClose={handleCloseDetail}
          onNodeClick={handleNodeSelect}
        />
      )}
    </div>
  );
}
