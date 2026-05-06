import type { MajorTransitArc } from '@/lib/astrology/major-transits';
import { transitTitle } from '@/lib/transit-copy';

type OnboardingMemory = {
  themes?: string[] | null;
  chartReading?: string | null;
  lookAhead?: string | null;
};

export type LifeSignalMemory = {
  content_text?: string | null;
  themes_json?: string[] | null;
  life_domain?: string | null;
  emotions_json?: string[] | null;
  signal_timestamp?: string | null;
};

export type MajorWaveMemoryInput = {
  report?: OnboardingMemory | null;
  natalReading?: unknown;
  priorReadings?: unknown[];
  lifeSignals?: LifeSignalMemory[] | null;
};

function cleanText(text: string | null | undefined) {
  return text?.replace(/\s+/g, ' ').trim() ?? '';
}

function firstSentence(text: string | null | undefined) {
  const cleaned = cleanText(text);
  if (!cleaned) return '';
  const match = cleaned.match(/^(.{40,220}?[.!?])\s/);
  return match?.[1] ?? cleaned.slice(0, 220);
}

function relevantSignals(arc: MajorTransitArc, signals: LifeSignalMemory[]) {
  const areaWords = arc.context.lifeArea.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
  const target = arc.context.targetLabel.toLowerCase();
  return signals
    .filter((signal) => {
      const haystack = [
        signal.content_text,
        signal.life_domain,
        ...(signal.themes_json ?? []),
        ...(signal.emotions_json ?? []),
      ].join(' ').toLowerCase();
      return haystack.includes(target) || areaWords.some((word) => haystack.includes(word));
    })
    .slice(0, 3);
}

function fallbackSignals(signals: LifeSignalMemory[]) {
  return signals.filter((signal) => cleanText(signal.content_text) || (signal.themes_json?.length ?? 0) > 0).slice(0, 2);
}

export function buildMajorWaveMemoryReading(arc: MajorTransitArc, memory: MajorWaveMemoryInput) {
  const reportThemes = memory.report?.themes?.filter(Boolean).slice(0, 3) ?? [];
  const signals = memory.lifeSignals ?? [];
  const matchedSignals = relevantSignals(arc, signals);
  const usableSignals = matchedSignals.length > 0 ? matchedSignals : fallbackSignals(signals);
  const themeLine = reportThemes.length > 0
    ? `This should be read against the core themes SOS already found in the first report: ${reportThemes.join('; ')}.`
    : '';
  const signalLine = usableSignals.length > 0
    ? `Recent saved signals touching this field: ${usableSignals.map((signal) => {
      const text = firstSentence(signal.content_text);
      const themes = signal.themes_json?.filter(Boolean).slice(0, 2).join(', ');
      return text || themes || signal.life_domain || 'saved life signal';
    }).join(' / ')}`
    : 'No recent saved life signal is close enough to quote here yet. This wave will get sharper as the user journals and chats with Aeon.';

  const lifecycleLine = arc.exactHits.length > 1
    ? `This is not a one-day event. It has ${arc.exactHits.length} key hits across the lifecycle, so the pattern may repeat with more information each time.`
    : `This is not a one-day event. The key hit is ${arc.exactHits[0] ? `${arc.exactHits[0].kind} on ${arc.exactHits[0].date}` : `near ${arc.peakDate}`}.`;

  return {
    memoryLine: [themeLine, signalLine].filter(Boolean).join(' '),
    lifecycleLine,
    personalLine: `${transitTitle(arc.transit)} is landing in ${arc.context.lifeArea}. Read it through what the person has already shown SOS, not as a generic sky event.`,
  };
}
