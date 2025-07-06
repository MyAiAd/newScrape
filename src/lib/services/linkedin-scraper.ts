import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { PuppeteerBlocker } from '@ghostery/adblocker-puppeteer';
import { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';

// Configure puppeteer with stealth plugins
puppeteer.use(StealthPlugin());

// Add adblocker
PuppeteerBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
  // The blocker will be applied when pages are created
});

export interface SearchCriteria {
  keywords: string;
  location: string;
  experience?: string; // entry-level, mid-level, senior
  jobType?: string; // full-time, part-time, contract
  industry?: string;
  companySize?: string;
  excludeAgencies?: boolean;
  maxPages?: number;
}

export interface JobListing {
  title: string;
  company: string;
  location: string;
  url: string;
  description?: string;
  salary?: string;
  postedDate?: string;
  hiringManager?: {
    name?: string;
    title?: string;
    linkedinUrl?: string;
    email?: string;
  };
}

export interface ScrapingProgress {
  currentPage: number;
  totalPages: number;
  jobsFound: number;
  progress: number;
}

export class LinkedInScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isLoggedIn = false;
  private blocker: any = null;

  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Initialize adblocker
    try {
      this.blocker = await PuppeteerBlocker.fromPrebuiltAdsAndTracking(fetch);
      await this.blocker.enableBlockingInPage(this.page);
    } catch (error) {
      console.warn('Could not initialize ad blocker:', error);
    }
    
    // Set user agent and viewport
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await this.page.setViewport({ width: 1366, height: 768 });
  }

  async login(email: string, password: string): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      await this.page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2' });
      
      // Fill login form
      await this.page.type('#username', email);
      await this.page.type('#password', password);
      
      // Click login button
      await this.page.click('button[type="submit"]');
      
      // Wait for navigation
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
      
      // Check if we're logged in by looking for profile indicator
      const isLoggedIn = await this.page.$('button[aria-label*="View profile"]') !== null;
      this.isLoggedIn = isLoggedIn;
      
      return isLoggedIn;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }

  async searchJobs(
    criteria: SearchCriteria,
    onProgress?: (progress: ScrapingProgress) => void
  ): Promise<JobListing[]> {
    if (!this.page) throw new Error('Browser not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in to LinkedIn');

    const jobs: JobListing[] = [];
    const maxPages = criteria.maxPages || 5;

    // Build search URL
    const searchUrl = this.buildSearchUrl(criteria);
    
    for (let page = 0; page < maxPages; page++) {
      try {
        const pageUrl = `${searchUrl}&start=${page * 25}`;
        await this.page.goto(pageUrl, { waitUntil: 'networkidle2' });
        
        // Random delay to avoid detection
        await this.randomDelay(2000, 4000);
        
        // Extract job listings from current page
        const pageJobs = await this.extractJobsFromPage();
        jobs.push(...pageJobs);
        
        // Update progress
        if (onProgress) {
          onProgress({
            currentPage: page + 1,
            totalPages: maxPages,
            jobsFound: jobs.length,
            progress: Math.round(((page + 1) / maxPages) * 100)
          });
        }
        
        // Check if there are more pages
        const hasNextPage = await this.page.$('button[aria-label="Next"]') !== null;
        if (!hasNextPage) break;
        
      } catch (error) {
        console.error(`Error on page ${page + 1}:`, error);
        // Continue with next page
      }
    }

    return jobs;
  }

  private buildSearchUrl(criteria: SearchCriteria): string {
    const params = new URLSearchParams({
      keywords: criteria.keywords,
      location: criteria.location,
      f_TPR: 'r604800', // Past week
      f_JT: 'F', // Full-time jobs
    });

    if (criteria.experience) {
      const expMap = {
        'entry-level': '1',
        'mid-level': '2',
        'senior': '3'
      };
      params.append('f_E', expMap[criteria.experience as keyof typeof expMap] || '');
    }

    return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
  }

  private async extractJobsFromPage(): Promise<JobListing[]> {
    if (!this.page) return [];

    return await this.page.evaluate(() => {
      const jobCards = document.querySelectorAll('[data-job-id]');
      const jobs: JobListing[] = [];

      jobCards.forEach((card) => {
        try {
          const titleElement = card.querySelector('.job-card-list__title a');
          const companyElement = card.querySelector('.job-card-container__company-name');
          const locationElement = card.querySelector('.job-card-container__metadata-item');
          const linkElement = card.querySelector('.job-card-list__title a');

          if (titleElement && companyElement && linkElement) {
            jobs.push({
              title: titleElement.textContent?.trim() || '',
              company: companyElement.textContent?.trim() || '',
              location: locationElement?.textContent?.trim() || '',
              url: (linkElement as HTMLAnchorElement).href || '',
            });
          }
        } catch (error) {
          console.error('Error extracting job:', error);
        }
      });

      return jobs;
    });
  }

  async extractHiringManagerInfo(jobUrl: string): Promise<JobListing['hiringManager']> {
    if (!this.page) return undefined;

    try {
      await this.page.goto(jobUrl, { waitUntil: 'networkidle2' });
      await this.randomDelay(1000, 3000);

      // Look for hiring manager information
      const hiringManager = await this.page.evaluate(() => {
        // Try to find "Meet the hiring team" section
        const hiringSection = document.querySelector('[data-test-id="hiring-team"]');
        if (!hiringSection) return undefined;

        const nameElement = hiringSection.querySelector('.hiring-team__name');
        const titleElement = hiringSection.querySelector('.hiring-team__title');
        const profileLink = hiringSection.querySelector('a[href*="/in/"]');

        return {
          name: nameElement?.textContent?.trim(),
          title: titleElement?.textContent?.trim(),
          linkedinUrl: (profileLink as HTMLAnchorElement)?.href,
        };
      });

      return hiringManager;
    } catch (error) {
      console.error('Error extracting hiring manager:', error);
      return undefined;
    }
  }

  async extractJobDescription(jobUrl: string): Promise<string> {
    if (!this.page) return '';

    try {
      await this.page.goto(jobUrl, { waitUntil: 'networkidle2' });
      await this.randomDelay(1000, 2000);

      const description = await this.page.evaluate(() => {
        const descElement = document.querySelector('.jobs-description__content');
        return descElement?.textContent?.trim() || '';
      });

      return description;
    } catch (error) {
      console.error('Error extracting job description:', error);
      return '';
    }
  }

  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isLoggedIn = false;
    }
  }
} 