export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { buildOnboardingReportPrompt, type OnboardingReport } from '@/lib/onboarding-prompt';
import type { NatalChart } from '@/lib/astrology/types';
import { track } from '@/lib/analytics';
import { logError } from '@/lib/logger';

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { answers } = await request.json() as { answers: Record<string, string> };
    if (!answers || Object.keys(answers).length < 8) {
      return NextResponse.json({ error: 'All questions must be answered' }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Save onboarding responses
    const responseRows = Object.entries(answers).map(([question_key, response_text]) => ({
      user_id: user.id,
      question_key,
      response_text,
    }));
    const { error: responsesError } = await admin.from('onboarding_responses').upsert(responseRows, {
      onConflict: 'user_id,question_key',
    });
    if (responsesError) throw responsesError;

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

    const openai = getOpenAIClient();
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
    const { error: reportError } = await admin.from('onboarding_reports').upsert({
      user_id:        user.id,
      report_json:    report,
      model:          'gpt-4o',
      prompt_version: 'v2-aeon-bridge',
    }, { onConflict: 'user_id' });
    if (reportError) throw reportError;

    // 5. Build initial user context summary
    const contextParts = Object.entries(answers).map(
      ([key, val]) => `[${key}]: ${val}`,
    );
    const userContext = contextParts.join('\n\n');
    const { error: profileError } = await admin
      .from('profiles')
      .update({ onboarding_complete: true, user_context: userContext })
      .eq('id', user.id);
    if (profileError) throw profileError;

    // 6. Update user metadata so middleware knows onboarding is done
    const { error: metadataError } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { onboarding_complete: true },
    });
    if (metadataError) throw metadataError;

    track('onboarding_complete', { userId: user.id, questionCount: Object.keys(answers).length });

    return NextResponse.json({ report });
  } catch (err) {
    logError(err, { route: '/api/onboarding/complete' });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
