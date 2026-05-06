import crypto from 'crypto';
import OpenAI from 'openai';
import { createAdminClient } from '@/lib/supabase/server';
import type { MajorTransitArc } from '@/lib/astrology/major-transits';
import type { NatalChart } from '@/lib/astrology/types';
import type { MajorWaveMemoryInput } from '@/lib/major-transit-reading';
import { transitTitle } from '@/lib/transit-copy';
import { logError, logWarn } from '@/lib/logger';

export const MAJOR_TRANSIT_READING_PROMPT_VERSION = 'major-wave-full-memory-v1';
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

type ReadingMap = Record<string, MajorTransitAiReading>;

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

function memoryHashForArc(arc: MajorTransitArc, memory: MajorWaveMemoryInput) {
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
}) {
  const { arcs, chart, memory } = params;
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
    natalContext: arc.context,
  }));

  const lifeSignals = (memory.lifeSignals ?? []).slice(0, 12).map((signal) => ({
    text: compactText(signal.content_text, 500),
    themes: signal.themes_json?.slice(0, 4) ?? [],
    emotions: signal.emotions_json?.slice(0, 4) ?? [],
    lifeDomain: signal.life_domain ?? null,
  }));

  const system = `You are SOS, a serious personal astrology intelligence layer. Write premium transit-wave readings.

Rules:
- Interpret each major transit as a personal lifecycle, not a daily horoscope.
- Use the user's saved memory when it is present: natal chart, onboarding report, prior readings, journal/Aeon life signals, recurring themes.
- Do not say you know something unless it is in the provided data. If memory is thin, say the reading will sharpen as SOS gets more signals.
- Be specific, adult, useful, and a little startling. No vague spiritual theater. No fortune-cookie copy. No "the stars are aligning" language.
- Avoid em dashes.
- Do not mention internal table names, prompts, hashes, or implementation.

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

async function fetchCachedRows(userId: string, arcs: MajorTransitArc[], memory: MajorWaveMemoryInput) {
  const admin = createAdminClient();
  const keys = arcs.map((arc) => arc.key);
  const { data, error } = await admin
    .from('major_transit_readings')
    .select('arc_key,lifecycle_start_date,lifecycle_end_date,phase,memory_hash,reading_json')
    .eq('user_id', userId)
    .in('arc_key', keys);

  if (error) throw error;

  const expected = new Map(arcs.map((arc) => [readingKey(arc), memoryHashForArc(arc, memory)]));
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

async function saveGeneratedRows(params: {
  userId: string;
  arcs: MajorTransitArc[];
  memory: MajorWaveMemoryInput;
  readings: ReadingMap;
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
        memory_hash: memoryHashForArc(arc, params.memory),
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

async function generateReadings(arcs: MajorTransitArc[], chart: NatalChart, memory: MajorWaveMemoryInput) {
  const { system, user } = buildPrompt({ arcs, chart, memory });
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

export async function getOrCreateMajorTransitAiReadings(params: {
  userId: string;
  arcs: MajorTransitArc[];
  chart: NatalChart;
  memory: MajorWaveMemoryInput;
}) {
  const arcs = params.arcs.slice(0, 14);
  if (arcs.length === 0) return {} as ReadingMap;

  try {
    const cached = await fetchCachedRows(params.userId, arcs, params.memory);
    const missing = arcs.filter((arc) => !cached[readingKey(arc)]);
    if (missing.length === 0) return cached;

    const generated = await generateReadings(missing, params.chart, params.memory);
    await saveGeneratedRows({
      userId: params.userId,
      arcs: missing,
      memory: params.memory,
      readings: generated,
    });

    return { ...cached, ...generated };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('major_transit_readings') || message.includes('does not exist') || message.includes('schema cache')) {
      logWarn('major_transit_reading_cache_unavailable_generating_uncached', { message });
      try {
        return await generateReadings(arcs, params.chart, params.memory);
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
