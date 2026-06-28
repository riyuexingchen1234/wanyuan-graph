'use client';

import { useState } from 'react';
import type { GraphNode, GraphEdge } from '@/lib/types';
import { NODE_TYPE_COLORS, NODE_TYPE_LABELS, EDGE_TYPE_LABELS } from '@/lib/types';

interface NodeDetailProps {
  node: GraphNode | null;
  edges?: GraphEdge[];
  allNodes?: GraphNode[];
  loading?: boolean;
  onClose: () => void;
  onNodeClick?: (nodeId: string) => void;
}

function Skeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-6 w-32 bg-gray-200 rounded" />
        <div className="h-4 w-16 bg-gray-200 rounded" />
      </div>
      <div className="h-16 bg-gray-200 rounded" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
      <p className="text-gray-500 text-sm">搜索并选择一个节点</p>
      <p className="text-gray-400 text-xs mt-1">查看节点信息和关联关系</p>
    </div>
  );
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  patent: '专利',
  standard: '标准',
  industry_report: '行业报告',
  news: '新闻报道',
  expert_interview: '专家访谈',
  official_data: '官方数据',
  encyclopedia: '百科',
  textbook: '教材',
  company_disclosure: '公司披露',
  ai_suggested: 'AI建议',
  other: '其他',
};

export default function NodeDetail({
  node,
  edges = [],
  allNodes = [],
  loading,
  onClose,
  onNodeClick,
}: NodeDetailProps) {
  const [showSources, setShowSources] = useState(false);

  if (loading) {
    return (
      <div className="w-[400px] h-full bg-white border-l border-gray-200 overflow-hidden">
        <Skeleton />
      </div>
    );
  }

  if (!node) {
    return (
      <div className="w-[400px] h-full bg-white border-l border-gray-200 overflow-hidden">
        <EmptyState />
      </div>
    );
  }

  const nodeLabel = NODE_TYPE_LABELS[node.node_type] || node.node_type;
  const nodeColor = NODE_TYPE_COLORS[node.node_type] || '#86909C';
  const hasSources = node.sources && node.sources.length > 0;
  const hasAliases = node.aliases && node.aliases.length > 0;
  const hasAttributes = node.attributes && Object.keys(node.attributes).length > 0;

  const connectedEdges = edges.filter(
    (e) => e.source === node.id || e.target === node.id
  );

  return (
    <div className="w-[400px] h-full bg-white border-l border-gray-200 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-semibold text-black">
                  {node.name}
                </h2>
                {node.stage === 'draft' && (
                  <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                    录入中
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs text-white"
                  style={{ backgroundColor: nodeColor }}
                >
                  {nodeLabel}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 rounded transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="text-black text-sm font-medium mb-2">定义</div>
            <p className="text-gray-700 text-sm leading-relaxed">
              {node.definition || '暂无定义'}
            </p>
          </div>

          {hasAliases && (
            <div className="pt-4 border-t border-gray-200">
              <div className="text-black text-sm font-medium mb-3">别名</div>
              <div className="flex gap-2 flex-wrap">
                {node.aliases!.map((alias, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-50 rounded text-gray-700 text-xs"
                  >
                    {alias.term}
                  </span>
                ))}
              </div>
            </div>
          )}

          {hasAttributes && (
            <div className="pt-4 border-t border-gray-200">
              <div className="text-black text-sm font-medium mb-3">属性</div>
              <div className="space-y-2">
                {Object.entries(node.attributes!).map(([key, value]) => (
                  value && (
                    <div key={key} className="flex justify-between items-center py-1">
                      <span className="text-gray-500 text-xs">{key}</span>
                      <span className="text-gray-700 text-xs font-medium">{value}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {connectedEdges.length > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <div className="text-black text-sm font-medium mb-3">
                关联关系 ({connectedEdges.length})
              </div>
              <div className="space-y-2">
                {connectedEdges.slice(0, 15).map((edge) => {
                  const otherId = edge.source === node.id ? edge.target : edge.source;
                  const otherNode = allNodes.find((n) => n.id === otherId);
                  if (!otherNode) return null;
                  const direction = edge.source === node.id ? '→' : '←';
                  const edgeLabel = EDGE_TYPE_LABELS[edge.edge_type] || edge.edge_type;
                  return (
                    <button
                      key={edge.id}
                      onClick={() => onNodeClick?.(otherId)}
                      className="w-full text-left p-2 rounded hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-6 text-center">
                          {direction}
                        </span>
                        <span className="text-sm text-black flex-1">
                          {otherNode.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {edgeLabel}
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
          )}

          {node.chains && node.chains.length > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <div className="text-black text-sm font-medium mb-3">所属产业链</div>
              <div className="flex flex-wrap gap-2">
                {node.chains.map((chainId) => (
                  <span
                    key={chainId}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                  >
                    {chainId}
                  </span>
                ))}
              </div>
            </div>
          )}

          {hasSources && (
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowSources(!showSources)}
                className="flex items-center justify-between w-full text-black text-sm font-medium mb-2"
              >
                <span>来源 ({node.sources?.length})</span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    showSources ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {showSources && (
                <div className="space-y-2 mt-2">
                  {node.sources?.map((source, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 rounded"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 text-[10px] bg-gray-200 text-gray-600 rounded">
                          {SOURCE_TYPE_LABELS[source.source_type] ||
                            source.source_type}
                        </span>
                      </div>
                      <p className="text-gray-700 text-xs">{source.description}</p>
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 text-xs mt-1 hover:underline inline-block"
                        >
                          查看来源 →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
