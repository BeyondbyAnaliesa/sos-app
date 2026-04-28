export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { generateNatalChart } from '@/lib/astrology/generate-chart';
import { geocodeLocation } from '@/lib/astrology/geocode';
import { buildNatalReadingPrompt, type NatalReadingReport } from '@/lib/natal-reading-prompt';

import { find as findTimezone } from 'geo-tz';

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Fire-and-forget: generates the deep natal reading in the background
// so it's ready by the time the user finishes onboarding questions.
async function generateNatalReading(userId: string, chart: ReturnType<typeof generateNatalChart>, attempt = 0) {
  try {
    const { system, user } = buildNatalReadingPrompt(chart);
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: user },
      ],
    });

    const raw = completion.choices[0].message.content ?? '{}';
    const reading = JSON.parse(raw) as NatalReadingReport;

    const admin = createAdminClient();
    await admin.from('natal_readings').upsert({
      user_id:        userId,
      reading_json:   reading,
      model:          'gpt-4o',
      prompt_version: 'v1',
    }, { onConflict: 'user_id' });
  } catch (err) {
    console.error(`Background natal reading generation failed (attempt ${attempt + 1}):`, err);
    if (attempt < 2) {
      await new Promise(r => setTimeout(r, 3000));
      return generateNatalReading(userId, chart, attempt + 1);
    }
  }
}

// Shared helper: converts stored birth data (with saved lat/lng) into params for
// generateNatalChart. Used by both the onboarding POST and the regen PATCH so the
// UT conversion logic is never duplicated.
export function buildChartParamsFromBirthData(birthData: {
  birth_date: string;
  time_exact: boolean;
  time_value: string | null;
  latitude: number;
  longitude: number;
}): Parameters<typeof generateNatalChart>[0] {
  const { birth_date, time_exact, time_value, latitude, longitude } = birthData;

  const [year, month, day] = birth_date.split('-').map(Number);
  const [localHour, localMinute] = time_exact && time_value
    ? time_value.split(':').map(Number)
    : [12, 0];

  const tzNames = findTimezone(latitude, longitude);
  const tz = tzNames[0] ?? 'UTC';

  const localDateStr = `${birth_date}T${String(localHour).padStart(2, '0')}:${String(localMinute).padStart(2, '0')}:00`;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'shortOffset',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });

  const testDate = new Date(localDateStr + 'Z');
  const parts = formatter.formatToParts(testDate);
  const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value ?? 'GMT';
  const offsetMatch = offsetPart.match(/GMT([+-]?)(\d+)(?::(\d+))?/);
  let offsetHours = 0;
  if (offsetMatch) {
    const sign = offsetMatch[1] === '-' ? -1 : 1;
    offsetHours = sign * (parseInt(offsetMatch[2]) + (parseInt(offsetMatch[3] || '0') / 60));
  }

  let utHourDecimal = (localHour + localMinute / 60) - offsetHours;
  let utYear = year, utMonth = month, utDay = day;

  if (utHourDecimal >= 24) {
    utHourDecimal -= 24;
    const d = new Date(Date.UTC(year, month - 1, day + 1));
    utYear = d.getUTCFullYear();
    utMonth = d.getUTCMonth() + 1;
    utDay = d.getUTCDate();
  } else if (utHourDecimal < 0) {
    utHourDecimal += 24;
    const d = new Date(Date.UTC(year, month - 1, day - 1));
    utYear = d.getUTCFullYear();
    utMonth = d.getUTCMonth() + 1;
    utDay = d.getUTCDate();
  }

  const utHour = Math.floor(utHourDecimal);
  const utMinute = Math.round((utHourDecimal - utHour) * 60);

  return {
    year: utYear, month: utMonth, day: utDay,
    hour: utHour, minute: utMinute,
    latitude,
    longitude,
    timeExact: time_exact,
  };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { birthDate, birthTime, timeUnknown, locationText } = await request.json();

    if (!birthDate || !locationText) {
      return NextResponse.json({ error: 'birthDate and locationText are required' }, { status: 400 });
    }

    // Reject future birth dates — a future date produces a meaningless chart.
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (birthDate > todayStr) {
      return NextResponse.json({ error: 'Birth date cannot be in the future.' }, { status: 400 });
    }

    // Geocode location
    const geo = await geocodeLocation(locationText);

    // Parse birth date and time
    const timeExact = !timeUnknown && !!birthTime;

    // Build chart params using the shared helper (geo values from fresh geocode)
    const chartParams = buildChartParamsFromBirthData({
      birth_date: birthDate,
      time_exact: timeExact,
      time_value: timeExact ? birthTime : null,
      latitude:   geo.latitude,
      longitude:  geo.longitude,
    });

    // Generate natal chart with UT values
    const chart = generateNatalChart(chartParams);

    // Save birth data and chart
    const admin = createAdminClient();

    await admin.from('birth_data').upsert({
      user_id:       user.id,
      birth_date:    birthDate,
      time_exact:    timeExact,
      time_value:    timeExact ? birthTime : null,
      location_text: locationText,
      latitude:      geo.latitude,
      longitude:     geo.longitude,
    }, { onConflict: 'user_id' });

    await admin.from('natal_charts').upsert({
      user_id:         user.id,
      placements_json: chart.placements,
      angles_json:     chart.angles,
      houses_json:     chart.houses,
      aspects_json:    chart.aspects,
      metadata_json:   chart.metadata,
    }, { onConflict: 'user_id' });

    // Fire off the deep natal reading in the background — don't block the user
    generateNatalReading(user.id, chart);

    // Return summary for the chart reveal step
    const sun    = chart.placements.find((p) => p.key === 'sun')!;
    const moon   = chart.placements.find((p) => p.key === 'moon')!;
    const rising = chart.angles.ascendant;

    return NextResponse.json({
      summary: {
        sun:    { sign: sun.sign,    degree: sun.degree    },
        moon:   { sign: moon.sign,   degree: moon.degree   },
        rising: { sign: rising.sign, degree: rising.degree },
      },
      location: geo.displayName,
    });
  } catch (err) {
    console.error('Chart generation error:', err);
    const message = err instanceof Error ? err.message : 'Something went wrong';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/onboarding/chart
//
// Regenerates the natal chart for the current user using stored birth data.
// Does not require re-entering birth information.
//
// Idempotent: if the chart columns are already valid, returns success immediately.
// Returns { error: 'needs-onboarding' } with status 422 if no birth data is on file.
//
// Used by /chart-error when a user has a corrupted natal_charts row (null columns).
export async function PATCH() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    // Check if the chart is already valid — idempotent fast path.
    const { data: existingChart } = await admin
      .from('natal_charts')
      .select('placements_json, angles_json')
      .eq('user_id', user.id)
      .single();

    if (existingChart?.placements_json && existingChart?.angles_json) {
      return NextResponse.json({ success: true, alreadyValid: true });
    }

    // Load stored birth data — if absent, the user must complete onboarding.
    const { data: birthData } = await admin
      .from('birth_data')
      .select('birth_date, time_exact, time_value, latitude, longitude')
      .eq('user_id', user.id)
      .single();

    if (!birthData || !birthData.birth_date || birthData.latitude == null || birthData.longitude == null) {
      return NextResponse.json({ error: 'needs-onboarding' }, { status: 422 });
    }

    // Regenerate chart using stored birth data. Reuses the shared UT-conversion helper —
    // same computation path as the original onboarding POST; no parallel chart logic.
    const chartParams = buildChartParamsFromBirthData({
      birth_date:  birthData.birth_date,
      time_exact:  birthData.time_exact ?? false,
      time_value:  birthData.time_value ?? null,
      latitude:    birthData.latitude,
      longitude:   birthData.longitude,
    });

    const chart = generateNatalChart(chartParams);

    await admin.from('natal_charts').upsert({
      user_id:         user.id,
      placements_json: chart.placements,
      angles_json:     chart.angles,
      houses_json:     chart.houses,
      aspects_json:    chart.aspects,
      metadata_json:   chart.metadata,
    }, { onConflict: 'user_id' });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Chart regeneration error:', err);
    const message = err instanceof Error ? err.message : 'Something went wrong';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
