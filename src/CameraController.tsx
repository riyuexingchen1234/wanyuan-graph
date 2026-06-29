import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGraphStore } from './store';
import { PhysicsEngine } from './PhysicsEngine';

interface CameraControllerProps {
  physicsEngine: PhysicsEngine;
}

export function CameraController({ physicsEngine }: CameraControllerProps) {
  const { camera } = useThree();
  const selectedNodeId = useGraphStore(state => state.selectedNodeId);
  const setCameraMode = useGraphStore(state => state.setCameraMode);

  const targetPosition = useRef(new THREE.Vector3(0, 0, 50));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const isFlying = useRef(false);

  useEffect(() => {
    if (selectedNodeId && physicsEngine) {
      const nodePos = physicsEngine.getNodePosition(selectedNodeId);
      if (nodePos) {
        // 沿链的反方向后退，看向锚点
        const chainDir = physicsEngine.getChainDirection(selectedNodeId);
        const anchorId = physicsEngine.getChainAnchor(selectedNodeId);
        const anchorPos = anchorId ? physicsEngine.getNodePosition(anchorId) : null;

        // 相机位置：从节点位置沿链反方向后退 20 个单位
        const cameraPos = nodePos.clone().sub(chainDir.clone().multiplyScalar(20));
        // 稍微抬高，获得更好的视角
        cameraPos.y += 5;

        targetPosition.current.copy(cameraPos);
        targetLookAt.current.copy(anchorPos || nodePos);
        currentLookAt.current.copy(targetLookAt.current);
        isFlying.current = true;
        setCameraMode('flying');
      }
    } else {
      targetPosition.current.set(0, 0, 50);
      targetLookAt.current.set(0, 0, 0);
      currentLookAt.current.set(0, 0, 0);
      isFlying.current = true;
      setCameraMode('orbit');
    }
  }, [selectedNodeId, physicsEngine, setCameraMode]);

  useFrame(() => {
    if (!isFlying.current) return;

    camera.position.lerp(targetPosition.current, 0.06);
    currentLookAt.current.lerp(targetLookAt.current, 0.06);
    camera.lookAt(currentLookAt.current);

    const distance = camera.position.distanceTo(targetPosition.current);
    if (distance < 0.5) {
      isFlying.current = false;
      setCameraMode(selectedNodeId ? 'focused' : 'orbit');
    }
  });

  return null;
}
