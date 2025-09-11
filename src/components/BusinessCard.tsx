'use client';

import { MapPin } from 'lucide-react';

interface BusinessCardProps {
  business: {
    business_id: string;
    business_name: string;
    business_description?: string;
    business_category?: string;
    business_vibe_tags?: string[];
    business_amenities?: string[];
    neighborhood?: string;
    image_url?: string;
    perk_title: string;
    perk_type?: string;
    is_active_now?: boolean;
  };
  onClick: () => void;
}

export default function BusinessCard({ business, onClick }: BusinessCardProps) {
  const vibeTags = business.business_vibe_tags || [];
  const amenities = business.business_amenities || [];

  return (
    <div 
      className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative h-48 w-full bg-gray-100">
        <img 
          src={business.image_url || '/placeholder-business.jpg'} 
          alt={business.business_name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-business.jpg';
          }}
        />
        {business.is_active_now && (
          <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium">
            Active Now
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-lg mb-1">{business.business_name}</h3>
        <p className="text-gray-600 text-sm mb-2">{business.business_category || 'Business'}</p>
        
        <p className="text-gray-700 text-sm mb-3 line-clamp-2">
          {business.business_description || 'No description available'}
        </p>
        
        {/* Perk Info */}
        <div className="bg-blue-50 p-2 rounded-lg mb-3">
          <p className="font-medium text-blue-900 text-sm">{business.perk_title}</p>
          <p className="text-blue-700 text-xs capitalize">{(business.perk_type || 'perk')?.replace('_', ' ')}</p>
        </div>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {vibeTags.slice(0, 3).map((tag) => (
            <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
              {tag}
            </span>
          ))}
          {amenities.slice(0, 2).map((amenity) => (
            <span key={amenity} className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
              {amenity}
            </span>
          ))}
        </div>
        
        {/* Location */}
        <div className="flex items-center text-sm text-gray-500">
          <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
          <span className="truncate">{business.neighborhood || 'Location not specified'}</span>
        </div>
      </div>
    </div>
  );
}