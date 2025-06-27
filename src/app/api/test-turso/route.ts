import { NextResponse } from 'next/server';
import { db, generateId } from '@/db/client';
import { users } from '@/db/schema';

export async function GET() {
  try {
    // Test database connection
    const testUser = {
      id: generateId(),
      email: 'test@example.com',
      displayName: 'Test User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Try to insert a test user
    await db.insert(users).values(testUser).onConflictDoNothing();
    
    // Try to query users
    const allUsers = await db.select().from(users).limit(5);
    
    return NextResponse.json({
      success: true,
      message: 'Turso connection successful',
      userCount: allUsers.length,
      testUserId: testUser.id,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}