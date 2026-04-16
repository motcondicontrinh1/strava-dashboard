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

export default function Dashboard({ profile, activities, stats }) {
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
        <div className="flex flex-wrap gap-8 md:gap-12 font-mono text-sm text-white/50">
          <div>USERNAME <span className="text-white">{profile.username || 'unknown'}</span></div>
          <div>STATUS <span className="text-white">{profile.premium ? 'ELITE' : 'ACTIVE'}</span></div>
          <div>ACCESS <span className="text-white">{profile.summit ? 'SUMMIT' : 'STANDARD'}</span></div>
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
        <SectionHeader index="02" label="Activity Log" sub="Recent Sessions" />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Session', 'Timestamp', 'Distance', 'Duration', 'Pace', 'Heart Rate', 'Load', ''].map((h) => (
                  <th
                    key={h}
                    className={`font-mono text-[10px] text-white/50 uppercase tracking-widest text-left px-6 py-4 border-b border-white/[0.08] font-normal ${
                      h === 'Timestamp' || h === 'Heart Rate' || h === 'Load' ? 'hidden md:table-cell' : ''
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activities.length > 0 ? (
                activities.map((a) => (
                  <tr
                    key={a.id}
                    className="activity-row cursor-pointer"
                    onClick={() => window.open(`https://www.strava.com/activities/${a.id}`, '_blank')}
                  >
                    <td className="px-6 py-6 border-b border-white/[0.04] font-medium text-white text-sm">{a.name}</td>
                    <td className="px-6 py-6 border-b border-white/[0.04] font-mono text-sm text-white/60 hidden md:table-cell">
                      {formatDate(a.start_date_local || a.start_date)}
                    </td>
                    <td className="px-6 py-6 border-b border-white/[0.04] font-mono text-sm text-orange">
                      {formatDistance(a.distance)}<span className="text-[10px] text-white/50 ml-1 uppercase">km</span>
                    </td>
                    <td className="px-6 py-6 border-b border-white/[0.04] font-mono text-sm text-white/60">
                      {formatTime(a.moving_time)}
                    </td>
                    <td className="px-6 py-6 border-b border-white/[0.04] font-mono text-sm text-white/60">
                      {formatPace(a.moving_time, a.distance)}<span className="text-[10px] text-white/50 ml-1">/km</span>
                    </td>
                    <td className="px-6 py-6 border-b border-white/[0.04] font-mono text-sm text-white/60 hidden md:table-cell">
                      {Math.round(a.average_heartrate || 0)}<span className="text-[10px] text-white/50 ml-1">bpm</span>
                    </td>
                    <td className="px-6 py-6 border-b border-white/[0.04] font-mono text-sm text-white/60 hidden md:table-cell">
                      {Math.round(a.suffer_score || 0)}
                    </td>
                    <td className="px-6 py-6 border-b border-white/[0.04]">
                      <span className="activity-chevron">{'>'}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center text-white/50 py-12 font-mono text-sm uppercase tracking-widest">
                    No activities found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
