import { NextResponse } from 'next/server';
import { getDataProvider } from '@/lib/graph-data';
import type { RelationType } from '@/lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const node = searchParams.get('node');
  const chain = searchParams.get('chain');
  const depthParam = searchParams.get('depth');
  const mode = searchParams.get('mode');

  const provider = getDataProvider();

  if (node && chain) {
    const depth = depthParam ? parseInt(depthParam, 10) : 1;
    if (isNaN(depth) || depth < 1 || depth > 5) {
      return NextResponse.json(
        { error: 'Invalid depth parameter (must be 1-5)' },
        { status: 400 }
      );
    }
    const result = provider.getChainView(
      node,
      chain as RelationType,
      depth
    );
    if (!result) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  if (node && mode === 'detail') {
    const nodeData = provider.getNodeById(node);
    if (!nodeData) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }
    const parent = provider.getNodeParent(node);
    const children = provider.getNodeChildren(node);
    const chainSummary = provider.getNodeChainSummary(node);

    return NextResponse.json(
      {
        node: nodeData,
        parent,
        children,
        chain_summary: chainSummary?.chains ?? [],
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }

  if (node) {
    const result = provider.getNodeChainSummary(node);
    if (!result) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const graph = provider.getGraphData();
  return NextResponse.json(graph, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
