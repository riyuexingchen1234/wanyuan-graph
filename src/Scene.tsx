import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useEffect } from 'react';
import { useGraphStore } from './store';
import { NodeMesh } from './NodeMesh';
import { RelationshipLines } from './RelationshipLines';
import { CameraController } from './CameraController';
import { calculateLayout, calculateGlobalLayout } from './layout';

export function Scene() {
  const data = useGraphStore(state => state.data);
  const selectedNodeId = useGraphStore(state => state.selectedNodeId);
  const setNodePositions = useGraphStore(state => state.setNodePositions);
  const selectNode = useGraphStore(state => state.selectNode);
  
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
  
  const handleCanvasClick = (e: any) => {
    // 点击空白处取消选中
    if (e.target === e.currentTarget) {
      selectNode(null);
    }
  };
  
  return (
    <Canvas
      camera={{ position: [0, 0, 30], fov: 60 }}
      style={{ background: '#0a0a1a' }}
      onClick={handleCanvasClick}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
      
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
        enabled={!selectedNodeId}
      />
    </Canvas>
  );
}
