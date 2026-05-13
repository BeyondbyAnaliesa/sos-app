import { useId } from 'react';

export type LifeSignal = 'supportive' | 'cautionary' | 'ambient' | 'quiet';

export interface LifeSegmentData {
  label: string;
  signal: LifeSignal;
}

type Tier = 'primary' | 'secondary' | 'tertiary' | 'dormant';

type SegmentSpec = {
  label: string;
  signal: LifeSignal;
  angle: number;
};

const CX = 230;
const CY = 230;
const OUTER_R = 205;
const INNER_R = 76;
const GAP = 2;

const TIER_BY_SIGNAL: Record<LifeSignal, Tier> = {
  cautionary: 'primary',
  supportive: 'secondary',
  ambient: 'tertiary',
  quiet: 'dormant',
};

const LABEL_BY_INPUT: Record<string, string> = {
  MONEY: 'MONEY',
  BODY: 'BODY',
  MIND: 'MIND',
  HOME: 'HOME',
  RELATIONSHIPS: 'RELATIONSHIPS',
  LOVE: 'LOVE',
  SPIRIT: 'SPIRIT',
  WORK: 'WORK',
};

const ORDER: Array<{ label: string; angle: number }> = [
  { label: 'MONEY', angle: -90 },
  { label: 'BODY', angle: -45 },
  { label: 'MIND', angle: 0 },
  { label: 'HOME', angle: 45 },
  { label: 'RELATIONSHIPS', angle: 90 },
  { label: 'LOVE', angle: 135 },
  { label: 'SPIRIT', angle: 180 },
  { label: 'WORK', angle: 225 },
];

const FILL_BY_TIER: Record<Tier, string> = {
  primary: 'var(--wheel-g-pink)',
  secondary: 'var(--wheel-g-champ)',
  tertiary: 'var(--wheel-g-tert)',
  dormant: 'var(--wheel-g-dorm)',
};

const FILTER_BY_TIER: Record<Tier, string | undefined> = {
  primary: 'var(--wheel-f-pink)',
  secondary: 'var(--wheel-f-champ)',
  tertiary: 'var(--wheel-f-tert)',
  dormant: undefined,
};

const STROKE_WIDTH_BY_TIER: Record<Tier, number> = {
  primary: 2.2,
  secondary: 1.6,
  tertiary: 1,
  dormant: 0.7,
};

const STROKE_OPACITY_BY_TIER: Record<Tier, number> = {
  primary: 0.92,
  secondary: 0.85,
  tertiary: 0.55,
  dormant: 0.35,
};

const LABEL_COLOR_BY_TIER: Record<Tier, string> = {
  primary: '#FFFFFF',
  secondary: '#160C1A',
  tertiary: 'rgba(201,162,122,0.85)',
  dormant: 'rgba(201,162,122,0.35)',
};

function rad(deg: number) {
  return (deg * Math.PI) / 180;
}

function point(angle: number, radius: number) {
  return {
    x: CX + radius * Math.cos(rad(angle)),
    y: CY + radius * Math.sin(rad(angle)),
  };
}

function arcPath(startDeg: number, endDeg: number) {
  const p1 = point(startDeg, OUTER_R);
  const p2 = point(endDeg, OUTER_R);
  const p3 = point(endDeg, INNER_R);
  const p4 = point(startDeg, INNER_R);
  return [
    `M${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`,
    `A${OUTER_R} ${OUTER_R} 0 0 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`,
    `L${p3.x.toFixed(1)} ${p3.y.toFixed(1)}`,
    `A${INNER_R} ${INNER_R} 0 0 0 ${p4.x.toFixed(1)} ${p4.y.toFixed(1)}Z`,
  ].join(' ');
}

function buildSegments(segments: LifeSegmentData[]): SegmentSpec[] {
  const byLabel = new Map(
    segments.map((segment) => [LABEL_BY_INPUT[segment.label.toUpperCase()] ?? segment.label.toUpperCase(), segment.signal]),
  );

  return ORDER.map(({ label, angle }) => ({
    label,
    angle,
    signal: byLabel.get(label) ?? 'quiet',
  }));
}

export default function LifeWheel({ segments }: { segments: LifeSegmentData[] }) {
  const id = useId().replace(/:/g, '');
  const ids = {
    ring: `wheel-cu-ring-${id}`,
    inner: `wheel-cu-inner-${id}`,
    dorm: `wheel-g-dorm-${id}`,
    pink: `wheel-g-pink-${id}`,
    champ: `wheel-g-champ-${id}`,
    tert: `wheel-g-tert-${id}`,
    port: `wheel-g-port-${id}`,
    fp: `wheel-f-pink-${id}`,
    fc: `wheel-f-champ-${id}`,
    ft: `wheel-f-tert-${id}`,
    clip: `wheel-clip-${id}`,
    title: `wheel-title-${id}`,
  };

  const normalized = buildSegments(segments);

  return (
    <svg
      viewBox="0 0 460 460"
      role="img"
      aria-labelledby={ids.title}
      className="mx-auto w-full max-w-[460px] drop-shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
      style={{
        ['--wheel-g-pink' as string]: `url(#${ids.pink})`,
        ['--wheel-g-champ' as string]: `url(#${ids.champ})`,
        ['--wheel-g-tert' as string]: `url(#${ids.tert})`,
        ['--wheel-g-dorm' as string]: `url(#${ids.dorm})`,
        ['--wheel-f-pink' as string]: `url(#${ids.fp})`,
        ['--wheel-f-champ' as string]: `url(#${ids.fc})`,
        ['--wheel-f-tert' as string]: `url(#${ids.ft})`,
      }}
    >
      <title id={ids.title}>LifeWheel showing the current state across money, body, mind, home, relationships, love, spirit, and work.</title>
      <defs>
        <linearGradient id={ids.ring} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#EDD08A" />
          <stop offset="25%" stopColor="#D4A96A" />
          <stop offset="50%" stopColor="#C9A27A" />
          <stop offset="75%" stopColor="#A07040" />
          <stop offset="100%" stopColor="#C9A27A" />
        </linearGradient>
        <linearGradient id={ids.inner} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4A96A" />
          <stop offset="50%" stopColor="#9A6E3A" />
          <stop offset="100%" stopColor="#C9A27A" />
        </linearGradient>

        <radialGradient id={ids.dorm} cx="35%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#201E38" />
          <stop offset="60%" stopColor="#14121E" />
          <stop offset="100%" stopColor="#0D0C18" />
        </radialGradient>
        <radialGradient id={ids.pink} cx="40%" cy="24%" r="82%">
          <stop offset="0%" stopColor="#FF82BB" />
          <stop offset="38%" stopColor="#EF4488" />
          <stop offset="100%" stopColor="#B81E60" />
        </radialGradient>
        <radialGradient id={ids.champ} cx="40%" cy="24%" r="82%">
          <stop offset="0%" stopColor="#FFF8E8" />
          <stop offset="42%" stopColor="#F2DFB8" />
          <stop offset="100%" stopColor="#C09050" />
        </radialGradient>
        <radialGradient id={ids.tert} cx="38%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#2E2C58" />
          <stop offset="45%" stopColor="#1E1C40" />
          <stop offset="100%" stopColor="#161432" />
        </radialGradient>
        <radialGradient id={ids.port} cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#1C1935" />
          <stop offset="55%" stopColor="#0E0C1E" />
          <stop offset="100%" stopColor="#080710" />
        </radialGradient>

        <filter id={ids.fp} x="-55%" y="-55%" width="210%" height="210%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="b1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b2" />
          <feColorMatrix in="b1" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0" result="r" />
          <feMerge>
            <feMergeNode in="r" />
            <feMergeNode in="b2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={ids.fc} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b" />
          <feColorMatrix in="b" type="matrix" values="1.1 0 0 0 0 0.85 0 0 0 0 0.1 0 0 0 0 0 0 0 0.38 0" result="r" />
          <feMerge>
            <feMergeNode in="r" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={ids.ft} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="b" />
          <feColorMatrix in="b" type="matrix" values="1.0 0.5 0 0 0 0.6 0.3 0 0 0 0.1 0 0 0 0 0 0 0 0.28 0" result="r" />
          <feMerge>
            <feMergeNode in="r" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <clipPath id={ids.clip}>
          <circle cx={CX} cy={CY} r={218} />
        </clipPath>
      </defs>

      {normalized.map((segment) => {
        const tier = TIER_BY_SIGNAL[segment.signal];
        const half = 22.5 - GAP;
        const start = segment.angle - half;
        const end = segment.angle + half;
        const panelPath = arcPath(start, end);
        const labelRadius = (INNER_R + OUTER_R) / 2 + 4;
        const labelPoint = point(segment.angle, labelRadius);
        const rotation = segment.angle > 90 && segment.angle < 270 ? segment.angle + 180 : segment.angle;
        const rimStart = point(start, OUTER_R + 2);
        const rimEnd = point(end, OUTER_R + 2);
        const isRelationships = segment.label === 'RELATIONSHIPS';

        return (
          <g key={segment.label}>
            {tier !== 'dormant' && (
              <path
                d={panelPath}
                fill={FILL_BY_TIER[tier]}
                filter={FILTER_BY_TIER[tier]}
                opacity="0.55"
                clipPath={`url(#${ids.clip})`}
              />
            )}
            <path
              d={panelPath}
              fill={FILL_BY_TIER[tier]}
              stroke="#C9A27A"
              strokeWidth={STROKE_WIDTH_BY_TIER[tier]}
              strokeOpacity={STROKE_OPACITY_BY_TIER[tier]}
              strokeLinejoin="round"
            />
            {(tier === 'primary' || tier === 'secondary') && (
              <path
                d={`M${rimStart.x.toFixed(1)} ${rimStart.y.toFixed(1)} A${OUTER_R + 2} ${OUTER_R + 2} 0 0 1 ${rimEnd.x.toFixed(1)} ${rimEnd.y.toFixed(1)}`}
                fill="none"
                stroke={tier === 'primary' ? 'rgba(239,68,136,0.75)' : 'rgba(242,223,184,0.65)'}
                strokeWidth="2.5"
              />
            )}
            {isRelationships ? (
              <text
                x={CX}
                y={CY + (INNER_R + OUTER_R) / 2 + 4}
                textAnchor="middle"
                dominantBaseline="central"
                letterSpacing="0.05em"
                fontWeight="700"
                fontFamily='-apple-system,BlinkMacSystemFont,"SF Pro Display",system-ui,sans-serif'
                fontSize="17"
                fill={LABEL_COLOR_BY_TIER[tier]}
                pointerEvents="none"
              >
                <tspan x={CX} dy="-0.65em">RELATION-</tspan>
                <tspan x={CX} dy="1.3em">SHIPS</tspan>
              </text>
            ) : (
              <text
                x={labelPoint.x.toFixed(1)}
                y={labelPoint.y.toFixed(1)}
                textAnchor="middle"
                dominantBaseline="central"
                letterSpacing="0.08em"
                fontWeight="700"
                fontFamily='-apple-system,BlinkMacSystemFont,"SF Pro Display",system-ui,sans-serif'
                fontSize="17"
                transform={`rotate(${rotation.toFixed(1)} ${labelPoint.x.toFixed(1)} ${labelPoint.y.toFixed(1)})`}
                fill={LABEL_COLOR_BY_TIER[tier]}
                pointerEvents="none"
              >
                {segment.label}
              </text>
            )}
          </g>
        );
      })}

      <circle cx={CX} cy={CY} r="218" fill="none" stroke={`url(#${ids.ring})`} strokeWidth="15" opacity="0.95" />
      <circle cx={CX} cy={CY} r="210.5" fill="none" stroke="rgba(244,239,232,0.10)" strokeWidth="0.8" />
      <circle cx={CX} cy={CY} r="209" fill="none" stroke="rgba(201,162,122,0.08)" strokeWidth="0.5" />

      <circle cx={CX} cy={CY} r="79" fill="none" stroke={`url(#${ids.inner})`} strokeWidth="8" opacity="0.9" />
      <circle cx={CX} cy={CY} r="75" fill="none" stroke="rgba(244,239,232,0.09)" strokeWidth="0.7" />

      <circle cx={CX} cy={CY} r="70" fill={`url(#${ids.port})`} />
      <circle cx={CX} cy={CY} r="70" fill="none" stroke={`url(#${ids.inner})`} strokeWidth="5" />
      <circle cx={CX} cy={CY} r="66" fill="none" stroke="rgba(244,239,232,0.07)" strokeWidth="0.6" />
      <circle cx={CX} cy={CY} r="62" fill="none" stroke="rgba(201,162,122,0.1)" strokeWidth="0.4" />
    </svg>
  );
}
