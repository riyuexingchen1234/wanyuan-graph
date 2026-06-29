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
  const isFlying = useRef(false);

  const flyStartPos = useRef(new THREE.Vector3());
  const flyStartLookAt = useRef(new THREE.Vector3());
  const flyProgress = useRef(0);

  useEffect(() => {
    if (selectedNodeId && physicsEngine) {
      const nodePos = physicsEngine.getNodePosition(selectedNodeId);
      if (nodePos) {
        const chainDir = physicsEngine.getNodeChainDirection(selectedNodeId);
        const worldUp = new THREE.Vector3(0, 1, 0);

        const horizontalDir = chainDir.clone();
        horizontalDir.y = 0;
        if (horizontalDir.length() < 0.01) {
          horizontalDir.set(1, 0, 0);
        }
        horizontalDir.normalize();

        const sideDir = new THREE.Vector3()
          .crossVectors(horizontalDir, worldUp)
          .normalize();

        const cameraDistance = 30;
        const cameraHeight = 8;

        const cameraPos = nodePos.clone()
          .add(sideDir.clone().multiplyScalar(cameraDistance))
          .add(worldUp.clone().multiplyScalar(cameraHeight));

        flyStartPos.current.copy(camera.position);
        flyStartLookAt.current.copy(controls?.target || new THREE.Vector3());
        flyProgress.current = 0;

        targetPosition.current.copy(cameraPos);
        targetLookAt.current.copy(nodePos);
        isFlying.current = true;
        setCameraMode('flying');
      }
    } else {
      flyStartPos.current.copy(camera.position);
      flyStartLookAt.current.copy(controls?.target || new THREE.Vector3());
      flyProgress.current = 0;

      targetPosition.current.set(0, 15, 50);
      targetLookAt.current.set(0, 0, 0);
      isFlying.current = true;
      setCameraMode('orbit');
    }
  }, [selectedNodeId, physicsEngine, setCameraMode]);

  useFrame(() => {
    if (!isFlying.current) return;

    flyProgress.current = Math.min(flyProgress.current + 0.025, 1);
    const t = flyProgress.current;
    const easeT = t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const midPoint = new THREE.Vector3()
      .lerpVectors(flyStartPos.current, targetPosition.current, 0.5);
    const dist = flyStartPos.current.distanceTo(targetPosition.current);
    midPoint.y += dist * 0.2;

    const a = new THREE.Vector3().lerpVectors(flyStartPos.current, midPoint, easeT);
    const b = new THREE.Vector3().lerpVectors(midPoint, targetPosition.current, easeT);
    camera.position.lerpVectors(a, b, easeT);

    const lookAt = new THREE.Vector3().lerpVectors(
      flyStartLookAt.current,
      targetLookAt.current,
      easeT
    );
    camera.lookAt(lookAt);

    if (controls) {
      controls.target.copy(lookAt);
    }

    if (t >= 1) {
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
