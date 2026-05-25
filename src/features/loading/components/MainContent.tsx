import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Sparkles } from "lucide-react";
import type { AnimationConfig } from "../types";
import "../loading.css";

interface MainContentProps {
  animConfig: AnimationConfig;
  setAnimConfig: (cfg: AnimationConfig) => void;
  triggerFullReplay: () => void;
  splashActive: boolean;
}

export default function MainContent({
  triggerFullReplay,
  splashActive
}: MainContentProps) {
  const [currentTime, setCurrentTime] = useState<string>("SYSTEM_LOADED");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toISOString().substring(11, 19) + " UTC"
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{
      position: "relative",
      minHeight: "100vh",
      backgroundColor: "#020617",
      color: "#f1f5f9",
      transition: "all 700ms",
      paddingBottom: "48px",
      zIndex: 10,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      opacity: splashActive ? 0.2 : 1,
      filter: splashActive ? "blur(4px)" : "none",
      pointerEvents: splashActive ? "none" : "auto"
    }}>
      
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

      <header style={{
        position: "relative",
        zIndex: 20,
        width: "100%",
        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
        padding: "16px 24px",
        backdropFilter: "blur(12px)",
        backgroundColor: "rgba(30, 41, 59, 0.2)"
      }}>
        <div style={{
          maxWidth: "96rem",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              fontSize: "9px",
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.25em",
              color: "#93c5fd",
              backgroundColor: "rgba(30, 41, 59, 0.2)",
              paddingRight: "12px",
              paddingLeft: "12px",
              paddingTop: "4px",
              paddingBottom: "4px",
              borderRadius: "4px",
              border: "1px solid rgba(59, 130, 246, 0.1)",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <span style={{
                height: "6px",
                width: "6px",
                borderRadius: "50%",
                backgroundColor: "rgb(52, 211, 153)",
                animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
              }} />
              <span>PENTA DEV STUDIO</span>
            </div>
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: "12px",
            fontFamily: "monospace"
          }}>
            <span style={{
              display: "none",
              fontSize: "10px",
              color: "rgb(100, 116, 139)",
              letterSpacing: "0.2em",
              textTransform: "uppercase"
            }}>
              TIME: <span style={{ color: "#93c5fd" }}>{currentTime}</span>
            </span>

            <button
              id="header-replay-action"
              onClick={triggerFullReplay}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                border: "1px solid rgba(147, 197, 253, 0.2)",
                backgroundColor: "rgba(30, 41, 59, 0.4)",
                transition: "all 300ms",
                paddingTop: "6px",
                paddingBottom: "6px",
                paddingLeft: "14px",
                paddingRight: "14px",
                color: "rgb(203, 213, 225)",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                cursor: "pointer",
                fontSize: "10px",
                fontFamily: "monospace",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                borderRadius: "4px"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(147, 197, 253, 0.6)";
                e.currentTarget.style.backgroundColor = "rgba(15, 23, 42, 0.8)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(147, 197, 253, 0.2)";
                e.currentTarget.style.backgroundColor = "rgba(30, 41, 59, 0.4)";
              }}
            >
              <RotateCcw style={{ width: "12px", height: "12px", color: "#93c5fd" }} />
              <span>Replay Intro</span>
            </button>
          </div>
        </div>
      </header>

      <main style={{
        position: "relative",
        zIndex: 20,
        maxWidth: "64rem",
        margin: "0 auto",
        paddingLeft: "24px",
        paddingRight: "24px",
        paddingTop: "48px",
        flex: 1,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center"
      }}>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={!splashActive ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px"
          }}
        >
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            color: "rgba(147, 197, 253, 0.3)"
          }}>
            <span style={{ height: "1px", width: "32px", backgroundColor: "rgba(147, 197, 253, 0.2)" }} />
            <Sparkles style={{ width: "16px", height: "16px", color: "rgba(251, 191, 36, 0.6)" }} />
            <span style={{ height: "1px", width: "32px", backgroundColor: "rgba(147, 197, 253, 0.2)" }} />
          </div>

          <h1 className="title-distressed title-glitch-hover" style={{
            fontSize: "96px",
            letterSpacing: "0.05em",
            lineHeight: 1,
            textTransform: "uppercase",
            filter: "drop-shadow(0 0 15px rgba(147, 197, 253, 0.15))",
            paddingBottom: "4px"
          }}>
            <span className="title-text-white">PENTA DEV</span>{" "}
            <span className="title-text-gold">STUDIO</span>
          </h1>

          <div style={{
            fontFamily: "monospace",
            fontSize: "12px",
            textTransform: "uppercase",
            letterSpacing: "0.4em",
            color: "#93c5fd",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            opacity: 0.9,
            paddingLeft: "4px"
          }}>
            <span>Creative Development & Experiential Design</span>
            <span className="typewriter-cursor">_</span>
          </div>
        </motion.div>

      </main>

      <footer style={{
        position: "relative",
        zIndex: 20,
        width: "100%",
        maxWidth: "96rem",
        margin: "0 auto",
        paddingLeft: "24px",
        paddingRight: "24px",
        paddingTop: "24px",
        borderTop: "1px solid rgba(30, 41, 59, 0.6)",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        fontSize: "9px",
        color: "rgb(100, 116, 139)",
        fontFamily: "monospace",
        letterSpacing: "0.2em",
        textTransform: "uppercase"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            height: "6px",
            width: "6px",
            borderRadius: "50%",
            backgroundColor: "rgba(147, 197, 253, 0.3)",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
          }} />
          <span>Interactive Reveal System Complete</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "rgb(71, 85, 105)" }}>
          <span>&copy; {new Date().getFullYear()} Penta Dev Studio</span>
        </div>
      </footer>

    </div>
  );
}
