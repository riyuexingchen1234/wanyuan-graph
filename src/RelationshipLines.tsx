import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { useGraphStore } from './store';
import { useState } from 'react';

export function RelationshipLines() {
  const data = useGraphStore(state => state.data);
  const physicsEngine = useGraphStore(state => state.physicsEngine);
  const selectedNodeId = useGraphStore(state => state.selectedNodeId);
  const [lines, setLines] = useState<any[]>([]);
  
  // 每帧更新线条位置
  useFrame(() => {
    if (!data || !physicsEngine) return;
    
    const newLines = data.relationships.map(rel => {
      const sourcePos = physicsEngine.getNodePosition(rel.sourceId);
      const targetPos = physicsEngine.getNodePosition(rel.targetId);
      
      if (!sourcePos || !targetPos) return null;
      
      const isMainChain = selectedNodeId && 
        (rel.sourceId === selectedNodeId || rel.targetId === selectedNodeId);
      
      return {
        id: rel.id,
        points: [
          [sourcePos.x, sourcePos.y, sourcePos.z] as [number, number, number],
          [targetPos.x, targetPos.y, targetPos.z] as [number, number, number]
        ],
        strength: rel.strength,
        isMainChain,
        chainId: rel.chainId
      };
    }).filter(Boolean);
    
    setLines(newLines);
  });
  
  return (
    <>
      {lines.map(line => {
        if (!line) return null;
        
        const opacity = line.isMainChain ? 0.8 : 0.3;
        const color = line.isMainChain ? '#ffffff' : '#666666';
        const lineWidth = line.isMainChain ? 2 : 1;
        
        return (
          <Line
            key={line.id}
            points={line.points}
            color={color}
            lineWidth={lineWidth}
            transparent
            opacity={opacity}
          />
        );
      })}
    </>
  );
}
