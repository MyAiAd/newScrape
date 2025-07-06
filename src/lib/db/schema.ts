import { pgTable, serial, varchar, text, timestamp, boolean, integer, jsonb, uuid as pgUuid } from 'drizzle-orm/pg-core';

// Jobs table - tracks scraping jobs
export const jobs = pgTable('jobs', {
  id: pgUuid('id').defaultRandom().primaryKey(),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, running, completed, failed
  searchCriteria: jsonb('search_criteria').notNull(),
  totalJobsFound: integer('total_jobs_found').default(0),
  leadsGenerated: integer('leads_generated').default(0),
  progress: integer('progress').default(0), // percentage
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

// Companies table - track companies to avoid recruitment agencies
export const companies = pgTable('companies', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  linkedinUrl: varchar('linkedin_url', { length: 500 }),
  domain: varchar('domain', { length: 255 }),
  industry: varchar('industry', { length: 255 }),
  size: varchar('size', { length: 100 }),
  location: varchar('location', { length: 255 }),
  isRecruitmentAgency: boolean('is_recruitment_agency').default(false),
  isBlacklisted: boolean('is_blacklisted').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Leads table - individual contacts/leads
export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  jobId: pgUuid('job_id').references(() => jobs.id).notNull(),
  companyId: integer('company_id').references(() => companies.id),
  
  // Contact information
  fullName: varchar('full_name', { length: 255 }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  title: varchar('title', { length: 255 }),
  email: varchar('email', { length: 255 }),
  linkedinUrl: varchar('linkedin_url', { length: 500 }),
  
  // Job posting details
  jobTitle: varchar('job_title', { length: 255 }).notNull(),
  jobUrl: varchar('job_url', { length: 500 }).notNull(),
  jobLocation: varchar('job_location', { length: 255 }),
  jobDescription: text('job_description'),
  jobSalary: varchar('job_salary', { length: 255 }),
  jobPostedDate: timestamp('job_posted_date'),
  
  // Lead scoring and quality
  leadScore: integer('lead_score').default(0), // 0-100
  isQualified: boolean('is_qualified').default(true),
  qualificationNotes: text('qualification_notes'),
  
  // Export tracking
  exportedToSheets: boolean('exported_to_sheets').default(false),
  exportedAt: timestamp('exported_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Search criteria presets
export const searchPresets = pgTable('search_presets', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  criteria: jsonb('criteria').notNull(),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Export logs
export const exportLogs = pgTable('export_logs', {
  id: serial('id').primaryKey(),
  jobId: pgUuid('job_id').references(() => jobs.id).notNull(),
  sheetId: varchar('sheet_id', { length: 255 }),
  sheetUrl: varchar('sheet_url', { length: 500 }),
  leadsExported: integer('leads_exported').notNull(),
  status: varchar('status', { length: 50 }).notNull(), // success, failed
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}); 