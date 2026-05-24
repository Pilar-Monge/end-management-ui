import { useState, useCallback } from 'react'

export function useThreeSceneState() {
  const [selectedObject, setSelectedObject] = useState<string | null>(null)
  const [hoveredObject, setHoveredObject] = useState<string | null>(null)
  const [visibleObjects, setVisibleObjects] = useState<Set<string>>(new Set())
  const [isAnimating, setIsAnimating] = useState(false)

  const selectObject = useCallback((objectId: string) => {
    setSelectedObject(objectId)
  }, [])

  const deselectObject = useCallback(() => {
    setSelectedObject(null)
  }, [])

  const hoverObject = useCallback((objectId: string) => {
    setHoveredObject(objectId)
  }, [])

  const unhoverObject = useCallback(() => {
    setHoveredObject(null)
  }, [])

  const toggleObjectVisibility = useCallback((objectId: string) => {
    setVisibleObjects((prev) => {
      const next = new Set(prev)
      if (next.has(objectId)) {
        next.delete(objectId)
      } else {
        next.add(objectId)
      }
      return next
    })
  }, [])

  const setObjectsVisibility = useCallback((objectIds: string[]) => {
    setVisibleObjects(new Set(objectIds))
  }, [])

  const startAnimation = useCallback(() => {
    setIsAnimating(true)
  }, [])

  const stopAnimation = useCallback(() => {
    setIsAnimating(false)
  }, [])

  return {
    selectedObject,
    selectObject,
    deselectObject,

    hoveredObject,
    hoverObject,
    unhoverObject,

    visibleObjects,
    toggleObjectVisibility,
    setObjectsVisibility,

    isAnimating,
    startAnimation,
    stopAnimation,
  }
}
