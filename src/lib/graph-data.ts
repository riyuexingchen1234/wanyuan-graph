import sampleData from '../data/sample-data.json';
import { validateGraphData } from './schema-validator';
import type { GraphData, GraphNode, NodeWithNeighbors, NeighborNode, GraphEdge } from './types';

let graphData: GraphData;

const validationResult = validateGraphData(sampleData);
if (!validationResult.valid) {
  console.error('Graph data validation failed:', validationResult.errors);
  throw new Error('Invalid graph data');
}
graphData = sampleData as GraphData;

export function getFullGraph(): GraphData {
  return graphData;
}

export function getNodeById(id: string): GraphNode | undefined {
  return graphData.nodes.find(node => node.id === id);
}

export function getNodeWithNeighbors(id: string): NodeWithNeighbors | undefined {
  const node = getNodeById(id);
  if (!node) return undefined;

  const upstream: NeighborNode[] = [];
  const downstream: NeighborNode[] = [];
  const related: NeighborNode[] = [];
  const edges: GraphEdge[] = [];

  for (const edge of graphData.edges) {
    if (edge.source === id || edge.target === id) {
      edges.push(edge);
      
      const neighborId = edge.source === id ? edge.target : edge.source;
      const neighborNode = getNodeById(neighborId);
      
      if (neighborNode) {
        const neighbor: NeighborNode = { node: neighborNode, edge };
        
        if (edge.source === id) {
          if (edge.relation_type === 'upstream_of') {
            downstream.push(neighbor);
          } else if (edge.relation_type === 'downstream_of') {
            upstream.push(neighbor);
          } else {
            related.push(neighbor);
          }
        } else {
          if (edge.relation_type === 'upstream_of') {
            upstream.push(neighbor);
          } else if (edge.relation_type === 'downstream_of') {
            downstream.push(neighbor);
          } else {
            related.push(neighbor);
          }
        }
      }
    }
  }

  return { node, upstream, downstream, related, edges };
}

export function searchNodes(keyword: string): GraphNode[] {
  const lowerKeyword = keyword.toLowerCase();
  return graphData.nodes.filter(node => {
    const nameMatch = node.name.toLowerCase().includes(lowerKeyword);
    const aliasMatch = node.aliases?.some(alias => 
      alias.term.toLowerCase().includes(lowerKeyword)
    ) ?? false;
    return nameMatch || aliasMatch;
  }).slice(0, 20);
}

export function getEdges(): GraphData['edges'] {
  return graphData.edges;
}