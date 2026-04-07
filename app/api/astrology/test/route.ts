import { NextResponse } from 'next/server';
import { getTestNatalChart } from '@/lib/astrology/sweph';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(getTestNatalChart());
}
