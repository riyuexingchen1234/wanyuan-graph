'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { GraphNode } from '../../lib/types';
import type { NodePosition } from '../../store/graphStore';
import { useGraphStore } from '../../store/graphStore';

interface GraphNode3DProps {
  node: GraphNode;
  position: NodePosition;
  isCenter?: boolean;
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

export default function GraphNode3D({
  node,
  position,
  isCenter = false,
  isSelected = false,
  isHovered = false,
  onClick,
  onPointerOver,
  onPointerOut,
}: GraphNode3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const scale = isCenter ? 1.3 : isSelected ? 1.15 : 1;
  const radius = isCenter ? 0.6 : 0.4;

  useFrame(() => {
    if (!meshRef.current) return;
    const targetScale = hovered || isHovered ? scale * 1.1 : scale;
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
  });

  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onPointerOver?.();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          onPointerOut?.();
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      <Billboard position={[0, radius + 0.3, 0]}>
        <Text
          fontSize={isCenter ? 0.35 : 0.25}
          color="#000000"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0}
        >
          {node.name}
        </Text>
      </Billboard>
    </group>
  );
}
