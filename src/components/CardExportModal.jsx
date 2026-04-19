import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { generateActivityCard, downloadCanvas } from '../utils/generateCard.js';

const FORMATS = [
  { id: 'square', label: 'Square', sub: '1080 × 1080', icon: '▪' },
  { id: 'story', label: 'Story', sub: '1080 × 1920', icon: '▮' },
];

const LAYOUTS = [
  { id: 'classic', label: 'Classic', desc: 'Clean & minimal' },
  { id: 'brutalist', label: 'Brutalist', desc: 'Bold grid architecture' },
  { id: 'kinetic', label: 'Kinetic', desc: 'Dynamic & overlapping' },
  { id: 'typography', label: 'Typography', desc: 'Type-driven poster' },
];

export default function CardExportModal({ activity, onClose }) {
  const [format, setFormat] = useState('square');
  const [layout, setLayout] = useState('classic');
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef(null);
  const previewRef = useRef(null);

  // Generate preview whenever format or layout changes
  useEffect(() => {
    let cancelled = false;
    async function render() {
      setGenerating(true);
      try {
        const canvas = await generateActivityCard(activity, format, layout);
        if (cancelled) return;
        canvasRef.current = canvas;

        // Draw scaled preview
        if (previewRef.current) {
          const preview = previewRef.current;
          const pCtx = preview.getContext('2d');
          preview.width = canvas.width;
          preview.height = canvas.height;
          pCtx.drawImage(canvas, 0, 0);
        }
      } finally {
        if (!cancelled) setGenerating(false);
      }
    }
    render();
    return () => { cancelled = true };
  }, [format, layout, activity]);

  // ESC key
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  function handleDownload() {
    if (!canvasRef.current) return;
    setDownloading(true);
    const slug = (activity.name || 'activity').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const date = (activity.start_date_local || '').slice(0, 10);
    downloadCanvas(canvasRef.current, `${slug}_${date}_${format}_${layout}.png`);
    setTimeout(() => setDownloading(false), 1200);
  }

  // Preview container aspect ratio
  const isStory = format === 'story';
  const previewAspect = isStory ? '9/16' : '1/1';

  return createPortal(
    <>
      {/* Backdrop — highest z-index to cover everything including maps */}
      <div
        className="fixed inset-0 z-[9998] bg-black/90"
        onClick={onClose}
        style={{ backdropFilter: 'blur(8px)' }}
      />

      {/* Modal — above backdrop */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-6 pointer-events-none"
      >
        <div
          className="pointer-events-auto w-full flex flex-col md:flex-row gap-6"
          style={{ maxWidth: 840 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Preview pane */}
          <div className="flex-1 flex flex-col items-center gap-4">
            <div
              className="relative w-full overflow-hidden border border-white/[0.08]"
              style={{
                aspectRatio: previewAspect,
                maxHeight: '60vh',
                maxWidth: isStory ? '33vh' : '60vh',
                // Checkerboard = transparency indicator
                backgroundImage: `
                  linear-gradient(45deg, #1a1a1a 25%, transparent 25%),
                  linear-gradient(-45deg, #1a1a1a 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, #1a1a1a 75%),
                  linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)
                `,
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                backgroundColor: '#111',
                boxShadow: '8px 8px 0px rgba(0,0,0,0.8)',
              }}
            >
              {generating && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className="w-8 h-8 border border-orange/50 border-t-orange animate-spin rounded-full"
                    />
                    <span className="font-mono text-[9px] text-white/30 uppercase tracking-widest">
                      Rendering...
                    </span>
                  </div>
                </div>
              )}
              <canvas
                ref={previewRef}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  opacity: generating ? 0.3 : 1,
                  transition: 'opacity 0.2s',
                  display: 'block',
                }}
              />
            </div>
          </div>

          {/* Controls pane */}
          <div
            className="flex flex-col justify-between border border-white/[0.06] bg-[#0a0a0a] p-6 md:p-8"
            style={{ minWidth: 240, boxShadow: '4px 4px 0px rgba(0,0,0,0.6)' }}
          >
            {/* Header */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="font-mono text-[9px] text-orange uppercase tracking-[3px] mb-1">
                    Export Card
                  </div>
                  <div className="font-mono text-[8px] text-white/25 uppercase tracking-widest">
                    Share on social
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center border border-white/[0.08] text-white/30 hover:text-white hover:border-orange/40 transition-colors font-mono text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Activity name */}
              <div
                className="font-bold tracking-[-1.5px] text-white mb-6 leading-[1]"
                style={{ fontSize: 'clamp(1.2rem, 3vw, 1.8rem)' }}
              >
                {activity.name}
              </div>

              {/* Format selector */}
              <div className="mb-8">
                <div className="font-mono text-[8px] text-white/30 uppercase tracking-widest mb-3">
                  Format
                </div>
                <div className="flex flex-col gap-2">
                  {FORMATS.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFormat(f.id)}
                      className={`flex items-center gap-3 px-4 py-3 border transition-colors text-left ${
                        format === f.id
                          ? 'border-orange/50 bg-orange/[0.08]'
                          : 'border-white/[0.06] hover:border-white/20'
                      }`}
                    >
                      <span
                        className="text-lg leading-none"
                        style={{
                          color: format === f.id ? '#FC4C02' : 'rgba(255,255,255,0.3)',
                          fontSize: f.id === 'story' ? '1.4rem' : '1rem',
                        }}
                      >
                        {f.icon}
                      </span>
                      <div>
                        <div className={`font-mono text-[10px] uppercase tracking-wider ${format === f.id ? 'text-orange' : 'text-white/50'}`}>
                          {f.label}
                        </div>
                        <div className="font-mono text-[8px] text-white/25 uppercase tracking-widest mt-0.5">
                          {f.sub}
                        </div>
                      </div>
                      {format === f.id && (
                        <div className="ml-auto">
                          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                            <path d="M1 3L3 5L7 1" stroke="#FC4C02" strokeWidth="1.2" strokeLinecap="square"/>
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout selector */}
              <div className="mb-8">
                <div className="font-mono text-[8px] text-white/30 uppercase tracking-widest mb-3">
                  Layout Style
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {LAYOUTS.map(l => (
                    <button
                      key={l.id}
                      onClick={() => setLayout(l.id)}
                      className={`relative flex flex-col gap-1 px-3 py-3 border transition-colors text-left ${
                        layout === l.id
                          ? 'border-orange/50 bg-orange/[0.08]'
                          : 'border-white/[0.06] hover:border-white/20'
                      }`}
                    >
                      <div className={`font-mono text-[10px] uppercase tracking-wider ${layout === l.id ? 'text-orange' : 'text-white/50'}`}>
                        {l.label}
                      </div>
                      <div className="font-mono text-[8px] text-white/25">
                        {l.desc}
                      </div>
                      {layout === l.id && (
                        <div className="absolute top-2 right-2">
                          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                            <path d="M1 3L3 5L7 1" stroke="#FC4C02" strokeWidth="1.2" strokeLinecap="square"/>
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info note */}
              <div className="border border-white/[0.04] px-4 py-3 mb-6">
                <div className="font-mono text-[8px] text-white/25 uppercase tracking-widest leading-relaxed">
                  Transparent PNG · 2× retina · {format === 'story' ? '2160 × 3840' : '2160 × 2160'} px
                </div>
              </div>
            </div>

            {/* Download button */}
            <button
              onClick={handleDownload}
              disabled={generating || downloading}
              className="w-full py-4 font-mono text-[11px] uppercase tracking-[2px] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: downloading ? 'rgba(252,76,2,0.15)' : '#FC4C02',
                color: downloading ? '#FC4C02' : '#0a0a0a',
                border: '1px solid #FC4C02',
                boxShadow: downloading ? 'none' : '4px 4px 0px rgba(252,76,2,0.3)',
              }}
            >
              {downloading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1 5L5 9L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
                  </svg>
                  Saved
                </span>
              ) : generating ? (
                'Rendering...'
              ) : (
                '↓ Download PNG'
              )}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
