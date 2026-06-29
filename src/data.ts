import { GraphData } from './types';

export const sampleData: GraphData = {
  nodes: [
    { id: 'a1', name: 'a1', type: 'material', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'a2', name: 'a2', type: 'material', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'a3', name: 'a3', type: 'material', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'a4', name: 'a4', type: 'material', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'a5', name: 'a5', type: 'material', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'a6', name: 'a6', type: 'material', description: '', credibility: 'verified', sources: ['测试数据'] },
    
    { id: 'hub', name: 'HUB', type: 'process', description: '中心枢纽，6条链交汇', credibility: 'verified', sources: ['测试数据'] },
    
    { id: 'b1', name: 'b1', type: 'process', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'b2', name: 'b2', type: 'process', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'b3', name: 'b3', type: 'process', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'b4', name: 'b4', type: 'process', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'b5', name: 'b5', type: 'process', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'b6', name: 'b6', type: 'process', description: '', credibility: 'verified', sources: ['测试数据'] },
    
    { id: 'c1', name: 'c1', type: 'entity', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'c2', name: 'c2', type: 'entity', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'c3', name: 'c3', type: 'entity', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'c4', name: 'c4', type: 'entity', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'c5', name: 'c5', type: 'entity', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'c6', name: 'c6', type: 'entity', description: '', credibility: 'verified', sources: ['测试数据'] },
    
    { id: 'd1', name: 'd1', type: 'entity', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'd2', name: 'd2', type: 'entity', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'd3', name: 'd3', type: 'entity', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'd4', name: 'd4', type: 'entity', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'd5', name: 'd5', type: 'entity', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'd6', name: 'd6', type: 'entity', description: '', credibility: 'verified', sources: ['测试数据'] },
    
    { id: 'e1', name: 'e1', type: 'demand', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'e2', name: 'e2', type: 'demand', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'e3', name: 'e3', type: 'demand', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'e4', name: 'e4', type: 'demand', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'e5', name: 'e5', type: 'demand', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'e6', name: 'e6', type: 'demand', description: '', credibility: 'verified', sources: ['测试数据'] },
  ],

  relationships: [
    { id: 'r1-1', sourceId: 'a1', targetId: 'hub', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-1' },
    { id: 'r1-2', sourceId: 'hub', targetId: 'b1', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-1' },
    { id: 'r1-3', sourceId: 'b1', targetId: 'c1', type: 'supply', strength: 0.8, description: '', credibility: 'verified', chainId: 'chain-1' },
    { id: 'r1-4', sourceId: 'c1', targetId: 'd1', type: 'supply', strength: 0.8, description: '', credibility: 'verified', chainId: 'chain-1' },
    { id: 'r1-5', sourceId: 'd1', targetId: 'e1', type: 'demand', strength: 0.7, description: '', credibility: 'verified', chainId: 'chain-1' },

    { id: 'r2-1', sourceId: 'a2', targetId: 'hub', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-2' },
    { id: 'r2-2', sourceId: 'hub', targetId: 'b2', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-2' },
    { id: 'r2-3', sourceId: 'b2', targetId: 'c2', type: 'supply', strength: 0.8, description: '', credibility: 'verified', chainId: 'chain-2' },
    { id: 'r2-4', sourceId: 'c2', targetId: 'd2', type: 'supply', strength: 0.8, description: '', credibility: 'verified', chainId: 'chain-2' },
    { id: 'r2-5', sourceId: 'd2', targetId: 'e2', type: 'demand', strength: 0.7, description: '', credibility: 'verified', chainId: 'chain-2' },

    { id: 'r3-1', sourceId: 'a3', targetId: 'hub', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-3' },
    { id: 'r3-2', sourceId: 'hub', targetId: 'b3', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-3' },
    { id: 'r3-3', sourceId: 'b3', targetId: 'c3', type: 'supply', strength: 0.8, description: '', credibility: 'verified', chainId: 'chain-3' },
    { id: 'r3-4', sourceId: 'c3', targetId: 'd3', type: 'supply', strength: 0.8, description: '', credibility: 'verified', chainId: 'chain-3' },
    { id: 'r3-5', sourceId: 'd3', targetId: 'e3', type: 'demand', strength: 0.7, description: '', credibility: 'verified', chainId: 'chain-3' },

    { id: 'r4-1', sourceId: 'a4', targetId: 'hub', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-4' },
    { id: 'r4-2', sourceId: 'hub', targetId: 'b4', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-4' },
    { id: 'r4-3', sourceId: 'b4', targetId: 'c4', type: 'supply', strength: 0.8, description: '', credibility: 'verified', chainId: 'chain-4' },
    { id: 'r4-4', sourceId: 'c4', targetId: 'd4', type: 'supply', strength: 0.8, description: '', credibility: 'verified', chainId: 'chain-4' },
    { id: 'r4-5', sourceId: 'd4', targetId: 'e4', type: 'demand', strength: 0.7, description: '', credibility: 'verified', chainId: 'chain-4' },

    { id: 'r5-1', sourceId: 'a5', targetId: 'hub', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-5' },
    { id: 'r5-2', sourceId: 'hub', targetId: 'b5', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-5' },
    { id: 'r5-3', sourceId: 'b5', targetId: 'c5', type: 'supply', strength: 0.8, description: '', credibility: 'verified', chainId: 'chain-5' },
    { id: 'r5-4', sourceId: 'c5', targetId: 'd5', type: 'supply', strength: 0.8, description: '', credibility: 'verified', chainId: 'chain-5' },
    { id: 'r5-5', sourceId: 'd5', targetId: 'e5', type: 'demand', strength: 0.7, description: '', credibility: 'verified', chainId: 'chain-5' },

    { id: 'r6-1', sourceId: 'a6', targetId: 'hub', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-6' },
    { id: 'r6-2', sourceId: 'hub', targetId: 'b6', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-6' },
    { id: 'r6-3', sourceId: 'b6', targetId: 'c6', type: 'supply', strength: 0.8, description: '', credibility: 'verified', chainId: 'chain-6' },
    { id: 'r6-4', sourceId: 'c6', targetId: 'd6', type: 'supply', strength: 0.8, description: '', credibility: 'verified', chainId: 'chain-6' },
    { id: 'r6-5', sourceId: 'd6', targetId: 'e6', type: 'demand', strength: 0.7, description: '', credibility: 'verified', chainId: 'chain-6' },
  ],

  chains: [
    {
      id: 'chain-1',
      name: '链1',
      description: 'a1 - HUB - b1 - c1 - d1 - e1',
      nodeIds: ['a1', 'hub', 'b1', 'c1', 'd1', 'e1'],
      demandType: 'e1'
    },
    {
      id: 'chain-2',
      name: '链2',
      description: 'a2 - HUB - b2 - c2 - d2 - e2',
      nodeIds: ['a2', 'hub', 'b2', 'c2', 'd2', 'e2'],
      demandType: 'e2'
    },
    {
      id: 'chain-3',
      name: '链3',
      description: 'a3 - HUB - b3 - c3 - d3 - e3',
      nodeIds: ['a3', 'hub', 'b3', 'c3', 'd3', 'e3'],
      demandType: 'e3'
    },
    {
      id: 'chain-4',
      name: '链4',
      description: 'a4 - HUB - b4 - c4 - d4 - e4',
      nodeIds: ['a4', 'hub', 'b4', 'c4', 'd4', 'e4'],
      demandType: 'e4'
    },
    {
      id: 'chain-5',
      name: '链5',
      description: 'a5 - HUB - b5 - c5 - d5 - e5',
      nodeIds: ['a5', 'hub', 'b5', 'c5', 'd5', 'e5'],
      demandType: 'e5'
    },
    {
      id: 'chain-6',
      name: '链6',
      description: 'a6 - HUB - b6 - c6 - d6 - e6',
      nodeIds: ['a6', 'hub', 'b6', 'c6', 'd6', 'e6'],
      demandType: 'e6'
    },
  ]
};
