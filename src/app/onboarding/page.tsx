'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProgressBar from '@/components/onboarding/ProgressBar';
import WelcomeStep from '@/components/onboarding/WelcomeStep';
import BirthDataStep, { type BirthDataValues } from '@/components/onboarding/BirthDataStep';
import ChartRevealStep from '@/components/onboarding/ChartRevealStep';
import QuestionStep from '@/components/onboarding/QuestionStep';
import ReportStep from '@/components/onboarding/ReportStep';
import { ONBOARDING_QUESTIONS } from '@/data/onboarding-questions';
import type { OnboardingReport } from '@/lib/onboarding-prompt';

type ChartSummary = {
  sun:    { sign: string; degree: number };
  moon:   { sign: string; degree: number };
  rising: { sign: string; degree: number };
  location?: string;
};

const STORAGE_KEY = 'sos-onboarding-progress';

function loadProgress(): { step: number; answers: Record<string, string>; chartSummary: ChartSummary | null } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveProgress(step: number, answers: Record<string, string>, chartSummary: ChartSummary | null) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, answers, chartSummary }));
  } catch { /* storage full or unavailable */ }
}

function clearProgress() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

function ReadingLoader() {
  return (
    <div className="py-20 text-center">
      <div className="mx-auto mb-6 flex items-center justify-center gap-3">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-electric)]/40">
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--color-electric)] animate-spin" />
          <span className="text-lg text-[var(--color-electric)] animate-pulse">✦</span>
        </div>
        <div className="flex gap-1 text-[var(--color-electric)]">
          <span className="animate-bounce [animation-delay:-0.3s]">✦</span>
          <span className="animate-bounce [animation-delay:-0.15s]">✦</span>
          <span className="animate-bounce">✦</span>
        </div>
      </div>
      <p className="text-sm text-[var(--color-text)]">Building your first reading…</p>
      <p className="mt-2 text-xs text-[var(--color-text-muted)]">
        This usually takes under a minute. SOS is synthesizing your chart and your answers.
      </p>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep]   = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [chartSummary, setChartSummary] = useState<ChartSummary | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [report, setReport]   = useState<OnboardingReport | null>(null);

  // Restore progress on mount
  useEffect(() => {
    const saved = loadProgress();
    if (saved && saved.step >= 2) {
      setStep(saved.step);
      setAnswers(saved.answers);
      setChartSummary(saved.chartSummary);
    }
    setHydrated(true);
  }, []);

  // --- Step 1: Birth data submission ---
  async function handleBirthData(values: BirthDataValues) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/onboarding/chart', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const summary = { ...data.summary, location: data.location };
      setChartSummary(summary);
      setStep(2);
      saveProgress(2, answers, summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate chart');
    } finally {
      setLoading(false);
    }
  }

  // --- Step 10: Complete onboarding ---
  async function handleComplete() {
    setLoading(true);
    setError(null);

    // Retry up to 3 times — handles app-switch/network drops
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch('/api/onboarding/complete', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ answers }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setReport(data.report);
        setLoading(false);
        return;
      } catch (err) {
        if (attempt === 2) {
          setError(err instanceof Error ? err.message : 'Failed to generate report. Please try again.');
          setLoading(false);
        } else {
          // Wait 2 seconds before retry
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }
  }

  // --- Handle question answers ---
  function updateAnswer(key: string, value: string) {
    setAnswers((prev) => {
      const next = { ...prev, [key]: value };
      saveProgress(step, next, chartSummary);
      return next;
    });
  }

  // Determine which question we're on (steps 3–10 map to questions 0–7)
  const questionIndex = step - 3;
  const currentQuestion = ONBOARDING_QUESTIONS[questionIndex];
  const canGoBack = step >= 1 && step <= 10 && !loading;

  function handleBack() {
    if (step <= 0) return;
    const prevStep = step - 1;
    setStep(prevStep);
    saveProgress(prevStep, answers, chartSummary);
  }

  // When the last question is answered, trigger report generation
  function handleQuestionContinue() {
    if (questionIndex < ONBOARDING_QUESTIONS.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      saveProgress(nextStep, answers, chartSummary);
    } else {
      setStep(11);
      clearProgress();
      handleComplete();
    }
  }

  if (!hydrated) {
    return (
      <main className="mx-auto w-full max-w-xl px-5 py-8 sm:px-6 sm:py-10">
        <div className="py-20 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl px-5 py-8 sm:px-6 sm:py-10">
      {step > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={!canGoBack}
            className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)] hover:text-[var(--color-electric)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <span>←</span>
            <span>Back</span>
          </button>
          {step <= 10 && <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Onboarding</span>}
        </div>
      )}

      {step > 0 && <ProgressBar step={step} />}

      {error && (
        <div className="mb-6 rounded-[10px] border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Step 0: Welcome */}
      {step === 0 && <WelcomeStep onBegin={() => setStep(1)} />}

      {/* Step 1: Birth Data */}
      {step === 1 && (
        <BirthDataStep onSubmit={handleBirthData} loading={loading} />
      )}

      {/* Step 2: Chart Reveal */}
      {step === 2 && chartSummary && (
        <ChartRevealStep chart={chartSummary} onContinue={() => setStep(3)} />
      )}

      {/* Step 2 fallback: chartSummary lost (bad localStorage restore — go back to step 1) */}
      {step === 2 && !chartSummary && (
        <div className="py-12 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            Your birth data needs to be entered again.
          </p>
          <button
            type="button"
            onClick={() => { setStep(1); saveProgress(1, answers, null); }}
            className="mt-6 rounded-[10px] border border-[var(--color-border-subtle)] px-6 py-3 text-sm text-[var(--color-copper)] hover:border-[var(--color-copper)]"
          >
            Re-enter birth data
          </button>
        </div>
      )}

      {/* Steps 3–10: Questions (8 questions) */}
      {step >= 3 && step <= 10 && currentQuestion && (
        <QuestionStep
          domain={currentQuestion.domain}
          questionText={currentQuestion.text}
          minChars={currentQuestion.minChars}
          value={answers[currentQuestion.key] ?? ''}
          onChange={(val) => updateAnswer(currentQuestion.key, val)}
          onContinue={handleQuestionContinue}
        />
      )}

      {/* Step 11: Report */}
      {step === 11 && !report && (
        <>
          {loading ? (
            <ReadingLoader />
          ) : (
            <div className="py-20 text-center">
              {!error && <p className="text-sm text-[var(--color-text-muted)]">Ready to generate your reading.</p>}
              {!loading && error && (
                <button
                  onClick={() => { setError(null); handleComplete(); }}
                  className="mt-6 rounded-[10px] border border-[var(--color-border-subtle)] px-6 py-3 text-sm text-[var(--color-copper)] hover:border-[var(--color-copper)]"
                >
                  Try again
                </button>
              )}
            </div>
          )}
        </>
      )}

      {step === 11 && report && (
        <ReportStep report={report} onEnter={() => router.push('/')} />
      )}
    </main>
  );
}
