// Demo mode: single 42km marathon session

function encodePolylineVal(val) {
  val = val < 0 ? ~(val << 1) : val << 1;
  let out = '';
  while (val >= 0x20) {
    out += String.fromCharCode((0x20 | (val & 0x1f)) + 63);
    val >>= 5;
  }
  return out + String.fromCharCode(val + 63);
}

function encodePolyline(coords) {
  let result = '', pLat = 0, pLng = 0;
  for (const [lat, lng] of coords) {
    const dLat = Math.round((lat - pLat) * 1e5);
    const dLng = Math.round((lng - pLng) * 1e5);
    result += encodePolylineVal(dLat) + encodePolylineVal(dLng);
    pLat = lat; pLng = lng;
  }
  return result;
}

// Generate a looping marathon route around Paris (Champs-Élysées area)
function buildRoute() {
  const pts = [];
  const cx = 48.8566, cy = 2.3522;
  const steps = 120;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const r = 0.065 + 0.012 * Math.sin(t * 3);
    pts.push([cx + r * Math.sin(t) * 0.9, cy + r * Math.cos(t) * 1.4]);
  }
  return encodePolyline(pts);
}

// Generate realistic stream data for a 42.195km run
function buildStreams() {
  const N = 422; // ~1 point per 100m
  const totalDist = 42195;
  const totalTime = 12780; // ~3h33m

  const distance = Array.from({ length: N }, (_, i) => Math.round((i / (N - 1)) * totalDist));
  const time = Array.from({ length: N }, (_, i) => Math.round((i / (N - 1)) * totalTime));

  const velocity_smooth = distance.map((d, i) => {
    const progress = i / N;
    // Slightly faster in first half (negative split attempt), fade at end
    const base = 3.35 + 0.08 * Math.sin(progress * Math.PI) - 0.15 * Math.pow(progress, 2.5);
    const noise = (Math.sin(i * 7.3) * 0.12) + (Math.sin(i * 13.7) * 0.06);
    return Math.max(2.8, Math.min(4.1, base + noise));
  });

  const heartrate = distance.map((_, i) => {
    const progress = i / N;
    // HR builds gradually then plateaus, slight cardiac drift
    const base = 148 + 22 * (1 - Math.exp(-progress * 4)) + 5 * progress;
    const noise = Math.sin(i * 5.1) * 2.5;
    return Math.round(Math.max(138, Math.min(182, base + noise)));
  });

  const altitude = distance.map((_, i) => {
    const progress = i / N;
    const base = 36 + 8 * Math.sin(progress * Math.PI * 4) + 4 * Math.cos(progress * Math.PI * 7);
    return Math.round(Math.max(28, Math.min(55, base)));
  });

  return [
    { type: 'distance', data: distance },
    { type: 'time', data: time },
    { type: 'velocity_smooth', data: velocity_smooth },
    { type: 'heartrate', data: heartrate },
    { type: 'altitude', data: altitude },
  ];
}

// Per-km splits
function buildSplits() {
  const splits = [];
  for (let km = 1; km <= 42; km++) {
    const progress = km / 42;
    const fatigue = 1 + 0.04 * Math.pow(progress, 2);
    const base = 303 * fatigue; // ~5:03/km fading
    const noise = Math.sin(km * 4.7) * 8;
    const moving_time = Math.round(base + noise);
    splits.push({
      distance: 1000,
      elapsed_time: moving_time + Math.round(Math.random() * 3),
      moving_time,
      start_index: (km - 1) * 10,
      end_index: km * 10,
      average_speed: 1000 / moving_time,
      average_heartrate: 148 + Math.round(22 * (1 - Math.exp(-progress * 4)) + 5 * progress),
      pace_zone: progress < 0.3 ? 3 : progress < 0.7 ? 4 : 5,
    });
  }
  // partial last split (195m)
  splits.push({
    distance: 195,
    elapsed_time: 59,
    moving_time: 58,
    start_index: 420,
    end_index: 422,
    average_speed: 3.36,
    average_heartrate: 171,
    pace_zone: 5,
  });
  return splits;
}

const POLYLINE = buildRoute();

export const DEMO_PROFILE = {
  id: 9001,
  firstname: 'Alex',
  lastname: 'Runner',
  username: 'alexrunner',
  profile: 'https://dgalywyr863hv.cloudfront.net/pictures/athletes/default.png',
  city: 'Paris',
  country: 'France',
  created_at: '2019-03-15T00:00:00Z',
  premium: true,
  summit: true,
};

export const DEMO_ACTIVITY_SUMMARY = {
  id: 42000001,
  name: 'Paris Marathon 2025',
  sport_type: 'Run',
  type: 'Run',
  distance: 42195,
  moving_time: 12780,
  elapsed_time: 12855,
  total_elevation_gain: 98,
  start_date: '2025-04-06T07:30:00Z',
  start_date_local: '2025-04-06T09:30:00Z',
  average_speed: 3.303,
  max_speed: 4.12,
  average_heartrate: 162,
  max_heartrate: 182,
  average_cadence: 88,
  calories: 2840,
  suffer_score: 287,
  map: { summary_polyline: POLYLINE },
  athlete_count: 1,
};

export const DEMO_ACTIVITY_DETAIL = {
  ...DEMO_ACTIVITY_SUMMARY,
  description: 'First sub-3:35 marathon. Negative split attempt — held back first half, paid off.',
  device_name: 'Garmin Forerunner 965',
  splits_metric: buildSplits(),
  laps: [],
  segment_efforts: [],
  photos: { primary: null, count: 0 },
  map: {
    ...DEMO_ACTIVITY_SUMMARY.map,
    polyline: POLYLINE,
  },
};

export const DEMO_STATS = {
  all_run_totals: { count: 187, distance: 2843200, moving_time: 871200, elevation_gain: 14800 },
  ytd_run_totals: { count: 24, distance: 412000, moving_time: 124800, elevation_gain: 1920 },
  recent_run_totals: { count: 6, distance: 89500, moving_time: 27060, elevation_gain: 480 },
  all_ride_totals: { count: 12, distance: 312000, moving_time: 46800, elevation_gain: 3200 },
  ytd_ride_totals: { count: 2, distance: 48000, moving_time: 7200, elevation_gain: 540 },
  recent_ride_totals: { count: 0, distance: 0, moving_time: 0, elevation_gain: 0 },
};

export const DEMO_STREAMS = buildStreams();
