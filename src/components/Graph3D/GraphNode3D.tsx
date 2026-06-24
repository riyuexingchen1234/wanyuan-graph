'use client';

import { useRef } from 'react';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { GraphNode } from '../../lib/types';
import type { NodePosition } from '../../store/graphStore';

interface GraphNode3DProps {
  node: GraphNode;
  position: NodePosition;
  depth: number;
  isCenter?: boolean;
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

function getNodeScale(depth: number, isCenter: boolean): number {
  if (isCenter) return 1.3;
  if (depth <= 1) return 1;
  if (depth === 2) return 0.8;
  if (depth === 3) return 0.6;
  return 0.4;
}

function getNodeOpacity(depth: number, isCenter: boolean): number {
  if (isCenter) return 1;
  if (depth <= 1) return 0.9;
  if (depth === 2) return 0.7;
  if (depth === 3) return 0.5;
  return 0.3;
}

function getTextSize(depth: number, isCenter: boolean): number {
  if (isCenter) return 0.4;
  if (depth <= 1) return 0.3;
  if (depth === 2) return 0.25;
  return 0;
}

export default function GraphNode3D({
  node,
  position,
  depth,
  isCenter = false,
  isSelected = false,
  isHovered = false,
  onClick,
  onPointerOver,
  onPointerOut,
}: GraphNode3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const baseScale = getNodeScale(depth, isCenter);
  const scale = isHovered || isSelected ? baseScale * 1.15 : baseScale;
  const opacity = getNodeOpacity(depth, isCenter);
  const textSize = getTextSize(depth, isCenter);
  const radius = 0.5;

  const showText = textSize > 0;

  return (
    <group position={[position.x, position.y, position.z]} scale={scale}>
      <mesh
        ref={meshRef as any}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onPointerOver?.();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onPointerOut?.();
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[radius, 24, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={opacity} />
      </mesh>

      {showText && (
        <Billboard position={[0, radius + 0.4, 0]}>
          <Text
            fontSize={textSize}
            color={`rgba(0, 0, 0, ${opacity})`}
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0}
          >
            {node.name}
          </Text>
        </Billboard>
      )}
    </group>
  );
}
