export type MacroLandscapeStatus = 'saturated' | 'emerging' | 'under_discussed' | 'niche' | 'unknown';

export type SeededMacroTopicKey =
  | 'uranus-in-gemini'
  | 'uranus-square-nodes'
  | 'saturn-neptune-aries'
  | 'pluto-in-aquarius';

export interface MacroLandscapeReceipt {
  status: 'macro-landscape-v1';
  topicKey: string;
  statusLabel: MacroLandscapeStatus;
  sourceMapVersion: string;
  scanVersion: string;
  consensusSummary: string;
  saturatedClaims: string[];
  openQuestions: string[];
  underStudiedAngles: string[];
  limitations: string[];
}

export type MacroConfigurationKind =
  | 'outer_planet_sign_ingress'
  | 'outer_planet_aspect_family'
  | 'nodal_entanglement'
  | 'station_stack'
  | 'lunation_slow_planet_trigger'
  | 'multi_event_cluster';

export interface MacroConfigurationRarityFact {
  status: 'computed' | 'not_computed';
  confidence: 'bounded' | 'none';
  assessment: 'computed_recurrence' | 'bounded_limited' | 'heuristic_only' | 'unsupported';
  comparator:
    | 'same_configuration_family'
    | 'same_outer_planet_sign_ingress'
    | 'same_outer_planet_aspect_cluster'
    | 'same_nodal_trigger_family'
    | 'same_station_stack_family'
    | 'none';
  historicalGapYears: number | null;
  recurrenceWindow: {
    priorComparableDate: string | null;
    nextComparableDate: string | null;
    scanWindowDays: number | null;
  };
  limitations: string[];
}

export interface MacroConfigurationReceipt {
  id: string;
  status: 'macro-configuration-v1';
  kind: MacroConfigurationKind;
  title: string;
  summary: string;
  eventIds: string[];
  bodies: string[];
  signs: string[];
  timeWindow: {
    startDate: string | null;
    peakDate: string | null;
    endDate: string | null;
  };
  interpretiveFamily: string;
  landscape: MacroLandscapeReceipt | null;
  rarity: MacroConfigurationRarityFact;
  consequence: {
    score: number;
    basis: 'heuristic';
    limitations: string[];
  };
  receipts: string[];
  limitations: string[];
}
