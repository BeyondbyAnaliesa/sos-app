export type Aspect =
  | 'conjunction'
  | 'opposition'
  | 'trine'
  | 'square'
  | 'sextile';

export interface Transit {
  transitPlanet: string;
  aspect: Aspect;
  natalPlanet: string;
  orb: number; // degrees of separation
}

export interface DailyTransits {
  date: string; // ISO date string: YYYY-MM-DD
  transits: Transit[];
}

// Mock daily transits — replace with live ephemeris data in production
export const mockTransits: DailyTransits = {
  date: '2026-04-13',
  transits: [
    { transitPlanet: 'Venus',   aspect: 'conjunction', natalPlanet: 'venus',   orb: 0.8 },
    { transitPlanet: 'Mercury', aspect: 'trine',       natalPlanet: 'sun',     orb: 1.2 },
    { transitPlanet: 'Mars',    aspect: 'square',      natalPlanet: 'saturn',  orb: 2.1 },
    { transitPlanet: 'Jupiter', aspect: 'sextile',     natalPlanet: 'moon',    orb: 1.5 },
    { transitPlanet: 'Saturn',  aspect: 'trine',       natalPlanet: 'mercury', orb: 0.5 },
  ],
};
