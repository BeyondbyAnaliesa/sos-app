import type { NatalChart as RichChart } from './types';
import type { NatalChart as SimpleChart } from '@/data/natal-chart';

// Determine which house a planet falls in based on house cusp longitudes.
// Placidus houses: a planet is in house N if its longitude is between cusp N and cusp N+1.
function getHouse(longitude: number, cusps: number[]): number {
  for (let i = 0; i < 12; i++) {
    const nextI = (i + 1) % 12;
    const start = cusps[i];
    const end = cusps[nextI];

    if (start < end) {
      // Normal case: cusp doesn't wrap around 0° Aries
      if (longitude >= start && longitude < end) return i + 1;
    } else {
      // Wraps around 360°/0° (e.g., cusp at 350°, next at 15°)
      if (longitude >= start || longitude < end) return i + 1;
    }
  }
  return 1; // fallback (should never happen with valid cusps)
}

// Converts the rich Swiss Ephemeris chart output into the simpler format
// used by the existing interpret.ts and prompt.ts logic.
export function toSimpleChart(chart: RichChart): SimpleChart {
  const cusps = chart.houses;

  function findPlacement(key: string) {
    const p = chart.placements.find((pl) => pl.key === key);
    if (!p) throw new Error(`Missing placement: ${key}`);
    const house = cusps?.length === 12 ? getHouse(p.longitude, cusps) : 1;
    return { sign: p.sign, house, degree: p.degree };
  }

  return {
    sun:       findPlacement('sun'),
    moon:      findPlacement('moon'),
    ascendant: { sign: chart.angles.ascendant.sign, degree: chart.angles.ascendant.degree },
    mercury:   findPlacement('mercury'),
    venus:     findPlacement('venus'),
    mars:      findPlacement('mars'),
    jupiter:   findPlacement('jupiter'),
    saturn:    findPlacement('saturn'),
  };
}
