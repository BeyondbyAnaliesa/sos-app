'use client';

import Image from 'next/image';
import { useId, useMemo, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

export type LifeSignal = 'supportive' | 'cautionary' | 'ambient' | 'quiet';

export interface LifeSegmentData {
  label: string;
  signal: LifeSignal;
}

const SIZE = 360;
const CX = SIZE / 2;
const CY = SIZE / 2;
const ACTIVE_OUTER_R = 163;
const ACTIVE_INNER_R = 58;
const LABEL_BAND_INNER_R = 122;
const LABEL_BAND_OUTER_R = 170;
const LABEL_TEXT_R = 146;
const INNER_RIM_INNER_R = 54;
const INNER_RIM_OUTER_R = 88;
const CORE_BEAM_INNER_R = 70;
const CORE_BEAM_OUTER_R = 150;
const HIT_OUTER_R = 170;
const HIT_INNER_R = 44;
const FULL_TURN = 360;
const START_DEG = -135;

function polar(radius: number, angleDeg: number) {
  const angle = (angleDeg * Math.PI) / 180;
  return {
    x: CX + radius * Math.cos(angle),
    y: CY + radius * Math.sin(angle),
  };
}

function wedgePath(innerR: number, outerR: number, startDeg: number, endDeg: number) {
  const startOuter = polar(outerR, startDeg);
  const endOuter = polar(outerR, endDeg);
  const endInner = polar(innerR, endDeg);
  const startInner = polar(innerR, startDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;

  return [
    `M ${startOuter.x.toFixed(2)} ${startOuter.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${endOuter.x.toFixed(2)} ${endOuter.y.toFixed(2)}`,
    `L ${endInner.x.toFixed(2)} ${endInner.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${startInner.x.toFixed(2)} ${startInner.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function boundaryPath(innerR: number, outerR: number, angleDeg: number) {
  const start = polar(innerR, angleDeg);
  const end = polar(outerR, angleDeg);
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function arcPath(radius: number, startDeg: number, endDeg: number) {
  const start = polar(radius, startDeg);
  const end = polar(radius, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

const SIGNAL_TREATMENT: Record<LifeSignal, { glow: string; rim: string; pink: string; label: string }> = {
  supportive: {
    glow: 'rgba(201,162,122,0.30)',
    rim: 'rgba(201,162,122,0.92)',
    pink: 'rgba(201,162,122,0.62)',
    label: 'rgba(233,198,158,0.94)',
  },
  cautionary: {
    glow: 'rgba(239,68,136,0.30)',
    rim: 'rgba(239,68,136,0.96)',
    pink: 'rgba(239,68,136,0.88)',
    label: 'rgba(255,105,169,0.96)',
  },
  ambient: {
    glow: 'rgba(201,162,122,0.20)',
    rim: 'rgba(201,162,122,0.64)',
    pink: 'rgba(201,162,122,0.42)',
    label: 'rgba(220,184,145,0.78)',
  },
  quiet: {
    glow: 'rgba(201,162,122,0.12)',
    rim: 'rgba(201,162,122,0.42)',
    pink: 'rgba(201,162,122,0.28)',
    label: 'rgba(210,174,136,0.62)',
  },
};

export default function LifeWheel({ segments, defaultActiveIndex = null }: { segments: LifeSegmentData[]; defaultActiveIndex?: number | null }) {
  const ids = useId();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(defaultActiveIndex);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const activeIndex = hoveredIndex ?? focusedIndex ?? selectedIndex;
  const step = FULL_TURN / Math.max(segments.length, 1);

  function selectIndex(index: number) {
    setSelectedIndex(index);
  }

  const geometry = useMemo(
    () =>
      segments.map((segment, index) => {
        const startDeg = START_DEG + index * step;
        const endDeg = startDeg + step;
        const centerDeg = startDeg + step / 2;
        const gradientInner = polar(CORE_BEAM_INNER_R, centerDeg);
        const gradientOuter = polar(LABEL_BAND_OUTER_R, centerDeg);

        return {
          ...segment,
          index,
          startDeg,
          endDeg,
          centerDeg,
          glowPath: wedgePath(ACTIVE_INNER_R, ACTIVE_OUTER_R, startDeg, endDeg),
          coreBeamPath: wedgePath(CORE_BEAM_INNER_R, CORE_BEAM_OUTER_R, startDeg, endDeg),
          labelBandPath: wedgePath(LABEL_BAND_INNER_R, LABEL_BAND_OUTER_R, startDeg, endDeg),
          innerRimPath: wedgePath(INNER_RIM_INNER_R, INNER_RIM_OUTER_R, startDeg, endDeg),
          outerHaloPath: wedgePath(LABEL_BAND_INNER_R - 10, LABEL_BAND_OUTER_R + 8, startDeg, endDeg),
          hitPath: wedgePath(HIT_INNER_R, HIT_OUTER_R, startDeg, endDeg),
          startBoundary: boundaryPath(ACTIVE_INNER_R, ACTIVE_OUTER_R, startDeg),
          endBoundary: boundaryPath(ACTIVE_INNER_R, ACTIVE_OUTER_R, endDeg),
          startInnerBoundary: boundaryPath(ACTIVE_INNER_R, LABEL_BAND_INNER_R - 4, startDeg),
          endInnerBoundary: boundaryPath(ACTIVE_INNER_R, LABEL_BAND_INNER_R - 4, endDeg),
          outerArc: arcPath(LABEL_BAND_OUTER_R - 3, startDeg + 2.5, endDeg - 2.5),
          innerArc: arcPath(INNER_RIM_OUTER_R - 3, startDeg + 4, endDeg - 4),
          labelPoint: polar(LABEL_TEXT_R, centerDeg),
          labelRotation: centerDeg + 90,
          gradientInner,
          gradientOuter,
        };
      }),
    [segments, step],
  );

  const activeSegment = activeIndex == null ? null : geometry[activeIndex];
  const activeTreatment = activeSegment ? SIGNAL_TREATMENT[activeSegment.signal] : null;
  const beamGradientId = activeSegment ? `${ids}-beam-${activeSegment.index}` : null;
  const labelGradientId = activeSegment ? `${ids}-label-${activeSegment.index}` : null;
  const rimGradientId = activeSegment ? `${ids}-rim-${activeSegment.index}` : null;

  function indexFromPointer(event: ReactPointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * SIZE;
    const y = ((event.clientY - rect.top) / rect.height) * SIZE;
    const dx = x - CX;
    const dy = y - CY;
    const radius = Math.sqrt(dx * dx + dy * dy);
    if (radius < HIT_INNER_R || radius > HIT_OUTER_R) return null;

    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const normalized = (angle - START_DEG + FULL_TURN) % FULL_TURN;
    const nextIndex = Math.floor(normalized / step);
    return nextIndex >= 0 && nextIndex < geometry.length ? nextIndex : null;
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    setHoveredIndex(indexFromPointer(event));
  }

  return (
    <div className="mx-auto w-full max-w-[380px]">
      <div className="relative aspect-square w-full overflow-visible rounded-full drop-shadow-[0_24px_58px_rgba(0,0,0,0.46)]">
        <div className="absolute inset-[-10%] rounded-full bg-[radial-gradient(circle,rgba(201,162,122,0.12),transparent_58%)] blur-xl" />

        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full"
        >
          <defs>
            <filter id={`${ids}-underGlow`} x="-90%" y="-90%" width="280%" height="280%">
              <feGaussianBlur stdDeviation="14" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id={`${ids}-beamGlow`} x="-90%" y="-90%" width="280%" height="280%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id={`${ids}-rimGlow`} x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="3.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {activeSegment && beamGradientId && labelGradientId && rimGradientId && activeTreatment && (
              <>
                <linearGradient
                  id={beamGradientId}
                  gradientUnits="userSpaceOnUse"
                  x1={activeSegment.gradientInner.x}
                  y1={activeSegment.gradientInner.y}
                  x2={activeSegment.gradientOuter.x}
                  y2={activeSegment.gradientOuter.y}
                >
                  <stop offset="0%" stopColor="rgba(255,227,188,0.08)" />
                  <stop offset="24%" stopColor="rgba(255,233,201,0.14)" />
                  <stop offset="42%" stopColor={activeTreatment.glow} />
                  <stop offset="76%" stopColor="rgba(235,188,125,0.22)" />
                  <stop offset="100%" stopColor="rgba(239,68,136,0.035)" />
                </linearGradient>
                <radialGradient id={labelGradientId} cx="50%" cy="50%" r="74%">
                  <stop offset="0%" stopColor="rgba(255,236,209,0.08)" />
                  <stop offset="55%" stopColor="rgba(224,177,117,0.28)" />
                  <stop offset="100%" stopColor={activeTreatment.pink} />
                </radialGradient>
                <linearGradient
                  id={rimGradientId}
                  gradientUnits="userSpaceOnUse"
                  x1={activeSegment.gradientInner.x}
                  y1={activeSegment.gradientInner.y}
                  x2={activeSegment.gradientOuter.x}
                  y2={activeSegment.gradientOuter.y}
                >
                  <stop offset="0%" stopColor="rgba(255,239,214,0.22)" />
                  <stop offset="58%" stopColor={activeTreatment.rim} />
                  <stop offset="100%" stopColor="rgba(239,68,136,0.1)" />
                </linearGradient>
              </>
            )}
          </defs>


        </svg>

        <Image
          src="/brand/lifewheel/locked-sos-lifewheel-8-area-v3.jpg"
          alt="SOS LifeWheel dial with eight life areas"
          fill
          priority
          sizes="(max-width: 640px) 92vw, 380px"
          className="z-10 rounded-full object-contain opacity-100 saturate-[1.05] contrast-[1.03]"
        />

        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 h-full w-full"
        >
          <defs>
            <filter id={`${ids}-topBacklight`} x="-90%" y="-90%" width="280%" height="280%">
              <feGaussianBlur stdDeviation="5.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

          </defs>
          {activeSegment && activeTreatment && (
            <g className="mix-blend-screen">
              <path
                d={activeSegment.outerHaloPath}
                fill={activeTreatment.glow}
                opacity="0.46"
                filter={`url(#${ids}-topBacklight)`}
              />
              <path
                d={activeSegment.labelBandPath}
                fill={activeTreatment.glow}
                opacity="0.54"
              />
              <path
                d={activeSegment.glowPath}
                fill={activeTreatment.glow}
                opacity="0.30"
              />
              <path
                d={activeSegment.outerArc}
                fill="none"
                stroke={activeTreatment.rim}
                strokeWidth="7.2"
                strokeLinecap="round"
                opacity="0.94"
                filter={`url(#${ids}-topBacklight)`}
              />
              <path
                d={activeSegment.outerArc}
                fill="none"
                stroke="rgba(255,238,214,0.88)"
                strokeWidth="1.55"
                strokeLinecap="round"
                opacity="0.88"
              />
              <path
                d={activeSegment.innerArc}
                fill="none"
                stroke={activeTreatment.rim}
                strokeWidth="1.45"
                strokeLinecap="round"
                opacity="0.68"
              />
              <path
                d={activeSegment.startBoundary}
                fill="none"
                stroke={activeTreatment.rim}
                strokeWidth="2.45"
                strokeLinecap="round"
                opacity="0.72"
              />
              <path
                d={activeSegment.endBoundary}
                fill="none"
                stroke={activeTreatment.rim}
                strokeWidth="2.45"
                strokeLinecap="round"
                opacity="0.72"
              />
              <text
                x={activeSegment.labelPoint.x.toFixed(2)}
                y={activeSegment.labelPoint.y.toFixed(2)}
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(${activeSegment.labelRotation} ${activeSegment.labelPoint.x.toFixed(2)} ${activeSegment.labelPoint.y.toFixed(2)})`}
                fontSize="13"
                fontFamily="var(--font-serif), Georgia, serif"
                fontWeight="700"
                letterSpacing="0.08em"
                fill="rgba(255,248,232,0.98)"
                stroke="rgba(14,12,30,0.42)"
                strokeWidth="0.35"
                paintOrder="stroke fill"
                filter={`url(#${ids}-topBacklight)`}
              >
                {activeSegment.label}
              </text>
            </g>
          )}
        </svg>

        <div className="pointer-events-none absolute inset-0 z-20 rounded-full bg-[radial-gradient(circle_at_50%_48%,transparent_48%,rgba(255,221,176,0.045)_71%,transparent_78%)] mix-blend-screen" />

        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="group"
          aria-label="LifeWheel with eight life areas. Hover, tap, or focus a slice to preview it."
          className="absolute inset-0 z-30 h-full w-full"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoveredIndex(null)}
        >
          {geometry.map((segment) => {
            const isActive = activeIndex === segment.index;
            return (
              <path
                key={segment.label}
                d={segment.hitPath}
                fill="transparent"
                stroke="transparent"
                strokeWidth="0"
                tabIndex={0}
                role="button"
                aria-label={`${segment.label} life area${isActive ? ', active' : ''}`}
                style={{ pointerEvents: 'all' }}
                onFocus={() => setFocusedIndex(segment.index)}
                onBlur={() => setFocusedIndex(null)}
                aria-pressed={selectedIndex === segment.index}
                onClick={() => selectIndex(segment.index)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectIndex(segment.index);
                  }
                }}
                className="cursor-pointer outline-none focus-visible:stroke-[rgba(244,239,232,0.7)] focus-visible:stroke-[2px]"
              />
            );
          })}
        </svg>
      </div>

      {activeSegment && (
        <div className="mx-auto mt-4 w-fit rounded-full border border-[rgba(239,68,136,0.36)] bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,136,0.18),rgba(14,12,30,0.92)_64%)] px-5 py-2 text-center shadow-[0_0_26px_rgba(239,68,136,0.18)]">
          <p className="text-[9px] font-semibold uppercase tracking-[0.32em] text-[rgba(255,132,195,0.76)]">
            Active now
          </p>
          <p className="mt-0.5 text-sm font-black uppercase tracking-[0.28em] text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.72)]">
            {activeSegment.label}
          </p>
        </div>
      )}
    </div>
  );
}
