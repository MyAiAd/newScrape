import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jobs } from '@/lib/db/schema';

export async function GET() {
  try {
    // Test database connection with a simple query
    await db.select().from(jobs).limit(1);
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        api: 'running'
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
        services: {
          database: 'disconnected',
          api: 'running'
        }
      },
      { status: 503 }
    );
  }
} 