export const NEIGHBORHOODS = ['RiNo', 'LoHi', 'Five Points'] as const;

export const CATEGORIES = [
  'Outdoors',
  'Food & Drink',
  'Sports',
  'Music & Nightlife',
  'Arts & Culture',
  'Games & Trivia',
  'Wellness',
  'Coffee & Co-work',
  'Other',
] as const;

export type Neighborhood = typeof NEIGHBORHOODS[number];
export type Category     = typeof CATEGORIES[number];
