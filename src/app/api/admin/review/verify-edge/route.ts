import { NextResponse } from 'next/server';
import { updateEdgeStatus } from '@/lib/data-manager';

function verifyAdminKey(request: Request): boolean {
  const adminKey = request.headers.get('x-admin-key');
  const validKey = process.env.ADMIN_KEY;
  
  if (!validKey) return true;
  return adminKey === validKey;
}

export async function POST(request: Request) {
  if (!verifyAdminKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { edgeId, evidence } = body;

    if (!edgeId) {
      return NextResponse.json({ error: 'edgeId required' }, { status: 400 });
    }

    if (!evidence || !Array.isArray(evidence) || evidence.length === 0) {
      return NextResponse.json({ error: 'evidence required and must be non-empty array' }, { status: 400 });
    }

    updateEdgeStatus(edgeId, 'verified', evidence);

    return NextResponse.json({ success: true, message: 'Edge verified' });
  } catch (error) {
    console.error('Verify edge error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verify failed' },
      { status: 500 }
    );
  }
}
