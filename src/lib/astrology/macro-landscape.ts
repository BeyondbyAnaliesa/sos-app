import type {
  MacroLandscapeReceipt,
  SeededMacroTopicKey,
} from '@/lib/astrology/macrocosm-types';

const SOURCE_MAP_VERSION = 'era-level-astro-source-map-2026-05-08';
const SCAN_VERSION = 'latest-era-level-astro-landscape';

const SEEDED_TOPIC_MAP: Record<SeededMacroTopicKey, Omit<MacroLandscapeReceipt, 'status' | 'topicKey'>> = {
  'uranus-in-gemini': {
    statusLabel: 'saturated',
    sourceMapVersion: SOURCE_MAP_VERSION,
    scanVersion: SCAN_VERSION,
    consensusSummary: 'Uranus in Gemini is already widely framed as a communications, media, mobility, and information-system disruption signature.',
    saturatedClaims: [
      'AI, media, education, and network disruption is already a heavily covered thesis.',
      'Fast-moving communications and transportation change is already consensus-level framing.',
    ],
    openQuestions: [
      'How much of the story is infrastructure rewiring versus narrative volatility?',
      'Which Gemini domains are most durable once the first hype cycle cools?',
    ],
    underStudiedAngles: [
      'local logistics and neighborhood coordination systems',
      'attention fragmentation as civic infrastructure risk',
    ],
    limitations: [
      'Landscape status is seeded from static internal research notes only in slice 1.',
    ],
  },
  'uranus-square-nodes': {
    statusLabel: 'emerging',
    sourceMapVersion: SOURCE_MAP_VERSION,
    scanVersion: SCAN_VERSION,
    consensusSummary: 'Uranus square the nodal axis is discussed as a collective fork-in-the-road signature, but less uniformly than the sign-ingress headlines.',
    saturatedClaims: [
      'Destiny pivots and timeline shocks are common broad-strokes interpretations.',
    ],
    openQuestions: [
      'What distinguishes structural reorientation from short-lived volatility?',
      'How do nodal/eclipse triggers escalate or localize the Uranian break-point?',
    ],
    underStudiedAngles: [
      'decision-pressure around networks, alliances, and distribution systems',
      'how eclipse timing changes collective adoption speed',
    ],
    limitations: [
      'Landscape status is seeded from static internal research notes only in slice 1.',
    ],
  },
  'saturn-neptune-aries': {
    statusLabel: 'emerging',
    sourceMapVersion: SOURCE_MAP_VERSION,
    scanVersion: SCAN_VERSION,
    consensusSummary: 'Saturn-Neptune in Aries is increasingly framed as the collision between vision, sacrifice, and real-world rebuilding pressure.',
    saturatedClaims: [
      'Collective resets around identity, leadership, and conflict are already common talking points.',
    ],
    openQuestions: [
      'Where does disciplined construction outperform collapse or disillusionment framing?',
      'How much of the Aries story is ignition versus cleanup after prior cycles?',
    ],
    underStudiedAngles: [
      'institutional stamina during high-heat beginnings',
      'the difference between symbolic restart and operational restart',
    ],
    limitations: [
      'Landscape status is seeded from static internal research notes only in slice 1.',
    ],
  },
  'pluto-in-aquarius': {
    statusLabel: 'saturated',
    sourceMapVersion: SOURCE_MAP_VERSION,
    scanVersion: SCAN_VERSION,
    consensusSummary: 'Pluto in Aquarius is already treated as a major long-wave signal around power, systems, collectives, and technological governance.',
    saturatedClaims: [
      'Power redistribution in networks and institutions is already consensus framing.',
      'Technology and collective systems overhaul is already a heavily covered thesis.',
    ],
    openQuestions: [
      'Which Aquarius themes are actually structural rather than aesthetic branding?',
      'How do governance and participation evolve beyond disruption rhetoric?',
    ],
    underStudiedAngles: [
      'maintenance burdens inside new collective systems',
      'who absorbs the hidden labor of network transformation',
    ],
    limitations: [
      'Landscape status is seeded from static internal research notes only in slice 1.',
    ],
  },
};

function cloneReceipt(topicKey: string, receipt: Omit<MacroLandscapeReceipt, 'status' | 'topicKey'>): MacroLandscapeReceipt {
  return {
    status: 'macro-landscape-v1',
    topicKey,
    statusLabel: receipt.statusLabel,
    sourceMapVersion: receipt.sourceMapVersion,
    scanVersion: receipt.scanVersion,
    consensusSummary: receipt.consensusSummary,
    saturatedClaims: [...receipt.saturatedClaims],
    openQuestions: [...receipt.openQuestions],
    underStudiedAngles: [...receipt.underStudiedAngles],
    limitations: [...receipt.limitations],
  };
}

export function lookupMacroLandscapeReceipt(topicKey: string): MacroLandscapeReceipt | null {
  const receipt = SEEDED_TOPIC_MAP[topicKey as SeededMacroTopicKey];
  return receipt ? cloneReceipt(topicKey, receipt) : null;
}

export function getMacroLandscapeReceipt(topicKey: string): MacroLandscapeReceipt {
  return lookupMacroLandscapeReceipt(topicKey) ?? {
    status: 'macro-landscape-v1',
    topicKey,
    statusLabel: 'unknown',
    sourceMapVersion: SOURCE_MAP_VERSION,
    scanVersion: SCAN_VERSION,
    consensusSummary: 'No seeded macro landscape mapping exists for this topic in slice 1.',
    saturatedClaims: [],
    openQuestions: [
      'Landscape mapping has not been curated for this topic yet.',
    ],
    underStudiedAngles: [],
    limitations: [
      'Unknown status is a safe fallback when no static topic mapping exists.',
      'Slice 1 does not fetch live web/source data on the request path.',
    ],
  };
}

export function listSeededMacroLandscapeReceipts(): MacroLandscapeReceipt[] {
  return Object.entries(SEEDED_TOPIC_MAP).map(([topicKey, receipt]) => cloneReceipt(topicKey, receipt));
}
