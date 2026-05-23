import { useOrientation } from '../../../shared/hooks/useOrientation'
import './OrientationWarning.css'

export function OrientationWarning() {
  const orientation = useOrientation()

  const isMobileDevice = /iPhone|iPad|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  )

  const isPortrait = orientation === 'portrait'
  const shouldShowWarning = isMobileDevice && isPortrait

  return (
    <>
      {shouldShowWarning && (
        <div className="orientation-warning orientation-warning-active">
          <div className="orientation-warning-content">
            <div className="orientation-warning-icon">⟲</div>
            <h2>Gira tu dispositivo</h2>
            <p>Esta aplicación SOLO funciona en modo horizontal</p>
            <p className="orientation-warning-subtitle">
              Por favor, gira tu dispositivo para continuar
            </p>
          </div>
        </div>
      )}
    </>
  )
}
