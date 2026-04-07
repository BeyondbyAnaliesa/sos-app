import { calc_ut, constants, houses_ex2, split_deg } from 'sweph';

const birth = {
  year: 1980,
  month: 2,
  day: 26,
  utHour: 2 + 42 / 60,
  lat: 37.8716,
  lng: -122.2727,
};

const flags = constants.SEFLG_MOSEPH | constants.SEFLG_SPEED;
const jdUt = (await import('sweph')).julday(
  birth.year,
  birth.month,
  birth.day,
  birth.utHour,
  constants.SE_GREG_CAL
);

const sun = calc_ut(jdUt, constants.SE_SUN, flags);
const moon = calc_ut(jdUt, constants.SE_MOON, flags);
const houses = houses_ex2(jdUt, 0, birth.lat, birth.lng, 'P');

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

function formatPosition(label, lon) {
  const parts = split_deg(lon, constants.SE_SPLIT_DEG_ZODIACAL | constants.SE_SPLIT_DEG_ROUND_MIN);
  const sign = zodiac[parts.sign];
  return `${label}: ${sign} ${parts.degree}°${String(parts.minute).padStart(2, '0')}' (${lon.toFixed(4)}°)`;
}

console.log('Swiss Ephemeris spike for Feb 25 1980, 6:42 PM PST, Berkeley CA');
console.log(`JD UT: ${jdUt}`);
console.log(formatPosition('Sun', sun.data[0]));
console.log(formatPosition('Moon', moon.data[0]));
console.log(formatPosition('Asc', houses.data.points[0]));
console.log('Expected checkpoints: Sun Pisces ~6°39\', Moon Cancer ~13°01\', Virgo Rising ~16°26\'');
console.log('Flags:', { sunFlag: sun.flag, moonFlag: moon.flag, houseFlag: houses.flag });
if (sun.error || moon.error || houses.error) {
  console.log('Warnings:', { sun: sun.error, moon: moon.error, houses: houses.error });
}
