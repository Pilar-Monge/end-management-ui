import { useEffect, useState, Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Float, Environment } from '@react-three/drei'
import * as THREE from 'three'

function PhoneModel({ isRotating }: { isRotating: boolean }) {
  const { scene } = useGLTF(
    'https://uktykxlgteizvminvbmt.supabase.co/storage/v1/object/public/animaciones%20pantalla%20carga/smartphone.glb',
  )
  const group = useRef<THREE.Group>(null)

  useEffect(() => {
    if (!scene) return
    const box = new THREE.Box3().setFromObject(scene)
    const center = new THREE.Vector3()
    box.getCenter(center)
    scene.position.sub(center)
  }, [scene])

  useFrame((state) => {
    if (!group.current) return

    const verticalRotation = -Math.PI / 2
    const landscapeRotation = -Math.PI

    if (isRotating) {
      const time = state.clock.getElapsedTime()
      const t = (Math.sin(time * 1.5 - Math.PI / 2) + 1) / 2
      const angle = verticalRotation + t * (landscapeRotation - verticalRotation)
      group.current.rotation.z = angle
    } else {
      group.current.rotation.z = landscapeRotation
    }
  })

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <group ref={group}>
        <primitive object={scene} scale={18} rotation={[Math.PI / 2, 0, Math.PI / 2]} />
      </group>
    </Float>
  )
}

export function MobileOrientationView() {
  const [isPortrait, setIsPortrait] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [showRedirecting, setShowRedirecting] = useState(false)
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setMounted(true)

    const checkOrientation = () => {
      const portrait = window.matchMedia('(orientation: portrait)').matches
      setIsPortrait(portrait)
    }

    checkOrientation()

    const mediaQuery = window.matchMedia('(orientation: portrait)')
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches)

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler)
    } else {
      window.addEventListener('resize', checkOrientation)
      window.addEventListener('orientationchange', checkOrientation)
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler)
      } else {
        window.removeEventListener('resize', checkOrientation)
        window.removeEventListener('orientationchange', checkOrientation)
      }
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isPortrait) {
      setShowRedirecting(true)
      redirectTimeoutRef.current = setTimeout(() => {
        localStorage.removeItem('previousRoute')
      }, 2000)
    }
  }, [isPortrait])

  if (!isPortrait && showRedirecting) {
    return (
      <div
        className="game-screen-layout relative min-h-screen text-white"
        style={{
          position: 'fixed',
          inset: 0,
          overflow: 'hidden',
          isolation: 'isolate',
          background:
            'radial-gradient(circle at 50% 50%, rgba(105,191,183,0.08), transparent 40%), linear-gradient(160deg, rgba(4,8,8,0.97), rgba(6,14,14,0.9) 50%, rgba(4,8,8,0.97))',
          zIndex: 999999,
          pointerEvents: 'auto',
        }}
      >
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '60px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="60"
                height="60"
                viewBox="0 0 60 60"
                fill="none"
                style={{
                  animation: 'spin 1s linear infinite',
                }}
              >
                <circle cx="30" cy="30" r="26" stroke="rgba(105,191,183,0.2)" strokeWidth="2" />
                <circle
                  cx="30"
                  cy="30"
                  r="26"
                  stroke="#69BFB7"
                  strokeWidth="2"
                  strokeDasharray="40.84 122.52"
                  strokeDashoffset="0"
                />
              </svg>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <span
                style={{
                  position: 'relative',
                  isolation: 'isolate',
                  padding: '0.18em 1.2em 0.22em 1.2em',
                  color: '#f0fafa',
                  fontSize: '18px',
                  fontWeight: 950,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  display: 'inline-block',
                  whiteSpace: 'nowrap',
                  filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
                }}
              >
                <span style={{ position: 'relative', zIndex: 2 }}>Redirigiendo...</span>
              </span>
            </div>

            <p
              style={{
                color: 'rgba(164,194,197,0.7)',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                textAlign: 'center',
              }}
            >
              Volviendo a tu aventura
            </p>
          </div>
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (!isPortrait) {
    return null
  }

  return (
    <div
      className="game-screen-layout relative min-h-screen text-white"
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        isolation: 'isolate',
        background:
          'radial-gradient(circle at 50% 50%, rgba(105,191,183,0.08), transparent 40%), linear-gradient(160deg, rgba(4,8,8,0.97), rgba(6,14,14,0.9) 50%, rgba(4,8,8,0.97))',
      }}
    >
      <div
        className="holo-grid"
        style={{
          backgroundImage:
            'linear-gradient(rgba(103,172,169,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(103,172,169,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          position: 'fixed',
          inset: 0,
          maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, transparent 70%)',
          opacity: 0.5,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div
        className="paint-glow"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, transparent, rgba(105,191,183,0.12), transparent), radial-gradient(circle at 100% 42%, rgba(103,172,169,0.2), transparent 14%)',
          mixBlendMode: 'screen',
          opacity: 0.25,
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />

      <div
        className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6"
      >
        <div
          className={`w-full max-w-[460px] transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="relative mx-auto mb-6 h-56 w-full">
            <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
              <ambientLight intensity={1} />
              <directionalLight position={[10, 10, 5]} intensity={2} />
              <directionalLight position={[-10, -10, -5]} intensity={1} />
              <Suspense fallback={null}>
                <Environment preset="city" />
                <PhoneModel isRotating={isPortrait} />
              </Suspense>
            </Canvas>
          </div>

          <div className="text-center">
            {isPortrait ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <span
                    className="section-title-brush"
                    style={{
                      position: 'relative',
                      isolation: 'isolate',
                      padding: '0.18em 1.2em 0.22em 1.2em',
                      color: '#f0fafa',
                      fontSize: '18px',
                      fontWeight: 950,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      display: 'inline-block',
                      whiteSpace: 'nowrap',
                      filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
                    }}
                  >
                    <span style={{ position: 'relative', zIndex: 2 }}>GIRA TU DISPOSITIVO</span>
                  </span>
                </div>

                <div
                  style={{
                    height: '1px',
                    margin: '16px auto',
                    width: '80px',
                    background: 'linear-gradient(90deg, transparent, rgba(105,191,183,0.5), transparent)',
                  }}
                />

                <p
                  style={{
                    color: 'rgba(164,194,197,0.7)',
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    marginTop: '16px',
                  }}
                >
                  Para continuar con la aventura, gira tu celular
                </p>

                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '20px' }}>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        display: 'block',
                        width: '5px',
                        height: '5px',
                        background:
                          i === 2
                            ? '#69BFB7'
                            : i === 1
                              ? 'rgba(105,191,183,0.6)'
                              : 'rgba(103,172,169,0.3)',
                        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                        animation: `bounce 1s ease-in-out ${i * 0.15}s infinite alternate`,
                      }}
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                {showRedirecting ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '24px',
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        width: '60px',
                        height: '60px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg
                        width="60"
                        height="60"
                        viewBox="0 0 60 60"
                        fill="none"
                        style={{
                          animation: 'spin 1s linear infinite',
                        }}
                      >
                        <circle
                          cx="30"
                          cy="30"
                          r="26"
                          stroke="rgba(105,191,183,0.2)"
                          strokeWidth="2"
                        />
                        <circle
                          cx="30"
                          cy="30"
                          r="26"
                          stroke="#69BFB7"
                          strokeWidth="2"
                          strokeDasharray="40.84 122.52"
                          strokeDashoffset="0"
                        />
                      </svg>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                      <span
                        className="section-title-brush"
                        style={{
                          position: 'relative',
                          isolation: 'isolate',
                          padding: '0.18em 1.2em 0.22em 1.2em',
                          color: '#f0fafa',
                          fontSize: '18px',
                          fontWeight: 950,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                          filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
                        }}
                      >
                        <span style={{ position: 'relative', zIndex: 2 }}>Redirigiendo...</span>
                      </span>
                    </div>

                    <p
                      style={{
                        color: 'rgba(164,194,197,0.7)',
                        fontSize: '13px',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        textAlign: 'center',
                      }}
                    >
                      Volviendo a tu aventura
                    </p>
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        position: 'relative',
                        isolation: 'isolate',
                        width: '72px',
                        height: '72px',
                        margin: '0 auto 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(103,172,169,0.12)',
                          border: '1px solid rgba(105,191,183,0.45)',
                          clipPath:
                            'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                        }}
                      />
                      <svg
                        style={{ position: 'relative', zIndex: 1, color: '#69BFB7' }}
                        width="32"
                        height="32"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                      <span
                        className="section-title-brush"
                        style={{
                          position: 'relative',
                          isolation: 'isolate',
                          padding: '0.18em 1.2em 0.22em 1.2em',
                          color: '#f0fafa',
                          fontSize: '18px',
                          fontWeight: 950,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                          filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
                        }}
                      >
                        <span style={{ position: 'relative', zIndex: 2 }}>¡LISTO!</span>
                      </span>
                    </div>

                    <p
                      style={{
                        color: 'rgba(164,194,197,0.7)',
                        fontSize: '13px',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        textAlign: 'center',
                      }}
                    >
                      La aventura comienza ahora.
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        * {
          font-family: "Arial Narrow", "Bahnschrift", "Segoe UI Condensed", 
                       "Roboto Condensed", Arial, sans-serif;
          box-sizing: border-box;
        }

        .game-screen-layout {
          z-index: 999999;
          pointer-events: auto;
        }

        .game-screen-layout::before {
          animation: background-drift 20s ease-in-out infinite alternate;
          background-image:
            radial-gradient(circle at 45% 55%, rgba(103,172,169,0.12), transparent 30%),
            radial-gradient(circle at 70% 35%, rgba(97,140,132,0.08), transparent 25%);
          content: "";
          inset: -10%;
          opacity: 0.7;
          pointer-events: none;
          position: absolute;
          z-index: 0;
        }

        .game-screen-layout::after {
          animation: scan-shift 0.9s linear infinite;
          background-image: linear-gradient(rgba(164,194,197,0.02) 1px, transparent 1px);
          background-size: 100% 3px;
          content: "";
          inset: 0;
          pointer-events: none;
          position: absolute;
          z-index: 50;
        }

        @keyframes background-drift {
          from { transform: translate3d(-6px,-3px,0) scale(1.01); }
          to   { transform: translate3d(10px,6px,0) scale(1.03); }
        }

        @keyframes scan-shift {
          from { background-position: 0 0; }
          to   { background-position: 0 3px; }
        }

        @keyframes bounce {
          from { transform: translateY(0px); }
          to   { transform: translateY(-6px); }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }

        .section-title-brush::before {
          content: "";
          position: absolute;
          inset: -0.06em -1.4em -0.1em -1.4em;
          background: linear-gradient(180deg, #69BFB7 0%, #67ACA9 40%, #5D9797 100%);
          clip-path: polygon(
            0% 10%, 4% 0%, 96% 0%, 100% 10%,
            98% 28%, 100% 45%, 98% 62%,
            100% 78%, 96% 100%, 4% 100%,
            2% 78%, 0% 62%, 2% 45%,
            0% 28%
          );
          z-index: 0;
        }

        .section-title-brush::after {
          content: "";
          position: absolute;
          inset: 0.22em -1.2em 0.2em -1.2em;
          background: repeating-linear-gradient(
            180deg,
            rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 1px,
            transparent 1px, transparent 3px
          );
          clip-path: polygon(
            0% 10%, 4% 0%, 96% 0%, 100% 10%,
            98% 28%, 100% 45%, 98% 62%,
            100% 78%, 96% 100%, 4% 100%,
            2% 78%, 0% 62%, 2% 45%,
            0% 28%
          );
          opacity: 0.25;
          pointer-events: none;
          z-index: 1;
        }
      `}</style>
    </div>
  )
}
