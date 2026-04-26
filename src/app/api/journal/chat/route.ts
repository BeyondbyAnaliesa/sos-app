export const runtime = 'nodejs'; // required for sweph native addon

import OpenAI from 'openai';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { buildSystemPrompt } from '@/lib/prompt';
import { calculateTransitsForDate, calculateTransitsForRange } from '@/lib/astrology/calculate-transits';
import type { NatalChart as RichChart } from '@/lib/astrology/types';
import { buildNatalSummary } from '@/lib/astrology/domain-types';
import {
  buildRecurringTransitContext,
  createJournalLifeSignals,
  ensureDailyTransitMemory,
} from '@/lib/astrology/memory-pipeline';
import { getRelevantTransitMemoryForToday } from '@/lib/astrology/memory-store';
import { buildArcMemorySystemSection } from '@/lib/astrology/pure-fns';
import type { DailyTransits } from '@/lib/astrology/domain-types';
import { extractLifeSignals } from '@/lib/astrology/life-signal-extract';
import { track } from '@/lib/analytics';
import { logError } from '@/lib/logger';
import { consumeAeonTurn, getAeonUsageStatus } from '@/lib/aeon/usage';

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
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { entryText, entryId, message } = body as {
      entryText?: string;
      entryId?: string;
      message?: string;
    };

    const admin = createAdminClient();
    const usageBefore = await getAeonUsageStatus(user.id);

    if (!usageBefore.paid && usageBefore.totalTurnsRemaining <= 0) {
      return new Response('You have used your free Aeon conversations for now. Upgrade to keep going deeper.', {
        status: 402,
        headers: {
          'X-Aeon-Needs-Upgrade': 'true',
          'X-Aeon-Turns-Remaining': '0',
        },
      });
    }

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

      track('journal_entry_created', { userId: user.id, entryId: entry.id });
    }

    if (!resolvedEntryId) {
      return new Response('entryText or entryId is required', { status: 400 });
    }

    // Guard: when entryId is provided by the client (not a just-created entry),
    // verify the entry exists and belongs to this user before proceeding.
    // A valid UUID referencing a non-existent journal_entries row causes a FK
    // constraint violation on the first journal_messages insert, which surfaces
    // as an unguarded 500. This converts it to a clean 404 instead.
    if (entryId && !entryText?.trim()) {
      const { data: entryCheck } = await admin
        .from('journal_entries')
        .select('id')
        .eq('id', resolvedEntryId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!entryCheck) {
        return new Response('Journal entry not found', { status: 404 });
      }
    }

    // --- Load user's chart and context ---
    let userContext: string | undefined;

    const [chartResult, profileResult] = await Promise.all([
      admin.from('natal_charts').select('placements_json, angles_json, houses_json, aspects_json, metadata_json').eq('user_id', user.id).single(),
      admin.from('profiles').select('user_context').eq('id', user.id).single(),
    ]);

    if (profileResult.data?.user_context) {
      userContext = profileResult.data.user_context;
    }

    if (!chartResult.data) {
      return new Response('Complete onboarding to chat with Aeon.', { status: 409 });
    }

    const richChart: RichChart = {
      placements: chartResult.data.placements_json,
      angles:     chartResult.data.angles_json,
      houses:     chartResult.data.houses_json ?? [],
      aspects:    chartResult.data.aspects_json,
      metadata:   chartResult.data.metadata_json,
    };
    const natalSummary = buildNatalSummary(richChart);

    // --- Calculate REAL transits ---
    const today = new Date();
    const todayMemory = await ensureDailyTransitMemory({
      userId: user.id,
      richChart,
      date: today,
      source: 'journal',
    });
    const todayTransits = todayMemory.snapshot;
    const currentExtractedSignals = entryText?.trim() ? extractLifeSignals(entryText.trim()) : [];
    const journalMemoryAudit: Record<string, unknown> = {
      transitDate: todayTransits.date,
      extractedSignalCount: currentExtractedSignals.length,
      extractedSignals: currentExtractedSignals.map((signal) => ({
        text: signal.text,
        signalKind: signal.signalKind,
        lifeDomain: signal.lifeDomain,
        themes: signal.themes,
        emotions: signal.emotions,
        confidence: signal.confidence,
        matchedRuleCount: signal.matchedRuleCount,
      })),
      dailyMemory: {
        snapshotCreated: todayMemory.snapshotCreated,
        activeTransitCount: todayMemory.snapshot.transits.length,
        arcsCreatedOrUpdated: todayMemory.arcsCreatedOrUpdated,
        staleArcCount: todayMemory.staleArcCount,
      },
    };

    const { createdLifeSignalIds } = entryText?.trim()
      ? await createJournalLifeSignals({
        userId: user.id,
        entryId: resolvedEntryId,
        entryText: entryText.trim(),
        snapshot: todayTransits,
        signalTimestamp: today.toISOString(),
      })
      : { createdLifeSignalIds: [] };

    // Compute upcoming 7-day transit range early — used by both the arc peak scan
    // (injected into buildArcMemorySystemSection) and the raw upcomingContext block below.
    // Non-fatal: calculateTransitsForRange is synchronous and pure; no I/O risk.
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const upcomingTransitsForScan: DailyTransits[] = calculateTransitsForRange(tomorrow, 7, richChart);

    // Arc memory context: structured retrieval layer — injected into Aeon system prompt
    // Non-fatal: if this fails, journal flow continues without arc context
    const arcMemory = await getRelevantTransitMemoryForToday(user.id).catch(() => null);
    const arcMemorySection = buildArcMemorySystemSection({
      arcMemory,
      currentSignals: currentExtractedSignals,
      upcomingTransits: upcomingTransitsForScan,
      nowMs: Date.now(),
    });

    const recurringTransitContext = await buildRecurringTransitContext({
      userId: user.id,
      snapshot: todayTransits,
      currentSignals: currentExtractedSignals,
      excludeLifeSignalId: createdLifeSignalIds[0],
    });

    journalMemoryAudit['createdLifeSignalIds'] = createdLifeSignalIds;
    journalMemoryAudit['hasRecurringTransitContext'] = Boolean(recurringTransitContext.trim());

    const recurringContextResultPreview = recurringTransitContext
      .split('--- PRIOR MOMENTS UNDER SIMILAR TRANSITS ---')[1]
      ?.trim()
      ?.slice(0, 1200) ?? '';
    journalMemoryAudit['recurringContextPreview'] = recurringContextResultPreview;

    const journalAuditInsert = await admin.from('journal_messages').insert({
      entry_id: resolvedEntryId,
      role: 'assistant',
      content: `[MEMORY_AUDIT]\n${JSON.stringify(journalMemoryAudit)}`,
    }).select('id').single();

    if (journalAuditInsert.error) {
      throw journalAuditInsert.error;
    }

    const journalAuditEntry = journalAuditInsert.data;
    journalMemoryAudit['journalMessagesAvailable'] = true;

    // Build raw upcoming context string for Aeon — reuses upcomingTransitsForScan
    // (already computed above for the arc peak scan; no second ephemeris call needed).
    let upcomingContext = '';
    {
      const notable = upcomingTransitsForScan
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
    const systemPrompt = buildSystemPrompt(natalSummary, todayTransits, userContext) + arcMemorySection + recurringTransitContext + upcomingContext + priorEntriesContext;

    const existingMessagesResult = await admin
      .from('journal_messages')
      .select('role, content')
      .eq('entry_id', resolvedEntryId)
      .order('created_at', { ascending: true });

    if (existingMessagesResult.error) {
      throw existingMessagesResult.error;
    }

    const existingMessages = existingMessagesResult.data;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (entryText?.trim()) {
      const userMsg = `Date: ${todayTransits.date}\n\nMy journal entry:\n${entryText.trim()}`;
      messages.push({ role: 'user', content: userMsg });

      const userMessageInsert = await admin.from('journal_messages').insert({
        entry_id: resolvedEntryId,
        role:     'user',
        content:  userMsg,
      });

      if (userMessageInsert.error) {
        throw userMessageInsert.error;
      }
    } else if (message?.trim()) {
      if (existingMessages) {
        for (const msg of existingMessages) {
          messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
        }
      }
      messages.push({ role: 'user', content: message.trim() });

      const userMessageInsert = await admin.from('journal_messages').insert({
        entry_id: resolvedEntryId,
        role:     'user',
        content:  message.trim(),
      });

      if (userMessageInsert.error) {
        throw userMessageInsert.error;
      }
    }

    // --- Stream the AI response ---
    const openai = getOpenAIClient();
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

          const assistantInsert = await admin.from('journal_messages').insert({
            entry_id: resolvedEntryId,
            role:     'assistant',
            content:  fullResponse,
          });

          await consumeAeonTurn(user.id);

          if (assistantInsert.error) {
            throw assistantInsert.error;
          }

          if (journalAuditEntry?.id) {
            const auditUpdate = await admin
              .from('journal_messages')
              .update({
                content: `[MEMORY_AUDIT_FINAL]\n${JSON.stringify({
                  ...journalMemoryAudit,
                  responseLength: fullResponse.length,
                })}`,
              })
              .eq('id', journalAuditEntry.id);

            if (auditUpdate.error) {
              throw auditUpdate.error;
            }
          }

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
    logError(err, { route: '/api/journal/chat', userId: undefined });
    return new Response('Something went wrong', { status: 500 });
  }
}
