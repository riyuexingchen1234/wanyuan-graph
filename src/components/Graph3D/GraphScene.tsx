'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import Starfield from './Starfield';
import StarNode from './StarNode';
import FlowBand from './FlowBand';
import ChainLabel from '../UI/ChainLabel';
import { useCameraFlight } from './useCameraFlight';
import { useGraphStore } from '../../store/graphStore';
import type { Vec3 } from '../../store/graphStore';

function SceneContent() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const chains = useGraphStore((s) => s.chains);
  const positions = useGraphStore((s) => s.positions);
  const initialCameraTarget = useGraphStore((s) => s.initialCameraTarget);
  const graphGroupRef = useRef<THREE.Group>(null);

  useCameraFlight();

  useFrame((_, delta) => {
    if (graphGroupRef.current) {
      graphGroupRef.current.rotation.y += delta * 0.03;
    }
  });

  const validEdges = useMemo(() => {
    return edges.filter((e) => positions.has(e.source) && positions.has(e.target));
  }, [edges, positions]);

  const validNodes = useMemo(() => {
    return nodes.filter((n) => positions.has(n.id));
  }, [nodes, positions]);

  return (
    <>
      <color attach="background" args={['#050810']} />
      <ambientLight intensity={0.3} />
      <pointLight position={[30, 30, 30]} intensity={0.6} />
      <pointLight position={[-30, -10, -20]} intensity={0.3} color="#3B82F6" />

      <Starfield />

      <group ref={graphGroupRef} rotation={[-0.2, 0, 0]}>
        {validEdges.map((edge) => (
          <FlowBand key={edge.id} edgeId={edge.id} />
        ))}

        {validNodes.map((node) => (
          <StarNode key={node.id} nodeId={node.id} />
        ))}

        {chains.map((chain) => (
          <ChainLabel key={chain.id} chainId={chain.id} />
        ))}
      </group>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        minDistance={5}
        maxDistance={100}
        target={initialCameraTarget as Vec3}
      />
    </>
  );
}

export default function GraphScene() {
  const [ready, setReady] = useState(false);
  const [webglError, setWebglError] = useState(false);
  const init = useGraphStore((s) => s.init);
  const initialCameraPosition = useGraphStore((s) => s.initialCameraPosition);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) {
        setWebglError(true);
        return;
      }
    } catch {
      setWebglError(true);
      return;
    }
    init();
    setReady(true);
  }, [init]);

  if (webglError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#050810]">
        <div className="text-center px-6">
          <div className="text-white/60 text-lg mb-3">需要 WebGL 支持</div>
          <div className="text-white/30 text-sm max-w-sm">
            当前浏览器或环境不支持 WebGL，无法渲染 3D 星空。请使用 Chrome / Firefox / Edge 等现代浏览器打开。
          </div>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#050810]">
        <div className="text-white/30 text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: initialCameraPosition as Vec3, fov: 70, near: 0.1, far: 500 }}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
      dpr={[1, 2]}
      onPointerMissed={() => {}}
    >
      <SceneContent />
    </Canvas>
  );
}
