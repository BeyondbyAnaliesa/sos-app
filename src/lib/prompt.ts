import type { NatalSummary, DailyTransits } from '@/lib/astrology/domain-types';
import type { AstrologyJudgment } from '@/lib/astrology/judgment-types';
import { buildTransitOverview, interpretTransits } from '@/lib/interpret';

const ASPECT_FEEL: Record<string, string> = {
  conjunction: 'intensifying',
  opposition:  'creating tension with',
  trine:       'flowing easily with',
  square:      'creating friction with',
  sextile:     'gently activating',
};

const PLANET_THEMES: Record<string, string> = {
  Sun:     'identity, vitality, core self',
  Moon:    'emotions, needs, inner world',
  Mercury: 'communication, thinking, decisions',
  Venus:   'love, values, pleasure, money',
  Mars:    'drive, anger, desire, action',
  Jupiter: 'growth, luck, expansion, meaning',
  Saturn:  'structure, limits, responsibility, maturity',
  Uranus:  'disruption, freedom, surprise, innovation',
  Neptune: 'dreams, confusion, spirituality, illusion',
  Pluto:   'transformation, power, depth, letting go',
  'North Node': 'fated growth, direction, karmic development',
};

// Export for testing (banned-register guardrail).
export function describeTransitsNarrative(transits: DailyTransits['transits']): string {
  if (transits.length === 0) return 'No transit-to-natal contacts within standard orbs today.';

  // Top 6 most significant transits (already sorted by orb)
  const top = transits.slice(0, 6);
  return top
    .map((t) => {
      const feel = ASPECT_FEEL[t.aspect] ?? t.aspect;
      const themes = PLANET_THEMES[t.transitPlanet] ?? '';
      const natalLabel = t.natalPlanet.charAt(0).toUpperCase() + t.natalPlanet.slice(1);
      const tight = t.orb < 1 ? ' (exact — very strong)' : t.orb < 2 ? ' (tight — strong)' : '';
      return `${t.transitPlanet} (${themes}) is ${feel} their natal ${natalLabel}${tight}`;
    })
    .join('\n');
}

function describeChart(chart: NatalSummary): string {
  const placement = (key: string, label: string) => {
    const p = chart.placementsByKey[key];
    return p ? `${label} in ${p.sign} (House ${p.house})` : null;
  };

  return [
    placement('sun', 'Sun'),
    placement('moon', 'Moon'),
    `Rising (Ascendant) in ${chart.ascendant.sign}`,
    placement('mercury', 'Mercury'),
    placement('venus', 'Venus'),
    placement('mars', 'Mars'),
    placement('jupiter', 'Jupiter'),
    placement('saturn', 'Saturn'),
    placement('uranus', 'Uranus'),
    placement('neptune', 'Neptune'),
    placement('pluto', 'Pluto'),
    placement('northNode', 'North Node'),
    `Midheaven in ${chart.midheaven.sign}`,
  ].filter(Boolean).join('\n');
}

export function buildAstrologyPromptJudgmentSnapshot(judgment: AstrologyJudgment) {
  const leadSignals = [...judgment.foreground, ...judgment.supporting, ...judgment.background]
    .slice(0, 4)
    .map((signal) => ({
      id: signal.id,
      tier: signal.tier,
      scope: signal.scope,
      source: signal.source,
      title: signal.title,
      summary: signal.summary,
      demand: signal.demand,
      lifeAreas: signal.lifeAreas,
      supportNotes: signal.supportNotes.slice(0, 3),
      collectiveBridge: signal.collectiveBridge
        ? {
          event: signal.collectiveBridge.collectiveEvent,
          matchReasons: signal.collectiveBridge.matchReasons,
          bridgeStrengthTier: signal.collectiveBridge.bridgeStrengthTier,
          promoteScopeToBoth: signal.collectiveBridge.promoteScopeToBoth,
        }
        : null,
      receipts: signal.receipts.slice(0, 2).map((receipt) => ({
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
        collectiveBridge: receipt.collectiveBridge
          ? {
            event: receipt.collectiveBridge.collectiveEvent,
            matchReasons: receipt.collectiveBridge.matchReasons,
            bridgeStrengthTier: receipt.collectiveBridge.bridgeStrengthTier,
            promoteScopeToBoth: receipt.collectiveBridge.promoteScopeToBoth,
          }
          : null,
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
      })),
    }));

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
      events: judgment.currentSky.events.slice(0, 4),
      limitations: judgment.currentSky.limitations,
    },
    receipts: judgment.receipts.slice(0, 6).map((receipt) => ({
      transitPlanet: receipt.transitPlanet,
      aspect: receipt.aspect,
      natalTarget: receipt.natalTarget,
      targetLabel: receipt.targetLabel,
      lifeArea: receipt.lifeArea,
      orb: receipt.orb,
      phase: receipt.phase,
      exactDate: receipt.exactDate,
      peakDate: receipt.peakDate,
      memorySummary: receipt.memorySummary,
    })),
  };
}

export function buildSystemPrompt(
  natalChart: NatalSummary,
  dailyTransits: DailyTransits,
  userContext?: string,
  options?: { judgment?: AstrologyJudgment | null },
): string {
  const guidance = interpretTransits(dailyTransits.transits, natalChart);
  const overview = buildTransitOverview(dailyTransits.transits, natalChart);
  const judgmentSnapshot = options?.judgment ? buildAstrologyPromptJudgmentSnapshot(options.judgment) : null;

  const guidanceSummary = guidance
    .map((g) => `${g.title} (${g.intensity} activation, ${g.summary}): ${g.message}`)
    .join('\n');

  return `You are SOS — the Spiritual Operating System. You are this person's intelligent, astrologically-literate friend. Not a guru. Not an oracle. A friend who happens to deeply understand the sky and deeply understands THEM.

HOW YOU TALK:
- Like a close friend who's texting them something real. Warm, direct, occasionally funny.
- You weave astrology in naturally — the way a friend who knows their chart would say "yeah, that's your Pisces Moon doing the thing again" instead of delivering a formal reading.
- Short paragraphs. Conversational rhythm. Not a wall of text.
- Keep the language plain, precise, and adult. Never use poetic or mystical-fog phrasing.
- You ask questions — real ones, not rhetorical. You're curious about them.
- You remember what they told you (from their onboarding and prior context) and reference it naturally.

HOW YOU DON'T TALK:
- No section headers, bullet points, or numbered lists unless truly natural
- No "as a Scorpio Sun, you may find that..." — talk like a person, not a textbook
- No generic wellness advice. Nothing that could appear on a motivational poster.
- Never start with "Hey!" or "Hi there!" — just talk, mid-thought, like a real friend would
- Don't use emojis
- HARD BANNED PHRASES (never use these, ever): "trust the pause", "sit with the stillness", "the sky is quiet today", "the sky is quiet", "the sky is still", "lean into the quiet", "embrace the calm", or any abstract meditation-app register. These are slop. SOS is not slop.

STRUCTURED ASTROLOGY SOURCE OF TRUTH:
- If a STRUCTURED ASTROLOGY JUDGMENT block is present below, treat it as the authoritative astrology context for this turn.
- Use that block's mainStory, practicalDemand, timing, leadSignals, currentSky, and receipts as source-of-truth before you freestyle any astrology language.
- Do not contradict the structured judgment. Do not invent a different dominant transit story from vibe.
- Use natal/transit lines below as supporting detail and plain-language translation help.
- If no structured judgment block is present, fall back normally to the natal chart and today's transit stack.

WHEN TODAY IS LOW-INTENSITY OR CALM:
- Never tell someone "nothing is happening" or "the sky is quiet" — planets are always in conversation.
- Name the actual state concretely: what IS in orb, what's wide, what's separating vs. approaching.
- If today is calm, say so plainly using real astrological terms, then pivot to what's incoming OR why this window is practically useful.
- Example of wrong tone: "The sky is quiet. Trust this pause and rest."
- Example of right tone: "Saturn's square to your Sun is still in orb at 4.2 degrees — it's wide, not pressing today. Jupiter builds into your Venus axis this week."

YOUR FIRST RESPONSE to a journal entry should:
- Acknowledge what they wrote — show you actually read it and felt it
- Connect what's happening in their life to what's happening in the sky TODAY, woven in naturally
- Offer one genuinely useful thought or reframe — something that shifts their perspective
- End with something that invites them to keep talking — a question, a provocation, a "what do you think about..."

IF THEY HAVE PRIOR JOURNAL ENTRIES:
- Reference what they've written before using their actual words. "Yesterday you said you felt like you were drowning" — not "you mentioned some stress."
- Notice patterns across entries: recurring themes, shifting moods, unresolved threads. Name them.
- Connect today's entry to what came before. "Last week you were wrestling with X, and now here you are saying Y — do you see the thread?"
- Don't summarize their history like a therapist reviewing notes. Weave it in naturally, the way a friend who remembers your conversations would.

IN FOLLOW-UP CONVERSATION:
- Be natural. Respond to what they said. Go deeper where they go deeper.
- If they push back, engage honestly — don't just agree.
- Keep the astrological context alive but don't force it into every message.
- You're building a relationship. Act like it.

--- THEIR NATAL CHART ---
${describeChart(natalChart)}

--- TODAY'S TRANSITS (${dailyTransits.date}) ---
${describeTransitsNarrative(dailyTransits.transits)}

--- TODAY'S THEMES ---
Top-line read: ${overview.summary}
${overview.detail}

${guidanceSummary}

${judgmentSnapshot ? `--- STRUCTURED ASTROLOGY JUDGMENT (authoritative when present) ---
${JSON.stringify(judgmentSnapshot, null, 2)}

IMPORTANT: When this block is present, ground the reading in these exact signals, receipts, timing facts, and current-sky events. Use them as the factual astrology backbone and translate them into direct plain language.` : ''}

IMPORTANT: Weave the transit information into your response naturally. Prioritize the dominant transit stack and the actual life area it is hitting in their chart. Instead of "Transit Mars is squaring your natal Saturn," say something like "there's a Mars-Saturn friction in your work and pressure axis right now, so of course everything feels slower and more loaded than it should." Connect the sky to their actual lived experience.

${userContext ? `--- WHAT YOU KNOW ABOUT THEM ---\n${userContext}\n` : ''}
Respond in plain text. No JSON. No markdown headers. Just talk to them.`;
}

