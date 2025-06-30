import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { tabs } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { logger } from '@/utils/logger';
import { ensureUserExists } from '@/utils/ensure-user';

async function getCurrentUserId(): Promise<string> {
  const userId = 'user_001';
  await ensureUserExists(userId);
  return userId;
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const existingTabs = await db
      .select()
      .from(tabs)
      .where(and(eq(tabs.userId, userId), inArray(tabs.url, urls)));

    logger.info('Found existing tabs:', existingTabs);

    return NextResponse.json({ existingTabs });
  } catch (error) {
    logger.error('Error in POST check-duplicates route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
