import type { NatalChart as RichChart, PlanetPlacement } from './types';

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
  orb: number;
}

export interface DailyTransits {
  date: string;
  transits: Transit[];
}

export interface NatalPlanetSummary {
  key: string;
  label: string;
  sign: string;
  house: number;
  degree: number;
  minute?: number;
  longitude?: number;
  retrograde?: boolean;
}

export interface NatalSummary {
  placementsByKey: Record<string, NatalPlanetSummary>;
  ascendant: { sign: string; degree: number; minute: number; longitude: number };
  midheaven: { sign: string; degree: number; minute: number; longitude: number };
}

export function getHouse(longitude: number, cusps: number[]): number {
  for (let i = 0; i < 12; i++) {
    const nextI = (i + 1) % 12;
    const start = cusps[i];
    const end = cusps[nextI];

    if (start < end) {
      if (longitude >= start && longitude < end) return i + 1;
    } else {
      if (longitude >= start || longitude < end) return i + 1;
    }
  }
  return 1;
}

function summarizePlacement(placement: PlanetPlacement, chart: RichChart): NatalPlanetSummary {
  const house = chart.houses?.length === 12 ? getHouse(placement.longitude, chart.houses) : 1;
  return {
    key: placement.key,
    label: placement.label,
    sign: placement.sign,
    house,
    degree: placement.degree,
    minute: placement.minute,
    longitude: placement.longitude,
    retrograde: placement.retrograde,
  };
}

export function buildNatalSummary(chart: RichChart): NatalSummary {
  const placementsByKey = Object.fromEntries(
    chart.placements.map((placement) => [placement.key, summarizePlacement(placement, chart)]),
  );

  return {
    placementsByKey,
    ascendant: {
      sign: chart.angles.ascendant.sign,
      degree: chart.angles.ascendant.degree,
      minute: chart.angles.ascendant.minute,
      longitude: chart.angles.ascendant.longitude,
    },
    midheaven: {
      sign: chart.angles.midheaven.sign,
      degree: chart.angles.midheaven.degree,
      minute: chart.angles.midheaven.minute,
      longitude: chart.angles.midheaven.longitude,
    },
  };
}
