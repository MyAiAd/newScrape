import * as dotenv from 'dotenv';
import { scrapingQueue, ScrapingJobData } from '../lib/services/job-queue';
import { LinkedInScraper, JobListing } from '../lib/services/linkedin-scraper';
import { GoogleSheetsService } from '../lib/services/google-sheets';
import { db } from '../lib/db';
import { jobs, leads, companies } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// Create service instances
const googleSheets = new GoogleSheetsService();

// Recruitment agency keywords to filter out
const RECRUITMENT_AGENCY_KEYWORDS = [
  'recruitment', 'recruiter', 'talent', 'staffing', 'headhunter',
  'executive search', 'consulting', 'temp agency', 'placement',
  'resource solutions', 'people solutions', 'workforce',
  'reed', 'adecco', 'randstad', 'hays', 'michael page',
  'robert half', 'kelly services', 'manpower', 'allegis'
];

// Function to check if a company is likely a recruitment agency
function isRecruitmentAgency(companyName: string): boolean {
  const name = companyName.toLowerCase();
  return RECRUITMENT_AGENCY_KEYWORDS.some(keyword => 
    name.includes(keyword.toLowerCase())
  );
}

// Function to calculate lead score
function calculateLeadScore(job: JobListing): number {
  let score = 50; // Base score

  // Higher score for direct companies
  if (!isRecruitmentAgency(job.company)) {
    score += 30;
  } else {
    score -= 20;
  }

  // Score based on job details
  if (job.hiringManager?.name) score += 15;
  if (job.hiringManager?.email) score += 20;
  if (job.salary) score += 10;
  if (job.description && job.description.length > 200) score += 5;

  // Check for quality indicators in title/description
  const qualityKeywords = ['senior', 'lead', 'manager', 'director', 'head of'];
  const titleLower = job.title.toLowerCase();
  if (qualityKeywords.some(keyword => titleLower.includes(keyword))) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

// Main job processor
scrapingQueue.process('scrape-linkedin', async (job) => {
  const { jobId, searchCriteria, linkedinEmail, linkedinPassword } = job.data;
  
  console.log(`Starting scraping job ${jobId}`);
  
  let scraper: LinkedInScraper | null = null;
  
  try {
    // Update job status to running
    await db.update(jobs)
      .set({ 
        status: 'running',
        updatedAt: new Date()
      })
      .where(eq(jobs.id, jobId));

    // Initialize scraper
    scraper = new LinkedInScraper();
    await scraper.initialize();
    
    // Login to LinkedIn
    const loginSuccess = await scraper.login(linkedinEmail, linkedinPassword);
    if (!loginSuccess) {
      throw new Error('Failed to login to LinkedIn');
    }

    job.progress(10);
    await db.update(jobs)
      .set({ progress: 10 })
      .where(eq(jobs.id, jobId));

    // Search for jobs with progress tracking
    const jobListings = await scraper.searchJobs(searchCriteria, (progress) => {
      job.progress(10 + (progress.progress * 0.6)); // 10% to 70%
      
      // Update database
      db.update(jobs)
        .set({ 
          progress: Math.round(10 + (progress.progress * 0.6)),
          totalJobsFound: progress.jobsFound 
        })
        .where(eq(jobs.id, jobId))
        .catch(console.error);
    });

    console.log(`Found ${jobListings.length} jobs for ${jobId}`);

    // Process each job listing
    let processedCount = 0;
    const validLeads = [];

    for (const jobListing of jobListings) {
      try {
        // Skip recruitment agencies if excluded
        if (searchCriteria.excludeAgencies && isRecruitmentAgency(jobListing.company)) {
          continue;
        }

        // Get detailed job info
        const description = await scraper.extractJobDescription(jobListing.url);
        const hiringManager = await scraper.extractHiringManagerInfo(jobListing.url);

        // Create enhanced job listing
        const enhancedJob: JobListing = {
          ...jobListing,
          description,
          hiringManager
        };

        // Calculate lead score
        const leadScore = calculateLeadScore(enhancedJob);
        
        // Only keep qualified leads (score > 40)
        if (leadScore > 40) {
          // Find or create company
          let companyRecord = await db.query.companies.findFirst({
            where: eq(companies.name, jobListing.company)
          });

          if (!companyRecord) {
            const [newCompany] = await db.insert(companies).values({
              name: jobListing.company,
              isRecruitmentAgency: isRecruitmentAgency(jobListing.company)
            }).returning();
            companyRecord = newCompany;
          }

          // Create lead record
          const [leadRecord] = await db.insert(leads).values({
            jobId,
            companyId: companyRecord.id,
            fullName: hiringManager?.name,
            title: hiringManager?.title,
            email: hiringManager?.email,
            linkedinUrl: hiringManager?.linkedinUrl,
            jobTitle: jobListing.title,
            jobUrl: jobListing.url,
            jobLocation: jobListing.location,
            jobDescription: description,
            jobSalary: jobListing.salary,
            leadScore,
            isQualified: true
          }).returning();

          validLeads.push({
            fullName: leadRecord.fullName,
            firstName: leadRecord.firstName,
            lastName: leadRecord.lastName,
            title: leadRecord.title,
            email: leadRecord.email,
            linkedinUrl: leadRecord.linkedinUrl,
            companyName: jobListing.company,
            jobTitle: leadRecord.jobTitle,
            jobUrl: leadRecord.jobUrl,
            jobLocation: leadRecord.jobLocation,
            jobSalary: leadRecord.jobSalary,
            leadScore: leadRecord.leadScore,
            qualificationNotes: leadRecord.qualificationNotes
          });
        }

        processedCount++;
        
        // Update progress (70% to 90%)
        const progressPercent = 70 + ((processedCount / jobListings.length) * 20);
        job.progress(progressPercent);
        
        await db.update(jobs)
          .set({ 
            progress: Math.round(progressPercent),
            leadsGenerated: validLeads.length 
          })
          .where(eq(jobs.id, jobId));

      } catch (error) {
        console.error(`Error processing job listing:`, error);
        // Continue with next job
      }
    }

    // Export to Google Sheets if we have leads
    if (validLeads.length > 0) {
      job.progress(90);
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const sheetTitle = `LinkedIn Leads - ${searchCriteria.keywords} - ${timestamp}`;
      
      const { spreadsheetId, url } = await googleSheets.createSpreadsheet(sheetTitle);
      
      await googleSheets.exportLeads(spreadsheetId, validLeads, {
        sheetName: 'Leads',
        includeHeaders: true,
        clearExisting: true
      });

      // Update leads as exported
      for (const lead of validLeads) {
        await db.update(leads)
          .set({ 
            exportedToSheets: true,
            exportedAt: new Date()
          })
          .where(eq(leads.jobUrl, lead.jobUrl));
      }

      console.log(`Exported ${validLeads.length} leads to Google Sheets: ${url}`);
    }

    // Mark job as completed
    await db.update(jobs)
      .set({ 
        status: 'completed',
        progress: 100,
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(jobs.id, jobId));

    job.progress(100);

    return {
      totalJobsFound: jobListings.length,
      leadsGenerated: validLeads.length,
      completedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
    
    // Mark job as failed
    await db.update(jobs)
      .set({ 
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date()
      })
      .where(eq(jobs.id, jobId));

    throw error;
  } finally {
    // Clean up
    if (scraper) {
      await scraper.close();
    }
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down worker...');
  await scrapingQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  await scrapingQueue.close();
  process.exit(0);
});

console.log('LinkedIn scraper worker started');
console.log('Waiting for jobs...'); 