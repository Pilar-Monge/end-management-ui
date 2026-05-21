// @ts-nocheck
import "./resource-control-panel.css";
import { useState, type ReactNode } from "react";
import type {
  Camp,
  ResourceType,
  CampInventory,
  DailyCollectionRecord,
  InventoryMovement,
  InventoryAlert,
  IntercampRequest,
  RequestResourceDetail,
  Transfer,
  TransferPerson,
  TransferHistory,
  ExpeditionResource,
  DeliveredTransferResource,
  Occupation,
  OccupationCoverage,
  OperationalNotification
} from "../types/resourceManagementTypes";
import {
  INITIAL_CAMPS,
  INITIAL_RESOURCE_TYPES,
  INITIAL_CAMP_INVENTORIES,
  INITIAL_DAILY_COLLECTIONS,
  INITIAL_MOVEMENTS,
  INITIAL_ALERTS,
  INITIAL_INTERCAMP_REQUESTS,
  INITIAL_REQUEST_RESOURCE_DETAILS,
  INITIAL_TRANSFERS,
  INITIAL_TRANSFER_PERSONS,
  INITIAL_EXPEDITIONS_RESOURCES,
  INITIAL_DELIVERED_TRANSFER_RESOURCES,
  INITIAL_OCCUPATIONS,
  INITIAL_OCCUPATION_COVERAGES,
  INITIAL_NOTIFICATIONS
} from "../data/resourceManagementData";
import {
  Btn,
  ViewDashboard,
  ViewInventarioCampamento,
  ViewRecoleccionDiaria,
  ViewMovimientosInventario,
  ViewAlertasInventario,
  ViewSolicitudesIntercampamento,
  ViewTraslados,
  ViewRecursosExpediciones,
  ViewRecursosEntregados,
  ViewTiposDeRecurso,
  ViewCampamentos,
  ViewOficiosCobertura,
  ViewNotificaciones,
  ViewDetalleRecursosSolicitados,
  ViewPersonasEnTraslado,
  ViewHistorialDeTraslado
} from "../views/ResourceManagementViews";
import { WorldMapDashboard } from "../views/WorldMapView";

// Navigation data mapping the 16 recommended modules for RESOURCE_MANAGEMENT into elegant groups
const NAVIGATION_DATA = [
  {
    id: "almacenes",
    label: "Almacenes",
    icon: <PackageIcon />,
    subOptions: [
      "Dashboard",
      "Inventario del campamento",
      "Tipos de recurso",
      "Campamentos"
    ]
  },
  {
    id: "operaciones",
    label: "Operaciones",
    icon: <ExchangeIcon />,
    subOptions: [
      "Recoleccion diaria",
      "Movimientos de inventario",
      "Alertas de inventario",
      "Recursos de expediciones"
    ]
  },
  {
    id: "logistica",
    label: "Logística y Traslados",
    icon: <TruckIcon />,
    subOptions: [
      "Solicitudes intercampamento",
      "Detalle de recursos solicitados",
      "Traslados",
      "Personas en traslado",
      "Historial de traslado",
      "Recursos entregados de traslado"
    ]
  },
  {
    id: "cobertura",
    label: "Personal",
    icon: <SquadIcon />,
    subOptions: [
      "Oficios y cobertura",
      "Notificaciones"
    ]
  }
];

interface ResourceControlPanelPageProps {
  onExit?: () => void;
}

export default function ResourceControlPanelPage({ onExit }: ResourceControlPanelPageProps) {
  const [hasEntered] = useState(true);

  const [activeNav, setActiveNav] = useState<string | null>("almacenes");
  const [activeSub, setActiveSub] = useState<string>("Dashboard");

  /* ════════════════ OPERATIONAL SYSTEM STATE ════════════════ */
  const [camps, setCamps] = useState<Camp[]>(INITIAL_CAMPS);
  const [resourceTypes, setResourceTypesState] = useState<ResourceType[]>(INITIAL_RESOURCE_TYPES);
  const [campInventories, setCampInventories] = useState<CampInventory[]>(INITIAL_CAMP_INVENTORIES);
  const [dailyCollectionRecords, setDailyCollectionRecords] = useState<DailyCollectionRecord[]>(INITIAL_DAILY_COLLECTIONS);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>(INITIAL_MOVEMENTS);
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryAlert[]>(INITIAL_ALERTS);
  const [intercampRequests, setIntercampRequests] = useState<IntercampRequest[]>(INITIAL_INTERCAMP_REQUESTS);
  const [requestResourceDetails, setRequestResourceDetails] = useState<RequestResourceDetail[]>(INITIAL_REQUEST_RESOURCE_DETAILS);
  const [transfers, setTransfers] = useState<Transfer[]>(INITIAL_TRANSFERS);
  const [transferPersons, setTransferPersons] = useState<TransferPerson[]>(INITIAL_TRANSFER_PERSONS);
  const [expeditionsResources, setExpeditionsResources] = useState<ExpeditionResource[]>(INITIAL_EXPEDITIONS_RESOURCES);
  const [deliveredTransferResources, setDeliveredTransferResources] = useState<DeliveredTransferResource[]>(INITIAL_DELIVERED_TRANSFER_RESOURCES);
  const [occupations] = useState<Occupation[]>(INITIAL_OCCUPATIONS);
  const [occupationCoverages, setOccupationCoverages] = useState<OccupationCoverage[]>(INITIAL_OCCUPATION_COVERAGES);
  const [notifications, setNotifications] = useState<OperationalNotification[]>(INITIAL_NOTIFICATIONS);
  const [transferHistories, setTransferHistories] = useState<TransferHistory[]>([
    {
      id: "th-1",
      transferId: "tr-1",
      previousStatus: "PENDING_DEPARTURE",
      newStatus: "COMPLETED",
      date: "2026-05-20T12:00:00Z",
      userId: "3",
      comment: "Traslado inicial completado satisfactoriamente."
    }
  ]);

  const handleNavClick = (navId: string) => {
    if (navId === "mapa") {
      setActiveNav(null);
    } else {
      setActiveNav(navId);
      const navItem = NAVIGATION_DATA.find((item) => item.id === navId);
      setActiveSub(navItem?.subOptions[0] || "");
    }
  };

  const handleInnerNavigation = (sub: string) => {
    const match = NAVIGATION_DATA.find((item) => item.subOptions.includes(sub));
    if (match) {
      setActiveNav(match.id);
    } else {
      setActiveNav(null);
    }
    setActiveSub(sub);
  };

  /* ════════════ STATE MUTATORS / API SIMULATION ════════════ */

  const handleUpdateInventory = (campId: string, resourceTypeId: string, currentAmount: number, minimumAlertAmount: number) => {
    setCampInventories(prev =>
      prev.map(item =>
        item.campId === campId && item.resourceTypeId === resourceTypeId
          ? { ...item, currentAmount, minimumAlertAmount }
          : item
      )
    );

    // If stock lowered beneath limit, create alert auto
    if (currentAmount <= minimumAlertAmount) {
      const alreadyHasAlert = inventoryAlerts.some(a => a.campId === campId && a.resourceTypeId === resourceTypeId && !a.resolved);
      if (!alreadyHasAlert) {
        const newAlert: InventoryAlert = {
          id: `al-${Date.now().toString().slice(-4)}`,
          campId,
          resourceTypeId,
          amountAtAlertGeneration: currentAmount,
          alertDate: new Date().toLocaleTimeString("es-ES") + " UTC",
          resolved: false
        };
        setInventoryAlerts(prev => [...prev, newAlert]);
        
        // Push notification of warning
        const newNot: OperationalNotification = {
          id: `not-${Date.now().toString().slice(-4)}`,
          campId,
          userId: "user-op",
          targetRole: "RESOURCE_MANAGEMENT",
          type: "ALERT",
          title: "Suministro Crítico",
          message: `El campamento detectó descenso crítico de recursos.`,
          read: false,
          createdDate: "Ahora"
        };
        setNotifications(prev => [newNot, ...prev]);
      }
    }
  };

  const handleSaveCollection = (data: Omit<DailyCollectionRecord, "id">) => {
    const newId = `col-${Date.now().toString().slice(-4)}`;
    const record: DailyCollectionRecord = { ...data, id: newId };
    setDailyCollectionRecords(prev => [...prev, record]);

    // Update inventory to match the gathered quantities
    setCampInventories(prev =>
      prev.map(item =>
        item.campId === data.campId && item.resourceTypeId === data.resourceTypeId
          ? { ...item, currentAmount: item.currentAmount + data.actualAmount }
          : item
      )
    );

    // Append to structural inventory movements too
    const newMovement: InventoryMovement = {
      id: `mov-${Date.now().toString().slice(-4)}`,
      campId: data.campId,
      resourceTypeId: data.resourceTypeId,
      amount: data.actualAmount,
      movementType: "DAILY_COLLECTION",
      sourceId: newId,
      sourceType: "DAILY_COLLECTION",
      recordedBy: data.recordedBy,
      date: "Hoy",
      description: `Ingreso por recolección regular: ${data.differenceReason}`
    };
    setInventoryMovements(prev => [...prev, newMovement]);
  };

  const handleAdjustRecord = (id: string, actualAmount: number, reason: string) => {
    setDailyCollectionRecords(prev =>
      prev.map(r => (r.id === id ? { ...r, actualAmount, differenceReason: reason } : r))
    );
  };

  const handleAddManualMovement = (data: Omit<InventoryMovement, "id">) => {
    const record: InventoryMovement = { ...data, id: `mov-${Date.now().toString().slice(-4)}` };
    setInventoryMovements(prev => [...prev, record]);

    // Recalculates inventory amount based on operation types
    const op = (data.movementType === "DAILY_RATION" || data.movementType === "EXPEDITION_DEPARTURE" || data.movementType === "TRANSFER_SENT") ? -1 : 1;
    setCampInventories(prev =>
      prev.map(item =>
        item.campId === data.campId && item.resourceTypeId === data.resourceTypeId
          ? { ...item, currentAmount: Math.max(0, item.currentAmount + (data.amount * op)) }
          : item
      )
    );
  };

  const handleDeleteMovement = (id: string) => {
    setInventoryMovements(prev => prev.filter(m => m.id !== id));
  };

  const handleResolveAlert = (id: string, resolvedBy: string) => {
    setInventoryAlerts(prev =>
      prev.map(a =>
        a.id === id
          ? { ...a, resolved: true, resolutionDate: new Date().toLocaleTimeString("es-ES") + " UTC", resolvedBy }
          : a
      )
    );
  };

  const handleAddRequest = (data: Omit<IntercampRequest, "id">) => {
    const record: IntercampRequest = { ...data, id: `req-${Date.now().toString().slice(-4)}` };
    setIntercampRequests(prev => [...prev, record]);
  };

  const handleUpdateRequestStatus = (id: string, status: IntercampRequest["status"], responder: string) => {
    setIntercampRequests(prev =>
      prev.map(r => (r.id === id ? { ...r, status, responseDate: "Hoy", respondedBy: responder } : r))
    );
  };

  const handleAddResourceToRequest = (requestId: string, resourceTypeId: string, requestedAmount: number) => {
    const record: RequestResourceDetail = {
      id: `det-${Date.now().toString().slice(-4)}`,
      requestId,
      resourceTypeId,
      requestedAmount,
      approvedAmount: requestedAmount
    };
    setRequestResourceDetails(prev => [...prev, record]);
  };

  const handleDeleteRequestResource = (id: string) => {
    setRequestResourceDetails(prev => prev.filter(d => d.id !== id));
  };

  const handleAddTransfer = (data: Omit<Transfer, "id">) => {
    const record: Transfer = { ...data, id: `tr-${Date.now().toString().slice(-4)}` };
    setTransfers(prev => [...prev, record]);
  };

  const handleUpdateTransferStatus = (id: string, status: Transfer["status"], notes: string) => {
    setTransfers(prev => {
      const match = prev.find(t => t.id === id);
      if (match && match.status !== status) {
        const newHistory: TransferHistory = {
          id: `th-${Date.now().toString().slice(-4)}`,
          transferId: id,
          previousStatus: match.status,
          newStatus: status,
          date: new Date().toISOString(),
          userId: "3",
          comment: notes || "Cambio de estado del convoy"
        };
        setTransferHistories(h => [...h, newHistory]);
      }
      return prev.map(t => (t.id === id ? { ...t, status, actualArrivalDate: new Date().toISOString(), receptionNotes: notes } : t));
    });
  };

  const handleAddPersonToTransfer = (transferId: string, personId: string) => {
    const record: TransferPerson = {
      id: `tp-${Date.now().toString().slice(-4)}`,
      transferId,
      personId,
      status: "CONFIRMED"
    };
    setTransferPersons(prev => [...prev, record]);
  };

  const handleUpdatePersonStatus = (id: string, status: TransferPerson["status"]) => {
    setTransferPersons(prev =>
      prev.map(p => (p.id === id ? { ...p, status } : p))
    );
  };

  const handleSaveExpeditionResource = (data: Omit<ExpeditionResource, "id">) => {
    const record: ExpeditionResource = { ...data, id: `er-${Date.now().toString().slice(-4)}` };
    setExpeditionsResources(prev => [...prev, record]);
  };

  const handleSaveDelivery = (data: Omit<DeliveredTransferResource, "id">) => {
    const record: DeliveredTransferResource = { ...data, id: `dl-${Date.now().toString().slice(-4)}` };
    setDeliveredTransferResources(prev => [...prev, record]);
  };

  const handleAutoAssign = (campId: string, occupationId: string) => {
    setOccupationCoverages(prev =>
      prev.map(cov =>
        cov.campId === campId && cov.occupationId === occupationId
          ? { ...cov, active: cov.active + 1 }
          : cov
      )
    );
  };

  const handleAddNotification = (data: Omit<OperationalNotification, "id">) => {
    const record: OperationalNotification = { ...data, id: `not-${Date.now().toString().slice(-4)}` };
    setNotifications(prev => [record, ...prev]);
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true, readDate: "Hoy" } : n))
    );
  };

  const activeNavData = NAVIGATION_DATA.find((item) => item.id === activeNav);

  // Dynamic content renderer based on the active side subscreen
  const renderContentArea = () => {
    switch (activeSub) {
      case "Dashboard":
        return (
          <ViewDashboard
            camps={camps}
            resourceTypes={resourceTypes}
            campInventories={campInventories}
            inventoryAlerts={inventoryAlerts}
            inventoryMovements={inventoryMovements}
            onNavigateToSub={handleInnerNavigation}
          />
        );
      case "Inventario del campamento":
        return (
          <ViewInventarioCampamento
            camps={camps}
            resourceTypes={resourceTypes}
            campInventories={campInventories}
            onUpdateInventory={handleUpdateInventory}
            onAddInventory={(data) => {
              setCampInventories(prev => {
                const exists = prev.some(item => item.campId === data.campId && item.resourceTypeId === data.resourceTypeId);
                if (exists) {
                  return prev.map(item => item.campId === data.campId && item.resourceTypeId === data.resourceTypeId ? data : item);
                }
                return [...prev, data];
              });
            }}
          />
        );
      case "Tipos de recurso":
        return (
          <ViewTiposDeRecurso
            resourceTypes={resourceTypes}
            onAddResourceType={(data) => {
              setResourceTypesState(prev => [...prev, data]);
            }}
            onUpdateResourceType={(id, updated) => {
              setResourceTypesState(prev => prev.map(rt => rt.id === id ? { ...rt, ...updated } : rt));
            }}
            onDeleteResourceType={(id) => {
              setResourceTypesState(prev => prev.filter(rt => rt.id !== id));
            }}
          />
        );
      case "Campamentos":
        return <ViewCampamentos camps={camps} />;
      case "Recoleccion diaria":
        return (
          <ViewRecoleccionDiaria
            camps={camps}
            resourceTypes={resourceTypes}
            dailyCollectionRecords={dailyCollectionRecords}
            onSaveRecord={handleSaveCollection}
            onAdjustRecord={handleAdjustRecord}
            onDeleteRecord={(id) => {
              setDailyCollectionRecords(prev => prev.filter(r => r.id !== id));
            }}
          />
        );
      case "Movimientos de inventario":
        return (
          <ViewMovimientosInventario
            camps={camps}
            resourceTypes={resourceTypes}
            inventoryMovements={inventoryMovements}
            onAddManualMovement={handleAddManualMovement}
            onDeleteMovement={handleDeleteMovement}
          />
        );
      case "Alertas de inventario":
        return (
          <ViewAlertasInventario
            camps={camps}
            resourceTypes={resourceTypes}
            inventoryAlerts={inventoryAlerts}
            onResolveAlert={handleResolveAlert}
          />
        );
      case "Recursos de expediciones":
        return (
          <ViewRecursosExpediciones
            resourceTypes={resourceTypes}
            expeditionsResources={expeditionsResources}
            onSaveExpeditionResource={handleSaveExpeditionResource}
          />
        );
      case "Solicitudes intercampamento":
        return (
          <ViewSolicitudesIntercampamento
            camps={camps}
            resourceTypes={resourceTypes}
            intercampRequests={intercampRequests}
            requestResourceDetails={requestResourceDetails}
            onAddRequest={handleAddRequest}
            onUpdateRequestStatus={handleUpdateRequestStatus}
            onAddResourceToRequest={handleAddResourceToRequest}
            onDeleteRequestResource={handleDeleteRequestResource}
          />
        );
      case "Detalle de recursos solicitados":
        return (
          <ViewDetalleRecursosSolicitados
            intercampRequests={intercampRequests}
            resourceTypes={resourceTypes}
            requestResourceDetails={requestResourceDetails}
            onAddResourceDetail={handleAddResourceToRequest}
            onUpdateResourceDetail={(id, updated) => {
              setRequestResourceDetails(prev => prev.map(d => d.id === id ? { ...d, ...updated } : d));
            }}
            onDeleteResourceDetail={handleDeleteRequestResource}
          />
        );
      case "Traslados":
        return (
          <ViewTraslados
            camps={camps}
            intercampRequests={intercampRequests}
            transfers={transfers}
            transferPersons={transferPersons}
            onAddTransfer={handleAddTransfer}
            onUpdateTransferStatus={handleUpdateTransferStatus}
            onAddPersonToTransfer={handleAddPersonToTransfer}
            onUpdatePersonStatus={handleUpdatePersonStatus}
          />
        );
      case "Personas en traslado":
        return (
          <ViewPersonasEnTraslado
            transfers={transfers}
            transferPersons={transferPersons}
            onAddPersonToTransfer={handleAddPersonToTransfer}
            onUpdatePersonStatus={(id, updated) => {
              setTransferPersons(prev => prev.map(tp => tp.id === id ? { ...tp, ...updated } : tp));
            }}
          />
        );
      case "Historial de traslado":
        return (
          <ViewHistorialDeTraslado
            transfers={transfers}
            transferHistories={transferHistories}
            onAddHistoryEntry={(data) => {
              setTransferHistories(prev => [...prev, {
                ...data,
                id: `th-${Date.now().toString().slice(-4)}`
              }]);
            }}
          />
        );
      case "Recursos entregados de traslado":
        return (
          <ViewRecursosEntregados
            transfers={transfers}
            resourceTypes={resourceTypes}
            deliveredTransferResources={deliveredTransferResources}
            onSaveDelivery={handleSaveDelivery}
          />
        );
      case "Oficios y cobertura":
        return (
          <ViewOficiosCobertura
            camps={camps}
            occupations={occupations}
            occupationCoverages={occupationCoverages}
            onAutoAssign={handleAutoAssign}
          />
        );
      case "Notificaciones":
        return (
          <ViewNotificaciones
            camps={camps}
            notifications={notifications}
            onAddNotification={handleAddNotification}
            onMarkAsRead={handleMarkAsRead}
          />
        );
      default:
        return (
          <div className="text-center p-6 text-xs text-[#A4C2C5]/40 italic">
            Módulo en calibración táctica...
          </div>
        );
    }
  };

  // Convert simplified structure to match retro tactical map expectations
  const adapterMapResources = campInventories.map((ci, index) => {
    const rt = resourceTypes.find(t => t.id === ci.resourceTypeId);
    return {
      id: `${ci.campId}-${ci.resourceTypeId}`,
      category: (rt ? rt.name : ci.resourceTypeId) as any,
      depot: (camps.find(c => c.id === ci.campId)?.name || ci.campId) as any,
      amount: ci.currentAmount,
      unit: rt ? rt.unitOfMeasure : "u",
      threshold: ci.minimumAlertAmount
    };
  });

  return (
    <div className="game-screen-layout text-[#A4C2C5]">
      <div className="holo-grid" />

      {/* TOP HUD */}
      {hasEntered && <TopHud onExit={onExit} />}

      {/* MAIN WORKSPACE */}
      {hasEntered && (
        <div className="main-area">
          {activeNavData ? (
            <div className="content-scroll">
              <SectionTitle title={activeNavData.label} />
              <section aria-label="Panel principal de recursos" className="settings-shell h-full w-full">
                <div className="paint-glow" role="presentation" />
                <div className="settings-inner h-full" style={{ padding: "42px 0 0 0", overflow: "hidden" }}>
                  <div className="watermark-x" role="presentation" />
                  <div className="inner-layout">
                    <aside className="inner-sidebar pl-1.5 pt-4">
                      {/* Adapt sidebar menu dynamically from the new nested specification */}
                      <SideMenu
                        items={activeNavData.subOptions}
                        activeItem={activeSub}
                        onSelect={setActiveSub}
                      />
                    </aside>
                    <div className="inner-divider" />
                    <div className="inner-content">
                      {renderContentArea()}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            /* DYNAMIC MAP OF RED NODES */
            <div className="content-scroll">
              <SectionTitle title="Mapa Operativo de Suministros" />
              <section aria-label="Mapa de distribución de red" className="settings-shell h-full w-full">
                <div className="paint-glow" role="presentation" />
                <div className="settings-inner h-full" style={{ padding: "42px 0 0 0", overflow: "hidden" }}>
                  <div className="watermark-x" role="presentation" />
                  <div className="inner-content" style={{ padding: "16px 20px" }}>
                    <WorldMapDashboard
                      camps={camps}
                      intercampRequests={intercampRequests}
                      transfers={transfers}
                      resourceTypes={resourceTypes}
                      campInventories={campInventories}
                      onNavigateToTab={handleInnerNavigation}
                    />
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      )}

      {/* BOTTOM NAV BAR SPLIT WITH NEWLY CONFIGURED ICON SECTIONS */}
      {hasEntered && (
        <>
          <BottomDock activeDock={activeNav || "mapa"} onSelect={handleNavClick} />
          <SettingsHint />
        </>
      )}
    </div>
  );
}

function TopHud({ onExit }: { onExit?: () => void }) {
  return (
    <header className="game-hud-header pointer-events-none flex items-center justify-between px-3 pt-3 pb-2 text-[10px] font-black uppercase tracking-[-0.02em] text-[#A4C2C5]/80">
      <div className="flex items-center gap-2" />
      <button className="pointer-events-auto top-hud-btn" type="button" onClick={onExit}>
        <span className="btn-text">
          VOLVER AL HANGAR
          <span className="logout-mark" aria-hidden="true" />
        </span>
      </button>
    </header>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="section-header">
      <div
        className="section-title-brush"
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateY(25deg) translateZ(10px)",
        }}
      >
        <span className="btn-text">{title}</span>
      </div>
    </div>
  );
}

function SideMenu({ items, activeItem, onSelect }: { items: string[]; activeItem: string; onSelect: (item: string) => void }) {
  return (
    <nav aria-label="Resource sub-options" className="w-full pl-2 pt-2 h-full flex flex-col">
      <div className="flex flex-col gap-[10px] perspective-[800px]">
        {items.map((item) => (
          <button
            className={`side-button ${activeItem === item ? "is-active" : ""} relative`}
            key={item}
            onClick={() => onSelect(item)}
            type="button"
            style={{
              transformStyle: "preserve-3d",
              transform: "rotateY(20deg) translateZ(8px)",
            }}
          >
            <span className="btn-text text-[13px] uppercase tracking-wider whitespace-normal leading-normal py-1 pr-1.5 drop-shadow-md">{item}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function BottomDock({ activeDock, onSelect }: { activeDock: string; onSelect: (id: string) => void }) {
  const items = [
    { id: "mapa", label: "Mapa Operativo de Suministros", subtext: "MAPA", icon: <CompassIcon /> },
    { id: "almacenes", label: "Almacenes", subtext: "ALMACENES", icon: <PackageIcon /> },
    { id: "operaciones", label: "Operaciones", subtext: "OPERACIONES", icon: <ExchangeIcon /> },
    { id: "logistica", label: "Logística y Traslados", subtext: "LOGÍSTICA", icon: <TruckIcon /> },
    { id: "cobertura", label: "Personal", subtext: "PERSONAL", icon: <SquadIcon /> }
  ];

  return (
    <footer aria-label="Game navigation" className="dock justify-center flex gap-6">
      {items.map((item) => (
        <button
          aria-label={item.label}
          className={`dock-item ${activeDock === item.id ? "is-active" : ""}`}
          key={item.id}
          onClick={() => onSelect(item.id)}
          type="button"
        >
          <span className="dock-content flex flex-col items-center gap-1">
            {item.icon}
            <span className="text-[7px] uppercase font-bold tracking-widest leading-none drop-shadow-md">
              {item.subtext}
            </span>
          </span>
        </button>
      ))}
    </footer>
  );
}

function SupportLink() {
  return (
    <button className="support-link" type="button">
      <span className="btn-text"><span>?</span> ROBUST</span>
    </button>
  );
}

function SettingsHint() {
  return (
    <button className="settings-hint" type="button">
      <span className="btn-text">ONLINE <GearIcon /></span>
    </button>
  );
}

function IconSvg({ children, className = "h-6 w-6" }: { children: ReactNode; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 32 32"
    >
      {children}
    </svg>
  );
}

function CompassIcon() {
  return (
    <IconSvg>
      <path d="M16 3v26M3 16h26" />
      <path d="m16 7 4.5 9L16 25l-4.5-9L16 7Z" />
      <path d="m7 7 18 18M25 7 7 25" />
    </IconSvg>
  );
}

function PackageIcon() {
  return (
    <IconSvg>
      <path d="M6 10l10-5 10 5-10 5-10-5z" />
      <path d="M6 10v12l10 5v-12" />
      <path d="M26 10v12l-10 5v-12" />
      <path d="M11 7.5l10 5" />
    </IconSvg>
  );
}

function ExchangeIcon() {
  return (
    <IconSvg>
      <path d="M5 10h22M27 10l-6-6M27 10l-6 6" />
      <path d="M27 22H5M5 22l6-6M5 22l6 6" />
    </IconSvg>
  );
}

function TruckIcon() {
  return (
    <IconSvg>
      <path d="M4 18h20v-8H4v8z" />
      <path d="M24 14h4l1.5 2V18h-5.5" strokeLinecap="square" />
      <circle cx="8" cy="22" r="3" />
      <circle cx="20" cy="22" r="3" />
    </IconSvg>
  );
}

function GearIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 8.2A3.8 3.8 0 1 0 12 15.8 3.8 3.8 0 0 0 12 8.2Zm8.5 4.6v-1.6l-2.3-.8a6.8 6.8 0 0 0-.7-1.6l1-2.2-1.1-1.1-2.2 1a7 7 0 0 0-1.6-.7L12.8 3h-1.6l-.8 2.3a7 7 0 0 0-1.6.7l-2.2-1-1.1 1.1 1 2.2a6.8 6.8 0 0 0-.7 1.6l-2.3.8v1.6l2.3.8c.2.6.4 1.1.7 1.6l-1 2.2 1.1 1.1 2.2-1c.5.3 1 .5 1.6.7l.8 2.3h1.6l.8-2.3c.6-.2 1.1-.4 1.6-.7l2.2 1 1.1-1.1-1-2.2c.3-.5.5-1 .7-1.6l2.3-.8Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function SquadIcon() {
  return (
    <IconSvg>
      {/* Hex/circular themed guard personnel cohort */}
      <circle cx="16" cy="11" r="4" />
      <path d="M7 28v-2a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v2" />
      <circle cx="7" cy="15" r="3" />
      <path d="M2 24v-1a2 2 0 0 1 2-2h3" />
      <circle cx="25" cy="15" r="3" />
      <path d="M25 21h3a2 2 0 0 1 2 2v1" />
    </IconSvg>
  );
}
