'use client';

import { useState } from 'react';
import AISearchBar from '@/components/AISearchBar';
import BusinessCard from '@/components/BusinessCard';

export type PerkRow = {
  id: number
  title: string
  venue_name: string | null
  neighborhood: string | null
  sponsor_tag: string | null
  start_at: string | null
  end_at: string | null
  max_claims: number
  active: boolean
  claimed_count: number | null
  redeemed_count: number | null
  business_id?: string
  business_name?: string
  business_description?: string
  business_category?: string
  business_vibe_tags?: string[]
  business_amenities?: string[]
  image_url?: string
  perk_type?: string
  is_active_now?: boolean
}

interface ClientPerksPageProps {
  initialPerks: PerkRow[];
  initialQ: string;
  initialStatus: string;
  initialSort: string;
}

export default function ClientPerksPage({ 
  initialPerks, 
  initialQ, 
  initialStatus, 
  initialSort 
}: ClientPerksPageProps) {
  const [searchResults, setSearchResults] = useState<PerkRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAISearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setSearchQuery(query);
    
    try {
      const response = await fetch('/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }
      
      setSearchResults(data.results || []);
      
      if (data.error) {
        console.warn('Search completed with warning:', data.error);
      }
      
    } catch (err: any) {
      setError(err.message || 'An error occurred during search');
      console.error('Search error:', err);
      // Fallback to showing all perks on error
      setSearchResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  const displayPerks = searchResults !== null ? searchResults : initialPerks;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-8">Discover Local Perks</h1>
      
      {/* AI Search Bar */}
      <div className="mb-8">
        <AISearchBar onSearch={handleAISearch} isLoading={isLoading} />
      </div>
      
      {/* Search Status */}
      {searchQuery && (
        <div className="mb-4 text-center">
          <p className="text-gray-600">
            {isLoading ? 'Searching...' : `Results for "${searchQuery}"`}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6">
          <p>{error}</p>
          <p className="text-sm mt-1">Showing all available perks instead.</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Finding the best matches...</span>
        </div>
      )}
      
      {/* Results */}
      {!isLoading && displayPerks && displayPerks.length > 0 && (
        <>
          <div className="mb-4">
            <p className="text-gray-600">
              Found {displayPerks.length} result{displayPerks.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayPerks.map((perk, index) => {
              // Create a unique key - use id if available, otherwise fallback to index + other unique fields
              const uniqueKey = perk.id 
                ? perk.id 
                : `perk-${index}-${perk.business_id || 'no-business'}-${perk.title}`;
              
              return (
                <BusinessCard
                  key={uniqueKey}
                  business={{
                    business_id: perk.business_id || '',
                    business_name: perk.business_name || perk.venue_name || 'Unknown Business',
                    business_description: perk.business_description,
                    business_category: perk.business_category || 'Business',
                    business_vibe_tags: perk.business_vibe_tags,
                    business_amenities: perk.business_amenities,
                    neighborhood: perk.neighborhood || '',
                    image_url: perk.image_url,
                    perk_title: perk.title,
                    perk_type: perk.perk_type || 'perk',
                    is_active_now: perk.is_active_now || false
                  }}
                  onClick={() => {
                    console.log('Selected perk:', perk);
                  }}
                />
              );
            })}
          </div>
        </>
      )}
      
      {!isLoading && displayPerks && displayPerks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {searchResults !== null 
              ? 'No results found. Try a different search.' 
              : 'No perks available at the moment. Check back later!'
            }
          </p>
          {searchResults !== null && (
            <button
              onClick={() => setSearchResults(null)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Show All Perks
            </button>
          )}
        </div>
      )}
    </div>
  );
}