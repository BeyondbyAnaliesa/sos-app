import type {
  AstrologyCollectiveSkyEvent,
  AstrologyJudgmentReceipt,
  AstrologyJudgmentSignal,
  JudgmentPhase,
  JudgmentScope,
} from '@/lib/astrology/judgment-types';

const ANGLE_LABELS: Record<string, string> = {
  ascendant: 'ASC',
  descendant: 'DSC',
  midheaven: 'MC',
  imumcoeli: 'IC',
  ic: 'IC',
};

function normalizeToken(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

function normalizeBodyLabel(value: string | null | undefined) {
  const token = normalizeToken(value);
  if (!token) return null;
  if (ANGLE_LABELS[token]) return ANGLE_LABELS[token];
  return value?.trim() ?? null;
}

function normalizePhaseMatch(receiptPhase: JudgmentPhase, eventPhase: JudgmentPhase | null) {
  if (!eventPhase) return false;
  if (receiptPhase === eventPhase) return true;
  return receiptPhase === 'exact' && eventPhase === 'applying';
}

function exactnessBonus(event: AstrologyCollectiveSkyEvent) {
  if (event.exactnessBand === 'exact') return 0.2;
  if (event.exactnessBand === 'near_exact') return 0.1;
  return 0;
}

function eventTierBonus(event: AstrologyCollectiveSkyEvent) {
  if (event.tier === 'foreground') return 0.35;
  if (event.tier === 'supporting') return 0.2;
  return 0;
}

function buildLifeAreaReason(receipt: AstrologyJudgmentReceipt) {
  if (!receipt.natalProjection) {
    return {
      matched: false,
      note: 'Personal house/life-area context was unavailable for this receipt.',
    };
  }

  return {
    matched: receipt.natalProjection.targetIsAngle || receipt.natalProjection.repeatedLifeAreaSignalCount >= 2,
    note: receipt.natalProjection.targetIsAngle
      ? `The personal hit lands on an angle (${receipt.natalProjection.targetLabel}), so collective pressure is more likely to show up in lived experience.`
      : receipt.natalProjection.repeatedLifeAreaSignalCount >= 2
        ? `This life area already has ${receipt.natalProjection.repeatedLifeAreaSignalCount} recent saved-signal repeats, which raises the odds that collective pressure is showing up personally.`
        : 'Collective current-sky events are not projected into houses in this slice, so house/life-area matching stays chart-only.',
  };
}

function buildBridgeCandidate(receipt: AstrologyJudgmentReceipt, event: AstrologyCollectiveSkyEvent) {
  const reasons: string[] = [];
  const limitations = new Set<string>([
    ...event.limitations,
    'Bridge matching is heuristic and only covers body/body-pair, phase, natal target, and limited life-area context.',
  ]);
  let score = 0;

  if (event.bodies.includes(receipt.transitPlanet)) {
    score += 1.6;
    reasons.push(`Collective event includes transit body ${receipt.transitPlanet}.`);
  }

  const normalizedTargetLabel = normalizeBodyLabel(receipt.targetLabel);
  const normalizedNatalTarget = normalizeBodyLabel(receipt.natalTarget);
  const matchedTargetBody = [normalizedTargetLabel, normalizedNatalTarget]
    .filter((value): value is string => Boolean(value))
    .find((value) => event.bodies.includes(value));

  if (matchedTargetBody) {
    score += 1.05;
    reasons.push(`Collective event also includes natal target body ${matchedTargetBody}.`);
  }

  if (event.aspect && event.aspect === receipt.aspect) {
    score += 0.45;
    reasons.push(`Aspect form aligns (${receipt.aspect}).`);
  }

  if (normalizePhaseMatch(receipt.phase, event.phase)) {
    score += 0.3;
    reasons.push(`Timing phase aligns (${receipt.phase}${event.phase && event.phase !== receipt.phase ? `/${event.phase}` : ''}).`);
  } else if (!event.phase) {
    limitations.add('This collective event has no phase field, so phase alignment could not be tested.');
  }

  const lifeArea = buildLifeAreaReason(receipt);
  if (lifeArea.matched) {
    score += 0.2;
    reasons.push(lifeArea.note);
  } else {
    limitations.add(lifeArea.note);
  }

  if (receipt.meaningFactors?.currentSky?.eventId === event.id) {
    score += 0.2;
    reasons.push('Meaning factors already point at this collective event.');
  } else if (!receipt.meaningFactors) {
    limitations.add('Meaning factors were unavailable for this receipt, so semantic overlap was not tested.');
  }

  score += eventTierBonus(event) + exactnessBonus(event);

  return {
    event,
    reasons,
    limitations: [...limitations],
    score: Number(score.toFixed(2)),
  };
}

function bridgeTier(score: number): 'foreground' | 'supporting' | 'background' {
  if (score >= 2.7) return 'foreground';
  if (score >= 1.8) return 'supporting';
  return 'background';
}

export function buildCollectivePersonalBridge(receipt: AstrologyJudgmentReceipt, currentSkyEvents: AstrologyCollectiveSkyEvent[]) {
  const candidates = currentSkyEvents
    .map((event) => buildBridgeCandidate(receipt, event))
    .filter((candidate) => candidate.score >= 1.6)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.event.score !== a.event.score) return b.event.score - a.event.score;
      return (a.event.orb ?? 999) - (b.event.orb ?? 999);
    });

  const winner = candidates[0];
  if (!winner) return null;

  const bridgeStrengthTier = bridgeTier(winner.score);
  const promoteScopeToBoth = winner.event.tier !== 'background' && winner.score >= 2.25;

  return {
    collectiveEvent: {
      id: winner.event.id,
      kind: winner.event.kind,
      bodies: winner.event.bodies,
      aspect: winner.event.aspect,
      tier: winner.event.tier,
      score: winner.event.score,
    },
    matchReasons: winner.reasons,
    bridgeStrengthScore: winner.score,
    bridgeStrengthTier,
    promoteScopeToBoth,
    limitations: winner.limitations,
  };
}

export function collectiveBridgeScoreBonus(bridge: AstrologyJudgmentReceipt['collectiveBridge'] | AstrologyJudgmentSignal['collectiveBridge']) {
  if (!bridge) return 0;
  if (bridge.bridgeStrengthTier === 'foreground') return 0.35;
  if (bridge.bridgeStrengthTier === 'supporting') return 0.18;
  return 0.08;
}

export function bridgeScope(scope: JudgmentScope, bridge: AstrologyJudgmentReceipt['collectiveBridge'] | null): JudgmentScope {
  if (bridge?.promoteScopeToBoth) return 'both';
  return scope;
}
