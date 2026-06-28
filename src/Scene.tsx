import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import { useGraphStore } from './store';
import { NodeMesh } from './NodeMesh';
import { RelationshipLines } from './RelationshipLines';
import { CameraController } from './CameraController';
import { PhysicsEngine } from './physics';
import * as THREE from 'three';

function PhysicsSimulation() {
  const data = useGraphStore(state => state.data);
  const selectedNodeId = useGraphStore(state => state.selectedNodeId);
  const physicsEngine = useGraphStore(state => state.physicsEngine);
  const setPhysicsEngine = useGraphStore(state => state.setPhysicsEngine);
  const rotationTime = useRef(0);
  
  // 初始化物理引擎
  useEffect(() => {
    if (!data || physicsEngine) return;
    
    const engine = new PhysicsEngine();
    engine.initializeNodes(data.nodes);
    engine.setRelationships(data.relationships);
    setPhysicsEngine(engine);
  }, [data, physicsEngine, setPhysicsEngine]);
  
  // 处理节点选中
  useEffect(() => {
    if (!physicsEngine || !data) return;
    
    if (selectedNodeId) {
      // 计算主链节点的目标位置
      const mainChains = data.chains.filter(chain => 
        chain.nodeIds.includes(selectedNodeId)
      );
      
      if (mainChains.length > 0) {
        const mainChain = mainChains[0];
        const nodeIndex = mainChain.nodeIds.indexOf(selectedNodeId);
        
        // 主链节点按上下游排列
        mainChain.nodeIds.forEach((nodeId, index) => {
          const offset = index - nodeIndex;
          const targetPosition = new THREE.Vector3(
            offset * 10, // X轴：上下游分布
            0,           // Y轴：保持水平
            0            // Z轴：保持在前
          );
          physicsEngine.setConstraint(nodeId, targetPosition);
        });
      }
    } else {
      // 清除所有约束，回到自由状态
      physicsEngine.clearAllConstraints();
    }
  }, [selectedNodeId, physicsEngine, data]);
  
  // 每帧更新物理模拟
  useFrame((_, delta) => {
    if (!physicsEngine) return;
    
    // 物理模拟步进
    physicsEngine.step(delta);
    
    // 全局缓慢旋转（星云公转效果）
    if (!selectedNodeId) {
      rotationTime.current += delta;
      const rotationSpeed = 0.05; // 旋转速度
      const rotationAxis = new THREE.Vector3(0, 1, 0); // 绕Y轴旋转
      physicsEngine.applyGlobalRotation(
        rotationAxis,
        rotationSpeed * delta
      );
    }
  });
  
  return null;
}

export function Scene() {
  const data = useGraphStore(state => state.data);
  const selectNode = useGraphStore(state => state.selectNode);
  
  if (!data) return null;
  
  const handleCanvasClick = (e: any) => {
    // 点击空白处取消选中
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
      
      <PhysicsSimulation />
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
