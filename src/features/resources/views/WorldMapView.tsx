import { useState } from "react";
import { WorldMap } from "../components/WorldMap";
import { Btn } from "./ResourceManagementViews";
import type { Camp, IntercampRequest, Transfer, ResourceType, CampInventory, RequestResourceDetail } from "../types/resourceManagementTypes";
import { AlertCircle } from "lucide-react";

function getCurrentResourceUser() {
  if (typeof window === "undefined") return null;

  const campIdFromStorage = Number(localStorage.getItem("last_selected_camp_id"));
  const rawSources = [
    localStorage.getItem("session_user"),
    localStorage.getItem("user"),
  ];

  let userId = 0;
  let campId = Number.isFinite(campIdFromStorage) && campIdFromStorage > 0 ? campIdFromStorage : 0;

  for (const raw of rawSources) {
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as { userId?: unknown; id?: unknown; campId?: unknown; selectedCampId?: unknown; camp_id?: unknown; rol?: unknown; role?: unknown; camp?: { id?: unknown } };
      const parsedUserId = Number(parsed.userId ?? parsed.id);
      const parsedCampId = Number(parsed.selectedCampId ?? parsed.campId ?? parsed.camp_id ?? parsed.camp?.id);
      const role = String(parsed.rol ?? parsed.role ?? "").toUpperCase();

      if (Number.isFinite(parsedUserId) && parsedUserId > 0) {
        userId = parsedUserId;
      }
      if (Number.isFinite(parsedCampId) && parsedCampId > 0) {
        campId = parsedCampId;
      }

      if (role === "RESOURCE_MANAGEMENT" && userId > 0 && campId > 0) {
        return {
          userId,
          campId,
          rol: "RESOURCE_MANAGEMENT" as const,
        };
      }
    } catch {
      // Ignore malformed session data and continue to the next source.
    }
  }

  if (userId > 0 && campId > 0) {
    return {
      userId,
      campId,
      rol: "RESOURCE_MANAGEMENT" as const,
    };
  }

  return null;
}


const CAMP_COORDS: Record<string, { lat: number; lng: number; label: string }> = {
  "1": { lat: 4.6, lng: -74.08, label: "Alpha Bunker" },
  "2": { lat: 19.43, lng: -99.13, label: "Sierra Base" },
  "3": { lat: -33.87, lng: 151.21, label: "Delta Refuge" },
  "4": { lat: 51.51, lng: -0.13, label: "Omega Fortress" },
  "5": { lat: 35.68, lng: 139.69, label: "Echo Outpost" }
};

interface WorldMapDashboardProps {
  camps: Camp[];
  intercampRequests: IntercampRequest[];
  transfers: Transfer[];
  resourceTypes: ResourceType[];
  campInventories: CampInventory[];
  requestResourceDetails?: RequestResourceDetail[];
  onNavigateToTab?: (sub: string) => void;
}

type RouteMeta = {
  id: string;
  requestId: string;
  type: string;
  statusText: string;
  class: string;
  plannedDeparture: string;
  plannedArrival: string;
  rations: number;
  receptionNotes: string;
  origin: string;
  destination: string;
  desc: string;
};

type RouteDot = {
  start: { lat: number; lng: number; label: string };
  end: { lat: number; lng: number; label: string };
  status?: string;
  meta: RouteMeta;
};

type CampRelationOption = {
  id: string;
  label: string;
};

export function WorldMapDashboard({
  camps = [],
  intercampRequests = [],
  transfers = [],
  resourceTypes = [],
  campInventories = [],
  requestResourceDetails = [],
  onNavigateToTab
}: WorldMapDashboardProps) {

  const sessionCampId = String(getCurrentResourceUser()?.campId ?? camps[0]?.id ?? "1");
  const [activeCampFilter] = useState<string>(sessionCampId);
  const [relationCampFilter, setRelationCampFilter] = useState<string>("all");
  const [selectedRoute, setSelectedRoute] = useState<RouteMeta | null>(null);
  const [legendOpen, setLegendOpen] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "planned">( "all");


  const campRelationOptions: CampRelationOption[] = Object.entries(CAMP_COORDS).reduce((options, [id, coord]) => {
    if (id === sessionCampId) return options;

    const apiCamp = camps.find(camp => String(camp.id) === id);
    options.push({
      id,
      label: (apiCamp?.name || coord.label).toUpperCase(),
    });

    return options;
  }, [] as CampRelationOption[]);

  const getCampName = (id: string) => {
    return camps.find(c => String(c.id) === String(id))?.name || CAMP_COORDS[id]?.label || id;
  };


  const transferDots = transfers.map((t): RouteDot | null => {
    const req = intercampRequests.find(r => String(r.id) === String(t.requestId));
    if (!req) return null;

    const originId = String(req.originCampId);
    const destinationId = String(req.destinationCampId);
    const start = CAMP_COORDS[originId];
    const end = CAMP_COORDS[destinationId];
    if (!start || !end) return null;
    const isCompleted = t.status === "DELIVERED" || String(t.status) === "COMPLETED";

    return {
      start,
      end,
      status: isCompleted ? "COMPLETED" : t.status === "CANCELED" ? "LOST" : "PLANNED",
      meta: {
        id: t.id,
        requestId: t.requestId,
        type: "TRASLADO",
        statusText: isCompleted ? "Entregado / Completado" : t.status === "CANCELED" ? "Cancelado" : "En Tránsito / Planeado",
        class: isCompleted ? "COMPLETED" : t.status === "CANCELED" ? "LOST" : "ACTIVE",
        plannedDeparture: t.plannedDepartureDate,
        plannedArrival: t.plannedArrivalDate,
        rations: t.rationsForTrip,
        receptionNotes: t.receptionNotes || "Sin observaciones registradas",
        origin: originId,
        destination: destinationId,
        desc: req.description
      }
    };
  }).filter((dot): dot is RouteDot => dot !== null);


  const requestDots = intercampRequests
    .filter(r => r.status === "PENDING")
    .map((r): RouteDot | null => {
      const originId = String(r.originCampId);
      const destinationId = String(r.destinationCampId);
      const start = CAMP_COORDS[originId];
      const end = CAMP_COORDS[destinationId];
      if (!start || !end) return null;

      return {
        start,
        end,
        status: "DELAYED", 
        meta: {
          id: r.id,
          requestId: r.id,
          type: "SOLICITUD SOLA",
          statusText: "Pendiente de Aprobación",
          class: "PLANNED",
          plannedDeparture: r.plannedDepartureDate,
          plannedArrival: r.plannedArrivalDate,
          rations: 0,
          receptionNotes: "Evaluando viabilidad militar",
          origin: originId,
          destination: destinationId,
          desc: r.description
        }
      };
    })
    .filter((dot): dot is RouteDot => dot !== null);


  const allVisibleDots = [...transferDots, ...requestDots].filter((d): d is RouteDot => {
    const origin = String(d.meta.origin);
    const destination = String(d.meta.destination);
    return origin === sessionCampId || destination === sessionCampId;
  });


  const campFilteredDots = allVisibleDots.filter((d): d is RouteDot => {
    const origin = String(d.meta.origin);
    const destination = String(d.meta.destination);


    if (activeCampFilter !== "all") {
      if (relationCampFilter === "all") {
        if (origin !== activeCampFilter && destination !== activeCampFilter) return false;
      } else {
        const match1 = (origin === activeCampFilter && destination === relationCampFilter);
        const match2 = (origin === relationCampFilter && destination === activeCampFilter);
        if (!match1 && !match2) return false;
      }
    } else if (relationCampFilter !== "all") {
      if (origin !== relationCampFilter && destination !== relationCampFilter) return false;
    }
    return true;
  });

  const totalCount = campFilteredDots.length;
  const completedCount = campFilteredDots.filter(d => d && d.meta.statusText.includes("Completado")).length;
  const plannedCount = campFilteredDots.filter(d => d && !d.meta.statusText.includes("Completado")).length;

  const dotsToDisplay = campFilteredDots.filter((d): d is RouteDot => {
    if (statusFilter === "all") return true;
    const isCompleted = d.meta.statusText.includes("Completado");
    if (statusFilter === "completed") return isCompleted;
    if (statusFilter === "planned") return !isCompleted;
    return true;
  });


  const getRequestResources = (reqId: string) => {
    return requestResourceDetails
      .filter(detail => String(detail.requestId) === String(reqId))
      .map(detail => {
        const type = resourceTypes.find(resource => Number(resource.id) === Number(detail.resourceTypeId));
        return {
          id: detail.id,
          label: `${type?.name || detail.resourceTypeId}: ${detail.requestedAmount} ${type?.unitOfMeasure || "u"}`
        };
      });
  };


  const getCampDetails = (campId: string) => {
    return campInventories.filter(ci => String(ci.campId) === String(campId)).map(ci => {
      const rt = resourceTypes.find(t => Number(t.id) === Number(ci.resourceTypeId));
      return {
        ...ci,
        typeName: rt ? rt.name : ci.resourceTypeId,
        unit: rt ? rt.unitOfMeasure : "u"
      };
    });
  };

  const activeTransfersList = (
    <div className="bg-[#0d1414]/85 border border-[#67ACA9]/20 p-3 rounded-sm flex flex-col gap-3 backdrop-blur-xs">
      <h3 className="wm-sidebar-title text-xs font-bold uppercase tracking-wider text-[#69BFB7] border-b border-[#67ACA9]/20 pb-1.5 mb-1 flex items-center justify-between">
        <span>Traslados Activos ({statusFilter === "all" ? "Todos" : statusFilter === "completed" ? "Completados" : "Planeados"})</span>
        <span className="font-mono text-[8px] bg-[#67ACA9]/15 px-1.5 py-0.5 rounded-xs text-[#A4C2C5]">
          {activeCampFilter.toUpperCase()}
        </span>
      </h3>

      {dotsToDisplay.length === 0 ? (
        <div className="text-[10px] text-[#A4C2C5]/40 italic p-6 text-center border border-[#67ACA9]/15 bg-[#0d1414]/55 rounded-xs">
          Ninguna conexión de transporte detectada para los filtros vigentes.
        </div>
      ) : (
        <div className="wm-exp-list max-h-[220px] overflow-y-auto pr-1">
          {dotsToDisplay.map((dot, index) => {
            const isCompleted = dot.meta.class === "COMPLETED";
            const iconSymbol = isCompleted ? "✓" : "◆";
            const iconColor = isCompleted ? "#4ade80" : "#67ACA9";

            return (
              <div
                key={`${dot.meta.id}-${index}`}
                className="wm-exp-card"
                onClick={() => setSelectedRoute(dot.meta)}
              >
                <div className="wm-exp-icon" style={{ borderColor: iconColor, color: iconColor }}>
                  {iconSymbol}
                </div>
                <div className="wm-exp-info flex-grow text-left">
                  <span className="wm-exp-name text-white font-bold text-[10px] uppercase truncate block">
                    {dot.meta.id} • {getCampName(dot.meta.origin)} ➔ {getCampName(dot.meta.destination)}
                  </span>
                  <span className="wm-exp-team text-[#A4C2C5]/60 text-[9px] block truncate">
                    &ldquo;{dot.meta.desc}&rdquo;
                  </span>
                </div>
                <div className="wm-exp-time text-right font-mono text-[9px] text-[#A4C2C5]/70 shrink-0 select-none">
                  {dot.meta.plannedArrival}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="wm-layout flex flex-col gap-4">

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-7 items-stretch lg:pr-3">
        
        
        <div className="lg:col-span-7 flex flex-col gap-3 min-w-0 lg:pl-4 xl:pl-5">
          <div className="wm-map-area relative bg-[#0b1010] border border-[#67ACA9]/20 rounded-sm overflow-hidden p-2 h-[185px] xs:h-[210px] sm:h-[280px] md:h-[360px] lg:h-[320px] xl:h-[340px] 2xl:h-[360px] min-h-[150px] lg:min-h-0">
            
            
            <div className="absolute top-3 left-12 z-10 font-mono select-none">
              <button 
                type="button"
                className="pointer-events-auto flex items-center justify-center p-2 rounded-full border border-[#67ACA9]/30 bg-[#0d1414]/90 text-[#69BFB7] hover:bg-[#67ACA9]/15 transition-all shadow-md cursor-pointer hover:border-[#69BFB7]"
                onClick={() => setLegendOpen(!legendOpen)}
                title="Información de Acoplamiento y Ruta Vectorial"
              >
                <AlertCircle size={15} className={legendOpen ? "animate-pulse" : ""} />
              </button>
              
              {legendOpen && (
                <div className="absolute top-8 left-0 mt-1 min-w-[210px] bg-[#0d1414]/95 border border-[#67ACA9]/30 p-2.5 rounded-sm text-[9.5px] flex flex-col gap-2 shadow-2xl transition-all animate-in fade-in duration-200">
                  <div className="text-[#69BFB7] font-black text-[8px] tracking-widest uppercase border-b border-[#67ACA9]/15 pb-1">
                    ESTADO DE VECTORES DE RUTA
                  </div>
                  
                  <div className="flex flex-col gap-1.5 mt-1 text-[#A4C2C5]/90">
                    <div className="flex items-center justify-between gap-3 bg-black/45 px-2 py-1 border border-[#67ACA9]/10 rounded-xs">
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">━━━ Continuo:</span>
                      <span className="text-[#A4C2C5] text-[9.5px]">Completado / Concluido</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 bg-black/45 px-2 py-1 border border-[#67ACA9]/10 rounded-xs">
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">- - - Segmentado:</span>
                      <span className="text-[#A4C2C5] text-[9.5px]">Planeado / En Tránsito</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 bg-black/45 px-2 py-1 border border-[#67ACA9]/10 rounded-xs">
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">··· Punteado:</span>
                      <span className="text-[#A4C2C5] text-[9.5px]">Solicitud Pendiente</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <WorldMap
              dots={dotsToDisplay}
              lineColor="#67ACA9"
              onZoneClick={(dot) => {
                const meta = dot.meta as RouteMeta | undefined;
                if (meta) setSelectedRoute(meta);
              }}
            />

            
            <div className="absolute bottom-2 right-8 text-[7px] font-mono text-[#A4C2C5]/50 uppercase bg-black/40 px-2 py-0.5 rounded-xs">
              Haga clic sobre un campamento de destino para inspeccionar el manifiesto
            </div>
          </div>
          {activeTransfersList}
        </div>        
        <div className="lg:col-span-5 flex flex-col gap-3 wm-sidebar max-h-[460px] lg:max-h-none lg:overflow-visible min-w-0 lg:pr-2">
          
          
          <div className="bg-[#0d1414]/85 border border-[#67ACA9]/20 p-3 rounded-sm flex flex-col gap-3 backdrop-blur-xs">
            <div>
              <span className="text-[10px] font-mono text-[#69BFB7] block uppercase tracking-wider">
                DEPARTAMENTO DE CONTROL DE SUMINISTROS
              </span>
              <h2 className="text-xs font-black text-white uppercase mt-0.5">
                Conexiones de {getCampName(sessionCampId)} ➔ {relationCampFilter === "all" ? "Todos los Destinos" : getCampName(relationCampFilter).toUpperCase()}
              </h2>
            </div>
            
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-[#67ACA9]/10 pt-2.5 font-mono">
              <div className="flex flex-col gap-1 text-[8px]">
                <span className="text-[#69BFB7] font-bold uppercase tracking-wide">1. CAMPAMENTO PROPIO:</span>
                <div className="bg-[#67ACA9]/10 border border-[#67ACA9]/30 text-white rounded-xs p-2 text-[10px] uppercase font-bold font-mono flex items-center gap-1.5 h-9">
                  {getCampName(sessionCampId).toUpperCase()} (PROPIO)
                </div>
              </div>

              <div className="flex flex-col gap-1 text-[8px]">
                <span className="text-[#69BFB7] font-bold uppercase tracking-wide">2. RELACIÓN CON DESTINOS:</span>
                <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                  {[
                    { id: "all", label: "TODOS" },
                    ...campRelationOptions
                  ].map((opt) => {
                    const isActive = relationCampFilter === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setRelationCampFilter(opt.id);
                          setSelectedRoute(null);
                        }}
                        className={`px-3 py-1.5 text-[11px] uppercase font-bold border rounded-xs transition-all cursor-pointer ${
                          isActive 
                            ? "bg-[#67ACA9]/30 border-[#69BFB7] text-white shadow-[0_0_8px_rgba(105,191,183,0.3)]" 
                            : "bg-black/45 border-[#67ACA9]/10 text-[#A4C2C5]/70 hover:border-[#67ACA9]/30 hover:text-white"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            
            {relationCampFilter !== "all" && (
              <div className="pt-2 border-t border-[#67ACA9]/10">
                <button
                  type="button"
                  onClick={() => { setRelationCampFilter("all"); setSelectedRoute(null); }}
                  className="w-full bg-[#1A1F1F] hover:bg-[#324f4c]/30 text-xs font-mono text-[#69BFB7] hover:text-white border border-[#67ACA9]/30 py-2 px-3 rounded-xs uppercase tracking-wider font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                >
                  <span>✕ RESTABLECER VISTA GLOBAL</span>
                </button>
              </div>
            )}

            
            <div className="grid grid-cols-3 gap-1.5 border-t border-[#67ACA9]/10 pt-2 font-mono">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`p-1.5 rounded-sm border text-center transition-all flex flex-col items-center justify-center ${statusFilter === "all" ? "bg-[#67ACA9]/15 border-[#67ACA9] text-white" : "bg-black/20 border-[#67ACA9]/15 text-[#A4C2C5]/60 hover:border-[#67ACA9]/35"}`}
              >
                <span className="text-[7.5px] uppercase tracking-wider">Rutas Visibles</span>
                <span className="text-sm font-black mt-0.5" style={{ color: "#ffffff" }}>{totalCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("completed")}
                className={`p-1.5 rounded-sm border text-center transition-all flex flex-col items-center justify-center ${statusFilter === "completed" ? "bg-emerald-950/20 border-emerald-400 text-white" : "bg-black/20 border-[#67ACA9]/15 text-[#A4C2C5]/60 hover:border-emerald-400/35"}`}
              >
                <span className="text-[7.5px] uppercase tracking-wider">Completadas</span>
                <span className="text-sm font-black mt-0.5" style={{ color: "#ffffff" }}>{completedCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("planned")}
                className={`p-1.5 rounded-sm border text-center transition-all flex flex-col items-center justify-center ${statusFilter === "planned" ? "bg-amber-950/20 border-amber-400 text-white" : "bg-black/20 border-[#67ACA9]/15 text-[#A4C2C5]/60 hover:border-amber-400/35"}`}
              >
                <span className="text-[7.5px] uppercase tracking-wider">Planeadas</span>
                <span className="text-sm font-black mt-0.5" style={{ color: "#ffffff" }}>{plannedCount}</span>
              </button>
            </div>
          </div>
          
          
          {selectedRoute ? (
            <div className="tactical-zone-panel border border-[#69BFB7] bg-[#0d1414]/95 p-3.5 rounded-sm flex flex-col">
              <div className="tactical-zone-header">
                <div>
                  <span className="text-[8px] font-mono text-[#69BFB7] uppercase tracking-wider block">
                    {selectedRoute.type} DETALLADO • MODELO DE RED
                  </span>
                  <h3 className="tactical-zone-title">
                    {getCampName(selectedRoute.origin)} ➔ {getCampName(selectedRoute.destination)}
                  </h3>
                  <span className={`tactical-zone-status font-bold ${selectedRoute.class === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-300'}`}>
                    {selectedRoute.statusText}
                  </span>
                </div>
                <button 
                  type="button" 
                  className="tactical-close-btn"
                  onClick={() => setSelectedRoute(null)}
                >
                  ✕
                </button>
              </div>

              <p className="tactical-zone-desc mt-2">{selectedRoute.desc || "Suministros de contingencia intercampamentos."}</p>

              <div className="tactical-stats-grid my-2 rounded-xs">
                <div className="tactical-stat">
                  <span>ID Registro</span>
                  <strong>{selectedRoute.id}</strong>
                </div>
                <div className="tactical-stat">
                  <span>Raciones Convoy</span>
                  <strong>{selectedRoute.rations > 0 ? `${selectedRoute.rations} u` : "0 u"}</strong>
                </div>
                <div className="tactical-stat">
                  <span>Salida Programada</span>
                  <strong>{selectedRoute.plannedDeparture || "—"}</strong>
                </div>
                <div className="tactical-stat">
                  <span>Llegada Estimada</span>
                  <strong>{selectedRoute.plannedArrival || "—"}</strong>
                </div>
              </div>

              <div className="tactical-resources mt-1">
                <h4 className="tactical-subtitle">Suministros Solicitados</h4>
                <div className="tactical-resource-cards">
                  {getRequestResources(String(selectedRoute.requestId)).length > 0 ? (
                    getRequestResources(String(selectedRoute.requestId)).map(item => (
                      <div className="tactical-resource-card">
                        <span className="tactical-resource-icon">◆</span>
                        <span>{item.label}</span>
                      </div>
                    ))
                  ) : (
                    <div className="tactical-resource-card">
                      <span className="tactical-resource-icon">◆</span>
                      <span>Sin recursos vinculados</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedRoute.receptionNotes && (
                <div className="p-2 bg-black/40 border border-[#67ACA9]/10 rounded-xs mt-2 text-[10px] text-[#A4C2C5]/70 italic">
                  Observaciones: {selectedRoute.receptionNotes}
                </div>
              )}

              <div className="tactical-actions mt-4 gap-2">
                {onNavigateToTab && (
                  <Btn variant="primary" style={{ width: '100%' }} onClick={() => onNavigateToTab(selectedRoute.type === "TRASLADO" ? "Traslados" : "Solicitudes intercampamento")}>
                    🚚 Gestionar Trámite
                  </Btn>
                )}
                <Btn variant="ghost" style={{ width: '100%' }} onClick={() => setSelectedRoute(null)}>
                  Regresar al Listado
                </Btn>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <h3 className="wm-sidebar-title" style={{ marginTop: 8 }}>Resumen de Suministros</h3>
              <div className="wm-stats">
                <div className="wm-stat-row">
                  <span>Conexiones Totales</span>
                  <span className="wm-stat-val text-white" style={{ color: "#ffffff" }}>{totalCount}</span>
                </div>
                <div className="wm-stat-row">
                  <span>Completadas / Entregadas</span>
                  <span className="wm-stat-val text-white" style={{ color: "#ffffff" }}>{completedCount}</span>
                </div>
                <div className="wm-stat-row">
                  <span>En Espera / Planeadas</span>
                  <span className="wm-stat-val text-white" style={{ color: "#ffffff" }}>{plannedCount}</span>
                </div>
                <div className="wm-stat-row">
                  <span>Campamento Asignado</span>
                  <span className="wm-stat-val text-white" style={{ color: "#ffffff" }}>{getCampName(sessionCampId)}</span>
                </div>
              </div>
              
              
              <div className="bg-black/45 border border-[#67ACA9]/20 p-2.5 rounded-sm mt-1">
                <h4 className="text-[9.5px] font-bold text-[#69BFB7] uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Reservas de Suministros {getCampName(activeCampFilter)}</span>
                  <span className="text-[7.5px] text-[#A4C2C5]/50 font-normal">Sincronizado</span>
                </h4>
                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono max-h-[85px] overflow-y-auto pr-1">
                  {getCampDetails(activeCampFilter).map(item => {
                    const isCritical = item.currentAmount <= item.minimumAlertAmount;
                    return (
                      <div 
                        key={item.resourceTypeId} 
                        className={`p-1.5 flex justify-between items-center rounded-xs border ${isCritical ? 'border-red-500/30 bg-red-950/20 text-red-300' : 'border-[#67ACA9]/10 bg-black/20 text-white'}`}
                      >
                        <span className="truncate pr-1 px-0.5 text-[8.5px] text-[#A4C2C5]/85">{item.typeName}</span>
                        <strong className="shrink-0">{item.currentAmount} {item.unit}</strong>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
