import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jobs } from '@/lib/db/schema';
import { cancelJob, getJobStatus } from '@/lib/services/job-queue';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;

    // Get job from database
    const dbJob = await db.query.jobs.findFirst({
      where: eq(jobs.id, jobId)
    });

    if (!dbJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Get additional queue status
    const queueStatus = await getJobStatus(jobId);

    return NextResponse.json({
      id: dbJob.id,
      status: dbJob.status,
      progress: dbJob.progress || 0,
      searchCriteria: dbJob.searchCriteria,
      totalJobsFound: dbJob.totalJobsFound || 0,
      leadsGenerated: dbJob.leadsGenerated || 0,
      createdAt: dbJob.createdAt.toISOString(),
      updatedAt: dbJob.updatedAt.toISOString(),
      completedAt: dbJob.completedAt?.toISOString(),
      errorMessage: dbJob.errorMessage,
      queueStatus
    });

  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;

    // Check if job exists
    const dbJob = await db.query.jobs.findFirst({
      where: eq(jobs.id, jobId)
    });

    if (!dbJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Don't allow cancellation of completed jobs
    if (dbJob.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot cancel completed job' },
        { status: 400 }
      );
    }

    // Cancel job in queue
    const cancelled = await cancelJob(jobId);

    if (cancelled) {
      // Update job status in database
      await db.update(jobs)
        .set({
          status: 'cancelled',
          updatedAt: new Date()
        })
        .where(eq(jobs.id, jobId));

      return NextResponse.json({
        message: 'Job cancelled successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to cancel job' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error cancelling job:', error);
    return NextResponse.json(
      { error: 'Failed to cancel job' },
      { status: 500 }
    );
  }
} 