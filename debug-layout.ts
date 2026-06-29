import * as THREE from 'three';
import { Chain } from './src/types';

const chains: Chain[] = [
  {
    id: 'chain-1',
    name: '塑料杯产业链',
    description: '',
    nodeIds: ['oil', 'pe', 'pellet', 'cup-factory', 'cup-brand', 'distributor', 'drink-demand'],
    demandType: '日常饮品需求'
  },
  {
    id: 'chain-2',
    name: '一次性医疗耗材产业链',
    description: '',
    nodeIds: ['oil', 'pe', 'medical-pellet', 'medical-factory', 'hospital', 'medical-demand'],
    demandType: '医疗防护需求'
  },
  {
    id: 'chain-3',
    name: '食品包装产业链',
    description: '',
    nodeIds: ['oil', 'pe', 'pe-film', 'packaging-factory', 'food-factory', 'supermarket', 'food-demand'],
    demandType: '食品保鲜需求'
  }
];

const isSharedNode = (nodeId: string): boolean => {
  let count = 0;
  for (const chain of chains) {
    if (chain.nodeIds.includes(nodeId)) count++;
  }
  return count > 1;
};

const segmentKey = (a: string, b: string) => [a, b].sort().join('-');

interface Branch {
  fromNodeId: string;
  toNodeId: string | null;
  nodes: string[];
  direction: number;
  chainId: string;
}

const getBranchesAtNode = (nodeId: string): Branch[] => {
  const branchMap = new Map<string, Branch>();

  for (const chain of chains) {
    const idx = chain.nodeIds.indexOf(nodeId);
    if (idx < 0) continue;

    if (idx < chain.nodeIds.length - 1) {
      const segNodes: string[] = [];
      let nextShared: string | null = null;
      for (let i = idx + 1; i < chain.nodeIds.length; i++) {
        const nid = chain.nodeIds[i];
        segNodes.push(nid);
        if (isSharedNode(nid)) {
          nextShared = nid;
          break;
        }
      }
      const endNode = nextShared || segNodes[segNodes.length - 1];
      const key = segmentKey(nodeId, endNode) + ':fwd';
      if (!branchMap.has(key)) {
        branchMap.set(key, {
          fromNodeId: nodeId,
          toNodeId: nextShared,
          nodes: segNodes,
          direction: +1,
          chainId: chain.id
        });
      }
    }

    if (idx > 0) {
      const segNodes: string[] = [];
      let prevShared: string | null = null;
      for (let i = idx - 1; i >= 0; i--) {
        const nid = chain.nodeIds[i];
        segNodes.push(nid);
        if (isSharedNode(nid)) {
          prevShared = nid;
          break;
        }
      }
      const endNode = prevShared || segNodes[segNodes.length - 1];
      const key = segmentKey(nodeId, endNode) + ':bwd';
      if (!branchMap.has(key)) {
        branchMap.set(key, {
          fromNodeId: nodeId,
          toNodeId: prevShared,
          nodes: segNodes,
          direction: -1,
          chainId: chain.id
        });
      }
    }
  }

  return Array.from(branchMap.values());
};

const fibonacciSphere = (count: number): THREE.Vector3[] => {
  const dirs: THREE.Vector3[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1 || 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = phi * i;
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    dirs.push(new THREE.Vector3(x, y, z).normalize());
  }
  return dirs;
};

const nodeNames: Record<string, string> = {
  'oil': '石油',
  'pe': '聚乙烯(PE)',
  'pellet': '塑料粒子',
  'cup-factory': '塑料杯厂',
  'cup-brand': '品牌商',
  'distributor': '经销商',
  'drink-demand': '日常饮品需求',
  'medical-pellet': '医用级塑料粒子',
  'medical-factory': '医疗器械厂',
  'hospital': '医院',
  'medical-demand': '医疗防护需求',
  'pe-film': 'PE膜',
  'packaging-factory': '包装材料厂',
  'food-factory': '食品加工厂',
  'supermarket': '超市',
  'food-demand': '食品保鲜需求'
};

console.log('='.repeat(80));
console.log('问题：石油(oil)和塑料粒子(pellet)位置重叠的bug分析');
console.log('='.repeat(80));

console.log('\n📊 数据概览：');
console.log(`  chain-1: ${chains[0].nodeIds.map(id => nodeNames[id]).join(' → ')}`);
console.log(`  chain-2: ${chains[1].nodeIds.map(id => nodeNames[id]).join(' → ')}`);
console.log(`  chain-3: ${chains[2].nodeIds.map(id => nodeNames[id]).join(' → ')}`);
console.log(`  共享节点: 石油(oil), 聚乙烯(pe) — 都在3条链中`);

console.log('\n' + '='.repeat(80));
console.log('第1步：确定根节点');
console.log('='.repeat(80));

const sharedNodes = ['oil', 'pe'];
for (const nodeId of sharedNodes) {
  const branches = getBranchesAtNode(nodeId);
  console.log(`\n  ${nodeNames[nodeId]} (${nodeId}) 的分支数: ${branches.length}`);
}

console.log('\n  ✅ 根节点选择：pe（聚乙烯），因为它有更多分支');

console.log('\n' + '='.repeat(80));
console.log('第2步：pe节点的getBranchesAtNode返回结果');
console.log('='.repeat(80));

const peBranches = getBranchesAtNode('pe');
console.log(`\n  共 ${peBranches.length} 个分支（按返回顺序排列）：\n`);

peBranches.forEach((branch, i) => {
  const dirName = branch.direction > 0 ? '向前(+1)' : '向后(-1)';
  const nodeList = branch.nodes.map(id => nodeNames[id]).join(', ');
  console.log(`  分支${i + 1}: ${branch.chainId} | ${dirName}`);
  console.log(`    从: ${nodeNames[branch.fromNodeId]}`);
  console.log(`    到: ${branch.toNodeId ? nodeNames[branch.toNodeId] : '(链末端)'}`);
  console.log(`    节点列表: [${nodeList}]`);
  console.log(`    第一个节点: ${nodeNames[branch.nodes[0]]}`);
  console.log();
});

console.log('='.repeat(80));
console.log('第3步：fibonacciSphere(4) 生成的球面方向');
console.log('='.repeat(80));

const sphereDirs = fibonacciSphere(4);
sphereDirs.forEach((dir, i) => {
  console.log(`\n  方向${i}: (${dir.x.toFixed(3)}, ${dir.y.toFixed(3)}, ${dir.z.toFixed(3)})`);
});

console.log('\n' + '='.repeat(80));
console.log('第4步：方向分配过程（核心bug所在）');
console.log('='.repeat(80));

const spacing = 6;
const nodes = new Map<string, THREE.Vector3>();
const placed = new Set<string>();
const chainDirections = new Map<string, THREE.Vector3>();
const nodeMainChain = new Map<string, string>();

nodes.set('pe', new THREE.Vector3(0, 0, 0));
placed.add('pe');

const usedDirs: THREE.Vector3[] = [];

console.log('\n  初始状态：');
console.log('    pe 位置: (0, 0, 0)');
console.log('    已放置节点: [pe]');
console.log('    已用方向: []');

peBranches.forEach((branch, i) => {
  console.log(`\n  ─────────────────────────────────────────`);
  console.log(`  处理分支${i + 1}: ${branch.chainId} | direction=${branch.direction > 0 ? '+1' : '-1'}`);
  console.log(`    第一个节点: ${nodeNames[branch.nodes[0]]}`);
  
  let bestIdx = 0;
  let bestMinAngle = 0;

  console.log(`    遍历球面方向，寻找与已用方向夹角最大的方向：`);
  
  for (let di = 0; di < sphereDirs.length; di++) {
    const candidate = sphereDirs[di];
    let minAngle = Math.PI;
    
    const angles: number[] = [];
    for (const used of usedDirs) {
      const dot = Math.max(-1, Math.min(1, candidate.dot(used)));
      const angle = Math.acos(dot);
      minAngle = Math.min(minAngle, angle);
      angles.push(angle);
    }
    
    const angleStr = angles.length > 0 
      ? angles.map(a => `${(a * 180 / Math.PI).toFixed(1)}°`).join(', ')
      : '(无已用方向)';
    
    console.log(`      方向${di}: (${candidate.x.toFixed(3)}, ${candidate.y.toFixed(3)}, ${candidate.z.toFixed(3)}) ` +
      `→ 最小夹角: ${(minAngle * 180 / Math.PI).toFixed(1)}° [与已用方向的夹角: ${angleStr}]`);
    
    if (minAngle > bestMinAngle) {
      bestMinAngle = minAngle;
      bestIdx = di;
    }
  }

  const selectedDir = sphereDirs[bestIdx];
  console.log(`    ✅ 选中方向: ${bestIdx} (${selectedDir.x.toFixed(3)}, ${selectedDir.y.toFixed(3)}, ${selectedDir.z.toFixed(3)})`);
  console.log(`       最大最小夹角: ${(bestMinAngle * 180 / Math.PI).toFixed(1)}°`);
  
  usedDirs.push(selectedDir.clone());
  
  const placeDir = branch.direction > 0 ? selectedDir.clone() : selectedDir.clone().negate();
  console.log(`    ⚠️  实际放置方向 (placeDir): ` +
    `direction=${branch.direction > 0 ? '+1' : '-1'} → ` +
    `${branch.direction > 0 ? 'dir' : '-dir'} = ` +
    `(${placeDir.x.toFixed(3)}, ${placeDir.y.toFixed(3)}, ${placeDir.z.toFixed(3)})`);
  
  chainDirections.set(branch.chainId, selectedDir.clone());
  
  let p = new THREE.Vector3(0, 0, 0);
  const firstNode = branch.nodes[0];
  p = p.clone().add(placeDir.clone().multiplyScalar(spacing));
  
  console.log(`    📍 ${nodeNames[firstNode]} (${firstNode}) 位置: ` +
    `(${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)})`);
  
  nodes.set(firstNode, p.clone());
  placed.add(firstNode);
  nodeMainChain.set(firstNode, branch.chainId);
  
  if (i === 1) {
    console.log(`\n    🚨 BUG 出现了！`);
    console.log(`       - 分支1（塑料粒子）的 placeDir = (${sphereDirs[0].x.toFixed(3)}, ${sphereDirs[0].y.toFixed(3)}, ${sphereDirs[0].z.toFixed(3)})`);
    console.log(`       - 分支2（石油）的 placeDir = (${placeDir.x.toFixed(3)}, ${placeDir.y.toFixed(3)}, ${placeDir.z.toFixed(3)})`);
    console.log(`       - 两个方向几乎相同！所以两个节点被放在了几乎相同的位置！`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('第5步：bug原因深度分析');
console.log('='.repeat(80));

console.log(`
  🐛 Bug根本原因：
  
  方向分配算法在选择球面方向时，只考虑了"选中的dir"与"已用dirs"的夹角，
  但没有考虑 direction(+1/-1) 对最终放置方向的影响。

  具体来说：
  ┌─────────────────────────────────────────────────────────────────┐
  │  代码位置：PhysicsEngine.ts 第188-211行                         │
  │                                                                 │
  │  const usedDirs = placedBranches.map(b => b.dir);    ← 存的是dir│
  │  ...                                                           │
  │  for (const branch of newBranches) {                            │
  │    // 选择与 usedDirs 夹角最大的球面方向                         │
  │    const dir = sphereDirs[bestIdx];                             │
  │    usedDirs.push(dir.clone());       ← 加入usedDirs的也是dir    │
  │                                                                 │
  │    const placeDir = branch.direction > 0 ? dir : dir.negate();  │
  │    // ↑ 实际放置用的是placeDir，但它没有被用来计算夹角！          │
  │  }                                                              │
  └─────────────────────────────────────────────────────────────────┘

  在我们的例子中：
  1. 分支1（pellet，direction=+1）：
     - 选中 dir = (0, 1, 0) （球面方向0）
     - placeDir = (0, 1, 0) （因为direction=+1）
     - usedDirs 添加 (0, 1, 0)
  
  2. 分支2（oil，direction=-1）：
     - 算法寻找与 usedDirs [(0, 1, 0)] 夹角最大的方向
     - 找到 dir = (0, -1, 0) （球面方向3），夹角180°，最大
     - 但！placeDir = -dir = (0, 1, 0) （因为direction=-1）
     - 结果 placeDir 和分支1的 placeDir 完全相同！
  
  3. 因此：
     - pellet的位置 = pe位置 + (0,1,0) * 6 = (0, 6, 0)
     - oil的位置 = pe位置 + (0,1,0) * 6 = (0, 6, 0)
     - 两个节点完全重叠！

  💡 问题的本质：
     usedDirs 中存储的是"球面选中的方向"，而不是"实际放置方向"。
     当分支的 direction=-1 时，实际放置方向是选中方向的反方向，
     但这个反方向没有被考虑进夹角计算中。
`);

console.log('='.repeat(80));
console.log('第6步：修复方案');
console.log('='.repeat(80));

console.log(`
  🔧 修复思路：
  
  将 usedDirs 中存储的方向改为实际放置方向（placeDir），
  而不是从球面选中的原始方向（dir）。

  修改位置：PhysicsEngine.ts 第188行和第211行

  修改前：
    const usedDirs = placedBranches.map(b => b.dir);  // ← 用的是dir
    ...
    usedDirs.push(dir.clone());  // ← 加入的也是dir

  修改后：
    // 对于已放置的分支，需要计算其placeDir（需要知道direction）
    // 对于新分支，加入usedDirs的应该是placeDir
    usedDirs.push(placeDir.clone());  // ← 加入的是placeDir

  更完整的修复方案需要同时修改 placedBranches 的结构，
  使其也存储 placeDir 而不仅仅是 dir，或者存储 direction。

  具体修改建议：

  1. 在 placedBranches 中同时存储 direction，或者直接存储 placeDir
  2. 在选择方向后，将 placeDir（而不是 dir）加入 usedDirs

  修改后的关键代码片段：
  
    // 修改 placedBranches 的计算
    for (const branch of allBranches) {
      const firstNodeId = branch.nodes[0];
      if (firstNodeId && placed.has(firstNodeId)) {
        const firstPos = this.nodes.get(firstNodeId)!;
        const dir = new THREE.Vector3().subVectors(firstPos, nodePos).normalize();
        // 直接使用实际方向（就是placeDir）
        placedBranches.push({ dir });
      } else {
        newBranches.push(branch);
      }
    }
    
    // ...（方向选择逻辑不变）
    
    const dir = sphereDirs[bestIdx];
    const placeDir = branch.direction > 0 ? dir.clone() : dir.clone().negate();
    
    // 🔑 关键修复：将 placeDir 加入 usedDirs，而不是 dir
    usedDirs.push(placeDir.clone());
    
    this.chainDirections.set(branch.chainId, dir.clone());
    // ...（后续放置逻辑不变）

  修复后的效果：
  - 分支1（pellet，+1）：placeDir=(0,1,0)，usedDirs=[(0,1,0)]
  - 分支2（oil，-1）：算法会找离(0,1,0)最远的方向，即(0,-1,0)
    但 placeDir = -(0,-1,0) = (0,1,0) ❌ 等等，这不对...
  
  等等，让我重新思考一下...

  实际上，问题更微妙。让我重新分析：

  对于 direction=-1 的分支，我们需要选择一个 dir，使得 -dir（即placeDir）
  与已有的 placeDirs 夹角最大。

  等价于：选择 dir，使得 dir 与已有的 -placeDirs 夹角最大。

  或者更简单地说：在选择方向时，我们应该考虑分支的direction，
  将候选方向先"校正"为placeDir，再计算与已用placeDirs的夹角。

  修改后的选择逻辑：
  
    for (const branch of newBranches) {
      let bestIdx = 0;
      let bestMinAngle = 0;

      for (let di = 0; di < sphereDirs.length; di++) {
        const candidate = sphereDirs[di];
        // 🔑 关键修改：根据direction计算候选的placeDir
        const candidatePlaceDir = branch.direction > 0 
          ? candidate 
          : candidate.clone().negate();
        
        let minAngle = Math.PI;
        
        for (const used of usedDirs) {
          // used里存的也是placeDir
          const dot = Math.max(-1, Math.min(1, candidatePlaceDir.dot(used)));
          const angle = Math.acos(dot);
          minAngle = Math.min(minAngle, angle);
        }
        
        if (minAngle > bestMinAngle) {
          bestMinAngle = minAngle;
          bestIdx = di;
        }
      }

      const dir = sphereDirs[bestIdx];
      const placeDir = branch.direction > 0 ? dir.clone() : dir.clone().negate();
      usedDirs.push(placeDir.clone());  // 存的是placeDir
      // ...
    }

  这样修复后，对于我们的例子：
  - 初始 usedDirs = [] （存的都是placeDir）
  
  - 分支1（pellet，+1）：
    - candidatePlaceDir = candidate（因为+1）
    - 选中方向0: (0,1,0)
    - placeDir = (0,1,0)
    - usedDirs = [(0,1,0)]
  
  - 分支2（oil，-1）：
    - candidatePlaceDir = -candidate（因为-1）
    - 方向0: candidate=(0,1,0), placeDir=(0,-1,0), 与(0,1,0)夹角180°
    - 方向1: candidate=(-0.691,0.333,0.641), placeDir=(0.691,-0.333,-0.641), 
      与(0,1,0)夹角 = acos(-0.333) ≈ 109.5°
    - 方向2: ...
    - 方向3: candidate=(0,-1,0), placeDir=(0,1,0), 与(0,1,0)夹角0°
    - 最佳选择：方向0，placeDir=(0,-1,0)，夹角180°
    - 所以 oil 的 placeDir = (0,-1,0)，位置 = (0, -6, 0)
    - pellet 在 (0, 6, 0)，oil 在 (0, -6, 0)，不再重叠！✅

  这才是正确的修复方案！
`);

console.log('='.repeat(80));
console.log('总结');
console.log('='.repeat(80));

console.log(`
  🐛 Bug: 石油(oil)和塑料粒子(pellet)位置重叠
  
  🔍 原因: 
    - 方向分配时，usedDirs存储的是从球面选中的dir
    - 但实际放置方向 placeDir = direction > 0 ? dir : -dir
    - 当direction=-1时，placeDir是dir的反方向
    - 算法没有考虑这个反转，导致选中的dir的反方向与已有placeDir重合
  
  🔧 修复:
    1. usedDirs中存储实际放置方向（placeDir），而不是球面选中方向（dir）
    2. 在选择最佳方向时，先根据direction将候选方向转换为placeDir
       再计算与已用placeDirs的夹角
  
  📍 修改文件: src/PhysicsEngine.ts
  📝 修改位置: computeLayout()方法中方向分配逻辑（约188-211行）
`);
