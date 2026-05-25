import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronUp, Sparkles, Cpu } from "lucide-react";
import type { AnimationConfig } from "../types";
import "../loading.css";

interface SplashIntroProps {
  config: AnimationConfig;
  onTransitionComplete: () => void;
  isTriggered: boolean;
  setTriggered: (val: boolean) => void;
}

const SHADER_LOGS = [
  "Initializing quantum matrix...",
  "Synthesizing chromatic vector pipelines...",
  "Compiling WebGL spring physics engine...",
  "Binding reactive state listeners...",
  "Establishing Penta neural interface...",
  "Penta Dev Studio online."
];

export default function SplashIntro({
  config,
  onTransitionComplete,
  isTriggered,
  setTriggered
}: SplashIntroProps) {
  const [progress, setProgress] = useState(0);
  const [logIndex, setLogIndex] = useState(0);
  const [isReadyToEnter, setIsReadyToEnter] = useState(false);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    let timer: any;
    const durationMs = 2200;
    const intervalTime = 30;
    const step = 100 / (durationMs / intervalTime);

    timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        if (next >= 100) {
          clearInterval(timer);
          setIsReadyToEnter(true);
          return 100;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isTriggered]);

  useEffect(() => {
    if (progress < 100) {
      const idx = Math.min(
        Math.floor((progress / 100) * SHADER_LOGS.length),
        SHADER_LOGS.length - 1
      );
      setLogIndex(idx);
    } else {
      setLogIndex(SHADER_LOGS.length - 1);
    }
  }, [progress]);

  useEffect(() => {
    if (isReadyToEnter && config.autoplay && !isTriggered) {
      const delayTimer = setTimeout(() => {
        setTriggered(true);
      }, config.autoDelay);
      return () => clearTimeout(delayTimer);
    }
  }, [isReadyToEnter, config.autoplay, config.autoDelay, isTriggered, setTriggered]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isReadyToEnter && Math.abs(e.deltaY) > 8) {
        setTriggered(true);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isReadyToEnter && touchStartY.current !== null && e.touches.length > 0) {
        const deltaY = touchStartY.current - e.touches[0].clientY;
        if (Math.abs(deltaY) > 10) {
          setTriggered(true);
          touchStartY.current = null;
        }
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [isReadyToEnter, setTriggered]);

  const handleTapToEnter = () => {
    if (isReadyToEnter) {
      setTriggered(true);
    }
  };

  const curtainTransition: any =
    config.type === "spring"
      ? {
          type: "spring",
          stiffness: config.stiffness,
          damping: config.damping,
          mass: 1,
          duration: config.duration,
        }
      : {
          type: "tween",
          ease: "easeInOut",
          duration: config.duration,
        };

  useEffect(() => {

    if (isTriggered) {

      const timer = setTimeout(() => {
        onTransitionComplete();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isTriggered, onTransitionComplete]);

  return (
    <motion.div
      id="splash-curtain-container"
      initial={{ y: 0 }}
      animate={{ y: isTriggered ? "-100%" : 0 }}
      transition={curtainTransition}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        overflow: "hidden",
        background: "#020617",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "24px 48px",
      }}
    >
      <div style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 0
      }}>
        <div className="background-depth-light" />
        <div className="background-depth-fog animate-fogDrift" />
        <div className="background-depth-shadow" />
        <div className="scanlines" style={{ opacity: 0.35 }} />
      </div>

      <div style={{
        width: "100%",
        maxWidth: "96rem",
        margin: "0 auto",
        zIndex: 10,
        position: "relative",
        height: "24px"
      }} />

      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
        flex: 1,
        paddingTop: "48px",
        paddingBottom: "48px",
        position: "relative",
        textAlign: "center",
        opacity: isTriggered ? 0 : 1,
        transition: "opacity 200ms ease-out"
      }}>
        
        <div style={{
          position: "relative",
          marginBottom: "32px",
          width: "96px",
          height: "96px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }} className="anim-atmosphere-pulse">
          <div style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "1px solid rgba(59, 130, 246, 0.1)",
            animation: "spin 15s linear infinite"
          }} />
          <div style={{
            position: "absolute",
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            border: "1px dashed rgba(99, 102, 241, 0.2)",
            animation: "spin 8s linear infinite reverse"
          }} />

          <svg
            viewBox="0 0 100 100"
            style={{
              width: "64px",
              height: "64px",
              filter: "drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))",
              cursor: "pointer"
            }}
          >
            <polygon
              points="50,5 92,36 76,86 24,86 8,36"
              fill="none"
              stroke="rgba(147,197,253,0.3)"
              strokeWidth="1.5"
            />
            <motion.polygon
              points="50,5 92,36 76,86 24,86 8,36"
              fill="url(#pentagon-gradient)"
              stroke="#93c5fd"
              strokeWidth="2.5"
              initial={{ strokeDasharray: "300", strokeDashoffset: "300" }}
              animate={{ strokeDashoffset: progress === 100 ? 0 : 300 - (progress / 100) * 300 }}
              transition={{ ease: "easeOut" }}
            />
            <defs>
              <linearGradient id="pentagon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.02" />
              </linearGradient>
            </defs>
          </svg>

          <motion.div
            animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            style={{ position: "absolute" }}
          >
            <Sparkles style={{ width: "20px", height: "20px", color: "#bfdbfe" }} />
          </motion.div>
        </div>

        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          cursor: "pointer"
        }}>
          <div className="title-distressed title-glitch-hover title-decoding-flicker" style={{
            fontSize: "56px",
            lineHeight: 1,
            paddingTop: "8px",
            paddingBottom: "8px",
            letterSpacing: "0.1em",
            textAlign: "center"
          }}>
            <span className="title-text-white">PENTA DEV</span>{" "}
            <span className="title-text-gold">STUDIO</span>
          </div>
        </div>

        <div style={{
          width: "256px",
          maxWidth: "100%",
          marginTop: "40px",
          position: "relative"
        }}>
          <div style={{
            height: "1px",
            width: "100%",
            backgroundColor: "rgba(30, 41, 59, 0.8)",
            borderRadius: "9999px"
          }} />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "1.5px",
              borderRadius: "9999px",
              backgroundImage: `linear-gradient(90deg, rgb(59, 130, 246), rgb(139, 92, 246))`,
              width: `${progress}%`,
              transition: "width 75ms linear"
            }}
          />
          {progress > 0 && progress < 100 && (
            <div
              style={{
                position: "absolute",
                height: "12px",
                width: "12px",
                top: "-5.5px",
                borderRadius: "50%",
                backgroundColor: "white",
                opacity: 0.9,
                filter: "blur(2px)",
                boxShadow: "0 0 10px #93c5fd",
                left: `calc(${progress}% - 6px)`,
                transition: "left 75ms linear"
              }}
            />
          )}
        </div>

        {progress < 100 && (
          <div style={{
            height: "40px",
            marginTop: "20px",
            maxWidth: "448px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "monospace",
            fontSize: "9.5px",
            letterSpacing: "0.1em",
            color: "rgb(148, 163, 184)",
            textTransform: "uppercase"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Cpu style={{
                width: "12px",
                height: "12px",
                color: "#93c5fd",
                animation: "spin 3s linear infinite"
              }} />
              <span style={{ transition: "all 300ms" }}>
                [ {Math.round(progress)}% ] {SHADER_LOGS[logIndex]}
              </span>
            </div>
          </div>
        )}
      </div>

      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        zIndex: 10,
        width: "100%",
        maxWidth: "448px",
        margin: "0 auto",
        minHeight: "96px",
        position: "relative",
        marginBottom: "16px"
      }}>
        {isReadyToEnter ? (
          <motion.button
            id="curtain-enter-btn"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 15 }}
            onClick={handleTapToEnter}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px",
              backgroundColor: "rgba(30, 41, 59, 0.4)",
              border: "1px solid rgba(147, 197, 253, 0.2)",
              borderRadius: "9999px",
              cursor: "pointer",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              transition: "all 300ms",
              width: "56px",
              height: "56px",
              color: "#f1f5f9"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(147, 197, 253, 0.15)";
              e.currentTarget.style.borderColor = "rgba(147, 197, 253, 0.7)";
              e.currentTarget.style.boxShadow = "0 0 32px rgba(147, 197, 253, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(30, 41, 59, 0.4)";
              e.currentTarget.style.borderColor = "rgba(147, 197, 253, 0.2)";
              e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.1)";
            }}
            title="Entrar al Sistema"
          >
            <motion.div
              animate={{ y: [2, -4, 2] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
            >
              <ChevronUp style={{ width: "28px", height: "28px", color: "#93c5fd" }} />
            </motion.div>
          </motion.button>
        ) : (
          <div style={{
            fontSize: "10px",
            fontFamily: "monospace",
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            color: "#93c5fd",
            textAlign: "center",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <span style={{
              height: "6px",
              width: "6px",
              borderRadius: "50%",
              backgroundColor: "rgb(59, 130, 246)",
              animation: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite"
            }} />
            Compiling atmosphere fog grids...
          </div>
        )}
      </div>
    </motion.div>
  );
}
