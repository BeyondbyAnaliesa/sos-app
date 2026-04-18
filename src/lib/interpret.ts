import type { Transit } from '@/data/transits';
import type { NatalChart, PlanetPosition } from '@/data/natal-chart';

export type Domain = 'body' | 'mind' | 'spirit' | 'relationships' | 'career' | 'home';
export type Intensity = 'high' | 'medium' | 'low';

export interface GuidanceResult {
  domain: Domain;
  title: string;
  message: string;
  intensity: Intensity;
  summary: string;
}

type NatalKey = keyof NatalChart;

interface DomainTheme {
  focus: string;
  action: string;
  caution: string;
  gifts: string;
  tension: string;
}

interface TransitSignature {
  weight: number;
  intensity: Intensity;
  theme: DomainTheme;
  transit: Transit;
}

interface TransitOverview {
  summary: string;
  detail: string;
  intensity: Intensity;
  topTransits: Transit[];
}

const PLANET_DOMAINS: Record<string, Domain[]> = {
  Sun: ['mind', 'spirit'],
  Moon: ['mind', 'body', 'relationships'],
  Mercury: ['mind', 'career'],
  Venus: ['relationships', 'home'],
  Mars: ['body', 'career'],
  Jupiter: ['spirit', 'career', 'mind'],
  Saturn: ['career', 'body', 'home'],
  Uranus: ['mind', 'career', 'spirit'],
  Neptune: ['spirit', 'relationships', 'mind'],
  Pluto: ['mind', 'spirit', 'relationships'],
};

const ASPECT_INTENSITY: Record<string, Intensity> = {
  conjunction: 'high',
  opposition: 'high',
  square: 'high',
  trine: 'medium',
  sextile: 'low',
};

const ASPECT_WEIGHTS: Record<string, number> = {
  conjunction: 10,
  opposition: 9,
  square: 8,
  trine: 6,
  sextile: 4,
};

const TRANSIT_PLANET_WEIGHTS: Record<string, number> = {
  Sun: 2,
  Moon: 1,
  Mercury: 3,
  Venus: 3,
  Mars: 4,
  Jupiter: 4,
  Saturn: 5,
  Uranus: 5,
  Neptune: 5,
  Pluto: 6,
};

const NATAL_PLANET_WEIGHTS: Record<string, number> = {
  sun: 6,
  moon: 6,
  ascendant: 6,
  mercury: 4,
  venus: 4,
  mars: 4,
  jupiter: 3,
  saturn: 5,
  midheaven: 5,
};

const DOMAIN_TITLES: Record<Domain, string> = {
  body: 'Body',
  mind: 'Mind & Emotion',
  spirit: 'Spirit',
  relationships: 'Relationships',
  career: 'Work & Money',
  home: 'Home & Life Design',
};

const HOUSE_THEMES: Record<number, string> = {
  1: 'your identity and how you move through the day',
  2: 'money, resources, and self-worth',
  3: 'communication, errands, and immediate decisions',
  4: 'home, family, and your private foundation',
  5: 'joy, creativity, romance, and self-expression',
  6: 'work rhythms, health, and practical upkeep',
  7: 'partnership, mirrors, and direct relationship dynamics',
  8: 'shared resources, trust, and emotional depth',
  9: 'belief, perspective, and the bigger picture',
  10: 'career, visibility, and public responsibility',
  11: 'friends, networks, and long-range hopes',
  12: 'rest, endings, and what is happening beneath the surface',
};

const HOUSE_DOMAIN_MAP: Partial<Record<number, Domain[]>> = {
  1: ['body', 'mind'],
  2: ['career', 'home'],
  3: ['mind', 'career'],
  4: ['home', 'relationships'],
  5: ['relationships', 'spirit'],
  6: ['body', 'career'],
  7: ['relationships'],
  8: ['mind', 'spirit'],
  9: ['spirit', 'mind'],
  10: ['career'],
  11: ['career', 'relationships'],
  12: ['spirit', 'mind'],
};

const PLANET_THEMES: Record<string, string> = {
  sun: 'your core identity',
  moon: 'your emotional body',
  mercury: 'your thinking and voice',
  venus: 'your values and relating style',
  mars: 'your drive and anger',
  jupiter: 'your beliefs and growth edge',
  saturn: 'your boundaries and responsibilities',
  ascendant: 'how life is meeting you directly',
  midheaven: 'your direction and public role',
};

function getNatalPlacement(chart: NatalChart, natalPlanet: string): PlanetPosition | null {
  if (natalPlanet === 'midheaven') return null;
  if (natalPlanet === 'ascendant') return null;
  const placement = chart[natalPlanet as NatalKey];
  if (!placement || typeof placement !== 'object' || !('house' in placement)) return null;
  return placement as PlanetPosition;
}

function getAreaOfLife(chart: NatalChart, natalPlanet: string): string {
  if (natalPlanet === 'ascendant') return 'your identity, body, and the way you are meeting the world';
  if (natalPlanet === 'midheaven') return 'career direction, reputation, and what is publicly visible';

  const placement = getNatalPlacement(chart, natalPlanet);
  if (!placement) return 'the part of life that is currently asking for your attention';
  return HOUSE_THEMES[placement.house] ?? 'the life area being activated right now';
}

function getNatalTheme(natalPlanet: string): string {
  return PLANET_THEMES[natalPlanet] ?? 'a core pattern in your chart';
}

function buildTheme(domain: Domain, transit: Transit, chart: NatalChart): DomainTheme {
  const area = getAreaOfLife(chart, transit.natalPlanet);
  const natalTheme = getNatalTheme(transit.natalPlanet);
  const transitLabel = transit.transitPlanet;

  const themes: Record<Domain, DomainTheme> = {
    body: {
      focus: `${transitLabel} is activating ${area}, drawing attention to ${natalTheme} through your physical body.`,
      action: 'Pay attention to what your body is asking for today — rest, movement, or care.',
      caution: 'Do not push through fatigue or ignore physical signals right now.',
      gifts: 'Your body is processing something. Support it and it will support you back.',
      tension: 'Physical energy may feel different today — honor it instead of overriding it.',
    },
    mind: {
      focus: `${transitLabel} is moving through ${area}, stirring ${natalTheme}.`,
      action: 'Listen for the feeling underneath the noise before deciding what it means.',
      caution: 'Do not force certainty before the signal has fully clarified.',
      gifts: 'If you stay present, this can turn into useful self-knowledge rather than overwhelm.',
      tension: 'Inner material is active today, so reflection will serve you better than autopilot.',
    },
    spirit: {
      focus: `${transitLabel} is touching ${area}, activating ${natalTheme} at the level of meaning and purpose.`,
      action: 'Make space for what feels true, even if it does not make logical sense yet.',
      caution: 'Avoid dismissing intuition just because it is inconvenient.',
      gifts: 'Something deeper is trying to reach you. Stay open.',
      tension: 'Your sense of direction or faith may feel tested — this is refinement, not loss.',
    },
    relationships: {
      focus: `${transitLabel} is activating ${area}, especially around ${natalTheme}.`,
      action: 'Lead with honesty and directness instead of assumption.',
      caution: 'Do not confuse intensity, fantasy, or urgency with actual alignment.',
      gifts: 'A grounded conversation could clarify more than avoiding it will.',
      tension: 'Relationship dynamics may feel more charged than usual, which means clarity matters.',
    },
    career: {
      focus: `${transitLabel} is pressing on ${area}, with emphasis on ${natalTheme}.`,
      action: 'Choose the most load-bearing task and move that first.',
      caution: 'Avoid scattering energy across things that only feel urgent.',
      gifts: 'A practical decision made today is more valuable than dramatic momentum.',
      tension: 'Work pressure is showing you where the real bottleneck or leverage point lives.',
    },
    home: {
      focus: `${transitLabel} is stirring ${area}, with emphasis on ${natalTheme} in your environment and daily life.`,
      action: 'Small adjustments to your space or routine could have outsized impact today.',
      caution: 'Avoid rearranging everything at once — targeted changes land better.',
      gifts: 'Your living environment is reflecting something back to you. Notice what it is.',
      tension: 'Home, routine, or lifestyle may feel unsettled — this is recalibration, not chaos.',
    },
  };

  return themes[domain];
}

function scoreTransit(transit: Transit, domain: Domain, chart: NatalChart): TransitSignature | null {
  if (!PLANET_DOMAINS[transit.transitPlanet]?.includes(domain)) return null;

  const placement = getNatalPlacement(chart, transit.natalPlanet);
  const houseDomains = placement ? HOUSE_DOMAIN_MAP[placement.house] ?? [] : [];
  const directHouseMatch = transit.natalPlanet === 'ascendant' || transit.natalPlanet === 'midheaven'
    ? (domain === 'mind' || domain === 'career' || domain === 'spirit')
    : houseDomains.includes(domain);

  const aspectWeight = ASPECT_WEIGHTS[transit.aspect] ?? 1;
  const transitWeight = TRANSIT_PLANET_WEIGHTS[transit.transitPlanet] ?? 1;
  const natalWeight = NATAL_PLANET_WEIGHTS[transit.natalPlanet] ?? 1;
  const orbBonus = Math.max(0, 6 - transit.orb);
  const domainBonus = directHouseMatch ? 3 : 0;
  const weakPenalty = transit.orb > 4.5 && transit.aspect === 'sextile' ? -4 : 0;
  const weight = aspectWeight + transitWeight + natalWeight + orbBonus + domainBonus + weakPenalty;

  if (weight < 9) return null;

  return {
    weight,
    intensity: ASPECT_INTENSITY[transit.aspect] ?? 'low',
    theme: buildTheme(domain, transit, chart),
    transit,
  };
}

function buildMessage(domain: Domain, signatures: TransitSignature[]): string {
  const primary = signatures[0];
  const secondary = signatures[1];

  if (!primary) {
    return 'The pattern here is relatively quiet today. Stay observant, move gently, and let the signal reveal itself before you force action.';
  }

  const lines = [primary.theme.focus];

  if (primary.intensity === 'high') {
    lines.push(primary.theme.tension);
    lines.push(primary.theme.caution);
  } else if (primary.intensity === 'medium') {
    lines.push(primary.theme.gifts);
    lines.push(primary.theme.action);
  } else {
    lines.push(primary.theme.gifts);
  }

  if (secondary && secondary.weight >= primary.weight - 2) {
    lines.push(`Also active: ${secondary.theme.focus.toLowerCase()}`);
  }

  return lines.join(' ');
}

export function buildTransitOverview(
  transits: Transit[],
  natalChart: NatalChart,
): TransitOverview {
  const scored = transits
    .flatMap((transit) => {
      const domains = PLANET_DOMAINS[transit.transitPlanet] ?? [];
      return domains
        .map((domain) => scoreTransit(transit, domain, natalChart))
        .filter((value): value is TransitSignature => value != null);
    })
    .sort((a, b) => b.weight - a.weight);

  const uniqueTop = scored.filter((signature, index, arr) => {
    const key = `${signature.transit.transitPlanet}:${signature.transit.aspect}:${signature.transit.natalPlanet}`;
    return arr.findIndex((item) => `${item.transit.transitPlanet}:${item.transit.aspect}:${item.transit.natalPlanet}` === key) === index;
  }).slice(0, 3);

  if (uniqueTop.length === 0) {
    return {
      summary: 'The sky is relatively quiet today.',
      detail: 'Nothing dominant is demanding a big reaction. This is better for noticing than forcing.',
      intensity: 'low',
      topTransits: [],
    };
  }

  const primary = uniqueTop[0];
  const summary = primary.theme.focus;
  const detail = uniqueTop.length > 1
    ? `${primary.theme.tension} Secondary influences suggest ${uniqueTop[1].theme.focus.toLowerCase()}`
    : primary.theme.gifts;

  return {
    summary,
    detail,
    intensity: primary.intensity,
    topTransits: uniqueTop.map((item) => item.transit),
  };
}

export function interpretTransits(
  transits: Transit[],
  natalChart: NatalChart,
): GuidanceResult[] {
  const domains: Domain[] = ['body', 'mind', 'spirit', 'relationships', 'career', 'home'];

  return domains.map((domain) => {
    const scored = transits
      .map((transit) => scoreTransit(transit, domain, natalChart))
      .filter((value): value is TransitSignature => value != null)
      .sort((a, b) => b.weight - a.weight);

    const top = scored[0];
    const summary = top
      ? `${top.transit.transitPlanet} ${top.transit.aspect} ${top.transit.natalPlanet}`
      : 'Quiet sky';

    return {
      domain,
      title: DOMAIN_TITLES[domain],
      message: buildMessage(domain, scored.slice(0, 2)),
      intensity: top?.intensity ?? 'low',
      summary,
    };
  });
}
