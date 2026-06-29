'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
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
  color: THREE.Color;
  opacity: number;
  visible: boolean;
  midPoint: [number, number, number];
  isMain: boolean;
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

  let colorHex = '#E8E8F0';
  let opacity = 0.3;
  let visible = true;
  let isMain = false;

  if (edge.edge_type === 'is_a') {
    visible = false;
  } else if (edge.edge_type === 'equipment_for') {
    colorHex = '#6B8CAE';
    opacity = 0.2;
  } else if (edge.edge_type === 'composed_of') {
    colorHex = '#E8E8F0';
    opacity = 0.3;
  } else if (isFlowEdge(edge.edge_type)) {
    const sourceChain = sourceNode.primary_chain;
    const targetChain = targetNode.primary_chain;
    const isCrossChain = sourceChain && targetChain && sourceChain !== targetChain;

    if (isCrossChain) {
      colorHex = '#FFD700';
      opacity = 0.8;
      isMain = true;
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
        colorHex = chainColor;
        opacity = 0.7;
        isMain = true;
      } else {
        colorHex = chainColor;
        opacity = 0.35;
      }
    }
  }

  return {
    sourcePos,
    targetPos,
    color: new THREE.Color(colorHex),
    opacity,
    visible,
    midPoint,
    isMain,
  };
}

export default function FlowBand({ edgeId }: FlowBandProps) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.LineBasicMaterial>(null);
  const { camera } = useThree();
  const lastVisibleRef = useRef<boolean | null>(null);

  const positions = useGraphStore((s) => s.positions);
  const info = useMemo(() => classifyEdge(edgeId, positions), [edgeId, positions]);

  const lineObj = useMemo(() => {
    if (!info) return null;
    const s = new THREE.Vector3(info.sourcePos[0], info.sourcePos[1], info.sourcePos[2]);
    const e = new THREE.Vector3(info.targetPos[0], info.targetPos[1], info.targetPos[2]);
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

    const segments = 12;
    const posArray = new Float32Array((segments + 1) * 3);
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const t2 = t * t;
      const mt = 1 - t;
      const mt2 = mt * mt;
      const x = mt2 * s.x + 2 * mt * t * control.x + t2 * e.x;
      const y = mt2 * s.y + 2 * mt * t * control.y + t2 * e.y;
      const z = mt2 * s.z + 2 * mt * t * control.z + t2 * e.z;
      posArray[i * 3] = x;
      posArray[i * 3 + 1] = y;
      posArray[i * 3 + 2] = z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const mat = new THREE.LineBasicMaterial({
      color: info.color,
      transparent: true,
      opacity: info.opacity,
      depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    return line;
  }, [info]);

  useFrame(() => {
    if (!info || !groupRef.current) return;
    const worldMid = new THREE.Vector3(info.midPoint[0], info.midPoint[1], info.midPoint[2]);
    groupRef.current.localToWorld(worldMid);
    const dist = camera.position.distanceTo(worldMid);
    let visible = info.visible;
    if (dist > 120) {
      visible = false;
    } else if (dist > 50) {
      visible = info.isMain;
    }
    groupRef.current.visible = visible;
    if (lastVisibleRef.current !== visible) {
      lastVisibleRef.current = visible;
    }
  });

  if (!info || !info.visible || !lineObj) return null;

  return (
    <group ref={groupRef} visible={info.visible}>
      <primitive object={lineObj} />
    </group>
  );
}
