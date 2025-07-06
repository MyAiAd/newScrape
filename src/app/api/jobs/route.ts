import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jobs } from '@/lib/db/schema';
import { addScrapingJob, getActiveJobs, getCompletedJobs, getWaitingJobs } from '@/lib/services/job-queue';
import { SearchCriteria } from '@/lib/services/linkedin-scraper';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// Validation schema for search criteria
const searchCriteriaSchema = z.object({
  keywords: z.string().min(1, 'Keywords are required'),
  location: z.string().min(1, 'Location is required'),
  experience: z.string().optional(),
  jobType: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  excludeAgencies: z.boolean().optional(),
  maxPages: z.number().min(1).max(20).optional(),
});

export async function GET() {
  try {
    // Get jobs from queue
    const [activeQueueJobs, waitingQueueJobs, completedQueueJobs] = await Promise.all([
      getActiveJobs(),
      getWaitingJobs(),
      getCompletedJobs()
    ]);

    // Get jobs from database for additional info
    const dbJobs = await db.query.jobs.findMany({
      orderBy: (jobs, { desc }) => [desc(jobs.createdAt)],
      limit: 50
    });

    // Combine queue and database information
    const active = [...activeQueueJobs, ...waitingQueueJobs].map(queueJob => {
      const dbJob = dbJobs.find(j => j.id === queueJob.data.jobId);
      return {
        id: queueJob.data.jobId,
        status: dbJob?.status || 'pending',
        progress: dbJob?.progress || 0,
        searchCriteria: queueJob.data.searchCriteria,
        totalJobsFound: dbJob?.totalJobsFound || 0,
        leadsGenerated: dbJob?.leadsGenerated || 0,
        createdAt: dbJob?.createdAt?.toISOString() || new Date().toISOString(),
        errorMessage: dbJob?.errorMessage
      };
    });

    const completed = dbJobs
      .filter(job => job.status === 'completed' || job.status === 'failed')
      .slice(0, 10)
      .map(job => ({
        id: job.id,
        status: job.status,
        progress: job.progress || 0,
        searchCriteria: job.searchCriteria,
        totalJobsFound: job.totalJobsFound || 0,
        leadsGenerated: job.leadsGenerated || 0,
        createdAt: job.createdAt.toISOString(),
        completedAt: job.completedAt?.toISOString(),
        errorMessage: job.errorMessage
      }));

    return NextResponse.json({
      active,
      completed
    });

  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate search criteria
    const validationResult = searchCriteriaSchema.safeParse(body.searchCriteria);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid search criteria',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const searchCriteria: SearchCriteria = validationResult.data;

    // Check LinkedIn credentials
    const linkedinEmail = process.env.LINKEDIN_EMAIL;
    const linkedinPassword = process.env.LINKEDIN_PASSWORD;

    if (!linkedinEmail || !linkedinPassword) {
      return NextResponse.json(
        { error: 'LinkedIn credentials not configured' },
        { status: 500 }
      );
    }

    // Generate job ID
    const jobId = uuidv4();

    // Create job record in database
    await db.insert(jobs).values({
      id: jobId,
      status: 'pending',
      searchCriteria: searchCriteria as any, // JSON field
      progress: 0,
      totalJobsFound: 0,
      leadsGenerated: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Add job to queue
    await addScrapingJob(
      jobId,
      searchCriteria,
      {
        email: linkedinEmail,
        password: linkedinPassword
      }
    );

    return NextResponse.json({
      jobId,
      status: 'pending',
      message: 'Job added to queue successfully'
    });

  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
} 