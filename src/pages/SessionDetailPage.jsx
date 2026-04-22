import { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';

const CardExportModal = lazy(() => import('../components/CardExportModal.jsx'));

// ── Polyline decoder ─────────────────────────────────────────────────────────

function decodePolyline(encoded) {
  if (!encoded) return [];
  const pts = [];
  let i = 0, lat = 0, lng = 0;
  while (i < encoded.length) {
    let shift = 0, result = 0, b;
    do { b = encoded.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    pts.push([lat / 1e5, lng / 1e5]);
  }
  return pts;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function secToMmss(s) {
  if (!s && s !== 0) return '—';
  const m = Math.floor(s / 60);
  const ss = Math.round(s % 60);
  return `${m}:${ss.toString().padStart(2, '0')}`;
}

function formatPaceSec(secPerKm) {
  if (!secPerKm || !isFinite(secPerKm) || secPerKm > 1800) return '—';
  return secToMmss(secPerKm);
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  }).toUpperCase();
}

// ── Map auto-fit helper ───────────────────────────────────────────────────────

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [20, 20] });
  }, [map, points]);
  return null;
}

// ── Loading State ─────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-orange/30 border-t-orange animate-spin rounded-full" />
        <span className="font-mono text-xs text-white/40 uppercase tracking-widest">
          Loading Session...
        </span>
      </div>
    </div>
  );
}

// ── Components ──────────────────────────────────────────────────────────────

function Header({ activity, onExport }) {
  const navigate = useNavigate();
  const type = (activity?.sport_type || activity?.type || 'SESSION').toUpperCase();

  return (
    <div className="flex items-center justify-between py-4 border-b border-white/[0.06]">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[3px] px-2 py-0.5 border border-orange/30 text-orange bg-orange/[0.08]">
          {type}
        </span>
        <span className="font-mono text-[10px] text-white/30 uppercase tracking-widest">
          {activity?.start_date_local ? formatDate(activity.start_date_local) : ''}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {activity && onExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 border border-white/[0.08] text-white/40 hover:border-orange/40 hover:text-orange transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 1V7M2 5L5 8L8 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square"/>
              <path d="M1 9H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square"/>
            </svg>
            <span className="hidden sm:block">Share</span>
          </button>
        )}
        <Link
          to="/"
          className="flex items-center gap-2 font-mono text-[10px] text-white/30 hover:text-white transition-colors"
        >
          <span className="hidden sm:block uppercase tracking-widest">Back</span>
          <span className="w-7 h-7 flex items-center justify-center border border-white/[0.08] hover:border-orange/40 hover:text-orange transition-colors">
            ←
          </span>
        </Link>
      </div>
    </div>
  );
}

function HeroSection({ activity }) {
  const location = [activity?.location_city, activity?.location_country]
    .filter(Boolean).join(', ').toUpperCase();

  return (
    <div className="py-10 border-b border-white/[0.04]">
      {location && (
        <div className="font-mono text-[10px] text-white/25 uppercase tracking-[2px] mb-3 flex items-center gap-2">
          <span className="inline-block w-3 h-px bg-orange" />
          {location}
        </div>
      )}
      <h1 className="font-bold tracking-[-3px] text-4xl sm:text-5xl md:text-6xl mb-5 leading-[0.9]">
        {activity?.name || 'Session'}
      </h1>
      <div className="h-px w-20 bg-gradient-to-r from-orange to-transparent" />
    </div>
  );
}

function StatsGrid({ activity }) {
  const pace = activity?.average_speed > 0
    ? formatPaceSec(1000 / activity.average_speed)
    : '—';

  const stats = [
    { label: 'Distance', value: ((activity?.distance || 0) / 1000).toFixed(2), unit: 'KM', accent: true },
    { label: 'Moving Time', value: secToMmss(activity?.moving_time), unit: null },
    { label: 'Avg Pace', value: pace, unit: '/KM' },
    {
      label: 'Heart Rate',
      value: activity?.average_heartrate ? Math.round(activity.average_heartrate) : '—',
      unit: activity?.average_heartrate ? 'BPM' : null,
    },
    {
      label: 'Elevation',
      value: activity?.total_elevation_gain ? Math.round(activity.total_elevation_gain) : '—',
      unit: activity?.total_elevation_gain ? 'M' : null,
    },
    {
      label: 'Calories',
      value: activity?.calories ? Math.round(activity.calories) : '—',
      unit: activity?.calories ? 'KCAL' : null,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-8 border-b border-white/[0.04]">
      {stats.map((s, i) => (
        <div key={i} className="p-4 border border-white/[0.04]">
          <div className="font-mono text-[9px] text-white/30 uppercase tracking-widest mb-2">
            {s.label}
          </div>
          <div className={`font-mono text-2xl ${s.accent ? 'text-orange' : 'text-white'}`}>
            {s.value}
            {s.unit && <span className="text-sm text-white/50 ml-1">{s.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function MapSection({ activity, points }) {
  if (!points.length) return null;

  return (
    <div className="py-8 border-b border-white/[0.04]">
      <div className="font-mono text-[10px] text-white/30 uppercase tracking-widest mb-4">
        Route Map
      </div>
      <div className="h-[400px] border border-white/[0.08] overflow-hidden">
        <MapContainer
          style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
          zoom={13}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <FitBounds points={points} />
          <Polyline
            positions={points}
            pathOptions={{ color: '#FC4C02', weight: 4, opacity: 0.9 }}
          />
          <CircleMarker
            center={points[0]}
            radius={6}
            pathOptions={{ color: '#FC4C02', fillColor: '#FC4C02', fillOpacity: 1 }}
          />
          <CircleMarker
            center={points[points.length - 1]}
            radius={6}
            pathOptions={{ color: '#ffffff', fillColor: '#ffffff', fillOpacity: 1 }}
          />
        </MapContainer>
      </div>
    </div>
  );
}

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

function SplitsBars({ splits }) {
  if (!splits?.length) return null;

  const withPace = splits.map(s => ({
    ...s,
    pace: s.distance > 100 ? (s.moving_time / (s.distance / 1000)) : null,
  }));

  const validPaces = withPace.map(s => s.pace).filter(Boolean);
  const avgPace = validPaces.reduce((a, b) => a + b, 0) / validPaces.length;
  const minPace = Math.min(...validPaces);
  const maxPace = Math.max(...validPaces);
  const range = maxPace - minPace;

  return (
    <div className="py-8 border-b border-white/[0.04]">
      <SectionLabel index="02" label="Splits" sub="Per Kilometer" />
      <div className="space-y-1.5">
        {/* Column headers */}
        <div className="flex items-center gap-3 mb-4 pb-2 border-b border-white/[0.04]">
          <div className="font-mono text-[8px] text-white/25 uppercase tracking-widest w-5 text-right flex-shrink-0">KM</div>
          <div className="flex-1 font-mono text-[8px] text-white/25 uppercase tracking-widest">Pace</div>
          <div className="font-mono text-[8px] text-white/25 uppercase tracking-widest w-16 text-right flex-shrink-0 hidden sm:block">HR</div>
          <div className="font-mono text-[8px] text-white/25 uppercase tracking-widest w-10 text-right flex-shrink-0">ELEV</div>
        </div>

        {withPace.map((s, i) => {
          const barFill = range > 0
            ? 100 - ((s.pace - minPace) / range) * 55
            : 70;
          const isFaster = s.pace !== null && s.pace < avgPace;
          const delta = s.elevation_difference;

          return (
            <div key={i} className="flex items-center gap-3 group py-0.5">
              {/* KM */}
              <div className="font-mono text-[9px] text-white/25 w-5 text-right flex-shrink-0">
                {s.split}
              </div>

              {/* Bar track */}
              <div className="flex-1 h-7 bg-white/[0.03] relative overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full"
                  style={{
                    width: `${barFill}%`,
                    background: isFaster
                      ? 'linear-gradient(90deg, rgba(252,76,2,0.65) 0%, rgba(252,76,2,0.2) 100%)'
                      : 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%)',
                    boxShadow: isFaster ? '1px 0 12px rgba(252,76,2,0.25)' : 'none',
                    transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
                {/* Leading edge accent */}
                {isFaster && (
                  <div
                    className="absolute top-0 h-full w-px"
                    style={{
                      left: `${barFill}%`,
                      background: 'rgba(252,76,2,0.8)',
                      boxShadow: '0 0 4px rgba(252,76,2,0.6)',
                    }}
                  />
                )}
                {/* Pace label */}
                <div className="absolute inset-0 flex items-center px-3">
                  <span className={`font-mono text-[11px] font-medium ${isFaster ? 'text-orange' : 'text-white/45'}`}>
                    {formatPaceSec(s.pace)}
                  </span>
                </div>
              </div>

              {/* HR */}
              <div className="font-mono text-[9px] text-white/30 w-16 text-right flex-shrink-0 hidden sm:block">
                {s.average_heartrate ? `${Math.round(s.average_heartrate)} bpm` : ''}
              </div>

              {/* Elevation delta */}
              <div
                className={`font-mono text-[9px] w-10 text-right flex-shrink-0 ${
                  delta > 0 ? 'text-white/45' : delta < 0 ? 'text-white/25' : 'text-white/20'
                }`}
              >
                {delta != null ? `${delta > 0 ? '+' : ''}${Math.round(delta)}m` : ''}
              </div>
            </div>
          );
        })}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.04]">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-1.5" style={{ background: 'rgba(252,76,2,0.65)' }} />
            <span className="font-mono text-[8px] text-white/25 uppercase tracking-widest">Faster than avg</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-1.5 bg-white/10" />
            <span className="font-mono text-[8px] text-white/25 uppercase tracking-widest">Slower than avg</span>
          </div>
          <div className="ml-auto font-mono text-[8px] text-white/25 uppercase tracking-widest">
            Avg {formatPaceSec(avgPace)} /km
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Pure SVG chart — no external deps ────────────────────────────────────────

function SvgChart({ data, hasHR }) {
  const svgRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const PAD = { top: 8, right: hasHR ? 40 : 8, bottom: 22, left: 40 };
  const W = 700, H = 150; // intrinsic SVG units — scales with viewBox
  const IW = W - PAD.left - PAD.right;
  const IH = H - PAD.top - PAD.bottom;

  const paces = data.map(d => d.pace);
  const pMin = Math.min(...paces);
  const pMax = Math.max(...paces);
  const pPad = (pMax - pMin) * 0.12 || 10;
  const pDomain = [pMin - pPad, pMax + pPad]; // reversed: min at top

  const hrs = hasHR ? data.filter(d => d.hr).map(d => d.hr) : [];
  const hMin = hasHR ? Math.min(...hrs) - 5 : 0;
  const hMax = hasHR ? Math.max(...hrs) + 5 : 200;

  const dists = data.map(d => d.dist);
  const dMin = dists[0], dMax = dists[dists.length - 1];

  const xScale = d => PAD.left + ((d - dMin) / (dMax - dMin || 1)) * IW;
  // pace is reversed: higher sec = lower on chart
  const yPace = p => PAD.top + ((p - pDomain[0]) / (pDomain[1] - pDomain[0])) * IH;
  const yHR = h => PAD.top + ((hMax - h) / (hMax - hMin || 1)) * IH;

  const pacePath = data.map((d, i) =>
    `${i === 0 ? 'M' : 'L'}${xScale(d.dist).toFixed(1)},${yPace(d.pace).toFixed(1)}`
  ).join(' ');

  const hrPath = hasHR ? data.filter(d => d.hr).map((d, i) =>
    `${i === 0 ? 'M' : 'L'}${xScale(d.dist).toFixed(1)},${yHR(d.hr).toFixed(1)}`
  ).join(' ') : '';

  // Horizontal grid lines (4 lines)
  const pTicks = Array.from({ length: 4 }, (_, i) => pDomain[0] + (pDomain[1] - pDomain[0]) * (i / 3));

  // X-axis ticks — ~5 evenly spaced km labels
  const xTicks = (() => {
    const totalKm = Math.floor(dMax);
    const step = Math.max(1, Math.round(totalKm / 5));
    const ticks = [];
    for (let km = 0; km <= totalKm; km += step) ticks.push(km);
    return ticks;
  })();

  const handleMouseMove = useCallback((e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const distVal = dMin + ((svgX - PAD.left) / IW) * (dMax - dMin);
    const clamped = Math.max(dMin, Math.min(dMax, distVal));
    const nearest = data.reduce((a, b) =>
      Math.abs(b.dist - clamped) < Math.abs(a.dist - clamped) ? b : a
    );
    const screenX = ((xScale(nearest.dist) / W) * rect.width) + rect.left;
    setTooltip({ ...nearest, screenX, screenY: e.clientY });
  }, [data, dMin, dMax]); // eslint-disable-line

  return (
    <div className="relative" onMouseLeave={() => setTooltip(null)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={150}
        onMouseMove={handleMouseMove}
        style={{ overflow: 'visible', cursor: 'crosshair' }}
      >
        {/* Grid lines */}
        {pTicks.map((p, i) => (
          <line
            key={i}
            x1={PAD.left} y1={yPace(p)}
            x2={W - PAD.right} y2={yPace(p)}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1"
          />
        ))}

        {/* HR line */}
        {hrPath && (
          <path d={hrPath} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1" strokeLinejoin="round" />
        )}

        {/* Pace line */}
        <path d={pacePath} fill="none" stroke="#FC4C02" strokeWidth="1.5" strokeLinejoin="round" />

        {/* Pace area fill */}
        <path
          d={`${pacePath} L${xScale(dMax).toFixed(1)},${(PAD.top + IH).toFixed(1)} L${PAD.left},${(PAD.top + IH).toFixed(1)} Z`}
          fill="url(#paceGrad)"
        />
        <defs>
          <linearGradient id="paceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FC4C02" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#FC4C02" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y-axis: pace labels */}
        {pTicks.map((p, i) => (
          <text
            key={i}
            x={PAD.left - 4} y={yPace(p) + 3}
            textAnchor="end"
            fill="rgba(252,76,2,0.5)"
            fontSize="7"
            fontFamily="JetBrains Mono, monospace"
          >
            {formatPaceSec(p)}
          </text>
        ))}

        {/* Y-axis: HR labels */}
        {hasHR && [hMin + 5, Math.round((hMin + hMax) / 2), hMax - 5].map((h, i) => (
          <text
            key={i}
            x={W - PAD.right + 4} y={yHR(h) + 3}
            textAnchor="start"
            fill="rgba(255,255,255,0.2)"
            fontSize="7"
            fontFamily="JetBrains Mono, monospace"
          >
            {Math.round(h)}
          </text>
        ))}

        {/* X-axis labels */}
        {xTicks.map(km => (
          <text
            key={km}
            x={xScale(km)} y={H - 4}
            textAnchor="middle"
            fill="rgba(255,255,255,0.2)"
            fontSize="7"
            fontFamily="JetBrains Mono, monospace"
          >
            {km}km
          </text>
        ))}

        {/* Tooltip crosshair */}
        {tooltip && (
          <line
            x1={xScale(tooltip.dist)} y1={PAD.top}
            x2={xScale(tooltip.dist)} y2={PAD.top + IH}
            stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3"
          />
        )}
        {tooltip && (
          <circle cx={xScale(tooltip.dist)} cy={yPace(tooltip.pace)} r="3"
            fill="#FC4C02" stroke="#0a0a0a" strokeWidth="1.5" />
        )}
        {tooltip?.hr && (
          <circle cx={xScale(tooltip.dist)} cy={yHR(tooltip.hr)} r="2.5"
            fill="rgba(255,255,255,0.6)" stroke="#0a0a0a" strokeWidth="1.5" />
        )}
      </svg>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none font-mono text-[9px] border border-white/[0.1] bg-[#0a0a0a] px-3 py-2"
          style={{
            left: tooltip.screenX + 12,
            top: tooltip.screenY - 40,
            boxShadow: '4px 4px 0px rgba(0,0,0,0.8)',
          }}
        >
          <div className="text-white/30 mb-1 uppercase tracking-widest">{tooltip.dist} km</div>
          <div className="flex items-center gap-2">
            <span style={{ color: '#FC4C02' }}>▪</span>
            <span className="text-white/50">Pace</span>
            <span className="text-white">{formatPaceSec(tooltip.pace)}/km</span>
          </div>
          {tooltip.hr && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-white/30">▪</span>
              <span className="text-white/50">HR</span>
              <span className="text-white">{tooltip.hr} bpm</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PerformanceChart({ streams }) {
  const chartData = useMemo(() => {
    if (!streams?.length) return [];
    const distStream = streams.find(s => s.type === 'distance')?.data || [];
    const velStream = streams.find(s => s.type === 'velocity_smooth')?.data || [];
    const hrStream = streams.find(s => s.type === 'heartrate')?.data || [];

    const step = Math.max(1, Math.floor(distStream.length / 300));
    const data = [];
    for (let i = 0; i < distStream.length; i += step) {
      const vel = velStream[i];
      const pace = vel > 0.3 ? Math.round(1000 / vel) : null;
      if (!pace || pace > 1200) continue;
      data.push({
        dist: +(distStream[i] / 1000).toFixed(2),
        pace,
        hr: hrStream[i] ? Math.round(hrStream[i]) : undefined,
      });
    }
    return data;
  }, [streams]);

  const hasHR = chartData.some(d => d.hr);
  if (!chartData.length) return null;

  return (
    <div className="py-8 border-b border-white/[0.04]">
      <SectionLabel index="03" label="Output" sub="Pace + Heart Rate" />
      <SvgChart data={chartData} hasHR={hasHR} />
      <div className="flex items-center gap-6 mt-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-px" style={{ background: '#FC4C02' }} />
          <span className="font-mono text-[8px] text-white/25 uppercase tracking-widest">Pace</span>
        </div>
        {hasHR && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-px bg-white/30" />
            <span className="font-mono text-[8px] text-white/25 uppercase tracking-widest">Heart Rate</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SecondaryMetrics({ activity }) {
  const rows = [
    { label: 'Elevation Gain', value: activity?.total_elevation_gain != null ? `${Math.round(activity.total_elevation_gain)} m` : '—' },
    { label: 'Calories', value: activity?.calories ? activity.calories.toLocaleString() : '—' },
    { label: 'Cadence', value: activity?.average_cadence ? `${Math.round(activity.average_cadence * 2)} spm` : '—' },
    { label: 'Max Heart Rate', value: activity?.max_heartrate ? `${activity.max_heartrate} bpm` : '—' },
    { label: 'Elapsed Time', value: secToMmss(activity?.elapsed_time) },
    { label: 'Training Load', value: activity?.suffer_score ? Math.round(activity.suffer_score) : '—' },
    { label: 'Device', value: activity?.device_name || '—' },
    { label: 'Max Speed', value: activity?.max_speed ? `${(activity.max_speed * 3.6).toFixed(1)} km/h` : '—' },
  ];

  return (
    <div className="py-8">
      <SectionLabel index="04" label="Full Breakdown" sub="Session Data" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {rows.map(({ label, value }) => (
          <div key={label} className="bg-[#0a0a0a] px-4 py-4 hover:bg-white/[0.02] transition-colors">
            <div className="font-mono text-[8px] text-white/25 uppercase tracking-widest mb-2">{label}</div>
            <div className="font-mono text-sm text-white/75">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page Component ────────────────────────────────────────────────────────

export default function SessionDetailPage({ apiGet, onError }) {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [streams, setStreams] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const polyline = activity?.map?.summary_polyline || '';
  const points = useMemo(() => decodePolyline(polyline), [polyline]);

  useEffect(() => {
    let cancelled = false;
    async function fetchActivity() {
      try {
        setLoading(true);
        const [d, s] = await Promise.allSettled([
          apiGet(`/activities/${activityId}`),
          apiGet(`/activities/${activityId}/streams?keys=heartrate,velocity_smooth,altitude,distance,time`),
        ]);
        if (d.status === 'fulfilled') setActivity(d.value);
        else throw d.reason;
        if (s.status === 'fulfilled') setStreams(s.value);
      } catch (err) {
        console.error('[SessionDetail] Failed:', err);
        if (!cancelled) {
          onError?.();
          navigate('/');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchActivity();
    return () => { cancelled = true; };
  }, [activityId, apiGet, navigate, onError]);

  if (loading) return <LoadingState />;
  if (!activity) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <Header activity={activity} onExport={() => setExporting(true)} />
      <HeroSection activity={activity} />
      <StatsGrid activity={activity} />
      <MapSection activity={activity} points={points} />
      {activity.splits_metric?.length > 0 && (
        <SplitsBars splits={activity.splits_metric} />
      )}
      <PerformanceChart streams={streams} />
      <SecondaryMetrics activity={activity} />

      {/* Export Modal */}
      {exporting && (
        <Suspense fallback={null}>
          <CardExportModal
            activity={activity}
            onClose={() => setExporting(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
