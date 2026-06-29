import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGraphStore } from './store';
import { PhysicsEngine } from './PhysicsEngine';

interface CameraControllerProps {
  physicsEngine: PhysicsEngine;
}

export function CameraController({ physicsEngine }: CameraControllerProps) {
  const { camera, controls } = useThree();
  const selectedNodeId = useGraphStore(state => state.selectedNodeId);
  const setCameraMode = useGraphStore(state => state.setCameraMode);

  const targetPosition = useRef(new THREE.Vector3(0, 0, 50));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const targetUp = useRef(new THREE.Vector3(0, 1, 0));
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const currentUp = useRef(new THREE.Vector3(0, 1, 0));
  const isFlying = useRef(false);

  useEffect(() => {
    if (selectedNodeId && physicsEngine) {
      const nodePos = physicsEngine.getNodePosition(selectedNodeId);
      if (nodePos) {
        const chainDir = physicsEngine.getNodeChainDirection(selectedNodeId);
        const worldUp = new THREE.Vector3(0, 1, 0);

        const rightDir = chainDir.clone();
        const upComponent = rightDir.dot(worldUp);
        rightDir.add(worldUp.clone().multiplyScalar(-upComponent));
        if (rightDir.length() < 0.01) {
          rightDir.set(1, 0, 0);
        }
        rightDir.normalize();

        const forwardDir = worldUp.clone().cross(rightDir);
        forwardDir.normalize();

        const cameraDistance = 30;
        const cameraPos = nodePos.clone()
          .sub(forwardDir.clone().multiplyScalar(cameraDistance))
          .add(worldUp.clone().multiplyScalar(3));

        targetPosition.current.copy(cameraPos);
        targetLookAt.current.copy(nodePos);
        targetUp.current.copy(worldUp);
        currentLookAt.current.copy(targetLookAt.current);
        currentUp.current.copy(targetUp.current);
        isFlying.current = true;
        setCameraMode('flying');
      }
    } else {
      targetPosition.current.set(0, 0, 50);
      targetLookAt.current.set(0, 0, 0);
      targetUp.current.set(0, 1, 0);
      currentLookAt.current.set(0, 0, 0);
      currentUp.current.set(0, 1, 0);
      isFlying.current = true;
      setCameraMode('orbit');
    }
  }, [selectedNodeId, physicsEngine, setCameraMode]);

  useFrame(() => {
    if (!isFlying.current) return;

    camera.position.lerp(targetPosition.current, 0.06);
    currentLookAt.current.lerp(targetLookAt.current, 0.06);
    currentUp.current.lerp(targetUp.current, 0.06);
    currentUp.current.normalize();
    
    camera.up.copy(currentUp.current);
    camera.lookAt(currentLookAt.current);

    const distance = camera.position.distanceTo(targetPosition.current);
    if (distance < 0.5) {
      isFlying.current = false;
      
      if (controls) {
        controls.target.copy(targetLookAt.current);
        controls.update();
      }
      
      setCameraMode(selectedNodeId ? 'focused' : 'orbit');
    }
  });

  return null;
}
