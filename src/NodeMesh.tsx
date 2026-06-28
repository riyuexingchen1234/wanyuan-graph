import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Node } from './types';
import { useGraphStore } from './store';

interface NodeMeshProps {
  node: Node;
}

export function NodeMesh({ node }: NodeMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  const nodePositions = useGraphStore(state => state.nodePositions);
  const selectedNodeId = useGraphStore(state => state.selectedNodeId);
  const selectNode = useGraphStore(state => state.selectNode);
  const setHoveredNode = useGraphStore(state => state.setHoveredNode);
  
  const position = nodePositions.get(node.id) || { x: 0, y: 0, z: 0 };
  const isSelected = selectedNodeId === node.id;
  
  // 平滑移动到目标位置
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.lerp(
        new THREE.Vector3(position.x, position.y, position.z),
        0.1
      );
    }
  });
  
  const handleClick = (e: any) => {
    e.stopPropagation();
    selectNode(node.id);
  };
  
  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHovered(true);
    setHoveredNode(node.id);
    document.body.style.cursor = 'pointer';
  };
  
  const handlePointerOut = () => {
    setHovered(false);
    setHoveredNode(null);
    document.body.style.cursor = 'auto';
  };
  
  // 根据节点类型设置颜色
  const getColor = () => {
    switch (node.type) {
      case 'material': return '#4a90e2';
      case 'process': return '#50c878';
      case 'product': return '#ffa500';
      case 'demand': return '#da70d6';
      case 'entity': return '#ffffff';
      default: return '#ffffff';
    }
  };
  
  return (
    <group>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[isSelected ? 0.8 : hovered ? 0.6 : 0.5, 32, 32]} />
        <meshStandardMaterial
          color={getColor()}
          emissive={getColor()}
          emissiveIntensity={isSelected ? 0.8 : hovered ? 0.5 : 0.2}
        />
      </mesh>
      
      {(hovered || isSelected) && (
        <Html
          position={[position.x, position.y + 1.2, position.z]}
          center
          style={{
            color: 'white',
            background: 'rgba(0, 0, 0, 0.8)',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none'
          }}
        >
          {node.name}
        </Html>
      )}
    </group>
  );
}
