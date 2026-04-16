export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { generateNatalChart } from '@/lib/astrology/generate-chart';
import { geocodeLocation } from '@/lib/astrology/geocode';
import { buildNatalReadingPrompt, type NatalReadingReport } from '@/lib/natal-reading-prompt';

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
    const [hour, minute] = timeExact ? birthTime.split(':').map(Number) : [12, 0];

    // Generate natal chart
    const chart = generateNatalChart({
      year, month, day, hour, minute,
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
