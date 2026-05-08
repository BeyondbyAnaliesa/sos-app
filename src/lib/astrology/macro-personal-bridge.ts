import type { LifeSignalMemory, MajorWaveMemoryInput } from '@/lib/major-transit-reading';
import type {
  AstrologyJudgmentReceipt,
  AstrologyMacroPersonalBridge,
} from '@/lib/astrology/judgment-types';
import type { MacroConfigurationReceipt } from '@/lib/astrology/macrocosm-types';

function dedupe<T>(values: T[]): T[] {
  return values.filter((value, index, all) => all.indexOf(value) === index);
}

function compactText(value: string | null | undefined, max = 96) {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeToken(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

function normalizeBodyLabel(value: string | null | undefined) {
  const token = normalizeToken(value);
  if (!token) return null;
  if (token === 'ascendant') return 'Ascendant';
  if (token === 'descendant') return 'Descendant';
  if (token === 'midheaven') return 'Midheaven';
  if (token === 'imumcoeli' || token === 'ic') return 'IC';
  return value?.trim() ?? null;
}

function matchingLifeSignals(memory: MajorWaveMemoryInput, receipt: AstrologyJudgmentReceipt, configuration: MacroConfigurationReceipt) {
  const lifeAreaWords = receipt.lifeArea.toLowerCase().split(/[^a-z]+/).filter((word) => word.length > 3);
  const bodyWords = configuration.bodies.map((body) => body.toLowerCase());
  const signWords = configuration.signs.map((sign) => sign.toLowerCase());
  const targetWords = [receipt.targetLabel.toLowerCase(), normalizeBodyLabel(receipt.natalTarget)?.toLowerCase()].filter((value): value is string => Boolean(value));

  return (memory.lifeSignals ?? []).filter((signal) => {
    const haystack = [
      signal.content_text,
      signal.life_domain,
      ...(signal.themes_json ?? []),
      ...(signal.emotions_json ?? []),
    ].join(' ').toLowerCase();

    return targetWords.some((word) => haystack.includes(word))
      || lifeAreaWords.some((word) => haystack.includes(word))
      || bodyWords.some((word) => haystack.includes(word))
      || signWords.some((word) => haystack.includes(word));
  });
}

function buildMemoryLinks(matches: LifeSignalMemory[], receipt: AstrologyJudgmentReceipt) {
  return {
    matchedSignalCount: matches.length,
    matchedThemes: dedupe(matches.flatMap((signal) => signal.themes_json ?? []).filter(Boolean)).slice(0, 5),
    excerpts: dedupe([
      ...matches.map((signal) => compactText(signal.content_text, 90)).filter(Boolean),
      receipt.memorySummary ?? null,
    ].filter((value): value is string => Boolean(value))).slice(0, 3),
  };
}

function buildNatalTargets(receipt: AstrologyJudgmentReceipt) {
  const projection = receipt.natalProjection;
  if (!projection) return [] as AstrologyMacroPersonalBridge['natalTargets'];

  const targets: AstrologyMacroPersonalBridge['natalTargets'] = [];

  targets.push({
    targetLabel: projection.targetLabel,
    targetType: projection.targetType,
    reason: `This receipt already lands on ${projection.targetLabel}, so the macro configuration is being filtered through that natal target.`,
  });

  if (projection.targetIsAngle) {
    targets.push({
      targetLabel: projection.targetLabel,
      targetType: 'angle',
      reason: `${projection.targetLabel} is a natal angle, which makes macro pressure more externally visible and inspectable.`,
    });
  }

  const traditionalHouseRuler = projection.signRuler.traditionalRulerPlacement;
  const modernHouseRuler = projection.signRuler.modernRulerPlacement;
  const preferredRuler = traditionalHouseRuler ?? modernHouseRuler;
  if (preferredRuler?.ruler) {
    targets.push({
      targetLabel: preferredRuler.ruler,
      targetType: 'house_ruler',
      reason: `${preferredRuler.ruler} rules the natal sign of ${projection.targetLabel} and anchors the activated house story in ${preferredRuler.houseContext.label}.`,
    });
  }

  if (projection.house.axisLabel && projection.house.axisHouse != null) {
    targets.push({
      targetLabel: `House ${projection.house.house}/${projection.house.axisHouse} axis`,
      targetType: 'house_axis',
      reason: `The activation sits on the ${projection.house.house}/${projection.house.axisHouse} house axis (${projection.house.label} ↔ ${projection.house.axisLabel}).`,
    });
  }

  return dedupe(targets.map((target) => JSON.stringify(target))).map((value) => JSON.parse(value));
}

function bridgeTier(score: number): AstrologyMacroPersonalBridge['bridgeStrengthTier'] {
  if (score >= 3.3) return 'foreground';
  if (score >= 2.45) return 'supporting';
  return 'background';
}

function manifestationClass(receipt: AstrologyJudgmentReceipt, score: number): AstrologyMacroPersonalBridge['manifestationClass'] {
  const projection = receipt.natalProjection;
  if (projection?.targetIsAngle || projection?.angularity === 'angular') return score >= 3.2 ? 'loud' : 'structural';
  if (projection?.house.house === 12 || projection?.house.house === 8) return 'internal';
  if (receipt.phase === 'applying') return 'delayed';
  if ((projection?.repeatedLifeAreaSignalCount ?? 0) >= 2) return 'structural';
  return 'subtle';
}

function decisionPressure(receipt: AstrologyJudgmentReceipt, score: number): AstrologyMacroPersonalBridge['decisionPressure'] {
  if (receipt.phase === 'exact' && score >= 3) return 'immediate';
  if (receipt.phase === 'exact' || score >= 2.8) return 'active';
  if (receipt.phase === 'applying' || (receipt.natalProjection?.repeatedLifeAreaSignalCount ?? 0) >= 1) return 'building';
  return 'background';
}

function buildCandidate(params: {
  receipt: AstrologyJudgmentReceipt;
  configuration: MacroConfigurationReceipt;
  memory: MajorWaveMemoryInput;
}) {
  const { receipt, configuration, memory } = params;
  const reasons: string[] = [];
  const limitations = new Set<string>([
    ...configuration.limitations,
    ...configuration.rarity.limitations,
    ...(configuration.landscape?.limitations ?? []),
    'Macro bridge v1 is deterministic and bounded to active transit-body overlap, natal projection resonance, and existing memory/life-signal support.',
  ]);
  let score = 0;

  const bodyOverlap = configuration.bodies.filter((body) => body === receipt.transitPlanet);
  if (bodyOverlap.length > 0) {
    score += 1.5;
    reasons.push(`Macro configuration includes the active transit body ${receipt.transitPlanet}.`);
  }

  if (receipt.collectiveBridge && configuration.eventIds.includes(receipt.collectiveBridge.collectiveEvent.id)) {
    score += 0.8;
    reasons.push(`The existing collective bridge event ${receipt.collectiveBridge.collectiveEvent.id} is one of this macro configuration's supporting events.`);
  }

  const bridgeBodyOverlap = receipt.collectiveBridge?.collectiveEvent.bodies.filter((body) => configuration.bodies.includes(body)) ?? [];
  if (bridgeBodyOverlap.length > 0) {
    score += Math.min(0.6, bridgeBodyOverlap.length * 0.2);
    reasons.push(`Macro configuration repeats collective bridge bodies already active in this receipt: ${bridgeBodyOverlap.join(', ')}.`);
  }

  const natalTargets = buildNatalTargets(receipt);
  if (natalTargets.length > 0) {
    score += 0.55;
    reasons.push(`Natal resonance is available through ${natalTargets.map((target) => target.targetType).join(', ')} targets already computed on the receipt.`);
  }
  if (receipt.natalProjection?.targetIsAngle) {
    score += 0.55;
    reasons.push(`The receipt lands on a natal angle (${receipt.natalProjection.targetLabel}), which increases external visibility.`);
  } else if (receipt.natalProjection?.angularity === 'angular') {
    score += 0.35;
    reasons.push(`The natal target sits in an angular house, so macro pressure has a clearer life-domain landing zone.`);
  }
  if (receipt.natalProjection?.targetIsModernChartRuler || receipt.natalProjection?.targetIsTraditionalChartRuler) {
    score += 0.35;
    reasons.push(`The receipt touches a chart-ruler pathway, which makes the macro story more personally central.`);
  }

  const matchedSignals = matchingLifeSignals(memory, receipt, configuration);
  const memoryLinks = buildMemoryLinks(matchedSignals, receipt);
  if (memoryLinks.matchedSignalCount > 0) {
    score += memoryLinks.matchedSignalCount >= 2 ? 0.7 : 0.4;
    reasons.push(`Saved life signals already repeat this domain (${memoryLinks.matchedSignalCount} matched signal${memoryLinks.matchedSignalCount === 1 ? '' : 's'}).`);
  } else if (receipt.memorySummary) {
    score += 0.2;
    reasons.push('This receipt already carries a saved-memory summary in the same life domain, even if no extra raw signal match was found here.');
  } else {
    limitations.add('No repeated memory/life-signal support was available for this macro bridge candidate.');
  }

  if ((receipt.natalProjection?.repeatedLifeAreaSignalCount ?? 0) >= 2) {
    score += 0.35;
    reasons.push(`This life area already has ${receipt.natalProjection?.repeatedLifeAreaSignalCount} repeated saved-signal hits.`);
  }

  if (configuration.landscape?.statusLabel === 'saturated') {
    limitations.add(`Landscape status for ${configuration.id} is saturated; this bridge can explain personal landing, not claim novelty.`);
  }

  if (configuration.rarity.status !== 'computed') {
    limitations.add(`Historical recurrence for ${configuration.id} remains fenced as not_computed.`);
  }

  return {
    configuration,
    score: Number(score.toFixed(2)),
    reasons,
    natalTargets,
    memoryLinks,
    limitations: [...limitations],
  };
}

export function buildMacroPersonalBridge(params: {
  receipt: AstrologyJudgmentReceipt;
  macroConfigurations: MacroConfigurationReceipt[];
  memory: MajorWaveMemoryInput;
}): AstrologyMacroPersonalBridge | null {
  const candidates = params.macroConfigurations
    .map((configuration) => buildCandidate({
      receipt: params.receipt,
      configuration,
      memory: params.memory,
    }))
    .filter((candidate) => candidate.score >= 2.35)
    .filter((candidate) => candidate.reasons.some((reason) => reason.includes('active transit body')))
    .filter((candidate) => candidate.natalTargets.length > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.memoryLinks.matchedSignalCount !== a.memoryLinks.matchedSignalCount) {
        return b.memoryLinks.matchedSignalCount - a.memoryLinks.matchedSignalCount;
      }
      return a.configuration.id.localeCompare(b.configuration.id);
    });

  const winner = candidates[0];
  if (!winner) return null;

  return {
    configurationId: winner.configuration.id,
    bridgeStrengthScore: winner.score,
    bridgeStrengthTier: bridgeTier(winner.score),
    natalTargets: winner.natalTargets,
    activationArea: dedupe([
      params.receipt.lifeArea,
      params.receipt.natalProjection?.house.label ?? null,
      params.receipt.natalProjection?.house.axisLabel ?? null,
    ].filter((value): value is string => Boolean(value))).slice(0, 3),
    memoryLinks: winner.memoryLinks,
    manifestationClass: manifestationClass(params.receipt, winner.score),
    decisionPressure: decisionPressure(params.receipt, winner.score),
    limitations: winner.limitations,
  };
}
