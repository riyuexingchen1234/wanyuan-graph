'use client';

import { useState, useEffect, useCallback } from 'react';
import GraphCanvas from '../components/GraphCanvas';
import NodeDetail from '../components/NodeDetail';
import SearchBar from '../components/SearchBar';
import IntroOverlay from '../components/IntroOverlay';
import KeyboardShortcuts from '../components/KeyboardShortcuts';
import type { GraphData, GraphNode, NodeChainInfo, ChainView } from '../lib/types';

const INTRO_SHOWN_KEY = 'wanyuan-intro-shown';

interface BreadcrumbItem {
  nodeId: string;
  nodeName: string;
  chainLabel?: string;
}

export default function Home() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [chainInfo, setChainInfo] = useState<NodeChainInfo | null>(null);
  const [chainView, setChainView] = useState<ChainView | null>(null);
  const [selectedChain, setSelectedChain] = useState<string | null>(null);

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

  // 预加载完整图数据（用于本地节点查找）
  useEffect(() => {
    let mounted = true;
    fetch('/api/graph')
      .then((res) => res.json())
      .then((data: GraphData) => {
        if (mounted) setGraphData(data);
      })
      .catch((err) => {
        console.error('Failed to preload graph data:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // 获取节点链路信息
  const fetchNodeChains = useCallback(
    async (nodeId: string) => {
      try {
        setLoadingNode(true);
        setError(null);
        const response = await fetch(`/api/graph?node=${encodeURIComponent(nodeId)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch node chains');
        }
        const data: NodeChainInfo = await response.json();
        setChainInfo(data);
        // 从已缓存的图数据中查找节点
        const nodeObj = graphData?.nodes.find((n) => n.id === nodeId) || null;
        setSelectedNode(nodeObj);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoadingNode(false);
      }
    },
    [graphData]
  );

  // 获取链路视图
  const fetchChainView = useCallback(
    async (nodeId: string, relationType: string, depth: number = 3) => {
      try {
        setLoadingChain(true);
        setError(null);
        const response = await fetch(
          `/api/graph?node=${encodeURIComponent(nodeId)}&chain=${encodeURIComponent(
            relationType
          )}&depth=${depth}`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch chain view');
        }
        const data: ChainView = await response.json();
        setChainView(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoadingChain(false);
      }
    },
    []
  );

  // 用户从搜索选择节点
  const handleNodeSelect = useCallback(
    (id: string) => {
      if (!id) return;
      // 重置状态
      setChainView(null);
      setSelectedChain(null);
      setChainInfo(null);
      // 重置面包屑
      setBreadcrumb([]);
      // 加载节点链路信息
      fetchNodeChains(id);
    },
    [fetchNodeChains]
  );

  // 用户从 NodeDetail 选择一条链路
  const handleChainSelect = useCallback(
    (relationType: string) => {
      if (!selectedNode) return;
      setSelectedChain(relationType);
      fetchChainView(selectedNode.id, relationType, 3);

      // 更新当前面包屑项的 chainLabel
      const chainLabel = chainInfo?.chains.find(
        (c) => c.relation_type === relationType
      )?.chain_label;
      if (chainLabel) {
        setBreadcrumb((prev) => {
          if (prev.length === 0) {
            return [
              { nodeId: selectedNode.id, nodeName: selectedNode.name },
            ];
          }
          // 更新最后一项的 chainLabel
          const last = prev[prev.length - 1];
          if (last.nodeId === selectedNode.id) {
            return [
              ...prev.slice(0, -1),
              { ...last, chainLabel },
            ];
          }
          return prev;
        });
      }
    },
    [selectedNode, chainInfo, fetchChainView]
  );

  // 用户在图谱中点击非中心节点 → 切换中心
  const handleGraphNodeSelect = useCallback(
    (id: string) => {
      if (!id) return;
      // 记录面包屑：从当前节点跳到新节点
      if (selectedNode) {
        setBreadcrumb((prev) => {
          // 确保当前节点在面包屑中
          const last = prev[prev.length - 1];
          if (!last || last.nodeId !== selectedNode.id) {
            return [
              ...prev,
              { nodeId: selectedNode.id, nodeName: selectedNode.name },
            ];
          }
          return prev;
        });
      }
      // 重置链路视图，等待用户选择新视角
      setChainView(null);
      setSelectedChain(null);
      setChainInfo(null);
      fetchNodeChains(id);
    },
    [selectedNode, fetchNodeChains]
  );

  // 点击面包屑回退
  const handleBreadcrumbClick = useCallback(
    (index: number) => {
      const item = breadcrumb[index];
      if (!item) return;
      // 截断面包屑到该位置
      setBreadcrumb((prev) => prev.slice(0, index + 1));
      // 重置链路视图
      setChainView(null);
      setSelectedChain(null);
      setChainInfo(null);
      fetchNodeChains(item.nodeId);
    },
    [breadcrumb, fetchNodeChains]
  );

  // 关闭详情面板
  const handleCloseDetail = useCallback(() => {
    setSelectedNode(null);
    setChainInfo(null);
    setChainView(null);
    setSelectedChain(null);
    setBreadcrumb([]);
  }, []);

  // 重试
  const handleRetry = useCallback(() => {
    if (selectedNode) {
      if (selectedChain) {
        fetchChainView(selectedNode.id, selectedChain, 3);
      } else {
        fetchNodeChains(selectedNode.id);
      }
    }
  }, [selectedNode, selectedChain, fetchChainView, fetchNodeChains]);

  // 引导覆盖层
  const handleStartExplore = useCallback(() => {
    setShowIntro(false);
    sessionStorage.setItem(INTRO_SHOWN_KEY, 'true');
  }, []);

  // 搜索聚焦
  const handleSearchFocus = useCallback(() => {
    setSearchOpen(true);
  }, []);

  // ESC 关闭
  const handleEscape = useCallback(() => {
    if (showIntro) return;
    if (selectedNode) {
      handleCloseDetail();
    }
    setSearchOpen(false);
  }, [showIntro, selectedNode, handleCloseDetail]);

  return (
    <div className="h-screen w-full flex overflow-hidden">
      {showIntro && (
        <IntroOverlay onStart={handleStartExplore} onExplore={handleStartExplore} />
      )}

      <div className="flex-1 relative">
        {/* 顶部标题 + 面包屑 */}
        <header className="absolute top-4 left-4 z-30 flex items-center gap-3 max-w-[calc(100%-340px)]">
          <div className="bg-white/95 backdrop-blur rounded-arco-lg shadow-arco-1 px-5 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="w-1 h-6 bg-arco-primary rounded-full" />
            <div>
              <h1 className="text-arco-2xl font-semibold text-ink-1">万源图谱</h1>
              <p className="text-arco-xs text-ink-3">多关系类型产业链探索</p>
            </div>
          </div>

          {/* 面包屑导航 */}
          {breadcrumb.length > 0 && (
            <nav className="bg-white/95 backdrop-blur rounded-arco-lg shadow-arco-1 px-4 py-2 flex items-center gap-1 flex-wrap min-w-0">
              {breadcrumb.map((item, index) => (
                <div key={`${item.nodeId}-${index}`} className="flex items-center gap-1 min-w-0">
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
                  {item.chainLabel && index < breadcrumb.length - 1 && (
                    <span className="px-1.5 py-0.5 bg-arco-primary/10 text-arco-primary rounded-arco-sm text-arco-xs flex-shrink-0">
                      [{item.chainLabel}]
                    </span>
                  )}
                  {item.chainLabel && index === breadcrumb.length - 1 && selectedChain && (
                    <span className="px-1.5 py-0.5 bg-arco-primary/10 text-arco-primary rounded-arco-sm text-arco-xs flex-shrink-0">
                      [{item.chainLabel}]
                    </span>
                  )}
                </div>
              ))}
            </nav>
          )}
        </header>

        <SearchBar onNodeSelect={handleNodeSelect} />

        <GraphCanvas
          chainView={chainView}
          onNodeSelect={handleGraphNodeSelect}
          loading={loadingChain}
          error={error}
          onRetry={handleRetry}
        />

        <KeyboardShortcuts
          onSearchFocus={handleSearchFocus}
          onEscape={handleEscape}
          isSearchOpen={searchOpen}
        />
      </div>

      {selectedNode && (
        <NodeDetail
          node={selectedNode}
          chainInfo={chainInfo}
          loading={loadingNode}
          onClose={handleCloseDetail}
          onChainSelect={handleChainSelect}
          selectedChain={selectedChain}
        />
      )}
    </div>
  );
}
