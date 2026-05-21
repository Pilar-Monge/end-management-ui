// @ts-nocheck
import { useMemo, useId } from "react";
import DottedMap from "dotted-map";
import { motion } from "framer-motion";

interface Point {
  lat: number;
  lng: number;
  label?: string;
}

interface Dot {
  start: Point;
  end: Point;
  status?: string;
}

interface WorldMapProps {
  dots?: Dot[];
  lineColor?: string;
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

export function WorldMap({ dots = [], lineColor = "#69BFB7", onZoneClick }: WorldMapProps) {
  const id = useId();

  const svgMap = useMemo(() => {
    const map = new DottedMap({ height: 100, grid: "diagonal" });
    return map.getSVG({
      radius: 0.22,
      color: "rgba(103,172,169,0.35)",
      shape: "circle",
      backgroundColor: "transparent",
    });
  }, []);

  const projectPoint = (lat: number, lng: number) => {
    const x = (lng + 180) * (800 / 360);
    const y = (90 - lat) * (400 / 180);
    return { x, y };
  };

  const createCurvedPath = (
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => {
    const midX = (start.x + end.x) / 2;
    const midY = Math.min(start.y, end.y) - 50;
    return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
  };

  return (
    <div className="wm-dotted-container">
      {/* Mapa de fondo en puntos */}
      <img
        src={`data:image/svg+xml;utf8,${encodeURIComponent(svgMap)}`}
        className="wm-dotted-bg"
        alt="World map"
        draggable={false}
      />

      {/* SVG con arcos y pins — preserveAspectRatio asegura que coincida con el img object-fit: contain */}
      <svg 
        viewBox="0 0 800 400" 
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
          const color = dot.status ? (STATUS_COLORS[dot.status] || lineColor) : lineColor;

          return (
            <g key={`arc-${i}`}>
              {/* Línea curved de fondo */}
              <motion.path
                d={createCurvedPath(startPoint, endPoint)}
                fill="none"
                stroke={`url(#${id}-grad)`}
                strokeWidth="1"
                opacity="0.15"
              />
              {/* Línea curved animada */}
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

        {/* Puntos de inicio y fin */}
        {dots.map((dot, i) => {
          const startPoint = projectPoint(dot.start.lat, dot.start.lng);
          const endPoint = projectPoint(dot.end.lat, dot.end.lng);
          const color = dot.status ? (STATUS_COLORS[dot.status] || lineColor) : lineColor;

          return (
            <g key={`pins-${i}`}>
              {/* Start pin */}
              <g>
                <circle cx={startPoint.x} cy={startPoint.y} r="3" fill={color} opacity="0.9">
                  <animate attributeName="r" from="3" to="9" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx={startPoint.x} cy={startPoint.y} r="3" fill={color} />
                {dot.start.label && (
                  <text x={startPoint.x} y={startPoint.y - 8} textAnchor="middle" fill="rgba(164,194,197,0.8)" fontSize="7" fontWeight="700">
                    {dot.start.label}
                  </text>
                )}
              </g>

              {/* End pin */}
              <g 
                onClick={() => onZoneClick?.(dot)} 
                style={{ cursor: "pointer" }}
                className="hover:opacity-80 transition-opacity"
              >
                <circle cx={endPoint.x} cy={endPoint.y} r="6" fill={color} opacity="0.2">
                  <animate attributeName="r" from="4" to="12" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx={endPoint.x} cy={endPoint.y} r="4" fill={color} />
                {dot.end.label && (
                  <text x={endPoint.x} y={endPoint.y - 10} textAnchor="middle" fill="rgba(164,194,197,0.9)" fontSize="8" fontWeight="800">
                    {dot.end.label}
                  </text>
                )}
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
