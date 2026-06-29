import { PhysicsEngine } from './src/PhysicsEngine';
import { sampleData } from './src/data';

const engine = new PhysicsEngine();
engine.setChains(sampleData.chains);

console.log('=== 各节点的分支数 ===');
for (const node of sampleData.nodes) {
  const count = sampleData.chains.filter(c => c.nodeIds.includes(node.id)).length;
  if (count > 1) {
    console.log(`${node.name} (${node.id}): 出现在 ${count} 条链中`);
  }
}

console.log('\n=== 节点位置 ===');
for (const node of sampleData.nodes) {
  const pos = engine.getNodePosition(node.id);
  if (pos) {
    console.log(`${node.name} (${node.id}): (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`);
  }
}

console.log('\n=== 检查同位置节点 ===');
const posMap = new Map<string, string[]>();
for (const node of sampleData.nodes) {
  const pos = engine.getNodePosition(node.id);
  if (pos) {
    const key = `${pos.x.toFixed(2)},${pos.y.toFixed(2)},${pos.z.toFixed(2)}`;
    if (!posMap.has(key)) posMap.set(key, []);
    posMap.get(key)!.push(node.name);
  }
}
posMap.forEach((names, key) => {
  if (names.length > 1) {
    console.log(`位置 ${key} 有 ${names.length} 个节点重叠: ${names.join(', ')}`);
  }
});
