import { useState, useCallback } from 'react';

export type ResourceZoomTarget = 'station' | 'meat' | 'beer' | null;
export function useResourceCamera() {
  const [zoomedTarget, setZoomedTarget] = useState<ResourceZoomTarget>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const zoomToStation = useCallback(() => {
    setIsAnimating(true);
    setZoomedTarget('station');
  }, []);

  const zoomToMeat = useCallback(() => {
    setIsAnimating(true);
    setZoomedTarget('meat');
  }, []);

  const zoomToBeer = useCallback(() => {
    setIsAnimating(true);
    setZoomedTarget('beer');
  }, []);

  const resetCamera = useCallback(() => {
    setIsAnimating(true);
    setZoomedTarget(null);
  }, []);

  const cancelZoom = useCallback(() => {
    setIsAnimating(false);
    setZoomedTarget(null);
  }, []);

  return {
    zoomedTarget,
    isAnimating,
    zoomToStation,
    zoomToMeat,
    zoomToBeer,
    resetCamera,
    cancelZoom,
  };
}
