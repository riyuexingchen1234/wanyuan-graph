import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { useGraphStore } from './store';
import * as THREE from 'three';

export function CameraController() {
  const { camera } = useThree();
  const selectedNodeId = useGraphStore(state => state.selectedNodeId);
  const physicsEngine = useGraphStore(state => state.physicsEngine);
  
  const targetPosition = useRef(new THREE.Vector3(0, 0, 30));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));
  
  // 当选中节点变化时，计算相机目标位置
  useEffect(() => {
    if (!selectedNodeId || !physicsEngine) {
      // 全局视图
      targetPosition.current.set(0, 0, 50);
      targetLookAt.current.set(0, 0, 0);
      return;
    }
    
    const nodePos = physicsEngine.getNodePosition(selectedNodeId);
    if (!nodePos) return;
    
    // 相机飞向节点前方
    const cameraOffset = new THREE.Vector3(0, 0, 15); // 节点前方15单位
    const cameraPosition = nodePos.clone().add(cameraOffset);
    
    targetPosition.current.copy(cameraPosition);
    targetLookAt.current.copy(nodePos);
  }, [selectedNodeId, physicsEngine]);
  
  useFrame(() => {
    // 平滑插值相机位置（缓动效果）
    camera.position.lerp(targetPosition.current, 0.08);
    
    // 平滑插值相机朝向
    currentLookAt.current.lerp(targetLookAt.current, 0.08);
    camera.lookAt(currentLookAt.current);
  });
  
  return null;
}
