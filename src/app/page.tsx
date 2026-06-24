'use client';

import { useState, useEffect, useCallback } from 'react';
import GraphCanvas from '../components/GraphCanvas';
import NodeDetail from '../components/NodeDetail';
import SearchBar from '../components/SearchBar';
import IntroOverlay from '../components/IntroOverlay';
import KeyboardShortcuts from '../components/KeyboardShortcuts';
import type { GraphNode, ChainView, RelationType } from '../lib/types';

const INTRO_SHOWN_KEY = 'wanyuan-intro-shown';

interface BreadcrumbItem {
  nodeId: string;
  nodeName: string;
  relationType?: RelationType;
  mode?: 'default' | 'material-extension';
}

const RECOMMENDED_NODES = [
  { id: 'material-polyethylene', name: '聚乙烯', desc: '从最通用的塑料出发' },
  { id: 'industry-photovoltaic', name: '光伏行业', desc: '看看新能源产业链' },
  { id: 'equipment-injection-molding-machine', name: '注塑机', desc: '从一台设备开始探索' },
];

export default function Home() {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [parentNode, setParentNode] = useState<GraphNode | null>(null);
  const [childNodes, setChildNodes] = useState<GraphNode[]>([]);
  const [chains, setChains] = useState<
    Array<{
      relation_type: RelationType;
      upstream_count: number;
      downstream_count: number;
    }>
  >([]);
  const [chainView, setChainView] = useState<ChainView | null>(null);
  const [selectedChain, setSelectedChain] = useState<RelationType | null>(null);
  const [canvasMode, setCanvasMode] = useState<'default' | 'material-extension'>(
    'default'
  );

  const [loadingNode, setLoadingNode] = useState(false);
  const [loadingChain, setLoadingChain] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [showIntro, setShowIntro] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const hasShown = sessionStorage.getItem(INTRO_SHOWN_KEY);
    if (hasShown) {
      setShowIntro(false);
    }
  }, []);

  const fetchNodeDetail = useCallback(async (nodeId: string) => {
    try {
      setLoadingNode(true);
      setError(null);
      const response = await fetch(
        `/api/graph?node=${encodeURIComponent(nodeId)}&mode=detail`
      );
      if (!response.ok) {
        throw new Error('节点不存在');
      }
      const data = await response.json();
      setSelectedNode(data.node);
      setParentNode(data.parent || null);
      setChildNodes(data.children || []);
      setChains(data.chain_summary || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoadingNode(false);
    }
  }, []);

  const fetchChainView = useCallback(
    async (nodeId: string, relationType: RelationType, depth: number = 1) => {
      try {
        setLoadingChain(true);
        setError(null);
        const response = await fetch(
          `/api/graph?node=${encodeURIComponent(
            nodeId
          )}&chain=${encodeURIComponent(relationType)}&depth=${depth}`
        );
        if (!response.ok) {
          throw new Error('获取链路视图失败');
        }
        const data: ChainView = await response.json();
        setChainView(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoadingChain(false);
      }
    },
    []
  );

  const handleNodeSelect = useCallback(
    (id: string) => {
      if (!id) return;
      setChainView(null);
      setSelectedChain(null);
      setChains([]);
      setBreadcrumb([]);
      setCanvasMode('default');
      fetchNodeDetail(id);
    },
    [fetchNodeDetail]
  );

  const handleChainSelect = useCallback(
    (relationType: RelationType) => {
      if (!selectedNode) return;
      setSelectedChain(relationType);
      setCanvasMode('default');
      fetchChainView(selectedNode.id, relationType, 1);

      setBreadcrumb((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.nodeId === selectedNode.id) {
          return [...prev.slice(0, -1), { ...last, relationType, mode: 'default' }];
        }
        return [
          ...prev,
          {
            nodeId: selectedNode.id,
            nodeName: selectedNode.name,
            relationType,
            mode: 'default',
          },
        ];
      });
    },
    [selectedNode, fetchChainView]
  );

  const handleMaterialExtensionClick = useCallback(() => {
    if (!selectedNode) return;
    setSelectedChain(null);
    setCanvasMode('material-extension');
    fetchChainView(selectedNode.id, 'applied_in', 1);

    setBreadcrumb((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.nodeId === selectedNode.id) {
        return [...prev.slice(0, -1), { ...last, mode: 'material-extension' }];
      }
      return [
        ...prev,
        {
          nodeId: selectedNode.id,
          nodeName: selectedNode.name,
          mode: 'material-extension',
        },
      ];
    });
  }, [selectedNode, fetchChainView]);

  const handleGraphNodeSelect = useCallback(
    (id: string) => {
      if (!id) return;
      if (selectedNode) {
        setBreadcrumb((prev) => {
          const last = prev[prev.length - 1];
          if (!last || last.nodeId !== selectedNode.id) {
            return [
              ...prev,
              {
                nodeId: selectedNode.id,
                nodeName: selectedNode.name,
                relationType: selectedChain || undefined,
                mode: canvasMode,
              },
            ];
          }
          return prev;
        });
      }
      setChainView(null);
      setSelectedChain(null);
      setChains([]);
      setCanvasMode('default');
      fetchNodeDetail(id);
    },
    [selectedNode, selectedChain, canvasMode, fetchNodeDetail]
  );

  const handleParentClick = useCallback(() => {
    if (parentNode) {
      handleNodeSelect(parentNode.id);
    }
  }, [parentNode, handleNodeSelect]);

  const handleChildClick = useCallback(
    (childId: string) => {
      handleNodeSelect(childId);
    },
    [handleNodeSelect]
  );

  const handleBreadcrumbClick = useCallback(
    (index: number) => {
      const item = breadcrumb[index];
      if (!item) return;
      setBreadcrumb((prev) => prev.slice(0, index + 1));
      setChainView(null);
      setSelectedChain(null);
      setChains([]);
      setCanvasMode(item.mode || 'default');
      fetchNodeDetail(item.nodeId);
    },
    [breadcrumb, fetchNodeDetail]
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedNode(null);
    setParentNode(null);
    setChildNodes([]);
    setChains([]);
    setChainView(null);
    setSelectedChain(null);
    setBreadcrumb([]);
    setCanvasMode('default');
  }, []);

  const handleRetry = useCallback(() => {
    if (selectedNode) {
      if (selectedChain) {
        fetchChainView(selectedNode.id, selectedChain, 1);
      } else {
        fetchNodeDetail(selectedNode.id);
      }
    }
  }, [selectedNode, selectedChain, fetchChainView, fetchNodeDetail]);

  const handleStartExplore = useCallback(() => {
    setShowIntro(false);
    sessionStorage.setItem(INTRO_SHOWN_KEY, 'true');
  }, []);

  const handleSearchFocus = useCallback(() => {
    setSearchOpen(true);
  }, []);

  const handleEscape = useCallback(() => {
    if (showIntro) return;
    if (selectedNode) {
      handleCloseDetail();
    }
    setSearchOpen(false);
  }, [showIntro, selectedNode, handleCloseDetail]);

  const hasSelection = selectedNode !== null;

  return (
    <div className="h-screen w-full flex overflow-hidden bg-white">
      {showIntro && (
        <IntroOverlay
          onStart={handleStartExplore}
          onExplore={handleStartExplore}
        />
      )}

      <div className="flex-1 relative">
        <header className="absolute top-4 left-4 z-30 flex items-center gap-3 max-w-[calc(100%-340px)]">
          <div className="bg-white border border-gray-200 rounded px-5 py-3">
            <h1 className="text-lg font-semibold text-black">万源图谱</h1>
            <p className="text-xs text-gray-500">发现真实世界的连接</p>
          </div>

          {breadcrumb.length > 0 && (
            <nav className="bg-white border border-gray-200 rounded px-4 py-2 flex items-center gap-1 flex-wrap min-w-0">
              {breadcrumb.map((item, index) => (
                <div
                  key={`${item.nodeId}-${index}`}
                  className="flex items-center gap-1 min-w-0"
                >
                  {index > 0 && (
                    <svg
                      className="w-3 h-3 text-gray-400 flex-shrink-0"
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
                  <button
                    onClick={() => handleBreadcrumbClick(index)}
                    className="text-sm text-gray-700 hover:text-black truncate max-w-[120px]"
                    title={item.nodeName}
                  >
                    {item.nodeName}
                  </button>
                  {item.relationType && (
                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs flex-shrink-0">
                      {item.relationType}
                    </span>
                  )}
                  {item.mode === 'material-extension' && (
                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs flex-shrink-0">
                      材料延伸
                    </span>
                  )}
                </div>
              ))}
            </nav>
          )}
        </header>

        <div className="absolute top-4 right-4 z-40 w-[320px]">
          <SearchBar onNodeSelect={handleNodeSelect} />
        </div>

        {!hasSelection && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-black mb-2">
                从一个节点出发，探索真实世界的连接
              </h2>
              <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto">
                搜索任意节点，沿着不同类型的关系逐步游走
              </p>

              <div className="flex flex-col items-center gap-3">
                <p className="text-gray-400 text-xs">或者从这些节点开始：</p>
                <div className="flex gap-3 flex-wrap justify-center">
                  {RECOMMENDED_NODES.map((node) => (
                    <button
                      key={node.id}
                      onClick={() => handleNodeSelect(node.id)}
                      className="px-4 py-3 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-left max-w-[200px]"
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

        <GraphCanvas
          centerNode={selectedNode}
          chainView={chainView}
          mode={canvasMode}
          onNodeSelect={handleGraphNodeSelect}
          loading={loadingChain}
          error={error}
          onRetry={handleRetry}
        />

        {hasSelection && (
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

        <KeyboardShortcuts
          onSearchFocus={handleSearchFocus}
          onEscape={handleEscape}
          isSearchOpen={searchOpen}
        />
      </div>

      {selectedNode && (
        <NodeDetail
          node={selectedNode}
          parent={parentNode}
          childNodes={childNodes}
          chains={chains}
          loading={loadingNode}
          onClose={handleCloseDetail}
          onChainSelect={handleChainSelect}
          onParentClick={handleParentClick}
          onChildClick={handleChildClick}
          onMaterialExtensionClick={handleMaterialExtensionClick}
          selectedChain={selectedChain}
        />
      )}
    </div>
  );
}
