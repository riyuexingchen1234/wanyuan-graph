import * as THREE from 'three';
import { Chain } from './types';

export class PhysicsEngine {
  private nodes: Map<string, THREE.Vector3> = new Map();
  private chains: Chain[] = [];
  private nodeMainChain: Map<string, string> = new Map();
  private chainDirections: Map<string, THREE.Vector3> = new Map();
  private spacing: number = 6;
  private hubNodeId: string = '';

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
    this.nodes.clear();
    this.nodeMainChain.clear();
    this.chainDirections.clear();

    if (this.chains.length === 0) return;

    const nodeChainCount: Map<string, number> = new Map();
    for (const chain of this.chains) {
      for (const nodeId of chain.nodeIds) {
        nodeChainCount.set(nodeId, (nodeChainCount.get(nodeId) || 0) + 1);
      }
    }

    let hubNodeId = this.chains[0].nodeIds[0];
    let maxCount = 0;
    for (const [nodeId, count] of nodeChainCount) {
      if (count > maxCount) {
        maxCount = count;
        hubNodeId = nodeId;
      }
    }
    this.hubNodeId = hubNodeId;

    const hubPos = new THREE.Vector3(0, 0, 0);
    this.nodes.set(hubNodeId, hubPos);

    const hubChains: { chain: Chain; dir: THREE.Vector3 }[] = [];
    for (const chain of this.chains) {
      if (chain.nodeIds.includes(hubNodeId)) {
        hubChains.push({ chain, dir: new THREE.Vector3() });
      }
    }

    const sphereDirs = this.fibonacciSphere(Math.max(hubChains.length * 2, 10));
    const usedDirs: THREE.Vector3[] = [];

    for (let i = 0; i < hubChains.length; i++) {
      let bestIdx = 0;
      let bestMinAngle = 0;

      for (let di = 0; di < sphereDirs.length; di++) {
        const candidate = sphereDirs[di];
        let minAngle = Math.PI;

        for (const used of usedDirs) {
          const dot = Math.max(-1, Math.min(1, candidate.dot(used)));
          minAngle = Math.min(minAngle, Math.acos(dot));
        }

        if (minAngle > bestMinAngle) {
          bestMinAngle = minAngle;
          bestIdx = di;
        }
      }

      const dir = sphereDirs[bestIdx].clone();
      hubChains[i].dir.copy(dir);
      usedDirs.push(dir.clone());
      usedDirs.push(dir.clone().negate());
    }

    for (const { chain, dir } of hubChains) {
      this.chainDirections.set(chain.id, dir.clone());

      const hubIdx = chain.nodeIds.indexOf(hubNodeId);
      this.nodeMainChain.set(hubNodeId, chain.id);

      for (let i = hubIdx + 1; i < chain.nodeIds.length; i++) {
        const nodeId = chain.nodeIds[i];
        const offset = (i - hubIdx) * this.spacing;
        const pos = hubPos.clone().add(dir.clone().multiplyScalar(offset));
        this.nodes.set(nodeId, pos);
        this.nodeMainChain.set(nodeId, chain.id);
      }

      const negDir = dir.clone().negate();
      for (let i = hubIdx - 1; i >= 0; i--) {
        const nodeId = chain.nodeIds[i];
        const offset = (hubIdx - i) * this.spacing;
        const pos = hubPos.clone().add(negDir.clone().multiplyScalar(offset));
        this.nodes.set(nodeId, pos);
        this.nodeMainChain.set(nodeId, chain.id);
      }
    }

    for (const chain of this.chains) {
      if (this.chainDirections.has(chain.id)) continue;

      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();
      const midIdx = Math.floor(chain.nodeIds.length / 2);
      const origin = new THREE.Vector3(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40
      );

      this.chainDirections.set(chain.id, dir);
      for (let i = 0; i < chain.nodeIds.length; i++) {
        const nodeId = chain.nodeIds[i];
        if (!this.nodes.has(nodeId)) {
          const offset = (i - midIdx) * this.spacing;
          const pos = origin.clone().add(dir.clone().multiplyScalar(offset));
          this.nodes.set(nodeId, pos);
          this.nodeMainChain.set(nodeId, chain.id);
        }
      }
    }
  }

  getNodePosition(nodeId: string): THREE.Vector3 | null {
    return this.nodes.get(nodeId) || null;
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

  getHubNodeId(): string {
    return this.hubNodeId;
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
}
