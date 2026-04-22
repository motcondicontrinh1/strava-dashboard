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

function secToMmss(s) {
  if (!s && s !== 0) return '—';
  const m = Math.floor(s / 60);
  const ss = Math.round(s % 60);
  return `${m}:${ss.toString().padStart(2, '0')}`;
}

const ZONE_NAMES = ['Warm Up', 'Easy', 'Moderate', 'Threshold', 'Maximum'];

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
    const maxDisplay = b.max > 0 ? b.max : b.min + 30;
    return {
      ...b,
      pct,
      maxDisplay,
      label: `Z${i + 1}`,
      name: ZONE_NAMES[i] || `Zone ${i + 1}`,
      isHigh: i >= 3,
    };
  });

  return (
    <div className="py-8 border-b border-white/[0.04]">
      <SectionLabel index="05" label="Heart Rate" sub="Time in Zone" />

      {/* Stacked bar */}
      <div className="flex h-7 mb-6 overflow-hidden">
        {enriched.map((z, i) => (
          <div
            key={i}
            className="relative group"
            style={{
              width: `${z.pct}%`,
              minWidth: z.pct > 0 ? '2px' : '0px',
              background: z.isHigh
                ? (i === 4
                  ? 'linear-gradient(90deg, #FF2D55 0%, #FF2D55cc 100%)'
                  : 'linear-gradient(90deg, #FC4C02 0%, #FC4C02cc 100%)')
                : (i === 2
                  ? 'linear-gradient(90deg, rgba(252,76,2,0.25) 0%, rgba(252,76,2,0.15) 100%)'
                  : i === 1
                    ? 'linear-gradient(90deg, rgba(34,211,238,0.25) 0%, rgba(34,211,238,0.15) 100%)'
                    : 'linear-gradient(90deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)'),
            }}
          >
            {z.pct >= 8 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="font-mono text-[9px] text-white/60 uppercase tracking-widest">
                  {z.label}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 mb-4 pb-2 border-b border-white/[0.04]">
        <div className="font-mono text-[8px] text-white/25 uppercase tracking-widest w-5 text-right flex-shrink-0">Z</div>
        <div className="font-mono text-[8px] text-white/25 uppercase tracking-widest w-14 hidden sm:block">ZONE</div>
        <div className="font-mono text-[8px] text-white/25 uppercase tracking-widest w-20 text-right flex-shrink-0">RANGE</div>
        <div className="flex-1 font-mono text-[8px] text-white/25 uppercase tracking-widest">TIME</div>
        <div className="font-mono text-[8px] text-white/25 uppercase tracking-widest w-8 text-right flex-shrink-0">PCT</div>
      </div>

      {/* Zone rows */}
      <div className="space-y-1">
        {enriched.map((z, i) => {
          const barFill = Math.max(z.pct, 1);
          const isHigh = z.isHigh;

          return (
            <div key={i} className="flex items-center gap-3 group py-0.5">
              {/* Zone number */}
              <div className="font-mono text-[9px] text-white/25 w-5 text-right flex-shrink-0">
                {z.label}
              </div>

              {/* Zone name */}
              <div className="font-mono text-[8px] text-white/20 uppercase tracking-widest w-14 hidden sm:block">
                {z.name}
              </div>

              {/* HR range */}
              <div className="font-mono text-[9px] text-white/30 w-20 text-right flex-shrink-0">
                {z.min}–{z.maxDisplay} bpm
              </div>

              {/* Bar track */}
              <div className="flex-1 h-7 bg-white/[0.03] relative overflow-hidden">
                {z.pct > 0 && (
                  <>
                    <div
                      className="absolute left-0 top-0 h-full"
                      style={{
                        width: `${barFill}%`,
                        background: isHigh
                          ? 'linear-gradient(90deg, rgba(252,76,2,0.65) 0%, rgba(252,76,2,0.2) 100%)'
                          : 'linear-gradient(90deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)',
                        boxShadow: isHigh ? '1px 0 12px rgba(252,76,2,0.25)' : 'none',
                        transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    />
                    {isHigh && (
                      <div
                        className="absolute top-0 h-full w-px"
                        style={{
                          left: `${barFill}%`,
                          background: 'rgba(252,76,2,0.8)',
                          boxShadow: '0 0 4px rgba(252,76,2,0.6)',
                        }}
                      />
                    )}
                  </>
                )}
                {/* Duration label */}
                <div className="absolute inset-0 flex items-center px-3">
                  <span className={`font-mono text-[11px] font-medium ${isHigh ? 'text-orange' : 'text-white/50'}`}>
                    {secToMmss(z.time)}
                  </span>
                </div>
              </div>

              {/* Percentage */}
              <div className="font-mono text-[9px] text-white/30 w-8 text-right flex-shrink-0">
                {Math.round(z.pct)}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.04]">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-1.5" style={{ background: 'rgba(252,76,2,0.65)' }} />
          <span className="font-mono text-[8px] text-white/25 uppercase tracking-widest">Z4/Z5 Threshold+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-1.5 bg-white/12" />
          <span className="font-mono text-[8px] text-white/25 uppercase tracking-widest">Z1–Z3</span>
        </div>
        <div className="ml-auto font-mono text-[8px] text-white/25 uppercase tracking-widest">
          Total {secToMmss(totalTime)}
        </div>
        {hrZone.score != null && (
          <span className="font-mono text-[8px] text-white/25 uppercase tracking-widest">
            ·&nbsp; Suffer Score {Math.round(hrZone.score)}
          </span>
        )}
      </div>
    </div>
  );
}
