import * as THREE from 'three';
import { Chain } from './types';

export class PhysicsEngine {
  private nodes: Map<string, THREE.Vector3> = new Map();
  private chains: Chain[] = [];
  private nodeMainChain: Map<string, string> = new Map();
  private chainDirections: Map<string, THREE.Vector3> = new Map();

  getNodePosition(nodeId: string): THREE.Vector3 | undefined {
    return this.nodes.get(nodeId);
  }

  getChainDirection(nodeId: string): THREE.Vector3 {
    const chainId = this.nodeMainChain.get(nodeId);
    if (chainId) {
      return this.chainDirections.get(chainId) || new THREE.Vector3(0, 0, 1);
    }
    return new THREE.Vector3(0, 0, 1);
  }

  getMainChainId(nodeId: string): string | null {
    return this.nodeMainChain.get(nodeId) || null;
  }

  getNodeChainDirection(nodeId: string): THREE.Vector3 {
    const chainId = this.nodeMainChain.get(nodeId);
    if (!chainId) return new THREE.Vector3(0, 0, 1);
    
    const chain = this.chains.find(c => c.id === chainId);
    if (!chain) return new THREE.Vector3(0, 0, 1);
    
    const idx = chain.nodeIds.indexOf(nodeId);
    if (idx < 0) return new THREE.Vector3(0, 0, 1);
    
    let nextPos: THREE.Vector3 | undefined;
    let prevPos: THREE.Vector3 | undefined;
    
    if (idx < chain.nodeIds.length - 1) {
      nextPos = this.nodes.get(chain.nodeIds[idx + 1]);
    }
    if (idx > 0) {
      prevPos = this.nodes.get(chain.nodeIds[idx - 1]);
    }
    
    const nodePos = this.nodes.get(nodeId);
    if (!nodePos) return new THREE.Vector3(0, 0, 1);
    
    if (nextPos) {
      return new THREE.Vector3().subVectors(nextPos, nodePos).normalize();
    }
    if (prevPos) {
      return new THREE.Vector3().subVectors(nodePos, prevPos).normalize();
    }
    
    return new THREE.Vector3(0, 0, 1);
  }

  getChainAnchor(nodeId: string): string | null {
    const chainId = this.nodeMainChain.get(nodeId);
    if (!chainId) return null;
    
    const chain = this.chains.find(c => c.id === chainId);
    if (!chain) return null;
    
    const sharedNodes = chain.nodeIds.filter(id => this.isSharedNode(id));
    return sharedNodes.length > 0 ? sharedNodes[sharedNodes.length - 1] : chain.nodeIds[0];
  }

  private isSharedNode(nodeId: string): boolean {
    let count = 0;
    for (const chain of this.chains) {
      if (chain.nodeIds.includes(nodeId)) count++;
    }
    return count > 1;
  }

  setChains(chains: Chain[]) {
    this.chains = chains;
    this.computeLayout();
  }

  private fibonacciSphere(count: number): THREE.Vector3[] {
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
  }

  private computeLayout() {
    if (this.chains.length === 0) return;

    const spacing = 6;
    this.nodes.clear();
    this.nodeMainChain.clear();
    this.chainDirections.clear();

    const placed = new Set<string>();

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

      for (const chain of this.chains) {
        const idx = chain.nodeIds.indexOf(nodeId);
        if (idx < 0) continue;

        if (idx < chain.nodeIds.length - 1) {
          const segNodes: string[] = [];
          let nextShared: string | null = null;
          for (let i = idx + 1; i < chain.nodeIds.length; i++) {
            const nid = chain.nodeIds[i];
            segNodes.push(nid);
            if (this.isSharedNode(nid)) {
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
            if (this.isSharedNode(nid)) {
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

    let rootNodeId = '';
    let maxBranches = 0;
    for (const chain of this.chains) {
      for (const nodeId of chain.nodeIds) {
        if (!this.isSharedNode(nodeId)) continue;
        const branches = getBranchesAtNode(nodeId);
        if (branches.length > maxBranches) {
          maxBranches = branches.length;
          rootNodeId = nodeId;
        }
      }
    }

    if (!rootNodeId) {
      rootNodeId = this.chains[0].nodeIds[Math.floor(this.chains[0].nodeIds.length / 2)];
    }

    this.nodes.set(rootNodeId, new THREE.Vector3(0, 0, 0));
    placed.add(rootNodeId);
    
    const rootChain = this.chains.find(c => c.nodeIds.includes(rootNodeId));
    if (rootChain) {
      this.nodeMainChain.set(rootNodeId, rootChain.id);
    }

    const queue: string[] = [rootNodeId];
    const processed = new Set<string>();

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (processed.has(nodeId)) continue;
      processed.add(nodeId);

      const nodePos = this.nodes.get(nodeId)!;
      const allBranches = getBranchesAtNode(nodeId);

      const placedBranches: { dir: THREE.Vector3 }[] = [];
      const newBranches: Branch[] = [];

      for (const branch of allBranches) {
        const firstNodeId = branch.nodes[0];
        if (firstNodeId && placed.has(firstNodeId)) {
          const firstPos = this.nodes.get(firstNodeId)!;
          const dir = new THREE.Vector3().subVectors(firstPos, nodePos).normalize();
          placedBranches.push({ dir });
        } else {
          newBranches.push(branch);
        }
      }

      if (newBranches.length === 0) continue;

      const totalDirs = placedBranches.length + newBranches.length;
      const sphereDirs = this.fibonacciSphere(Math.max(totalDirs, 3));
      const usedDirs = placedBranches.map(b => b.dir);

      for (const branch of newBranches) {
        let bestIdx = 0;
        let bestMinAngle = 0;

        for (let di = 0; di < sphereDirs.length; di++) {
          const candidate = sphereDirs[di];
          const candidatePlaceDir = branch.direction > 0 ? candidate : candidate.clone().negate();
          let minAngle = Math.PI;
          
          for (const used of usedDirs) {
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
        usedDirs.push(placeDir.clone());
        
        this.chainDirections.set(branch.chainId, placeDir.clone());

        let p = nodePos.clone();
        for (let i = 0; i < branch.nodes.length; i++) {
          const nid = branch.nodes[i];
          p = p.clone().add(placeDir.clone().multiplyScalar(spacing));
          
          if (!placed.has(nid)) {
            this.nodes.set(nid, p.clone());
            placed.add(nid);
          }
          if (!this.nodeMainChain.has(nid)) {
            this.nodeMainChain.set(nid, branch.chainId);
          }
        }

        if (branch.toNodeId && !processed.has(branch.toNodeId)) {
          queue.push(branch.toNodeId);
        }
      }
    }

    for (const chain of this.chains) {
      let count = 0;
      for (const nodeId of chain.nodeIds) {
        if (placed.has(nodeId)) count++;
      }
      if (count === 0) {
        const midIdx = Math.floor(chain.nodeIds.length / 2);
        const midId = chain.nodeIds[midIdx];
        const dir = new THREE.Vector3(1, 0, 0);
        this.chainDirections.set(chain.id, dir);
        
        const pos = new THREE.Vector3(
          (Math.random() - 0.5) * 80,
          (Math.random() - 0.5) * 80,
          (Math.random() - 0.5) * 80
        );
        
        this.nodes.set(midId, pos.clone());
        placed.add(midId);
        this.nodeMainChain.set(midId, chain.id);
        
        let p = pos.clone();
        for (let i = midIdx + 1; i < chain.nodeIds.length; i++) {
          p = p.clone().add(dir.clone().multiplyScalar(spacing));
          this.nodes.set(chain.nodeIds[i], p.clone());
          placed.add(chain.nodeIds[i]);
          this.nodeMainChain.set(chain.nodeIds[i], chain.id);
        }
        
        p = pos.clone();
        for (let i = midIdx - 1; i >= 0; i--) {
          p = p.clone().add(dir.clone().negate().multiplyScalar(spacing));
          this.nodes.set(chain.nodeIds[i], p.clone());
          placed.add(chain.nodeIds[i]);
          this.nodeMainChain.set(chain.nodeIds[i], chain.id);
        }
      }
    }

    const allPos = Array.from(this.nodes.values());
    if (allPos.length > 0) {
      const center = new THREE.Vector3();
      for (const p of allPos) center.add(p);
      center.divideScalar(allPos.length);
      for (const p of this.nodes.values()) p.sub(center);
    }
  }

  step(_delta: number, _isPaused: boolean) {
  }
}
