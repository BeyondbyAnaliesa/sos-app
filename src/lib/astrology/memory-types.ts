import type { DailyTransits } from './domain-types';

export type TransitArcState = 'approaching' | 'exact' | 'separating' | 'dormant' | 'returning';
export type LifeSignalSource = 'journal' | 'event' | 'mood' | 'usage';
export type LifeSignalPrivacyClass = 'standard' | 'sensitive' | 'sealed';
export type LifeSignalStatus = 'open' | 'resolved' | 'archived';
export type LifeSignalKind = 'event' | 'thought' | 'feeling' | 'body' | 'mixed';

export interface TransitDailySnapshotRecord {
  id?: string;
  user_id: string;
  snapshot_date: string;
  transits_json: DailyTransits['transits'];
  active_count: number;
  hash?: string | null;
  source?: string | null;
  timezone?: string | null;
  computed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TransitArcRecord {
  id?: string;
  user_id: string;
  transit_planet: string;
  transit_sign?: string | null;
  natal_target: string;
  natal_sign?: string | null;
  aspect_type: string;
  aspect_nature?: string | null;
  first_active_date: string;
  exact_dates_json: string[];
  last_active_date?: string | null;
  state: TransitArcState;
  recurrence_count: number;
  peak_orb?: number | null;
  last_orb?: number | null;
  house_axis?: string | null;
  last_direction?: 'tightening' | 'widening' | 'unknown' | null;
  tightest_orb?: number | null;
  parent_arc_id?: string | null;
  themes_json: string[];
  tombstone_summary?: string | null;
  metadata_json: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface LifeSignalRecord {
  id?: string;
  user_id: string;
  source: LifeSignalSource;
  source_entry_id?: string | null;
  source_message_id?: string | null;
  source_index?: number | null;
  source_start?: number | null;
  source_end?: number | null;
  signal_timestamp?: string;
  content_text?: string | null;
  content_json?: Record<string, unknown> | null;
  signal_kind: LifeSignalKind;
  themes_json: string[];
  entities_json: string[];
  emotions_json: string[];
  life_domain?: string | null;
  privacy_class: LifeSignalPrivacyClass;
  status: LifeSignalStatus;
  active_transits_json: DailyTransits['transits'];
  metadata_json: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface ExtractedLifeSignal {
  text: string;
  sourceStart: number;
  sourceEnd: number;
  sourceIndex: number;
  signalKind: LifeSignalKind;
  themes: string[];
  emotions: string[];
  entities: string[];
  lifeDomain: string | null;
  confidence: number;
  matchedRuleCount: number;
  debug: {
    themeHits: string[];
    emotionHits: string[];
    domainHits: string[];
    kindHits: Array<'body' | 'feeling' | 'thought' | 'event'>;
  };
}

export interface LifeSignalTransitTagRecord {
  id?: string;
  life_signal_id: string;
  transit_arc_id: string;
  tag_source: 'auto' | 'manual';
  confidence?: number | null;
  created_at?: string;
}

export interface TransitArcEventRecord {
  id?: string;
  transit_arc_id: string;
  event_type: 'created' | 'exact_hit' | 'state_changed' | 'returned' | 'closed' | 'retagged' | 'repaired';
  event_date: string;
  payload_json: Record<string, unknown>;
  created_at?: string;
}

export interface MemorySyncRunRecord {
  id?: string;
  run_date: string;
  started_at?: string;
  completed_at?: string | null;
  status: 'running' | 'completed' | 'completed_with_errors' | 'failed';
  charts_total: number;
  charts_processed: number;
  snapshots_created: number;
  arcs_created_or_updated: number;
  errors_count: number;
  metrics_json: Record<string, unknown>;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}
