import { NextResponse } from 'next/server';
import { searchNodes } from '@/lib/graph-data';
import type { GraphNode } from '@/lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  
  if (!q || q.trim().length === 0) {
    return NextResponse.json([]);
  }
  
  const results = searchNodes(q);
  return NextResponse.json(results.slice(0, 10));
}