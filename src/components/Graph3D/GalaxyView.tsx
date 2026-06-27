'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, Line, OrbitControls } from '@react-three/drei';
import type { GraphNode, GraphEdge, NodeType } from '@/lib/types';
import {
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
} from '@/lib/dal';
import { useGraphStore } from '@/store/graphStore';
import {
  buildGalaxyLayout,
  type GalaxyLayout,
  type ClusterCenterInfo,
} from './galaxyLayout';
import {
  galaxyPointFragmentShader,
  galaxyPointVertexShader,
} from './galaxyShaders';

interface GalaxyViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelectNode: (id: string) => void;
}

/* -------------------------------------------------------------------------- */
/* 星点拾取阈值设置                                                              */
/* -------------------------------------------------------------------------- */

function RaycasterSetup() {
  const raycaster = useThree((s) => s.raycaster);
  useEffect(() => {
    // Points 拾取需要世界空间阈值，否则点几乎无法被命中
    if (raycaster.params.Points) {
      raycaster.params.Points.threshold = 1.4;
    }
  }, [raycaster]);
  return null;
}

/* -------------------------------------------------------------------------- */
/* 背景星点（远景装饰，不随星云自转）                                              */
/* -------------------------------------------------------------------------- */

function Starfield({ count = 900 }: { count?: number }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // 球壳内随机分布，半径 60~140
      const r = 60 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.7}
        color="#FFFFFF"
        transparent
        opacity={0.55}
        sizeAttenuation={false}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* -------------------------------------------------------------------------- */
/* 节点发光点（单次 draw call）                                                   */
/* -------------------------------------------------------------------------- */

interface GalaxyPointsProps {
  layout: GalaxyLayout;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

function GalaxyPoints({ layout, onHover, onSelect }: GalaxyPointsProps) {
  const { gl } = useThree();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
    }),
    [gl]
  );

  useFrame((_, delta) => {
    uniforms.uTime.value += delta;
  });

  const handleOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const i = e.index;
      if (i == null) return;
      onHover(layout.ids[i] ?? null);
    },
    [layout.ids, onHover]
  );
  const handleOut = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onHover(null);
    },
    [onHover]
  );
  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const i = e.index;
      if (i == null) return;
      const id = layout.ids[i];
      if (id) onSelect(id);
    },
    [layout.ids, onSelect]
  );

  return (
    <points
      onPointerOver={handleOver}
      onPointerOut={handleOut}
      onClick={handleClick}
    >
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[layout.positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aColor"
          args={[layout.colors, 3]}
        />
        <bufferAttribute
          attach="attributes-aSize"
          args={[layout.sizes, 1]}
        />
      </bufferGeometry>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={galaxyPointVertexShader}
        fragmentShader={galaxyPointFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* -------------------------------------------------------------------------- */
/* 主链骨架（细线，单 lineSegments）                                              */
/* -------------------------------------------------------------------------- */

function MainChainSkeleton({ segments }: { segments: Float32Array }) {
  if (segments.length === 0) return null;
  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[segments, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color="#4E5969"
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </lineSegments>
  );
}

/* -------------------------------------------------------------------------- */
/* 次要跨簇线（化工→光伏 / 光伏→需求，暗色细线）                                   */
/* -------------------------------------------------------------------------- */

function SecondaryLinks({
  segments,
  colors,
}: {
  segments: Float32Array;
  colors: Float32Array;
}) {
  if (segments.length === 0) return null;
  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[segments, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.4}
        depthWrite={false}
      />
    </lineSegments>
  );
}

/* -------------------------------------------------------------------------- */
/* 核心跨产业连接（银浆↔光伏，高亮加粗，缓慢呼吸）                                 */
/* -------------------------------------------------------------------------- */

function HeroLine({
  a,
  b,
}: {
  a: [number, number, number];
  b: [number, number, number];
}) {
  const matRef = useRef<THREE.Material | null>(null);

  // 用回调 ref 取到 Line2 的材质并初始化（避免泛型 ref 的类型摩擦）
  const setRef = useCallback((obj: THREE.Object3D | null) => {
    if (!obj) {
      matRef.current = null;
      return;
    }
    const mat = (obj as THREE.LineSegments).material as
      | THREE.Material
      | undefined;
    if (mat) {
      mat.transparent = true;
      mat.opacity = 0.9;
      mat.depthWrite = false;
      matRef.current = mat;
    }
  }, []);

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.opacity =
        0.78 + 0.18 * Math.sin(state.clock.elapsedTime * 1.4);
    }
  });

  return (
    <Line
      ref={setRef}
      points={[a, b]}
      color="#FFC53D"
      lineWidth={2.6}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Hover 高亮（球状光晕 + 标签）                                                 */
/* -------------------------------------------------------------------------- */

function HoverMarker({
  hoveredId,
  layout,
  nodeMap,
}: {
  hoveredId: string | null;
  layout: GalaxyLayout;
  nodeMap: Map<string, GraphNode>;
}) {
  if (!hoveredId) return null;
  const pos = layout.positionById.get(hoveredId);
  const node = nodeMap.get(hoveredId);
  if (!pos || !node) return null;
  const color = NODE_TYPE_COLORS[node.node_type];

  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[0.85, 24, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <Html position={[0, 1.5, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="px-2.5 py-1 rounded-md bg-black/80 border border-white/15 text-white text-xs whitespace-nowrap shadow-lg">
          <span className="font-medium">{node.name}</span>
          <span className="ml-2 text-white/55">
            {NODE_TYPE_LABELS[node.node_type]}
          </span>
        </div>
      </Html>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* 簇标签                                                                       */
/* -------------------------------------------------------------------------- */

function ClusterLabel({ info }: { info: ClusterCenterInfo }) {
  return (
    <Html position={info.position} center style={{ pointerEvents: 'none' }}>
      <div className="flex flex-col items-center gap-1.5 select-none">
        <span
          className="font-serif tracking-[0.4em] text-sm whitespace-nowrap text-white/40"
          style={{ textShadow: '0 0 14px rgba(0,0,0,0.9)' }}
        >
          {info.label}
        </span>
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: info.accent,
            boxShadow: `0 0 10px ${info.accent}`,
          }}
        />
      </div>
    </Html>
  );
}

/* -------------------------------------------------------------------------- */
/* 自转容器（hover 时暂停）                                                       */
/* -------------------------------------------------------------------------- */

function RotatingGroup({
  paused,
  children,
}: {
  paused: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (paused) return;
    if (ref.current) {
      ref.current.rotation.y += delta * 0.03;
    }
  });
  return <group ref={ref}>{children}</group>;
}

/* -------------------------------------------------------------------------- */
/* 场景内容                                                                     */
/* -------------------------------------------------------------------------- */

function GalaxyScene({
  layout,
  nodeMap,
  onSelectNode,
}: {
  layout: GalaxyLayout;
  nodeMap: Map<string, GraphNode>;
  onSelectNode: (id: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hovered]);

  return (
    <>
      <RaycasterSetup />
      <Starfield />
      <RotatingGroup paused={hovered !== null}>
        <GalaxyPoints
          layout={layout}
          onHover={setHovered}
          onSelect={onSelectNode}
        />
        <MainChainSkeleton segments={layout.mainChainSegments} />
        <SecondaryLinks
          segments={layout.secondarySegments}
          colors={layout.secondaryColors}
        />
        {layout.heroEdges.map((e, i) => (
          <HeroLine key={i} a={e.a} b={e.b} />
        ))}
        <HoverMarker
          hoveredId={hovered}
          layout={layout}
          nodeMap={nodeMap}
        />
        {layout.clusterCenters.map((c) => (
          <ClusterLabel key={c.id} info={c} />
        ))}
      </RotatingGroup>
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={14}
        maxDistance={95}
        rotateSpeed={0.6}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 顶层组件：Canvas + 信息层                                                     */
/* -------------------------------------------------------------------------- */

const NODE_TYPE_ORDER: NodeType[] = [
  'material',
  'product',
  'equipment',
  'process',
  'industry',
  'demand',
  'entity',
];

export default function GalaxyView({
  nodes,
  edges,
  onSelectNode,
}: GalaxyViewProps) {
  const layout = useMemo(
    () => buildGalaxyLayout(nodes, edges),
    [nodes, edges]
  );
  const nodeMap = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes]
  );

  // WebGL 可用性检测：不支持时降级到提示页，避免白屏崩溃
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  const setViewMode = useGraphStore((s) => s.setViewMode);
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      setWebglOk(Boolean(gl));
    } catch {
      setWebglOk(false);
    }
  }, []);

  // WebGL 不可用：显示降级提示，提供直接进入 2D 探索的入口
  if (webglOk === false) {
    return (
      <div className="relative w-full h-full bg-canvas-900 overflow-hidden flex flex-col items-center justify-center text-center px-6">
        <h1 className="font-serif text-4xl md:text-5xl tracking-[0.3em] text-white/90 mb-4">
          万源图谱
        </h1>
        <p className="text-white/45 text-sm mb-8">
          您的浏览器环境不支持 WebGL，无法显示 3D 星云
        </p>
        <button
          onClick={() => setViewMode('detail')}
          className="px-6 py-3 bg-arco-primary hover:bg-arco-primary-hover text-white rounded-arco-md text-sm transition-colors"
        >
          直接进入 2D 探索模式
        </button>
      </div>
    );
  }

  // 检测中：显示 loading
  if (webglOk === null) {
    return (
      <div className="relative w-full h-full bg-canvas-900 overflow-hidden flex items-center justify-center">
        <p className="text-white/50 text-sm">星云生成中…</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-canvas-900 overflow-hidden">
      <Canvas
        camera={{ position: [0, 12, 44], fov: 55, near: 0.1, far: 600 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#070B14']} />
        <fog attach="fog" args={['#070B14', 60, 165]} />
        <GalaxyScene
          layout={layout}
          nodeMap={nodeMap}
          onSelectNode={onSelectNode}
        />
      </Canvas>

      {/* 信息层（pointer-events:none，不阻挡 OrbitControls） */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
        <header className="pt-10 md:pt-14 text-center px-4">
          <h1
            className="font-serif text-5xl md:text-6xl tracking-[0.35em] text-white/90"
            style={{ textShadow: '0 0 40px rgba(22,93,255,0.35)' }}
          >
            万源图谱
          </h1>
          <p className="mt-4 text-white/45 tracking-[0.3em] text-xs md:text-sm">
            产业关系的星云
          </p>
        </header>

        <div className="mt-auto mb-8 md:mb-10 text-center px-4">
          <p className="text-white/55 text-sm tracking-wider">
            点击任意节点进入探索
          </p>
        </div>
      </div>

      {/* 图例 */}
      <div className="absolute bottom-5 left-5 z-20 bg-black/55 backdrop-blur-md border border-white/10 rounded-arco-md px-3.5 py-3 shadow-arco-3">
        <div className="text-[11px] text-white/45 mb-2 tracking-wider">
          节点类型
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 max-w-[300px]">
          {NODE_TYPE_ORDER.map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: NODE_TYPE_COLORS[t],
                  boxShadow: `0 0 6px ${NODE_TYPE_COLORS[t]}`,
                }}
              />
              <span className="text-[11px] text-white/70">
                {NODE_TYPE_LABELS[t]}
              </span>
            </div>
          ))}
        </div>

        <div className="text-[11px] text-white/45 mt-3 mb-2 tracking-wider">
          连接
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-6 h-[2.5px] rounded-full"
              style={{ backgroundColor: '#FFC53D', boxShadow: '0 0 6px #FFC53D' }}
            />
            <span className="text-[11px] text-white/70">
              跨产业连接（银浆 → 光伏）
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-6 h-px bg-[#4E5969]" />
            <span className="text-[11px] text-white/55">主链骨架 / 次要连接</span>
          </div>
        </div>
      </div>

      {/* 操作提示 */}
      <div className="absolute bottom-5 right-5 z-20 bg-black/45 backdrop-blur-md border border-white/10 rounded-arco-md px-3 py-2">
        <span className="text-[11px] text-white/55 tracking-wider">
          拖拽旋转 · 滚轮缩放
        </span>
      </div>
    </div>
  );
}
