export const formatDistance = (m) => (m / 1000).toFixed(2);

export const formatTime = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
};

export const formatPace = (s, m) => {
  if (!m) return '0:00';
  const pace = s / (m / 1000);
  const min = Math.floor(pace / 60);
  const sec = Math.floor(pace % 60);
  return `${min}:${String(sec).padStart(2, '0')}`;
};

export const formatDate = (iso) => {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
};
