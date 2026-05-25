import { useEffect } from 'react'

type PopupVariant = 'info' | 'success' | 'warning' | 'error'

interface PopupMessageProps {
  message: string | null
  onClose: () => void
  durationMs?: number
  variant?: PopupVariant
}

const POPUP_STYLES: Record<PopupVariant, { border: string; text: string; background: string }> = {
  info: {
    border: 'rgba(110,190,255,0.45)',
    text: '#a7d9ff',
    background: 'rgba(22,44,68,0.92)',
  },
  success: {
    border: 'rgba(89,201,122,0.45)',
    text: '#9be4b1',
    background: 'rgba(19,52,34,0.92)',
  },
  warning: {
    border: 'rgba(255,193,87,0.45)',
    text: '#ffd89b',
    background: 'rgba(64,44,17,0.92)',
  },
  error: {
    border: 'rgba(224,80,80,0.45)',
    text: '#f2a3a3',
    background: 'rgba(64,24,24,0.92)',
  },
}

export function PopupMessage({
  message,
  onClose,
  durationMs = 3800,
  variant = 'error',
}: PopupMessageProps) {
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(onClose, durationMs)
    return () => window.clearTimeout(timer)
  }, [durationMs, message, onClose])

  if (!message) return null

  const style = POPUP_STYLES[variant]

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        top: 18,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 4000,
        minWidth: 280,
        maxWidth: 'calc(100vw - 32px)',
        border: `1px solid ${style.border}`,
        background: style.background,
        color: style.text,
        borderRadius: 8,
        padding: '10px 38px 10px 12px',
        fontFamily: "'Courier New', monospace",
        fontSize: 11,
        letterSpacing: '0.6px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
      }}
    >
      {message}
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar mensaje"
        style={{
          position: 'absolute',
          right: 10,
          top: 8,
          border: 'none',
          background: 'transparent',
          color: style.text,
          cursor: 'pointer',
          fontSize: 14,
          lineHeight: 1,
          padding: 0,
        }}
      >
        x
      </button>
    </div>
  )
}
