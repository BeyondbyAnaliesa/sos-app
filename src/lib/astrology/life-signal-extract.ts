const THEME_RULES: Array<{ theme: string; patterns: RegExp[] }> = [
  { theme: 'relationships', patterns: [/partner/i, /relationship/i, /him\b/i, /her\b/i, /we\b/i, /us\b/i] },
  { theme: 'money', patterns: [/money/i, /income/i, /paid/i, /pay/i, /debt/i, /bank/i, /client/i] },
  { theme: 'work', patterns: [/work/i, /business/i, /project/i, /launch/i, /meeting/i, /deadline/i] },
  { theme: 'family', patterns: [/daughter/i, /mom\b/i, /mother/i, /dad\b/i, /family/i, /home school/i] },
  { theme: 'health', patterns: [/body/i, /sick/i, /tired/i, /sleep/i, /anxious/i, /panic/i, /chest/i] },
  { theme: 'creativity', patterns: [/write/i, /art/i, /create/i, /design/i, /idea/i, /inspiration/i] },
];

const EMOTION_RULES: Array<{ emotion: string; patterns: RegExp[] }> = [
  { emotion: 'calm', patterns: [/calm/i, /steady/i, /secure/i, /safe/i, /grounded/i] },
  { emotion: 'joy', patterns: [/happy/i, /joy/i, /excited/i, /delighted/i, /grateful/i] },
  { emotion: 'fear', patterns: [/afraid/i, /fear/i, /scared/i, /panic/i, /worried/i, /anxious/i, /nervous/i] },
  { emotion: 'sadness', patterns: [/sad/i, /grief/i, /cry/i, /lonely/i, /heartbroken/i] },
  { emotion: 'anger', patterns: [/angry/i, /furious/i, /resent/i, /mad/i, /irritated/i] },
  { emotion: 'overwhelm', patterns: [/overwhelmed/i, /too much/i, /exhausted/i, /burned out/i, /flooded/i] },
];

const LIFE_DOMAIN_RULES: Array<{ domain: string; patterns: RegExp[] }> = [
  { domain: 'relationships', patterns: [/partner/i, /relationship/i, /dating/i, /marriage/i] },
  { domain: 'money', patterns: [/money/i, /income/i, /bank/i, /paid/i, /price/i] },
  { domain: 'work', patterns: [/work/i, /business/i, /client/i, /project/i, /launch/i] },
  { domain: 'family', patterns: [/daughter/i, /family/i, /mom\b/i, /dad\b/i] },
  { domain: 'health', patterns: [/body/i, /sleep/i, /tired/i, /sick/i, /panic/i] },
];

import type { ExtractedLifeSignal, LifeSignalKind } from './memory-types';

const SIGNAL_KIND_RULES = {
  body: /(chest|stomach|headache|body|tight|tension|shaky|exhausted|tired|nausea|sleep)/i,
  feeling: /(feel|felt|sad|afraid|scared|angry|calm|happy|overwhelmed|lonely|grief|joy)/i,
  thought: /(thinking|thought|keep thinking|I think|I keep telling myself|I wonder|I believe)/i,
  event: /(happened|said|called|texted|met|argued|fought|went|paid|launched|emailed|saw)/i,
} as const;

function uniq(values: string[]) {
  return [...new Set(values)];
}

function findMatches(text: string, rules: Array<{ [key: string]: string | RegExp[] }>, key: string) {
  return rules
    .filter((rule) => (rule.patterns as RegExp[]).some((pattern) => pattern.test(text)))
    .map((rule) => rule[key] as string);
}

function extractEntities(text: string) {
  const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) ?? [];
  return uniq(matches).slice(0, 8);
}

function inferSignalKind(text: string): {
  signalKind: LifeSignalKind;
  kindHits: Array<'body' | 'feeling' | 'thought' | 'event'>;
} {
  const kindHits = (Object.entries(SIGNAL_KIND_RULES) as Array<[
    'body' | 'feeling' | 'thought' | 'event',
    RegExp,
  ]>)
    .filter(([, pattern]) => pattern.test(text))
    .map(([kind]) => kind);

  // Priority-based disambiguation for the two most common 2-kind overlaps:
  // body + feeling → body (somatic signal is more specific than generic emotion label)
  // thought + feeling → thought (cognitive signal is more specific than generic emotion label)
  if (kindHits.length === 2) {
    const set = new Set(kindHits);
    if (set.has('body') && set.has('feeling')) return { signalKind: 'body', kindHits };
    if (set.has('thought') && set.has('feeling')) return { signalKind: 'thought', kindHits };
  }
  if (kindHits.length > 1) return { signalKind: 'mixed', kindHits };
  if (kindHits[0] === 'body') return { signalKind: 'body', kindHits };
  if (kindHits[0] === 'feeling') return { signalKind: 'feeling', kindHits };
  if (kindHits[0] === 'thought') return { signalKind: 'thought', kindHits };
  if (kindHits[0] === 'event') return { signalKind: 'event', kindHits };
  return { signalKind: 'mixed', kindHits };
}

function splitIntoCandidateSignals(text: string) {
  const parts = text.match(/[^.!?\n]+[.!?]?|.+$/g) ?? [text];
  const results: Array<{ text: string; sourceStart: number; sourceEnd: number; sourceIndex: number }> = [];

  let searchFrom = 0;
  for (const rawPart of parts) {
    const trimmed = rawPart.trim();
    if (trimmed.length < 12) continue;

    const start = text.indexOf(trimmed, searchFrom);
    if (start === -1) continue;
    const end = start + trimmed.length;

    results.push({
      text: trimmed,
      sourceStart: start,
      sourceEnd: end,
      sourceIndex: results.length,
    });

    searchFrom = end;
    if (results.length >= 8) break;
  }

  return results;
}

function extractFeatures(text: string) {
  const cleaned = text.trim();

  const themes = uniq(findMatches(cleaned, THEME_RULES, 'theme'));
  const emotions = uniq(findMatches(cleaned, EMOTION_RULES, 'emotion'));
  const domains = uniq(findMatches(cleaned, LIFE_DOMAIN_RULES, 'domain'));
  const entities = extractEntities(cleaned);
  const { signalKind, kindHits } = inferSignalKind(cleaned);
  const matchedRuleCount = themes.length + emotions.length + domains.length + kindHits.length;
  const confidence = Number(Math.min(0.95, 0.2 + matchedRuleCount * 0.12).toFixed(2));

  return {
    signalKind,
    themes,
    emotions,
    entities,
    lifeDomain: domains[0] ?? null,
    confidence,
    matchedRuleCount,
    debug: {
      themeHits: themes,
      emotionHits: emotions,
      domainHits: domains,
      kindHits,
    },
  };
}

export function extractLifeSignalFeatures(text: string) {
  return extractFeatures(text);
}

export function extractLifeSignals(text: string): ExtractedLifeSignal[] {
  const parts = splitIntoCandidateSignals(text);
  const signals = parts
    .map((part) => ({
      ...part,
      ...extractFeatures(part.text),
    }))
    .filter((signal) => signal.text.length > 0);

  if (signals.length === 0) {
    return [{
      text: text.trim(),
      sourceStart: 0,
      sourceEnd: text.trim().length,
      sourceIndex: 0,
      ...extractFeatures(text),
    }];
  }

  return signals;
}
