// @ts-nocheck
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
  useCallback,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, PerspectiveCamera, useGLTF, useProgress } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  AudioLines,
  Check,
  ChevronLeft,
  LogOut,
} from 'lucide-react';
import * as THREE from 'three';
import './admin-main-view-ui.css';

type Vec3 = [number, number, number];
type ViewMode = 'normal' | 'zoom';
type SyncState = 'idle' | 'syncing' | 'ready';

type CameraState = {
  position: Vec3;
  target: Vec3;
};

type Asset = {
  id: string;
  name: string;
  url: string;
  position: Vec3;
  rotation: Vec3;
  scale: number;
};

interface ZoomPreset {
  id: string;
  name: string;
  subtitle: string;
  position: Vec3;
  target: Vec3;
  hotspotPos?: Vec3;
  hotspotSize?: Vec3;
  hotspotRot?: Vec3;
}

interface ModelProps {
  url: string;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
}

interface CameraTransitionControllerProps {
  activePosition: Vec3;
  activeTarget: Vec3;
  isTransitioning: boolean;
  setIsTransitioning: (value: boolean) => void;
  controlsRef: RefObject<any>;
}

interface SceneProps {
  assets: Asset[];
  cameraConfig: CameraState;
  cameraSessionRef: MutableRefObject<CameraState>;
  activePosition: Vec3;
  activeTarget: Vec3;
  viewMode: ViewMode;
  activePresetId: string;
  zoomPresets: ZoomPreset[];
  setActivePresetId: (id: string) => void;
  onEnterZoom: (presetId: string) => void;
  onTransitionEnd: (presetId: string) => void;
  onMonitorAction: (presetId: string) => void;
  hoveredMonitorId: string | null;
  setHoveredMonitorId: (id: string | null) => void;
  hoveredConsole: boolean;
  setHoveredConsole: (v: boolean) => void;
  hoveredComms: boolean;
  setHoveredComms: (v: boolean) => void;
}

interface RibbonButtonProps {
  icon?: LucideIcon;
  label: string;
  onClick: () => void;
  accent?: 'slate' | 'cyan' | 'rose';
  disabled?: boolean;
}

interface IconRibbonButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  accent?: 'slate' | 'cyan' | 'rose';
  active?: boolean;
}

const CAMERA_STORAGE_KEY = 'hangar_camera_view_v1';
const BRUSH_CLIP =
  'polygon(2% 8%, 95% 1%, 100% 12%, 96% 24%, 100% 36%, 95% 52%, 100% 68%, 94% 84%, 98% 100%, 2% 92%, 0% 84%, 4% 71%, 1% 58%, 5% 43%, 0% 28%, 6% 16%)';

const WAREHOUSE_URL = 'https://ibtvipgvroakdoeitbns.supabase.co/storage/v1/object/public/Admin/warehouse.glb';
const SIDE_TABLE_URL = 'https://ibtvipgvroakdoeitbns.supabase.co/storage/v1/object/public/Admin/sci-fi_side_table__monitors.glb';
const CABINET_URL = 'https://ibtvipgvroakdoeitbns.supabase.co/storage/v1/object/public/Admin/metal_cabinet_low_poly.glb';
const WHITEBOARD_URL = 'https://ibtvipgvroakdoeitbns.supabase.co/storage/v1/object/public/Admin/whiteboard_-_practical_model_yadira.glb';
const COMMS_ROOM_URL = 'https://ibtvipgvroakdoeitbns.supabase.co/storage/v1/object/public/Admin/comms_room_-_assets.glb';
const CHAIR_URL = 'https://ibtvipgvroakdoeitbns.supabase.co/storage/v1/object/public/Admin/chair%20(2).glb';
const LOUNGE_SET_URL = 'https://ibtvipgvroakdoeitbns.supabase.co/storage/v1/object/public/Admin/chesterfield_lounge_set.glb';
const CLOCK_URL = 'https://ibtvipgvroakdoeitbns.supabase.co/storage/v1/object/public/Admin/reloj_xd.glb';

const DEFAULT_CAMERA: CameraState = {
  position: [0.8033762000072371, 3.3410362864962178, 0.009533869766730029],
  target: [-2, 2, 0],
};

const DEFAULT_ASSETS: Asset[] = [
  {
    id: 'warehouse',
    name: 'Almacén Principal',
    url: WAREHOUSE_URL,
    position: [5, -0.05, 0],
    rotation: [0, 0, 0],
    scale: 1,
  },
  {
    id: 'side_table',
    name: 'Consola Monitores',
    url: SIDE_TABLE_URL,
    position: [-5.25, 0, -1],
    rotation: [0, -1.5707963267948966, 0],
    scale: 0.013,
  },
  {
    id: 'cabinet',
    name: 'Armario Metálico',
    url: CABINET_URL,
    position: [-5.25, 1.1, 3],
    rotation: [0, 1.5707963267948966, 0],
    scale: 1.203,
  },
  {
    id: 'whiteboard',
    name: 'Pizarra Blanca',
    url: WHITEBOARD_URL,
    position: [-2.95, 0.4, 4.1],
    rotation: [0, -3.1416, 0],
    scale: 0.4,
  },
  {
    id: 'comms_room',
    name: 'Sala de Comunicaciones',
    url: COMMS_ROOM_URL,
    position: [-0.95, 0, -3.7],
    rotation: [0, 0, 0],
    scale: 1.102,
  },
  {
    id: 'chair',
    name: 'Silla Oficina',
    url: CHAIR_URL,
    position: [-3.5, 0.2, -0.45],
    rotation: [0, 0.5236, 0],
    scale: 1,
  },
  {
    id: 'lounge_set',
    name: 'Sillones Chesterfield',
    url: LOUNGE_SET_URL,
    position: [1.9, 0.6, 1],
    rotation: [0, -2.0944, 0],
    scale: 3.153,
  },
  {
    id: 'reloj_xd',
    name: 'Reloj de Comandos',
    url: CLOCK_URL,
    position: [-5.6, 2.75, 0],
    rotation: [0, 0.158, 0],
    scale: 0.33,
  },
];

const DEFAULT_PRESETS: ZoomPreset[] = [
  {
    id: 'console',
    name: 'CONSOLA GENERAL',
    subtitle: 'ESTACIÓN DE COMANDO HANGAR',
    position: [-3.05, 2.7, 0.25],
    target: [-3.85, 2.2, 0.15],
  },
  {
    id: 'monitor1',
    name: 'CAMARA 1',
    subtitle: 'REFRIGERACIÓN & ENERGÍA CENTRAL',
    position: [-4.6, 1.9, -0.35],
    target: [-6.35, 1.8, -1.3],
    hotspotPos: [-4.96, 1.93, -0.66],
    hotspotSize: [0.01, 0.25, 0.38],
    hotspotRot: [5, -37, -3],
  },
  {
    id: 'monitor2',
    name: 'CAMARA 2',
    subtitle: 'PRESIÓN HIDRÁULICA GRUPO B',
    position: [-4.4, 1.45, -0.35],
    target: [-6.2, 1.4, -1.3],
    hotspotPos: [-4.77, 1.67, -0.63],
    hotspotSize: [0.06, 0.35, 0.43],
    hotspotRot: [-2, -24, -16],
  },
  {
    id: 'monitor3',
    name: 'MONITOR',
    subtitle: 'RED DE COMUNICACIONES CUÁNTICAS',
    position: [-4, 1.65, 0.1],
    target: [-14.9, 1.7, -0.35],
    hotspotPos: [-5.1, 1.79, -0.01],
    hotspotSize: [0.01, 0.65, 0.92],
  },
  {
    id: 'monitor4',
    name: 'CAMARA 3',
    subtitle: 'ESTACIONAL TERMOPETAL NÚCLEO',
    position: [-4.75, 1.95, 0.5],
    target: [-5.35, 1.8, 0.8],
    hotspotPos: [-4.7, 2, 0.65],
    hotspotSize: [0.03, 0.25, 0.38],
    hotspotRot: [0, 28, 0],
  },
  {
    id: 'monitor5',
    name: 'CAMARA 4',
    subtitle: 'SISTEMA DE ASIGNACIÓN CARGO ROBOT',
    position: [-4.55, 1.8, 0.4],
    target: [-5.45, 1.25, 0.95],
    hotspotPos: [-4.74, 1.68, 0.62],
    hotspotSize: [0.01, 0.3, 0.38],
    hotspotRot: [0, 30, 15],
  },
  {
    id: 'comms',
    name: 'SALA DE COMUNICACIONES',
    subtitle: 'RED DE ENLACES EXTERNOS',
    position: [1.05, 1.8, -0.2],
    target: [-0.95, 1.4, -3.7],
  },
];

const MONITOR_PRESET_IDS = new Set(
  DEFAULT_PRESETS.filter((preset) => preset.id.startsWith('monitor')).map((preset) => preset.id),
);

function cloneVec3(vector: Vec3): Vec3 {
  return [vector[0], vector[1], vector[2]];
}

function isVec3(value: unknown): value is Vec3 {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
  );
}

function readStoredCamera(): CameraState {
  if (typeof window === 'undefined') {
    return DEFAULT_CAMERA;
  }

  try {
    const stored = window.localStorage.getItem(CAMERA_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_CAMERA;
    }

    const parsed = JSON.parse(stored) as Partial<CameraState>;
    if (isVec3(parsed.position) && isVec3(parsed.target)) {
      return {
        position: cloneVec3(parsed.position),
        target: cloneVec3(parsed.target),
      };
    }
  } catch {
    return DEFAULT_CAMERA;
  }

  return DEFAULT_CAMERA;
}

function ribbonSurface(accent: 'slate' | 'cyan' | 'rose', active = false): string {
  if (accent === 'rose') {
    return active
      ? 'bg-rose-400 border-rose-300 text-black'
      : 'bg-[#020617]/95 border-rose-500/30 text-rose-100 hover:bg-rose-400 hover:text-black';
  }

  if (accent === 'cyan') {
    return active
      ? 'bg-cyan-300 border-cyan-200 text-black'
      : 'bg-[#020617]/95 border-cyan-400/30 text-cyan-50 hover:bg-cyan-300 hover:text-black';
  }

  return active
    ? 'bg-cyan-300 border-cyan-200 text-black'
    : 'bg-[#020617]/95 border-white/10 text-white hover:bg-cyan-300 hover:text-black';
}

function RibbonButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
}: RibbonButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="admin-ui-hud-button"
    >
      <span className="admin-ui-hud-button-bg" />
      <span className="admin-ui-hud-button-content">
        {Icon ? <Icon className="admin-ui-hud-back-icon" size={16} strokeWidth={3.5} /> : null}
        <span>{label}</span>
      </span>
    </button>
  );
}

function IconRibbonButton({
  icon: Icon,
  label,
  onClick,
  accent = 'slate',
  active = false,
}: IconRibbonButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="admin-ui-hud-icon-button"
    >
      <span className="admin-ui-hud-button-bg" />
      <Icon
        className={`admin-ui-hud-icon ${
          accent === 'rose' ? 'admin-ui-hud-icon--exit' : 'admin-ui-hud-icon--audio'
        }`}
        size={20}
        strokeWidth={3.5}
      />
    </button>
  );
}

function Model({ url, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: ModelProps) {
  const gltf = useGLTF(url) as { scene: THREE.Group };
  const clonedScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useEffect(() => {
    clonedScene.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if ('isMesh' in mesh && mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [clonedScene]);

  return <primitive object={clonedScene} position={position} rotation={rotation} scale={scale} />;
}

function CameraTransitionController({
  activePosition,
  activeTarget,
  isTransitioning,
  setIsTransitioning,
  controlsRef,
}: CameraTransitionControllerProps) {
  const { camera } = useThree();
  const destinationPosition = useMemo(() => new THREE.Vector3(...activePosition), [activePosition]);
  const destinationTarget = useMemo(() => new THREE.Vector3(...activeTarget), [activeTarget]);
  // Keep a smooth internal target that we lerp independently of OrbitControls
  const currentTarget = useRef(new THREE.Vector3());
  const initialized = useRef(false);

  // When a new transition starts, snapshot where the controls target currently is
  // so the lerp starts from the actual current look-at point, not from 0,0,0
  useEffect(() => {
    if (isTransitioning) {
      if (controlsRef.current) {
        currentTarget.current.copy(controlsRef.current.target);
      } else {
        // Derive from camera direction
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        currentTarget.current.copy(camera.position).add(dir.multiplyScalar(5));
      }
    }
  }, [isTransitioning, camera, controlsRef]);

  // First frame: set currentTarget to wherever the controls are pointing
  useEffect(() => {
    if (!initialized.current && controlsRef.current) {
      currentTarget.current.copy(controlsRef.current.target);
      initialized.current = true;
    }
  });

  useFrame((_, delta) => {
    if (!isTransitioning) {
      return;
    }

    const alpha = Math.min(1, delta * 5);

    // Smoothly lerp camera position
    camera.position.lerp(destinationPosition, alpha);

    // Smoothly lerp the look-at target
    currentTarget.current.lerp(destinationTarget, alpha);

    // Point the camera at the interpolated target — do NOT call controls.update()
    // because that would recalculate position from spherical coords and fight the lerp
    camera.lookAt(currentTarget.current);

    const positionDistance = camera.position.distanceTo(destinationPosition);
    const targetDistance = currentTarget.current.distanceTo(destinationTarget);

    if (positionDistance < 0.01 && targetDistance < 0.01) {
      camera.position.copy(destinationPosition);
      currentTarget.current.copy(destinationTarget);
      camera.lookAt(destinationTarget);

      // Now sync OrbitControls to the final state so it can take over cleanly
      if (controlsRef.current) {
        controlsRef.current.target.copy(destinationTarget);
        controlsRef.current.update();
      }
      setIsTransitioning(false);
    }
  });

  return null;
}

function Scene({
  assets,
  cameraSessionRef,
  activePosition,
  activeTarget,
  viewMode,
  activePresetId,
  zoomPresets,
  setActivePresetId,
  onEnterZoom,
  onTransitionEnd,
  onMonitorAction,
  hoveredMonitorId,
  setHoveredMonitorId,
  hoveredConsole,
  setHoveredConsole,
  hoveredComms,
  setHoveredComms,
}: Omit<SceneProps, 'cameraConfig'>) {
  const controlsRef = useRef<any>(null);
  const previousTransitionState = useRef(false);
  const [isTransitioning, setIsTransitioning] = useState(true);

  const maxDistance = useMemo(() => {
    const position = new THREE.Vector3(...activePosition);
    const target = new THREE.Vector3(...activeTarget);
    return position.distanceTo(target) + 0.01;
  }, [activePosition, activeTarget]);

  // No immediate target sync here — CameraTransitionController handles the smooth lerp

  useEffect(() => {
    setIsTransitioning(true);
  }, [
    activePosition[0],
    activePosition[1],
    activePosition[2],
    activeTarget[0],
    activeTarget[1],
    activeTarget[2],
  ]);

  useEffect(() => {
    if (previousTransitionState.current && !isTransitioning) {
      onTransitionEnd(activePresetId);
    }
    previousTransitionState.current = isTransitioning;
  }, [activePresetId, isTransitioning, onTransitionEnd]);

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'default';
    };
  }, []);

  return (
    <Suspense fallback={null}>
      <ambientLight intensity={1.15} />
      <hemisphereLight intensity={0.8} groundColor="#0f172a" color="#f8fafc" />
      <directionalLight
        castShadow
        intensity={1.7}
        position={[6, 12, 6]}
        shadow-mapSize-height={2048}
        shadow-mapSize-width={2048}
      />
      <pointLight color="#89d8ff" intensity={25} distance={7.5} position={[-5, 2.8, -1]} />
      <pointLight color="#ffffff" intensity={8} distance={12} position={[0, 7, 1]} />

      {assets.map((asset) => {
        if (asset.id === 'side_table') {
          return (
            <group key={asset.id}>
              <group
                onClick={(event) => {
                  if (viewMode !== 'normal') {
                    return;
                  }
                  event.stopPropagation();
                  onEnterZoom('console');
                }}
                onPointerOver={(event) => {
                  if (viewMode !== 'normal') {
                    return;
                  }
                  event.stopPropagation();
                  setHoveredConsole(true);
                  document.body.style.cursor = 'pointer';
                }}
                onPointerOut={(event) => {
                  if (viewMode !== 'normal') {
                    return;
                  }
                  event.stopPropagation();
                  setHoveredConsole(false);
                  document.body.style.cursor = 'default';
                }}
              >
                <Model
                  url={asset.url}
                  position={asset.position}
                  rotation={asset.rotation}
                  scale={asset.scale}
                />
              </group>

              {viewMode === 'normal' && hoveredConsole ? (
                <Html center position={[-5.25, 2.3, -1]}>
                  <div className="pointer-events-none flex items-center gap-2 rounded border border-cyan-500 bg-[#020202]/95 px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.28)] whitespace-nowrap">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    <span>ACCEDER AL SISTEMA</span>
                  </div>
                </Html>
              ) : null}

              {viewMode === 'zoom' && (activePresetId === 'console' || MONITOR_PRESET_IDS.has(activePresetId))
                ? zoomPresets
                    .filter((preset) => MONITOR_PRESET_IDS.has(preset.id))
                    .map((preset) => {
                      const hotspotPosition =
                        preset.hotspotPos ??
                        ([-5.16, preset.target[1], preset.target[2]] as Vec3);
                      const hotspotSize = preset.hotspotSize ?? ([0.08, 0.45, 0.38] as Vec3);
                      const hotspotRotation = preset.hotspotRot ?? ([0, 0, 0] as Vec3);
                      const isHovered = hoveredMonitorId === preset.id;
                      const isSelected = activePresetId === preset.id;

                      return (
                        <group key={`monitor-hotspot-${preset.id}`}>
                          <mesh
                            position={hotspotPosition}
                            rotation={[
                              THREE.MathUtils.degToRad(hotspotRotation[0]),
                              THREE.MathUtils.degToRad(hotspotRotation[1]),
                              THREE.MathUtils.degToRad(hotspotRotation[2]),
                            ]}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (isSelected) {
                                // Click 3: already zoomed into this monitor → trigger sync
                                onMonitorAction(preset.id);
                              } else {
                                // Click 2: select this monitor → zoom in
                                setActivePresetId(preset.id);
                              }
                            }}
                            onPointerOver={(event) => {
                              event.stopPropagation();
                              setHoveredMonitorId(preset.id);
                              document.body.style.cursor = 'pointer';
                            }}
                            onPointerOut={(event) => {
                              event.stopPropagation();
                              setHoveredMonitorId(null);
                              document.body.style.cursor = 'default';
                            }}
                          >
                            <boxGeometry args={hotspotSize} />
                            <meshBasicMaterial
                              transparent
                              opacity={0}
                              depthWrite={false}
                              colorWrite={false}
                            />
                          </mesh>

                          {isHovered && !isSelected ? (
                            <Html
                              center
                              position={[
                                hotspotPosition[0] + 0.2,
                                hotspotPosition[1] + 0.28,
                                hotspotPosition[2],
                              ]}
                            >
                              <div className="pointer-events-none select-none">
                                <div className="rounded border-2 border-cyan-400 bg-[#020202]/95 px-3 py-1.5 font-mono text-[12px] font-bold uppercase tracking-[0.28em] text-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.45)] whitespace-nowrap">
                                  {preset.name}
                                </div>
                                <div className="mx-auto -mt-[4px] h-2.5 w-2.5 rotate-45 border-b-2 border-r-2 border-cyan-400 bg-[#020202]" />
                              </div>
                            </Html>
                          ) : null}

                          {isSelected && isHovered ? (
                            <Html
                              center
                              position={[
                                hotspotPosition[0] + 0.2,
                                hotspotPosition[1] + 0.28,
                                hotspotPosition[2],
                              ]}
                            >
                              <div className="pointer-events-none select-none">
                                <div className="rounded border-2 border-cyan-400 bg-cyan-400/90 px-3 py-1.5 font-mono text-[11px] font-black uppercase tracking-[0.28em] text-black shadow-[0_0_14px_rgba(34,211,238,0.55)] whitespace-nowrap">
                                  ▶ ACCEDER
                                </div>
                                <div className="mx-auto -mt-[4px] h-2.5 w-2.5 rotate-45 border-b-2 border-r-2 border-cyan-400 bg-cyan-400/90" />
                              </div>
                            </Html>
                          ) : null}
                        </group>
                      );
                    })
                : null}
            </group>
          );
        }

        if (asset.id === 'comms_room') {
          return (
            <group
              key={asset.id}
              onClick={(event) => {
                if (viewMode !== 'normal') {
                  return;
                }
                event.stopPropagation();
                onEnterZoom('comms');
              }}
              onPointerOver={(event) => {
                if (viewMode !== 'normal') {
                  return;
                }
                event.stopPropagation();
                setHoveredComms(true);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={(event) => {
                if (viewMode !== 'normal') {
                  return;
                }
                event.stopPropagation();
                setHoveredComms(false);
                document.body.style.cursor = 'default';
              }}
            >
              <Model
                url={asset.url}
                position={asset.position}
                rotation={asset.rotation}
                scale={asset.scale}
              />
              {viewMode === 'normal' && hoveredComms ? (
                <Html center position={[asset.position[0], asset.position[1] + 2.2, asset.position[2]]}>
                  <div className="pointer-events-none flex items-center gap-2 rounded border border-cyan-500 bg-[#020202]/95 px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.28)] whitespace-nowrap">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    <span>SALA DE COMUNICACIONES</span>
                  </div>
                </Html>
              ) : null}
            </group>
          );
        }

        return (
          <Model
            key={asset.id}
            url={asset.url}
            position={asset.position}
            rotation={asset.rotation}
            scale={asset.scale}
          />
        );
      })}

      <CameraTransitionController
        activePosition={activePosition}
        activeTarget={activeTarget}
        controlsRef={controlsRef}
        isTransitioning={isTransitioning}
        setIsTransitioning={setIsTransitioning}
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={viewMode === 'normal' && !isTransitioning}
        enableDamping
        dampingFactor={0.08}
        enablePan
        maxDistance={maxDistance}
        maxPolarAngle={Math.PI / 1.85}
        minDistance={0.5}
        minPolarAngle={0}
        onChange={(event) => {
          if (isTransitioning) {
            return;
          }

          const controls = event?.target;
          if (!controls || !controls.object || !controls.target) {
            return;
          }

          const liveCamera = controls.object as THREE.PerspectiveCamera;
          const liveTarget = controls.target as THREE.Vector3;
          cameraSessionRef.current = {
            position: [liveCamera.position.x, liveCamera.position.y, liveCamera.position.z],
            target: [liveTarget.x, liveTarget.y, liveTarget.z],
          };
        }}
      />
    </Suspense>
  );
}

function BootOverlay({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#020202] px-4 font-mono text-white">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <div className="relative">
          <div
            className="flex items-center gap-3 border border-cyan-500/20 bg-[#020617]/95 px-8 py-4 shadow-2xl"
            style={{ clipPath: BRUSH_CLIP, transform: 'skewX(-10deg)' }}
          >
            <span className="skew-x-[10deg] text-[10px] font-bold uppercase tracking-[0.32em] text-cyan-400">
              INICIANDO ESCENA...
            </span>
            <span className="skew-x-[10deg] text-sm font-black text-white">{progress}%</span>
          </div>
        </div>

        <div
          className="w-full border border-cyan-500/10 bg-[#020617]/95 p-1 shadow-lg"
          style={{ clipPath: BRUSH_CLIP }}
        >
          <div className="h-2 bg-cyan-950/80">
            <div
              className="h-full bg-cyan-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-950 border-t-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.18)]" />

        <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-cyan-500/45">
          CONECTOR DE RECURSOS DEL HANGAR · ALMACÉN REGULADO
        </p>
      </div>
    </div>
  );
}

function AdminMainViewUiLoader() {
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

  if (isComplete) {
    return null;
  }

  return (
    <div className="admin-ui-loader">
      <div className="admin-ui-loading-stack">
        <div className="admin-ui-loading-brush">
          <span>{displayProgress <= 0 ? 'INICIANDO...' : `CARGANDO... ${displayProgress}%`}</span>
        </div>
        <div className="admin-ui-loading-bar-shell">
          <div className="admin-ui-loading-bar" style={{ width: `${displayProgress}%` }} />
        </div>
        <div className="admin-ui-loader-spinner" />
      </div>
    </div>
  );
}

function SyncOverlay({
  isSyncing,
  syncState,
  presetName,
  onComplete,
  onBack,
}: {
  isSyncing: boolean;
  syncState: SyncState;
  presetName: string;
  onComplete: () => void;
  onBack: () => void;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isSyncing || syncState !== 'syncing') {
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 20);

    return () => clearInterval(interval);
  }, [isSyncing, syncState]);

  // Auto-set ready state when progress completes
  useEffect(() => {
    if (progress >= 100 && syncState === 'syncing') {
      // Don't auto-complete, just allow the button to be enabled
      // User must click "ACCEDER AL SISTEMA" to proceed
    }
  }, [progress, syncState]);

  if (!isSyncing) return null;

  const isReady = syncState === 'ready' || progress >= 100;
  const canAccess = progress >= 100;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-700">
      <div className="flex flex-col items-center gap-10 w-full max-w-md">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-cyan-500/10 rounded-full" />
          <div
            className="absolute inset-0 border-4 border-t-cyan-400 border-l-cyan-400/30 rounded-full animate-spin"
            style={{ animationDuration: '3s' }}
          />
          <div className="flex flex-col items-center">
            {isReady ? (
              <Check className="h-12 w-12 text-emerald-400" strokeWidth={3} />
            ) : (
              <span className="font-mono text-3xl font-black text-white leading-none">{progress}%</span>
            )}
            <span className="font-mono text-[8px] text-cyan-400/60 uppercase tracking-[0.3em] mt-1">
              {isReady ? 'LINK_READY' : 'LINK_SYNC'}
            </span>
          </div>
        </div>

        <div className="w-full space-y-4 px-10">
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="font-mono text-[10px] font-black text-cyan-400 tracking-[0.5em] uppercase">
              {presetName}
            </p>
            <p className="font-mono text-[8px] text-white/30 uppercase tracking-widest">
              {isReady ? 'Conexión establecida' : 'Estableciendo conexión segura...'}
            </p>
          </div>

          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-300 shadow-[0_0_15px_rgba(34,211,238,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 w-full px-8">
          <button
            onClick={canAccess ? onComplete : undefined}
            disabled={!canAccess}
            className={`group relative px-16 py-3 pointer-events-auto transition-all duration-300 ${
              canAccess ? 'active:scale-95' : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <div
              className={`absolute inset-0 transition-all duration-300 -z-10 shadow-lg ${
                canAccess
                  ? 'bg-[#020617]/95 group-hover:bg-cyan-300'
                  : 'bg-[#020617]/40 border border-cyan-500/10'
              }`}
              style={{
                clipPath: BRUSH_CLIP,
                transform: 'skewX(-5deg)',
              }}
            />
            <div className="relative z-10 flex items-center gap-3">
              {canAccess ? (
                <Check className="h-4 w-4 text-emerald-400 group-hover:text-black" strokeWidth={3} />
              ) : (
                <span className="font-mono text-[10px] font-black text-cyan-400/50">{progress}%</span>
              )}
              <span
                className={`text-[10px] font-black tracking-[0.4em] uppercase drop-shadow-md transition-colors ${
                  canAccess
                    ? 'text-white group-hover:text-black'
                    : 'text-white/40'
                }`}
              >
                ACCEDER AL SISTEMA
              </span>
            </div>
          </button>

          <button
            onClick={onBack}
            className="pointer-events-auto flex items-center justify-center gap-2 group relative px-12 py-2.5"
          >
            <div
              className="absolute inset-0 bg-[#020617]/60 group-hover:bg-blue-600/80 transition-all duration-300 -z-10"
              style={{
                clipPath: BRUSH_CLIP,
                transform: 'skewX(-10deg)',
              }}
            />
            <span className="text-[10px] font-black tracking-[0.25em] font-mono text-white/60 group-hover:text-white uppercase transition-colors">
              VOLVER A LA OFICINA
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminMainViewUiPage() {
  const navigate = useNavigate();
  const [cameraConfig, setCameraConfig] = useState<CameraState>(() => readStoredCamera());
  const [viewMode, setViewMode] = useState<ViewMode>('normal');
  const [activePresetId, setActivePresetId] = useState('console');
  const [bootProgress, setBootProgress] = useState(0);
  const [appLoaded, setAppLoaded] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [signalEnabled, setSignalEnabled] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [hoveredMonitorId, setHoveredMonitorId] = useState<string | null>(null);
  const [hoveredConsole, setHoveredConsole] = useState(false);
  const [hoveredComms, setHoveredComms] = useState(false);

  const cameraSessionRef = useRef<CameraState>({
    position: cloneVec3(cameraConfig.position),
    target: cloneVec3(cameraConfig.target),
  });

  const currentPreset = useMemo(() => {
    return DEFAULT_PRESETS.find((preset) => preset.id === activePresetId) ?? DEFAULT_PRESETS[0];
  }, [activePresetId]);

  const activePosition = useMemo<Vec3>(() => {
    return viewMode === 'normal' ? cameraConfig.position : currentPreset.position;
  }, [cameraConfig.position, currentPreset.position, viewMode]);

  const activeTarget = useMemo<Vec3>(() => {
    return viewMode === 'normal' ? cameraConfig.target : currentPreset.target;
  }, [cameraConfig.target, currentPreset.target, viewMode]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setBootProgress((current) => {
        const next = Math.min(100, current + Math.floor(Math.random() * 20) + 12);
        if (next >= 100) {
          window.clearInterval(interval);
          window.setTimeout(() => setAppLoaded(true), 180);
        }
        return next;
      });
    }, 45);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CAMERA_STORAGE_KEY, JSON.stringify(cameraConfig));
  }, [cameraConfig]);

  useEffect(() => {
    if (viewMode === 'normal' && syncState === 'idle') {
      setSignalEnabled(true);
    }
  }, [syncState, viewMode]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const persistLiveCamera = () => {
    const snapshot: CameraState = {
      position: cloneVec3(cameraSessionRef.current.position),
      target: cloneVec3(cameraSessionRef.current.target),
    };
    setCameraConfig(snapshot);
  };

  const handleEnterZoom = useCallback((presetId: string) => {
    persistLiveCamera();
    setActivePresetId(presetId);
    setViewMode('zoom');
    setSyncState('idle');
    setHoveredMonitorId(null);
  }, []);

  const handleMonitorSelect = useCallback((presetId: string) => {
    setActivePresetId(presetId);
    setSyncState('idle');
  }, []);

  const handleStartSync = useCallback((presetId: string) => {
    if (MONITOR_PRESET_IDS.has(presetId) && viewMode === 'zoom') {
      setSyncState('syncing');
    }
  }, [viewMode]);

  const handleSyncComplete = useCallback(() => {
    setSyncState('ready');
  }, []);

  const handleBack = useCallback(() => {
    if (syncState !== 'idle') {
      setSyncState('idle');
      return;
    }

    if (viewMode === 'zoom') {
      if (MONITOR_PRESET_IDS.has(activePresetId)) {
        setActivePresetId('console');
        setHoveredMonitorId(null);
        return;
      }

      setViewMode('normal');
      return;
    }

    navigate('/');
  }, [activePresetId, navigate, syncState, viewMode]);

  const handleTransitionEnd = useCallback((presetId: string) => {
    if (viewMode === 'zoom' && MONITOR_PRESET_IDS.has(presetId) && syncState === 'idle') {
      // No iniciar sync automáticamente, esperar al botón
    }
  }, [viewMode, syncState]);

  const isSyncing = syncState !== 'idle';

  return (
    <div className="admin-main-view-ui-page relative h-screen w-full overflow-hidden bg-[#020202] text-white">
      <div className="scan-grid absolute inset-0 z-0" />

      <AdminMainViewUiLoader />
      {isSyncing ? (
        <SyncOverlay
          isSyncing={isSyncing}
          syncState={syncState}
          presetName={currentPreset.name}
          onComplete={handleSyncComplete}
          onBack={handleBack}
        />
      ) : null}

      <div className="absolute inset-0 z-10">
        <Canvas
          dpr={[1, 2]}
          gl={{ antialias: true, toneMapping: THREE.ReinhardToneMapping }}
          shadows
        >
          <PerspectiveCamera makeDefault fov={35} position={cameraConfig.position} />
          <color attach="background" args={['#05070c']} />
          <Scene
            assets={DEFAULT_ASSETS}
            cameraSessionRef={cameraSessionRef}
            activePosition={activePosition}
            activeTarget={activeTarget}
            viewMode={viewMode}
            activePresetId={activePresetId}
            zoomPresets={DEFAULT_PRESETS}
            setActivePresetId={handleMonitorSelect}
            onEnterZoom={handleEnterZoom}
            onTransitionEnd={handleTransitionEnd}
            onMonitorAction={handleStartSync}
            hoveredMonitorId={hoveredMonitorId}
            setHoveredMonitorId={setHoveredMonitorId}
            hoveredConsole={hoveredConsole}
            setHoveredConsole={setHoveredConsole}
            hoveredComms={hoveredComms}
            setHoveredComms={setHoveredComms}
          />
        </Canvas>
      </div>

      <div className="pointer-events-none absolute inset-0 z-20">
        <div className="flex items-center justify-between p-6">
          <div className="pointer-events-auto">
            <RibbonButton accent="slate" icon={ChevronLeft} label="Volver" onClick={handleBack} />
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            <IconRibbonButton
              accent="cyan"
              icon={AudioLines}
              label="Señal"
              onClick={() => {
                setSignalEnabled((current) => !current);
                setToast(signalEnabled ? 'Canal silenciado' : 'Canal restaurado');
              }}
            />
            <IconRibbonButton
              accent="rose"
              icon={LogOut}
              label="Cerrar sesiÃ³n"
              onClick={() => {
                window.localStorage.removeItem('token');
                window.localStorage.removeItem('user');
                navigate('/');
              }}
            />
          </div>
        </div>



        {toast ? (
          <div className="absolute bottom-6 right-6 rounded border border-cyan-400/20 bg-slate-950/90 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.18)]">
            {toast}
          </div>
        ) : null}
      </div>
    </div>
  );
}

useGLTF.preload(WAREHOUSE_URL);
useGLTF.preload(SIDE_TABLE_URL);
useGLTF.preload(CABINET_URL);
useGLTF.preload(WHITEBOARD_URL);
useGLTF.preload(COMMS_ROOM_URL);
useGLTF.preload(CHAIR_URL);
useGLTF.preload(LOUNGE_SET_URL);
useGLTF.preload(CLOCK_URL);
