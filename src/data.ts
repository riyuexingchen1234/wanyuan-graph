import { GraphData } from './types';

export const sampleData: GraphData = {
  nodes: [
    { id: '1', name: '1', type: 'material', description: '节点1', credibility: 'verified', sources: ['测试数据'] },
    { id: '2', name: '2', type: 'process', description: '节点2', credibility: 'verified', sources: ['测试数据'] },
    { id: '3', name: '3', type: 'material', description: '节点3 - 链1和链2的共享节点', credibility: 'verified', sources: ['测试数据'] },
    { id: '4', name: '4', type: 'process', description: '节点4 - 链1和链3的共享节点', credibility: 'verified', sources: ['测试数据'] },
    { id: '5', name: '5', type: 'entity', description: '节点5', credibility: 'verified', sources: ['测试数据'] },
    { id: '6', name: '6', type: 'demand', description: '节点6', credibility: 'verified', sources: ['测试数据'] },

    { id: 'a', name: 'a', type: 'material', description: '节点a', credibility: 'verified', sources: ['测试数据'] },
    { id: 'b', name: 'b', type: 'process', description: '节点b', credibility: 'verified', sources: ['测试数据'] },
    { id: 'c', name: 'c', type: 'entity', description: '节点c', credibility: 'verified', sources: ['测试数据'] },
    { id: 'd', name: 'd', type: 'entity', description: '节点d', credibility: 'verified', sources: ['测试数据'] },
    { id: 'e', name: 'e', type: 'demand', description: '节点e', credibility: 'verified', sources: ['测试数据'] },

    { id: 'f', name: 'f', type: 'material', description: '节点f', credibility: 'verified', sources: ['测试数据'] },
    { id: 'g', name: 'g', type: 'process', description: '节点g', credibility: 'verified', sources: ['测试数据'] },
    { id: 'h', name: 'h', type: 'entity', description: '节点h', credibility: 'verified', sources: ['测试数据'] },
    { id: 'i', name: 'i', type: 'demand', description: '节点i', credibility: 'verified', sources: ['测试数据'] },

    { id: 'j', name: 'j', type: 'material', description: '节点j', credibility: 'verified', sources: ['测试数据'] },
    { id: 'k', name: 'k', type: 'process', description: '节点k', credibility: 'verified', sources: ['测试数据'] },
    { id: 'l', name: 'l', type: 'entity', description: '节点l', credibility: 'verified', sources: ['测试数据'] },
    { id: 'm', name: 'm', type: 'entity', description: '节点m', credibility: 'verified', sources: ['测试数据'] },
    { id: 'n', name: 'n', type: 'demand', description: '节点n', credibility: 'verified', sources: ['测试数据'] },
  ],

  relationships: [
    { id: 'r1-1', sourceId: '1', targetId: '2', type: 'supply', strength: 0.9, description: '1→2', credibility: 'verified', chainId: 'chain-1' },
    { id: 'r1-2', sourceId: '2', targetId: '3', type: 'supply', strength: 0.9, description: '2→3', credibility: 'verified', chainId: 'chain-1' },
    { id: 'r1-3', sourceId: '3', targetId: '4', type: 'supply', strength: 0.9, description: '3→4', credibility: 'verified', chainId: 'chain-1' },
    { id: 'r1-4', sourceId: '4', targetId: '5', type: 'supply', strength: 0.8, description: '4→5', credibility: 'verified', chainId: 'chain-1' },
    { id: 'r1-5', sourceId: '5', targetId: '6', type: 'demand', strength: 0.7, description: '5→6', credibility: 'verified', chainId: 'chain-1' },

    { id: 'r2-1', sourceId: 'a', targetId: 'b', type: 'supply', strength: 0.9, description: 'a→b', credibility: 'verified', chainId: 'chain-2' },
    { id: 'r2-2', sourceId: 'b', targetId: '3', type: 'supply', strength: 0.9, description: 'b→3', credibility: 'verified', chainId: 'chain-2' },
    { id: 'r2-3', sourceId: '3', targetId: 'c', type: 'supply', strength: 0.9, description: '3→c', credibility: 'verified', chainId: 'chain-2' },
    { id: 'r2-4', sourceId: 'c', targetId: 'd', type: 'supply', strength: 0.8, description: 'c→d', credibility: 'verified', chainId: 'chain-2' },
    { id: 'r2-5', sourceId: 'd', targetId: 'e', type: 'demand', strength: 0.7, description: 'd→e', credibility: 'verified', chainId: 'chain-2' },

    { id: 'r3-1', sourceId: 'f', targetId: 'g', type: 'supply', strength: 0.9, description: 'f→g', credibility: 'verified', chainId: 'chain-3' },
    { id: 'r3-2', sourceId: 'g', targetId: '4', type: 'supply', strength: 0.9, description: 'g→4', credibility: 'verified', chainId: 'chain-3' },
    { id: 'r3-3', sourceId: '4', targetId: 'h', type: 'supply', strength: 0.9, description: '4→h', credibility: 'verified', chainId: 'chain-3' },
    { id: 'r3-4', sourceId: 'h', targetId: 'i', type: 'demand', strength: 0.7, description: 'h→i', credibility: 'verified', chainId: 'chain-3' },

    { id: 'r4-1', sourceId: 'j', targetId: 'k', type: 'supply', strength: 0.9, description: 'j→k', credibility: 'verified', chainId: 'chain-4' },
    { id: 'r4-2', sourceId: 'k', targetId: '2', type: 'supply', strength: 0.9, description: 'k→2', credibility: 'verified', chainId: 'chain-4' },
    { id: 'r4-3', sourceId: '2', targetId: 'l', type: 'supply', strength: 0.9, description: '2→l', credibility: 'verified', chainId: 'chain-4' },
    { id: 'r4-4', sourceId: 'l', targetId: 'm', type: 'supply', strength: 0.8, description: 'l→m', credibility: 'verified', chainId: 'chain-4' },
    { id: 'r4-5', sourceId: 'm', targetId: 'n', type: 'demand', strength: 0.7, description: 'm→n', credibility: 'verified', chainId: 'chain-4' },
  ],

  chains: [
    {
      id: 'chain-1',
      name: '产业链1',
      description: '1-2-3-4-5-6',
      nodeIds: ['1', '2', '3', '4', '5', '6'],
      demandType: '需求6'
    },
    {
      id: 'chain-2',
      name: '产业链2',
      description: 'a-b-3-c-d-e',
      nodeIds: ['a', 'b', '3', 'c', 'd', 'e'],
      demandType: '需求e'
    },
    {
      id: 'chain-3',
      name: '产业链3',
      description: 'f-g-4-h-i',
      nodeIds: ['f', 'g', '4', 'h', 'i'],
      demandType: '需求i'
    },
    {
      id: 'chain-4',
      name: '产业链4',
      description: 'j-k-2-l-m-n',
      nodeIds: ['j', 'k', '2', 'l', 'm', 'n'],
      demandType: '需求n'
    },
  ]
};
