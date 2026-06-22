import type { GraphNode, NodeWithNeighbors, NeighborNode } from '../lib/types';
import { RELATION_LABELS } from '../lib/cytoscape-config';

interface NodeDetailProps {
  node: GraphNode | null;
  neighbors: NodeWithNeighbors | null;
  loading?: boolean;
  onClose: () => void;
  onNodeJump: (id: string) => void;
}

const NODE_TYPE_LABELS: Record<string, string> = {
  material: '材料',
  process: '工艺',
  equipment: '设备',
  product: '产品',
  industry: '行业',
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  patent: '专利',
  standard: '行业标准',
  industry_report: '行业报告',
  news: '新闻报道',
  expert_interview: '专家访谈',
  official_data: '官方数据',
  other: '其他',
};

function getCoordColor(coordinateSystems: string[]): string {
  const hasA = coordinateSystems.includes('A');
  const hasB = coordinateSystems.includes('B');
  if (hasA && hasB) return 'bg-coord-ab';
  if (hasA) return 'bg-coord-a';
  return 'bg-coord-b';
}

function getCoordLabel(coordinateSystems: string[]): string {
  const hasA = coordinateSystems.includes('A');
  const hasB = coordinateSystems.includes('B');
  if (hasA && hasB) return 'A/B 交汇';
  if (hasA) return '坐标系 A';
  return '坐标系 B';
}

function getVerificationBadge(status: string): string {
  return status === 'verified' 
    ? 'bg-success/10 text-success border-success/20' 
    : 'bg-warning/10 text-warning border-warning/20';
}

function getVerificationText(status: string): string {
  return status === 'verified' ? '已验证' : '待验证';
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
        <div className="h-3 w-full bg-line-2 rounded" />
        <div className="h-3 w-3/4 bg-line-2 rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-20 bg-line-2 rounded" />
        <div className="flex gap-2">
          <div className="h-8 w-1/3 bg-line-2 rounded" />
          <div className="h-8 w-1/3 bg-line-2 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-20 bg-line-2 rounded" />
        <div className="h-8 bg-line-2 rounded" />
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
      <p className="text-ink-3 text-sm">点击图谱中的节点</p>
      <p className="text-ink-4 text-xs mt-1">查看详细信息</p>
    </div>
  );
}

function NeighborItem({ neighbor, onJump }: { neighbor: NeighborNode; onJump: (id: string) => void }) {
  return (
    <div 
      className="flex items-center justify-between p-3 bg-surface-2 hover:bg-surface-3 rounded-arco-sm cursor-pointer transition-colors"
      onClick={() => onJump(neighbor.node.id)}
    >
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${getCoordColor(neighbor.node.coordinate_systems)}`} />
        <div>
          <div className="text-ink-1 text-sm font-medium">{neighbor.node.name}</div>
          <div className="text-ink-4 text-xs">{NODE_TYPE_LABELS[neighbor.node.node_type]}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-ink-3 text-xs">{RELATION_LABELS[neighbor.edge.relation_type]}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${getVerificationBadge(neighbor.edge.verification_status)}`}>
          {getVerificationText(neighbor.edge.verification_status)}
        </span>
      </div>
    </div>
  );
}

function AttributeSection({ attributes }: { attributes: GraphNode['attributes'] }) {
  if (!attributes) return null;
  
  const sections: { title: string; data: Record<string, string> | undefined }[] = [
    { title: '物理属性', data: attributes.physical },
    { title: '化学属性', data: attributes.chemical },
    { title: '工艺能力', data: attributes.process_capability },
  ];

  return (
    <div className="pt-4 border-t border-line-1">
      <div className="text-ink-1 text-sm font-medium mb-3">属性</div>
      <div className="space-y-3">
        {sections.map(({ title, data }) => {
          if (!data || Object.keys(data).length === 0) return null;
          return (
            <div key={title}>
              <div className="text-ink-3 text-xs mb-2">{title}</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(data).map(([key, value]) => (
                  <div key={key} className="bg-surface-2 rounded-arco-sm px-3 py-2">
                    <div className="text-ink-3 text-xs">{key}</div>
                    <div className="text-ink-1 text-sm">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {attributes.cost_tier && (
          <div>
            <div className="text-ink-3 text-xs mb-2">成本区间</div>
            <div className="inline-flex items-center px-3 py-1.5 bg-surface-2 rounded-arco-sm">
              <span className="text-ink-1 text-sm">{attributes.cost_tier}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NodeDetail({ node, neighbors, loading, onClose, onNodeJump }: NodeDetailProps) {
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

  const isIntersection = node.coordinate_systems.includes('A') && node.coordinate_systems.includes('B');

  return (
    <div className="w-[400px] h-full bg-surface-1 shadow-arco-3 rounded-l-arco-lg overflow-hidden flex flex-col">
      <div className={`h-1 ${getCoordColor(node.coordinate_systems)}`} />
      
      {isIntersection && (
        <div className="bg-warning/5 border-y border-warning/20 px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            <span className="text-warning text-sm font-medium">坐标系交汇点</span>
          </div>
          <p className="text-warning/70 text-xs mt-1">此节点同时存在于产业链网和材料延伸网</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-arco-xl font-semibold text-ink-1">{node.name}</h2>
              <div className="flex gap-2 mt-2">
                <span className="inline-flex items-center px-2 py-0.5 bg-surface-2 rounded-arco-sm text-ink-2 text-xs">
                  {NODE_TYPE_LABELS[node.node_type]}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-arco-sm text-xs ${getCoordColor(node.coordinate_systems)} text-white`}>
                  {getCoordLabel(node.coordinate_systems)}
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

          {node.description && (
            <div className="pt-4 border-t border-line-1">
              <div className="text-ink-1 text-sm font-medium mb-2">描述</div>
              <p className="text-ink-2 text-sm leading-relaxed">{node.description}</p>
            </div>
          )}

          {node.aliases && node.aliases.length > 0 && (
            <div className="pt-4 border-t border-line-1">
              <div className="text-ink-1 text-sm font-medium mb-3">别名</div>
              <div className="space-y-2">
                {node.aliases.map((alias, index) => (
                  <div key={index} className="bg-surface-2 rounded-arco-sm px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-1 text-sm">{alias.term}</span>
                      {alias.context && (
                        <span className="text-ink-4 text-xs">{alias.context}</span>
                      )}
                    </div>
                    {alias.note && (
                      <p className="text-warning text-xs mt-1">{alias.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <AttributeSection attributes={node.attributes} />

          {neighbors && (
            <>
              {neighbors.upstream.length > 0 && (
                <div className="pt-4 border-t border-line-1">
                  <div className="text-ink-1 text-sm font-medium mb-3">上游</div>
                  <div className="space-y-1">
                    {neighbors.upstream.map((neighbor) => (
                      <NeighborItem key={neighbor.node.id} neighbor={neighbor} onJump={onNodeJump} />
                    ))}
                  </div>
                </div>
              )}

              {neighbors.downstream.length > 0 && (
                <div className="pt-4 border-t border-line-1">
                  <div className="text-ink-1 text-sm font-medium mb-3">下游</div>
                  <div className="space-y-1">
                    {neighbors.downstream.map((neighbor) => (
                      <NeighborItem key={neighbor.node.id} neighbor={neighbor} onJump={onNodeJump} />
                    ))}
                  </div>
                </div>
              )}

              {neighbors.related.length > 0 && (
                <div className="pt-4 border-t border-line-1">
                  <div className="text-ink-1 text-sm font-medium mb-3">相关</div>
                  <div className="space-y-1">
                    {neighbors.related.map((neighbor) => (
                      <NeighborItem key={neighbor.node.id} neighbor={neighbor} onJump={onNodeJump} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {node.sources && node.sources.length > 0 && (
            <div className="pt-4 border-t border-line-1">
              <div className="text-ink-1 text-sm font-medium mb-3">来源</div>
              <div className="space-y-2">
                {node.sources.map((source, index) => (
                  <div key={index} className="bg-surface-2 rounded-arco-sm px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-ink-3 text-xs">{SOURCE_TYPE_LABELS[source.source_type]}</span>
                    </div>
                    <p className="text-ink-2 text-sm mt-1">{source.description}</p>
                    {source.url && (
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-arco-primary text-xs mt-1 block hover:underline">
                        {source.url}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}