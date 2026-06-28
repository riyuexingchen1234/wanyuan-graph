import { Node, Relationship, Chain, NodePosition } from './types';

/**
 * 方向性层次布局算法
 * 
 * 布局规则：
 * - 焦点节点在中心 (0, 0, 0)
 * - 主链路节点在Z=0平面，水平展开（上游在左，下游在右）
 * - 跨链路节点在Z<0的后方，按"在该链路中的上下游"分布在"上后"和"下后"
 *   - 在那些链路中是上游: (x, +y, -z)  // 右、上、后
 *   - 在那些链路中是下游: (x, -y, -z)   // 右、下、后
 */

const SPACING = {
  main: 6,      // 主链路节点间距
  cross: 5,     // 跨链路节点间距
  depth: 8,     // Z轴深度（后方距离）
  vertical: 4   // Y轴垂直间距
};

export function calculateLayout(
  focusNodeId: string,
  nodes: Node[],
  relationships: Relationship[],
  chains: Chain[]
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  
  // 焦点节点在中心
  positions.set(focusNodeId, { x: 0, y: 0, z: 0 });
  
  // 找出焦点节点所在的主产业链
  const mainChains = chains.filter(chain => chain.nodeIds.includes(focusNodeId));
  const mainChainNodeIds = new Set(mainChains.flatMap(chain => chain.nodeIds));
  
  // 找出直接上游和下游（在主链路上）
  const directUpstream: string[] = [];
  const directDownstream: string[] = [];
  
  relationships.forEach(rel => {
    if (rel.targetId === focusNodeId && mainChainNodeIds.has(rel.sourceId)) {
      directUpstream.push(rel.sourceId);
    }
    if (rel.sourceId === focusNodeId && mainChainNodeIds.has(rel.targetId)) {
      directDownstream.push(rel.targetId);
    }
  });
  
  // 布局直接上游（左侧，Z=0）
  directUpstream.forEach((nodeId, index) => {
    const x = -SPACING.main * (index + 1);
    positions.set(nodeId, { x, y: 0, z: 0 });
  });
  
  // 布局直接下游（右侧，Z=0）
  directDownstream.forEach((nodeId, index) => {
    const x = SPACING.main * (index + 1);
    positions.set(nodeId, { x, y: 0, z: 0 });
  });
  
  // 找出跨链路连接
  const crossChainConnections: { 
    nodeId: string; 
    connectedToFocus: boolean;
    isUpstreamInOtherChain: boolean;
    chainId: string;
    distance: number;
  }[] = [];
  
  relationships.forEach(rel => {
    // 从焦点节点出发的跨链路连接
    if (rel.sourceId === focusNodeId && !mainChainNodeIds.has(rel.targetId)) {
      const isUpstream = isUpstreamInChain(rel.targetId, focusNodeId, chains);
      crossChainConnections.push({
        nodeId: rel.targetId,
        connectedToFocus: true,
        isUpstreamInOtherChain: isUpstream,
        chainId: rel.chainId || '',
        distance: 1
      });
    }
    // 指向焦点节点的跨链路连接
    if (rel.targetId === focusNodeId && !mainChainNodeIds.has(rel.sourceId)) {
      const isUpstream = isUpstreamInChain(rel.sourceId, focusNodeId, chains);
      crossChainConnections.push({
        nodeId: rel.sourceId,
        connectedToFocus: true,
        isUpstreamInOtherChain: isUpstream,
        chainId: rel.chainId || '',
        distance: 1
      });
    }
  });
  
  // 布局跨链路节点（在后方）
  const upstreamCross = crossChainConnections.filter(c => c.isUpstreamInOtherChain);
  const downstreamCross = crossChainConnections.filter(c => !c.isUpstreamInOtherChain);
  
  // 上游跨链路节点：右、上、后
  upstreamCross.forEach((conn, index) => {
    const x = SPACING.main * 0.5;
    const y = SPACING.vertical * (index + 1);
    const z = -SPACING.depth;
    positions.set(conn.nodeId, { x, y, z });
  });
  
  // 下游跨链路节点：右、下、后
  downstreamCross.forEach((conn, index) => {
    const x = SPACING.main * 0.5;
    const y = -SPACING.vertical * (index + 1);
    const z = -SPACING.depth;
    positions.set(conn.nodeId, { x, y, z });
  });
  
  // 为其他节点分配默认位置（更远处）
  nodes.forEach(node => {
    if (!positions.has(node.id)) {
      positions.set(node.id, {
        x: (Math.random() - 0.5) * 60,
        y: (Math.random() - 0.5) * 60,
        z: -30 - Math.random() * 20
      });
    }
  });
  
  return positions;
}

function isUpstreamInChain(nodeId: string, connectedToId: string, chains: Chain[]): boolean {
  for (const chain of chains) {
    const nodeIndex = chain.nodeIds.indexOf(nodeId);
    const connectedIndex = chain.nodeIds.indexOf(connectedToId);
    
    if (nodeIndex !== -1 && connectedIndex !== -1) {
      return nodeIndex < connectedIndex;
    }
  }
  return true; // 默认认为是上游
}

export function calculateGlobalLayout(
  nodes: Node[],
  chains: Chain[]
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  
  // 全局布局：每条产业链占据一个水平带，共享节点放在中间
  const sharedNodes = new Set<string>();
  const nodeChainCount = new Map<string, number>();
  
  // 统计每个节点出现在多少条产业链中
  chains.forEach(chain => {
    chain.nodeIds.forEach(nodeId => {
      nodeChainCount.set(nodeId, (nodeChainCount.get(nodeId) || 0) + 1);
    });
  });
  
  // 找出共享节点（出现在多条产业链中）
  nodeChainCount.forEach((count, nodeId) => {
    if (count > 1) {
      sharedNodes.add(nodeId);
    }
  });
  
  // 先布局共享节点（在中间）
  const sharedNodeArray = Array.from(sharedNodes);
  sharedNodeArray.forEach((nodeId, index) => {
    const x = (index - (sharedNodeArray.length - 1) / 2) * 8;
    positions.set(nodeId, { x, y: 0, z: 0 });
  });
  
  // 布局每条产业链的非共享节点
  chains.forEach((chain, chainIndex) => {
    const y = (chainIndex - (chains.length - 1) / 2) * 12;
    
    let nonSharedIndex = 0;
    chain.nodeIds.forEach(nodeId => {
      if (!sharedNodes.has(nodeId)) {
        const x = (nonSharedIndex - (chain.nodeIds.filter(id => !sharedNodes.has(id)).length - 1) / 2) * 6;
        positions.set(nodeId, { x, y, z: 0 });
        nonSharedIndex++;
      }
    });
  });
  
  // 为没有分配位置的节点随机分配
  nodes.forEach(node => {
    if (!positions.has(node.id)) {
      positions.set(node.id, {
        x: (Math.random() - 0.5) * 50,
        y: (Math.random() - 0.5) * 50,
        z: (Math.random() - 0.5) * 30
      });
    }
  });
  
  return positions;
}
