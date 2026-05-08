import type {
  NatalProjection,
  NatalProjectionDignity,
  NatalProjectionReceptionStatus,
  NatalProjectionSect,
  NatalProjectionSectCondition,
} from '@/lib/astrology/natal-projection';
import type { AstrologyMeaningFactors } from '@/lib/astrology/meaning-kernel';
import type {
  AstrologyObjectCategory,
  AstrologyObjectReceiptSummary,
} from '@/lib/astrology/object-inventory';
import type {
  MacroConfigurationReceipt,
  MacroLandscapeReceipt,
} from '@/lib/astrology/macrocosm-types';

export type JudgmentTier = 'foreground' | 'supporting' | 'background' | 'noise';
export type JudgmentSource = 'major_arc' | 'daily_transit' | 'guidance' | 'memory';
export type JudgmentScope = 'personal' | 'collective' | 'both';
export type JudgmentPhase = 'applying' | 'exact' | 'separating';
export type CollectiveSkyEventKind = 'transit_aspect' | 'station_proximity' | 'sign_ingress_proximity' | 'lunation' | 'eclipse' | 'sign_cluster' | 'major_aspect_pattern';
export type JudgmentDemandType =
  | 'pressure'
  | 'expansion'
  | 'clarification'
  | 'restructuring'
  | 'destabilization'
  | 'support';

export type ArcLifecycleDurationClass = 'event' | 'short' | 'medium' | 'long' | 'structural' | 'generational';
export type ArcLifecycleDemand = 'prepare' | 'respond' | 'integrate';

export interface ArcLifecyclePassFact {
  passNumber: number;
  hitDate: string;
  kind: 'exact' | 'closest';
  orb: number;
  direction: 'direct' | 'retrograde' | 'unknown';
  status: 'past' | 'current' | 'upcoming';
  daysFromNow: number;
}

export interface ArcLifecycleMemoryLinkage {
  matchedSignalCount: number;
  repeatedLifeAreaSignalCount: number;
  mostRecentSignalDate: string | null;
  matchedDomains: string[];
  excerpts: string[];
  confidence: 'high' | 'medium' | 'low' | 'none';
}

export interface ArcLifecycleNatalSummary {
  targetLabel: string;
  targetType: 'planet' | 'angle';
  targetSign: string | null;
  targetDegree: number | null;
  targetHouse: number | null;
  houseLabel: string;
  axisLabel: string | null;
  angularity: NatalProjection['angularity'];
  targetIsAngle: boolean;
  targetIsModernChartRuler: boolean;
  targetIsTraditionalChartRuler: boolean;
  dignity: NatalProjection['dignity'];
  natalAspects: NatalProjection['natalAspects'];
}

export interface ArcLifecycleJudgment {
  durationDays: number;
  daysActive: number;
  daysRemaining: number;
  percentComplete: number | null;
  durationClass: ArcLifecycleDurationClass;
  totalPasses: number;
  currentPass: number | null;
  exactHitCount: number;
  passSequence: ArcLifecyclePassFact[];
  stationMarkers: Array<{
    date: string;
    kind: 'retrograde' | 'direct';
    degree: number;
    sign: string;
    daysFromNow: number;
    status: 'past' | 'upcoming';
  }>;
  currentOrb: number;
  phaseLabel: string;
  phaseDemand: ArcLifecycleDemand;
  natalSummary: ArcLifecycleNatalSummary;
  memoryLinkage: ArcLifecycleMemoryLinkage;
  watchNextDate: string | null;
  watchNextType: 'exact_hit' | 'station' | 'arc_close' | null;
  limitations: string[];
}

export interface AstrologyCollectiveBridgeFact {
  id: string;
  kind: CollectiveSkyEventKind;
  bodies: string[];
  aspect: string | null;
  tier: JudgmentTier;
  score: number;
}

export interface AstrologyCollectiveBridge {
  collectiveEvent: AstrologyCollectiveBridgeFact;
  matchReasons: string[];
  bridgeStrengthScore: number;
  bridgeStrengthTier: 'foreground' | 'supporting' | 'background';
  promoteScopeToBoth: boolean;
  limitations: string[];
}

export interface AstrologyMacroPersonalBridge {
  configurationId: string;
  bridgeStrengthScore: number;
  bridgeStrengthTier: 'foreground' | 'supporting' | 'background';
  natalTargets: Array<{
    targetLabel: string;
    targetType: 'planet' | 'angle' | 'house_ruler' | 'house_axis';
    reason: string;
  }>;
  activationArea: string[];
  memoryLinks: {
    matchedSignalCount: number;
    matchedThemes: string[];
    excerpts: string[];
  };
  manifestationClass: 'loud' | 'structural' | 'subtle' | 'delayed' | 'internal';
  decisionPressure: 'immediate' | 'active' | 'building' | 'background';
  limitations: string[];
}

export interface AstrologyJudgmentReceptionFact {
  system: 'modern' | 'traditional';
  status: NatalProjectionReceptionStatus;
  direction: 'transit_to_natal' | 'natal_to_transit' | 'both' | 'neither' | 'unknown';
  transitPlanet: string;
  natalTargetLabel: string;
  transitSign: string | null;
  natalSign: string | null;
  transitInNatalRulership: boolean;
  natalInTransitRulership: boolean;
  limitations: string[];
}

export interface AstrologyJudgmentSectFact {
  chartSect: NatalProjectionSect['chartSect'];
  basis: NatalProjectionSect['basis'];
  sunHouse: number | null;
  transitPlanetCondition: NatalProjectionSectCondition;
  natalTargetCondition: NatalProjectionSectCondition;
  limitations: string[];
}

export interface AstrologyJudgmentReceipt {
  arcKey?: string;
  transitPlanet: string;
  transitObject?: AstrologyObjectReceiptSummary | null;
  aspect: string;
  natalTarget: string;
  natalTargetObject?: AstrologyObjectReceiptSummary | null;
  targetLabel: string;
  orb: number;
  phase: JudgmentPhase;
  transitSign: string | null;
  transitDegree: number | null;
  transitDignity?: NatalProjectionDignity | null;
  natalSign: string | null;
  natalHouse: number | null;
  lifeArea: string;
  exactDate: string | null;
  peakDate: string | null;
  startDate: string | null;
  endDate: string | null;
  passCount: number | null;
  currentPass: number | null;
  stations: Array<{
    date: string;
    kind: 'retrograde' | 'direct';
    degree: number;
    sign: string;
  }>;
  memorySummary: string | null;
  natalProjection: NatalProjection | null;
  reception?: AstrologyJudgmentReceptionFact[] | null;
  sect?: AstrologyJudgmentSectFact | null;
  meaningFactors?: AstrologyMeaningFactors | null;
  collectiveBridge?: AstrologyCollectiveBridge | null;
  macroBridge?: AstrologyMacroPersonalBridge | null;
  currentSkyRarity?: CollectiveSkyHistoricalRarityFact | null;
  arcLifecycle?: ArcLifecycleJudgment | null;
}

export interface AstrologyJudgmentSignal {
  id: string;
  tier: JudgmentTier;
  scope: JudgmentScope;
  source: JudgmentSource;
  title: string;
  summary: string;
  lifeAreas: string[];
  demand: JudgmentDemandType;
  score: number;
  receipts: AstrologyJudgmentReceipt[];
  collectiveBridge?: AstrologyCollectiveBridge | null;
  macroBridge?: AstrologyMacroPersonalBridge | null;
  supportNotes: string[];
}

export interface AstrologyJudgmentTiming {
  currentPhase: JudgmentPhase | null;
  exactDate: string | null;
  peakWindowStart: string | null;
  peakWindowEnd: string | null;
  nextWatchDate: string | null;
  activeTransitCount: number;
}

export interface CollectiveSkyBodyState {
  body: string;
  sign: string;
  degree: number;
  longitude: number;
  speed: number;
  retrograde: boolean;
}

export interface CollectiveSkyHistoricalRecurrence {
  comparator:
    | 'same_lunation_type'
    | 'same_eclipse_type'
    | 'same_body_sign_ingress_spacing_estimate'
    | 'same_body_station_window_spacing_estimate'
    | 'same_outer_planet_aspect_window';
  scanWindowDays: number;
  priorComparableEventDate: string;
  nextComparableEventDate?: string | null;
  spacingDays: number;
  spacingYears: number;
}

export interface CollectiveSkyHistoricalRarityFact {
  score: number;
  basis: 'heuristic';
  status: 'computed' | 'not_computed';
  confidence: 'bounded' | 'none';
  assessment: 'computed_recurrence' | 'bounded_limited' | 'heuristic_only' | 'unsupported';
  method: 'historical_scan' | 'bidirectional_scan' | 'spacing_estimate' | 'local_station_window' | 'none';
  searchWindowDays: number | null;
  comparisonCriteria: string[];
  recurrence: CollectiveSkyHistoricalRecurrence | null;
  limitations: string[];
  historicalGapYears: number | null;
}

export interface CollectiveSkyConsequenceFact {
  score: number;
  basis: 'heuristic';
  limitations: string[];
  historicalGapYears: number | null;
}

export interface AstrologyCollectiveSkyEvent {
  id: string;
  kind: CollectiveSkyEventKind;
  tier: JudgmentTier;
  score: number;
  scope: 'collective';
  bodies: string[];
  aspect: string | null;
  orb: number | null;
  phase: JudgmentPhase | null;
  applyingStateKnown: boolean;
  sign: string | null;
  exactnessBand: 'exact' | 'near_exact' | 'wide' | null;
  rarity: CollectiveSkyHistoricalRarityFact;
  consequence: CollectiveSkyConsequenceFact;
  summary: string;
  receipts: string[];
  limitations: string[];
}

export interface AstrologyJudgmentCurrentSky {
  status: 'collective-scan-v1';
  summary: string;
  scannedBodies: string[];
  events: AstrologyCollectiveSkyEvent[];
  macroConfigurations?: MacroConfigurationReceipt[];
  limitations: string[];
}

export interface AstrologyJudgmentObjectInventorySummary {
  status: 'expanded-object-inventory-v1';
  transitLabels: string[];
  targetLabels: string[];
  categoryCounts: Partial<Record<AstrologyObjectCategory, number>>;
  fencedLabels: string[];
}

export interface AstrologyJudgmentMacrocosm {
  status: 'macrocosm-engine-v1';
  configurations: MacroConfigurationReceipt[];
  landscapeTopics: MacroLandscapeReceipt[];
  limitations: string[];
}

export interface AstrologyJudgment {
  date: string;
  foreground: AstrologyJudgmentSignal[];
  supporting: AstrologyJudgmentSignal[];
  background: AstrologyJudgmentSignal[];
  noise: AstrologyJudgmentSignal[];
  mainStory: string;
  practicalDemand: string;
  timing: AstrologyJudgmentTiming;
  activatedLifeAreas: string[];
  currentSky: AstrologyJudgmentCurrentSky;
  macrocosm?: AstrologyJudgmentMacrocosm | null;
  objectInventory: AstrologyJudgmentObjectInventorySummary;
  receipts: AstrologyJudgmentReceipt[];
}
