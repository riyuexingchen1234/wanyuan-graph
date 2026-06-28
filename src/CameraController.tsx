import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { useGraphStore } from './store';
import * as THREE from 'three';

export function CameraController() {
  const { camera } = useThree();
  const cameraTarget = useGraphStore(state => state.cameraTarget);
  const targetPosition = useRef(new THREE.Vector3(0, 0, 30));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));
  
  useFrame(() => {
    if (cameraTarget) {
      targetPosition.set(...cameraTarget.position);
      targetLookAt.set(...cameraTarget.lookAt);
    }
    
    // 平滑插值相机位置
    camera.position.lerp(targetPosition, 0.05);
    
    // 平滑插值相机朝向
    currentLookAt.current.lerp(targetLookAt, 0.05);
    camera.lookAt(currentLookAt.current);
  });
  
  return null;
}
