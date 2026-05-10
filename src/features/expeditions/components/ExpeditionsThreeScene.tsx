/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
// @ts-nocheck
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Center, ContactShadows, Html, useProgress } from '@react-three/drei';
import { Suspense, useRef, useMemo, useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';

const MODEL_URL = 'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorExpediciones/hangar.glb';
const CARRO1_URL = 'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorExpediciones/carro1.glb';
const CARRO2_URL = 'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorExpediciones/carro2.glb';
const RADIO_DECORACION_URL = 'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorExpediciones/radioDecoracion.glb';
const GAS_BARRELS_URL = 'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorExpediciones/dirty_oil_barrel_-_5mb.glb';
const TOOL_CART_URL = 'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorExpediciones/tool_cart.glb';
const MONITORING_STATION_URL = 'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorExpediciones/monitoring_station.glb';
const GEOSYNTH_TABLE_URL = 'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorExpediciones/geosynth_table.glb';
const CHAIR_URL = 'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorExpediciones/chair.glb';
const CARDBOARD_BOXES_URL = 'https://auvhrmznrhchqtqddawq.supabase.co/storage/v1/object/public/gestorExpediciones/cardboard_box_set-_low_poly%20(1).glb';

function Model({ onLoaded, scale = 1.5 }: { onLoaded?: (scene: THREE.Group) => void, scale?: number }) {
  const { scene } = useGLTF(MODEL_URL);
  const loadedRef = useRef(false);
  
  useEffect(() => {
    if (!scene || loadedRef.current) return;
    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.userData.collidable = true;
      }
    });
    if (onLoaded) {
      onLoaded(scene);
      loadedRef.current = true;
    }
  }, [scene, onLoaded]);

  return <primitive object={scene} scale={scale} />;
}

function Vehicle({ url, position, rotation, scale = 0.8 }: { 
  url: string, 
  position: [number, number, number], 
  rotation?: [number, number, number], 
  scale?: number
}) {
  const { scene } = useGLTF(url);
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  
  useEffect(() => {
    clonedScene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [clonedScene]);

  return (
    <primitive 
      object={clonedScene} 
      position={position} 
      rotation={rotation} 
      scale={scale}
    />
  );
}

const CAMERA_ZOOM_TARGET_STATION = [-6.2, 2.8, 0] as [number, number, number];
const CAMERA_LOOK_TARGET_STATION = [-11, 2.3, 0] as [number, number, number];

const CAMERA_ZOOM_TARGET_MAP = [-5, 5.5, 6] as [number, number, number];
const CAMERA_LOOK_TARGET_MAP = [-8, 0, 6] as [number, number, number];

const ORBIT_TARGET = [0, 2.5, 0] as [number, number, number];

function ExpeditionLoadingOverlay() {
  const { active, loaded, total, progress } = useProgress();
  const [isComplete, setIsComplete] = useState(false);
  const hasKnownTotal = total > 0;
  const rawProgress = hasKnownTotal ? (loaded / total) * 100 : progress;
  const isLoaded = hasKnownTotal && loaded >= total && !active;
  const displayProgress = isLoaded ? 100 : Math.min(99, Math.max(0, Math.round(rawProgress)));

  useEffect(() => {
    if (isLoaded) {
      const timeout = window.setTimeout(() => setIsComplete(true), 500);
      return () => window.clearTimeout(timeout);
    }

    if (active) {
      setIsComplete(false);
    }
  }, [active, isLoaded]);

  if (isComplete) return null;

  return (
    <div className="expedition-loader">
      <div className="expedition-loading-stack">
        <div className="expedition-loading-brush">
          <span>{displayProgress <= 0 ? 'INICIANDO...' : `CARGANDO... ${displayProgress}%`}</span>
        </div>
        <div className="expedition-loading-bar-shell">
          <div className="expedition-loading-bar" style={{ width: `${displayProgress}%` }} />
        </div>
        <div className="expedition-loader-spinner" />
      </div>
    </div>
  );
}

// Componente para manejar la sincronización aisladamente
function SyncOverlay({ 
  isSyncing, 
  onComplete 
}: { 
  isSyncing: boolean, 
  onComplete: () => void 
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isSyncing) {
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 20);

    return () => clearInterval(interval);
  }, [isSyncing]);

  if (!isSyncing) return null;

  return (
    <div className="expedition-sync-overlay">
      <div className="expedition-sync-panel">
        <div className="expedition-sync-ring">
          <div className="expedition-sync-ring-track" />
          <div 
            className="expedition-sync-ring-spinner" 
            style={{ animationDuration: '3s' }}
          />
          <div className="expedition-sync-percent-wrap">
            <span className="expedition-sync-percent">{progress}%</span>
            <span className="expedition-sync-code">LINK_SYNC</span>
          </div>
        </div>

        <div className="expedition-sync-copy">
          <div className="expedition-sync-text">
            <p className="expedition-sync-title">Estación de Monitoreo</p>
            <p className="expedition-sync-subtitle">Estableciendo conexión segura...</p>
          </div>
          
          <div className="expedition-sync-progress">
            <div 
              className="expedition-sync-progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="expedition-sync-actions">
          {progress === 100 ? (
            <button 
              onClick={onComplete}
              className="expedition-cut-button expedition-cut-button--primary"
            >
              <div className="expedition-cut-button-bg"
                   style={{ 
                     clipPath: "polygon(2% 8%, 95% 1%, 100% 12%, 96% 24%, 100% 36%, 95% 52%, 100% 68%, 94% 84%, 98% 100%, 2% 92%, 0% 84%, 4% 71%, 1% 58%, 5% 43%, 0% 28%, 6% 16%)",
                     transform: "skewX(-5deg)"
                   }} />
              <div className="expedition-cut-button-content">
                <span>Acceder al Sistema</span>
              </div>
            </button>
          ) : (
             <div className="expedition-sync-spacer" />
          )}

          <button 
            onClick={onComplete}
            className="expedition-cut-button expedition-cut-button--secondary"
          >
            <div className="expedition-cut-button-bg"
                 style={{ 
                   clipPath: "polygon(2% 8%, 95% 1%, 100% 12%, 96% 24%, 100% 36%, 95% 52%, 100% 68%, 94% 84%, 98% 100%, 2% 92%, 0% 84%, 4% 71%, 1% 58%, 5% 43%, 0% 28%, 6% 16%)",
                   transform: "skewX(-10deg)"
                 }} />
            <span>Volver al Hangar</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function CameraReset({ zoomedTarget }: { zoomedTarget: 'station' | 'map' | null }) {
  const { camera } = useThree();
  const prevTarget = useRef(zoomedTarget);

  useEffect(() => {
    if (prevTarget.current !== null && zoomedTarget === null) {
      // Regresamos a la vista inicial con una orientación fija
      camera.position.set(12, 12, 12);
      camera.lookAt(0, 2.5, 0);
    }
    prevTarget.current = zoomedTarget;
  }, [zoomedTarget, camera]);

  return null;
}

// Componente para manejar el zoom suave de la cámara
function CameraZoom({ 
  target, 
  lookTarget 
}: { 
  target: [number, number, number],
  lookTarget: [number, number, number]
}) {
  const { camera } = useThree();
  const targetVec = useMemo(() => new THREE.Vector3(...target), [target]);
  const lookVec = useMemo(() => new THREE.Vector3(...lookTarget), [lookTarget]);
  
  useFrame((_, delta) => {
    // Aumentamos el lerp para que el zoom sea más rápido y responsivo
    camera.position.lerp(targetVec, 6 * delta);
    camera.lookAt(lookVec);
  });

  return null;
}

// Estación de interacción
function InteractionStation({ 
  isZoomed, 
  onHover, 
  onClick,
}: { 
  isZoomed: boolean, 
  onHover: (v: boolean) => void, 
  onClick: (e: any) => void
}) {
  return (
    <group position={[-8.2, 0, 0]}>
      <mesh 
        onPointerEnter={(e: any) => {
          e.stopPropagation();
          if (!isZoomed) onHover(true);
        }}
        onPointerLeave={(e: any) => {
          e.stopPropagation();
          onHover(false);
        }}
        onClick={(e: any) => {
          e.stopPropagation();
          onClick(e);
        }}
        position={[0, 1.5, 0]}
      >
        <boxGeometry args={[4, 3, 4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>

      <Vehicle 
        url={CHAIR_URL} 
        position={[0.7, 0, 0]} 
        rotation={[0, Math.PI / 4, 0]} 
        scale={1.8} 
      />

      <Vehicle 
        url={MONITORING_STATION_URL} 
        position={[-0.8, 0, 0]} 
        rotation={[0, 0, 0]} 
        scale={2.1} 
      />
    </group>
  );
}

interface ExpeditionsThreeSceneProps {
  onExit?: () => void;
}

export default function ExpeditionsThreeScene({ onExit }: ExpeditionsThreeSceneProps) {
  const modelRef = useRef<THREE.Group>(null);
  const [hoveredStation, setHoveredStation] = useState(false);
  const [hoveredMap, setHoveredMap] = useState(false);
  const [zoomedTarget, setZoomedTarget] = useState<'station' | 'map' | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const onHangarLoaded = useCallback((scene: THREE.Group) => {
    if (modelRef.current) return;
    modelRef.current = scene;
  }, []);

  useEffect(() => {
    if (zoomedTarget || isSyncing) {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    }
  }, [zoomedTarget, isSyncing]);

  const handleStationClick = useCallback((e?: any) => {
    if (e) e.stopPropagation();
    
    if (zoomedTarget === null) {
      setHoveredStation(false);
      setZoomedTarget('station');
    } else if (zoomedTarget === 'station' && !isSyncing) {
      // Segundo click en zoom entra a sincronización (Solo para la estación de monitoreo)
      setIsSyncing(true);
    }
  }, [zoomedTarget, isSyncing]);

  const handleMapClick = useCallback((e?: any) => {
    if (e) e.stopPropagation();
    
    if (zoomedTarget === null) {
      setHoveredMap(false);
      setZoomedTarget('map');
    }
    // Solo un click para el mapa, no entra a sincronización
  }, [zoomedTarget]);

  const handleSyncComplete = useCallback(() => {
    setIsSyncing(false);
  }, []);

  const handleBack = useCallback(() => {
    if (isSyncing) {
      setIsSyncing(false);
    } else if (zoomedTarget) {
      setZoomedTarget(null);
    } else if (onExit) {
      onExit();
    } else {
      window.location.reload();
    }
  }, [isSyncing, onExit, zoomedTarget]);

  return (
    <div className="expedition-scene-shell">
      <ExpeditionLoadingOverlay />

      <SyncOverlay 
        isSyncing={isSyncing} 
        onComplete={handleSyncComplete} 
      />

      <Suspense fallback={null}>
        <Canvas 
          shadows={{ type: THREE.PCFShadowMap }} 
          camera={{ position: [12, 12, 12], fov: 45 }} 
          gl={{ antialias: true }}
        >
          <CameraReset zoomedTarget={zoomedTarget} />
          <color attach="background" args={['#050505']} />
          
          <ambientLight intensity={1.2} />
          <pointLight position={[0, 8, 0]} intensity={2} />
          <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />

          <Suspense fallback={null}>
            <Center top>
              <Model onLoaded={onHangarLoaded} scale={1.8} />
            </Center>

            <Vehicle 
              url={CARRO2_URL} 
              position={[6, 2, -19]} 
              rotation={[0, -Math.PI / 2, 0]} 
              scale={1.5}
            />
            
            <Vehicle 
              url={CARRO1_URL} 
              position={[-6, 0.0, -15]} 
              rotation={[0, (130 * Math.PI) / 180, 0]} 
              scale={0.5}
            />

            <Vehicle 
              url={RADIO_DECORACION_URL} 
              position={[-8.78, 1.44, 1.1]} 
              rotation={[0, Math.PI / 2, 0]} 
              scale={3.0} 
            />

            <InteractionStation 
              isZoomed={zoomedTarget !== null}
              onHover={setHoveredStation}
              onClick={handleStationClick}
            />

            {(hoveredStation || hoveredMap) && zoomedTarget === null && (
              <Html 
                position={hoveredStation ? [-9, 4.4, 0] : [-9, 3.5, 6]} 
                center 
                distanceFactor={15}
                style={{ pointerEvents: 'none' }}
              >
                <div className="expedition-hover-tag">
                  <span>
                    {hoveredStation ? 'ACCEDER AL SISTEMA' : 'EXPLORAR MAPA'}
                  </span>
                </div>
              </Html>
            )}

            {zoomedTarget === 'station' && !isSyncing && (
              <CameraZoom target={CAMERA_ZOOM_TARGET_STATION} lookTarget={CAMERA_LOOK_TARGET_STATION} />
            )}
            
            {zoomedTarget === 'map' && !isSyncing && (
              <CameraZoom target={CAMERA_ZOOM_TARGET_MAP} lookTarget={CAMERA_LOOK_TARGET_MAP} />
            )}

            <Vehicle 
              url={TOOL_CART_URL} 
              position={[-6, 0, 18]} 
              rotation={[0, (120 * Math.PI) / 180, 0]} 
              scale={0.05} 
            />

            <group position={[-8, 0, 6]}>
              <mesh 
                onPointerEnter={(e: any) => {
                  e.stopPropagation();
                  if (zoomedTarget === null) setHoveredMap(true);
                }}
                onPointerLeave={(e: any) => {
                  e.stopPropagation();
                  setHoveredMap(false);
                }}
                onClick={handleMapClick}
                position={[0, 1.2, 0]}
              >
                <boxGeometry args={[4, 2.5, 4]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
              </mesh>
              <Vehicle 
                url={GEOSYNTH_TABLE_URL} 
                position={[0, 0, 0]} 
                rotation={[0, Math.PI / 6, 0]} 
                scale={1.3} 
              />
            </group>

            <Vehicle 
              url={GAS_BARRELS_URL} 
              position={[10, 0, 12]} 
              rotation={[0, 0, 0]} 
              scale={2} 
            />

            <Vehicle 
              url={CARDBOARD_BOXES_URL} 
              position={[4, 0, 4]} 
              rotation={[0, Math.PI / 4, 0]} 
              scale={20.0} 
            />

            <Environment preset="warehouse" />
            <ContactShadows position={[0, -0.01, 0]} opacity={0.6} scale={50} blur={2} far={10} />
            
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
              <planeGeometry args={[100, 100]} />
              <meshStandardMaterial color="#0a0a0a" roughness={1} />
            </mesh>
          </Suspense>

          {!zoomedTarget && (
            <OrbitControls 
              makeDefault
              enableDamping
              dampingFactor={0.05}
              enablePan={false}
              enableZoom={false}
              maxDistance={9}
              minDistance={9}
              maxPolarAngle={Math.PI / 2.2} 
              minPolarAngle={Math.PI / 2.8}
              target={ORBIT_TARGET}
            />
          )}
        </Canvas>
      </Suspense>

      {/* Interfaz de Control Estilo Sci-Fi */}
      <div className="expedition-hud">
        {/* Top Left: Grouped Controls */}
        <div className="expedition-hud-left">
          {/* Volver - Siempre visible */}
          <button className="expedition-hud-button expedition-hud-button--back" onClick={handleBack}>
            <div className="expedition-hud-button-bg"
                 style={{ 
                   clipPath: "polygon(2% 8%, 95% 1%, 100% 12%, 96% 24%, 100% 36%, 95% 52%, 100% 68%, 94% 84%, 98% 100%, 2% 92%, 0% 84%, 4% 71%, 1% 58%, 5% 43%, 0% 28%, 6% 16%)",
                   transform: "skewX(-10deg)"
                 }} />
            
            <div className="expedition-hud-button-content">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="expedition-hud-back-icon">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              <span>
                VOLVER
              </span>
            </div>
          </button>
        </div>

        {/* Top Right: Icons Group */}
        <div className="expedition-hud-actions">
          {/* Audio Icon */}
          <button className="expedition-hud-icon-button">
            <div className="expedition-hud-button-bg"
                 style={{ 
                   clipPath: "polygon(2% 8%, 95% 1%, 100% 12%, 96% 24%, 100% 36%, 95% 52%, 100% 68%, 94% 84%, 98% 100%, 2% 92%, 0% 84%, 4% 71%, 1% 58%, 5% 43%, 0% 28%, 6% 16%)",
                   transform: "skewX(-10deg)"
                 }} />
            <svg className="expedition-hud-icon expedition-hud-icon--audio" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="9" x2="4" y2="15" />
              <line x1="9" y1="6" x2="9" y2="18" />
              <line x1="14" y1="10" x2="14" y2="14" />
              <line x1="19" y1="7" x2="19" y2="21" />
            </svg>
          </button>

          {/* Settings Icon */}
          <button className="expedition-hud-icon-button">
            <div className="expedition-hud-button-bg"
                 style={{ 
                   clipPath: "polygon(2% 8%, 95% 1%, 100% 12%, 96% 24%, 100% 36%, 95% 52%, 100% 68%, 94% 84%, 98% 100%, 2% 92%, 0% 84%, 4% 71%, 1% 58%, 5% 43%, 0% 28%, 6% 16%)",
                   transform: "skewX(-10deg)"
                 }} />
            <svg className="expedition-hud-icon expedition-hud-icon--settings" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>

          {/* Exit Icon */}
          <button className="expedition-hud-icon-button" onClick={onExit}>
            <div className="expedition-hud-button-bg"
                 style={{ 
                   clipPath: "polygon(2% 8%, 95% 1%, 100% 12%, 96% 24%, 100% 36%, 95% 52%, 100% 68%, 94% 84%, 98% 100%, 2% 92%, 0% 84%, 4% 71%, 1% 58%, 5% 43%, 0% 28%, 6% 16%)",
                   transform: "skewX(-10deg)"
                 }} />
            <svg className="expedition-hud-icon expedition-hud-icon--exit" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {zoomedTarget === null && null}
    </div>
  );
}

useGLTF.preload(MODEL_URL);
useGLTF.preload(CARRO1_URL);
useGLTF.preload(CARRO2_URL);
useGLTF.preload(RADIO_DECORACION_URL);
useGLTF.preload(GAS_BARRELS_URL);
useGLTF.preload(TOOL_CART_URL);
useGLTF.preload(MONITORING_STATION_URL);
useGLTF.preload(GEOSYNTH_TABLE_URL);
useGLTF.preload(CHAIR_URL);
useGLTF.preload(CARDBOARD_BOXES_URL);
