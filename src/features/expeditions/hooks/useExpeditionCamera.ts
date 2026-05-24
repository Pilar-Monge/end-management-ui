import { useState, useCallback } from 'react'

export type ExpeditionZoomTarget = 'station' | 'map' | null

export function useExpeditionCamera() {
  const [zoomedTarget, setZoomedTarget] = useState<ExpeditionZoomTarget>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  const zoomToStation = useCallback(() => {
    setIsAnimating(true)
    setZoomedTarget('station')
  }, [])

  const zoomToMap = useCallback(() => {
    setIsAnimating(true)
    setZoomedTarget('map')
  }, [])

  const resetCamera = useCallback(() => {
    setIsAnimating(true)
    setZoomedTarget(null)
  }, [])

  const cancelZoom = useCallback(() => {
    setIsAnimating(false)
    setZoomedTarget(null)
  }, [])

  return {
    zoomedTarget,
    isAnimating,
    zoomToStation,
    zoomToMap,
    resetCamera,
    cancelZoom,
  }
}
