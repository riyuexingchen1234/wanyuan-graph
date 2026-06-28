import { NextResponse } from 'next/server';
import { getGraphDataProvider } from '@/lib/graph-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const node = searchParams.get('node');
  const chain = searchParams.get('chain');

  const provider = getGraphDataProvider();

  if (node && chain) {
    const chainDef = provider.getChainDef(chain);
    if (!chainDef) {
      return NextResponse.json({ error: 'Chain not found' }, { status: 404 });
    }
    const nodeData = provider.getNodeById(node);
    if (!nodeData) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }
    const mainAxis = provider.getMainAxisPath(chain);
    const mainAxisNodeIds = new Set(mainAxis.nodes.map(n => n.id));
    const branchNodes = provider.getBranchNodes(mainAxisNodeIds, chain);
    const crossChainNodes = provider.getCrossChainNodes(chain);
    const displayName = provider.getDisplayName(node, chain);
    return NextResponse.json(
      {
        chain: chainDef,
        node: { ...nodeData, display_name: displayName },
        main_axis: mainAxis,
        branch_nodes: branchNodes,
        cross_chain_nodes: crossChainNodes,
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }

  if (node) {
    const nodeData = provider.getNodeById(node);
    if (!nodeData) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    let inputs: any[] = [];
    let outputs: any[] = [];
    let equipment: any[] = [];
    let components: any[] = [];
    let upstream: any[] = [];
    let downstream: any[] = [];

    if (nodeData.node_type === 'process') {
      inputs = provider.getInputs(node).map(n => ({
        ...n,
        display_name: provider.getDisplayName(n.id),
      }));
      outputs = provider.getOutputs(node).map(n => ({
        ...n,
        display_name: provider.getDisplayName(n.id),
      }));
      equipment = provider.getEquipmentForProcess(node).map(n => ({
        ...n,
        display_name: provider.getDisplayName(n.id),
      }));
    } else if (nodeData.node_type === 'substance') {
      const processesUsing = provider.getProcessesUsing(node);
      const processesProducing = provider.getProcessesProducing(node);
      components = provider.getComponents(node).map(n => ({
        ...n,
        display_name: provider.getDisplayName(n.id),
      }));
      upstream = provider.getUpstreamSubstances(node, 2).map(n => ({
        ...n,
        display_name: provider.getDisplayName(n.id),
      }));
      downstream = provider.getDownstreamSubstances(node, 2).map(n => ({
        ...n,
        display_name: provider.getDisplayName(n.id),
      }));
      inputs = processesUsing.map(p => ({ ...p.process, edge: p.edge }));
      outputs = processesProducing.map(p => ({ ...p.process, edge: p.edge }));
    }

    const nodeChains = provider.getNodeChains(node);
    const chains = nodeChains.map(cid => {
      const cd = provider.getChainDef(cid);
      return cd ? { id: cid, name: cd.name, color: cd.color } : null;
    }).filter(Boolean);

    return NextResponse.json(
      {
        node: { ...nodeData, display_name: provider.getDisplayName(node) },
        inputs,
        outputs,
        equipment,
        components,
        upstream,
        downstream,
        chains,
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }

  const graph = provider.getGraphData();
  const viewableChains = provider.getViewableChains();
  const validationErrors = provider.validateData();
  return NextResponse.json(
    {
      ...graph,
      viewable_chains: viewableChains,
      validation_errors: validationErrors,
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
