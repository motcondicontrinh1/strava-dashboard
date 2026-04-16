import { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header.jsx';
import OAuthScreen from './components/OAuthScreen.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import Dashboard from './components/Dashboard.jsx';
import {
  saveTokens, loadTokens, clearTokens,
  isTokenExpired, needsRefresh, getTimeUntilExpiry,
  exchangeTokenViaProxy, refreshTokenViaProxy,
  REFRESH_BUFFER,
} from './utils/auth.js';

export default function App() {
  const [screen, setScreen] = useState('oauth');
  const [loadingText, setLoadingText] = useState('Initializing...');
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);

  const accessTokenRef = useRef(null);
  const refreshTimerRef = useRef(null);

  // ── Token refresh ────────────────────────────────────────────────────────────

  const scheduleTokenRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const timeUntilExpiry = getTimeUntilExpiry();
    if (timeUntilExpiry === null) return;
    const refreshIn = Math.max(0, (timeUntilExpiry - REFRESH_BUFFER) * 1000);
    console.log(`[Token] Scheduling refresh in ${Math.round(refreshIn / 1000)}s`);
    refreshTimerRef.current = setTimeout(async () => {
      try {
        await doRefresh();
      } catch (err) {
        console.error('[Token] Auto-refresh failed:', err);
      }
    }, refreshIn);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doRefresh = useCallback(async () => {
    const { refreshToken } = loadTokens();
    if (!refreshToken) throw new Error('No refresh token');
    console.log('[Token] Refreshing...');
    const tokenData = await refreshTokenViaProxy(refreshToken);
    accessTokenRef.current = tokenData.access_token;
    saveTokens(tokenData);
    console.log('[Token] Refreshed successfully');
    scheduleTokenRefresh();
    return tokenData;
  }, [scheduleTokenRefresh]);

  const ensureValidToken = useCallback(async () => {
    if (isTokenExpired() || needsRefresh()) {
      await doRefresh();
    }
  }, [doRefresh]);

  // ── API ──────────────────────────────────────────────────────────────────────

  const apiGet = useCallback(async (endpoint) => {
    await ensureValidToken();
    const res = await fetch(`https://www.strava.com/api/v3${endpoint}`, {
      headers: { Authorization: `Bearer ${accessTokenRef.current}` },
    });
    if (res.status === 401) {
      await doRefresh();
      const retry = await fetch(`https://www.strava.com/api/v3${endpoint}`, {
        headers: { Authorization: `Bearer ${accessTokenRef.current}` },
      });
      if (!retry.ok) throw new Error(`API error: ${retry.status}`);
      return retry.json();
    }
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }, [ensureValidToken, doRefresh]);

  // ── Dashboard load ───────────────────────────────────────────────────────────

  const loadDashboard = useCallback(async () => {
    setScreen('loading');
    setLoadingText('Fetching athlete data...');
    try {
      const p = await apiGet('/athlete');
      setLoadingText('Loading activities...');
      const a = await apiGet('/athlete/activities?per_page=5');
      setLoadingText('Compiling statistics...');
      const s = await apiGet(`/athletes/${p.id}/stats`);
      setProfile(p);
      setActivities(a);
      setStats(s);
      setScreen('dashboard');
    } catch (err) {
      setError(err.message);
      setScreen('oauth');
      clearTokens();
      accessTokenRef.current = null;
    }
  }, [apiGet]);

  // ── Disconnect ───────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    clearTokens();
    accessTokenRef.current = null;
    setProfile(null);
    setActivities([]);
    setStats(null);
    setError('');
    setScreen('oauth');
  }, []);

  // ── Init ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      // OAuth callback
      if (window.location.search.includes('code=')) {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const oauthError = params.get('error');

        if (oauthError) {
          setError('Authorization denied: ' + oauthError);
          setScreen('oauth');
          return;
        }

        if (code) {
          setScreen('loading');
          setLoadingText('Exchanging authorization code...');
          try {
            const tokenData = await exchangeTokenViaProxy(code);
            accessTokenRef.current = tokenData.access_token;
            saveTokens(tokenData);
            scheduleTokenRefresh();
            window.history.replaceState({}, document.title, window.location.pathname);
            await loadDashboard();
          } catch (err) {
            window.history.replaceState({}, document.title, window.location.pathname);
            setError(err.message);
            setScreen('oauth');
          }
          return;
        }
      }

      // Existing session
      const tokens = loadTokens();
      if (tokens.accessToken && tokens.refreshToken) {
        accessTokenRef.current = tokens.accessToken;
        if (isTokenExpired()) {
          try {
            await doRefresh();
          } catch {
            disconnect();
            return;
          }
        } else {
          scheduleTokenRefresh();
        }
        await loadDashboard();
      } else if (tokens.accessToken) {
        // Old format without refresh token
        clearTokens();
        setScreen('oauth');
      } else {
        setScreen('oauth');
      }
    }

    init();
    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-void text-white min-h-screen overflow-x-hidden font-sans">
      {/* Ambient glow blobs */}
      <div
        className="fixed pointer-events-none z-0 animate-pulse-glow"
        style={{
          top: '-50%', left: '-20%',
          width: 800, height: 800,
          background: 'radial-gradient(circle, rgba(252,76,2,0.08) 0%, transparent 70%)',
        }}
      />
      <div
        className="fixed pointer-events-none z-0 animate-pulse-glow-delay"
        style={{
          top: '40%', left: '60%',
          width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(252,76,2,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10">
        <Header profile={profile} onDisconnect={disconnect} />
        <main className="max-w-7xl mx-auto px-6 md:px-12 py-12">
          {screen === 'oauth' && <OAuthScreen error={error} />}
          {screen === 'loading' && <LoadingScreen text={loadingText} />}
          {screen === 'dashboard' && (
            <Dashboard profile={profile} activities={activities} stats={stats} />
          )}
        </main>
      </div>
    </div>
  );
}
