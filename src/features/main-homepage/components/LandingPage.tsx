import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface LandingPageProps {
  activeState: string;
  onIntro: () => void;
  onMenu: () => void;
  onLogin: () => void;
  volume: number;
  setVolume: (v: number) => void;
  isAudioEnabled: boolean;
  setIsAudioEnabled: (e: boolean) => void;
  onExit: () => void;
}

const TEAM_MEMBERS = [
  { name: "Gabriel Bermudez Miranda", git: "https://github.com/GabrielBermudezMiranda" },
  { name: "Pilar Monge Ureña", git: "https://github.com/Pilar-Monge" },
  { name: "Edicson Picado Quesada", git: "https://github.com/Edicson-PQ" },
  { name: "Emily Castillo Monge", git: "https://github.com/EmilyCastill0" },
  { name: "Jeison Saldaña Rios", git: "https://github.com/JeisonSaldanaRios" },
];

function GitHubIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.54 2.87 8.39 6.84 9.75.5.09.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 7.01c.85 0 1.7.12 2.5.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.8 0 .27.18.59.69.49A10.14 10.14 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

function SoundWave({ isActive }: { isActive: boolean }) {
  return (
    <div className="flex items-end gap-[3px] h-5 px-1">
      {[4, 12, 12, 8, 7].map((h, i) => (
        <motion.div
          key={i}
          animate={{
            height: [h, h * 1.5, h * 0.8, h],
            opacity: isActive ? 1 : 0.4
          }}
          transition={{
            repeat: Infinity,
            duration: 1 + i * 0.15,
            ease: "easeInOut"
          }}
          className="w-[2px] bg-white group-hover:bg-blue-400 group-hover:shadow-[0_0_8px_rgba(96,165,250,0.6)] transition-all rounded-full"
        />
      ))}
    </div>
  );
}

export default function LandingPage({ 
  onIntro, 
  onMenu, 
  onLogin, 
  volume, 
  setVolume, 
  isAudioEnabled, 
  setIsAudioEnabled,
  onExit
}: LandingPageProps) {
  const [showUI, setShowUI] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [active, setActive] = useState<"intro" | "menu" | "login">("login");
  const [showVolumePanel, setShowVolumePanel] = useState(false);
  
  // Decoding Effect
  const [isDecoding, setIsDecoding] = useState(true);
  const [decodedTitle, setDecodedTitle] = useState("END MANAGEMENT");
  const decodeChars = "!@#$%^&*()_+-=[]{}|;:,.<>?/~`ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  // Typewriter Effect
  const [subtitleText, setSubtitleText] = useState("");
  const subtitleFull = "SURVIVAL SYSTEM — PROJECT X";
  const subtitleStarted = useRef(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowUI(true), 100);
    const t2 = setTimeout(() => setShowMenu(true), 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    const target = "END MANAGEMENT";
    let iteration = 0;
    const interval = setInterval(() => {
      setDecodedTitle(
        target
          .split("")
          .map((ch, i) => {
            if (ch === " ") return " ";
            if (i < iteration) return target[i];
            return decodeChars[Math.floor(Math.random() * decodeChars.length)];
          })
          .join("")
      );
      iteration += 1.5;
      if (iteration >= target.length + 1) {
        clearInterval(interval);
        setDecodedTitle(target);
        setIsDecoding(false);
      }
    }, 6);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const startDelay = setTimeout(() => {
      if (subtitleStarted.current) return;
      subtitleStarted.current = true;
      let idx = 0;
      const interval = setInterval(() => {
        idx += 2;
        setSubtitleText(subtitleFull.slice(0, idx));
        if (idx >= subtitleFull.length) clearInterval(interval);
      }, 2);
      return () => clearInterval(interval);
    }, 50);
    return () => clearTimeout(startDelay);
  }, []);

  const [titleTop, ...titleRest] = decodedTitle.split(" ");
  const titleBottom = titleRest.join(" ");

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white select-none">
      {/* ── Background Layer ── */}
      <div
        className="absolute inset-0 bg-cover bg-center anim-bg-reveal"
        style={{
          backgroundImage: "url('/images/bg2.jpg')",
          filter: "contrast(1.15) brightness(0.8) saturate(0.95)",
        }}
      />

      {/* ── Overlays ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/40" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      {/* ── Depth Layers ── */}
      <div className="background-depth-light" />
      <div className="background-depth-fog" />
      <div className="background-depth-shadow" />

      {/* ── Grain ── */}
      <div
        className="absolute inset-0 opacity-[0.18] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.9'/></svg>\")",
        }}
      />

      {/* ── Scanlines ── */}
      <div className="absolute inset-0 pointer-events-none z-30 scanlines" />

      {/* ── Icons Superiores ── */}
      <div
        className={`absolute top-5 right-6 flex items-center gap-5 z-20 transition-all duration-1000 ${
          showUI ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}
      >
        <div className="relative group">
          <button 
            onClick={() => setShowVolumePanel(!showVolumePanel)}
            className="p-3 transition-all text-white cursor-pointer icon-btn flex items-center justify-center min-w-[54px]" 
            title="Audio"
          >
            <SoundWave isActive={isAudioEnabled} />
          </button>

          <AnimatePresence>
            {showVolumePanel && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10, x: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10, x: -10 }}
                className="absolute top-full right-0 mt-2 p-8 panel-brush min-w-[240px] z-50 flex flex-col gap-6 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-2 border-b border-white/10 pb-4">
                  <div className="flex flex-col">
                    <div className="text-[10px] uppercase tracking-[0.4em] font-mono text-white/40 underline decoration-blue-400/40">Opciones Globales</div>
                    <span className="text-[16px] font-black tracking-[0.3em] text-white italic uppercase" style={{ fontFamily: "'Oswald', sans-serif" }}>SISTEMA DE AUDIO</span>
                  </div>
                  <button 
                    onClick={() => setShowVolumePanel(false)} 
                    className="p-2 transition-all duration-300 text-white/60 hover:text-blue-400 hover:rotate-90 hover:scale-110 active:scale-95 flex items-center justify-center"
                  >
                    <div className="relative w-5 h-5 flex items-center justify-center">
                      <div className="absolute w-full h-0.5 bg-current rotate-45" />
                      <div className="absolute w-full h-0.5 bg-current -rotate-45" />
                    </div>
                  </button>
                </div>

                <div className="flex items-center gap-6 px-1">
                  <button 
                    onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                    className={`transition-all hover:scale-110 ${isAudioEnabled ? 'text-blue-400' : 'text-white/40'}`}
                  >
                    {isAudioEnabled ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                    )}
                  </button>
                  <div className="flex-1 h-2 flex items-center">
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                    />
                  </div>
                </div>
                <div 
                  className="text-[12px] font-bold text-center text-white/50 uppercase tracking-[0.4em]"
                  style={{ fontFamily: "'Oswald', sans-serif" }}
                >
                  NIVEL: {volume}%
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button 
          onClick={onExit}
          className="p-3 transition-all text-red-500 hover:text-red-400 cursor-pointer icon-btn border-red-500/20 hover:border-red-500/40" 
          title="Exit"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 transition-colors">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>


      {/* ── Título ── */}
      <div
        className="absolute top-[5%] left-[3.5%] z-20"
        style={{ fontFamily: "'Oswald', sans-serif" }}
      >
        <h1
          className={`font-extrabold leading-[0.88] overflow-hidden title-distressed title-glitch-hover ${
            isDecoding ? "title-decoding-flicker" : ""
          }`}
          data-text={titleTop || "END"}
          style={{
            fontSize: "clamp(70px, 12vw, 180px)",
            letterSpacing: "-3px",
            WebkitTextStroke: "1px rgba(255,255,255,0.2)",
          }}
        >
          <span className="title-text-white">{titleTop || "END"}</span>
        </h1>

        <h1
          className={`font-extrabold leading-[0.88] mt-4 overflow-hidden title-distressed title-glitch-hover ${
            isDecoding ? "title-decoding-flicker" : ""
          }`}
          data-text={titleBottom || "MANAGEMENT"}
          style={{
            fontSize: "clamp(70px, 12vw, 180px)",
            letterSpacing: "-3px",
          }}
        >
          <span className="title-text-gold">{titleBottom || "MANAGEMENT"}</span>
        </h1>

        <div className="mt-4 flex items-center gap-3">
          <div className="subtitle-line" />
          <p
            className="text-white font-medium tracking-[0.12em] whitespace-nowrap"
            style={{ fontSize: "clamp(13px, 1.5vw, 24px)" }}
          >
            <span className="typewriter-text">{subtitleText}</span>
            <span className="typewriter-cursor">|</span>
          </p>
        </div>
      </div>

      {/* ── Menú Inferior Derecho ── */}
      <div
        className="absolute bottom-10 right-10 z-20 text-right"
        style={{ fontFamily: "'Oswald', sans-serif" }}
      >
        <ul className="flex flex-col items-end gap-2">
          {(["intro", "menu", "login"] as const).map((item, idx) => {
            const labels = { intro: "INTRO", menu: "LOBBY", login: "LOGIN" };
            return (
              <li
                key={item}
                className="overflow-visible"
                style={{
                  opacity: showMenu ? 1 : 0,
                  transform: showMenu ? "translateX(0)" : "translateX(40px)",
                  transition: `all 0.6s cubic-bezier(.22,1,.36,1) ${idx * 0.15}s`,
                }}
              >
                <button
                  onClick={() => {
                    setActive(item);
                    if (item === "intro") onIntro();
                    else if (item === "menu") onMenu();
                    else if (item === "login") onLogin();
                  }}
                  className={`text-2xl md:text-3xl font-bold tracking-wider transition-colors duration-200 menu-item menu-brush ${
                    (active === item || item === "login")
                      ? "text-white menu-brush-active-blue"
                      : "text-white"
                  }`}
                >
                  <span className="relative z-[2] inline-flex items-center gap-3">
                    {labels[item]}
                    {active === item && (
                      <span className="text-white arrow-pulse">▶</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── Créditos / Studio Badge ── */}
      <div
        className={`absolute bottom-6 left-6 z-40 transition-all duration-1000 delay-[3500ms] ${
          showMenu ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        <button
          type="button"
          onClick={() => setShowCredits((value) => !value)}
          className="menu-brush transition-all text-white px-6 py-2"
          aria-expanded={showCredits}
          aria-controls="studio-credits"
        >
          <div className="relative z-10 flex flex-col items-start">
            <span className="studio-badge-title text-white">PentaDev Studio</span>
          </div>
        </button>
      </div>

      <AnimatePresence>
        {showCredits && (
          <div className="fixed inset-0 z-[100] pointer-events-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 cursor-default bg-black/35 pointer-events-auto"
              onClick={() => setShowCredits(false)}
            />
            <motion.section
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              id="studio-credits"
              className="panel-brush pointer-events-auto p-12 credits-panel-fixed"
              aria-label="Creditos de PentaDev Studio"
            >
              <div className="credits-header border-b border-white/10 pb-6 mb-3">
                <div className="relative z-10">
                  <h2 className="text-3xl font-black text-white italic tracking-tighter" style={{ fontFamily: "'Oswald', sans-serif" }}>PentaDev Studio</h2>
                </div>
                <button 
                  type="button" 
                  className="p-3 transition-all duration-300 text-white/60 hover:text-blue-400 hover:rotate-90 hover:scale-110 active:scale-95 z-20 flex items-center justify-center" 
                  onClick={() => setShowCredits(false)} 
                  aria-label="Cerrar"
                >
                  <X size={24} className="relative z-10" />
                </button>
              </div>
              <div className="relative z-10 mb-4">
                <div className="text-[14px] font-black text-white italic tracking-[0.2em] opacity-90 uppercase" style={{ fontFamily: "'Oswald', sans-serif" }}>CREADORES:</div>
              </div>
              <div className="credits-list relative z-10 space-y-2">
                {TEAM_MEMBERS.map((member) => (
                  <a 
                    key={member.git} 
                    className="credits-member group flex justify-between items-center px-6 py-3 transition-all menu-brush text-white" 
                    href={member.git} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    <span className="relative z-10 font-bold tracking-wide text-white uppercase">{member.name}</span>
                    <span className="relative z-10 flex items-center gap-2 text-[10px] font-bold text-white">
                      <GitHubIcon className="h-4 w-4 stroke-white" />
                      GITHUB
                    </span>
                  </a>
                ))}
              </div>
            </motion.section>
          </div>
        )}
      </AnimatePresence>

      {/* ── SVG Decorativo ── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-10 opacity-60"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
      >
        <g fill="black">
          <path d="M0,0 L0,250 Q200,180 350,260 Q500,340 650,200 Q700,180 720,0 Z" />
          <path d="M1920,0 L1920,300 Q1700,250 1550,330 Q1400,400 1300,250 Q1280,150 1300,0 Z" />
        </g>
      </svg>

      {/* ── Filtro SVG Grunge ── */}
      <svg className="absolute" style={{ width: 0, height: 0 }}>
        <defs>
          <filter id="grunge">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.04"
              numOctaves="5"
              seed="2"
              result="noise"
            />
            <feColorMatrix
              in="noise"
              type="saturate"
              values="0"
              result="desaturated"
            />
            <feComponentTransfer in="desaturated" result="threshold">
              <feFuncA type="discrete" tableValues="0 0 1 1 1 1" />
            </feComponentTransfer>
            <feComposite in="SourceGraphic" in2="threshold" operator="in" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
