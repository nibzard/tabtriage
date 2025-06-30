import { NextResponse } from 'next/server';
import { client } from '@/db/client';
import { getCurrentUserId as getUser } from '@/utils/get-current-user';
import { logger } from '@/utils/logger';

export async function GET(request: Request) {
  try {
    const userId = getUser(request);
    logger.info(`Debug API: userId = ${userId}`);
    
    // Check database connection info
    const dbUrl = process.env.TURSO_DATABASE_URL || 'file:local.db';
    logger.info(`Database URL: ${dbUrl}`);
    
    // Check if user exists
    const userResult = await client.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [userId]
    });
    
    // Check tabs for this user
    const tabsResult = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM tabs WHERE user_id = ?',
      args: [userId]
    });
    
    // Check all tabs (regardless of user)
    const allTabsResult = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM tabs'
    });
    
    return NextResponse.json({
      userId: userId,
      databaseUrl: dbUrl,
      userExists: userResult.rows.length > 0,
      userTabsCount: (tabsResult.rows[0] as any).count,
      totalTabsCount: (allTabsResult.rows[0] as any).count,
      user: userResult.rows[0] || null
    });
    
  } catch (error) {
    logger.error('Debug API error:', error);
    return NextResponse.json({ 
      error: error.message,
      userId: 'unknown'
    }, { status: 500 });
  }
}