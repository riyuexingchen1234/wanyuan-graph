import * as THREE from 'three';

export interface PhysicsNode {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  mass: number;
}

export class PhysicsEngine {
  private nodes: Map<string, PhysicsNode> = new Map();
  private relationships: Array<{ source: string; target: string }>;
  private rotationTime = 0;

  constructor() {
    this.relationships = [];
  }

  initializeNodes(nodeIds: string[]) {
    nodeIds.forEach((id, index) => {
      const angle = (index / nodeIds.length) * Math.PI * 2;
      const radius = 20 + Math.random() * 10;

      this.nodes.set(id, {
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * 20,
          Math.sin(angle) * radius
        ),
        velocity: new THREE.Vector3(0, 0, 0),
        mass: 1,
      });
    });
  }

  setRelationships(rels: Array<{ source: string; target: string }>) {
    this.relationships = rels;
  }

  getNodePosition(nodeId: string): THREE.Vector3 | undefined {
    return this.nodes.get(nodeId)?.position;
  }

  step(delta: number, isPaused: boolean) {
    const clampedDelta = Math.min(delta, 0.05);

    // 公转（仅在未暂停时）
    if (!isPaused) {
      this.rotationTime += clampedDelta;
      const rotationSpeed = 0.1;
      const rotationAngle = rotationSpeed * clampedDelta;
      this.applyGlobalRotation(rotationAngle);
    }

    // 物理模拟（暂停时跳过）
    if (isPaused) return;

    const springK = 0.01;
    const repulsionK = 100;
    const damping = 0.95;

    const nodeEntries = Array.from(this.nodes.entries());

    // 计算力
    nodeEntries.forEach(([nodeId, node]) => {
      const force = new THREE.Vector3(0, 0, 0);

      nodeEntries.forEach(([otherId, other]) => {
        if (nodeId === otherId) return;

        const diff = new THREE.Vector3().subVectors(node.position, other.position);
        const distance = diff.length();

        const hasConnection = this.relationships.some(
          rel => (rel.source === nodeId && rel.target === otherId) ||
                 (rel.target === nodeId && rel.source === otherId)
        );

        if (hasConnection) {
          const restLength = 8;
          const displacement = distance - restLength;
          const springForce = diff.normalize().multiplyScalar(-springK * displacement);
          force.add(springForce);
        } else if (distance < 15 && distance > 0.1) {
          const repulsionForce = diff.normalize().multiplyScalar(repulsionK / (distance * distance));
          force.add(repulsionForce);
        }
      });

      node.velocity.add(force.multiplyScalar(clampedDelta)).multiplyScalar(damping);
    });

    // 更新位置
    nodeEntries.forEach(([_, node]) => {
      node.position.add(node.velocity.clone().multiplyScalar(clampedDelta));
    });
  }

  private applyGlobalRotation(angle: number) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    this.nodes.forEach(node => {
      const x = node.position.x * cos - node.position.z * sin;
      const z = node.position.x * sin + node.position.z * cos;
      node.position.set(x, node.position.y, z);
    });
  }
}
