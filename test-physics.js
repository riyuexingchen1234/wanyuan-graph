// 验证物理引擎
import { PhysicsEngine } from './src/PhysicsEngine.ts';

// 创建引擎
const engine = new PhysicsEngine();

// 初始化节点
const nodeIds = ['oil', 'pe', 'plastic_cup', 'medical', 'food', 'demand_cup', 'demand_medical', 'demand_food'];
engine.initializeNodes(nodeIds);

// 设置关系
const relationships = [
  { source: 'oil', target: 'pe' },
  { source: 'pe', target: 'plastic_cup' },
  { source: 'plastic_cup', target: 'demand_cup' },
  { source: 'pe', target: 'medical' },
  { source: 'medical', target: 'demand_medical' },
  { source: 'pe', target: 'food' },
  { source: 'food', target: 'demand_food' },
];
engine.setRelationships(relationships);

// 运行500步
console.log('初始位置:');
nodeIds.forEach(id => {
  const pos = engine.getNodePosition(id);
  console.log(`${id}: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`);
});

for (let i = 0; i < 500; i++) {
  engine.step(0.016, false);
}

console.log('\n500步后位置:');
nodeIds.forEach(id => {
  const pos = engine.getNodePosition(id);
  console.log(`${id}: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`);
});

// 验证节点间距
console.log('\n节点间距:');
for (let i = 0; i < nodeIds.length; i++) {
  for (let j = i + 1; j < nodeIds.length; j++) {
    const pos1 = engine.getNodePosition(nodeIds[i]);
    const pos2 = engine.getNodePosition(nodeIds[j]);
    const distance = pos1.distanceTo(pos2);
    const hasConnection = relationships.some(
      r => (r.source === nodeIds[i] && r.target === nodeIds[j]) ||
           (r.target === nodeIds[i] && r.source === nodeIds[j])
    );
    console.log(`${nodeIds[i]} <-> ${nodeIds[j]}: ${distance.toFixed(2)} ${hasConnection ? '(连接)' : ''}`);
  }
}
