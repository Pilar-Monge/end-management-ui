import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { sessionService } from '../services/sessionService'

export function useSessionManager() {
  const navigate = useNavigate()
  const isInitializedRef = useRef(false)

  useEffect(() => {
    if (isInitializedRef.current) return
    isInitializedRef.current = true

    const token = localStorage.getItem('token')
    if (!token) return

    const handleSessionExpired = () => {
      console.log('Session expired, redirecting to login')
      navigate('/', { replace: true })
    }

    const handleTokenRefreshed = () => {
      console.log('Token refreshed successfully')
    }

    sessionService.start(handleSessionExpired, handleTokenRefreshed)

    return () => {}
  }, [navigate])

  useEffect(() => {
    return () => {
      sessionService.stop()
    }
  }, [])
}
