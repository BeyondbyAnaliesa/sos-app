export type AstrologyObjectCategory = 'luminary' | 'planet' | 'asteroid' | 'node' | 'angle' | 'lot';
export type AstrologyObjectSupportLevel = 'primary' | 'supporting' | 'minor' | 'fenced';
export type AstrologyObjectSurface = 'natal' | 'transit' | 'current_sky' | 'major_arc' | 'meaning';
export type AstrologyObjectSurfaceStatus = 'supported' | 'derived' | 'unsupported';

export interface AstrologyObjectInventoryEntry {
  key: string;
  label: string;
  aliases: string[];
  category: AstrologyObjectCategory;
  supportLevel: AstrologyObjectSupportLevel;
  rankingWeight: number;
  surfaces: Record<AstrologyObjectSurface, AstrologyObjectSurfaceStatus>;
  currentSkyPairing: boolean;
  currentSkyIngress: boolean;
  currentSkyConfiguration: boolean;
  rationale: string;
}

export interface AstrologyObjectReceiptSummary {
  key: string;
  label: string;
  category: AstrologyObjectCategory;
  supportLevel: AstrologyObjectSupportLevel;
  rankingWeight: number;
  status: AstrologyObjectSurfaceStatus;
}

const OBJECTS: AstrologyObjectInventoryEntry[] = [
  {
    key: 'sun',
    label: 'Sun',
    aliases: ['sun'],
    category: 'luminary',
    supportLevel: 'primary',
    rankingWeight: 1,
    surfaces: { natal: 'supported', transit: 'supported', current_sky: 'supported', major_arc: 'unsupported', meaning: 'supported' },
    currentSkyPairing: true,
    currentSkyIngress: true,
    currentSkyConfiguration: true,
    rationale: 'Core luminary across every engine surface.',
  },
  {
    key: 'moon',
    label: 'Moon',
    aliases: ['moon'],
    category: 'luminary',
    supportLevel: 'primary',
    rankingWeight: 1,
    surfaces: { natal: 'supported', transit: 'supported', current_sky: 'supported', major_arc: 'unsupported', meaning: 'supported' },
    currentSkyPairing: true,
    currentSkyIngress: true,
    currentSkyConfiguration: true,
    rationale: 'Core luminary across every engine surface.',
  },
  {
    key: 'mercury',
    label: 'Mercury',
    aliases: ['mercury'],
    category: 'planet',
    supportLevel: 'primary',
    rankingWeight: 1,
    surfaces: { natal: 'supported', transit: 'supported', current_sky: 'supported', major_arc: 'unsupported', meaning: 'supported' },
    currentSkyPairing: true,
    currentSkyIngress: true,
    currentSkyConfiguration: true,
    rationale: 'Core personal planet support.',
  },
  {
    key: 'venus',
    label: 'Venus',
    aliases: ['venus'],
    category: 'planet',
    supportLevel: 'primary',
    rankingWeight: 1,
    surfaces: { natal: 'supported', transit: 'supported', current_sky: 'supported', major_arc: 'unsupported', meaning: 'supported' },
    currentSkyPairing: true,
    currentSkyIngress: true,
    currentSkyConfiguration: true,
    rationale: 'Core personal planet support.',
  },
  {
    key: 'mars',
    label: 'Mars',
    aliases: ['mars'],
    category: 'planet',
    supportLevel: 'primary',
    rankingWeight: 1,
    surfaces: { natal: 'supported', transit: 'supported', current_sky: 'supported', major_arc: 'unsupported', meaning: 'supported' },
    currentSkyPairing: true,
    currentSkyIngress: true,
    currentSkyConfiguration: true,
    rationale: 'Core personal planet support.',
  },
  {
    key: 'jupiter',
    label: 'Jupiter',
    aliases: ['jupiter'],
    category: 'planet',
    supportLevel: 'primary',
    rankingWeight: 1,
    surfaces: { natal: 'supported', transit: 'supported', current_sky: 'supported', major_arc: 'supported', meaning: 'supported' },
    currentSkyPairing: true,
    currentSkyIngress: true,
    currentSkyConfiguration: true,
    rationale: 'Social planet with major-arc relevance.',
  },
  {
    key: 'saturn',
    label: 'Saturn',
    aliases: ['saturn'],
    category: 'planet',
    supportLevel: 'primary',
    rankingWeight: 1,
    surfaces: { natal: 'supported', transit: 'supported', current_sky: 'supported', major_arc: 'supported', meaning: 'supported' },
    currentSkyPairing: true,
    currentSkyIngress: true,
    currentSkyConfiguration: true,
    rationale: 'Social planet with major-arc relevance.',
  },
  {
    key: 'uranus',
    label: 'Uranus',
    aliases: ['uranus'],
    category: 'planet',
    supportLevel: 'primary',
    rankingWeight: 1,
    surfaces: { natal: 'supported', transit: 'supported', current_sky: 'supported', major_arc: 'supported', meaning: 'supported' },
    currentSkyPairing: true,
    currentSkyIngress: true,
    currentSkyConfiguration: true,
    rationale: 'Outer planet with strong collective relevance.',
  },
  {
    key: 'neptune',
    label: 'Neptune',
    aliases: ['neptune'],
    category: 'planet',
    supportLevel: 'primary',
    rankingWeight: 1,
    surfaces: { natal: 'supported', transit: 'supported', current_sky: 'supported', major_arc: 'supported', meaning: 'supported' },
    currentSkyPairing: true,
    currentSkyIngress: true,
    currentSkyConfiguration: true,
    rationale: 'Outer planet with strong collective relevance.',
  },
  {
    key: 'pluto',
    label: 'Pluto',
    aliases: ['pluto'],
    category: 'planet',
    supportLevel: 'primary',
    rankingWeight: 1,
    surfaces: { natal: 'supported', transit: 'supported', current_sky: 'supported', major_arc: 'supported', meaning: 'supported' },
    currentSkyPairing: true,
    currentSkyIngress: true,
    currentSkyConfiguration: true,
    rationale: 'Outer planet with strong collective relevance.',
  },
  {
    key: 'chiron',
    label: 'Chiron',
    aliases: ['chiron'],
    category: 'asteroid',
    supportLevel: 'supporting',
    rankingWeight: 0.82,
    surfaces: { natal: 'supported', transit: 'supported', current_sky: 'supported', major_arc: 'supported', meaning: 'supported' },
    currentSkyPairing: true,
    currentSkyIngress: true,
    currentSkyConfiguration: true,
    rationale: 'Already present on some surfaces; v1 normalizes it across natal/transit/current-sky with lower default weight.',
  },
  {
    key: 'north-node',
    label: 'North Node',
    aliases: ['northnode', 'north-node', 'north node'],
    category: 'node',
    supportLevel: 'supporting',
    rankingWeight: 0.8,
    surfaces: { natal: 'supported', transit: 'supported', current_sky: 'supported', major_arc: 'supported', meaning: 'supported' },
    currentSkyPairing: false,
    currentSkyIngress: true,
    currentSkyConfiguration: false,
    rationale: 'Node support is kept tight: natal/transit use plus eclipse and ingress surfaces, not broad current-sky aspect noise.',
  },
  {
    key: 'south-node',
    label: 'South Node',
    aliases: ['southnode', 'south-node', 'south node'],
    category: 'node',
    supportLevel: 'minor',
    rankingWeight: 0.68,
    surfaces: { natal: 'derived', transit: 'derived', current_sky: 'unsupported', major_arc: 'unsupported', meaning: 'supported' },
    currentSkyPairing: false,
    currentSkyIngress: false,
    currentSkyConfiguration: false,
    rationale: 'Derived directly from the true node axis for natal/transit use, but fenced out of collective ranking to avoid node-axis noise.',
  },
  {
    key: 'ascendant',
    label: 'Ascendant',
    aliases: ['asc', 'ascendant'],
    category: 'angle',
    supportLevel: 'supporting',
    rankingWeight: 0.95,
    surfaces: { natal: 'derived', transit: 'supported', current_sky: 'unsupported', major_arc: 'supported', meaning: 'supported' },
    currentSkyPairing: false,
    currentSkyIngress: false,
    currentSkyConfiguration: false,
    rationale: 'Primary personal angle already supported.',
  },
  {
    key: 'midheaven',
    label: 'Midheaven',
    aliases: ['mc', 'midheaven'],
    category: 'angle',
    supportLevel: 'supporting',
    rankingWeight: 0.95,
    surfaces: { natal: 'derived', transit: 'supported', current_sky: 'unsupported', major_arc: 'supported', meaning: 'supported' },
    currentSkyPairing: false,
    currentSkyIngress: false,
    currentSkyConfiguration: false,
    rationale: 'Primary public angle already supported.',
  },
  {
    key: 'descendant',
    label: 'Descendant',
    aliases: ['dsc', 'descendant'],
    category: 'angle',
    supportLevel: 'minor',
    rankingWeight: 0.88,
    surfaces: { natal: 'derived', transit: 'supported', current_sky: 'unsupported', major_arc: 'unsupported', meaning: 'supported' },
    currentSkyPairing: false,
    currentSkyIngress: false,
    currentSkyConfiguration: false,
    rationale: 'Expanded angle support via derived axis math only, with lower default rank than the core angles.',
  },
  {
    key: 'imum-coeli',
    label: 'IC',
    aliases: ['ic', 'imumcoeli', 'imum-coeli'],
    category: 'angle',
    supportLevel: 'minor',
    rankingWeight: 0.88,
    surfaces: { natal: 'derived', transit: 'supported', current_sky: 'unsupported', major_arc: 'unsupported', meaning: 'supported' },
    currentSkyPairing: false,
    currentSkyIngress: false,
    currentSkyConfiguration: false,
    rationale: 'Expanded angle support via derived axis math only, with lower default rank than the core angles.',
  },
  {
    key: 'part-of-fortune',
    label: 'Part of Fortune',
    aliases: ['part of fortune', 'part-of-fortune', 'fortune'],
    category: 'lot',
    supportLevel: 'fenced',
    rankingWeight: 0.55,
    surfaces: { natal: 'unsupported', transit: 'unsupported', current_sky: 'unsupported', major_arc: 'unsupported', meaning: 'supported' },
    currentSkyPairing: false,
    currentSkyIngress: false,
    currentSkyConfiguration: false,
    rationale: 'Meaning hook exists, but the repo does not yet calculate this point conservatively enough for v1 engine use.',
  },
  {
    key: 'ceres',
    label: 'Ceres',
    aliases: ['ceres'],
    category: 'asteroid',
    supportLevel: 'fenced',
    rankingWeight: 0.5,
    surfaces: { natal: 'unsupported', transit: 'unsupported', current_sky: 'unsupported', major_arc: 'unsupported', meaning: 'unsupported' },
    currentSkyPairing: false,
    currentSkyIngress: false,
    currentSkyConfiguration: false,
    rationale: 'Swiss Ephemeris can calculate it, but SOS v1 intentionally fences major asteroids until product signal and ranking guardrails are proven.',
  },
  {
    key: 'pallas',
    label: 'Pallas',
    aliases: ['pallas'],
    category: 'asteroid',
    supportLevel: 'fenced',
    rankingWeight: 0.5,
    surfaces: { natal: 'unsupported', transit: 'unsupported', current_sky: 'unsupported', major_arc: 'unsupported', meaning: 'unsupported' },
    currentSkyPairing: false,
    currentSkyIngress: false,
    currentSkyConfiguration: false,
    rationale: 'Swiss Ephemeris can calculate it, but SOS v1 intentionally fences major asteroids until product signal and ranking guardrails are proven.',
  },
  {
    key: 'juno',
    label: 'Juno',
    aliases: ['juno'],
    category: 'asteroid',
    supportLevel: 'fenced',
    rankingWeight: 0.5,
    surfaces: { natal: 'unsupported', transit: 'unsupported', current_sky: 'unsupported', major_arc: 'unsupported', meaning: 'unsupported' },
    currentSkyPairing: false,
    currentSkyIngress: false,
    currentSkyConfiguration: false,
    rationale: 'Swiss Ephemeris can calculate it, but SOS v1 intentionally fences major asteroids until product signal and ranking guardrails are proven.',
  },
  {
    key: 'vesta',
    label: 'Vesta',
    aliases: ['vesta'],
    category: 'asteroid',
    supportLevel: 'fenced',
    rankingWeight: 0.5,
    surfaces: { natal: 'unsupported', transit: 'unsupported', current_sky: 'unsupported', major_arc: 'unsupported', meaning: 'unsupported' },
    currentSkyPairing: false,
    currentSkyIngress: false,
    currentSkyConfiguration: false,
    rationale: 'Swiss Ephemeris can calculate it, but SOS v1 intentionally fences major asteroids until product signal and ranking guardrails are proven.',
  },
];

const INVENTORY = new Map<string, AstrologyObjectInventoryEntry>();
for (const entry of OBJECTS) {
  INVENTORY.set(entry.key, entry);
  INVENTORY.set(entry.label.toLowerCase(), entry);
  for (const alias of entry.aliases) {
    INVENTORY.set(alias.toLowerCase(), entry);
  }
}

function normalizeObjectLookup(input: string | null | undefined) {
  return input?.trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, ' ') ?? null;
}

export function getSupportedAstrologyObjectInventory() {
  return OBJECTS;
}

export function getAstrologyObject(input: string | null | undefined) {
  const normalized = normalizeObjectLookup(input);
  if (!normalized) return null;
  return INVENTORY.get(normalized) ?? INVENTORY.get(normalized.replace(/ /g, '-')) ?? null;
}

export function getAstrologyObjectReceiptSummary(input: string | null | undefined, surface: AstrologyObjectSurface): AstrologyObjectReceiptSummary | null {
  const entry = getAstrologyObject(input);
  if (!entry) return null;
  return {
    key: entry.key,
    label: entry.label,
    category: entry.category,
    supportLevel: entry.supportLevel,
    rankingWeight: entry.rankingWeight,
    status: entry.surfaces[surface],
  };
}

export function getAstrologyObjectRankingWeight(input: string | null | undefined) {
  return getAstrologyObject(input)?.rankingWeight ?? 0.7;
}

export function supportsAstrologySurface(input: string | null | undefined, surface: AstrologyObjectSurface) {
  const entry = getAstrologyObject(input);
  if (!entry) return false;
  return entry.surfaces[surface] !== 'unsupported';
}

export function supportsCurrentSkyPairing(input: string | null | undefined) {
  return getAstrologyObject(input)?.currentSkyPairing ?? false;
}

export function supportsCurrentSkyIngress(input: string | null | undefined) {
  return getAstrologyObject(input)?.currentSkyIngress ?? false;
}

export function supportsCurrentSkyConfiguration(input: string | null | undefined) {
  return getAstrologyObject(input)?.currentSkyConfiguration ?? false;
}

export function getFencedAstrologyObjects() {
  return OBJECTS.filter((entry) => entry.supportLevel === 'fenced');
}
