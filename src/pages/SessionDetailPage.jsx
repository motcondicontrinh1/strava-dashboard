import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
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

// ── Main Page Component ────────────────────────────────────────────────────────

export default function SessionDetailPage({ apiGet, onError }) {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const polyline = activity?.map?.summary_polyline || '';
  const points = useMemo(() => decodePolyline(polyline), [polyline]);

  useEffect(() => {
    let cancelled = false;
    async function fetchActivity() {
      try {
        setLoading(true);
        const data = await apiGet(`/activities/${activityId}`);
        if (!cancelled) setActivity(data);
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
