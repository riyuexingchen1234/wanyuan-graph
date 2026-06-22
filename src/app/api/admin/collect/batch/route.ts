import { NextResponse } from 'next/server';
import { collectBatch, CollectionTask } from '@/lib/data-collector';
import { addPendingReview } from '@/lib/data-manager';
import { PRESET_TASKS } from '@/lib/collection-tasks';

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
    const { tasks, usePresets } = body;

    let tasksToRun: CollectionTask[];
    
    if (usePresets) {
      tasksToRun = PRESET_TASKS;
    } else if (tasks && Array.isArray(tasks)) {
      tasksToRun = tasks;
    } else {
      return NextResponse.json({ error: 'No tasks provided' }, { status: 400 });
    }

    const results = await collectBatch(tasksToRun);

    for (const result of results) {
      if (result.status === 'success' && result.collected_data) {
        addPendingReview({
          ...result,
          status: 'pending_review',
          reviewed_at: null,
          reviewed_by: null,
        });
      }
    }

    return NextResponse.json({
      total: tasksToRun.length,
      results,
    });
  } catch (error) {
    console.error('Batch collection error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Batch collection failed' },
      { status: 500 }
    );
  }
}
