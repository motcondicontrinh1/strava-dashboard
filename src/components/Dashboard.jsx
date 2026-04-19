import { useState, useMemo, useRef, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistance, formatTime, formatPace, formatDate } from '../utils/formatters.js';

function MetricCard({ label, value, unit, secondary }) {
  return (
    <div className="metric-card">
      <div className="font-mono text-[10px] text-white/50 uppercase tracking-widest mb-4">{label}</div>
      <div className="font-mono text-5xl font-light text-white tracking-[-2px]">
        {value}
        {unit && <span className="text-lg text-white/50 ml-1">{unit}</span>}
      </div>
      {secondary && (
        <div className="font-mono text-[11px] text-white/50 mt-2 uppercase tracking-wider">{secondary}</div>
      )}
    </div>
  );
}

function StatPanel({ title, rows }) {
  return (
    <div className="bg-void-2 border border-white/[0.06] p-8">
      <div className="font-mono text-[10px] text-orange uppercase tracking-widest mb-6 pb-4 border-b border-white/[0.04]">
        {title}
      </div>
      {rows.map(([key, val, accent]) => (
        <div key={key} className="flex justify-between items-baseline py-3 border-b border-white/[0.04] last:border-b-0">
          <span className="text-sm text-white/60">{key}</span>
          <span className={`font-mono text-sm ${accent ? 'text-orange' : 'text-white'}`}>{val}</span>
        </div>
      ))}
    </div>
  );
}

function SortDropdown({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 border transition-colors ${
          open
            ? 'border-orange/40 text-orange bg-orange/10'
            : 'border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20'
        }`}
      >
        <span>Sort: {selected?.label}</span>
        <svg
          width="8" height="8" viewBox="0 0 8 8" fill="none"
          className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-[#0f0f0f] border border-white/[0.1] min-w-[160px]"
          style={{ boxShadow: '4px 4px 0px rgba(0,0,0,0.6)' }}
        >
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full flex items-center justify-between gap-4 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-left transition-colors border-b border-white/[0.04] last:border-b-0 ${
                o.value === value
                  ? 'text-orange bg-orange/[0.08]'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <span>{o.label}</span>
              {o.value === value && (
                <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                  <path d="M1 3L3 5L7 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" strokeLinejoin="miter"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const ACTIVITY_TYPES = ['All', 'Run', 'Ride', 'Swim', 'Walk', 'Hike'];
const SORT_OPTIONS = [
  { label: 'Recent', value: 'recent' },
  { label: 'Distance ↓', value: 'distance_desc' },
  { label: 'Distance ↑', value: 'distance_asc' },
  { label: 'Pace ↑', value: 'pace_asc' },
  { label: 'Heart Rate ↓', value: 'hr_desc' },
];

const ActivityRow = memo(function ActivityRow({ activity, onClick }) {
  return (
    <tr
      onClick={() => onClick(activity.id)}
      className="activity-row cursor-pointer hover:bg-white/[0.02] transition-colors"
    >
      <td className="px-6 py-6 border-b border-white/[0.04] font-medium text-white text-sm">{activity.name}</td>
      <td className="px-6 py-6 border-b border-white/[0.04] font-mono text-[10px] text-orange/70 uppercase tracking-wider">
        {activity.sport_type || activity.type || '—'}
      </td>
      <td className="px-6 py-6 border-b border-white/[0.04] font-mono text-sm text-white/60">
        {formatDate(activity.start_date_local || activity.start_date)}
      </td>
      <td className="px-6 py-6 border-b border-white/[0.04] font-mono text-sm text-orange">
        {formatDistance(activity.distance)}<span className="text-[10px] text-white/50 ml-1 uppercase">km</span>
      </td>
      <td className="px-6 py-6 border-b border-white/[0.04] font-mono text-sm text-white/60">
        {formatTime(activity.moving_time)}
      </td>
      <td className="px-6 py-6 border-b border-white/[0.04] font-mono text-sm text-white/60">
        {formatPace(activity.moving_time, activity.distance)}<span className="text-[10px] text-white/50 ml-1">/km</span>
      </td>
      <td className="px-6 py-6 border-b border-white/[0.04] font-mono text-sm text-white/60">
        {activity.average_heartrate ? <>{Math.round(activity.average_heartrate)}<span className="text-[10px] text-white/50 ml-1">bpm</span></> : '—'}
      </td>
      <td className="px-6 py-6 border-b border-white/[0.04] font-mono text-sm text-white/60">
        {activity.suffer_score ? Math.round(activity.suffer_score) : '—'}
      </td>
      <td className="px-6 py-6 border-b border-white/[0.04]">
        <span className="font-mono text-[9px] text-white/20 uppercase tracking-widest group-hover:text-orange/60 transition-colors">
          Detail →
        </span>
      </td>
    </tr>
  );
});

export default function Dashboard({ profile, activities, stats, onLoadMore, loadingMore, hasMoreActivities, apiGet }) {
  const [typeFilter, setTypeFilter] = useState('All');
  const [sortBy, setSortBy] = useState('recent');
  const navigate = useNavigate();

  const filteredActivities = useMemo(() => {
    let list = typeFilter === 'All'
      ? activities
      : activities.filter(a => a.type === typeFilter || a.sport_type === typeFilter);

    switch (sortBy) {
      case 'distance_desc': return [...list].sort((a, b) => b.distance - a.distance);
      case 'distance_asc': return [...list].sort((a, b) => a.distance - b.distance);
      case 'pace_asc': {
        const pace = a => a.distance > 0 ? a.moving_time / a.distance : Infinity;
        return [...list].sort((a, b) => pace(a) - pace(b));
      }
      case 'hr_desc': return [...list].sort((a, b) => (b.average_heartrate || 0) - (a.average_heartrate || 0));
      default: return list; // 'recent' — already sorted by API
    }
  }, [activities, typeFilter, sortBy]);

  if (!profile || !stats) return null;

  const allRun = stats.all_run_totals || {};
  const ytdRun = stats.ytd_run_totals || {};
  const allRide = stats.all_ride_totals || {};
  const recentRun = stats.recent_run_totals || {};
  const syncTime = new Date().toLocaleTimeString();

  return (
    <div>
      {/* Hero */}
      <section className="mb-16 py-12 border-b border-white/[0.08]">
        <div className="font-mono text-[11px] text-orange uppercase tracking-[3px] mb-4">
          Athlete Profile // {new Date(profile.created_at).getFullYear()}
        </div>
        <div className="flex items-start gap-6 mb-6">
          {profile.profile && profile.profile !== 'https://dgalywyr863hv.cloudfront.net/pictures/athletes/large.jpg' && (
            <div className="flex-shrink-0">
              <img
                src={profile.profile}
                alt={`${profile.firstname} ${profile.lastname}`}
                className="w-20 h-20 md:w-24 md:h-24 rounded-none object-cover"
                style={{ border: '1px solid rgba(252,76,2,0.3)', boxShadow: '4px 4px 0px rgba(252,76,2,0.2)' }}
              />
            </div>
          )}
          <div>
            <h1
              className="text-6xl md:text-7xl font-bold leading-[0.9] tracking-[-3px] mb-6"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.6) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {profile.firstname}<br />{profile.lastname}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-8 md:gap-12 font-mono text-sm text-white/50">
          <div>USERNAME <span className="text-white">{profile.username || 'unknown'}</span></div>
          <div>STATUS <span className="text-white">{profile.premium ? 'ELITE' : 'ACTIVE'}</span></div>
          <div>ACCESS <span className="text-white">{profile.summit ? 'SUMMIT' : 'STANDARD'}</span></div>
          {profile.city && <div>CITY <span className="text-white">{profile.city}</span></div>}
          {profile.country && <div>COUNTRY <span className="text-white">{profile.country}</span></div>}
        </div>
      </section>

      {/* Metrics */}
      <section className="mb-16">
        <SectionHeader index="01" label="Performance Metrics" sub="All-Time Statistics" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            label="Total Runs"
            value={(allRun.count || 0).toLocaleString()}
            unit="ACT"
            secondary={`${ytdRun.count || 0} YTD`}
          />
          <MetricCard
            label="Distance"
            value={Math.round((allRun.distance || 0) / 1000).toLocaleString()}
            unit="KM"
            secondary={`${Math.round((ytdRun.distance || 0) / 1000).toLocaleString()} YTD`}
          />
          <MetricCard
            label="Time Active"
            value={Math.round((allRun.moving_time || 0) / 3600).toLocaleString()}
            unit="HR"
            secondary={`${Math.round((allRun.moving_time || 0) / 3600 / 24)} DAYS`}
          />
          <MetricCard
            label="Elevation"
            value={Math.round(allRun.elevation_gain || 0).toLocaleString()}
            unit="M"
            secondary="GAIN"
          />
        </div>
      </section>

      {/* Activity Log */}
      <section className="mb-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-white/[0.04]">
          <div className="flex items-baseline gap-4">
            <span className="font-mono text-[11px] text-orange uppercase tracking-widest">
              02 // Activity Log
            </span>
            <span className="text-sm text-white/60 font-normal">
              {filteredActivities.length} sessions
            </span>
          </div>
          {/* Filter + Sort controls */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Type filter pills */}
            <div className="flex gap-1">
              {ACTIVITY_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 border transition-colors ${
                    typeFilter === t
                      ? 'border-orange text-orange bg-orange/10'
                      : 'border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            {/* Sort dropdown */}
            <SortDropdown value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden flex flex-col gap-3">
          {filteredActivities.length > 0 ? filteredActivities.map((a) => (
            <div
              key={a.id}
              onClick={() => navigate(`/session/${a.id}`)}
              className="bg-void-2 border border-white/[0.06] px-4 py-4 cursor-pointer transition-all duration-200 active:border-orange/40"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-mono text-[9px] text-orange/60 uppercase tracking-widest mb-1">
                    {a.sport_type || a.type || 'Activity'}
                  </div>
                  <div className="font-medium text-white text-sm leading-tight">{a.name}</div>
                  <div className="font-mono text-[11px] text-white/40 mt-1">
                    {formatDate(a.start_date_local || a.start_date)}
                  </div>
                </div>
                <span className="font-mono text-[10px] text-orange/60 mt-0.5">{'>'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/[0.04]">
                <div>
                  <div className="font-mono text-[10px] text-white/30 uppercase tracking-wider mb-1">Dist</div>
                  <div className="font-mono text-sm text-orange font-medium">
                    {formatDistance(a.distance)}<span className="text-[10px] text-white/40 ml-0.5">km</span>
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] text-white/30 uppercase tracking-wider mb-1">Time</div>
                  <div className="font-mono text-sm text-white/80">{formatTime(a.moving_time)}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] text-white/30 uppercase tracking-wider mb-1">Pace</div>
                  <div className="font-mono text-sm text-white/80">
                    {formatPace(a.moving_time, a.distance)}<span className="text-[10px] text-white/40 ml-0.5">/km</span>
                  </div>
                </div>
              </div>
              {(a.average_heartrate || a.suffer_score) ? (
                <div className="grid grid-cols-2 gap-2 pt-2 mt-2 border-t border-white/[0.04]">
                  {a.average_heartrate ? (
                    <div>
                      <div className="font-mono text-[10px] text-white/30 uppercase tracking-wider mb-1">HR</div>
                      <div className="font-mono text-sm text-white/70">
                        {Math.round(a.average_heartrate)}<span className="text-[10px] text-white/40 ml-0.5">bpm</span>
                      </div>
                    </div>
                  ) : <div />}
                  {a.suffer_score ? (
                    <div>
                      <div className="font-mono text-[10px] text-white/30 uppercase tracking-wider mb-1">Load</div>
                      <div className="font-mono text-sm text-white/70">{Math.round(a.suffer_score)}</div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )) : (
            <div className="text-center text-white/50 py-12 font-mono text-sm uppercase tracking-widest">
              No activities found
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Session', 'Type', 'Timestamp', 'Distance', 'Duration', 'Pace', 'Heart Rate', 'Load', ''].map((h) => (
                  <th key={h} className="font-mono text-[10px] text-white/50 uppercase tracking-widest text-left px-6 py-4 border-b border-white/[0.08] font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredActivities.length > 0 ? (
                filteredActivities.map((a) => (
                  <ActivityRow key={a.id} activity={a} onClick={() => navigate(`/session/${a.id}`)} />
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center text-white/50 py-12 font-mono text-sm uppercase tracking-widest">
                    No activities found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Load More */}
        {hasMoreActivities && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={onLoadMore}
              disabled={loadingMore}
              className="font-mono text-[11px] uppercase tracking-widest px-8 py-3 border border-white/[0.12] text-white/60 hover:border-orange/40 hover:text-orange transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loadingMore ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 border border-orange/60 border-t-transparent rounded-full animate-spin" />
                  Loading...
                </span>
              ) : 'Load More Sessions'}
            </button>
          </div>
        )}
      </section>

      {/* Secondary Stats */}
      <section className="mb-16">
        <SectionHeader index="03" label="Secondary Data" sub="Cycling & Recent Activity" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatPanel
            title="Cycling Metrics"
            rows={[
              ['Total Rides', (allRide.count || 0).toLocaleString()],
              ['Distance', `${Math.round((allRide.distance || 0) / 1000).toLocaleString()} km`],
              ['Longest Ride', `${Math.round((stats.biggest_ride_distance || 0) / 1000).toLocaleString()} km`],
            ]}
          />
          <StatPanel
            title="Recent 4 Weeks"
            rows={[
              ['Activities', (recentRun.count || 0).toLocaleString()],
              ['Distance', `${Math.round((recentRun.distance || 0) / 1000).toLocaleString()} km`],
              ['Avg per Run', `${recentRun.count ? (recentRun.distance / recentRun.count / 1000).toFixed(1) : 0} km`],
            ]}
          />
          <StatPanel
            title="System Status"
            rows={[
              ['API Status', 'ONLINE', true],
              ['Last Sync', syncTime],
              ['Data Source', 'STRAVA API'],
            ]}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-24 py-12 border-t border-white/[0.08] flex flex-col sm:flex-row justify-between items-center gap-4 font-mono text-[10px] text-white/50 uppercase tracking-widest">
        <span className="text-orange">STRAVA COMMAND CENTER</span>
        <span>
          {profile.firstname.toUpperCase()} {profile.lastname.toUpperCase()} // ID {profile.id}
        </span>
      </footer>
    </div>
  );
}

function SectionHeader({ index, label, sub }) {
  return (
    <div className="flex items-baseline gap-4 mb-8 pb-4 border-b border-white/[0.04]">
      <span className="font-mono text-[11px] text-orange uppercase tracking-widest">
        {index} // {label}
      </span>
      <span className="text-sm text-white/60 font-normal">{sub}</span>
    </div>
  );
}
