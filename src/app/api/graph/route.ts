import { NextResponse } from 'next/server';
import { getGraphData, getNodeChains, getChainView } from '@/lib/graph-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const node = searchParams.get('node');
  const chain = searchParams.get('chain');
  const depthParam = searchParams.get('depth');

  // GET /api/graph?node={id}&chain={relationType}&depth={n} → 链路视图
  if (node && chain) {
    const depth = depthParam ? parseInt(depthParam, 10) : 3;
    const result = getChainView(node, chain, isNaN(depth) ? 3 : depth);
    if (!result) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  // GET /api/graph?node={id} → 节点链路信息
  if (node) {
    const result = getNodeChains(node);
    if (!result) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  // GET /api/graph → 完整图数据
  const graph = getGraphData();
  return NextResponse.json(graph, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
