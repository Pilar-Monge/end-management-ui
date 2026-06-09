import { useMemo, useId, useState, useRef } from "react";
import DottedMap from "dotted-map";
import { motion } from "framer-motion";
import { ZoomIn, ZoomOut, RefreshCw, Compass } from "lucide-react";

interface Point {
  lat: number;
  lng: number;
  label?: string;
  id?: string | number;
}

interface Dot {
  start: Point;
  end: Point;
  status?: string;
  isBase?: boolean;
  type?: "camp" | "adventure" | "expedition";
}

interface WorldMapProps {
  dots?: Dot[];
  lineColor?: string;
  lowMotion?: boolean;
  onZoneClick?: (dot: Dot) => void;
}

const STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS: "#69BFB7",
  PLANNED: "#67ACA9",
  DELAYED: "#f59e0b",
  COMPLETED: "#4ade80",
  LOST: "#ef4444",
  ACTIVE: "#69BFB7",
};

const CAMP_COLOR = "#69BFB7"; 
const ADVENTURE_COLOR = "#FFA000";

export function primeWorldMapCache() {
  
}

export function WorldMap({ dots = [], lineColor = "#69BFB7", onZoneClick }: WorldMapProps) {
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const { svgMap, mapWidth, projectPoint } = useMemo(() => {
    const map = new DottedMap({ height: 100, grid: "diagonal" });
    const svg = map.getSVG({
      radius: 0.22,
      color: "rgba(103,172,169,0.35)",
      shape: "circle",
      backgroundColor: "transparent",
    });
    const w = (map as any).width;
    const h = (map as any).height;
    return {
      svgMap: svg,
      mapWidth: w,
      projectPoint: (lat: number, lng: number) => {
        const pin = map.getPin({ lat, lng });
        const scale = 400 / h;
        if (pin) {
          return {
            x: pin.x * scale,
            y: pin.y * scale,
          };
        }
        const x = (lng + 180) * ((w * scale) / 360);
        const y = (90 - lat) * (400 / 180);
        return { x, y };
      },
    };
  }, []);

  const createCurvedPath = (
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => {
    const midX = (start.x + end.x) / 2;
    const midY = Math.min(start.y, end.y) - 50;
    return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
  };

  const clampPan = (x: number, y: number, currentZoom: number) => {
    if (currentZoom <= 1.05) return { x: 0, y: 0 };
    const maxX = (currentZoom - 1) * 320;
    const maxY = (currentZoom - 1) * 160;
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  };

  const handleZoomIn = () => {
    setZoom((z) => {
      const newZoom = Math.min(z + 0.5, 6);
      setPan((p) => clampPan(p.x, p.y, newZoom));
      return newZoom;
    });
  };

  const handleZoomOut = () => {
    setZoom((z) => {
      const newZoom = Math.max(z - 0.5, 1);
      if (newZoom === 1) {
        setPan({ x: 0, y: 0 });
      } else {
        setPan((p) => clampPan(p.x, p.y, newZoom));
      }
      return newZoom;
    });
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleFocusCentralAmerica = () => {
    setZoom(3.5);
    setPan({ x: 260, y: 40 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const rawX = e.clientX - dragStart.x;
    const rawY = e.clientY - dragStart.y;
    const clamped = clampPan(rawX, rawY, zoom);
    setPan(clamped);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const rawX = e.touches[0].clientX - dragStart.x;
    const rawY = e.touches[0].clientY - dragStart.y;
    const clamped = clampPan(rawX, rawY, zoom);
    setPan(clamped);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <div 
      className="wm-dotted-container relative w-full h-full select-none overflow-hidden" 
      ref={containerRef}
    >
      <div 
        className="absolute top-3 right-3 z-30 flex flex-col gap-1.5 p-1 bg-black/60 border border-[#67ACA9]/30 backdrop-blur-md rounded"
        style={{ clipPath: "polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)" }}
      >
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-7 h-7 bg-black/50 hover:bg-[#67ACA9]/20 border border-[#67ACA9]/20 hover:border-[#69BFB7] text-[#A4C2C5] hover:text-white flex items-center justify-center transition-all cursor-pointer rounded-sm group focus:outline-none"
          title="Acercar Cámara (Zoom In)"
        >
          <ZoomIn className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
        </button>

        <button
          type="button"
          onClick={handleZoomOut}
          className="w-7 h-7 bg-black/50 hover:bg-[#67ACA9]/20 border border-[#67ACA9]/20 hover:border-[#69BFB7] text-[#A4C2C5] hover:text-white flex items-center justify-center transition-all cursor-pointer rounded-sm group focus:outline-none"
          title="Alejar Cámara (Zoom Out)"
        >
          <ZoomOut className="w-3.5 h-3.5 group-hover:scale-95 transition-transform" />
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="w-7 h-7 bg-black/50 hover:bg-[#67ACA9]/20 border border-[#67ACA9]/20 hover:border-[#69BFB7] text-[#A4C2C5] hover:text-white flex items-center justify-center transition-all cursor-pointer rounded-sm group focus:outline-none"
          title="Restaurar Satélite"
        >
          <RefreshCw className="w-3 h-3 group-hover:rotate-45 transition-transform" />
        </button>

        <div className="h-[1px] bg-[#67ACA9]/20 my-0.5" />

        <button
          type="button"
          onClick={handleFocusCentralAmerica}
          className="w-7 h-7 bg-black/50 hover:bg-[#67ACA9]/20 border border-[#67ACA9]/20 hover:border-[#69BFB7] text-[#A4C2C5] hover:text-white flex items-center justify-center transition-all cursor-pointer rounded-sm group focus:outline-none"
          title="Enfocar Campamentos (Centroamérica)"
        >
          <Compass className="w-4 h-4 animate-pulse group-hover:rotate-12 transition-transform" />
        </button>
      </div>

      <div
        className={`w-full h-full relative ${
          zoom > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
        }`}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
          transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={`data:image/svg+xml;utf8,${encodeURIComponent(svgMap)}`}
          className="wm-dotted-bg"
          alt="World map"
          draggable={false}
        />

        <svg 
          viewBox={`0 0 ${mapWidth * 4} 400`} 
          className="wm-dotted-overlay"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="100%" stopColor={lineColor} />
            </linearGradient>
          </defs>

          {dots.map((dot, i) => {
            const startPoint = projectPoint(dot.start.lat, dot.start.lng);
            const endPoint = projectPoint(dot.end.lat, dot.end.lng);
            
            const isExpedition = dot.type === "expedition" || (!dot.isBase && (dot.start.lat !== dot.end.lat || dot.start.lng !== dot.end.lng));
            if (!isExpedition) return null;

            const color = dot.status ? (STATUS_COLORS[dot.status] || lineColor) : lineColor;

            return (
              <g key={`arc-${i}`}>
                <motion.path
                  d={createCurvedPath(startPoint, endPoint)}
                  fill="none"
                  stroke={`url(#${id}-grad)`}
                  strokeWidth="1"
                  opacity="0.15"
                />
                <motion.path
                  d={createCurvedPath(startPoint, endPoint)}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.2"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.6 }}
                  transition={{ duration: 1.2, delay: 0.3 * i, ease: "easeOut" }}
                />
              </g>
            );
          })}

          {dots.map((dot, i) => {
            const startPoint = projectPoint(dot.start.lat, dot.start.lng);
            const endPoint = projectPoint(dot.end.lat, dot.end.lng);
            
            const isBase = dot.type === "camp" || !!dot.isBase;
            const isAdventure = dot.type === "adventure";
            const isExpedition = !isBase && !isAdventure;

            const color = isBase 
              ? CAMP_COLOR 
              : isAdventure 
                ? ADVENTURE_COLOR 
                : (dot.status ? (STATUS_COLORS[dot.status] || lineColor) : lineColor);

            return (
              <g key={`pins-${i}`}>
                {isExpedition && (dot.start.lat !== dot.end.lat || dot.start.lng !== dot.end.lng) && (
                  <g>
                    <circle cx={startPoint.x} cy={startPoint.y} r="2.5" fill="#69BFB7" opacity="0.9" />
                  </g>
                )}

                
                <g 
                  onClick={() => onZoneClick?.(dot)} 
                  style={{ cursor: "pointer", pointerEvents: "auto" }}
                  className="hover:opacity-80 transition-opacity"
                >
                  {isBase ? (
                    <>
                      <circle cx={endPoint.x} cy={endPoint.y} r="9.5" fill="none" stroke={color} strokeWidth="1" opacity="0.65" strokeDasharray="2 1.5" />
                      <circle cx={endPoint.x} cy={endPoint.y} r="5" fill="none" stroke={color} strokeWidth="1.5" />
                      <circle cx={endPoint.x} cy={endPoint.y} r="2.5" fill={color} />
                    </>
                  ) : isAdventure ? (
                    <>
                      <circle cx={endPoint.x} cy={endPoint.y} r="5.5" fill="none" stroke={color} strokeWidth="1" opacity="0.9" />
                      <line x1={endPoint.x - 7.5} y1={endPoint.y} x2={endPoint.x + 7.5} y2={endPoint.y} stroke={color} strokeWidth="0.5" opacity="0.5" />
                      <line x1={endPoint.x} y1={endPoint.y - 7.5} x2={endPoint.x} y2={endPoint.y + 7.5} stroke={color} strokeWidth="0.5" opacity="0.5" />
                      <circle cx={endPoint.x} cy={endPoint.y} r="1.8" fill={color} />
                    </>
                  ) : (
                    <>
                      <circle cx={endPoint.x} cy={endPoint.y} r="6" fill={color} opacity="0.2">
                        <animate attributeName="r" from="4" to="12" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
                      </circle>
                      <circle cx={endPoint.x} cy={endPoint.y} r="4" fill={color} />
                    </>
                  )}
                </g>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
