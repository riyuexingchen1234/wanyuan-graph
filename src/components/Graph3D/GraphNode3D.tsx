'use client';

import { Billboard, Text } from '@react-three/drei';
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

function getTextSize(depth: number, isCenter: boolean): number {
  if (isCenter) return 0.7;
  if (depth <= 1) return 0.5;
  if (depth === 2) return 0.4;
  if (depth === 3) return 0.3;
  return 0;
}

function getTextOpacity(depth: number, isCenter: boolean): number {
  if (isCenter) return 1;
  if (depth <= 1) return 0.9;
  if (depth === 2) return 0.7;
  if (depth === 3) return 0.5;
  return 0.3;
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
  const textSize = getTextSize(depth, isCenter);
  const opacity = getTextOpacity(depth, isCenter);
  const weight = isCenter ? 700 : isSelected || isHovered ? 600 : 400;

  const showText = textSize > 0;

  const handleClick = (e: any) => {
    e.stopPropagation();
    onClick?.();
  };

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    onPointerOver?.();
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    onPointerOut?.();
    document.body.style.cursor = 'auto';
  };

  return (
    <group position={[position.x, position.y, position.z]}>
      {showText && (
        <Billboard>
          <Text
            fontSize={textSize}
            color={`rgba(0, 0, 0, ${opacity})`}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0}
            fontWeight={weight}
            onClick={handleClick}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          >
            {node.name}
          </Text>
        </Billboard>
      )}
    </group>
  );
}
