import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import { useGraphStore } from './store';
import { NodeMesh } from './NodeMesh';
import { RelationshipLines } from './RelationshipLines';
import { CameraController } from './CameraController';
import { calculateLayout, calculateGlobalLayout } from './layout';

export function Scene() {
  const data = useGraphStore(state => state.data);
  const selectedNodeId = useGraphStore(state => state.selectedNodeId);
  const setNodePositions = useGraphStore(state => state.setNodePositions);
  
  useEffect(() => {
    if (!data) return;
    
    if (selectedNodeId) {
      const positions = calculateLayout(
        selectedNodeId,
        data.nodes,
        data.relationships,
        data.chains
      );
      setNodePositions(positions);
    } else {
      const positions = calculateGlobalLayout(data.nodes, data.chains);
      setNodePositions(positions);
    }
  }, [data, selectedNodeId, setNodePositions]);
  
  if (!data) return null;
  
  return (
    <Canvas
      camera={{ position: [0, 0, 30], fov: 60 }}
      style={{ background: '#1a1a1a' }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      
      <CameraController />
      
      {data.nodes.map(node => (
        <NodeMesh key={node.id} node={node} />
      ))}
      
      <RelationshipLines />
      
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={100}
      />
    </Canvas>
  );
}
