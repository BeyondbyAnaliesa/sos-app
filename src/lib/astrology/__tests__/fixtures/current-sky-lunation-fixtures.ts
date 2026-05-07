export const CURRENT_SKY_LUNATION_FIXTURES = {
  solarEclipse2025: {
    date: '2025-03-29',
    expectKinds: ['eclipse', 'lunation'],
    expectSign: 'Aries',
  },
  lunarEclipse2025: {
    date: '2025-03-14',
    expectKinds: ['eclipse', 'lunation'],
    expectSign: 'Pisces',
  },
  nonEclipseNewMoon2025: {
    date: '2025-01-29',
    expectKinds: ['lunation'],
    expectSign: 'Aquarius',
  },
} as const;
