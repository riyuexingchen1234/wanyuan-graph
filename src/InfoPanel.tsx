import { useGraphStore } from './store';

export function InfoPanel() {
  const data = useGraphStore(state => state.data);
  const selectedNodeId = useGraphStore(state => state.selectedNodeId);
  const selectNode = useGraphStore(state => state.selectNode);
  
  if (!data || !selectedNodeId) return null;
  
  const selectedNode = data.nodes.find(n => n.id === selectedNodeId);
  if (!selectedNode) return null;
  
  // 获取相关节点
  const relationships = data.relationships.filter(
    rel => rel.sourceId === selectedNodeId || rel.targetId === selectedNodeId
  );
  
  const upstreamNodes = relationships
    .filter(rel => rel.targetId === selectedNodeId)
    .map(rel => data.nodes.find(n => n.id === rel.sourceId))
    .filter(Boolean);
  
  const downstreamNodes = relationships
    .filter(rel => rel.sourceId === selectedNodeId)
    .map(rel => data.nodes.find(n => n.id === rel.targetId))
    .filter(Boolean);
  
  // 获取所属产业链
  const chains = data.chains.filter(chain => chain.nodeIds.includes(selectedNodeId));
  
  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '320px',
        background: 'rgba(0, 0, 0, 0.85)',
        color: 'white',
        padding: '20px',
        borderRadius: '8px',
        fontSize: '14px',
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto'
      }}
    >
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>{selectedNode.name}</h2>
        <div style={{ color: '#999', fontSize: '12px', marginBottom: '8px' }}>
          类型: {getNodeTypeName(selectedNode.type)}
        </div>
        <p style={{ margin: '0', lineHeight: '1.5' }}>{selectedNode.description}</p>
      </div>
      
      {upstreamNodes.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#4a90e2' }}>
            上游供应 ({upstreamNodes.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {upstreamNodes.map(node => node && (
              <div
                key={node.id}
                onClick={() => selectNode(node.id)}
                style={{
                  padding: '6px 8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              >
                {node.name}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {downstreamNodes.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#50c878' }}>
            下游需求 ({downstreamNodes.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {downstreamNodes.map(node => node && (
              <div
                key={node.id}
                onClick={() => selectNode(node.id)}
                style={{
                  padding: '6px 8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              >
                {node.name}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {chains.length > 0 && (
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#ffa500' }}>
            所属产业链 ({chains.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {chains.map(chain => (
              <div
                key={chain.id}
                style={{
                  padding: '6px 8px',
                  background: 'rgba(255, 165, 0, 0.1)',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{chain.name}</div>
                <div style={{ color: '#999', fontSize: '12px', marginTop: '2px' }}>
                  {chain.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <button
        onClick={() => selectNode(null)}
        style={{
          marginTop: '16px',
          width: '100%',
          padding: '8px',
          background: 'rgba(255, 255, 255, 0.1)',
          border: 'none',
          borderRadius: '4px',
          color: 'white',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        返回全局视图
      </button>
    </div>
  );
}

function getNodeTypeName(type: string): string {
  const typeMap: Record<string, string> = {
    material: '材料',
    process: '加工',
    product: '产品',
    demand: '需求',
    entity: '实体'
  };
  return typeMap[type] || type;
}
