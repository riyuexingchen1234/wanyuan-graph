import { NextResponse } from 'next/server';
import { readPendingReviews } from '@/lib/data-manager';

function verifyAdminKey(request: Request): boolean {
  const adminKey = request.headers.get('x-admin-key');
  const validKey = process.env.ADMIN_KEY;
  
  if (!validKey) return true;
  return adminKey === validKey;
}

export async function GET(request: Request) {
  if (!verifyAdminKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const reviews = readPendingReviews();
    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Error reading pending reviews:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read pending reviews' },
      { status: 500 }
    );
  }
}
