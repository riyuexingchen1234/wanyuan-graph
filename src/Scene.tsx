import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import { useGraphStore } from './store';
import { NodeMesh } from './NodeMesh';
import { RelationshipLines } from './RelationshipLines';
import { CameraController } from './CameraController';
import { PhysicsEngine } from './PhysicsEngine';

export function Scene() {
  const data = useGraphStore(state => state.data);
  const selectedNodeId = useGraphStore(state => state.selectedNodeId);
  const hoveredNodeId = useGraphStore(state => state.hoveredNodeId);
  const isDragging = useGraphStore(state => state.isDragging);
  const selectNode = useGraphStore(state => state.selectNode);
  const setDragging = useGraphStore(state => state.setDragging);
  const cameraMode = useGraphStore(state => state.cameraMode);

  const physicsEngineRef = useRef<PhysicsEngine | null>(null);
  const isPaused = !!(selectedNodeId || hoveredNodeId || isDragging);

  // 初始化物理引擎
  useEffect(() => {
    if (!data) return;

    const engine = new PhysicsEngine();
    engine.initializeNodes(data.nodes.map(n => n.id));
    engine.setRelationships(
      data.relationships.map(r => ({ source: r.sourceId, target: r.targetId }))
    );
    physicsEngineRef.current = engine;
  }, [data]);

  // 物理模拟
  useFrame((_, delta) => {
    if (!physicsEngineRef.current) return;
    physicsEngineRef.current.step(delta, isPaused);
  });

  if (!data) return null;

  const handleCanvasClick = (e: any) => {
    if (e.target === e.currentTarget) {
      selectNode(null);
    }
  };

  return (
    <Canvas
      camera={{ position: [0, 0, 50], fov: 60 }}
      style={{ background: '#0a0a1a' }}
      onClick={handleCanvasClick}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />

      <CameraController physicsEngine={physicsEngineRef.current} />

      {data.nodes.map(node => (
        <NodeMesh
          key={node.id}
          node={node}
          physicsEngine={physicsEngineRef.current!}
        />
      ))}

      <RelationshipLines
        data={data}
        physicsEngine={physicsEngineRef.current!}
        selectedNodeId={selectedNodeId}
      />

      <OrbitControls
        enabled={cameraMode !== 'flying'}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={100}
        onStart={() => setDragging(true)}
        onEnd={() => setDragging(false)}
      />
    </Canvas>
  );
}
