import { useMemo } from 'react';
import * as THREE from 'three';
import { GraphData } from './types';
import { PhysicsEngine } from './PhysicsEngine';

interface RelationshipLinesProps {
  data: GraphData;
  physicsEngine: PhysicsEngine;
  selectedNodeId: string | null;
}

export function RelationshipLines({ data, physicsEngine, selectedNodeId }: RelationshipLinesProps) {
  const lineObjects = useMemo(() => {
    return data.relationships.map(rel => {
      const sourcePos = physicsEngine.getNodePosition(rel.sourceId);
      const targetPos = physicsEngine.getNodePosition(rel.targetId);

      if (!sourcePos || !targetPos) return null;

      const isMainChain = rel.sourceId === selectedNodeId || rel.targetId === selectedNodeId;

      const points = [sourcePos.clone(), targetPos.clone()];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: isMainChain ? 0xffffff : 0x444444,
        transparent: true,
        opacity: isMainChain ? 0.6 : 0.2,
      });

      const line = new THREE.Line(geometry, material);
      return line;
    }).filter(Boolean) as THREE.Line[];
  }, [data.relationships, physicsEngine, selectedNodeId]);

  return (
    <>
      {lineObjects.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </>
  );
}
