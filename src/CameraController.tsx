import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
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
  const isFlying = useRef(false);

  const flyStartPos = useRef(new THREE.Vector3());
  const flyStartLookAt = useRef(new THREE.Vector3());
  const flyStartUp = useRef(new THREE.Vector3(0, 1, 0));
  const flyProgress = useRef(0);

  const getControls = () => controls as unknown as OrbitControls;

  const computeCameraUp = (chainDir: THREE.Vector3, lookDir: THREE.Vector3): THREE.Vector3 => {
    const rightDir = chainDir.clone();
    const dot = rightDir.dot(lookDir);
    rightDir.addScaledVector(lookDir, -dot);
    rightDir.normalize();

    const up = new THREE.Vector3()
      .crossVectors(lookDir, rightDir)
      .normalize();

    if (up.y < 0) {
      up.negate();
    }

    return up;
  };

  useEffect(() => {
    if (selectedNodeId && physicsEngine) {
      const nodePos = physicsEngine.getNodePosition(selectedNodeId);
      if (nodePos) {
        const chainDir = physicsEngine.getNodeChainDirection(selectedNodeId).normalize();
        const worldUp = new THREE.Vector3(0, 1, 0);

        const sideDir = new THREE.Vector3();
        const horizontalChainDir = chainDir.clone();
        horizontalChainDir.y = 0;
        if (horizontalChainDir.length() > 0.01) {
          horizontalChainDir.normalize();
          sideDir.crossVectors(horizontalChainDir, worldUp).normalize();
        } else {
          sideDir.set(1, 0, 0);
        }

        const cameraDistance = 35;
        const cameraHeight = 10;

        const cameraPos = nodePos.clone()
          .add(sideDir.clone().multiplyScalar(cameraDistance))
          .add(worldUp.clone().multiplyScalar(cameraHeight));

        const lookDir = nodePos.clone().sub(cameraPos).normalize();
        const cameraUp = computeCameraUp(chainDir, lookDir);

        flyStartPos.current.copy(camera.position);
        flyStartLookAt.current.copy(getControls()?.target || new THREE.Vector3());
        flyStartUp.current.copy(camera.up);
        flyProgress.current = 0;

        targetPosition.current.copy(cameraPos);
        targetLookAt.current.copy(nodePos);
        targetUp.current.copy(cameraUp);
        isFlying.current = true;
        setCameraMode('flying');
      }
    } else {
      flyStartPos.current.copy(camera.position);
      flyStartLookAt.current.copy(getControls()?.target || new THREE.Vector3());
      flyStartUp.current.copy(camera.up);
      flyProgress.current = 0;

      targetPosition.current.set(0, 20, 60);
      targetLookAt.current.set(0, 0, 0);
      targetUp.current.set(0, 1, 0);
      isFlying.current = true;
      setCameraMode('orbit');
    }
  }, [selectedNodeId, physicsEngine, setCameraMode, camera]);

  useFrame(() => {
    if (!isFlying.current) return;

    flyProgress.current = Math.min(flyProgress.current + 0.02, 1);
    const t = flyProgress.current;
    const easeT = t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const midPoint = new THREE.Vector3()
      .lerpVectors(flyStartPos.current, targetPosition.current, 0.5);
    const dist = flyStartPos.current.distanceTo(targetPosition.current);
    midPoint.y += dist * 0.15;

    const a = new THREE.Vector3().lerpVectors(flyStartPos.current, midPoint, easeT);
    const b = new THREE.Vector3().lerpVectors(midPoint, targetPosition.current, easeT);
    camera.position.lerpVectors(a, b, easeT);

    const lookAt = new THREE.Vector3().lerpVectors(
      flyStartLookAt.current,
      targetLookAt.current,
      easeT
    );

    camera.up.lerpVectors(flyStartUp.current, targetUp.current, easeT);
    camera.up.normalize();

    camera.lookAt(lookAt);

    const ctrls = getControls();
    if (ctrls) {
      ctrls.target.copy(lookAt);
    }

    if (t >= 1) {
      isFlying.current = false;
      const ctrls2 = getControls();
      if (ctrls2) {
        ctrls2.target.copy(targetLookAt.current);
        ctrls2.update();
      }
      setCameraMode(selectedNodeId ? 'focused' : 'orbit');
    }
  });

  return null;
}
