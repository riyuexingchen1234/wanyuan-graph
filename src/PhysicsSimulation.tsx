import { useFrame } from '@react-three/fiber';
import { useGraphStore } from './store';
import { PhysicsEngine } from './PhysicsEngine';

interface PhysicsSimulationProps {
  physicsEngine: PhysicsEngine;
}

export function PhysicsSimulation({ physicsEngine }: PhysicsSimulationProps) {
  const selectedNodeId = useGraphStore(state => state.selectedNodeId);
  const hoveredNodeId = useGraphStore(state => state.hoveredNodeId);
  const isDragging = useGraphStore(state => state.isDragging);

  useFrame((_, delta) => {
    const isPaused = !!(selectedNodeId || hoveredNodeId || isDragging);
    physicsEngine.step(delta, isPaused);
  });

  return null;
}
