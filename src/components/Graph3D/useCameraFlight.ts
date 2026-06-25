import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGraphStore } from '../../store/graphStore';

export function useCameraFlight() {
  const { camera, controls } = useThree();
  const cameraTarget = useGraphStore((state) => state.cameraTarget);
  const cameraDistance = useGraphStore((state) => state.cameraDistance);
  const focusNodeId = useGraphStore((state) => state.focusNodeId);
  const mode = useGraphStore((state) => state.mode);

  const targetLookAt = useRef(new THREE.Vector3(0, 0, -80));
  const targetCamPos = useRef(new THREE.Vector3(0, 5, 20));
  const animationProgress = useRef(0);
  const startPos = useRef(new THREE.Vector3(0, 5, 20));
  const startLookAt = useRef(new THREE.Vector3(0, 0, -80));
  const isAnimating = useRef(false);
  const lastFocusId = useRef<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && controls) {
      initialized.current = true;
      camera.position.set(0, 5, 20);
      (controls as any).target.set(0, 0, -80);
      (controls as any).update();
      targetLookAt.current.set(0, 0, -80);
      targetCamPos.current.set(0, 5, 20);
    }
  }, [camera, controls]);

  useEffect(() => {
    if (!focusNodeId || focusNodeId === lastFocusId.current) return;
    lastFocusId.current = focusNodeId;

    startPos.current.copy(camera.position);
    if (controls) {
      (controls as any).target.clone(startLookAt.current);
    }

    const target = new THREE.Vector3(cameraTarget.x, cameraTarget.y, cameraTarget.z);
    targetLookAt.current.copy(target);

    const polarAngle = Math.PI / 2.5;
    const azimuth = 0;

    const camX = target.x + cameraDistance * Math.sin(polarAngle) * Math.sin(azimuth);
    const camY = target.y + cameraDistance * Math.cos(polarAngle) + 6;
    const camZ = target.z + cameraDistance * Math.sin(polarAngle) * Math.cos(azimuth);

    targetCamPos.current.set(camX, camY, camZ);

    animationProgress.current = 0;
    isAnimating.current = true;

    if (controls) {
      (controls as any).enabled = false;
    }
  }, [focusNodeId, camera, controls, cameraTarget, cameraDistance, mode]);

  useEffect(() => {
    if (mode === 'ambient' && focusNodeId === null && initialized.current) {
      startPos.current.copy(camera.position);
      if (controls) {
        (controls as any).target.clone(startLookAt.current);
      }
      targetLookAt.current.set(0, 0, -80);
      targetCamPos.current.set(0, 5, 20);
      animationProgress.current = 0;
      isAnimating.current = true;
      lastFocusId.current = null;
    }
  }, [mode, focusNodeId, camera, controls]);

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  useFrame((_, delta) => {
    if (!controls) return;

    if (isAnimating.current) {
      animationProgress.current += delta * 0.9;
      if (animationProgress.current >= 1) {
        animationProgress.current = 1;
        isAnimating.current = false;
        (controls as any).enabled = true;
      }

      const t = easeOutCubic(animationProgress.current);

      const currentLookAt = new THREE.Vector3();
      currentLookAt.lerpVectors(startLookAt.current, targetLookAt.current, t);
      (controls as any).target.copy(currentLookAt);

      const currentCamPos = new THREE.Vector3();
      currentCamPos.lerpVectors(startPos.current, targetCamPos.current, t);
      camera.position.copy(currentCamPos);

      (controls as any).update();
    }
  });

  return null;
}
