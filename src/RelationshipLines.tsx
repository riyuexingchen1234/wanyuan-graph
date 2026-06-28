import { useFrame } from '@react-three/fiber';
import { useGraphStore } from './store';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';

export function RelationshipLines() {
  const data = useGraphStore(state => state.data);
  const physicsEngine = useGraphStore(state => state.physicsEngine);
  const selectedNodeId = useGraphStore(state => state.selectedNodeId);
  
  const groupRef = useRef<THREE.Group>(null);
  const linesMapRef = useRef<Map<string, THREE.Line>>(new Map());
  
  // 初始化或更新线条对象
  useEffect(() => {
    if (!data || !groupRef.current) return;
    
    const group = groupRef.current;
    const linesMap = linesMapRef.current;
    
    // 移除不存在的线条
    const currentRelIds = new Set(data.relationships.map(r => r.id));
    linesMap.forEach((line, id) => {
      if (!currentRelIds.has(id)) {
        group.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
        linesMap.delete(id);
      }
    });
    
    // 添加或更新线条
    data.relationships.forEach(rel => {
      const isMainChain = rel.sourceId === selectedNodeId || rel.targetId === selectedNodeId;
      
      if (!linesMap.has(rel.id)) {
        // 创建新线条
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(6);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.LineBasicMaterial({
          color: isMainChain ? 0xffffff : 0x444444,
          transparent: true,
          opacity: isMainChain ? 0.6 : 0.2
        });
        
        const line = new THREE.Line(geometry, material);
        group.add(line);
        linesMap.set(rel.id, line);
      } else {
        // 更新材质
        const line = linesMap.get(rel.id)!;
        const material = line.material as THREE.LineBasicMaterial;
        material.color.set(isMainChain ? 0xffffff : 0x444444);
        material.opacity = isMainChain ? 0.6 : 0.2;
      }
    });
  }, [data, selectedNodeId]);
  
  // 每帧更新顶点位置
  useFrame(() => {
    if (!physicsEngine) return;
    
    const linesMap = linesMapRef.current;
    
    data?.relationships.forEach(rel => {
      const line = linesMap.get(rel.id);
      if (!line) return;
      
      const sourcePos = physicsEngine.getNodePosition(rel.sourceId);
      const targetPos = physicsEngine.getNodePosition(rel.targetId);
      
      if (!sourcePos || !targetPos) return;
      
      const geometry = line.geometry;
      const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
      
      positionAttr.setXYZ(0, sourcePos.x, sourcePos.y, sourcePos.z);
      positionAttr.setXYZ(1, targetPos.x, targetPos.y, targetPos.z);
      positionAttr.needsUpdate = true;
    });
  });
  
  return <group ref={groupRef} />;
}
