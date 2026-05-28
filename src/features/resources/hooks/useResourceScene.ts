import { useCallback, useRef, useState } from 'react'
import type { ResourceZoomTarget } from '../constants/resourceSceneConfigs'

export function useResourceScene() {
  const controlsRef = useRef<any>(null)
  const [hoveredTarget, setHoveredTarget] = useState<{
    type: Exclude<ResourceZoomTarget, null>
    name: string
    position: [number, number, number]
  } | null>(null)
  const [zoomedTarget, setZoomedTarget] = useState<ResourceZoomTarget>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  const handleTargetClick = useCallback(
    (event: any, type: Exclude<ResourceZoomTarget, null>) => {
      event.stopPropagation()
      if (zoomedTarget === null) {
        setHoveredTarget(null)
        setZoomedTarget(type)
      } else if (zoomedTarget === 'station') {
        setIsSyncing(true)
      }
    },
    [zoomedTarget],
  )

  return {
    controlsRef,
    hoveredTarget,
    setHoveredTarget,
    zoomedTarget,
    setZoomedTarget,
    isSyncing,
    setIsSyncing,
    handleTargetClick,
  }
}
