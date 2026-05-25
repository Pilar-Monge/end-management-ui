import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SESSION_TOKEN_CHANGED_EVENT, sessionService } from '../services/sessionService'

const PUBLIC_PATHS = new Set(['/', '/login', '/main-homepage', '/admission', '/loading'])
const LAST_SECURE_PATH_KEY = 'last_secure_path'

export function useSessionManager() {
  const navigate = useNavigate()
  const location = useLocation()
  const isInitializedRef = useRef(false)

  useEffect(() => {
    const token = localStorage.getItem('token') ?? localStorage.getItem('accessToken')
    const isPublicPath = PUBLIC_PATHS.has(location.pathname)

    if (!token && !isPublicPath) {
      navigate('/main-homepage', {
        replace: true,
        state: {
          initialAppState: 'login',
          sessionMessage: 'Sesion inactiva. Inicia sesion para continuar.',
        },
      })
      return
    }

    if (token && !isPublicPath) {
      localStorage.setItem(LAST_SECURE_PATH_KEY, location.pathname)
    }
  }, [location.pathname, navigate])

  useEffect(() => {
    const handleSessionExpired = () => {
      navigate('/main-homepage', {
        replace: true,
        state: {
          initialAppState: 'login',
          sessionMessage: 'Sesion inactiva. Inicia sesion para continuar.',
        },
      })
    }

    const handleTokenRefreshed = () => {
      console.log('Token refreshed successfully')
    }

    const syncSessionManager = () => {
      const token = localStorage.getItem('token') ?? localStorage.getItem('accessToken')

      if (!token) {
        sessionService.stop()
        isInitializedRef.current = false
        return
      }

      if (isInitializedRef.current) return

      sessionService.start(handleSessionExpired, handleTokenRefreshed)
      isInitializedRef.current = true
    }

    syncSessionManager()
    window.addEventListener(SESSION_TOKEN_CHANGED_EVENT, syncSessionManager)
    const onStorageChange = (event: StorageEvent) => {
      if (!event.key) return
      if (event.key !== 'token' && event.key !== 'accessToken' && event.key !== 'user') return
      syncSessionManager()
    }
    window.addEventListener('storage', onStorageChange)

    return () => {
      window.removeEventListener(SESSION_TOKEN_CHANGED_EVENT, syncSessionManager)
      window.removeEventListener('storage', onStorageChange)
      sessionService.stop()
      isInitializedRef.current = false
    }
  }, [navigate])
}
