import { Node, Relationship, Chain, NodePosition } from './types';

/**
 * 方向性层次布局算法
 * 
 * 布局规则：
 * - 焦点节点在中心 (0, 0, 0)
 * - 上游节点在左侧 (-x, 0, 0)
 * - 下游节点在右侧 (+x, 0, 0)
 * - 跨链路节点按"在该链路中的上下游"分布在"上后"和"下后"
 *   - 在那些链路中是上游: (-x, +y, -z)  // 左、上、后
 *   - 在那些链路中是下游: (+x, -y, -z)   // 右、下、后
 */

const SPACING = {
  main: 8,      // 主链路节点间距
  cross: 6,     // 跨链路节点间距
  depth: 4,     // Z轴深度
  vertical: 5   // Y轴垂直间距
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
  
  // 找出直接上游和下游
  const directUpstream: string[] = [];
  const directDownstream: string[] = [];
  const crossChainNodes: { id: string; isUpstream: boolean; chainId: string }[] = [];
  
  relationships.forEach(rel => {
    if (rel.targetId === focusNodeId) {
      directUpstream.push(rel.sourceId);
    }
    if (rel.sourceId === focusNodeId) {
      directDownstream.push(rel.targetId);
    }
    
    // 检查跨链路连接
    if (rel.sourceId === focusNodeId && !mainChainNodeIds.has(rel.targetId)) {
      // 判断目标节点在其链路中是上游还是下游
      const isUpstream = isUpstreamInChain(rel.targetId, rel.sourceId, chains);
      crossChainNodes.push({ id: rel.targetId, isUpstream, chainId: rel.chainId || '' });
    }
    if (rel.targetId === focusNodeId && !mainChainNodeIds.has(rel.sourceId)) {
      const isUpstream = isUpstreamInChain(rel.sourceId, rel.targetId, chains);
      crossChainNodes.push({ id: rel.sourceId, isUpstream, chainId: rel.chainId || '' });
    }
  });
  
  // 布局直接上游（左侧）
  directUpstream.forEach((nodeId, index) => {
    const x = -SPACING.main * (index + 1);
    positions.set(nodeId, { x, y: 0, z: 0 });
  });
  
  // 布局直接下游（右侧）
  directDownstream.forEach((nodeId, index) => {
    const x = SPACING.main * (index + 1);
    positions.set(nodeId, { x, y: 0, z: 0 });
  });
  
  // 布局跨链路节点
  crossChainNodes.forEach((node, index) => {
    const baseX = node.isUpstream ? -SPACING.main : SPACING.main;
    const y = node.isUpstream ? SPACING.vertical : -SPACING.vertical;
    const z = -SPACING.depth;
    
    positions.set(node.id, {
      x: baseX + (index % 2) * SPACING.cross,
      y: y * (Math.floor(index / 2) + 1),
      z
    });
  });
  
  // 为其他节点分配默认位置（远处）
  nodes.forEach(node => {
    if (!positions.has(node.id)) {
      positions.set(node.id, {
        x: (Math.random() - 0.5) * 50,
        y: (Math.random() - 0.5) * 50,
        z: -20
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
  
  // 简单的全局布局：每条产业链占据一个水平带
  chains.forEach((chain, chainIndex) => {
    const y = (chainIndex - (chains.length - 1) / 2) * 15;
    
    chain.nodeIds.forEach((nodeId, nodeIndex) => {
      const x = (nodeIndex - (chain.nodeIds.length - 1) / 2) * 8;
      positions.set(nodeId, { x, y, z: 0 });
    });
  });
  
  // 为没有分配位置的节点随机分配
  nodes.forEach(node => {
    if (!positions.has(node.id)) {
      positions.set(node.id, {
        x: (Math.random() - 0.5) * 40,
        y: (Math.random() - 0.5) * 40,
        z: (Math.random() - 0.5) * 20
      });
    }
  });
  
  return positions;
}
