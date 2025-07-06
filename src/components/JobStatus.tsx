'use client';

import { useState, useEffect } from 'react';

interface Job {
  id: string;
  status: string;
  progress: number;
  searchCriteria: {
    keywords: string;
    location: string;
  };
  totalJobsFound?: number;
  leadsGenerated?: number;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

interface JobStatusProps {
  activeJobs: Job[];
  completedJobs: Job[];
  onCancelJob: (jobId: string) => void;
}

export function JobStatus({ activeJobs, completedJobs, onCancelJob }: JobStatusProps) {
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Auto-refresh active jobs every 5 seconds
  useEffect(() => {
    if (activeJobs.length > 0) {
      const interval = setInterval(() => {
        // This will trigger a refresh in the parent component
        window.dispatchEvent(new CustomEvent('refreshJobs'));
      }, 5000);
      setPollingInterval(interval);
    } else {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [activeJobs.length]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = Math.round((endTime - startTime) / 1000 / 60); // minutes
    return duration < 1 ? '<1 min' : `${duration} min`;
  };

  return (
    <div className="space-y-6">
      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Active Jobs ({activeJobs.length})
          </h3>
          <div className="space-y-3">
            {activeJobs.map((job) => (
              <div
                key={job.id}
                className="border border-gray-200 rounded-lg p-4 bg-white"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDuration(job.createdAt)}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900">
                      {job.searchCriteria.keywords}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {job.searchCriteria.location}
                    </p>
                  </div>
                  <button
                    onClick={() => onCancelJob(job.id)}
                    className="ml-4 text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{job.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${job.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Jobs Found: {job.totalJobsFound || 0}</span>
                  <span>Leads: {job.leadsGenerated || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Jobs */}
      {completedJobs.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Recent Completed ({completedJobs.slice(0, 5).length})
          </h3>
          <div className="space-y-3">
            {completedJobs.slice(0, 5).map((job) => (
              <div
                key={job.id}
                className="border border-gray-200 rounded-lg p-4 bg-white"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDuration(job.createdAt, job.completedAt)}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900">
                      {job.searchCriteria.keywords}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {job.searchCriteria.location}
                    </p>
                  </div>
                </div>

                {job.status === 'failed' && job.errorMessage && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    Error: {job.errorMessage}
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Jobs Found: {job.totalJobsFound || 0}
                  </span>
                  <span className="font-medium text-primary-600">
                    Leads Generated: {job.leadsGenerated || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Jobs */}
      {activeJobs.length === 0 && completedJobs.length === 0 && (
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Start your first LinkedIn scraping job to see results here.
          </p>
        </div>
      )}
    </div>
  );
} 