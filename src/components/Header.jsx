export default function Header({ profile, onDisconnect }) {
  return (
    <header className="relative z-10 px-6 md:px-12 py-6 border-b border-white/[0.08] flex justify-between items-center bg-gradient-to-b from-void to-void-2">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-2xl font-semibold text-orange uppercase tracking-tight">
          STRAVA
        </span>
        <span className="text-white/[0.12] font-light">//</span>
        <span className="text-xs text-white/50 uppercase tracking-widest font-normal">
          Command Center
        </span>
      </div>

      {profile && (
        <div className="flex items-center gap-6 font-mono text-[11px] text-white/50 uppercase tracking-wider">
          <div className="hidden sm:flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange animate-blink" />
            <span>LIVE</span>
          </div>
          <span className="hidden md:inline">ID: {profile.id}</span>
          <button
            onClick={onDisconnect}
            className="border border-white/[0.10] px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-white/50 cursor-pointer transition-all duration-200 hover:border-orange hover:text-orange bg-transparent"
          >
            Disconnect
          </button>
        </div>
      )}
    </header>
  );
}
