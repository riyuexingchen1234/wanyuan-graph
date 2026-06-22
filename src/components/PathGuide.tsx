import { useState, useEffect, useCallback } from 'react';
import cytoscape from 'cytoscape';
import type { NodeWithNeighbors, GraphNode } from '@/lib/types';
import { SAMPLE_PATH, SAMPLE_PATH_NODE_IDS } from '@/lib/sample-path';

interface PathGuideProps {
  cyInstance: cytoscape.Core | null;
  neighborsMap: Map<string, NodeWithNeighbors>;
  onNodeSelect: (id: string) => void;
  isActive: boolean;
  onExit: () => void;
}

interface Direction {
  nodeId: string;
  nodeName: string;
  relationType: string;
  relationLabel: string;
  coordinateSystem: string;
  isVisited: boolean;
  isTransition: boolean;
}

const RELATION_LABELS: Record<string, string> = {
  upstream_of: '上游',
  downstream_of: '下游',
  can_be_processed_into: '可加工成',
  applied_in: '应用于',
  made_of: '由...制成',
  structurally_similar_to: '结构相似',
};

const ROLE_COLORS: Record<string, string> = {
  '起点': 'bg-coord-a text-white',
  'A域-下游': 'bg-coord-a text-white',
  '交汇点': 'bg-coord-ab text-white animate-pulse',
  'B域-材料': 'bg-coord-b text-white',
  'B域-延伸': 'bg-coord-b text-white',
};

export default function PathGuide({
  cyInstance,
  neighborsMap,
  onNodeSelect,
  isActive,
  onExit,
}: PathGuideProps) {
  const [currentNodeId, setCurrentNodeId] = useState<string>(SAMPLE_PATH[0].nodeId);
  const [visitedPath, setVisitedPath] = useState<string[]>([SAMPLE_PATH[0].nodeId]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const currentPathInfo = SAMPLE_PATH.find(s => s.nodeId === currentNodeId);
  const currentNeighbors = neighborsMap.get(currentNodeId);

  useEffect(() => {
    if (isActive && cyInstance && currentNodeId) {
      const node = cyInstance.getElementById(currentNodeId);
      if (node.length > 0) {
        cyInstance.center(node);
        cyInstance.animate({ zoom: 1.3 }, { duration: 500, easing: 'ease-in-out-cubic' });
      }
    }
  }, [isActive, cyInstance, currentNodeId]);

  const getDirections = useCallback((): Direction[] => {
    if (!currentNeighbors) return [];

    const allNeighbors: Direction[] = [];

    const addNeighbors = (neighbors: { node: GraphNode; edge: { relation_type: string; source: string } }[], direction: string) => {
      neighbors.forEach(neighbor => {
        const targetId = neighbor.edge.source === currentNodeId ? neighbor.node.id : neighbor.node.id;
        const targetNode = neighbor.node;
        const pathInfo = SAMPLE_PATH.find(s => s.nodeId === targetId);
        
        allNeighbors.push({
          nodeId: targetId,
          nodeName: targetNode.name,
          relationType: neighbor.edge.relation_type,
          relationLabel: RELATION_LABELS[neighbor.edge.relation_type] || direction,
          coordinateSystem: targetNode.coordinate_systems.includes('A') && targetNode.coordinate_systems.includes('B') ? 'AB' 
            : targetNode.coordinate_systems.includes('A') ? 'A' 
            : 'B',
          isVisited: visitedPath.includes(targetId),
          isTransition: (currentPathInfo?.isTransitionPoint ?? false) && (pathInfo?.coordinateSystem === 'B'),
        });
      });
    };

    addNeighbors(currentNeighbors.upstream.map(n => ({ node: n.node, edge: { ...n.edge, relation_type: 'upstream_of' } })), '上游');
    addNeighbors(currentNeighbors.downstream.map(n => ({ node: n.node, edge: { ...n.edge, relation_type: 'downstream_of' } })), '下游');
    addNeighbors(currentNeighbors.related.map(n => ({ node: n.node, edge: n.edge })), '相关');

    return allNeighbors;
  }, [currentNeighbors, currentNodeId, visitedPath, currentPathInfo]);

  const handleJump = useCallback((targetNodeId: string) => {
    if (!cyInstance || isTransitioning) return;

    const targetPathInfo = SAMPLE_PATH.find(s => s.nodeId === targetNodeId);
    const isNewTransition = currentPathInfo?.isTransitionPoint && targetPathInfo?.coordinateSystem === 'B';

    if (isNewTransition) {
      setIsTransitioning(true);
      
      cyInstance.nodes().filter(n => {
        const coords = n.data('coordinate_systems') as ('A' | 'B')[];
        return coords.includes('A') && !coords.includes('B');
      }).animate({
        style: { opacity: 0 },
        position: ((node: any) => ({
          x: node.position().x - 200,
          y: node.position().y - 150,
        })) as any,
      }, { duration: 1200, easing: 'ease-in-out-cubic' });

      cyInstance.nodes().filter(n => {
        const coords = n.data('coordinate_systems') as ('A' | 'B')[];
        return coords.includes('B');
      }).animate({
        style: { opacity: 0 },
      }, { duration: 100 }).animate({
        style: { opacity: 1 },
        position: ((node: any) => ({
          x: node.position().x + 100,
          y: node.position().y + 80,
        })) as any,
      }, { duration: 1200, easing: 'ease-in-out-cubic' });

      setTimeout(() => {
        completeJump(targetNodeId);
      }, 1300);
    } else {
      completeJump(targetNodeId);
    }
  }, [cyInstance, currentPathInfo, isTransitioning]);

  const completeJump = (targetNodeId: string) => {
    if (!cyInstance) return;

    const edge = cyInstance.edges().filter(`[source="${currentNodeId}"][target="${targetNodeId}"], [source="${targetNodeId}"][target="${currentNodeId}"]`);
    
    if (edge.length > 0) {
      edge.animate({ style: { 'line-width': 4, 'line-opacity': 1 } }, { duration: 300 });
    }

    const targetNode = cyInstance.getElementById(targetNodeId);
    if (targetNode.length > 0) {
      cyInstance.animate({
        center: { eles: targetNode },
        zoom: 1.3,
      }, { duration: 800, easing: 'ease-in-out-cubic' });

      cyInstance.elements().not(`node[id="${targetNodeId}"]`).not(`edge[source="${targetNodeId}"], edge[target="${targetNodeId}"]`).not(`node[id="${currentNodeId}"]`).animate({
        style: { opacity: 0.1 },
      }, { duration: 300 });
    }

    setTimeout(() => {
      setCurrentNodeId(targetNodeId);
      setVisitedPath(prev => prev.includes(targetNodeId) ? prev : [...prev, targetNodeId]);
      setIsTransitioning(false);

      if (targetNodeId === SAMPLE_PATH_NODE_IDS[SAMPLE_PATH_NODE_IDS.length - 1]) {
        setIsCompleted(true);
      }

      onNodeSelect(targetNodeId);
    }, 600);
  };

  const handleReset = useCallback(() => {
    if (!cyInstance) return;

    cyInstance.elements().animate({
      style: { opacity: 1 },
    }, { duration: 300 });

    setCurrentNodeId(SAMPLE_PATH[0].nodeId);
    setVisitedPath([SAMPLE_PATH[0].nodeId]);
    setIsCompleted(false);

    const startNode = cyInstance.getElementById(SAMPLE_PATH[0].nodeId);
    if (startNode.length > 0) {
      cyInstance.animate({
        center: { eles: startNode },
        zoom: 1.3,
      }, { duration: 500 });
    }

    onNodeSelect(SAMPLE_PATH[0].nodeId);
  }, [cyInstance, onNodeSelect]);

  const handleFreeBrowse = useCallback(() => {
    if (cyInstance) {
      cyInstance.elements().animate({
        style: { opacity: 1 },
      }, { duration: 300 });
    }
    onExit();
  }, [cyInstance, onExit]);

  const directions = getDirections();

  if (!isActive) return null;

  if (isCompleted) {
    return (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 min-w-[500px] max-w-[680px]">
        <div className="bg-canvas-900/95 backdrop-blur rounded-arco-lg shadow-arco-4 border border-canvas-700 p-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-coord-ab/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-coord-ab" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h3 className="text-arco-lg font-semibold text-white mb-3">探索完成</h3>
            <p className="text-arco-sm leading-relaxed text-white/70 mb-6">
              你从光伏出发，经过储能和电池隔膜，换轨到材料视角，最终走到了快递包装。这就是被行业分类切断的连接。
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-coord-ab hover:bg-coord-ab/80 text-white rounded-arco-md text-sm transition-colors"
              >
                重新探索
              </button>
              <button
                onClick={handleFreeBrowse}
                className="px-4 py-2 bg-canvas-700 hover:bg-canvas-600 text-white rounded-arco-md text-sm transition-colors"
              >
                自由浏览
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 min-w-[500px] max-w-[680px]">
      <div className="bg-canvas-900/95 backdrop-blur rounded-arco-lg shadow-arco-4 border border-canvas-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-arco-lg font-semibold text-white">{currentPathInfo?.nodeName || '节点'}</h3>
              <span className={`px-2 py-0.5 rounded-arco-sm text-xs font-medium ${ROLE_COLORS[currentPathInfo?.role || '']}`}>
                {currentPathInfo?.role}
              </span>
            </div>
            <p className="text-arco-sm leading-relaxed text-white/70">
              {currentPathInfo?.narration}
            </p>
          </div>
        </div>

        {currentPathInfo?.isTransitionPoint && (
          <div className="bg-coord-ab/10 border border-coord-ab/30 rounded-arco-md px-3 py-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-arco-sm font-medium text-coord-ab">坐标系换轨点</span>
              <span className="text-arco-xs text-white/60">选择「聚乙烯」方向将切换到材料视角</span>
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="text-arco-xs text-white/50 mb-2">可走方向</div>
          <div className="grid grid-cols-2 gap-2">
            {directions.map(dir => (
              <button
                key={dir.nodeId}
                onClick={() => !dir.isVisited && handleJump(dir.nodeId)}
                disabled={dir.isVisited || isTransitioning}
                className={`
                  px-3 py-2 rounded-arco-md text-left text-sm transition-all
                  ${dir.isVisited 
                    ? 'bg-canvas-800/50 text-white/40 cursor-not-allowed' 
                    : dir.isTransition
                      ? 'bg-coord-ab/20 border border-coord-ab/50 text-white hover:bg-coord-ab/30 cursor-pointer'
                      : 'bg-canvas-800/80 text-white/80 hover:bg-canvas-700 cursor-pointer'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{dir.nodeName}</span>
                  {dir.isTransition && (
                    <span className="text-xs text-coord-ab">换轨 →</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-white/50">{dir.relationLabel}</span>
                  <span className="text-xs text-white/40">[{dir.coordinateSystem}]</span>
                  {dir.isVisited && <span className="text-xs text-white/40">已探索</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-canvas-700 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-arco-xs text-white/60">
              已走路径:
              <div className="flex items-center gap-1 ml-2">
                {visitedPath.map((nodeId, index) => {
                  const pathInfo = SAMPLE_PATH.find(s => s.nodeId === nodeId);
                  return (
                    <span key={nodeId}>
                      <span className={`
                        px-2 py-0.5 rounded-arco-sm text-xs
                        ${nodeId === currentNodeId 
                          ? 'bg-arco-primary text-white' 
                          : 'bg-canvas-700 text-white/60'
                        }
                      `}>
                        {pathInfo?.nodeName || nodeId}
                      </span>
                      {index < visitedPath.length - 1 && (
                        <span className="mx-1 text-white/40">→</span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="px-3 py-1.5 bg-canvas-700 hover:bg-canvas-600 text-white/80 rounded-arco-sm text-xs transition-colors"
              >
                重置探索
              </button>
              <button
                onClick={onExit}
                className="px-3 py-1.5 bg-canvas-700 hover:bg-canvas-600 text-white/80 rounded-arco-sm text-xs transition-colors"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}