import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { SESSION_TOKEN_CHANGED_EVENT, sessionService } from '../services/sessionService'

export function useSessionManager() {
  const navigate = useNavigate()
  const isInitializedRef = useRef(false)

  useEffect(() => {
    const handleSessionExpired = () => {
      console.log('Session expired, redirecting to login')
      navigate('/', { replace: true })
    }

    const handleTokenRefreshed = () => {
      console.log('Token refreshed successfully')
    }

    const syncSessionManager = () => {
      const token = localStorage.getItem('token')

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

    return () => {
      window.removeEventListener(SESSION_TOKEN_CHANGED_EVENT, syncSessionManager)
      sessionService.stop()
      isInitializedRef.current = false
    }
  }, [navigate])
}
