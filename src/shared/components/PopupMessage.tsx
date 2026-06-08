import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

export type PopupVariant = 'info' | 'success' | 'warning' | 'error'

export interface PopupMessageProps {
  message: string | null
  title?: string
  onClose: () => void
  durationMs?: number
  variant?: PopupVariant
}

const VARIANT_CONFIG = {
  success: {
    bg: 'bg-slate-900/90 border-emerald-500/30 text-slate-100',
    iconClass: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20',
    barClass: 'bg-emerald-500',
    glowClass: 'shadow-[0_0_20px_rgba(16,185,129,0.25)]',
    defaultTitle: 'SISTEMA ESTABILIZADO',
    Icon: CheckCircle2,
  },
  error: {
    bg: 'bg-slate-900/90 border-rose-500/30 text-slate-100',
    iconClass: 'text-rose-400 bg-rose-500/10 border border-rose-500/20',
    barClass: 'bg-rose-500',
    glowClass: 'shadow-[0_0_20px_rgba(244,63,94,0.25)]',
    defaultTitle: 'FALLO DE SISTEMA',
    Icon: XCircle,
  },
  warning: {
    bg: 'bg-slate-900/90 border-amber-500/30 text-slate-100',
    iconClass: 'text-amber-400 bg-amber-500/10 border border-amber-500/20',
    barClass: 'bg-amber-500',
    glowClass: 'shadow-[0_0_20px_rgba(245,158,11,0.25)]',
    defaultTitle: 'ADVERTENCIA TÁCTICA',
    Icon: AlertTriangle,
  },
  info: {
    bg: 'bg-slate-900/90 border-sky-500/30 text-slate-100',
    iconClass: 'text-sky-400 bg-sky-500/10 border border-sky-500/20',
    barClass: 'bg-sky-500',
    glowClass: 'shadow-[0_0_20px_rgba(14,165,233,0.25)]',
    defaultTitle: 'REPORTE DE CONTROL',
    Icon: Info,
  },
}

export function PopupMessage({
  message,
  title,
  onClose,
  durationMs = 3800,
  variant = 'error',
}: PopupMessageProps) {
  const [internalMessage, setInternalMessage] = useState<string | null>(null)
  const [internalVariant, setInternalVariant] = useState<PopupVariant>('error')
  const [internalTitle, setInternalTitle] = useState<string | null>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!message) {
      setShow(false)
      return
    }

    setInternalMessage(message)
    setInternalVariant(variant)
    setInternalTitle(title || null)
    setShow(true)

    const timer = window.setTimeout(onClose, durationMs)
    return () => window.clearTimeout(timer)
  }, [message, variant, title, durationMs, onClose])

  const config = VARIANT_CONFIG[internalVariant]
  const IconComponent = config.Icon

  return (
    <AnimatePresence>
      {show && internalMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm sm:max-w-md pointer-events-none px-4">
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: -20, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85, y: -10 }}
            transition={{ type: 'spring', damping: 20, stiffness: 280 }}
            className={`pointer-events-auto flex items-start gap-3.5 relative overflow-hidden p-4 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 ${config.bg} ${config.glowClass}`}
          >
            {/* Timer Progress Bar */}
            {durationMs > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-slate-800/40">
                <motion.div
                  key={internalMessage}
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: durationMs / 1000, ease: 'linear' }}
                  className={`h-full ${config.barClass}`}
                />
              </div>
            )}

            {/* Left Icon Container */}
            <div className={`flex-shrink-0 p-2 rounded-lg ${config.iconClass}`}>
              <IconComponent className="w-5 h-5" strokeWidth={2.2} />
            </div>

            {/* Notification Text Content */}
            <div className="flex-1 min-w-0 pr-6">
              <h4 className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase">
                {internalTitle || config.defaultTitle}
              </h4>
              <p className="text-sm font-sans font-medium text-slate-400 mt-1 leading-relaxed">
                {internalMessage}
              </p>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar mensaje"
              className="flex-shrink-0 p-1 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition-colors duration-150 absolute top-3 right-3"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
