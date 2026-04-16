export interface PlanetPosition {
  sign: string;
  house: number;
  degree: number;
}

export interface NatalChart {
  sun: PlanetPosition;
  moon: PlanetPosition;
  ascendant: { sign: string; degree: number };
  mercury: PlanetPosition;
  venus: PlanetPosition;
  mars: PlanetPosition;
  jupiter: PlanetPosition;
  saturn: PlanetPosition;
}

// Mock natal chart — replace with real user chart data in production
export const mockNatalChart: NatalChart = {
  sun:       { sign: 'Scorpio',     house: 1, degree: 12 },
  moon:      { sign: 'Pisces',      house: 5, degree: 4  },
  ascendant: { sign: 'Libra',       degree: 28 },
  mercury:   { sign: 'Sagittarius', house: 2, degree: 7  },
  venus:     { sign: 'Scorpio',     house: 1, degree: 23 },
  mars:      { sign: 'Capricorn',   house: 3, degree: 15 },
  jupiter:   { sign: 'Aquarius',    house: 4, degree: 9  },
  saturn:    { sign: 'Taurus',      house: 7, degree: 18 },
};
