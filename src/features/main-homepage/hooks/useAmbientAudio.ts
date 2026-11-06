import { useEffect, useRef } from 'react'
import type { Mode } from '../constants/sceneConfigs'

type AmbientTrack = 'birds' | 'blizzard' | 'horror' | 'rainThunder'

interface UseAmbientAudioOptions {
  appState: string
  currentMode: Mode
  volume: number
}

const FADE_DURATION_MS = 1000
const FADE_STEP_MS = 50

const TRACK_URLS: Record<AmbientTrack, string> = {
  birds:
    'https://pub-9d9e76b894c2469985b070f298268aad.r2.dev/Background-sound/birds_and_water_stream_in_the_morning.mp3',
  // WAV ambience can be heavy over the network; consider converting to MP3 if startup feels delayed.
  blizzard: 'https://pub-9d9e76b894c2469985b070f298268aad.r2.dev/Background-sound/blizzard.wav',
  // WAV ambience can be heavy over the network; consider converting to MP3 if startup feels delayed.
  horror: 'https://pub-9d9e76b894c2469985b070f298268aad.r2.dev/Background-sound/horror-sound.wav',
  // WAV ambience can be heavy over the network; consider converting to MP3 if startup feels delayed.
  rainThunder:
    'https://pub-9d9e76b894c2469985b070f298268aad.r2.dev/Background-sound/rain__thunder.wav',
}

const MODE_TRACKS: Record<Mode, AmbientTrack> = {
  Hazy: 'birds',
  Early: 'birds',
  Summer: 'birds',
  Noche: 'blizzard',
  Cotton: 'blizzard',
  Storm: 'rainThunder',
}

const TRACK_NAMES = Object.keys(TRACK_URLS) as AmbientTrack[]

export function useAmbientAudio({ appState, currentMode, volume }: UseAmbientAudioOptions) {
  const audioRefs = useRef<Partial<Record<AmbientTrack, HTMLAudioElement>>>({})
  const fadeTimersRef = useRef<Partial<Record<AmbientTrack, number>>>({})
  const fadeLevelsRef = useRef<Record<AmbientTrack, number>>({
    birds: 0,
    blizzard: 0,
    horror: 0,
    rainThunder: 0,
  })
  const activeTracksRef = useRef<Set<AmbientTrack>>(new Set())
  const pendingPlayTracksRef = useRef<Set<AmbientTrack>>(new Set())
  const previousAppStateRef = useRef(appState)
  const volumeRef = useRef(volume)

  const applyTrackVolume = (track: AmbientTrack) => {
    const audio = audioRefs.current[track]
    if (!audio) return
    audio.volume = Math.max(0, Math.min(1, (volumeRef.current / 100) * fadeLevelsRef.current[track]))
  }

  const requestPlay = (track: AmbientTrack) => {
    const audio = audioRefs.current[track]
    if (!audio) return

    const playPromise = audio.play()
    if (playPromise) {
      playPromise
        .then(() => pendingPlayTracksRef.current.delete(track))
        .catch(() => pendingPlayTracksRef.current.add(track))
    }
  }

  const fadeTrack = (track: AmbientTrack, targetLevel: number, pauseWhenSilent: boolean) => {
    const audio = audioRefs.current[track]
    if (!audio) return

    window.clearInterval(fadeTimersRef.current[track])

    if (targetLevel > 0) {
      activeTracksRef.current.add(track)
      requestPlay(track)
    }

    const startLevel = fadeLevelsRef.current[track]
    const startedAt = window.performance.now()

    fadeTimersRef.current[track] = window.setInterval(() => {
      const elapsed = window.performance.now() - startedAt
      const progress = Math.min(1, elapsed / FADE_DURATION_MS)
      fadeLevelsRef.current[track] = startLevel + (targetLevel - startLevel) * progress
      applyTrackVolume(track)

      if (progress >= 1) {
        window.clearInterval(fadeTimersRef.current[track])
        delete fadeTimersRef.current[track]
        fadeLevelsRef.current[track] = targetLevel
        applyTrackVolume(track)

        if (targetLevel === 0 && pauseWhenSilent) {
          activeTracksRef.current.delete(track)
          pendingPlayTracksRef.current.delete(track)
          audio.pause()
        }
      }
    }, FADE_STEP_MS)
  }

  const activateTracks = (tracks: AmbientTrack[]) => {
    const nextTracks = new Set(tracks)

    TRACK_NAMES.forEach((track) => {
      if (nextTracks.has(track)) {
        if (activeTracksRef.current.has(track) && fadeLevelsRef.current[track] === 1) {
          requestPlay(track)
          return
        }
        fadeTrack(track, 1, false)
        return
      }

      if (activeTracksRef.current.has(track) || fadeLevelsRef.current[track] > 0) {
        fadeTrack(track, 0, true)
      }
    })
  }

  useEffect(() => {
    TRACK_NAMES.forEach((track) => {
      const audio = document.createElement('audio')
      audio.src = TRACK_URLS[track]
      audio.loop = true
      audio.preload = 'auto'
      audio.volume = 0
      audioRefs.current[track] = audio
    })

    const retryPendingPlayback = () => {
      activeTracksRef.current.forEach((track) => requestPlay(track))
    }

    document.addEventListener('click', retryPendingPlayback)
    document.addEventListener('touchstart', retryPendingPlayback)

    fadeTrack('rainThunder', 1, false)

    return () => {
      document.removeEventListener('click', retryPendingPlayback)
      document.removeEventListener('touchstart', retryPendingPlayback)
      TRACK_NAMES.forEach((track) => {
        window.clearInterval(fadeTimersRef.current[track])
        const audio = audioRefs.current[track]
        if (audio) {
          audio.pause()
          audio.src = ''
        }
      })
    }
  }, [])

  useEffect(() => {
    volumeRef.current = volume
    activeTracksRef.current.forEach((track) => applyTrackVolume(track))
  }, [volume])

  useEffect(() => {
    if (appState === 'intro') {
      activateTracks(['rainThunder', 'horror'])
      previousAppStateRef.current = appState
      return
    }

    if (previousAppStateRef.current === 'intro') {
      activateTracks([MODE_TRACKS[currentMode]])
      previousAppStateRef.current = appState
      return
    }

    activateTracks([MODE_TRACKS[currentMode]])
    previousAppStateRef.current = appState
  }, [appState, currentMode])
}
