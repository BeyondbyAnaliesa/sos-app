import type { Transit, NatalSummary, NatalPlanetSummary, DailyTransits } from '@/lib/astrology/domain-types';

export type Domain = 'body' | 'mind' | 'spirit' | 'relationships' | 'career' | 'home';
export type Intensity = 'high' | 'medium' | 'low';

export interface GuidanceResult {
  domain: Domain;
  title: string;
  message: string;
  intensity: Intensity;
  summary: string;
  weight?: number;
}


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
  domain: Domain;
}

export interface IncomingHighlight {
  dateStr: string;
  daysFromNow: number;
  transitPlanet: string;
  aspect: string;
  natalPlanet: string;
  domain: Domain;
  weight: number;
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

// Aspect labels for look-ahead copy (verb form, fits "Jupiter ___ natal Sun")
const ASPECT_SIMPLE: Record<string, string> = {
  conjunction: 'conjunct',
  opposition: 'opposite',
  square: 'squaring',
  trine: 'trine',
  sextile: 'sextile',
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
  uranus: 'your liberation edge and disruptions',
  neptune: 'your dreams, dissolving, and spiritual sensitivity',
  pluto: 'your transformation, power, and underworld material',
  northNode: 'your growth edge and karmic pull forward',
  ascendant: 'how life is meeting you directly',
  midheaven: 'your direction and public role',
};

function getNatalPlacement(chart: NatalSummary, natalPlanet: string): NatalPlanetSummary | null {
  if (natalPlanet === 'midheaven' || natalPlanet === 'ascendant') return null;
  return chart.placementsByKey[natalPlanet] ?? null;
}

function getAreaOfLife(chart: NatalSummary, natalPlanet: string): string {
  if (natalPlanet === 'ascendant') return 'your identity, body, and the way you are meeting the world';
  if (natalPlanet === 'midheaven') return 'career direction, reputation, and what is publicly visible';

  const placement = getNatalPlacement(chart, natalPlanet);
  if (!placement) return 'the part of life that is currently asking for your attention';
  return HOUSE_THEMES[placement.house] ?? 'the life area being activated right now';
}

function getNatalTheme(natalPlanet: string): string {
  return PLANET_THEMES[natalPlanet] ?? 'a core pattern in your chart';
}

function buildTheme(domain: Domain, transit: Transit, chart: NatalSummary): DomainTheme {
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

function scoreTransit(transit: Transit, domain: Domain, chart: NatalSummary): TransitSignature | null {
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
    domain,
  };
}

// ── Calm-day logic (#DR-2) ───────────────────────────────────────────────────
// Planets are always talking. Never render "the sky is quiet" or any
// abstract wellness-speak. Name what's real: actual planets, actual orbs,
// actual incoming transits with their life-domain impact.
//
// Banned copy (hard guardrail — if any of these appear in output, a test fails):
//   "trust the pause" | "sit with the stillness" | "the sky is quiet" |
//   "the sky is still" | "lean into the quiet"

/**
 * Concrete description of today's sky when no transit scored above the
 * significance threshold. Names the actual tightest contact rather than
 * declaring the sky empty or quiet.
 */
function buildCalmTodaySummary(transits: Transit[]): string {
  if (transits.length === 0) {
    return 'No planetary contacts within standard orbs today — a genuinely rare open window in the chart.';
  }
  const top = transits[0]; // already sorted by orb, tightest first
  const feel = ASPECT_SIMPLE[top.aspect] ?? top.aspect;
  const natalLabel = top.natalPlanet.charAt(0).toUpperCase() + top.natalPlanet.slice(1);
  return `${top.transitPlanet} is ${feel} natal ${natalLabel} today (${top.orb}\u00b0 orb) — active contacts in the chart, but nothing tight enough to demand a big reaction.`;
}

/**
 * Format a look-ahead day label: "tomorrow (Monday)", "Tuesday", "Wednesday".
 */
function formatLookAheadWhen(daysFromNow: number, dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const dayName = d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  if (daysFromNow === 1) return `tomorrow (${dayName})`;
  return dayName;
}

/**
 * Build the look-ahead detail line from incoming highlights.
 * Names real planets, real days, real life-area domains.
 */
function buildLookAheadDetail(highlights: IncomingHighlight[]): string {
  const top = highlights.slice(0, 2);
  const parts = top.map((h) => {
    const aspectLabel = ASPECT_SIMPLE[h.aspect] ?? h.aspect;
    const natalLabel = h.natalPlanet.charAt(0).toUpperCase() + h.natalPlanet.slice(1);
    const when = formatLookAheadWhen(h.daysFromNow, h.dateStr);
    const domainLabel = DOMAIN_TITLES[h.domain];
    return `${h.transitPlanet} ${aspectLabel} natal ${natalLabel} picks up ${when} — ${domainLabel}.`;
  });
  return `Incoming: ${parts.join(' ')} Today is the calm before that.`;
}

/**
 * Build the detail line when no significant transits are coming in the
 * next 3 days either. Concrete and positive — no meditation-speak.
 */
function buildQuietWindowDetail(transits: Transit[]): string {
  if (transits.length === 0) {
    return 'Nothing is building in the 72-hour window either. A structural pause between transit waves — genuinely rare.';
  }
  const planetNames = [...new Set(transits.slice(0, 4).map((t) => t.transitPlanet))];
  const planetList =
    planetNames.length === 1
      ? planetNames[0]
      : planetNames.slice(0, -1).join(', ') + ' and ' + planetNames[planetNames.length - 1];
  const verb = planetNames.length === 1 ? 'is' : 'are';
  return `${planetList} ${verb} all in wide-orb contacts — no tight build-up in the next 3 days. A full-rest window before the next wave.`;
}

/**
 * Scan look-ahead DailyTransits for the first meaningful transit per day.
 * Returns up to 3 highlights (one per day), deduplicated by transit key.
 */
export function scanIncomingHighlights(
  lookAheadTransits: DailyTransits[],
  natalChart: NatalSummary,
): IncomingHighlight[] {
  const results: IncomingHighlight[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lookAheadTransits.length; i++) {
    const day = lookAheadTransits[i];

    const dayTop = day.transits
      .flatMap((transit) => {
        const domains = PLANET_DOMAINS[transit.transitPlanet] ?? [];
        return domains
          .map((domain) => {
            const sig = scoreTransit(transit, domain, natalChart);
            return sig ? { sig, domain } : null;
          })
          .filter((x): x is { sig: TransitSignature; domain: Domain } => x != null);
      })
      .sort((a, b) => b.sig.weight - a.sig.weight);

    for (const { sig, domain } of dayTop) {
      const key = `${sig.transit.transitPlanet}:${sig.transit.aspect}:${sig.transit.natalPlanet}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          dateStr: day.date,
          daysFromNow: i + 1,
          transitPlanet: sig.transit.transitPlanet,
          aspect: sig.transit.aspect,
          natalPlanet: sig.transit.natalPlanet,
          domain,
          weight: sig.weight,
        });
        break; // one highlight per day is enough
      }
    }

    if (results.length >= 3) break;
  }

  return results;
}

/**
 * Build a calm-day TransitOverview. No "empty sky" framing — always names
 * real contacts and either previews what's incoming or confirms the full window.
 */
function buildCalmDayOverview(
  transits: Transit[],
  incomingHighlights: IncomingHighlight[],
): TransitOverview {
  const todaySummary = buildCalmTodaySummary(transits);

  if (incomingHighlights.length > 0) {
    return {
      summary: todaySummary,
      detail: buildLookAheadDetail(incomingHighlights),
      intensity: 'low',
      topTransits: [],
    };
  }

  return {
    summary: todaySummary,
    detail: buildQuietWindowDetail(transits),
    intensity: 'low',
    topTransits: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────

const DOMAIN_LIVED_OPENERS: Record<Domain, string> = {
  body: 'Watch your physical bandwidth first. The chart is pointing to what your body will tolerate, not what your calendar thinks you can do.',
  mind: 'The useful signal today is underneath the first thought. Pay attention to what keeps repeating in your head after the obvious explanation is gone.',
  spirit: 'This is a meaning-and-direction day. The chart is less interested in comfort than in whether the path still feels true.',
  relationships: 'The relationship signal is in the part you keep editing before you say it. That is where the chart is applying pressure.',
  career: 'The work signal is about leverage, not effort. Notice where more force would only hide the actual bottleneck.',
  home: 'Your environment is giving information today. The friction in the routine is not random; it is showing what no longer fits.',
};

function buildMessage(domain: Domain, signatures: TransitSignature[]): string {
  const primary = signatures[0];
  const secondary = signatures[1];

  if (!primary) {
    // No significant activations scored for this domain today.
    // Name the absence concretely — no wellness-speak.
    return 'No significant activations in this area today. Wide-orb or no contacts — the signal here is low.';
  }

  const lines = [DOMAIN_LIVED_OPENERS[domain], primary.theme.focus];

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

/**
 * Build a transit overview for the given day.
 *
 * When today is low-intensity (no transit scores above the significance
 * threshold), the function uses the optional look-ahead window to produce
 * a concrete calm-day reading instead of a generic "quiet sky" message.
 *
 * @param transits        Today's transit list (from calculateTransitsForDate)
 * @param natalChart      Natal summary for the user
 * @param options.lookAheadTransits  Pre-computed DailyTransits for the next
 *                        1–3 days (use calculateTransitsForRange starting
 *                        tomorrow). Optional but strongly recommended — without
 *                        it, calm days fall back to the quiet-window copy.
 */
export function buildTransitOverview(
  transits: Transit[],
  natalChart: NatalSummary,
  options?: { lookAheadTransits?: DailyTransits[] },
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
    // DR-2: calm-day logic — never show "the sky is quiet" or empty-state framing.
    // Always name real transits and either preview what's incoming or confirm the window.
    const lookAhead = options?.lookAheadTransits ?? [];
    const incoming = scanIncomingHighlights(lookAhead, natalChart);
    return buildCalmDayOverview(transits, incoming);
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
  natalChart: NatalSummary,
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
      : 'No significant transits';

    return {
      domain,
      title: DOMAIN_TITLES[domain],
      message: buildMessage(domain, scored.slice(0, 2)),
      intensity: top?.intensity ?? 'low',
      summary,
      weight: top?.weight ?? 0,
    };
  });
}
