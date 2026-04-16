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
      <h2 className="mb-2 text-xl font-light tracking-wide text-white">
        When and where were you born?
      </h2>
      <p className="mb-8 text-sm text-zinc-500">
        Your birth data is the foundation of your chart. The more precise, the
        more accurate your reading.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-widest text-zinc-600">
            Birth Date
          </label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
            className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm text-zinc-200 focus:border-white/[0.15] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-zinc-600">
            <span>Birth Time</span>
            <button
              type="button"
              onClick={() => setTimeUnknown(!timeUnknown)}
              className={`text-[10px] normal-case tracking-normal ${timeUnknown ? 'text-violet-400' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              {timeUnknown ? '✓ Unknown' : "I don't know"}
            </button>
          </label>
          {!timeUnknown && (
            <input
              type="time"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm text-zinc-200 focus:border-white/[0.15] focus:outline-none"
            />
          )}
          {timeUnknown && (
            <p className="rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 text-xs text-zinc-500">
              We will use noon as a default. Your rising sign may be less
              precise, but everything else will be accurate.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-widest text-zinc-600">
            Birth Location
          </label>
          <input
            type="text"
            placeholder="City, State/Country"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            required
            className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-white/[0.15] focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={!ready || loading}
          className="w-full rounded-xl border border-white/[0.07] bg-white/[0.05] py-3 text-xs font-semibold uppercase tracking-widest text-zinc-300 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? 'Reading your stars…' : 'Generate My Chart'}
        </button>
      </form>
    </div>
  );
}
