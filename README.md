# LinkedIn Lead Generator

A production-ready recruitment lead generation tool that scrapes UK finance/accounting job postings from LinkedIn, filters out recruitment agencies, extracts hiring manager contact details, and exports qualified leads to Google Sheets.

## 🚀 Features

- **Automated LinkedIn Scraping**: Headless browser automation with stealth plugins
- **Smart Filtering**: Automatically detects and filters out recruitment agencies
- **Lead Scoring**: Intelligent scoring based on contact availability and job quality
- **Real-time Progress**: Live updates on scraping progress with job queue management
- **Google Sheets Export**: Automated export of qualified leads with proper formatting
- **Background Processing**: Queue-based processing with Redis for scalability
- **Modern UI**: Clean, responsive interface built with Next.js and Tailwind CSS

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Puppeteer (with stealth plugins)
- **Database**: PostgreSQL with Drizzle ORM
- **Queue**: Bull/Redis for background job processing
- **Export**: Google Sheets API integration
- **Deployment**: Docker, Coolify-ready for Hetzner

## 📋 Prerequisites

1. **LinkedIn Account**: Valid LinkedIn credentials for scraping
2. **Google Cloud Project**: For Google Sheets API access
3. **Database**: PostgreSQL instance
4. **Redis**: For job queue management

## 🔧 Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd linkedin-lead-generator
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the environment template:

```bash
cp env.example .env
```

Configure your `.env` file:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/linkedin_leads

# Redis (for job queue)
REDIS_URL=redis://localhost:6379

# LinkedIn credentials
LINKEDIN_EMAIL=your-linkedin-email@example.com
LINKEDIN_PASSWORD=your-linkedin-password

# Google Sheets API
GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----
GOOGLE_SHEETS_PROJECT_ID=your-google-project-id

# App settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 4. Google Sheets API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Sheets API and Google Drive API
4. Create a Service Account:
   - Go to IAM & Admin → Service Accounts
   - Click "Create Service Account"
   - Download the JSON key file
5. Extract the following from the JSON file:
   - `client_email` → `GOOGLE_SHEETS_CLIENT_EMAIL`
   - `private_key` → `GOOGLE_SHEETS_PRIVATE_KEY`
   - `project_id` → `GOOGLE_SHEETS_PROJECT_ID`

### 5. Database Setup

Generate and run migrations:

```bash
npm run db:generate
npm run db:migrate
```

### 6. Local Development

#### Option A: Using Docker (Recommended)

```bash
# Start all services (app, worker, postgres, redis)
docker-compose up -d

# View logs
docker-compose logs -f app
docker-compose logs -f worker
```

#### Option B: Manual Setup

Start PostgreSQL and Redis locally, then:

```bash
# Start the web application
npm run dev

# In a separate terminal, start the background worker
npm run worker
```

The application will be available at `http://localhost:3000`

## 🚀 Production Deployment

### Coolify Deployment (Recommended)

1. **Prepare Your Server**: Set up Coolify on your Hetzner server
2. **Create Project**: Add your GitHub repository to Coolify
3. **Environment Variables**: Configure all environment variables in Coolify
4. **Services**:
   - Main app: Builds and runs the Next.js application
   - Worker: Runs the background scraping worker
   - PostgreSQL: Managed database
   - Redis: Managed queue service

5. **Deploy**: Coolify will automatically deploy on git push

### Manual Docker Deployment

```bash
# Build the image
docker build -t linkedin-lead-generator .

# Run with environment variables
docker run -d \
  --name linkedin-leads \
  -p 3000:3000 \
  -e DATABASE_URL="your-database-url" \
  -e REDIS_URL="your-redis-url" \
  -e LINKEDIN_EMAIL="your-email" \
  -e LINKEDIN_PASSWORD="your-password" \
  linkedin-lead-generator
```

## 🎯 Usage

1. **Access the Application**: Navigate to your deployed URL or `http://localhost:3000`

2. **Configure Search**:
   - Enter keywords (e.g., "finance accounting", "financial analyst")
   - Select location (UK regions available)
   - Choose experience level
   - Set number of pages to scrape
   - Enable "Exclude recruitment agencies" (recommended)

3. **Start Scraping**: Click "Start Lead Generation"

4. **Monitor Progress**: Watch real-time progress in the Job Status panel

5. **Export Results**: Completed jobs automatically export to Google Sheets

## 📊 Lead Scoring

The system automatically scores leads (0-100) based on:

- **Direct Companies**: +30 points (vs recruitment agencies: -20)
- **Hiring Manager Details**: +15 points for name, +20 for email
- **Job Information**: +10 for salary info, +5 for detailed descriptions
- **Seniority Indicators**: +10 for senior-level positions

Only leads scoring >40 are exported to maintain quality.

## 🔍 Recruitment Agency Detection

Automatically filters companies containing these keywords:
- recruitment, recruiter, talent, staffing, headhunter
- executive search, consulting, temp agency, placement
- Common agency names: Reed, Adecco, Randstad, Hays, etc.

## 🛡 Rate Limiting & Safety

- Random delays between requests (2-5 seconds)
- Stealth browser configuration to avoid detection
- Respectful scraping practices
- Error handling and retry logic
- Job timeout protection (30 minutes)

## 📝 API Endpoints

- `GET /api/jobs` - List all jobs
- `POST /api/jobs` - Create new scraping job
- `GET /api/jobs/[id]` - Get job details
- `DELETE /api/jobs/[id]` - Cancel job

## 🔧 Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run background worker
npm run worker

# Generate database migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Build for production
npm run build

# Start production server
npm start
```

## 📚 Project Structure

```
linkedin-lead-generator/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── api/            # API routes
│   │   ├── globals.css     # Global styles
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Home page
│   ├── components/         # React components
│   │   ├── SearchForm.tsx  # Search criteria form
│   │   └── JobStatus.tsx   # Job monitoring
│   ├── lib/               # Shared utilities
│   │   ├── db/            # Database schema & connection
│   │   └── services/      # Core services
│   └── workers/           # Background workers
├── docker-compose.yml     # Local development
├── Dockerfile            # Production build
└── README.md
```

## 🚨 Important Notes

- **LinkedIn Terms**: Ensure compliance with LinkedIn's Terms of Service
- **Rate Limits**: Respect rate limits to avoid account restrictions
- **Data Privacy**: Handle scraped data responsibly and in compliance with GDPR
- **Monitoring**: Monitor your LinkedIn account for any restrictions

## 🆘 Troubleshooting

### Common Issues

1. **Puppeteer Fails to Launch**:
   ```bash
   # Install missing dependencies (Linux)
   sudo apt-get install -y libgconf-2-4 libxss1 libxtst6 libxrandr2 libasound2 libpangocairo-1.0-0 libatk1.0-0 libc6-dev libcairo-gobject2 libgtk-3-0 libgdk-pixbuf2.0-0
   ```

2. **Database Connection Issues**:
   - Verify DATABASE_URL format
   - Ensure PostgreSQL is running
   - Check network connectivity

3. **Google Sheets Export Fails**:
   - Verify service account credentials
   - Ensure APIs are enabled
   - Check private key formatting (replace `\n` with actual newlines)

4. **LinkedIn Login Issues**:
   - Verify credentials
   - Check for 2FA requirements
   - Monitor for account restrictions

## 📄 License

This project is for educational and legitimate business use only. Please ensure compliance with LinkedIn's Terms of Service and applicable data protection regulations.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review GitHub issues
3. Create a new issue with detailed information

---

**Built for recruitment agencies seeking direct company leads in UK finance & accounting sectors.** 