'use client';

import { useState, useEffect } from 'react';
import type { GraphNode, GraphEdge } from '@/lib/types';

export default function DataManagementPage() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'nodes' | 'edges'>('nodes');
  const [filter, setFilter] = useState({
    type: '',
    coordinate: '',
    status: '',
    search: '',
  });
  const [editingItem, setEditingItem] = useState<GraphNode | GraphEdge | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/graph');
      const data = await res.json();
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEdge = async (edgeId: string) => {
    const evidence = prompt('请输入证据来源 (JSON 格式):');
    if (!evidence) return;

    try {
      const evidenceData = JSON.parse(evidence);
      await fetch('/api/admin/review/verify-edge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edgeId,
          evidence: evidenceData,
        }),
      });
      await fetchData();
    } catch (error) {
      alert('验证失败: ' + error);
    }
  };

  const filteredNodes = nodes.filter(node => {
    if (filter.type && node.node_type !== filter.type) return false;
    if (filter.coordinate && !node.coordinate_systems?.includes(filter.coordinate as any)) return false;
    if (filter.search && !node.name.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  const filteredEdges = edges.filter(edge => {
    if (filter.status && edge.verification_status !== filter.status) return false;
    if (filter.search) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      const searchLower = filter.search.toLowerCase();
      return (
        edge.source.toLowerCase().includes(searchLower) ||
        edge.target.toLowerCase().includes(searchLower) ||
        sourceNode?.name.toLowerCase().includes(searchLower) ||
        targetNode?.name.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const exportJSON = () => {
    const data = { nodes: filteredNodes, edges: filteredEdges };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wanyuan-export-${Date.now()}.json`;
    a.click();
  };

  const exportCSV = () => {
    const rows = [['ID', 'Name', 'Type', 'Coordinates', 'Status']];
    
    if (activeTab === 'nodes') {
      filteredNodes.forEach(node => {
        rows.push([
          node.id,
          node.name,
          node.node_type,
          node.coordinate_systems?.join('|') || '',
          '',
        ]);
      });
    } else {
      filteredEdges.forEach(edge => {
        rows.push([
          edge.id,
          edge.source,
          edge.target,
          edge.relation_type,
          edge.verification_status,
        ]);
      });
    }

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wanyuan-export-${Date.now()}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas-900 flex items-center justify-center">
        <div className="text-white/60">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-900">
      <header className="bg-canvas-800 border-b border-canvas-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">数据管理</h1>
          <nav className="flex gap-4">
            <a href="/admin" className="text-white/60 hover:text-white">采集</a>
            <a href="/admin/data" className="text-coord-ab">数据管理</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="bg-canvas-800 rounded-arco-lg p-6 border border-canvas-700 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="搜索名称..."
                value={filter.search}
                onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
                className="w-full bg-canvas-700 border border-canvas-600 rounded-arco-md px-3 py-2 text-white placeholder:text-white/40"
              />
            </div>

            {activeTab === 'nodes' ? (
              <>
                <select
                  value={filter.type}
                  onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}
                  className="bg-canvas-700 border border-canvas-600 rounded-arco-md px-3 py-2 text-white"
                >
                  <option value="">全部类型</option>
                  <option value="material">材料</option>
                  <option value="process">工艺</option>
                  <option value="equipment">设备</option>
                  <option value="product">产品</option>
                  <option value="industry">行业</option>
                </select>
                <select
                  value={filter.coordinate}
                  onChange={e => setFilter(f => ({ ...f, coordinate: e.target.value }))}
                  className="bg-canvas-700 border border-canvas-600 rounded-arco-md px-3 py-2 text-white"
                >
                  <option value="">全部坐标系</option>
                  <option value="A">坐标系 A</option>
                  <option value="B">坐标系 B</option>
                  <option value="AB">交汇点 AB</option>
                </select>
              </>
            ) : (
              <select
                value={filter.status}
                onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
                className="bg-canvas-700 border border-canvas-600 rounded-arco-md px-3 py-2 text-white"
              >
                <option value="">全部状态</option>
                <option value="verified">已验证</option>
                <option value="proposed">待验证</option>
              </select>
            )}

            <div className="flex gap-2">
              <button
                onClick={exportJSON}
                className="px-4 py-2 bg-canvas-700 hover:bg-canvas-600 text-white rounded-arco-md transition-colors"
              >
                导出 JSON
              </button>
              <button
                onClick={exportCSV}
                className="px-4 py-2 bg-canvas-700 hover:bg-canvas-600 text-white rounded-arco-md transition-colors"
              >
                导出 CSV
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('nodes')}
            className={`px-4 py-2 rounded-arco-md transition-colors ${
              activeTab === 'nodes'
                ? 'bg-coord-ab text-white'
                : 'bg-canvas-700 text-white/60 hover:text-white'
            }`}
          >
            节点 ({filteredNodes.length})
          </button>
          <button
            onClick={() => setActiveTab('edges')}
            className={`px-4 py-2 rounded-arco-md transition-colors ${
              activeTab === 'edges'
                ? 'bg-coord-ab text-white'
                : 'bg-canvas-700 text-white/60 hover:text-white'
            }`}
          >
            边 ({filteredEdges.length})
          </button>
        </div>

        <div className="bg-canvas-800 rounded-arco-lg border border-canvas-700 overflow-hidden">
          {activeTab === 'nodes' ? (
            <table className="w-full">
              <thead className="bg-canvas-700">
                <tr>
                  <th className="text-left px-4 py-3 text-sm text-white/60 font-medium">名称</th>
                  <th className="text-left px-4 py-3 text-sm text-white/60 font-medium">类型</th>
                  <th className="text-left px-4 py-3 text-sm text-white/60 font-medium">坐标系</th>
                  <th className="text-left px-4 py-3 text-sm text-white/60 font-medium">描述</th>
                </tr>
              </thead>
              <tbody>
                {filteredNodes.map(node => (
                  <tr key={node.id} className="border-t border-canvas-700 hover:bg-canvas-700/50">
                    <td className="px-4 py-3 text-sm text-white">{node.name}</td>
                    <td className="px-4 py-3 text-sm text-white/60">{node.node_type}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {node.coordinate_systems?.map(c => (
                          <span
                            key={c}
                            className={`px-2 py-0.5 text-xs rounded ${
                              c === 'A' ? 'bg-coord-a/20 text-coord-a' :
                              c === 'B' ? 'bg-coord-b/20 text-coord-b' :
                              'bg-coord-ab/20 text-coord-ab'
                            }`}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-white/60 truncate max-w-[300px]">
                      {node.description || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead className="bg-canvas-700">
                <tr>
                  <th className="text-left px-4 py-3 text-sm text-white/60 font-medium">起点</th>
                  <th className="text-left px-4 py-3 text-sm text-white/60 font-medium">终点</th>
                  <th className="text-left px-4 py-3 text-sm text-white/60 font-medium">关系</th>
                  <th className="text-left px-4 py-3 text-sm text-white/60 font-medium">状态</th>
                  <th className="text-left px-4 py-3 text-sm text-white/60 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredEdges.map(edge => {
                  const sourceNode = nodes.find(n => n.id === edge.source);
                  const targetNode = nodes.find(n => n.id === edge.target);
                  return (
                    <tr key={edge.id} className="border-t border-canvas-700 hover:bg-canvas-700/50">
                      <td className="px-4 py-3 text-sm text-white">
                        {sourceNode?.name || edge.source}
                      </td>
                      <td className="px-4 py-3 text-sm text-white">
                        {targetNode?.name || edge.target}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/60">{edge.relation_type}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          edge.verification_status === 'verified'
                            ? 'bg-success/20 text-success'
                            : 'bg-warning/20 text-warning'
                        }`}>
                          {edge.verification_status === 'verified' ? '已验证' : '待验证'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {edge.verification_status === 'proposed' && (
                          <button
                            onClick={() => handleVerifyEdge(edge.id)}
                            className="text-xs text-coord-ab hover:underline"
                          >
                            验证
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-4 text-center text-sm text-white/40">
          共 {activeTab === 'nodes' ? filteredNodes.length : filteredEdges.length} 条记录
        </div>
      </main>
    </div>
  );
}
