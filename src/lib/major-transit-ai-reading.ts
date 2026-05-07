import crypto from 'crypto';
import OpenAI from 'openai';
import { createAdminClient } from '@/lib/supabase/server';
import type { MajorTransitArc } from '@/lib/astrology/major-transits';
import type { NatalChart } from '@/lib/astrology/types';
import { buildArcFocusedJudgment } from '@/lib/astrology/judgment';
import type { AstrologyJudgment } from '@/lib/astrology/judgment-types';
import { buildAstrologyJudgmentPromptSnapshot } from '@/lib/astrology/judgment-prompt-snapshot';
import { buildTransitArcJudgment } from '@/lib/astrology/transit-arc-judgment';
import type { MajorWaveMemoryInput } from '@/lib/major-transit-reading';
import { transitTitle } from '@/lib/transit-copy';
import { logError, logWarn } from '@/lib/logger';

export const MAJOR_TRANSIT_READING_PROMPT_VERSION = 'major-wave-full-memory-v5';
export const MAJOR_TRANSIT_READING_MODEL = 'gpt-4o';

export type MajorTransitAiReading = {
  headline: string;
  wave: string;
  whyYou: string;
  feel: string;
  use: string;
  doNotForce: string;
  aeonQuestion: string;
  memoryNote?: string;
};

type CacheRow = {
  arc_key: string;
  lifecycle_start_date: string;
  lifecycle_end_date: string;
  phase: string;
  memory_hash: string;
  reading_json: MajorTransitAiReading;
};

type CacheStatusRow = {
  arc_key: string;
  lifecycle_start_date: string;
  lifecycle_end_date: string;
  phase: string;
  memory_hash: string;
  prompt_version: string;
  generated_at: string;
};

export type MajorTransitAiReadingCacheStatusEntry = {
  key: string;
  arcKey: string;
  phase: string;
  expectedHash: string;
  exactMatch: boolean;
  rowCount: number;
  latest: {
    memoryHash: string;
    promptVersion: string;
    generatedAt: string;
  } | null;
};

type ReadingMap = Record<string, MajorTransitAiReading>;
type PartialHandlingMode = 'log' | 'throw';

type GenerationPayload = {
  readings: Array<{
    key: string;
    headline: string;
    wave: string;
    whyYou: string;
    feel: string;
    use: string;
    doNotForce: string;
    aeonQuestion: string;
    memoryNote?: string;
  }>;
};

class PartialMajorTransitReadingsError extends Error {
  missingKeys: string[];

  constructor(missingKeys: string[]) {
    super(`Major transit reading generation returned partial output for ${missingKeys.length} arc(s)`);
    this.name = 'PartialMajorTransitReadingsError';
    this.missingKeys = missingKeys;
  }
}

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
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

function readingKey(arc: MajorTransitArc) {
  return [arc.key, arc.startDate, arc.endDate, arc.phase].join('|');
}

function judgmentSnapshot(judgment: AstrologyJudgment) {
  return buildAstrologyJudgmentPromptSnapshot(judgment);
}

function buildMajorTransitJudgmentForArc(arc: MajorTransitArc, chart: NatalChart, arcs: MajorTransitArc[], memory: MajorWaveMemoryInput, date?: string) {
  const computationDate = date ?? new Date().toISOString().split('T')[0];

  return buildArcFocusedJudgment({
    date: computationDate,
    chart,
    arc,
    majorArcs: arcs,
    todayTransits: { date: computationDate, transits: [arc.transit] },
    guidance: [],
    memory: { ...memory, priorReadings: memory.priorReadings },
  });
}

export function buildMajorTransitAiReadingMemoryHash(arc: MajorTransitArc, memory: MajorWaveMemoryInput, judgment?: AstrologyJudgment) {
  const lifeSignals = (memory.lifeSignals ?? []).slice(0, 12).map((signal) => ({
    text: compactText(signal.content_text, 260),
    themes: signal.themes_json?.slice(0, 5) ?? [],
    emotions: signal.emotions_json?.slice(0, 5) ?? [],
    domain: signal.life_domain ?? null,
  }));

  return stableHash({
    prompt: MAJOR_TRANSIT_READING_PROMPT_VERSION,
    arc: {
      key: arc.key,
      start: arc.startDate,
      end: arc.endDate,
      phase: arc.phase,
      hits: arc.exactHits,
      stations: arc.stations,
      context: arc.context,
    },
    judgment: judgment ? judgmentSnapshot(judgment) : null,
    reportThemes: memory.report?.themes ?? [],
    reportReading: compactText(memory.report?.chartReading, 600),
    natalReading: compactText(memory.natalReading, 800),
    priorReadings: (memory.priorReadings ?? []).slice(0, 5).map((reading) => compactText(reading, 500)),
    lifeSignals,
  });
}

function sanitizeReading(reading: Partial<MajorTransitAiReading>, arc: MajorTransitArc): MajorTransitAiReading {
  return {
    headline: compactText(reading.headline, 140) || transitTitle(arc.transit),
    wave: compactText(reading.wave, 700),
    whyYou: compactText(reading.whyYou, 700),
    feel: compactText(reading.feel, 600),
    use: compactText(reading.use, 600),
    doNotForce: compactText(reading.doNotForce, 500),
    aeonQuestion: compactText(reading.aeonQuestion, 160) || `What is this ${transitTitle(arc.transit)} wave asking me to see?`,
    memoryNote: compactText(reading.memoryNote, 280),
  };
}

function buildPrompt(params: {
  arcs: MajorTransitArc[];
  chart: NatalChart;
  memory: MajorWaveMemoryInput;
  judgments: Record<string, AstrologyJudgment>;
}) {
  const { arcs, chart, memory } = params;
  const date = new Date().toISOString().split('T')[0];
  const placements = chart.placements
    .map((p) => `${p.label}: ${p.sign} ${p.degree}°${p.minute}′${p.retrograde ? ' Rx' : ''}`)
    .join('\n');

  const arcLines = arcs.map((arc) => ({
    key: readingKey(arc),
    title: transitTitle(arc.transit),
    transit: arc.transit,
    lifecycle: {
      start: arc.startDate,
      end: arc.endDate,
      peak: arc.peakDate,
      phase: arc.phase,
      activeToday: arc.activeToday,
      exactHits: arc.exactHits,
      stations: arc.stations,
      passes: arc.activeRunCount,
    },
    lifecycleFacts: buildTransitArcJudgment({ arc, chart, memory, date }),
    natalContext: arc.context,
    judgment: params.judgments[readingKey(arc)]
      ? buildAstrologyJudgmentPromptSnapshot(params.judgments[readingKey(arc)]!)
      : null,
  }));

  const lifeSignals = (memory.lifeSignals ?? []).slice(0, 12).map((signal) => ({
    text: compactText(signal.content_text, 500),
    themes: signal.themes_json?.slice(0, 4) ?? [],
    emotions: signal.emotions_json?.slice(0, 4) ?? [],
    lifeDomain: signal.life_domain ?? null,
  }));

  const system = `You are SOS, a serious personal astrology intelligence layer. Write premium transit-wave readings.

Rules:
- The structured judgment for each arc is the source of truth. Use it first, then use the other payload only to clarify or quote receipts.
- Interpret each major transit as a personal lifecycle, not a daily horoscope.
- Use the user's saved memory when it is present: natal chart, onboarding report, prior readings, journal/Aeon life signals, recurring themes.
- Do not say you know something unless it is in the provided data. If memory is thin, say the reading will sharpen as SOS gets more signals.
- Be specific, adult, useful, and direct. No poetic language, vague spiritual theater, fortune-cookie copy, or "the stars are aligning" language.
- Avoid em dashes.
- Do not mention internal table names, prompts, hashes, or implementation.
- If the judgment says current-sky coverage is partial, do not pretend a full collective rarity scan exists.

Return only valid JSON:
{
  "readings": [
    {
      "key": "same key provided",
      "headline": "short sharp title",
      "wave": "what this wave is about, 2-4 sentences",
      "whyYou": "why this matters for this person specifically, 2-4 sentences",
      "feel": "what it may feel like, grounded and concrete",
      "use": "what to do with it",
      "doNotForce": "what not to force or over-control",
      "aeonQuestion": "one personal question they could ask Aeon",
      "memoryNote": "brief note on what saved memory was used or what is still thin"
    }
  ]
}`;

  const user = `--- NATAL CHART ---\n${placements}\nAscendant: ${chart.angles.ascendant.sign} ${chart.angles.ascendant.degree}°${chart.angles.ascendant.minute}′\nMidheaven: ${chart.angles.midheaven.sign} ${chart.angles.midheaven.degree}°${chart.angles.midheaven.minute}′\n\n--- ONBOARDING / FIRST REPORT MEMORY ---\nThemes: ${(memory.report?.themes ?? []).join(' | ') || 'none saved'}\nChart reading: ${compactText(memory.report?.chartReading, 1200) || 'none saved'}\nLook ahead: ${compactText(memory.report?.lookAhead, 700) || 'none saved'}\n\n--- PRIOR NATAL / READING MEMORY ---\n${compactText(memory.natalReading, 1500) || 'none saved'}\n\n--- PRIOR GENERATED READING MEMORY ---\n${(memory.priorReadings ?? []).slice(0, 5).map((r, i) => `${i + 1}. ${compactText(r, 800)}`).join('\n') || 'none saved'}\n\n--- RECENT LIFE SIGNALS FROM JOURNAL / AEON MEMORY ---\n${JSON.stringify(lifeSignals, null, 2)}\n\n--- MAJOR TRANSIT WAVES TO READ ---\n${JSON.stringify(arcLines, null, 2)}`;

  return { system, user };
}

async function fetchCachedRows(userId: string, arcs: MajorTransitArc[], memory: MajorWaveMemoryInput, judgments: Record<string, AstrologyJudgment>) {
  const admin = createAdminClient();
  const keys = arcs.map((arc) => arc.key);
  const { data, error } = await admin
    .from('major_transit_readings')
    .select('arc_key,lifecycle_start_date,lifecycle_end_date,phase,memory_hash,reading_json')
    .eq('user_id', userId)
    .in('arc_key', keys);

  if (error) throw error;

  const expected = new Map(arcs.map((arc) => [readingKey(arc), buildMajorTransitAiReadingMemoryHash(arc, memory, judgments[readingKey(arc)])]));
  const rows = (data ?? []) as CacheRow[];
  const found: ReadingMap = {};

  for (const row of rows) {
    const key = [row.arc_key, row.lifecycle_start_date, row.lifecycle_end_date, row.phase].join('|');
    if (expected.get(key) === row.memory_hash) {
      found[key] = row.reading_json;
    }
  }

  return found;
}

export async function getMajorTransitAiReadingsCacheStatus(params: {
  userId: string;
  arcs: MajorTransitArc[];
  memory: MajorWaveMemoryInput;
  chart?: NatalChart;
  judgments?: Record<string, AstrologyJudgment>;
}): Promise<MajorTransitAiReadingCacheStatusEntry[]> {
  const arcs = params.arcs.slice(0, 14);
  if (arcs.length === 0) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('major_transit_readings')
    .select('arc_key,lifecycle_start_date,lifecycle_end_date,phase,memory_hash,prompt_version,generated_at')
    .eq('user_id', params.userId)
    .in('arc_key', arcs.map((arc) => arc.key));

  if (error) throw error;

  const rows = (data ?? []) as CacheStatusRow[];

  const judgments = params.judgments ?? (params.chart
    ? Object.fromEntries(arcs.map((arc) => [readingKey(arc), buildMajorTransitJudgmentForArc(arc, params.chart as NatalChart, arcs, params.memory)]))
    : {});

  return arcs.map((arc) => {
    const key = readingKey(arc);
    const expectedHash = buildMajorTransitAiReadingMemoryHash(arc, params.memory, judgments[key]);
    const matchingRows = rows.filter((row) => [row.arc_key, row.lifecycle_start_date, row.lifecycle_end_date, row.phase].join('|') === key);
    const latestRow = matchingRows
      .slice()
      .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime())[0] ?? null;

    return {
      key,
      arcKey: arc.key,
      phase: arc.phase,
      expectedHash,
      exactMatch: matchingRows.some((row) => row.memory_hash === expectedHash),
      rowCount: matchingRows.length,
      latest: latestRow
        ? {
            memoryHash: latestRow.memory_hash,
            promptVersion: latestRow.prompt_version,
            generatedAt: latestRow.generated_at,
          }
        : null,
    };
  });
}

async function saveGeneratedRows(params: {
  userId: string;
  arcs: MajorTransitArc[];
  memory: MajorWaveMemoryInput;
  readings: ReadingMap;
  judgments: Record<string, AstrologyJudgment>;
}) {
  const admin = createAdminClient();
  const rows = params.arcs
    .map((arc) => {
      const key = readingKey(arc);
      const reading = params.readings[key];
      if (!reading) return null;
      return {
        user_id: params.userId,
        arc_key: arc.key,
        transit_planet: arc.transit.transitPlanet,
        aspect_type: arc.transit.aspect,
        natal_target: arc.transit.natalPlanet,
        lifecycle_start_date: arc.startDate,
        lifecycle_end_date: arc.endDate,
        phase: arc.phase,
        memory_hash: buildMajorTransitAiReadingMemoryHash(arc, params.memory, params.judgments[key]),
        reading_json: reading,
        prompt_version: MAJOR_TRANSIT_READING_PROMPT_VERSION,
        model: MAJOR_TRANSIT_READING_MODEL,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);

  if (rows.length === 0) return;

  const { error } = await admin
    .from('major_transit_readings')
    .upsert(rows, {
      onConflict: 'user_id,arc_key,lifecycle_start_date,lifecycle_end_date,phase,memory_hash',
    });

  if (error) throw error;
}

async function generateReadings(arcs: MajorTransitArc[], chart: NatalChart, memory: MajorWaveMemoryInput, judgments: Record<string, AstrologyJudgment>) {
  const { system, user } = buildPrompt({ arcs, chart, memory, judgments });
  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: MAJOR_TRANSIT_READING_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  const raw = completion.choices[0]?.message.content ?? '{"readings":[]}';
  const parsed = JSON.parse(raw) as GenerationPayload;
  const byKey: ReadingMap = {};

  for (const item of parsed.readings ?? []) {
    const arc = arcs.find((candidate) => readingKey(candidate) === item.key);
    if (arc) byKey[item.key] = sanitizeReading(item, arc);
  }

  return byKey;
}

async function generateReadingsWithSingleMissingRetry(arcs: MajorTransitArc[], chart: NatalChart, memory: MajorWaveMemoryInput, judgments: Record<string, AstrologyJudgment>) {
  const generated = await generateReadings(arcs, chart, memory, judgments);
  let missing = arcs.filter((arc) => !generated[readingKey(arc)]);
  let retried = false;

  if (missing.length > 0) {
    retried = true;
    const retryGenerated = await generateReadings(missing, chart, memory, judgments);
    Object.assign(generated, retryGenerated);
    missing = missing.filter((arc) => !generated[readingKey(arc)]);
  }

  return {
    generated,
    missingKeys: missing.map((arc) => readingKey(arc)),
    retried,
  };
}

export async function getOrCreateMajorTransitAiReadings(params: {
  userId: string;
  arcs: MajorTransitArc[];
  chart: NatalChart;
  memory: MajorWaveMemoryInput;
  judgments?: Record<string, AstrologyJudgment>;
  onPartial?: PartialHandlingMode;
}) {
  const arcs = params.arcs.slice(0, 14);
  if (arcs.length === 0) return {} as ReadingMap;

  const judgments = params.judgments ?? Object.fromEntries(
    arcs.map((arc) => [readingKey(arc), buildMajorTransitJudgmentForArc(arc, params.chart, arcs, params.memory)]),
  );

  try {
    const cached = await fetchCachedRows(params.userId, arcs, params.memory, judgments);
    const missing = arcs.filter((arc) => !cached[readingKey(arc)]);
    if (missing.length === 0) return cached;

    const { generated, missingKeys, retried } = await generateReadingsWithSingleMissingRetry(
      missing,
      params.chart,
      params.memory,
      judgments,
    );
    await saveGeneratedRows({
      userId: params.userId,
      arcs: missing,
      memory: params.memory,
      readings: generated,
      judgments,
    });

    if (missingKeys.length > 0) {
      if (params.onPartial === 'throw') {
        throw new PartialMajorTransitReadingsError(missingKeys);
      }

      logWarn('major_transit_reading_partial_generation', {
        requestedCount: missing.length,
        generatedCount: Object.keys(generated).length,
        retried,
        missingKeys,
      });
    }

    return { ...cached, ...generated };
  } catch (error) {
    if (error instanceof PartialMajorTransitReadingsError && params.onPartial === 'throw') {
      logError(error, {
        route: 'major-transit-ai-reading',
        action: 'partial-generation',
        missingKeys: error.missingKeys,
      });
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('major_transit_readings') || message.includes('does not exist') || message.includes('schema cache')) {
      logWarn('major_transit_reading_cache_unavailable_generating_uncached', { message });
      try {
        return await generateReadings(arcs, params.chart, params.memory, judgments);
      } catch (generationError) {
        logError(generationError, { route: 'major-transit-ai-reading', action: 'uncached-generation-fallback' });
        return {} as ReadingMap;
      }
    }

    logError(error, { route: 'major-transit-ai-reading' });
    return {} as ReadingMap;
  }
}

export function majorTransitReadingKey(arc: MajorTransitArc) {
  return readingKey(arc);
}
