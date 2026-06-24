import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGraphStore } from '../../store/graphStore';

export function useCameraFlight() {
  const { camera, controls } = useThree();
  const cameraTarget = useGraphStore((state) => state.cameraTarget);
  const cameraDistance = useGraphStore((state) => state.cameraDistance);
  const focusNodeId = useGraphStore((state) => state.focusNodeId);

  const targetPos = useRef(new THREE.Vector3(0, 0, 0));
  const targetDistance = useRef(30);
  const animationProgress = useRef(0);
  const startPos = useRef(new THREE.Vector3(0, 0, 0));
  const startTarget = useRef(new THREE.Vector3(0, 0, 0));
  const startDistance = useRef(30);
  const isAnimating = useRef(false);
  const lastFocusId = useRef<string | null>(null);

  useEffect(() => {
    if (focusNodeId && focusNodeId !== lastFocusId.current) {
      lastFocusId.current = focusNodeId;

      startPos.current.copy(camera.position);
      if (controls) {
        (controls as any).target.clone(startTarget.current);
      }
      startDistance.current = camera.position.distanceTo(startTarget.current);

      targetPos.current.set(cameraTarget.x, cameraTarget.y, cameraTarget.z);
      targetDistance.current = cameraDistance;

      animationProgress.current = 0;
      isAnimating.current = true;
    }
  }, [focusNodeId, camera, controls, cameraTarget, cameraDistance]);

  const easeInOutCubic = (t: number) => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  useFrame((_, delta) => {
    if (!controls) return;

    if (isAnimating.current) {
      animationProgress.current += delta * 0.8;
      if (animationProgress.current >= 1) {
        animationProgress.current = 1;
        isAnimating.current = false;
      }

      const t = easeInOutCubic(animationProgress.current);

      const currentTarget = new THREE.Vector3();
      currentTarget.lerpVectors(startTarget.current, targetPos.current, t);
      (controls as any).target.copy(currentTarget);

      const direction = startPos.current.clone().sub(startTarget.current).normalize();
      const currentDist = startDistance.current + (targetDistance.current - startDistance.current) * t;
      const desiredCameraPos = currentTarget.clone().add(direction.multiplyScalar(currentDist));

      camera.position.copy(desiredCameraPos);
    }
  });

  return null;
}
