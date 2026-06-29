import * as THREE from 'three';
import { PhysicsEngine } from './src/PhysicsEngine';
import { sampleData } from './src/data';

const engine = new PhysicsEngine();
engine.setChains(sampleData.chains);

console.log('=== 共享节点 ===');
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
let hasOverlap = false;
posMap.forEach((names, key) => {
  if (names.length > 1) {
    hasOverlap = true;
    console.log(`位置 ${key} 有 ${names.length} 个节点重叠: ${names.join(', ')}`);
  }
});
if (!hasOverlap) {
  console.log('✅ 无重叠节点');
}

console.log('\n=== 各链直线性检查 ===');
for (const chain of sampleData.chains) {
  const positions = chain.nodeIds
    .map(id => engine.getNodePosition(id))
    .filter(Boolean) as THREE.Vector3[];
  
  if (positions.length < 3) continue;
  
  const dir = new THREE.Vector3().subVectors(positions[1], positions[0]).normalize();
  let allStraight = true;
  let maxDeviation = 0;
  
  for (let i = 2; i < positions.length; i++) {
    const segmentDir = new THREE.Vector3().subVectors(positions[i], positions[i-1]).normalize();
    const dot = Math.max(-1, Math.min(1, segmentDir.dot(dir)));
    const angle = Math.acos(dot) * 180 / Math.PI;
    maxDeviation = Math.max(maxDeviation, angle);
    if (angle > 1) {
      allStraight = false;
    }
  }
  
  console.log(`${chain.name}: ${allStraight ? '✅ 直线' : '⚠️ 有弯折'} (最大偏差 ${maxDeviation.toFixed(1)}°)`);
}

console.log('\n=== 节点主链 ===');
for (const node of sampleData.nodes) {
  const mainChain = engine.getMainChainId(node.id);
  const chainDir = engine.getNodeChainDirection(node.id);
  console.log(`${node.name}: 主链=${mainChain}, 方向=(${chainDir.x.toFixed(2)}, ${chainDir.y.toFixed(2)}, ${chainDir.z.toFixed(2)})`);
}
