import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { generateNatalChart } from '@/lib/astrology/sweph';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  const formData = await request.formData();
  const birthDate = String(formData.get('birthDate') ?? '');
  const birthTime = String(formData.get('birthTime') ?? '');
  const timeUnknown = formData.get('timeUnknown') === 'on';
  const locationText = String(formData.get('locationText') ?? '').trim();

  if (!birthDate || !locationText) {
    return NextResponse.redirect(new URL('/app/onboard?error=Birth%20date%20and%20location%20are%20required.', request.url));
  }

  const geocodeUrl = new URL('https://nominatim.openstreetmap.org/search');
  geocodeUrl.searchParams.set('q', locationText);
  geocodeUrl.searchParams.set('format', 'json');
  geocodeUrl.searchParams.set('limit', '1');

  const geocodeResponse = await fetch(geocodeUrl, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'SOS App Onboarding/1.0',
    },
    cache: 'no-store',
  });

  if (!geocodeResponse.ok) {
    return NextResponse.redirect(new URL('/app/onboard?error=Location%20lookup%20failed.%20Try%20again.', request.url));
  }

  const geocodeResults = (await geocodeResponse.json()) as Array<{ lat: string; lon: string }>;
  const match = geocodeResults[0];

  if (!match) {
    return NextResponse.redirect(new URL('/app/onboard?error=We%20couldn%27t%20find%20that%20birth%20location.', request.url));
  }

  const [year, month, day] = birthDate.split('-').map(Number);
  const [hourValue, minuteValue] = timeUnknown || !birthTime ? [12, 0] : birthTime.split(':').map(Number);
  const latitude = Number(match.lat);
  const longitude = Number(match.lon);

  const chart = generateNatalChart({
    year,
    month,
    day,
    hour: hourValue,
    minute: minuteValue,
    latitude,
    longitude,
    timeExact: !timeUnknown && Boolean(birthTime),
  });

  const birthPayload = {
    user_id: user.id,
    birth_date: birthDate,
    time_exact: !timeUnknown && Boolean(birthTime),
    time_value: !timeUnknown && birthTime ? `${birthTime}:00` : null,
    location_text: locationText,
    lat: latitude,
    lng: longitude,
  };

  const { data: existingBirth } = await supabase
    .from('birth_data')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  const birthMutation = existingBirth
    ? supabase.from('birth_data').update(birthPayload).eq('id', existingBirth.id)
    : supabase.from('birth_data').insert(birthPayload);

  const { error: birthError } = await birthMutation;

  if (birthError) {
    return NextResponse.redirect(new URL(`/app/onboard?error=${encodeURIComponent(birthError.message)}`, request.url));
  }

  const chartPayload = {
    user_id: user.id,
    placements_json: {
      placements: chart.placements,
      angles: chart.angles,
      metadata: chart.metadata,
    },
    aspects_json: chart.aspects,
    generated_at: new Date().toISOString(),
  };

  const { data: existingChart } = await supabase
    .from('natal_charts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  const chartMutation = existingChart
    ? supabase.from('natal_charts').update(chartPayload).eq('id', existingChart.id)
    : supabase.from('natal_charts').insert(chartPayload);

  const { error: chartError } = await chartMutation;

  if (chartError) {
    return NextResponse.redirect(new URL(`/app/onboard?error=${encodeURIComponent(chartError.message)}`, request.url));
  }

  return NextResponse.redirect(new URL('/app', request.url));
}
