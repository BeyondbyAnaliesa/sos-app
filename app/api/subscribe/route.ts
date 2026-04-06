import { NextRequest, NextResponse } from 'next/server';

const PUBLICATION_ID = 'pub_3612b1a3-a844-4d81-aa24-e8ffe68a1fc6';
const inflightRequests = new Map<string, Promise<Response>>();

function jsonResponse(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return jsonResponse(400, { error: 'Invalid email' });
  }

  const apiKey = process.env.BEEHIIV_API_KEY;
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID || PUBLICATION_ID;
  const idempotencyKey = req.headers.get('x-idempotency-key')?.trim().toLowerCase() || normalizedEmail;

  if (!apiKey || !publicationId) {
    return jsonResponse(500, { error: 'Server config error' });
  }

  const existingRequest = inflightRequests.get(idempotencyKey);
  if (existingRequest) {
    return existingRequest;
  }

  const beehiivRequest = fetch(
    `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        email: normalizedEmail,
        reactivate_existing: false,
        send_welcome_email: true,
      }),
    }
  ).then(async (res) => {
    if (res.ok) {
      return jsonResponse(200, { ok: true });
    }

    const bodyText = await res.text();
    const duplicateSubscription =
      res.status === 400 && /already|exists|duplicate|subscribed/i.test(bodyText);

    if (duplicateSubscription) {
      return jsonResponse(200, { ok: true, duplicate: true });
    }

    console.error('Beehiiv error:', res.status, bodyText);
    return jsonResponse(502, { error: 'Subscription failed' });
  }).finally(() => {
    inflightRequests.delete(idempotencyKey);
  });

  inflightRequests.set(idempotencyKey, beehiivRequest);
  return beehiivRequest;
}
