'use client';

import { useEffect, useMemo, useState, Component, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import GraphNode3D from './GraphNode3D';
import GraphEdge3D from './GraphEdge3D';
import { useCameraFlight } from './useCameraFlight';
import { useGraphStore } from '../../store/graphStore';
import { computeChainLayout, computeAmbientLayout } from '../../lib/graph-layout';
import type { GraphNode, GraphEdge, RelationType } from '../../lib/types';

interface GraphSceneProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  centerNodeId?: string | null;
  relationType?: RelationType;
  mode?: 'ambient' | 'focus';
}

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

function SceneContent({ nodes, edges, centerNodeId, relationType = 'raw_material_for', mode = 'ambient' }: GraphSceneProps) {
  const {
    setSelectedNodeId,
    selectedNodeId,
    hoveredNodeId,
    setHoveredNodeId,
    flyToNode,
  } = useGraphStore();

  const positions = useMemo(() => {
    if (mode === 'focus' && centerNodeId) {
      const centerNode = nodes.find((n) => n.id === centerNodeId);
      if (centerNode) {
        return computeChainLayout(centerNode, nodes, edges, relationType, {
          centerX: 0,
          centerY: 0,
          centerZ: 0,
          rankSep: 5,
          nodeSep: 2.5,
        });
      }
    }
    return computeAmbientLayout(nodes, { radius: 25 });
  }, [nodes, edges, centerNodeId, relationType, mode]);

  useCameraFlight();

  const handleNodeClick = (nodeId: string) => {
    flyToNode(nodeId);
    setSelectedNodeId(nodeId);
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
        if (!pos) return null;
        return (
          <GraphNode3D
            key={node.id}
            node={node}
            position={pos}
            isCenter={node.id === centerNodeId}
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
        if (!sourcePos || !targetPos) return null;
        return (
          <GraphEdge3D
            key={edge.id}
            edge={edge}
            sourcePos={sourcePos}
            targetPos={targetPos}
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

export default function GraphScene(props: GraphSceneProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="text-gray-400 text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <SceneErrorBoundary>
      <Canvas
        camera={{ position: [0, 0, 30], fov: 60 }}
        gl={{ antialias: true, powerPreference: 'default' }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#ffffff']} />
        <SceneContent {...props} />
      </Canvas>
    </SceneErrorBoundary>
  );
}
