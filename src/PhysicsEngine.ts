import * as THREE from 'three';
import { Chain } from './types';

interface NodeState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
}

export class PhysicsEngine {
  private nodes: Map<string, NodeState> = new Map();
  private chains: Chain[] = [];
  private chainDirections: Map<string, THREE.Vector3> = new Map();
  private nodeChainIndex: Map<string, Map<string, number>> = new Map();
  private rotationAngle = 0;

  initializeNodes(nodeIds: string[]) {
    this.nodes.clear();
    nodeIds.forEach((id) => {
      this.nodes.set(id, {
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        ),
        velocity: new THREE.Vector3(0, 0, 0)
      });
    });
  }

  setChains(chains: Chain[]) {
    this.chains = chains;
    this.computeLayout();
  }

  getNodePosition(nodeId: string): THREE.Vector3 | undefined {
    return this.nodes.get(nodeId)?.position;
  }

  getChainDirection(nodeId: string): THREE.Vector3 {
    for (const chain of this.chains) {
      if (chain.nodeIds.includes(nodeId)) {
        return this.chainDirections.get(chain.id) || new THREE.Vector3(0, 0, 1);
      }
    }
    return new THREE.Vector3(0, 0, 1);
  }

  getChainAnchor(nodeId: string): string | null {
    for (const chain of this.chains) {
      if (chain.nodeIds.includes(nodeId)) {
        const sharedNodes = this.getSharedNodes(chain);
        return sharedNodes.length > 0 ? sharedNodes[0] : chain.nodeIds[0];
      }
    }
    return null;
  }

  private getSharedNodes(chain: Chain): string[] {
    const shared: string[] = [];
    for (const nodeId of chain.nodeIds) {
      const chainCount = this.chains.filter(c => c.nodeIds.includes(nodeId)).length;
      if (chainCount > 1) {
        shared.push(nodeId);
      }
    }
    return shared;
  }

  private computeLayout() {
    if (this.chains.length === 0) return;

    const nodeSpacing = 6;

    // 1. 为每个锚点收集经过它的链
    const anchorChains: Map<string, Chain[]> = new Map();
    for (const chain of this.chains) {
      const sharedNodes = this.getSharedNodes(chain);
      const anchor = sharedNodes.length > 0 ? sharedNodes[0] : chain.nodeIds[0];
      if (!anchorChains.has(anchor)) {
        anchorChains.set(anchor, []);
      }
      anchorChains.get(anchor)!.push(chain);
    }

    // 2. 为每个锚点的链分配斐波那契球面方向
    anchorChains.forEach((chainsAtAnchor, _anchor) => {
      const directions = this.fibonacciSphereDirections(chainsAtAnchor.length);
      chainsAtAnchor.forEach((chain, i) => {
        this.chainDirections.set(chain.id, directions[i]);
      });
    });

    // 3. 沿链方向放置节点
    const nodePositions: Map<string, THREE.Vector3[]> = new Map();

    for (const chain of this.chains) {
      const direction = this.chainDirections.get(chain.id)!;
      const sharedNodes = this.getSharedNodes(chain);
      const anchorId = sharedNodes.length > 0 ? sharedNodes[0] : chain.nodeIds[0];
      const anchorIdx = chain.nodeIds.indexOf(anchorId);
      const anchorPos = this.nodes.get(anchorId)?.position || new THREE.Vector3(0, 0, 0);

      for (let i = 0; i < chain.nodeIds.length; i++) {
        const nodeId = chain.nodeIds[i];
        const offset = (i - anchorIdx) * nodeSpacing;
        const pos = anchorPos.clone().add(direction.clone().multiplyScalar(offset));

        if (!nodePositions.has(nodeId)) {
          nodePositions.set(nodeId, []);
        }
        nodePositions.get(nodeId)!.push(pos);

        // 记录节点在链中的索引
        if (!this.nodeChainIndex.has(nodeId)) {
          this.nodeChainIndex.set(nodeId, new Map());
        }
        this.nodeChainIndex.get(nodeId)!.set(chain.id, i);
      }
    }

    // 4. 多链节点取平均位置
    nodePositions.forEach((positions, nodeId) => {
      const avg = new THREE.Vector3();
      for (const pos of positions) {
        avg.add(pos);
      }
      avg.divideScalar(positions.length);

      const node = this.nodes.get(nodeId);
      if (node) {
        node.position.copy(avg);
        node.velocity.set(0, 0, 0);
      }
    });
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

  step(delta: number, isPaused: boolean) {
    const dt = Math.min(delta, 0.05);
    if (dt <= 0) return;

    // 公转
    this.rotationAngle += dt * 0.08;
    this.applyGlobalRotation(dt * 0.08);

    if (isPaused) return;

    const entries = Array.from(this.nodes.entries());
    const forces = new Map<string, THREE.Vector3>();
    entries.forEach(([id]) => forces.set(id, new THREE.Vector3()));

    const springK = 0.3;
    const repulsionK = 120;
    const damping = 0.85;
    const centerK = 0.003;
    const restLength = 6;

    // 弹簧力：同链相邻节点
    for (const chain of this.chains) {
      for (let i = 0; i < chain.nodeIds.length - 1; i++) {
        const a = chain.nodeIds[i];
        const b = chain.nodeIds[i + 1];
        const nodeA = this.nodes.get(a);
        const nodeB = this.nodes.get(b);
        if (!nodeA || !nodeB) continue;

        const diff = new THREE.Vector3().subVectors(nodeB.position, nodeA.position);
        const dist = diff.length();
        if (dist < 0.01) continue;

        const displacement = dist - restLength;
        const force = diff.normalize().multiplyScalar(springK * displacement);
        forces.get(a)!.add(force);
        forces.get(b)!.sub(force);
      }
    }

    // 斥力：所有节点对
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [idA, nodeA] = entries[i];
        const [idB, nodeB] = entries[j];

        const diff = new THREE.Vector3().subVectors(nodeA.position, nodeB.position);
        const dist = diff.length();
        if (dist < 0.1 || dist > 25) continue;

        const forceMag = repulsionK / (dist * dist);
        const force = diff.normalize().multiplyScalar(forceMag);
        forces.get(idA)!.add(force);
        forces.get(idB)!.sub(force);
      }
    }

    // 向心力
    for (const [id, node] of entries) {
      forces.get(id)!.add(node.position.clone().negate().multiplyScalar(centerK));
    }

    // 积分
    for (const [id, node] of entries) {
      const force = forces.get(id)!;
      node.velocity.add(force.multiplyScalar(dt)).multiplyScalar(damping);
      node.position.add(node.velocity.clone().multiplyScalar(dt));
    }
  }

  private applyGlobalRotation(angle: number) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    for (const node of this.nodes.values()) {
      const x = node.position.x * cos - node.position.z * sin;
      const z = node.position.x * sin + node.position.z * cos;
      node.position.set(x, node.position.y, z);
    }
  }
}
