import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import { useGraphStore } from './store';
import { NodeMesh } from './NodeMesh';
import { RelationshipLines } from './RelationshipLines';
import { CameraController } from './CameraController';
import { PhysicsEngine } from './PhysicsEngine';
import * as THREE from 'three';

function RotatingGroup({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  const selectedNodeId = useGraphStore(state => state.selectedNodeId);
  const hoveredNodeId = useGraphStore(state => state.hoveredNodeId);
  const isDragging = useGraphStore(state => state.isDragging);
  const cameraMode = useGraphStore(state => state.cameraMode);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (selectedNodeId || hoveredNodeId || isDragging || cameraMode === 'flying') return;
    
    groupRef.current.rotation.y += delta * 0.08;
  });

  return <group ref={groupRef}>{children}</group>;
}

export function Scene() {
  const data = useGraphStore(state => state.data);
  const selectedNodeId = useGraphStore(state => state.selectedNodeId);
  const hoveredNodeId = useGraphStore(state => state.hoveredNodeId);
  const selectNode = useGraphStore(state => state.selectNode);
  const setDragging = useGraphStore(state => state.setDragging);
  const cameraMode = useGraphStore(state => state.cameraMode);

  const [physicsEngine, setPhysicsEngine] = useState<PhysicsEngine | null>(null);

  useEffect(() => {
    if (!data || physicsEngine) return;

    const engine = new PhysicsEngine();
    engine.setChains(data.chains);
    setPhysicsEngine(engine);
  }, [data, physicsEngine]);

  if (!data || !physicsEngine) return null;

  const handleCanvasClick = (e: any) => {
    if (e.target === e.currentTarget) {
      selectNode(null);
    }
  };

  const highlightedChains = new Set<string>();
  if (selectedNodeId) {
    for (const cid of physicsEngine.getChainsContainingNode(selectedNodeId)) {
      highlightedChains.add(cid);
    }
  }
  if (hoveredNodeId) {
    for (const cid of physicsEngine.getChainsContainingNode(hoveredNodeId)) {
      highlightedChains.add(cid);
    }
  }

  const highlightedNodes = new Set<string>();
  for (const cid of highlightedChains) {
    const chain = physicsEngine.getChainById(cid);
    if (chain) {
      for (const nid of chain.nodeIds) {
        highlightedNodes.add(nid);
      }
    }
  }

  const sharedNodes = new Set<string>();
  for (const node of data.nodes) {
    if (physicsEngine.getChainsContainingNode(node.id).length > 1) {
      sharedNodes.add(node.id);
    }
  }

  return (
    <Canvas
      camera={{ position: [0, 0, 50], fov: 60 }}
      style={{ background: '#0a0a1a' }}
      onClick={handleCanvasClick}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />

      <CameraController physicsEngine={physicsEngine} />

      <RotatingGroup>
        <RelationshipLines
          data={data}
          physicsEngine={physicsEngine}
          selectedNodeId={selectedNodeId}
          hoveredNodeId={hoveredNodeId}
        />

        {data.nodes.map(node => (
          <NodeMesh
            key={node.id}
            node={node}
            physicsEngine={physicsEngine}
            isHighlighted={highlightedNodes.has(node.id)}
            isShared={sharedNodes.has(node.id)}
          />
        ))}
      </RotatingGroup>

      <OrbitControls
        makeDefault
        enabled={cameraMode !== 'flying'}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={500}
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
        enableDamping={true}
        dampingFactor={0.05}
        onStart={() => setDragging(true)}
        onEnd={() => setDragging(false)}
      />
    </Canvas>
  );
}
