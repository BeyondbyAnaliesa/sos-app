import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { buildOnboardingReportPrompt, type OnboardingReport } from '@/lib/onboarding-prompt';
import type { NatalChart } from '@/lib/astrology/types';
import { track } from '@/lib/analytics';
import { logError } from '@/lib/logger';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { answers } = await request.json() as { answers: Record<string, string> };
    if (!answers || Object.keys(answers).length < 7) {
      return NextResponse.json({ error: 'All 7 answers are required' }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Save onboarding responses
    const responseRows = Object.entries(answers).map(([question_key, response_text]) => ({
      user_id: user.id,
      question_key,
      response_text,
    }));
    await admin.from('onboarding_responses').upsert(responseRows, {
      onConflict: 'user_id,question_key',
    });

    // 2. Fetch natal chart
    const { data: chartRow } = await admin
      .from('natal_charts')
      .select('placements_json, angles_json, houses_json, aspects_json, metadata_json')
      .eq('user_id', user.id)
      .single();

    if (!chartRow) {
      return NextResponse.json({ error: 'Natal chart not found — complete birth data step first' }, { status: 400 });
    }

    const chart: NatalChart = {
      placements: chartRow.placements_json,
      angles:     chartRow.angles_json,
      houses:     chartRow.houses_json ?? [],
      aspects:    chartRow.aspects_json,
      metadata:   chartRow.metadata_json,
    };

    // 3. Build prompt and call GPT-4o
    const { system, user: userMsg } = buildOnboardingReportPrompt(chart, answers);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: userMsg },
      ],
    });

    const raw = completion.choices[0].message.content ?? '{}';
    const report = JSON.parse(raw) as OnboardingReport;

    // 4. Save report
    await admin.from('onboarding_reports').upsert({
      user_id:        user.id,
      report_json:    report,
      model:          'gpt-4o',
      prompt_version: 'v1',
    }, { onConflict: 'user_id' });

    // 5. Build initial user context summary
    const contextParts = Object.entries(answers).map(
      ([key, val]) => `[${key}]: ${val}`,
    );
    const userContext = contextParts.join('\n\n');
    await admin
      .from('profiles')
      .update({ onboarding_complete: true, user_context: userContext })
      .eq('id', user.id);

    // 6. Update user metadata so middleware knows onboarding is done
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { onboarding_complete: true },
    });

    track('onboarding_complete', { userId: user.id, questionCount: Object.keys(answers).length });

    return NextResponse.json({ report });
  } catch (err) {
    logError(err, { route: '/api/onboarding/complete' });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
