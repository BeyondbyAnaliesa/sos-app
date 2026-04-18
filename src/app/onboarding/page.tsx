'use client';

import { useState, useEffect, useCallback } from 'react';
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
      setChartSummary(data.summary);
      setStep(2);
      saveProgress(2, answers, data.summary);
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
    try {
      const res = await fetch('/api/onboarding/complete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReport(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
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
        <div className="py-20 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">Building your first reading…</p>
          <p className="mt-2 text-xs text-[var(--color-text-muted)] opacity-60">
            This takes a moment. SOS is synthesizing your chart and your answers.
          </p>
        </div>
      )}

      {step === 11 && report && (
        <ReportStep report={report} onEnter={() => router.push('/')} />
      )}
    </main>
  );
}
