import { lookupMacroLandscapeReceipt } from '@/lib/astrology/macro-landscape';
import type {
  MacroConfigurationKind,
  MacroConfigurationRarityFact,
  MacroConfigurationReceipt,
} from '@/lib/astrology/macrocosm-types';
import type {
  AstrologyCollectiveSkyEvent,
  AstrologyJudgmentCurrentSky,
} from '@/lib/astrology/judgment-types';

const SEEDED_TOPIC_ORDER = [
  'saturn-neptune-aries',
  'uranus-square-nodes',
  'uranus-in-gemini',
  'pluto-in-aquarius',
] as const;

const SLOW_BODIES = new Set(['Saturn', 'Uranus', 'Neptune', 'Pluto']);
const LUNATION_KINDS = new Set(['lunation', 'eclipse']);

function isoDate(input: Date | string): string {
  return typeof input === 'string' ? input.slice(0, 10) : input.toISOString().slice(0, 10);
}

function dedupe(values: string[]) {
  return values.filter((value, index, all) => Boolean(value) && all.indexOf(value) === index);
}

function dedupeEvents(events: AstrologyCollectiveSkyEvent[]) {
  const seen = new Set<string>();
  return events.filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
}

function sortEvents(events: AstrologyCollectiveSkyEvent[]) {
  return [...events].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.id.localeCompare(b.id);
  });
}

function matchesBody(event: AstrologyCollectiveSkyEvent, body: string) {
  return event.bodies.includes(body);
}

function isIngressFor(event: AstrologyCollectiveSkyEvent, body: string, sign: string) {
  return event.kind === 'sign_ingress_proximity' && event.sign === sign && matchesBody(event, body);
}

function isAspectBetween(event: AstrologyCollectiveSkyEvent, bodyA: string, aspect: string, bodyB: string) {
  return event.kind === 'transit_aspect'
    && event.aspect === aspect
    && matchesBody(event, bodyA)
    && matchesBody(event, bodyB);
}

function isLunationTouchingSign(event: AstrologyCollectiveSkyEvent, sign: string) {
  return LUNATION_KINDS.has(event.kind) && event.sign === sign;
}

function isLunationTouchingNodes(event: AstrologyCollectiveSkyEvent) {
  return event.kind === 'eclipse' || (event.kind === 'lunation' && matchesBody(event, 'North Node'));
}

function buildRarity(kind: MacroConfigurationKind, extraLimitations: string[] = []): MacroConfigurationRarityFact {
  const comparator: MacroConfigurationRarityFact['comparator'] = kind === 'outer_planet_sign_ingress'
    ? 'same_outer_planet_sign_ingress'
    : kind === 'nodal_entanglement'
      ? 'same_nodal_trigger_family'
      : kind === 'station_stack'
        ? 'same_station_stack_family'
        : kind === 'outer_planet_aspect_family'
          ? 'same_outer_planet_aspect_cluster'
          : kind === 'multi_event_cluster'
            ? 'same_configuration_family'
            : 'same_configuration_family';

  return {
    status: 'not_computed',
    confidence: 'none',
    assessment: 'heuristic_only',
    comparator,
    historicalGapYears: null,
    recurrenceWindow: {
      priorComparableDate: null,
      nextComparableDate: null,
      scanWindowDays: null,
    },
    limitations: [
      'Macro configuration recurrence is fenced in slice 1 unless a dedicated historical comparator is implemented.',
      'Configuration grouping is deterministic from currentSky.events only and does not rescan wider history.',
      ...extraLimitations,
    ],
  };
}

function buildTimeWindow(asOfDate: string) {
  return {
    startDate: null,
    peakDate: asOfDate,
    endDate: null,
  };
}

function buildConsequence(events: AstrologyCollectiveSkyEvent[], extraLimitations: string[] = []) {
  const averageScore = events.reduce((sum, event) => sum + event.score, 0) / events.length;
  const score = Number(Math.min(10, averageScore + Math.min(1.2, events.length * 0.2)).toFixed(2));

  return {
    score,
    basis: 'heuristic' as const,
    limitations: [
      'Macro consequence score is a deterministic aggregate of supporting current-sky event scores.',
      ...extraLimitations,
    ],
  };
}

function buildCommonReceipt(params: {
  id: string;
  kind: MacroConfigurationKind;
  title: string;
  summary: string;
  interpretiveFamily: string;
  events: AstrologyCollectiveSkyEvent[];
  asOfDate: string;
  topicKey?: string;
  extraReceipts?: string[];
  extraLimitations?: string[];
}): MacroConfigurationReceipt {
  const events = sortEvents(dedupeEvents(params.events));

  return {
    id: params.id,
    status: 'macro-configuration-v1',
    kind: params.kind,
    title: params.title,
    summary: params.summary,
    eventIds: events.map((event) => event.id),
    bodies: dedupe(events.flatMap((event) => event.bodies)),
    signs: dedupe(events.map((event) => event.sign).filter((value): value is string => Boolean(value))).sort(),
    timeWindow: buildTimeWindow(params.asOfDate),
    interpretiveFamily: params.interpretiveFamily,
    landscape: params.topicKey ? lookupMacroLandscapeReceipt(params.topicKey) : null,
    rarity: buildRarity(params.kind, params.extraLimitations),
    consequence: buildConsequence(events, params.extraLimitations),
    receipts: [
      `Built from currentSky.events on ${params.asOfDate}.`,
      ...events.map((event) => `${event.id} (${event.kind})`),
      ...(params.extraReceipts ?? []),
    ],
    limitations: dedupe([
      'Slice 1 is internal/source-truth only and does not generate public macro prose.',
      'Time windows are anchored to the scan date because currentSky.events do not yet carry configuration-level start/end bounds.',
      ...(params.extraLimitations ?? []),
    ]),
  };
}

function buildSaturnNeptuneAries(events: AstrologyCollectiveSkyEvent[], asOfDate: string): MacroConfigurationReceipt | null {
  const support = events.filter((event) => {
    if (isIngressFor(event, 'Saturn', 'Aries')) return true;
    if (isIngressFor(event, 'Neptune', 'Aries')) return true;
    if (event.kind === 'sign_cluster' && event.sign === 'Aries' && matchesBody(event, 'Saturn') && matchesBody(event, 'Neptune')) return true;
    return isAspectBetween(event, 'Saturn', 'conjunction', 'Neptune') && event.sign === 'Aries';
  });

  if (support.length < 2) return null;

  return buildCommonReceipt({
    id: 'macro:outer-ingress:saturn-neptune-aries',
    kind: 'outer_planet_sign_ingress',
    title: 'Saturn-Neptune Aries ingress cluster',
    summary: 'Saturn/Neptune Aries support is active across ingress and configuration events in the current sky scan.',
    interpretiveFamily: 'saturn-neptune-aries',
    events: support,
    asOfDate,
    topicKey: 'saturn-neptune-aries',
    extraReceipts: ['Requires at least two Aries support signals across Saturn/Neptune ingress, conjunction, or same-sign clustering.'],
  });
}

function buildUranusInGemini(events: AstrologyCollectiveSkyEvent[], asOfDate: string): MacroConfigurationReceipt | null {
  const support = events.filter((event) => isIngressFor(event, 'Uranus', 'Gemini'));
  if (support.length === 0) return null;

  return buildCommonReceipt({
    id: 'macro:outer-ingress:uranus-in-gemini',
    kind: 'outer_planet_sign_ingress',
    title: 'Uranus in Gemini ingress signal',
    summary: 'Uranus ingress pressure into Gemini is explicitly supported by current sign-ingress events.',
    interpretiveFamily: 'uranus-in-gemini',
    events: support,
    asOfDate,
    topicKey: 'uranus-in-gemini',
  });
}

function buildPlutoInAquarius(events: AstrologyCollectiveSkyEvent[], asOfDate: string): MacroConfigurationReceipt | null {
  const support = events.filter((event) => isIngressFor(event, 'Pluto', 'Aquarius'));
  if (support.length === 0) return null;

  return buildCommonReceipt({
    id: 'macro:outer-ingress:pluto-in-aquarius',
    kind: 'outer_planet_sign_ingress',
    title: 'Pluto in Aquarius ingress signal',
    summary: 'Pluto ingress pressure into Aquarius is explicitly supported by current sign-ingress events.',
    interpretiveFamily: 'pluto-in-aquarius',
    events: support,
    asOfDate,
    topicKey: 'pluto-in-aquarius',
  });
}

function buildUranusSquareNodes(events: AstrologyCollectiveSkyEvent[], asOfDate: string): MacroConfigurationReceipt | null {
  const support = events.filter((event) => isAspectBetween(event, 'Uranus', 'square', 'North Node'));
  if (support.length === 0) return null;

  const eclipseSupport = events.filter((event) => event.kind === 'eclipse');

  return buildCommonReceipt({
    id: 'macro:nodal:uranus-square-nodes',
    kind: 'nodal_entanglement',
    title: 'Uranus square nodal axis',
    summary: 'Uranus is in an active square relationship to the nodal axis in the current sky scan.',
    interpretiveFamily: 'uranus-square-nodes',
    events: [...support, ...eclipseSupport],
    asOfDate,
    topicKey: 'uranus-square-nodes',
    extraReceipts: eclipseSupport.length > 0 ? ['Current eclipse support is folded into the nodal entanglement receipt when present.'] : undefined,
  });
}

function buildLunationTriggers(events: AstrologyCollectiveSkyEvent[], asOfDate: string): MacroConfigurationReceipt[] {
  const configurations: MacroConfigurationReceipt[] = [];
  const lunations = events.filter((event) => LUNATION_KINDS.has(event.kind));

  if (lunations.length === 0) return configurations;

  const saturnNeptuneSupport = events.filter((event) => {
    if (event.sign !== 'Aries') return false;
    return matchesBody(event, 'Saturn') || matchesBody(event, 'Neptune');
  });
  const ariesLunations = lunations.filter((event) => isLunationTouchingSign(event, 'Aries'));
  if (ariesLunations.length > 0 && saturnNeptuneSupport.length > 0) {
    configurations.push(buildCommonReceipt({
      id: 'macro:lunation-trigger:saturn-neptune-aries',
      kind: 'lunation_slow_planet_trigger',
      title: 'Lunation trigger on Saturn-Neptune Aries theme',
      summary: 'A lunation/eclipse is hitting the same Aries macro zone already occupied by Saturn/Neptune support events.',
      interpretiveFamily: 'saturn-neptune-aries-trigger',
      events: [...ariesLunations, ...saturnNeptuneSupport],
      asOfDate,
      topicKey: 'saturn-neptune-aries',
      extraReceipts: ['Requires both a lunation/eclipse in Aries and pre-existing Saturn/Neptune Aries support inside currentSky.events.'],
    }));
  }

  const aquariusLunations = lunations.filter((event) => isLunationTouchingSign(event, 'Aquarius'));
  const plutoSupport = events.filter((event) => matchesBody(event, 'Pluto') && event.sign === 'Aquarius');
  if (aquariusLunations.length > 0 && plutoSupport.length > 0) {
    configurations.push(buildCommonReceipt({
      id: 'macro:lunation-trigger:pluto-in-aquarius',
      kind: 'lunation_slow_planet_trigger',
      title: 'Lunation trigger on Pluto in Aquarius theme',
      summary: 'A lunation/eclipse is hitting Aquarius while Pluto support is already active in the same macro zone.',
      interpretiveFamily: 'pluto-in-aquarius-trigger',
      events: [...aquariusLunations, ...plutoSupport],
      asOfDate,
      topicKey: 'pluto-in-aquarius',
      extraReceipts: ['Requires both a lunation/eclipse in Aquarius and Pluto Aquarius support inside currentSky.events.'],
    }));
  }

  const geminiLunations = lunations.filter((event) => isLunationTouchingSign(event, 'Gemini'));
  const uranusSupport = events.filter((event) => matchesBody(event, 'Uranus') && event.sign === 'Gemini');
  if (geminiLunations.length > 0 && uranusSupport.length > 0) {
    configurations.push(buildCommonReceipt({
      id: 'macro:lunation-trigger:uranus-in-gemini',
      kind: 'lunation_slow_planet_trigger',
      title: 'Lunation trigger on Uranus in Gemini theme',
      summary: 'A lunation/eclipse is hitting Gemini while Uranus ingress support is already active there.',
      interpretiveFamily: 'uranus-in-gemini-trigger',
      events: [...geminiLunations, ...uranusSupport],
      asOfDate,
      topicKey: 'uranus-in-gemini',
      extraReceipts: ['Requires both a lunation/eclipse in Gemini and Uranus Gemini support inside currentSky.events.'],
    }));
  }

  const nodeLunations = lunations.filter((event) => isLunationTouchingNodes(event));
  const nodalSupport = events.filter((event) => isAspectBetween(event, 'Uranus', 'square', 'North Node'));
  if (nodeLunations.length > 0 && nodalSupport.length > 0) {
    configurations.push(buildCommonReceipt({
      id: 'macro:lunation-trigger:uranus-square-nodes',
      kind: 'lunation_slow_planet_trigger',
      title: 'Lunation trigger on Uranus-square-nodes theme',
      summary: 'A nodal lunation/eclipse is stacking on top of an active Uranus-square-nodes pattern.',
      interpretiveFamily: 'uranus-square-nodes-trigger',
      events: [...nodeLunations, ...nodalSupport],
      asOfDate,
      topicKey: 'uranus-square-nodes',
      extraReceipts: ['Requires both nodal lunation/eclipse support and an active Uranus square North Node event.'],
    }));
  }

  return configurations;
}

function buildStationStack(events: AstrologyCollectiveSkyEvent[], asOfDate: string): MacroConfigurationReceipt | null {
  const support = events.filter((event) => event.kind === 'station_proximity' && event.bodies.some((body) => SLOW_BODIES.has(body)));
  if (support.length < 2) return null;

  return buildCommonReceipt({
    id: 'macro:station-stack:slow-body-pressure-window',
    kind: 'station_stack',
    title: 'Slow-body station stack',
    summary: 'Multiple slow bodies are simultaneously close enough to station thresholds to count as a shared pressure window.',
    interpretiveFamily: 'slow-body-pressure-window',
    events: support,
    asOfDate,
    extraReceipts: ['Requires at least two supported slow-body station_proximity events in currentSky.events.'],
    extraLimitations: ['Station-stack receipt is generic in slice 1 and does not yet map into a personal bridge or public narrative lane.'],
  });
}

export function buildMacroConfigurationsFromCurrentSky(currentSky: AstrologyJudgmentCurrentSky, asOfDate: Date | string): MacroConfigurationReceipt[] {
  const date = isoDate(asOfDate);
  const events = currentSky.events ?? [];

  const configurations = [
    buildSaturnNeptuneAries(events, date),
    buildUranusSquareNodes(events, date),
    buildUranusInGemini(events, date),
    buildPlutoInAquarius(events, date),
    ...buildLunationTriggers(events, date),
    buildStationStack(events, date),
  ].filter((value): value is MacroConfigurationReceipt => Boolean(value));

  return configurations.sort((a, b) => {
    const topicRankA = SEEDED_TOPIC_ORDER.findIndex((key) => a.interpretiveFamily.startsWith(key));
    const topicRankB = SEEDED_TOPIC_ORDER.findIndex((key) => b.interpretiveFamily.startsWith(key));
    const safeRankA = topicRankA === -1 ? SEEDED_TOPIC_ORDER.length : topicRankA;
    const safeRankB = topicRankB === -1 ? SEEDED_TOPIC_ORDER.length : topicRankB;
    if (safeRankA !== safeRankB) return safeRankA - safeRankB;
    if (b.consequence.score !== a.consequence.score) return b.consequence.score - a.consequence.score;
    return a.id.localeCompare(b.id);
  });
}
