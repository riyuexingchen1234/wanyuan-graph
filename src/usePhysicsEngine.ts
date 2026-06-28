import { useRef } from 'react';
import * as THREE from 'three';
import { useGraphStore } from './store';

interface PhysicsNode {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  mass: number;
}

export function usePhysicsEngine() {
  const data = useGraphStore(state => state.data);
  const nodesRef = useRef<Map<string, PhysicsNode>>(new Map());
  const isInitialized = useRef(false);

  // 初始化节点
  if (data && !isInitialized.current) {
    data.nodes.forEach((node, index) => {
      const angle = (index / data.nodes.length) * Math.PI * 2;
      const radius = 20 + Math.random() * 10;
      
      nodesRef.current.set(node.id, {
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * 20,
          Math.sin(angle) * radius
        ),
        velocity: new THREE.Vector3(0, 0, 0),
        mass: 1,
      });
    });
    isInitialized.current = true;
  }

  // 获取节点位置
  const getNodePosition = (nodeId: string): THREE.Vector3 | undefined => {
    return nodesRef.current.get(nodeId)?.position;
  };

  // 物理模拟步进
  const step = (delta: number, isPaused: boolean) => {
    if (!data || isPaused) return;

    const clampedDelta = Math.min(delta, 0.05);
    const springK = 0.01;
    const repulsionK = 100;
    const damping = 0.95;

    const nodes = Array.from(nodesRef.current.entries());

    // 计算力
    nodes.forEach(([nodeId, node]) => {
      const force = new THREE.Vector3(0, 0, 0);

      nodes.forEach(([otherId, other]) => {
        if (nodeId === otherId) return;

        const diff = new THREE.Vector3().subVectors(node.position, other.position);
        const distance = diff.length();

        const hasConnection = data.relationships.some(
          rel => (rel.sourceId === nodeId && rel.targetId === otherId) ||
                 (rel.targetId === nodeId && rel.sourceId === otherId)
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
    nodes.forEach(([_, node]) => {
      node.position.add(node.velocity.clone().multiplyScalar(clampedDelta));
    });
  };

  // 全局旋转
  const rotate = (angle: number) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    nodesRef.current.forEach(node => {
      const x = node.position.x * cos - node.position.z * sin;
      const z = node.position.x * sin + node.position.z * cos;
      node.position.set(x, node.position.y, z);
    });
  };

  return { getNodePosition, step, rotate, nodesRef };
}
