import { useState, useEffect } from "react";
import { Btn, MissionShell, MissionStack } from "../components/SharedLayout";
import { ChevronLeft, ChevronRight, AlertTriangle, MapPin, Navigation } from "lucide-react";

const ADVENTURE_CAMPS = [
  { id: "camp_alfa", name: "Alpha Bunker", label: "USA (Centro)" },
  { id: "camp_norte", name: "Sierra Base", label: "Berlín (Europa)" },
  { id: "camp_sur", name: "Delta Refuge", label: "Buenos Aires (Ar.)" },
  { id: "camp_este", name: "Omega Fortress", label: "Tokio (Japón)" },
  { id: "camp_oeste", name: "Echo Outpost", label: "Namibia (África)" }
];

const CAMP_ADVENTURES: Record<string, Array<{
  id: number;
  name: string;
  type: string;
  risk: string;
  resources: string;
  distance: string;
  camp: string;
  status: string;
  img: string;
}>> = {
  camp_alfa: [
    {
      id: 101,
      name: "Alaska Range",
      type: "Exploración",
      risk: "Medio",
      resources: "Agua mineral pura glaciaria, Madera pesada resistente, hierbas de tundra",
      distance: "4200 km",
      camp: "Alpha Bunker (USA)",
      status: "Disponible",
      img: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: 102,
      name: "Pantano Everglades (Florida)",
      type: "Reconocimiento",
      risk: "Alto",
      resources: "Agua filtrada estancada, fibras de manglar, caparazones orgánicos",
      distance: "2200 km",
      camp: "Alpha Bunker (USA)",
      status: "Disponible",
      img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: 103,
      name: "Cañón del Colorado (Arizona)",
      type: "Recuperación de recursos",
      risk: "Muy alto",
      resources: "Minerales expuestos, silicato puro, refugios rocosos",
      distance: "1800 km",
      camp: "Alpha Bunker (USA)",
      status: "Restringido",
      img: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: 104,
      name: "Ciudad en Ruinas de Detroit",
      type: "Búsqueda de agua",
      risk: "Medio",
      resources: "Metales pesados, baterías industriales, herramientas tácticas",
      distance: "1100 km",
      camp: "Alpha Bunker (USA)",
      status: "Disponible",
      img: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80"
    }
  ],
  camp_norte: [
    {
      id: 201,
      name: "Islas Feroe (Atlántico Norte)",
      type: "Exploración",
      risk: "Alto",
      resources: "Agua pura de lluvia, Combustible marino de pesca, pescado costero",
      distance: "2600 km",
      camp: "Sierra Base (Berlín)",
      status: "Disponible",
      img: "https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: 202,
      name: "Montañas del Cáucaso (Georgia)",
      type: "Búsqueda de agua",
      risk: "Bajo",
      resources: "Agua pura glaciar, Cuarcita, refugios de piedra",
      distance: "3000 km",
      camp: "Sierra Base (Berlín)",
      status: "Disponible",
      img: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: 203,
      name: "Lofoten (Noruega ártica)",
      type: "Reconocimiento",
      risk: "Muy alto",
      resources: "Energía motriz marina, silicato fundido, metales de barcos",
      distance: "1700 km",
      camp: "Sierra Base (Berlín)",
      status: "Restringido",
      img: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: 204,
      name: "Capadocia (Turquía)",
      type: "Recuperación de recursos",
      risk: "Alto",
      resources: "Complejos de cuevas, herramientas de minado, resinas curativas",
      distance: "2600 km",
      camp: "Sierra Base (Berlín)",
      status: "Disponible",
      img: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=600&q=80"
    }
  ],
  camp_sur: [
    {
      id: 301,
      name: "Desierto de Atacama (Chile)",
      type: "Exploración",
      risk: "Alto",
      resources: "Litio puro, Sales raras, Cobre de minas",
      distance: "2000 km",
      camp: "Delta Refuge (Buenos Aires)",
      status: "Disponible",
      img: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: 302,
      name: "Pantanal (Brasil)",
      type: "Recuperación de recursos",
      risk: "Muy alto",
      resources: "Kits médicos, Agua dulce silvestre, Madera noble",
      distance: "2000 km",
      camp: "Delta Refuge (Buenos Aires)",
      status: "Restringido",
      img: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: 303,
      name: "Patagonia extrema (Tierra del Fuego)",
      type: "Reconocimiento",
      risk: "Medio",
      resources: "Madera de lenga, Turberas ricas, Pescado andino",
      distance: "2500 km",
      camp: "Delta Refuge (Buenos Aires)",
      status: "Disponible",
      img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: 304,
      name: "Salar de Uyuni (Bolivia)",
      type: "Estudio climático",
      risk: "Bajo",
      resources: "Sal refinada en salares, depósitos de litio alcalino, cuarcita de altura",
      distance: "2200 km",
      camp: "Delta Refuge (Buenos Aires)",
      status: "Disponible",
      img: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80"
    }
  ],
  camp_este: [
    {
      id: 401,
      name: "Siberia (Lago Baikal)",
      type: "Recuperación de recursos",
      risk: "Medio",
      resources: "Agua pura pura bajo hielo, Armamento militar sellado, Combustibles pesados",
      distance: "4500 km",
      camp: "Omega Fortress (Tokio)",
      status: "Disponible",
      img: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: 402,
      name: "Filipinas (Isla Mindanao)",
      type: "Búsqueda de comida",
      risk: "Bajo",
      resources: "Nutrientes tropicales, Coco silvestre, Madera de bambú",
      distance: "3100 km",
      camp: "Omega Fortress (Tokio)",
      status: "Disponible",
      img: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: 403,
      name: "Mongolia (Desierto Gobi)",
      type: "Reconocimiento",
      risk: "Extremo",
      resources: "Cristales de sílice limpia, Cobre nativo, Refugios de estepa",
      distance: "3000 km",
      camp: "Omega Fortress (Tokio)",
      status: "Restringido",
      img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: 404,
      name: "Indonesia (Krakatoa)",
      type: "Exploración",
      risk: "Muy alto",
      resources: "Lava rica en azufre, lodo alcalino, artefactos geotérmicos",
      distance: "5300 km",
      camp: "Omega Fortress (Tokio)",
      status: "Disponible",
      img: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=600&q=80"
    }
  ],
  camp_oeste: [
    {
      id: 501,
      name: "Congo (Selva del Ituri)",
      type: "Exploración",
      risk: "Extremo",
      resources: "Resinas biológicas, madera densa de dosel, flora medicinal silvestre",
      distance: "3800 km",
      camp: "Echo Outpost (Namibia)",
      status: "Restringido",
      img: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: 502,
      name: "Etiopía (Danakil Depression)",
      type: "Reconocimiento",
      risk: "Medio",
      resources: "Azufre puro crudo, Pistas térmicas, Sal de boro mineral",
      distance: "4700 km",
      camp: "Echo Outpost (Namibia)",
      status: "Disponible",
      img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: 503,
      name: "Madagascar (Bosque Tsiny)",
      type: "Búsqueda de energía",
      risk: "Alto",
      resources: "Conductores de cuarzo, Depósitos de litio residual, Energía solar de repisa",
      distance: "4200 km",
      camp: "Echo Outpost (Namibia)",
      status: "Disponible",
      img: "https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: 504,
      name: "Tanzania (Kilimanjaro)",
      type: "Recuperación de recursos",
      risk: "Muy alto",
      resources: "Almacenes médicos de ONU, Combustible de aviación reserva, Agua pura derretida",
      distance: "3600 km",
      camp: "Echo Outpost (Namibia)",
      status: "Disponible",
      img: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=600&q=80"
    }
  ]
};

interface CurrentUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  campId: number;
  campName: string;
  photoUrl?: string;
}

const CAMP_NAME_TO_ID: Record<string, string> = {
  "Alpha Bunker": "camp_alfa",
  "Sierra Base": "camp_norte",
  "Delta Refuge": "camp_sur",
  "Omega Fortress": "camp_este",
  "Echo Outpost": "camp_oeste"
};

const CAMP_ID_TO_ID: Record<number, string> = {
  1: "camp_alfa",
  2: "camp_norte",
  3: "camp_sur",
  4: "camp_este",
  5: "camp_oeste"
};

export function AdventuresView({ onNavigate }: { onNavigate?: (sub: string, id?: number) => void }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser>(() => {
    const storedCampIdStr = localStorage.getItem("activeCampId");
    const activeCampId = storedCampIdStr ? parseInt(storedCampIdStr) : 1;
    const campNames: Record<number, string> = {
      1: "Alpha Bunker",
      2: "Sierra Base",
      3: "Delta Refuge",
      4: "Omega Fortress",
      5: "Echo Outpost"
    };
    return {
      id: 0,
      username: "sesion",
      name: "Usuario",
      email: "",
      role: "TRAVEL_MANAGER", // Fallback non-admin role
      campId: activeCampId,
      campName: campNames[activeCampId] || "Alpha Bunker"
    };
  });

  const [activeCamp, setActiveCamp] = useState(() => {
    const storedCampIdStr = localStorage.getItem("activeCampId");
    const activeCampId = storedCampIdStr ? parseInt(storedCampIdStr) : 1;
    return CAMP_ID_TO_ID[activeCampId] || "camp_alfa";
  });

  const [activeIndex, setActiveIndex] = useState(0);

  // Synchronize active user from the HttpOnly cookie-backed session.
  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Auth failed");
        return res.json();
      })
      .then((payload) => {
        const data = payload?.data ?? payload;
        if (data && data.id) {
          setCurrentUser(data);
        }
      })
      .catch((err) => {
        console.warn("Backend auth failed in AdventuresView, using fallback user:", err);
      });
  }, []);

  const isAdmin = currentUser.role === "SYSTEM_ADMIN";
  const userCampKey = CAMP_ID_TO_ID[currentUser.campId] || CAMP_NAME_TO_ID[currentUser.campName] || "camp_alfa";
  const forcedCamp = isAdmin ? activeCamp : userCampKey;

  // Reset index when active camp changes
  useEffect(() => {
    setActiveIndex(0);
  }, [forcedCamp]);

  const selectedAdventures = CAMP_ADVENTURES[forcedCamp] || CAMP_ADVENTURES.camp_alfa;
  const current = selectedAdventures[activeIndex] || selectedAdventures[0];
  const isAvailable = current.status === "Disponible";

  const handleLaunch = (adventure: typeof current) => {
    console.log(`Lanzando expedición para la aventura en rango: ${adventure.name}`);
    
    // Coordinates and details lookup mapping for predefined adventures to enrich the saved object
    const adventureCoords: Record<number, { lat: number; lng: number; climate?: string }> = {
      101: { lat: 44.4280, lng: -110.5885, climate: "Húmedo templado" }, // Alaska Range
      102: { lat: 25.2866, lng: -80.8987, climate: "Húmedo Tropical" }, // Pantano Everglades
      103: { lat: 36.0544, lng: -112.1401, climate: "Cálido Desértico" }, // Cañón del Colorado
      104: { lat: 42.3314, lng: -83.0458, climate: "Templado Urbano" }, // Ciudad en Ruinas de Detroit
      201: { lat: 62.0079, lng: -6.7856, climate: "Frío húmedo" }, // Islas Feroe
      202: { lat: 42.3154, lng: 43.3569, climate: "Frío de Montaña" }, // Montañas del Cáucaso
      203: { lat: 67.9931, lng: 13.6410, climate: "Ártico Húmedo" }, // Lofoten
      204: { lat: 38.6431, lng: 34.8289, climate: "Templado húmedo" }, // Capadocia
      301: { lat: -23.8634, lng: -69.1328, climate: "Árido andino" },  // Desierto de Atacama
      302: { lat: -18.0000, lng: -57.0000, climate: "Subtropical húmedo" }, // Pantanal
      303: { lat: -54.8019, lng: -68.3030, climate: "Seco árido" }, // Patagonia extrema
      304: { lat: -20.1338, lng: -67.4891, climate: "Zonas pantanosas" }, // Salar de Uyuni
      401: { lat: 53.5587, lng: 108.1650, climate: "Frío alpino" }, // Siberia
      402: { lat: 8.1541, lng: 125.0808, climate: "Vientos marinos" }, // Filipinas
      403: { lat: 42.5900, lng: 103.4300, climate: "Frío alpino" }, // Mongolia
      404: { lat: -6.1021, lng: 105.4230, climate: "Vientos marinos" }, // Indonesia
      501: { lat: 1.6364, lng: 28.5136, climate: "Frío alpino" }, // Congo
      502: { lat: 14.2417, lng: 40.3000, climate: "Vientos marinos" }, // Etiopía
      503: { lat: -19.1415, lng: 44.8115, climate: "Frío alpino" }, // Madagascar
      504: { lat: -3.0656, lng: 37.3551, climate: "Vientos marinos" } // Tanzania
    };

    const extra = adventureCoords[adventure.id] || { lat: 0, lng: 0, climate: "Templado" };
    
    const selectedAdventure = {
      id: adventure.id,
      name: adventure.name,
      type: adventure.type,
      risk: adventure.risk,
      resources: adventure.resources,
      distance: adventure.distance,
      camp: adventure.camp,
      status: adventure.status,
      img: adventure.img,
      lat: extra.lat,
      lng: extra.lng,
      climate: extra.climate,
      originCampKey: forcedCamp
    };

    localStorage.setItem("selectedAdventureForExpedition", JSON.stringify(selectedAdventure));
    onNavigate?.("Crear Expedición");
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : selectedAdventures.length - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev < selectedAdventures.length - 1 ? prev + 1 : 0));
  };

  const campNameStr = ADVENTURE_CAMPS.find(c => c.id === forcedCamp)?.name || currentUser.campName;
  const pageTitle = `AVENTURAS DISPONIBLES PARA ${campNameStr.toUpperCase()}`;

  return (
    <MissionShell
      kicker="ZONAS DE EXPEDICIÓN ASIGNADAS"
      title={pageTitle}
    >
      <MissionStack>
        {/* Selector Visual del Campamento de Operaciones */}
        {isAdmin && (
          <div className="flex flex-col gap-1 mb-2">
            <span className="font-mono text-[8px] text-[#69BFB7] uppercase tracking-widest block font-bold mb-1">
              Filtrar Aventuras por Proximidad al Campamento Base (Modo Administrador):
            </span>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {ADVENTURE_CAMPS.map((camp) => {
                const active = camp.id === forcedCamp;
                return (
                  <button
                    key={camp.id}
                    onClick={() => {
                      setActiveCamp(camp.id);
                      setActiveIndex(0);
                    }}
                    className={`p-2 border text-left transition-all cursor-pointer rounded-sm flex flex-col justify-between ${
                      active
                        ? "bg-[#67ACA9]/10 border-[#69BFB7] shadow-[rgba(103,172,169,0.1)_0_0_8px]"
                        : "bg-black/30 border-[#67ACA9]/20 hover:border-[#67ACA9]/65"
                    }`}
                  >
                    <span className={`text-[10px] font-black uppercase ${active ? "text-[#69BFB7]" : "text-[#A4C2C5]"}`}>
                      {camp.name}
                    </span>
                    <span className="text-[8px] text-[#A4C2C5]/60 italic font-mono block truncate">
                      {camp.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mission-card mission-card-wide flex flex-col justify-between">
          <div>
            <div className="mission-card-title flex justify-between items-center border-b border-[#67ACA9]/20 pb-2 mb-4">
              <span>EXPLORACIÓN TÁCTICA DE RECURSOS EN RANGO</span>
              <span className="font-mono text-[8px] text-[#69BFB7] tracking-widest uppercase">REGISTRO SATELLITE ACTIVO</span>
            </div>

            {/* SECTOR DE SELECCIÓN HORIZONTAL CON FLECHAS */}
            <div className="flex items-center justify-between bg-black/30 border border-[#67ACA9]/20 p-2.5 mb-6 rounded-sm">
              <button 
                onClick={handlePrev}
                className="p-1.5 rounded-sm border border-[#67ACA9]/30 hover:border-[#69BFB7] hover:bg-[#69BFB7]/10 text-[#69BFB7] transition-all cursor-pointer"
                title="Zona Anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center">
                <span className="font-mono text-[9px] text-[#69BFB7]/65 tracking-widest uppercase font-semibold">SENSOR {activeIndex + 1} DE {selectedAdventures.length}</span>
                <span className="text-[15px] font-black tracking-wider text-[#A4C2C5] uppercase mt-0.5">{current.name}</span>
              </div>

              <button 
                onClick={handleNext}
                className="p-1.5 rounded-sm border border-[#67ACA9]/30 hover:border-[#69BFB7] hover:bg-[#69BFB7]/10 text-[#69BFB7] transition-all cursor-pointer"
                title="Siguiente Zona"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* HORIZONTAL EXPEDITION CARD DISPLAY */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#041515]/80 border border-[#67ACA9]/30 p-5 rounded-md relative overflow-hidden" style={{ minHeight: "260px" }}>
              
              {/* Left Side: Large Photo and Badge */}
              <div className="lg:col-span-5 relative group rounded overflow-hidden border border-[#67ACA9]/20">
                <img 
                  src={current.img} 
                  alt={current.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                  style={{ minHeight: "200px", maxHeight: "250px" }}
                  referrerPolicy="no-referrer"
                />
                
                {/* HUD Overlay elements */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                
                {/* Status indicator button */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-[#041515]/90 border border-[#67ACA9]/30 px-2 py-0.5 rounded-sm font-mono text-[8px] uppercase font-bold text-[#A4C2C5]">
                  <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                  {current.status}
                </div>

                <div className="absolute bottom-3 left-3 font-mono text-[9px] text-[#69BFB7] tracking-wider bg-black/80 px-2 py-1 border-l-2 border-[#69BFB7] rounded-sm">
                  TIPO: {current.type.toUpperCase()}
                </div>
              </div>

              {/* Right Side: Detailed parameters */}
              <div className="lg:col-span-7 flex flex-col justify-between py-1">
                <div>
                  <div className="flex justify-between items-start border-b border-[#67ACA9]/10 pb-2 mb-3">
                    <div>
                      <h4 className="text-xl font-black text-[#f0fafa] tracking-wide uppercase">{current.name}</h4>
                      <p className="font-mono text-[9px] text-[#69BFB7] mt-0.5 flex items-center gap-1 font-bold">
                        <MapPin className="w-3 h-3 text-[#69BFB7]" /> {current.camp}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <span className="block font-mono text-[8px] text-[#69BFB7]/60 uppercase tracking-widest font-bold">Riesgo</span>
                      <span className={`text-[11px] font-black uppercase inline-flex items-center gap-1 px-2 py-0.5 mt-0.5 border rounded-sm ${
                        current.risk === "Alto" || current.risk === "Muy alto" || current.risk === "Extremo"
                          ? "bg-red-500/10 text-red-400 border-red-500/30" 
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      }`}>
                        <AlertTriangle className="w-3 h-3" /> {current.risk}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 my-3 text-xs">
                    <div className="bg-black/20 p-2.5 border border-[#67ACA9]/10 rounded-sm">
                      <span className="font-mono text-[8px] text-[#69BFB7]/70 uppercase block mb-0.5 font-bold">Distancia de Tránsito</span>
                      <span className="text-[#A4C2C5] font-bold text-sm tracking-wide flex items-center gap-1">
                        <Navigation className="w-3.5 h-3.5 text-[#69BFB7]" /> {current.distance}
                      </span>
                    </div>

                    <div className="bg-black/20 p-2.5 border border-[#67ACA9]/10 rounded-sm">
                      <span className="font-mono text-[8px] text-[#69BFB7]/70 uppercase block mb-0.5 font-bold">Campamento Regional</span>
                      <span className="text-[#A4C2C5] font-semibold text-xs truncate block">{current.camp}</span>
                    </div>
                  </div>

                  <div className="bg-black/30 border-l-[3px] border-[#69BFB7] p-2.5 my-3 rounded-r-sm">
                    <span className="font-mono text-[8px] text-[#69BFB7] uppercase block font-semibold tracking-wider mb-1">Recursos Esperados</span>
                    <p className="text-[#A4C2C5]/90 text-[10.5px] leading-relaxed italic">
                      {current.resources}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#67ACA9]/10 flex gap-3 items-center">
                  <div className="flex-grow">
                    <Btn 
                      variant={isAvailable ? "primary" : "ghost"} 
                      style={{ width: '100%', padding: '10px 14px', fontSize: '11px', letterSpacing: '0.05em', height: 'auto', fontWeight: 900, textTransform: 'uppercase', opacity: isAvailable ? 1 : 0.35 }} 
                      onClick={() => isAvailable && handleLaunch(current)}
                      disabled={!isAvailable}
                    >
                      {isAvailable ? "Iniciar Wizard para esta aventura" : "Suministros / Acceso Restringido"}
                    </Btn>
                  </div>
                </div>
              </div>

            </div>

            {/* HIGH-TECH THUMBNAIL SELECTOR / DOT NAVIGATION */}
            <div className="flex justify-center items-center gap-2.5 mt-6">
              {selectedAdventures.map((item, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveIndex(idx)}
                    className={`h-2.5 rounded-full transition-all duration-300 relative cursor-pointer ${
                      isActive 
                        ? "w-8 bg-[#69BFB7] shadow-[0_0_8px_rgba(105,191,183,0.5)]" 
                        : "w-2.5 bg-[#67ACA9]/30 hover:bg-[#67ACA9]/60"
                    }`}
                    title={`Ver ${item.name}`}
                  >
                    {isActive && (
                      <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#69BFB7] rotate-45" />
                    )}
                  </button>
                );
              })}
            </div>

          </div>
        </div>
      </MissionStack>
    </MissionShell>
  );
}
