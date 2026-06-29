import { useMemo } from 'react';
import * as THREE from 'three';
import { GraphData } from './types';
import { PhysicsEngine } from './PhysicsEngine';

interface RelationshipLinesProps {
  data: GraphData;
  physicsEngine: PhysicsEngine;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
}

export function RelationshipLines({ data, physicsEngine, selectedNodeId, hoveredNodeId }: RelationshipLinesProps) {
  const highlightedChains = useMemo(() => {
    const chains = new Set<string>();
    if (selectedNodeId) {
      for (const cid of physicsEngine.getChainsContainingNode(selectedNodeId)) {
        chains.add(cid);
      }
    }
    if (hoveredNodeId) {
      for (const cid of physicsEngine.getChainsContainingNode(hoveredNodeId)) {
        chains.add(cid);
      }
    }
    return chains;
  }, [selectedNodeId, hoveredNodeId, physicsEngine]);

  const lineObjects = useMemo(() => {
    return data.relationships.map(rel => {
      const sourcePos = physicsEngine.getNodePosition(rel.sourceId);
      const targetPos = physicsEngine.getNodePosition(rel.targetId);

      if (!sourcePos || !targetPos) return null;

      const isHighlighted = highlightedChains.has(rel.chainId || '') ||
        rel.sourceId === selectedNodeId || rel.targetId === selectedNodeId ||
        rel.sourceId === hoveredNodeId || rel.targetId === hoveredNodeId;

      const points = [sourcePos.clone(), targetPos.clone()];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: isHighlighted ? 0x66ccff : 0x333344,
        transparent: true,
        opacity: isHighlighted ? 0.8 : 0.15,
      });

      const line = new THREE.Line(geometry, material);
      return line;
    }).filter(Boolean) as THREE.Line[];
  }, [data.relationships, physicsEngine, selectedNodeId, hoveredNodeId, highlightedChains]);

  return (
    <>
      {lineObjects.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </>
  );
}
