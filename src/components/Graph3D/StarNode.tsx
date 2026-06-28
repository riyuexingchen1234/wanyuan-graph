'use client';

import { useRef, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGraphStore } from '../../store/graphStore';
import { getGraphDataProvider } from '../../lib/graph-data';
import { NODE_TYPE_LABELS } from '../../lib/types';
import type { NodePosition } from '../../lib/types';

interface StarNodeProps {
  nodeId: string;
}

function getNodeVisualInfo(nodeId: string, positions: Map<string, NodePosition>) {
  const provider = getGraphDataProvider();
  const node = provider.getNodeById(nodeId);
  if (!node) return null;
  const pos = positions.get(nodeId);
  if (!pos) return null;

  const chains = node.chains || [];
  const isCrossChain = chains.length > 1;
  const primaryChain = node.primary_chain;
  const chainDef = primaryChain ? provider.getChainDef(primaryChain) : undefined;
  const chainColor = chainDef?.color || (primaryChain === 'pv_chain' ? '#FF8C00' : primaryChain === 'battery_chain' ? '#3B82F6' : '#6B7280');

  let color = '#E8E8F0';
  let baseRadius = pos.r || 0.5;
  let emissive = '#000000';
  let emissiveIntensity = 0;

  if (node.node_type === 'substance') {
    if (isCrossChain) {
      color = '#FFD700';
      baseRadius *= 1.3;
      emissive = '#FFD700';
      emissiveIntensity = 0.4;
    } else if (primaryChain === 'pv_chain') {
      color = '#FF8C00';
    } else if (primaryChain === 'battery_chain') {
      color = '#3B82F6';
    } else {
      color = '#E8E8F0';
    }
  } else if (node.node_type === 'process') {
    color = '#9BF0FF';
    baseRadius *= 0.7;
    emissive = '#9BF0FF';
    emissiveIntensity = 0.3;
  } else if (node.node_type === 'equipment') {
    color = '#6B8CAE';
    baseRadius *= 0.4;
  } else if (node.node_type === 'facility') {
    color = chainColor;
    baseRadius *= 1.8;
    emissive = chainColor;
    emissiveIntensity = 0.5;
  }

  return {
    node,
    pos,
    color: new THREE.Color(color),
    emissive: new THREE.Color(emissive),
    emissiveIntensity,
    radius: baseRadius,
    isCrossChain,
    isFacility: node.node_type === 'facility',
    chainColor: new THREE.Color(chainColor),
    primaryChain,
    name: node.name,
    typeLabel: NODE_TYPE_LABELS[node.node_type],
  };
}

export default function StarNode({ nodeId }: StarNodeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const glowMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const crossRingMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const facilityRingMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const labelGroupRef = useRef<THREE.Group>(null);
  const crossRingRef = useRef<THREE.Mesh>(null);
  const facilityRingRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const info = useMemo(() => {
    const positions = useGraphStore.getState().positions;
    return getNodeVisualInfo(nodeId, positions);
  }, [nodeId]);

  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const hoveredNodeId = useGraphStore((s) => s.hoveredNodeId);
  const setHovered = useGraphStore((s) => s.setHovered);
  const flyTo = useGraphStore((s) => s.flyTo);

  const isSelected = selectedNodeId === nodeId;
  const isHovered = hoveredNodeId === nodeId;

  const geometry = useMemo(() => {
    if (!info) return null;
    switch (info.node.node_type) {
      case 'substance':
        return new THREE.SphereGeometry(1, 20, 20);
      case 'process':
        return new THREE.OctahedronGeometry(1, 0);
      case 'equipment':
        return new THREE.BoxGeometry(1, 1, 1);
      case 'facility':
        return new THREE.IcosahedronGeometry(1, 1);
      default:
        return new THREE.SphereGeometry(1, 16, 16);
    }
  }, [info]);

  useFrame((state, delta) => {
    if (!info || !meshRef.current || !matRef.current || !groupRef.current) return;

    const worldPos = new THREE.Vector3();
    meshRef.current.getWorldPosition(worldPos);
    const camDist = camera.position.distanceTo(worldPos);

    let lodLevel = 0;
    if (camDist > 120) lodLevel = 0;
    else if (camDist > 45) lodLevel = 1;
    else if (camDist > 18) lodLevel = 2;
    else lodLevel = 3;

    const mat = matRef.current;
    const r = info.radius;

    if (lodLevel === 0) {
      groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;

    if (lodLevel === 1) {
      mat.color.copy(info.color);
      mat.emissive.copy(info.color);
      mat.emissiveIntensity = 1.0;
      mat.opacity = 0.95;
      mat.transparent = true;
      meshRef.current.scale.setScalar(r * 0.3);
      if (glowRef.current) glowRef.current.visible = false;
      if (crossRingRef.current) crossRingRef.current.visible = false;
      if (facilityRingRef.current) facilityRingRef.current.visible = false;
      if (labelGroupRef.current) labelGroupRef.current.visible = false;
      return;
    }

    const scaleMult = isSelected ? 1.4 : isHovered ? 1.2 : 1;
    meshRef.current.scale.setScalar(r * scaleMult);
    mat.color.copy(info.color);
    mat.emissive.copy(info.emissive);
    mat.emissiveIntensity = isSelected ? info.emissiveIntensity * 2.5 : isHovered ? info.emissiveIntensity * 1.5 : info.emissiveIntensity;
    mat.transparent = false;
    mat.opacity = 1;
    mat.metalness = 0.3;
    mat.roughness = 0.5;

    if (glowRef.current && glowMatRef.current) {
      glowRef.current.visible = true;
      const glowScale = r * 2.2 * scaleMult * (1 + Math.sin(state.clock.elapsedTime * 2) * 0.08);
      glowRef.current.scale.setScalar(glowScale);
      glowMatRef.current.color.copy(info.color);
      glowMatRef.current.opacity = isSelected ? 0.3 : isHovered ? 0.22 : 0.12;
    }

    if (info.isCrossChain && crossRingRef.current && crossRingMatRef.current) {
      crossRingRef.current.visible = true;
      crossRingRef.current.rotation.z += delta * 0.4;
      crossRingRef.current.rotation.x += delta * 0.15;
      crossRingMatRef.current.opacity = lodLevel === 3 ? 0.55 : 0.25;
      crossRingRef.current.scale.setScalar(r * 2.2);
    } else if (crossRingRef.current) {
      crossRingRef.current.visible = false;
    }

    if (info.isFacility && facilityRingRef.current && facilityRingMatRef.current) {
      facilityRingRef.current.visible = true;
      facilityRingRef.current.rotation.z += delta * 0.25;
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.12;
      facilityRingRef.current.scale.setScalar(r * 2.8 * pulse);
      facilityRingMatRef.current.color.copy(info.chainColor);
    } else if (facilityRingRef.current) {
      facilityRingRef.current.visible = false;
    }

    if (labelGroupRef.current) {
      labelGroupRef.current.visible = lodLevel >= 3;
    }
  });

  const handleClick = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      flyTo(nodeId);
    },
    [flyTo, nodeId]
  );

  const handlePointerOver = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      setHovered(nodeId);
      document.body.style.cursor = 'pointer';
    },
    [setHovered, nodeId]
  );

  const handlePointerOut = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      setHovered(null);
      document.body.style.cursor = 'auto';
    },
    [setHovered]
  );

  if (!info || !geometry) return null;

  return (
    <group ref={groupRef} position={[info.pos.x, info.pos.y, info.pos.z]}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={handleClick as unknown as (e: THREE.Event) => void}
        onPointerOver={handlePointerOver as unknown as (e: THREE.Event) => void}
        onPointerOut={handlePointerOut as unknown as (e: THREE.Event) => void}
      >
        <meshStandardMaterial ref={matRef} color={info.color} emissive={info.emissive} emissiveIntensity={info.emissiveIntensity} metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh ref={glowRef} visible={false}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          ref={glowMatRef}
          color={info.color}
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {info.isCrossChain && (
        <mesh ref={crossRingRef} visible={false} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1, 0.05, 8, 32]} />
          <meshBasicMaterial
            ref={crossRingMatRef}
            color="#FFD700"
            transparent
            opacity={0.5}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
      {info.isFacility && (
        <mesh ref={facilityRingRef} visible={false} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1, 0.04, 8, 48]} />
          <meshBasicMaterial
            ref={facilityRingMatRef}
            color={info.chainColor}
            transparent
            opacity={0.45}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
      <group ref={labelGroupRef} visible={false} position={[0, info.radius * 2.8, 0]}>
        <Html
          distanceFactor={15}
          center
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <div
            style={{
              color: '#ffffff',
              fontSize: '12px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              textShadow: '0 0 8px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.8)',
              fontWeight: isSelected ? 600 : 400,
              textAlign: 'center',
              background: isSelected ? 'rgba(255,215,0,0.15)' : 'transparent',
              padding: isSelected ? '2px 8px' : '0',
              borderRadius: '4px',
            }}
          >
            {info.name}
            <div
              style={{
                fontSize: '9px',
                color: 'rgba(180,210,255,0.75)',
                marginTop: '1px',
              }}
            >
              {info.typeLabel}
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
}
