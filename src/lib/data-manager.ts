import fs from 'fs';
import path from 'path';
import type { GraphData, GraphNode, GraphEdge } from './types';

const DATA_PATH = process.env.WANYUAN_DATA_PATH || 'src/data/sample-data.json';
const BACKUP_DIR = 'src/data/backups';
const PENDING_FILE = 'src/data/pending-reviews.json';

function getFullPath(relativePath: string): string {
  return path.join(process.cwd(), relativePath);
}

function ensureBackupDir(): void {
  const backupPath = getFullPath(BACKUP_DIR);
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true });
  }
}

export function readGraphData(): GraphData {
  const fullPath = getFullPath(DATA_PATH);
  const content = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(content);
}

export function writeGraphData(data: GraphData): void {
  const fullPath = getFullPath(DATA_PATH);
  ensureBackupDir();
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = getFullPath(`${BACKUP_DIR}/backup-${timestamp}.json`);
  fs.copyFileSync(fullPath, backupPath);
  
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf-8');
}

export function appendGraphData(newData: { nodes?: GraphNode[]; edges?: GraphEdge[] }): GraphData {
  const currentData = readGraphData();
  
  const existingNodeIds = new Set(currentData.nodes.map(n => n.id));
  const existingEdgeIds = new Set(currentData.edges.map(e => e.id));
  
  const newNodes = (newData.nodes || []).filter(n => !existingNodeIds.has(n.id));
  const newEdges = (newData.edges || []).filter(e => !existingEdgeIds.has(e.id));
  
  return {
    nodes: [...currentData.nodes, ...newNodes],
    edges: [...currentData.edges, ...newEdges],
  };
}

export function readPendingReviews(): any[] {
  const fullPath = getFullPath(PENDING_FILE);
  if (!fs.existsSync(fullPath)) {
    return [];
  }
  const content = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(content);
}

export function writePendingReviews(reviews: any[]): void {
  const fullPath = getFullPath(PENDING_FILE);
  fs.writeFileSync(fullPath, JSON.stringify(reviews, null, 2), 'utf-8');
}

export function addPendingReview(review: any): void {
  const reviews = readPendingReviews();
  reviews.push(review);
  writePendingReviews(reviews);
}

export function updatePendingReview(taskId: string, updates: Partial<any>): void {
  const reviews = readPendingReviews();
  const index = reviews.findIndex(r => r.task_id === taskId);
  if (index !== -1) {
    reviews[index] = { ...reviews[index], ...updates };
    writePendingReviews(reviews);
  }
}

export function removePendingReview(taskId: string): void {
  const reviews = readPendingReviews();
  const filtered = reviews.filter(r => r.task_id !== taskId);
  writePendingReviews(filtered);
}

export function updateEdgeStatus(
  edgeId: string,
  status: 'verified' | 'proposed',
  evidence?: any[]
): void {
  const data = readGraphData();
  
  const edgeIndex = data.edges.findIndex(e => e.id === edgeId);
  if (edgeIndex === -1) {
    throw new Error(`Edge not found: ${edgeId}`);
  }
  
  if (status === 'verified' && (!evidence || evidence.length === 0)) {
    throw new Error('Evidence required to mark edge as verified');
  }
  
  data.edges[edgeIndex] = {
    ...data.edges[edgeIndex],
    verification_status: status,
    evidence: status === 'verified' ? evidence : data.edges[edgeIndex].evidence,
    updated_at: new Date().toISOString(),
  };
  
  writeGraphData(data);
}

export function deleteNode(nodeId: string): void {
  const data = readGraphData();
  
  data.nodes = data.nodes.filter(n => n.id !== nodeId);
  data.edges = data.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
  
  writeGraphData(data);
}

export function deleteEdge(edgeId: string): void {
  const data = readGraphData();
  
  data.edges = data.edges.filter(e => e.id !== edgeId);
  
  writeGraphData(data);
}

export function updateNode(nodeId: string, updates: Partial<GraphNode>): void {
  const data = readGraphData();
  
  const nodeIndex = data.nodes.findIndex(n => n.id === nodeId);
  if (nodeIndex === -1) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  
  data.nodes[nodeIndex] = {
    ...data.nodes[nodeIndex],
    ...updates,
    id: nodeId,
    updated_at: new Date().toISOString(),
  };
  
  writeGraphData(data);
}

export function updateEdge(edgeId: string, updates: Partial<GraphEdge>): void {
  const data = readGraphData();
  
  const edgeIndex = data.edges.findIndex(e => e.id === edgeId);
  if (edgeIndex === -1) {
    throw new Error(`Edge not found: ${edgeId}`);
  }
  
  data.edges[edgeIndex] = {
    ...data.edges[edgeIndex],
    ...updates,
    id: edgeId,
    updated_at: new Date().toISOString(),
  };
  
  writeGraphData(data);
}
