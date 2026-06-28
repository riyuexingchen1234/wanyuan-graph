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
  depth: number;
}

function getEdgeOpacity(depth: number): number {
  if (depth <= 1) return 0.5;
  if (depth === 2) return 0.35;
  if (depth === 3) return 0.2;
  return 0.1;
}

function generateCurvePoints(
  sourcePos: NodePosition,
  targetPos: NodePosition,
  segments: number = 16
): [number, number, number][] {
  const start = new THREE.Vector3(sourcePos.x, sourcePos.y, sourcePos.z);
  const end = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

  const distance = start.distanceTo(end);
  const curveAmount = distance * 0.15;
  const normalDir = new THREE.Vector3(0, 1, 0).normalize();
  const controlPoint = mid.clone().add(normalDir.multiplyScalar(curveAmount));

  const curve = new THREE.QuadraticBezierCurve3(start, controlPoint, end);
  const points: [number, number, number][] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = curve.getPoint(t);
    points.push([point.x, point.y, point.z]);
  }

  return points;
}

export default function GraphEdge3D({ edge, sourcePos, targetPos, depth }: GraphEdge3DProps) {
  const points = useMemo(() => {
    return generateCurvePoints(sourcePos, targetPos, 16);
  }, [sourcePos, targetPos]);

  const opacity = getEdgeOpacity(depth);
  const isDashed = edge.verification_status === 'proposed';

  return (
    <Line
      points={points}
      color="#000000"
      lineWidth={1}
      dashed={isDashed}
      dashSize={isDashed ? 0.3 : 0}
      gapSize={isDashed ? 0.25 : 0}
      opacity={opacity}
      transparent
    />
  );
}
