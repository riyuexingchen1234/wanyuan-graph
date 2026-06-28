'use client';

import { useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGraphStore } from '../../store/graphStore';
import type { Vec3 } from '../../store/graphStore';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function useCameraFlight() {
  const { camera, controls } = useThree();
  const progressRef = useRef(0);
  const startCamPosRef = useRef(new THREE.Vector3());
  const startTargetRef = useRef(new THREE.Vector3());
  const startOffsetRef = useRef(new THREE.Vector3());
  const endTargetRef = useRef(new THREE.Vector3());
  const endOffsetRef = useRef(new THREE.Vector3());
  const lastGenRef = useRef(-1);

  useFrame((_, delta) => {
    const state = useGraphStore.getState();
    const orbitCtrls = controls as (THREE.EventDispatcher & { target: THREE.Vector3; update: () => void }) | null;

    if (state.isFlying && state.flyGeneration !== lastGenRef.current) {
      lastGenRef.current = state.flyGeneration;
      progressRef.current = 0;
      startCamPosRef.current.copy(camera.position);
      if (orbitCtrls) {
        startTargetRef.current.copy(orbitCtrls.target);
      } else {
        startTargetRef.current.set(0, 0, 0);
      }
      startOffsetRef.current.copy(startCamPosRef.current).sub(startTargetRef.current);
      endTargetRef.current.set(state.flyEndTarget[0], state.flyEndTarget[1], state.flyEndTarget[2]);
      const endCamPos = new THREE.Vector3(state.flyEndPos[0], state.flyEndPos[1], state.flyEndPos[2]);
      endOffsetRef.current.copy(endCamPos).sub(endTargetRef.current);
    }

    if (!state.isFlying) {
      if (orbitCtrls) {
        orbitCtrls.update();
      }
      return;
    }

    progressRef.current += delta / state.flyDuration;
    const t = easeInOutCubic(Math.min(1, progressRef.current));

    const curTarget = new THREE.Vector3().lerpVectors(startTargetRef.current, endTargetRef.current, t);
    const curOffset = new THREE.Vector3().lerpVectors(startOffsetRef.current, endOffsetRef.current, t);
    const curCamPos = curTarget.clone().add(curOffset);

    camera.position.copy(curCamPos);
    if (orbitCtrls) {
      orbitCtrls.target.copy(curTarget);
      orbitCtrls.update();
    }

    if (progressRef.current >= 1) {
      useGraphStore.setState({
        isFlying: false,
        flyProgress: 1,
        cameraPosition: [curCamPos.x, curCamPos.y, curCamPos.z],
        cameraTarget: [curTarget.x, curTarget.y, curTarget.z],
      });
    }
  });

  return null;
}
