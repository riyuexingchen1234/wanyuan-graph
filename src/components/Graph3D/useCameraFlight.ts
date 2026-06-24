import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { NodePosition } from '../../store/graphStore';
import { useGraphStore } from '../../store/graphStore';

export function useCameraFlight() {
  const { camera, controls } = useThree();
  const cameraTarget = useGraphStore((state) => state.cameraTarget);
  const cameraDistance = useGraphStore((state) => state.cameraDistance);
  const focusNodeId = useGraphStore((state) => state.focusNodeId);

  const targetPos = useRef(new THREE.Vector3(0, 0, 0));
  const targetDistance = useRef(20);
  const isAnimating = useRef(false);

  useEffect(() => {
    targetPos.current.set(cameraTarget.x, cameraTarget.y, cameraTarget.z);
    targetDistance.current = cameraDistance;
    isAnimating.current = true;
  }, [cameraTarget, cameraDistance, focusNodeId]);

  useFrame(() => {
    if (!controls) return;

    if (isAnimating.current) {
      const currentTarget = new THREE.Vector3();
      (controls as any).target.clone(currentTarget);

      currentTarget.lerp(targetPos.current, 0.05);
      (controls as any).target.copy(currentTarget);

      const desiredCameraPos = targetPos.current.clone();
      const direction = camera.position.clone().sub(currentTarget).normalize();
      desiredCameraPos.add(direction.multiplyScalar(targetDistance.current));

      camera.position.lerp(desiredCameraPos, 0.05);

      const dist = currentTarget.distanceTo(targetPos.current);
      if (dist < 0.01) {
        isAnimating.current = false;
      }
    }
  });

  return null;
}
