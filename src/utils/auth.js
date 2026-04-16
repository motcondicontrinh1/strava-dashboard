const KEYS = {
  ACCESS_TOKEN: 'strava_access_token',
  REFRESH_TOKEN: 'strava_refresh_token',
  EXPIRES_AT: 'strava_expires_at',
};

export const REFRESH_BUFFER = 300; // seconds before expiry to proactively refresh

export function saveTokens(tokenData) {
  localStorage.setItem(KEYS.ACCESS_TOKEN, tokenData.access_token);
  localStorage.setItem(KEYS.REFRESH_TOKEN, tokenData.refresh_token);
  localStorage.setItem(KEYS.EXPIRES_AT, String(tokenData.expires_at));
}

export function loadTokens() {
  return {
    accessToken: localStorage.getItem(KEYS.ACCESS_TOKEN),
    refreshToken: localStorage.getItem(KEYS.REFRESH_TOKEN),
    expiresAt: parseInt(localStorage.getItem(KEYS.EXPIRES_AT) || '0', 10),
  };
}

export function clearTokens() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

export function getTimeUntilExpiry() {
  const { expiresAt } = loadTokens();
  if (!expiresAt) return null;
  return expiresAt - Math.floor(Date.now() / 1000);
}

export function isTokenExpired() {
  const t = getTimeUntilExpiry();
  return t === null || t <= 0;
}

export function needsRefresh() {
  const t = getTimeUntilExpiry();
  return t !== null && t <= REFRESH_BUFFER;
}

export async function exchangeTokenViaProxy(code) {
  const res = await fetch('/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirect_uri: window.location.origin }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Token exchange failed');
  }
  return res.json();
}

export async function refreshTokenViaProxy(refreshToken) {
  const res = await fetch('/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken, grant_type: 'refresh_token' }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Token refresh failed');
  }
  return res.json();
}
