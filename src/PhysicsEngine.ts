import * as THREE from 'three';
import { Chain } from './types';

export class PhysicsEngine {
  private nodes: Map<string, THREE.Vector3> = new Map();
  private chains: Chain[] = [];
  private chainDirections: Map<string, THREE.Vector3> = new Map();
  private nodeChainIndex: Map<string, Map<string, number>> = new Map();
  private nodeMainChain: Map<string, string> = new Map();

  getNodePosition(nodeId: string): THREE.Vector3 | undefined {
    return this.nodes.get(nodeId);
  }

  getChainDirection(nodeId: string): THREE.Vector3 {
    const chainId = this.nodeMainChain.get(nodeId);
    if (chainId) {
      return this.chainDirections.get(chainId) || new THREE.Vector3(0, 0, 1);
    }
    for (const chain of this.chains) {
      if (chain.nodeIds.includes(nodeId)) {
        return this.chainDirections.get(chain.id) || new THREE.Vector3(0, 0, 1);
      }
    }
    return new THREE.Vector3(0, 0, 1);
  }

  getChainAnchor(nodeId: string): string | null {
    const chainId = this.nodeMainChain.get(nodeId);
    if (chainId) {
      const chain = this.chains.find(c => c.id === chainId);
      if (chain) {
        const sharedNodes = this.getSharedNodesInChain(chain);
        return sharedNodes.length > 0 ? sharedNodes[0] : chain.nodeIds[0];
      }
    }
    for (const chain of this.chains) {
      if (chain.nodeIds.includes(nodeId)) {
        const sharedNodes = this.getSharedNodesInChain(chain);
        return sharedNodes.length > 0 ? sharedNodes[0] : chain.nodeIds[0];
      }
    }
    return null;
  }

  private getSharedNodesInChain(chain: Chain): string[] {
    const shared: string[] = [];
    for (const nodeId of chain.nodeIds) {
      const chainCount = this.chains.filter(c => c.nodeIds.includes(nodeId)).length;
      if (chainCount > 1) {
        shared.push(nodeId);
      }
    }
    return shared;
  }

  setChains(chains: Chain[]) {
    this.chains = chains;
    this.computeLayout();
  }

  private computeLayout() {
    if (this.chains.length === 0) return;

    const nodeSpacing = 6;

    this.nodes.clear();
    this.chainDirections.clear();
    this.nodeChainIndex.clear();
    this.nodeMainChain.clear();

    const nodeChainCount: Map<string, number> = new Map();
    for (const chain of this.chains) {
      for (const nodeId of chain.nodeIds) {
        nodeChainCount.set(nodeId, (nodeChainCount.get(nodeId) || 0) + 1);
      }
    }

    const isSharedNode = (nodeId: string) => (nodeChainCount.get(nodeId) || 0) > 1;

    const anchorChains: Map<string, Chain[]> = new Map();
    for (const chain of this.chains) {
      const sharedNodes = chain.nodeIds.filter(id => isSharedNode(id));
      const anchor = sharedNodes.length > 0 ? sharedNodes[0] : chain.nodeIds[0];
      if (!anchorChains.has(anchor)) {
        anchorChains.set(anchor, []);
      }
      anchorChains.get(anchor)!.push(chain);
    }

    const visitedNodes: Set<string> = new Set();
    const placedChains: Set<string> = new Set();

    const placeChain = (chain: Chain, anchorId: string, direction: THREE.Vector3) => {
      if (placedChains.has(chain.id)) return;
      placedChains.add(chain.id);

      this.chainDirections.set(chain.id, direction);

      const anchorIdx = chain.nodeIds.indexOf(anchorId);
      const anchorPos = this.nodes.get(anchorId) || new THREE.Vector3(0, 0, 0);

      if (!this.nodes.has(anchorId)) {
        this.nodes.set(anchorId, anchorPos.clone());
      }
      visitedNodes.add(anchorId);

      if (!this.nodeChainIndex.has(anchorId)) {
        this.nodeChainIndex.set(anchorId, new Map());
      }
      this.nodeChainIndex.get(anchorId)!.set(chain.id, anchorIdx);

      if (!this.nodeMainChain.has(anchorId)) {
        this.nodeMainChain.set(anchorId, chain.id);
      }

      for (let i = 0; i < chain.nodeIds.length; i++) {
        const nodeId = chain.nodeIds[i];
        const offset = (i - anchorIdx) * nodeSpacing;
        const pos = anchorPos.clone().add(direction.clone().multiplyScalar(offset));

        if (!this.nodes.has(nodeId)) {
          this.nodes.set(nodeId, pos);
        }

        if (!this.nodeChainIndex.has(nodeId)) {
          this.nodeChainIndex.set(nodeId, new Map());
        }
        this.nodeChainIndex.get(nodeId)!.set(chain.id, i);

        if (!this.nodeMainChain.has(nodeId)) {
          this.nodeMainChain.set(nodeId, chain.id);
        }

        visitedNodes.add(nodeId);

        if (isSharedNode(nodeId) && nodeId !== anchorId) {
          const connectedChains = anchorChains.get(nodeId) || [];
          const otherChains = connectedChains.filter(c => c.id !== chain.id && !placedChains.has(c.id));
          
          if (otherChains.length > 0) {
            const directions = this.fibonacciSphereDirections(connectedChains.length);
            const currentChainIdx = connectedChains.findIndex(c => c.id === chain.id);
            const oppositeDir = direction.clone().negate();
            
            let dirIdx = 0;
            for (let j = 0; j < connectedChains.length; j++) {
              if (connectedChains[j].id === chain.id) continue;
              if (placedChains.has(connectedChains[j].id)) continue;
              
              let newDir: THREE.Vector3;
              if (dirIdx === 0) {
                newDir = oppositeDir;
              } else {
                newDir = directions[(currentChainIdx + dirIdx + 1) % directions.length];
              }
              
              placeChain(connectedChains[j], nodeId, newDir);
              dirIdx++;
            }
          }
        }
      }
    };

    const firstChain = this.chains[0];
    const firstShared = firstChain.nodeIds.filter(id => isSharedNode(id));
    const firstAnchor = firstShared.length > 0 ? firstShared[0] : firstChain.nodeIds[0];

    const initialChains = anchorChains.get(firstAnchor) || [firstChain];
    const initialDirections = this.fibonacciSphereDirections(initialChains.length);

    for (let i = 0; i < initialChains.length; i++) {
      placeChain(initialChains[i], firstAnchor, initialDirections[i]);
    }

    for (const chain of this.chains) {
      if (!placedChains.has(chain.id)) {
        const sharedNodes = chain.nodeIds.filter(id => isSharedNode(id) && this.nodes.has(id));
        if (sharedNodes.length > 0) {
          const anchor = sharedNodes[0];
          const connectedChains = anchorChains.get(anchor) || [];
          const directions = this.fibonacciSphereDirections(connectedChains.length);
          const idx = connectedChains.findIndex(c => c.id === chain.id);
          placeChain(chain, anchor, directions[idx]);
        } else {
          const dir = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
          ).normalize();
          placeChain(chain, chain.nodeIds[0], dir);
        }
      }
    }
  }

  private fibonacciSphereDirections(count: number): THREE.Vector3[] {
    const directions: THREE.Vector3[] = [];
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1 || 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = 2 * Math.PI * i / goldenRatio;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      directions.push(new THREE.Vector3(x, y, z).normalize());
    }

    return directions;
  }

  step(_delta: number, _isPaused: boolean) {
  }
}
