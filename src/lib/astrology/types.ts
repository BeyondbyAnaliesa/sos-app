export interface BirthDataInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  latitude: number;
  longitude: number;
  timeExact: boolean;
}

export interface PlanetPlacement {
  key: string;
  label: string;
  longitude: number;
  sign: string;
  degree: number;
  minute: number;
  speed: number;
  retrograde: boolean;
  warning: string | null;
}

export interface AnglePlacement {
  longitude: number;
  sign: string;
  degree: number;
  minute: number;
}

export interface NatalChart {
  metadata: {
    jdUt: number;
    timeExact: boolean;
    coordinates: { latitude: number; longitude: number };
    warnings: { houses: string | null };
  };
  placements: PlanetPlacement[];
  angles: {
    ascendant: AnglePlacement;
    midheaven: AnglePlacement;
  };
  houses: number[]; // 12 house cusp longitudes (index 0 = house 1 cusp, etc.)
  aspects: Array<{
    type: string;
    between: [string, string];
    angle: number;
    orb: number;
  }>;
}
