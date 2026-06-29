import { useMemo, useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Node } from './types';
import { useGraphStore } from './store';
import { PhysicsEngine } from './PhysicsEngine';

interface NodeMeshProps {
  node: Node;
  physicsEngine: PhysicsEngine;
  isHighlighted: boolean;
  isShared: boolean;
}

export function NodeMesh({ node, physicsEngine, isHighlighted, isShared }: NodeMeshProps) {
  const [hovered, setHovered] = useState(false);

  const selectNode = useGraphStore(state => state.selectNode);
  const setHoveredNode = useGraphStore(state => state.setHoveredNode);
  const selectedNodeId = useGraphStore(state => state.selectedNodeId);

  const position = useMemo(() => {
    return physicsEngine.getNodePosition(node.id) || new THREE.Vector3(0, 0, 0);
  }, [node.id, physicsEngine]);

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
      case 'entity': return '#e8e8e8';
      default: return '#ffffff';
    }
  };

  const isSelected = selectedNodeId === node.id;
  const baseSize = isShared ? 0.7 : 0.5;
  const scale = isSelected ? 1.8 : hovered ? 1.4 : isHighlighted ? 1.1 : 1;

  return (
    <group position={position}>
      <mesh
        scale={scale}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[baseSize, 24, 24]} />
        <meshStandardMaterial
          color={getColor()}
          emissive={getColor()}
          emissiveIntensity={isSelected ? 0.8 : hovered ? 0.5 : isHighlighted ? 0.3 : 0.15}
          transparent={!isHighlighted && !isSelected && !hovered}
          opacity={isHighlighted || isSelected || hovered ? 1 : 0.7}
        />
      </mesh>

      {isHighlighted && (
        <mesh>
          <sphereGeometry args={[baseSize * 1.5, 24, 24]} />
          <meshBasicMaterial
            color={getColor()}
            transparent
            opacity={0.15}
          />
        </mesh>
      )}

      <Html
        position={[0, baseSize + 0.3, 0]}
        center
        style={{
          color: 'white',
          background: isSelected ? 'rgba(74, 144, 226, 0.95)' : hovered ? 'rgba(0, 0, 0, 0.95)' : isHighlighted ? 'rgba(102, 204, 255, 0.25)' : 'rgba(0, 0, 0, 0.5)',
          padding: '4px 10px',
          borderRadius: '4px',
          fontSize: isSelected ? '15px' : '13px',
          fontWeight: isSelected ? 'bold' : isHighlighted ? '600' : 'normal',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          transition: 'all 0.2s',
          textShadow: isHighlighted ? '0 0 8px rgba(102, 204, 255, 0.5)' : 'none',
          border: isHighlighted ? '1px solid rgba(102, 204, 255, 0.5)' : 'none',
        }}
      >
        {node.name}
      </Html>
    </group>
  );
}
