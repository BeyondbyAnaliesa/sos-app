'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface BirthDataValues {
  birthDate: string;
  birthTime: string;
  timeUnknown: boolean;
  locationText: string;
  latitude?: number;
  longitude?: number;
}

interface LocationSuggestion {
  placeId: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

interface Props {
  onSubmit: (values: BirthDataValues) => void;
  loading: boolean;
}

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const EARLIEST_BIRTH_YEAR = 1900;

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: string, month: string) {
  const monthNumber = Number(month);
  if (!monthNumber) return 31;

  if (monthNumber === 2) {
    const yearNumber = Number(year);
    return yearNumber && isLeapYear(yearNumber) ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(monthNumber) ? 30 : 31;
}

function buildBirthDate(year: string, month: string, day: string) {
  if (!year || !month || !day) return '';
  return `${year}-${month}-${day}`;
}

export default function BirthDataStep({ onSubmit, loading }: Props) {
  const today = new Date();
  const todayIso = today.toISOString().split('T')[0];
  const currentYear = today.getFullYear();
  const yearOptions = useMemo(
    () => Array.from({ length: currentYear - EARLIEST_BIRTH_YEAR + 1 }, (_, i) => String(currentYear - i)),
    [currentYear],
  );

  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay]     = useState('');
  const [birthYear, setBirthYear]   = useState('');
  const birthDate = buildBirthDate(birthYear, birthMonth, birthDay);
  const [birthTime, setBirthTime]       = useState('');
  const [timeUnknown, setTimeUnknown]   = useState(false);
  const [locationText, setLocationText] = useState('');
  const [locationResults, setLocationResults] = useState<LocationSuggestion[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);
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
    onSubmit({
      birthDate,
      birthTime,
      timeUnknown,
      locationText: selectedLocation?.displayName ?? trimmedLocation,
      latitude: selectedLocation?.latitude,
      longitude: selectedLocation?.longitude,
    });
  }

  function handleLocationChange(value: string) {
    setLocationText(value);
    setSelectedPlaceId(null);
    setSelectedLocation(null);
    setLocationError(null);
    if (!value.trim()) {
      setShowDropdown(false);
      setLocationResults([]);
    }
  }

  function handleLocationPick(option: LocationSuggestion) {
    setLocationText(option.displayName);
    setSelectedPlaceId(option.placeId);
    setSelectedLocation(option);
    setLocationResults([]);
    setLocationError(null);
    setShowDropdown(false);
  }

  const maxBirthDay = daysInMonth(birthYear, birthMonth);
  const dayOptions = Array.from({ length: maxBirthDay }, (_, i) => String(i + 1).padStart(2, '0'));
  const birthDateIsFuture = !!birthDate && birthDate > todayIso;
  const ready = birthDate && !birthDateIsFuture && trimmedLocation && (timeUnknown || birthTime) && !needsSelection;

  useEffect(() => {
    if (birthDay && Number(birthDay) > maxBirthDay) {
      setBirthDay('');
    }
  }, [birthDay, maxBirthDay]);

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
          <div className="grid grid-cols-[1.25fr_0.8fr_0.95fr] gap-2">
            <select
              value={birthMonth}
              onChange={(e) => {
                setBirthMonth(e.target.value);
                setBirthDay('');
              }}
              required
              aria-label="Birth month"
              className="h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-input)] px-3 text-base text-[var(--color-text)] focus:border-[var(--color-border)] focus:outline-none"
            >
              <option value="">Month</option>
              {MONTHS.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
            <select
              value={birthDay}
              onChange={(e) => setBirthDay(e.target.value)}
              required
              aria-label="Birth day"
              disabled={!birthMonth}
              className="h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-input)] px-3 text-base text-[var(--color-text)] focus:border-[var(--color-border)] focus:outline-none disabled:opacity-45"
            >
              <option value="">Day</option>
              {dayOptions.map((day) => (
                <option key={day} value={day}>{Number(day)}</option>
              ))}
            </select>
            <select
              value={birthYear}
              onChange={(e) => {
                setBirthYear(e.target.value);
                setBirthDay('');
              }}
              required
              aria-label="Birth year"
              className="h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-input)] px-3 text-base text-[var(--color-text)] focus:border-[var(--color-border)] focus:outline-none"
            >
              <option value="">Year</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            No calendar scrolling — choose month, day, and year directly.
          </p>
          {birthDateIsFuture && (
            <p className="mt-2 text-xs text-red-400">Birth date cannot be in the future.</p>
          )}
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
