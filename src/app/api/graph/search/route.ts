import { NextResponse } from 'next/server';
import { getDataProvider } from '@/lib/dal';

/** GET /api/graph/search?q=xxx —— 兼容旧入口，内部走 DAL searchNodes。 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || q.trim().length === 0) {
    return NextResponse.json([]);
  }

  const provider = getDataProvider();
  const results = provider.searchNodes(q);
  return NextResponse.json(results.slice(0, 10), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
