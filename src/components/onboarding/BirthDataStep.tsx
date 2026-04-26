'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface BirthDataValues {
  birthDate: string;
  birthTime: string;
  timeUnknown: boolean;
  locationText: string;
}

interface LocationSuggestion {
  placeId: string;
  displayName: string;
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
  const [locationResults, setLocationResults] = useState<LocationSuggestion[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmedLocation = useMemo(() => locationText.trim(), [locationText]);
  const needsSelection = trimmedLocation.length > 1 && !selectedPlaceId;

  useEffect(() => {
    if (selectedPlaceId || trimmedLocation.length < 2) {
      setLocationResults([]);
      setLocationLoading(false);
      if (trimmedLocation.length < 2) {
        setLocationError(null);
      }
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLocationLoading(true);
        setLocationError(null);
        const res = await fetch(`/api/locations/search?q=${encodeURIComponent(trimmedLocation)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Location search failed');
        setLocationResults(data.results ?? []);
        setShowDropdown(true);
        if (!data.results?.length) {
          setLocationError('No matches found yet. Try a nearby city, state, or country spelling.');
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setLocationResults([]);
        setLocationError(err instanceof Error ? err.message : 'Location search failed');
      } finally {
        setLocationLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [trimmedLocation, selectedPlaceId]);

  useEffect(() => () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (needsSelection) {
      setLocationError('Pick your birth place from the dropdown so we use the right coordinates.');
      return;
    }
    onSubmit({ birthDate, birthTime, timeUnknown, locationText: trimmedLocation });
  }

  function handleLocationChange(value: string) {
    setLocationText(value);
    setSelectedPlaceId(null);
    setLocationError(null);
    if (!value.trim()) {
      setShowDropdown(false);
      setLocationResults([]);
    }
  }

  function handleLocationPick(option: LocationSuggestion) {
    setLocationText(option.displayName);
    setSelectedPlaceId(option.placeId);
    setLocationResults([]);
    setLocationError(null);
    setShowDropdown(false);
  }

  const ready = birthDate && trimmedLocation && (timeUnknown || birthTime) && !needsSelection;

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

        <div className="relative">
          <label className="mb-1 block text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
            Birth Location
          </label>
          <input
            type="text"
            placeholder="Start typing a city, state, or country"
            value={locationText}
            onChange={(e) => handleLocationChange(e.target.value)}
            onFocus={() => {
              if (locationResults.length) setShowDropdown(true);
            }}
            onBlur={() => {
              blurTimeoutRef.current = setTimeout(() => setShowDropdown(false), 150);
            }}
            required
            autoComplete="off"
            className="h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-input)] px-4 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border)] focus:outline-none"
          />

          {showDropdown && locationResults.length > 0 && (
            <div className="absolute z-10 mt-2 max-h-64 w-full overflow-y-auto rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-lg">
              {locationResults.map((option) => (
                <button
                  key={option.placeId}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleLocationPick(option)}
                  className="block w-full border-b border-[var(--color-border-subtle)] px-4 py-3 text-left text-sm text-[var(--color-text)] last:border-b-0 hover:bg-[var(--color-input)]"
                >
                  {option.displayName}
                </button>
              ))}
            </div>
          )}

          {!selectedPlaceId && (
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              Choose your place from the dropdown so misspellings don&apos;t send us to the wrong coordinates.
            </p>
          )}
          {selectedPlaceId && (
            <p className="mt-2 text-xs text-[var(--color-copper)]">✓ Location confirmed</p>
          )}
          {(locationLoading || locationError) && (
            <p className={`mt-2 text-xs ${locationError ? 'text-red-400' : 'text-[var(--color-text-muted)]'}`}>
              {locationError ?? 'Finding locations…'}
            </p>
          )}
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
