// @ts-nocheck
import { useState } from "react";
import { WorldMap } from "../components/WorldMap";
import { Btn } from "./ResourceManagementViews";
import type { Camp, IntercampRequest, Transfer, ResourceType, CampInventory } from "../types/resourceManagementTypes";

// Coordinates corresponding to the real camp IDs
const CAMP_COORDS: Record<string, { lat: number; lng: number; label: string }> = {
  alfa: { lat: 4.6, lng: -74.08, label: "Base Alfa (CO)" },
  bravo: { lat: 19.43, lng: -99.13, label: "Campamento Bravo" },
  charlie: { lat: -33.87, lng: 151.21, label: "Campamento Charlie" },
  delta: { lat: 51.51, lng: -0.13, label: "Avanzada Delta" }
};

interface WorldMapDashboardProps {
  camps: Camp[];
  intercampRequests: IntercampRequest[];
  transfers: Transfer[];
  resourceTypes: ResourceType[];
  campInventories: CampInventory[];
  onNavigateToTab?: (sub: string) => void;
}

export function WorldMapDashboard({
  camps = [],
  intercampRequests = [],
  transfers = [],
  resourceTypes = [],
  campInventories = [],
  onNavigateToTab
}: WorldMapDashboardProps) {
  // Simulates which camp the Resource Manager is currently assigned to (or "all" for general network view)
  const [activeCampFilter, setActiveCampFilter] = useState<string>("all");
  const [relationCampFilter, setRelationCampFilter] = useState<string>("all");
  const [selectedRoute, setSelectedRoute] = useState<any | null>(null);
  const [legendOpen, setLegendOpen] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "planned">( "all");

  // Helper to get camp name by ID
  const getCampName = (id: string) => {
    return camps.find(c => c.id === id)?.name || id;
  };

  // Convert transfers into map lines/connections
  const transferDots = transfers.map((t) => {
    const req = intercampRequests.find(r => r.id === t.requestId);
    if (!req) return null;

    const start = CAMP_COORDS[req.originCampId.toLowerCase()];
    const end = CAMP_COORDS[req.destinationCampId.toLowerCase()];
    if (!start || !end) return null;

    return {
      start,
      end,
      status: t.status === "COMPLETED" ? "COMPLETED" : t.status === "CANCELED" ? "LOST" : "PLANNED",
      meta: {
        id: t.id,
        requestId: t.requestId,
        type: "TRASLADO",
        statusText: t.status === "COMPLETED" ? "Entregado / Completado" : t.status === "CANCELED" ? "Cancelado" : "En Tránsito / Planeado",
        class: t.status === "COMPLETED" ? "COMPLETED" : t.status === "CANCELED" ? "LOST" : "ACTIVE",
        plannedDeparture: t.plannedDepartureDate,
        plannedArrival: t.plannedArrivalDate,
        rations: t.rationsForTrip,
        receptionNotes: t.receptionNotes || "Sin observaciones registradas",
        origin: req.originCampId,
        destination: req.destinationCampId,
        desc: req.description
      }
    };
  }).filter(Boolean);

  // Convert pending Intercamp Requests (not yet turned to transfers) into connections too
  const requestDots = intercampRequests
    .filter(r => r.status === "PENDING")
    .map((r) => {
      const start = CAMP_COORDS[r.originCampId.toLowerCase()];
      const end = CAMP_COORDS[r.destinationCampId.toLowerCase()];
      if (!start || !end) return null;

      return {
        start,
        end,
        status: "DELAYED", // Uses color for planned/pending
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
          origin: r.originCampId,
          destination: r.destinationCampId,
          desc: r.description
        }
      };
    })
    .filter(Boolean);

  const allVisibleDots = [...transferDots, ...requestDots];

  // Apply camp-camp relationship filtering
  const campFilteredDots = allVisibleDots.filter(d => {
    if (!d) return false;
    const origin = d.meta.origin.toLowerCase();
    const destination = d.meta.destination.toLowerCase();

    // Camp A filter
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

  const dotsToDisplay = campFilteredDots.filter(d => {
    if (!d) return false;
    if (statusFilter === "all") return true;
    const isCompleted = d.meta.statusText.includes("Completado");
    if (statusFilter === "completed") return isCompleted;
    if (statusFilter === "planned") return !isCompleted;
    return true;
  });

  // Get resources related to a request
  const getRequestResources = (reqId: string) => {
    return campInventories
      .filter(() => true) // Placehold
      .map(ci => {
        // Find if this resource is listed anywhere for the request
        // In full flow, we query details
        return null;
      }).filter(Boolean);
  };

  // Resources for rendering
  const getCampDetails = (campId: string) => {
    return campInventories.filter(ci => ci.campId.toLowerCase() === campId.toLowerCase()).map(ci => {
      const rt = resourceTypes.find(t => t.id === ci.resourceTypeId);
      return {
        ...ci,
        typeName: rt ? rt.name : ci.resourceTypeId,
        unit: rt ? rt.unitOfMeasure : "u"
      };
    });
  };

  return (
    <div className="wm-layout flex flex-col gap-4">

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        
        {/* LEFT COLUMN: TACTICAL VECTOR MAP */}
        <div className="xl:col-span-7 flex flex-col gap-3 min-h-[480px]">
          <div className="wm-map-area relative flex-1 bg-[#0b1010] border border-[#67ACA9]/20 rounded-sm overflow-hidden p-2 min-h-[440px]">
            
            {/* Legend Badge (Collapsible and semi-transparent) */}
            <div className="absolute top-3 left-3 bg-[#0d1414]/20 backdrop-blur-xs border border-[#67ACA9]/15 p-2 rounded-sm z-10 text-[9px] flex flex-col gap-1.5 font-mono select-none transition-colors duration-200 hover:bg-[#0d1414]/75">
              <div 
                className="flex items-center justify-between gap-3 cursor-pointer border-b border-[#67ACA9]/10 pb-1"
                onClick={() => setLegendOpen(!legendOpen)}
              >
                <span className="text-[#69BFB7] font-bold text-[8px] tracking-wider">LEYENDA COLORES</span>
                <span className="text-[#67ACA9]/80 text-[7px] font-bold">
                  {legendOpen ? "[-] OCULTAR" : "[+] EXPANDIR"}
                </span>
              </div>
              
              {legendOpen && (
                <div className="flex flex-col gap-1.5 mt-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-1.5 rounded-sm bg-[#4ade80]" />
                    <span className="text-white text-[9px]">Completado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-1.5 rounded-sm bg-[#f59e0b] animate-pulse" />
                    <span className="text-white text-[9px]">Planeado / En espera</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-1.5 rounded-sm bg-[#67ACA9]/60" />
                    <span className="text-[#A4C2C5]/85 text-[8px]">Solicitud Pendiente</span>
                  </div>
                </div>
              )}
            </div>

            <WorldMap
              dots={dotsToDisplay as any[]}
              lineColor="#67ACA9"
              onZoneClick={(dot: any) => {
                if (dot.meta) setSelectedRoute(dot.meta);
              }}
            />

            {/* Instruction tooltip */}
            <div className="absolute bottom-2 right-2 text-[7px] font-mono text-[#A4C2C5]/50 uppercase bg-black/40 px-2 py-0.5 rounded-xs">
              Haga clic sobre un campamento de destino para inspeccionar el manifiesto
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTION & HISTORY CARD */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          
          {/* CAMP MANAGER FILTER (SISTEMA DE ASIGNACIÓN GEOLOCALIZADA) */}
          <div className="bg-[#0d1414]/85 border border-[#67ACA9]/20 p-3 rounded-sm flex flex-col gap-3 backdrop-blur-xs">
            <div>
              <span className="text-[10px] font-mono text-[#69BFB7] block uppercase tracking-wider">
                DEPARTAMENTO DE CONTROL DE SUMINISTROS
              </span>
              <h2 className="text-xs font-black text-white uppercase mt-0.5">
                {activeCampFilter === "all" && relationCampFilter === "all"
                  ? "🌐 Red Logística Global de Suministros"
                  : `⛺ Filtro Activo: Propio (${getCampName(activeCampFilter).toUpperCase()}) ➔ Relación (${getCampName(relationCampFilter).toUpperCase()})`}
              </h2>
            </div>
            
            {/* Dual Camp Selection Space */}
            <div className="grid grid-cols-2 gap-2 border-t border-[#67ACA9]/10 pt-2.5 font-mono">
              <div className="flex flex-col gap-1 text-[8px]">
                <span className="text-[#69BFB7] font-bold uppercase tracking-wide">1. CAMPAMENTO PROPIO:</span>
                <select 
                  value={activeCampFilter} 
                  onChange={(e) => { setActiveCampFilter(e.target.value); setSelectedRoute(null); }}
                  className="bg-[#0b1010] border border-[#67ACA9]/20 text-white rounded-xs p-1 text-[9.5px] uppercase font-bold font-mono focus:outline-none focus:border-[#69BFB7] cursor-pointer"
                >
                  <option value="all">🌐 TODOS (SISTEMA)</option>
                  {camps.map(c => <option key={c.id} value={c.id.toLowerCase()}>{c.name.toUpperCase()}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1 text-[8px]">
                <span className="text-[#69BFB7] font-bold uppercase tracking-wide">2. RELACIÓN CON:</span>
                <select 
                  value={relationCampFilter} 
                  onChange={(e) => { setRelationCampFilter(e.target.value); setSelectedRoute(null); }}
                  className="bg-[#0b1010] border border-[#67ACA9]/20 text-white rounded-xs p-1 text-[9.5px] uppercase font-bold font-mono focus:outline-none focus:border-[#69BFB7] cursor-pointer"
                >
                  <option value="all">🌐 TODOS (DESTINOS)</option>
                  {camps.map(c => <option key={c.id} value={c.id.toLowerCase()}>{c.name.toUpperCase()}</option>)}
                </select>
              </div>
            </div>

            {/* Quick reset option if filters are active */}
            {(activeCampFilter !== "all" || relationCampFilter !== "all") && (
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => { setActiveCampFilter("all"); setRelationCampFilter("all"); setSelectedRoute(null); }}
                  className="text-[7.5px] font-mono text-cyan-300 hover:text-white uppercase tracking-wider"
                >
                  [✕ RESTABLECER VISTA GLOBAL]
                </button>
              </div>
            )}

            {/* INTERACTIVE FILTERS FOR ROUTE STATUS (As requested, visible complete planned options) */}
            <div className="grid grid-cols-3 gap-1.5 border-t border-[#67ACA9]/10 pt-2 font-mono">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`p-1.5 rounded-sm border text-center transition-all flex flex-col items-center justify-center ${statusFilter === "all" ? "bg-[#67ACA9]/15 border-[#67ACA9] text-white" : "bg-black/20 border-[#67ACA9]/15 text-[#A4C2C5]/60 hover:border-[#67ACA9]/35"}`}
              >
                <span className="text-[7.5px] uppercase tracking-wider">Rutas Visibles</span>
                <span className="text-xs font-black text-white mt-0.5">{totalCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("completed")}
                className={`p-1.5 rounded-sm border text-center transition-all flex flex-col items-center justify-center ${statusFilter === "completed" ? "bg-emerald-950/20 border-emerald-400 text-emerald-300" : "bg-black/20 border-[#67ACA9]/15 text-[#A4C2C5]/60 hover:border-emerald-400/35"}`}
              >
                <span className="text-[7.5px] uppercase tracking-wider">Completadas</span>
                <span className="text-xs font-black text-emerald-400 mt-0.5">{completedCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("planned")}
                className={`p-1.5 rounded-sm border text-center transition-all flex flex-col items-center justify-center ${statusFilter === "planned" ? "bg-amber-950/20 border-amber-400 text-amber-300" : "bg-black/20 border-[#67ACA9]/15 text-[#A4C2C5]/60 hover:border-amber-400/35"}`}
              >
                <span className="text-[7.5px] uppercase tracking-wider">Planeadas</span>
                <span className="text-xs font-black text-amber-500 mt-0.5">{plannedCount}</span>
              </button>
            </div>
          </div>
          
          {/* Detail Side-panel */}
          {selectedRoute ? (
            <div className="mission-card border border-[#69BFB7] bg-[#0d1414]/95 p-3.5 rounded-sm flex flex-col gap-3">
              <div className="flex justify-between items-start border-b border-[#69BFB7]/20 pb-2">
                <div>
                  <span className="text-[9px] font-mono text-[#69BFB7] uppercase tracking-wider block">
                    {selectedRoute.type} DETALLADO • MODELO DE RED
                  </span>
                  <h3 className="text-xs font-black text-white uppercase mt-0.5">
                    {getCampName(selectedRoute.origin)} ➔ {getCampName(selectedRoute.destination)}
                  </h3>
                </div>
                <button 
                  type="button" 
                  className="text-red-400 hover:text-white font-black text-xs px-1"
                  onClick={() => setSelectedRoute(null)}
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="p-2 bg-black/35 border border-[#67ACA9]/10 rounded-xs">
                  <span className="block text-[8px] text-[#A4C2C5]/50 uppercase font-mono">ID Registro</span>
                  <span className="font-bold text-white">{selectedRoute.id}</span>
                </div>
                <div className="p-2 bg-black/35 border border-[#67ACA9]/10 rounded-xs">
                  <span className="block text-[8px] text-[#A4C2C5]/50 uppercase font-mono">Estado Actual</span>
                  <span className={`font-bold ${selectedRoute.class === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-300'}`}>
                    {selectedRoute.statusText}
                  </span>
                </div>
              </div>

              <div className="text-[10px] flex flex-col gap-1 bg-black/50 p-2.5 rounded-sm border border-[#67ACA9]/10 font-mono">
                <div className="flex justify-between">
                  <span className="text-[#A4C2C5]/60">Motivo de Suministros:</span>
                  <span className="text-white font-sans">{selectedRoute.desc}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A4C2C5]/60">Salida Programada:</span>
                  <span className="text-white font-sans">{selectedRoute.plannedDeparture}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A4C2C5]/60">Llegada Estimada:</span>
                  <span className="text-white font-sans">{selectedRoute.plannedArrival}</span>
                </div>
                {selectedRoute.rations > 0 && (
                  <div className="flex justify-between border-t border-[#67ACA9]/10 pt-1 mt-1">
                    <span className="text-[#A4C2C5]/60">Raciones para el Convoy:</span>
                    <span className="text-cyan-300">{selectedRoute.rations} Raciones</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#A4C2C5]/60">Observaciones Revisor:</span>
                  <span className="text-white italic">{selectedRoute.receptionNotes}</span>
                </div>
              </div>

              <div className="flex gap-2">
                {onNavigateToTab && (
                  <Btn variant="primary" style={{ flex: 1 }} onClick={() => onNavigateToTab(selectedRoute.type === "TRASLADO" ? "Traslados" : "Solicitudes intercampamento")}>
                    🚚 Gestionar este trámite
                  </Btn>
                )}
                <button 
                  type="button" 
                  className="btn-text border border-[#67ACA9]/20 text-[10px] uppercase font-bold px-3 py-1 bg-transparent hover:bg-white/5 text-[#A4C2C5]"
                  onClick={() => setSelectedRoute(null)}
                >
                  Regresar
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#000000]/30 border border-[#67ACA9]/15 p-3 rounded-sm flex flex-col gap-1.5">
              <h3 className="text-[10px] font-black tracking-widest text-[#69BFB7] uppercase border-b border-[#67ACA9]/20 pb-1.5 mb-1.5 flex items-center justify-between">
                <span>📋 Traslados {statusFilter === "all" ? "Totales" : statusFilter === "completed" ? "Completados" : "Planeados"}</span>
                <span className="font-mono text-[8px] bg-[#67ACA9]/15 px-1.5 rounded-xs text-[#A4C2C5]">
                  {activeCampFilter === "all" ? "TODOS" : activeCampFilter.toUpperCase()}
                </span>
              </h3>

              {dotsToDisplay.length === 0 ? (
                <div className="text-[10px] text-[#A4C2C5]/40 italic p-6 text-center">
                  Ninguna conexión de transporte detectada para los filtros vigentes.
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {dotsToDisplay.map((dot, index) => {
                    if (!dot) return null;
                    return (
                      <div 
                        key={`${dot.meta.id}-${index}`}
                        className="group border border-[#67ACA9]/15 bg-[#0d1414]/55 hover:bg-[#67ACA9]/5 p-2 rounded-xs flex flex-col gap-1 text-[10px] cursor-pointer transition-colors"
                        onClick={() => setSelectedRoute(dot.meta)}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white uppercase tracking-tight text-[9px]">
                            {dot.meta.id} • {getCampName(dot.meta.origin)} ➔ {getCampName(dot.meta.destination)}
                          </span>
                          <span className={`text-[8px] font-mono font-bold uppercase ${dot.meta.class === "COMPLETED" ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {dot.meta.class === "COMPLETED" ? "Completado" : "Planeado"}
                          </span>
                        </div>
                        
                        <div className="text-[#A4C2C5]/70 truncate italic font-sans text-[9px]">
                          &ldquo;{dot.meta.desc}&rdquo;
                        </div>

                        <div className="flex justify-between text-[8px] font-mono text-[#A4C2C5]/40 mt-1 border-t border-[#67ACA9]/5 pt-1 group-hover:text-cyan-300">
                          <span>F. Estimada: {dot.meta.plannedArrival}</span>
                          <span>Tipo: {dot.meta.type}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* LOCAL CAMP STOCK (Since manager is limited to their camp context) */}
          {activeCampFilter !== "all" && (
            <div className="bg-black/45 border border-[#67ACA9]/20 p-3 rounded-sm">
              <h4 className="text-[10px] font-bold text-[#69BFB7] uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>📦 Reservas Locales de {getCampName(activeCampFilter)}</span>
                <span className="text-[8px] text-[#A4C2C5]/50 font-normal">Sincronizado</span>
              </h4>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono max-h-[120px] overflow-y-auto">
                {getCampDetails(activeCampFilter).map(item => {
                  const isCritical = item.currentAmount <= item.minimumAlertAmount;
                  return (
                    <div 
                      key={item.resourceTypeId} 
                      className={`p-1.5 flex justify-between items-center rounded-xs border ${isCritical ? 'border-red-500/30 bg-red-950/20 text-red-300' : 'border-[#67ACA9]/10 bg-black/20 text-white'}`}
                    >
                      <span className="truncate pr-1.5 text-[9px] text-[#A4C2C5]/85">{item.typeName}</span>
                      <strong className="shrink-0">{item.currentAmount} {item.unit}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
