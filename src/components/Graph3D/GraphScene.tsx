'use client';

import { useState, Component, ReactNode, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import GraphNode3D from './GraphNode3D';
import GraphEdge3D from './GraphEdge3D';
import { useCameraFlight } from './useCameraFlight';
import { useGraphStore } from '../../store/graphStore';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class SceneErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('3D Scene error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-white">
          <div className="text-center">
            <p className="text-gray-600 mb-2">3D 场景加载失败</p>
            <p className="text-xs text-gray-400">{this.state.error?.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function SceneContent() {
  const {
    nodes,
    edges,
    positions,
    depths,
    focusNodeId,
    selectedNodeId,
    hoveredNodeId,
    setHoveredNodeId,
    navigateToNode,
    setSelectedNodeId,
  } = useGraphStore();

  useCameraFlight();

  const handleNodeClick = (nodeId: string) => {
    navigateToNode(nodeId);
  };

  const visibleEdges = useMemo(() => {
    return edges.filter(
      (e) => positions.has(e.source) && positions.has(e.target)
    );
  }, [edges, positions]);

  return (
    <>
      <ambientLight intensity={1} />

      {nodes.map((node) => {
        const pos = positions.get(node.id);
        const depth = depths.get(node.id) ?? 99;
        if (!pos) return null;
        return (
          <GraphNode3D
            key={node.id}
            node={node}
            position={pos}
            depth={depth}
            isCenter={node.id === focusNodeId}
            isSelected={node.id === selectedNodeId}
            isHovered={node.id === hoveredNodeId}
            onClick={() => handleNodeClick(node.id)}
            onPointerOver={() => setHoveredNodeId(node.id)}
            onPointerOut={() => setHoveredNodeId(null)}
          />
        );
      })}

      {visibleEdges.map((edge) => {
        const sourcePos = positions.get(edge.source);
        const targetPos = positions.get(edge.target);
        const sourceDepth = depths.get(edge.source) ?? 99;
        const targetDepth = depths.get(edge.target) ?? 99;
        const edgeDepth = Math.min(sourceDepth, targetDepth);
        if (!sourcePos || !targetPos) return null;
        return (
          <GraphEdge3D
            key={edge.id}
            edge={edge}
            sourcePos={sourcePos}
            targetPos={targetPos}
            depth={edgeDepth}
          />
        );
      })}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={100}
      />
    </>
  );
}

export default function GraphScene() {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <SceneErrorBoundary>
      <Canvas
        camera={{ position: [0, 0, 30], fov: 60 }}
        gl={{ antialias: true, powerPreference: 'default' }}
        dpr={[1, 2]}
        onCreated={() => setIsLoaded(true)}
      >
        <color attach="background" args={['#ffffff']} />
        <SceneContent />
      </Canvas>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white pointer-events-none">
          <div className="text-gray-400 text-sm">加载中...</div>
        </div>
      )}
    </SceneErrorBoundary>
  );
}
