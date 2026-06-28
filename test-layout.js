// 验证布局算法
import { calculateLayout } from './src/utils/layout.ts';

// 模拟数据
const nodes = [
  { id: 'oil', name: '石油', type: 'material', category: '原料' },
  { id: 'pe', name: '聚乙烯', type: 'material', category: '原料' },
  { id: 'plastic_cup', name: '塑料杯', type: 'product', category: '产品' },
  { id: 'medical', name: '医用塑料', type: 'product', category: '产品' },
  { id: 'food', name: '食品包装', type: 'product', category: '产品' },
  { id: 'demand_cup', name: '日常饮品需求', type: 'demand', category: '需求' },
  { id: 'demand_medical', name: '医疗防护需求', type: 'demand', category: '需求' },
  { id: 'demand_food', name: '食品保鲜需求', type: 'demand', category: '需求' },
];

const relationships = [
  { sourceId: 'oil', targetId: 'pe', type: 'supply', strength: 1 },
  { sourceId: 'pe', targetId: 'plastic_cup', type: 'supply', strength: 1 },
  { sourceId: 'plastic_cup', targetId: 'demand_cup', type: 'demand', strength: 1 },
  { sourceId: 'pe', targetId: 'medical', type: 'supply', strength: 1 },
  { sourceId: 'medical', targetId: 'demand_medical', type: 'demand', strength: 1 },
  { sourceId: 'pe', targetId: 'food', type: 'supply', strength: 1 },
  { sourceId: 'food', targetId: 'demand_food', type: 'demand', strength: 1 },
];

// 测试点击 'pe' 节点
console.log('测试点击节点: pe (聚乙烯)');
console.log('期望: oil在左侧(X<0), plastic_cup/medical/food在右侧(X>0)');

const layout = calculateLayout('pe', nodes, relationships);

console.log('\n布局结果:');
layout.forEach(pos => {
  const node = nodes.find(n => n.id === pos.id);
  const direction = pos.x < 0 ? '左侧' : pos.x > 0 ? '右侧' : '中心';
  console.log(`${node.name}: X=${pos.x.toFixed(2)} (${direction}), Y=${pos.y.toFixed(2)}, Z=${pos.z.toFixed(2)}`);
});

// 验证
const oilPos = layout.find(p => p.id === 'oil');
const cupPos = layout.find(p => p.id === 'plastic_cup');
const medicalPos = layout.find(p => p.id === 'medical');
const foodPos = layout.find(p => p.id === 'food');

console.log('\n验证结果:');
console.log(`oil在左侧: ${oilPos.x < 0 ? '✓' : '✗'} (X=${oilPos.x.toFixed(2)})`);
console.log(`plastic_cup在右侧: ${cupPos.x > 0 ? '✓' : '✗'} (X=${cupPos.x.toFixed(2)})`);
console.log(`medical在右侧: ${medicalPos.x > 0 ? '✓' : '✗'} (X=${medicalPos.x.toFixed(2)})`);
console.log(`food在右侧: ${foodPos.x > 0 ? '✓' : '✗'} (X=${foodPos.x.toFixed(2)})`);
