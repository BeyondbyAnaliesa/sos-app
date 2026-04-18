export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { generateNatalChart } from '@/lib/astrology/generate-chart';
import { geocodeLocation } from '@/lib/astrology/geocode';
import { buildNatalReadingPrompt, type NatalReadingReport } from '@/lib/natal-reading-prompt';

import { find as findTimezone } from 'geo-tz';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Fire-and-forget: generates the deep natal reading in the background
// so it's ready by the time the user finishes onboarding questions.
async function generateNatalReading(userId: string, chart: ReturnType<typeof generateNatalChart>) {
  try {
    const { system, user } = buildNatalReadingPrompt(chart);
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
    console.error('Background natal reading generation failed:', err);
  }
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

    // Geocode location
    const geo = await geocodeLocation(locationText);

    // Parse birth date and time
    const [year, month, day] = birthDate.split('-').map(Number);
    const timeExact = !timeUnknown && !!birthTime;
    const [localHour, localMinute] = timeExact ? birthTime.split(':').map(Number) : [12, 0];

    // Convert local birth time to UT using timezone from coordinates
    const tzNames = findTimezone(geo.latitude, geo.longitude);
    const tz = tzNames[0] ?? 'UTC';

    // Build a Date in the birth timezone to get UTC offset
    // Use Intl to find the UTC offset for that location at that date/time
    const localDateStr = `${birthDate}T${String(localHour).padStart(2, '0')}:${String(localMinute).padStart(2, '0')}:00`;
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });

    // Create a date object interpreting the local time in the birth timezone
    // by finding the offset and adjusting
    const testDate = new Date(localDateStr + 'Z'); // treat as UTC first
    const parts = formatter.formatToParts(testDate);
    const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value ?? 'GMT';
    // Parse offset like "GMT-8" or "GMT-7:30" or "GMT+5:30"
    const offsetMatch = offsetPart.match(/GMT([+-]?)(\d+)(?::(\d+))?/);
    let offsetHours = 0;
    if (offsetMatch) {
      const sign = offsetMatch[1] === '-' ? -1 : 1;
      offsetHours = sign * (parseInt(offsetMatch[2]) + (parseInt(offsetMatch[3] || '0') / 60));
    }

    // UT = local time - UTC offset
    // e.g., 18:42 PST (UTC-8): UT = 18.7 - (-8) = 26.7 = 2.7 next day
    let utHourDecimal = (localHour + localMinute / 60) - offsetHours;
    let utYear = year, utMonth = month, utDay = day;

    if (utHourDecimal >= 24) {
      utHourDecimal -= 24;
      // Advance one day
      const d = new Date(Date.UTC(year, month - 1, day + 1));
      utYear = d.getUTCFullYear();
      utMonth = d.getUTCMonth() + 1;
      utDay = d.getUTCDate();
    } else if (utHourDecimal < 0) {
      utHourDecimal += 24;
      // Go back one day
      const d = new Date(Date.UTC(year, month - 1, day - 1));
      utYear = d.getUTCFullYear();
      utMonth = d.getUTCMonth() + 1;
      utDay = d.getUTCDate();
    }

    const utHour = Math.floor(utHourDecimal);
    const utMinute = Math.round((utHourDecimal - utHour) * 60);

    // Generate natal chart with UT values
    const chart = generateNatalChart({
      year: utYear, month: utMonth, day: utDay, hour: utHour, minute: utMinute,
      latitude:  geo.latitude,
      longitude: geo.longitude,
      timeExact,
    });

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
