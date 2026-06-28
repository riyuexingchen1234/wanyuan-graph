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
        const cameraOffset = new THREE.Vector3(0, 0, 15);
        const desiredPosition = nodePos.clone().add(cameraOffset);

        targetPosition.current.copy(desiredPosition);
        targetLookAt.current.copy(nodePos);
        isFlying.current = true;
        setCameraMode('flying');
      }
    } else {
      targetPosition.current.set(0, 0, 50);
      targetLookAt.current.set(0, 0, 0);
      isFlying.current = true;
      setCameraMode('orbit');
    }
  }, [selectedNodeId, physicsEngine, setCameraMode]);

  useFrame(() => {
    if (!isFlying.current) return;

    // 平滑插值相机位置
    camera.position.lerp(targetPosition.current, 0.08);

    // 平滑插值相机朝向
    currentLookAt.current.lerp(targetLookAt.current, 0.08);
    camera.lookAt(currentLookAt.current);

    // 检查是否接近目标
    const distance = camera.position.distanceTo(targetPosition.current);
    if (distance < 0.5) {
      isFlying.current = false;
      if (selectedNodeId) {
        setCameraMode('focused');
      } else {
        setCameraMode('orbit');
      }
    }
  });

  return null;
}
