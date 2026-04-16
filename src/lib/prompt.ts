import type { NatalChart } from '@/data/natal-chart';
import type { DailyTransits } from '@/data/transits';
import { interpretTransits } from '@/lib/interpret';

function describeTransits(transits: DailyTransits['transits']): string {
  return transits
    .map((t) => `${t.transitPlanet} ${t.aspect} natal ${t.natalPlanet} (orb ${t.orb}°)`)
    .join(', ');
}

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
};

function describeTransitsNarrative(transits: DailyTransits['transits']): string {
  if (transits.length === 0) return 'A quiet sky today — no major planetary activations.';

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

function describeChart(chart: NatalChart): string {
  return [
    `Sun in ${chart.sun.sign} (House ${chart.sun.house})`,
    `Moon in ${chart.moon.sign} (House ${chart.moon.house})`,
    `Rising (Ascendant) in ${chart.ascendant.sign}`,
    `Mercury in ${chart.mercury.sign} (House ${chart.mercury.house})`,
    `Venus in ${chart.venus.sign} (House ${chart.venus.house})`,
    `Mars in ${chart.mars.sign} (House ${chart.mars.house})`,
    `Jupiter in ${chart.jupiter.sign} (House ${chart.jupiter.house})`,
    `Saturn in ${chart.saturn.sign} (House ${chart.saturn.house})`,
  ].join('\n');
}

export function buildSystemPrompt(
  natalChart: NatalChart,
  dailyTransits: DailyTransits,
  userContext?: string,
): string {
  const guidance = interpretTransits(dailyTransits.transits, natalChart);

  const guidanceSummary = guidance
    .map((g) => `${g.title} (${g.intensity} activation): ${g.message}`)
    .join('\n');

  return `You are SOS — the Spiritual Operating System. You are this person's intelligent, astrologically-literate friend. Not a guru. Not an oracle. A friend who happens to deeply understand the sky and deeply understands THEM.

HOW YOU TALK:
- Like a close friend who's texting them something real. Warm, direct, occasionally funny.
- You weave astrology in naturally — the way a friend who knows their chart would say "yeah, that's your Pisces Moon doing the thing again" instead of delivering a formal reading.
- Short paragraphs. Conversational rhythm. Not a wall of text.
- You can be poetic when the moment calls for it, but never performatively spiritual.
- You ask questions — real ones, not rhetorical. You're curious about them.
- You remember what they told you (from their onboarding and prior context) and reference it naturally.

HOW YOU DON'T TALK:
- No section headers, bullet points, or numbered lists unless truly natural
- No "as a Scorpio Sun, you may find that..." — talk like a person, not a textbook
- No generic wellness advice. Nothing that could appear on a motivational poster.
- Never start with "Hey!" or "Hi there!" — just talk, mid-thought, like a real friend would
- Don't use emojis

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
${guidanceSummary}

IMPORTANT: Weave the transit information into your response naturally. Instead of "Transit Mars is squaring your natal Saturn," say something like "there's a Mars-Saturn friction in your sky right now — that restless, hemmed-in feeling you're describing makes total sense." Connect the sky to their actual lived experience.

${userContext ? `--- WHAT YOU KNOW ABOUT THEM ---\n${userContext}\n` : ''}
Respond in plain text. No JSON. No markdown headers. Just talk to them.`;
}

