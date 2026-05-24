import { useEffect, useState, useCallback } from 'react'

export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
  )

  const isMobileDevice = useCallback(() => {
    return /iPhone|iPad|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }, [])

  useEffect(() => {
    const handleOrientationChange = () => {
      const newOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      setOrientation(newOrientation)
    }

    const handleResize = () => {
      handleOrientationChange()
    }

    const lockOrientation = () => {
      if (isMobileDevice()) {
        try {
          const orientationAPI = (window.screen as any).orientation
          if (orientationAPI?.lock) {
            orientationAPI.lock('landscape').catch((error: any) => {
              console.log('Screen Lock API:', error?.message || 'No disponible')
            })
          }
        } catch (err) {
          console.log('Orientación no bloqueada en este navegador')
        }
      }
    }

    lockOrientation()

    window.addEventListener('orientationchange', handleOrientationChange)
    window.addEventListener('orientationchange', lockOrientation)
    window.addEventListener('resize', handleResize)

    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'))
      }, 100)
    })

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange)
      window.removeEventListener('orientationchange', lockOrientation)
      window.removeEventListener('resize', handleResize)
    }
  }, [isMobileDevice])

  return orientation
}
