import { GraphData } from './types';

export const sampleData: GraphData = {
  nodes: [
    { id: 'c1', name: '材料甲', type: 'material', description: '基础材料甲', credibility: 'verified', sources: ['测试数据'] },
    { id: 'c2', name: '材料乙', type: 'material', description: '基础材料乙', credibility: 'verified', sources: ['测试数据'] },
    { id: 'c3', name: '材料丙', type: 'material', description: '基础材料丙', credibility: 'verified', sources: ['测试数据'] },
    { id: 'c4', name: '材料丁', type: 'material', description: '基础材料丁', credibility: 'verified', sources: ['测试数据'] },
    { id: 'c5', name: '材料戊', type: 'material', description: '基础材料戊', credibility: 'verified', sources: ['测试数据'] },
    
    { id: 'hub', name: '中心枢纽', type: 'process', description: '5条产业链在此交汇，形成米字形', credibility: 'verified', sources: ['测试数据'] },
    
    { id: 'p1', name: '加工1', type: 'process', description: '加工环节1', credibility: 'verified', sources: ['测试数据'] },
    { id: 'p2', name: '加工2', type: 'process', description: '加工环节2', credibility: 'verified', sources: ['测试数据'] },
    { id: 'p3', name: '加工3', type: 'process', description: '加工环节3', credibility: 'verified', sources: ['测试数据'] },
    { id: 'p4', name: '加工4', type: 'process', description: '加工环节4', credibility: 'verified', sources: ['测试数据'] },
    { id: 'p5', name: '加工5', type: 'process', description: '加工环节5', credibility: 'verified', sources: ['测试数据'] },
    
    { id: 'f1', name: '工厂A', type: 'entity', description: '制造工厂A', credibility: 'verified', sources: ['测试数据'] },
    { id: 'f2', name: '工厂B', type: 'entity', description: '制造工厂B', credibility: 'verified', sources: ['测试数据'] },
    { id: 'f3', name: '工厂C', type: 'entity', description: '制造工厂C', credibility: 'verified', sources: ['测试数据'] },
    { id: 'f4', name: '工厂D', type: 'entity', description: '制造工厂D', credibility: 'verified', sources: ['测试数据'] },
    { id: 'f5', name: '工厂E', type: 'entity', description: '制造工厂E', credibility: 'verified', sources: ['测试数据'] },
    
    { id: 'b1', name: '品牌α', type: 'entity', description: '品牌/渠道α', credibility: 'verified', sources: ['测试数据'] },
    { id: 'b2', name: '品牌β', type: 'entity', description: '品牌/渠道β', credibility: 'verified', sources: ['测试数据'] },
    { id: 'b3', name: '品牌γ', type: 'entity', description: '品牌/渠道γ', credibility: 'verified', sources: ['测试数据'] },
    { id: 'b4', name: '品牌δ', type: 'entity', description: '品牌/渠道δ', credibility: 'verified', sources: ['测试数据'] },
    { id: 'b5', name: '品牌ε', type: 'entity', description: '品牌/渠道ε', credibility: 'verified', sources: ['测试数据'] },
    
    { id: 'd1', name: '需求Ⅰ', type: 'demand', description: '终端需求Ⅰ', credibility: 'verified', sources: ['测试数据'] },
    { id: 'd2', name: '需求Ⅱ', type: 'demand', description: '终端需求Ⅱ', credibility: 'verified', sources: ['测试数据'] },
    { id: 'd3', name: '需求Ⅲ', type: 'demand', description: '终端需求Ⅲ', credibility: 'verified', sources: ['测试数据'] },
    { id: 'd4', name: '需求Ⅳ', type: 'demand', description: '终端需求Ⅳ', credibility: 'verified', sources: ['测试数据'] },
    { id: 'd5', name: '需求Ⅴ', type: 'demand', description: '终端需求Ⅴ', credibility: 'verified', sources: ['测试数据'] },
  ],

  relationships: [
    { id: 'r1-1', sourceId: 'c1', targetId: 'hub', type: 'supply', strength: 0.9, description: '材料甲→中心枢纽', credibility: 'verified', chainId: 'chain-1' },
    { id: 'r1-2', sourceId: 'hub', targetId: 'p1', type: 'supply', strength: 0.9, description: '中心枢纽→加工1', credibility: 'verified', chainId: 'chain-1' },
    { id: 'r1-3', sourceId: 'p1', targetId: 'f1', type: 'supply', strength: 0.8, description: '加工1→工厂A', credibility: 'verified', chainId: 'chain-1' },
    { id: 'r1-4', sourceId: 'f1', targetId: 'b1', type: 'supply', strength: 0.8, description: '工厂A→品牌α', credibility: 'verified', chainId: 'chain-1' },
    { id: 'r1-5', sourceId: 'b1', targetId: 'd1', type: 'demand', strength: 0.7, description: '品牌α→需求Ⅰ', credibility: 'verified', chainId: 'chain-1' },

    { id: 'r2-1', sourceId: 'c2', targetId: 'hub', type: 'supply', strength: 0.9, description: '材料乙→中心枢纽', credibility: 'verified', chainId: 'chain-2' },
    { id: 'r2-2', sourceId: 'hub', targetId: 'p2', type: 'supply', strength: 0.9, description: '中心枢纽→加工2', credibility: 'verified', chainId: 'chain-2' },
    { id: 'r2-3', sourceId: 'p2', targetId: 'f2', type: 'supply', strength: 0.8, description: '加工2→工厂B', credibility: 'verified', chainId: 'chain-2' },
    { id: 'r2-4', sourceId: 'f2', targetId: 'b2', type: 'supply', strength: 0.8, description: '工厂B→品牌β', credibility: 'verified', chainId: 'chain-2' },
    { id: 'r2-5', sourceId: 'b2', targetId: 'd2', type: 'demand', strength: 0.7, description: '品牌β→需求Ⅱ', credibility: 'verified', chainId: 'chain-2' },

    { id: 'r3-1', sourceId: 'c3', targetId: 'hub', type: 'supply', strength: 0.9, description: '材料丙→中心枢纽', credibility: 'verified', chainId: 'chain-3' },
    { id: 'r3-2', sourceId: 'hub', targetId: 'p3', type: 'supply', strength: 0.9, description: '中心枢纽→加工3', credibility: 'verified', chainId: 'chain-3' },
    { id: 'r3-3', sourceId: 'p3', targetId: 'f3', type: 'supply', strength: 0.8, description: '加工3→工厂C', credibility: 'verified', chainId: 'chain-3' },
    { id: 'r3-4', sourceId: 'f3', targetId: 'b3', type: 'supply', strength: 0.8, description: '工厂C→品牌γ', credibility: 'verified', chainId: 'chain-3' },
    { id: 'r3-5', sourceId: 'b3', targetId: 'd3', type: 'demand', strength: 0.7, description: '品牌γ→需求Ⅲ', credibility: 'verified', chainId: 'chain-3' },

    { id: 'r4-1', sourceId: 'c4', targetId: 'hub', type: 'supply', strength: 0.9, description: '材料丁→中心枢纽', credibility: 'verified', chainId: 'chain-4' },
    { id: 'r4-2', sourceId: 'hub', targetId: 'p4', type: 'supply', strength: 0.9, description: '中心枢纽→加工4', credibility: 'verified', chainId: 'chain-4' },
    { id: 'r4-3', sourceId: 'p4', targetId: 'f4', type: 'supply', strength: 0.8, description: '加工4→工厂D', credibility: 'verified', chainId: 'chain-4' },
    { id: 'r4-4', sourceId: 'f4', targetId: 'b4', type: 'supply', strength: 0.8, description: '工厂D→品牌δ', credibility: 'verified', chainId: 'chain-4' },
    { id: 'r4-5', sourceId: 'b4', targetId: 'd4', type: 'demand', strength: 0.7, description: '品牌δ→需求Ⅳ', credibility: 'verified', chainId: 'chain-4' },

    { id: 'r5-1', sourceId: 'c5', targetId: 'hub', type: 'supply', strength: 0.9, description: '材料戊→中心枢纽', credibility: 'verified', chainId: 'chain-5' },
    { id: 'r5-2', sourceId: 'hub', targetId: 'p5', type: 'supply', strength: 0.9, description: '中心枢纽→加工5', credibility: 'verified', chainId: 'chain-5' },
    { id: 'r5-3', sourceId: 'p5', targetId: 'f5', type: 'supply', strength: 0.8, description: '加工5→工厂E', credibility: 'verified', chainId: 'chain-5' },
    { id: 'r5-4', sourceId: 'f5', targetId: 'b5', type: 'supply', strength: 0.8, description: '工厂E→品牌ε', credibility: 'verified', chainId: 'chain-5' },
    { id: 'r5-5', sourceId: 'b5', targetId: 'd5', type: 'demand', strength: 0.7, description: '品牌ε→需求Ⅴ', credibility: 'verified', chainId: 'chain-5' },
  ],

  chains: [
    {
      id: 'chain-1',
      name: '产业链一',
      description: '材料甲 → 中心枢纽 → 加工1 → 工厂A → 品牌α → 需求Ⅰ',
      nodeIds: ['c1', 'hub', 'p1', 'f1', 'b1', 'd1'],
      demandType: '需求Ⅰ'
    },
    {
      id: 'chain-2',
      name: '产业链二',
      description: '材料乙 → 中心枢纽 → 加工2 → 工厂B → 品牌β → 需求Ⅱ',
      nodeIds: ['c2', 'hub', 'p2', 'f2', 'b2', 'd2'],
      demandType: '需求Ⅱ'
    },
    {
      id: 'chain-3',
      name: '产业链三',
      description: '材料丙 → 中心枢纽 → 加工3 → 工厂C → 品牌γ → 需求Ⅲ',
      nodeIds: ['c3', 'hub', 'p3', 'f3', 'b3', 'd3'],
      demandType: '需求Ⅲ'
    },
    {
      id: 'chain-4',
      name: '产业链四',
      description: '材料丁 → 中心枢纽 → 加工4 → 工厂D → 品牌δ → 需求Ⅳ',
      nodeIds: ['c4', 'hub', 'p4', 'f4', 'b4', 'd4'],
      demandType: '需求Ⅳ'
    },
    {
      id: 'chain-5',
      name: '产业链五',
      description: '材料戊 → 中心枢纽 → 加工5 → 工厂E → 品牌ε → 需求Ⅴ',
      nodeIds: ['c5', 'hub', 'p5', 'f5', 'b5', 'd5'],
      demandType: '需求Ⅴ'
    },
  ]
};
