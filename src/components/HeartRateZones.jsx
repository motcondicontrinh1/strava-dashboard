import { useMemo } from 'react';

function SectionLabel({ index, label, sub }) {
  return (
    <div className="flex items-baseline gap-3 mb-5">
      <span className="font-mono text-[9px] text-orange uppercase tracking-[3px]">
        {index} // {label}
      </span>
      <span className="font-mono text-[9px] text-white/25 uppercase tracking-widest">{sub}</span>
    </div>
  );
}

const ZONE_CONFIG = [
  { label: 'Z1', name: 'Warm Up', color: 'rgba(255,255,255,0.08)', accent: false },
  { label: 'Z2', name: 'Easy', color: 'rgba(34,211,238,0.30)', accent: false },
  { label: 'Z3', name: 'Moderate', color: 'rgba(252,76,2,0.35)', accent: false },
  { label: 'Z4', name: 'Threshold', color: '#FC4C02', accent: true },
  { label: 'Z5', name: 'Maximum', color: '#FF2D55', accent: true },
];

function secToMmss(s) {
  if (!s && s !== 0) return '—';
  const m = Math.floor(s / 60);
  const ss = Math.round(s % 60);
  return `${m}:${ss.toString().padStart(2, '0')}`;
}

export default function HeartRateZones({ zones }) {
  const hrZone = useMemo(() => {
    if (!zones?.length) return null;
    return zones.find(z => z.type === 'heartrate');
  }, [zones]);

  if (!hrZone) return null;

  const buckets = hrZone.distribution_buckets;
  if (!buckets?.length) return null;

  const totalTime = buckets.reduce((sum, b) => sum + b.time, 0);
  if (totalTime === 0) return null;

  const enriched = buckets.map((b, i) => {
    const pct = (b.time / totalTime) * 100;
    const cfg = ZONE_CONFIG[i] || ZONE_CONFIG[4];
    return {
      ...b,
      pct,
      ...cfg,
      label: cfg.label,
      name: cfg.name,
      color: cfg.color,
      accent: cfg.accent,
    };
  });

  return (
    <div className="py-8 border-b border-white/[0.04]">
      <SectionLabel index="05" label="Heart Rate" sub="Time in Zone" />

      {/* Stacked horizontal bar */}
      <div className="flex h-8 mb-6 overflow-hidden">
        {enriched.map((z, i) => (
          <div
            key={i}
            className="relative group transition-all duration-300"
            style={{
              width: `${z.pct}%`,
              background: z.color,
              minWidth: z.pct < 2 ? '6px' : undefined,
            }}
          >
            {z.pct >= 12 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="font-mono text-[9px] text-white/50 uppercase tracking-widest">
                  {z.label} {Math.round(z.pct)}%
                </span>
              </div>
            )}
            {/* Hover state */}
            <div className="absolute inset-0 bg-white/[0.08] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>

      {/* Zone rows */}
      <div className="space-y-1.5">
        {enriched.map((z, i) => {
          const barWidth = Math.max(z.pct, 3);
          return (
            <div key={i} className="flex items-center gap-3 group py-1">
              {/* Zone label */}
              <div className="w-14 flex-shrink-0 flex items-center gap-1.5">
                <span
                  className="font-mono text-[10px] font-bold"
                  style={{ color: z.accent ? z.color : 'rgba(255,255,255,0.4)' }}
                >
                  {z.label}
                </span>
                <span className="font-mono text-[8px] text-white/20 uppercase tracking-widest hidden sm:inline">
                  {z.name}
                </span>
              </div>

              {/* HR range */}
              <div className="font-mono text-[9px] text-white/30 w-20 text-right flex-shrink-0">
                {z.min}–{z.max} bpm
              </div>

              {/* Bar */}
              <div className="flex-1 h-6 bg-white/[0.03] relative overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full transition-all duration-500"
                  style={{
                    width: `${barWidth}%`,
                    background: z.pct > 0
                      ? (z.accent
                        ? `linear-gradient(90deg, ${z.color} 0%, ${z.color}99 100%)`
                        : z.color)
                      : 'transparent',
                    boxShadow: z.accent ? `1px 0 8px ${z.color}66` : 'none',
                  }}
                />
                {z.accent && z.pct > 5 && (
                  <div
                    className="absolute top-0 h-full w-px"
                    style={{
                      left: `${barWidth}%`,
                      background: z.color,
                      boxShadow: `0 0 4px ${z.color}99`,
                    }}
                  />
                )}
                {/* Duration inside bar */}
                <div className="absolute inset-0 flex items-center px-3">
                  <span className={`font-mono text-[10px] font-medium ${z.accent ? 'text-white' : 'text-white/50'}`}>
                    {secToMmss(z.time)}
                  </span>
                </div>
              </div>

              {/* Percentage */}
              <div className="font-mono text-[9px] text-white/30 w-10 text-right flex-shrink-0">
                {Math.round(z.pct)}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.04]">
        <span className="font-mono text-[8px] text-white/25 uppercase tracking-widest">
          Total {secToMmss(totalTime)}
        </span>
        {hrZone.score != null && (
          <span className="font-mono text-[8px] text-white/25 uppercase tracking-widest">
            ·&nbsp; Suffer Score {Math.round(hrZone.score)}
          </span>
        )}
      </div>
    </div>
  );
}