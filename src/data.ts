import { GraphData } from './types';

export const sampleData: GraphData = {
  nodes: [
    { id: 'h1', name: 'H1', type: 'process', description: '一级枢纽，5条主链交汇', credibility: 'verified', sources: ['测试数据'] },
    
    { id: 'h2', name: 'H2', type: 'process', description: '二级枢纽北，3条链交汇', credibility: 'verified', sources: ['测试数据'] },
    { id: 'h3', name: 'H3', type: 'process', description: '二级枢纽南，3条链交汇', credibility: 'verified', sources: ['测试数据'] },
    
    { id: 'a1', name: 'a1', type: 'material', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'a2', name: 'a2', type: 'material', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'a3', name: 'a3', type: 'material', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'a4', name: 'a4', type: 'material', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'a5', name: 'a5', type: 'material', description: '', credibility: 'verified', sources: ['测试数据'] },
    
    { id: 'b1', name: 'b1', type: 'process', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'b2', name: 'b2', type: 'process', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'b3', name: 'b3', type: 'process', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'b4', name: 'b4', type: 'process', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'b5', name: 'b5', type: 'process', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'b6', name: 'b6', type: 'process', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'b7', name: 'b7', type: 'process', description: '', credibility: 'verified', sources: ['测试数据'] },
    
    { id: 'c1', name: 'c1', type: 'entity', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'c2', name: 'c2', type: 'entity', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'c3', name: 'c3', type: 'entity', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'c4', name: 'c4', type: 'entity', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'c5', name: 'c5', type: 'entity', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'c6', name: 'c6', type: 'entity', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'c7', name: 'c7', type: 'entity', description: '', credibility: 'verified', sources: ['测试数据'] },
    
    { id: 'd1', name: 'd1', type: 'demand', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'd2', name: 'd2', type: 'demand', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'd3', name: 'd3', type: 'demand', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'd4', name: 'd4', type: 'demand', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'd5', name: 'd5', type: 'demand', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'd6', name: 'd6', type: 'demand', description: '', credibility: 'verified', sources: ['测试数据'] },
    { id: 'd7', name: 'd7', type: 'demand', description: '', credibility: 'verified', sources: ['测试数据'] },
  ],

  relationships: [
    { id: 'l1-1', sourceId: 'a1', targetId: 'h1', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-1' },
    { id: 'l1-2', sourceId: 'h1', targetId: 'h2', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-1' },
    { id: 'l1-3', sourceId: 'h2', targetId: 'b1', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-1' },
    { id: 'l1-4', sourceId: 'b1', targetId: 'c1', type: 'supply', strength: 0.8, description: '', credibility: 'verified', chainId: 'chain-1' },
    { id: 'l1-5', sourceId: 'c1', targetId: 'd1', type: 'demand', strength: 0.7, description: '', credibility: 'verified', chainId: 'chain-1' },

    { id: 'l2-1', sourceId: 'a2', targetId: 'h1', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-2' },
    { id: 'l2-2', sourceId: 'h1', targetId: 'b2', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-2' },
    { id: 'l2-3', sourceId: 'b2', targetId: 'c2', type: 'supply', strength: 0.8, description: '', credibility: 'verified', chainId: 'chain-2' },
    { id: 'l2-4', sourceId: 'c2', targetId: 'd2', type: 'demand', strength: 0.7, description: '', credibility: 'verified', chainId: 'chain-2' },

    { id: 'l3-1', sourceId: 'a3', targetId: 'h1', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-3' },
    { id: 'l3-2', sourceId: 'h1', targetId: 'h3', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-3' },
    { id: 'l3-3', sourceId: 'h3', targetId: 'b3', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-3' },
    { id: 'l3-4', sourceId: 'b3', targetId: 'c3', type: 'supply', strength: 0.8, description: '', credibility: 'verified', chainId: 'chain-3' },
    { id: 'l3-5', sourceId: 'c3', targetId: 'd3', type: 'demand', strength: 0.7, description: '', credibility: 'verified', chainId: 'chain-3' },

    { id: 'l4-1', sourceId: 'a4', targetId: 'h1', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-4' },
    { id: 'l4-2', sourceId: 'h1', targetId: 'b4', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-4' },
    { id: 'l4-3', sourceId: 'b4', targetId: 'c4', type: 'supply', strength: 0.8, description: '', credibility: 'verified', chainId: 'chain-4' },
    { id: 'l4-4', sourceId: 'c4', targetId: 'd4', type: 'demand', strength: 0.7, description: '', credibility: 'verified', chainId: 'chain-4' },

    { id: 'l5-1', sourceId: 'a5', targetId: 'h1', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-5' },
    { id: 'l5-2', sourceId: 'h1', targetId: 'b5', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-5' },
    { id: 'l5-3', sourceId: 'b5', targetId: 'c5', type: 'supply', strength: 0.8, description: '', credibility: 'verified', chainId: 'chain-5' },
    { id: 'l5-4', sourceId: 'c5', targetId: 'd5', type: 'demand', strength: 0.7, description: '', credibility: 'verified', chainId: 'chain-5' },

    { id: 'l6-1', sourceId: 'h2', targetId: 'b6', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-6' },
    { id: 'l6-2', sourceId: 'b6', targetId: 'c6', type: 'supply', strength: 0.8, description: '', credibility: 'verified', chainId: 'chain-6' },
    { id: 'l6-3', sourceId: 'c6', targetId: 'd6', type: 'demand', strength: 0.7, description: '', credibility: 'verified', chainId: 'chain-6' },

    { id: 'l7-1', sourceId: 'h3', targetId: 'b7', type: 'supply', strength: 0.9, description: '', credibility: 'verified', chainId: 'chain-7' },
    { id: 'l7-2', sourceId: 'b7', targetId: 'c7', type: 'supply', strength: 0.8, description: '', credibility: 'verified', chainId: 'chain-7' },
    { id: 'l7-3', sourceId: 'c7', targetId: 'd7', type: 'demand', strength: 0.7, description: '', credibility: 'verified', chainId: 'chain-7' },
  ],

  chains: [
    {
      id: 'chain-1',
      name: '链1',
      description: 'a1 - H1 - H2 - b1 - c1 - d1',
      nodeIds: ['a1', 'h1', 'h2', 'b1', 'c1', 'd1'],
      demandType: 'd1'
    },
    {
      id: 'chain-2',
      name: '链2',
      description: 'a2 - H1 - b2 - c2 - d2',
      nodeIds: ['a2', 'h1', 'b2', 'c2', 'd2'],
      demandType: 'd2'
    },
    {
      id: 'chain-3',
      name: '链3',
      description: 'a3 - H1 - H3 - b3 - c3 - d3',
      nodeIds: ['a3', 'h1', 'h3', 'b3', 'c3', 'd3'],
      demandType: 'd3'
    },
    {
      id: 'chain-4',
      name: '链4',
      description: 'a4 - H1 - b4 - c4 - d4',
      nodeIds: ['a4', 'h1', 'b4', 'c4', 'd4'],
      demandType: 'd4'
    },
    {
      id: 'chain-5',
      name: '链5',
      description: 'a5 - H1 - b5 - c5 - d5',
      nodeIds: ['a5', 'h1', 'b5', 'c5', 'd5'],
      demandType: 'd5'
    },
    {
      id: 'chain-6',
      name: '链6',
      description: 'H2 - b6 - c6 - d6',
      nodeIds: ['h2', 'b6', 'c6', 'd6'],
      demandType: 'd6'
    },
    {
      id: 'chain-7',
      name: '链7',
      description: 'H3 - b7 - c7 - d7',
      nodeIds: ['h3', 'b7', 'c7', 'd7'],
      demandType: 'd7'
    },
  ]
};
