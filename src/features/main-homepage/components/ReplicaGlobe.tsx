import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Globe from 'react-globe.gl'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, HelpCircle } from 'lucide-react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'

interface ParticleSystemProps {
  onComplete?: () => void
  progress: number
  isReady: boolean
}

type ParticleWorkerData = {
  start: Float32Array
  end: Float32Array
  colors: Float32Array
  cyberPositions: Float32Array
  cyberVelocities: Float32Array
}

const FORMATION_COUNT = 20000
const CYBER_COUNT = 2000

const ParticleSystem: React.FC<ParticleSystemProps> = React.memo(({ progress, isReady }) => {
  const [particleData, setParticleData] = useState<ParticleWorkerData | null>(null)
  const swarmRef = useRef<THREE.Points>(null!)
  const swarmMaterialRef = useRef<THREE.PointsMaterial>(null!)
  const cyberRef = useRef<THREE.Points>(null!)
  const initialSwarmPositions = useMemo(() => new Float32Array(FORMATION_COUNT * 3), [particleData])
  const fallbackColors = useMemo(() => new Float32Array(FORMATION_COUNT * 3), [])
  const fallbackCyberPositions = useMemo(() => new Float32Array(CYBER_COUNT * 3), [])
  const readyTimestamp = useRef<number | null>(null)

  useEffect(() => {
    const worker = new Worker(new URL('../workers/particleDataWorker.ts', import.meta.url), {
      type: 'module',
    })

    worker.onmessage = ({ data }: MessageEvent<ParticleWorkerData>) => {
      setParticleData(data)
    }

    worker.postMessage({ formationCount: FORMATION_COUNT, cyberCount: CYBER_COUNT })

    return () => worker.terminate()
  }, [])

  useFrame((state) => {
    if (!particleData) return

    const time = state.clock.getElapsedTime()

    if (swarmRef.current) {
      const currentPositions = swarmRef.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < FORMATION_COUNT; i++) {
        const idx = i * 3
        currentPositions[idx] = THREE.MathUtils.lerp(
          particleData.start[idx],
          particleData.end[idx],
          progress,
        )
        currentPositions[idx + 1] = THREE.MathUtils.lerp(
          particleData.start[idx + 1],
          particleData.end[idx + 1],
          progress,
        )
        currentPositions[idx + 2] = THREE.MathUtils.lerp(
          particleData.start[idx + 2],
          particleData.end[idx + 2],
          progress,
        )
      }
      swarmRef.current.geometry.attributes.position.needsUpdate = true

      if (swarmMaterialRef.current) {
        if (!isReady) {
          readyTimestamp.current = null
          swarmMaterialRef.current.opacity = 1
        } else {
          if (!readyTimestamp.current) readyTimestamp.current = Date.now()
          const elapsedSinceReady = Date.now() - readyTimestamp.current
          const fadeStartThreshold = 2500
          const fadeDuration = 1500

          if (elapsedSinceReady < fadeStartThreshold) {
            swarmMaterialRef.current.opacity = 1
          } else {
            const fadeProgress = Math.min(
              (elapsedSinceReady - fadeStartThreshold) / fadeDuration,
              1,
            )
            swarmMaterialRef.current.opacity = 1 - fadeProgress
          }
        }
      }
    }

    if (cyberRef.current) {
      const cyberPositions = cyberRef.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < CYBER_COUNT; i++) {
        const idx = i * 3
        cyberPositions[idx] += Math.sin(time + particleData.cyberVelocities[idx]) * 0.1
        cyberPositions[idx + 1] += Math.cos(time + particleData.cyberVelocities[idx + 1]) * 0.1
        cyberPositions[idx + 2] += Math.sin(time + particleData.cyberVelocities[idx + 2]) * 0.1
      }
      cyberRef.current.geometry.attributes.position.needsUpdate = true
      cyberRef.current.rotation.y += 0.001
    }
  })

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      'points' as any,
      { ref: swarmRef },
      React.createElement(
        'bufferGeometry' as any,
        null,
        React.createElement('bufferAttribute' as any, {
          attach: 'attributes-position',
          count: FORMATION_COUNT,
          array: initialSwarmPositions,
          itemSize: 3,
        }),
        React.createElement('bufferAttribute' as any, {
          attach: 'attributes-color',
          count: FORMATION_COUNT,
          array: particleData?.colors ?? fallbackColors,
          itemSize: 3,
        }),
      ),
      React.createElement('pointsMaterial' as any, {
        ref: swarmMaterialRef,
        size: 1.8,
        vertexColors: true,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ),
    React.createElement(
      'points' as any,
      { ref: cyberRef },
      React.createElement(
        'bufferGeometry' as any,
        null,
        React.createElement('bufferAttribute' as any, {
          attach: 'attributes-position',
          count: CYBER_COUNT,
          array: particleData?.cyberPositions ?? fallbackCyberPositions,
          itemSize: 3,
        }),
      ),
      React.createElement('pointsMaterial' as any, {
        size: 2.0,
        color: '#00f2ff',
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ),
  )
})

interface Campamento {
  id: number
  lat: number
  lng: number
  name: string
  status: string
  survivors: number
  description: string
}

const CAMPAMENTOS_DATA: Campamento[] = [
  {
    id: 1,
    lat: 39.8283,
    lng: -98.5795,
    name: 'Santuario Omega',
    status: 'Estable',
    survivors: 240,
    description:
      'Antiguo búnker subterráneo en el interior del continente. Sistema de purificación de agua al 85%.',
  },
  {
    id: 2,
    lat: 52.52,
    lng: 13.405,
    name: 'Bastión Central',
    status: 'Próspero',
    survivors: 620,
    description:
      'Fortaleza reconstruida en tierras altas. Centro logístico principal para el suministro de energía.',
  },
  {
    id: 3,
    lat: -34.6037,
    lng: -58.3816,
    name: 'Refugio del Sur',
    status: 'Estable',
    survivors: 185,
    description:
      'Asentamiento agrícola protegido en las llanuras. Invernaderos de clima controlado.',
  },
  {
    id: 4,
    lat: 35.6762,
    lng: 139.6503,
    name: 'Estación Aurora',
    status: 'Aislado',
    survivors: 310,
    description:
      'Instalación de alta tecnología en zona montañosa. Mantiene comunicación satelital intermitente.',
  },
  {
    id: 5,
    lat: -22.5621,
    lng: 17.0658,
    name: 'Ciudadela Arena',
    status: 'En Alerta',
    survivors: 95,
    description:
      'Puerto estratégico de vigilancia en la meseta. Control estricto de accesos perimetrales.',
  },
]

const ReplicaGlobe = ({
  onLoadingComplete,
  onLoginClick,
  onSelectCamp,
}: {
  onLoadingComplete?: () => void
  onLoginClick?: () => void
  onSelectCamp?: (campId: number) => void
}) => {
  const navigate = useNavigate()
  const globeEl = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [selectedCampamento, setSelectedCampamento] = useState<Campamento | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [formationProgress, setFormationProgress] = useState(0)
  const [displayProgress, setDisplayProgress] = useState(0)

  useEffect(() => {
    if (isReady && onLoadingComplete) {
      onLoadingComplete()
    }
  }, [isReady, onLoadingComplete])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateTouchState = () => {
      const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches
      setIsTouchDevice(hasCoarsePointer || navigator.maxTouchPoints > 0)
    }

    updateTouchState()
    window.addEventListener('resize', updateTouchState)
    window.addEventListener('orientationchange', updateTouchState)

    return () => {
      window.removeEventListener('resize', updateTouchState)
      window.removeEventListener('orientationchange', updateTouchState)
    }
  }, [])

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    }

    const observer = new ResizeObserver(updateSize)
    if (containerRef.current) observer.observe(containerRef.current)
    updateSize()

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = !selectedCampamento
      globeEl.current.controls().autoRotateSpeed = 0.4
    }
  }, [selectedCampamento])

  const isCompactViewport = isTouchDevice && dimensions.width <= 1024 && dimensions.height <= 700

  useEffect(() => {
    let frameId: number
    const chaosDuration = 2000
    const formationDuration = 4000
    const holdDuration = 1500
    const introDuration = 2000
    const particleFadeDelay = 2500
    const particleFadeDuration = 1500

    const totalWaitAfterReady =
      Math.max(introDuration, particleFadeDelay + particleFadeDuration) + 500
    const totalDuration = chaosDuration + formationDuration + holdDuration + totalWaitAfterReady

    const startTimestamp = Date.now()
    let hasTriggeredReady = false

    const animate = () => {
      const now = Date.now()
      const elapsed = now - startTimestamp

      setDisplayProgress(Math.min(elapsed / totalDuration, 1))

      if (elapsed < chaosDuration) {
        setFormationProgress(0)
        frameId = requestAnimationFrame(animate)
      } else if (elapsed < chaosDuration + formationDuration) {
        const formationElapsed = elapsed - chaosDuration
        setFormationProgress(formationElapsed / formationDuration)
        frameId = requestAnimationFrame(animate)
      } else {
        setFormationProgress(1)

        const readyPoint = chaosDuration + formationDuration + holdDuration

        if (elapsed < readyPoint) {
          frameId = requestAnimationFrame(animate)
        } else {
          if (!hasTriggeredReady) {
            setIsReady(true)
            hasTriggeredReady = true
          }

          if (elapsed < readyPoint + totalWaitAfterReady) {
            frameId = requestAnimationFrame(animate)
          } else {
            setDisplayProgress(1)
            setIsLoading(false)
          }
        }
      }
    }

    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [])

  const filteredCampamentos = useMemo(() => {
    if (!searchTerm) return CAMPAMENTOS_DATA
    return CAMPAMENTOS_DATA.filter((camp) =>
      camp.name.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [searchTerm])

  const handleSelectCampamento = useCallback(
    (camp: Campamento | null) => {
      setSelectedCampamento(camp)
      if (camp && globeEl.current) {
        globeEl.current.pointOfView(
          {
            lat: camp.lat,
            lng: camp.lng,
            altitude: 0.3,
          },
          1500,
        )

        onSelectCamp?.(camp.id)
      } else if (globeEl.current) {
        globeEl.current.pointOfView({ altitude: 2.5 }, 1200)

        onSelectCamp?.(0)
      }
    },
    [onSelectCamp],
  )

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-transparent overflow-hidden relative font-sans text-white"
    >
      <style>{`
        .camp-info-card--compact {
          position: fixed !important;
          left: 50% !important;
          right: auto !important;
          top: 50% !important;
          bottom: auto !important;
          width: min(calc(100vw - 0.75rem), 21rem) !important;
          max-height: calc(100dvh - 0.75rem) !important;
          overflow-y: auto !important;
          overscroll-behavior: contain;
          transform: translate(-50%, -50%) !important;
          border-radius: 0.9rem !important;
          padding: 0.75rem !important;
        }

        .camp-info-card--compact .camp-info-card__title {
          font-size: 0.9rem !important;
          line-height: 1.1 !important;
        }

        .camp-info-card--compact .camp-info-card__header {
          margin-bottom: 0.5rem !important;
          padding-right: 2rem !important;
        }

        .camp-info-card--compact .camp-info-card__badge-row {
          gap: 0.3rem !important;
          margin-top: 0.35rem !important;
        }

        .camp-info-card--compact .camp-info-card__badge {
          font-size: 0.5rem !important;
          letter-spacing: 0.12em !important;
          padding-top: 0.12rem !important;
          padding-bottom: 0.12rem !important;
        }

        .camp-info-card--compact .camp-info-card__meta {
          gap: 0.5rem !important;
          margin-bottom: 0.7rem !important;
        }

        .camp-info-card--compact .camp-info-card__meta > div > div:first-child {
          font-size: 0.58rem !important;
          letter-spacing: 0.14em !important;
        }

        .camp-info-card--compact .camp-info-card__meta > div > div:last-child {
          font-size: 0.82rem !important;
          line-height: 1.05 !important;
        }

        .camp-info-card--compact .camp-info-card__desc {
          min-height: 1.5rem !important;
          margin-bottom: 0.7rem !important;
          padding-left: 0.7rem !important;
        }

        .camp-info-card--compact .camp-info-card__desc p {
          font-size: 0.62rem !important;
          line-height: 1.25 !important;
          max-height: 2.8rem !important;
          overflow: hidden !important;
        }

        .camp-info-card--compact .camp-info-card__actions {
          gap: 0.4rem !important;
        }

        .camp-info-card--compact .camp-info-card__action {
          padding-top: 0.55rem !important;
          padding-bottom: 0.55rem !important;
        }

        .camp-info-card--compact .camp-info-card__action-text {
          font-size: 0.58rem !important;
          letter-spacing: 0.14em !important;
        }

        .camp-info-card--compact .camp-info-card__close {
          top: 0.1rem !important;
          right: 0.1rem !important;
          padding: 0.25rem !important;
        }
      `}</style>

      <div
        className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${isReady ? 'z-[15] opacity-50' : 'z-[80]'}`}
      >
        <Canvas
          camera={{ position: [0, 0, 250], fov: 45 }}
          style={{ width: '100%', height: '100%' }}
        >
          {React.createElement('ambientLight' as any, { intensity: 0.5 })}
          <ParticleSystem progress={formationProgress} isReady={isReady} />
        </Canvas>
      </div>

      <AnimatePresence>
        {!isReady && (
          <motion.div
            key="particle-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 z-[70] pointer-events-none bg-black/40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLoading && (
          <motion.div
            key="loading-ui"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-12 right-12 z-[100] bg-transparent flex flex-col items-center justify-center cursor-wait overflow-hidden"
          >
            <div
              className="relative flex items-center justify-center p-12"
              style={{ fontSize: '32px' }}
            >
              <motion.div
                className="absolute border-2 border-dashed border-white/40 rounded-full"
                style={{ width: '4em', height: '4em' }}
                animate={{
                  scale: [0.8, 1.2],
                  opacity: [0.5, 0],
                  rotateZ: 360,
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
              />
              <div
                className="absolute flex items-center justify-center"
                style={{ width: '5em', height: '5em' }}
              >
                <motion.div
                  className="border-2 border-dashed border-[#4f7b86]/30 rounded-full"
                  style={{ width: '3.5em', height: '3.5em' }}
                  animate={{ rotateZ: -360 }}
                  transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
              </div>

              <motion.div
                className="absolute bg-[#4f7b86]/10 backdrop-blur-md rounded-full z-[1] shadow-[0_0_30px_rgba(79,123,134,0.1)]"
                style={{ width: '3em', height: '3em' }}
                initial={{ scale: 0 }}
                animate={{ scale: [0.95, 1.05, 0.95] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              <div className="relative z-[2] flex flex-col items-center justify-center">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1 }}
                  className="flex flex-col items-center"
                >
                  <div className="text-white/60 font-black italic text-[10px] tracking-[0.2em] uppercase mb-0.5">
                    CARGANDO
                  </div>
                  <div className="text-white font-black italic text-2xl tracking-tighter leading-tight uppercase">
                    RED DE CAMPAMENTOS
                  </div>
                  <div className="mt-2 text-white/40 font-mono text-[9px] tracking-[0.3em] font-bold bg-black/20 px-2 py-0.5 rounded-full border border-white/5">
                    {Math.round(displayProgress * 100)}%
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={isReady ? { scale: 1, opacity: 1 } : {}}
        transition={{
          duration: 2,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="w-full h-full relative z-[20]"
      >
        <Globe
          ref={globeEl}
          width={dimensions.width}
          height={dimensions.height}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          atmosphereColor="#ffffff"
          atmosphereAltitude={0.15}
          backgroundColor="rgba(0,0,0,0)"
          htmlElementsData={CAMPAMENTOS_DATA.map((c) => ({
            ...c,
            isSelected: selectedCampamento?.id === c.id,
          }))}
          htmlElement={useCallback(
            (d: object) => {
              const camp = d as Campamento & { isSelected: boolean }
              const el = document.createElement('div')
              el.className = 'group relative'
              el.style.pointerEvents = 'none'

              const statusColor =
                camp.status === 'Estable'
                  ? '#4ade80'
                  : camp.status === 'Próspero'
                    ? 'white'
                    : '#fbbf24'
              const isSelected = camp.isSelected

              const homeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="transition-transform duration-300 group-hover:scale-110"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
              const fileIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="transition-transform duration-300 group-hover:translate-y-[-1px]"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M9 13h6"/><path d="M9 17h6"/></svg>`

              el.innerHTML = `
            <div class="marker-root relative" style="pointer-events: none;">
              <div class="marker-dot-area flex items-center justify-center relative pointer-events-auto cursor-pointer" style="width: 24px; height: 24px; transform: translate(-50%, -50%);">
                <div class="absolute w-8 h-8 rounded-full border border-white/20 animate-ping opacity-60 pointer-events-none"></div>
                <div class="absolute w-6 h-6 rounded-full bg-white/5 animate-pulse blur-sm pointer-events-none"></div>
                <div class="absolute w-8 h-8 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-md pointer-events-none"></div>
                <div class="relative w-3.5 h-3.5 rounded-full bg-white border-2 border-white shadow-[0_0_15px_rgba(255,255,255,1)] transition-all duration-300 ${isSelected ? 'scale-110 ring-4 ring-white/30' : 'group-hover:ring-4 group-hover:ring-white/20'} pointer-events-none"></div>
                <div class="marker-label absolute bottom-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/90 backdrop-blur-md border border-white/30 rounded-full transition-all duration-300 pointer-events-none whitespace-nowrap opacity-0 ${isSelected ? 'opacity-0' : 'group-hover:opacity-100 shadow-[0_0_20px_rgba(0,0,0,0.5)]'}">
                  <div class="text-white text-[10px] font-black tracking-widest uppercase px-1">${camp.name}</div>
                </div>
              </div>

              <div class="info-card ${isCompactViewport ? 'camp-info-card--compact' : 'absolute top-[-70px] left-[25px]'} z-[60] w-[280px] bg-black/95 backdrop-blur-3xl border border-white/30 p-6 rounded-sm shadow-[0_0_60px_rgba(0,0,0,0.8)] transition-all duration-500 origin-left pointer-events-auto ${isSelected ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 -translate-x-4 pointer-events-none invisible'}">
                <div class="absolute top-2 right-2 text-white/60 hover:rotate-90 hover:scale-110 hover:text-white transition-all duration-300 close-btn cursor-pointer z-[70] p-2 camp-info-card__close">
                  <svg size="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; pointer-events: none;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </div>

                <div class="mb-4 pr-10 camp-info-card__header">
                  <div class="title-anchor inline-block border-b-0">
                    <div class="camp-info-card__title text-white text-[18px] font-black uppercase tracking-tighter italic leading-tight">${camp.name}</div>
                  </div>
                  <div class="mt-2 flex items-center gap-2 camp-info-card__badge-row">
                    <div class="w-2.5 h-2.5 rounded-full bg-green-400 pulse-green shadow-[0_0_8px_#4ade80]"></div>
                    <div class="bg-black/60 text-white/80 text-[11px] font-mono font-bold tracking-widest px-2 py-0.5 border border-white/20 camp-info-card__badge">CAMP_ID_00${camp.id}</div>
                  </div>
                </div>

                <div class="camp-info-card__meta grid grid-cols-2 gap-6 mb-6">
                  <div class="space-y-1">
                    <div class="text-white/50 text-[9px] uppercase font-bold tracking-[0.2em] font-mono camp-info-card__label">STATUS</div>
                    <div class="text-[15px] font-black tracking-tighter italic uppercase camp-info-card__value" style="color: ${statusColor}">${camp.status}</div>
                  </div>
                  <div class="space-y-1">
                    <div class="text-white/50 text-[9px] uppercase font-bold tracking-[0.2em] font-mono camp-info-card__label">POBLACIÓN</div>
                    <div class="text-white text-[15px] font-black tracking-tighter italic uppercase font-mono camp-info-card__value">${camp.survivors}</div>
                  </div>
                </div>

                <div class="camp-info-card__desc relative mb-6 min-h-[3rem] flex items-center border-l-2 border-white/20 pl-4">
                  <p class="text-white/50 text-[11px] leading-relaxed italic font-medium">
                    "${camp.description}"
                  </p>
                </div>

                <div class="camp-info-card__actions flex flex-col gap-4">
                  <button class="camp-info-card__action action-btn menu-brush w-full py-4 rounded-none uppercase tracking-[0.2em] font-black italic flex items-center justify-center group/btn relative overflow-hidden active:scale-[0.98] transition-transform">
                    <span class="camp-info-card__action-text relative z-10 flex items-center justify-center gap-3 text-white text-[13px] transition-transform duration-300 group-hover/btn:scale-105 pointer-events-none">
                      ${homeIcon}
                      INGRESAR
                    </span>
                  </button>
                  <button class="camp-info-card__action admission-request-btn action-btn menu-brush w-full py-3 rounded-none uppercase tracking-[0.2em] font-black italic flex items-center justify-center group/btn relative overflow-hidden active:scale-[0.98] transition-transform">
                    <span class="camp-info-card__action-text relative z-10 flex items-center justify-center gap-3 text-white text-[11px] transition-transform duration-300 group-hover/btn:scale-105 pointer-events-none">
                      ${fileIcon}
                      SOLICITAR ACCESO
                    </span>
                  </button>
                </div>
              </div>
            </div>
          `

              const markerDotArea = el.querySelector('.marker-dot-area') as HTMLElement
              const infoCard = el.querySelector('.info-card') as HTMLElement

              const preventGlobe = (e: Event) => {
                e.stopPropagation()
                if ('stopImmediatePropagation' in e) e.stopImmediatePropagation()
              }

              const handleInteraction = (e: MouseEvent | TouchEvent) => {
                preventGlobe(e)
                const clickTarget = e.target as HTMLElement

                if (clickTarget.closest('.close-btn')) {
                  handleSelectCampamento(null)
                  return
                }
                if (clickTarget.closest('.admission-request-btn')) {
                  navigate('/admission', {
                    state: { returnToGlobalMap: true, campId: camp.id, campName: camp.name },
                  })
                  return
                }

                if (clickTarget.closest('.marker-dot-area')) {
                  handleSelectCampamento(camp.isSelected ? null : camp)
                  return
                }

                if (clickTarget.closest('.action-btn')) {
                  onLoginClick?.()
                  return
                }
              }

              ;[markerDotArea, infoCard].forEach((target) => {
                if (target) {
                  target.addEventListener('pointerdown', preventGlobe)
                  target.addEventListener('pointerup', preventGlobe)
                  target.addEventListener('click', (e) => handleInteraction(e as MouseEvent))
                  target.addEventListener('contextmenu', preventGlobe)
                }
              })

              return el
            },
            [handleSelectCampamento, navigate, onLoginClick, isCompactViewport],
          )}
        />
      </motion.div>

      <AnimatePresence>
        {isReady && !isLoading && (
          <>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-8 left-8 z-50 flex flex-col items-start gap-2"
            >
              <div className="flex items-center gap-2">
                <AnimatePresence mode="wait">
                  {!isSearchExpanded ? (
                    <motion.button
                      key="search-trigger"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={() => setIsSearchExpanded(true)}
                      className="w-12 h-12 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full border border-white/20 hover:border-white transition-all duration-300 group shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                    >
                      <motion.div
                        whileHover={{ rotate: 90 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                      >
                        <Search
                          size={20}
                          className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                        />
                      </motion.div>
                    </motion.button>
                  ) : (
                    <motion.div
                      key="search-input-container"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 320 }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden"
                    >
                      <div
                        className={`flex items-center bg-black/50 backdrop-blur-xl border ${isSearchFocused ? 'border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'border-white/10'} rounded-none w-full transition-all duration-500`}
                      >
                        <div className="pl-4 text-white group">
                          <Search
                            size={14}
                            className="group-hover:scale-110 transition-transform"
                          />
                        </div>
                        <input
                          autoFocus
                          type="text"
                          placeholder="BUSCADOR DE CAMPAMENTOS..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          onFocus={() => setIsSearchFocused(true)}
                          onBlur={() => {
                            setTimeout(() => {
                              setIsSearchFocused(false)
                              if (!searchTerm) setIsSearchExpanded(false)
                            }, 200)
                          }}
                          className="bg-transparent border-none outline-none text-white text-[11px] font-bold tracking-[0.3em] p-4 w-full placeholder:text-white/20 uppercase"
                        />
                        {searchTerm && (
                          <button
                            onClick={() => {
                              setSearchTerm('')
                              setIsSearchExpanded(false)
                            }}
                            className="pr-4 text-white/40 hover:text-white transition-colors"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence>
                {isSearchExpanded &&
                  (searchTerm || isSearchFocused) &&
                  filteredCampamentos.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="w-72 bg-black/80 backdrop-blur-2xl border border-white/20 rounded-sm max-h-64 overflow-y-auto"
                    >
                      {filteredCampamentos.map((camp) => (
                        <button
                          key={camp.id}
                          onClick={() => handleSelectCampamento(camp)}
                          className="w-full text-left p-4 border-b border-white/5 hover:bg-white/10 transition-all duration-300 group flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3 group-hover:translate-x-1 transition-transform duration-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-[0_0_8px_white]" />
                            <div className="text-white text-[10px] font-black tracking-widest uppercase">
                              {camp.name}
                            </div>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
              </AnimatePresence>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              onClick={() => setIsGuideOpen(true)}
              className="px-8 py-3 transition-all menu-brush text-white uppercase tracking-[0.2em] font-bold text-[11px] absolute bottom-10 left-10 z-50 group"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              <span className="relative z-10 flex items-center gap-2">
                <HelpCircle
                  size={14}
                  className="text-blue-400 group-hover:rotate-12 transition-transform"
                />
                GUÍA DEL SOBREVIVIENTE
              </span>
            </motion.button>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGuideOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="w-full max-w-md p-5 md:p-8 relative shadow-2xl panel-brush max-h-[85vh] flex flex-col"
            >
              <button
                onClick={() => setIsGuideOpen(false)}
                className="absolute top-3 right-3 md:top-5 md:right-5 text-white/60 hover:text-blue-400 transition-all duration-300 hover:rotate-90 hover:scale-110 active:scale-95 z-30 flex items-center justify-center p-2"
              >
                <X size={20} />
              </button>

              <div className="overflow-y-auto scrollbar-hide pr-1">
                <div className="space-y-6">
                  <div className="text-center pt-1 shrink-0">
                    <h2
                      className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-white mb-1"
                      style={{ fontFamily: "'Oswald', sans-serif" }}
                    >
                      GUÍA DEL SOBREVIVIENTE
                    </h2>
                    <div className="h-0.5 w-16 bg-blue-400 mx-auto" />
                  </div>

                  <div className="space-y-3 md:space-y-4">
                    <div className="bg-white/5 border border-white/10 p-3 md:p-4 rounded-lg">
                      <h3 className="text-[9px] font-black uppercase text-blue-400 tracking-widest mb-1 font-mono">
                        EXPLORACIÓN GLOBAL
                      </h3>
                      <p className="text-[11px] md:text-xs text-white/80 leading-relaxed font-mono">
                        Navegación por cámara orbital que permite inspeccionar regiones críticas y
                        descubrir nuevos sectores de resistencia en tiempo real.
                      </p>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-3 md:p-4 rounded-lg">
                      <h3 className="text-[9px] font-black uppercase text-blue-400 tracking-widest mb-1 font-mono">
                        LOCALIZACIÓN DE CAMPAMENTOS
                      </h3>
                      <p className="text-[11px] md:text-xs text-white/80 leading-relaxed font-mono">
                        Sistema de búsqueda táctica que facilita el acceso a datos vitales, estado
                        de defensas y población de cada asentamiento aliado.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default React.memo(ReplicaGlobe)
