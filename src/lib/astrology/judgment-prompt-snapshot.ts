import type {
  AstrologyCollectiveBridge,
  AstrologyCollectiveSkyEvent,
  AstrologyJudgment,
  AstrologyJudgmentReceipt,
  AstrologyJudgmentSignal,
  AstrologyMacroPersonalBridge,
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
      status: event.rarity.status,
      assessment: event.rarity.assessment,
      method: event.rarity.method,
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

function compactMacroPersonalBridge(bridge: AstrologyMacroPersonalBridge | null | undefined) {
  if (!bridge) return null;

  return {
    configurationId: bridge.configurationId,
    bridgeStrengthTier: bridge.bridgeStrengthTier,
    manifestationClass: bridge.manifestationClass,
    decisionPressure: bridge.decisionPressure,
    activationArea: bridge.activationArea.slice(0, 3),
    natalTargets: bridge.natalTargets.slice(0, 3).map((target) => ({
      targetLabel: target.targetLabel,
      targetType: target.targetType,
    })),
    memoryLinks: {
      matchedSignalCount: bridge.memoryLinks.matchedSignalCount,
      matchedThemes: bridge.memoryLinks.matchedThemes.slice(0, 4),
    },
    limitations: bridge.limitations.slice(0, 3),
  };
}

function buildMacroDoNotClaimWarnings(judgment: AstrologyJudgment): string[] {
  const configurations = judgment.macrocosm?.configurations ?? [];

  return [
    ...configurations.flatMap((configuration) => configuration.rarity.status === 'computed'
      ? []
      : [`Do not claim historical recurrence for ${configuration.id}; recurrence is not computed.`]),
    ...configurations.flatMap((configuration) => configuration.landscape?.statusLabel === 'saturated'
      ? [`Do not frame ${configuration.id} as novel; the landscape is saturated.`]
      : []),
    ...configurations.flatMap((configuration) => configuration.landscape
      ? []
      : [`Do not infer novelty for ${configuration.id}; landscape coverage is unknown.`]),
  ].slice(0, 6);
}

function compactMacrocosm(judgment: AstrologyJudgment) {
  const configurations = judgment.macrocosm?.configurations ?? [];

  return {
    status: judgment.macrocosm?.status ?? 'macrocosm-engine-v1',
    configurations: configurations.slice(0, 4).map((configuration) => ({
      id: configuration.id,
      kind: configuration.kind,
      title: configuration.title,
      summary: configuration.summary,
      bodies: configuration.bodies,
      signs: configuration.signs,
      timeWindow: configuration.timeWindow,
      landscapeStatus: configuration.landscape?.statusLabel ?? 'unknown',
      underStudiedAngles: configuration.landscape?.underStudiedAngles.slice(0, 3) ?? [],
      recurrence: {
        status: configuration.rarity.status,
        assessment: configuration.rarity.assessment,
        historicalGapYears: configuration.rarity.historicalGapYears,
      },
      limitations: [
        ...configuration.limitations,
        ...configuration.rarity.limitations,
        ...(configuration.landscape?.limitations ?? []),
      ].slice(0, 4),
    })),
    doNotClaim: buildMacroDoNotClaimWarnings(judgment),
    limitations: judgment.macrocosm?.limitations.slice(0, 4) ?? [],
  };
}

export function compactAstrologyJudgmentReceipt(receipt: AstrologyJudgmentReceipt) {
  return {
    arcKey: receipt.arcKey ?? null,
    transitPlanet: receipt.transitPlanet,
    transitObject: receipt.transitObject
      ? {
        label: receipt.transitObject.label,
        category: receipt.transitObject.category,
        supportLevel: receipt.transitObject.supportLevel,
      }
      : null,
    aspect: receipt.aspect,
    natalTarget: receipt.natalTarget,
    natalTargetObject: receipt.natalTargetObject
      ? {
        label: receipt.natalTargetObject.label,
        category: receipt.natalTargetObject.category,
        supportLevel: receipt.natalTargetObject.supportLevel,
      }
      : null,
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
        dignity: receipt.natalProjection.dignity?.condition ?? null,
        sect: {
          chartSect: receipt.natalProjection.sect.chartSect,
          targetCondition: receipt.natalProjection.sect.targetCondition,
        },
        repeatedLifeAreaSignalCount: receipt.natalProjection.repeatedLifeAreaSignalCount,
      }
      : null,
    transitDignity: receipt.transitDignity?.condition ?? null,
    reception: receipt.reception?.filter((fact) => fact.status === 'mutual' || fact.status === 'one_way').slice(0, 2).map((fact) => ({
      system: fact.system,
      status: fact.status,
      direction: fact.direction,
    })) ?? [],
    sect: receipt.sect
      ? {
        chartSect: receipt.sect.chartSect,
        transitPlanetCondition: receipt.sect.transitPlanetCondition,
        natalTargetCondition: receipt.sect.natalTargetCondition,
      }
      : null,
    collectiveBridge: compactCollectiveBridge(receipt.collectiveBridge),
    macroBridge: compactMacroPersonalBridge(receipt.macroBridge),
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
    macroBridge: compactMacroPersonalBridge(signal.macroBridge),
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
    macrocosm: compactMacrocosm(judgment),
    objectInventory: {
      status: judgment.objectInventory.status,
      transitLabels: judgment.objectInventory.transitLabels.slice(0, 6),
      targetLabels: judgment.objectInventory.targetLabels.slice(0, 6),
    },
    receipts: judgment.receipts.slice(0, 6).map(compactAstrologyJudgmentReceipt),
  };
}
