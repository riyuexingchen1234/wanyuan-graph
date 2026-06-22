import { useState, useEffect, useCallback } from 'react';
import cytoscape from 'cytoscape';
import GraphCanvas from '../components/GraphCanvas';
import NodeDetail from '../components/NodeDetail';
import type { GraphData, GraphNode, NodeWithNeighbors } from '../lib/types';

export default function Home() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [neighbors, setNeighbors] = useState<NodeWithNeighbors | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingNode, setLoadingNode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cyInstance, setCyInstance] = useState<cytoscape.Core | null>(null);

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
        node.center();
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

  if (!graphData) {
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
      <div className="flex-1 relative">
        <header className="absolute top-4 left-4 z-10">
          <div className="bg-white/95 backdrop-blur rounded-arco-lg shadow-arco-1 px-5 py-3 flex items-center gap-3">
            <div className="w-1 h-6 bg-coord-ab rounded-full" />
            <div>
              <h1 className="text-arco-2xl font-semibold text-ink-1">万源图谱</h1>
              <p className="text-arco-xs text-ink-3">看见被行业分类切断的连接</p>
            </div>
          </div>
        </header>
        
        <GraphCanvas
          data={graphData}
          selectedNodeId={selectedNodeId}
          onNodeSelect={handleNodeSelect}
          onCyReady={setCyInstance}
          loading={loading}
          error={error}
          onRetry={handleRetry}
        />
      </div>

      {selectedNodeId && (
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