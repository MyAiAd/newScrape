'use client';

import { useState, useEffect } from 'react';
import { SearchForm } from '../components/SearchForm';
import { JobStatus } from '../components/JobStatus';
import { SearchCriteria } from '../lib/services/linkedin-scraper';

export default function HomePage() {
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch jobs on component mount and when refresh key changes
  useEffect(() => {
    fetchJobs();
  }, [refreshKey]);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs');
      const data = await response.json();
      setActiveJobs(data.active || []);
      setCompletedJobs(data.completed || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const handleNewJob = async (criteria: SearchCriteria) => {
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ searchCriteria: criteria }),
      });

      if (response.ok) {
        // Refresh jobs list
        setRefreshKey(prev => prev + 1);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error starting job:', error);
      alert('Failed to start scraping job');
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setRefreshKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error cancelling job:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            LinkedIn Lead Generator
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Automated LinkedIn scraping for UK finance and accounting recruitment leads. 
            Filter out agencies, extract hiring manager details, and export to Google Sheets.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Search Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Start New Search
            </h2>
            <SearchForm onSubmit={handleNewJob} />
          </div>

          {/* Job Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">
                Job Status
              </h2>
              <button
                onClick={() => setRefreshKey(prev => prev + 1)}
                className="px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                Refresh
              </button>
            </div>
            
            <JobStatus
              activeJobs={activeJobs}
              completedJobs={completedJobs}
              onCancelJob={handleCancelJob}
            />
          </div>
        </div>

        {/* Recent Results */}
        {completedJobs.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Recent Results
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedJobs.slice(0, 6).map((job) => (
                <div
                  key={job.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-green-600">
                      Completed
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(job.completedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">
                    {job.searchCriteria?.keywords || 'N/A'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {job.searchCriteria?.location || 'N/A'}
                  </p>
                  <div className="flex justify-between text-sm">
                    <span>Jobs: {job.totalJobsFound || 0}</span>
                    <span className="font-medium text-primary-600">
                      Leads: {job.leadsGenerated || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>
            Built for recruitment agencies • Automated lead generation • 
            Direct company contacts only
          </p>
        </div>
      </div>
    </div>
  );
} 