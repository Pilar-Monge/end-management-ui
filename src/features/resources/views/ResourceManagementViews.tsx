import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Calendar, 
  Info, 
  TrendingUp, 
  Package, 
  ArrowRightLeft, 
  Shuffle, 
  UserCheck 
} from "lucide-react";
import {
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart, BarChart, Bar
} from "recharts";
import { apiRequest } from "../../../shared/services/httpClient";
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

const sessionUserRaw = typeof window !== 'undefined' ? localStorage.getItem("session_user") : null;
const sessionUserObj = sessionUserRaw ? JSON.parse(sessionUserRaw) : null;

export const currentUser = {
  userId: sessionUserObj?.userId ? Number(sessionUserObj.userId) : 3,
  campId: sessionUserObj?.campId ? Number(sessionUserObj.campId) : 1,
  rol: "RESOURCE_MANAGEMENT" as const
};

export const MAP_RESOURCE_ID_TO_STR: Record<number, string> = {
  1: "1",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6"
};

export const MAP_RESOURCE_STR_TO_ID: Record<string, number> = {
  "rt-food": 1,
  "rt-water": 2,
  "rt-medical": 3,
  "rt-defense": 4,
  "rt-fuel": 5,
  "rt-parts": 6,
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6
};

function unwrapListPayload<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== "object") return [];
  const data = payload as Record<string, unknown>;
  if (Array.isArray(data.items)) return data.items as T[];
  if (Array.isArray(data.data)) return data.data as T[];
  if (Array.isArray(data.records)) return data.records as T[];
  if (Array.isArray(data.results)) return data.results as T[];
  return [];
}

export function Btn({
  children,
  variant = "primary",
  onClick,
  small,
  style,
  disabled,
  type = "button",
  className
}: {
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "danger" | "success" | "warning";
  onClick?: () => void;
  small?: boolean;
  style?: React.CSSProperties;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
}) {
  const base = small 
    ? "px-1.5 py-0.5 text-[10px]" 
    : "px-3 py-1.5 text-[11.5px] lg:text-[13px]";
  const colors = {
    primary: "bg-[#67ACA9] text-white hover:bg-[#69BFB7]",
    danger: "bg-red-600/40 text-red-200 border border-red-500/40 hover:bg-red-500/50",
    success: "bg-emerald-600/40 text-emerald-100 border border-emerald-500/40 hover:bg-emerald-500/50",
    warning: "bg-amber-600/40 text-amber-100 border border-amber-500/40 hover:bg-amber-500/50",
    ghost: "bg-[#67ACA9]/15 text-[#A4C2C5] border border-[#67ACA9]/40 hover:bg-[#67ACA9]/25",
  }[variant];
  return (
    <button
      onClick={onClick}
      style={style}
      disabled={disabled}
      className={`v-btn ${base} ${colors} font-bold uppercase tracking-wide rounded-sm transition-all whitespace-normal break-words sm:whitespace-nowrap ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className || ""}`}
      type={type}
    >
      {children}
    </button>
  );
}

const CHART_THEME = {
  teal: "#69BFB7",
  grid: "rgba(103,172,169,0.12)",
  text: "rgba(164,194,197,0.6)",
};

const chartTooltipStyle = {
  contentStyle: { background: "rgba(4,14,14,0.92)", border: "1px solid rgba(105,191,183,0.4)", fontSize: 11 },
  labelStyle: { color: "#69BFB7", fontWeight: 700 },
};

export function StatusIndicator({ status }: { status: "EXCELENTE" | "ESTABLE" | "ALERTA" | "CRITICO" }) {
  const styles = {
    EXCELENTE: "bg-emerald-950/40 text-emerald-300 border-emerald-500/30",
    ESTABLE: "bg-blue-950/40 text-blue-300 border-blue-500/30",
    ALERTA: "bg-amber-950/40 text-amber-300 border-amber-500/30 font-bold animate-pulse",
    CRITICO: "bg-red-950/40 text-red-300 border-red-500/35 font-black uppercase animate-pulse border-2",
  }[status];

  return (
    <span className={`inline-block rounded-sm border px-2 py-0.5 text-[8px] tracking-wider uppercase ${styles}`}>
      {status}
    </span>
  );
}

export function DateTimeField({ 
  label, 
  required, 
  value = "",
  onChange
}: {
  label: string;
  required?: boolean;
  value?: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const initialDate = value ? new Date(value) : new Date();
  const initY = isNaN(initialDate.getTime()) ? 2026 : initialDate.getFullYear();
  const initM = isNaN(initialDate.getTime()) ? 4 : initialDate.getMonth();
  const initD = isNaN(initialDate.getTime()) ? "24" : String(initialDate.getDate());
  const initH = isNaN(initialDate.getTime()) ? "08" : String(initialDate.getHours()).padStart(2, "0");
  const initMin = isNaN(initialDate.getTime()) ? "00" : String(initialDate.getMinutes()).padStart(2, "0");

  const [day, setDay] = useState(initD);
  const [hour, setHour] = useState(initH);
  const [minute, setMinute] = useState(initMin);
  const [month, setMonth] = useState(initM);
  const [year, setYear] = useState(initY);

  useEffect(() => {
    const d = value ? new Date(value) : new Date();
    if (!isNaN(d.getTime())) {
      setYear(d.getFullYear());
      setMonth(d.getMonth());
      setDay(String(d.getDate()));
      setHour(String(d.getHours()).padStart(2, "0"));
      setMinute(String(d.getMinutes()).padStart(2, "0"));
    }
  }, [value]);

  const monthNames = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];

  const days = [
    "26", "27", "28", "29", "30", "31", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", 
    "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", 
    "24", "25", "26", "27", "28", "29", "30", "1", "2", "3", "4", "5", "6"
  ];
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
  const years = Array.from({ length: 7 }, (_, i) => 2024 + i);

  const updateCombined = (newYr: number, newMo: number, newDy: string, newHr: string, newMin: string) => {
    const dObj = new Date(newYr, newMo, parseInt(newDy) || 1, parseInt(newHr) || 0, parseInt(newMin) || 0);
    onChange(dObj.toISOString());
  };

  const handleSelectDay = (item: string) => {
    setDay(item);
    updateCombined(year, month, item, hour, minute);
  };

  const handleSelectHour = (item: string) => {
    setHour(item);
    updateCombined(year, month, day, item, minute);
  };

  const handleSelectMinute = (item: string) => {
    setMinute(item);
    updateCombined(year, month, day, hour, item);
  };

  const prevMonth = () => {
    let nextM = month - 1;
    let nextY = year;
    if (nextM < 0) {
      nextM = 11;
      nextY = year - 1;
    }
    setMonth(nextM);
    setYear(nextY);
    updateCombined(nextY, nextM, day, hour, minute);
  };

  const nextMonth = () => {
    let nextM = month + 1;
    let nextY = year;
    if (nextM > 11) {
      nextM = 0;
      nextY = year + 1;
    }
    setMonth(nextM);
    setYear(nextY);
    updateCombined(nextY, nextM, day, hour, minute);
  };

  return (
    <div className="v-field dt-shell">
      <span className="v-field-label">
        {label}
        {required && <span className="text-[#69BFB7]"> *</span>}
      </span>
      <button
        ref={triggerRef}
        className="dt-trigger"
        type="button"
        onClick={() => setOpen(!open)}
      >
        <span>{monthNames[month].toUpperCase()} {day}, {year}</span>
        <span className="dt-time">{hour}:{minute}</span>
        <span className="dt-icon">▼</span>
      </button>

      {open && createPortal(
        <div className="dt-portal-root">
          <div className="dt-backdrop" onClick={() => setOpen(false)} />
          <div
            className="dt-popover font-mono text-[#f0fafa]"
            style={{ 
              position: "fixed", 
              top: "50%", 
              left: "50%", 
              transform: "translate(-50%, -50%)", 
              width: 500,
              maxWidth: "95vw"
            }}
          >
            <div className="dt-head">
              <div className="dt-head-left">
                <button type="button" className="dt-nav-btn" onClick={prevMonth}>‹</button>
                <span className="uppercase text-xs font-bold text-[#69BFB7]">{monthNames[month]} de {year}</span>
                <button type="button" className="dt-nav-btn" onClick={nextMonth}>›</button>
              </div>
              <div className="dt-head-right">
                <select 
                  className="dt-year-select" 
                  value={year} 
                  onChange={(e) => {
                    const y = Number(e.target.value);
                    setYear(y);
                    updateCombined(y, month, day, hour, minute);
                  }}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <button type="button" className="dt-close" onClick={() => setOpen(false)}>✕</button>
              </div>
            </div>

            <div className="dt-body">
              <div className="dt-cal">
                <div className="dt-week text-center">
                  <span>LU</span><span>MA</span><span>MI</span><span>JU</span><span>VI</span><span>SA</span><span>DO</span>
                </div>
                <div className="dt-days">
                  {days.map((item, index) => (
                    <button
                      key={`${item}-${index}`}
                      type="button"
                      className={item === day ? "is-active" : ""}
                      onClick={() => handleSelectDay(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="dt-time-col" data-label="HORA">
                {hours.map((item) => (
                  <button 
                    key={`h-${item}`} 
                    type="button" 
                    className={item === hour ? "is-active" : ""} 
                    onClick={() => handleSelectHour(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="dt-time-col" data-label="MIN">
                {minutes.map((item) => (
                  <button 
                    key={`m-${item}`} 
                    type="button" 
                    className={item === minute ? "is-active" : ""} 
                    onClick={() => handleSelectMinute(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="dt-actions">
              <button 
                type="button" 
                onClick={() => {
                  const nowStr = new Date().toISOString();
                  onChange(nowStr);
                  setOpen(false);
                }}
              >
                REINICIAR
              </button>
              <button 
                type="button" 
                className="dt-today-btn" 
                onClick={() => {
                  const nowStr = new Date().toISOString();
                  onChange(nowStr);
                  setOpen(false);
                }}
              >
                HOY
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function SectionShell({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  if (!currentUser.userId || !currentUser.campId) {
    return (
      <div className="v-page res-management px-2 flex justify-center items-center py-20">
        <div className="mission-card border-2 border-red-500/40 bg-[#090303]/90 p-8 rounded text-center max-w-sm sm:max-w-md">
          <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto mb-4 animate-bounce" />
          <h3 className="text-sm sm:text-base font-black text-rose-400 uppercase tracking-wider">Sesión Expirada o Inválida</h3>
          <p className="text-[11px] sm:text-xs text-[#A4C2C5]/70 mt-2 leading-relaxed">
            Se requiere una identificación de sesión de guardia autorizada para acceder al sistema táctico de gestión de recursos.
          </p>
          <div className="mt-6 border-t border-[#67ACA9]/10 pt-4">
            <p className="text-[9px] text-rose-400 font-mono italic">
              Código de error: AUTH_SESSION_MISSING • RESOURCE_MANAGEMENT
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="v-page res-management px-2">
      <div className="mission-brief mb-4">
        <div>
          <span className="mission-kicker text-[#69BFB7] text-[10px] font-bold uppercase tracking-[3px] block mb-1">
            {kicker}
          </span>
          <h2 className="font-black uppercase text-[#f0fafa] tracking-tight break-words leading-tight">{title}</h2>
        </div>
      </div>
      <div className="mission-stack flex flex-col gap-5">{children}</div>
    </div>
  );
}


const getResourceTypeCategoryLabel = (cat: string) => {
  const labels: Record<string, string> = {
    FOOD: "ALIMENTO",
    WATER: "AGUA CORRIENTE",
    HYGIENE: "HIGIENE",
    DEFENSE: "DEFENSA",
    AMMUNITION: "MUNICIÓN",
    MEDICAL: "MÉDICO",
    OTHER: "OTROS INSUMOS"
  };
  return labels[cat] || cat;
};




export function ViewDashboard({
  camps,
  resourceTypes,
  campInventories,
  inventoryAlerts,
  inventoryMovements,
  dailyCollectionRecords = [],
  intercampRequests = [],
  transfers = [],
  notifications = [],
  onSaveCollection,
  onAddManualMovement,
  onAddRequest,
  onAddNotification,
  onMarkAsRead,
  onResolveAlert,
  onUpdateInventory,
  onNavigateToSub,
  externalTime,
  syncStatus
}: {
  camps: Camp[];
  resourceTypes: ResourceType[];
  campInventories: CampInventory[];
  inventoryAlerts: InventoryAlert[];
  inventoryMovements: InventoryMovement[];
  dailyCollectionRecords?: DailyCollectionRecord[];
  intercampRequests?: IntercampRequest[];
  transfers?: Transfer[];
  notifications?: OperationalNotification[];
  onSaveCollection?: (data: Omit<DailyCollectionRecord, "id">) => void;
  onAddManualMovement?: (data: Omit<InventoryMovement, "id">) => void;
  onAddRequest?: (data: Omit<IntercampRequest, "id">) => void;
  onAddNotification?: (data: Omit<OperationalNotification, "id">) => void;
  onMarkAsRead?: (id: string) => void;
  onResolveAlert?: (id: string, resolvedBy: string) => void;
  onUpdateInventory?: (campId: string, resourceTypeId: string, currentAmount: number, minimumAlertAmount: number) => void;
  onNavigateToSub: (sub: string) => void;
  externalTime?: Date;
  syncStatus?: 'synced' | 'syncing' | 'error';
}) {
  const activeCampId = String(currentUser.campId); 
  const campName = camps.find(c => c.id === activeCampId)?.name || "Alpha Bunker";


  const [isRefreshing, setIsRefreshing] = useState(false);
  const triggerRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };


  const [localSystTime, setLocalSystTime] = useState(new Date());

  useEffect(() => {
    if (externalTime) return;
    const clockInterval = setInterval(() => {
      setLocalSystTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, [externalTime]);

  const systTime = externalTime || localSystTime;

  const getNextUtcMidnight = (nowDate: Date): Date => {
    return new Date(Date.UTC(
      nowDate.getUTCFullYear(),
      nowDate.getUTCMonth(),
      nowDate.getUTCDate() + 1,
      0,
      0,
      0,
      0
    ));
  };

  const nextMidnight = getNextUtcMidnight(systTime);
  const remainingMs = Math.max(0, nextMidnight.getTime() - systTime.getTime());

  const formatRemaining = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimerStatus = (ms: number) => {
    const hours = ms / 3600000;
    const minutes = ms / 60000;
    if (hours > 2) {
      return { 
        label: "Ciclo diario pendiente", 
        color: "border-[#67ACA9]/20 text-emerald-300 bg-emerald-950/20" 
      };
    } else if (minutes > 5) {
      return { 
        label: "La recolección diaria está próxima", 
        color: "border-amber-500/30 text-amber-300 bg-amber-950/25 animate-pulse" 
      };
    } else {
      return { 
        label: "El ciclo diario está por ejecutarse", 
        color: "border-rose-500/40 text-rose-300 bg-rose-950/40 animate-pulse font-black" 
      };
    }
  };

  const statusStyle = getTimerStatus(remainingMs);


  const [activeTab, setActiveTab] = useState<"inventario" | "alertas" | "movimientos" | "recoleccion" | "solicitudes">("inventario");
  const [pageInventario, setPageInventario] = useState(1);
  const [pageAlertas, setPageAlertas] = useState(1);
  const [pageMovimientos, setPageMovimientos] = useState(1);
  const [pageRecoleccion, setPageRecoleccion] = useState(1);
  const [pageSolicitudes, setPageSolicitudes] = useState(1);
  const pageSize = 5;


  const [showNotificationPopup, setShowNotificationPopup] = useState(false);


  const activeCampInventories = campInventories.filter(item => item.campId === activeCampId);
  const unresolvedAlerts = inventoryAlerts.filter(a => !a.resolved && a.campId === activeCampId);
  

  const detailedResources = activeCampInventories.map(inv => {
    const type = resourceTypes.find(t => t.id === inv.resourceTypeId);
    const state = inv.currentAmount <= inv.minimumAlertAmount ? "CRÍTIICO" : "NORMAL";
    return {
      ...inv,
      type,
      state
    };
  });


  const highestStockResource = detailedResources.length > 0 
    ? [...detailedResources].sort((a, b) => b.currentAmount - a.currentAmount)[0] 
    : null;
  const zeroStockResources = detailedResources.filter(r => r.currentAmount === 0);


  const categoriesMap = detailedResources.reduce((acc, curr) => {
    const cat = curr.type?.category || "OTHER";
    acc[cat] = (acc[cat] || 0) + curr.currentAmount;
    return acc;
  }, {} as Record<string, number>);

  const resourcePieData = Object.entries(categoriesMap).map(([key, val]) => {
    const label = getResourceTypeCategoryLabel(key);
    return { name: label, value: Math.round(val) };
  });

  const totalResourceStocks = resourcePieData.reduce((sum, item) => sum + item.value, 0);



  const consumptionMovements = inventoryMovements.filter(m => 
    m.campId === activeCampId && 
    ["DAILY_RATION", "EXPEDITION_DEPARTURE", "TRANSFER_SENT"].includes(m.movementType)
  );


  const defaultDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const consumptionTrendMap = consumptionMovements.reduce((acc, curr) => {

    let dateStr = curr.date;
    if (curr.date.includes("/")) {
      const parts = curr.date.split(" ")[0].split("/");
      dateStr = `2026-${parts[1]}-${parts[0]}`;
    } else if (curr.date.includes("T")) {
      dateStr = curr.date.split("T")[0];
    }
    acc[dateStr] = (acc[dateStr] || 0) + Number(curr.amount);
    return acc;
  }, {} as Record<string, number>);

  const dynamicTrendData = defaultDates.map(date => {
    const formattedLabel = date.split("-").slice(1).reverse().join("/"); 
    return {
      date: formattedLabel,
      totalConsumed: consumptionTrendMap[date] || 0
    };
  });

  const totalConsumed7Days = dynamicTrendData.reduce((sum, item) => sum + item.totalConsumed, 0);
  const highestConsumptionDay = dynamicTrendData.length > 0 
    ? [...dynamicTrendData].sort((a, b) => b.totalConsumed - a.totalConsumed)[0] 
    : { date: "—", totalConsumed: 0 };



  const filteredTransfers = transfers.filter(t => {
    const req = intercampRequests.find(r => r.id === t.requestId);
    return req && (req.originCampId === activeCampId || req.destinationCampId === activeCampId);
  }).slice(-5).reverse();


  const fieldWarnings: string[] = [];
  unresolvedAlerts.forEach(al => {
    const type = resourceTypes.find(t => t.id === al.resourceTypeId);
    fieldWarnings.push(`Alerta de stock crítico: El recurso "${type?.name || al.resourceTypeId}" está por debajo del mínimo de seguridad.`);
  });
  intercampRequests.filter(req => req.status === "PENDING" && req.destinationCampId === activeCampId).forEach(req => {
    fieldWarnings.push(`Requisición pendiente: Solicitud de traslado ${req.id} requiere respuesta autorizada.`);
  });
  transfers.filter(t => (t.status === "PLANNING" || t.status === "EN_ROUTE") && intercampRequests.find(r => r.id === t.requestId)?.originCampId === activeCampId).forEach(t => {
    fieldWarnings.push(`Despacho pendiente: Traslado ${t.id} listo para la firma de despacho.`);
  });



  const paginatedInventario = detailedResources.slice((pageInventario - 1) * pageSize, pageInventario * pageSize);
  const totalPageInventario = Math.ceil(detailedResources.length / pageSize) || 1;


  const paginatedAlertas = unresolvedAlerts.slice((pageAlertas - 1) * pageSize, pageAlertas * pageSize);
  const totalPageAlertas = Math.ceil(unresolvedAlerts.length / pageSize) || 1;


  const activeCampMovements = inventoryMovements.filter(m => m.campId === activeCampId).reverse();
  const paginatedMovimientos = activeCampMovements.slice((pageMovimientos - 1) * pageSize, pageMovimientos * pageSize);
  const totalPageMovimientos = Math.ceil(activeCampMovements.length / pageSize) || 1;


  const activeCampCollections = dailyCollectionRecords.filter(c => String(c.campId) === activeCampId).reverse();
  const paginatedRecoleccion = activeCampCollections.slice((pageRecoleccion - 1) * pageSize, pageRecoleccion * pageSize);
  const totalPageRecoleccion = Math.ceil(activeCampCollections.length / pageSize) || 1;


  const activeCampRequests = intercampRequests.filter(r => r.originCampId === activeCampId || r.destinationCampId === activeCampId).reverse();
  const paginatedSolicitudes = activeCampRequests.slice((pageSolicitudes - 1) * pageSize, pageSolicitudes * pageSize);
  const totalPageSolicitudes = Math.ceil(activeCampRequests.length / pageSize) || 1;

  return (
    <SectionShell kicker="CENTRAL DE OPERACIONES" title="Dashboard de Recursos">
      
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-sm font-black tracking-widest text-[#69BFB7] uppercase">Panel de Control Operativo</h2>
        <Btn onClick={triggerRefresh}>Refrescar datos</Btn>
      </div>

      
      <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm flex flex-col gap-3 shadow-md">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <span className="text-[8.5px] font-mono text-[#69BFB7] font-bold uppercase tracking-wider block">CONSOLA OPERATIVA</span>
            <h3 className="text-xs font-bold text-white uppercase mt-0.5">Control de Abastecimiento</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn 
              small 
              onClick={() => onNavigateToSub("Movimientos de inventario")}
            >
              Ajustar Movimiento
            </Btn>
            <Btn 
              small
              variant="danger"
              onClick={() => onNavigateToSub("Alertas de inventario")}
            >
              Alertas ({unresolvedAlerts.length})
            </Btn>
            <Btn 
              small
              variant="ghost" 
              onClick={() => onNavigateToSub("Inventario del campamento")}
            >
              Ver Inventario
            </Btn>
          </div>
        </div>
      </div>

      
      <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/95 p-4 rounded-sm shadow-md flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-[#67ACA9]/10 pb-3">
          <div>
            <div className="flex items-center gap-1.5 text-[8.5px] font-mono text-[#69BFB7] font-bold uppercase tracking-wider">
              <Clock className="h-3 w-3 text-[#69BFB7]" />
              Cronograma Operativo Automatizado
            </div>
            <h3 className="text-xs font-black text-white uppercase mt-0.5">Próxima Recolección y Consumo Diario</h3>
          </div>
          
          <div className={`px-2.5 py-1 rounded-sm border text-[9px] font-mono uppercase font-bold tracking-wide flex items-center gap-1.5 ${statusStyle.color}`}>
            <span className={`h-1.5 w-1.5 rounded-full bg-current ${remainingMs <= 300000 ? 'animate-ping' : ''}`} />
            {statusStyle.label}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          
          <div className="bg-black/30 border border-[#67ACA9]/10 p-3 rounded-xs flex flex-col justify-between">
            <span className="text-[8px] font-mono text-[#A4C2C5]/50 uppercase tracking-wider block mb-1">Cálculo de Siguiente Ciclo Neto</span>
            <div className="flex flex-col justify-center py-1">
              <div className="text-xl font-black text-[#69BFB7] font-mono tracking-tight leading-none">
                {formatRemaining(remainingMs)}
              </div>
              <span className="text-[7.5px] text-[#A4C2C5]/40 mt-1 uppercase font-mono block">restantes para medianoche UTC</span>
            </div>
          </div>

          
          <div className="bg-black/30 border border-[#67ACA9]/10 p-3 rounded-xs flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <span className="text-[8px] font-mono text-[#A4C2C5]/50 uppercase tracking-wider block mb-1">Zonificación Reloj Servidor</span>
              <div className="inline-flex items-center scale-90 mb-1">
                {syncStatus === "synced" && (
                  <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <title>Sincronizado</title>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                  </svg>
                )}
                {syncStatus === "syncing" && (
                  <svg className="h-3.5 w-3.5 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <title>Sincronizando...</title>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                  </svg>
                )}
                {syncStatus !== "synced" && syncStatus !== "syncing" && (
                  <svg className="h-3.5 w-3.5 text-rose-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <title>Hora local (sin conexión)</title>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                  </svg>
                )}
              </div>
            </div>
            <div className="text-xs font-mono text-white flex flex-col gap-0.5 mt-0.5">
              <div>Fecha: <strong className="text-white">{systTime.getUTCDate().toString().padStart(2, '0')}/{(systTime.getUTCMonth() + 1).toString().padStart(2, '0')}/{systTime.getUTCFullYear()}</strong></div>
              <div>Hora: <strong className="text-[#69BFB7]">{systTime.getUTCHours().toString().padStart(2, '0')}:{systTime.getUTCMinutes().toString().padStart(2, '0')}:{systTime.getUTCSeconds().toString().padStart(2, '0')} UTC</strong></div>
            </div>
          </div>

          
          <div className="bg-black/30 border border-[#67ACA9]/10 p-3 rounded-xs flex flex-col justify-between">
            <span className="text-[8px] font-mono text-[#A4C2C5]/50 uppercase tracking-wider block mb-1.5">Consumo & Recolección Sistema</span>
            <div className="text-[9.5px] font-mono flex flex-col gap-1.5 text-[#A4C2C5]/85">
              <div className="flex justify-between items-center bg-[#67ACA9]/5 px-1.5 py-0.5 rounded-xs border border-[#67ACA9]/10">
                <span className="text-[8px] uppercase font-bold text-rose-400">Último Consumo:</span>
                <span className="text-white font-bold">{
                  inventoryMovements.some(m => m.campId === activeCampId && m.movementType === "DAILY_RATION") ? "Hoy 00:00 UTC" : "Ayer 00:00 UTC"
                }</span>
              </div>
              <div className="flex justify-between items-center bg-[#67ACA9]/5 px-1.5 py-0.5 rounded-xs border border-[#67ACA9]/10">
                <span className="text-[8px] uppercase font-bold text-emerald-400">Última Recolección:</span>
                <span className="text-white font-bold">{
                  inventoryMovements.some(m => m.campId === activeCampId && m.movementType === "DAILY_COLLECTION") ? "Hoy 00:00 UTC" : "Ayer 00:00 UTC"
                }</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-xs">
        
        
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm flex flex-col justify-between min-h-[290px]">
          <div>
            <div className="text-[10px] font-mono text-[#69BFB7] uppercase font-bold tracking-wider mb-2">
              Recursos en inventario
            </div>
            <div className="v-kpi-value text-3xl font-black text-white tracking-tight flex items-baseline gap-1">
              {activeCampInventories.length} 
              <span className="text-[10px] font-mono text-[#A4C2C5]/60 font-normal">items</span>
            </div>
            
            
            <div className="flex flex-col gap-1 mt-3 text-[10px] font-mono select-none">
              <div className="bg-[#67ACA9]/5 border border-[#67ACA9]/15 p-1.5 rounded-xs">
                <span className="text-[#A4C2C5]/50 block text-[8px] uppercase">Máxima Reserva</span>
                {highestStockResource ? (
                  <strong className="text-[#69BFB7] truncate block text-[10px]">
                    {highestStockResource.type?.name}: {highestStockResource.currentAmount} {highestStockResource.type?.unitOfMeasure}
                  </strong>
                ) : <span className="text-gray-500">—</span>}
              </div>
              <div className="bg-red-950/20 border border-red-500/20 p-1.5 rounded-xs mt-1">
                <span className="text-red-300/60 block text-[8px] uppercase">Agotado (Existencias 0)</span>
                <strong className="text-red-200 block text-[10px]">
                  {zeroStockResources.length > 0 
                    ? zeroStockResources.map(r => r.type?.name).join(", ") 
                    : "Ningún insumo en cero"}
                </strong>
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-[#67ACA9]/15 pt-3.5 flex flex-col gap-1.5">
            <Btn variant="primary" small style={{ width: "100%" }} onClick={() => onNavigateToSub("Inventario del campamento")}>
              Ver inventario completo →
            </Btn>
            <div className="grid grid-cols-2 gap-1">
              <Btn variant="ghost" small onClick={() => onNavigateToSub("Inventario del campamento")}>
                Mínimos
              </Btn>
              <Btn variant="ghost" small onClick={() => onNavigateToSub("Movimientos de inventario")}>
                Ajustar
              </Btn>
            </div>
          </div>
        </div>

        
        <div className="mission-card border border-[#ba3838]/40 bg-red-950/10 p-4 rounded-sm flex flex-col justify-between min-h-[290px]">
          <div>
            <div className="text-[10px] font-mono text-red-400 uppercase font-bold tracking-wider mb-2 flex justify-between items-center">
              <span>Recursos críticos</span>
              {unresolvedAlerts.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping inline-block" />}
            </div>
            <div className="v-kpi-value text-3xl font-black text-[#ef4444] tracking-tight">
              {unresolvedAlerts.length}
              <span className="text-[10px] font-mono text-[#A4C2C5]/50 font-normal ml-1">riesgos</span>
            </div>

            
            <div className="flex flex-col gap-1 mt-3 max-h-24 overflow-y-auto pr-1">
              {unresolvedAlerts.map(al => {
                const type = resourceTypes.find(t => t.id === al.resourceTypeId);
                const inv = campInventories.find(i => i.campId === activeCampId && i.resourceTypeId === al.resourceTypeId);
                return (
                  <div key={al.id} className="text-[9px] bg-red-950/35 border border-red-500/25 p-1 rounded-xs text-red-200 flex justify-between items-center font-mono">
                    <span className="truncate pr-1.5">⚠️ {type?.name || al.resourceTypeId}</span>
                    <strong className="shrink-0">{inv?.currentAmount || 0} / {inv?.minimumAlertAmount || "—"} u</strong>
                  </div>
                );
              })}
              {unresolvedAlerts.length === 0 && (
                <div className="text-[9.5px]/none text-emerald-400 font-mono mt-4 text-center border border-emerald-500/20 p-2 bg-emerald-950/10 rounded-xs">
                  ✓ Inventario conforme. Todo insumo sobre el mínimo.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 border-t border-red-950/30 pt-3.5 flex flex-col gap-1.5">
            <Btn variant="danger" small style={{ width: "100%" }} onClick={() => onNavigateToSub("Alertas de inventario")}>
              Resolver Alertas →
            </Btn>
            <div className="grid grid-cols-2 gap-1">
              <Btn variant="ghost" small onClick={() => onNavigateToSub("Movimientos de inventario")}>
                Abastecer
              </Btn>
              <Btn variant="ghost" small onClick={() => onNavigateToSub("Notificaciones")}>
                Notificar
              </Btn>
            </div>
          </div>
        </div>

        
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm flex flex-col justify-between min-h-[290px]">
          <div>
            <div className="text-[10px] font-mono text-[#69BFB7] uppercase font-bold tracking-wider mb-2">
              Distribución de Inventario
            </div>
            
            <div className="h-32 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={resourcePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={44}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {resourcePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={["#69BFB7", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899"][index % 7]} />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[7.5px] font-mono text-[#A4C2C5]/50 uppercase tracking-widest leading-none">Capacidad</span>
                <span className="text-xs font-black text-white mt-0.5">{totalResourceStocks} u</span>
              </div>
            </div>

            
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 justify-center mt-1 text-[8.5px] font-mono max-h-16 overflow-y-auto pr-1">
              {resourcePieData.slice(0, 6).map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1">
                  <span className="h-1 w-1 rounded-xs shrink-0" style={{ backgroundColor: ["#69BFB7", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899"][index % 7] }} />
                  <span className="text-[#A4C2C5]/70 truncate max-w-[65px]">{entry.name}:</span>
                  <strong className="text-white">{entry.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 border-t border-[#67ACA9]/15 pt-2 flex flex-col gap-1">
            <Btn variant="ghost" small style={{ width: "100%" }} onClick={() => onNavigateToSub("Tipos de recurso")}>
              Ver tipos de recurso →
            </Btn>
          </div>
        </div>

        
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm flex flex-col justify-between min-h-[290px]">
          <div>
            <div className="text-[10px] font-mono text-[#69BFB7] uppercase font-bold tracking-wider mb-2 flex justify-between items-center">
              <span>Consumo últimos 7 días</span>
              <span className="text-[8px] font-mono text-[#A4C2C5]/50">(Raciones, etc)</span>
            </div>
            
            <div className="grid grid-cols-2 gap-1 mb-1.5 bg-[#67ACA9]/5 p-1 border border-[#67ACA9]/10 rounded-xs text-[8.5px] font-mono">
              <div>
                <span className="text-[#A4C2C5]/50 block text-[7px] uppercase">Ración Total</span>
                <span className="text-xs font-black text-[#69BFB7]">{totalConsumed7Days} <span className="text-[7.5px] font-normal">u</span></span>
              </div>
              <div className="border-l border-[#67ACA9]/10 pl-1.5">
                <span className="text-[#A4C2C5]/50 block text-[7px] uppercase">Día Pico</span>
                <span className="text-[9px] font-black text-rose-400 truncate block">{highestConsumptionDay.date}</span>
              </div>
            </div>

            
            <div className="h-28 mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dynamicTrendData} margin={{ top: 2, right: 2, left: -32, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTrendDashboard" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#69BFB7" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#69BFB7" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
                  <XAxis dataKey="date" tick={{ fill: CHART_THEME.text, fontSize: 7.5 }} stroke="transparent" />
                  <YAxis tick={{ fill: CHART_THEME.text, fontSize: 7.5 }} stroke="transparent" />
                  <Tooltip {...chartTooltipStyle} />
                  <Area type="monotone" dataKey="totalConsumed" stroke={CHART_THEME.teal} fill="url(#colorTrendDashboard)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 border-t border-[#67ACA9]/15 pt-2 flex flex-col gap-1 text-[8.5px] font-mono text-center">
            <span className="text-[#69BFB7] hover:underline cursor-pointer" onClick={() => onNavigateToSub("Movimientos de inventario")}>[Historial de Movimientos]</span>
          </div>
        </div>

      </div>

      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-8">
        
        
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm shadow-md">
            <span className="text-[10px] font-mono text-[#69BFB7] font-bold uppercase tracking-[3px] block mb-1">
              LOGÍSTICA TRANSITARIA DE CONVOYES
            </span>
            <h2 className="text-sm font-black text-white uppercase tracking-wider mb-4 border-b border-[#67ACA9]/15 pb-2">
              TIMELINE — PRÓXIMOS TRASLADOS (MOVIMIENTOS DE CARGA)
            </h2>
            
            <div className="v-table-wrap overflow-x-auto">
              <table className="v-table text-[10.5px]">
                <thead>
                  <tr className="border-b border-[#67ACA9]/15">
                    <th className="text-left font-bold text-[#A4C2C5]/80 py-2">MANIFIESTO / RUTA</th>
                    <th className="text-center font-bold text-[#A4C2C5]/80 py-2">ESTADO</th>
                    <th className="text-left font-bold text-[#A4C2C5]/80 py-2">PARTIDA PROGRAMADA</th>
                    <th className="text-center font-bold text-[#A4C2C5]/80 py-2">SUMINISTRO / RACIÓN</th>
                    <th className="text-right font-bold text-[#A4C2C5]/80 py-2">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransfers.map(tr => {
                    const req = intercampRequests.find(r => r.id === tr.requestId);
                    const originName = camps.find(c => c.id === req?.originCampId)?.name || req?.originCampId || "Base";
                    const destName = camps.find(c => c.id === req?.destinationCampId)?.name || req?.destinationCampId || "Destino";
                    const isCampInvolved = req?.originCampId === activeCampId;
                    
                    return (
                      <tr key={tr.id} className="border-b border-[#67ACA9]/10 hover:bg-[#67ACA9]/5 transition-colors">
                        <td className="py-2.5 font-bold text-white">
                          {tr.id.toUpperCase()} • <span className="text-[#69BFB7]">{originName} ➔ {destName}</span>
                        </td>
                        <td className="text-center">
                          <span className={`inline-block text-[8px] font-black tracking-wider uppercase px-2 py-0.5 rounded-sm border ${
                            tr.status === "DELIVERED" ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30" :
                            tr.status === "PLANNING" ? "bg-amber-950/40 text-amber-300 border-amber-500/30 font-bold" :
                            tr.status === "EN_ROUTE" ? "bg-sky-950/40 text-sky-300 border-sky-500/30 animate-pulse font-bold" :
                            "bg-blue-950/40 text-blue-300 border-blue-500/30"
                          }`}>
                            {tr.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="font-mono text-[#A4C2C5]/80 text-[10px]">{tr.plannedDepartureDate}</td>
                        <td className="text-center font-mono font-bold text-cyan-300 animate-pulse">
                          {tr.rationsForTrip} Raciones
                        </td>
                        <td className="text-right">
                          <Btn small variant="ghost" onClick={() => onNavigateToSub("Traslados")}>
                            VER
                          </Btn>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTransfers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-gray-500 italic">No hay traslados activos asignados a este campamento.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        
        <div className="lg:col-span-4 flex flex-col">
          <div className="mission-card border border-[#ba3838]/40 bg-[#0b1010]/95 p-4 rounded-sm h-full flex flex-col justify-between shadow-md">
            <div>
              <span className="text-[10px] font-mono text-[#ef4444] font-bold uppercase tracking-[2px] block mb-1">
                DISCORDANCIAS Y ALERTAS
              </span>
              <h2 className="text-sm font-black text-[#f0fafa] uppercase tracking-wider mb-4 border-b border-red-900/30 pb-2">
                ALERTAS DE CAMPO
              </h2>
              
              <div className="flex flex-col gap-2.5">
                {fieldWarnings.slice(0, 4).map((warning, index) => (
                  <div key={index} className="bg-amber-950/15 border-l-2 border-amber-500 text-amber-100 p-2.5 rounded-sm text-[9.5px] font-mono tracking-wide leading-relaxed">
                    {warning}
                  </div>
                ))}
                {fieldWarnings.length === 0 && (
                  <div className="p-4 rounded-sm border border-emerald-500/20 bg-emerald-950/10 text-emerald-300 text-xs text-center">
                    ✓ Todos los sistemas conformes. No se detectan desajustes en {campName}.
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-red-900/10 text-right">
              <Btn 
                variant="danger"
                small
                onClick={() => {
                  setActiveTab("alertas");
                  onNavigateToSub("Alertas de inventario");
                }}
              >
                VER CONSOLA DE CONTINGENCIA ➔
              </Btn>
            </div>
          </div>
        </div>

      </div>

      
      <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm shadow-lg mb-8">
        <span className="text-[10px] font-mono text-[#69BFB7] uppercase tracking-[3px] block mb-2">Centro de Fiscalización de Datos</span>
        <h2 className="text-base font-black text-white uppercase tracking-tight mb-4 border-b border-[#67ACA9]/10 pb-2.5">
          TABLAS DE CONTROL DE CAMPAMENTO ({campName.toUpperCase()})
        </h2>

        
        <div className="flex flex-wrap gap-1.5 mb-5 border-b border-[#67ACA9]/10 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("inventario")}
            className={`cursor-pointer px-3.5 py-2 text-[10px] lg:text-[11px] font-black uppercase tracking-wider border rounded-xs transition-all ${activeTab === "inventario" ? "bg-[#67ACA9]/20 border-[#69BFB7] text-white" : "bg-black/35 border-[#67ACA9]/10 text-[#A4C2C5]/70 hover:text-white hover:border-[#67ACA9]/25"}`}
          >
            1. Reservas de Almacén
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("alertas")}
            className={`cursor-pointer px-3.5 py-2 text-[10px] lg:text-[11px] font-black uppercase tracking-wider border rounded-xs transition-all ${activeTab === "alertas" ? "bg-[#ba3838]/25 border-red-500 text-white" : "bg-black/35 border-[#67ACA9]/10 text-[#A4C2C5]/70 hover:text-white hover:border-[#67ACA9]/25"}`}
          >
            2. Alertas Abiertas ({unresolvedAlerts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("movimientos")}
            className={`cursor-pointer px-3.5 py-2 text-[10px] lg:text-[11px] font-black uppercase tracking-wider border rounded-xs transition-all ${activeTab === "movimientos" ? "bg-[#67ACA9]/20 border-[#69BFB7] text-white" : "bg-black/35 border-[#67ACA9]/10 text-[#A4C2C5]/70 hover:text-white hover:border-[#67ACA9]/25"}`}
          >
            3. Operaciones Recientes ({activeCampMovements.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("recoleccion")}
            className={`cursor-pointer px-3.5 py-2 text-[10px] lg:text-[11px] font-black uppercase tracking-wider border rounded-xs transition-all ${activeTab === "recoleccion" ? "bg-[#67ACA9]/20 border-[#69BFB7] text-white" : "bg-black/35 border-[#67ACA9]/10 text-[#A4C2C5]/70 hover:text-white hover:border-[#67ACA9]/25"}`}
          >
            4. Cosecha / Recolección ({activeCampCollections.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("solicitudes")}
            className={`cursor-pointer px-3.5 py-2 text-[10px] lg:text-[11px] font-black uppercase tracking-wider border rounded-xs transition-all ${activeTab === "solicitudes" ? "bg-[#67ACA9]/20 border-[#69BFB7] text-white" : "bg-black/35 border-[#67ACA9]/10 text-[#A4C2C5]/70 hover:text-white hover:border-[#67ACA9]/25"}`}
          >
            5. Trámites Intercampamento ({activeCampRequests.length})
          </button>
        </div>

        
        {activeTab === "inventario" && (
          <div className="flex flex-col gap-3">
            <div className="v-table-wrap overflow-x-auto">
              <table className="v-table">
                <thead>
                  <tr>
                    <th>RECURSO</th>
                    <th>CATEGORÍA</th>
                    <th>ESTADO</th>
                    <th className="text-right">EXISTENCIA ACTUAL</th>
                    <th className="text-right">MÍNIMO ALERTA</th>
                    <th>ÚLTIMA ACTUALIZACIÓN</th>
                    <th className="text-right">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInventario.map(inv => (
                    <tr key={inv.resourceTypeId} className="hover:bg-white/5 transition-colors">
                      <td className="font-bold text-white uppercase">{inv.type?.name || inv.resourceTypeId}</td>
                      <td>
                        <span className="font-bold text-[#A4C2C5]/70">{getResourceTypeCategoryLabel(inv.type?.category || "OTHER")}</span>
                      </td>
                      <td>
                        <span className={`inline-block text-[8px] font-black px-1.5 py-0.5 border rounded-xs ${
                          inv.currentAmount <= inv.minimumAlertAmount 
                            ? "bg-red-950/40 text-red-300 border-red-500/40 animate-pulse" 
                            : "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                        }`}>
                          {inv.currentAmount <= inv.minimumAlertAmount ? "CRÍTICO" : "NORMAL"}
                        </span>
                      </td>
                      <td className="text-right font-mono font-bold text-white text-xs">{inv.currentAmount} {inv.type?.unitOfMeasure}</td>
                      <td className="text-right font-mono text-[#A4C2C5]/80 text-xs">{inv.minimumAlertAmount} {inv.type?.unitOfMeasure}</td>
                      <td className="font-mono text-[#A4C2C5]/60 text-[10px]">{(inv as any).lastUpdate || "20/05/2026"}</td>
                      <td className="text-right">
                        <div className="flex inline-flex gap-1">
                          <Btn variant="primary" small onClick={() => onNavigateToSub("Inventario del campamento")}>
                            Detalle
                          </Btn>
                          <Btn variant="ghost" small onClick={() => onNavigateToSub("Movimientos de inventario")}>
                            Ajustar
                          </Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            
            <div className="flex justify-between items-center text-[10.5px] font-mono text-[#A4C2C5]/50 mt-2 py-1 select-none">
              <span>Registros {((pageInventario - 1) * pageSize) + 1} - {Math.min(pageInventario * pageSize, detailedResources.length)} de {detailedResources.length}</span>
              <div className="flex gap-1">
                <Btn small variant="ghost" onClick={() => setPageInventario(p => Math.max(1, p - 1))} disabled={pageInventario === 1}>◄ Anterior</Btn>
                <div className="bg-[#67ACA9]/20 border border-[#67ACA9]/30 text-white px-2 py-0.5 rounded-sm font-bold text-[10px]">{pageInventario} / {totalPageInventario}</div>
                <Btn small variant="ghost" onClick={() => setPageInventario(p => Math.min(totalPageInventario, p + 1))} disabled={pageInventario === totalPageInventario}>Siguiente ►</Btn>
              </div>
            </div>
          </div>
        )}

        
        {activeTab === "alertas" && (
          <div className="flex flex-col gap-3">
            <div className="v-table-wrap overflow-x-auto">
              <table className="v-table">
                <thead>
                  <tr>
                    <th>ID ALERTA</th>
                    <th>RECURSO</th>
                    <th>REGISTRADO CON</th>
                    <th>FECHA DETECCIÓN</th>
                    <th>ESTADO</th>
                    <th className="text-right">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAlertas.map(al => {
                    const type = resourceTypes.find(t => t.id === al.resourceTypeId);
                    return (
                      <tr key={al.id} className="hover:bg-white/5 transition-colors">
                        <td className="font-mono font-bold text-rose-300">#{al.id}</td>
                        <td className="font-bold text-white">{type?.name || al.resourceTypeId}</td>
                        <td className="font-mono font-bold text-[#69BFB7]">{al.amountAtAlertGeneration} {type?.unitOfMeasure}</td>
                        <td className="font-mono text-[10px]">{al.alertDate}</td>
                        <td>
                          <span className="inline-block text-[8px] font-black tracking-wider uppercase px-2 py-0.5 rounded-sm border bg-[#ba3838]/25 text-[#fca5a5] border-red-500 animate-pulse">
                            SIN RESOLVER
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex inline-flex gap-1">
                            {onResolveAlert && (
                              <Btn variant="success" small onClick={() => {
                                onResolveAlert(al.id, String(currentUser.userId));
                                alert("Alerta resuelta satisfactoriamente.");
                              }}>
                                ✓ Resolver Alerta
                              </Btn>
                            )}
                            <Btn variant="ghost" small onClick={() => onNavigateToSub("Notificaciones")}>
                              Notificar
                            </Btn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {unresolvedAlerts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-emerald-400 font-mono italic">✓ Registros excelentes. No existen alertas abiertas pendientes en {campName}.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {unresolvedAlerts.length > 0 && (
              <div className="flex justify-between items-center text-[10.5px] font-mono text-[#A4C2C5]/50 mt-2 py-1 select-none">
                <span>Alertas {((pageAlertas - 1) * pageSize) + 1} - {Math.min(pageAlertas * pageSize, unresolvedAlerts.length)} de {unresolvedAlerts.length}</span>
                <div className="flex gap-1">
                  <Btn small variant="ghost" onClick={() => setPageAlertas(p => Math.max(1, p - 1))} disabled={pageAlertas === 1}>◄ Anterior</Btn>
                  <div className="bg-[#67ACA9]/20 border border-[#67ACA9]/30 text-white px-2 py-0.5 rounded-sm font-bold text-[10px]">{pageAlertas} / {totalPageAlertas}</div>
                  <Btn small variant="ghost" onClick={() => setPageAlertas(p => Math.min(totalPageAlertas, p + 1))} disabled={pageAlertas === totalPageAlertas}>Siguiente ►</Btn>
                </div>
              </div>
            )}
          </div>
        )}

        
        {activeTab === "movimientos" && (
          <div className="flex flex-col gap-3">
            <div className="v-table-wrap overflow-x-auto">
              <table className="v-table text-[11px]">
                <thead>
                  <tr>
                    <th>FECHA / HORA</th>
                    <th>RECURSO</th>
                    <th>TIPO MOVIMIENTO</th>
                    <th className="text-right">CANTIDAD</th>
                    <th>REGISTRADO POR</th>
                    <th>DESCRIPCIÓN</th>
                    <th className="text-right font-bold">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMovimientos.map(m => {
                    const rt = resourceTypes.find(t => t.id === m.resourceTypeId);
                    return (
                      <tr key={m.id} className="hover:bg-white/5 transition-colors">
                        <td className="font-mono text-[10px] text-[#A4C2C5]/70">{m.date}</td>
                        <td className="font-bold text-white uppercase">{rt?.name || m.resourceTypeId}</td>
                        <td>
                          <span className="px-1.5 py-0.5 rounded-sm font-bold font-mono text-[8px] border border-[#67ACA9]/25 text-[#69BFB7] bg-[#67ACA9]/5">
                            {m.movementType}
                          </span>
                        </td>
                        <td className="text-right font-mono font-bold text-[#69BFB7]">{m.amount} {rt?.unitOfMeasure}</td>
                        <td className="text-[#A4C2C5]/70">{m.recordedBy}</td>
                        <td className="text-white italic">{m.description}</td>
                        <td className="text-right">
                          <Btn variant="ghost" small onClick={() => onNavigateToSub("Movimientos de inventario")}>
                            Registrar nuevo
                          </Btn>
                        </td>
                      </tr>
                    );
                  })}
                  {activeCampMovements.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500 italic">No hay historial de movimientos disponible para {campName}.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {activeCampMovements.length > 0 && (
              <div className="flex justify-between items-center text-[10.5px] font-mono text-[#A4C2C5]/50 mt-2 py-1 select-none">
                <span>Registros {((pageMovimientos - 1) * pageSize) + 1} - {Math.min(pageMovimientos * pageSize, activeCampMovements.length)} de {activeCampMovements.length}</span>
                <div className="flex gap-1">
                  <Btn small variant="ghost" onClick={() => setPageMovimientos(p => Math.max(1, p - 1))} disabled={pageMovimientos === 1}>◄ Anterior</Btn>
                  <div className="bg-[#67ACA9]/20 border border-[#67ACA9]/30 text-white px-2 py-0.5 rounded-sm font-bold text-[10px]">{pageMovimientos} / {totalPageMovimientos}</div>
                  <Btn small variant="ghost" onClick={() => setPageMovimientos(p => Math.min(totalPageMovimientos, p + 1))} disabled={pageMovimientos === totalPageMovimientos}>Siguiente ►</Btn>
                </div>
              </div>
            )}
          </div>
        )}

        
        {activeTab === "recoleccion" && (
          <div className="flex flex-col gap-3">
            <div className="v-table-wrap overflow-x-auto">
              <table className="v-table">
                <thead>
                  <tr>
                    <th>FECHA</th>
                    <th>RECURSO</th>
                    <th>RECOLECTOR/PERSONA</th>
                    <th className="text-right">ESPERADO</th>
                    <th className="text-right">REAL</th>
                    <th className="text-right">DIFERENCIA</th>
                    <th>REGISTRADO POR</th>
                    <th>MOTIVO / INCIDENCIA</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecoleccion.map(c => {
                    const rtStrId = MAP_RESOURCE_ID_TO_STR[c.resourceTypeId] || `rt-${c.resourceTypeId}`;
                    const rt = resourceTypes.find(t => t.id === rtStrId);
                    const actualNum = Number(c.actualAmount || 0);
                    const expectedNum = Number(c.expectedAmount || 0);
                    const diff = actualNum - expectedNum;
                    
                    return (
                      <tr key={c.id} className="hover:bg-white/5 transition-colors">
                        <td className="font-mono text-xs">{c.date}</td>
                        <td className="font-bold text-white">{rt?.name || rtStrId}</td>
                        <td className="text-white font-mono">{c.personId}</td>
                        <td className="text-right font-mono text-[#A4C2C5]/80">{expectedNum.toFixed(2)}</td>
                        <td className="text-right font-mono font-bold text-white">{actualNum.toFixed(2)}</td>
                        <td className={`text-right font-mono font-bold ${diff === 0 ? "text-emerald-400" : diff < 0 ? "text-amber-400" : "text-[#69BFB7]"}`}>
                          {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                        </td>
                        <td className="text-[10px]">Especialista Sede</td>
                        <td className="text-white font-serif italic text-xs">{c.differenceReason || "—"}</td>
                      </tr>
                    );
                  })}
                  {activeCampCollections.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-400 italic font-mono">No se registran bitácoras de recolección en este campamento.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {activeCampCollections.length > 0 && (
              <div className="flex justify-between items-center text-[10.5px] font-mono text-[#A4C2C5]/50 mt-2 py-1 select-none">
                <span>Registros {((pageRecoleccion - 1) * pageSize) + 1} - {Math.min(pageRecoleccion * pageSize, activeCampCollections.length)} de {activeCampCollections.length}</span>
                <div className="flex gap-1">
                  <Btn small variant="ghost" onClick={() => setPageRecoleccion(p => Math.max(1, p - 1))} disabled={pageRecoleccion === 1}>◄ Anterior</Btn>
                  <div className="bg-[#67ACA9]/20 border border-[#67ACA9]/30 text-white px-2 py-0.5 rounded-sm font-bold text-[10px]">{pageRecoleccion} / {totalPageRecoleccion}</div>
                  <Btn small variant="ghost" onClick={() => setPageRecoleccion(p => Math.min(totalPageRecoleccion, p + 1))} disabled={pageRecoleccion === totalPageRecoleccion}>Siguiente ►</Btn>
                </div>
              </div>
            )}
          </div>
        )}

        
        {activeTab === "solicitudes" && (
          <div className="flex flex-col gap-3">
            <div className="v-table-wrap overflow-x-auto">
              <table className="v-table text-[11px]">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>FLUJO DIRECCIÓN</th>
                    <th>ORIGEN ➔ DESTINO</th>
                    <th>ESTADO</th>
                    <th>FECHA ESTIMADA</th>
                    <th>MOTIVO DESCRIPCIÓN</th>
                    <th>CREADA POR</th>
                    <th className="text-right">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSolicitudes.map(r => {
                    const isOrigin = r.originCampId === activeCampId;
                    const originName = camps.find(c => c.id === r.originCampId)?.name || r.originCampId;
                    const destName = camps.find(c => c.id === r.destinationCampId)?.name || r.destinationCampId;
                    return (
                      <tr key={r.id} className="hover:bg-white/5 transition-colors">
                        <td className="font-mono font-bold text-white">#{r.id}</td>
                        <td>
                          <span className={`inline-block text-[8px] font-black px-1.5 py-0.5 border rounded-xs ${
                            isOrigin ? "bg-blue-950/20 text-blue-300 border-blue-500/25" : "bg-purple-950/20 text-purple-300 border-purple-500/25"
                          }`}>
                            {isOrigin ? "SALIENTE (Creada)" : "ENTRANTE (Recibida)"}
                          </span>
                        </td>
                        <td className="font-bold text-white uppercase">{originName} ➔ {destName}</td>
                        <td>
                          <span className={`inline-block text-[8px] font-black px-1.5 py-0.5 border rounded-xs ${
                            r.status === "APPROVED" ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30" :
                            r.status === "REJECTED" ? "bg-red-950/40 text-red-300 border-red-500/30" :
                            "bg-amber-950/40 text-amber-300 border-amber-500/25"
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="font-mono text-xs text-[#A4C2C5]/70">{r.plannedDepartureDate}</td>
                        <td className="italic text-white text-xs">{r.description}</td>
                        <td className="text-[10px] text-gray-400">{r.createdBy}</td>
                        <td className="text-right">
                          <div className="flex inline-flex gap-1">
                            <Btn variant="primary" small onClick={() => onNavigateToSub("Solicitudes intercampamento")}>
                              Gestionar Solicitud
                            </Btn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {activeCampRequests.length > 0 && (
              <div className="flex justify-between items-center text-[10.5px] font-mono text-[#A4C2C5]/50 mt-2 py-1 select-none">
                <span>Registros {((pageSolicitudes - 1) * pageSize) + 1} - {Math.min(pageSolicitudes * pageSize, activeCampRequests.length)} de {activeCampRequests.length}</span>
                <div className="flex gap-1">
                  <Btn small variant="ghost" onClick={() => setPageSolicitudes(p => Math.max(1, p - 1))} disabled={pageSolicitudes === 1}>◄ Anterior</Btn>
                  <div className="bg-[#67ACA9]/20 border border-[#67ACA9]/30 text-white px-2 py-0.5 rounded-sm font-bold text-[10px]">{pageSolicitudes} / {totalPageSolicitudes}</div>
                  <Btn small variant="ghost" onClick={() => setPageSolicitudes(p => Math.min(totalPageSolicitudes, p + 1))} disabled={pageSolicitudes === totalPageSolicitudes}>Siguiente ►</Btn>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

    </SectionShell>
  );
}


export function ViewInventarioCampamento({
  camps,
  resourceTypes,
  campInventories,
  onUpdateInventory,
  onAddInventory
}: {
  camps: Camp[];
  resourceTypes: ResourceType[];
  campInventories: CampInventory[];
  onUpdateInventory: (campId: string, resourceTypeId: string, currentAmount: number, minimumAlertAmount: number) => void;
  onAddInventory: (data: CampInventory) => void;
}) {
  const selectedCamp = currentUser.campId;
  const legacyCampId = String(selectedCamp);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [currVal, setCurrVal] = useState("");
  const [minVal, setMinVal] = useState("");

  const activeCampsite = camps.find(c => c.id === legacyCampId);
  const filteredInventories = campInventories.filter(i => i.campId === legacyCampId);

  const handleUpdate = (campId: string, resourceTypeId: string, currentAmountVal: number) => {
    if (minVal === "") {
      alert("La cantidad mínima de alerta no puede quedar vacía.");
      return;
    }

    const minNum = Number(minVal);

    if (isNaN(minNum) || minNum < 0) {
      alert("La cantidad mínima de alerta debe ser un número decimal no negativo.");
      return;
    }

    onUpdateInventory(campId, resourceTypeId, currentAmountVal, minNum);
    setEditingKey(null);
  };

  return (
    <SectionShell kicker="CENTRAL DE OPERACIONES" title="Inventario de Campamentos">
      <div className="flex justify-between items-center bg-[#0a0f0f]/95 border border-[#67ACA9]/20 p-3.5 rounded-sm mx-4 md:mx-10 my-1 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[#A4C2C5] tracking-wider uppercase">Campamento Activo:</span>
          <span className="text-[11px] font-black text-[#69BFB7] border border-[#69BFB7]/30 px-2.5 py-1 rounded-sm bg-black/45 select-none truncate">
            {activeCampsite?.name || "Alpha Bunker"}
          </span>
        </div>
        <div className="text-[9px] font-mono text-[#A4C2C5]/70 hidden sm:block">
          Ubicación: <strong className="text-white">{activeCampsite?.location || "Sector Central"}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        <div className="lg:col-span-12 flex flex-col gap-3">
          {activeCampsite && (
            <div className="p-3 bg-black/45 border border-[#67ACA9]/10 rounded-sm text-xs">
              <h4 className="font-bold text-[#69BFB7] text-[11px]">Ficha Técnica: {activeCampsite.name}</h4>
              <p className="text-[#A4C2C5]/70 text-[10px] mt-1">Ubicación asignada en coordenadas zonales: {activeCampsite.location}</p>
              <p className="text-[#A4C2C5]/70 text-[10px]">Personal acantonado activo registrado: <strong>{activeCampsite.personnelCount} personas</strong>.</p>
            </div>
          )}

          <div className="v-table-wrap max-h-96 overflow-y-auto">
            <table className="v-table text-[10px]">
              <thead>
                <tr>
                  <th>Suministro</th>
                  <th>Categoría</th>
                  <th>Cantidad Actual</th>
                  <th>Mínimo Permitido (Alerta)</th>
                  <th>Estado de Red</th>
                  <th className="text-right">Ajuste Manual</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventories.map(item => {
                  const rt = resourceTypes.find(t => t.id === item.resourceTypeId);
                  const isEditing = editingKey === `${item.campId}-${item.resourceTypeId}`;
                  const isCritical = item.currentAmount <= item.minimumAlertAmount;
                  const isWarning = item.currentAmount <= item.minimumAlertAmount * 1.5 && item.currentAmount > item.minimumAlertAmount;
                  const stat = isCritical ? "CRITICO" : isWarning ? "ALERTA" : "EXCELENTE";

                  return (
                    <tr key={item.resourceTypeId} className="hover:bg-cyan-950/10">
                      <td className="font-bold text-white">{rt?.name || item.resourceTypeId}</td>
                      <td>{rt ? getResourceTypeCategoryLabel(rt.category) : item.resourceTypeId}</td>
                      <td>
                        <span className="font-mono font-bold text-white">{item.currentAmount} {rt?.unitOfMeasure}</span>
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            value={minVal}
                            onChange={(e) => setMinVal(e.target.value)}
                            className="w-16 bg-black text-white text-center font-mono border border-amber-500/50 text-[10px] rounded-xs animate-pulse"
                          />
                        ) : (
                          <span className="font-mono text-[#A4C2C5]/80">{item.minimumAlertAmount} {rt?.unitOfMeasure}</span>
                        )}
                      </td>
                      <td>
                        <StatusIndicator status={stat} />
                      </td>
                      <td className="text-right">
                        {isEditing ? (
                          <div className="flex gap-1 justify-end">
                            <Btn small variant="success" onClick={() => handleUpdate(item.campId, item.resourceTypeId, item.currentAmount)}>✓ Guardar</Btn>
                            <Btn small variant="ghost" onClick={() => setEditingKey(null)}>✕</Btn>
                          </div>
                        ) : (
                          <Btn small variant="ghost" onClick={() => {
                            setEditingKey(`${item.campId}-${item.resourceTypeId}`);
                            setMinVal(String(item.minimumAlertAmount));
                          }}>⚙ Editar Mínimo</Btn>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}


export function ViewRecoleccionDiaria({
  camps,
  resourceTypes,
  onRefreshSystemData
}: {
  camps: Camp[];
  resourceTypes: ResourceType[];
  onRefreshSystemData?: () => void;
}) {
  const campId = currentUser.campId; 
  const currentCamp = camps.find(c => Number(c.id) === campId);


  const [apiPersonnel, setApiPersonnel] = useState<{ id: number; name: string }[]>([]);
  const [hasPersonnelEndpoint, setHasPersonnelEndpoint] = useState<boolean | null>(null);


  const [records, setRecords] = useState<DailyCollectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);


  const [personId, setPersonId] = useState<number>(101);
  const [resourceTypeId, setResourceTypeId] = useState<number>(1);
  const [actualAmount, setActualAmount] = useState("");
  const [differenceReason, setDifferenceReason] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [showManualForm, setShowManualForm] = useState(false);


  const [filterPerson, setFilterPerson] = useState("");
  const [filterResource, setFilterResource] = useState("");
  const [filterDate, setFilterDate] = useState("");


  const [adjustingId, setAdjustingId] = useState<number | null>(null);
  const [adjustVal, setAdjustVal] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<DailyCollectionRecord | null>(null);

  const recordedBy = currentUser.userId;

  const campRosters: Record<number, { id: number; name: string }[]> = {
    1: [
      { id: 101, name: "Soldado R. Vásquez" },
      { id: 102, name: "Piloto T. Henderson" },
      { id: 103, name: "Operador J. Miller" },
      { id: 104, name: "Auxiliar M. Gómez" }
    ],
    2: [
      { id: 201, name: "Minero J. Doe" },
      { id: 202, name: "Guardia A. Smith" }
    ],
    3: [
      { id: 301, name: "Agricultor L. Rivera" },
      { id: 302, name: "Colector G. Chen" }
    ],
    4: [
      { id: 401, name: "Explorador K. Vance" }
    ],
    5: [
      { id: 501, name: "Explorador S. O'Connor" }
    ]
  };

  const currentRoster = hasPersonnelEndpoint && apiPersonnel.length > 0
    ? apiPersonnel
    : (campRosters[campId] || [{ id: 901, name: "Especialista de Recursos Sede" }]);

  const getPersonName = (pId: number): string => {
    const apiFound = apiPersonnel.find(p => p.id === pId);
    if (apiFound) return apiFound.name;

    const allPersonnel = Object.values(campRosters).flat();
    const found = allPersonnel.find(p => p.id === pId);
    return found ? found.name : `Persona #${pId}`;
  };




  useEffect(() => {
    if (currentRoster.length > 0) {
      setPersonId(currentRoster[0].id);
    }
  }, [hasPersonnelEndpoint, apiPersonnel]);


  useEffect(() => {
    const checkPersonnel = async () => {
      const endpoints = [
        `/people`,
        `/personnel`
      ];
      for (const url of endpoints) {
        try {
          const data = await apiRequest<unknown>(url);
          const list = unwrapListPayload<Record<string, unknown>>(data);
          const formatted = list.map(p => ({
            id: Number(p.id ?? p.userId ?? p.personId ?? 101),
            name: String(p.name ?? p.fullName ?? p.username ?? `Persona #${p.id ?? 101}`)
          }));

          setApiPersonnel(formatted);
          setHasPersonnelEndpoint(true);
          return;
        } catch (e) {

        }
      }
      setHasPersonnelEndpoint(false);
    };
    checkPersonnel();
  }, []);


  const fetchRecords = async (currentPage: number) => {
    setLoading(true);
    setError(null);
    try {
      let url = `/daily-collection-records?page=${currentPage}&limit=10`;
      

      if (filterResource) {
        url += `&resourceTypeId=${filterResource}`;
      }
      if (filterDate) {
        url += `&date=${filterDate}`;
      }
      const numericPersonId = Number(filterPerson);
      if (filterPerson && !isNaN(numericPersonId)) {
        url += `&personId=${numericPersonId}`;
      }

      const data = await apiRequest<unknown>(url);
      
      let fetchedList: DailyCollectionRecord[] = [];
      let calculatedTotalPages = 1;

      const list = unwrapListPayload<DailyCollectionRecord>(data);
      if (Array.isArray(data)) {
        fetchedList = list;
        calculatedTotalPages = 1;
      } else if (data && typeof data === "object") {
        fetchedList = list;
        const obj = data as Record<string, unknown>;
        const pagination = obj.pagination && typeof obj.pagination === "object"
          ? obj.pagination as Record<string, unknown>
          : {};
        calculatedTotalPages = Number(obj.totalPages ?? obj.pages ?? pagination.totalPages ?? 1);
      }


      fetchedList = fetchedList.filter(record => Number(record.campId) === campId);
      

      if (filterPerson && isNaN(numericPersonId)) {
        const searchLow = filterPerson.toLowerCase();
        fetchedList = fetchedList.filter(record => {
          const name = getPersonName(record.personId).toLowerCase();
          return name.includes(searchLow);
        });
      }

      setRecords(fetchedList);
      setTotalPages(calculatedTotalPages);
    } catch (err: any) {
      console.warn("Could not load daily collections from backend", err);
      setError("No se pudo cargar la recolección diaria. Por favor, reintente.");
      setRecords([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(page);
  }, [page, filterResource, filterDate, filterPerson]);

  const activeResourceTypeObj = resourceTypes.find(rt => {
    const mappedNumId = MAP_RESOURCE_STR_TO_ID[rt.id] || Number(rt.id);
    return mappedNumId === resourceTypeId;
  });
  const expectedAmount = "120.00";

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personId || !resourceTypeId || !manualDate || actualAmount === "") {
      alert("Completa persona, recurso, fecha y cantidad recolectada.");
      return;
    }

    const expectedNum = Number(expectedAmount);
    const actualNum = Number(actualAmount);

    if (isNaN(expectedNum) || expectedNum < 0 || isNaN(actualNum) || actualNum < 0) {
      alert("Las cantidades deben ser números válidos no negativos.");
      return;
    }

    if (expectedNum !== actualNum && !differenceReason.trim()) {
      alert("Se detectó discrepancia. Se exige registrar un motivo para la diferencia de auditoría.");
      return;
    }

    const payload = {
      campId,
      personId: Number(personId),
      resourceTypeId: Number(resourceTypeId),
      date: manualDate,
      expectedAmount: expectedNum.toFixed(2),
      actualAmount: actualNum.toFixed(2),
      differenceReason: differenceReason.trim() || null,
      recordedBy,
      movementId: null
    };

      setLoading(true);
    try {
      await apiRequest<unknown>("/daily-collection-records", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      
      setActualAmount("");
      setDifferenceReason("");
      setShowManualForm(false);
      

      fetchRecords(1);
      setPage(1);

      if (onRefreshSystemData) {
        onRefreshSystemData();
      }
    } catch (err: any) {
      alert("No se pudo registrar en la API: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustmentSubmit = async () => {
    if (adjustVal === "" || isNaN(Number(adjustVal)) || Number(adjustVal) < 0) {
      alert("La cantidad real corregida debe ser un número no negativo.");
      return;
    }
    if (!adjustReason.trim()) {
      alert("Se requiere consignar una razón técnica para el ajuste del inventario del campamento.");
      return;
    }
    if (!adjustingId) return;

    const payload = {
      actualAmount: Number(adjustVal).toFixed(2),
      differenceReason: adjustReason.trim(),
      recordedBy
    };

    setLoading(true);
    try {
      await apiRequest<unknown>(`/daily-collection-records/${adjustingId}/adjustment`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setAdjustingId(null);
      fetchRecords(page);

      if (onRefreshSystemData) {
        onRefreshSystemData();
      }
    } catch (err: any) {
      alert("Error al guardar ajuste en API: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records;

  return (
    <SectionShell kicker="AUDITORÍA Y BALANCE" title="Control Físico de Recolección Diaria">
      <div className="flex flex-col gap-6 mx-2 md:mx-6 my-1">
        
        
        {hasPersonnelEndpoint && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between items-stretch gap-4 bg-[#0a0f0f]/80 p-5 rounded-md border border-[#67ACA9]/20 shadow-lg">
            <div className="flex flex-col">
              <span className="text-xs font-mono text-[#69BFB7] uppercase tracking-widest">Protocolo de Registro Directo</span>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mt-1">Ingreso Auditado de Cosecha y Suministros</h3>
              <p className="text-[11px] sm:text-xs text-[#A4C2C5]/70 mt-0.5">Gestione entradas locales verificadas sin intermediarios en {currentCamp?.name || `Campamento #${campId}`}</p>
            </div>
            <div className="flex items-center">
              <Btn 
                variant={showManualForm ? "danger" : "success"}
                onClick={() => setShowManualForm(!showManualForm)}
                className="w-full sm:w-auto text-xs sm:text-sm py-2 px-5 font-bold uppercase tracking-wider shadow-md hover:scale-105 transition-transform"
              >
                {showManualForm ? "✕ Cerrar Formulario" : "✛ Registrar Recolección Directa"}
              </Btn>
            </div>
          </div>
        )}

        
        {hasPersonnelEndpoint && showManualForm && (
          <div className="mission-card border-2 border-emerald-500/35 bg-[#060c0c]/95 p-5 rounded-md animate-in slide-in-from-top-4 duration-200">
            <div className="text-sm font-black text-white uppercase border-b border-[#67ACA9]/15 pb-2.5 mb-4 flex justify-between items-center">
              <span>Nueva Cosecha / Recolección</span>
              <span className="text-[10px] tracking-normal text-zinc-500 italic">Auditado en Tiempo Real</span>
            </div>
            
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-sm">
              <label className="flex flex-col gap-1.5 w-full">
                <span className="text-[#A4C2C5]/85 font-semibold text-xs sm:text-sm">Personal de Cosecha / Producción *</span>
                <select value={personId} onChange={e => setPersonId(Number(e.target.value))} className="v-select py-2 text-sm bg-black/80 border-[#67ACA9]/20 text-white rounded">
                  {currentRoster.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (ID #{p.id})</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 w-full">
                <span className="text-[#A4C2C5]/85 font-semibold text-xs sm:text-sm">Tipo de Recurso *</span>
                <select value={resourceTypeId} onChange={e => setResourceTypeId(Number(e.target.value))} className="v-select py-2 text-sm bg-black/80 border-[#67ACA9]/20 text-white rounded">
                  {resourceTypes.map(rt => {
                    const mappedId = MAP_RESOURCE_STR_TO_ID[rt.id] || rt.id;
                    return (
                      <option key={rt.id} value={mappedId}>{rt.name}</option>
                    );
                  })}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 w-full">
                <span className="text-[#A4C2C5]/85 font-semibold text-xs sm:text-sm">Fecha de Registro *</span>
                <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="v-input py-2 text-sm bg-black/80 border-[#67ACA9]/20 text-white rounded" />
              </label>

              <label className="flex flex-col gap-1.5 w-full">
                <span className="text-[#A4C2C5]/85 font-semibold text-xs sm:text-sm">Cantidad Esperada (Meta Planificada)</span>
                <div className="relative">
                  <input 
                    type="text" 
                    value={expectedAmount} 
                    disabled 
                    className="v-input py-2 text-sm bg-[#121919] border-zinc-700 font-mono text-zinc-400 cursor-not-allowed w-full rounded"
                  />
                  <span className="text-[10px] text-amber-500/90 font-bold block mt-1">Fijado según el plan táctico asignado</span>
                </div>
              </label>

              <label className="flex flex-col gap-1.5 w-full">
                <span className="text-[#A4C2C5]/85 font-semibold text-xs sm:text-sm">Cantidad Real Recolectada *</span>
                <input 
                  type="text" 
                  value={actualAmount} 
                  onChange={e => setActualAmount(e.target.value)} 
                  className="v-input py-2 text-sm text-white bg-black font-semibold font-mono border-[#67ACA9]/40 w-full rounded focus:border-[#69BFB7]" 
                  placeholder="ej: 115.50" 
                />
              </label>

              <label className="flex flex-col gap-1.5 w-full col-span-1 md:col-span-2 lg:col-span-1">
                <span className="text-[#A4C2C5]/85 font-semibold text-xs sm:text-sm">Justificación de Diferencia / Comentario</span>
                <input 
                  type="text" 
                  value={differenceReason} 
                  onChange={e => setDifferenceReason(e.target.value)} 
                  className="v-input py-2 text-sm w-full bg-black/80 border-[#67ACA9]/20 text-white rounded focus:border-[#69BFB7]" 
                  placeholder="ej: Producción en invernaderos" 
                />
              </label>

              <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end gap-3 mt-4 border-t border-[#67ACA9]/10 pt-4">
                <Btn small={false} variant="ghost" className="text-xs sm:text-sm px-5 py-2" onClick={() => setShowManualForm(false)}>Cancelar</Btn>
                <Btn small={false} variant="success" className="text-xs sm:text-sm px-6 py-2 font-black tracking-wide" type="submit">Guardar Registro en Base</Btn>
              </div>
            </form>
          </div>
        )}

        
        <div className="bg-[#0c1212]/90 p-5 rounded-md border border-[#67ACA9]/15 shadow-md">
          <div className="text-xs sm:text-sm font-bold text-[#69BFB7] mb-3 uppercase tracking-wider flex items-center gap-2">
            <span>⚙ PANEL DE BÚSQUEDA Y FILTRADO</span>
            {(filterPerson || filterResource || filterDate) && (
              <span className="text-[10px] bg-red-950/40 text-red-400 px-2 py-0.5 rounded border border-red-500/20 font-mono animate-pulse">
                Filtros Activos
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="flex flex-col gap-1 w-full">
              <span className="text-[11px] sm:text-xs text-[#A4C2C5]/85 font-bold uppercase tracking-wider">Buscar persona por nombre o id</span>
              <input 
                type="text" 
                placeholder="Escriba el nombre o ID de la persona..." 
                value={filterPerson} 
                onChange={e => setFilterPerson(e.target.value)} 
                className="v-input text-xs sm:text-sm w-full py-2 px-3 bg-black/50 border-[#67ACA9]/20 text-white focus:border-[#69BFB7]/80 rounded" 
              />
            </div>

            
            <div className="flex flex-col gap-1 w-full">
              <span className="text-[11px] sm:text-xs text-[#A4C2C5]/85 font-bold uppercase tracking-wider">Filtrar por Recurso</span>
              <select 
                value={filterResource} 
                onChange={e => setFilterResource(e.target.value)} 
                className="v-select text-xs sm:text-sm w-full py-2 px-3 bg-[#111] border-[#67ACA9]/20 text-white rounded focus:border-[#69BFB7]/80"
              >
                <option value="">— Todos los Recursos —</option>
                {resourceTypes.map(rt => {
                  const mappedId = MAP_RESOURCE_STR_TO_ID[rt.id] || rt.id;
                  return (
                    <option key={rt.id} value={mappedId}>{rt.name}</option>
                  );
                })}
              </select>
            </div>

            
            <div className="flex flex-col gap-1 w-full">
              <span className="text-[11px] sm:text-xs text-[#A4C2C5]/85 font-bold uppercase tracking-wider">Filtrar por Fecha</span>
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={filterDate} 
                  onChange={e => setFilterDate(e.target.value)} 
                  className="v-input text-xs sm:text-sm w-full py-2 px-3 bg-black/50 border-[#67ACA9]/20 text-white focus:border-[#69BFB7]/80 rounded" 
                />
                
                {(filterPerson || filterResource || filterDate) && (
                  <button 
                    onClick={() => { setFilterPerson(""); setFilterResource(""); setFilterDate(""); }} 
                    className="text-red-400 font-bold hover:text-red-300 hover:underline text-xs bg-red-950/20 border border-red-500/25 px-2.5 py-2 rounded font-mono transition-colors whitespace-nowrap"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        
        <div className="mission-card border border-[#67ACA9]/20 bg-[#0d1414]/90 p-5 rounded-md shadow-lg">
          <div className="text-xs sm:text-sm font-bold text-[#69BFB7] mb-3 uppercase tracking-widest border-b border-[#67ACA9]/10 pb-2">
            Histórico de Cosechas Realizadas
          </div>

          
          <div className="hidden sm:block overflow-x-hidden">
            <div className="v-table-wrap max-h-[420px] overflow-y-auto animate-in fade-in duration-150">
              <table className="v-table w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#67ACA9]/30 text-[#69BFB7] uppercase font-bold text-[11px]">
                    <th className="py-2.5 pb-2">Fecha</th>
                    <th className="py-2.5 pb-2">Persona ID</th>
                    <th className="py-2.5 pb-2">Suministro / Recurso</th>
                    <th className="py-2.5 pb-2">Cantidad Esperada</th>
                    <th className="py-2.5 pb-2">Cantidad Real</th>
                    <th className="py-2.5 pb-2">Desviación / Diferencia</th>
                    <th className="py-2.5 pb-2 text-right">Controles de Calidad</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-[#A4C2C5]/40 italic text-sm">
                        No se detectaron registros de recolección para los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map(record => {
                      const rtStrId = MAP_RESOURCE_ID_TO_STR[record.resourceTypeId] || `rt-${record.resourceTypeId}`;
                      const rt = resourceTypes.find(t => t.id === rtStrId);
                      const actualNum = Number(record.actualAmount || 0);
                      const expectedNum = Number(record.expectedAmount || 0);
                      const diff = actualNum - expectedNum;
                      
                      const diffColor = diff > 0 ? "text-emerald-400 font-bold" : diff < 0 ? "text-rose-400 font-bold" : "text-sky-300";
                      
                      return (
                        <tr key={record.id} className="hover:bg-cyan-950/20 border-b border-[#67ACA9]/10 transition-colors">
                          <td className="font-mono py-3 font-semibold text-white">{record.date}</td>
                          <td className="font-semibold py-3 text-[#69BFB7]">{getPersonName(record.personId)} · <span className="text-zinc-500 font-mono text-[10px]">ID {record.personId}</span></td>
                          <td className="py-3 font-medium text-white">{rt?.name || rtStrId}</td>
                          <td className="font-mono py-3 text-[#A4C2C5]/80">{expectedNum.toFixed(2)} {rt?.unitOfMeasure}</td>
                          <td className="text-white py-3 font-mono font-bold">{actualNum.toFixed(2)} {rt?.unitOfMeasure}</td>
                          <td className={`${diffColor} py-3 font-bold font-mono`}>
                            {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} {rt?.unitOfMeasure}
                          </td>
                          <td className="text-right py-3">
                            <div className="flex gap-2 justify-end">
                              <Btn small variant="ghost" onClick={() => setSelectedDetailRecord(record)}>
                                Detalle
                              </Btn>
                              {Number(record.campId) === campId && (
                                <Btn small variant="warning" onClick={() => {
                                  setAdjustingId(record.id);
                                  setAdjustVal(String(record.actualAmount));
                                  setAdjustReason(record.differenceReason || "");
                                }}>
                                  Ajustar Real
                                </Btn>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          
          <div className="block sm:hidden space-y-4">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-6 text-[#A4C2C5]/40 italic text-sm">
                No se detectaron registros de recolección para los filtros seleccionados.
              </div>
            ) : (
              filteredRecords.map(record => {
                const rtStrId = MAP_RESOURCE_ID_TO_STR[record.resourceTypeId] || `rt-${record.resourceTypeId}`;
                const rt = resourceTypes.find(t => t.id === rtStrId);
                const actualNum = Number(record.actualAmount || 0);
                const expectedNum = Number(record.expectedAmount || 0);
                const diff = actualNum - expectedNum;
                const diffColor = diff > 0 ? "text-emerald-400 font-bold" : diff < 0 ? "text-rose-400 font-bold" : "text-sky-300";

                return (
                  <div key={record.id} className="p-4 bg-black/45 border border-[#67ACA9]/20 rounded-sm space-y-2.5 text-xs sm:text-sm">
                    <div className="flex justify-between items-center border-b border-[#67ACA9]/10 pb-1.5">
                      <span className="text-[12px] font-bold text-[#69BFB7]">{getPersonName(record.personId)} · <span className="text-zinc-500 font-mono text-[10px]">ID {record.personId}</span></span>
                      <span className="text-[11px] font-mono text-zinc-400">{record.date}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-[#A4C2C5]/60 block uppercase">Recurso</span>
                        <strong className="text-white text-[13px]">{rt?.name || rtStrId}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#A4C2C5]/60 block uppercase">Cantidad Real</span>
                        <strong className="text-white text-[13px] font-mono">{actualNum.toFixed(2)} {rt?.unitOfMeasure}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#A4C2C5]/60 block uppercase">Cantidad Esperada</span>
                        <span className="text-zinc-300 font-mono">{expectedNum.toFixed(2)} {rt?.unitOfMeasure}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#A4C2C5]/60 block uppercase">Desviación</span>
                        <span className={`${diffColor} font-bold font-mono`}>
                          {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} {rt?.unitOfMeasure}
                        </span>
                      </div>
                    </div>

                    {record.differenceReason && (
                      <div className="text-[11px] bg-black/30 p-2 border border-[#67ACA9]/5 text-zinc-300 italic rounded">
                        <strong>Motivo:</strong> {record.differenceReason}
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-1 text-xs">
                      <Btn small variant="ghost" className="w-1/2 text-xs py-1.5" onClick={() => setSelectedDetailRecord(record)}>
                        Detalle
                      </Btn>
                      {Number(record.campId) === campId && (
                        <Btn small variant="warning" className="w-1/2 text-xs py-1.5" onClick={() => {
                          setAdjustingId(record.id);
                          setAdjustVal(String(record.actualAmount));
                          setAdjustReason(record.differenceReason || "");
                        }}>
                          Ajustar Real
                        </Btn>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          
          {loading && (
            <div className="flex justify-center items-center py-6 gap-2 text-xs text-[#69BFB7] italic font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-[#69BFB7] animate-ping"></span>
              Consultando base de datos táctica en tiempo real...
            </div>
          )}
          {error && (
            <div className="text-center py-6 text-rose-400 bg-red-950/20 border border-red-500/30 rounded text-xs flex flex-col items-center gap-3">
              <span>⚠️ {error}</span>
              <Btn small variant="ghost" onClick={() => fetchRecords(page)} className="border border-rose-500/20 px-4 py-1.5 hover:bg-rose-950/20">
                🔄 Reintentar Cargar Datos
              </Btn>
            </div>
          )}
          {!loading && !error && totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#67ACA9]/10">
              <div className="text-[11px] text-[#A4C2C5]/60 font-mono">
                Página {page} de {totalPages}
              </div>
              <div className="flex gap-2">
                <Btn
                  small
                  variant="ghost"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className={page === 1 ? "opacity-40 cursor-not-allowed" : ""}
                >
                  ◀ Anterior
                </Btn>
                <Btn
                  small
                  variant="ghost"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className={page >= totalPages ? "opacity-40 cursor-not-allowed" : ""}
                >
                  Siguiente ▶
                </Btn>
              </div>
            </div>
          )}
        </div>

        
        {adjustingId !== null && (
          <div className="p-4 bg-black/90 border border-amber-500/40 rounded-sm bg-gradient-to-r from-amber-950/20 to-black/40 text-xs sm:text-sm animate-in slide-in-from-top-2 duration-150">
            <div className="font-extrabold text-amber-400 mb-2 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Ajustar Cantidad Real para Auditoría Física
            </div>
            <div className="bg-[#67ACA9]/5 border border-[#67ACA9]/10 p-3 rounded-sm mb-4">
              <span className="text-[10px] text-[#A4C2C5]/60 uppercase block">Registro de Sólo Lectura:</span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs text-zinc-300 mt-1">
                <span>Registro: <strong className="text-white font-mono">#{adjustingId}</strong></span>
                <span>Persona: <strong className="text-white font-mono">#{(filteredRecords.find(r => r.id === adjustingId))?.personId}</strong></span>
                <span>Recurso: <strong className="text-white font-mono">{
                  (() => {
                    const rec = filteredRecords.find(r => r.id === adjustingId);
                    const strId = rec ? MAP_RESOURCE_ID_TO_STR[rec.resourceTypeId] : "";
                    return resourceTypes.find(t => t.id === strId)?.name || "—";
                  })()
                }</strong></span>
                <span>Cantidad esperada: <strong className="text-white font-mono">{(filteredRecords.find(r => r.id === adjustingId))?.expectedAmount}</strong></span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-[#A4C2C5] font-semibold">Cantidad Real Corregida:</span>
                <input 
                  type="text" 
                  value={adjustVal} 
                  onChange={e => setAdjustVal(e.target.value)} 
                  className="v-input py-2 text-center font-mono text-white bg-black border-zinc-700 rounded" 
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-[#A4C2C5] font-semibold">Justificación Técnica del Ajuste:</span>
                <input 
                  type="text" 
                  value={adjustReason} 
                  onChange={e => setAdjustReason(e.target.value)} 
                  className="v-input py-2 text-white bg-zinc-950 border-zinc-700 rounded" 
                  placeholder="ej: Corrección validada por reconteo físico" 
                />
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-2 border-t border-[#67ACA9]/10 pt-3">
              <Btn small variant="ghost" onClick={() => setAdjustingId(null)}>Descartar</Btn>
              <Btn small variant="success" className="font-bold px-4 py-1.5" onClick={handleAdjustmentSubmit}>
                Confirmar Ajuste Físico ✔
              </Btn>
            </div>
          </div>
        )}

        
        {selectedDetailRecord && (
          <div className="p-5 bg-[#0a0f0f] border border-[#67ACA9]/45 rounded-md relative animate-in fade-in duration-150">
            <button 
              className="absolute top-3 right-3 text-[#A4C2C5]/70 hover:text-white font-mono text-lg font-bold" 
              onClick={() => setSelectedDetailRecord(null)}
            >
              ✕
            </button>
            <div className="font-extrabold text-[#69BFB7] mb-3.5 uppercase tracking-wider border-b border-[#67ACA9]/15 pb-2 flex items-center gap-2 text-sm sm:text-base">
              <Info className="h-5 w-5" />
              Boleta Detallada de Auditoría Física de Recolección
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-black/60 p-4 rounded-md border border-[#67ACA9]/10 text-xs sm:text-sm">
              <div>
                <span className="text-[#A4C2C5]/50 uppercase text-[10px] block">ID de Registro:</span>
                <span className="font-mono text-white font-bold">#{selectedDetailRecord.id}</span>
              </div>
              <div>
                <span className="text-[#A4C2C5]/50 uppercase text-[10px] block">Campamento Sede:</span>
                <span className="text-white font-bold">{currentCamp?.name || `Campamento ID #${selectedDetailRecord.campId}`}</span>
              </div>
              <div>
                <span className="text-[#A4C2C5]/50 uppercase text-[10px] block">Persona Productora:</span>
                <span className="text-[#69BFB7] font-mono font-bold">Persona ID #{selectedDetailRecord.personId}</span>
              </div>
              <div>
                <span className="text-[#A4C2C5]/50 uppercase text-[10px] block">Recurso y Categoría:</span>
                <span className="text-white font-bold">
                  {(() => {
                    const strId = MAP_RESOURCE_ID_TO_STR[selectedDetailRecord.resourceTypeId];
                    return resourceTypes.find(t => t.id === strId)?.name || strId;
                  })()}
                </span>
              </div>
              <div>
                <span className="text-[#A4C2C5]/50 uppercase text-[10px] block">Fecha de Registro:</span>
                <span className="text-white font-mono">{selectedDetailRecord.date}</span>
              </div>
              <div>
                <span className="text-[#A4C2C5]/50 uppercase text-[10px] block">Origen / Movimiento Asociado:</span>
                <span className="font-mono text-zinc-400">{selectedDetailRecord.movementId || "Validación física manual de stock"}</span>
              </div>
              <div>
                <span className="text-[#A4C2C5]/50 uppercase text-[10px] block">Cantidad Esperada:</span>
                <span className="text-white font-bold font-mono">{Number(selectedDetailRecord.expectedAmount).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[#A4C2C5]/50 uppercase text-[10px] block">Cantidad Real Certificada:</span>
                <span className="text-white font-bold font-mono">{Number(selectedDetailRecord.actualAmount).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[#A4C2C5]/50 uppercase text-[10px] block">Estado de Auditoría:</span>
                <span className="text-emerald-400 font-semibold uppercase font-mono">Verificado localmente</span>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Btn small variant="ghost" onClick={() => setSelectedDetailRecord(null)}>Cerrar Boleta</Btn>
            </div>
          </div>
        )}

      </div>
    </SectionShell>
  );
}


export function ViewMovimientosInventario({
  camps,
  resourceTypes,
  inventoryMovements,
  onAddManualMovement,
  onDeleteMovement
}: {
  camps: Camp[];
  resourceTypes: ResourceType[];
  inventoryMovements: InventoryMovement[];
  onAddManualMovement: (data: Omit<InventoryMovement, "id">) => void;
  onDeleteMovement: (id: string) => void;
}) {
  const campId = currentUser.campId;
  const legacyCampId = String(campId);
  const [resourceTypeId, setResourceTypeId] = useState("rt-food");
  const [amount, setAmount] = useState("");
  const [movementType, setMovementType] = useState<InventoryMovement["movementType"]>("MANUAL_ADJUSTMENT");
  const [description, setDescription] = useState("");
  const recordedBy = String(currentUser.userId);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    onAddManualMovement({
      campId: legacyCampId,
      resourceTypeId,
      amount: Number(amount),
      movementType,
      sourceId: `source-man-${Date.now().toString().slice(-4)}`,
      sourceType: "MANUAL",
      recordedBy,
      date: new Date().toISOString().substring(11, 16) + " UTC",
      description
    });
    setAmount("");
    setDescription("");
  };

  return (
    <SectionShell kicker="AUDITORÍA DE STOCK" title="Operaciones y Movimientos de Inventario">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        
        <form onSubmit={handleCreate} className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-3 rounded-sm lg:col-span-4 flex flex-col gap-3">
          <div className="text-xs font-bold text-[#69BFB7] uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-1">Registrar Operación Manual de Inventario</div>

          <div className="flex flex-col gap-1 text-xs mx-3 px-3 py-1.5 border border-[#67ACA9]/15 bg-[#0a0f0f]/40 rounded-sm">
            <span className="v-field-label text-[#A4C2C5]/70 font-semibold text-[10px]">Campamento Activo</span>
            <span className="bg-[#050808]/75 text-[#69BFB7] border border-[#67ACA9]/10 select-none flex items-center px-2 py-1 h-[30px] font-bold rounded-xs truncate text-[11px]">
              {camps.find(c => c.id === legacyCampId)?.name || "Alpha Bunker"} (Asignado)
            </span>
          </div>

          <label className="v-field flex flex-col gap-1 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Tipo Recurso *</span>
            <select value={resourceTypeId} onChange={e => setResourceTypeId(e.target.value)} className="v-select">
              {resourceTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="v-field flex flex-col gap-1">
              <span className="v-field-label text-[#A4C2C5]/70 font-bold">Unidades Operación</span>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="v-input" placeholder="0" />
            </label>
            <label className="v-field flex flex-col gap-1">
              <span className="v-field-label text-[#A4C2C5]/70 font-bold">Concepto de Movimiento</span>
              <select value={movementType} onChange={e => setMovementType(e.target.value as any)} className="v-select text-[10px]">
                <option value="DAILY_COLLECTION">Entrada (Cosecha/Recolección)</option>
                <option value="DAILY_RATION">Consumo (Racionamiento Diario)</option>
                <option value="EXPEDITION_DEPARTURE">Salida (Expedicion Táctica)</option>
                <option value="EXPEDITION_RETURN">Entrada (Retorno Expedición)</option>
                <option value="TRANSFER_SENT">Salida (Traslado Enviado)</option>
                <option value="TRANSFER_RECEIVED">Entrada (Traslado Recibido)</option>
                <option value="MANUAL_ADJUSTMENT">Ajuste Manual d-AL</option>
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-1 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70">Responsable Auditor</span>
            <span className="v-input bg-black/20 text-[#A4C2C5]/50 border border-[#67ACA9]/10 select-none flex items-center px-2 py-1.5 h-[34px] rounded-sm font-mono text-[10px]">
              Personal de Guardia (Firmado)
            </span>
          </div>

          <label className="v-field flex flex-col gap-1 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70">Fundamento Técnico o Detalle</span>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="v-input" placeholder="Por ej. Ajuste de stock por auditoría" />
          </label>

          <Btn variant="primary" onClick={() => {}} style={{ width: "100%", padding: "8px" }}>Insertar Operación en Historial</Btn>
        </form>

        
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-3 rounded-sm lg:col-span-8 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-amber-400 uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-2 flex justify-between items-center">
              <span>Registro de Operaciones de Inventario</span>
              <span className="text-[9px] text-[#A4C2C5]/50 font-mono italic">Auditoría Habilitada</span>
            </div>

            <div className="v-table-wrap max-h-80 overflow-y-auto">
              <table className="v-table text-[10px]">
                <thead>
                  <tr>
                    <th>Campamento</th>
                    <th>Movimiento</th>
                    <th>Recurso</th>
                    <th>Cantidad</th>
                    <th>Responsable</th>
                    <th>Fundamento</th>
                    <th className="text-right">Auditoría</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryMovements.slice().reverse().map(mv => {
                    const camp = camps.find(c => c.id === mv.campId);
                    const rt = resourceTypes.find(t => t.id === mv.resourceTypeId);
                    return (
                      <tr key={mv.id} className="hover:bg-rose-950/5">
                        <td className="font-bold text-white">{camp?.name || mv.campId}</td>
                        <td className="font-mono text-[9px] text-[#A4C2C5]/80">{mv.movementType}</td>
                        <td>{rt?.name || mv.resourceTypeId}</td>
                        <td className="font-mono font-bold text-white">{mv.amount} {rt?.unitOfMeasure}</td>
                        <td className="text-[#69BFB7]">{mv.recordedBy}</td>
                        <td className="italic text-[9px]">{mv.description}</td>
                        <td className="text-right">
                          <span className="text-[9px] text-[#A4C2C5]/40 italic">Auditado</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </SectionShell>
  );
}


export function ViewAlertasInventario({
  camps,
  resourceTypes,
  inventoryAlerts,
  onResolveAlert
}: {
  camps: Camp[];
  resourceTypes: ResourceType[];
  inventoryAlerts: InventoryAlert[];
  onResolveAlert: (id: string, resolvedBy: string) => void;
}) {
  const resolver = "Personal Autorizado";
  const campId = currentUser.campId;


  const filteredAlerts = inventoryAlerts.filter(alert => {
    const alertCampIdStr = String(alert.campId);
    const camp = camps.find(c => String(c.id) === alertCampIdStr || (typeof c.id === 'number' && c.id === Number(alertCampIdStr)));
    if (!camp) return false;
    const numericCampIdOfAlert = isNaN(Number(camp.id)) ? 0 : Number(camp.id);
    return numericCampIdOfAlert === campId;
  });

  return (
    <SectionShell kicker="MONITOREO DE ALARMAS DE SEGURIDAD" title="Alertas de Inventario">
      <div className="grid grid-cols-1 gap-5">
        
        
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm flex flex-col gap-3">
          <div className="border-b border-[#67ACA9]/10 pb-2 mb-2">
            <div className="text-xs font-bold text-rose-400 uppercase">Alertas de Almacén Registradas (Campamento Actual)</div>
            <p className="text-[11px] text-[#A4C2C5]/70 mt-1">
              Monitoreo operativo de alarmas automáticas activadas cuando los niveles de existencias descienden de los límites de seguridad provistos en su sede.
            </p>
          </div>

          <div className="v-table-wrap">
            <table className="v-table text-[10px]">
              <thead>
                <tr>
                  <th>Campamento</th>
                  <th>Suministro Recurso</th>
                  <th>Generación de Alerta</th>
                  <th>Fecha de Alerta</th>
                  <th>Estado</th>
                  <th className="text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-zinc-500 font-mono italic">
                      No hay alertas activas registradas para su campamento.
                    </td>
                  </tr>
                ) : (
                  filteredAlerts.map(alert => {
                    const camp = camps.find(c => c.id === alert.campId);
                    const rt = resourceTypes.find(t => t.id === alert.resourceTypeId);
                    return (
                      <tr key={alert.id} className="hover:bg-cyan-950/5">
                        <td className="font-bold text-white">{camp?.name || alert.campId}</td>
                        <td className="text-[#69BFB7] font-semibold">{rt?.name || alert.resourceTypeId}</td>
                        <td className="font-mono text-white font-semibold">{alert.amountAtAlertGeneration} {rt?.unitOfMeasure}</td>
                        <td>{alert.alertDate}</td>
                        <td>
                          <span className={`px-1.5 py-0.5 rounded-sm font-bold text-[8px] uppercase border ${alert.resolved ? 'border-emerald-500/30 text-emerald-300 bg-emerald-950/25' : 'border-rose-500/30 text-rose-300 bg-rose-950/25 animate-pulse'}`}>
                            {alert.resolved ? "RESUELTO" : "ACTIVO • ALERTA"}
                          </span>
                        </td>
                        <td className="text-right">
                          {!alert.resolved ? (
                            <Btn small variant="success" onClick={() => onResolveAlert(alert.id, resolver)}>Marcar Resuelta ✓</Btn>
                          ) : (
                            <span className="text-[9px] text-[#A4C2C5]/50 font-mono italic">Resuelta</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </SectionShell>
  );
}


export function ViewSolicitudesIntercampamento({
  camps,
  resourceTypes,
  intercampRequests,
  requestResourceDetails,
  onAddRequest,
  onUpdateRequestStatus,
  onAddResourceToRequest,
  onDeleteRequestResource
}: {
  camps: Camp[];
  resourceTypes: ResourceType[];
  intercampRequests: IntercampRequest[];
  requestResourceDetails: RequestResourceDetail[];
  onAddRequest: (data: Omit<IntercampRequest, "id">) => void;
  onUpdateRequestStatus: (id: string, status: IntercampRequest["status"], responder: string) => void;
  onAddResourceToRequest: (requestId: string, resourceTypeId: string, requestedAmount: number) => void;
  onDeleteRequestResource: (id: string) => void;
}) {
  const campIdVal = currentUser.campId;
  const originCampId = String(campIdVal);
  const [destinationCampId, setDestinationCampId] = useState("");
  const [description, setDescription] = useState("");
  const [plannedDepartureDate, setPlannedDepartureDate] = useState("2026-05-20");
  const [plannedArrivalDate, setPlannedArrivalDate] = useState("2026-05-21");
  const [reqOccupationId, setReqOccupationId] = useState("");
  const [reqPersonQty, setReqPersonQty] = useState("");
  const [requestTab, setRequestTab] = useState<"sent" | "received">("sent");
  const createdBy = String(currentUser.userId);


  useEffect(() => {
    const defaultCamp = camps.find(c => c.id !== originCampId);
    if (defaultCamp && (!destinationCampId || destinationCampId === originCampId)) {
      setDestinationCampId(defaultCamp.id);
    }
  }, [camps, destinationCampId, originCampId]);


  const [activeReqId, setActiveReqId] = useState<string | null>(null);


  const [resourceTypeId, setResourceTypeId] = useState("rt-food");
  const [qty, setQty] = useState("");

  const selectedRequest = intercampRequests.find(r => r.id === activeReqId);

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationCampId) {
      alert("El campamento de destino es obligatorio.");
      return;
    }
    if (destinationCampId === originCampId) {
      alert("El campamento destino no puede ser tu propio campamento.");
      return;
    }
    if (!description.trim()) {
      alert("La motivación o descripción del reabastecimiento es obligatoria.");
      return;
    }
    if (new Date(plannedArrivalDate) < new Date(plannedDepartureDate)) {
      alert("La fecha de llegada proyectada no puede ser anterior a la salida planificada.");
      return;
    }

    let personRequirements: { occupationId: string; quantity: number }[] = [];
    if (reqOccupationId || reqPersonQty) {
      if (!reqOccupationId) {
        alert("Debes seleccionar el Oficio/Rol para el requerimiento de personal.");
        return;
      }
      const qtyNum = Number(reqPersonQty);
      if (isNaN(qtyNum) || qtyNum <= 0) {
        alert("La cantidad de personal requerida debe ser un número entero mayor a 0.");
        return;
      }
      personRequirements = [{ occupationId: reqOccupationId, quantity: Math.floor(qtyNum) }];
    }

    onAddRequest({
      originCampId,
      destinationCampId,
      status: "PENDING",
      description,
      plannedDepartureDate,
      plannedArrivalDate,
      personRequirements,
      createdDate: new Date().toLocaleDateString("es-ES"),
      createdBy
    });
    setDescription("");
    setReqOccupationId("");
    setReqPersonQty("");
  };

  const currentDetails = requestResourceDetails.filter(d => d.requestId === activeReqId);


  const sentRequests = intercampRequests.filter(req => req.originCampId === originCampId);
  const receivedRequests = intercampRequests.filter(req => req.destinationCampId === originCampId);
  const activeRequestsToShow = requestTab === "sent" ? sentRequests : receivedRequests;

  return (
    <SectionShell kicker="COORDINACIÓN LOGÍSTICA SUCURSAL" title="Solicitudes de Reabastecimiento Intercampamento">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        
        <form onSubmit={handleCreateRequest} className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-3 rounded-sm lg:col-span-4 flex flex-col gap-3">
          <div className="text-xs font-bold text-[#69BFB7] uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-1">Nueva Solicitud Intercampamento</div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex flex-col gap-1">
              <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Campamento Origen *</span>
              <span className="v-input bg-black/20 text-[#69BFB7] border border-[#67ACA9]/20 select-none flex items-center px-2 py-1.5 h-[34px] font-bold rounded-sm text-[11px]">
                {camps.find(c => c.id === originCampId)?.name || "Bunker Propio"}
              </span>
            </div>
            <label className="v-field flex flex-col gap-1">
              <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Campamento Destino *</span>
              <select value={destinationCampId} onChange={e => setDestinationCampId(e.target.value)} className="v-select text-[11px]">
                {camps.filter(c => c.id !== originCampId).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <DateTimeField 
              label="Salida Planificada"
              value={plannedDepartureDate}
              onChange={setPlannedDepartureDate}
            />
            <DateTimeField 
              label="Llegada Proyectada"
              value={plannedArrivalDate}
              onChange={setPlannedArrivalDate}
            />
          </div>

          
          <div className="border border-[#67ACA9]/20 p-2 rounded bg-black/25 text-xs flex flex-col gap-1.5">
            <span className="text-[#A4C2C5]/70 font-bold block mb-0.5 text-[10px]">REQUERIMIENTOS DE PERSONAL (OPCIONAL)</span>
            <div className="grid grid-cols-2 gap-1.5">
              <label className="flex flex-col gap-0.5">
                <span className="text-[9px] text-[#A4C2C5]/50">Oficio/Rol:</span>
                <select value={reqOccupationId} onChange={e => setReqOccupationId(e.target.value)} className="v-select text-[10px] !py-0.5">
                  <option value="">-- Ninguno --</option>
                  <option value="occ-soldier">Soldado de Base</option>
                  <option value="occ-pilot">Piloto Especializado</option>
                  <option value="occ-medic">Cuerpo Médico</option>
                  <option value="occ-driver">Conductor / Chofer</option>
                </select>
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-[9px] text-[#A4C2C5]/50">Cantidad:</span>
                <input type="number" value={reqPersonQty} onChange={e => setReqPersonQty(e.target.value)} className="v-input text-[10px] !py-0.5" placeholder="0" />
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-1 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Encargado de Solicitud</span>
            <span className="v-input bg-black/20 text-[#A4C2C5]/50 border border-[#67ACA9]/10 select-none flex items-center px-2 py-1.5 h-[34px] rounded-sm font-mono text-[10px]">
              Personal Autorizado
            </span>
          </div>

          <label className="v-field flex flex-col gap-1 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70">Motivación y detalles de recursos</span>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="v-input" placeholder="e.g. Alimento crítico para el personal minero de Bravo" />
          </label>

          <Btn variant="primary" onClick={() => {}} style={{ width: "100%", padding: "8px" }}>Crear Solicitud Intercampamento</Btn>
        </form>

        
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-3 rounded-sm lg:col-span-8 flex flex-col gap-4">
          <div>
            <div className="text-xs font-bold text-amber-400 uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-2">Canal Operativo de Solicitudes</div>
            
            
            <div className="flex gap-2 mb-3">
              <button 
                type="button"
                onClick={() => setRequestTab("sent")}
                className={`text-[10px] px-3 py-1.5 rounded-sm font-bold border transition ${requestTab === "sent" ? "bg-[#69BFB7]/20 border-[#69BFB7] text-[#69BFB7]" : "border-[#67ACA9]/10 text-[#A4C2C5]/60 hover:text-white bg-black/20"}`}
              >
                Solicitudes Enviadas ({sentRequests.length})
              </button>
              <button 
                type="button"
                onClick={() => setRequestTab("received")}
                className={`text-[10px] px-3 py-1.5 rounded-sm font-bold border transition ${requestTab === "received" ? "bg-[#69BFB7]/20 border-[#69BFB7] text-[#69BFB7]" : "border-[#67ACA9]/10 text-[#A4C2C5]/60 hover:text-white bg-black/20"}`}
              >
                Solicitudes Recibidas ({receivedRequests.length})
              </button>
            </div>

            <div className="v-table-wrap max-h-48 overflow-y-auto">
              <table className="v-table text-[10px]">
                <thead>
                  <tr>
                    <th>Origen</th>
                    <th>Destino</th>
                    <th>Estado</th>
                    <th>Creado por</th>
                    <th>Detalles / Nota</th>
                    <th className="text-right">Operar</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRequestsToShow.map(req => {
                    const origin = camps.find(c => c.id === req.originCampId);
                    const dest = camps.find(c => c.id === req.destinationCampId);
                    return (
                      <tr key={req.id} className={`hover:bg-cyan-950/5 ${activeReqId === req.id ? 'bg-[#67ACA9]/5' : ''}`}>
                        <td className="font-bold text-white">{origin?.name || req.originCampId}</td>
                        <td className="font-bold text-white">{dest?.name || req.destinationCampId}</td>
                        <td>
                          <span className={`px-1 py-0.5 rounded-xs font-mono font-bold text-[8px] border border-[#67ACA9]/10 uppercase ${req.status === 'APPROVED' ? 'bg-emerald-900/30 text-emerald-200' : req.status === 'PENDING' ? 'bg-amber-900/30 text-amber-200 animate-pulse' : 'bg-red-900/30 text-red-200'}`}>
                            {req.status}
                          </span>
                        </td>
                        <td>{req.createdBy}</td>
                        <td className="italic">{req.description}</td>
                        <td className="text-right flex gap-1 justify-end">
                          <Btn small variant="ghost" onClick={() => setActiveReqId(req.id)}>Ver Recursos</Btn>
                          {req.status === "PENDING" && requestTab === "received" && (
                            <>
                              <Btn small variant="success" onClick={() => onUpdateRequestStatus(req.id, "APPROVED", String(currentUser.userId))}>Aprobar</Btn>
                              <Btn small variant="danger" onClick={() => onUpdateRequestStatus(req.id, "REJECTED", String(currentUser.userId))}>Rechazar</Btn>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          
          {activeReqId && selectedRequest && (
            <div className="p-3 bg-black/45 border border-[#67ACA9]/30 rounded-sm">
              <div className="flex justify-between items-center border-b border-[#67ACA9]/15 pb-1 mb-2">
                <span className="text-xs font-bold text-[#69BFB7]">Detalle de Recursos para Solicitud ({selectedRequest.id})</span>
                <button type="button" className="text-red-400 hover:text-white" onClick={() => setActiveReqId(null)}>✕</button>
              </div>

              
              {selectedRequest.status === "PENDING" && (
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-3 items-end">
                  <div className="col-span-5 flex flex-col gap-0.5 text-[10px]">
                    <span className="text-[#A4C2C5]/70">Tipo de Recurso</span>
                    <select value={resourceTypeId} onChange={e => setResourceTypeId(e.target.value)} className="v-select py-1 text-xs">
                      {resourceTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3 flex flex-col gap-0.5 text-[10px]">
                    <span className="text-[#A4C2C5]/70">Ración Cantidad *</span>
                    <input type="number" value={qty} onChange={e => setQty(e.target.value)} className="v-input py-1 text-xs text-center" placeholder="0" />
                  </div>
                  <div className="col-span-4">
                    <Btn small variant="primary" style={{ width: "100%", padding: "5px" }} onClick={() => {
                      const qtyNum = Number(qty);
                      if (isNaN(qtyNum) || qtyNum <= 0 || !Number.isInteger(qtyNum)) {
                        alert("La cantidad de recurso debe ser un número entero mayor a 0.");
                        return;
                      }
                      onAddResourceToRequest(selectedRequest.id, resourceTypeId, qtyNum);
                      setQty("");
                    }}>Agregar Articulo</Btn>
                  </div>
                </div>
              )}

              
              <div className="v-table-wrap max-h-32 overflow-y-auto">
                <table className="v-table text-[10px]">
                  <thead>
                    <tr>
                      <th>Recurso Tipo</th>
                      <th>Solicitado</th>
                      <th>Aprobado</th>
                      <th className="text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentDetails.map(det => {
                      const type = resourceTypes.find(t => t.id === det.resourceTypeId);
                      return (
                        <tr key={det.id}>
                          <td className="font-bold text-white">{type?.name || det.resourceTypeId}</td>
                          <td>{det.requestedAmount} {type?.unitOfMeasure}</td>
                          <td className="text-emerald-300 font-bold">{selectedRequest.status === "APPROVED" ? det.requestedAmount : "Pendiente"}</td>
                          <td className="text-right">
                            <Btn small variant="danger" disabled={selectedRequest.status !== "PENDING"} onClick={() => onDeleteRequestResource(det.id)}>Eliminar</Btn>
                          </td>
                        </tr>
                      );
                    })}
                    {currentDetails.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-4 text-[#A4C2C5]/50 italic">Sin recursos vinculados. Agregue ítems arriba.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>
    </SectionShell>
  );
}


export function ViewTraslados({
  camps,
  intercampRequests,
  transfers,
  transferPersons,
  onAddTransfer,
  onUpdateTransferStatus,
  onAddPersonToTransfer,
  onUpdatePersonStatus,
  onDeletePersonFromTransfer
}: {
  camps: Camp[];
  intercampRequests: IntercampRequest[];
  transfers: Transfer[];
  transferPersons: TransferPerson[];
  onAddTransfer: (data: Omit<Transfer, "id">) => void;
  onUpdateTransferStatus: (id: string, status: Transfer["status"], notes: string) => void;
  onAddPersonToTransfer: (transferId: string, personId: string) => void;
  onUpdatePersonStatus: (id: string, status: TransferPerson["status"]) => void;
  onDeletePersonFromTransfer: (id: string) => void;
}) {
  const [requestId, setRequestId] = useState("");
  const [depDate, setDepDate] = useState("2026-05-20");
  const [arrDate, setArrDate] = useState("2026-05-21");

  const [activeTransferId, setActiveTransferId] = useState<string | null>(null);
  const [personId, setPersonId] = useState("");

  const [notes, setNotes] = useState("");

  const approvedRequests = intercampRequests.filter(r => r.status === "APPROVED" && !transfers.some(t => t.requestId === r.id));

  const calculateRationsForTrip = (
    peopleCount: number,
    depDateStr: string,
    arrDateStr: string
  ): number => {
    if (peopleCount === 0 || !depDateStr || !arrDateStr) return 0;
    const departure = new Date(depDateStr);
    const arrival = new Date(arrDateStr);
    if (isNaN(departure.getTime()) || isNaN(arrival.getTime())) return 0;
    
    const diffTime = Math.max(0, arrival.getTime() - departure.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const durationDays = Math.max(1, diffDays); 
    
    const minimumDailyRationPerPerson = 1.50; 
    return peopleCount * minimumDailyRationPerPerson * durationDays;
  };

  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestId) {
      alert("Seleccione una solicitud aprobada.");
      return;
    }
    const matchedReq = approvedRequests.find(r => r.id === requestId);
    if (!matchedReq) {
      alert("No se encontró la solicitud seleccionada.");
      return;
    }

    onAddTransfer({
      requestId,
      plannedDepartureDate: matchedReq.plannedDepartureDate,
      plannedArrivalDate: matchedReq.plannedArrivalDate,
      status: "PLANNING",
      rationsForTrip: 0, 
    });
    setRequestId("");
  };

  const selectedTransfer = transfers.find(t => t.id === activeTransferId);
  const selectedReq = selectedTransfer ? intercampRequests.find(r => r.id === selectedTransfer.requestId) : null;
  const currentPersons = transferPersons.filter(tp => tp.transferId === activeTransferId);

  return (
    <SectionShell kicker="COORDINACIÓN LOGÍSTICA SUCURSAL" title="Gestión de Convoyes e Historial de Traslado">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-3 rounded-sm lg:col-span-4 flex flex-col gap-3">
          <div className="text-xs font-bold text-emerald-400 uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-1">Habilitar Traslado desde Solicitud Aprobada</div>

          {approvedRequests.length > 0 ? (
            <form onSubmit={handleCreateTransfer} className="flex flex-col gap-3 text-xs">
              <label className="v-field flex flex-col gap-1">
                <span className="v-field-label text-[#A4C2C5]/70">Solicitud Aprobada Relacionada *</span>
                <select value={requestId} onChange={e => setRequestId(e.target.value)} className="v-select">
                  <option value="">Seleccionar Solicitud...</option>
                  {approvedRequests.map(r => (
                    <option key={r.id} value={r.id}>{r.id} - ({r.description})</option>
                  ))}
                </select>
              </label>

              {requestId && (() => {
                const req = approvedRequests.find(r => r.id === requestId);
                return (
                  <div className="bg-[#67ACA9]/5 border border-[#67ACA9]/10 p-2.5 rounded-sm flex flex-col gap-1 text-[10px] font-mono leading-normal text-[#A4C2C5]">
                    <span className="text-[#69BFB7] font-bold uppercase text-[9px] mb-0.5">Datos Heredados de Solicitud</span>
                    <div>• <strong>Salida Planificada:</strong> {req?.plannedDepartureDate}</div>
                    <div>• <strong>Llegada Proyectada:</strong> {req?.plannedArrivalDate}</div>
                    <div>• <strong>Origen:</strong> {camps.find(c => c.id === req?.originCampId)?.name}</div>
                    <div>• <strong>Destino:</strong> {camps.find(c => c.id === req?.destinationCampId)?.name}</div>
                  </div>
                );
              })()}

              <div className="p-3 border border-[#67ACA9]/25 bg-black/40 rounded-sm flex flex-col gap-1 select-none">
                <span className="text-[9.5px] font-mono text-[#A4C2C5]/60 block uppercase">Cálculo Raciones Estimadas</span>
                <span className="text-[10.5px] font-bold text-cyan-300">Provisión Automatizada via Backend</span>
                <span className="text-[9px] text-[#A4C2C5]/50 italic leading-snug">Las raciones definitivas se sincronizan automáticamente una vez asigne escoltas al convoy de traslado.</span>
              </div>

              <Btn variant="primary" onClick={() => {}} style={{ width: "100%", padding: "8px" }}>Habilitar Manifiesto de Convoy</Btn>
            </form>
          ) : (
            <div className="text-[10px] text-amber-300 bg-amber-950/20 p-4 text-center rounded-sm border border-amber-500/20">
              No hay solicitudes de reabastecimiento intercampamento aprobadas pendientes de traslado.
            </div>
          )}
        </div>

        
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-3 rounded-sm lg:col-span-8 flex flex-col gap-4">
          <div>
            <div className="text-xs font-bold text-[#69BFB7] uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-2">Convoyes en Tránsito de Red</div>
            <div className="v-table-wrap max-h-48 overflow-y-auto">
              <table className="v-table text-[10px]">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Solicitud ID</th>
                    <th>Estado de Envío</th>
                    <th>Raciones Viaje</th>
                    <th>Salida Planificada</th>
                    <th className="text-right">Operar</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map(tr => (
                    <tr key={tr.id} className={`hover:bg-cyan-950/5 ${activeTransferId === tr.id ? 'bg-[#67ACA9]/5' : ''}`}>
                      <td className="font-bold text-white">{tr.id}</td>
                      <td>{tr.requestId}</td>
                      <td>
                        <span className={`px-1 py-0.5 rounded-xs font-bold text-[8px] uppercase border ${
                          tr.status === "DELIVERED" ? "border-emerald-500/30 text-emerald-300 bg-emerald-950/20" : 
                          tr.status === "EN_ROUTE" ? "border-sky-500/30 text-sky-300 bg-sky-950/20 animate-pulse" : 
                          tr.status === "CANCELED" ? "border-rose-500/30 text-rose-300 bg-rose-950/20" : 
                          "border-amber-500/30 text-amber-300 bg-amber-950/20"
                        }`}>
                          {tr.status}
                        </span>
                      </td>
                      <td>{tr.rationsForTrip} Raciones</td>
                      <td>{tr.plannedDepartureDate}</td>
                      <td className="text-right flex gap-1 justify-end flex-wrap max-w-xs ml-auto">
                        <Btn small variant="ghost" onClick={() => setActiveTransferId(tr.id)}>Escoltas</Btn>
                        {tr.status === "PLANNING" && (
                          <>
                            <Btn small variant="success" onClick={() => onUpdateTransferStatus(tr.id, "EN_ROUTE", "Viaje iniciado en ruta")}>Iniciar Viaje</Btn>
                            <Btn small variant="danger" onClick={() => onUpdateTransferStatus(tr.id, "CANCELED", "Cancelado desde planificación")}>Cancelar</Btn>
                          </>
                        )}
                        {tr.status === "EN_ROUTE" && (
                          <>
                            <Btn small variant="success" onClick={() => onUpdateTransferStatus(tr.id, "DELIVERED", "Entrega completada satisfactoriamente")}>Entregar ✓</Btn>
                            <Btn small variant="danger" onClick={() => onUpdateTransferStatus(tr.id, "CANCELED", "Cancelado en pleno tránsito")}>Cancelar</Btn>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          
          {activeTransferId && selectedTransfer && (
            <div className="p-3 bg-black/45 border border-[#67ACA9]/30 rounded-sm">
              <div className="flex justify-between items-center border-b border-[#67ACA9]/15 pb-1 mb-2">
                <span className="text-xs font-bold text-[#69BFB7]">Personal Asociado al Convoy ({selectedTransfer.id})</span>
                <button type="button" className="text-red-400 hover:text-white" onClick={() => setActiveTransferId(null)}>✕</button>
              </div>

              {selectedTransfer.status === "PLANNING" ? (
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-3 items-end">
                  <div className="col-span-8 flex flex-col gap-0.5 text-[10px]">
                    <span className="text-[#A4C2C5]/70">Ficha de Identidad Persona (Nombre/Código) *</span>
                    <input type="text" value={personId} onChange={e => setPersonId(e.target.value)} className="v-input py-1 text-xs" placeholder="e.g. p-soldier1" />
                  </div>
                  <div className="col-span-4">
                    <Btn small variant="primary" style={{ width: "100%", padding: "5px" }} onClick={() => {
                      if (!personId) return;
                      const regex = /^p-[a-zA-Z0-9-]+$/;
                      if (!regex.test(personId)) {
                        alert("El ID personal no es válido. Debe comenzar con 'p-' (ej. p-soldier1, p-agricultor-02).");
                        return;
                      }
                      onAddPersonToTransfer(selectedTransfer.id, personId);
                      setPersonId("");
                    }}>Vincular Escolta</Btn>
                  </div>
                </div>
              ) : (
                <div className="bg-[#67ACA9]/5 border border-[#67ACA9]/10 p-2 text-[10px] text-[#A4C2C5]/50 italic mb-2">
                  La asignación de personal está bloqueada porque el convoy se encuentra en estado {selectedTransfer.status}. Solo se admite modificación en estado PLANNING.
                </div>
              )}

              <div className="v-table-wrap max-h-32 overflow-y-auto">
                <table className="v-table text-[10px]">
                  <thead>
                    <tr>
                      <th>Identidad Persona</th>
                      <th>Estado de Tránsito</th>
                      <th className="text-right">Operar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPersons.map(tp => (
                      <tr key={tp.id}>
                        <td className="font-bold text-white">{tp.personId}</td>
                        <td>
                          <span className="px-1 py-0.5 text-[8px] font-mono rounded-xs font-bold bg-[#67ACA9]/20 text-white">
                            {tp.status}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-1">
                            <Btn small variant="danger" disabled={selectedTransfer.status !== "PLANNING"} onClick={() => onDeletePersonFromTransfer(tp.id)}>Quitar</Btn>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {currentPersons.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-center py-4 text-[#A4C2C5]/50 italic">Sin escoltas asignados al reparto. Vincule uno arriba.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              
              <div className="mt-3.5 p-2.5 bg-[#67ACA9]/5 border border-[#67ACA9]/15 rounded-xs text-[10px] font-mono leading-relaxed text-[#A4C2C5]">
                <span className="text-[#69BFB7] font-bold uppercase tracking-wider block mb-1 select-none">Cálculo de Provisión de Viaje:</span>
                <div className="flex justify-between items-center bg-black/25 px-2 py-1.5 rounded-xs border border-[#67ACA9]/10 select-none">
                  <span>Personas: <strong className="text-white">{currentPersons.length}</strong></span>
                  <span>Días: <strong className="text-white">{Math.max(1, Math.ceil((new Date(selectedTransfer.plannedArrivalDate).getTime() - new Date(selectedTransfer.plannedDepartureDate).getTime()) / (1000 * 60 * 60 * 24)) || 1)}d</strong></span>
                  <span className="font-bold">Total Est:</span>
                  {currentPersons.length === 0 ? (
                    <span className="text-amber-400 font-bold">Raciones pendientes</span>
                  ) : (
                    <span className="text-cyan-300 font-black">{(currentPersons.length * 1.50 * (Math.max(1, Math.ceil((new Date(selectedTransfer.plannedArrivalDate).getTime() - new Date(selectedTransfer.plannedDepartureDate).getTime()) / (1000 * 60 * 60 * 24)) || 1))).toFixed(2)} Raciones</span>
                  )}
                </div>
                <span className="text-[8.5px] text-[#A4C2C5]/40 block mt-1.5 italic select-none">
                  * Raciones calculadas automáticamente según personas y fechas de viaje.
                </span>
              </div>

            </div>
          )}
        </div>

      </div>
    </SectionShell>
  );
}


export function ViewRecursosExpediciones({
  resourceTypes,
  expeditionsResources,
  onSaveExpeditionResource
}: {
  resourceTypes: ResourceType[];
  expeditionsResources: ExpeditionResource[];
  onSaveExpeditionResource: (data: Omit<ExpeditionResource, "id">) => void;
}) {
  const [expeditionId, setExpeditionId] = useState("exp-09");
  const [resourceTypeId, setResourceTypeId] = useState("rt-food");
  const [amount, setAmount] = useState("");
  const [recordedBy, setRecordedBy] = useState("Operator Alfa");
  const [type, setType] = useState<"CONSUMED" | "OBTAINED">("CONSUMED");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    onSaveExpeditionResource({
      expeditionId,
      resourceTypeId,
      amount: Number(amount),
      recordedBy,
      recordDate: new Date().toLocaleDateString("es-ES"),
      type
    });
    setAmount("");
  };

  return (
    <SectionShell kicker="CONTROL LOGÍSTICO COMPLEMENTARIO" title="Recursos Consumidos y Obtenidos en Expediciones">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        
        <form onSubmit={handleSubmit} className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-3 rounded-sm lg:col-span-4 flex flex-col gap-3">
          <div className="text-xs font-bold text-[#69BFB7] uppercase border-b border-[#67ACA9]/20 pb-1.5 mb-1">Registrar Parte del Campamento</div>

          <label className="v-field flex flex-col gap-0.5 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70">Código de Expedición Táctica</span>
            <input type="text" value={expeditionId} onChange={e => setExpeditionId(e.target.value)} className="v-input" placeholder="Por ej. exp-09" />
          </label>

          <label className="v-field flex flex-col gap-1 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Tipo Recurso Comercial</span>
            <select value={resourceTypeId} onChange={e => setResourceTypeId(e.target.value)} className="v-select">
              {resourceTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="v-field flex flex-col gap-0.5">
              <span className="v-field-label text-[#A4C2C5]/70 font-bold">Cantidad de Suministro</span>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="v-input" placeholder="0" />
            </label>
            <label className="v-field flex flex-col gap-1">
              <span className="v-field-label text-[#A4C2C5]/70 font-bold">Estado en la Ruta</span>
              <select value={type} onChange={e => setType(e.target.value as any)} className="v-select">
                <option value="CONSUMED">CONSUMIDO (Gasto Campaña)</option>
                <option value="OBTAINED">OBTENIDO (Botín/Cosecha Extra)</option>
              </select>
            </label>
          </div>

          <label className="v-field flex flex-col gap-0.5 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70">Guardias de Expedición Táctica</span>
            <input type="text" value={recordedBy} onChange={e => setRecordedBy(e.target.value)} className="v-input" />
          </label>

          <Btn variant="primary" onClick={() => {}} style={{ width: "100%", padding: "8px" }}>Archivar Bitácora de Expedición</Btn>
        </form>

        
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm lg:col-span-8 flex flex-col gap-3">
          <div className="text-xs font-bold text-amber-400 uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-2">Histórico de Consumos y Obtenciones</div>

          <div className="v-table-wrap">
            <table className="v-table text-[10px]">
              <thead>
                <tr>
                  <th>Expedición Código</th>
                  <th>Glosario Recurso</th>
                  <th>Acción Operativa</th>
                  <th>Cantidad Total</th>
                  <th>Sindicato Operador</th>
                  <th>Fecha de Reporte</th>
                </tr>
              </thead>
              <tbody>
                {expeditionsResources.slice().reverse().map(ex => {
                  const rt = resourceTypes.find(t => t.id === ex.resourceTypeId);
                  return (
                    <tr key={ex.id}>
                      <td className="font-bold text-white">{ex.expeditionId}</td>
                      <td>{rt?.name || ex.resourceTypeId}</td>
                      <td>
                        <span className={`px-1.5 py-0.5 rounded-sm font-bold text-[8px] border ${ex.type === "CONSUMED" ? "border-rose-500/30 text-rose-300 bg-rose-950/20" : "border-emerald-500/30 text-emerald-300 bg-emerald-950/20"}`}>
                          {ex.type === "CONSUMED" ? "GASTO • CONSUMIDO" : "OFTEN • RECOLECTOR"}
                        </span>
                      </td>
                      <td className="font-mono text-white font-semibold">{ex.amount} {rt?.unitOfMeasure}</td>
                      <td>{ex.recordedBy}</td>
                      <td>{ex.recordDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </SectionShell>
  );
}


export function ViewRecursosEntregados({
  transfers,
  resourceTypes,
  deliveredTransferResources,
  onSaveDelivery
}: {
  transfers: Transfer[];
  resourceTypes: ResourceType[];
  deliveredTransferResources: DeliveredTransferResource[];
  onSaveDelivery: (data: Omit<DeliveredTransferResource, "id">) => void;
}) {
  const [transferId, setTransferId] = useState("");
  const [resourceTypeId, setResourceTypeId] = useState("rt-food");
  const [sentAmount, setSentAmount] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [recordedBy, setRecordedBy] = useState("M. Operator");

  const completedTransfers = transfers.filter(t => t.status === "DELIVERED");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferId || !sentAmount || !receivedAmount) return;
    onSaveDelivery({
      transferId,
      resourceTypeId,
      sentAmount: Number(sentAmount),
      receivedAmount: Number(receivedAmount),
      recordedBy,
      recordDate: new Date().toLocaleDateString("es-ES")
    });
    setSentAmount("");
    setReceivedAmount("");
  };

  return (
    <SectionShell kicker="VERIFICACIÓN COLECTIVA" title="Recursos Entregados y Discrepancias de Traslado">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        
        <form onSubmit={handleSave} className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-3 rounded-sm lg:col-span-4 flex flex-col gap-3">
          <div className="text-xs font-bold text-[#69BFB7] uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-1">Registrar Control de Entrega</div>

          <label className="v-field flex flex-col gap-1 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Convoy Completado Relacionado *</span>
            <select value={transferId} onChange={e => setTransferId(e.target.value)} className="v-select">
              <option value="">Seleccionar Convoy...</option>
              {completedTransfers.map(t => (
                <option key={t.id} value={t.id}>{t.id} (Viaje: {t.plannedDepartureDate})</option>
              ))}
            </select>
          </label>

          <label className="v-field flex flex-col gap-1 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70">Tipo Recurso Entregado *</span>
            <select value={resourceTypeId} onChange={e => setResourceTypeId(e.target.value)} className="v-select">
              {resourceTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="v-field flex flex-col gap-0.5">
              <span className="v-field-label text-[#A4C2C5]/70 font-bold">Cantidad Enviada</span>
              <input type="number" value={sentAmount} onChange={e => setSentAmount(e.target.value)} className="v-input font-mono" />
            </label>
            <label className="v-field flex flex-col gap-0.5">
              <span className="v-field-label text-[#A4C2C5]/70 font-bold text-[#69BFB7]">Cantidad Recibida</span>
              <input type="number" value={receivedAmount} onChange={e => setReceivedAmount(e.target.value)} className="v-input font-mono text-[#69BFB7]" />
            </label>
          </div>

          <label className="v-field flex flex-col gap-0.5 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70">Operador Regulador</span>
            <input type="text" value={recordedBy} onChange={e => setRecordedBy(e.target.value)} className="v-input" />
          </label>

          <Btn variant="primary" onClick={() => {}} style={{ width: "100%", padding: "8px" }}>📊 Archivar Comprobante de Arribo</Btn>
        </form>

        
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm lg:col-span-8 flex flex-col gap-3">
          <div className="text-xs font-bold text-emerald-400 uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-2">Comprobantes de Entrega en Destino</div>

          <div className="v-table-wrap">
            <table className="v-table text-[10px]">
              <thead>
                <tr>
                  <th>ID de Convoy</th>
                  <th>Glosario Suministro</th>
                  <th>Cantidad Enviada</th>
                  <th>Cantidad Recibida</th>
                  <th>Anomalía / Mermas</th>
                  <th>Fecha de Arribo</th>
                </tr>
              </thead>
              <tbody>
                {deliveredTransferResources.map(dl => {
                  const rt = resourceTypes.find(t => t.id === dl.resourceTypeId);
                  const isDiscrepancy = dl.sentAmount !== dl.receivedAmount;
                  return (
                    <tr key={dl.id}>
                      <td className="font-bold text-white">{dl.transferId}</td>
                      <td>{rt?.name || dl.resourceTypeId}</td>
                      <td>{dl.sentAmount} {rt?.unitOfMeasure}</td>
                      <td className="font-bold text-[#69BFB7]">{dl.receivedAmount} {rt?.unitOfMeasure}</td>
                      <td>
                        {isDiscrepancy ? (
                          <span className="px-1.5 py-0.5 rounded-sm bg-rose-950/20 border border-rose-500/20 text-rose-300 font-bold">
                            ⚠️ Faltan {dl.sentAmount - dl.receivedAmount} {rt?.unitOfMeasure}
                          </span>
                        ) : (
                          <span className="text-emerald-300 font-bold">• Suministros Completados</span>
                        )}
                      </td>
                      <td>{dl.recordDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </SectionShell>
  );
}


export function ViewTiposDeRecurso({
  resourceTypes,
  onAddResourceType,
  onUpdateResourceType,
  onDeleteResourceType,
  onNavigateToSub
}: {
  resourceTypes: ResourceType[];
  onAddResourceType: (data: ResourceType) => void;
  onUpdateResourceType: (id: string, updated: Partial<ResourceType>) => void;
  onDeleteResourceType: (id: string) => void;
  onNavigateToSub?: (sub: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [detailResourceType, setDetailResourceType] = useState<ResourceType | null>(null);
  const [movementResourceType, setMovementResourceType] = useState<ResourceType | null>(null);


  const [movementAmount, setMovementAmount] = useState("");
  const [movementType, setMovementType] = useState<string>("MANUAL_ADJUSTMENT");
  const [movementDescription, setMovementDescription] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const filteredTypes = resourceTypes.filter(rt => {
    const matchesSearch = rt.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (rt.description && rt.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategory === "ALL" || rt.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleRegisterMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementResourceType) return;
    const amountVal = Number(movementAmount);
    if (!movementAmount.trim() || isNaN(amountVal) || amountVal <= 0) {
      setErrorMsg("La cantidad debe ser mayor que cero.");
      setSuccessMsg("");
      return;
    }
    
    setErrorMsg("");
    setSuccessMsg(`Movimiento de ${amountVal} ${movementResourceType.unitOfMeasure} (${movementType}) registrado con éxito.`);
    
    setTimeout(() => {
      setMovementResourceType(null);
      setMovementAmount("");
      setMovementType("MANUAL_ADJUSTMENT");
      setMovementDescription("");
      setSuccessMsg("");
    }, 2500);
  };

  return (
    <SectionShell kicker="DICCIONARIO DE SUMINISTROS" title="Glosario Registrado de Tipos de Recursos">
      <div className="flex flex-col gap-5">
        
        
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <span className="text-[10px] font-mono text-[#69BFB7] uppercase tracking-[2px] font-bold">Filtros Tácticos:</span>
            
            
            <input
              type="text"
              className="v-input py-1 px-2.5 text-xs w-full md:w-[220px]"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />

            
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="v-select py-1 px-2.5 text-xs w-full md:w-[180px]"
            >
              <option value="ALL">Todas las Categorías</option>
              <option value="FOOD">Comida (FOOD)</option>
              <option value="WATER">Agua (WATER)</option>
              <option value="HYGIENE">Higiene (HYGIENE)</option>
              <option value="DEFENSE">Defensa (DEFENSE)</option>
              <option value="AMMUNITION">Munición (AMMUNITION)</option>
              <option value="MEDICAL">Medicina (MEDICAL)</option>
              <option value="OTHER">Otro (OTHER)</option>
            </select>
          </div>

          <div className="text-[10px] font-mono text-zinc-500 uppercase">
            Suministros coincidentes: <strong className="text-white font-mono">{filteredTypes.length}</strong>
          </div>
        </div>

        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          
          <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm lg:col-span-8 flex flex-col gap-3">
            <div className="text-xs font-bold text-[#69BFB7] uppercase border-b border-[#67ACA9]/10 pb-1.5 flex justify-between items-center">
              <span>Tipos de Suministros Homologados (Solo Consulta)</span>
              <span className="text-[9px] text-[#A4C2C5]/50 uppercase font-normal">Rol: RESOURCE_MANAGEMENT</span>
            </div>

            <div className="v-table-wrap max-h-[450px] overflow-y-auto">
              <table className="v-table text-[11px]">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Clase / Categoría</th>
                    <th>Unidad</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTypes.map(rt => (
                    <tr key={rt.id} className="hover:bg-cyan-950/10">
                      <td className="font-mono text-white text-[9px]">{rt.id}</td>
                      <td>
                        <span className="font-bold text-[#69BFB7]">{rt.name}</span>
                      </td>
                      <td>
                        <span className="font-mono text-[9px] bg-cyan-950/60 text-[#69BFB7] border border-[#67ACA9]/10 px-1.5 py-0.5 rounded-sm">
                          {rt.category}
                        </span>
                      </td>
                      <td className="font-mono text-[#A4C2C5]/80">{rt.unitOfMeasure}</td>
                      <td className="text-right">
                        <div className="flex gap-1 justify-end items-center font-mono">
                          <Btn small variant="ghost" onClick={() => setDetailResourceType(rt)}>
                            Detalle
                          </Btn>
                          <Btn small variant="ghost" onClick={() => {
                            if (onNavigateToSub) {
                              onNavigateToSub("Inventario del campamento");
                            }
                          }}>
                            Inventario
                          </Btn>
                          <Btn small variant="primary" onClick={() => {
                            setMovementResourceType(rt);
                            setMovementAmount("");
                            setMovementType("MANUAL_ADJUSTMENT");
                            setMovementDescription("");
                            setSuccessMsg("");
                            setErrorMsg("");
                          }}>
                            + Movimiento
                          </Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredTypes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-zinc-500 italic">
                        No se encontraron tipos de recurso con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            
            {detailResourceType ? (
              <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm flex flex-col gap-3 relative">
                <button
                  onClick={() => setDetailResourceType(null)}
                  className="absolute top-3 right-3 text-xs text-zinc-500 hover:text-white font-mono cursor-pointer"
                >
                  [✕ CERRAR]
                </button>
                <div className="text-[10px] font-mono text-[#69BFB7] uppercase tracking-[3px] font-bold">FICHA TÉCNICA</div>
                <h3 className="text-sm font-black text-white uppercase border-b border-[#67ACA9]/15 pb-1.5 mt-1">
                  {detailResourceType.name}
                </h3>

                <div className="grid grid-cols-2 gap-x-2 gap-y-3 font-mono text-[10px] text-[#A4C2C5]/80 py-2">
                  <div>
                    <span className="block text-zinc-500 text-[9px] uppercase">ID DE CATÁLOGO:</span>
                    <strong className="text-white">{detailResourceType.id}</strong>
                  </div>
                  <div>
                    <span className="block text-zinc-500 text-[9px] uppercase">CATEGORÍA:</span>
                    <strong className="text-cyan-300">{detailResourceType.category}</strong>
                  </div>
                  <div>
                    <span className="block text-zinc-500 text-[9px] uppercase">UNIDAD MEDIDA:</span>
                    <strong className="text-white">{detailResourceType.unitOfMeasure}</strong>
                  </div>
                </div>

                <div className="bg-black/45 p-2.5 rounded-sm border border-[#67ACA9]/10 text-xs text-[#A4C2C5]/90 leading-relaxed font-mono">
                  <span className="block text-zinc-500 text-[9px] font-mono mb-1 uppercase">DESCRIPCIÓN OPERATIVA:</span>
                  {detailResourceType.description || "Sin descripción táctica registrada en el glosario central."}
                </div>
              </div>
            ) : (
              <div className="mission-card border border-[#67ACA9]/10 bg-black/20 p-6 rounded-sm text-center text-zinc-500 italic text-xs h-full flex items-center justify-center">
                Seleccione "Detalle" en cualquier recurso para revisar sus especificaciones técnicas de campo.
              </div>
            )}

          </div>

        </div>

        
        {movementResourceType && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="mission-card border border-[#67ACA9]/40 bg-[#0d1414] p-5 rounded-xs w-full max-w-md flex flex-col gap-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-[#67ACA9]/20 pb-2">
                <div>
                  <span className="text-[9px] font-mono text-[#69BFB7] uppercase tracking-[2px] block">OPERACIÓN EXPRESS</span>
                  <h3 className="text-sm font-black text-white uppercase">Registrar Movimiento de Inventario</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMovementResourceType(null)}
                  className="text-zinc-500 hover:text-white font-mono text-xs cursor-pointer"
                >
                  ✕ CANCELAR
                </button>
              </div>

              <form onSubmit={handleRegisterMovement} className="flex flex-col gap-3 text-xs">
                <div className="bg-cyan-950/20 p-2.5 rounded-sm border border-[#67ACA9]/10 font-mono text-[10px]">
                  <span className="text-zinc-500 text-[9px] uppercase block">RECURSO SELECCIONADO:</span>
                  <strong className="text-white">{movementResourceType.name} ({movementResourceType.unitOfMeasure})</strong>
                </div>

                {successMsg && (
                  <div className="bg-emerald-950/20 text-emerald-300 p-2.5 rounded-sm border border-emerald-500/30 font-mono text-[10px]">
                    ✓ {successMsg}
                  </div>
                )}

                {errorMsg && (
                  <div className="bg-red-950/20 text-red-300 p-2.5 rounded-sm border border-red-500/30 font-mono text-[10px]">
                    ⚠️ {errorMsg}
                  </div>
                )}

                <label className="v-field flex flex-col gap-0.5">
                  <span className="v-field-label text-[#A4C2C5]/70">Cantidad a Afectar *</span>
                  <input
                    type="number"
                    step="any"
                    required
                    className="v-input font-mono"
                    placeholder="Mayor que cero..."
                    value={movementAmount}
                    onChange={e => setMovementAmount(e.target.value)}
                  />
                </label>

                <label className="v-field flex flex-col gap-1">
                  <span className="v-field-label text-[#A4C2C5]/70">Tipo de Movimiento *</span>
                  <select
                    value={movementType}
                    onChange={e => setMovementType(e.target.value)}
                    className="v-select font-mono"
                  >
                    <option value="MANUAL_ADJUSTMENT">Ajuste Manual (MANUAL_ADJUSTMENT)</option>
                    <option value="DAILY_COLLECTION">Cosecha Diaria (DAILY_COLLECTION)</option>
                    <option value="DAILY_RATION">Ración Diaria (DAILY_RATION)</option>
                    <option value="EXPEDITION_DEPARTURE">Salida Expedición (EXPEDITION_DEPARTURE)</option>
                    <option value="EXPEDITION_RETURN">Retorno Expedición (EXPEDITION_RETURN)</option>
                    <option value="TRANSFER_SENT">Traslado Enviado (TRANSFER_SENT)</option>
                    <option value="TRANSFER_RECEIVED">Traslado Recibido (TRANSFER_RECEIVED)</option>
                  </select>
                </label>

                <label className="v-field flex flex-col gap-0.5">
                  <span className="v-field-label text-[#A4C2C5]/70">Descripción / Justificación</span>
                  <textarea
                    rows={2}
                    className="v-input font-mono py-1.5 resize-none"
                    placeholder="Detalles del movimiento..."
                    value={movementDescription}
                    onChange={e => setMovementDescription(e.target.value)}
                  />
                </label>

                <div className="flex gap-2 font-mono mt-2">
                  <button
                    type="button"
                    onClick={() => setMovementResourceType(null)}
                    className="cursor-pointer bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 px-4 py-2 text-[10px] font-bold uppercase rounded-sm flex-1 text-center"
                  >
                    Cerrar
                  </button>
                  <Btn variant="primary" onClick={() => {}} style={{ flex: 1, padding: "8px" }}>
                    Registrar ✓
                  </Btn>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </SectionShell>
  );
}


export function ViewCampamentos({
  camps
}: {
  camps: Camp[];
}) {
  return (
    <SectionShell kicker="COORDINACIÓN LOGÍSTICA COMPLEMENTARIO" title="Base Militar y Campamentos Afiliados">
      <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm">
        <div className="text-xs font-bold text-[#69BFB7] uppercase border-b border-[#67ACA9]/10 pb-2 mb-4">Directorio de Campamentos Registrados</div>

        <div className="v-table-wrap">
          <table className="v-table text-xs">
            <thead>
              <tr>
                <th>ID Campamento</th>
                <th>Código de Campamento</th>
                <th>Ubicación Sector</th>
                <th className="text-right">Personal Asignado</th>
              </tr>
            </thead>
            <tbody>
              {camps.map(camp => (
                <tr key={camp.id}>
                  <td className="font-mono text-[10px]">{camp.id}</td>
                  <td className="font-bold text-[#69BFB7]">{camp.name}</td>
                  <td>{camp.location}</td>
                  <td className="text-right font-bold text-white font-mono">{camp.personnelCount} personas</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SectionShell>
  );
}


export function ViewOficiosCobertura({
  camps,
  occupations,
  occupationCoverages,
  onAutoAssign
}: {
  camps: Camp[];
  occupations: Occupation[];
  occupationCoverages: OccupationCoverage[];
  onAutoAssign: (campId: string, occupationId: string) => void;
}) {
  return (
    <SectionShell kicker="PERSONAL Y REFUERZOS SUCURSAL" title="Control Operativo de Oficios y Cobertura de Vacantes">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
        
        
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm lg:col-span-5 flex flex-col gap-3">
          <div className="text-xs font-bold text-[#69BFB7] uppercase border-b border-[#67ACA9]/10 pb-1.5">Glosario de Oficios Habilitados</div>
          <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
            {occupations.map(occ => (
              <div key={occ.id} className="p-2 bg-black/35 border border-[#67ACA9]/10 rounded-xs">
                <span className="font-bold text-[#67ACA9] block text-[10px] text-white">{occ.name}</span>
                <span className="text-[10px] text-[#A4C2C5]/75 italic mt-0.5 block">{occ.description}</span>
              </div>
            ))}
          </div>
        </div>

        
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm lg:col-span-7 flex flex-col gap-3">
          <div className="text-xs font-bold text-amber-300 uppercase border-b border-[#67ACA9]/10 pb-1.5 flex justify-between items-center">
            <span>Matriz de Rango Escolta por Campamento</span>
            <span className="text-[9px] text-[#A4C2C5]/50 animate-pulse font-mono">Asignación Directa de Reemplazo</span>
          </div>

          <div className="v-table-wrap">
            <table className="v-table text-[10px]">
              <thead>
                <tr>
                  <th>Campamento</th>
                  <th>Oficio Escolta</th>
                  <th>Requerido</th>
                  <th>Activo</th>
                  <th>Estado</th>
                  <th className="text-right">Auto Asignar</th>
                </tr>
              </thead>
              <tbody>
                {occupationCoverages.map((cov, idx) => {
                  const camp = camps.find(c => c.id === cov.campId);
                  const occ = occupations.find(o => o.id === cov.occupationId);
                  const gap = cov.required - cov.active;
                  const stateColor = gap > 2 ? "text-red-400 font-bold" : gap > 0 ? "text-amber-400" : "text-emerald-300";
                  const pct = Math.round((cov.active / cov.required) * 100);

                  return (
                    <tr key={idx} className="hover:bg-cyan-950/5">
                      <td className="font-bold text-white">{camp?.name || cov.campId}</td>
                      <td>{occ?.name || cov.occupationId}</td>
                      <td>{cov.required}</td>
                      <td>{cov.active}</td>
                      <td className={stateColor}>{pct}% ({gap > 0 ? `Faltan ${gap}` : 'Vacante Completa'})</td>
                      <td className="text-right">
                        {gap > 0 ? (
                          <Btn small variant="warning" onClick={() => onAutoAssign(cov.campId, cov.occupationId)}>Reforzar</Btn>
                        ) : (
                          <span className="text-emerald-400 font-mono text-[9px] font-bold">CUBIERTO</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </SectionShell>
  );
}


export function ViewNotificaciones({
  camps,
  notifications,
  onAddNotification,
  onMarkAsRead
}: {
  camps: Camp[];
  notifications: OperationalNotification[];
  onAddNotification: (data: Omit<OperationalNotification, "id">) => void;
  onMarkAsRead: (id: string) => void;
}) {
  const campIdVal = currentUser.campId;
  const campId = String(campIdVal);
  const [destType, setDestType] = useState<"role" | "user">("role");
  const [targetRole, setTargetRole] = useState("WORKER");
  const [selectedUserId, setSelectedUserId] = useState("user-op");

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<OperationalNotification["type"]>("INFO");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      alert("Por favor complete todos los campos obligatorios.");
      return;
    }

    const chosenUserId = destType === "user" ? selectedUserId : "";
    const chosenTargetRole = destType === "role" ? targetRole : "";

    if (destType === "user" && !chosenUserId) {
      alert("Por favor seleccione un usuario de destino.");
      return;
    }
    if (destType === "role" && !chosenTargetRole) {
      alert("Por favor seleccione un rol de destino.");
      return;
    }

    onAddNotification({
      campId,
      userId: chosenUserId,
      targetRole: chosenTargetRole,
      type,
      title,
      message,
      read: false,
      createdDate: new Date().toLocaleTimeString("es-ES") + " UTC"
    });
    setTitle("");
    setMessage("");
  };

  return (
    <SectionShell kicker="MENSAJERÍA TÁCTICA" title="Notificaciones Operativas y Boletas de Guardia">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        
        <form onSubmit={handleSubmit} className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-3 rounded-sm lg:col-span-4 flex flex-col gap-3">
          <div className="text-xs font-bold text-[#69BFB7] uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-1">Escribir Notificación de Red</div>

          <div className="flex flex-col gap-1 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Campamento Origen (Emisor)</span>
            <span className="v-input bg-black/20 text-[#69BFB7] border border-[#67ACA9]/10 select-none flex items-center px-2 py-1.5 h-[34px] font-bold rounded-sm">
              Alpha Bunker (Propio)
            </span>
          </div>

          <div className="flex flex-col gap-1.5 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Tipo de Destino *</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDestType("role")}
                className={`py-1 text-center font-bold border rounded-xs transition-colors ${destType === "role" ? "bg-[#67ACA9] text-black border-[#67ACA9]" : "border-[#67ACA9]/20 text-[#A4C2C5] hover:bg-[#67ACA9]/5"}`}
              >
                Enviar a Rol
              </button>
              <button
                type="button"
                onClick={() => setDestType("user")}
                className={`py-1 text-center font-bold border rounded-xs transition-colors ${destType === "user" ? "bg-[#67ACA9] text-black border-[#67ACA9]" : "border-[#67ACA9]/20 text-[#A4C2C5] hover:bg-[#67ACA9]/5"}`}
              >
                Enviar a Usuario
              </button>
            </div>
          </div>

          {destType === "role" ? (
            <label className="v-field flex flex-col gap-1 text-xs">
              <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Rol Destinatario *</span>
              <select value={targetRole} onChange={e => setTargetRole(e.target.value)} className="v-select">
                <option value="WORKER">WORKER (Trabajador de Campo)</option>
                <option value="RESOURCE_MANAGEMENT">RESOURCE_MANAGEMENT (Gestor de Campamentos)</option>
                <option value="TRAVEL_MANAGER">TRAVEL_MANAGER (Logística Convoyes)</option>
                <option value="SYSTEM_ADMIN">SYSTEM_ADMIN (Administrador Central)</option>
              </select>
            </label>
          ) : (
            <label className="v-field flex flex-col gap-1 text-xs">
              <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Usuario Destinatario *</span>
              <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="v-select">
                <option value="user-op">Operador de Red (user-op)</option>
                <option value="usr-2">Coordinador de Almacén Bravo (usr-2)</option>
                <option value="usr-3">Supervisor de Suministros (usr-3)</option>
                <option value="usr-4">Analista Logístico Charlie (usr-4)</option>
                <option value="usr-5">Líder de Expedición Delta (usr-5)</option>
              </select>
            </label>
          )}

          <label className="v-field flex flex-col gap-1 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Índice Alerta *</span>
            <select value={type} onChange={e => setType(e.target.value as any)} className="v-select">
              <option value="INFO">INFORMACIÓN LOGÍSTICA</option>
              <option value="ALERT">ENTREGA CRÍTICA ALERTA</option>
              <option value="SUCCESS">SUMINISTRO COMPLETADO</option>
              <option value="WARNING">ALERTA DISCREPANCIA / MERMA</option>
            </select>
          </label>

          <label className="v-field flex flex-col gap-0.5 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70 font-bold">Título de la Notificación</span>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="v-input" placeholder="Por ej. Llegada retrasada de convoy Bravo" />
          </label>

          <label className="v-field flex flex-col gap-0.5 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70">Cuerpo del Mensaje</span>
            <textarea value={message} onChange={e => setMessage(e.target.value)} className="v-input min-h-12" placeholder="Escribir detalles del envío o anomalías..." />
          </label>

          <Btn variant="primary" onClick={() => {}} style={{ width: "100%", padding: "8px" }}>Trasmitir Notificación</Btn>
        </form>

        
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm lg:col-span-8 flex flex-col gap-3">
          <div className="text-xs font-bold text-amber-300 uppercase border-b border-[#67ACA9]/10 pb-1.5">Muro de Comunicados Actuales</div>

          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
            {notifications.map(not => {
              const camp = camps.find(c => c.id === not.campId);
              const cardColor = not.type === "ALERT" ? "border-rose-500/30 bg-rose-950/20" : not.type === "WARNING" ? "border-amber-500/30 bg-amber-950/20" : not.type === "SUCCESS" ? "border-emerald-500/30 bg-emerald-950/20" : "border-[#67ACA9]/20 bg-black/45";
              const labelColor = not.type === "ALERT" ? "text-rose-400" : not.type === "WARNING" ? "text-amber-400" : not.type === "SUCCESS" ? "text-emerald-300" : "text-[#69BFB7]";

              return (
                <div key={not.id} className={`p-3 border rounded-xs flex flex-col justify-between sm:flex-row gap-3 items-start sm:items-center ${cardColor} transition-all ${not.read ? "opacity-60" : ""}`}>
                  <div className="flex-1 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-black tracking-widest text-[9px] uppercase font-mono ${labelColor}`}>{not.type}</span>
                      <span className="text-[9px] font-semibold text-[#A4C2C5]/60">• Campamento: {camp?.name || not.campId}</span>
                      <span className="text-[8px] text-[#A4C2C5]/50 font-mono">• Recibido: {not.createdDate}</span>
                    </div>
                    <div className="font-bold text-white mt-1 text-[11px]">{not.title}</div>
                    <div className="text-[#A4C2C5]/80 mt-0.5 text-[10px]">{not.message}</div>
                  </div>
                  <div className="shrink-0">
                    {!not.read ? (
                      <Btn small variant="success" onClick={() => onMarkAsRead(not.id)}>Marcar Leída ✓</Btn>
                    ) : (
                      <span className="text-[10px] text-[#A4C2C5]/50 italic">Leída</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </SectionShell>
  );
}


export function ViewDetalleRecursosSolicitados({
  intercampRequests,
  resourceTypes,
  requestResourceDetails,
  onAddResourceDetail,
  onUpdateResourceDetail,
  onDeleteResourceDetail
}: {
  intercampRequests: IntercampRequest[];
  resourceTypes: ResourceType[];
  requestResourceDetails: RequestResourceDetail[];
  onAddResourceDetail: (requestId: string, resourceTypeId: string, requestedAmount: number) => void;
  onUpdateResourceDetail: (id: string, updated: Partial<RequestResourceDetail>) => void;
  onDeleteResourceDetail: (id: string) => void;
}) {
  const [requestId, setRequestId] = useState("");
  const [resourceTypeId, setResourceTypeId] = useState("");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestId || !resourceTypeId || !requestedAmount) {
      alert("Por favor rellene todos los campos obligatorios.");
      return;
    }
    const reqAmountNum = Number(requestedAmount);
    if (isNaN(reqAmountNum) || reqAmountNum <= 0) {
      alert("La cantidad solicitada debe ser mayor que 0.");
      return;
    }

    onAddResourceDetail(requestId, resourceTypeId, reqAmountNum);
    setRequestedAmount("");
  };

  const handleUpdate = (id: string) => {
    const detail = requestResourceDetails.find(d => d.id === id);
    if (!detail) return;

    const reqAmt = detail.requestedAmount;
    const apprAmt = approvedAmount === "" ? 0 : Number(approvedAmount);

    if (isNaN(apprAmt) || apprAmt < 0) {
      alert("La cantidad aprobada no puede ser negativa.");
      return;
    }

    if (apprAmt > reqAmt) {
      if (!confirm(`Advertencia: La cantidad aprobada (${apprAmt}) es mayor que la cantidad solicitada (${reqAmt}). ¿Desea continuar?`)) {
        return;
      }
    }

    onUpdateResourceDetail(id, { approvedAmount: apprAmt });
    setEditingId(null);
    setApprovedAmount("");
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Está seguro de que desea eliminar este detalle de recurso solicitado? Esto afectará los traslados planificados.")) {
      onDeleteResourceDetail(id);
    }
  };

  return (
    <SectionShell kicker="CONTROL DETALLADO DE SUMINISTROS" title="Detalle de Recursos Solicitados">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        
        <form onSubmit={handleCreate} className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm lg:col-span-4 flex flex-col gap-3 h-fit">
          <div className="text-xs font-bold text-[#69BFB7] uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-1">Agregar Recurso a Solicitud</div>

          <label className="v-field flex flex-col gap-1 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Solicitud Relacionada *</span>
            <select value={requestId} onChange={e => setRequestId(e.target.value)} className="v-select text-[11px] bg-black">
              <option value="">Seleccione solicitud...</option>
              {intercampRequests.map(r => (
                <option key={r.id} value={r.id}>
                  {r.id} • {r.description.slice(0, 30)}...
                </option>
              ))}
            </select>
          </label>

          <label className="v-field flex flex-col gap-1 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Tipo de Recurso *</span>
            <select value={resourceTypeId} onChange={e => setResourceTypeId(e.target.value)} className="v-select text-[11px] bg-black">
              <option value="">Seleccione tipo...</option>
              {resourceTypes.map(rt => (
                <option key={rt.id} value={rt.id}>{rt.name} ({rt.unitOfMeasure})</option>
              ))}
            </select>
          </label>

          <label className="v-field flex flex-col gap-0.5 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70 font-bold">Cantidad Solicitada *</span>
            <input 
              type="text" 
              value={requestedAmount} 
              onChange={e => setRequestedAmount(e.target.value)} 
              className="v-input font-mono" 
              placeholder="e.g. 50.00" 
            />
          </label>

          <Btn variant="primary" onClick={() => {}} style={{ width: "100%", padding: "8px" }}>Agregar Recurso</Btn>
        </form>

        
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm lg:col-span-8 flex flex-col gap-3">
          <div className="text-xs font-bold text-amber-300 uppercase border-b border-[#67ACA9]/10 pb-1.5">Lista de Suministros Pedidos</div>

          <div className="v-table-wrap max-h-96 overflow-y-auto">
            <table className="v-table text-[10px]">
              <thead>
                <tr>
                  <th>Solicitud ID</th>
                  <th>Recurso</th>
                  <th>Monto Solicitado</th>
                  <th>Monto Aprobado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {requestResourceDetails.map(det => {
                  const req = intercampRequests.find(r => r.id === det.requestId);
                  const rt = resourceTypes.find(t => t.id === det.resourceTypeId);
                  const isEditing = editingId === det.id;

                  return (
                    <tr key={det.id} className="hover:bg-cyan-950/5">
                      <td className="font-bold text-[#69BFB7]">{det.requestId} ({req?.status || "N/A"})</td>
                      <td className="text-white font-semibold">{rt?.name || det.resourceTypeId}</td>
                      <td>{det.requestedAmount} {rt?.unitOfMeasure}</td>
                      <td className="font-bold">
                        {isEditing ? (
                          <input 
                            type="text" 
                            className="v-input py-0.5 px-1 max-w-[80px]" 
                            value={approvedAmount} 
                            onChange={e => setApprovedAmount(e.target.value)} 
                            placeholder="Monto"
                          />
                        ) : (
                          <span className={det.approvedAmount > 0 ? "text-emerald-400" : "text-amber-400"}>
                            {det.approvedAmount} {rt?.unitOfMeasure}
                          </span>
                        )}
                      </td>
                      <td className="text-right flex gap-1 justify-end items-center">
                        {isEditing ? (
                          <>
                            <Btn small variant="success" onClick={() => handleUpdate(det.id)}>Aceptar ✓</Btn>
                            <Btn small variant="ghost" onClick={() => { setEditingId(null); setApprovedAmount(""); }}>Cancelar</Btn>
                          </>
                        ) : (
                          <>
                            <Btn small variant="primary" onClick={() => { setEditingId(det.id); setApprovedAmount(String(det.approvedAmount)); }}>Modificar Aprobación</Btn>
                            <Btn small variant="ghost" onClick={() => handleDelete(det.id)}>Eliminar ✕</Btn>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </SectionShell>
  );
}


export function ViewPersonasEnTraslado({
  transfers,
  transferPersons,
  onAddPersonToTransfer,
  onUpdatePersonStatus
}: {
  transfers: Transfer[];
  transferPersons: TransferPerson[];
  onAddPersonToTransfer: (transferId: string, personId: string) => void;
  onUpdatePersonStatus: (id: string, updated: Partial<TransferPerson>) => void;
}) {
  const [transferId, setTransferId] = useState("");
  const [personId, setPersonId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [status, setStatus] = useState<TransferPerson["status"]>("CONFIRMED");
  const [departureDate, setDepartureDate] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferId || !personId) {
      alert("Por favor proporcione todos los campos obligatorios.");
      return;
    }

    const isDuplicate = transferPersons.some(tp => tp.transferId === transferId && tp.personId.toLowerCase() === personId.trim().toLowerCase());
    if (isDuplicate) {
      alert("No se puede añadir a la misma persona más de una vez en el mismo traslado.");
      return;
    }

    onAddPersonToTransfer(transferId, personId.trim());
    setPersonId("");
  };

  const handleUpdate = (id: string) => {
    if (status === "IN_TRANSIT" && !departureDate) {
      alert("Debe especificar la fecha de salida (departureDate) si el estado es 'En Tránsito'.");
      return;
    }

    if (status === "DELIVERED") {
      if (!departureDate || !arrivalDate) {
        alert("Debe especificar tanto la fecha de salida como la fecha de llegada para marcar la entrega.");
        return;
      }
      if (new Date(arrivalDate) < new Date(departureDate)) {
        alert("La fecha de llegada no puede ser anterior a la fecha de salida.");
        return;
      }
    }

    onUpdatePersonStatus(id, {
      status,
      departureDate: departureDate || undefined,
      arrivalDate: arrivalDate || undefined
    });
    setEditingId(null);
  };

  return (
    <SectionShell kicker="COORDINACIÓN DE PERSONAL DE RUTA" title="Personas vinculadas a Traslado">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        
        <form onSubmit={handleCreate} className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm lg:col-span-4 flex flex-col gap-3 h-fit">
          <div className="text-xs font-bold text-[#69BFB7] uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-1">Registrar Persona en Convoy</div>

          <label className="v-field flex flex-col gap-1 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Traslado Operativo *</span>
            <select value={transferId} onChange={e => setTransferId(e.target.value)} className="v-select bg-black text-[11px]">
              <option value="">Seleccione traslado...</option>
              {transfers.map(tr => (
                <option key={tr.id} value={tr.id}>{tr.id} ({tr.status})</option>
              ))}
            </select>
          </label>

          <label className="v-field flex flex-col gap-1 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Código o ID de Persona *</span>
            <input 
              type="text" 
              value={personId} 
              onChange={e => setPersonId(e.target.value)} 
              className="v-input" 
              placeholder="e.g. p-soldier1" 
            />
          </label>

          <Btn variant="primary" onClick={() => {}} style={{ width: "100%", padding: "8px" }}>Añadir Escolta de Convoy</Btn>
        </form>

        
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm lg:col-span-8 flex flex-col gap-3">
          <div className="text-xs font-bold text-amber-300 uppercase border-b border-[#67ACA9]/10 pb-1.5">Personal del Sindicato Asignado</div>

          <div className="v-table-wrap max-h-96 overflow-y-auto">
            <table className="v-table text-[10px]">
              <thead>
                <tr>
                  <th>Traslado ID</th>
                  <th>Persona</th>
                  <th>Estado</th>
                  <th>Salida</th>
                  <th>Llegada</th>
                  <th className="text-right">Operar</th>
                </tr>
              </thead>
              <tbody>
                {transferPersons.map(tp => {
                  const isEditing = editingId === tp.id;

                  return (
                    <tr key={tp.id} className="hover:bg-cyan-950/5">
                      <td className="font-bold text-white">{tp.transferId}</td>
                      <td>{tp.personId}</td>
                      <td>
                        {isEditing ? (
                          <select value={status} onChange={e => setStatus(e.target.value as any)} className="v-select text-[9px] py-0.5 bg-black">
                            <option value="CONFIRMED">CONFIRMADO</option>
                            <option value="IN_TRANSIT">IN_TRANSIT</option>
                            <option value="DELIVERED">DELIVERED</option>
                            <option value="CANCELED">CANCELED</option>
                          </select>
                        ) : (
                          <span className={`px-1 py-0.5 rounded-xs font-mono font-bold text-[8px] uppercase border border-[#67ACA9]/10 ${tp.status === 'DELIVERED' ? 'bg-emerald-900/30 text-emerald-200' : tp.status === 'IN_TRANSIT' ? 'bg-amber-900/30 text-amber-200 animate-pulse' : 'bg-zinc-800 text-zinc-300'}`}>
                            {tp.status}
                          </span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input type="text" value={departureDate} onChange={e => setDepartureDate(e.target.value)} className="v-input text-[9px] py-0.5 px-1 max-w-[100px] font-mono" placeholder="YYYY-MM-DD" />
                        ) : (
                          tp.departureDate || <span className="text-[#A4C2C5]/30">Pendiente</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input type="text" value={arrivalDate} onChange={e => setArrivalDate(e.target.value)} className="v-input text-[9px] py-0.5 px-1 max-w-[100px] font-mono" placeholder="YYYY-MM-DD" />
                        ) : (
                          tp.arrivalDate || <span className="text-[#A4C2C5]/30">Pendiente</span>
                        )}
                      </td>
                      <td className="text-right flex gap-1 justify-end items-center">
                        {isEditing ? (
                          <>
                            <Btn small variant="success" onClick={() => handleUpdate(tp.id)}>Guardar ✓</Btn>
                            <Btn small variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Btn>
                          </>
                        ) : (
                          <Btn small variant="primary" onClick={() => {
                            setEditingId(tp.id);
                            setStatus(tp.status);
                            setDepartureDate(tp.departureDate || "");
                            setArrivalDate(tp.arrivalDate || "");
                          }}>Editar Datos</Btn>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </SectionShell>
  );
}


export function ViewHistorialDeTraslado({
  transfers,
  transferHistories,
  onAddHistoryEntry
}: {
  transfers: Transfer[];
  transferHistories: TransferHistory[];
  onAddHistoryEntry: (data: Omit<TransferHistory, "id">) => void;
}) {
  const [transferId, setTransferId] = useState("");
  const [previousStatus, setPreviousStatus] = useState<Transfer["status"]>("PLANNING");
  const [newStatus, setNewStatus] = useState<Transfer["status"]>("DELIVERED");
  const [comment, setComment] = useState("");
  const [userId, setUserId] = useState("3");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferId || !previousStatus || !newStatus || !userId) {
      alert("Por favor complete todos los campos obligatorios.");
      return;
    }

    if (previousStatus === newStatus) {
      alert("El estado anterior no puede ser igual al nuevo estado.");
      return;
    }

    if (newStatus === "CANCELED" && !comment.trim()) {
      if (!confirm("Se recomienda agregar un comentario explicativo para cancelaciones. ¿Desea guardar sin comentario?")) {
        return;
      }
    }

    onAddHistoryEntry({
      transferId,
      previousStatus,
      newStatus,
      date: new Date().toISOString(),
      userId,
      comment: comment.trim()
    });

    setComment("");
  };

  return (
    <SectionShell kicker="CONTROL AUDITORÍA Y BITÁCORA" title="Historial Operativo de Traslado">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        
        <form onSubmit={handleCreate} className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm lg:col-span-4 flex flex-col gap-3 h-fit">
          <div className="text-xs font-bold text-[#69BFB7] uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-1">Registrar Evento de Tránsito</div>

          <label className="v-field flex flex-col gap-1 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Traslado Relacionado *</span>
            <select value={transferId} onChange={e => setTransferId(e.target.value)} className="v-select bg-black text-[11px]">
              <option value="">Seleccione traslado...</option>
              {transfers.map(tr => (
                <option key={tr.id} value={tr.id}>{tr.id} ({tr.status})</option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="v-field flex flex-col gap-1">
              <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Estado Anterior *</span>
              <select value={previousStatus} onChange={e => setPreviousStatus(e.target.value as any)} className="v-select bg-black font-mono text-[9px]">
                <option value="PLANNING">PLANNING</option>
                <option value="EN_ROUTE">EN_ROUTE</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="CANCELED">CANCELED</option>
              </select>
            </label>
            <label className="v-field flex flex-col gap-1">
              <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Nuevo Estado *</span>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value as any)} className="v-select bg-black font-mono text-[9px]">
                <option value="PLANNING">PLANNING</option>
                <option value="EN_ROUTE">EN_ROUTE</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="CANCELED">CANCELED</option>
              </select>
            </label>
          </div>

          <label className="v-field flex flex-col gap-1 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70 font-semibold">ID Usuario Registrador *</span>
            <input 
              type="text" 
              value={userId} 
              onChange={e => setUserId(e.target.value)} 
              className="v-input" 
              placeholder="e.g. 3" 
            />
          </label>

          <label className="v-field flex flex-col gap-0.5 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70 font-bold">Comentario / Justificación</span>
            <textarea 
              value={comment} 
              onChange={e => setComment(e.target.value)} 
              className="v-input min-h-12" 
              placeholder="Detalle los motivos del cambio..." 
            />
          </label>

          <Btn variant="primary" onClick={() => {}} style={{ width: "100%", padding: "8px" }}>Loggear Historial</Btn>
        </form>

        
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm lg:col-span-8 flex flex-col gap-3">
          <div className="text-xs font-bold text-amber-300 uppercase border-b border-[#67ACA9]/10 pb-1.5">Bitácora de Eventos de Convoyes</div>

          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
            {transferHistories.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#A4C2C5]/40 italic">Ningún evento registrado en la bitácora aún.</div>
            ) : (
              transferHistories.map(entry => (
                <div key={entry.id} className="p-3 border border-[#67ACA9]/20 bg-black/40 rounded-xs flex flex-col md:flex-row justify-between items-start md:items-center text-xs gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-[#69BFB7] tracking-wider font-mono">CONVOY: {entry.transferId}</span>
                      <span className="text-[10px] text-zinc-400">• Transición: {entry.previousStatus} ➜ {entry.newStatus}</span>
                      <span className="text-[9px] text-[#A4C2C5]/50 font-mono">• Fecha: {entry.date}</span>
                    </div>
                    <p className="text-[#A4C2C5]/85 mt-1 font-mono italic">"{entry.comment || '(Sin comentario adicionales)'}"</p>
                  </div>
                  <div className="text-right text-[10px] whitespace-nowrap bg-[#67ACA9]/10 px-2 py-0.5 rounded-sm shrink-0">
                    <span className="text-white font-semibold">UID: {entry.userId}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </SectionShell>
  );
}


export function ViewPersonalDashboard({
  camps,
  resourceTypes,
  campInventories,
  inventoryAlerts,
  inventoryMovements,
  notifications,
  occupationCoverages,
  onNavigateToSub
}: {
  camps: Camp[];
  resourceTypes: ResourceType[];
  campInventories: CampInventory[];
  inventoryAlerts: InventoryAlert[];
  inventoryMovements: InventoryMovement[];
  notifications: OperationalNotification[];
  occupationCoverages: OccupationCoverage[];
  onNavigateToSub: (sub: string) => void;
}) {
  const campIdVal = currentUser.campId;
  const activeCampId = String(campIdVal);
  const campName = camps.find(c => c.id === activeCampId)?.name || "Alpha Bunker";


  const [isRefreshing, setIsRefreshing] = useState(false);
  const triggerRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };


  const [localExpeditions, setLocalExpeditions] = useState({
    PLANNED: 2,
    IN_PROGRESS: 1,
    DELAYED: 0,
    COMPLETED: 5,
    LOST: 1,
    CANCELED: 1
  });

  const [simulatedEfectivos, setSimulatedEfectivos] = useState(0);

  const handleSimulateMission = () => {
    if (localExpeditions.PLANNED > 0) {
      setLocalExpeditions(prev => ({
        ...prev,
        PLANNED: prev.PLANNED - 1,
        IN_PROGRESS: prev.IN_PROGRESS + 1
      }));
    } else {
      setLocalExpeditions(prev => ({
        ...prev,
        PLANNED: prev.PLANNED + 1
      }));
    }
  };

  const handleAddSpecialistLocal = () => {
    setSimulatedEfectivos(prev => prev + 1);
  };


  const baseGarrisonCount = camps.find(c => c.id === activeCampId)?.personnelCount || 35;
  const totalGarrison = baseGarrisonCount + simulatedEfectivos;
  const criticalStockCount = campInventories.filter(ci => ci.campId === activeCampId && ci.currentAmount <= ci.minimumAlertAmount).length;
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const activeAlphaCoverages = occupationCoverages.filter(cov => cov.campId === activeCampId);
  const totalRequired = activeAlphaCoverages.reduce((sum, cov) => sum + cov.required, 0) || 14;
  const totalActive = activeAlphaCoverages.reduce((sum, cov) => sum + cov.active, 0) + simulatedEfectivos;
  const deploymentEfficiency = Math.min(100, Math.round(((totalActive) / totalRequired) * 100)) || 92;

  const SPECIALISTS_PIE_DATA = [
    { name: "Guardas", value: 10 + simulatedEfectivos },
    { name: "Pilotos", value: 4 },
    { name: "Conductores", value: 3 },
    { name: "Médicos", value: 1 }
  ];


  const consumptionMovements = inventoryMovements.filter(m => 
    m.campId === activeCampId && 
    ["DAILY_RATION", "EXPEDITION_DEPARTURE", "TRANSFER_SENT"].includes(m.movementType)
  );

  const defaultDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const consumptionTrendMap = consumptionMovements.reduce((acc, curr) => {
    let dateStr = curr.date;
    if (curr.date.includes("/")) {
      const parts = curr.date.split(" ")[0].split("/");
      dateStr = `2026-${parts[1]}-${parts[0]}`;
    } else if (curr.date.includes("T")) {
      dateStr = curr.date.split("T")[0];
    }
    acc[dateStr] = (acc[dateStr] || 0) + Number(curr.amount);
    return acc;
  }, {} as Record<string, number>);

  const trendData = defaultDates.map(date => {
    const formattedLabel = date.split("-").slice(1).reverse().join("/"); 

    const realVal = consumptionTrendMap[date] || 0;
    return {
      date: formattedLabel,
      totalConsumed: realVal > 0 ? realVal : Math.floor(Math.sin(parseInt(date.slice(-2)) || 1) * 20) + 45
    };
  });

  return (
    <SectionShell kicker="PERSONAL Y COBERTURAS" title="Dashboard Global de Personal">
      
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-sm font-black tracking-widest text-[#69BFB7] uppercase">Gobernanza y Personal Base</h2>
        <Btn onClick={triggerRefresh}>Sincronizar personal</Btn>
      </div>

      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-xs">
        
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="text-[10px] font-mono text-[#69BFB7] uppercase font-bold tracking-wider mb-2">
              Guarnición de Campo
            </div>
            <div className="v-kpi-value text-3xl font-black text-white tracking-tight flex items-baseline gap-1">
              {totalGarrison}
              <span className="text-[10px] font-mono text-[#A4C2C5]/60 font-normal">operativos</span>
            </div>
            <div className="text-[9px] font-mono text-[#A4C2C5]/60 mt-1 uppercase">
              ALPHA BUNKER (PROPIO)
            </div>
          </div>
          <button 
            type="button"
            onClick={handleAddSpecialistLocal}
            className="text-[10px] font-mono text-[#69BFB7] hover:underline uppercase text-left w-fit cursor-pointer font-bold mt-3"
          >
            AÑADIR REFUERZO LOCAL
          </button>
        </div>

        
        <div className="mission-card border border-[#ba3838]/40 bg-red-950/10 p-4 rounded-sm flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="text-[10px] font-mono text-crimson uppercase font-bold tracking-wider mb-2">
              Suministros Críticos
            </div>
            <div className="v-kpi-value text-3xl font-black text-[#ef4444] tracking-tight flex items-baseline gap-1">
              {criticalStockCount}
              <span className="text-[10px] font-mono text-[#A4C2C5]/50 font-normal">alertas</span>
            </div>
            <div className="text-[9px] font-mono text-[#A4C2C5]/50 mt-1 uppercase">
              Bajo umbral de resguardo
            </div>
          </div>
          <button 
            type="button"
            onClick={() => onNavigateToSub("Inventario del campamento")}
            className="text-[10px] font-mono text-[#69BFB7] hover:underline uppercase text-left w-fit cursor-pointer font-bold mt-3"
          >
            REVISAR ALMACENES →
          </button>
        </div>

        
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="text-[9.5px] font-mono text-[#69BFB7] uppercase font-bold tracking-wider mb-1 flex justify-between items-center">
              <span>Especialistas Activos</span>
              <span className="h-1 w-1 rounded-full bg-[#10b981] animate-ping inline-block" />
            </div>
            
            <div className="h-16 w-full flex items-center justify-center relative select-none">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={SPECIALISTS_PIE_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={15}
                    outerRadius={24}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {SPECIALISTS_PIE_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={["#69BFB7", "#f59e0b", "#10b981", "#ef4444"][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-black text-white">{SPECIALISTS_PIE_DATA.reduce((sum, item) => sum + item.value, 0)}</span>
              </div>
            </div>

            
            <div className="flex flex-wrap gap-x-1.5 justify-center text-[7.5px] font-mono leading-none mt-1">
              {SPECIALISTS_PIE_DATA.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-0.5 whitespace-nowrap">
                  <span className="h-1 w-1 rounded-full shrink-0" style={{ backgroundColor: ["#69BFB7", "#f59e0b", "#10b981", "#ef4444"][index % 4] }} />
                  <span className="text-[#A4C2C5]/60 text-[7.5px]">{entry.name.slice(0, 5)}:</span>
                  <strong className="text-white text-[8px]">{entry.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="text-[10px] font-mono text-[#69BFB7] uppercase font-bold tracking-wider mb-2">
              Cobertura de Despliegue
            </div>
            <div className="v-kpi-value text-3xl font-black text-white tracking-tight flex items-baseline gap-1">
              {deploymentEfficiency}%
              <span className="text-[10px] font-mono text-[#A4C2C5]/60 font-normal">cobertura</span>
            </div>
            <div className="text-[9px] font-mono text-[#A4C2C5]/50 mt-1 uppercase">
              Personal vs Requerido
            </div>
          </div>
          <button 
            type="button"
            onClick={() => onNavigateToSub("Oficios y cobertura")}
            className="text-[10px] font-mono text-[#69BFB7] hover:underline uppercase text-left w-fit cursor-pointer font-bold mt-3"
          >
            AJUSTAR OFICIOS →
          </button>
        </div>
      </div>

      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        
        
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-[#67ACA9]/10 pb-2 mb-3">
              <span className="text-xs font-bold text-white uppercase font-mono">Estado de Expediciones Activas</span>
              <span className="text-[9px] font-mono text-zinc-400">Módulo Satelital</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4 select-none">
              <div className="bg-[#ba7938]/10 border border-amber-500/20 p-2.5 rounded-sm">
                <div className="text-amber-400 font-bold text-lg">{localExpeditions.PLANNED}</div>
                <div className="text-[8px] font-mono uppercase tracking-wider text-[#A4C2C5]/60 mt-0.5">PLANIFICADAS</div>
              </div>
              <div className="bg-[#67ACA9]/10 border border-[#69BFB7]/30 p-2.5 rounded-sm animate-pulse">
                <div className="text-[#69BFB7] font-bold text-lg">{localExpeditions.IN_PROGRESS}</div>
                <div className="text-[8px] font-mono uppercase tracking-wider text-[#A4C2C5]/60 mt-0.5">EN CURSO</div>
              </div>
              <div className="bg-red-950/20 border border-red-500/20 p-2.5 rounded-sm">
                <div className="text-red-400 font-bold text-lg">{localExpeditions.LOST}</div>
                <div className="text-[8px] font-mono uppercase tracking-wider text-[#A4C2C5]/60 mt-0.5">PERDIDAS</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs select-none">
              <div className="bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-sm">
                <div className="text-emerald-400 font-bold text-lg">{localExpeditions.COMPLETED}</div>
                <div className="text-[8px] font-mono uppercase tracking-wider text-[#A4C2C5]/60 mt-0.5">COMPLETADAS</div>
              </div>
              <div className="bg-zinc-900/40 border border-zinc-700/20 p-2.5 rounded-sm">
                <div className="text-zinc-400 font-bold text-lg">{localExpeditions.CANCELED}</div>
                <div className="text-[8px] font-mono uppercase tracking-wider text-[#A4C2C5]/60 mt-0.5">CANCELADAS</div>
              </div>
              <div className="bg-orange-950/20 border border-orange-500/20 p-2.5 rounded-sm">
                <div className="text-orange-400 font-bold text-lg">{localExpeditions.DELAYED}</div>
                <div className="text-[8px] font-mono uppercase tracking-wider text-[#A4C2C5]/60 mt-0.5">RETRASADAS</div>
              </div>
            </div>
          </div>
        </div>

        
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-[#67ACA9]/10 pb-2 mb-3">
              <span className="text-xs font-bold text-white uppercase font-mono">Tendencia de Consumo Reciente (7 Días)</span>
              <span className="text-[9px] font-mono text-[#69BFB7]">Raciones Totales</span>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradientTrendPersonal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_THEME.teal} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={CHART_THEME.teal} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
                  <XAxis dataKey="date" stroke={CHART_THEME.text} style={{ fontSize: 9 }} />
                  <YAxis stroke={CHART_THEME.text} style={{ fontSize: 9 }} />
                  <Tooltip {...chartTooltipStyle} />
                  <Area type="monotone" dataKey="totalConsumed" name="Consumo (Raciones)" stroke={CHART_THEME.teal} fillOpacity={1} fill="url(#gradientTrendPersonal)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="text-[9.5px] font-mono text-[#A4C2C5]/50 text-right mt-1.5 uppercase">
            Suma agregada de movimientos de raciones, traslados y consumos
          </div>
        </div>
      </div>

      
      <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm">
        <div className="flex justify-between items-center border-b border-[#67ACA9]/10 pb-3 mb-4 flex-wrap gap-2">
          <div>
            <span className="text-[8.5px] font-mono text-[#69BFB7] font-bold uppercase tracking-wider block">CONTROL CAPACIDAD</span>
            <h3 className="text-xs font-bold text-white uppercase mt-0.5">Nóminas de Especialistas en Alpha Bunker</h3>
          </div>
          
          <Btn small onClick={() => onNavigateToSub("Oficios y cobertura")}>
            Ajustar Coberturas Históricas
          </Btn>
        </div>

        <div className="v-overflow-wrap overflow-x-auto">
          <table className="v-table w-full text-left border-collapse" style={{ minWidth: "500px" }}>
            <thead>
              <tr className="border-b border-[#67ACA9]/20 text-[10px] tracking-wider text-[#A4C2C5]/50 uppercase font-mono">
                <th className="pb-2">Especialidad</th>
                <th className="pb-2">Requerida</th>
                <th className="pb-2">Nivel Activo</th>
                <th className="pb-2">Estado</th>
                <th className="pb-2 text-right">Firma Técnico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#67ACA9]/5 text-xs font-mono">
              <tr>
                <td className="py-2.5 font-bold text-white">Guarda / Defensor Armado</td>
                <td className="py-2.5">10</td>
                <td className="py-2.5 text-[#69BFB7] font-bold">{10 + simulatedEfectivos}</td>
                <td className="py-2.5">
                  <StatusIndicator status={(10 + simulatedEfectivos) >= 10 ? "EXCELENTE" : "ALERTA"} />
                </td>
                <td className="py-2.5 text-right text-[10px] text-[#A4C2C5]/40">[AUTORIZADO]</td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-white">Piloto de Aeronave VTOL</td>
                <td className="py-2.5">4</td>
                <td className="py-2.5 text-[#69BFB7] font-bold">4</td>
                <td className="py-2.5">
                  <StatusIndicator status="EXCELENTE" />
                </td>
                <td className="py-2.5 text-right text-[10px] text-[#A4C2C5]/40">[AUTORIZADO]</td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-white">Conductor de Convoy Pesado</td>
                <td className="py-2.5">3</td>
                <td className="py-2.5 text-[#69BFB7] font-bold">3</td>
                <td className="py-2.5">
                  <StatusIndicator status="ESTABLE" />
                </td>
                <td className="py-2.5 text-right text-[10px] text-[#A4C2C5]/40">[SINC EVENTO]</td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-white">Médico de Emergencia</td>
                <td className="py-2.5">2</td>
                <td className="py-2.5 text-[#69BFB7] font-bold">1</td>
                <td className="py-2.5">
                  <StatusIndicator status="ALERTA" />
                </td>
                <td className="py-2.5 text-right text-[10px] text-[#A4C2C5]/40">[CALIBRANDO]</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </SectionShell>
  );
}
