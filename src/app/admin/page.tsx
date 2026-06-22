'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CollectionTask, CollectionResult } from '@/lib/data-collector';
import type { GraphNode, GraphEdge } from '@/lib/types';

interface PendingReview {
  task_id: string;
  status: string;
  collected_data?: {
    nodes?: GraphNode[];
    edges?: GraphEdge[];
  };
  review_notes?: string;
  created_at: string;
}

export default function AdminPage() {
  const [taskName, setTaskName] = useState('');
  const [taskType, setTaskType] = useState<'material' | 'process' | 'equipment' | 'product' | 'industry'>('material');
  const [coordSystems, setCoordSystems] = useState<'A' | 'B' | 'AB'>('A');
  const [context, setContext] = useState('');
  
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [selectedReview, setSelectedReview] = useState<PendingReview | null>(null);
  const [collectionProgress, setCollectionProgress] = useState<string>('');
  const [isCollecting, setIsCollecting] = useState(false);

  useEffect(() => {
    fetchPendingReviews();
  }, []);

  const fetchPendingReviews = async () => {
    try {
      const res = await fetch('/api/admin/collect/pending');
      const data = await res.json();
      setPendingReviews(data);
    } catch (error) {
      console.error('Failed to fetch pending reviews:', error);
    }
  };

  const handleSingleCollect = async () => {
    if (!taskName.trim()) return;

    setIsCollecting(true);
    setCollectionProgress('采集中...');

    const task: CollectionTask = {
      taskType: 'node',
      target: {
        name: taskName,
        node_type: taskType,
        coordinate_systems: coordSystems === 'AB' ? ['A', 'B'] : [coordSystems],
      },
      context: context || undefined,
    };

    try {
      const res = await fetch('/api/admin/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      });
      
      const result: CollectionResult = await res.json();
      
      if (result.status === 'success') {
        setCollectionProgress(`采集成功！`);
      } else {
        setCollectionProgress(`采集失败: ${result.error}`);
      }

      await fetchPendingReviews();
    } catch (error) {
      setCollectionProgress(`采集失败: ${error}`);
    } finally {
      setIsCollecting(false);
      setTimeout(() => setCollectionProgress(''), 3000);
    }
  };

  const handleBatchCollect = async () => {
    setIsCollecting(true);
    
    let completed = 0;
    const total = 14;

    try {
      const res = await fetch('/api/admin/collect/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usePresets: true }),
      });
      
      const data = await res.json();
      
      if (data.results) {
        completed = data.results.filter((r: CollectionResult) => r.status === 'success').length;
      }
      
      setCollectionProgress(`完成: ${completed}/${total}`);
      await fetchPendingReviews();
    } catch (error) {
      setCollectionProgress(`批量采集失败: ${error}`);
    } finally {
      setIsCollecting(false);
      setTimeout(() => setCollectionProgress(''), 5000);
    }
  };

  const handleApprove = async (review: PendingReview) => {
    try {
      await fetch('/api/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          taskId: review.task_id,
          nodes: review.collected_data?.nodes,
          edges: review.collected_data?.edges,
        }),
      });
      
      await fetchPendingReviews();
      setSelectedReview(null);
    } catch (error) {
      console.error('Approve failed:', error);
    }
  };

  const handleReject = async (taskId: string) => {
    try {
      await fetch('/api/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          taskId,
        }),
      });
      
      await fetchPendingReviews();
      setSelectedReview(null);
    } catch (error) {
      console.error('Reject failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-900">
      <header className="bg-canvas-800 border-b border-canvas-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">数据采集管理</h1>
          <nav className="flex gap-4">
            <a href="/admin" className="text-coord-ab">采集</a>
            <a href="/admin/data" className="text-white/60 hover:text-white">数据管理</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-canvas-800 rounded-arco-lg p-6 border border-canvas-700">
            <h2 className="text-lg font-medium text-white mb-4">采集任务</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-1">事物名称</label>
                <input
                  type="text"
                  value={taskName}
                  onChange={e => setTaskName(e.target.value)}
                  placeholder="如：硅料、锂电池"
                  className="w-full bg-canvas-700 border border-canvas-600 rounded-arco-md px-3 py-2 text-white placeholder:text-white/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1">节点类型</label>
                  <select
                    value={taskType}
                    onChange={e => setTaskType(e.target.value as any)}
                    className="w-full bg-canvas-700 border border-canvas-600 rounded-arco-md px-3 py-2 text-white"
                  >
                    <option value="material">材料</option>
                    <option value="process">工艺</option>
                    <option value="equipment">设备</option>
                    <option value="product">产品</option>
                    <option value="industry">行业</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-1">坐标系</label>
                  <select
                    value={coordSystems}
                    onChange={e => setCoordSystems(e.target.value as any)}
                    className="w-full bg-canvas-700 border border-canvas-600 rounded-arco-md px-3 py-2 text-white"
                  >
                    <option value="A">产业链 (A)</option>
                    <option value="B">材料属性 (B)</option>
                    <option value="AB">交汇点 (AB)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-1">背景上下文 (可选)</label>
                <textarea
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  placeholder="补充说明该事物的应用场景或关联领域"
                  rows={2}
                  className="w-full bg-canvas-700 border border-canvas-600 rounded-arco-md px-3 py-2 text-white placeholder:text-white/40"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSingleCollect}
                  disabled={isCollecting || !taskName.trim()}
                  className="flex-1 bg-coord-ab hover:bg-coord-ab/80 disabled:bg-coord-ab/50 text-white rounded-arco-md py-2 transition-colors"
                >
                  开始采集
                </button>
                <button
                  onClick={handleBatchCollect}
                  disabled={isCollecting}
                  className="flex-1 bg-canvas-700 hover:bg-canvas-600 text-white rounded-arco-md py-2 transition-colors"
                >
                  一键执行预设任务
                </button>
              </div>

              {collectionProgress && (
                <div className="text-sm text-center text-white/60 bg-canvas-700 rounded-arco-md px-3 py-2">
                  {collectionProgress}
                </div>
              )}
            </div>
          </div>

          <div className="bg-canvas-800 rounded-arco-lg p-6 border border-canvas-700">
            <h2 className="text-lg font-medium text-white mb-4">待审核列表</h2>
            
            {pendingReviews.length === 0 ? (
              <div className="text-center text-white/40 py-8">
                暂无待审核数据
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {pendingReviews.map(review => (
                  <div
                    key={review.task_id}
                    onClick={() => setSelectedReview(review)}
                    className="bg-canvas-700 rounded-arco-md p-3 cursor-pointer hover:bg-canvas-600 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm">
                        {review.collected_data?.nodes?.[0]?.name || 'Unknown'}
                      </span>
                      <span className="text-xs text-white/40">
                        {new Date(review.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-success">
                        {review.collected_data?.nodes?.length || 0} 节点
                      </span>
                      <span className="text-xs text-coord-ab">
                        {review.collected_data?.edges?.length || 0} 边
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedReview && (
          <div className="mt-6 bg-canvas-800 rounded-arco-lg p-6 border border-canvas-700">
            <h2 className="text-lg font-medium text-white mb-4">审核详情</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm text-white/60 mb-2">节点</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {selectedReview.collected_data?.nodes?.map((node, i) => (
                    <div key={i} className="bg-canvas-700 rounded-arco-md p-3">
                      <div className="font-medium text-white">{node.name}</div>
                      <div className="text-xs text-white/40 mt-1">
                        类型: {node.node_type} | 坐标系: {node.coordinate_systems?.join(', ')}
                      </div>
                      {node.description && (
                        <div className="text-xs text-white/60 mt-1">{node.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm text-white/60 mb-2">边 (均为 proposed)</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {selectedReview.collected_data?.edges?.map((edge, i) => (
                    <div key={i} className="bg-canvas-700 rounded-arco-md p-3">
                      <div className="text-sm text-white">{edge.source} → {edge.target}</div>
                      <div className="text-xs text-white/40 mt-1">关系: {edge.relation_type}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {selectedReview.review_notes && (
              <div className="mt-4 bg-warning/10 border border-warning/30 rounded-arco-md p-3">
                <div className="text-sm text-warning font-medium">审核备注</div>
                <div className="text-sm text-white/70 mt-1">{selectedReview.review_notes}</div>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => handleApprove(selectedReview)}
                className="px-6 py-2 bg-success hover:bg-success/80 text-white rounded-arco-md transition-colors"
              >
                通过
              </button>
              <button
                onClick={() => handleReject(selectedReview.task_id)}
                className="px-6 py-2 bg-error hover:bg-error/80 text-white rounded-arco-md transition-colors"
              >
                拒绝
              </button>
              <button
                onClick={() => setSelectedReview(null)}
                className="px-6 py-2 bg-canvas-700 hover:bg-canvas-600 text-white rounded-arco-md transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
