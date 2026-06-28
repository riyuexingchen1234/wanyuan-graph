'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGraphStore } from '../../store/graphStore';
import { getGraphDataProvider } from '../../lib/graph-data';
import type { NodePosition } from '../../lib/types';

interface ChainLabelProps {
  chainId: string;
}

export default function ChainLabel({ chainId }: ChainLabelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const positions = useGraphStore((s) => s.positions);
  const chains = useGraphStore((s) => s.chains);

  const chain = useMemo(() => chains.find((c) => c.id === chainId), [chains, chainId]);

  const labelPos = useMemo((): [number, number, number] => {
    const provider = getGraphDataProvider();
    const mainAxis = provider.getMainAxisPath(chainId);
    if (mainAxis.nodes.length === 0) return [0, 0, 0];

    let sumX = 0, sumY = 0, sumZ = 0, count = 0;
    let maxY = -Infinity;
    for (const n of mainAxis.nodes) {
      const p: NodePosition | undefined = positions.get(n.id);
      if (!p) continue;
      sumX += p.x; sumY += p.y; sumZ += p.z; count++;
      if (p.y > maxY) maxY = p.y;
    }
    if (count === 0) return [0, 0, 0];
    return [sumX / count, maxY + 8, sumZ / count];
  }, [chainId, positions]);

  useFrame(() => {
    if (!groupRef.current) return;
    const dist = camera.position.distanceTo(
      new THREE.Vector3(labelPos[0], labelPos[1], labelPos[2])
    );
    let opacity = 0;
    if (dist < 40) {
      opacity = Math.min(1, (40 - dist) / 15);
    }
    groupRef.current.visible = opacity > 0.05;
    const htmlEl = groupRef.current.userData.htmlEl as HTMLElement | undefined;
    if (htmlEl) {
      htmlEl.style.opacity = String(opacity);
    }
  });

  if (!chain) return null;

  return (
    <group ref={groupRef} position={labelPos}>
      <Html
        distanceFactor={20}
        center
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          transition: 'opacity 0.3s',
        }}
      >
        <div
          ref={(el) => {
            if (groupRef.current && el) {
              groupRef.current.userData.htmlEl = el;
            }
          }}
          style={{
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${chain.color}40`,
            borderRadius: '20px',
            padding: '6px 16px',
            color: chain.color,
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: 'system-ui, sans-serif',
            letterSpacing: '2px',
            textShadow: `0 0 10px ${chain.color}40`,
            opacity: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {chain.name}
        </div>
      </Html>
    </group>
  );
}
