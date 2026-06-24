'use client';

import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { GraphEdge } from '../../lib/types';
import type { NodePosition } from '../../store/graphStore';

interface GraphEdge3DProps {
  edge: GraphEdge;
  sourcePos: NodePosition;
  targetPos: NodePosition;
}

export default function GraphEdge3D({ edge, sourcePos, targetPos }: GraphEdge3DProps) {
  const points = useMemo(() => {
    return [
      new THREE.Vector3(sourcePos.x, sourcePos.y, sourcePos.z),
      new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z),
    ];
  }, [sourcePos, targetPos]);

  const isDashed = edge.verification_status === 'proposed';

  return (
    <Line
      points={points}
      color="#000000"
      lineWidth={1}
      dashed={isDashed}
      dashSize={0.3}
      gapSize={0.2}
      opacity={isDashed ? 0.6 : 0.5}
      transparent
    />
  );
}
