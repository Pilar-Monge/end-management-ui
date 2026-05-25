import { useCallback, useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export type AppState =
  | 'landing'
  | 'intro'
  | 'bridge'
  | 'video'
  | 'menu'
  | 'explore'
  | 'login'
  | 'register'
  | 'global-map'
  | 'camp-detail'

interface UseMainAppStateReturn {
  appState: AppState
  setAppState: (state: AppState) => void
  selectedCamp: any
  setSelectedCamp: (camp: any) => void
  isPaused: boolean
  setIsPaused: (paused: boolean) => void
  storyIndex: number
  setStoryIndex: (index: number) => void
  isTransitioning: boolean
  setIsTransitioning: (transitioning: boolean) => void
  popupMessage: string | null
  setPopupMessage: (message: string | null) => void
  sessionMessage: string | null
  readPersistedCampId: () => number | null
}

export function useMainAppState(): UseMainAppStateReturn {
  const location = useLocation()
  const sessionMessage = (location.state as { sessionMessage?: string } | null)?.sessionMessage ?? null
  const initialAppState = (location.state as { initialAppState?: AppState } | null)?.initialAppState

  const [appState, setAppState] = useState<AppState>(initialAppState ?? 'landing')
  const [selectedCamp, setSelectedCamp] = useState<any>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [storyIndex, setStoryIndex] = useState(-1)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [popupMessage, setPopupMessage] = useState<string | null>(null)

  const LAST_SELECTED_CAMP_ID_KEY = 'last_selected_camp_id'

  const readPersistedCampId = useCallback((): number | null => {
    const fromLocation = (location.state as { campId?: number } | null)?.campId
    if (typeof fromLocation === 'number' && fromLocation > 0) return fromLocation

    const fromStorage = localStorage.getItem(LAST_SELECTED_CAMP_ID_KEY)
    if (!fromStorage) return null
    const parsed = Number(fromStorage)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }, [location.state])

  useEffect(() => {
    if (appState === 'intro') {
      const timer = setTimeout(() => setIsTransitioning(false), 250)
      return () => clearTimeout(timer)
    }

    if (appState !== 'video' && appState !== 'bridge' && appState !== 'landing') {
      setIsTransitioning(true)
      const timer = setTimeout(() => setIsTransitioning(false), 250)
      return () => clearTimeout(timer)
    }
  }, [appState])

  return {
    appState,
    setAppState,
    selectedCamp,
    setSelectedCamp,
    isPaused,
    setIsPaused,
    storyIndex,
    setStoryIndex,
    isTransitioning,
    setIsTransitioning,
    popupMessage,
    setPopupMessage,
    sessionMessage,
    readPersistedCampId,
  }
}
