'use client';

import { useState } from 'react';
import { Search, Mic, Loader2 } from 'lucide-react';

interface AISearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export default function AISearchBar({ onSearch, isLoading = false }: AISearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask for anything like 'Happy hour near me' or 'Coffee shop with wifi'..."
          className="w-full pl-10 pr-12 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
          disabled={isLoading}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-2">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => {/* Voice input logic */}}
              >
                <Mic className="h-5 w-5" />
              </button>
              <button
                type="submit"
                className="text-blue-600 hover:text-blue-800"
                disabled={!query.trim()}
              >
                <Search className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Quick suggestions */}
      <div className="flex flex-wrap gap-2 mt-3 justify-center">
        {['Happy hour now', 'Coffee near me', 'Date night spots', 'Work friendly cafe'].map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => {
              setQuery(suggestion);
              onSearch(suggestion);
            }}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </form>
  );
}