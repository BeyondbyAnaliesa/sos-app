import type {
  AstrologyJudgment,
  AstrologyJudgmentReceipt,
  AstrologyJudgmentSignal,
  JudgmentSource,
} from '@/lib/astrology/judgment-types';

export interface AstrologyJudgmentMetadata {
  status: 'astrology-judgment-metadata-v1';
  engineVersions: {
    judgment: 'structured-astrology-judgment-v1';
    currentSky: AstrologyJudgment['currentSky']['status'];
  };
  signalCounts: {
    foreground: number;
    supporting: number;
    background: number;
    noise: number;
    total: number;
    bySource: Record<JudgmentSource, number>;
  };
  currentSky: {
    eventCount: number;
    computedFactCount: number;
    fencedFactCount: number;
    rarityAssessments: {
      computedRecurrence: number;
      boundedLimited: number;
      heuristicOnly: number;
      unsupported: number;
    };
  };
  availability: {
    transitDignityReceipts: number;
    natalDignityReceipts: number;
    receptionReceipts: number;
    supportedReceptionReceipts: number;
    sectReceipts: number;
    arcLifecycleReceipts: number;
    collectiveBridgeReceipts: number;
  };
  lead: {
    signalIds: string[];
    currentSkyEventIds: string[];
  };
  limitations: string[];
}

function pushLimited(target: string[], values: Array<string | null | undefined>, max = 8) {
  for (const value of values) {
    if (!value) continue;
    if (!target.includes(value)) target.push(value);
    if (target.length >= max) return;
  }
}

function isSupportedReception(receipt: AstrologyJudgmentReceipt) {
  return receipt.reception?.some((fact) => fact.status !== 'unavailable') ?? false;
}

function receiptLimitations(receipt: AstrologyJudgmentReceipt) {
  return [
    ...(receipt.currentSkyRarity?.limitations ?? []),
    ...(receipt.sect?.limitations ?? []),
    ...(receipt.reception?.flatMap((fact) => fact.limitations) ?? []),
    ...(receipt.arcLifecycle?.limitations ?? []),
    ...(receipt.collectiveBridge?.limitations ?? []),
  ];
}

function buildSignalSourceCounts(signals: AstrologyJudgmentSignal[]): Record<JudgmentSource, number> {
  return signals.reduce<Record<JudgmentSource, number>>((acc, signal) => {
    acc[signal.source] += 1;
    return acc;
  }, {
    major_arc: 0,
    daily_transit: 0,
    guidance: 0,
    memory: 0,
  });
}

export function buildAstrologyJudgmentMetadata(judgment: AstrologyJudgment): AstrologyJudgmentMetadata {
  const signals = [
    ...judgment.foreground,
    ...judgment.supporting,
    ...judgment.background,
    ...judgment.noise,
  ];
  const receipts = judgment.receipts;
  const currentSkyEvents = judgment.currentSky.events;
  const limitations: string[] = [];

  pushLimited(limitations, judgment.currentSky.limitations);
  for (const receipt of receipts) {
    pushLimited(limitations, receiptLimitations(receipt));
    if (limitations.length >= 8) break;
  }

  return {
    status: 'astrology-judgment-metadata-v1',
    engineVersions: {
      judgment: 'structured-astrology-judgment-v1',
      currentSky: judgment.currentSky.status,
    },
    signalCounts: {
      foreground: judgment.foreground.length,
      supporting: judgment.supporting.length,
      background: judgment.background.length,
      noise: judgment.noise.length,
      total: signals.length,
      bySource: buildSignalSourceCounts(signals),
    },
    currentSky: {
      eventCount: currentSkyEvents.length,
      computedFactCount: currentSkyEvents.filter((event) => event.rarity.status === 'computed').length,
      fencedFactCount: currentSkyEvents.filter((event) => event.rarity.status !== 'computed').length,
      rarityAssessments: {
        computedRecurrence: currentSkyEvents.filter((event) => event.rarity.assessment === 'computed_recurrence').length,
        boundedLimited: currentSkyEvents.filter((event) => event.rarity.assessment === 'bounded_limited').length,
        heuristicOnly: currentSkyEvents.filter((event) => event.rarity.assessment === 'heuristic_only').length,
        unsupported: currentSkyEvents.filter((event) => event.rarity.assessment === 'unsupported').length,
      },
    },
    availability: {
      transitDignityReceipts: receipts.filter((receipt) => Boolean(receipt.transitDignity)).length,
      natalDignityReceipts: receipts.filter((receipt) => Boolean(receipt.natalProjection?.dignity)).length,
      receptionReceipts: receipts.filter((receipt) => (receipt.reception?.length ?? 0) > 0).length,
      supportedReceptionReceipts: receipts.filter((receipt) => isSupportedReception(receipt)).length,
      sectReceipts: receipts.filter((receipt) => Boolean(receipt.sect)).length,
      arcLifecycleReceipts: receipts.filter((receipt) => Boolean(receipt.arcLifecycle)).length,
      collectiveBridgeReceipts: receipts.filter((receipt) => Boolean(receipt.collectiveBridge)).length,
    },
    lead: {
      signalIds: signals.slice(0, 3).map((signal) => signal.id),
      currentSkyEventIds: currentSkyEvents.slice(0, 3).map((event) => event.id),
    },
    limitations: limitations.slice(0, 8),
  };
}
