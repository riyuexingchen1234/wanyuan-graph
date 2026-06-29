import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useEffect, useState } from 'react';
import { useGraphStore } from './store';
import { NodeMesh } from './NodeMesh';
import { RelationshipLines } from './RelationshipLines';
import { CameraController } from './CameraController';
import { PhysicsEngine } from './PhysicsEngine';
import { PhysicsSimulation } from './PhysicsSimulation';

export function Scene() {
  const data = useGraphStore(state => state.data);
  const selectedNodeId = useGraphStore(state => state.selectedNodeId);
  const selectNode = useGraphStore(state => state.selectNode);
  const setDragging = useGraphStore(state => state.setDragging);
  const cameraMode = useGraphStore(state => state.cameraMode);

  const [physicsEngine, setPhysicsEngine] = useState<PhysicsEngine | null>(null);

  // 初始化物理引擎
  useEffect(() => {
    if (!data || physicsEngine) return;

    const engine = new PhysicsEngine();
    engine.initializeNodes(data.nodes.map(n => n.id));
    engine.setChains(data.chains);
    setPhysicsEngine(engine);
  }, [data, physicsEngine]);

  if (!data || !physicsEngine) return null;

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

      <PhysicsSimulation physicsEngine={physicsEngine} />
      <CameraController physicsEngine={physicsEngine} />

      {data.nodes.map(node => (
        <NodeMesh
          key={node.id}
          node={node}
          physicsEngine={physicsEngine}
        />
      ))}

      <RelationshipLines
        data={data}
        physicsEngine={physicsEngine}
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
