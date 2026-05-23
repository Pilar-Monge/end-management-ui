import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";

function TreasureModel() {
  const { scene } = useGLTF(
    "https://tuieldonbxswmopvyryx.supabase.co/storage/v1/object/public/expedicion-UI-objetos/old_water_treasure.glb"
  );

  // Solución para que no se dejen de ver partes del objeto:
  // Recorremos el modelo y desactivamos el 'frustum culling' en todas las mallas.
  // Esto obliga a Three.js a renderizar todas las piezas sin importar el ángulo o la distancia.
  scene.traverse((obj) => {
    if ((obj as any).isMesh) {
      obj.frustumCulled = false;
      // También aseguramos que las sombras y materiales se vean bien desde cualquier lado
      if ((obj as any).material) {
        (obj as any).material.depthWrite = true;
      }
    }
  });

  return (
    <primitive
      object={scene}
      scale={0.15}
      position={[0, -0.2, 0]}
      rotation={[0, -0.4, 0]}
    />
  );
}

interface LoadingScreenProps {
  show: boolean;
  onEnter: () => void;
  isLoaded: boolean;
}

export function LoadingScreen({ show, onEnter, isLoaded }: LoadingScreenProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[999] bg-[#020706]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
        >
          {/* Full-screen 3D Canvas — pulled back even further */}
          <div className="absolute inset-0">
            <Canvas
              camera={{ 
                position: [0, 5, 40], 
                fov: 45,
                near: 0.1,
                far: 5000 // Aumentamos el plano lejano para evitar que el objeto desaparezca al alejar la cámara
              }}
              style={{ background: "transparent" }}
              className="w-full h-full"
            >
              <ambientLight intensity={0.4} />
              <directionalLight
                position={[8, 15, -5]}
                intensity={1.8}
                color="#A4C2C5"
              />
              <directionalLight
                position={[-5, 6, 12]}
                intensity={0.5}
                color="#5D9797"
              />
              <Suspense fallback={null}>
                <TreasureModel />
              </Suspense>
              <OrbitControls
                enableZoom={true}
                enablePan={true}
                autoRotate={false}
                enableDamping={true}
                dampingFactor={0.1}
                minDistance={0.5}
                maxDistance={1500}
                makeDefault
              />
            </Canvas>
          </div>

          {/* Vignette + side darken */}
          <div className="absolute inset-0 pointer-events-none"
               style={{
                 background: `
                   linear-gradient(90deg, rgba(2,7,6,0.85) 0%, rgba(2,7,6,0.4) 35%, transparent 60%),
                   linear-gradient(0deg, rgba(2,7,6,0.8) 0%, transparent 40%),
                   radial-gradient(ellipse at 65% 45%, transparent 35%, rgba(2,7,6,0.5) 65%, rgba(2,7,6,0.92) 90%)
                 `
               }} 
          />

          {/* ── LEFT SIDE TEXT BLOCK ── */}
          <div className="absolute left-8 right-8 bottom-0 top-0 z-10 flex flex-col justify-end pb-12 pointer-events-none">

            {/* Subtítulo arriba */}
            <motion.div
              className="text-[11px] font-bold tracking-[5px] text-[#A4C2C5]/40 uppercase mb-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              Inicializando sistema
            </motion.div>

            {/* Título grande */}
            <motion.h1
              className="text-[clamp(54px,8vw,118px)] font-black leading-none tracking-[-2px] text-[#f0fafa] uppercase whitespace-nowrap"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              EXPEDICIONES
            </motion.h1>

            {/* Línea divisoria */}
            <motion.div
              className="h-[2px] my-4 bg-gradient-to-r from-[#69BFB7] via-[#67ACA9]/60 to-transparent"
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.8, duration: 0.9, ease: "easeOut" }}
            />

            {/* Subtítulo abajo */}
            <motion.div
              className="text-[10px] font-bold tracking-[4px] text-[#A4C2C5]/35 uppercase mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.6 }}
            >
              {isLoaded
                ? "Calibrando brújula • Rutas cargadas • Listo para operar"
                : "Calibrando brújula • Cargando rutas • Sincronizando..."}
            </motion.div>

            {/* Botón INGRESAR — brush stroke style */}
            {isLoaded && (
              <motion.div
                className="pointer-events-auto"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                whileHover={{ x: 10, scale: 1.04 }}
                whileTap={{ scale: 0.98 }}
              >
                <button
                  onClick={onEnter}
                  className="side-button is-active relative loading-enter-button"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: "rotateY(25deg) translateZ(10px)",
                    width: "auto",
                    maxWidth: 320,
                    minHeight: 38,
                    lineHeight: "38px",
                    fontSize: 18,
                    paddingLeft: "1.6em",
                    paddingRight: "1.2em",
                  }}
                >
                  <span className="btn-text whitespace-nowrap drop-shadow-md">
                    INGRESAR
                  </span>
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
