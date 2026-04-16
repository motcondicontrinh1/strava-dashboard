export default function LoadingScreen({ text }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-89px)]">
      <div className="w-12 h-12 border-2 border-white/[0.08] border-t-orange rounded-full animate-spin" />
      <p className="mt-6 font-mono text-xs text-white/50 uppercase tracking-widest">
        {text}
      </p>
    </div>
  );
}
