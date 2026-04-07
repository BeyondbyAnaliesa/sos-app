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
];

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

export function getTestNatalChart() {
  const jdUt = julday(1980, 2, 26, 2 + 42 / 60, constants.SE_GREG_CAL);
  const flags = constants.SEFLG_MOSEPH | constants.SEFLG_SPEED;

  const sun = calc_ut(jdUt, constants.SE_SUN, flags);
  const moon = calc_ut(jdUt, constants.SE_MOON, flags);
  const houses = houses_ex2(jdUt, 0, 37.8716, -122.2727, 'P');

  return {
    jdUt,
    flags: { sun: sun.flag, moon: moon.flag, houses: houses.flag },
    sun: formatLongitude(sun.data[0]),
    moon: formatLongitude(moon.data[0]),
    ascendant: formatLongitude(houses.data.points[0]),
    warnings: {
      sun: sun.error || null,
      moon: moon.error || null,
      houses: houses.error || null,
    },
  };
}
