'use client';

import { useState } from 'react';
import type { GraphNode, RelationType } from '@/lib/types';
import {
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  RELATION_TYPE_LABELS,
  RELATION_TYPE_COLORS,
} from '@/lib/dal';

interface NodeDetailProps {
  node: GraphNode | null;
  parent?: GraphNode | null;
  childNodes?: GraphNode[];
  chains?: Array<{
    relation_type: RelationType;
    upstream_count: number;
    downstream_count: number;
  }>;
  loading?: boolean;
  onClose: () => void;
  onChainSelect?: (relationType: RelationType) => void;
  onParentClick?: () => void;
  onChildClick?: (childId: string) => void;
  onMaterialExtensionClick?: () => void;
  selectedChain?: RelationType | null;
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
  other: '其他',
};

export default function NodeDetail({
  node,
  parent,
  childNodes = [],
  chains = [],
  loading,
  onClose,
  onChainSelect,
  onParentClick,
  onChildClick,
  onMaterialExtensionClick,
  selectedChain,
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
  const hasChains = chains.length > 0;
  const hasSources = node.sources && node.sources.length > 0;
  const hasChildren = childNodes.length > 0;
  const isMaterial = node.node_type === 'material';
  const hasAttributes = node.attributes && Object.keys(node.attributes).some(
    (k) => k !== 'cost_tier' && Object.keys((node.attributes as any)[k] || {}).length > 0
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
                  style={{ backgroundColor: NODE_TYPE_COLORS[node.node_type] || '#86909C' }}
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
              {node.definition}
            </p>
          </div>

          {parent && (
            <div className="pt-4 border-t border-gray-200">
              <div className="text-black text-sm font-medium mb-2">父类型</div>
              <button
                onClick={onParentClick}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded text-gray-700 text-sm transition-colors"
              >
                {parent.name}
              </button>
            </div>
          )}

          {hasChildren && (
            <div className="pt-4 border-t border-gray-200">
              <div className="text-black text-sm font-medium mb-3">
                子类型 ({childNodes.length})
              </div>
              <div className="flex gap-2 flex-wrap">
                {childNodes.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => onChildClick?.(child.id)}
                    className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded text-gray-700 text-sm transition-colors"
                  >
                    {child.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {node.aliases && node.aliases.length > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <div className="text-black text-sm font-medium mb-3">别名</div>
              <div className="flex gap-2 flex-wrap">
                {node.aliases.map((alias, index) => (
                  <div key={index} className="flex flex-col">
                    <span className="px-2 py-1 bg-gray-50 rounded text-gray-700 text-xs">
                      {alias.term}
                    </span>
                    {alias.context && (
                      <span className="text-gray-400 text-[10px] mt-0.5">
                        {alias.context}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isMaterial && hasAttributes && (
            <div className="pt-4 border-t border-gray-200">
              <div className="text-black text-sm font-medium mb-3">
                材料属性
              </div>
              <div className="space-y-3">
                {node.attributes?.physical && Object.keys(node.attributes.physical).length > 0 && (
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="text-gray-500 text-xs font-medium mb-2">物理性能</div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(node.attributes.physical).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center">
                          <span className="text-gray-500 text-xs">{key}</span>
                          <span className="text-gray-700 text-xs font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {node.attributes?.chemical && Object.keys(node.attributes.chemical).length > 0 && (
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="text-gray-500 text-xs font-medium mb-2">化学性能</div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(node.attributes.chemical).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center">
                          <span className="text-gray-500 text-xs">{key}</span>
                          <span className="text-gray-700 text-xs font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {node.attributes?.process_capability && Object.keys(node.attributes.process_capability).length > 0 && (
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="text-gray-500 text-xs font-medium mb-2">加工工艺</div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(node.attributes.process_capability).map(([key, value]) => (
                        <span
                          key={key}
                          className={`px-2 py-0.5 rounded text-xs ${
                            value === '支持'
                              ? 'bg-gray-200 text-gray-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {key}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {node.attributes?.cost_tier && (
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded">
                    <span className="text-gray-500 text-xs">成本等级</span>
                    <span className="text-gray-700 text-xs font-medium">
                      {node.attributes.cost_tier}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {isMaterial && (
            <div className="pt-4 border-t border-gray-200">
              <div className="text-black text-sm font-medium mb-3">
                材料属性延伸
              </div>
              <button
                onClick={onMaterialExtensionClick}
                className="w-full p-4 rounded border border-gray-200 hover:border-gray-400 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-gray-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="text-black text-sm font-medium">
                        探索材料延伸应用
                      </div>
                      <div className="text-gray-500 text-xs mt-0.5">
                        基于材料底层属性的潜在应用延伸
                      </div>
                    </div>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400"
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
                </div>
              </button>
            </div>
          )}

          {hasChains && (
            <div className="pt-4 border-t border-gray-200">
              <div className="text-black text-sm font-medium mb-3">
                物理流动链
              </div>
              <div className="space-y-2">
                {chains.map((chain) => {
                  const isSelected = selectedChain === chain.relation_type;
                  const label =
                    RELATION_TYPE_LABELS[chain.relation_type] ||
                    chain.relation_type;
                  return (
                    <button
                      key={chain.relation_type}
                      onClick={() => onChainSelect?.(chain.relation_type)}
                      className={`
                        w-full flex items-center justify-between p-3 rounded transition-colors
                        ${isSelected
                          ? 'bg-gray-100 border border-gray-300'
                          : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: RELATION_TYPE_COLORS[chain.relation_type] || '#86909C' }}
                        />
                        <span className="text-black text-sm font-medium">
                          {label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        {chain.upstream_count > 0 && (
                          <span className="text-gray-500">
                            上游 {chain.upstream_count}
                          </span>
                        )}
                        {chain.downstream_count > 0 && (
                          <span className="text-gray-500">
                            下游 {chain.downstream_count}
                          </span>
                        )}
                        <svg
                          className="w-4 h-4 text-gray-400"
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
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-gray-400 text-xs mt-2">点击链路查看视图</p>
            </div>
          )}

          {!hasChains && (
            <div className="pt-4 border-t border-gray-200">
              <div className="text-black text-sm font-medium mb-3">
                关联关系
              </div>
              <div className="p-4 bg-gray-50 rounded text-center">
                <p className="text-gray-500 text-sm">暂无关系数据</p>
                <p className="text-gray-400 text-xs mt-1">
                  当前处于节点录入阶段，关系数据逐步补充中
                </p>
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
