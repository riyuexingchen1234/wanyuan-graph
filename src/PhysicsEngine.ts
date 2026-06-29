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

  private getChainSegmentsAtNode(chainId: string, nodeId: string): {
    fwd: { nodes: string[], hasShared: boolean, nextShared: string | null };
    bwd: { nodes: string[], hasShared: boolean, nextShared: string | null };
  } {
    const chain = this.chains.find(c => c.id === chainId);
    if (!chain) return { fwd: { nodes: [], hasShared: false, nextShared: null }, bwd: { nodes: [], hasShared: false, nextShared: null } };
    
    const idx = chain.nodeIds.indexOf(nodeId);
    if (idx < 0) return { fwd: { nodes: [], hasShared: false, nextShared: null }, bwd: { nodes: [], hasShared: false, nextShared: null } };
    
    const fwdNodes: string[] = [];
    let fwdShared: string | null = null;
    for (let i = idx + 1; i < chain.nodeIds.length; i++) {
      const nid = chain.nodeIds[i];
      fwdNodes.push(nid);
      if (this.getChainsAtNode(nid).length > 1) {
        fwdShared = nid;
        break;
      }
    }
    
    const bwdNodes: string[] = [];
    let bwdShared: string | null = null;
    for (let i = idx - 1; i >= 0; i--) {
      const nid = chain.nodeIds[i];
      bwdNodes.push(nid);
      if (this.getChainsAtNode(nid).length > 1) {
        bwdShared = nid;
        break;
      }
    }
    
    return {
      fwd: { nodes: fwdNodes, hasShared: !!fwdShared, nextShared: fwdShared },
      bwd: { nodes: bwdNodes, hasShared: !!bwdShared, nextShared: bwdShared }
    };
  }

  private evaluateDirection(
    candidateDir: THREE.Vector3,
    nodePos: THREE.Vector3,
    usedDirs: THREE.Vector3[],
    allPlacedPositions: THREE.Vector3[],
    segLen: number
  ): number {
    let minAngle = Math.PI;
    for (const used of usedDirs) {
      const dot = Math.max(-1, Math.min(1, candidateDir.dot(used)));
      minAngle = Math.min(minAngle, Math.acos(dot));
    }

    let minDist = Infinity;
    const probePos = nodePos.clone().add(candidateDir.clone().multiplyScalar(segLen));
    for (const pos of allPlacedPositions) {
      const d = probePos.distanceTo(pos);
      if (d < minDist) minDist = d;
    }

    const angleScore = minAngle / Math.PI;
    const distScore = Math.min(minDist / (this.spacing * 2), 1);
    
    return angleScore * 0.5 + distScore * 0.5;
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

    const placedChains = new Set<string>();
    const placedNodes = new Set<string>([hubNodeId]);
    const allPositions: THREE.Vector3[] = [hubPos.clone()];

    const hubChains = this.getChainsAtNode(hubNodeId);
    const hubChainList = this.chains.filter(c => c.nodeIds.includes(hubNodeId));
    this.nodeMainChain.set(hubNodeId, hubChainList[0].id);

    const totalDirs = hubChains.length * 2;
    const sphereDirs = this.fibonacciSphere(Math.max(totalDirs * 3, 30));
    const usedDirs: THREE.Vector3[] = [];
    const chainDirMap = new Map<string, THREE.Vector3>();

    for (const cid of hubChains) {
      let bestDir = sphereDirs[0];
      let bestScore = -1;

      for (const candidate of sphereDirs) {
        const score = this.evaluateDirection(
          candidate, hubPos, usedDirs, allPositions, this.spacing * 3
        );
        if (score > bestScore) {
          bestScore = score;
          bestDir = candidate.clone();
        }
      }

      chainDirMap.set(cid, bestDir.clone());
      usedDirs.push(bestDir.clone());
      usedDirs.push(bestDir.clone().negate());

      const dir = bestDir.clone();
      this.chainDirections.set(cid, dir.clone());
      placedChains.add(cid);

      const hubIdx = hubChainList.find(c => c.id === cid)!.nodeIds.indexOf(hubNodeId);

      for (let i = hubIdx + 1; i < hubChainList.find(c => c.id === cid)!.nodeIds.length; i++) {
        const nodeId = hubChainList.find(c => c.id === cid)!.nodeIds[i];
        if (!placedNodes.has(nodeId)) {
          const offset = (i - hubIdx) * this.spacing;
          const pos = hubPos.clone().add(dir.clone().multiplyScalar(offset));
          this.nodes.set(nodeId, pos);
          placedNodes.add(nodeId);
          allPositions.push(pos.clone());
          this.nodeMainChain.set(nodeId, cid);
        }
      }

      const negDir = dir.clone().negate();
      for (let i = hubIdx - 1; i >= 0; i--) {
        const nodeId = hubChainList.find(c => c.id === cid)!.nodeIds[i];
        if (!placedNodes.has(nodeId)) {
          const offset = (hubIdx - i) * this.spacing;
          const pos = hubPos.clone().add(negDir.clone().multiplyScalar(offset));
          this.nodes.set(nodeId, pos);
          placedNodes.add(nodeId);
          allPositions.push(pos.clone());
          this.nodeMainChain.set(nodeId, cid);
        }
      }
    }

    const queue: string[] = [];
    const visited = new Set<string>();
    for (const nodeId of placedNodes) {
      if (this.getChainsAtNode(nodeId).length > 1 && nodeId !== hubNodeId) {
        queue.push(nodeId);
      }
    }

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const nodePos = this.nodes.get(nodeId);
      if (!nodePos) continue;

      const chainsHere = this.getChainsAtNode(nodeId);
      const unplacedChains = chainsHere.filter(cid => !placedChains.has(cid));
      const placedHere = chainsHere.filter(cid => placedChains.has(cid));

      if (unplacedChains.length === 0) continue;

      const usedDirsLocal: THREE.Vector3[] = [];
      for (const cid of placedHere) {
        const chainDir = this.chainDirections.get(cid);
        if (!chainDir) continue;
        const segs = this.getChainSegmentsAtNode(cid, nodeId);
        if (segs.fwd.nodes.length > 0) {
          usedDirsLocal.push(chainDir.clone());
        }
        if (segs.bwd.nodes.length > 0) {
          usedDirsLocal.push(chainDir.clone().negate());
        }
      }

      const totalNeeded = usedDirsLocal.length + unplacedChains.length * 2;
      const sphereDirsLocal = this.fibonacciSphere(Math.max(totalNeeded * 3, 30));

      for (const cid of unplacedChains) {
        let bestDir = sphereDirsLocal[0];
        let bestScore = -1;

        for (const candidate of sphereDirsLocal) {
          const score = this.evaluateDirection(
            candidate, nodePos, usedDirsLocal, allPositions, this.spacing * 2
          );
          if (score > bestScore) {
            bestScore = score;
            bestDir = candidate.clone();
          }
        }

        this.chainDirections.set(cid, bestDir.clone());
        usedDirsLocal.push(bestDir.clone());
        usedDirsLocal.push(bestDir.clone().negate());
        placedChains.add(cid);

        const chain = this.chains.find(c => c.id === cid)!;
        const nodeIdx = chain.nodeIds.indexOf(nodeId);

        let fwdDir = bestDir.clone();
        let fwdCount = 0;
        for (let i = nodeIdx + 1; i < chain.nodeIds.length; i++) {
          const nid = chain.nodeIds[i];
          if (!placedNodes.has(nid)) {
            fwdCount++;
            const pos = nodePos.clone().add(fwdDir.clone().multiplyScalar(fwdCount * this.spacing));
            this.nodes.set(nid, pos);
            placedNodes.add(nid);
            allPositions.push(pos.clone());
            this.nodeMainChain.set(nid, cid);
          }
          if (this.getChainsAtNode(nid).length > 1 && !visited.has(nid)) {
            queue.push(nid);
          }
        }

        const bwdDir = bestDir.clone().negate();
        let bwdCount = 0;
        for (let i = nodeIdx - 1; i >= 0; i--) {
          const nid = chain.nodeIds[i];
          if (!placedNodes.has(nid)) {
            bwdCount++;
            const pos = nodePos.clone().add(bwdDir.clone().multiplyScalar(bwdCount * this.spacing));
            this.nodes.set(nid, pos);
            placedNodes.add(nid);
            allPositions.push(pos.clone());
            this.nodeMainChain.set(nid, cid);
          }
          if (this.getChainsAtNode(nid).length > 1 && !visited.has(nid)) {
            queue.push(nid);
          }
        }
      }
    }

    for (const chain of this.chains) {
      if (placedChains.has(chain.id)) continue;

      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();
      const midIdx = Math.floor(chain.nodeIds.length / 2);
      const origin = new THREE.Vector3(
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 80
      );

      this.chainDirections.set(chain.id, dir);
      placedChains.add(chain.id);
      for (let i = 0; i < chain.nodeIds.length; i++) {
        const nodeId = chain.nodeIds[i];
        if (!placedNodes.has(nodeId)) {
          const offset = (i - midIdx) * this.spacing;
          const pos = origin.clone().add(dir.clone().multiplyScalar(offset));
          this.nodes.set(nodeId, pos);
          placedNodes.add(nodeId);
          this.nodeMainChain.set(nodeId, chain.id);
        }
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
