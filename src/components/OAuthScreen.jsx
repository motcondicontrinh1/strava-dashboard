const CLIENT_ID = '225803';

export default function OAuthScreen({ error }) {
  const redirectUri = window.location.origin;
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&approval_prompt=force&scope=read,activity:read_all,profile:read_all`;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-89px)] text-center px-6">
      <h1
        className="text-6xl md:text-7xl font-bold leading-[0.9] tracking-[-3px] mb-6"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.6) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        COMMAND<br />CENTER
      </h1>

      <p className="text-base text-white/50 mb-12 max-w-md leading-relaxed">
        Connect your Strava account to access your athletic performance data,
        activity logs, and real-time statistics.
      </p>

      <a
        href={authUrl}
        className="inline-flex items-center gap-4 bg-orange text-white px-12 py-5 font-mono text-sm font-medium uppercase tracking-widest no-underline border-none cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
        style={{ boxShadow: '0 0 40px rgba(252, 76, 2, 0.3)' }}
        onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 0 60px rgba(252, 76, 2, 0.5)')}
        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 0 40px rgba(252, 76, 2, 0.3)')}
      >
        <span>⚡</span>
        Authorize with Strava
      </a>

      <p className="mt-8 font-mono text-[10px] text-white/30 uppercase tracking-wider">
        Requires Strava account • Read-only access
      </p>

      {error && (
        <div className="mt-6 bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-4 font-mono text-xs text-left max-w-md">
          <div className="font-semibold mb-1">Error: {error}</div>
          <div className="text-white/30 text-[10px] mt-2">redirect_uri used: {window.location.origin}</div>
        </div>
      )}
    </div>
  );
}
