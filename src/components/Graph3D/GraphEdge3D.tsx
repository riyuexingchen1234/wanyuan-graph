'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import type { GraphEdge, RelationType } from '../../lib/types';
import type { NodePosition } from '../../store/graphStore';

interface GraphEdge3DProps {
  edge: GraphEdge;
  sourcePos: NodePosition;
  targetPos: NodePosition;
  depth: number;
}

const CURVE_CONFIG: Record<string, { dir: [number, number, number]; curvature: number }> = {
  raw_material_for: { dir: [0, 1, 0], curvature: 0.2 },
  can_be_processed_into: { dir: [0, 1, 0], curvature: 0.2 },
  made_of: { dir: [0, 1, 0], curvature: 0.2 },
  applied_in: { dir: [0, 0, 1], curvature: 0.3 },
  equipment_for: { dir: [0, 0, -1], curvature: 0.3 },
  downstream_of: { dir: [0, 1, 0.5], curvature: 0.25 },
  upstream_of: { dir: [0, 1, -0.5], curvature: 0.25 },
  consumable_for: { dir: [0.5, 0.5, 0], curvature: 0.25 },
  structurally_similar_to: { dir: [0, -1, 0.5], curvature: 0.35 },
};

function getCurveConfig(relationType: RelationType) {
  return (
    CURVE_CONFIG[relationType] || {
      dir: [0.5, 0.5, 0.5],
      curvature: 0.3,
    }
  );
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
  relationType: RelationType,
  segments: number = 20
): Float32Array {
  const config = getCurveConfig(relationType);
  const [dx, dy, dz] = config.dir;

  const start = new THREE.Vector3(sourcePos.x, sourcePos.y, sourcePos.z);
  const end = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

  const distance = start.distanceTo(end);
  const curveAmount = distance * config.curvature;

  const normalDir = new THREE.Vector3(dx, dy, dz).normalize();
  const controlPoint = mid.clone().add(normalDir.multiplyScalar(curveAmount));

  const curve = new THREE.QuadraticBezierCurve3(start, controlPoint, end);
  const positions = new Float32Array((segments + 1) * 3);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = curve.getPoint(t);
    positions[i * 3] = point.x;
    positions[i * 3 + 1] = point.y;
    positions[i * 3 + 2] = point.z;
  }

  return positions;
}

export default function GraphEdge3D({ edge, sourcePos, targetPos, depth }: GraphEdge3DProps) {
  const { positions, linePositions } = useMemo(() => {
    const pos = generateCurvePoints(sourcePos, targetPos, edge.relation_type, 24);
    const isDashed = edge.verification_status === 'proposed';

    let linePos: Float32Array | null = null;
    if (isDashed) {
      const dashSize = 0.3;
      const gapSize = 0.25;
      const dashPoints: number[] = [];
      let traveled = 0;
      let drawing = true;

      for (let i = 0; i < 24; i++) {
        const p1 = new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
        const p2 = new THREE.Vector3(pos[(i + 1) * 3], pos[(i + 1) * 3 + 1], pos[(i + 1) * 3 + 2]);
        const segLen = p1.distanceTo(p2);
        let segTraveled = 0;

        while (segTraveled < segLen) {
          const remaining = segLen - segTraveled;
          const step = drawing ? Math.min(remaining, dashSize - (traveled % (dashSize + gapSize))) : Math.min(remaining, gapSize - (traveled % (dashSize + gapSize)));

          const t1 = segTraveled / segLen;
          const t2 = (segTraveled + step) / segLen;
          const startPt = p1.clone().lerp(p2, t1);
          const endPt = p1.clone().lerp(p2, t2);

          if (drawing) {
            dashPoints.push(startPt.x, startPt.y, startPt.z);
            dashPoints.push(endPt.x, endPt.y, endPt.z);
          }

          segTraveled += step;
          traveled += step;
          if (traveled % (dashSize + gapSize) < 0.001) {
            drawing = !drawing;
          }
        }
      }
      linePos = new Float32Array(dashPoints);
    }

    return { positions: pos, linePositions: linePos };
  }, [sourcePos, targetPos, edge.relation_type, edge.verification_status]);

  const opacity = getEdgeOpacity(depth);
  const isDashed = edge.verification_status === 'proposed';

  if (isDashed && linePositions) {
    return (
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={linePositions.length / 3}
            array={linePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#000000" transparent opacity={opacity} />
      </lineSegments>
    );
  }

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#000000" transparent opacity={opacity} />
    </line>
  );
}
