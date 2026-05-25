import { motion, AnimatePresence } from "framer-motion";
import "../pages/resource-control-panel.css";
import pistolBg from "../assets/images/pistol_bg_1779321852250.png";

interface LoadingScreenProps {
  show: boolean;
  onEnter: () => void;
  onBack?: () => void;
  isLoaded: boolean;
}

export function LoadingScreen({ show, onEnter, onBack, isLoaded }: LoadingScreenProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[999] bg-[#020706]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
        >
          
          <div className="absolute inset-0 select-none pointer-events-none overflow-hidden bg-[#020706]">
            <img 
              src={pistolBg} 
              alt="Fondo Suministros" 
              className="w-full h-full object-cover opacity-75 md:opacity-85 filter brightness-[0.65] contrast-[1.05]"
              referrerPolicy="no-referrer"
            />
          </div>

          
          <div className="absolute inset-0 pointer-events-none"
               style={{
                 background: `
                   linear-gradient(90deg, rgba(2,7,6,0.92) 0%, rgba(2,7,6,0.5) 30%, transparent 65%),
                   linear-gradient(0deg, rgba(2,7,6,0.85) 0%, transparent 45%),
                   radial-gradient(ellipse at 65% 45%, transparent 30%, rgba(2,7,6,0.55) 65%, rgba(2,7,6,0.95) 92%)
                 `
               }} 
          />

          
          <div className="absolute left-8 right-8 bottom-0 top-0 z-10 flex flex-col justify-end pb-12 pointer-events-none">

            
            <motion.div
              className="text-[11px] font-bold tracking-[5px] text-[#A4C2C5]/40 uppercase mb-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              Inicializando sistema
            </motion.div>

            
            <motion.h1
              className="text-[clamp(54px,8vw,118px)] font-black leading-none tracking-[-2px] text-[#f0fafa] uppercase whitespace-nowrap"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              SUMINISTROS
            </motion.h1>

            
            <motion.div
              className="h-[2px] my-4 bg-gradient-to-r from-[#69BFB7] via-[#67ACA9]/60 to-transparent"
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.8, duration: 0.9, ease: "easeOut" }}
            />

            
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

            
            {isLoaded && (
              <motion.div
                className="pointer-events-auto flex flex-wrap items-center gap-4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <motion.button
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
                  whileHover={{ x: 10, scale: 1.04 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="btn-text whitespace-nowrap drop-shadow-md">
                    INGRESAR
                  </span>
                </motion.button>
                {onBack && (
                  <button
                    onClick={onBack}
                    className="side-button relative"
                    style={{
                      transformStyle: "preserve-3d",
                      transform: "rotateY(25deg) translateZ(10px)",
                      width: "auto",
                      maxWidth: 360,
                      minHeight: 38,
                      lineHeight: "38px",
                      fontSize: 16,
                      paddingLeft: "1.4em",
                      paddingRight: "1.2em",
                    }}
                  >
                    <span className="btn-text whitespace-nowrap drop-shadow-md">
                      VOLVER AL HANGAR
                    </span>
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
