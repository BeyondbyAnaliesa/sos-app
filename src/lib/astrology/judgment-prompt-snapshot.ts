import type {
  AstrologyCollectiveBridge,
  AstrologyCollectiveSkyEvent,
  AstrologyJudgment,
  AstrologyJudgmentReceipt,
  AstrologyJudgmentSignal,
} from '@/lib/astrology/judgment-types';

function compactCollectiveSkyEvent(event: AstrologyCollectiveSkyEvent) {
  return {
    id: event.id,
    kind: event.kind,
    tier: event.tier,
    score: event.score,
    bodies: event.bodies,
    aspect: event.aspect,
    orb: event.orb,
    phase: event.phase,
    sign: event.sign,
    exactnessBand: event.exactnessBand,
    summary: event.summary,
    receipts: event.receipts.slice(0, 3),
    rarity: {
      score: event.rarity.score,
      historicalGapYears: event.rarity.historicalGapYears,
    },
    consequence: {
      score: event.consequence.score,
      historicalGapYears: event.consequence.historicalGapYears,
    },
    limitations: event.limitations.slice(0, 2),
  };
}

function compactCollectiveBridge(bridge: AstrologyCollectiveBridge | null | undefined) {
  if (!bridge) return null;

  return {
    event: bridge.collectiveEvent,
    matchReasons: bridge.matchReasons.slice(0, 2),
    bridgeStrengthScore: bridge.bridgeStrengthScore,
    bridgeStrengthTier: bridge.bridgeStrengthTier,
    promoteScopeToBoth: bridge.promoteScopeToBoth,
    limitations: bridge.limitations.slice(0, 2),
  };
}

export function compactAstrologyJudgmentReceipt(receipt: AstrologyJudgmentReceipt) {
  return {
    arcKey: receipt.arcKey ?? null,
    transitPlanet: receipt.transitPlanet,
    aspect: receipt.aspect,
    natalTarget: receipt.natalTarget,
    targetLabel: receipt.targetLabel,
    lifeArea: receipt.lifeArea,
    orb: receipt.orb,
    phase: receipt.phase,
    exactDate: receipt.exactDate,
    peakDate: receipt.peakDate,
    startDate: receipt.startDate,
    endDate: receipt.endDate,
    memorySummary: receipt.memorySummary,
    natalProjection: receipt.natalProjection
      ? {
        house: receipt.natalProjection.house,
        angularity: receipt.natalProjection.angularity,
        targetIsAngle: receipt.natalProjection.targetIsAngle,
        targetIsModernChartRuler: receipt.natalProjection.targetIsModernChartRuler,
        targetIsTraditionalChartRuler: receipt.natalProjection.targetIsTraditionalChartRuler,
        repeatedLifeAreaSignalCount: receipt.natalProjection.repeatedLifeAreaSignalCount,
      }
      : null,
    collectiveBridge: compactCollectiveBridge(receipt.collectiveBridge),
    arcLifecycle: receipt.arcLifecycle
      ? {
        phaseLabel: receipt.arcLifecycle.phaseLabel,
        phaseDemand: receipt.arcLifecycle.phaseDemand,
        currentPass: receipt.arcLifecycle.currentPass,
        totalPasses: receipt.arcLifecycle.totalPasses,
        watchNextDate: receipt.arcLifecycle.watchNextDate,
        watchNextType: receipt.arcLifecycle.watchNextType,
      }
      : null,
  };
}

export function compactAstrologyJudgmentSignal(signal: AstrologyJudgmentSignal, options?: { receiptLimit?: number }) {
  return {
    id: signal.id,
    tier: signal.tier,
    scope: signal.scope,
    source: signal.source,
    title: signal.title,
    summary: signal.summary,
    demand: signal.demand,
    score: signal.score,
    lifeAreas: signal.lifeAreas,
    supportNotes: signal.supportNotes.slice(0, 3),
    collectiveBridge: compactCollectiveBridge(signal.collectiveBridge),
    receipts: signal.receipts.slice(0, options?.receiptLimit ?? 2).map(compactAstrologyJudgmentReceipt),
  };
}

export function buildAstrologyJudgmentPromptSnapshot(judgment: AstrologyJudgment) {
  const leadSignals = [...judgment.foreground, ...judgment.supporting, ...judgment.background]
    .slice(0, 4)
    .map((signal) => compactAstrologyJudgmentSignal(signal, { receiptLimit: 2 }));

  return {
    status: 'structured-astrology-judgment-v1',
    date: judgment.date,
    mainStory: judgment.mainStory,
    practicalDemand: judgment.practicalDemand,
    activatedLifeAreas: judgment.activatedLifeAreas,
    timing: judgment.timing,
    leadSignals,
    currentSky: {
      status: judgment.currentSky.status,
      summary: judgment.currentSky.summary,
      events: judgment.currentSky.events.slice(0, 4).map(compactCollectiveSkyEvent),
      limitations: judgment.currentSky.limitations.slice(0, 4),
    },
    receipts: judgment.receipts.slice(0, 6).map(compactAstrologyJudgmentReceipt),
  };
}
