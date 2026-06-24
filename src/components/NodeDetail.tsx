'use client';

import { useState } from 'react';
import type { GraphNode, RelationType } from '@/lib/types';
import {
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  RELATION_TYPE_LABELS,
  RELATION_TYPE_COLORS,
} from '@/lib/graph-data';

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
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="h-6 w-32 bg-line-2 rounded" />
          <div className="flex gap-2">
            <div className="h-4 w-16 bg-line-2 rounded" />
          </div>
        </div>
        <div className="w-8 h-8 bg-line-2 rounded" />
      </div>
      <div className="h-16 bg-line-2 rounded" />
      <div className="space-y-2">
        <div className="h-4 w-20 bg-line-2 rounded" />
        <div className="h-8 w-full bg-line-2 rounded" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-canvas-800 flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-ink-3"
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
      <p className="text-ink-3 text-sm">搜索并选择一个节点</p>
      <p className="text-ink-4 text-xs mt-1">查看节点信息和关联关系</p>
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
      <div className="w-[400px] h-full bg-surface-1 shadow-arco-3 rounded-l-arco-lg overflow-hidden">
        <Skeleton />
      </div>
    );
  }

  if (!node) {
    return (
      <div className="w-[400px] h-full bg-surface-1 shadow-arco-3 rounded-l-arco-lg overflow-hidden">
        <EmptyState />
      </div>
    );
  }

  const nodeColor = NODE_TYPE_COLORS[node.node_type] || '#86909C';
  const nodeLabel = NODE_TYPE_LABELS[node.node_type] || node.node_type;
  const hasChains = chains.length > 0;
  const hasSources = node.sources && node.sources.length > 0;
  const hasChildren = childNodes.length > 0;
  const isMaterial = node.node_type === 'material';
  const hasAttributes = node.attributes && Object.keys(node.attributes).some(
    (k) => k !== 'cost_tier' && Object.keys((node.attributes as any)[k] || {}).length > 0
  );

  const physicalChains = chains.filter(
    (c) =>
      c.relation_type === 'raw_material_for' ||
      c.relation_type === 'equipment_for' ||
      c.relation_type === 'consumable_for' ||
      c.relation_type === 'upstream_of' ||
      c.relation_type === 'downstream_of' ||
      c.relation_type === 'can_be_processed_into' ||
      c.relation_type === 'made_of'
  );

  const extensionChains = chains.filter(
    (c) =>
      c.relation_type === 'applied_in' ||
      c.relation_type === 'structurally_similar_to'
  );

  return (
    <div className="w-[400px] h-full bg-surface-1 shadow-arco-3 rounded-l-arco-lg overflow-hidden flex flex-col">
      <div className="h-1" style={{ backgroundColor: nodeColor }} />

      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-arco-xl font-semibold text-ink-1">
                  {node.name}
                </h2>
                {node.stage === 'draft' && (
                  <span className="px-1.5 py-0.5 text-xs bg-ink-4/10 text-ink-3 rounded-arco-sm">
                    录入中
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-arco-sm text-xs text-white"
                  style={{ backgroundColor: nodeColor }}
                >
                  {nodeLabel}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-ink-3 hover:text-ink-1 hover:bg-surface-2 rounded-arco-sm transition-colors"
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

          <div className="pt-4 border-t border-line-1">
            <div className="text-ink-1 text-sm font-medium mb-2">定义</div>
            <p className="text-ink-2 text-sm leading-relaxed">
              {node.definition}
            </p>
          </div>

          {parent && (
            <div className="pt-4 border-t border-line-1">
              <div className="text-ink-1 text-sm font-medium mb-2">父类型</div>
              <button
                onClick={onParentClick}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-2 hover:bg-surface-3 rounded-arco-sm text-ink-2 text-sm transition-colors"
              >
                <svg
                  className="w-4 h-4 text-ink-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                  />
                </svg>
                {parent.name}
              </button>
            </div>
          )}

          {hasChildren && (
            <div className="pt-4 border-t border-line-1">
              <div className="text-ink-1 text-sm font-medium mb-3">
                子类型 ({childNodes.length})
              </div>
              <div className="flex gap-2 flex-wrap">
                {childNodes.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => onChildClick?.(child.id)}
                    className="px-3 py-1.5 bg-surface-2 hover:bg-surface-3 rounded-arco-sm text-ink-2 text-sm transition-colors"
                  >
                    {child.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {node.aliases && node.aliases.length > 0 && (
            <div className="pt-4 border-t border-line-1">
              <div className="text-ink-1 text-sm font-medium mb-3">别名</div>
              <div className="flex gap-2 flex-wrap">
                {node.aliases.map((alias, index) => (
                  <div key={index} className="flex flex-col">
                    <span className="px-2 py-1 bg-surface-2 rounded-arco-sm text-ink-2 text-xs">
                      {alias.term}
                    </span>
                    {alias.context && (
                      <span className="text-ink-4 text-[10px] mt-0.5">
                        {alias.context}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isMaterial && hasAttributes && (
            <div className="pt-4 border-t border-line-1">
              <div className="text-ink-1 text-sm font-medium mb-3">
                材料属性
              </div>
              <div className="space-y-3">
                {node.attributes?.physical && Object.keys(node.attributes.physical).length > 0 && (
                  <div className="p-3 bg-surface-2 rounded-arco-md">
                    <div className="text-ink-3 text-xs font-medium mb-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-arco-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      物理性能
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(node.attributes.physical).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center">
                          <span className="text-ink-4 text-xs">{key}</span>
                          <span className="text-ink-2 text-xs font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {node.attributes?.chemical && Object.keys(node.attributes.chemical).length > 0 && (
                  <div className="p-3 bg-surface-2 rounded-arco-md">
                    <div className="text-ink-3 text-xs font-medium mb-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318 1.022a2 2 0 01-1.023 1.022l-2.387.477a6 6 0 01-3.86-.517l-.318-1.022a2 2 0 01-1.023-1.022L2.01 14.88a6 6 0 010-5.76l2.387-.477a2 2 0 011.022-.547l.318-1.022a6 6 0 013.86.517l.318 1.022a2 2 0 001.023 1.022l2.387.477a6 6 0 003.86-.517l.318-1.022a2 2 0 001.023-1.022l2.387-.477a6 6 0 010 5.76l-2.387.477a2 2 0 00-1.022.547l-.318 1.022a6 6 0 01-3.86-.517l-.318-1.022a2 2 0 01-1.023-1.022z" />
                      </svg>
                      化学性能
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(node.attributes.chemical).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center">
                          <span className="text-ink-4 text-xs">{key}</span>
                          <span className="text-ink-2 text-xs font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {node.attributes?.process_capability && Object.keys(node.attributes.process_capability).length > 0 && (
                  <div className="p-3 bg-surface-2 rounded-arco-md">
                    <div className="text-ink-3 text-xs font-medium mb-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      加工工艺
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(node.attributes.process_capability).map(([key, value]) => (
                        <span
                          key={key}
                          className={`px-2 py-0.5 rounded text-xs ${
                            value === '支持'
                              ? 'bg-success/10 text-success'
                              : 'bg-ink-4/10 text-ink-3'
                          }`}
                        >
                          {key}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {node.attributes?.cost_tier && (
                  <div className="flex items-center justify-between px-3 py-2 bg-surface-2 rounded-arco-md">
                    <span className="text-ink-3 text-xs">成本等级</span>
                    <span className="text-ink-2 text-xs font-medium">
                      {node.attributes.cost_tier}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {isMaterial && (
            <div className="pt-4 border-t border-line-1">
              <div className="text-ink-1 text-sm font-medium mb-3">
                材料属性延伸
              </div>
              <button
                onClick={onMaterialExtensionClick}
                className="w-full p-4 rounded-arco-md bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 hover:border-pink-500/40 transition-colors text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-pink-400"
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
                      <div className="text-ink-1 text-sm font-medium text-pink-300">
                        探索材料延伸应用
                      </div>
                      <div className="text-ink-3 text-xs mt-0.5">
                        基于材料底层属性的潜在应用延伸
                      </div>
                    </div>
                  </div>
                  <svg
                    className="w-5 h-5 text-ink-3 group-hover:text-pink-400 transition-colors"
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
            <div className="pt-4 border-t border-line-1">
              <div className="text-ink-1 text-sm font-medium mb-3">
                物理流动链
              </div>
              <div className="space-y-2">
                {physicalChains.length > 0 ? (
                  physicalChains.map((chain) => {
                    const isSelected = selectedChain === chain.relation_type;
                    const color =
                      RELATION_TYPE_COLORS[chain.relation_type] || '#86909C';
                    const label =
                      RELATION_TYPE_LABELS[chain.relation_type] ||
                      chain.relation_type;
                    return (
                      <button
                        key={chain.relation_type}
                        onClick={() => onChainSelect?.(chain.relation_type)}
                        className={`
                          w-full flex items-center justify-between p-3 rounded-arco-sm transition-all cursor-pointer
                          ${isSelected
                            ? 'bg-surface-3'
                            : 'bg-surface-2 hover:bg-surface-3'
                          }
                        `}
                        style={
                          isSelected
                            ? { boxShadow: `0 0 0 2px ${color}` }
                            : undefined
                        }
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-ink-1 text-sm font-medium">
                            {label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          {chain.upstream_count > 0 && (
                            <span className="text-ink-3">
                              上游 {chain.upstream_count}
                            </span>
                          )}
                          {chain.downstream_count > 0 && (
                            <span className="text-ink-3">
                              下游 {chain.downstream_count}
                            </span>
                          )}
                          <svg
                            className="w-4 h-4 text-ink-3"
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
                  })
                ) : (
                  <p className="text-ink-4 text-sm">暂无物理流动链数据</p>
                )}
              </div>
              <p className="text-ink-4 text-xs mt-2">点击链路查看视图</p>
            </div>
          )}

          {!hasChains && (
            <div className="pt-4 border-t border-line-1">
              <div className="text-ink-1 text-sm font-medium mb-3">
                关联关系
              </div>
              <div className="p-4 bg-surface-2 rounded-arco-md text-center">
                <p className="text-ink-3 text-sm">暂无关系数据</p>
                <p className="text-ink-4 text-xs mt-1">
                  当前处于节点录入阶段，关系数据逐步补充中
                </p>
              </div>
            </div>
          )}

          {hasSources && (
            <div className="pt-4 border-t border-line-1">
              <button
                onClick={() => setShowSources(!showSources)}
                className="flex items-center justify-between w-full text-ink-1 text-sm font-medium mb-2"
              >
                <span>来源 ({node.sources?.length})</span>
                <svg
                  className={`w-4 h-4 text-ink-3 transition-transform ${
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
                      className="p-3 bg-surface-2 rounded-arco-sm"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 text-[10px] bg-ink-4/10 text-ink-3 rounded-arco-sm">
                          {SOURCE_TYPE_LABELS[source.source_type] ||
                            source.source_type}
                        </span>
                      </div>
                      <p className="text-ink-2 text-xs">{source.description}</p>
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-arco-primary text-xs mt-1 hover:underline inline-block"
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
