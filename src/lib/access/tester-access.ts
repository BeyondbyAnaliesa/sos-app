import { createHash, timingSafeEqual } from 'crypto';

export const TESTER_ACCESS_PRICE_ID = 'tester_access';

function configuredCodes(): string[] {
  return (process.env.SOS_TESTER_ACCESS_CODES ?? '')
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean);
}

function safeEqual(a: string, b: string): boolean {
  const aHash = createHash('sha256').update(a).digest();
  const bHash = createHash('sha256').update(b).digest();
  return timingSafeEqual(aHash, bHash);
}

export function testerAccessConfigured(): boolean {
  return configuredCodes().length > 0;
}

export function isValidTesterAccessCode(input: string | null | undefined): boolean {
  const normalized = input?.trim();
  if (!normalized) return false;
  return configuredCodes().some((code) => safeEqual(normalized, code));
}
