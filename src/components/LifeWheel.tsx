export type LifeSignal = 'supportive' | 'cautionary' | 'ambient' | 'quiet';

export interface LifeSegmentData {
  label: string;
  signal: LifeSignal;
}

const CX = 150;
const CY = 150;
const INNER_R = 54;
const OUTER_R = 96;
const LABEL_R = 75;
const GAP = 3;

const COLORS: Record<LifeSignal, { fill: string; stroke: string; strokeWidth: number; text: string }> = {
  supportive: {
    fill: 'rgba(201,162,122,0.20)',
    stroke: 'rgba(201,162,122,0.86)',
    strokeWidth: 1.8,
    text: '#F4EFE8',
  },
  cautionary: {
    fill: 'rgba(239,68,136,0.12)',
    stroke: 'rgba(239,68,136,0.74)',
    strokeWidth: 1.8,
    text: '#F4EFE8',
  },
  // Restrained warm presence — not activated, not dead, just quietly alive
  ambient: {
    fill: 'rgba(201,162,122,0.07)',
    stroke: 'rgba(201,162,122,0.28)',
    strokeWidth: 1.0,
    text: 'rgba(201,162,122,0.50)',
  },
  quiet: {
    fill: 'rgba(154,148,140,0.05)',
    stroke: 'rgba(154,148,140,0.18)',
    strokeWidth: 0.75,
    text: 'rgba(154,148,140,0.35)',
  },
};

function arcPath(innerR: number, outerR: number, startDeg: number, endDeg: number): string {
  const r = (d: number) => (d * Math.PI) / 180;
  const [sr, er] = [r(startDeg), r(endDeg)];
  const x1 = CX + outerR * Math.cos(sr), y1 = CY + outerR * Math.sin(sr);
  const x2 = CX + outerR * Math.cos(er), y2 = CY + outerR * Math.sin(er);
  const x3 = CX + innerR * Math.cos(er), y3 = CY + innerR * Math.sin(er);
  const x4 = CX + innerR * Math.cos(sr), y4 = CY + innerR * Math.sin(sr);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return (
    `M${x1.toFixed(2)} ${y1.toFixed(2)} ` +
    `A${outerR} ${outerR} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} ` +
    `L${x3.toFixed(2)} ${y3.toFixed(2)} ` +
    `A${innerR} ${innerR} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}Z`
  );
}

export default function LifeWheel({ segments }: { segments: LifeSegmentData[] }) {
  return (
    <svg
      viewBox="-20 -20 340 340"
      aria-hidden="true"
      className="mx-auto w-full max-w-[320px]"
    >
      <defs>
        <radialGradient id="sos-wheel-cosmos" cx="50%" cy="42%" r="58%">
          <stop offset="0%" stopColor="rgba(244,239,232,0.10)" />
          <stop offset="48%" stopColor="rgba(201,162,122,0.06)" />
          <stop offset="100%" stopColor="rgba(14,12,30,0.0)" />
        </radialGradient>
      </defs>

      <circle cx={CX} cy={CY} r={OUTER_R + 18} fill="url(#sos-wheel-cosmos)" />

      {/* Outer atmospheric ring */}
      <circle
        cx={CX} cy={CY} r={OUTER_R + 8}
        fill="none"
        stroke="rgba(142,110,82,0.09)"
        strokeWidth="0.75"
      />

      {segments.map((segment, i) => {
        const nomStart = -90 + i * 60;
        const startDeg = nomStart + GAP;
        const endDeg   = nomStart + 60 - GAP;
        const midRad   = ((nomStart + 30) * Math.PI) / 180;
        const lx = CX + LABEL_R * Math.cos(midRad);
        const ly = CY + LABEL_R * Math.sin(midRad);
        const col = COLORS[segment.signal];

        return (
          <g key={i}>
            <path
              d={arcPath(INNER_R, OUTER_R, startDeg, endDeg)}
              fill={col.fill}
              stroke={col.stroke}
              strokeWidth={col.strokeWidth}
              strokeLinejoin="round"
            />
            <rect
              x={(lx - 23).toFixed(2)}
              y={(ly - 8).toFixed(2)}
              width="46"
              height="16"
              rx="8"
              fill="rgba(14,12,30,0.42)"
              stroke="rgba(201,162,122,0.18)"
            />
            <text
              x={lx.toFixed(2)}
              y={ly.toFixed(2)}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="7.5"
              letterSpacing="0.10em"
              fill={col.text}
            >
              {segment.label}
            </text>
          </g>
        );
      })}

      {/* Center point */}
      <circle
        cx={CX} cy={CY} r="5"
        fill="rgba(239,68,136,0.28)"
        stroke="rgba(239,68,136,0.62)"
        strokeWidth="0.9"
      />
      <circle cx={CX} cy={CY} r="10" fill="none" stroke="rgba(239,68,136,0.18)" strokeWidth="0.7" />
    </svg>
  );
}
