import { calc_ut, constants, houses_ex2, julday, split_deg } from 'sweph';

const zodiac = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const;

const planetDefinitions = [
  { key: 'sun', label: 'Sun', id: constants.SE_SUN },
  { key: 'moon', label: 'Moon', id: constants.SE_MOON },
  { key: 'mercury', label: 'Mercury', id: constants.SE_MERCURY },
  { key: 'venus', label: 'Venus', id: constants.SE_VENUS },
  { key: 'mars', label: 'Mars', id: constants.SE_MARS },
  { key: 'jupiter', label: 'Jupiter', id: constants.SE_JUPITER },
  { key: 'saturn', label: 'Saturn', id: constants.SE_SATURN },
  { key: 'uranus', label: 'Uranus', id: constants.SE_URANUS },
  { key: 'neptune', label: 'Neptune', id: constants.SE_NEPTUNE },
  { key: 'pluto', label: 'Pluto', id: constants.SE_PLUTO },
] as const;

function formatLongitude(longitude: number) {
  const parts = split_deg(
    longitude,
    constants.SE_SPLIT_DEG_ZODIACAL | constants.SE_SPLIT_DEG_ROUND_MIN
  );

  return {
    longitude,
    sign: zodiac[parts.sign],
    degree: parts.degree,
    minute: parts.minute,
  };
}

function getAngleDifference(a: number, b: number) {
  const raw = Math.abs(a - b) % 360;
  return raw > 180 ? 360 - raw : raw;
}

export function generateNatalChart(input: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  latitude: number;
  longitude: number;
  timeExact: boolean;
}) {
  const jdUt = julday(
    input.year,
    input.month,
    input.day,
    input.hour + input.minute / 60,
    constants.SE_GREG_CAL
  );
  const flags = constants.SEFLG_MOSEPH | constants.SEFLG_SPEED;

  const placements = planetDefinitions.map((planet) => {
    const result = calc_ut(jdUt, planet.id, flags);

    return {
      key: planet.key,
      label: planet.label,
      ...formatLongitude(result.data[0]),
      speed: result.data[3],
      retrograde: result.data[3] < 0,
      warning: result.error || null,
    };
  });

  const houses = houses_ex2(jdUt, 0, input.latitude, input.longitude, 'P');

  const angles = {
    ascendant: formatLongitude(houses.data.points[0]),
    midheaven: formatLongitude(houses.data.points[1]),
  };

  const majorAspects = [
    { type: 'conjunction', angle: 0, orb: 8 },
    { type: 'sextile', angle: 60, orb: 4 },
    { type: 'square', angle: 90, orb: 6 },
    { type: 'trine', angle: 120, orb: 6 },
    { type: 'opposition', angle: 180, orb: 8 },
  ] as const;

  const aspects = placements.flatMap((left, leftIndex) =>
    placements.slice(leftIndex + 1).flatMap((right) => {
      const difference = getAngleDifference(left.longitude, right.longitude);
      const match = majorAspects.find((aspect) => Math.abs(difference - aspect.angle) <= aspect.orb);

      if (!match) {
        return [];
      }

      return [
        {
          type: match.type,
          between: [left.label, right.label],
          angle: difference,
          orb: Number(Math.abs(difference - match.angle).toFixed(2)),
        },
      ];
    })
  );

  return {
    metadata: {
      jdUt,
      timeExact: input.timeExact,
      coordinates: {
        latitude: input.latitude,
        longitude: input.longitude,
      },
      warnings: {
        houses: houses.error || null,
      },
    },
    placements,
    angles,
    aspects,
  };
}

export function getTestNatalChart() {
  return generateNatalChart({
    year: 1980,
    month: 2,
    day: 26,
    hour: 2,
    minute: 42,
    latitude: 37.8716,
    longitude: -122.2727,
    timeExact: true,
  });
}
