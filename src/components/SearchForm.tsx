'use client';

import { useState } from 'react';
import { SearchCriteria } from '../lib/services/linkedin-scraper';

interface SearchFormProps {
  onSubmit: (criteria: SearchCriteria) => void;
}

export function SearchForm({ onSubmit }: SearchFormProps) {
  const [formData, setFormData] = useState<SearchCriteria>({
    keywords: 'finance accounting',
    location: 'United Kingdom',
    experience: 'mid-level',
    excludeAgencies: true,
    maxPages: 3,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof SearchCriteria, value: string | boolean | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Keywords */}
      <div>
        <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-2">
          Keywords
        </label>
        <input
          type="text"
          id="keywords"
          value={formData.keywords}
          onChange={(e) => handleInputChange('keywords', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="e.g., finance accounting, financial analyst"
          required
        />
        <p className="mt-1 text-xs text-gray-500">
          Job titles or skills to search for
        </p>
      </div>

      {/* Location */}
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
          Location
        </label>
        <select
          id="location"
          value={formData.location}
          onChange={(e) => handleInputChange('location', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="United Kingdom">United Kingdom</option>
          <option value="London, England, United Kingdom">London</option>
          <option value="Manchester, England, United Kingdom">Manchester</option>
          <option value="Birmingham, England, United Kingdom">Birmingham</option>
          <option value="Edinburgh, Scotland, United Kingdom">Edinburgh</option>
          <option value="Bristol, England, United Kingdom">Bristol</option>
        </select>
      </div>

      {/* Experience Level */}
      <div>
        <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-2">
          Experience Level
        </label>
        <select
          id="experience"
          value={formData.experience || ''}
          onChange={(e) => handleInputChange('experience', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">Any</option>
          <option value="entry-level">Entry Level</option>
          <option value="mid-level">Mid Level</option>
          <option value="senior">Senior Level</option>
        </select>
      </div>

      {/* Max Pages */}
      <div>
        <label htmlFor="maxPages" className="block text-sm font-medium text-gray-700 mb-2">
          Max Pages to Scrape
        </label>
        <select
          id="maxPages"
          value={formData.maxPages || 3}
          onChange={(e) => handleInputChange('maxPages', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value={1}>1 page (~25 jobs)</option>
          <option value={2}>2 pages (~50 jobs)</option>
          <option value={3}>3 pages (~75 jobs)</option>
          <option value={5}>5 pages (~125 jobs)</option>
          <option value={10}>10 pages (~250 jobs)</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          More pages = more leads but longer processing time
        </p>
      </div>

      {/* Exclude Agencies */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="excludeAgencies"
          checked={formData.excludeAgencies || false}
          onChange={(e) => handleInputChange('excludeAgencies', e.target.checked)}
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
        <label htmlFor="excludeAgencies" className="ml-2 block text-sm text-gray-700">
          Exclude recruitment agencies
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
          isSubmitting
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-primary-600 hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
        }`}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Starting Scraper...
          </span>
        ) : (
          'Start Lead Generation'
        )}
      </button>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              How it works
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Searches LinkedIn for matching job postings</li>
                <li>Filters out recruitment agencies automatically</li>
                <li>Extracts hiring manager contact details</li>
                <li>Scores leads based on quality indicators</li>
                <li>Exports qualified leads to Google Sheets</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
} 