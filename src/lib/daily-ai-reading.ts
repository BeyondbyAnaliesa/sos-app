import crypto from 'crypto';
import OpenAI from 'openai';
import { calculateTransitsForDate } from '@/lib/astrology/calculate-transits';
import { createAdminClient } from '@/lib/supabase/server';
import type { MajorTransitArc } from '@/lib/astrology/major-transits';
import type { DailyTransits } from '@/lib/astrology/domain-types';
import type { NatalChart } from '@/lib/astrology/types';
import { buildAstrologyJudgment } from '@/lib/astrology/judgment';
import type { AstrologyJudgment } from '@/lib/astrology/judgment-types';
import { buildAstrologyJudgmentPromptSnapshot } from '@/lib/astrology/judgment-prompt-snapshot';
import type { GuidanceResult } from '@/lib/interpret';
import type { MajorWaveMemoryInput } from '@/lib/major-transit-reading';
import { transitTitle } from '@/lib/transit-copy';
import { logError, logWarn } from '@/lib/logger';

export const DAILY_AI_READING_PROMPT_VERSION = 'daily-full-memory-v5';
export const DAILY_AI_READING_MODEL = 'gpt-4o';

export type DailyAiReading = {
  headline: string;
  signal: string;
  whyPersonal: string;
  watch: string;
  doToday: string;
  askAeon: string;
  memoryNote?: string;
};

type CacheRow = {
  reading_json: DailyAiReading;
  memory_hash: string;
};

type CacheStatusRow = {
  reading_date: string;
  memory_hash: string;
  prompt_version: string;
  generated_at: string;
};

export type DailyAiReadingCacheStatus = {
  date: string;
  expectedHash: string;
  priorReadingCount: number;
  exactMatch: boolean;
  latest: {
    readingDate: string;
    memoryHash: string;
    promptVersion: string;
    generatedAt: string;
  } | null;
};

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function compactText(value: unknown, max = 900) {
  if (value == null) return '';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.replace(/\s+/g, ' ').trim().slice(0, max);
}

function stableHash(input: unknown) {
  return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex').slice(0, 24);
}

function sanitizeReading(reading: Partial<DailyAiReading>, fallbackDate: string): DailyAiReading {
  return {
    headline: compactText(reading.headline, 150) || `Your SOS reading for ${fallbackDate}`,
    signal: compactText(reading.signal, 850),
    whyPersonal: compactText(reading.whyPersonal, 850),
    watch: compactText(reading.watch, 650),
    doToday: compactText(reading.doToday, 650),
    askAeon: compactText(reading.askAeon, 180) || 'What should I do with today’s signal?',
    memoryNote: compactText(reading.memoryNote, 320),
  };
}

function buildHashJudgmentSnapshot(judgment: AstrologyJudgment) {
  return buildAstrologyJudgmentPromptSnapshot(judgment);
}

function resolveJudgment(params: {
  date: string;
  chart: NatalChart;
  todayTransits: DailyTransits;
  majorArcs: MajorTransitArc[];
  guidance: GuidanceResult[];
  memory: MajorWaveMemoryInput;
  judgment?: AstrologyJudgment;
}) {
  return params.judgment ?? buildAstrologyJudgment({
    date: params.date,
    chart: params.chart,
    todayTransits: params.todayTransits,
    majorArcs: params.majorArcs,
    guidance: params.guidance,
    memory: params.memory,
  });
}

export function buildDailyAiReadingMemoryHash(params: {
  date: string;
  chart: NatalChart;
  todayTransits: DailyTransits;
  majorArcs: MajorTransitArc[];
  guidance: GuidanceResult[];
  memory: MajorWaveMemoryInput;
  judgment?: AstrologyJudgment;
}) {
  const stableTransitSnapshot = calculateTransitsForDate(new Date(`${params.date}T12:00:00Z`), params.chart);
  const judgment = params.judgment ?? buildAstrologyJudgment({
    date: params.date,
    chart: params.chart,
    todayTransits: stableTransitSnapshot,
    majorArcs: params.majorArcs,
    guidance: params.guidance,
    memory: params.memory,
  });

  return stableHash({
    prompt: DAILY_AI_READING_PROMPT_VERSION,
    date: params.date,
    chartCore: {
      placements: params.chart.placements.map((p) => [p.key, p.sign, p.degree]),
      asc: params.chart.angles.ascendant,
      mc: params.chart.angles.midheaven,
    },
    todayTransits: stableTransitSnapshot.transits.slice(0, 16),
    judgment: buildHashJudgmentSnapshot(judgment),
    reportThemes: params.memory.report?.themes ?? [],
    reportReading: compactText(params.memory.report?.chartReading, 600),
    natalReading: compactText(params.memory.natalReading, 800),
    lifeSignals: (params.memory.lifeSignals ?? []).slice(0, 12).map((signal) => ({
      text: compactText(signal.content_text, 260),
      themes: signal.themes_json?.slice(0, 5) ?? [],
      emotions: signal.emotions_json?.slice(0, 5) ?? [],
      domain: signal.life_domain ?? null,
    })),
  });
}

function buildPrompt(params: {
  date: string;
  chart: NatalChart;
  todayTransits: DailyTransits;
  lookAheadTransits: DailyTransits[];
  majorArcs: MajorTransitArc[];
  guidance: GuidanceResult[];
  memory: MajorWaveMemoryInput;
  judgment: AstrologyJudgment;
}) {
  const placements = params.chart.placements
    .map((p) => `${p.label}: ${p.sign} ${p.degree}°${p.minute}′${p.retrograde ? ' Rx' : ''}`)
    .join('\n');

  const majorArcPayload = params.majorArcs.slice(0, 8).map((arc) => ({
    title: transitTitle(arc.transit),
    lifecycle: { start: arc.startDate, end: arc.endDate, phase: arc.phase, peak: arc.peakDate, exactHits: arc.exactHits, stations: arc.stations },
    natalContext: arc.context,
  }));

  const lifeSignals = (params.memory.lifeSignals ?? []).slice(0, 12).map((signal) => ({
    text: compactText(signal.content_text, 500),
    themes: signal.themes_json?.slice(0, 4) ?? [],
    emotions: signal.emotions_json?.slice(0, 4) ?? [],
    lifeDomain: signal.life_domain ?? null,
  }));

  const system = `You are SOS, a serious personal daily astrology intelligence layer. Write one premium daily reading.

Rules:
- The structured judgment object is the source of truth. Use it first, then use the supporting payload only to clarify receipts.
- Lead with the most specific astrology fact in the judgment: exact transit/lunation/configuration, phase, house/life area, timing, or chart-ruler/rulership fact. Do not bury the sky under generic advice.
- Treat major personal transit waves as the main signal. Treat daily sky contacts as triggers and weather.
- Use the user's saved memory when present: onboarding report, natal reading, journal/Aeon life signals, recurring patterns.
- Do not invent life facts. If memory is thin, say that briefly and explain how SOS will sharpen.
- Be specific, adult, useful, and direct. No poetic language, vague spiritual theater, fortune-cookie copy, or "the stars are aligning" language.
- Hard copy bans: no "align with your purpose", "embrace transformation", "unlock potential", "inner peace", "spiritual growth", "authentic self", "higher purpose", "destiny calls", or vague "opportunity for growth" phrasing.
- Headlines must be concrete, not soft title-case abstractions. Prefer the actual life area/action over words like potential, alignment, journey, harmony, foundations, transformation, or growth.
- doToday must be one or two practical actions an adult can do today: ask, check, write, schedule, wait, clarify, decline, renegotiate, repair, rest, pay, call, document.
- Avoid em dashes.
- Do not mention internal table names, prompts, hashes, or implementation.
- If the judgment says current-sky coverage is partial, do not pretend a full collective rarity scan exists.

Return only valid JSON:
{
  "headline": "short sharp title",
  "signal": "today's real signal, 2-4 sentences",
  "whyPersonal": "why this is personal to this user, 2-4 sentences",
  "watch": "what to watch today, concrete",
  "doToday": "what to do today, concrete",
  "askAeon": "one vulnerable/personal question to ask Aeon",
  "memoryNote": "brief note on what saved memory shaped this, or that memory is still thin"
}`;

  const judgmentSnapshot = buildAstrologyJudgmentPromptSnapshot(params.judgment);

  const user = `Date: ${params.date}\n\n--- STRUCTURED JUDGMENT (SOURCE OF TRUTH) ---\n${JSON.stringify(judgmentSnapshot, null, 2)}\n\n--- NATAL CHART ---\n${placements}\nAscendant: ${params.chart.angles.ascendant.sign} ${params.chart.angles.ascendant.degree}°${params.chart.angles.ascendant.minute}′\nMidheaven: ${params.chart.angles.midheaven.sign} ${params.chart.angles.midheaven.degree}°${params.chart.angles.midheaven.minute}′\n\n--- MAJOR PERSONAL TRANSIT WAVES ---\n${JSON.stringify(majorArcPayload, null, 2)}\n\n--- DAILY SKY WEATHER ---\n${JSON.stringify(params.todayTransits.transits.slice(0, 16), null, 2)}\n\n--- NEXT 7 DAYS ---\n${JSON.stringify(params.lookAheadTransits.map((d) => ({ date: d.date, transits: d.transits.slice(0, 5) })), null, 2)}\n\n--- CURRENT DETERMINISTIC GUIDANCE CANDIDATES ---\n${JSON.stringify(params.guidance.slice(0, 6), null, 2)}\n\n--- ONBOARDING / FIRST REPORT MEMORY ---\nThemes: ${(params.memory.report?.themes ?? []).join(' | ') || 'none saved'}\nChart reading: ${compactText(params.memory.report?.chartReading, 1400) || 'none saved'}\nLook ahead: ${compactText(params.memory.report?.lookAhead, 700) || 'none saved'}\n\n--- PRIOR NATAL / READING MEMORY ---\n${compactText(params.memory.natalReading, 1500) || 'none saved'}\n\n--- RECENT LIFE SIGNALS FROM JOURNAL / AEON MEMORY ---\n${JSON.stringify(lifeSignals, null, 2)}`;

  return { system, user };
}

async function fetchCached(userId: string, date: string, hash: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('daily_ai_readings')
    .select('reading_json,memory_hash')
    .eq('user_id', userId)
    .eq('reading_date', date)
    .eq('memory_hash', hash)
    .maybeSingle();

  if (error) throw error;
  return (data as CacheRow | null)?.reading_json ?? null;
}

async function fetchPriorReadings(userId: string, date: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('daily_ai_readings')
    .select('reading_json,reading_date')
    .eq('user_id', userId)
    .lt('reading_date', date)
    .order('reading_date', { ascending: false })
    .limit(5);

  if (error) throw error;
  return (data ?? []).map((row) => compactText(row.reading_json, 900));
}

export async function getDailyAiReadingCacheStatus(params: {
  userId: string;
  date: string;
  chart: NatalChart;
  todayTransits: DailyTransits;
  majorArcs: MajorTransitArc[];
  guidance: GuidanceResult[];
  memory: MajorWaveMemoryInput;
  judgment?: AstrologyJudgment;
}) : Promise<DailyAiReadingCacheStatus> {
  const priorReadings = await fetchPriorReadings(params.userId, params.date).catch(() => []);
  const memory = { ...params.memory, priorReadings };
  const expectedHash = buildDailyAiReadingMemoryHash({ ...params, memory });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('daily_ai_readings')
    .select('reading_date,memory_hash,prompt_version,generated_at')
    .eq('user_id', params.userId)
    .eq('reading_date', params.date)
    .order('generated_at', { ascending: false })
    .limit(5);

  if (error) throw error;

  const rows = (data ?? []) as CacheStatusRow[];
  const latest = rows[0]
    ? {
        readingDate: rows[0].reading_date,
        memoryHash: rows[0].memory_hash,
        promptVersion: rows[0].prompt_version,
        generatedAt: rows[0].generated_at,
      }
    : null;

  return {
    date: params.date,
    expectedHash,
    priorReadingCount: priorReadings.length,
    exactMatch: rows.some((row) => row.memory_hash === expectedHash),
    latest,
  };
}

async function saveReading(userId: string, date: string, hash: string, reading: DailyAiReading) {
  const admin = createAdminClient();
  const { error } = await admin.from('daily_ai_readings').upsert({
    user_id: userId,
    reading_date: date,
    memory_hash: hash,
    reading_json: reading,
    prompt_version: DAILY_AI_READING_PROMPT_VERSION,
    model: DAILY_AI_READING_MODEL,
    generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,reading_date,memory_hash' });

  if (error) throw error;
}

async function generateReading(params: {
  date: string;
  chart: NatalChart;
  todayTransits: DailyTransits;
  lookAheadTransits: DailyTransits[];
  majorArcs: MajorTransitArc[];
  guidance: GuidanceResult[];
  memory: MajorWaveMemoryInput;
  judgment: AstrologyJudgment;
}) {
  const { system, user } = buildPrompt(params);
  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: DAILY_AI_READING_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  const raw = completion.choices[0]?.message.content ?? '{}';
  return sanitizeReading(JSON.parse(raw) as Partial<DailyAiReading>, params.date);
}

export async function getOrCreateDailyAiReading(params: {
  userId: string;
  date: string;
  chart: NatalChart;
  todayTransits: DailyTransits;
  lookAheadTransits: DailyTransits[];
  majorArcs: MajorTransitArc[];
  guidance: GuidanceResult[];
  memory: MajorWaveMemoryInput;
  judgment?: AstrologyJudgment;
}) {
  const judgment = resolveJudgment(params);
  const baseHash = buildDailyAiReadingMemoryHash({ ...params, judgment });

  try {
    const priorReadings = await fetchPriorReadings(params.userId, params.date).catch(() => []);
    const memory = { ...params.memory, priorReadings };
    const hash = buildDailyAiReadingMemoryHash({ ...params, memory, judgment });
    const cached = await fetchCached(params.userId, params.date, hash);
    if (cached) return cached;

    const generated = await generateReading({ ...params, memory, judgment });
    await saveReading(params.userId, params.date, hash, generated);
    return generated;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('daily_ai_readings') || message.includes('does not exist') || message.includes('schema cache')) {
      logWarn('daily_ai_reading_cache_unavailable_generating_uncached', { message });
      try {
        return await generateReading({ ...params, judgment });
      } catch (generationError) {
        logError(generationError, { route: 'daily-ai-reading', action: 'uncached-generation-fallback', baseHash });
        return null;
      }
    }

    logError(error, { route: 'daily-ai-reading', baseHash });
    return null;
  }
}
