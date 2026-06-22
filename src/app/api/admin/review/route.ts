import { NextResponse } from 'next/server';
import { removePendingReview, appendGraphData } from '@/lib/data-manager';

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
    const { action, taskId } = body;

    if (!taskId) {
      return NextResponse.json({ error: 'taskId required' }, { status: 400 });
    }

    if (action === 'approve') {
      const { nodes, edges } = body;
      
      appendGraphData({
        nodes: nodes || [],
        edges: edges || [],
      });
      
      removePendingReview(taskId);
      
      return NextResponse.json({ success: true, message: 'Data approved and added to graph' });
    }

    if (action === 'reject') {
      const { reason } = body;
      removePendingReview(taskId);
      
      return NextResponse.json({ success: true, message: 'Review rejected and removed' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Review error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Review failed' },
      { status: 500 }
    );
  }
}
