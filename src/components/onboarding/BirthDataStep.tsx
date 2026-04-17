'use client';

import { useState } from 'react';

export interface BirthDataValues {
  birthDate: string;
  birthTime: string;
  timeUnknown: boolean;
  locationText: string;
}

interface Props {
  onSubmit: (values: BirthDataValues) => void;
  loading: boolean;
}

export default function BirthDataStep({ onSubmit, loading }: Props) {
  const [birthDate, setBirthDate]       = useState('');
  const [birthTime, setBirthTime]       = useState('');
  const [timeUnknown, setTimeUnknown]   = useState(false);
  const [locationText, setLocationText] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ birthDate, birthTime, timeUnknown, locationText });
  }

  const ready = birthDate && locationText && (timeUnknown || birthTime);

  return (
    <div>
      <h2 className="mb-2 text-xl font-light tracking-wide text-[var(--color-text)]">
        When and where were you born?
      </h2>
      <p className="mb-8 text-sm text-[var(--color-text-muted)]">
        Your birth data is the foundation of your chart. The more precise, the
        more accurate your reading.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
            Birth Date
          </label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
            className="h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-input)] px-4 text-base text-[var(--color-text)] focus:border-[var(--color-border)] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
            <span>Birth Time</span>
            <button
              type="button"
              onClick={() => setTimeUnknown(!timeUnknown)}
              className={`text-[10px] normal-case tracking-normal ${timeUnknown ? 'text-[var(--color-copper)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-copper)]'}`}
            >
              {timeUnknown ? '✓ Unknown' : "I don't know"}
            </button>
          </label>
          {!timeUnknown && (
            <input
              type="time"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              className="h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-input)] px-4 text-base text-[var(--color-text)] focus:border-[var(--color-border)] focus:outline-none"
            />
          )}
          {timeUnknown && (
            <p className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 py-3 text-xs text-[var(--color-text-muted)]">
              We will use noon as a default. Your rising sign may be less
              precise, but everything else will be accurate.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
            Birth Location
          </label>
          <input
            type="text"
            placeholder="City, State/Country"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            required
            className="h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-input)] px-4 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border)] focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={!ready || loading}
          className="h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-sm font-medium uppercase tracking-widest text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? 'Reading your stars…' : 'Generate My Chart'}
        </button>
      </form>
    </div>
  );
}
