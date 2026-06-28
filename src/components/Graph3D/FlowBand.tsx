'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useGraphStore } from '../../store/graphStore';
import { getGraphDataProvider } from '../../lib/graph-data';
import { isFlowEdge } from '../../lib/chains';
import type { NodePosition } from '../../lib/types';

interface FlowBandProps {
  edgeId: string;
}

interface EdgeVisualInfo {
  sourcePos: [number, number, number];
  targetPos: [number, number, number];
  color: string;
  opacity: number;
  lineWidth: number;
  dashed: boolean;
  visible: boolean;
  midPoint: [number, number, number];
}

function classifyEdge(edgeId: string, positions: Map<string, NodePosition>): EdgeVisualInfo | null {
  const provider = getGraphDataProvider();
  const edge = provider.getEdgeById(edgeId);
  if (!edge) return null;
  const sourceNode = provider.getNodeById(edge.source);
  const targetNode = provider.getNodeById(edge.target);
  if (!sourceNode || !targetNode) return null;
  const sp = positions.get(edge.source);
  const tp = positions.get(edge.target);
  if (!sp || !tp) return null;

  const sourcePos: [number, number, number] = [sp.x, sp.y, sp.z];
  const targetPos: [number, number, number] = [tp.x, tp.y, tp.z];
  const midPoint: [number, number, number] = [
    (sp.x + tp.x) / 2,
    (sp.y + tp.y) / 2,
    (sp.z + tp.z) / 2,
  ];

  let color = '#ffffff';
  let opacity = 0.3;
  let lineWidth = 1;
  let dashed = false;
  let visible = true;

  if (edge.edge_type === 'is_a') {
    visible = false;
  } else if (edge.edge_type === 'equipment_for') {
    color = '#6B8CAE';
    opacity = 0.2;
    lineWidth = 0.5;
  } else if (edge.edge_type === 'composed_of') {
    color = '#E8E8F0';
    opacity = 0.3;
    lineWidth = 0.8;
    dashed = true;
  } else if (isFlowEdge(edge.edge_type)) {
    const sourceChain = sourceNode.primary_chain;
    const targetChain = targetNode.primary_chain;
    const isCrossChain = sourceChain && targetChain && sourceChain !== targetChain;

    if (isCrossChain) {
      color = '#FFD700';
      opacity = 0.8;
      lineWidth = 2;
      dashed = true;
    } else {
      let chainColor = '#E8E8F0';
      if (sourceChain === 'pv_chain') chainColor = '#FF8C00';
      else if (sourceChain === 'battery_chain') chainColor = '#3B82F6';
      else if (targetChain === 'pv_chain') chainColor = '#FF8C00';
      else if (targetChain === 'battery_chain') chainColor = '#3B82F6';

      const sourceChains = sourceNode.chains || [];
      const targetChains = targetNode.chains || [];
      const sourceOnMainAxis = sourceChains.includes(sourceChain || '') || sourceNode.node_type !== 'substance';
      const targetOnMainAxis = targetChains.includes(targetChain || '') || targetNode.node_type !== 'substance';

      if (sourceOnMainAxis && targetOnMainAxis && sourceChain === targetChain) {
        color = chainColor;
        opacity = 0.7;
        lineWidth = 2;
      } else {
        color = chainColor;
        opacity = 0.35;
        lineWidth = 1;
      }
    }
  }

  return { sourcePos, targetPos, color, opacity, lineWidth, dashed, visible, midPoint };
}

function buildCurvePoints(
  start: [number, number, number],
  end: [number, number, number],
  segments: number = 24
): [number, number, number][] {
  const s = new THREE.Vector3(start[0], start[1], start[2]);
  const e = new THREE.Vector3(end[0], end[1], end[2]);
  const mid = s.clone().add(e).multiplyScalar(0.5);
  const dist = s.distanceTo(e);
  const up = new THREE.Vector3(0, 1, 0);
  const dir = e.clone().sub(s).normalize();
  const perp = new THREE.Vector3().crossVectors(dir, up);
  if (perp.length() < 0.01) {
    perp.set(1, 0, 0);
  }
  perp.normalize();
  const curveHeight = dist * 0.12;
  const control = mid.clone().add(perp.multiplyScalar(curveHeight));

  const curve = new THREE.QuadraticBezierCurve3(s, control, e);
  const points: [number, number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = curve.getPoint(t);
    points.push([p.x, p.y, p.z]);
  }
  return points;
}

export default function FlowBand({ edgeId }: FlowBandProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const positions = useGraphStore((s) => s.positions);
  const info = useMemo(() => classifyEdge(edgeId, positions), [edgeId, positions]);
  const points = useMemo(() => {
    if (!info) return [];
    return buildCurvePoints(info.sourcePos, info.targetPos);
  }, [info]);

  useFrame(() => {
    if (!info || !groupRef.current) return;
    const dist = camera.position.distanceTo(
      new THREE.Vector3(info.midPoint[0], info.midPoint[1], info.midPoint[2])
    );
    if (dist > 120) {
      groupRef.current.visible = false;
    } else if (dist > 50) {
      groupRef.current.visible = info.lineWidth >= 1.8;
    } else {
      groupRef.current.visible = info.visible;
    }
  });

  if (!info || !info.visible || points.length === 0) return null;

  return (
    <group ref={groupRef} visible={info.visible}>
      <Line
        points={points}
        color={info.color}
        lineWidth={info.lineWidth}
        dashed={info.dashed}
        dashSize={info.dashed ? 0.5 : 0}
        gapSize={info.dashed ? 0.3 : 0}
        opacity={info.opacity}
        transparent
        depthWrite={false}
      />
    </group>
  );
}
