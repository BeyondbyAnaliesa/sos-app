export const runtime = 'nodejs'; // required for sweph native addon

import OpenAI from 'openai';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { buildSystemPrompt } from '@/lib/prompt';
import { toSimpleChart } from '@/lib/astrology/transform';
import { calculateTransitsForDate, calculateTransitsForRange } from '@/lib/astrology/calculate-transits';
import type { NatalChart as RichChart } from '@/lib/astrology/types';
import { mockNatalChart } from '@/data/natal-chart';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { entryText, entryId, message } = body as {
      entryText?: string;
      entryId?: string;
      message?: string;
    };

    const admin = createAdminClient();

    // --- Resolve or create journal entry ---
    let resolvedEntryId = entryId;

    if (entryText?.trim()) {
      const { data: entry, error } = await admin
        .from('journal_entries')
        .insert({
          user_id:    user.id,
          entry_text: entryText.trim(),
          entry_date: new Date().toISOString().split('T')[0],
        })
        .select('id')
        .single();

      if (error || !entry) {
        return new Response('Failed to save entry', { status: 500 });
      }
      resolvedEntryId = entry.id;
    }

    if (!resolvedEntryId) {
      return new Response('entryText or entryId is required', { status: 400 });
    }

    // --- Load user's chart and context ---
    let simpleChart = mockNatalChart;
    let richChart: RichChart | null = null;
    let userContext: string | undefined;

    const [chartResult, profileResult] = await Promise.all([
      admin.from('natal_charts').select('placements_json, angles_json, houses_json, aspects_json, metadata_json').eq('user_id', user.id).single(),
      admin.from('profiles').select('user_context').eq('id', user.id).single(),
    ]);

    if (chartResult.data) {
      richChart = {
        placements: chartResult.data.placements_json,
        angles:     chartResult.data.angles_json,
        houses:     chartResult.data.houses_json ?? [],
        aspects:    chartResult.data.aspects_json,
        metadata:   chartResult.data.metadata_json,
      };
      simpleChart = toSimpleChart(richChart);
    }
    if (profileResult.data?.user_context) {
      userContext = profileResult.data.user_context;
    }

    // --- Calculate REAL transits ---
    const today = new Date();
    const todayTransits = richChart
      ? calculateTransitsForDate(today, richChart)
      : { date: today.toISOString().split('T')[0], transits: [] };

    // Calculate upcoming 7 days for future awareness
    let upcomingContext = '';
    if (richChart) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const upcoming = calculateTransitsForRange(tomorrow, 7, richChart);

      const notable = upcoming
        .filter((d) => d.transits.length > 0)
        .map((d) => {
          const top = d.transits
            .slice(0, 3)
            .map((t) => `${t.transitPlanet} ${t.aspect} natal ${t.natalPlanet} (orb ${t.orb}°)`)
            .join(', ');
          return `${d.date}: ${top}`;
        });

      if (notable.length > 0) {
        upcomingContext = `\n\n--- UPCOMING TRANSITS (next 7 days) ---\n${notable.join('\n')}`;
      }
    }

    // --- Fetch recent prior journal entries for Day 2+ callback ---
    let priorEntriesContext = '';
    const { data: recentEntries } = await admin
      .from('journal_entries')
      .select('entry_text, entry_date')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false })
      .limit(7);

    if (recentEntries && recentEntries.length > 0) {
      // Exclude today's entry if it's the one we just created
      const todayStr = new Date().toISOString().split('T')[0];
      const prior = recentEntries.filter((e: { entry_text: string; entry_date: string }) => {
        // If we just created an entry, skip it (it's the current one)
        if (e.entry_date === todayStr && e.entry_text.trim() === entryText?.trim()) return false;
        return true;
      });

      if (prior.length > 0) {
        const formatted = prior
          .slice(0, 5) // max 5 prior entries for context window
          .map((e: { entry_text: string; entry_date: string }) => {
            const d = new Date(`${e.entry_date}T12:00:00`);
            const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
            return `[${label}]\n${e.entry_text.trim()}`;
          })
          .join('\n\n');

        priorEntriesContext = `\n\n--- THEIR RECENT JOURNAL ENTRIES ---\nThese are entries they wrote previously. Reference specific things they said — their words, themes, patterns you notice across entries. This is how you show you remember them.\n\n${formatted}`;
      }
    }

    // --- Build conversation ---
    const systemPrompt = buildSystemPrompt(simpleChart, todayTransits, userContext) + upcomingContext + priorEntriesContext;

    const { data: existingMessages } = await admin
      .from('journal_messages')
      .select('role, content')
      .eq('entry_id', resolvedEntryId)
      .order('created_at', { ascending: true });

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (entryText?.trim()) {
      const userMsg = `Date: ${todayTransits.date}\n\nMy journal entry:\n${entryText.trim()}`;
      messages.push({ role: 'user', content: userMsg });

      await admin.from('journal_messages').insert({
        entry_id: resolvedEntryId,
        role:     'user',
        content:  userMsg,
      });
    } else if (message?.trim()) {
      if (existingMessages) {
        for (const msg of existingMessages) {
          messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
        }
      }
      messages.push({ role: 'user', content: message.trim() });

      await admin.from('journal_messages').insert({
        entry_id: resolvedEntryId,
        role:     'user',
        content:  message.trim(),
      });
    }

    // --- Stream the AI response ---
    const stream = await openai.chat.completions.create({
      model:    'gpt-4o',
      messages,
      stream:   true,
    });

    let fullResponse = '';
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? '';
            if (text) {
              fullResponse += text;
              controller.enqueue(encoder.encode(text));
            }
          }

          await admin.from('journal_messages').insert({
            entry_id: resolvedEntryId,
            role:     'assistant',
            content:  fullResponse,
          });

          controller.close();
        } catch (err) {
          console.error('Stream error:', err);
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Entry-Id':   resolvedEntryId,
      },
    });
  } catch (err) {
    console.error('Journal chat error:', err);
    return new Response('Something went wrong', { status: 500 });
  }
}
