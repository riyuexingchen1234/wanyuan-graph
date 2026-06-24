import { NextResponse } from 'next/server';
import { getDataProvider } from '@/lib/graph-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || q.trim().length === 0) {
    return NextResponse.json([]);
  }

  const provider = getDataProvider();
  const results = provider.searchNodes(q);
  return NextResponse.json(results.slice(0, 10));
}
