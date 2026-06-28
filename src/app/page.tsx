'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import SearchBar from '../components/SearchBar';
import EdgeReviewerList from '../components/EdgeReviewerList';
import EdgeChallenger from '../components/EdgeChallenger';
import StatusLegend from '../components/StatusLegend';
import { useGraphStore } from '../store/graphStore';
import type { GraphEdge, GraphNode, NodeType } from '@/lib/types';
import {
  getDataProvider,
  getMainChainNodeIds,
  MAIN_CHAIN_RELATION,
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  RELATION_TYPE_COLORS,
  RELATION_TYPE_LABELS,
} from '@/lib/dal';
import { SWITCHABLE_RELATIONS } from '@/lib/cytoscape-config';
import type { EdgeHoverInfo } from '../components/GraphCanvas';

// Cytoscape 仅在浏览器运行，禁用 SSR 以避免 DOM 依赖。
const GraphCanvas = dynamic(() => import('../components/GraphCanvas'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-ink-3 text-sm">
      图谱加载中…
    </div>
  ),
});

// Three.js / R3F 同样仅浏览器运行，禁用 SSR。
const GalaxyView = dynamic(() => import('../components/Graph3D/GalaxyView'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-canvas-900 text-white/50 text-sm">
      星云生成中…
    </div>
  ),
});

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

const VERIFICATION_DOT: Record<string, string> = {
  proposed: '#FF7D00',
  verified: '#1D2129',
};

const VERIFICATION_LABEL: Record<string, string> = {
  proposed: '待验证',
  verified: '已验证',
};

export default function Home() {
  const {
    viewMode,
    selectedNodeId,
    relationType,
    expandedNodeIds,
    selectNode,
    setRelationType,
    setViewMode,
    resetView,
    clearSelection,
    setEdges,
  } = useGraphStore();

  const [hover, setHover] = useState<EdgeHoverInfo | null>(null);

  const provider = useMemo(() => getDataProvider(), []);
  const mainChainIds = useMemo(() => getMainChainNodeIds(), []);

  // 把服务端加载的边灌入客户端 store（供审核员面板做状态机操作）
  useEffect(() => {
    setEdges(provider.getGraphData().edges);
  }, [provider, setEdges]);

  // 星云宏观层展示全图数据
  const galaxyData = useMemo(() => provider.getGraphData(), [provider]);

  // 在星云中点击节点：进入 2D 微观层并聚焦该节点
  const handleGalaxySelect = useCallback(
    (id: string) => {
      selectNode(id);
      setViewMode('detail');
    },
    [selectNode, setViewMode]
  );

  const handleBackToGalaxy = useCallback(() => {
    setViewMode('galaxy');
  }, [setViewMode]);

  /* ---------------- 可见网络推导 ---------------- */
  const visibleNodeIds = useMemo(() => {
    const ids = new Set<string>();
    // 主链：仅当查看 can_be_processed_into 时作为初始可见集合
    if (relationType === MAIN_CHAIN_RELATION) {
      for (const id of mainChainIds) ids.add(id);
    }
    if (selectedNodeId) ids.add(selectedNodeId);
    for (const id of Array.from(expandedNodeIds)) {
      ids.add(id);
      const neighbors = provider.getNodeNeighbors(id, relationType);
      for (const nb of neighbors) ids.add(nb.id);
    }
    return ids;
  }, [relationType, selectedNodeId, expandedNodeIds, mainChainIds, provider]);

  const visibleNodes = useMemo(
    () =>
      Array.from(visibleNodeIds)
        .map((id) => provider.getNodeById(id))
        .filter((n): n is GraphNode => Boolean(n)),
    [visibleNodeIds, provider]
  );

  const visibleEdges = useMemo(() => {
    const all = provider.getGraphData().edges;
    return all.filter(
      (e) =>
        e.relation_type === relationType &&
        visibleNodeIds.has(e.source) &&
        visibleNodeIds.has(e.target)
    );
  }, [relationType, visibleNodeIds, provider]);

  const selectedNode = useMemo(
    () => (selectedNodeId ? provider.getNodeById(selectedNodeId) ?? null : null),
    [selectedNodeId, provider]
  );

  // 节点的全部关联边（跨所有关系类型），供详情面板列出。
  // 来源是 graphStore.edges（而非 provider 原始数据），这样状态机变更能即时反映到 UI。
  const storeEdges = useGraphStore((s) => s.edges);
  const selectedNodeEdges = useMemo(() => {
    if (!selectedNodeId) return [] as GraphEdge[];
    return storeEdges.filter(
      (e) => e.source === selectedNodeId || e.target === selectedNodeId
    );
  }, [selectedNodeId, storeEdges]);

  /* ---------------- 交互 ---------------- */
  const handleNodeSelect = useCallback(
    (id: string) => {
      selectNode(id);
    },
    [selectNode]
  );

  const handleEdgeNavigate = useCallback(
    (edge: GraphEdge) => {
      const otherId = edge.source === selectedNodeId ? edge.target : edge.source;
      if (edge.relation_type !== relationType) {
        setRelationType(edge.relation_type);
      }
      selectNode(otherId);
    },
    [selectedNodeId, relationType, selectNode, setRelationType]
  );

  const isEmpty =
    visibleNodes.length === 0 && relationType !== MAIN_CHAIN_RELATION;

  /* ---------------- 星云宏观层 ---------------- */
  if (viewMode === 'galaxy') {
    return (
      <div className="h-screen w-full overflow-hidden bg-canvas-900 layer-fade-in">
        <GalaxyView
          nodes={galaxyData.nodes}
          edges={galaxyData.edges}
          onSelectNode={handleGalaxySelect}
        />
      </div>
    );
  }

  /* ---------------- 2D 微观层渲染 ---------------- */
  return (
    <div className="h-screen w-full flex overflow-hidden bg-surface-2 layer-fade-in">
      {/* 左侧：图谱区 */}
      <div className="flex-1 relative min-w-0">
        {/* 顶部栏：标题 + 关系类型切换 */}
        <header className="absolute top-4 left-4 right-4 z-30 flex items-start gap-3">
          <div className="bg-white border border-line-1 rounded-arco-md px-5 py-3 shadow-arco-1 flex-shrink-0">
            <h1 className="text-arco-lg font-semibold text-ink-1">万源图谱</h1>
            <p className="text-arco-xs text-ink-3 mt-0.5">看见产业关系网</p>
          </div>

          <div className="bg-white border border-line-1 rounded-arco-md px-3 py-2 shadow-arco-1 flex items-center gap-1.5 flex-wrap max-w-[680px]">
            <span className="text-arco-xs text-ink-3 mr-1 ml-1">关系类型</span>
            {SWITCHABLE_RELATIONS.map((rt) => {
              const active = rt === relationType;
              const color = RELATION_TYPE_COLORS[rt];
              return (
                <button
                  key={rt}
                  onClick={() => setRelationType(rt)}
                  className={`px-3 py-1.5 rounded-arco-sm text-arco-sm transition-colors border ${
                    active
                      ? 'text-white border-transparent shadow-sm'
                      : 'text-ink-2 border-line-1 hover:bg-surface-2'
                  }`}
                  style={active ? { backgroundColor: color } : undefined}
                >
                  {RELATION_TYPE_LABELS[rt]}
                </button>
              );
            })}
            <button
              onClick={resetView}
              className="ml-1 px-3 py-1.5 rounded-arco-sm text-arco-sm text-ink-3 hover:text-ink-1 hover:bg-surface-2 border border-line-1 transition-colors"
            >
              重置
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleBackToGalaxy}
              className="h-[44px] inline-flex items-center gap-1.5 px-3.5 rounded-arco-md bg-canvas-900 hover:bg-canvas-800 text-white/90 border border-canvas-700 shadow-arco-1 transition-colors text-arco-sm whitespace-nowrap"
              title="返回 3D 星云宏观层"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7 7-7m11 7H3"
                />
              </svg>
              返回星云
            </button>
            <div className="w-[320px]">
              <SearchBar onNodeSelect={handleNodeSelect} />
            </div>
          </div>
        </header>

        {/* 状态条 */}
        <div className="absolute top-[88px] left-4 z-20 bg-white/90 border border-line-1 rounded-arco-sm px-3 py-1.5 text-arco-xs text-ink-3 shadow-arco-1">
          当前关系：<span className="text-ink-1 font-medium">{RELATION_TYPE_LABELS[relationType]}</span>
          <span className="mx-2 text-line-2">|</span>
          可见节点 <span className="text-ink-1 font-medium">{visibleNodes.length}</span>
          <span className="mx-2 text-line-2">|</span>
          可见连接 <span className="text-ink-1 font-medium">{visibleEdges.length}</span>
          {selectedNode && (
            <>
              <span className="mx-2 text-line-2">|</span>
              选中：<span className="text-ink-1 font-medium">{selectedNode.name}</span>
            </>
          )}
        </div>

        {/* 图谱画布 + tooltip */}
        <div className="absolute inset-0">
          <GraphCanvas
            nodes={visibleNodes}
            edges={visibleEdges}
            selectedNodeId={selectedNodeId}
            onNodeSelect={handleNodeSelect}
            onEdgeHover={setHover}
          />
          {/* 2D 视图右下角状态图例：只在微观层显示 */}
          {viewMode === 'detail' && <StatusLegend />}
          {hover && (
            <div
              className="absolute z-40 pointer-events-none bg-white border border-line-1 rounded-arco-md shadow-arco-3 px-3 py-2 max-w-[280px]"
              style={{
                left: hover.x,
                top: hover.y - 10,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: RELATION_TYPE_COLORS[hover.relationType] }}
                />
                <span className="text-arco-sm text-ink-1 font-medium">
                  {RELATION_TYPE_LABELS[hover.relationType]}
                </span>
                <span
                  className="px-1.5 py-0.5 text-[10px] rounded-arco-sm"
                  style={{
                    backgroundColor: `${VERIFICATION_DOT[hover.verificationStatus]}1A`,
                    color: VERIFICATION_DOT[hover.verificationStatus],
                  }}
                >
                  {VERIFICATION_LABEL[hover.verificationStatus]}
                </span>
              </div>
              <div className="text-arco-xs text-ink-2">
                {hover.sourceName} <span className="text-ink-4">→</span> {hover.targetName}
              </div>
              {hover.reasoning && (
                <div className="text-arco-xs text-ink-3 mt-1 leading-relaxed">
                  <span className="text-ink-4">提出依据：</span>
                  {hover.reasoning}
                </div>
              )}
              {hover.note && (
                <div className="text-arco-xs text-ink-3 mt-1 leading-relaxed">
                  <span className="text-ink-4">备注：</span>
                  {hover.note}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 空状态提示 */}
        {isEmpty && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <div className="bg-white border border-line-1 rounded-arco-lg shadow-arco-2 px-6 py-5 text-center pointer-events-auto">
              <p className="text-arco-sm text-ink-1 font-medium mb-1">
                当前关系类型下无可见网络
              </p>
              <p className="text-arco-xs text-ink-3 mb-3">
                请先在「可加工为」主链中点击一个节点作为起点，再切换关系类型查看其网络。
              </p>
              <button
                onClick={resetView}
                className="px-4 py-2 bg-arco-primary text-white rounded-arco-sm text-arco-sm hover:bg-arco-primary-hover transition-colors"
              >
                查看主链
              </button>
            </div>
          </div>
        )}

        {/* 初始引导（主链可见但未选中节点时） */}
        {relationType === MAIN_CHAIN_RELATION && !selectedNodeId && !isEmpty && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="bg-white/90 border border-line-1 rounded-arco-md shadow-arco-1 px-4 py-2 text-arco-xs text-ink-2">
              点击任意节点查看详情并展开其邻居 · 顶部切换关系类型可看到完全不同的网络
            </div>
          </div>
        )}

        {/* 图例 */}
        <div className="absolute bottom-4 left-4 z-20 bg-white border border-line-1 rounded-arco-md px-3 py-2.5 shadow-arco-1">
          <div className="text-arco-xs text-ink-3 mb-1.5">节点类型</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 max-w-[360px]">
            {(Object.keys(NODE_TYPE_LABELS) as NodeType[]).map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: NODE_TYPE_COLORS[t] }}
                />
                <span className="text-arco-xs text-ink-2">
                  {NODE_TYPE_LABELS[t]}
                </span>
              </div>
            ))}
          </div>
          <div className="text-arco-xs text-ink-3 mt-2 mb-1.5">连接可信度</div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span
                className="w-6 h-0.5"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(to right, #FF7D00 0, #FF7D00 5px, transparent 5px, transparent 9px)',
                }}
              />
              <span className="text-arco-xs text-ink-2">待验证 (proposed)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-0.5 bg-ink-1" />
              <span className="text-arco-xs text-ink-2">已验证 (verified)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧：节点详情面板 */}
      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          edges={selectedNodeEdges}
          onClose={clearSelection}
          onEdgeNavigate={handleEdgeNavigate}
          getNode={(id) => provider.getNodeById(id)}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 节点详情面板                                                                 */
/* -------------------------------------------------------------------------- */

interface NodeDetailPanelProps {
  node: GraphNode;
  edges: GraphEdge[];
  onClose: () => void;
  onEdgeNavigate: (edge: GraphEdge) => void;
  getNode: (id: string) => GraphNode | undefined;
}

function NodeDetailPanel({
  node,
  edges,
  onClose,
  onEdgeNavigate,
  getNode,
}: NodeDetailPanelProps) {
  const typeColor = NODE_TYPE_COLORS[node.node_type];
  const hasAliases = node.aliases && node.aliases.length > 0;
  const hasSources = node.sources && node.sources.length > 0;
  const [challengingEdge, setChallengingEdge] = useState<GraphEdge | null>(null);

  return (
    <aside className="w-[360px] h-full bg-white border-l border-line-1 flex flex-col flex-shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line-1">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-arco-sm text-arco-xs text-white"
          style={{ backgroundColor: typeColor }}
        >
          {NODE_TYPE_LABELS[node.node_type]}
        </span>
        <button
          onClick={onClose}
          className="text-ink-3 hover:text-ink-1 transition-colors"
          aria-label="关闭"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-arco-xl font-semibold text-ink-1 mb-1">
          {node.name}
        </h2>
        {node.stage === 'draft' && (
          <span className="inline-block px-1.5 py-0.5 text-[10px] bg-surface-3 text-ink-3 rounded-arco-sm mb-3">
            录入中 (draft)
          </span>
        )}

        <section className="mt-3">
          <div className="text-arco-sm font-medium text-ink-1 mb-1.5">定义</div>
          <p className="text-arco-sm text-ink-2 leading-relaxed">
            {node.definition}
          </p>
        </section>

        {hasAliases && (
          <section className="mt-4 pt-4 border-t border-line-1">
            <div className="text-arco-sm font-medium text-ink-1 mb-2">别名</div>
            <div className="flex flex-wrap gap-1.5">
              {node.aliases!.map((alias, i) => (
                <div key={i} className="flex flex-col">
                  <span className="px-2 py-1 bg-surface-2 rounded-arco-sm text-ink-2 text-arco-xs">
                    {alias.term}
                  </span>
                  {alias.context && (
                    <span className="text-[10px] text-ink-3 mt-0.5">
                      {alias.context}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {hasSources && (
          <section className="mt-4 pt-4 border-t border-line-1">
            <div className="text-arco-sm font-medium text-ink-1 mb-2">
              来源 ({node.sources!.length})
            </div>
            <div className="space-y-2">
              {node.sources!.map((src, i) => (
                <div key={i} className="p-2.5 bg-surface-2 rounded-arco-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1.5 py-0.5 text-[10px] bg-surface-3 text-ink-2 rounded-arco-sm">
                      {SOURCE_TYPE_LABELS[src.source_type] || src.source_type}
                    </span>
                  </div>
                  <p className="text-arco-xs text-ink-2">{src.description}</p>
                  {src.url && (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-arco-xs text-arco-primary mt-1 hover:underline inline-block"
                    >
                      查看来源 →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-4 pt-4 border-t border-line-1">
          <div className="text-arco-sm font-medium text-ink-1 mb-2">
            关联连接 ({edges.length})
          </div>
          {edges.length === 0 ? (
            <p className="text-arco-xs text-ink-3">暂无关联连接</p>
          ) : (
            <div className="space-y-2">
              {edges.map((edge) => {
                const outgoing = edge.source === node.id;
                const otherId = outgoing ? edge.target : edge.source;
                const other = getNode(otherId);
                const dotColor = VERIFICATION_DOT[edge.verification_status];
                const reasoning = edge.proposed_by?.reasoning ?? edge.note ?? '';
                const canChallenge = edge.verification_status !== 'deprecated';
                return (
                  <div
                    key={edge.id}
                    className="w-full p-2.5 rounded-arco-sm hover:bg-surface-2 transition-colors text-left border border-line-1 relative group"
                  >
                    <button
                      onClick={() => onEdgeNavigate(edge)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center gap-2 mb-1.5 pr-6">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: dotColor }}
                          title={VERIFICATION_LABEL[edge.verification_status]}
                        />
                        <span className="text-arco-xs text-ink-4 flex-shrink-0">
                          {outgoing ? '→' : '←'}
                        </span>
                        <span className="text-arco-sm text-ink-1 truncate flex-1 font-medium">
                          {other?.name ?? otherId}
                        </span>
                        <span
                          className="px-1.5 py-0.5 text-[10px] rounded-arco-sm flex-shrink-0"
                          style={{
                            backgroundColor: `${RELATION_TYPE_COLORS[edge.relation_type]}1A`,
                            color: RELATION_TYPE_COLORS[edge.relation_type],
                          }}
                        >
                          {RELATION_TYPE_LABELS[edge.relation_type]}
                        </span>
                      </div>
                      {/* 证据链：核心理念"判断信息真假最终权力在人"在交互层的兑现 */}
                      {reasoning && (
                        <div className="text-arco-xs text-ink-3 leading-relaxed pl-4 border-l-2 border-line-2 mt-1">
                          <span className="text-ink-4">依据：</span>
                          {reasoning}
                        </div>
                      )}
                      {edge.reviewed_by && (
                        <div className="text-[10px] text-ink-3 mt-1 pl-4">
                          审核人：{edge.reviewed_by} · {edge.reviewed_at?.slice(0, 10)}
                        </div>
                      )}
                    </button>
                    {/* 质疑按钮：右上角悬浮，仅非 deprecated 边可质疑 */}
                    {canChallenge && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setChallengingEdge(edge);
                        }}
                        className="absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[10px] text-arco-danger border border-arco-danger/40 rounded-arco-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                        title="质疑此边（任何用户可发起）"
                      >
                        ⚑ 质疑
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 状态机审核面板：可手动触发 6 档状态转换 */}
        <section className="mt-4 pt-4 border-t border-line-1">
          <div className="text-arco-sm font-medium text-ink-1 mb-2 flex items-center gap-2">
            <span>状态机审核</span>
            <span className="text-[10px] text-ink-3 font-normal">
              （v0.4 · 6 档可信度 · 操作留痕）
            </span>
          </div>
          <EdgeReviewerList />
        </section>
      </div>

      {/* 质疑者表单（modal） */}
      {challengingEdge && (
        <EdgeChallenger
          edge={challengingEdge}
          onClose={() => setChallengingEdge(null)}
        />
      )}
    </aside>
  );
}
