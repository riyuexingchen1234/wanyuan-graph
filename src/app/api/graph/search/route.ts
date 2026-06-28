import { NextResponse } from 'next/server';
import { getGraphDataProvider } from '@/lib/graph-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const chainId = searchParams.get('chain');

  if (!q || q.trim().length === 0) {
    return NextResponse.json([]);
  }

  const provider = getGraphDataProvider();
  const results = provider.searchNodes(q, chainId || undefined);
  return NextResponse.json(
    results.slice(0, 10).map(n => ({
      ...n,
      display_name: provider.getDisplayName(n.id, chainId || undefined),
    }))
  );
}
