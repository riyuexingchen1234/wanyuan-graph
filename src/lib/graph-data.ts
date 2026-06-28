import graphDataJson from '../data/graph-data.json';
import type {
  GraphData,
  GraphNode,
  GraphEdge,
  GraphDataProvider,
  ChainDef,
  EdgeRole,
  NodeType,
  EdgeType,
  ValidationError,
  Source,
} from './types';


function normalizeNodeType(oldType: string): NodeType {
  const map: Record<string, NodeType> = {
    material: 'substance',
    product: 'substance',
    substance: 'substance',
    process: 'process',
    equipment: 'equipment',
    facility: 'facility',
    industry: 'facility',
    entity: 'facility',
  };
  return map[oldType] || 'substance';
}

function normalizeEdgeType(oldType: string): EdgeType {
  const map: Record<string, EdgeType> = {
    input: 'input',
    output: 'output',
    equipment_for: 'equipment_for',
    composed_of: 'composed_of',
    is_a: 'is_a',
    raw_material_for: 'input',
    can_be_processed_into: 'output',
    made_of: 'composed_of',
    applied_in: 'output',
    downstream_of: 'output',
    upstream_of: 'input',
    consumable_for: 'input',
    structurally_similar_to: 'is_a',
    product_flow: 'output',
  };
  return map[oldType] || 'is_a';
}

function normalizeSource(oldSrc: any): Source {
  return {
    source_type: oldSrc.source_type || 'other',
    description: oldSrc.description || '',
    url: oldSrc.url,
    accessed_at: oldSrc.accessed_at || oldSrc.retrieved_at || oldSrc.created_at,
  };
}

function normalizeData(raw: any): GraphData {
  const nodes: GraphNode[] = (raw.nodes || []).map((n: any) => ({
    id: n.id,
    name: n.name,
    node_type: normalizeNodeType(n.node_type),
    definition: n.definition || '',
    stage: n.stage || 'draft',
    external_input: n.external_input,
    attributes: n.attributes,
    aliases: (n.aliases || []).map((a: any) => ({
      term: a.term,
      note: a.note || a.context,
      source: a.source ? normalizeSource(a.source) : undefined,
    })),
    contextual_names: n.contextual_names || [],
    chains: n.chains || [],
    primary_chain: n.primary_chain,
    sources: (n.sources || []).map(normalizeSource),
    created_at: n.created_at || new Date().toISOString(),
    updated_at: n.updated_at || new Date().toISOString(),
  }));

  const edges: GraphEdge[] = (raw.edges || []).map((e: any) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    edge_type: normalizeEdgeType(e.edge_type || e.relation_type),
    verification_status: e.verification_status || 'proposed',
    evidence: (e.evidence || []).map(normalizeSource),
    note: e.note,
    created_at: e.created_at || new Date().toISOString(),
    updated_at: e.updated_at || new Date().toISOString(),
  }));

  const chains: Record<string, ChainDef> = raw.chains || {};

  return {
    version: raw.version || '1.0.0',
    published_at: raw.published_at || new Date().toISOString(),
    chains,
    nodes,
    edges,
  };
}

class JsonDataProvider implements GraphDataProvider {
  private data: GraphData;
  private nodeMap: Map<string, GraphNode>;
  private outEdges: Map<string, GraphEdge[]>;
  private inEdges: Map<string, GraphEdge[]>;

  constructor(rawData: any) {
    this.data = normalizeData(rawData);
    this.nodeMap = new Map();
    this.outEdges = new Map();
    this.inEdges = new Map();
    this.buildIndexes();
  }

  private buildIndexes(): void {
    for (const node of this.data.nodes) {
      this.nodeMap.set(node.id, node);
      this.outEdges.set(node.id, []);
      this.inEdges.set(node.id, []);
    }
    for (const edge of this.data.edges) {
      if (this.outEdges.has(edge.source)) {
        this.outEdges.get(edge.source)!.push(edge);
      }
      if (this.inEdges.has(edge.target)) {
        this.inEdges.get(edge.target)!.push(edge);
      }
    }
    this.computeNodeChains();
  }

  private computeNodeChains(): void {
    const chains = this.getViewableChains();
    for (const node of this.data.nodes) {
      const belonging: string[] = [];
      for (const chain of chains) {
        if (this.isNodeInChainFlow(node.id, chain)) {
          belonging.push(chain.id);
        }
      }
      node.chains = belonging;
      if (belonging.length >= 1) {
        node.primary_chain = belonging[0];
      }
    }
  }

  private isNodeInChainFlow(nodeId: string, chain: ChainDef): boolean {
    const startIds = chain.start_substance_ids;
    const endId = chain.end_facility_id;

    const mainAxis = new Set<string>();
    const queue: string[] = [...startIds];
    for (const s of startIds) mainAxis.add(s);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const curNode = this.nodeMap.get(cur);
      if (!curNode) continue;
      if (curNode.node_type === 'substance' || curNode.node_type === 'facility') {
        if (cur === endId) continue;
        for (const e of this.outEdges.get(cur) || []) {
          if (e.edge_type === 'input' && !mainAxis.has(e.target)) {
            const tn = this.nodeMap.get(e.target);
            if (tn && tn.node_type === 'process') {
              mainAxis.add(e.target);
              queue.push(e.target);
            }
          }
        }
      } else if (curNode.node_type === 'process') {
        for (const e of this.outEdges.get(cur) || []) {
          if (e.edge_type === 'output' && !mainAxis.has(e.target)) {
            const tn = this.nodeMap.get(e.target);
            if (tn && (tn.node_type === 'substance' || tn.node_type === 'facility')) {
              mainAxis.add(e.target);
              queue.push(e.target);
            }
          }
        }
      }
    }

    if (mainAxis.has(nodeId)) return true;

    const belong = new Set<string>(mainAxis);
    const auxQueue: string[] = [];

    for (const pid of mainAxis) {
      const pn = this.nodeMap.get(pid);
      if (!pn) continue;
      if (pn.node_type === 'process') {
        for (const e of this.inEdges.get(pid) || []) {
          if (e.edge_type === 'input' && !belong.has(e.source)) {
            const sn = this.nodeMap.get(e.source);
            if (sn && sn.node_type === 'substance') {
              belong.add(e.source);
              auxQueue.push(e.source);
            }
          }
        }
      }
      if (pn.node_type === 'substance' || pn.node_type === 'facility') {
        for (const e of this.outEdges.get(pid) || []) {
          if (e.edge_type === 'composed_of' && !belong.has(e.target)) {
            belong.add(e.target);
            auxQueue.push(e.target);
          }
        }
      }
    }

    while (auxQueue.length > 0) {
      const cur = auxQueue.shift()!;
      if (cur === nodeId) return true;
      const curNode = this.nodeMap.get(cur);
      if (!curNode) continue;
      if (curNode.node_type === 'substance') {
        for (const e of this.inEdges.get(cur) || []) {
          if (e.edge_type === 'output' && !belong.has(e.source)) {
            const pn = this.nodeMap.get(e.source);
            if (pn && pn.node_type === 'process') {
              belong.add(e.source);
              auxQueue.push(e.source);
            }
          }
        }
        for (const e of this.outEdges.get(cur) || []) {
          if (e.edge_type === 'composed_of' && !belong.has(e.target)) {
            belong.add(e.target);
            auxQueue.push(e.target);
          }
        }
      } else if (curNode.node_type === 'process') {
        for (const e of this.inEdges.get(cur) || []) {
          if (e.edge_type === 'input' && !belong.has(e.source)) {
            const sn = this.nodeMap.get(e.source);
            if (sn && sn.node_type === 'substance') {
              belong.add(e.source);
              auxQueue.push(e.source);
            }
          }
        }
      }
    }

    return belong.has(nodeId);
  }

  getGraphData(): GraphData {
    return this.data;
  }

  getNodeById(id: string): GraphNode | undefined {
    return this.nodeMap.get(id);
  }

  getEdgeById(id: string): GraphEdge | undefined {
    return this.data.edges.find(e => e.id === id);
  }

  getNodesByType(type: NodeType): GraphNode[] {
    return this.data.nodes.filter(n => n.node_type === type);
  }

  searchNodes(query: string, chainId?: string, limit: number = 20): GraphNode[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const results: GraphNode[] = [];
    for (const node of this.data.nodes) {
      if (chainId && node.chains && !node.chains.includes(chainId) && node.primary_chain !== chainId) {
        continue;
      }
      if (this.matchesSearch(node, q)) {
        results.push(node);
        if (results.length >= limit) break;
      }
    }
    return results;
  }

  matchesSearch(node: GraphNode, query: string): boolean {
    const q = query.toLowerCase();
    if (node.name.toLowerCase().includes(q)) return true;
    if (node.id.toLowerCase().includes(q)) return true;
    if (node.definition && node.definition.toLowerCase().includes(q)) return true;
    if (node.aliases) {
      for (const a of node.aliases) {
        if (a.term.toLowerCase().includes(q)) return true;
      }
    }
    if (node.contextual_names) {
      for (const c of node.contextual_names) {
        if (c.term.toLowerCase().includes(q)) return true;
      }
    }
    return false;
  }

  getInputs(processId: string): GraphNode[] {
    const edges = this.inEdges.get(processId) || [];
    return edges
      .filter(e => e.edge_type === 'input')
      .map(e => this.nodeMap.get(e.source))
      .filter((n): n is GraphNode => !!n);
  }

  getOutputs(processId: string): GraphNode[] {
    const edges = this.outEdges.get(processId) || [];
    return edges
      .filter(e => e.edge_type === 'output')
      .map(e => this.nodeMap.get(e.target))
      .filter((n): n is GraphNode => !!n);
  }

  getProcessesUsing(substanceId: string): { process: GraphNode; edge: GraphEdge }[] {
    const edges = this.outEdges.get(substanceId) || [];
    return edges
      .filter(e => e.edge_type === 'input')
      .map(e => ({
        process: this.nodeMap.get(e.target)!,
        edge: e,
      }))
      .filter(x => !!x.process);
  }

  getProcessesProducing(substanceId: string): { process: GraphNode; edge: GraphEdge }[] {
    const edges = this.inEdges.get(substanceId) || [];
    return edges
      .filter(e => e.edge_type === 'output')
      .map(e => ({
        process: this.nodeMap.get(e.source)!,
        edge: e,
      }))
      .filter(x => !!x.process);
  }

  getEquipmentForProcess(processId: string): GraphNode[] {
    const edges = this.inEdges.get(processId) || [];
    return edges
      .filter(e => e.edge_type === 'equipment_for')
      .map(e => this.nodeMap.get(e.source))
      .filter((n): n is GraphNode => !!n);
  }

  getComponents(nodeId: string): GraphNode[] {
    const edges = this.outEdges.get(nodeId) || [];
    return edges
      .filter(e => e.edge_type === 'composed_of')
      .map(e => this.nodeMap.get(e.target))
      .filter((n): n is GraphNode => !!n);
  }

  getParentFacility(substanceId: string): GraphNode | undefined {
    const edges = this.inEdges.get(substanceId) || [];
    const comp = edges.find(e => e.edge_type === 'composed_of');
    if (comp) return this.nodeMap.get(comp.source);
    return undefined;
  }

  getUpstreamSubstances(substanceId: string, depth: number = 10): GraphNode[] {
    const result: GraphNode[] = [];
    const visited = new Set<string>([substanceId]);
    const queue: Array<{ id: string; d: number }> = [{ id: substanceId, d: 0 }];
    while (queue.length > 0) {
      const { id, d } = queue.shift()!;
      if (d >= depth) continue;
      const node = this.nodeMap.get(id);
      if (!node) continue;
      if (node.node_type === 'process') {
        for (const e of this.inEdges.get(id) || []) {
          if (e.edge_type === 'input' && !visited.has(e.source)) {
            visited.add(e.source);
            const sn = this.nodeMap.get(e.source);
            if (sn && sn.node_type !== 'equipment') {
              result.push(sn);
            }
            queue.push({ id: e.source, d: d + 1 });
          }
        }
      } else {
        for (const e of this.inEdges.get(id) || []) {
          if (e.edge_type === 'output' && !visited.has(e.source)) {
            visited.add(e.source);
            queue.push({ id: e.source, d: d });
          }
        }
      }
    }
    return result;
  }

  getDownstreamSubstances(substanceId: string, depth: number = 10): GraphNode[] {
    const result: GraphNode[] = [];
    const visited = new Set<string>([substanceId]);
    const queue: Array<{ id: string; d: number }> = [{ id: substanceId, d: 0 }];
    while (queue.length > 0) {
      const { id, d } = queue.shift()!;
      if (d >= depth) continue;
      const node = this.nodeMap.get(id);
      if (!node) continue;
      if (node.node_type === 'substance' || node.node_type === 'facility') {
        for (const e of this.outEdges.get(id) || []) {
          if (e.edge_type === 'input' && !visited.has(e.target)) {
            visited.add(e.target);
            queue.push({ id: e.target, d: d });
          }
        }
      } else if (node.node_type === 'process') {
        for (const e of this.outEdges.get(id) || []) {
          if (e.edge_type === 'output' && !visited.has(e.target)) {
            visited.add(e.target);
            const tn = this.nodeMap.get(e.target);
            if (tn && tn.node_type !== 'equipment') {
              result.push(tn);
            }
            queue.push({ id: e.target, d: d + 1 });
          }
        }
      }
    }
    return result;
  }

  getChainDef(chainId: string): ChainDef | undefined {
    return this.data.chains[chainId];
  }

  getViewableChains(): ChainDef[] {
    return Object.values(this.data.chains).filter(c => c.is_viewable);
  }

  getNodeChains(nodeId: string): string[] {
    const node = this.nodeMap.get(nodeId);
    return node?.chains || [];
  }

  getNodePrimaryChain(nodeId: string): string | undefined {
    const node = this.nodeMap.get(nodeId);
    return node?.primary_chain;
  }

  getMainAxisPath(chainId: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const chain = this.data.chains[chainId];
    if (!chain) return { nodes: [], edges: [] };

    const startIds = chain.start_substance_ids;
    const endId = chain.end_facility_id;

    const prev = new Map<string, { from: string; edge: GraphEdge } | null>();
    for (const s of startIds) prev.set(s, null);
    const queue: string[] = [...startIds];
    let foundEnd: string | null = null;

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur === endId) {
        foundEnd = cur;
        break;
      }
      const curNode = this.nodeMap.get(cur);
      if (!curNode) continue;

      let nextIds: Array<{ id: string; edge: GraphEdge }> = [];
      if (curNode.node_type === 'substance' || curNode.node_type === 'facility') {
        for (const e of this.outEdges.get(cur) || []) {
          if (e.edge_type === 'input') nextIds.push({ id: e.target, edge: e });
        }
      } else if (curNode.node_type === 'process') {
        for (const e of this.outEdges.get(cur) || []) {
          if (e.edge_type === 'output') nextIds.push({ id: e.target, edge: e });
        }
      }

      for (const { id, edge } of nextIds) {
        if (!prev.has(id)) {
          prev.set(id, { from: cur, edge });
          queue.push(id);
        }
      }
    }

    if (!foundEnd) {
      return { nodes: [], edges: [] };
    }

    const pathNodes: GraphNode[] = [];
    const pathEdges: GraphEdge[] = [];
    let cur: string | null = foundEnd;
    while (cur) {
      const n = this.nodeMap.get(cur);
      if (n) pathNodes.unshift(n);
      const p = prev.get(cur);
      if (!p) break;
      pathEdges.unshift(p.edge);
      cur = p.from;
    }
    return { nodes: pathNodes, edges: pathEdges };
  }

  getBranchNodes(mainAxisNodeIds: Set<string>, chainId: string): GraphNode[] {
    const branch = new Set<string>();
    for (const nid of Array.from(mainAxisNodeIds)) {
      const node = this.nodeMap.get(nid);
      if (!node) continue;
      if (node.node_type === 'substance' || node.node_type === 'facility') {
        for (const e of this.outEdges.get(nid) || []) {
          if (e.edge_type === 'input') {
            const proc = this.nodeMap.get(e.target);
            if (!proc || proc.node_type !== 'process') continue;
            for (const oe of this.outEdges.get(proc.id) || []) {
              if (oe.edge_type === 'output' && !mainAxisNodeIds.has(oe.target)) {
                branch.add(e.source);
                const outs = this.collectProcessOutputs(proc.id, mainAxisNodeIds, 2);
                outs.forEach(o => branch.add(o));
              }
            }
            const equipEdges = this.inEdges.get(proc.id) || [];
            for (const ee of equipEdges) {
              if (ee.edge_type === 'equipment_for') {
                branch.add(ee.source);
              }
            }
          }
        }
        for (const e of this.inEdges.get(nid) || []) {
          if (e.edge_type === 'output') {
            const proc = this.nodeMap.get(e.source);
            if (!proc) continue;
            for (const ie of this.inEdges.get(proc.id) || []) {
              if (ie.edge_type === 'input' && !mainAxisNodeIds.has(ie.source)) {
                branch.add(ie.source);
              }
            }
            for (const ee of this.inEdges.get(proc.id) || []) {
              if (ee.edge_type === 'equipment_for') {
                branch.add(ee.source);
              }
            }
          }
        }
      }
    }
    return Array.from(branch).map(id => this.nodeMap.get(id)).filter((n): n is GraphNode => !!n);
  }

  private collectProcessOutputs(procId: string, mainAxis: Set<string>, maxDepth: number): string[] {
    const result: string[] = [];
    const visited = new Set<string>([procId]);
    const queue: Array<{ id: string; d: number }> = [{ id: procId, d: 0 }];
    while (queue.length > 0) {
      const { id, d } = queue.shift()!;
      if (d >= maxDepth) continue;
      const node = this.nodeMap.get(id);
      if (!node) continue;
      if (node.node_type === 'process') {
        for (const e of this.outEdges.get(id) || []) {
          if (e.edge_type === 'output' && !mainAxis.has(e.target) && !visited.has(e.target)) {
            visited.add(e.target);
            result.push(e.target);
          }
        }
      } else if (node.node_type === 'substance' && d > 0) {
        for (const e of this.outEdges.get(id) || []) {
          if (e.edge_type === 'input' && !visited.has(e.target)) {
            visited.add(e.target);
            queue.push({ id: e.target, d: d + 1 });
          }
        }
      }
    }
    return result;
  }

  classifyEdgeForChain(
    edge: GraphEdge,
    _chainId: string,
    mainAxisNodeIds: Set<string>
  ): EdgeRole {
    const sn = this.nodeMap.get(edge.source);
    const tn = this.nodeMap.get(edge.target);
    if (!sn || !tn) return 'outside';

    if (edge.edge_type === 'equipment_for') {
      return mainAxisNodeIds.has(edge.target) ? 'equipment' : 'outside';
    }
    if (edge.edge_type === 'composed_of' || edge.edge_type === 'is_a') {
      return 'outside';
    }

    const sIn = mainAxisNodeIds.has(edge.source);
    const tIn = mainAxisNodeIds.has(edge.target);

    if (sIn && tIn) {
      const sChains = sn.chains || [];
      const tChains = tn.chains || [];
      const isCross =
        sn.primary_chain && tn.primary_chain && sn.primary_chain !== tn.primary_chain;
      if (isCross) {
        const otherNode = sChains.length > 1 || tChains.length > 1;
        if (otherNode) return 'cross_chain';
      }
      return 'main_axis';
    }

    if (sIn || tIn) {
      const otherNode = sIn ? tn : sn;
      if (otherNode.chains && otherNode.chains.length > 1) {
        return 'cross_chain';
      }
      return 'branch';
    }

    return 'outside';
  }

  getCrossChainNodes(chainId: string): Array<{ node: GraphNode; otherChains: string[] }> {
    const result: Array<{ node: GraphNode; otherChains: string[] }> = [];
    for (const node of this.data.nodes) {
      if (node.node_type !== 'substance') continue;
      const chains = node.chains || [];
      if (chains.includes(chainId) && chains.length > 1) {
        result.push({
          node,
          otherChains: chains.filter(c => c !== chainId),
        });
      }
    }
    return result;
  }

  getDisplayName(nodeId: string, chainId?: string): string {
    const node = this.nodeMap.get(nodeId);
    if (!node) return nodeId;
    if (chainId && node.contextual_names) {
      const cn = node.contextual_names.find(c => c.chain_id === chainId);
      if (cn) return cn.term;
    }
    return node.name;
  }

  validateData(): ValidationError[] {
    const errors: ValidationError[] = [];
    const nodeIds = new Set(this.data.nodes.map(n => n.id));
    const nodeMap = this.nodeMap;

    const validMatrix: Record<string, Record<string, EdgeType[]>> = {
      substance: { substance: ['composed_of', 'is_a'], process: ['input'], facility: ['composed_of'] },
      process: { substance: ['output'], facility: ['output'] },
      equipment: { process: ['equipment_for'] },
      facility: { substance: ['composed_of'], facility: ['is_a'] },
    };

    for (const edge of this.data.edges) {
      if (!nodeIds.has(edge.source)) {
        errors.push({ severity: 'error', code: 'DANGLING_REF', message: `边${edge.id}源节点不存在: ${edge.source}`, edgeId: edge.id });
      }
      if (!nodeIds.has(edge.target)) {
        errors.push({ severity: 'error', code: 'DANGLING_REF', message: `边${edge.id}目标节点不存在: ${edge.target}`, edgeId: edge.id });
      }
      if (edge.source === edge.target) {
        errors.push({ severity: 'error', code: 'SELF_LOOP', message: `自环边: ${edge.id}`, edgeId: edge.id });
      }
      const sn = nodeMap.get(edge.source);
      const tn = nodeMap.get(edge.target);
      if (sn && tn) {
        const allowed = validMatrix[sn.node_type]?.[tn.node_type] || [];
        if (!allowed.includes(edge.edge_type)) {
          errors.push({
            severity: 'error',
            code: 'TYPE_VIOLATION',
            message: `类型违规: ${sn.name}(${sn.node_type}) --${edge.edge_type}--> ${tn.name}(${tn.node_type})`,
            edgeId: edge.id,
          });
        }
      }
    }

    const dup = new Set<string>();
    for (const e of this.data.edges) {
      const key = `${e.source}|${e.target}|${e.edge_type}`;
      if (dup.has(key)) {
        errors.push({ severity: 'warning', code: 'DUPLICATE_EDGE', message: `重复边: ${key}`, edgeId: e.id });
      }
      dup.add(key);
    }

    const connected = new Set<string>();
    this.data.edges.forEach(e => { connected.add(e.source); connected.add(e.target); });
    for (const n of this.data.nodes) {
      if (!connected.has(n.id)) {
        errors.push({ severity: 'error', code: 'ISOLATED_NODE', message: `孤立节点: ${n.name}`, nodeId: n.id });
      }
    }

    for (const n of this.data.nodes) {
      if (n.node_type === 'process') {
        const inputs = (this.inEdges.get(n.id) || []).filter(e => e.edge_type === 'input');
        const outputs = (this.outEdges.get(n.id) || []).filter(e => e.edge_type === 'output');
        if (inputs.length === 0) {
          errors.push({ severity: 'error', code: 'PROCESS_NO_INPUT', message: `过程无input: ${n.name}`, nodeId: n.id });
        }
        if (outputs.length === 0) {
          errors.push({ severity: 'error', code: 'PROCESS_NO_OUTPUT', message: `过程无output: ${n.name}`, nodeId: n.id });
        }
      }
      if (n.external_input) {
        const asInput = (this.inEdges.get(n.id) || []).filter(e => e.edge_type === 'output');
        if (asInput.length > 0) {
          errors.push({ severity: 'error', code: 'EXTERNAL_INPUT_HAS_PRODUCER', message: `外部输入节点不应有process产出它: ${n.name}`, nodeId: n.id });
        }
      }
    }

    for (const chain of Object.values(this.data.chains)) {
      if (chain.end_facility_id) {
        const end = nodeMap.get(chain.end_facility_id);
        if (!end) {
          errors.push({ severity: 'error', code: 'CHAIN_END_NOT_FOUND', message: `链${chain.id}终点不存在: ${chain.end_facility_id}` });
        } else if (end.node_type !== 'facility') {
          errors.push({ severity: 'error', code: 'CHAIN_END_NOT_FACILITY', message: `链${chain.id}终点不是facility: ${end.name}(${end.node_type})` });
        }
      }
      for (const s of chain.start_substance_ids) {
        const start = nodeMap.get(s);
        if (!start) {
          errors.push({ severity: 'error', code: 'CHAIN_START_NOT_FOUND', message: `链${chain.id}起点不存在: ${s}` });
        }
      }
    }

    const metals = ['copper_ingot', 'aluminum_ingot'];
    for (const mid of metals) {
      const m = nodeMap.get(mid);
      if (m && (m.chains?.length || 0) < 2) {
        errors.push({ severity: 'warning', code: 'METAL_NOT_CROSS_CHAIN', message: `关键金属${m.name}未连接多链`, nodeId: mid });
      }
    }

    const names = new Map<string, string>();
    for (const n of this.data.nodes) {
      if (names.has(n.name) && names.get(n.name) !== n.id) {
        errors.push({ severity: 'warning', code: 'NAME_COLLISION', message: `重名: ${n.name} (${names.get(n.name)} vs ${n.id})`, nodeId: n.id });
      }
      names.set(n.name, n.id);
    }

    return errors;
  }
}

let providerInstance: JsonDataProvider | null = null;

export function getGraphDataProvider(): GraphDataProvider {
  if (!providerInstance) {
    providerInstance = new JsonDataProvider(graphDataJson);
  }
  return providerInstance;
}

export { JsonDataProvider };
