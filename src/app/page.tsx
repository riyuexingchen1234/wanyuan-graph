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
  { id: 'material-polyethylene', name: '聚乙烯', desc: '从最通用的塑料出发，看它能延伸到哪里' },
  { id: 'industry-photovoltaic', name: '光伏行业', desc: '看看新能源产业链上都有什么' },
  { id: 'equipment-injection-molding-machine', name: '注塑机', desc: '从一台设备开始，探索它连接的世界' },
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
    <div className="h-screen w-full flex overflow-hidden">
      {showIntro && (
        <IntroOverlay
          onStart={handleStartExplore}
          onExplore={handleStartExplore}
        />
      )}

      <div className="flex-1 relative">
        <header className="absolute top-4 left-4 z-30 flex items-center gap-3 max-w-[calc(100%-340px)]">
          <div className="bg-white/95 backdrop-blur rounded-arco-lg shadow-arco-1 px-5 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="w-1 h-6 bg-arco-primary rounded-full" />
            <div>
              <h1 className="text-arco-xl font-semibold text-ink-1">万源图谱</h1>
              <p className="text-arco-xs text-ink-3">发现真实世界的连接</p>
            </div>
          </div>

          {breadcrumb.length > 0 && (
            <nav className="bg-white/95 backdrop-blur rounded-arco-lg shadow-arco-1 px-4 py-2 flex items-center gap-1 flex-wrap min-w-0">
              {breadcrumb.map((item, index) => (
                <div
                  key={`${item.nodeId}-${index}`}
                  className="flex items-center gap-1 min-w-0"
                >
                  {index > 0 && (
                    <svg
                      className="w-3 h-3 text-ink-4 flex-shrink-0"
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
                    className="text-arco-sm text-ink-2 hover:text-arco-primary transition-colors truncate max-w-[120px]"
                    title={item.nodeName}
                  >
                    {item.nodeName}
                  </button>
                  {item.relationType && (
                    <span className="px-1.5 py-0.5 bg-arco-primary/10 text-arco-primary rounded-arco-sm text-arco-xs flex-shrink-0">
                      {item.relationType}
                    </span>
                  )}
                  {item.mode === 'material-extension' && (
                    <span className="px-1.5 py-0.5 bg-pink-500/10 text-pink-400 rounded-arco-sm text-arco-xs flex-shrink-0">
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
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
            <div className="text-center pointer-events-auto">
              <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur flex items-center justify-center mb-6 mx-auto border border-white/20">
                <svg
                  className="w-10 h-10 text-white/70"
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
              <h2 className="text-2xl font-semibold text-white mb-2">
                从一个节点出发，探索真实世界的连接
              </h2>
              <p className="text-white/60 text-sm mb-8 max-w-md mx-auto">
                搜索任意节点，沿着不同类型的关系逐步游走，发现被行业分类遮蔽的真实连接
              </p>

              <div className="flex flex-col items-center gap-3">
                <p className="text-white/40 text-xs">或者从这些节点开始：</p>
                <div className="flex gap-3 flex-wrap justify-center">
                  {RECOMMENDED_NODES.map((node) => (
                    <button
                      key={node.id}
                      onClick={() => handleNodeSelect(node.id)}
                      className="px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 hover:border-white/40 rounded-arco-md transition-all text-left max-w-[200px] group"
                    >
                      <div className="text-white text-sm font-medium group-hover:text-white/90">
                        {node.name}
                      </div>
                      <div className="text-white/50 text-xs mt-1">{node.desc}</div>
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
          <div className="absolute bottom-4 left-4 z-30 bg-white/95 backdrop-blur rounded-arco-md shadow-arco-1 px-4 py-3">
            {canvasMode === 'material-extension' ? (
              <>
                <div className="text-xs text-ink-3 mb-2 font-medium">材料延伸视图</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rotate-45 bg-gradient-to-br from-pink-500 to-pink-300 border border-pink-300" />
                    <span className="text-xs text-ink-2">中心材料</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-600 to-purple-400 border border-pink-500" />
                    <span className="text-xs text-ink-2">延伸应用</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-0.5 bg-pink-500 rounded" />
                    <span className="text-xs text-ink-2">已验证应用</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-0.5 rounded"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(to right, #FF7D00 0, #FF7D00 4px, transparent 4px, transparent 7px)',
                      }}
                    />
                    <span className="text-xs text-ink-2">潜在应用（待验证）</span>
                  </div>
                </div>
                <div className="text-ink-4 text-[10px] mt-2">
                  基于材料底层属性的跨行业应用探索
                </div>
              </>
            ) : (
              <>
                <div className="text-xs text-ink-3 mb-2 font-medium">可信度图例</div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-0.5 bg-success rounded" />
                    <span className="text-xs text-ink-2">已验证</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-0.5 rounded"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(to right, #FF7D00 0, #FF7D00 4px, transparent 4px, transparent 7px)',
                      }}
                    />
                    <span className="text-xs text-ink-2">待验证</span>
                  </div>
                </div>
                <div className="text-ink-4 text-[10px] mt-2">
                  第一阶段：节点录入中，关系数据逐步补充
                </div>
              </>
            )}
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
