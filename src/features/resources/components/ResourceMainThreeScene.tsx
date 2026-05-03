// @ts-nocheck
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, Html } from '@react-three/drei'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

const HANGAR_URL = 'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorRecursos/polygon.glb'
const MONITORING_STATION_URL = 'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorExpediciones/monitoring_station.glb'
const BEER_BREWERY_URL = 'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorRecursos/beer_brewery_set.glb'
const FORD_URL = 'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorRecursos/ford_f100_1967.glb'
const MEAT_URL = 'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorRecursos/vietnamese_meat_market_stall.glb'
const SHELF_URL = 'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorRecursos/metal_storage_cabinet.glb'
const FORKLIFT_URL = 'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorRecursos/forklifter_-_game_ready.glb'
const CEILING_LAMP_URL = 'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorRecursos/fluorescent_lamplight_-_4096px2.glb'
const FRUIT_URL = 'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorRecursos/fruit_veg_market%20(1).glb'
const CHAIR_URL = 'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorRecursos/dock-01_chair.glb'

const INITIAL_CAMERA = [-66.4, 11.2, -40.9] as [number, number, number]
const INITIAL_TARGET = [-60, 9, -33] as [number, number, number]
const TOTAL_LOAD_ITEMS = 10

type ResourceZoomTarget = 'station' | 'meat' | 'beer' | null

const ZOOM_VIEWS: Record<Exclude<ResourceZoomTarget, null>, {
  camera: [number, number, number]
  look: [number, number, number]
}> = {
  station: {
    camera: [-60, 10, -50],
    look: [-60, 8, -60],
  },
  meat: {
    camera: [-70, 15, -28],
    look: [-70, 4, 1],
  },
  beer: {
    camera: [-40, 15, -25],
    look: [-40, 4, 0],
  },
}

function ResourceModel({
  url,
  position,
  rotation = [0, 0, 0],
  scale = 1,
  targetSize = null,
  onLoaded,
  emissive = false,
  shadows = true,
  doubleSide = false,
}: {
  url: string
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
  targetSize?: number | null
  onLoaded?: () => void
  emissive?: boolean
  shadows?: boolean
  doubleSide?: boolean
}) {
  const { scene } = useGLTF(url)
  const clonedScene = useMemo(() => scene.clone(true), [scene])
  const loadedRef = useRef(false)

  useEffect(() => {
    clonedScene.rotation.set(rotation[0], rotation[1], rotation[2])
    clonedScene.scale.setScalar(scale)

    clonedScene.updateMatrixWorld(true)

    if (targetSize !== null) {
      const baseBox = new THREE.Box3().setFromObject(clonedScene)
      const baseSize = new THREE.Vector3()
      baseBox.getSize(baseSize)
      const maxDim = Math.max(baseSize.x, baseSize.y, baseSize.z)
      if (maxDim > 0) clonedScene.scale.setScalar(targetSize / maxDim)
      clonedScene.updateMatrixWorld(true)
    }

    const box = new THREE.Box3().setFromObject(clonedScene)
    const center = new THREE.Vector3()
    box.getCenter(center)
    clonedScene.position.set(
      position[0] - center.x + clonedScene.position.x,
      position[1] - box.min.y + clonedScene.position.y,
      position[2] - center.z + clonedScene.position.z,
    )

    clonedScene.traverse((child: any) => {
      if (!child.isMesh) return
      child.visible = true
      child.frustumCulled = false
      child.castShadow = shadows
      child.receiveShadow = shadows

      if ((emissive || doubleSide) && child.material) {
        const wasArray = Array.isArray(child.material)
        const materials = wasArray ? child.material : [child.material]
        const glowingMaterials = materials.map((material: any) => {
          const next = material.clone()
          if ('emissive' in next) {
            if (emissive) {
              next.emissive = new THREE.Color('#fff4d6')
              next.emissiveIntensity = 1.2
            }
          }
          if (doubleSide) {
            next.side = THREE.DoubleSide
            next.needsUpdate = true
          }
          return next
        })
        child.material = wasArray ? glowingMaterials : glowingMaterials[0]
      }
    })

    if (!loadedRef.current) {
      loadedRef.current = true
      onLoaded?.()
    }
  }, [clonedScene, emissive, onLoaded, position, rotation, scale, shadows, targetSize])

  return <primitive object={clonedScene} />
}

function ResourceLoader({ progress }: { progress: number }) {
  return (
    <div className="resource-app-loading">
      <div className="resource-loading-stack">
        <div className="resource-loading-brush">
          <span>{progress <= 0 ? 'INICIANDO...' : `CARGANDO... ${progress}%`}</span>
        </div>
        <div className="resource-loading-bar-shell">
          <div className="resource-loading-bar" style={{ width: `${progress}%` }} />
        </div>
        <div className="resource-loading-spinner" />
      </div>
    </div>
  )
}

function SyncOverlay({
  isSyncing,
  onCancel,
}: {
  isSyncing: boolean
  onCancel: () => void
}) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isSyncing) {
      setProgress(0)
      return
    }

    const interval = window.setInterval(() => {
      setProgress((value) => {
        if (value >= 100) {
          window.clearInterval(interval)
          return 100
        }
        return value + 2
      })
    }, 35)

    return () => window.clearInterval(interval)
  }, [isSyncing])

  if (!isSyncing) return null

  return (
    <div className="resource-sync-overlay">
      <div className="resource-sync-monitor-card">
        <div className="resource-sync-progress-ring" style={{ '--pct': progress } as React.CSSProperties}>
          <div className="resource-sync-progress-core">
            <span className="resource-sync-progress-text">{progress}%</span>
            <span className="resource-sync-code">Link_Sync</span>
          </div>
        </div>

        <div className="resource-sync-copy">
          <p className="resource-sync-title">Estación de Monitoreo</p>
          <p className="resource-sync-subtitle">Estableciendo conexión segura...</p>
          <div className="resource-sync-progress-bar-shell">
            <div className="resource-sync-progress-bar" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="resource-sync-actions">
          <button
            type="button"
            className="resource-sync-brush-btn resource-sync-brush-btn-primary"
            disabled={progress < 100}
            onClick={onCancel}
          >
            <span className="resource-sync-brush-btn-bg" />
            <span className="resource-sync-brush-btn-label">Acceder al Sistema</span>
          </button>
          <button
            type="button"
            className="resource-sync-brush-btn resource-sync-brush-btn-secondary"
            onClick={onCancel}
          >
            <span className="resource-sync-brush-btn-bg" />
            <span className="resource-sync-brush-btn-label">Volver al Hangar</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function CameraZoom({
  controlsRef,
  isZoomed,
}: {
  controlsRef: React.MutableRefObject<any>
  isZoomed: ResourceZoomTarget
}) {
  const { camera } = useThree()
  const targetView = isZoomed ? ZOOM_VIEWS[isZoomed] : null
  const zoomCamera = useMemo(
    () => (targetView ? new THREE.Vector3(...targetView.camera) : null),
    [targetView],
  )
  const zoomLook = useMemo(
    () => (targetView ? new THREE.Vector3(...targetView.look) : null),
    [targetView],
  )

  useFrame((_, delta) => {
    if (!isZoomed || !zoomCamera || !zoomLook) return
    camera.position.lerp(zoomCamera, 4 * delta)
    if (controlsRef.current) {
      controlsRef.current.target.lerp(zoomLook, 4 * delta)
      controlsRef.current.update()
    } else {
      camera.lookAt(zoomLook)
    }
  })

  return null
}

function TargetedSpotLight({
  position,
  targetPosition,
}: {
  position: [number, number, number]
  targetPosition: [number, number, number]
}) {
  const { scene } = useThree()
  const lightRef = useRef<THREE.SpotLight>(null)
  const target = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => {
    target.position.set(...targetPosition)
    scene.add(target)
    if (lightRef.current) lightRef.current.target = target

    return () => {
      scene.remove(target)
    }
  }, [scene, target, targetPosition])

  return (
    <spotLight
      ref={lightRef}
      color="#fff4d6"
      intensity={4.5}
      distance={80}
      angle={Math.PI / 3}
      penumbra={0.7}
      decay={1.1}
      position={position}
    />
  )
}

function ResourceSceneContent({
  onAssetLoaded,
  zoomedTarget,
  setZoomedTarget,
  setIsSyncing,
  hoveredTarget,
  setHoveredTarget,
  controlsRef,
}: {
  onAssetLoaded: () => void
  zoomedTarget: ResourceZoomTarget
  setZoomedTarget: (value: ResourceZoomTarget) => void
  setIsSyncing: (value: boolean) => void
  hoveredTarget: { type: Exclude<ResourceZoomTarget, null>, name: string, position: [number, number, number] } | null
  setHoveredTarget: (value: { type: Exclude<ResourceZoomTarget, null>, name: string, position: [number, number, number] } | null) => void
  controlsRef: React.MutableRefObject<any>
}) {
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
    [setHoveredTarget, setIsSyncing, setZoomedTarget, zoomedTarget],
  )

  return (
    <>
      <color attach="background" args={['#050505']} />

      <ambientLight color="#b8c5d6" intensity={0.55} />
      <hemisphereLight args={['#6a7a95', '#4a4540', 0.5]} />
      <pointLight color="#ffd9b3" intensity={0.4} position={[0, 25, 0]} />
      <directionalLight
        color="#fff0e0"
        intensity={1.8}
        position={[-50, 40, 50]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
      />
      <directionalLight color="#a0a8c0" intensity={0.6} position={[50, 20, -50]} />
      <pointLight color="#ffe8d0" intensity={0.8} distance={15} decay={1.5} position={[-70, 5, 1]} />
      <pointLight color="#e0d8cc" intensity={0.6} distance={50} decay={1.2} position={[-50, 8, -40]} />
      <pointLight color="#d5dde8" intensity={0.5} distance={50} decay={1.2} position={[30, 8, -40]} />
      <pointLight color="#e0d8cc" intensity={0.4} distance={50} decay={1.2} position={[0, 8, 0]} />

      <gridHelper args={[200, 50, '#22d3ee', '#1a1a1a']} position={[0, -0.01, 0]}>
        <meshBasicMaterial attach="material" color="#22d3ee" transparent opacity={0.4} />
      </gridHelper>

      <ResourceModel url={HANGAR_URL} position={[0, 0, 0]} onLoaded={onAssetLoaded} />
      <ResourceModel
        url={MONITORING_STATION_URL}
        position={[-60, 1, -60]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={7}
        onLoaded={onAssetLoaded}
      />
      <pointLight color="#00ffff" intensity={15} distance={15} decay={2} position={[-60, 5, -58]} />

      <ResourceModel
        url={BEER_BREWERY_URL}
        position={[-40, 0.5, 0]}
        rotation={[0, Math.PI, 0]}
        onLoaded={onAssetLoaded}
      />
      <ResourceModel url={FORD_URL} position={[50, 0.7, -56]} targetSize={25} onLoaded={onAssetLoaded} />
      <ResourceModel url={MEAT_URL} position={[-70, 0.5, 1]} scale={2} onLoaded={onAssetLoaded} />
      <ResourceModel url={SHELF_URL} position={[-74, 1, -60]} scale={0.2} onLoaded={onAssetLoaded} />
      <ResourceModel
        url={FORKLIFT_URL}
        position={[0, 0.9, -15]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={0.05}
        shadows={false}
        onLoaded={onAssetLoaded}
      />

      <ResourceModel
        url={CEILING_LAMP_URL}
        position={[-72, 20, -50]}
        rotation={[0, Math.PI * 1.5, 0]}
        targetSize={8}
        emissive
        onLoaded={onAssetLoaded}
      />
      <pointLight color="#fff8e8" intensity={6.5} distance={75} decay={1} position={[-72, 19, -50]} />
      <TargetedSpotLight position={[-72, 19.2, -50]} targetPosition={[-72, 0, -50]} />

      <ResourceModel
        url={CEILING_LAMP_URL}
        position={[-72, 20, -20]}
        rotation={[0, Math.PI * 1.5, 0]}
        targetSize={8}
        emissive
      />
      <pointLight color="#fff8e8" intensity={6.5} distance={75} decay={1} position={[-72, 19, -20]} />
      <TargetedSpotLight position={[-72, 19.2, -20]} targetPosition={[-72, 0, -20]} />

      <ResourceModel url={FRUIT_URL} position={[-95, 1, -16]} scale={0.04} onLoaded={onAssetLoaded} />
      <ResourceModel
        url={CHAIR_URL}
        position={[-55, 1, -50]}
        rotation={[0, THREE.MathUtils.degToRad(30), 0]}
        targetSize={7}
        onLoaded={onAssetLoaded}
      />

      <mesh
        position={[-60, 6, -60]}
        onPointerEnter={(event) => {
          event.stopPropagation()
          if (!zoomedTarget) setHoveredTarget({ type: 'station', name: 'Estación de Monitoreo', position: [-60, 14, -60] })
        }}
        onPointerLeave={(event) => {
          event.stopPropagation()
          setHoveredTarget(null)
        }}
        onClick={(event) => handleTargetClick(event, 'station')}
      >
        <boxGeometry args={[12, 10, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>

      <mesh
        position={[-70, 3, 1]}
        onPointerEnter={(event) => {
          event.stopPropagation()
          if (!zoomedTarget) setHoveredTarget({ type: 'meat', name: 'Puesto de Carne', position: [-70, 11, 1] })
        }}
        onPointerLeave={(event) => {
          event.stopPropagation()
          setHoveredTarget(null)
        }}
        onClick={(event) => handleTargetClick(event, 'meat')}
      >
        <boxGeometry args={[8, 6, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>

      <mesh
        position={[-40, 3, 0]}
        onPointerEnter={(event) => {
          event.stopPropagation()
          if (!zoomedTarget) setHoveredTarget({ type: 'beer', name: 'Cervecería', position: [-40, 11, 0] })
        }}
        onPointerLeave={(event) => {
          event.stopPropagation()
          setHoveredTarget(null)
        }}
        onClick={(event) => handleTargetClick(event, 'beer')}
      >
        <boxGeometry args={[10, 6, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>

      {hoveredTarget && !zoomedTarget && (
        <Html position={hoveredTarget.position} center style={{ pointerEvents: 'none' }}>
          <div className="resource-tooltip">{hoveredTarget.name.toUpperCase()}</div>
        </Html>
      )}

      <CameraZoom controlsRef={controlsRef} isZoomed={zoomedTarget} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.05}
        enableZoom
        minDistance={1}
        maxDistance={10.5}
        enabled={!zoomedTarget}
        target={INITIAL_TARGET}
      />
    </>
  )
}

interface ResourceMainThreeSceneProps {
  onExit?: () => void
}

export default function ResourceMainThreeScene({ onExit }: ResourceMainThreeSceneProps) {
  const controlsRef = useRef(null)
  const [loadedCount, setLoadedCount] = useState(0)
  const [hoveredTarget, setHoveredTarget] = useState<{ type: Exclude<ResourceZoomTarget, null>, name: string, position: [number, number, number] } | null>(null)
  const [zoomedTarget, setZoomedTarget] = useState<ResourceZoomTarget>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  const progress = Math.min(100, Math.round((loadedCount / TOTAL_LOAD_ITEMS) * 100))

  const handleAssetLoaded = useCallback(() => {
    setLoadedCount((value) => Math.min(TOTAL_LOAD_ITEMS, value + 1))
  }, [])

  const handleBack = useCallback(() => {
    if (isSyncing) {
      setIsSyncing(false)
      return
    }

    if (zoomedTarget) {
      setZoomedTarget(null)
      if (controlsRef.current) {
        controlsRef.current.object.position.set(...INITIAL_CAMERA)
        controlsRef.current.target.set(...INITIAL_TARGET)
        controlsRef.current.update()
      }
      return
    }

    onExit?.()
  }, [isSyncing, onExit, zoomedTarget])

  return (
    <div className="resource-scene-shell">
      {progress < 100 && <ResourceLoader progress={progress} />}

      <SyncOverlay isSyncing={isSyncing} onCancel={() => setIsSyncing(false)} />

      <Canvas
        shadows={{ type: THREE.BasicShadowMap }}
        camera={{ position: INITIAL_CAMERA, fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <ResourceSceneContent
            onAssetLoaded={handleAssetLoaded}
            zoomedTarget={zoomedTarget}
            setZoomedTarget={setZoomedTarget}
            setIsSyncing={setIsSyncing}
            hoveredTarget={hoveredTarget}
            setHoveredTarget={setHoveredTarget}
            controlsRef={controlsRef}
          />
        </Suspense>
      </Canvas>

      <div className="resource-hud">
        <div className="resource-hud-left">
          <button className="resource-hud-button resource-hud-button--back" type="button" onClick={handleBack}>
            <div className="resource-hud-button-bg" />
            <div className="resource-hud-button-content">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
              <span>VOLVER</span>
            </div>
          </button>
        </div>

        <div className="resource-hud-actions">
          <button className="resource-hud-icon-button" type="button" aria-label="Audio">
            <div className="resource-hud-button-bg" />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 10v3" />
              <path d="M6 6v11" />
              <path d="M10 3v18" />
              <path d="M14 8v7" />
              <path d="M18 5v13" />
              <path d="M22 10v3" />
            </svg>
          </button>

          <button className="resource-hud-icon-button" type="button" aria-label="Settings">
            <div className="resource-hud-button-bg" />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>

          <button className="resource-hud-icon-button" type="button" aria-label="Exit" onClick={onExit}>
            <div className="resource-hud-button-bg" />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

useGLTF.preload(HANGAR_URL)
useGLTF.preload(MONITORING_STATION_URL)
useGLTF.preload(BEER_BREWERY_URL)
useGLTF.preload(FORD_URL)
useGLTF.preload(MEAT_URL)
useGLTF.preload(SHELF_URL)
useGLTF.preload(FORKLIFT_URL)
useGLTF.preload(CEILING_LAMP_URL)
useGLTF.preload(FRUIT_URL)
useGLTF.preload(CHAIR_URL)
