import { useFullscreen } from '../hooks/useFullscreen'
import { Maximize2, Minimize2 } from 'lucide-react'

export function FullscreenButton() {
  const { isFullscreen, toggleFullscreen } = useFullscreen()

  const isMobileDevice = /iPhone|iPad|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  )

  if (!isMobileDevice) {
    return null
  }

  return (
    <button
      onClick={toggleFullscreen}
      aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
      title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        background: 'rgba(105, 191, 183, 0.9)',
        border: 'none',
        color: '#fff',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        boxShadow: '0 4px 12px rgba(105, 191, 183, 0.4)',
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(105, 191, 183, 1)'
        e.currentTarget.style.transform = 'scale(1.1)'
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(105, 191, 183, 0.6)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(105, 191, 183, 0.9)'
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(105, 191, 183, 0.4)'
      }}
    >
      {isFullscreen ? (
        <Minimize2 size={24} strokeWidth={2.5} />
      ) : (
        <Maximize2 size={24} strokeWidth={2.5} />
      )}
    </button>
  )
}
