import { calc_ut, constants, julday } from 'sweph';
import type { NatalChart } from './types';
import type { Transit, DailyTransits, Aspect } from '@/data/transits';

const transitPlanets = [
  { key: 'sun',     label: 'Sun',     id: constants.SE_SUN     },
  { key: 'moon',    label: 'Moon',    id: constants.SE_MOON    },
  { key: 'mercury', label: 'Mercury', id: constants.SE_MERCURY },
  { key: 'venus',   label: 'Venus',   id: constants.SE_VENUS   },
  { key: 'mars',    label: 'Mars',    id: constants.SE_MARS    },
  { key: 'jupiter', label: 'Jupiter', id: constants.SE_JUPITER },
  { key: 'saturn',  label: 'Saturn',  id: constants.SE_SATURN  },
  { key: 'uranus',  label: 'Uranus',  id: constants.SE_URANUS  },
  { key: 'neptune', label: 'Neptune', id: constants.SE_NEPTUNE },
  { key: 'pluto',   label: 'Pluto',   id: constants.SE_PLUTO   },
] as const;

// Transit orbs are tighter than natal orbs
const transitAspects: Array<{ type: Aspect; angle: number; orb: number }> = [
  { type: 'conjunction', angle: 0,   orb: 6 },
  { type: 'sextile',    angle: 60,  orb: 3 },
  { type: 'square',     angle: 90,  orb: 5 },
  { type: 'trine',      angle: 120, orb: 5 },
  { type: 'opposition', angle: 180, orb: 6 },
];

function getAngleDifference(a: number, b: number) {
  const raw = Math.abs(a - b) % 360;
  return raw > 180 ? 360 - raw : raw;
}

// Calculate where all planets are on a given date
function getPlanetaryPositions(date: Date) {
  const year  = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day   = date.getUTCDate();
  const hour  = date.getUTCHours() + date.getUTCMinutes() / 60;

  const jdUt = julday(year, month, day, hour, constants.SE_GREG_CAL);
  const flags = constants.SEFLG_MOSEPH | constants.SEFLG_SPEED;

  return transitPlanets.map((planet) => {
    const result = calc_ut(jdUt, planet.id, flags);
    return {
      key:        planet.key,
      label:      planet.label,
      longitude:  result.data[0],
      speed:      result.data[3],
      retrograde: result.data[3] < 0,
    };
  });
}

// Calculate which transiting planets are forming aspects to natal placements
export function calculateTransitsForDate(
  date: Date,
  natalChart: NatalChart,
): DailyTransits {
  const positions = getPlanetaryPositions(date);
  const transits: Transit[] = [];

  for (const transit of positions) {
    for (const natal of natalChart.placements) {
      // Skip same-planet transits for slow planets (e.g., Pluto transiting natal Pluto)
      // unless it's a meaningful one
      const difference = getAngleDifference(transit.longitude, natal.longitude);
      const match = transitAspects.find(
        (a) => Math.abs(difference - a.angle) <= a.orb,
      );

      if (match) {
        transits.push({
          transitPlanet: transit.label,
          aspect:        match.type,
          natalPlanet:   natal.key,
          orb:           Number(Math.abs(difference - match.angle).toFixed(2)),
        });
      }
    }

    // Also check aspects to Ascendant and Midheaven
    for (const [angleKey, angleData] of Object.entries({
      ascendant: natalChart.angles.ascendant,
      midheaven: natalChart.angles.midheaven,
    })) {
      const difference = getAngleDifference(transit.longitude, angleData.longitude);
      const match = transitAspects.find(
        (a) => Math.abs(difference - a.angle) <= a.orb,
      );
      if (match) {
        transits.push({
          transitPlanet: transit.label,
          aspect:        match.type,
          natalPlanet:   angleKey,
          orb:           Number(Math.abs(difference - match.angle).toFixed(2)),
        });
      }
    }
  }

  // Sort by orb (tightest aspects first — most significant)
  transits.sort((a, b) => a.orb - b.orb);

  const dateStr = date.toISOString().split('T')[0];
  return { date: dateStr, transits };
}

// Calculate transits for a range of dates (for calendar)
export function calculateTransitsForRange(
  startDate: Date,
  days: number,
  natalChart: NatalChart,
): DailyTransits[] {
  const results: DailyTransits[] = [];
  const d = new Date(startDate);

  for (let i = 0; i < days; i++) {
    results.push(calculateTransitsForDate(d, natalChart));
    d.setDate(d.getDate() + 1);
  }

  return results;
}

// Get current planetary positions with retrogrades (for display)
export function getCurrentPlanetaryPositions(date: Date = new Date()) {
  return getPlanetaryPositions(date);
}
