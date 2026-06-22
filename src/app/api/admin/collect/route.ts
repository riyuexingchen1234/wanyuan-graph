import { NextResponse } from 'next/server';
import { collectNode, CollectionTask } from '@/lib/data-collector';
import { addPendingReview } from '@/lib/data-manager';

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
    const task: CollectionTask = body.task;

    if (!task || !task.target || !task.target.name) {
      return NextResponse.json({ error: 'Invalid task' }, { status: 400 });
    }

    const result = await collectNode(task);
    
    if (result.status === 'success' && result.collected_data) {
      addPendingReview({
        ...result,
        status: 'pending_review',
        reviewed_at: null,
        reviewed_by: null,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Collection error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Collection failed' },
      { status: 500 }
    );
  }
}
