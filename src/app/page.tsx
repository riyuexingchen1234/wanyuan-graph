'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import cytoscape from 'cytoscape';
import GraphCanvas from '../components/GraphCanvas';
import NodeDetail from '../components/NodeDetail';
import SearchBar from '../components/SearchBar';
import Legend from '../components/Legend';
import DataCounter from '../components/DataCounter';
import PathGuide from '../components/PathGuide';
import IntroOverlay from '../components/IntroOverlay';
import KeyboardShortcuts from '../components/KeyboardShortcuts';
import type { GraphData, GraphNode, NodeWithNeighbors } from '../lib/types';
import { SAMPLE_PATH_NODE_IDS, SAMPLE_PATH } from '../lib/sample-path';

const INTRO_SHOWN_KEY = 'wanyuan-intro-shown';

export default function Home() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [neighbors, setNeighbors] = useState<NodeWithNeighbors | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingNode, setLoadingNode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cyInstance, setCyInstance] = useState<cytoscape.Core | null>(null);
  const [isGuiding, setIsGuiding] = useState(false);
  const [neighborsMap, setNeighborsMap] = useState<Map<string, NodeWithNeighbors>>(new Map());
  const [isLoadingNeighbors, setIsLoadingNeighbors] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchBarRef = useRef<{ focus: () => void } | null>(null);

  useEffect(() => {
    const hasShown = sessionStorage.getItem(INTRO_SHOWN_KEY);
    if (hasShown) {
      setShowIntro(false);
    }
  }, []);

  useEffect(() => {
    async function fetchGraphData() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/graph');
        if (!response.ok) {
          throw new Error('Failed to fetch graph data');
        }
        const data = await response.json();
        setGraphData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchGraphData();
  }, []);

  useEffect(() => {
    if (!selectedNodeId) {
      setSelectedNode(null);
      setNeighbors(null);
      return;
    }

    async function fetchNodeDetails() {
      try {
        setLoadingNode(true);
        const response = await fetch(`/api/graph/${selectedNodeId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch node details');
        }
        const data = await response.json();
        setSelectedNode(data.node);
        setNeighbors(data);
      } catch (err) {
        console.error('Error fetching node details:', err);
      } finally {
        setLoadingNode(false);
      }
    }

    fetchNodeDetails();
  }, [selectedNodeId]);

  const handleNodeSelect = useCallback((id: string) => {
    setSelectedNodeId(id || null);
  }, []);

  const handleNodeJump = useCallback((id: string) => {
    setSelectedNodeId(id);
    
    if (cyInstance) {
      const node = cyInstance.getElementById(id);
      if (node.length > 0) {
        cyInstance.center(node);
        cyInstance.animate({ zoom: 1.5 }, { duration: 500 });
      }
    }
  }, [cyInstance]);

  const handleCloseDetail = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch('/api/graph')
      .then(response => response.json())
      .then(data => {
        setGraphData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      });
  }, []);

  const handleStartGuide = useCallback(async () => {
    setShowIntro(false);
    sessionStorage.setItem(INTRO_SHOWN_KEY, 'true');
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setIsLoadingNeighbors(true);
    
    try {
      const promises = SAMPLE_PATH_NODE_IDS.map(nodeId => 
        fetch(`/api/graph/${nodeId}`).then(res => res.json())
      );
      
      const results = await Promise.all(promises);
      const newMap = new Map<string, NodeWithNeighbors>();
      
      results.forEach((data, index) => {
        if (data && data.node) {
          newMap.set(SAMPLE_PATH_NODE_IDS[index], data);
        }
      });
      
      setNeighborsMap(newMap);
      setIsGuiding(true);
    } catch (err) {
      console.error('Error preloading neighbors:', err);
    } finally {
      setIsLoadingNeighbors(false);
    }
  }, []);

  const handleExplore = useCallback(() => {
    setShowIntro(false);
    sessionStorage.setItem(INTRO_SHOWN_KEY, 'true');
  }, []);

  const handleExitGuide = useCallback(() => {
    setIsGuiding(false);
    if (cyInstance) {
      cyInstance.elements().animate({
        style: { opacity: 1 },
      }, { duration: 300 });
    }
  }, [cyInstance]);

  const handleSearchFocus = useCallback(() => {
    setSearchOpen(true);
  }, []);

  const handleEscape = useCallback(() => {
    if (showIntro) return;
    
    if (selectedNodeId) {
      setSelectedNodeId(null);
      if (cyInstance) {
        cyInstance.elements().animate({
          style: { opacity: 1 },
        }, { duration: 200 });
      }
    } else if (isGuiding) {
      handleExitGuide();
    }
    
    setSearchOpen(false);
  }, [showIntro, selectedNodeId, isGuiding, cyInstance, handleExitGuide]);

  const handlePrevStep = useCallback(() => {
    if (!isGuiding) return;
    
    const currentIndex = SAMPLE_PATH.findIndex(s => s.nodeId === selectedNodeId);
    if (currentIndex > 0) {
      handleNodeJump(SAMPLE_PATH[currentIndex - 1].nodeId);
    }
  }, [isGuiding, selectedNodeId, handleNodeJump]);

  const handleNextStep = useCallback(() => {
    if (!isGuiding) return;
    
    const currentIndex = SAMPLE_PATH.findIndex(s => s.nodeId === selectedNodeId);
    if (currentIndex < SAMPLE_PATH.length - 1) {
      handleNodeJump(SAMPLE_PATH[currentIndex + 1].nodeId);
    }
  }, [isGuiding, selectedNodeId, handleNodeJump]);

  if (!graphData && !showIntro) {
    return (
      <div className="h-screen w-full bg-canvas-900 flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-warning animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-3 h-3 rounded-full bg-warning animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-3 h-3 rounded-full bg-warning animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-ink-4 text-sm">正在加载图谱数据…</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-error/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-ink-4 text-sm">{error}</span>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-arco-primary hover:bg-arco-primary-hover text-white rounded-arco-md text-sm transition-colors"
            >
              重试
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex overflow-hidden">
      {showIntro && graphData && (
        <IntroOverlay onStart={handleStartGuide} onExplore={handleExplore} />
      )}
      
      <div className="flex-1 relative">
        <header className="absolute top-4 left-4 z-30 flex items-center gap-3">
          <div className="bg-white/95 backdrop-blur rounded-arco-lg shadow-arco-1 px-5 py-3 flex items-center gap-3">
            <div className="w-1 h-6 bg-coord-ab rounded-full" />
            <div>
              <h1 className="text-arco-2xl font-semibold text-ink-1">万源图谱</h1>
              <p className="text-arco-xs text-ink-3">看见被行业分类切断的连接</p>
            </div>
          </div>
          
          <button
            onClick={handleStartGuide}
            disabled={isLoadingNeighbors || isGuiding || !graphData}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-arco-md text-sm font-medium transition-all
              ${isLoadingNeighbors || isGuiding || !graphData
                ? 'bg-coord-ab/50 text-white/70 cursor-not-allowed'
                : 'bg-coord-ab hover:bg-coord-ab/80 text-white shadow-arco-1 cursor-pointer'
              }
            `}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            {isLoadingNeighbors ? '加载中…' : '查看示范路径'}
          </button>
        </header>
        
        <SearchBar onNodeSelect={handleNodeSelect} />
        
        <GraphCanvas
          data={graphData!}
          selectedNodeId={selectedNodeId}
          onNodeSelect={handleNodeSelect}
          onCyReady={setCyInstance}
          loading={loading || !graphData}
          error={error}
          onRetry={handleRetry}
        />
        
        <Legend isHidden={isGuiding} />
        
        <DataCounter 
          nodeCount={graphData?.nodes.length || 0} 
          edgeCount={graphData?.edges.length || 0} 
          isLoading={loading || !graphData}
        />
        
        <KeyboardShortcuts
          onSearchFocus={handleSearchFocus}
          onEscape={handleEscape}
          onPrevStep={handlePrevStep}
          onNextStep={handleNextStep}
          isGuiding={isGuiding}
          isSearchOpen={searchOpen}
        />
        
        <PathGuide
          cyInstance={cyInstance}
          neighborsMap={neighborsMap}
          onNodeSelect={handleNodeSelect}
          isActive={isGuiding}
          onExit={handleExitGuide}
        />
      </div>

      {selectedNodeId && !isGuiding && (
        <NodeDetail
          node={selectedNode}
          neighbors={neighbors}
          loading={loadingNode}
          onClose={handleCloseDetail}
          onNodeJump={handleNodeJump}
        />
      )}
    </div>
  );
}
