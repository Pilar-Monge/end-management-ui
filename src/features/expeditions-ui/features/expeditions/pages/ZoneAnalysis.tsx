import { useState, useEffect } from "react";
import { WorldMap } from "../../../components/WorldMap";
import { Btn } from "../components/SharedLayout";
import { Info } from "lucide-react";
import { SurvivalApiService, getActiveCamp, getFallbackActiveCamp } from "../utils/backendConfig";
import type { APIExpedition } from "../utils/backendConfig";

// Respaldo de expediciones locales con la distribución geográfica en países de la región (mundializado para campamentos reales)
const DEFAULT_LOCAL_EXPEDITIONS: APIExpedition[] = [
  {
    id: 1,
    name: "Incursión Yellowstone",
    team: "Equipo Alfa",
    status: "IN_PROGRESS",
    time: "02:16",
    start: { lat: 39.8283, lng: -98.5795, label: "Alpha Bunker" },
    end: { lat: 44.4280, lng: -110.5885, label: "Parque Yellowstone (USA)" },
    danger: "Medio",
    climate: "Húmedo templado",
    resources: ["Agua Mineral", "Madera pesada", "Plantas curativas"],
    desc: "Reconocimiento y recolección botánica en el borde intermedio de las cuencas geotérmicas de Yellowstone.",
  },
  {
    id: 2,
    name: "Operación Humahuaca",
    team: "Equipo Beta",
    status: "PLANNED",
    time: "—",
    start: { lat: -34.6037, lng: -58.3816, label: "Delta Refuge" },
    end: { lat: -23.5855, lng: -65.3524, label: "Quebrada de Humahuaca (AR)" },
    danger: "Alto",
    climate: "Seco y Ventoso",
    resources: ["Minerales raros", "Suelos de cuarzo", "Refugios naturales"],
    desc: "Análisis geológico de formaciones sedimentarias en la Quebrada para identificar depósitos minerales.",
  },
  {
    id: 3,
    name: "Reconocimiento Selva Negra",
    team: "Equipo Gamma",
    status: "DELAYED",
    time: "05:20",
    start: { lat: 52.52, lng: 13.405, label: "Sierra Base" },
    end: { lat: 48.0167, lng: 8.25, label: "Selva Negra (DE)" },
    danger: "Alto",
    climate: "Frío y Neblina",
    resources: ["Madera noble", "Resinas estables", "Frutas silvestres"],
    desc: "Incursión táctica en busca de recursos madereros y resinas curativas bajo cobertura forestal densa.",
  },
  {
    id: 4,
    name: "Ruta Monte Rainier",
    team: "Equipo Delta",
    status: "COMPLETED",
    time: "00:00",
    start: { lat: 39.8283, lng: -98.5795, label: "Alpha Bunker" },
    end: { lat: 46.8523, lng: -121.7603, label: "Monte Rainier (USA)" },
    danger: "Muy alto",
    climate: "Frío Extremo",
    resources: ["Nieve pura", "Suelos de cuarzo", "Resinas"],
    desc: "Establecimiento de una antena repetidora satelital y recolección de muestras de agua glacial.",
  },
  {
    id: 5,
    name: "Mapeo del Kalahari",
    team: "Equipo Épsilon",
    status: "IN_PROGRESS",
    time: "01:45",
    start: { lat: -22.5621, lng: 17.0658, label: "Echo Outpost" },
    end: { lat: -24.0, lng: 21.0, label: "Desierto del Kalahari (Namibia)" },
    danger: "Extremo",
    climate: "Seco árido",
    resources: ["Muestras volcánicas", "Flora endémica desertificadora"],
    desc: "Mapeo térmico y búsqueda de depósitos subterráneos de humedad y fauna adaptada al ambiente hostil.",
  },
  {
    id: 6,
    name: "Aventura Okavango",
    team: "Equipo Zeta",
    status: "LOST",
    time: "—",
    start: { lat: -22.5621, lng: 17.0658, label: "Echo Outpost" },
    end: { lat: -19.0, lng: 23.0, label: "Delta del Okavango" },
    danger: "Muy alto",
    climate: "Zonas pantanosas",
    resources: ["Herramientas", "Combustible de aviación"],
    desc: "Última señal registrada del equipo de rescate táctico en las inmediaciones del pantano deltaico.",
  }
];

// Los 5 Campamentos Base Estables (Distribuidos tácticamente por la región)
const TACTICAL_BASE_CAMPS = [
  { id: "camp_alfa", name: "Alpha Bunker", lat: 39.8283, lng: -98.5795, label: "⬡ Alpha Bunker [USA]" },
  { id: "camp_norte", name: "Sierra Base", lat: 52.52, lng: 13.405, label: "⬡ Sierra Base [Berlín]" },
  { id: "camp_sur", name: "Delta Refuge", lat: -34.6037, lng: -58.3816, label: "⬡ Delta Refuge [Buenos Aires]" },
  { id: "camp_este", name: "Omega Fortress", lat: 35.6762, lng: 139.6503, label: "⬡ Omega Fortress [Tokio]" },
  { id: "camp_oeste", name: "Echo Outpost", lat: -22.5621, lng: 17.0658, label: "⬡ Echo Outpost [Namibia]" }
];

// Listado de las Zonas de Aventuras disponibles por campamento (coincide con AdventuresView)
const ALL_ADVENTURE_SPOTS = [
  // USA / camp_alfa
  {
    id: 101,
    parentCampId: "camp_alfa",
    campName: "Alpha Bunker",
    name: "Alaska Range",
    type: "Exploración",
    risk: "Medio",
    resources: ["Agua mineral pura glaciaria", "Madera pesada resistente", "Hierbas de tundra"],
    distance: "4200 km",
    lat: 63.07,
    lng: -151.00,
    climate: "Frío Subártico",
    desc: "Cadena montañosa extrema con altos picos congelados y amplias llanuras baldías de hielo profundo."
  },
  {
    id: 102,
    parentCampId: "camp_alfa",
    campName: "Alpha Bunker",
    name: "Pantano Everglades (Florida)",
    type: "Reconocimiento",
    risk: "Alto",
    resources: ["Agua filtrada estancada", "Fibras de manglar", "Caparazones orgánicos"],
    distance: "2200 km",
    lat: 25.28,
    lng: -80.89,
    climate: "Cálido Húmedo",
    desc: "Humedal subtropical inmenso con canales sinuosos infestados de manglares y nidos de fauna radiactiva."
  },
  {
    id: 103,
    parentCampId: "camp_alfa",
    campName: "Alpha Bunker",
    name: "Cañón del Colorado (Arizona)",
    type: "Recuperación de recursos",
    risk: "Muy alto",
    resources: ["Minerales expuestos", "Silicato puro", "Refugios rocosos"],
    distance: "1800 km",
    lat: 36.05,
    lng: -112.14,
    climate: "Cálido Desértico",
    desc: "Majestuoso corte abisal geológico apto para obtención de minerales radioactivos expuestos y puntos de visualización táctica."
  },
  {
    id: 104,
    parentCampId: "camp_alfa",
    campName: "Alpha Bunker",
    name: "Ciudad en Ruinas de Detroit",
    type: "Búsqueda de agua",
    risk: "Medio",
    resources: ["Metales pesados", "Baterías industriales", "Herramientas tácticas"],
    distance: "1100 km",
    lat: 42.33,
    lng: -83.04,
    climate: "Templado Urbano",
    desc: "Antiguo polo industrial colapsado. Escombreras de metal utilizable y almacenes abandonados con tecnología residual."
  },

  // Alemania / camp_norte
  {
    id: 201,
    parentCampId: "camp_norte",
    campName: "Sierra Base",
    name: "Islas Feroe (Atlántico Norte)",
    type: "Exploración",
    risk: "Alto",
    resources: ["Agua pura de lluvia", "Combustible marino de pesca", "Pescado costero"],
    distance: "2600 km",
    lat: 62.00,
    lng: -6.79,
    climate: "Frío Marítimo",
    desc: "Archipiélago rocoso azotado por viento atlántico. Posee colonias de fauna silvestre costera y depósitos térmicos volcánicos remotos."
  },
  {
    id: 202,
    parentCampId: "camp_norte",
    campName: "Sierra Base",
    name: "Montañas del Cáucaso (Georgia)",
    type: "Búsqueda de agua",
    risk: "Bajo",
    resources: ["Agua pura glaciar", "Cuarcita", "Refugios de piedra"],
    distance: "3000 km",
    lat: 42.35,
    lng: 43.50,
    climate: "Alta montaña",
    desc: "Imponente cordillera montañosa. Altamente estratificada con manantiales y glaciares puros de agua bebible."
  },
  {
    id: 203,
    parentCampId: "camp_norte",
    campName: "Sierra Base",
    name: "Lofoten (Noruega ártica)",
    type: "Reconocimiento",
    risk: "Muy alto",
    resources: ["Energía motriz marina", "Silicato fundido", "Metales de barcos"],
    distance: "1700 km",
    lat: 68.13,
    lng: 13.57,
    climate: "Ártico húmedo",
    desc: "Fiordos rocosos espectaculares rindiendo energía marina constante. Ideal para estaciones meteorológicas de gran alcance."
  },
  {
    id: 204,
    parentCampId: "camp_norte",
    campName: "Sierra Base",
    name: "Capadocia (Turquía)",
    type: "Recuperación de recursos",
    risk: "Alto",
    resources: ["Complejos de cuevas", "Herramientas de minado", "Resinas curativas"],
    distance: "2600 km",
    lat: 38.64,
    lng: 34.83,
    climate: "Continental semiárido",
    desc: "Valles de formaciones geológicas de toba donde persisten complejos subterráneos idóneos para recuperación de medicinas y herramientas."
  },

  // Argentina / camp_sur
  {
    id: 301,
    parentCampId: "camp_sur",
    campName: "Delta Refuge",
    name: "Desierto de Atacama (Chile)",
    type: "Exploración",
    risk: "Alto",
    resources: ["Litio puro", "Sales raras", "Cobre de minas"],
    distance: "2000 km",
    lat: -23.86,
    lng: -69.82,
    climate: "Hiperárido frío",
    desc: "El desierto más seco del mundo. Formaciones Salinas y depósitos raros de litio y minerales espaciales."
  },
  {
    id: 302,
    parentCampId: "camp_sur",
    campName: "Delta Refuge",
    name: "Pantanal (Brasil)",
    type: "Recuperación de recursos",
    risk: "Muy alto",
    resources: ["Kits médicos", "Agua dulce silvestre", "Madera noble"],
    distance: "2000 km",
    lat: -17.00,
    lng: -57.50,
    climate: "Húmedo Tropical",
    desc: "Ecosistema inundable gigante. Enorme cobertura biogénica con agua abundante pero peligrosa sedimentación arcillosa."
  },
  {
    id: 303,
    parentCampId: "camp_sur",
    campName: "Delta Refuge",
    name: "Patagonia extrema (Tierra del Fuego)",
    type: "Reconocimiento",
    risk: "Medio",
    resources: ["Madera de lenga", "Turberas ricas", "Pescado andino"],
    distance: "2500 km",
    lat: -54.80,
    lng: -68.30,
    climate: "Subantártico frío",
    desc: "Fin del continente. Bosques de lenga azotados por temporales continuos, con alta visibilidad y geografía para antenas de radio."
  },
  {
    id: 304,
    parentCampId: "camp_sur",
    campName: "Delta Refuge",
    name: "Salar de Uyuni (Bolivia)",
    type: "Estudio climático",
    risk: "Bajo",
    resources: ["Sal refinada en salares", "Depósitos de litio alcalino", "Cuarcita de altura"],
    distance: "2200 km",
    lat: -20.13,
    lng: -67.49,
    climate: "Árido frío",
    desc: "Salar masivo a gran altura. Ideal para estudios electromagnéticos atmosféricos y recolección de sal refinada."
  },

  // Japón / camp_este
  {
    id: 401,
    parentCampId: "camp_este",
    campName: "Omega Fortress",
    name: "Siberia (Lago Baikal)",
    type: "Recuperación de recursos",
    risk: "Medio",
    resources: ["Agua pura pura bajo hielo", "Armamento militar sellado", "Combustibles pesados"],
    distance: "4500 km",
    lat: 53.50,
    lng: 108.17,
    climate: "Frío Siberiano",
    desc: "El lago más antiguo y profundo del planeta. Agua pura pura bajo espesas capas congeladas con contenedores militares sumergidos."
  },
  {
    id: 402,
    parentCampId: "camp_este",
    campName: "Omega Fortress",
    name: "Filipinas (Isla Mindanao)",
    type: "Búsqueda de comida",
    risk: "Bajo",
    resources: ["Nutrientes tropicales", "Coco silvestre", "Madera de bambú"],
    distance: "3100 km",
    lat: 7.07,
    lng: 125.61,
    climate: "Ecuatorial húmedo",
    desc: "Selva densa costera. Gran abundancia de alimentos tropicales silvestres, coco, frutos y raíces comestibles."
  },
  {
    id: 403,
    parentCampId: "camp_este",
    campName: "Omega Fortress",
    name: "Mongolia (Desierto Gobi)",
    type: "Reconocimiento",
    risk: "Extremo",
    resources: ["Cristales de sílice limpia", "Cobre nativo", "Refugios de estepa"],
    distance: "3000 km",
    lat: 43.60,
    lng: 103.00,
    climate: "Continental desértico",
    desc: "Vasto páramo expuesto a vientos feroces. Sin cobertura masiva, ideal para monitoreo táctico de satélites y anomalías electromagnéticas."
  },
  {
    id: 404,
    parentCampId: "camp_este",
    campName: "Omega Fortress",
    name: "Indonesia (Krakatoa)",
    type: "Exploración",
    risk: "Muy alto",
    resources: ["Lava rica en azufre", "Lodo alcalino", "Artefactos geotérmicos"],
    distance: "5300 km",
    lat: -6.10,
    lng: 105.42,
    climate: "Tropical volcánico",
    desc: "Isla volcánica activa histórica. Contiene conductos de lava rica en minerales pesados, reliquias geotérmicas y lodo alcalino sulfuroso."
  },

  // Namibia / camp_oeste
  {
    id: 501,
    parentCampId: "camp_oeste",
    campName: "Echo Outpost",
    name: "Congo (Selva del Ituri)",
    type: "Exploración",
    risk: "Extremo",
    resources: ["Resinas biológicas", "Madera densa de dosel", "Flora medicinal silvestre"],
    distance: "3800 km",
    lat: 1.67,
    lng: 28.83,
    climate: "Selva ecuatorial",
    desc: "Bosque tropical denso y lluvioso. Rico en compuestos de resinas biológicas y maderas de alta resistencia."
  },
  {
    id: 502,
    parentCampId: "camp_oeste",
    campName: "Echo Outpost",
    name: "Etiopía (Danakil Depression)",
    type: "Reconocimiento",
    risk: "Medio",
    resources: ["Azufre puro crudo", "Pistas térmicas", "Sal de boro mineral"],
    distance: "4700 km",
    lat: 14.24,
    lng: 40.30,
    climate: "Cálido extremo",
    desc: "El lugar más caliente de la Tierra con fuentes hidrotermales ácidas multicolores llenas de depósitos de azufre y sales potásicas."
  },
  {
    id: 503,
    parentCampId: "camp_oeste",
    campName: "Echo Outpost",
    name: "Madagascar (Bosque Tsiny)",
    type: "Búsqueda de energía",
    risk: "Alto",
    resources: ["Conductores de cuarzo", "Depósitos de litio residual", "Energía solar de repisa"],
    distance: "4200 km",
    lat: -18.90,
    lng: 44.60,
    climate: "Semiárido de aguja",
    desc: "Laberinto de piedra caliza afilada impenetrable. Excelente potencial solar elevado con depósitos fósiles cristalizados y litio residual."
  },
  {
    id: 504,
    parentCampId: "camp_oeste",
    campName: "Echo Outpost",
    name: "Tanzania (Kilimanjaro)",
    type: "Recuperación de recursos",
    risk: "Muy alto",
    resources: ["Almacenes médicos de ONU", "Combustible de aviación reserva", "Agua pura derretida"],
    distance: "3600 km",
    lat: -3.07,
    lng: 37.35,
    climate: "Glaciar de Sabana",
    desc: "Macizo aislado masivo coronado de nieves eternas. Contiene antiguos almacenes médicos de la ONU y combustibles de reserva."
  }
];

const STATUS_ICON: Record<string, { icon: string; color: string; label: string }> = {
  IN_PROGRESS: { icon: "►", color: "#69BFB7", label: "En Progreso" },
  PLANNED: { icon: "◆", color: "#67ACA9", label: "Planeada" },
  DELAYED: { icon: "▲", color: "#f59e0b", label: "Retrasada" },
  COMPLETED: { icon: "✓", color: "#4ade80", label: "Completada" },
  LOST: { icon: "✕", color: "#ef4444", label: "Perdida" },
  ADVENTURE: { icon: "◎", color: "#FFA000", label: "Aventura Cercana" },
  CAMP: { icon: "⬡", color: "#69BFB7", label: "Campamento Estable" }
};

interface ZoneAnalysisProps {
  onNavigate?: (sub: string, id?: number) => void;
  activeCampId?: number;
}

export function ZoneAnalysis({ onNavigate, activeCampId = 1 }: ZoneAnalysisProps) {
  const [activeCamp, setActiveCamp] = useState(() => getFallbackActiveCamp(activeCampId));
  const [expeditions, setExpeditions] = useState<APIExpedition[]>([]);
  const [selectedZone, setSelectedZone] = useState<any | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [loading, setLoading] = useState(false);

  // Cargar expediciones del API (Con respaldo local dinámico)
  useEffect(() => {
    let isMounted = true;
    const fallbackCamp = getFallbackActiveCamp(activeCampId);

    async function loadData() {
      setLoading(true);
      setSelectedZone(null);
      setActiveCamp(fallbackCamp);
      try {
        const resolvedCamp = await getActiveCamp(activeCampId);
        if (!isMounted) return;
        const campForView = resolvedCamp.campId === activeCampId ? resolvedCamp : fallbackCamp;
        setActiveCamp(campForView);
        const loaded = await SurvivalApiService.getExpeditions(DEFAULT_LOCAL_EXPEDITIONS);
        const mapped = loaded.map(e => ({
          ...e,
          start: { lat: campForView.lat, lng: campForView.lng, label: campForView.campName }
        }));
        if (isMounted) {
          setExpeditions(mapped);
        }
      } catch (err) {
        console.error("Error loading expeditions:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [activeCampId]);

  const activeAdventures = ALL_ADVENTURE_SPOTS.filter(a => {
    const campMap: Record<string, number> = {
      "camp_alfa": 1, "camp_norte": 2, "camp_sur": 3, "camp_este": 4, "camp_oeste": 5
    };
    return campMap[a.parentCampId] === activeCamp.campId;
  });

  // Formatear coordenadas y arcos para el WorldMap
  const mapDots = [
    // 1. Las expediciones activas
    ...expeditions.map((e) => ({
      start: { lat: activeCamp.lat, lng: activeCamp.lng, label: activeCamp.campName },
      end: e.end,
      status: e.status,
      type: "expedition" as const,
    })),
    // 2. Integrar las 5 ubicaciones exclusivas para bases estables
    ...TACTICAL_BASE_CAMPS.map((camp) => ({
      start: { lat: camp.lat, lng: camp.lng },
      end: { lat: camp.lat, lng: camp.lng, label: camp.label },
      status: "CAMP",
      isBase: true,
      type: "camp" as const,
    })),
    // 3. Integrar los puntos de aventuras (los cuales se detallarán al ser seleccionados)
    ...activeAdventures.map((adv) => ({
      start: { lat: adv.lat, lng: adv.lng },
      end: { lat: adv.lat, lng: adv.lng, label: adv.name },
      status: "ADVENTURE",
      type: "adventure" as const,
    })),
  ];

  // Cálculo rápido de estadísticas para el HUD Lateral
  const counts = {
    IN_PROGRESS: expeditions.filter(e => e.status === "IN_PROGRESS").length,
    PLANNED: expeditions.filter(e => e.status === "PLANNED").length,
    DELAYED: expeditions.filter(e => e.status === "DELAYED").length,
    COMPLETED: expeditions.filter(e => e.status === "COMPLETED").length,
    LOST: expeditions.filter(e => e.status === "LOST").length,
  };

  return (
    <div className="wm-layout">
      {/* ── MAPA SATELITAL CON ZOOM Y PAN ── */}
      <div className="wm-map-area relative overflow-hidden">
        
        <WorldMap 
          dots={mapDots} 
          lineColor="#69BFB7" 
          onZoneClick={(dot) => {
            // 1. Verificar si hicieron click en un punto de aventuras
            const matchedAdv = activeAdventures.find(
              (adv) => Math.abs(adv.lat - dot.end.lat) < 0.015 && Math.abs(adv.lng - dot.end.lng) < 0.015
            );
            if (matchedAdv) {
              setSelectedZone({
                id: matchedAdv.id,
                name: matchedAdv.name,
                team: "Sin exploración activa",
                status: "ADVENTURE",
                time: matchedAdv.distance,
                start: { lat: matchedAdv.lat, lng: matchedAdv.lng },
                end: { lat: matchedAdv.lat, lng: matchedAdv.lng },
                danger: matchedAdv.risk,
                climate: matchedAdv.climate,
                resources: matchedAdv.resources,
                desc: matchedAdv.desc,
                isAdventure: true,
                parentCampName: matchedAdv.campName,
              });
              return;
            }

            // 2. Emparejar el punto clicked con alguna expedición activa en curso
            const zone = expeditions.find(e => Math.abs(e.end.lat - dot.end.lat) < 0.015 && Math.abs(e.end.lng - dot.end.lng) < 0.015);
            if (zone) {
              setSelectedZone({
                ...zone,
                start: { lat: activeCamp.lat, lng: activeCamp.lng, label: activeCamp.campName }
              });
              return;
            }

            // 3. O bien con un campamento base táctico estable
            const camp = TACTICAL_BASE_CAMPS.find(c => Math.abs(c.lat - dot.end.lat) < 0.015 && Math.abs(c.lng - dot.end.lng) < 0.015);
            if (camp) {
              setSelectedZone({
                id: 9991,
                name: camp.name,
                team: "Soporte Permanente",
                status: "CAMP",
                time: "OPERATIVO",
                start: camp,
                end: camp,
                danger: "Bajo (Zona de Paz)",
                climate: "Estabilizado térmicamente",
                resources: ["Potencia Eléctrica", "Soporte Técnico Especializado", "Comando Central"],
                desc: "Este es uno de los 5 Campamentos Base establecidos en la región de Centro y Sudamérica. Funciona como cuartel de relevo, reabastecimiento logístico y centro de mando para lanzar expediciones terrestres.",
                isBase: true,
                statusLabel: "Campamento Base Estable"
              });
            }
          }} 
        />
        
        {/* Leyenda interactiva tipo Popover */}
        <div className="absolute bottom-2 left-2 z-10 flex flex-col items-start select-none">
          {showLegend && (
            <div className="mb-2 bg-[#040e0e]/95 border border-[#67ACA9]/40 p-2.5 shadow-lg backdrop-blur-md flex flex-col gap-1.5 min-w-[130px]" style={{ clipPath: "polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)" }}>
              <h4 className="text-[9px] uppercase font-bold text-[#69BFB7] tracking-wider border-b border-[#67ACA9]/20 pb-1 mb-0.5">
                Leyenda de Mapa
              </h4>
              <div className="flex items-center gap-2 text-[10px] text-[#A4C2C5] font-semibold uppercase">
                <span className="text-[#69BFB7] font-black">⬡</span>
                <span className="tracking-wide text-[9px]">Base Camp (Estable)</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#A4C2C5] font-semibold uppercase">
                <span className="text-[#FFA000] font-black">◎</span>
                <span className="tracking-wide text-[9px]">Aventura (Por explorar)</span>
              </div>
              <div className="h-[1px] bg-[#67ACA9]/20 my-0.5" />
              {Object.entries(STATUS_ICON)
                .filter(([k]) => k !== "ADVENTURE" && k !== "CAMP")
                .map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 text-[10px] text-[#A4C2C5] font-semibold uppercase">
                    <span style={{ color: val.color, fontSize: 10 }}>{val.icon}</span>
                    <span className="tracking-wide text-[9px]">{val.label}</span>
                  </div>
                ))}
            </div>
          )}
          <button
            type="button"
            className="w-7 h-7 bg-black/60 border border-[#67ACA9]/30 hover:border-[#69BFB7] hover:bg-[#67ACA9]/10 text-[#A4C2C5] hover:text-[#f0fafa] flex items-center justify-center transition-all cursor-pointer shadow-md focus:outline-none"
            style={{ clipPath: "polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)" }}
            onClick={() => setShowLegend(!showLegend)}
            title="Mostrar Leyenda"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── PANEL LATERAL TÁCTICO ── */}
      <div className="wm-sidebar">
        {selectedZone ? (
          <div className="tactical-zone-panel animate-fade-in">
            <div className="tactical-zone-header">
              <div>
                <span className="font-mono text-[7.5px] uppercase tracking-widest text-[#69BFB7]/80 block">
                  {selectedZone.isBase ? "CAMPAMENTO REGIONAL PRINCIPAL" : selectedZone.isAdventure ? "ZONA DE AVENTURA DISPONIBLE" : "SECTOR DE EXPEDICIÓN CONTRATADA"}
                </span>
                <h3 className="tactical-zone-title">{selectedZone.name}</h3>
                <span className="tactical-zone-status" style={{ color: STATUS_ICON[selectedZone.status]?.color || "#A4C2C5" }}>
                  {STATUS_ICON[selectedZone.status]?.label || selectedZone.statusLabel || "Activa para Exploración"}
                </span>
              </div>
              <button className="tactical-close-btn animate-pulse" onClick={() => setSelectedZone(null)}>✕</button>
            </div>
            
            <p className="tactical-zone-desc">{selectedZone.desc}</p>

            <div className="tactical-stats-grid">
              <div className="tactical-stat"><span>Peligro</span><strong className={selectedZone.danger === "Alto" || selectedZone.danger === "Muy alto" || selectedZone.danger === "Extremo" ? "text-red-400" : "text-emerald-400"}>{selectedZone.danger}</strong></div>
              <div className="tactical-stat"><span>Clima</span><strong>{selectedZone.climate}</strong></div>
              <div className="tactical-stat"><span>{selectedZone.isAdventure ? "Base Origen" : "Equipo"}</span><strong>{selectedZone.isAdventure ? selectedZone.parentCampName : selectedZone.team}</strong></div>
              <div className="tactical-stat"><span>{selectedZone.isAdventure ? "Distancia" : "Tiempo"}</span><strong>{selectedZone.time}</strong></div>
            </div>

            <div className="tactical-resources">
              <h4 className="tactical-subtitle">{selectedZone.isBase ? "Servicios Críticos de Soporte" : "Materiales / Recursos de Zona"}</h4>
              <div className="tactical-resource-cards font-mono">
                {selectedZone.resources.map((r: string) => (
                  <div key={r} className="tactical-resource-card">
                    <span className="tactical-resource-icon" style={{ color: selectedZone.isAdventure ? "#FFA000" : undefined }}>◆</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="tactical-actions mt-6 flex flex-col gap-2">
              {selectedZone.isAdventure ? (
                <Btn variant="primary" style={{ width: '100%' }} onClick={() => onNavigate?.("Crear Expedición")}>
                  Iniciar Expedición en esta Zona
                </Btn>
              ) : selectedZone.id !== 9991 ? (
                <Btn variant="ghost" style={{ width: '100%' }} onClick={() => onNavigate?.("Detalles de Expedición", selectedZone.id)}>
                  Ver Detalles
                </Btn>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-2 opacity-80">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#69BFB7]">
                CAMPAMENTO ACTIVO: {activeCamp.campName}
              </span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="wm-sidebar-title">Expediciones</h3>
              {loading && <span className="animate-pulse text-[9px] font-mono text-[#69BFB7]">SINC_SATELLITE...</span>}
            </div>
            
            {loading ? (
              <div className="p-4 bg-black/25 text-center text-xs text-[#A4C2C5]/50 italic">
                Sincronizando expediciones reales del campamento...
              </div>
            ) : expeditions.length === 0 ? (
              <div className="p-4 bg-black/25 text-center text-xs text-[#A4C2C5]/50 italic">
                No hay expediciones configuradas en el sector.
              </div>
            ) : (
              <div className="wm-exp-list">
                {expeditions.map((e) => {
                  const info = STATUS_ICON[e.status] || STATUS_ICON.PLANNED;
                  return (
                    <div key={e.id} className="wm-exp-card" onClick={() => setSelectedZone(e)} style={{ cursor: 'pointer' }}>
                      <div className="wm-exp-icon" style={{ borderColor: info.color, color: info.color }}>
                        {info.icon}
                      </div>
                      <div className="wm-exp-info">
                        <span className="wm-exp-name">{e.name}</span>
                        <span className="wm-exp-team">{e.team}</span>
                      </div>
                      <div className="wm-exp-time" style={{ color: e.status === "DELAYED" ? "#f59e0b" : e.status === "LOST" ? "#ef4444" : "#A4C2C5" }}>
                        {e.time}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <h3 className="wm-sidebar-title" style={{ marginTop: 16 }}>Resumen de Campaña</h3>
            <div className="wm-stats">
              <div className="wm-stat-row">
                <span>En Progreso</span>
                <span className="wm-stat-val" style={{ color: "#69BFB7" }}>{counts.IN_PROGRESS}</span>
              </div>
              <div className="wm-stat-row">
                <span>Planeadas</span>
                <span className="wm-stat-val" style={{ color: "#67ACA9" }}>{counts.PLANNED}</span>
              </div>
              <div className="wm-stat-row">
                <span>Retrasadas</span>
                <span className="wm-stat-val" style={{ color: "#f59e0b" }}>{counts.DELAYED}</span>
              </div>
              <div className="wm-stat-row">
                <span>Completadas</span>
                <span className="wm-stat-val" style={{ color: "#4ade80" }}>{counts.COMPLETED}</span>
              </div>
              <div className="wm-stat-row">
                <span>Perdidas</span>
                <span className="wm-stat-val" style={{ color: "#ef4444" }}>{counts.LOST}</span>
              </div>
              <div className="wm-stat-row">
                <span>Bases de Operaciones</span>
                <span className="wm-stat-val text-amber-300">5 Activas</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
