import type { Aspect, Transit } from '@/lib/astrology/domain-types';

const ASPECT_MEANING: Record<Aspect, string> = {
  conjunction: 'The signal is concentrated and hard to ignore. It tends to feel like the life area is taking over the room until you deal with it directly.',
  opposition: 'The signal shows up through contrast: you versus them, private need versus public demand, desire versus reality. It asks for a cleaner relationship between two poles.',
  square: 'The signal creates friction on purpose. It usually feels inconvenient because it is exposing the part of the pattern that cannot keep running on autopilot.',
  trine: 'The signal moves with less resistance. That does not mean nothing is happening — it means the opening is easier to miss if you wait for drama.',
  sextile: 'The signal is available but not forceful. It rewards a small deliberate move more than a giant overhaul.',
};

const PLANET_FEEL: Record<string, string> = {
  Sun: 'identity, visibility, vitality, and the question of where you are putting your life force',
  Moon: 'mood, body memory, instinct, needs, and the private weather underneath the day',
  Mercury: 'thoughts, conversations, decisions, messages, and what your mind keeps circling',
  Venus: 'attachment, pleasure, money, worth, taste, and the way you let yourself receive',
  Mars: 'drive, irritation, courage, conflict, boundaries, and the part of you that wants movement now',
  Jupiter: 'growth, appetite, confidence, opportunity, and the places you may overextend',
  Saturn: 'pressure, limits, responsibility, reality checks, and the structure that has to become more honest',
  Uranus: 'disruption, liberation, restlessness, and the part of life that will not stay managed',
  Neptune: 'sensitivity, longing, fog, imagination, and the places where the truth needs better edges',
  Pluto: 'power, compulsion, endings, deep fear, and the pattern that wants to be transformed rather than decorated',
  'North Node': 'direction, unfamiliar growth, and the choice that pulls you out of the old loop',
};

const NATAL_FEEL: Record<string, string> = {
  sun: 'identity and selfhood',
  moon: 'emotional needs and body memory',
  mercury: 'mind, speech, and decision-making',
  venus: 'love, money, worth, and receiving',
  mars: 'anger, desire, energy, and boundaries',
  jupiter: 'growth, faith, appetite, and risk',
  saturn: 'discipline, fear, limits, and responsibility',
  uranus: 'freedom, disruption, and individuation',
  neptune: 'longing, sensitivity, dreams, and porousness',
  pluto: 'power, survival patterns, control, and deep change',
  ascendant: 'identity, body, first impression, and how life meets you',
  midheaven: 'public direction, work, reputation, and visibility',
};

export function formatNatalPoint(key: string) {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function transitKey(t: Transit) {
  return `${t.transitPlanet}:${t.aspect}:${t.natalPlanet}`;
}

const TRANSIT_PALETTE = [
  '#EF4488',
  '#C9A27A',
  '#F4EFE8',
  '#D9A06F',
  '#B86B8B',
  '#E7C48F',
  '#A987C9',
  '#E87474',
  '#9FC2B0',
  '#D7A7C8',
];

export function transitColor(input: Transit | string) {
  const key = typeof input === 'string' ? input : transitKey(input);
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return TRANSIT_PALETTE[hash % TRANSIT_PALETTE.length];
}

export function transitTitle(t: Transit) {
  return `${t.transitPlanet} ${t.aspect} ${formatNatalPoint(t.natalPlanet)}`;
}

export function buildTransitReading(t: Transit) {
  const planet = PLANET_FEEL[t.transitPlanet] ?? 'a live part of today’s sky';
  const natal = NATAL_FEEL[t.natalPlanet] ?? formatNatalPoint(t.natalPlanet);
  const aspect = ASPECT_MEANING[t.aspect];
  return `${aspect} ${t.transitPlanet} brings up ${planet}; your natal ${formatNatalPoint(t.natalPlanet)} describes ${natal}. With a ${t.orb}° orb, this is ${t.orb <= 1 ? 'very close and worth treating as active now' : t.orb <= 3 ? 'active enough to shape the day' : 'background-level, but still part of the field'}.`;
}

export function buildTransitFeel(t: Transit) {
  switch (t.aspect) {
    case 'square':
      return 'It may feel like irritation, urgency, pressure, or the same issue arriving through a different costume.';
    case 'opposition':
      return 'It may feel relational: projection, push-pull, comparison, or needing a mirror before the real issue becomes clear.';
    case 'conjunction':
      return 'It may feel loud, immediate, embodied, or unusually hard to compartmentalize.';
    case 'trine':
      return 'It may feel smoother than expected — an opening, an easier conversation, or a capacity you can use without forcing.';
    case 'sextile':
      return 'It may feel subtle: a useful invitation, a well-timed message, or a small door that only opens if you move toward it.';
  }
}

export function buildOrbTimeframe(orb: number, trend?: 'building' | 'easing' | 'steady') {
  const closeness = orb <= 1 ? 'Peak window' : orb <= 3 ? 'Active window' : 'Outer window';
  const movement = trend === 'building'
    ? 'The contact is building inside the visible window.'
    : trend === 'easing'
      ? 'The contact is easing inside the visible window.'
      : 'The contact is present in the visible window.';
  return `${closeness}: strongest near exact contact at 0°. ${movement}`;
}
