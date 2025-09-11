import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '', // Provide empty string as fallback
});

interface AISearchFilters {
  perkType?: string;
  category?: string;
  amenities: string[];
  vibeTags: string[];
  activeNow: boolean;
}

export async function POST(req: NextRequest) {
  console.log('AI Search API called');
  
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: any) => cookieStore.set({ name, value, ...options }),
          remove: (name: string, options: any) => cookieStore.set({ name, value: '', ...options }),
        },
      }
    );

    const { query } = await req.json();
    console.log('Received query:', query);
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
    }

    let filters: AISearchFilters;
    
    try {
      console.log('Calling OpenAI...');
      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        console.log('OpenAI API key not configured, using fallback');
        throw new Error('OpenAI API key not configured');
      }
      
      filters = await extractFiltersWithOpenAI(query);
      console.log('OpenAI filters:', filters);
    } catch (aiError) {
      console.error('OpenAI error, using fallback:', aiError);
      filters = parseQueryWithSimpleAI(query.toLowerCase());
      console.log('Fallback filters:', filters);
    }

    console.log('Building Supabase query with filters:', filters);
    
    let supabaseQuery = supabase
      .from('business_perks_view')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.perkType) {
      supabaseQuery = supabaseQuery.eq('perk_type', filters.perkType);
    }
    if (filters.category) {
      supabaseQuery = supabaseQuery.eq('business_category', filters.category);
    }
    if (filters.amenities && filters.amenities.length > 0) {
      supabaseQuery = supabaseQuery.contains('business_amenities', filters.amenities);
    }
    if (filters.vibeTags && filters.vibeTags.length > 0) {
      supabaseQuery = supabaseQuery.contains('business_vibe_tags', filters.vibeTags);
    }
    if (filters.activeNow) {
      supabaseQuery = supabaseQuery.eq('is_active_now', true);
    }

    console.log('Executing Supabase query...');
    const { data: perks, error, count } = await supabaseQuery;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log('Query results:', perks?.length, 'perks found');

    return NextResponse.json({
      results: perks || [],
      count: count || 0,
      appliedFilters: filters
    });

  } catch (e: any) {
    console.error('AI search error:', e);
    // Return empty results instead of error for better UX
    return NextResponse.json({
      results: [],
      count: 0,
      appliedFilters: {},
      error: 'Search temporarily unavailable'
    });
  }
}

async function extractFiltersWithOpenAI(query: string): Promise<AISearchFilters> {
  const systemPrompt = `You are an AI assistant for a local discovery app. Convert user queries into structured filters.

Available filters:
- perkType: 'happy_hour', 'student_discount', 'fitness_class', 'special_event', 'tasting_experience', 'loyalty_program'
- category: 'Restaurant', 'Brewery', 'Coffee Shop', 'Wine Bar', 'Music Venue', 'Wellness'
- amenities: 'wifi', 'outdoor-seating', 'pet-friendly', 'power-outlets'
- vibeTags: 'romantic', 'casual', 'lively', 'cozy', 'date-night', 'work-friendly'
- activeNow: boolean

Always output valid JSON in this format:
{
  "perkType": "string or undefined",
  "category": "string or undefined", 
  "amenities": ["string array"],
  "vibeTags": ["string array"],
  "activeNow": boolean
}

Examples:
Query: "coffee with wifi" -> {"category":"Coffee Shop","amenities":["wifi"],"vibeTags":[],"activeNow":false}
Query: "happy hour now" -> {"perkType":"happy_hour","amenities":[],"vibeTags":[],"activeNow":true}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
      ],
      temperature: 0.1,
      max_tokens: 150,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('OpenAI raw response:', content);

    // Validate JSON parsing
    const parsed = JSON.parse(content);
    
    // Ensure the response has the correct structure
    const filters: AISearchFilters = {
      perkType: parsed.perkType === 'undefined' ? undefined : parsed.perkType,
      category: parsed.category === 'undefined' ? undefined : parsed.category,
      amenities: Array.isArray(parsed.amenities) ? parsed.amenities : [],
      vibeTags: Array.isArray(parsed.vibeTags) ? parsed.vibeTags : [],
      activeNow: Boolean(parsed.activeNow)
    };

    // Clean up undefined values
    if (filters.perkType === undefined) delete filters.perkType;
    if (filters.category === undefined) delete filters.category;

    console.log('Processed filters:', filters);
    return filters;
    
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

function parseQueryWithSimpleAI(query: string): AISearchFilters {
  const filters: AISearchFilters = {
    amenities: [],
    vibeTags: [],
    activeNow: false,
  };

  // Simple keyword matching
  const queryLower = query.toLowerCase();
  
  // Perk types
  if (queryLower.includes('happy hour') || queryLower.includes('drink')) {
    filters.perkType = 'happy_hour';
  }
  if (queryLower.includes('student') || queryLower.includes('discount')) {
    filters.perkType = 'student_discount';
  }
  if (queryLower.includes('yoga') || queryLower.includes('fitness') || queryLower.includes('class')) {
    filters.perkType = 'fitness_class';
  }
  if (queryLower.includes('loyalty') || queryLower.includes('punch card')) {
    filters.perkType = 'loyalty_program';
  }

  // Categories
  if (queryLower.includes('coffee') || queryLower.includes('cafe')) {
    filters.category = 'Coffee Shop';
  }
  if (queryLower.includes('brewery') || queryLower.includes('beer')) {
    filters.category = 'Brewery';
  }
  if (queryLower.includes('restaurant') || queryLower.includes('food') || queryLower.includes('dinner')) {
    filters.category = 'Restaurant';
  }
  if (queryLower.includes('yoga') || queryLower.includes('wellness')) {
    filters.category = 'Wellness';
  }

  // Amenities
  if (queryLower.includes('wifi') || queryLower.includes('internet')) {
    filters.amenities.push('wifi');
  }
  if (queryLower.includes('outdoor') || queryLower.includes('patio')) {
    filters.amenities.push('outdoor-seating');
  }
  if (queryLower.includes('dog') || queryLower.includes('pet')) {
    filters.amenities.push('pet-friendly');
  }

  // Vibe tags
  if (queryLower.includes('romantic') || queryLower.includes('date')) {
    filters.vibeTags.push('romantic');
  }
  if (queryLower.includes('work') || queryLower.includes('laptop')) {
    filters.vibeTags.push('work-friendly');
  }
  if (queryLower.includes('cozy') || queryLower.includes('quiet')) {
    filters.vibeTags.push('cozy');
  }

  // Time
  if (queryLower.includes('now') || queryLower.includes('right now') || queryLower.includes('current')) {
    filters.activeNow = true;
  }

  return filters;
}