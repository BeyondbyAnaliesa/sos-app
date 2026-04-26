import { NextResponse } from 'next/server';
import { searchLocations } from '@/lib/astrology/geocode';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() ?? '';

    if (query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchLocations(query, 5);
    return NextResponse.json({ results });
  } catch (err) {
    console.error('Location search error:', err);
    const message = err instanceof Error ? err.message : 'Location search failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
