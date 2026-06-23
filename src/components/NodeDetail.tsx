import type { GraphNode, NodeChainInfo } from '../lib/types';
import { NODE_TYPE_LABELS, NODE_TYPE_COLORS } from '../lib/cytoscape-config';

interface NodeDetailProps {
  node: GraphNode | null;
  chainInfo: NodeChainInfo | null;
  loading?: boolean;
  onClose: () => void;
  onChainSelect: (relationType: string) => void;
  selectedChain?: string | null;
}

function Skeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="h-6 w-32 bg-line-2 rounded" />
          <div className="flex gap-2">
            <div className="h-4 w-16 bg-line-2 rounded" />
            <div className="h-4 w-16 bg-line-2 rounded" />
          </div>
        </div>
        <div className="w-8 h-8 bg-line-2 rounded" />
      </div>
      <div className="h-20 bg-line-2 rounded" />
      <div className="space-y-2">
        <div className="h-4 w-20 bg-line-2 rounded" />
        <div className="flex gap-2 flex-wrap">
          <div className="h-8 w-24 bg-line-2 rounded" />
          <div className="h-8 w-24 bg-line-2 rounded" />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-canvas-800 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </div>
      <p className="text-ink-3 text-sm">搜索并选择一个节点</p>
      <p className="text-ink-4 text-xs mt-1">查看其参与的链路</p>
    </div>
  );
}

export default function NodeDetail({
  node,
  chainInfo,
  loading,
  onClose,
  onChainSelect,
  selectedChain,
}: NodeDetailProps) {
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

  const nodeColor = NODE_TYPE_COLORS[node.type] || '#86909C';
  const nodeLabel = NODE_TYPE_LABELS[node.type] || node.type;
  const isCrossIndustry = chainInfo?.cross_industry ?? false;
  const connectedIndustries = chainInfo?.connected_industries ?? [];
  const chains = chainInfo?.chains ?? [];

  return (
    <div className="w-[400px] h-full bg-surface-1 shadow-arco-3 rounded-l-arco-lg overflow-hidden flex flex-col">
      {/* 顶部色条 */}
      <div className="h-1" style={{ backgroundColor: nodeColor }} />

      {/* 跨行业提示 */}
      {isCrossIndustry && (
        <div className="bg-warning/5 border-y border-warning/20 px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            <span className="text-warning text-sm font-medium">
              该节点同时出现在 {connectedIndustries.length} 个行业中
            </span>
          </div>
          <div className="flex gap-1.5 flex-wrap mt-2">
            {connectedIndustries.map((industry) => (
              <span
                key={industry}
                className="px-2 py-0.5 bg-warning/10 text-warning text-xs rounded-arco-sm"
              >
                {industry}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* 标题区 */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-arco-xl font-semibold text-ink-1">{node.name}</h2>
              <div className="flex gap-2 mt-2">
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
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 描述 */}
          {node.description && (
            <div className="pt-4 border-t border-line-1">
              <div className="text-ink-1 text-sm font-medium mb-2">描述</div>
              <p className="text-ink-2 text-sm leading-relaxed">{node.description}</p>
            </div>
          )}

          {/* 别名 */}
          {node.aliases && node.aliases.length > 0 && (
            <div className="pt-4 border-t border-line-1">
              <div className="text-ink-1 text-sm font-medium mb-3">别名</div>
              <div className="flex gap-2 flex-wrap">
                {node.aliases.map((alias, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-surface-2 rounded-arco-sm text-ink-2 text-xs"
                  >
                    {alias}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 关联行业 */}
          {node.industry_tags.length > 0 && (
            <div className="pt-4 border-t border-line-1">
              <div className="text-ink-1 text-sm font-medium mb-3">关联行业</div>
              <div className="flex gap-2 flex-wrap">
                {node.industry_tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-surface-2 rounded-arco-sm text-ink-2 text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 链路列表 */}
          {chains.length > 0 && (
            <div className="pt-4 border-t border-line-1">
              <div className="text-ink-1 text-sm font-medium mb-3">参与链路</div>
              <div className="space-y-2">
                {chains.map((chain) => {
                  const isSelected = selectedChain === chain.relation_type;
                  return (
                    <button
                      key={chain.relation_type}
                      onClick={() => onChainSelect(chain.relation_type)}
                      className={`
                        w-full flex items-center justify-between p-3 rounded-arco-sm transition-all cursor-pointer
                        ${isSelected
                          ? 'bg-surface-3 ring-2 ring-offset-0'
                          : 'bg-surface-2 hover:bg-surface-3'
                        }
                      `}
                      style={isSelected ? { boxShadow: `0 0 0 2px ${chain.chain_color}` } : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: chain.chain_color }}
                        />
                        <span className="text-ink-1 text-sm font-medium">
                          {chain.chain_label}
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-ink-4 text-xs mt-2">点击链路查看视图</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
