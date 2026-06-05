import { Check } from 'lucide-react'

interface AdminSyncOverlayProps {
  visible: boolean
  isReady: boolean
  progress: number
  phase: string
  presetName: string
  completeLabel?: string
  backLabel?: string
  showActions?: boolean
  showBackAction?: boolean
  onComplete?: () => void
  onBack?: () => void
}

const BRUSH_CLIP =
  'polygon(2% 8%, 95% 1%, 100% 12%, 96% 24%, 100% 36%, 95% 52%, 100% 68%, 94% 84%, 98% 100%, 2% 92%, 0% 84%, 4% 71%, 1% 58%, 5% 43%, 0% 28%, 6% 16%)'

export function AdminSyncOverlay({
  visible,
  isReady,
  progress,
  phase,
  presetName,
  completeLabel = 'ACCEDER AL SISTEMA',
  backLabel = 'VOLVER A LA OFICINA',
  showActions = true,
  showBackAction = true,
  onComplete,
  onBack,
}: AdminSyncOverlayProps) {
  if (!visible) return null

  const safeProgress = Math.max(0, Math.min(100, progress))
  const canAccess = isReady && Boolean(onComplete)

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-700">
      <div className="flex flex-col items-center gap-10 w-full max-w-md">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-cyan-500/10 rounded-full" />
          <div
            className="absolute inset-0 border-4 border-t-cyan-400 border-l-cyan-400/30 rounded-full animate-spin"
            style={{ animationDuration: '3s' }}
          />
          <div className="flex flex-col items-center">
            {isReady ? (
              <Check className="h-12 w-12 text-emerald-400" strokeWidth={3} />
            ) : (
              <span className="font-mono text-3xl font-black text-white leading-none">
                {Math.round(safeProgress)}%
              </span>
            )}
            <span className="font-mono text-[8px] text-cyan-400/60 uppercase tracking-[0.3em] mt-1">
              {isReady ? 'LINK_READY' : 'LINK_SYNC'}
            </span>
          </div>
        </div>

        <div className="w-full space-y-4 px-10">
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="font-mono text-[10px] font-black text-cyan-400 tracking-[0.5em] uppercase">
              {presetName}
            </p>
            <p className="font-mono text-[8px] text-white/30 uppercase tracking-widest">
              {isReady ? 'Conexión establecida' : phase}
            </p>
          </div>

          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-300 shadow-[0_0_15px_rgba(34,211,238,0.8)]"
              style={{ width: `${safeProgress}%` }}
            />
          </div>
        </div>

        {showActions ? (
          <div className="flex flex-col items-center gap-3 w-full px-8">
            <button
              onClick={canAccess ? onComplete : undefined}
              disabled={!canAccess}
              className={`group relative px-16 py-3 pointer-events-auto transition-all duration-300 ${
                canAccess ? 'active:scale-95' : 'opacity-40 cursor-not-allowed'
              }`}
              type="button"
            >
              <div
                className={`absolute inset-0 transition-all duration-300 -z-10 shadow-lg ${
                  canAccess
                    ? 'bg-[#020617]/95 group-hover:bg-cyan-300'
                    : 'bg-[#020617]/40 border border-cyan-500/10'
                }`}
                style={{
                  clipPath: BRUSH_CLIP,
                  transform: 'skewX(-5deg)',
                }}
              />
              <div className="relative z-10 flex items-center gap-3">
                {canAccess ? (
                  <Check
                    className="h-4 w-4 text-emerald-400 group-hover:text-black"
                    strokeWidth={3}
                  />
                ) : (
                  <span className="font-mono text-[10px] font-black text-cyan-400/50">
                    {Math.round(safeProgress)}%
                  </span>
                )}
                <span
                  className={`text-[10px] font-black tracking-[0.4em] uppercase drop-shadow-md transition-colors ${
                    canAccess ? 'text-white group-hover:text-black' : 'text-white/40'
                  }`}
                >
                  {completeLabel}
                </span>
              </div>
            </button>

            {showBackAction && onBack ? (
              <button
                onClick={onBack}
                className="pointer-events-auto flex items-center justify-center gap-2 group relative px-12 py-2.5"
                type="button"
              >
                <div
                  className="absolute inset-0 bg-[#020617]/60 group-hover:bg-blue-600/80 transition-all duration-300 -z-10"
                  style={{
                    clipPath: BRUSH_CLIP,
                    transform: 'skewX(-10deg)',
                  }}
                />
                <span className="text-[10px] font-black tracking-[0.25em] font-mono text-white/60 group-hover:text-white uppercase transition-colors">
                  {backLabel}
                </span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
