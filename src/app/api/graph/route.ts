import { NextResponse } from 'next/server';
import { getFullGraph, searchNodes } from '../../../lib/graph-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (q) {
    const results = searchNodes(q);
    return NextResponse.json(results, { headers: { 'Cache-Control': 'no-store' } });
  }

  const graph = getFullGraph();
  return NextResponse.json(graph, { headers: { 'Cache-Control': 'no-store' } });
}