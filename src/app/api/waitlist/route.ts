import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const BEEHIIV_API_URL = 'https://api.beehiiv.com/v2';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ATTRIBUTION_PATTERN = /^[a-zA-Z0-9._/-]+$/;

type WaitlistRequestBody = {
  email?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
};

function cleanAttribution(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback;

  const trimmed = value.trim().slice(0, 80);

  if (!trimmed || !ATTRIBUTION_PATTERN.test(trimmed)) return fallback;

  return trimmed;
}

export async function POST(request: Request) {
  const apiKey = process.env.BEEHIIV_API_KEY;
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;

  if (!apiKey || !publicationId) {
    console.error('Missing Beehiiv environment variables');
    return NextResponse.json(
      { error: 'Waitlist is temporarily unavailable.' },
      { status: 500 },
    );
  }

  let body: WaitlistRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const response = await fetch(
    `${BEEHIIV_API_URL}/publications/${publicationId}/subscriptions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        reactivate_existing: true,
        send_welcome_email: true,
        utm_source: cleanAttribution(body.utm_source, 'getsos.app'),
        utm_medium: cleanAttribution(body.utm_medium, 'waitlist'),
        utm_campaign: cleanAttribution(body.utm_campaign, 'launch'),
      }),
      cache: 'no-store',
    },
  );

  if (response.ok) {
    return NextResponse.json({ ok: true });
  }

  let beehiivError: { error?: string; errors?: Array<{ message?: string }> } | null = null;

  try {
    beehiivError = await response.json();
  } catch {
    beehiivError = null;
  }

  if (response.status === 400) {
    return NextResponse.json(
      {
        error:
          beehiivError?.errors?.[0]?.message ||
          beehiivError?.error ||
          'That email could not be added.',
      },
      { status: 400 },
    );
  }

  if (response.status === 429) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in a moment.' },
      { status: 429 },
    );
  }

  console.error('Beehiiv subscription failed', {
    status: response.status,
    beehiivError,
  });

  return NextResponse.json(
    { error: 'Something went wrong. Please try again.' },
    { status: 500 },
  );
}
