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

  private getChainsAtNode(nodeId: string): string[] {
    const result: string[] = [];
    for (const chain of this.chains) {
      if (chain.nodeIds.includes(nodeId)) {
        result.push(chain.id);
      }
    }
    return result;
  }

  private computeLayout() {
    this.nodes.clear();
    this.nodeMainChain.clear();
    this.chainDirections.clear();

    if (this.chains.length === 0) return;

    let hubNodeId = this.chains[0].nodeIds[0];
    let maxChains = 0;
    for (const chain of this.chains) {
      for (const nodeId of chain.nodeIds) {
        const count = this.getChainsAtNode(nodeId).length;
        if (count > maxChains) {
          maxChains = count;
          hubNodeId = nodeId;
        }
      }
    }
    this.hubNodeId = hubNodeId;

    const hubPos = new THREE.Vector3(0, 0, 0);
    this.nodes.set(hubNodeId, hubPos);

    const hubChains = this.getChainsAtNode(hubNodeId);
    
    const totalDirs = hubChains.length * 2;
    const sphereDirs = this.fibonacciSphere(Math.max(totalDirs + 4, 20));
    const usedDirs: THREE.Vector3[] = [];
    const chainDirMap = new Map<string, THREE.Vector3>();

    for (const cid of hubChains) {
      let bestDir = sphereDirs[0];
      let bestMinAngle = 0;

      for (const candidate of sphereDirs) {
        let minAngle = Math.PI;
        for (const used of usedDirs) {
          const dot = Math.max(-1, Math.min(1, candidate.dot(used)));
          minAngle = Math.min(minAngle, Math.acos(dot));
        }
        if (minAngle > bestMinAngle) {
          bestMinAngle = minAngle;
          bestDir = candidate.clone();
        }
      }

      chainDirMap.set(cid, bestDir.clone());
      usedDirs.push(bestDir.clone());
      usedDirs.push(bestDir.clone().negate());
    }

    const hubChainList = this.chains.filter(c => c.nodeIds.includes(hubNodeId));
    this.nodeMainChain.set(hubNodeId, hubChainList[0].id);

    for (const chain of hubChainList) {
      const dir = chainDirMap.get(chain.id)!;
      this.chainDirections.set(chain.id, dir.clone());

      const hubIdx = chain.nodeIds.indexOf(hubNodeId);

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
  }

  getNodePosition(nodeId: string): THREE.Vector3 | null {
    return this.nodes.get(nodeId) || null;
  }

  getMainChainId(nodeId: string): string | null {
    return this.nodeMainChain.get(nodeId) || null;
  }

  getHubNodeId(): string {
    return this.hubNodeId;
  }

  getChainsContainingNode(nodeId: string): string[] {
    return this.getChainsAtNode(nodeId);
  }

  getChainById(chainId: string): Chain | undefined {
    return this.chains.find(c => c.id === chainId);
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
