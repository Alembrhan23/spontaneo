export type ActivityType = 'Outdoors' | 'Food & Drink' | 'Sports' | 'Social' | 'Games' | 'Arts & Culture'
export const ACTIVITY_TYPES: ActivityType[] = ['Outdoors','Food & Drink','Sports','Social','Games','Arts & Culture']
export const NEIGHBORHOODS = ['All Neighborhoods','RiNo','LoHi','Five Points'] as const
export type Neighborhood = typeof NEIGHBORHOODS[number]