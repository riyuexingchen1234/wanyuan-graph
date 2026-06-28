import * as THREE from 'three';

export class PhysicsEngine {
  private nodes: Map<string, { position: THREE.Vector3; velocity: THREE.Vector3 }> = new Map();
  private relationships: Array<{ source: string; target: string }> = [];
  private constraints: Map<string, THREE.Vector3> = new Map();
  private rotationTime = 0;

  initializeNodes(nodeIds: string[]) {
    nodeIds.forEach((id, index) => {
      const angle = (index / nodeIds.length) * Math.PI * 2;
      const radius = 15 + Math.random() * 8;

      this.nodes.set(id, {
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * 15,
          Math.sin(angle) * radius
        ),
        velocity: new THREE.Vector3(0, 0, 0)
      });
    });
  }

  setRelationships(rels: Array<{ source: string; target: string }>) {
    this.relationships = rels;
  }

  getNodePosition(nodeId: string): THREE.Vector3 | undefined {
    return this.nodes.get(nodeId)?.position;
  }

  applyConstraints(selectedNodeId: string) {
    this.constraints.clear();

    // BFS 找上游（反向边）
    const upstream = new Map<string, number>();
    const queue = [selectedNodeId];
    const visited = new Set<string>([selectedNodeId]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const dist = upstream.get(current) ?? 0;

      for (const rel of this.relationships) {
        if (rel.target === current && !visited.has(rel.source)) {
          visited.add(rel.source);
          upstream.set(rel.source, dist + 1);
          queue.push(rel.source);
        }
      }
    }

    // BFS 找下游（正向边）
    const downstream = new Map<string, number>();
    const queue2 = [selectedNodeId];
    const visited2 = new Set<string>([selectedNodeId]);

    while (queue2.length > 0) {
      const current = queue2.shift()!;
      const dist = downstream.get(current) ?? 0;

      for (const rel of this.relationships) {
        if (rel.source === current && !visited2.has(rel.target)) {
          visited2.add(rel.target);
          downstream.set(rel.target, dist + 1);
          queue2.push(rel.target);
        }
      }
    }

    // 设置约束位置：上游在左，下游在右
    upstream.forEach((dist, nodeId) => {
      if (nodeId === selectedNodeId) return;
      this.constraints.set(nodeId, new THREE.Vector3(
        -dist * 8,
        (dist - 1) * 2,
        0
      ));
    });

    downstream.forEach((dist, nodeId) => {
      if (nodeId === selectedNodeId) return;
      this.constraints.set(nodeId, new THREE.Vector3(
        dist * 8,
        (dist - 1) * 2,
        0
      ));
    });

    // 选中节点本身居中
    this.constraints.set(selectedNodeId, new THREE.Vector3(0, 0, 0));
  }

  clearConstraints() {
    this.constraints.clear();
  }

  step(delta: number, isPaused: boolean) {
    const clampedDelta = Math.min(delta, 0.05);

    // 公转（仅在无约束时）
    if (this.constraints.size === 0) {
      this.rotationTime += clampedDelta;
      const rotationSpeed = 0.08;
      const rotationAngle = rotationSpeed * clampedDelta;
      this.applyGlobalRotation(rotationAngle);
    }

    // 物理模拟（暂停时跳过）
    if (isPaused) return;

    const springK = 0.15;
    const repulsionK = 80;
    const damping = 0.88;
    const centerK = 0.002;

    const nodeEntries = Array.from(this.nodes.entries());
    const forces = new Map<string, THREE.Vector3>();

    nodeEntries.forEach(([nodeId]) => {
      forces.set(nodeId, new THREE.Vector3(0, 0, 0));
    });

    // 约束力（最强，优先保证排列效果）
    this.constraints.forEach((targetPos, nodeId) => {
      const node = this.nodes.get(nodeId);
      if (!node) return;

      const diff = new THREE.Vector3().subVectors(targetPos, node.position);
      const distance = diff.length();

      if (distance > 0.1) {
        const force = diff.normalize().multiplyScalar(distance * 0.5);
        forces.get(nodeId)!.add(force);
      }
    });

    // 节点间作用力
    for (let i = 0; i < nodeEntries.length; i++) {
      for (let j = i + 1; j < nodeEntries.length; j++) {
        const [nodeId, node] = nodeEntries[i];
        const [otherId, other] = nodeEntries[j];

        const diff = new THREE.Vector3().subVectors(node.position, other.position);
        const distance = diff.length();

        if (distance < 0.1) continue;

        const hasConnection = this.relationships.some(
          rel => (rel.source === nodeId && rel.target === otherId) ||
                 (rel.target === nodeId && rel.source === otherId)
        );

        let forceMagnitude = 0;

        if (hasConnection) {
          const restLength = 6;
          const displacement = distance - restLength;
          forceMagnitude = -springK * displacement;
        } else if (distance < 12) {
          forceMagnitude = repulsionK / (distance * distance);
        }

        if (forceMagnitude !== 0) {
          const force = diff.normalize().multiplyScalar(forceMagnitude);
          forces.get(nodeId)!.add(force);
          forces.get(otherId)!.sub(force);
        }
      }
    }

    // 向心力（防止节点飘太远）
    nodeEntries.forEach(([nodeId, node]) => {
      const centerForce = node.position.clone().negate().multiplyScalar(centerK);
      forces.get(nodeId)!.add(centerForce);
    });

    // 更新速度和位置
    nodeEntries.forEach(([nodeId, node]) => {
      const force = forces.get(nodeId)!;
      node.velocity.add(force.multiplyScalar(clampedDelta)).multiplyScalar(damping);
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
