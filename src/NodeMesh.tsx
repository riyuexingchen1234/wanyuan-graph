import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Node } from './types';
import { useGraphStore } from './store';
import { PhysicsEngine } from './PhysicsEngine';

interface NodeMeshProps {
  node: Node;
  physicsEngine: PhysicsEngine;
}

export function NodeMesh({ node, physicsEngine }: NodeMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const selectNode = useGraphStore(state => state.selectNode);
  const setHoveredNode = useGraphStore(state => state.setHoveredNode);
  const selectedNodeId = useGraphStore(state => state.selectedNodeId);

  useFrame(() => {
    if (!meshRef.current) return;

    const position = physicsEngine.getNodePosition(node.id);
    if (position) {
      meshRef.current.position.copy(position);
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

  const isSelected = selectedNodeId === node.id;

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
          emissiveIntensity={hovered ? 0.5 : 0.2}
        />
      </mesh>

      <Html
        position={[0, 1, 0]}
        center
        style={{
          color: 'white',
          background: isSelected ? 'rgba(74, 144, 226, 0.9)' : hovered ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.6)',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: isSelected ? '14px' : '12px',
          fontWeight: isSelected ? 'bold' : 'normal',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          transition: 'all 0.2s'
        }}
      >
        {node.name}
      </Html>
    </group>
  );
}
