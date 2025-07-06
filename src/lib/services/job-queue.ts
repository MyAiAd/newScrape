import Queue from 'bull';
import Redis from 'ioredis';
import { SearchCriteria } from './linkedin-scraper';

export interface ScrapingJobData {
  jobId: string;
  searchCriteria: SearchCriteria;
  linkedinEmail: string;
  linkedinPassword: string;
}

export interface JobProgress {
  progress: number;
  currentPage: number;
  totalPages: number;
  jobsFound: number;
  message: string;
}

// Create Redis connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Create queue
export const scrapingQueue = new Queue<ScrapingJobData>('linkedin-scraping', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    removeOnComplete: 10, // Keep last 10 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

// Job processing function will be registered in the worker
export async function addScrapingJob(
  jobId: string,
  searchCriteria: SearchCriteria,
  linkedinCredentials: { email: string; password: string }
): Promise<Queue.Job<ScrapingJobData>> {
  return await scrapingQueue.add('scrape-linkedin', {
    jobId,
    searchCriteria,
    linkedinEmail: linkedinCredentials.email,
    linkedinPassword: linkedinCredentials.password,
  }, {
    jobId: jobId, // Use custom job ID for tracking
    timeout: 30 * 60 * 1000, // 30 minutes timeout
  });
}

export async function getJobStatus(jobId: string): Promise<{
  status: string;
  progress: number;
  data?: any;
  result?: any;
  error?: string;
} | null> {
  try {
    const job = await scrapingQueue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    const progress = job.progress() as number;
    
    return {
      status: state,
      progress: progress || 0,
      data: job.data,
      result: job.returnvalue,
      error: job.failedReason,
    };
  } catch (error) {
    console.error('Error getting job status:', error);
    return null;
  }
}

export async function cancelJob(jobId: string): Promise<boolean> {
  try {
    const job = await scrapingQueue.getJob(jobId);
    if (!job) return false;

    await job.remove();
    return true;
  } catch (error) {
    console.error('Error cancelling job:', error);
    return false;
  }
}

export async function getActiveJobs(): Promise<Queue.Job<ScrapingJobData>[]> {
  return await scrapingQueue.getActive();
}

export async function getWaitingJobs(): Promise<Queue.Job<ScrapingJobData>[]> {
  return await scrapingQueue.getWaiting();
}

export async function getCompletedJobs(): Promise<Queue.Job<ScrapingJobData>[]> {
  return await scrapingQueue.getCompleted();
}

export async function getFailedJobs(): Promise<Queue.Job<ScrapingJobData>[]> {
  return await scrapingQueue.getFailed();
}

// Queue event handlers
scrapingQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed successfully with result:`, result);
});

scrapingQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

scrapingQueue.on('progress', (job, progress) => {
  console.log(`Job ${job.id} progress: ${progress}%`);
});

scrapingQueue.on('stalled', (job) => {
  console.warn(`Job ${job.id} stalled`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await scrapingQueue.close();
  redis.disconnect();
});

process.on('SIGINT', async () => {
  await scrapingQueue.close();
  redis.disconnect();
}); 