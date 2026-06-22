import { NextResponse } from 'next/server';
import { getNodeWithNeighbors } from '@/lib/graph-data';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const result = getNodeWithNeighbors(id);

  if (!result) {
    return NextResponse.json({ error: 'Node not found' }, { status: 404 });
  }

  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}