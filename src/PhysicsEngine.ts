import * as THREE from 'three';

export class PhysicsEngine {
  private nodes: Map<string, { position: THREE.Vector3; velocity: THREE.Vector3 }> = new Map();
  private relationships: Array<{ source: string; target: string }> = [];

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

  step(delta: number, isPaused: boolean) {
    const clampedDelta = Math.min(delta, 0.05);

    if (!isPaused) {
      const rotationSpeed = 0.1;
      const rotationAngle = rotationSpeed * clampedDelta;
      this.applyGlobalRotation(rotationAngle);
    }

    if (isPaused) return;

    const springK = 0.01;
    const repulsionK = 100;
    const damping = 0.95;

    const nodeEntries = Array.from(this.nodes.entries());
    const forces = new Map<string, THREE.Vector3>();

    nodeEntries.forEach(([nodeId]) => {
      forces.set(nodeId, new THREE.Vector3(0, 0, 0));
    });

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
          const restLength = 8;
          const displacement = distance - restLength;
          forceMagnitude = -springK * displacement;
        } else if (distance < 15) {
          forceMagnitude = repulsionK / (distance * distance);
        }

        if (forceMagnitude !== 0) {
          const force = diff.normalize().multiplyScalar(forceMagnitude);
          forces.get(nodeId)!.add(force);
          forces.get(otherId)!.sub(force);
        }
      }
    }

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
