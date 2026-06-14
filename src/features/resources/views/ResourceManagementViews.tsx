import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Package,
  ArrowRightLeft,
  AlertCircle,
  Trash2,
  Plus,
  FileText,
  Check,
  ChevronRight,
  Truck,
  Users,
  Briefcase,
  Send
} from "lucide-react";
import {
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart
} from "recharts";
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
  OperationalNotification,
  CampPerson
} from "../types/resourceManagementTypes";
import { INITIAL_OCCUPATIONS } from "../data/resourceManagementData";

function readStoredCurrentUser() {
  if (typeof window === "undefined") {
    return { userId: "3", campId: "1" };
  }

  const selectedCampIdRaw = localStorage.getItem("last_selected_camp_id");
  const sessionSources = [
    localStorage.getItem("session_user"),
    localStorage.getItem("user"),
  ];

  let userId = "3";
  let campId = "1";

  for (const raw of sessionSources) {
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as {
        userId?: unknown;
        id?: unknown;
        campId?: unknown;
        selectedCampId?: unknown;
      };

      const parsedUserId = parsed.userId ?? parsed.id;
      if (parsedUserId !== undefined && parsedUserId !== null && String(parsedUserId).trim()) {
        userId = String(parsedUserId);
      }

      const parsedCampId = parsed.selectedCampId ?? parsed.campId;
      if (parsedCampId !== undefined && parsedCampId !== null && String(parsedCampId).trim()) {
        campId = String(parsedCampId);
        break;
      }
    } catch { }
  }

  if (selectedCampIdRaw && selectedCampIdRaw.trim()) {
    campId = selectedCampIdRaw;
  }

  return { userId, campId };
}

function getCampDisplayName(camps: Camp[], campId?: string | number | null) {
  if (campId === undefined || campId === null || String(campId).trim() === "") {
    return "Campamento no definido";
  }

  const campIdText = String(campId);
  return camps.find(camp => String(camp.id) === campIdText)?.name || `Campamento ${campIdText}`;
}

function findResourceType(resourceTypes: ResourceType[], resourceTypeId?: string | number | null) {
  if (resourceTypeId === undefined || resourceTypeId === null || String(resourceTypeId).trim() === "") {
    return null;
  }

  const rawId = String(resourceTypeId);
  const cleanId = rawId.replace(/^rt[-_]/i, "").toLowerCase();
  return resourceTypes.find(resource => {
    const id = String(resource.id).toLowerCase();
    const name = resource.name.toLowerCase();
    const category = String(resource.category ?? "").toLowerCase();

    return id === rawId.toLowerCase()
      || id === cleanId
      || name === cleanId
      || name.replace(/\s+/g, "-").toLowerCase() === cleanId
      || category === cleanId;
  }) ?? null;
}

function resourceTypeMatches(resourceTypes: ResourceType[], candidateId: string | number, expectedId?: string | number | null) {
  if (expectedId === undefined || expectedId === null) return false;
  if (String(candidateId) === String(expectedId)) return true;

  const expected = findResourceType(resourceTypes, expectedId);
  return expected ? String(candidateId) === String(expected.id) : false;
}

function getResourceTypeDisplayName(resourceTypes: ResourceType[], resourceTypeId?: string | number | null) {
  if (resourceTypeId === undefined || resourceTypeId === null || String(resourceTypeId).trim() === "") {
    return "Recurso no definido";
  }

  const rawId = String(resourceTypeId);
  const cleanId = rawId.replace(/^rt[-_]/i, "").toLowerCase();
  const match = findResourceType(resourceTypes, resourceTypeId);

  if (match) return match.name;

  return cleanId
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || rawId;
}

function getResourceTypeUnit(resourceTypes: ResourceType[], resourceTypeId?: string | number | null) {
  const match = findResourceType(resourceTypes, resourceTypeId);
  return match?.unitOfMeasure || "u";
}

export const currentUser = {
  get userId() {
    return readStoredCurrentUser().userId;
  },
  get campId() {
    return readStoredCurrentUser().campId;
  },
  rol: "RESOURCE_MANAGEMENT" as const
};

export function Btn({
  children,
  variant = "primary",
  onClick,
  small,
  style,
  disabled,
  type = "button"
}: {
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "danger" | "success" | "warning";
  onClick?: () => void;
  small?: boolean;
  style?: React.CSSProperties;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
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
      className={`v-btn ${base} ${colors} font-bold uppercase tracking-wide rounded-sm transition-all whitespace-normal break-words sm:whitespace-nowrap ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
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
  onChange,
  minDate
}: {
  label: string;
  required?: boolean;
  value?: string;
  onChange: (val: string) => void;
  minDate?: Date;
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

  const selectedDate = (newYr: number, newMo: number, newDy: string, newHr: string, newMin: string) =>
    new Date(newYr, newMo, parseInt(newDy) || 1, parseInt(newHr) || 0, parseInt(newMin) || 0);

  const isBeforeMinDate = (candidate: Date) =>
    minDate ? candidate.getTime() < minDate.getTime() : false;

  const isDayBeforeMinDate = (newYr: number, newMo: number, newDy: string) => {
    if (!minDate) return false;
    const candidateEndOfDay = new Date(newYr, newMo, parseInt(newDy) || 1, 23, 59, 59, 999);
    return candidateEndOfDay.getTime() < minDate.getTime();
  };

  const updateCombined = (newYr: number, newMo: number, newDy: string, newHr: string, newMin: string) => {
    const dObj = new Date(newYr, newMo, parseInt(newDy) || 1, parseInt(newHr) || 0, parseInt(newMin) || 0);
    onChange(isBeforeMinDate(dObj) && minDate ? minDate.toISOString() : dObj.toISOString());
  };

  const handleSelectDay = (item: string) => {
    if (isDayBeforeMinDate(year, month, item)) return;
    setDay(item);
    updateCombined(year, month, item, hour, minute);
  };

  const handleSelectHour = (item: string) => {
    if (isBeforeMinDate(selectedDate(year, month, day, item, minute))) return;
    setHour(item);
    updateCombined(year, month, day, item, minute);
  };

  const handleSelectMinute = (item: string) => {
    if (isBeforeMinDate(selectedDate(year, month, day, hour, item))) return;
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
                  {days.map((item, index) => {
                    const disabled = isDayBeforeMinDate(year, month, item);

                    return (
                      <button
                        key={`${item}-${index}`}
                        type="button"
                        disabled={disabled}
                        className={`${item === day ? "is-active" : ""} ${disabled ? "opacity-25 cursor-not-allowed" : ""}`}
                        onClick={() => handleSelectDay(item)}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="dt-time-col" data-label="HORA">
                {hours.map((item) => {
                  const disabled = isBeforeMinDate(selectedDate(year, month, day, item, minute));

                  return (
                    <button
                      key={`h-${item}`}
                      type="button"
                      disabled={disabled}
                      className={item === hour ? "is-active" : ""}
                      onClick={() => handleSelectHour(item)}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>

              <div className="dt-time-col" data-label="MIN">
                {minutes.map((item) => {
                  const disabled = isBeforeMinDate(selectedDate(year, month, day, hour, item));

                  return (
                    <button
                      key={`m-${item}`}
                      type="button"
                      disabled={disabled}
                      className={item === minute ? "is-active" : ""}
                      onClick={() => handleSelectMinute(item)}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="dt-actions">
              <button
                type="button"
                onClick={() => {
                  const nowStr = new Date().toISOString();
                  onChange(minDate && minDate.getTime() > Date.now() ? minDate.toISOString() : nowStr);
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
                  onChange(minDate && minDate.getTime() > Date.now() ? minDate.toISOString() : nowStr);
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
  transferPersons = [],
  occupations = [],
  occupationCoverages = [],
  requestResourceDetails = [],
  deliveredTransferResources = [],
  onNavigateToSub
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
  transferPersons?: TransferPerson[];
  occupations?: Occupation[];
  occupationCoverages?: OccupationCoverage[];
  requestResourceDetails?: RequestResourceDetail[];
  deliveredTransferResources?: DeliveredTransferResource[];
  onSaveCollection?: (data: Omit<DailyCollectionRecord, "id">) => void;
  onAddManualMovement?: (data: Omit<InventoryMovement, "id">) => void;
  onAddRequest?: (data: Omit<IntercampRequest, "id">) => void;
  onAddNotification?: (data: Omit<OperationalNotification, "id">) => void;
  onMarkAsRead?: (id: string) => void;
  onUpdateInventory?: (campId: string, resourceTypeId: string, currentAmount: number, minimumAlertAmount: number) => void;
  onNavigateToSub: (sub: string) => void;
}) {
  const activeCampId = currentUser.campId;
  const campName = getCampDisplayName(camps, activeCampId);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const triggerRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };
  const [systTime, setSystTime] = useState(new Date());

  useEffect(() => {
    const clockInterval = setInterval(() => {
      setSystTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

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
  const activeCampInventories = campInventories.filter(item => String(item.campId) === String(activeCampId));
  const unresolvedAlerts = inventoryAlerts.filter(a => !a.resolved && String(a.campId) === String(activeCampId));
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
    String(m.campId) === String(activeCampId) &&
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
  const fieldWarnings: string[] = [];
  unresolvedAlerts.forEach(al => {
    const type = resourceTypes.find(t => t.id === al.resourceTypeId);
    fieldWarnings.push(`Alerta de stock crítico: El recurso "${type?.name || al.resourceTypeId}" está por debajo del mínimo de seguridad.`);
  });
  intercampRequests.filter(req => req.status === "PENDING" && req.destinationCampId === activeCampId).forEach(req => {
    fieldWarnings.push(`Requisición pendiente: Solicitud de traslado ${req.id} requiere respuesta autorizada.`);
  });
  transfers.filter(t => t.status === "PENDING_DEPARTURE" && intercampRequests.find(r => r.id === t.requestId)?.originCampId === activeCampId).forEach(t => {
    fieldWarnings.push(`Despacho pendiente: Traslado ${t.id} listo para la firma de despacho.`);
  });
  const paginatedInventario = detailedResources.slice((pageInventario - 1) * pageSize, pageInventario * pageSize);
  const totalPageInventario = Math.ceil(detailedResources.length / pageSize) || 1;
  const paginatedAlertas = unresolvedAlerts.slice((pageAlertas - 1) * pageSize, pageAlertas * pageSize);
  const totalPageAlertas = Math.ceil(unresolvedAlerts.length / pageSize) || 1;
  const activeCampMovements = inventoryMovements.filter(m => String(m.campId) === String(activeCampId)).reverse();
  const paginatedMovimientos = activeCampMovements.slice((pageMovimientos - 1) * pageSize, pageMovimientos * pageSize);
  const totalPageMovimientos = Math.ceil(activeCampMovements.length / pageSize) || 1;
  const activeCampCollections = dailyCollectionRecords.filter(c => String(c.campId) === String(activeCampId)).reverse();
  const paginatedRecoleccion = activeCampCollections.slice((pageRecoleccion - 1) * pageSize, pageRecoleccion * pageSize);
  const totalPageRecoleccion = Math.ceil(activeCampCollections.length / pageSize) || 1;
  const activeCampRequests = intercampRequests.filter(r => r.originCampId === activeCampId || r.destinationCampId === activeCampId).reverse();
  const paginatedSolicitudes = activeCampRequests.slice((pageSolicitudes - 1) * pageSize, pageSolicitudes * pageSize);
  const totalPageSolicitudes = Math.ceil(activeCampRequests.length / pageSize) || 1;
  const totalGarrisonCount = camps.find(c => c.id === activeCampId)?.personnelCount || 35;
  const activeSpecialistsCount = occupationCoverages.filter(cov => String(cov.campId) === String(activeCampId)).reduce((s, o) => s + o.active, 0);
  const incomingPendingRequests = intercampRequests.filter(req =>
    req.destinationCampId === activeCampId && req.status === "PENDING"
  );
  const pendingRequestsCount = incomingPendingRequests.length;

  const requiresResourcesCount = incomingPendingRequests.filter(req =>
    requestResourceDetails.some(d => d.requestId === req.id && d.requestedAmount > 0)
  ).length;

  const requiresPersonnelCount = incomingPendingRequests.filter(req =>
    req.personRequirements && req.personRequirements.some(pr => pr.quantity > 0)
  ).length;
  const sentRequests = intercampRequests.filter(req => req.originCampId === activeCampId);
  const draftsCount = sentRequests.filter(r => r.status === "DRAFT").length;
  const pendingSentCount = sentRequests.filter(r => r.status === "PENDING").length;
  const approvedSentCount = sentRequests.filter(r => r.status === "APPROVED").length;
  const activeTransfers = transfers.filter(t => {
    const req = intercampRequests.find(r => r.id === t.requestId);
    return req && (req.originCampId === activeCampId || req.destinationCampId === activeCampId);
  });
  const activeTransfersIds = activeTransfers.map(tr => tr.id);

  const preparedTransfersCount = activeTransfers.filter(tr => tr.status === "PENDING_DEPARTURE" && !tr.actualDepartureDate).length;
  const inTransitTransfersCount = activeTransfers.filter(tr =>
    (tr.status === "PENDING_DEPARTURE" && tr.actualDepartureDate && !tr.actualArrivalDate) ||
    transferPersons.some(tp => tp.transferId === tr.id && tp.status === "IN_TRANSIT")
  ).length;

  const todayStr = systTime.toISOString().split("T")[0];
  const delayedTransfersCount = activeTransfers.filter(tr =>
    tr.status === "PENDING_DEPARTURE" && (tr.plannedDepartureDate < todayStr || tr.plannedArrivalDate < todayStr)
  ).length;
  const lowResourcesCount = unresolvedAlerts.length;
  const activeCampFoodInventory = campInventories.find(i => String(i.campId) === String(activeCampId) && resourceTypeMatches(resourceTypes, i.resourceTypeId, "2"))?.currentAmount || 0;
  const upcomingDeparturesFromMyCamp = transfers.filter(t => {
    const req = intercampRequests.find(r => r.id === t.requestId);
    return req && req.originCampId === activeCampId && t.status === "PENDING_DEPARTURE" && !t.actualDepartureDate;
  });
  const totalRationsNeededForUpcoming = upcomingDeparturesFromMyCamp.reduce((sum, t) => sum + t.rationsForTrip, 0);
  const isRationsShortage = activeCampFoodInventory < totalRationsNeededForUpcoming;
  const rationsShortageBlocks = isRationsShortage ? 1 : 0;
  const approvedOutgoingRequests = intercampRequests.filter(req => req.originCampId === activeCampId && req.status === "APPROVED");
  let sendBelowMinWarnings = 0;
  activeCampInventories.forEach(inv => {
    const approvedAmountPending = approvedOutgoingRequests.reduce((sum, req) => {
      const isPendingDeparture = transfers.some(t => t.requestId === req.id && t.status === "PENDING_DEPARTURE");
      if (isPendingDeparture) {
        const details = requestResourceDetails.filter(d => d.requestId === req.id && d.resourceTypeId === inv.resourceTypeId);
        return sum + details.reduce((s, d) => s + (d.approvedAmount || d.requestedAmount), 0);
      }
      return sum;
    }, 0);
    if (approvedAmountPending > 0 && (inv.currentAmount - approvedAmountPending < inv.minimumAlertAmount)) {
      sendBelowMinWarnings++;
    }
  });

  const totalLogisticalBlocks = lowResourcesCount + rationsShortageBlocks + sendBelowMinWarnings;
  const shrinkagesCount = deliveredTransferResources.filter(d =>
    activeTransfersIds.includes(d.transferId) && d.sentAmount > d.receivedAmount
  ).length;
  const feedEvents: { id: string; date: string; text: string; category: string }[] = [];
  activeCampRequests.slice(0, 8).forEach(req => {
    const isOrigin = req.originCampId === activeCampId;
    const oppCamp = getCampDisplayName(camps, isOrigin ? req.destinationCampId : req.originCampId);
    feedEvents.push({
      id: `req-c-${req.id}`,
      date: req.createdDate || "24/05/2026",
      text: isOrigin ? `Solicitud #${req.id} enviada a ${oppCamp}` : `Solicitud #${req.id} recibida de ${oppCamp}`,
      category: "solicitud"
    });
    if (req.status !== "PENDING" && req.status !== "DRAFT") {
      feedEvents.push({
        id: `req-s-${req.id}-${req.status}`,
        date: req.responseDate || req.createdDate || "24/05/2026",
        text: `Solicitud #${req.id} marcada como ${req.status === "APPROVED" ? "aprobada" : "rechazada"}`,
        category: "resolucion"
      });
    }
  });

  activeTransfers.forEach(tr => {
    const req = intercampRequests.find(r => r.id === tr.requestId);
    const oppCamp = getCampDisplayName(camps, req?.originCampId === activeCampId ? req?.destinationCampId : req?.originCampId);
    if (tr.actualDepartureDate) {
      feedEvents.push({
        id: `tr-d-${tr.id}`,
        date: tr.actualDepartureDate,
        text: `Traslado #${tr.id} en tránsito hacia ${oppCamp}`,
        category: "transito"
      });
    }
    if (tr.status === "COMPLETED") {
      feedEvents.push({
        id: `tr-c-${tr.id}`,
        date: tr.actualArrivalDate || tr.plannedArrivalDate,
        text: `Traslado #${tr.id} entregado y completado exitosamente`,
        category: "completado"
      });
    }
  });

  const sortedRecentFeed = [...feedEvents]
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, 4);
  const confirmedPersonsCount = transferPersons.filter(tp =>
    activeTransfersIds.includes(tp.transferId) && tp.status === "CONFIRMED"
  ).length;

  const inTransitPersonsCount = transferPersons.filter(tp =>
    activeTransfersIds.includes(tp.transferId) && tp.status === "IN_TRANSIT"
  ).length;

  return (
    <SectionShell kicker="CENTRAL DE OPERACIONES" title="Dashboard de Recursos">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-4 border-b border-[#67ACA9]/15">
        <div>
          <h2 className="text-sm font-black tracking-widest text-[#69BFB7] uppercase">{campName.toUpperCase()} — CONTROL LOGÍSTICO</h2>
          <p className="text-[10px] text-zinc-400 mt-0.5 uppercase tracking-wider">Monitor centralizado de recursos, personal en tránsito y contingencias operativas</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-black/40 border border-[#67ACA9]/20 font-mono">
            <Clock className="w-3.5 h-3.5 text-[#69BFB7] animate-pulse" />
            <div className="text-left">
              <span className="block text-[8px] text-[#A4C2C5]/70 uppercase tracking-widest leading-none">RELEVO SIGUIENTE</span>
              <span className="text-[11px] font-bold text-white leading-none block mt-0.5">{formatRemaining(remainingMs)}</span>
            </div>
          </div>

          <div className={`px-2.5 py-1.5 rounded-sm border font-mono text-[9px] uppercase font-bold ${statusStyle.color}`}>
            {statusStyle.label}
          </div>

          <Btn onClick={triggerRefresh}>
            {isRefreshing ? "ACTUALIZANDO..." : "REPROCESAR DATOS"}
          </Btn>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="mission-card border border-[#67ACA9]/20 bg-[#0d1414]/90 p-4 rounded-sm hover:border-[#67ACA9]/40 transition-all flex flex-col justify-between">
          <div>
            <span className="text-[8.5px] font-mono text-zinc-400 font-bold uppercase tracking-wider block">GUARNICIÓN ACTIVA</span>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-black text-white tracking-tight">{totalGarrisonCount}</span>
              <span className="text-[9px] text-[#69BFB7] font-mono font-bold uppercase">Operadores</span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">Garrison con {activeSpecialistsCount} especialistas asignados.</p>
          </div>
          <button
            onClick={() => onNavigateToSub("Inventario actual")}
            className="text-[9.5px] font-mono font-bold text-[#69BFB7] hover:text-white transition-all text-left mt-3 uppercase tracking-wider flex items-center gap-1 cursor-pointer"
          >
            Revisar almacenes ➔
          </button>
        </div>
        <div className="mission-card border border-[#67ACA9]/20 bg-[#0d1414]/90 p-4 rounded-sm hover:border-[#67ACA9]/40 transition-all flex flex-col justify-between">
          <div>
            <span className="text-[8.5px] font-mono text-amber-400 font-bold uppercase tracking-wider block">SUMINISTROS CRÍTICOS</span>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className={`text-2xl font-black tracking-tight ${lowResourcesCount > 0 ? 'text-amber-400 animate-pulse' : 'text-zinc-400'}`}>
                {lowResourcesCount}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono uppercase font-bold text-[#69BFB7] tracking-wider ml-1">
                {lowResourcesCount === 1 ? "alerta" : "alertas"}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">Materias primas y raciones bajo el mínimo de seguridad permitido.</p>
          </div>
          <button
            onClick={() => onNavigateToSub("Alertas de inventario")}
            className="text-[9.5px] font-mono font-bold text-[#69BFB7] hover:text-white transition-all text-left mt-3 uppercase tracking-wider flex items-center gap-1 cursor-pointer"
          >
            REVISAR ALMACENES ➔
          </button>
        </div>
        <div className="mission-card border border-[#67ACA9]/20 bg-[#0d1414]/90 p-4 rounded-sm hover:border-[#67ACA9]/40 transition-all flex flex-col justify-between">
          <div>
            <span className="text-[8.5px] font-mono text-zinc-400 font-bold uppercase tracking-wider block">CONSUMO ÚLTIMOS 7 DÍAS</span>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-black text-white tracking-tight">
                {totalConsumed7Days}
              </span>
              <span className="text-[9px] text-zinc-400 font-mono uppercase">Unidades</span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">Mermas y entregas históricas registradas en bitácora.</p>
          </div>
          <button
            onClick={() => onNavigateToSub("Solicitudes intercampamento")}
            className="text-[9.5px] font-mono font-bold text-[#69BFB7] hover:text-white transition-all text-left mt-3 uppercase tracking-wider flex items-center gap-1 cursor-pointer"
          >
            Ver solicitudes ➔
          </button>
        </div>
        <div className="mission-card border border-[#67ACA9]/20 bg-[#0d1414]/90 p-4 rounded-sm hover:border-[#67ACA9]/40 transition-all flex flex-col justify-between">
          <div>
            <span className="text-[8.5px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">COBERTURA DE SEGURIDAD</span>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-black text-emerald-300 tracking-tight">
                {lowResourcesCount === 0 ? "100%" : "RESTRICTIVO"}
              </span>
              <span className="text-[9px] text-zinc-500 font-mono uppercase">Garantía</span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">Estado de operatividad física en función del mínimo de seguridad.</p>
          </div>
          <div className="text-[9.5px] font-mono font-bold text-[#69BFB7] uppercase tracking-wider mt-3">
            SISTEMA INTEGRADO OK
          </div>
        </div>

      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="mission-card border border-amber-500/20 bg-amber-950/5 p-4 rounded-sm flex flex-col justify-between shadow-md">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[8.5px] font-mono text-amber-300 font-bold uppercase tracking-wider font-extrabold">SOLICITUDES POR APROBAR</span>
              <span className="px-1.5 py-0.5 rounded-sm bg-amber-500/20 text-amber-300 font-mono text-[9px] font-black">{pendingRequestsCount}</span>
            </div>

            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] text-zinc-300 bg-black/25 p-1 rounded-xs">
                <span>Campamentos Destino (Tú)</span>
                <span className="font-bold text-white">{pendingRequestsCount} pendientes</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-zinc-300 pb-0.5 border-b border-zinc-800/10">
                <span>Requieren recursos directos</span>
                <span className="font-bold text-zinc-100">{requiresResourcesCount}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-zinc-300">
                <span>Requieren personal táctico</span>
                <span className="font-bold text-zinc-100">{requiresPersonnelCount}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToSub("Solicitudes intercampamento")}
            className="w-full mt-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-black uppercase rounded-xs transition-colors tracking-wider text-center cursor-pointer"
          >
            REVISAR SOLICITUDES ➔
          </button>
        </div>
        <div className="mission-card border border-[#67ACA9]/20 bg-[#0d1414]/90 p-4 rounded-sm flex flex-col justify-between shadow-md">
          <div>
            <span className="text-[8.5px] font-mono text-zinc-300 font-bold uppercase tracking-wider block">SOLICITUDES EMITIDAS (ORIGEN)</span>

            <div className="mt-3 space-y-2">
              <div className="flex justify-between items-center border-b border-[#67ACA9]/10 pb-1">
                <span className="text-[10px] text-zinc-400">Total en Borradores (DRAFT)</span>
                <span className="text-[10px] font-bold text-zinc-300">{draftsCount} borradores</span>
              </div>

              <div className="flex justify-between items-center border-b border-[#67ACA9]/10 pb-1">
                <span className="text-[10px] text-zinc-405">En revisión (PENDING)</span>
                <span className="text-[10px] font-bold text-amber-300">{pendingSentCount} pendientes</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[10px] text-zinc-400">Aprobadas por destino</span>
                <span className="text-[10px] font-bold text-emerald-300">{approvedSentCount} aprobadas</span>
              </div>
            </div>
          </div>

          <div className="text-[9px] font-mono text-zinc-500 uppercase mt-4 block text-center border-t border-[#67ACA9]/10 pt-2">
            CONTROL CENTRAL DE TRÁMITES
          </div>
        </div>
        <div className="mission-card border border-[#67ACA9]/20 bg-[#0d1414]/90 p-4 rounded-sm flex flex-col justify-between shadow-md">
          <div>
            <span className="text-[8.5px] font-mono text-[#69BFB7] font-bold uppercase tracking-wider block">CONVOYES ACTIVOS</span>

            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] text-zinc-300 bg-black/25 p-1 rounded-xs">
                <span>Preparados / Listos</span>
                <span className="font-bold text-white">{preparedTransfersCount} despachos</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-zinc-300">
                <span>En camino (Transit)</span>
                <span className="font-bold text-[#69BFB7]">{inTransitTransfersCount} activos</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-zinc-300">
                <span>Con retraso operativo</span>
                <span className={`font-bold ${delayedTransfersCount > 0 ? 'text-rose-400 animate-pulse' : 'text-zinc-500'}`}>{delayedTransfersCount} atrasados</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToSub("Traslados")}
            className="w-full mt-4 py-2 bg-[#67ACA9]/10 hover:bg-[#67ACA9]/20 border border-[#67ACA9]/30 text-[#69BFB7] font-mono text-[10px] font-black uppercase rounded-xs transition-colors tracking-wider text-center cursor-pointer"
          >
            VER TRASLADOS ➔
          </button>
        </div>
        <div className="mission-card border border-red-500/25 bg-red-950/5 p-4 rounded-sm flex flex-col justify-between shadow-md">
          <div>
            <span className="text-[8.5px] font-mono text-red-300 font-bold uppercase tracking-wider block font-extrabold">RIESGO LOGÍSTICO</span>

            <div className="mt-3 space-y-2">
              <div className="flex justify-between items-center p-1 bg-red-950/30 rounded-xs">
                <div className="flex items-center gap-1.5 text-[10px] text-[#A4C2C5]">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  <span>Bloqueos Detectados</span>
                </div>
                <span className="text-[10px] font-black text-rose-300">{totalLogisticalBlocks} bloqueos</span>
              </div>

              <div className="flex justify-between items-center p-1 bg-zinc-950/40 rounded-xs border border-zinc-800/10">
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>Revisiones (Mermas)</span>
                </div>
                <span className="text-[10px] font-black text-amber-300">{shrinkagesCount} incidencias</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToSub("Alertas de inventario")}
            className="w-full mt-4 py-2 bg-red-950/40 hover:bg-red-950/60 border border-red-500/30 text-rose-300 font-mono text-[10px] font-bold uppercase rounded-xs transition-colors tracking-wider text-center cursor-pointer"
          >
            VER CONSOLA DE INCIDENCIAS
          </button>
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
            <Btn variant="primary" small style={{ width: "100%" }} onClick={() => onNavigateToSub("Inventario actual")}>
              Ver inventario completo →
            </Btn>
            <div className="grid grid-cols-2 gap-1">
              <Btn variant="ghost" small onClick={() => onNavigateToSub("Inventario actual")}>
                Mínimos
              </Btn>
              <Btn variant="ghost" small onClick={() => onNavigateToSub("Historial de movimientos")}>
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
                const resourceName = getResourceTypeDisplayName(resourceTypes, al.resourceTypeId);
                const resourceUnit = getResourceTypeUnit(resourceTypes, al.resourceTypeId);
                const inv = campInventories.find(i => String(i.campId) === String(activeCampId) && resourceTypeMatches(resourceTypes, i.resourceTypeId, al.resourceTypeId));
                return (
                  <div key={al.id} className="text-[9px] bg-red-950/35 border border-red-500/25 p-1 rounded-xs text-red-200 flex justify-between items-center font-mono">
                    <span className="truncate pr-1.5 flex items-center gap-1">
                      <AlertTriangle className="h-2.5 w-2.5 text-red-400 shrink-0" />
                      <span>{resourceName}</span>
                    </span>
                    <strong className="shrink-0">{inv?.currentAmount || 0} / {inv?.minimumAlertAmount || "—"} {resourceUnit}</strong>
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
              Revisar alertas →
            </Btn>
            <div className="grid grid-cols-2 gap-1">
              <Btn variant="ghost" small onClick={() => onNavigateToSub("Historial de movimientos")}>
                Abastecer
              </Btn>
              <Btn variant="ghost" small onClick={() => onNavigateToSub("Inventario actual")}>
                Inventario
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
                  <AlertCircle className="h-2.5 w-2.5 text-[#69BFB7] shrink-0" />
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
                      <stop offset="5%" stopColor="#69BFB7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#69BFB7" stopOpacity={0.0} />
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
            <span className="text-[#69BFB7] hover:underline cursor-pointer" onClick={() => onNavigateToSub("Historial de movimientos")}>[Historial de Movimientos]</span>
          </div>
        </div>

      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="mission-card border border-[#67ACA9]/20 bg-[#0d1414]/90 p-4 rounded-sm hover:border-[#67ACA9]/30 transition-all flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-[#67ACA9]/10 pb-2 mb-3">
              <h4 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#69BFB7]" />
                Roster de Personal y Especialistas
              </h4>
              <span className="text-[8px] font-mono text-[#69BFB7] bg-[#67ACA9]/15 px-1.5 py-0.5 rounded-xs font-bold uppercase">Alfa Garrison</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center mb-4 bg-black/30 p-2 rounded-xs border border-[#67ACA9]/5">
              <div>
                <span className="block text-[8px] font-mono text-zinc-500 uppercase leading-none font-medium">Activos</span>
                <span className="text-base font-black text-white leading-none mt-1 block">{totalGarrisonCount}</span>
              </div>
              <div>
                <span className="block text-[8px] font-mono text-zinc-500 uppercase font-black text-amber-300 leading-none">Asignados</span>
                <span className="text-base font-black text-amber-300 leading-none mt-1 block">{confirmedPersonsCount}</span>
              </div>
              <div>
                <span className="block text-[8px] font-mono text-zinc-500 uppercase leading-none font-bold">En Tránsito</span>
                <span className="text-base font-black text-[#69BFB7] leading-none mt-1 block">{inTransitPersonsCount}</span>
              </div>
            </div>
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
              {occupationCoverages.filter(cov => String(cov.campId) === String(activeCampId)).map(cov => {
                const occName = occupations.find(o => o.id === cov.occupationId)?.name || cov.occupationId;
                const percent = cov.required > 0 ? Math.round((cov.active / cov.required) * 100) : 100;
                return (
                  <div key={cov.occupationId} className="flex justify-between items-center text-[10px] bg-black/15 p-1 px-1.5 rounded-xs hover:bg-[#67ACA9]/5 transition-colors">
                    <span className="text-zinc-300 uppercase tracking-tight">{occName}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-400">{cov.active} / {cov.required} req</span>
                      <span className={`px-1 rounded-sm text-[8px] font-mono font-bold ${percent >= 100 ? 'bg-emerald-950/40 text-emerald-300' : 'bg-amber-950/40 text-amber-300'}`}>
                        {percent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800/10 text-right">
            <button
              onClick={() => onNavigateToSub("Dashboard global")}
              className="text-[9.5px] font-mono font-bold text-[#69BFB7] hover:text-white transition-all uppercase tracking-wider flex items-center gap-1 justify-end w-full cursor-pointer font-extrabold"
            >
              Control de Especialistas ➔
            </button>
          </div>
        </div>
        <div className="mission-card border border-[#67ACA9]/20 bg-[#0d1414]/90 p-4 rounded-sm flex flex-col justify-between hover:border-[#67ACA9]/30 transition-all">
          <div>
            <div className="flex justify-between items-center border-b border-[#67ACA9]/10 pb-2 mb-3">
              <h4 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                Historial Reciente de Operaciones
              </h4>
              <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-wider">Bitácora Live</span>
            </div>

            {sortedRecentFeed.length === 0 ? (
              <div className="text-center py-6 text-zinc-500 text-[10.5px] uppercase tracking-wider font-mono">
                No se registran transacciones logísticas recientes en este periodo.
              </div>
            ) : (
              <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
                {sortedRecentFeed.map((ev) => (
                  <div key={ev.id} className="flex gap-2 p-1.5 rounded-xs bg-black/20 border border-zinc-800/20 text-[10px] text-zinc-300 hover:border-[#67ACA9]/10 transition-all">
                    <span className="text-[8px] font-mono text-zinc-500 font-bold self-start mt-0.5">{ev.date}</span>
                    <div className="flex-1">
                      <p className="text-zinc-100 font-medium leading-normal">{ev.text}</p>
                    </div>
                    <span className={`text-[7px] font-mono px-1 py-0.2 rounded-xs self-start font-black uppercase ${ev.category === "completado" ? "bg-emerald-950 text-emerald-400" : ev.category === "solicitud" ? "bg-zinc-850 text-[#69BFB7] border border-[#67ACA9]/10" : "bg-amber-950 text-amber-400"}`}>
                      {ev.category}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800/40 text-right flex justify-between items-center">
            <span className="text-[8.5px] text-zinc-500 font-mono uppercase tracking-wider">
              TOTAL DE {feedEvents.length} EVENTOS DETECTADOS
            </span>
            <button
              onClick={() => onNavigateToSub("Historial de movimientos")}
              className="text-[9.5px] font-mono font-bold text-[#69BFB7] hover:text-white transition-all uppercase tracking-wider flex items-center gap-1 justify-end cursor-pointer font-extrabold"
            >
              Ver Movimientos ➔
            </button>
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
                        <span className={`inline-block text-[8px] font-black px-1.5 py-0.5 border rounded-xs ${inv.currentAmount <= inv.minimumAlertAmount
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
                          <Btn variant="primary" small onClick={() => onNavigateToSub("Inventario actual")}>
                            Detalle
                          </Btn>
                          <Btn variant="ghost" small onClick={() => onNavigateToSub("Historial de movimientos")}>
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
                    const resourceName = getResourceTypeDisplayName(resourceTypes, al.resourceTypeId);
                    const resourceUnit = getResourceTypeUnit(resourceTypes, al.resourceTypeId);
                    return (
                      <tr key={al.id} className="hover:bg-white/5 transition-colors">
                        <td className="font-mono font-bold text-rose-300">#{al.id}</td>
                        <td className="font-bold text-white">{resourceName}</td>
                        <td className="font-mono font-bold text-[#69BFB7]">{al.amountAtAlertGeneration} {resourceUnit}</td>
                        <td className="font-mono text-[10px]">{al.alertDate}</td>
                        <td>
                          <span className="inline-block text-[8px] font-black tracking-wider uppercase px-2 py-0.5 rounded-sm border bg-[#ba3838]/25 text-[#fca5a5] border-red-500 animate-pulse">
                            BAJO MÍNIMO
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex inline-flex gap-1">
                            <Btn variant="ghost" small onClick={() => onNavigateToSub("Inventario actual")}>
                              Ver inventario
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
                          <Btn variant="ghost" small onClick={() => onNavigateToSub("Historial de movimientos")}>
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
                    const rt = resourceTypes.find(t => t.id === c.resourceTypeId);
                    const diff = Number(c.actualAmount) - Number(c.expectedAmount);

                    return (
                      <tr key={c.id} className="hover:bg-white/5 transition-colors">
                        <td className="font-mono text-xs">{c.date}</td>
                        <td className="font-bold text-white">{rt?.name || c.resourceTypeId}</td>
                        <td className="text-white font-mono">{c.personId}</td>
                        <td className="text-right font-mono text-[#A4C2C5]/80">{c.expectedAmount}</td>
                        <td className="text-right font-mono font-bold text-white">{c.actualAmount}</td>
                        <td className={`text-right font-mono font-bold ${diff === 0 ? "text-emerald-400" : diff < 0 ? "text-amber-400" : "text-emerald-300"}`}>
                          {diff > 0 ? `+${diff}` : diff}
                        </td>
                        <td className="text-[10px]">{c.recordedBy}</td>
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
                    const originName = getCampDisplayName(camps, r.originCampId);
                    const destName = getCampDisplayName(camps, r.destinationCampId);
                    return (
                      <tr key={r.id} className="hover:bg-white/5 transition-colors">
                        <td className="font-mono font-bold text-white">#{r.id}</td>
                        <td>
                          <span className={`inline-block text-[8px] font-black px-1.5 py-0.5 border rounded-xs ${isOrigin ? "bg-blue-950/20 text-blue-300 border-blue-500/25" : "bg-purple-950/20 text-purple-300 border-purple-500/25"
                            }`}>
                            {isOrigin ? "SALIENTE (Creada)" : "ENTRANTE (Recibida)"}
                          </span>
                        </td>
                        <td className="font-bold text-white uppercase">{originName} ➔ {destName}</td>
                        <td>
                          <span className={`inline-block text-[8px] font-black px-1.5 py-0.5 border rounded-xs ${r.status === "APPROVED" ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30" :
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
  onUpdateInventory
}: {
  camps: Camp[];
  resourceTypes: ResourceType[];
  campInventories: CampInventory[];
  onUpdateInventory: (campId: string, resourceTypeId: string, currentAmount: number, minimumAlertAmount: number) => void;
  onAddInventory: (data: CampInventory) => void;
}) {
  const selectedCamp = currentUser.campId;
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [currVal, setCurrVal] = useState("");
  const [minVal, setMinVal] = useState("");

  const activeCampsite = camps.find(c => c.id === selectedCamp);
  const filteredInventories = campInventories.filter(i => i.campId === selectedCamp);

  const handleUpdate = (campId: string, resourceTypeId: string) => {
    if (currVal === "" || minVal === "") {
      alert("Los valores de cantidad no pueden quedar vacíos.");
      return;
    }

    const currNum = Number(currVal);
    const minNum = Number(minVal);

    if (isNaN(currNum) || currNum < 0) {
      alert("La cantidad actual debe ser un número decimal no negativo.");
      return;
    }
    if (isNaN(minNum) || minNum < 0) {
      alert("La cantidad mínima de alerta debe ser un número decimal no negativo.");
      return;
    }

    onUpdateInventory(campId, resourceTypeId, currNum, minNum);
    setEditingKey(null);
  };

  return (
    <SectionShell kicker="CENTRAL DE OPERACIONES" title="Inventario de Campamentos">
      <div className="flex gap-2 border-b border-[#67ACA9]/20 pb-2 mb-3 items-center">
        <span className="text-xs font-bold text-[#A4C2C5]">Campamento Activo:</span>
        <span className="text-xs font-bold text-[#69BFB7] border border-[#69BFB7]/25 px-2.5 py-1 rounded-sm bg-black/45">
          {activeCampsite?.name || "Base Alfa"}
        </span>
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
                  <th>Recurso</th>
                  <th>Categoría</th>
                  <th>Cantidad actual</th>
                  <th>Mínimo permitido</th>
                  <th>Estado</th>
                  <th className="text-center">Editar mínimo</th>
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
                        {isEditing ? (
                          <input
                            type="text"
                            value={currVal}
                            onChange={(e) => setCurrVal(e.target.value)}
                            className="w-16 bg-black text-white text-center font-mono border border-[#69BFB7] text-[10px] rounded-xs"
                          />
                        ) : (
                          <span className="font-mono font-bold text-white">{item.currentAmount} {rt?.unitOfMeasure}</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            value={minVal}
                            onChange={(e) => setMinVal(e.target.value)}
                            className="w-16 bg-black text-white text-center font-mono border border-amber-500/50 text-[10px] rounded-xs"
                          />
                        ) : (
                          <span className="font-mono text-[#A4C2C5]/80">{item.minimumAlertAmount} {rt?.unitOfMeasure}</span>
                        )}
                      </td>
                      <td>
                        <StatusIndicator status={stat} />
                      </td>
                      <td className="text-center">
                        {isEditing ? (
                          <div className="flex gap-1 justify-center">
                            <Btn small variant="success" onClick={() => handleUpdate(item.campId, item.resourceTypeId)}>Guardar</Btn>
                            <Btn small variant="ghost" onClick={() => setEditingKey(null)}>Cancelar</Btn>
                          </div>
                        ) : (
                          <Btn small variant="ghost" onClick={() => {
                            setEditingKey(`${item.campId}-${item.resourceTypeId}`);
                            setCurrVal(String(item.currentAmount));
                            setMinVal(String(item.minimumAlertAmount));
                          }}>Editar mínimo</Btn>
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

function FilterDateField({
  value,
  onChange
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const initialDate = value ? new Date(value + "T12:00:00") : new Date();
  const initY = isNaN(initialDate.getTime()) ? 2026 : initialDate.getFullYear();
  const initM = isNaN(initialDate.getTime()) ? 5 : initialDate.getMonth();
  const initD = isNaN(initialDate.getTime()) ? "7" : String(initialDate.getDate());

  const [day, setDay] = useState(initD);
  const [month, setMonth] = useState(initM);
  const [year, setYear] = useState(initY);

  useEffect(() => {
    if (value) {
      const d = new Date(value + "T12:00:00");
      if (!isNaN(d.getTime())) {
        setYear(d.getFullYear());
        setMonth(d.getMonth());
        setDay(String(d.getDate()));
      }
    } else {
      const d = new Date();
      setYear(d.getFullYear());
      setMonth(d.getMonth());
      setDay(String(d.getDate()));
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
  const years = Array.from({ length: 7 }, (_, i) => 2024 + i);

  const updateCombined = (newYr: number, newMo: number, newDy: string) => {
    const monthStr = String(newMo + 1).padStart(2, "0");
    const dayStr = String(Number(newDy)).padStart(2, "0");
    onChange(`${newYr}-${monthStr}-${dayStr}`);
  };

  const handleSelectDay = (item: string) => {
    setDay(item);
    updateCombined(year, month, item);
    setOpen(false);
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
    updateCombined(nextY, nextM, day);
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
    updateCombined(nextY, nextM, day);
  };

  return (
    <div className="v-field dt-shell w-full md:w-3/12">
      <span className="v-field-label text-[9px] font-mono font-bold text-[#A4C2C5]/70 uppercase">
        Filtrar Fecha
      </span>
      <button
        ref={triggerRef}
        className="dt-trigger !h-[34px] !py-1 text-xs text-left"
        type="button"
        onClick={() => setOpen(!open)}
      >
        <span className="truncate">
          {value ? `${monthNames[month].toUpperCase()} ${day}, ${year}` : "[ TODAS LAS FECHAS ]"}
        </span>
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
              width: 320,
              maxWidth: "95vw",
              zIndex: 9999
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
                    updateCombined(y, month, day);
                  }}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <button type="button" className="dt-close" onClick={() => setOpen(false)}>✕</button>
              </div>
            </div>

            <div className="dt-body !grid-cols-1">
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
            </div>

            <div className="dt-actions justify-between px-3 py-2 border-t border-[#67ACA9]/20 flex">
              <button
                type="button"
                className="text-[10px] text-zinc-400 hover:text-white"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                LIMPIAR
              </button>
              <button
                type="button"
                className="dt-today-btn text-[10px] text-[#69BFB7] hover:text-white"
                onClick={() => {
                  const todayStr = new Date().toISOString().split("T")[0];
                  onChange(todayStr);
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
function getDefaultResourceForRole(role: string, resourceTypes: ResourceType[]): string {
  const r = role.toLowerCase();
  let categoryKey = "";
  if (r.includes("médico") || r.includes("medic") || r.includes("clinico") || r.includes("clínico") || r.includes("investigador")) {
    categoryKey = "medical";
  } else if (r.includes("guarda") || r.includes("defensor") || r.includes("guard")) {
    categoryKey = "defense";
  } else if (r.includes("ing") || r.includes("parts") || r.includes("repuesto") || r.includes("scout") || r.includes("explorador") || r.includes("cazador")) {
    categoryKey = "parts";
  } else if (r.includes("comida") || r.includes("food") || r.includes("alimento") || r.includes("ración") || r.includes("racion")) {
    categoryKey = "food";
  } else if (r.includes("agua") || r.includes("water") || r.includes("h2o") || r.includes("filtrada")) {
    categoryKey = "water";
  } else if (r.includes("conductor") || r.includes("piloto") || r.includes("fuel") || r.includes("combustible")) {
    categoryKey = "fuel";
  }

  if (categoryKey) {
    const match = resourceTypes.find(rt => {
      const name = rt.name.toLowerCase();
      const cat = String(rt.category || "").toLowerCase();
      const id = String(rt.id).toLowerCase();
      return name.includes(categoryKey) || cat.includes(categoryKey) || id.includes(categoryKey);
    });
    if (match) return String(match.id);
  }

  return resourceTypes[0]?.id ? String(resourceTypes[0].id) : "rt-food";
}

export function ViewRecoleccionDiaria({
  camps,
  resourceTypes,
  dailyCollectionRecords,
  campPersonnel,
  onSaveRecord,
  onAdjustRecord
}: {
  camps: Camp[];
  resourceTypes: ResourceType[];
  dailyCollectionRecords: DailyCollectionRecord[];
  campPersonnel: CampPerson[];
  setCampPersonnel?: React.Dispatch<React.SetStateAction<CampPerson[]>>;
  onSaveRecord: (data: Omit<DailyCollectionRecord, "id">) => void;
  onAdjustRecord: (id: string, actualAmount: number, reason: string) => void;
  onDeleteRecord: (id: string) => void;
}) {
  const campId = currentUser.campId;
  const activeCampName = camps.find(c => c.id === campId)?.name || "Base Alfa";
  const recordedBy = "Operario #" + currentUser.userId;
  const [personId, setPersonId] = useState("");
  const [resourceTypeId, setResourceTypeId] = useState(resourceTypes[0]?.id || "2");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [actualAmount, setActualAmount] = useState("");
  const [differenceReason, setDifferenceReason] = useState("Carga operativa ordinaria");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterResourceType, setFilterResourceType] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustVal, setAdjustVal] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "warning">("success");
  const resetCreateForm = () => {
    setPersonId("");
    setResourceTypeId(resourceTypes[0]?.id || "2");
    setExpectedAmount("");
    setActualAmount("");
    setDifferenceReason("Carga operativa ordinaria");
  };

  const getPersonStatusBadge = (pId: string) => {
    const person = campPersonnel.find(p => p.id === pId);
    if (!person) return { label: "DESCONOCIDO", className: "bg-gray-950/40 text-gray-400 border-gray-500/20" };

    switch (person.status) {
      case "ACTIVE":
        return { label: "ACTIVO", className: "bg-emerald-950/40 text-emerald-400 border-emerald-500/30" };
      case "SICK":
        return { label: "SICK (ENFERMO)", className: "bg-amber-950/40 text-amber-400 border-amber-500/20" };
      case "INJURED":
        return { label: "INJURED (HERIDO)", className: "bg-red-950/40 text-red-400 border-red-500/20" };
      case "OUTSIDE_CAMP":
        return { label: "OUTSIDE (FUERA)", className: "bg-blue-950/40 text-blue-400 border-blue-500/20" };
      case "ON_EXPEDITION":
        return { label: "EXPEDICIÓN", className: "bg-purple-950/40 text-purple-400 border-purple-500/20" };
      default:
        return { label: person.status, className: "bg-gray-950/40 text-gray-400 border-gray-500/20" };
    }
  };

  const triggerToast = (msg: string, type: "success" | "warning" = "success") => {
    setFeedbackMsg(msg);
    setFeedbackType(type);
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4500);
  };
  const activeCampRecords = dailyCollectionRecords.filter(r => r.campId === campId);
  const activeCampPersonnel = campPersonnel.filter(p => p.campId === campId && p.status !== "SICK" && p.status !== "INJURED");
  const joinedAndFilteredRecords = activeCampRecords.filter(record => {
    if (filterResourceType && record.resourceTypeId !== filterResourceType) {
      return false;
    }
    if (filterDate && record.date !== filterDate) {
      return false;
    }

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const matchesRecordId = String(record.id).toLowerCase().includes(term);
    const matchesPersonId = String(record.personId).toLowerCase().includes(term);
    const personObj = campPersonnel.find(p => p.id === record.personId);
    const matchesPersonName = personObj ? personObj.name.toLowerCase().includes(term) : false;
    const rtObj = resourceTypes.find(rt => rt.id === record.resourceTypeId);
    const matchesResourceName = rtObj ? rtObj.name.toLowerCase().includes(term) : false;
    const matchesDate = record.date.includes(term);

    return matchesRecordId || matchesPersonId || matchesPersonName || matchesResourceName || matchesDate;
  });
  const totalExpected = joinedAndFilteredRecords.reduce((sum, r) => sum + Number(r.expectedAmount), 0);
  const totalActual = joinedAndFilteredRecords.reduce((sum, r) => sum + Number(r.actualAmount), 0);
  const netDiscrepancy = totalActual - totalExpected;
  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();

    if (!personId) {
      triggerToast("Debe seleccionar una persona del roster.", "warning");
      return;
    }

    const selectedPersonObj = campPersonnel.find(p => p.id === personId);
    if (!selectedPersonObj) {
      triggerToast("Persona seleccionada inválida.", "warning");
      return;
    }
    if (selectedPersonObj.status !== "ACTIVE") {
      triggerToast(`No se permite registrar recolección para personal en estado ${selectedPersonObj.status}.`, "warning");
      return;
    }

    const reqVal = Number(expectedAmount);
    const actVal = Number(actualAmount);

    if (isNaN(reqVal) || reqVal < 0) {
      triggerToast("La cantidad esperada debe ser un número positivo.", "warning");
      return;
    }
    if (isNaN(actVal) || actVal < 0) {
      triggerToast("La cantidad real extraída debe ser un número positivo.", "warning");
      return;
    }

    if (!differenceReason.trim()) {
      triggerToast("Por favor escriba una descripción o motivo.", "warning");
      return;
    }
    onSaveRecord({
      campId,
      personId,
      resourceTypeId,
      date: new Date().toISOString().split("T")[0],
      expectedAmount: reqVal,
      actualAmount: actVal,
      differenceReason: differenceReason.trim(),
      recordedBy,
      movementId: `mov-manual-${Date.now().toString().slice(-4)}`
    });

    triggerToast("Registro de recolección guardado. Se actualizó el inventario local.");
    resetCreateForm();
  };
  const handleConfirmAdjustment = () => {
    if (!adjustingId) return;

    const record = dailyCollectionRecords.find(r => r.id === adjustingId);
    if (!record) return;
    if (record.campId !== campId) {
      triggerToast("No se autoriza modificar registros de otros campamentos.", "warning");
      return;
    }

    const selectedPersonObj = campPersonnel.find(p => p.id === record.personId);
    if (!selectedPersonObj) {
      triggerToast("La ficha de personal asociada no existe.", "warning");
      return;
    }
    if (selectedPersonObj.status !== "ACTIVE") {
      triggerToast(`No se permite ajustar registros de personas con estado actual: ${selectedPersonObj.status}.`, "warning");
      return;
    }

    const newVal = Number(adjustVal);
    if (adjustVal === "" || isNaN(newVal) || newVal < 0) {
      triggerToast("La cantidad real debe ser un número decimal >= 0.", "warning");
      return;
    }
    if (newVal < Number(record.expectedAmount) && !adjustReason.trim()) {
      triggerToast("Para un ajuste por incumplimiento (menor a lo esperado), la justificación es obligatoria.", "warning");
      return;
    }

    if (!adjustReason.trim()) {
      triggerToast("Debe describir el motivo técnico para registrar este ajuste.", "warning");
      return;
    }
    onAdjustRecord(adjustingId, newVal, adjustReason.trim());
    triggerToast("Ajuste de recolección aplicado con éxito. Se actualizó el inventario y diario de movimientos.");
    setAdjustingId(null);
    setAdjustVal("");
    setAdjustReason("");
  };
  const getDiscrepancyStyle = (expected: number, actual: number) => {
    const diff = actual - expected;
    if (diff === 0) {
      return { text: "text-emerald-400", badge: "bg-emerald-950/40 text-emerald-300 border-emerald-500/20", label: "Completo" };
    } else if (diff < 0) {
      return { text: "text-amber-400", badge: "bg-amber-950/40 text-amber-300 border-amber-500/20", label: "Incompleto" };
    } else {
      return { text: "text-cyan-400", badge: "bg-cyan-950/40 text-cyan-300 border-cyan-500/20", label: "Sobrante" };
    }
  };

  return (
    <SectionShell
      kicker="FISCALIZACIÓN DE PRODUCCIÓN"
      title={`Ajuste de Recolección Diaria — ${activeCampName.toUpperCase()}`}
    >
      {feedbackMsg && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-sm border shadow-2xl flex items-center gap-3 transition-all duration-300 transform translate-y-0 max-w-md animate-bounce ${feedbackType === 'success'
          ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-100'
          : 'bg-amber-950/95 border-amber-500/40 text-amber-100'
          }`}>
          {feedbackType === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
          )}
          <div className="flex flex-col text-xs font-mono">
            <span className="font-extrabold uppercase tracking-wider">{feedbackType === 'success' ? 'SISTEMA ONLINE' : 'VALIDACIÓN'}</span>
            <span className="mt-0.5 leading-normal">{feedbackMsg}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="ml-auto text-[#A4C2C5]/50 hover:text-white transition-colors text-[10px] font-bold">×</button>
        </div>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 mb-5 select-none">
        <div className="xl:col-span-12 bg-[#0d1414]/90 border border-[#67ACA9]/20 p-3 rounded-sm flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="w-full md:w-2/5 flex flex-col gap-1">
            <span className="text-[9px] font-mono font-bold text-[#69BFB7] uppercase tracking-wider">Criterio de búsqueda (Persona, ID, Recurso)</span>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por Nombre, ID, Recurso o Fecha..."
              className="v-input font-sans text-xs w-full"
            />
          </div>

          <div className="w-full md:w-3/12 flex flex-col gap-1">
            <span className="text-[9px] font-mono font-bold text-[#A4C2C5]/70 uppercase">Filtrar Recurso</span>
            <select
              value={filterResourceType}
              onChange={e => setFilterResourceType(e.target.value)}
              className="v-select text-xs"
            >
              <option value="">[ TODOS LOS RECURSOS ]</option>
              {resourceTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
            </select>
          </div>

          <FilterDateField
            value={filterDate}
            onChange={setFilterDate}
          />

          {(searchTerm || filterResourceType || filterDate) && (
            <button
              onClick={() => {
                setSearchTerm("");
                setFilterResourceType("");
                setFilterDate("");
              }}
              className="text-[10px] font-mono text-zinc-400 hover:text-white underline uppercase self-end h-[34px]"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-4 flex flex-col gap-4">
          <form onSubmit={handleCreateRecord} className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm flex flex-col gap-3">
            <div className="text-xs font-black text-[#69BFB7] uppercase border-b border-[#67ACA9]/10 pb-2 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-400" />
              Crear Nuevo Parte de Recolección
            </div>

            <div className="flex flex-col gap-1 text-xs">
              <span className="v-field-label text-[#A4C2C5]/70">Persona Encargada *</span>
              <select
                value={personId}
                onChange={e => {
                  setPersonId(e.target.value);
                  const personObj = activeCampPersonnel.find(p => p.id === e.target.value);
                  if (personObj) {
                    const defaultResource = getDefaultResourceForRole(personObj.role || "", resourceTypes);
                    setResourceTypeId(defaultResource);
                  }
                }}
                className="v-select w-full text-xs font-semibold text-white"
              >
                <option value="">[ SELECCIONE ESPECIALISTA ]</option>
                {activeCampPersonnel.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} [{p.status}]
                  </option>
                ))}
              </select>
              {personId && (
                <div className="mt-1 text-[9.5px] font-mono text-[#A4C2C5]/50 flex justify-between">
                  <span>Estatus: {campPersonnel.find(p => p.id === personId)?.status}</span>
                  <span className="text-zinc-500 uppercase">Ficha: {personId}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex flex-col gap-1">
                <span className="v-field-label text-[#A4C2C5]/70">Recurso extraído</span>
                <select value={resourceTypeId} onChange={e => setResourceTypeId(e.target.value)} className="v-select">
                  {resourceTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="v-field-label text-[#A4C2C5]/70">Metodología / Fecha</span>
                <span className="v-input bg-black/20 text-[#A4C2C5]/50 select-none flex items-center px-2 py-1 text-[11px] font-mono h-[34px] rounded-sm">
                  {new Date().toISOString().split("T")[0]}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="v-field flex flex-col gap-1">
                <span className="v-field-label text-[#A4C2C5]/70">Esperado (Estimado) *</span>
                <input
                  type="number"
                  step="0.01"
                  value={expectedAmount}
                  onChange={e => setExpectedAmount(e.target.value)}
                  className="v-input font-mono"
                  placeholder="0.00"
                  required
                />
              </label>

              <label className="v-field flex flex-col gap-1">
                <span className="v-field-label text-[#A4C2C5]/70">Capturado (Real) *</span>
                <input
                  type="number"
                  step="0.01"
                  value={actualAmount}
                  onChange={e => setActualAmount(e.target.value)}
                  className="v-input font-mono"
                  placeholder="0.00"
                  required
                />
              </label>
            </div>

            <label className="v-field flex flex-col gap-1 text-xs">
              <span className="v-field-label text-[#A4C2C5]/70">Explicación o Justificación de Desvío *</span>
              <textarea
                value={differenceReason}
                onChange={e => setDifferenceReason(e.target.value)}
                className="v-input min-h-16 text-xs leading-normal"
                placeholder="Razón técnica del desvío o 'Sin anomalías' si coincide"
                required
              />
            </label>

            <Btn variant="primary" type="submit" style={{ width: "100%", padding: "10px" }}>
              Guardar Bitácora Diaria
            </Btn>
          </form>
        </div>
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-[#67ACA9]/10 pb-2 mb-3">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1">
                  <FileText className="w-4 h-4 text-[#69BFB7]" />
                  Historial y Ajustes de Recolección Diaria
                </h3>
                <span className="font-mono text-[10px] text-zinc-400">
                  {joinedAndFilteredRecords.length} registros filtrados
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 bg-black/30 p-2 rounded-xs mb-3 text-center border border-zinc-805 font-mono text-[10px]">
                <div>
                  <span className="text-[#A4C2C5]/60 block">SUMATORIA ESPERADA</span>
                  <strong className="text-zinc-200 text-xs">{totalExpected.toFixed(2)}</strong>
                </div>
                <div>
                  <span className="text-[#A4C2C5]/60 block">REGISTRADA REAL</span>
                  <strong className="text-white text-xs">{totalActual.toFixed(2)}</strong>
                </div>
                <div>
                  <span className="text-[#A4C2C5]/60 block">DESVÍO NETO</span>
                  <strong className={`text-xs ${netDiscrepancy === 0 ? "text-emerald-400" : netDiscrepancy > 0 ? "text-cyan-400" : "text-amber-400"}`}>
                    {netDiscrepancy > 0 ? `+${netDiscrepancy.toFixed(2)}` : netDiscrepancy.toFixed(2)}
                  </strong>
                </div>
              </div>

              <div className="v-table-wrap overflow-x-auto">
                <table className="v-table text-[11px]">
                  <thead>
                    <tr>
                      <th className="font-bold">ID</th>
                      <th className="font-bold">Persona</th>
                      <th className="font-bold">Recurso</th>
                      <th className="font-bold">Fecha</th>
                      <th className="text-right font-bold">Esperado</th>
                      <th className="text-right font-bold">Registrado</th>
                      <th className="text-right font-bold">Diferencia</th>
                      <th className="font-bold">Estado de persona</th>
                      <th className="font-bold">Motivo</th>
                      <th className="text-right font-bold">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {joinedAndFilteredRecords.map(record => {
                      const personObj = campPersonnel.find(p => p.id === record.personId);
                      const resourceObj = resourceTypes.find(rt => rt.id === record.resourceTypeId);

                      const diff = Number(record.actualAmount) - Number(record.expectedAmount);
                      const disc = getDiscrepancyStyle(Number(record.expectedAmount), Number(record.actualAmount));

                      const personStatusProps = getPersonStatusBadge(String(record.personId));
                      const personIsActive = personObj?.status === "ACTIVE";

                      return (
                        <tr key={record.id} className="hover:bg-[#67ACA9]/5 transition-all text-[11px]">
                          <td className="font-mono font-bold text-white">#{record.id}</td>
                          <td>
                            <div className="flex flex-col">
                              <span className="text-white font-medium text-[11.5px]">{personObj?.name || record.personId}</span>
                              <span className="text-[8px] font-mono text-zinc-500 uppercase">Ficha: {record.personId}</span>
                            </div>
                          </td>
                          <td className="font-bold text-white uppercase text-[10px]">
                            {resourceObj?.name || record.resourceTypeId}
                          </td>
                          <td className="font-mono text-[10px] text-[#A4C2C5]/80">{record.date}</td>
                          <td className="text-right font-mono text-[#A4C2C5]/80 text-[11px]">
                            {Number(record.expectedAmount).toFixed(2)}
                          </td>
                          <td className="text-right font-mono font-bold text-white text-[11px]">
                            {Number(record.actualAmount).toFixed(2)}
                          </td>
                          <td className={`text-right font-mono font-extrabold ${disc.text}`}>
                            {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                            <div className="text-[8px] text-zinc-500 font-normal">{disc.label}</div>
                          </td>
                          <td>
                            <span className={`inline-block px-1.5 py-0.5 text-[8.5px] font-black font-mono border rounded-xs uppercase tracking-tighter ${personStatusProps.className}`}>
                              {personStatusProps.label}
                            </span>
                          </td>
                          <td className="italic text-[#A4C2C5]/70 text-[10.5px] max-w-[140px] truncate" title={record.differenceReason}>
                            {record.differenceReason || "—"}
                          </td>
                          <td className="text-right">
                            {personIsActive ? (
                              <Btn
                                small
                                variant="warning"
                                onClick={() => {
                                  setAdjustingId(String(record.id));
                                  setAdjustVal(record.actualAmount.toString());
                                  setAdjustReason(record.differenceReason || "");
                                }}
                              >
                                Ajustar recolección
                              </Btn>
                            ) : (
                              <span className="text-[8.5px] text-red-400 font-mono font-bold uppercase select-none border border-red-500/10 px-1.5 py-0.5 rounded-sm bg-red-950/10 text-center block max-w-[110px] ml-auto">
                                No ajustable
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {joinedAndFilteredRecords.length === 0 && (
                      <tr>
                        <td colSpan={10} className="text-center py-10 text-zinc-500 italic font-mono text-[11px]">
                          No hay registros de recolección que correspondan a su criterio de búsqueda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {adjustingId && (() => {
            const currentRecord = dailyCollectionRecords.find(r => r.id === adjustingId);
            const personObj = campPersonnel.find(p => p?.id === currentRecord?.personId);
            const resourceObj = resourceTypes.find(rt => rt.id === currentRecord?.resourceTypeId);
            if (!currentRecord) return null;

            return (
              <div className="bg-black/85 border border-amber-500/40 p-4 rounded-sm text-xs shadow-2xl relative animate-fade-in">
                <div className="flex justify-between items-center border-b border-amber-500/20 pb-2 mb-3 select-none">
                  <div className="font-black text-amber-400 uppercase tracking-widest text-xs flex items-center gap-1">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    AJUSTAR REGISTRO DE RECOLECCIÓN (#{currentRecord.id})
                  </div>
                  <button
                    onClick={() => setAdjustingId(null)}
                    className="text-zinc-500 hover:text-white font-extrabold text-sm"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950/60 p-3 rounded-xs mb-3 font-mono text-[10.5px]">
                  <div>
                    <span className="text-zinc-500 block uppercase">Persona</span>
                    <strong className="text-white font-sans">{personObj?.name || currentRecord.personId}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block uppercase">Estado actual</span>
                    <strong className="text-[#69BFB7] font-semibold">{personObj?.status}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block uppercase">Suministro</span>
                    <strong className="text-amber-100 uppercase">{resourceObj?.name}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block uppercase">Fecha de Carga</span>
                    <strong className="text-zinc-300">{currentRecord.date}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-zinc-950/20 p-2 border border-zinc-850 rounded-xs mb-3 text-center text-[10.5px] font-mono">
                  <div>
                    <span className="text-zinc-500 block uppercase">Proyección Esperada</span>
                    <span className="text-zinc-200 font-extrabold">{Number(currentRecord.expectedAmount).toFixed(2)} {resourceObj?.unitOfMeasure}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block uppercase">Registrado Anterior</span>
                    <span className="text-amber-400 font-extrabold">{Number(currentRecord.actualAmount).toFixed(2)} {resourceObj?.unitOfMeasure}</span>
                  </div>
                </div>
                {adjustVal !== "" && !isNaN(Number(adjustVal)) && (
                  <div className="p-2 border border-blue-500/25 bg-blue-950/10 rounded-xs mb-3 text-[10px] font-mono text-blue-200">
                    <span className="font-extrabold uppercase block mb-0.5">ANÁLISIS DE IMPACTO DE INVENTARIO ACTUAL</span>
                    El ajuste de {Number(adjustVal).toFixed(2)} produce una variación de {" "}
                    <strong>{(Number(adjustVal) - Number(currentRecord.actualAmount)).toFixed(2)} {resourceObj?.unitOfMeasure}</strong>. {" "}
                    El stock total de <strong>{resourceObj?.name}</strong> se verá modificado correspondientemente en Almacén.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs">
                  <label className="flex flex-col gap-1">
                    <span className="v-field-label text-amber-200 font-bold uppercase tracking-wide">Nueva Cantidad Extraída Real *</span>
                    <input
                      type="number"
                      step="0.1"
                      value={adjustVal}
                      onChange={e => setAdjustVal(e.target.value)}
                      className="v-input font-mono !py-1 text-center font-bold text-white text-sm"
                      placeholder="0.00"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="v-field-label text-amber-200 font-bold uppercase tracking-wide">Motivo o Justificación del Ajuste *</span>
                    <input
                      type="text"
                      value={adjustReason}
                      onChange={e => setAdjustReason(e.target.value)}
                      className="v-input !py-1 text-xs text-white"
                      placeholder="Detallar causa técnica o desvío de recolección"
                      required
                    />
                  </label>
                </div>

                <div className="flex justify-center gap-2 text-xs select-none">
                  <Btn small variant="danger" onClick={() => setAdjustingId(null)}>
                    Cancelar ajuste
                  </Btn>
                  <Btn small variant="success" onClick={handleConfirmAdjustment}>
                    Confirmar y Aplicar Ajuste ➔
                  </Btn>
                </div>
              </div>
            );
          })()}

        </div>

      </div>

    </SectionShell>
  );
}
export function ViewMovimientosInventario({
  camps,
  resourceTypes,
  inventoryMovements,
  onAddManualMovement
}: {
  camps: Camp[];
  resourceTypes: ResourceType[];
  inventoryMovements: InventoryMovement[];
  onAddManualMovement: (data: Omit<InventoryMovement, "id">) => void;
  onDeleteMovement: (id: string) => void;
}) {
  const campId = currentUser.campId;
  const [resourceTypeId, setResourceTypeId] = useState("2");
  const [amount, setAmount] = useState("");
  const [movementType, setMovementType] = useState<InventoryMovement["movementType"]>("MANUAL_ADJUSTMENT");
  const [description, setDescription] = useState("");
  const recordedBy = currentUser.userId;
  const [activeTab, setActiveTab] = useState<"Todos" | "Expediciones" | "Recolección diaria" | "Ajustes">("Todos");

  const filteredMovements = inventoryMovements.filter(mv => {
    if (activeTab === "Todos") return true;
    if (activeTab === "Expediciones") {
      return mv.movementType === "EXPEDITION_DEPARTURE" || mv.movementType === "EXPEDITION_RETURN";
    }
    if (activeTab === "Recolección diaria") {
      return mv.movementType === "DAILY_COLLECTION";
    }
    if (activeTab === "Ajustes") {
      return mv.movementType === "MANUAL_ADJUSTMENT";
    }
    return true;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    onAddManualMovement({
      campId,
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
    <SectionShell kicker="AUDITORÍA DE STOCK" title="Historial de recursos">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm lg:col-span-12 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-[#69BFB7] uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-2 flex justify-between items-center">
              <span>Registro de Operaciones de Inventario</span>
              <span className="text-[9px] text-[#A4C2C5]/50 font-mono italic">Auditoría Habilitada</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-3 border-b border-[#67ACA9]/20 pb-2">
              {(["Todos", "Expediciones", "Recolección diaria", "Ajustes"] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 text-[10px] uppercase font-bold border transition-colors cursor-pointer ${activeTab === tab
                    ? "border-[#69BFB7] text-white bg-[#69BFB7]/15 font-black"
                    : "border-[#67ACA9]/10 text-[#A4C2C5]/60 hover:text-white hover:bg-[#67ACA9]/5"
                    }`}
                >
                  {tab}
                </button>
              ))}
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
                  {filteredMovements.slice().reverse().map(mv => {
                    const camp = camps.find(c => c.id === mv.campId);
                    const rt = resourceTypes.find(t => t.id === mv.resourceTypeId);
                    const isOutflow = [
                      "DAILY_RATION",
                      "EXPEDITION_DEPARTURE",
                      "TRANSFER_SENT"
                    ].includes(mv.movementType) ||
                      (mv.movementType === "MANUAL_ADJUSTMENT" && (
                        mv.description.includes("-") ||
                        mv.description.toLowerCase().includes("ajuste de recolección #45") ||
                        mv.description.toLowerCase().includes("ajuste aplicado") ||
                        mv.amount < 0
                      ));

                    return (
                      <tr key={mv.id} className="hover:bg-rose-950/5">
                        <td className="font-bold text-white">{camp?.name || mv.campId}</td>
                        <td className="font-mono text-[9px] text-[#A4C2C5]/80">{mv.movementType}</td>
                        <td>{rt?.name || mv.resourceTypeId}</td>
                        <td className="font-mono">
                          <span className={isOutflow ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                            {isOutflow ? "-" : "+"}{Math.abs(mv.amount)} {rt?.unitOfMeasure}
                          </span>
                        </td>
                        <td className="text-[#69BFB7]">{mv.recordedBy}</td>
                        <td className="italic text-[9px]">{mv.description}</td>
                        <td className="text-right">
                          <span className="text-[9px] text-[#A4C2C5]/40 italic">Auditado</span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredMovements.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-zinc-500 italic font-mono text-[10px]">
                        No se registran movimientos para este filtro táctico.
                      </td>
                    </tr>
                  )}
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
  campInventories,
  inventoryMovements,
  onNavigateToSub
}: {
  camps: Camp[];
  resourceTypes: ResourceType[];
  inventoryAlerts: InventoryAlert[];
  campInventories: CampInventory[];
  inventoryMovements: InventoryMovement[];
  onNavigateToSub: (sub: string) => void;
}) {
  const activeCampId = currentUser.campId;
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"ACTIVAS" | "TODAS">("ACTIVAS");

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "warning">("success");

  const triggerToast = (msg: string, type: "success" | "warning" = "success") => {
    setFeedbackMsg(msg);
    setFeedbackType(type);
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4500);
  };

  const scopedAlerts = inventoryAlerts.filter(alert => String(alert.campId) === String(activeCampId));
  const filteredAlerts = scopedAlerts.filter(alert => {
    if (filterType === "TODAS") return true;
    if (filterType === "ACTIVAS") return !alert.resolved;
    return true;
  });

  const selectedAlert = scopedAlerts.find(a => a.id === selectedAlertId) ?? filteredAlerts[0];
  const activeSelectedId = selectedAlert?.id ?? null;

  const selectedInv = selectedAlert ? campInventories.find(inv =>
    String(inv.campId) === String(selectedAlert.campId)
    && resourceTypeMatches(resourceTypes, inv.resourceTypeId, selectedAlert.resourceTypeId)
  ) : null;
  const selectedResourceName = selectedAlert ? getResourceTypeDisplayName(resourceTypes, selectedAlert.resourceTypeId) : "";
  const selectedResourceUnit = selectedAlert ? getResourceTypeUnit(resourceTypes, selectedAlert.resourceTypeId) : "u";

  const relatedMovements = selectedAlert
    ? inventoryMovements
      .filter(m =>
        String(m.campId) === String(selectedAlert.campId)
        && resourceTypeMatches(resourceTypes, m.resourceTypeId, selectedAlert.resourceTypeId)
      )
      .slice(-5)
      .reverse()
    : [];

  const getAlertStatusInfo = (alert: InventoryAlert) => {
    if (alert.resolved) {
      return {
        label: "NORMALIZADO",
        badgeClass: "border-emerald-500/30 text-emerald-400 bg-emerald-950/25",
        textClass: "text-emerald-400",
        isCritical: false
      };
    }

    const inv = campInventories.find(i =>
      String(i.campId) === String(alert.campId)
      && resourceTypeMatches(resourceTypes, i.resourceTypeId, alert.resourceTypeId)
    );
    const actual = inv ? inv.currentAmount : alert.amountAtAlertGeneration;
    const minVal = inv ? inv.minimumAlertAmount : Math.round(alert.amountAtAlertGeneration * 1.5) || 10;

    if (actual <= 0.5 * minVal) {
      return {
        label: "CRÍTICO",
        badgeClass: "border-rose-500/40 text-rose-300 bg-rose-950/40 animate-pulse font-black",
        textClass: "text-rose-400 font-bold",
        isCritical: true
      };
    }

    return {
      label: "BAJO MÍNIMO",
      badgeClass: "border-amber-500/30 text-amber-300 bg-amber-950/25",
      textClass: "text-amber-400",
      isCritical: false
    };
  };

  return (
    <SectionShell kicker="MONITOREO DE ALARMAS DE RIESGO DE STOCK" title="Alertas de inventario">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm lg:col-span-7 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#67ACA9]/10 pb-2 mb-1">
            <span className="text-xs font-bold text-[#69BFB7] uppercase tracking-wider">Tablero de Control de Riesgos Activos</span>
            <div className="flex gap-1">
              {(["ACTIVAS", "TODAS"] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setFilterType(tab);
                    setSelectedAlertId(null);
                  }}
                  className={`px-2 py-0.5 text-[9px] uppercase font-bold border transition-all cursor-pointer ${filterType === tab
                    ? "border-[#69BFB7] text-white bg-[#69BFB7]/15 font-black"
                    : "border-[#67ACA9]/10 text-[#A4C2C5]/50 hover:text-white"
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="v-table-wrap overflow-y-auto max-h-[500px]">
            <table className="v-table text-[10px]">
              <thead>
                <tr>
                  <th>RECURSO</th>
                  <th className="text-right">ACTUAL</th>
                  <th className="text-right">MÍNIMO</th>
                  <th>ESTADO</th>
                  <th>FECHA</th>
                  <th className="text-right">ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map(alert => {
                  const camp = camps.find(c => c.id === alert.campId);
                  const inv = campInventories.find(i =>
                    String(i.campId) === String(alert.campId)
                    && resourceTypeMatches(resourceTypes, i.resourceTypeId, alert.resourceTypeId)
                  );
                  const actualStock = inv ? inv.currentAmount : alert.amountAtAlertGeneration;
                  const minimumAlert = inv ? inv.minimumAlertAmount : Math.round(alert.amountAtAlertGeneration * 1.5) || 10;
                  const stateInfo = getAlertStatusInfo(alert);
                  const isCurSel = alert.id === activeSelectedId;
                  const resourceName = getResourceTypeDisplayName(resourceTypes, alert.resourceTypeId);
                  const resourceUnit = getResourceTypeUnit(resourceTypes, alert.resourceTypeId);

                  return (
                    <tr
                      key={alert.id}
                      onClick={() => setSelectedAlertId(alert.id)}
                      className={`cursor-pointer transition-all ${isCurSel
                        ? "bg-[#69BFB7]/10 border-l-2 border-l-[#69BFB7]"
                        : "hover:bg-cyan-950/10"
                        }`}
                    >
                      <td>
                        <div className="flex flex-col">
                          <span className="text-[#69BFB7] font-semibold">{resourceName}</span>
                          <span className="text-[8px] text-zinc-500 font-mono uppercase">{camp?.name || alert.campId}</span>
                        </div>
                      </td>
                      <td className="font-mono text-right font-semibold text-white">
                        {actualStock} {resourceUnit}
                      </td>
                      <td className="font-mono text-right text-zinc-400">
                        {minimumAlert} {resourceUnit}
                      </td>
                      <td>
                        <span className={`inline-block px-1.5 py-0.5 rounded-xs text-[8px] font-bold uppercase border ${stateInfo.badgeClass}`}>
                          {stateInfo.label}
                        </span>
                      </td>
                      <td className="font-mono text-zinc-500 text-[9px]">{alert.alertDate}</td>
                      <td className="text-right">
                        <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                          <Btn
                            small
                            variant={isCurSel ? "primary" : "ghost"}
                            onClick={() => setSelectedAlertId(alert.id)}
                          >
                            Detalle
                          </Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredAlerts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-zinc-500 italic font-mono text-[10.5px]">
                      No hay alertas {filterType.toLowerCase()} registradas en los almacenes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm lg:col-span-5 flex flex-col gap-4">
          <div className="text-xs font-bold text-amber-500 uppercase border-b border-[#67ACA9]/10 pb-1.5 flex justify-between items-center">
            <span>Análisis de Alerta y Enlaces de Causa</span>
            <span className="text-[8px] text-[#A4C2C5]/40 font-mono">Ficha #AL-{activeSelectedId || "PENDIENTE"}</span>
          </div>

          {selectedAlert ? (
            <div className="flex flex-col gap-4 text-xs">
              <div className="bg-[#121c1c]/50 p-3 border border-[#67ACA9]/15 rounded-sm flex flex-col gap-2.5">
                <div className="flex justify-between items-center border-b border-[#67ACA9]/10 pb-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono">Recurso Monitoreado</span>
                    <span className="text-sm font-black text-white leading-tight uppercase">
                      {selectedResourceName}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-sm text-[9px] font-black tracking-tight border uppercase ${getAlertStatusInfo(selectedAlert).badgeClass}`}>
                    {getAlertStatusInfo(selectedAlert).label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[10.5px]">
                  <div>
                    <span className="text-[8.5px] text-zinc-500 uppercase font-mono block">Campamento de Origen</span>
                    <span className="text-white font-semibold">{getCampDisplayName(camps, selectedAlert.campId)}</span>
                  </div>
                  <div>
                    <span className="text-[8.5px] text-zinc-500 uppercase font-mono block">Fecha de Alerta</span>
                    <span className="text-white font-mono">{selectedAlert.alertDate}</span>
                  </div>
                  <div>
                    <span className="text-[8.5px] text-zinc-500 uppercase font-mono block">Valor en Alerta</span>
                    <span className="text-amber-300 font-mono font-bold leading-none block mt-0.5">
                      {selectedAlert.amountAtAlertGeneration} {selectedResourceUnit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8.5px] text-zinc-500 uppercase font-mono block">Mínimo Permitido</span>
                    <span className="text-red-400 font-mono font-bold leading-none block mt-0.5">
                      {selectedInv ? selectedInv.minimumAlertAmount : Math.round(selectedAlert.amountAtAlertGeneration * 1.5)} {selectedResourceUnit}
                    </span>
                  </div>
                </div>

                <div className="border-t border-[#67ACA9]/10 pt-2.5 mt-1 flex flex-col gap-1 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="text-[#A4C2C5]/60 font-medium">Estado de stock:</span>
                    <span className="font-mono text-white text-[9.5px]">
                      {selectedAlert.resolved ? (
                        <span className="text-emerald-400 font-bold">Stock normalizado</span>
                      ) : (
                        <span className="text-rose-400 font-bold">Pendiente de regularización</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#A4C2C5]/60 font-medium">Movimiento de Causa:</span>
                    <span className="font-mono text-zinc-400 text-[10px]">
                      {selectedAlert.movementId ? (
                        <span className="text-[#69BFB7] underline font-bold">#{selectedAlert.movementId}</span>
                      ) : (
                        <span className="italic text-zinc-500 text-[9px]">Detección por Control Automático</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 border-t border-[#67ACA9]/10 pt-3">
                <span className="text-[9.5px] font-bold text-zinc-400 uppercase font-mono block mb-1">Acciones Rápidas</span>
                <div className="grid grid-cols-2 gap-2">
                  <Btn
                    variant="ghost"
                    onClick={() => {
                      onNavigateToSub("Inventario actual");
                      triggerToast(`Redirigiendo a existencias de campamento...`);
                    }}
                  >
                    <span className="flex items-center justify-center gap-1.5 font-mono text-[9px] uppercase px-1 py-0.5">
                      <Package className="h-3.5 w-3.5 shrink-0" />
                      Ir a inventario
                    </span>
                  </Btn>

                  <div className="border border-amber-500/20 bg-amber-950/10 text-amber-300 rounded-xs text-[9.5px] font-mono uppercase font-black text-center py-1.5 select-none flex items-center justify-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Requiere regularizar stock
                  </div>
                </div>
              </div>
              <div className="border-t border-[#67ACA9]/10 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9.5px] font-bold text-zinc-400 uppercase font-mono">Bitácora de Tráficos del Recurso</span>
                  <span className="text-[8.5px] text-[#A4C2C5]/30">Movimientos Recientes</span>
                </div>

                <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {relatedMovements.map(m => {
                    const isOutflow = [
                      "DAILY_RATION",
                      "EXPEDITION_DEPARTURE",
                      "TRANSFER_SENT"
                    ].includes(m.movementType) || m.amount < 0;

                    return (
                      <div key={m.id} className="p-2 border border-[#67ACA9]/10 bg-black/15 hover:bg-black/25 transition-all rounded-xs flex justify-between items-center text-[10px]">
                        <div className="flex flex-col leading-none gap-1">
                          <div className="flex gap-1.5 items-center">
                            <span className="font-mono text-zinc-500 text-[8.5px]">#{m.id.replace("mov-init-", "").replace("mov-", "")}</span>
                            <span className="font-semibold text-white uppercase text-[8.5px]">{m.movementType.replace("_", " ")}</span>
                          </div>
                          <span className="text-[9px] text-zinc-400 italic max-w-[170px] truncate" title={m.description}>
                            {m.description}
                          </span>
                        </div>
                        <span className={`font-mono font-bold font-black text-[10.5px] ${isOutflow ? "text-rose-400" : "text-emerald-400"}`}>
                          {isOutflow ? "-" : "+"}{Math.abs(m.amount)}
                        </span>
                      </div>
                    );
                  })}

                  {relatedMovements.length === 0 && (
                    <div className="text-center py-4 border border-dashed border-[#67ACA9]/10 text-zinc-600 font-mono italic text-[9.5px] select-none rounded-xs">
                      No se registran bitácoras previas de movimientos para este recurso en este campamento.
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500 italic font-mono text-[10px] bg-[#121c1c]/25 border border-[#67ACA9]/10 rounded-sm">
              <ShieldAlert className="h-6 w-6 text-zinc-600 mb-2" />
              Seleccione un riesgo activo en el tablero táctico para analizar causas, regularizar stock o ver movimientos relacionados.
            </div>
          )}
        </div>

      </div>

      {feedbackMsg && (
        <div className={`fixed bottom-4 right-4 z-50 p-3 rounded-xs border shadow-lg max-w-sm flex items-start gap-2.5 text-xs text-white ${feedbackType === 'success'
          ? 'bg-cyan-950 border-[#67ACA9]/40 text-[#A4C2C5]'
          : 'bg-rose-950 border-rose-500/40 text-rose-200'
          }`}>
          {feedbackType === 'success' ? <Check className="h-4 w-4 mt-0.5 text-emerald-400 shrink-0" /> : <AlertTriangle className="h-4 w-4 mt-0.5 text-rose-400 shrink-0" />}
          <span className="mt-0.5 leading-normal">{feedbackMsg}</span>
        </div>
      )}
    </SectionShell>
  );
}
export const ROSTER_PEOPLE: CampPerson[] = [
  { id: "31", name: "Sgto. Marcus Vance", role: "Guarda / Defensor Armado", status: "ACTIVE", campId: "1", occupationId: "6" },
  { id: "32", name: "Dra. Elena Rostova", role: "Médico de Emergencia de Campo", status: "ACTIVE", campId: "1", occupationId: "4" },
  { id: "33", name: "Tte. Alex Mercer", role: "Piloto de Aeronave Quad VTOL", status: "ACTIVE", campId: "1", occupationId: "3" },
  { id: "34", name: "Cabo John Miller", role: "Conductor de Blindado Terrestre", status: "ACTIVE", campId: "1", occupationId: "3" },
  { id: "35", name: "Ing. Sara Connor", role: "Ingeniero", status: "ACTIVE", campId: "1", occupationId: "3" },
  { id: "36", name: "Guarda Lara Croft", role: "Guarda / Defensor Armado", status: "ACTIVE", campId: "1", occupationId: "6" },
  { id: "50", name: "Scout Ezio Auditore", role: "Scout Táctico", status: "ACTIVE", campId: "1", occupationId: "5" },
  { id: "37", name: "Técnico Isaac Clarke", role: "Ingeniero", status: "ACTIVE", campId: "2", occupationId: "3" },
  { id: "38", name: "Conductor Cole Train", role: "Conductor de Blindado Terrestre", status: "ACTIVE", campId: "2", occupationId: "3" },
  { id: "39", name: "Dr. Gordon Freeman", role: "Médico de Emergencia de Campo", status: "ACTIVE", campId: "2", occupationId: "4" },
  { id: "40", name: "Recluta Gary", role: "Guarda / Defensor Armado", status: "ACTIVE", campId: "2", occupationId: "6" },
  { id: "51", name: "Scout Solid Snake", role: "Scout Táctico de Infiltración", status: "ACTIVE", campId: "2", occupationId: "5" },
  { id: "41", name: "Cultivador Samuel", role: "Cazador / Expl.", status: "ACTIVE", campId: "3", occupationId: "2" },
  { id: "42", name: "Piloto Fox McCloud", role: "Piloto de Aeronave Quad VTOL", status: "ACTIVE", campId: "3", occupationId: "3" },
  { id: "43", name: "Científico Walter", role: "Investigador", status: "ACTIVE", campId: "3", occupationId: "4" },
  { id: "44", name: "Conductor Sweet Tooth", role: "Conductor de Blindado Terrestre", status: "ACTIVE", campId: "3", occupationId: "3" },
  { id: "52", name: "Scout Nathan Drake", role: "Scout Táctico", status: "ACTIVE", campId: "3", occupationId: "5" },
  { id: "45", name: "Sgto. Master Chief", role: "Guarda / Defensor Armado", status: "ACTIVE", campId: "4", occupationId: "6" },
  { id: "46", name: "Cabo Dunn", role: "Guarda / Defensor Armado", status: "ACTIVE", campId: "4", occupationId: "6" },
  { id: "47", name: "Piloto Maverick", role: "Piloto de Aeronave Quad VTOL", status: "ACTIVE", campId: "4", occupationId: "3" },
  { id: "48", name: "Médico Angela", role: "Médico de Emergencia de Campo", status: "ACTIVE", campId: "4", occupationId: "4" },
  { id: "53", name: "Scout Sam Fisher", role: "Scout Táctico Nocturno", status: "ACTIVE", campId: "4", occupationId: "5" }
];
export const SPECIALISTS_OCCUPATIONS = [
  { id: "1", name: "Water Collector" },
  { id: "2", name: "Food Gatherer" },
  { id: "3", name: "Engineer" },
  { id: "4", name: "Medic" },
  { id: "5", name: "Scout" },
  { id: "6", name: "Guard" }
];

export function ViewSolicitudesIntercampamento({
  camps,
  resourceTypes,
  intercampRequests,
  requestResourceDetails,
  onAddRequest,
  onUpdateRequestStatus,
  onAddResourceToRequest,
  onDeleteRequestResource,
  onUpdateRequest,
  onSubmitRequest,
  onAddPersonToRequest,
  campInventories,
  transfers,
  transferPersons,
  transferHistories,
  serverNow,
  campPersonnel,
}: {
  camps: Camp[];
  resourceTypes: ResourceType[];
  intercampRequests: IntercampRequest[];
  requestResourceDetails: RequestResourceDetail[];
  onAddRequest: (data: Omit<IntercampRequest, "id">) => IntercampRequest | string | null | Promise<IntercampRequest | string | null>;
  onUpdateRequestStatus: (id: string, status: IntercampRequest["status"], responder: string, transportPersonIds?: string[]) => Promise<boolean> | boolean | void | Promise<void>;
  onAddResourceToRequest: (requestId: string, resourceTypeId: string, requestedAmount: number) => void;
  onDeleteRequestResource: (id: string) => void;
  onUpdateRequest: (id: string, patch: Partial<IntercampRequest>) => void;
  onSubmitRequest?: (id: string) => Promise<boolean>;
  onAddPersonToRequest?: (detail: { requestId: string; detailType: "BY_OCCUPATION" | "SPECIFIC"; personId: string | null; occupationId: string | null; amount: number; status: "PROPOSED" | "CONFIRMED" | "REJECTED" }) => void | Promise<void>;
  onUpdateTransportStaff?: (transferId: string, transportPersonIds: string[]) => void | Promise<void>;
  campInventories: CampInventory[];
  setCampInventories: React.Dispatch<React.SetStateAction<CampInventory[]>>;
  transfers: Transfer[];
  setTransfers: React.Dispatch<React.SetStateAction<Transfer[]>>;
  transferPersons: TransferPerson[];
  setTransferPersons: React.Dispatch<React.SetStateAction<TransferPerson[]>>;
  transferHistories: TransferHistory[];
  serverNow?: Date;
  campPersonnel?: CampPerson[];
}) {
  const PEOPLE = (campPersonnel && campPersonnel.length > 0) ? campPersonnel : ROSTER_PEOPLE;

  const [activeTab, setActiveTab] = useState<"emitir" | "mis-solicitudes" | "pendientes">("emitir");
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [viewingReqId, setViewingReqId] = useState<string | null>(null);
  const [viewingTransferId, setViewingTransferId] = useState<string | null>(null);
  const [evaluatingReqId, setEvaluatingReqId] = useState<string | null>(null);
  const [assignedScoutId, setAssignedScoutId] = useState<string>("");
  const [additionalPersonIds, setAdditionalPersonIds] = useState<string[]>([]);
  const [searchPersonTerm, setSearchPersonTerm] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [validationPopup, setValidationPopup] = useState<string | null>(null);

  const selectedOperPersonIds = [assignedScoutId, ...additionalPersonIds].filter(Boolean);
  const availableCamps = camps && camps.length > 1 ? camps : [
    { id: "1", name: "Alpha Bunker" },
    { id: "2", name: "Sierra Base" },
    { id: "3", name: "Delta Refuge" },
    { id: "4", name: "Omega Fortress" },
    { id: "5", name: "Echo Outpost" }
  ];

  const [originCampId, setOriginCampId] = useState(currentUser.campId);
  const [destinationCampId, setDestinationCampId] = useState(() => availableCamps.find(camp => String(camp.id) !== String(currentUser.campId))?.id || "2");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (availableCamps.length > 0 && String(destinationCampId) === String(currentUser.campId)) {
      const firstValidCamp = availableCamps.find(camp => String(camp.id) !== String(currentUser.campId));
      if (firstValidCamp) {
        setDestinationCampId(String(firstValidCamp.id));
      }
    }
  }, [availableCamps, currentUser.campId, destinationCampId]);

  const [plannedDepartureDate, setPlannedDepartureDate] = useState(() => new Date((serverNow ?? new Date()).getTime() + 60 * 60 * 1000).toISOString());
  const [plannedArrivalDate, setPlannedArrivalDate] = useState(() => new Date((serverNow ?? new Date()).getTime() + 25 * 60 * 60 * 1000).toISOString());

  useEffect(() => {
    if (!serverNow) return;

    const currentDeparture = new Date(plannedDepartureDate);
    if (!Number.isNaN(currentDeparture.getTime()) && currentDeparture.getTime() >= serverNow.getTime()) {
      return;
    }

    setPlannedDepartureDate(new Date(serverNow.getTime() + 60 * 60 * 1000).toISOString());
    setPlannedArrivalDate(new Date(serverNow.getTime() + 25 * 60 * 60 * 1000).toISOString());
  }, [serverNow]);
  const [activeReqId, setActiveReqId] = useState<string | null>(null);
  const [resourceTypeId, setResourceTypeId] = useState(() => resourceTypes[0]?.id ? String(resourceTypes[0].id) : "2");
  const [qty, setQty] = useState("");

  const [occupationId, setOccupationId] = useState(SPECIALISTS_OCCUPATIONS[0]?.id || "6");
  const [personQty, setPersonQty] = useState("");

  useEffect(() => {
    if (resourceTypes && resourceTypes.length > 0) {
      const exists = resourceTypes.some(rt => String(rt.id) === String(resourceTypeId));
      if (!exists || resourceTypeId === "2") {
        setResourceTypeId(String(resourceTypes[0].id));
      }
    }
  }, [resourceTypes, resourceTypeId]);
  const pendingRequests = intercampRequests.filter(r => r.status === "PENDING");
  const selectedRequest = intercampRequests.find(r => r.id === activeReqId);
  const currentDetails = requestResourceDetails.filter(d => d.requestId === activeReqId);

  const [resourceSearch, setResourceSearch] = useState("");
  const [localQtys, setLocalQtys] = useState<Record<string, string>>({});

  useEffect(() => {
    const newQtys: Record<string, string> = {};
    currentDetails.forEach(det => {
      newQtys[det.resourceTypeId] = String(det.requestedAmount);
    });
    setLocalQtys(prev => ({ ...prev, ...newQtys }));
  }, [requestResourceDetails, activeReqId]);

  const handleQuickAddOrUpdate = async (rtId: string | number, quantity: number, existingDetailId?: string | number) => {
    if (!activeReqId) return;
    if (existingDetailId) {
      await onDeleteRequestResource(String(existingDetailId));
    }
    await onAddResourceToRequest(activeReqId, String(rtId), quantity);
  };
  const evaluatingRequest = intercampRequests.find(r => r.id === evaluatingReqId);
  const evaluatingDetails = evaluatingRequest ? requestResourceDetails.filter(d => d.requestId === evaluatingRequest.id) : [];
  const evaluatingOriginCampName = evaluatingRequest ? getCampDisplayName(camps, evaluatingRequest.originCampId) : "Campamento no definido";
  const evaluatingDestinationCampName = evaluatingRequest ? getCampDisplayName(camps, evaluatingRequest.destinationCampId) : "Campamento no definido";
  const reqPeopleCoverages = evaluatingRequest ? (evaluatingRequest.personRequirements || []).map(pr => {
    const occ = SPECIALISTS_OCCUPATIONS.find(o => o.id === pr.occupationId);
    const matches = PEOPLE.filter(p => String(p.campId) === String(evaluatingRequest.destinationCampId) && (p.role ?? "").toLowerCase().includes((occ?.name || pr.occupationId).toLowerCase().slice(0, 8)));
    const availableCount = matches.length;
    const covered = availableCount >= pr.quantity;

    return {
      name: occ?.name || pr.occupationId,
      required: pr.quantity,
      available: availableCount,
      status: covered ? "Cubierto" : "Deficiente",
      statusColor: covered ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"
    };
  }) : [];
  const destinationCampPeople = evaluatingRequest ? PEOPLE.filter(p => String(p.campId) === String(evaluatingRequest.destinationCampId)) : [];
  const isPersonAssignedToActiveTransferIdx = (personId: string) => {
    return transferPersons.some(tp => {
      if (tp.personId !== personId) return false;
      const t = transfers.find(item => item.id === tp.transferId);
      return t ? t.status === "PENDING_DEPARTURE" : false;
    });
  };
  const personnelCount = selectedOperPersonIds.length;
  const requestedPeopleCount = evaluatingRequest ? (evaluatingRequest.personRequirements || []).reduce((sum, item) => sum + item.quantity, 0) : 0;
  const totalTravelers = personnelCount + requestedPeopleCount;

  let computedDiffDays = 1;
  if (evaluatingRequest) {
    const depDateObj = new Date(evaluatingRequest.plannedDepartureDate);
    const arrDateObj = new Date(evaluatingRequest.plannedArrivalDate);
    if (!isNaN(depDateObj.getTime()) && !isNaN(arrDateObj.getTime())) {
      const diffTime = arrDateObj.getTime() - depDateObj.getTime();
      computedDiffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }
  if (computedDiffDays <= 0) computedDiffDays = 1;

  const RATION_FACTOR = 2;
  const rationsRequired = totalTravelers * computedDiffDays * RATION_FACTOR;

  const foodInvObj = evaluatingRequest ? campInventories.find(i => i.campId === evaluatingRequest.destinationCampId && i.resourceTypeId === "2") : null;
  const foodInventoryCurrent = foodInvObj ? foodInvObj.currentAmount : 0;
  const foodInventoryMinAlert = foodInvObj ? foodInvObj.minimumAlertAmount : 0;

  const reqFoodDetail = evaluatingDetails.find(d => d.resourceTypeId === "2");
  const foodAmtRequested = reqFoodDetail ? reqFoodDetail.requestedAmount : 0;
  const resultingFoodAmount = foodInventoryCurrent - foodAmtRequested - rationsRequired;
  const validationErrors: string[] = [];
  if (evaluatingRequest) {
    if (!assignedScoutId) {
      validationErrors.push("Debe asignar al menos un Scout operativo");
    }
    const anyOccupied = selectedOperPersonIds.some(id => isPersonAssignedToActiveTransferIdx(id));
    if (anyOccupied) {
      validationErrors.push("Una o más personas operativas ya están asignadas a otro traslado activo");
    }
    if (foodInventoryCurrent - foodAmtRequested < rationsRequired) {
      validationErrors.push("No hay raciones suficientes para aprobar el traslado");
    } else if (resultingFoodAmount < foodInventoryMinAlert) {
      validationErrors.push("Las raciones quedarían por debajo del mínimo requerido");
    }
    const deficientPc = reqPeopleCoverages.find(pc => pc.status === "Deficiente");
    if (deficientPc) {
      validationErrors.push(`No hay suficientes personas elegibles para el oficio ${deficientPc.name}`);
    }
  }

  const hasValidationError = validationErrors.length > 0;
  const canApprove = !hasValidationError;

  const showValidationPopup = (message: string) => {
    setValidationPopup(message);
    window.setTimeout(() => setValidationPopup(null), 4200);
  };

  const handleFinalApprove = async () => {
    if (!evaluatingRequest) return;
    if (hasValidationError) {
      showValidationPopup("No se cumplen los requisitos operacionales: " + validationErrors.join(" / "));
      return;
    }

    const success = await onUpdateRequestStatus(evaluatingRequest.id, "APPROVED", currentUser.userId, selectedOperPersonIds);
    if (success) {
      setEvaluatingReqId(null);
      setAssignedScoutId("");
      setAdditionalPersonIds([]);
      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
      }, 4000);
    }
  };

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      showValidationPopup("Ingrese una motivación o descripción válida.");
      return;
    }
    if (originCampId === destinationCampId) {
      showValidationPopup("El campamento origen debe ser distinto al destino.");
      return;
    }

    const departureDate = new Date(plannedDepartureDate);
    const arrivalDate = new Date(plannedArrivalDate);
    const currentServerTime = serverNow ?? new Date();

    if (Number.isNaN(departureDate.getTime()) || Number.isNaN(arrivalDate.getTime())) {
      showValidationPopup("Seleccione fechas y horas planificadas válidas para salida y llegada.");
      return;
    }

    if (departureDate.getTime() < currentServerTime.getTime()) {
      showValidationPopup("La salida planificada no puede ser anterior a la fecha y hora actual del servidor.");
      return;
    }

    if (arrivalDate.getTime() < departureDate.getTime()) {
      showValidationPopup("La llegada planificada no puede ser anterior a la salida planificada.");
      return;
    }

    const draft = await onAddRequest({
      originCampId,
      destinationCampId,
      status: "DRAFT",
      description: description.trim(),
      plannedDepartureDate,
      plannedArrivalDate,
      personRequirements: [],
      createdDate: new Date().toLocaleDateString("es-ES") + " " + new Date().toLocaleTimeString("es-ES"),
      createdBy: "Operario " + currentUser.userId
    });

    const draftId = typeof draft === "string" ? draft : draft?.id;
    if (draftId) {
      setActiveReqId(draftId);
      setWizardStep(2);
    } else {
      showValidationPopup("Hubo un error al crear la solicitud de borrador.");
    }
  };

  const handleAddPerson = async () => {
    if (!activeReqId || !selectedRequest) return;
    const count = parseInt(personQty, 10);
    if (!personQty || isNaN(count) || count <= 0) {
      showValidationPopup("Ingrese una cantidad válida de personal.");
      return;
    }

    const currentReqs = selectedRequest.personRequirements || [];
    const existsIndex = currentReqs.findIndex(pr => pr.occupationId === occupationId);

    let updated;
    if (existsIndex >= 0) {
      updated = [...currentReqs];
      updated[existsIndex] = {
        ...updated[existsIndex],
        quantity: updated[existsIndex].quantity + count
      };
    } else {
      updated = [...currentReqs, { occupationId, quantity: count }];
    }

    if (onAddPersonToRequest) {
      await onAddPersonToRequest({
        requestId: activeReqId,
        detailType: "BY_OCCUPATION",
        personId: null,
        occupationId,
        amount: count,
        status: "PROPOSED"
      });
    }
    onUpdateRequest(activeReqId, { personRequirements: updated });
    setPersonQty("");
  };

  const handleRemovePerson = (occId: string) => {
    if (!activeReqId || !selectedRequest) return;
    const currentReqs = selectedRequest.personRequirements || [];
    const updated = currentReqs.filter(pr => pr.occupationId !== occId);
    onUpdateRequest(activeReqId, { personRequirements: updated });
  };

  const handleSendRequest = async () => {
    if (!activeReqId) return;
    if (currentDetails.length === 0 && (!selectedRequest || !selectedRequest.personRequirements || selectedRequest.personRequirements.length === 0)) {
      showValidationPopup("Debe agregar al menos un recurso o requerimiento de personal para poder enviar la solicitud.");
      return;
    }

    let success = false;
    if (onSubmitRequest) {
      success = await onSubmitRequest(activeReqId);
    } else {
      await onUpdateRequestStatus(activeReqId, "PENDING", currentUser.userId);
      success = true;
    }

    if (success) {
      showValidationPopup(`La solicitud borrador #${activeReqId} se envió formalmente al canal de aprobación de red.`);
      setDescription("");
      setActiveReqId(null);
      setWizardStep(1);
      setActiveTab("pendientes");
    }
  };

  const handleCancelDraft = () => {
    if (!activeReqId) return;
    if (confirm("¿Está seguro de que desea cancelar y descartar este borrador?")) {
      onUpdateRequestStatus(activeReqId, "CANCELED", "Operario " + currentUser.userId);
      setActiveReqId(null);
      setWizardStep(1);
      setDescription("");
      showValidationPopup("Borrador cancelado correctamente.");
    }
  };

  return (
    <SectionShell kicker="COORDINACIÓN LOGÍSTICA SUCURSAL" title="Solicitudes de Reabastecimiento Intercampamento">
      <div className="flex gap-2.5 mb-5 border-b border-[#67ACA9]/20 pb-3">
        <button
          onClick={() => setActiveTab("emitir")}
          className={`px-4 py-2 text-[10px] sm:text-[11px] font-black uppercase tracking-wider border rounded-xs transition-colors flex items-center gap-1.5 ${activeTab === "emitir"
            ? "bg-[#67ACA9]/15 border-[#69BFB7] text-[#69BFB7] shadow-md shadow-[#69BFB7]/5"
            : "bg-black/35 border-[#67ACA9]/15 text-[#A4C2C5]/60 hover:text-white"
            }`}
        >
          <Plus className="h-3 w-3" />
          <span>Nueva Solicitud</span>
        </button>

        <button
          onClick={() => setActiveTab("mis-solicitudes")}
          className={`px-4 py-2 text-[10px] sm:text-[11px] font-black uppercase tracking-wider border rounded-xs transition-colors flex items-center gap-1.5 ${activeTab === "mis-solicitudes"
            ? "bg-[#67ACA9]/15 border-[#69BFB7] text-[#69BFB7] shadow-md shadow-[#69BFB7]/5"
            : "bg-black/35 border-[#67ACA9]/15 text-[#A4C2C5]/60 hover:text-white"
            }`}
        >
          <FileText className="h-3 w-3" />
          <span>Mis Solicitudes ({intercampRequests.filter(r => r.originCampId === currentUser.campId && r.status !== "CANCELED").length})</span>
        </button>

        <button
          onClick={() => setActiveTab("pendientes")}
          className={`px-4 py-2 text-[10px] sm:text-[11px] font-black uppercase tracking-wider border rounded-xs transition-colors flex items-center gap-1.5 ${activeTab === "pendientes"
            ? "bg-amber-950/20 border-amber-500 text-amber-400 shadow-md shadow-amber-500/5"
            : "bg-black/35 border-[#67ACA9]/15 text-[#A4C2C5]/60 hover:text-white"
            }`}
        >
          <AlertCircle className="h-3 w-3" />
          <span>Solicitudes por Aprobar ({pendingRequests.filter(r => r.destinationCampId === currentUser.campId).length})</span>
        </button>
      </div>

      <div>
        {activeTab === "emitir" && (
          <div className="grid grid-cols-1 gap-5">
            <div className="flex items-center gap-2 bg-black/40 border border-[#67ACA9]/15 p-2 rounded-xs">
              <div className="flex items-center gap-1.5">
                <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold font-mono text-[10px] ${wizardStep === 1 ? 'bg-[#69BFB7] text-black font-black' : 'bg-[#67ACA9]/20 text-[#A4C2C5]'}`}>1</span>
                <span className={`text-[9.5px] font-mono uppercase font-black ${wizardStep === 1 ? 'text-[#69BFB7]' : 'text-[#A4C2C5]/65'}`}>Datos del Borrador</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-[#A4C2C5]/30" />
              <div className="flex items-center gap-1.5">
                <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold font-mono text-[10px] ${wizardStep === 2 ? 'bg-[#69BFB7] text-black font-black' : 'bg-[#67ACA9]/20 text-[#A4C2C5]'}`}>2</span>
                <span className={`text-[9.5px] font-mono uppercase font-black ${wizardStep === 2 ? 'text-[#69BFB7]' : 'text-[#A4C2C5]/65'}`}>Agregar Recursos y Personal</span>
              </div>

              {wizardStep === 2 && activeReqId && (
                <div className="ml-auto flex items-center gap-2 bg-[#69BFB7]/10 border border-[#69BFB7]/30 px-2 py-0.5 rounded-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-[9px] font-mono font-bold text-[#69BFB7] uppercase">Borrador ID: {activeReqId}</span>
                </div>
              )}
            </div>
            {wizardStep === 1 && (
              <div className="flex flex-col gap-6">
                <form onSubmit={handleCreateDraft} className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/95 p-5 rounded-sm flex flex-col gap-4">
                  <div className="text-xs font-bold text-[#69BFB7] uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-1">
                    Paso 1: Generar Borrador de Solicitud de Distribución
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <label className="v-field flex flex-col gap-1.5">
                      <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Campamento Origen *</span>
                      <select value={originCampId} disabled className="v-select bg-black/25 text-[#A4C2C5]/60 cursor-not-allowed">
                        {availableCamps.filter(c => String(c.id) === String(currentUser.campId)).map(c => (
                          <option key={c.id} value={c.id}>{c.name} (Propio)</option>
                        ))}
                      </select>
                    </label>

                    <label className="v-field flex flex-col gap-1.5">
                      <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Campamento Destino *</span>
                      <select value={destinationCampId} onChange={e => setDestinationCampId(e.target.value)} className="v-select">
                        {availableCamps.filter(c => String(c.id) !== String(currentUser.campId)).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <DateTimeField
                      label="Salida Táctica Estimada"
                      value={plannedDepartureDate}
                      onChange={setPlannedDepartureDate}
                      minDate={serverNow ?? new Date()}
                    />
                    <DateTimeField
                      label="Llegada Proyectada"
                      value={plannedArrivalDate}
                      onChange={setPlannedArrivalDate}
                      minDate={new Date(Math.max((serverNow ?? new Date()).getTime(), new Date(plannedDepartureDate).getTime()))}
                    />
                  </div>

                  <div className="flex flex-col gap-1 text-xs">
                    <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Emitido Por</span>
                    <span className="v-input bg-black/35 text-[#A4C2C5]/60 border border-[#67ACA9]/15 select-none flex items-center px-3 py-2 h-[36px] rounded-sm font-mono text-[10.5px]">
                      Operario #{currentUser.userId} - Administrador del Módulo
                    </span>
                  </div>

                  <label className="v-field flex flex-col gap-1.5 text-xs">
                    <span className="v-field-label text-[#A4C2C5]/70">Motivación y Justificación de Recursos *</span>
                    <input
                      type="text"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className="v-input"
                      placeholder="e.g. Descenso crítico en stock de municiones y ración seca"
                    />
                  </label>

                  <div className="mt-2 text-right">
                    <Btn type="submit" variant="primary" style={{ padding: "10px 24px" }} disabled={originCampId === destinationCampId}>
                      Guardar Borrador e Ir a Detalles ➔
                    </Btn>
                  </div>
                </form>
                {intercampRequests.filter(r => r.status === "DRAFT").length > 0 && (
                  <div className="mission-card border border-[#67ACA9]/20 bg-[#0d1414]/95 p-4 rounded-sm flex flex-col gap-3">
                    <div className="text-xs font-bold text-amber-400 uppercase border-b border-[#67ACA9]/10 pb-1.5">
                      Borradores Guardados / Seleccionar para Agregar Recursos
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {intercampRequests.filter(r => r.status === "DRAFT").map(draft => {
                        const originName = getCampDisplayName(camps, draft.originCampId);
                        const destName = getCampDisplayName(camps, draft.destinationCampId);
                        const draftDetailsCount = requestResourceDetails.filter(d => d.requestId === draft.id).length;
                        return (
                          <div key={draft.id} className="p-3 bg-black/40 border border-[#67ACA9]/15 rounded-xs flex flex-col justify-between gap-2">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] uppercase text-[#69BFB7] font-mono font-bold">Borrador ID: {draft.id}</span>
                                <span className="text-[9px] bg-cyan-950/40 text-cyan-300 border border-cyan-500/20 px-1 py-0.2 rounded-xs font-mono font-bold">
                                  {draftDetailsCount} Recursos
                                </span>
                              </div>
                              <div className="text-[11.5px] font-bold text-white uppercase">
                                {originName} ➔ {destName}
                              </div>
                              <div className="text-[10.5px] italic text-[#A4C2C5]/75 mt-1 line-clamp-2">
                                "{draft.description}"
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-2 border-t border-[#67ACA9]/10 pt-2">
                              <button
                                className="px-2 py-1 text-[9.5px] uppercase font-bold bg-rose-950/20 border border-rose-500/25 text-rose-300 hover:bg-rose-500/20 rounded-xs transition-colors"
                                onClick={() => {
                                  if (confirm("¿Descartar este borrador?")) {
                                    onUpdateRequestStatus(draft.id, "CANCELED", "Operario " + currentUser.userId);
                                  }
                                }}
                              >
                                Descartar
                              </button>
                              <button
                                className="px-3 py-1 text-[9.5px] uppercase font-mono font-black bg-[#67ACA9]/20 border border-[#69BFB7] text-[#69BFB7] hover:bg-[#67ACA9]/30 rounded-xs transition-all flex items-center gap-1"
                                onClick={() => {
                                  setActiveReqId(draft.id);
                                  setWizardStep(2);
                                }}
                              >
                                Continuar Paso 2 ➔
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            {wizardStep === 2 && activeReqId && selectedRequest && (
              <div className="flex flex-col gap-5">
                <div className="p-4 bg-emerald-950/10 border border-emerald-500/20 rounded-xs text-[11px] grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[#A4C2C5]/50 block font-mono uppercase text-[9px]">Ruta de Transferencia:</span>
                    <strong className="text-white text-xs uppercase">{getCampDisplayName(camps, selectedRequest.originCampId)} ➔ {getCampDisplayName(camps, selectedRequest.destinationCampId)}</strong>
                  </div>
                  <div>
                    <span className="text-[#A4C2C5]/50 block font-mono uppercase text-[9px]">Cronograma Planificado:</span>
                    <strong className="text-white text-xs">{selectedRequest.plannedDepartureDate} al {selectedRequest.plannedArrivalDate}</strong>
                  </div>
                  <div>
                    <span className="text-[#A4C2C5]/50 block font-mono uppercase text-[9px]">Justificación Operativa:</span>
                    <span className="italic text-[#A4C2C5] text-xs">{selectedRequest.description}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/95 p-4 rounded-sm flex flex-col gap-3">
                    <div className="text-xs font-bold text-[#69BFB7] uppercase border-b border-[#67ACA9]/10 pb-1.5 flex items-center justify-between">
                      <span>A) Recursos Vinculados a la Solicitud</span>
                      <span className="font-mono text-[#A4C2C5]/50 hover:text-white bg-black/40 px-2 py-0.5 rounded-sm">{currentDetails.length} recursos</span>
                    </div>

                    <div className="flex flex-col gap-2 mb-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Buscar recurso..."
                          value={resourceSearch}
                          onChange={e => setResourceSearch(e.target.value)}
                          className="v-input py-1 text-xs w-full"
                        />
                        {resourceSearch && (
                          <button
                            onClick={() => setResourceSearch("")}
                            className="text-xs text-zinc-400 hover:text-white font-mono px-2 transition-colors"
                          >
                            Limpiar
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1 select-none">
                        {resourceTypes
                          .filter(rt =>
                            rt.name.toLowerCase().includes(resourceSearch.toLowerCase()) ||
                            String(rt.category || "").toLowerCase().includes(resourceSearch.toLowerCase())
                          )
                          .map(rt => {
                            const alreadyAdded = currentDetails.find(d => d.resourceTypeId === rt.id);
                            const value = localQtys[rt.id] || "";
                            const hasChanged = alreadyAdded && String(alreadyAdded.requestedAmount) !== value;

                            let categoryColor = "border-zinc-500/30 text-zinc-400";
                            if (rt.category === "FOOD") categoryColor = "border-emerald-500/20 text-emerald-400 bg-emerald-950/20";
                            else if (rt.category === "WATER") categoryColor = "border-blue-500/20 text-blue-400 bg-blue-950/20";
                            else if (rt.category === "MEDICAL") categoryColor = "border-rose-500/20 text-rose-400 bg-rose-950/20";
                            else if (rt.category === "DEFENSE" || rt.category === "AMMUNITION") categoryColor = "border-amber-500/20 text-amber-400 bg-amber-950/20";

                            return (
                              <div
                                key={rt.id}
                                className={`p-2 border rounded-xs flex flex-col justify-between gap-1 transition-all duration-200 ${alreadyAdded
                                  ? "bg-[#67ACA9]/5 border-[#69BFB7]/40 shadow-sm shadow-[#69BFB7]/5"
                                  : "bg-[#0d1414]/40 border-[#67ACA9]/10 hover:border-[#67ACA9]/30"
                                  }`}
                              >
                                <div className="flex justify-between items-start gap-1">
                                  <div className="flex flex-col">
                                    <span className="text-[10.5px] font-bold text-white uppercase tracking-tight line-clamp-1">{rt.name}</span>
                                    <span className={`text-[7.5px] font-mono font-bold uppercase border px-1 py-0.2 rounded-xs self-start mt-0.5 ${categoryColor}`}>
                                      {rt.category || "OTRO"}
                                    </span>
                                  </div>
                                  <span className="text-[8.5px] font-mono text-zinc-500 shrink-0">{rt.unitOfMeasure || "u"}</span>
                                </div>

                                <div className="flex items-center gap-1.5 mt-1">
                                  <input
                                    type="number"
                                    value={value}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setLocalQtys(prev => ({ ...prev, [rt.id]: val }));
                                    }}
                                    className="v-input py-0.5 text-center text-xs font-mono w-16 h-[26px] bg-black/45"
                                    placeholder="0"
                                  />

                                  {alreadyAdded ? (
                                    <div className="flex gap-1 items-center ml-auto">
                                      {hasChanged && (
                                        <button
                                          onClick={() => {
                                            const numVal = Number(value);
                                            if (isNaN(numVal) || numVal <= 0) {
                                              showValidationPopup("Ingrese una cantidad mayor a 0.");
                                              return;
                                            }
                                            handleQuickAddOrUpdate(rt.id, numVal, alreadyAdded.id);
                                          }}
                                          className="px-2 h-[26px] bg-[#69BFB7] hover:bg-[#69BFB7]/80 text-[#0d1414] rounded-xs text-[9.5px] font-bold uppercase transition-colors"
                                          title="Guardar cambios"
                                        >
                                          ✓ Guardar
                                        </button>
                                      )}
                                      <button
                                        onClick={() => onDeleteRequestResource(alreadyAdded.id)}
                                        className="p-1 h-[26px] w-[26px] border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-xs flex items-center justify-center transition-all"
                                        title="Quitar de la solicitud"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        const numVal = Number(value || "10");
                                        if (isNaN(numVal) || numVal <= 0) {
                                          showValidationPopup("Ingrese una cantidad mayor a 0.");
                                          return;
                                        }
                                        handleQuickAddOrUpdate(rt.id, numVal);
                                      }}
                                      className="ml-auto px-2.5 h-[26px] bg-[#67ACA9]/20 border border-[#69BFB7] text-[#69BFB7] hover:bg-[#67ACA9]/30 rounded-xs text-[9.5px] font-mono font-bold uppercase tracking-tight transition-all"
                                    >
                                      ＋ Agregar
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    <div className="v-table-wrap max-h-40 overflow-y-auto bg-black/15 border border-[#67ACA9]/10 rounded-sm">
                      <table className="v-table text-[10px]">
                        <thead>
                          <tr className="bg-black/25">
                            <th>Recurso</th>
                            <th>Unidad</th>
                            <th className="text-right">Demanda</th>
                            <th className="text-center font-mono w-14">Acabo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentDetails.map(det => {
                            const type = resourceTypes.find(t => t.id === det.resourceTypeId);
                            return (
                              <tr key={det.id} className="hover:bg-white/5">
                                <td className="font-bold text-white">{type?.name || det.resourceTypeId}</td>
                                <td className="font-mono text-[#A4C2C5]/50">{type?.unitOfMeasure || "u"}</td>
                                <td className="text-right font-black text-cyan-300">{det.requestedAmount}</td>
                                <td className="text-center">
                                  <button
                                    className="text-rose-400 hover:text-red-300 hover:scale-110 transition-transform p-1"
                                    onClick={() => onDeleteRequestResource(det.id)}
                                    title="Quitar Recurso"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {currentDetails.length === 0 && (
                            <tr>
                              <td colSpan={4} className="text-center py-6 text-[#A4C2C5]/40 italic">Ningún recurso vinculado aún. Ingrese valores arriba.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/95 p-4 rounded-sm flex flex-col gap-3">
                    <div className="text-xs font-bold text-[#69BFB7] uppercase border-b border-[#67ACA9]/10 pb-1.5 flex items-center justify-between">
                      <span>B) Personal de Apoyo / Escolta Solicitado</span>
                      <span className="font-mono text-[#A4C2C5]/50 hover:text-white bg-black/40 px-2 py-0.5 rounded-sm">
                        {(selectedRequest.personRequirements || []).length} oficios
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-1.5 items-end text-xs">
                      <div className="sm:col-span-6 flex flex-col gap-1">
                        <span className="text-[#A4C2C5]/70 font-semibold font-mono text-[9px]">Especialidad Requerida</span>
                        <select value={occupationId} onChange={e => setOccupationId(e.target.value)} className="v-select text-xs">
                          {SPECIALISTS_OCCUPATIONS.map(occ => <option key={occ.id} value={occ.id}>{occ.name}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-3 flex flex-col gap-1">
                        <span className="text-[#A4C2C5]/70 font-semibold font-mono text-[9px]">Renglones (N°)</span>
                        <input type="number" value={personQty} onChange={e => setPersonQty(e.target.value)} className="v-input py-1 text-center" placeholder="0" />
                      </div>
                      <div className="sm:col-span-3">
                        <Btn small variant="primary" style={{ width: "100%", padding: "8px" }} onClick={handleAddPerson}>
                          ＋ Sumar
                        </Btn>
                      </div>
                    </div>

                    <div className="v-table-wrap max-h-40 overflow-y-auto bg-black/15 border border-[#67ACA9]/10 rounded-sm">
                      <table className="v-table text-[10px]">
                        <thead>
                          <tr className="bg-black/25">
                            <th>Oficio Especialista</th>
                            <th className="text-right">Requeridos</th>
                            <th className="text-center font-mono w-14">Acabo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedRequest.personRequirements || []).map(pr => {
                            const occName = SPECIALISTS_OCCUPATIONS.find(o => o.id === pr.occupationId)?.name || pr.occupationId;
                            return (
                              <tr key={pr.occupationId} className="hover:bg-white/5">
                                <td className="font-bold text-white">{occName}</td>
                                <td className="text-right font-black text-amber-300 font-mono">{pr.quantity} efectivos</td>
                                <td className="text-center">
                                  <button
                                    className="text-rose-400 hover:text-red-300 hover:scale-110 transition-transform p-1"
                                    onClick={() => handleRemovePerson(pr.occupationId)}
                                    title="Quitar Requerimiento de Personal"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {(selectedRequest.personRequirements || []).length === 0 && (
                            <tr>
                              <td colSpan={3} className="text-center py-6 text-[#A4C2C5]/40 italic">Ninguna escolta o piloto vinculada aún.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
                <div className="mt-2.5 p-4 bg-teal-950/20 border border-[#67ACA9]/25 rounded-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex flex-col text-xs max-w-lg">
                    <span className="text-[#69BFB7] uppercase font-black tracking-wide text-[10.5px]">Finalizar Solicitud de Enlace Regional</span>
                    <p className="text-[#A4C2C5]/70 text-[11px] leading-relaxed mt-1">
                      El borrador se registrará formalmente. Al presionar "Confirmar y Enviar", la solicitud cambiará su estado a <strong>PENDING (Pendiente)</strong> para su revisión administrativa e ínter-enlaces del sistema.
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Btn variant="danger" onClick={handleCancelDraft} style={{ padding: "10px 18px" }}>
                      ✕ Descartar Borrador
                    </Btn>
                    <Btn
                      variant="success"
                      onClick={handleSendRequest}
                      style={{ padding: "10px 24px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                      disabled={currentDetails.length === 0 && (!selectedRequest.personRequirements || selectedRequest.personRequirements.length === 0)}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Confirmar y Enviar Solicitud
                    </Btn>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}
        {activeTab === "mis-solicitudes" && (
          <div className="flex flex-col gap-4 animate-fade-in text-xs">
            <div className="bg-[#0b1213] border border-[#67ACA9]/20 rounded p-4 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#58DDD3] border-b border-[#67ACA9]/10 pb-2.5 mb-3 flex items-center justify-between">
                <span>Mis Solicitudes Emitidas</span>
                <span className="text-[10px] text-zinc-500 font-mono">Campamento {camps.find(c => c.id === currentUser.campId)?.name || currentUser.campId}</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-cyan-950 text-[#69BFB7] text-[10px] uppercase tracking-wider">
                      <th className="py-2.5">ID</th>
                      <th className="py-2.5">Proveedor</th>
                      <th className="py-2.5">Justificación / Descripción</th>
                      <th className="py-2.5">Cronograma</th>
                      <th className="py-2.5">Recursos / Personal</th>
                      <th className="py-2.5">Estado</th>
                      <th className="py-2.5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#67ACA9]/5 text-slate-300">
                    {intercampRequests
                      .filter(r => r.originCampId === currentUser.campId && r.status !== "CANCELED")
                      .map(req => {
                        const providerCampName = getCampDisplayName(camps, req.destinationCampId);
                        const reqDetails = requestResourceDetails.filter(d => d.requestId === req.id);
                        const numResources = reqDetails.length;
                        const numPeople = (req.personRequirements || []).reduce((sum, item) => sum + item.quantity, 0);

                        return (
                          <tr key={req.id} className="hover:bg-slate-900/10 transition-colors">
                            <td className="py-3 font-mono font-bold text-white">#{req.id}</td>
                            <td className="py-3 uppercase font-semibold text-[#69BFB7]">{providerCampName}</td>
                            <td className="py-3 truncate max-w-xs text-slate-400">"{req.description}"</td>
                            <td className="py-3 font-mono text-[10.5px]">
                              {req.plannedDepartureDate} <span className="text-slate-500 font-sans">➔</span> {req.plannedArrivalDate}
                            </td>
                            <td className="py-3">
                              <span className="bg-black/30 px-2 py-0.5 rounded font-mono text-[10px] text-cyan-300 mr-1 border border-cyan-900/40">
                                {numResources} Rec
                              </span>
                              <span className="bg-black/30 px-2 py-0.5 rounded font-mono text-[10px] text-amber-300 border border-amber-900/40">
                                {numPeople} Pax
                              </span>
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${req.status === "APPROVED"
                                ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                                : req.status === "REJECTED"
                                  ? "bg-rose-950/40 text-rose-300 border-rose-500/30"
                                  : req.status === "PENDING"
                                    ? "bg-amber-950/40 text-amber-300 border-amber-500/30 animate-pulse"
                                    : "bg-zinc-950/40 text-zinc-400 border-zinc-700/30"
                                }`}>
                                {req.status === "DRAFT" ? "Borrador" : req.status === "PENDING" ? "Pendiente" : req.status === "APPROVED" ? "Aprobado" : "Rechazado"}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <div className="flex gap-1 justify-end">
                                {req.status === "DRAFT" ? (
                                  <>
                                    <button
                                      onClick={() => { setActiveReqId(req.id); setWizardStep(2); setActiveTab("emitir"); }}
                                      className="px-2 py-1 text-[10px] font-bold text-cyan-400 hover:text-white bg-[#0e2124] hover:bg-cyan-900/40 rounded border border-cyan-800/40 cursor-pointer"
                                    >
                                      Continuar Paso 2
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm("¿Descartar este borrador?")) {
                                          onUpdateRequestStatus(req.id, "CANCELED", "Operario " + currentUser.userId);
                                        }
                                      }}
                                      className="px-2 py-1 text-[10px] font-bold text-rose-400 hover:text-white bg-black/20 hover:bg-rose-950/35 rounded border border-rose-950 cursor-pointer"
                                    >
                                      Descartar
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => setViewingReqId(req.id)}
                                      className="px-2 py-1 text-[10px] font-bold text-slate-300 hover:text-white bg-black/40 hover:bg-slate-800 rounded border border-zinc-700 cursor-pointer"
                                    >
                                      Detalle
                                    </button>
                                    {req.status === "PENDING" && (
                                      <button
                                        onClick={() => {
                                          if (confirm("¿Cancelar esta solicitud pendiente enviada?")) {
                                            onUpdateRequestStatus(req.id, "CANCELED", "Operario " + currentUser.userId);
                                          }
                                        }}
                                        className="px-2 py-1 text-[10px] font-bold text-rose-400 hover:text-white bg-[#221015] hover:bg-rose-950/40 rounded border border-rose-950 cursor-pointer"
                                      >
                                        Cancelar
                                      </button>
                                    )}
                                    {req.status === "APPROVED" && (
                                      <button
                                        onClick={() => {
                                          const matchingTr = transfers.find(t => t.requestId === req.id);
                                          if (matchingTr) setViewingTransferId(matchingTr.id);
                                          else showValidationPopup("El traslado está en proceso de programación por logística.");
                                        }}
                                        className="px-2 py-1 text-[10px] font-bold text-emerald-400 hover:text-white bg-emerald-950/20 hover:bg-emerald-900/40 rounded border border-emerald-900 cursor-pointer"
                                      >
                                        Ver traslado
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {intercampRequests.filter(r => r.originCampId === currentUser.campId && r.status !== "CANCELED").length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-zinc-500 italic">No ha emitido solicitudes de reabastecimiento aún.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {activeTab === "pendientes" && (
          <div className="flex flex-col gap-4">

            <div className="bg-[#0b1213] border border-[#67ACA9]/15 p-4 rounded-xs">
              <h3 className="font-extrabold uppercase font-mono text-[#69BFB7] text-xs">Evaluación de Solicitudes Entrantes</h3>
              <p className="text-[11px] text-[#A4C2C5]/85 mt-1 leading-relaxed">
                Evalué y autorice las demandas solicitadas por otras terminales periféricas. Debe estructurar y preparar la aprobación asignando obligatoriamente un Roster con Scout Principal y opcionalmente escoltas tácticas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {intercampRequests
                .filter(r => r.destinationCampId === currentUser.campId && r.status === "PENDING")
                .map(req => {
                  const originName = getCampDisplayName(camps, req.originCampId);
                  const reqDetails = requestResourceDetails.filter(d => d.requestId === req.id);

                  return (
                    <div key={req.id} className="mission-card border border-amber-500/30 bg-[#0d1414]/95 p-4 rounded-sm flex flex-col gap-3 relative overflow-hidden">

                      <div className="absolute top-0 right-0 bg-amber-500/20 text-amber-400 text-[8px] font-mono font-bold tracking-widest px-2.5 py-0.5 rounded-bl-sm uppercase border-l border-b border-amber-500/30 animate-pulse">
                        Por Evaluar
                      </div>

                      <div>
                        <span className="text-[#A4C2C5]/60 font-mono text-[9px] uppercase block">Procedencia / Origen Solicitante:</span>
                        <strong className="text-white text-[12.5px] uppercase block leading-tight">
                          {originName}
                        </strong>
                      </div>

                      <div className="bg-black/45 p-2 rounded-xs border border-[#67ACA9]/10 text-[11px]">
                        <span className="text-[#69BFB7] font-bold font-mono text-[9px] block uppercase">Justificación:</span>
                        <span className="italic text-[#A4C2C5]/90">"{req.description}"</span>
                      </div>
                      <div className="border-t border-[#67ACA9]/10 pt-2 flex flex-col gap-1.5">
                        <span className="text-[#A4C2C5]/60 font-mono text-[9px] uppercase font-bold block">Recursos Demandados:</span>

                        <div className="flex flex-col gap-1">
                          {reqDetails.map(d => {
                            const type = resourceTypes.find(t => t.id === d.resourceTypeId);
                            return (
                              <div key={d.id} className="flex justify-between items-center text-[10.5px] bg-black/15 font-mono px-2 py-0.5 border-l border-cyan-500/30">
                                <span className="text-white">{type?.name || d.resourceTypeId}</span>
                                <strong className="text-cyan-300 font-bold">{d.requestedAmount} {type?.unitOfMeasure || "u"}</strong>
                              </div>
                            );
                          })}
                          {reqDetails.length === 0 && (
                            <span className="text-[10px] text-[#A4C2C5]/40 italic pl-1">Sin recursos específicos solicitados.</span>
                          )}
                        </div>
                      </div>
                      <div className="border-t border-[#67ACA9]/10 pt-2 flex flex-col gap-1.5">
                        <span className="text-[#A4C2C5]/60 font-mono text-[9px] uppercase font-bold block">Personal Escolta Requerido:</span>

                        <div className="flex flex-wrap gap-1">
                          {(req.personRequirements || []).map(pr => {
                            const name = SPECIALISTS_OCCUPATIONS.find(o => o.id === pr.occupationId)?.name || pr.occupationId;
                            return (
                              <span key={pr.occupationId} className="px-2 py-0.5 bg-amber-950/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono rounded-xs font-bold font-sans">
                                {name} ({pr.quantity})
                              </span>
                            );
                          })}
                          {(req.personRequirements || []).length === 0 && (
                            <span className="text-[10px] text-[#A4C2C5]/40 italic pl-1">Sin escoltas adicionales requeridos.</span>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-[#67ACA9]/10 pt-3 mt-1 flex gap-2 justify-end">
                        <button
                          className="px-2.5 py-1 text-[10.5px] font-bold text-rose-400 hover:text-white bg-[#221015] hover:bg-rose-950/40 rounded border border-rose-950 hover:border-rose-900 cursor-pointer transition-colors"
                          onClick={() => {
                            if (confirm(`¿Rechazar esta solicitud de ${originName}?`)) {
                              onUpdateRequestStatus(req.id, "REJECTED", "Operario " + currentUser.userId);
                            }
                          }}
                        >
                          ✕ Rechazar
                        </button>
                        <button
                          className="px-3 py-1 text-[10.5px] font-black uppercase text-white bg-emerald-700 hover:bg-emerald-600 rounded border border-emerald-500/30 cursor-pointer transition-all"
                          onClick={() => { setEvaluatingReqId(req.id); setAssignedScoutId(""); setAdditionalPersonIds([]); setSearchPersonTerm(""); }}
                        >
                          ✓ Preparar aprobación
                        </button>
                      </div>

                    </div>
                  );
                })}

              {intercampRequests.filter(r => r.destinationCampId === currentUser.campId && r.status === "PENDING").length === 0 && (
                <div className="col-span-full text-center py-12 text-[#A4C2C5]/50 bg-[#080d0e]/30 border border-[#67ACA9]/10 rounded-sm">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2.5" />
                  <span className="text-xs uppercase font-bold tracking-wider">Sin Pendientes</span>
                  <p className="text-[11px] text-[#A4C2C5]/40 mt-1">No hay solicitudes entrantes dirigidas a este campamento como proveedor.</p>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
      {showSuccessToast && (
        <div className="fixed top-5 right-5 z-50 bg-[#0d1414] border-2 border-emerald-400 text-emerald-100 px-4 py-3 rounded-md shadow-[0_0_20px_rgba(52,211,153,0.3)] font-mono text-[11px] font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>✓ Solicitud aprobada y traslado programado con éxito.</span>
        </div>
      )}
      {validationPopup && (
        <div className="fixed top-5 right-5 z-50 bg-[#171007] border-2 border-amber-400 text-amber-100 px-4 py-3 rounded-md shadow-[0_0_20px_rgba(251,191,36,0.22)] font-mono text-[11px] font-bold flex items-start gap-2 max-w-sm">
          <AlertTriangle className="h-4 w-4 text-amber-300 mt-0.5 shrink-0" />
          <span className="leading-normal">{validationPopup}</span>
          <button
            type="button"
            onClick={() => setValidationPopup(null)}
            className="ml-2 text-amber-200/60 hover:text-white text-base leading-none"
          >
            ×
          </button>
        </div>
      )}
      {evaluatingReqId && evaluatingRequest && (
        (() => {
          const candidateScouts = destinationCampPeople.filter(p => (p.role ?? "").toLowerCase().includes("scout") || p.name.toLowerCase().includes("scout"));
          const scoutsToSelect = candidateScouts.length > 0 ? candidateScouts : destinationCampPeople;
          const additionalCandidates = destinationCampPeople.filter(p => p.id !== assignedScoutId);

          return createPortal(
            <div className="fixed inset-0 z-50 bg-[#000505]/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
              <div className="w-full max-w-sm bg-[#0b1213] border border-[#67ACA9]/30 rounded-md p-4 flex flex-col gap-2.5 text-gray-100 max-h-[90vh] overflow-y-auto shadow-2xl relative font-sans text-xs">
                <div className="flex justify-between items-center border-b border-[#67ACA9]/20 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 font-sans">
                      Evaluación Operacional y Asignación de Roster
                    </span>
                  </div>
                  <button
                    onClick={() => { setEvaluatingReqId(null); setAssignedScoutId(""); setAdditionalPersonIds([]); }}
                    className="text-gray-400 hover:text-white text-xs transition-colors p-1 cursor-pointer font-sans"
                    title="Cerrar"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex flex-col gap-2.5 font-sans text-xs text-slate-300">
                  <div className="grid grid-cols-2 bg-black/35 p-2 rounded border border-cyan-950 gap-2">
                    <div>
                      <span className="text-[10px] uppercase text-[#A4C2C5]/50 block">ID Solicitud</span>
                      <strong className="text-white font-mono">#{evaluatingRequest.id}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-[#A4C2C5]/50 block">Trayecto</span>
                      <span className="font-bold text-cyan-300 uppercase block">{evaluatingDestinationCampName} ➔ {evaluatingOriginCampName}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 bg-black/15 p-2 rounded border border-gray-900/60">
                    <div>
                      <span className="text-[10px] uppercase text-[#A4C2C5]/60 font-bold block mb-0.5">Recursos Demandados:</span>
                      <ul className="list-disc pl-4 text-[11px] font-semibold text-white space-y-0.5">
                        {evaluatingDetails.map(d => {
                          const type = resourceTypes.find(t => t.id === d.resourceTypeId);
                          return (
                            <li key={d.id}>
                              {type?.name || d.resourceTypeId}: {d.requestedAmount} {type?.unitOfMeasure || "u"}
                            </li>
                          );
                        })}
                        {evaluatingDetails.length === 0 && <li className="italic text-zinc-500">Ninguno</li>}
                      </ul>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-[#A4C2C5]/60 font-bold block mb-0.5">Especialidades Requeridas:</span>
                      <ul className="list-disc pl-4 text-[11px] font-semibold text-white space-y-0.5">
                        {(evaluatingRequest.personRequirements || []).map(pr => {
                          const name = SPECIALISTS_OCCUPATIONS.find(o => o.id === pr.occupationId)?.name || pr.occupationId;
                          return (
                            <li key={pr.occupationId}>
                              {name}: x{pr.quantity}
                            </li>
                          );
                        })}
                        {(evaluatingRequest.personRequirements || []).length === 0 && <li className="italic text-zinc-500">Ninguno</li>}
                      </ul>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[#A4C2C5]/70 font-bold uppercase tracking-wider text-[10px]">
                      1. Asignar Scout Principal (Obligatorio *)
                    </span>
                    <select
                      value={assignedScoutId}
                      onChange={e => setAssignedScoutId(e.target.value)}
                      className="bg-[#121c1e] text-white p-2 border border-cyan-950 rounded text-xs"
                    >
                      <option value="">[ Seleccionar Scout de {evaluatingDestinationCampName} ]</option>
                      {scoutsToSelect.map(sc => {
                        const occupied = isPersonAssignedToActiveTransferIdx(sc.id);
                        return (
                          <option key={sc.id} value={sc.id} disabled={occupied}>
                            {sc.name} ({sc.role}) {occupied ? " [OCUPADO]" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[#A4C2C5]/70 font-bold uppercase tracking-wider text-[10px]">
                        2. Asignar Personal Técnico de Escolta / Apoyo
                      </span>
                      <span className="text-[9px] text-[#69BFB7] font-mono">({additionalPersonIds.length} seleccionados)</span>
                    </div>
                    <div className="relative mb-0.5">
                      <input
                        type="text"
                        placeholder="Filtrar por nombre o especialidad..."
                        value={searchPersonTerm}
                        onChange={e => setSearchPersonTerm(e.target.value)}
                        className="w-full bg-[#121c1e] text-white p-1.5 border border-cyan-950 rounded text-[11px] placeholder-zinc-600"
                      />
                    </div>

                    <div className="bg-[#121c1e] border border-cyan-950 rounded p-1.5 max-h-[95px] overflow-y-auto flex flex-col gap-1.5">
                      {additionalCandidates.filter(p => {
                        const term = searchPersonTerm.toLowerCase();
                        return p.name.toLowerCase().includes(term) || (p.role ?? "").toLowerCase().includes(term);
                      }).map(p => {
                        const isChecked = additionalPersonIds.includes(p.id);
                        const occupied = isPersonAssignedToActiveTransferIdx(p.id);

                        return (
                          <label key={p.id} className="flex items-center justify-between bg-black/25 p-1 rounded border border-gray-950 hover:bg-black/40 hover:border-cyan-900/40 transition-colors cursor-pointer">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={occupied}
                                className="accent-cyan-400 h-3.5 w-3.5 cursor-pointer"
                                onChange={() => {
                                  if (isChecked) {
                                    setAdditionalPersonIds(prev => prev.filter(item => item !== p.id));
                                  } else {
                                    setAdditionalPersonIds(prev => [...prev, p.id]);
                                  }
                                }}
                              />
                              <div>
                                <span className="font-bold text-white block leading-tight text-[11px]">{p.name}</span>
                                <span className="text-[9px] text-zinc-500 font-mono italic leading-none">{p.role} {occupied && "[OCUPADO]"}</span>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                      {additionalCandidates.length === 0 && (
                        <div className="text-center py-2 text-zinc-600 italic">No hay más personal disponible.</div>
                      )}
                    </div>
                  </div>
                  <div className="bg-[#111e1c]/45 border border-[#52c2b3]/20 p-2 rounded-sm flex flex-col gap-1">
                    <span className="text-[#69BFB7] font-bold uppercase tracking-wider text-[10px] block">
                      3. Proyección de Raciones del Viaje
                    </span>
                    <div className="grid grid-cols-2 text-[11px] gap-x-4 gap-y-0.5 mt-0.5 font-mono">
                      <div>Días de viaje: <strong className="text-white">{computedDiffDays} d</strong></div>
                      <div>Efectivos en tránsito: <strong className="text-white">{totalTravelers} (Req + Ops)</strong></div>
                      <div>Stock en Proveedor: <strong className={foodInventoryCurrent >= rationsRequired ? "text-emerald-400" : "text-rose-400 font-bold"}>{foodInventoryCurrent} u</strong></div>
                      <div>Raciones requeridas: <strong className="text-amber-400">{rationsRequired} u</strong></div>
                    </div>
                    {resultingFoodAmount >= 0 ? (
                      <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                        ✓ Raciones suficientes. Stock remanente proyectado: {resultingFoodAmount} u.
                      </div>
                    ) : (
                      <div className="text-[10px] text-rose-400 font-bold mt-0.5">
                        ⚠ Almacén de comida insuficiente para abastecer a la comitiva. Falta: {Math.abs(resultingFoodAmount)} u.
                      </div>
                    )}
                  </div>
                  {validationErrors.length > 0 && (
                    <div className="bg-rose-950/25 border border-rose-800/35 p-1.5 rounded text-[11px] text-rose-300">
                      <span className="font-bold uppercase tracking-wider block mb-0.5">Restricciones encontradas:</span>
                      <ul className="list-disc pl-4 space-y-0.2">
                        {validationErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
                <div className="flex justify-end gap-2 border-t border-[#67ACA9]/25 pt-2 mt-1">
                  <button
                    onClick={() => { setEvaluatingReqId(null); setAssignedScoutId(""); setAdditionalPersonIds([]); }}
                    className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-[#1a2426] hover:bg-slate-800 rounded border border-gray-700 transition-all cursor-pointer font-sans font-bold"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={handleFinalApprove}
                    disabled={!canApprove}
                    className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded shadow-md transition-all font-sans cursor-pointer ${canApprove
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400"
                      : "bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed"
                      }`}
                  >
                    Aprobar y Crear Traslado
                  </button>
                </div>

              </div>
            </div>,
            document.body
          );
        })()
      )}
      {viewingReqId && (() => {
        const req = intercampRequests.find(r => r.id === viewingReqId);
        if (!req) return null;
        const originCampName = getCampDisplayName(camps, req.originCampId);
        const destinationCampName = getCampDisplayName(camps, req.destinationCampId);
        const details = requestResourceDetails.filter(d => d.requestId === req.id);

        return createPortal(
          <div className="fixed inset-0 z-50 bg-[#000505]/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-sm bg-[#0b1213] border border-[#67ACA9]/30 rounded-md p-5 flex flex-col gap-4 text-gray-100 max-h-[90vh] overflow-y-auto shadow-2xl relative font-sans text-xs">
              <div className="flex justify-between items-center border-b border-[#67ACA9]/20 pb-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-cyan-400 font-sans">
                  Ficha de Solicitud #{req.id}
                </span>
                <button onClick={() => setViewingReqId(null)} className="text-gray-400 hover:text-white text-sm transition-colors p-1 cursor-pointer">
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-black/35 p-2.5 rounded border border-cyan-950">
                <div>
                  <span className="text-[10px] uppercase text-[#A4C2C5]/50 block">Campamento Origen</span>
                  <strong className="text-emerald-400 font-sans uppercase font-bold">{originCampName}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-[#A4C2C5]/50 block">Campamento Proveedor</span>
                  <strong className="text-rose-400 font-sans uppercase font-bold">{destinationCampName}</strong>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 bg-black/20 p-2.5 rounded">
                <span className="text-[#69BFB7] font-bold uppercase text-[9px] font-mono">Justificación Operacional:</span>
                <span className="italic text-slate-300">"{req.description}"</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] font-mono leading-relaxed p-1.5 font-sans">
                <div>Salida Planificada:<br /><strong className="text-white">{req.plannedDepartureDate}</strong></div>
                <div>Llegada Planificada:<br /><strong className="text-white">{req.plannedArrivalDate}</strong></div>
              </div>

              <div className="border-t border-[#67ACA9]/10 pt-2 flex flex-col gap-1">
                <span className="text-[#A4C2C5]/60 font-mono text-[9px] uppercase font-bold block mb-1">Recursos Solicitados:</span>
                {details.map(d => {
                  const rType = resourceTypes.find(t => t.id === d.resourceTypeId);
                  return (
                    <div key={d.id} className="flex justify-between bg-black/15 font-mono px-2 py-0.5 border-l border-cyan-500/30 text-[10.5px]">
                      <span>{rType?.name || d.resourceTypeId}</span>
                      <strong className="text-cyan-300 font-bold">{d.requestedAmount} {rType?.unitOfMeasure || "u"}</strong>
                    </div>
                  );
                })}
                {details.length === 0 && <span className="text-zinc-500 italic pl-1">Ningún recurso solicitado.</span>}
              </div>

              <div className="border-t border-[#67ACA9]/10 pt-2 flex flex-col gap-1">
                <span className="text-[#A4C2C5]/60 font-mono text-[9px] uppercase font-bold block mb-1 font-sans">Especialidades de Escolta Requeridas:</span>
                <div className="flex flex-wrap gap-1">
                  {(req.personRequirements || []).map(pr => {
                    const name = SPECIALISTS_OCCUPATIONS.find(o => o.id === pr.occupationId)?.name || pr.occupationId;
                    return (
                      <span key={pr.occupationId} className="px-2 py-0.5 bg-amber-950/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono rounded font-bold font-sans">
                        {name} (x{pr.quantity})
                      </span>
                    );
                  })}
                  {(req.personRequirements || []).length === 0 && <span className="text-zinc-500 italic pl-1">Sin personal adicional requerido.</span>}
                </div>
              </div>

              <div className="border-t border-[#67ACA9]/10 pt-3 flex justify-end">
                <Btn small variant="ghost" onClick={() => setViewingReqId(null)}>
                  Cerrar
                </Btn>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
      {viewingTransferId && (() => {
        const transfer = transfers.find(t => t.id === viewingTransferId);
        if (!transfer) return null;
        const assocReq = intercampRequests.find(r => r.id === transfer.requestId);
        const originCampName = getCampDisplayName(camps, assocReq?.originCampId);
        const destinationCampName = getCampDisplayName(camps, assocReq?.destinationCampId);
        const crew = transferPersons.filter(tp => tp.transferId === transfer.id);
        const hist = transferHistories.filter(h => h.transferId === transfer.id);

        return createPortal(
          <div className="fixed inset-0 z-50 bg-[#000505]/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-sm bg-[#0b1213] border border-[#67ACA9]/30 rounded-md p-5 flex flex-col gap-4 text-gray-100 max-h-[90vh] overflow-y-auto shadow-2xl relative font-sans text-xs">
              <div className="flex justify-between items-center border-b border-[#67ACA9]/20 pb-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-[#58DDD3] font-sans flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  Concurrencia de Traslado #{transfer.id}
                </span>
                <button onClick={() => setViewingTransferId(null)} className="text-gray-400 hover:text-white text-sm transition-colors p-1 cursor-pointer">
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-black/35 p-2.5 rounded border border-cyan-950">
                <div>
                  <span className="text-[10px] uppercase text-[#A4C2C5]/50 block">Estado del Convoy</span>
                  <strong className="text-cyan-300 font-sans uppercase font-black tracking-wider text-[11px]">
                    {transfer.status === "PENDING_DEPARTURE" ? "Pendiente de Salida" : transfer.status === "IN_TRANSIT" ? "En Tránsito" : transfer.status === "COMPLETED" ? "Completado ✓" : "Cancelado ✕"}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-[#A4C2C5]/50 block">Raciones Reservadas</span>
                  <strong className="text-white font-mono text-[11px]">{transfer.rationsForTrip} unidades</strong>
                </div>
              </div>

              <div className="flex justify-between items-center bg-black/15 p-2 rounded">
                <div>
                  <span className="text-[9px] uppercase text-[#A4C2C5]/60 block font-sans">Trayecto</span>
                  <strong className="text-white font-sans uppercase text-[11.5px] font-bold">{destinationCampName} ➔ {originCampName}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase text-[#A4C2C5]/60 block font-sans">Solicitud de Origen</span>
                  <span className="text-cyan-300 font-mono text-[11px]">#{transfer.requestId}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[#A4C2C5]/60 font-mono text-[9px] uppercase font-bold block mb-1">Manifiesto de Comitiva Asignada ({crew.length} efectivos):</span>
                <div className="flex flex-col gap-1.5 p-1 bg-black/25 rounded">
                  {crew.map(member => {
                    const person = PEOPLE.find(p => String(p.id) === String(member.personId));
                    const isScout = person && ((person.role ?? "").toLowerCase().includes("scout") || person.name.toLowerCase().includes("scout"));
                    return (
                      <div key={member.id} className="flex justify-between text-[11px] font-sans px-2.5 py-1 bg-black/40 border border-gray-900 rounded-sm">
                        <span className="text-white font-semibold">{person?.name || member.personId}</span>
                        <span className={isScout ? "text-amber-400 font-bold" : "text-slate-400"}>
                          {person?.role} {isScout && " [Scout Obligatorio]"}
                        </span>
                      </div>
                    );
                  })}
                  {crew.length === 0 && <span className="text-zinc-500 italic">No hay personal asignado</span>}
                </div>
              </div>

              <div className="flex flex-col gap-1.5 font-sans">
                <span className="text-[#A4C2C5]/60 font-mono text-[9px] uppercase font-bold block font-sans">Historial de Operaciones:</span>
                <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                  {hist.map(item => (
                    <div key={item.id} className="text-[10px] p-2 bg-black/40 border border-zinc-900 rounded-sm font-sans flex flex-col gap-0.5">
                      <div className="flex justify-between font-mono text-[9px] text-[#69BFB7]">
                        <span>{new Date(item.date).toLocaleDateString("es-ES")} {new Date(item.date).toLocaleTimeString("es-ES")}</span>
                        <span className="uppercase text-amber-500 font-bold font-sans">[{item.newStatus}]</span>
                      </div>
                      <span className="text-slate-300 font-medium leading-normal italic">"{item.comment}"</span>
                    </div>
                  ))}
                  {hist.length === 0 && <span className="text-zinc-600 italic">No hay registros antiguos.</span>}
                </div>
              </div>

              <div className="border-t border-[#67ACA9]/10 pt-3 flex justify-end">
                <Btn small variant="ghost" onClick={() => setViewingTransferId(null)}>
                  Cerrar
                </Btn>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

    </SectionShell>
  );
}
export function ViewTraslados({
  camps,
  intercampRequests,
  transfers,
  transferPersons,
  onUpdateTransferStatus,
  onAddHistoryEntry,
  onUpdateTransportStaff,
  campPersonnel,
}: {
  camps: Camp[];
  resourceTypes: ResourceType[];
  intercampRequests: IntercampRequest[];
  requestResourceDetails: RequestResourceDetail[];
  transfers: Transfer[];
  setTransfers: React.Dispatch<React.SetStateAction<Transfer[]>>;
  transferPersons: TransferPerson[];
  setTransferPersons: React.Dispatch<React.SetStateAction<TransferPerson[]>>;
  transferHistories: TransferHistory[];
  setTransferHistories: React.Dispatch<React.SetStateAction<TransferHistory[]>>;
  campInventories: CampInventory[];
  setCampInventories: React.Dispatch<React.SetStateAction<CampInventory[]>>;
  deliveredTransferResources: DeliveredTransferResource[];
  onAddTransfer: (data: Omit<Transfer, "id">) => void;
  onUpdateTransferStatus: (id: string, status: Transfer["status"], notes: string) => void;
  onAddPersonToTransfer: (transferId: string, personId: string) => void;
  onUpdatePersonStatus: (id: string, updated: Partial<TransferPerson>) => void;
  onAddHistoryEntry: (data: Omit<TransferHistory, "id">) => void;
  onSaveDelivery: (data: Omit<DeliveredTransferResource, "id">) => void;
  onUpdateTransportStaff?: (transferId: string, transportPersonIds: string[]) => void | Promise<void>;
  campPersonnel?: CampPerson[];
}) {
  const PEOPLE = (campPersonnel && campPersonnel.length > 0) ? campPersonnel : ROSTER_PEOPLE;
  const RATION_FACTOR = 2;
  const [subFilterTab, setSubFilterTab] = useState<"por_preparar" | "solicitados" | "en_transito" | "cerrados">("por_preparar");

  const displayedTransfers = transfers.filter(t => {
    const req = intercampRequests.find(r => r.id === t.requestId);
    if (!req) return false;

    if (subFilterTab === "por_preparar") {
      return req.destinationCampId === currentUser.campId && t.status === "PENDING_DEPARTURE";
    }
    if (subFilterTab === "solicitados") {
      return req.originCampId === currentUser.campId;
    }
    if (subFilterTab === "en_transito") {
      return t.status === "IN_TRANSIT";
    }
    if (subFilterTab === "cerrados") {
      return t.status === "COMPLETED" || t.status === "CANCELED";
    }
    return true;
  });
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [editingTransferId, setEditingTransferId] = useState<string | null>(null);
  const [modalScoutId, setModalScoutId] = useState("");
  const [modalAdditionalIds, setModalAdditionalIds] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const displayToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };
  const getTravelDays = (t: Transfer) => {
    const dep = new Date(t.plannedDepartureDate);
    const arr = new Date(t.plannedArrivalDate);
    if (isNaN(dep.getTime()) || isNaN(arr.getTime())) return 1;
    return Math.max(1, Math.ceil((arr.getTime() - dep.getTime()) / (1000 * 60 * 60 * 24)));
  };
  const handleOpenEditModal = (tId: string) => {
    setEditingTransferId(tId);
    setValidationErrors([]);
    const assigned = transferPersons.filter(tp => tp.transferId === tId);
    const scoutAssigned = assigned.find(tp => {
      const person = PEOPLE.find(p => String(p.id) === String(tp.personId));
      return person && ((person.role ?? "").toLowerCase().includes("scout") || person.name.toLowerCase().includes("scout"));
    });

    if (scoutAssigned) {
      setModalScoutId(scoutAssigned.personId);
      setModalAdditionalIds(assigned.filter(tp => tp.personId !== scoutAssigned.personId).map(tp => tp.personId));
    } else {
      setModalScoutId("");
      setModalAdditionalIds(assigned.map(tp => tp.personId));
    }
  };
  const handleSaveManifest = async () => {
    if (!editingTransferId) return;

    const transfer = transfers.find(t => t.id === editingTransferId);
    const request = intercampRequests.find(r => r.id === transfer?.requestId);
    if (!transfer || !request) return;
    const errors: string[] = [];
    if (!modalScoutId) {
      errors.push("Debe asignar obligatoriamente un Scout activo.");
    }

    const selectedScoutObj = PEOPLE.find(p => String(p.id) === String(modalScoutId));
    if (selectedScoutObj && selectedScoutObj.status !== "ACTIVE") {
      errors.push("El Scout seleccionado debe estar en estado ACTIVO.");
    }
    if (modalAdditionalIds.includes(modalScoutId)) {
      errors.push("El Scout principal no puede ser agregado también como personal adicional.");
    }

    const uniqueAdditionals = Array.from(new Set(modalAdditionalIds));
    if (uniqueAdditionals.length !== modalAdditionalIds.length) {
      errors.push("No se permiten entradas duplicadas en el personal operativo.");
    }
    const isPersonOccupiedInOtherActiveTransfer = (pId: string) => {
      return transfers.some(t => {
        if (t.id === editingTransferId) return false;
        if (t.status !== "PENDING_DEPARTURE" && t.status !== "IN_TRANSIT") return false;
        return transferPersons.some(tp => tp.transferId === t.id && tp.personId === pId);
      });
    };

    if (modalScoutId && isPersonOccupiedInOtherActiveTransfer(modalScoutId)) {
      errors.push(`El Scout principal ${selectedScoutObj?.name || modalScoutId} ya está asignado a otro traslado en curso.`);
    }

    modalAdditionalIds.forEach(id => {
      const poObj = PEOPLE.find(p => String(p.id) === String(id));
      if (poObj && poObj.status !== "ACTIVE") {
        errors.push(`El personal adicional ${poObj.name} debe estar ACTIVO.`);
      }
      if (isPersonOccupiedInOtherActiveTransfer(id)) {
        errors.push(`El integrante ${poObj?.name || id} ya está asignado a otro traslado activo.`);
      }
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    const transportPersonIds = [modalScoutId, ...uniqueAdditionals].filter(Boolean);
    const daysOfTrip = getTravelDays(transfer);
    const totalStaff = transportPersonIds.length;
    const computedRations = totalStaff * daysOfTrip * RATION_FACTOR;

    if (onUpdateTransportStaff) {
      await onUpdateTransportStaff(editingTransferId, transportPersonIds);
    } else {
      onAddHistoryEntry({
        transferId: editingTransferId,
        previousStatus: transfer.status,
        newStatus: transfer.status,
        date: new Date().toISOString(),
        userId: currentUser.userId,
        comment: "Manifiesto de personal actualizado y verificado. Raciones calculadas: " + computedRations + " u."
      });
    }

    setEditingTransferId(null);
    displayToast("¡Manifiesto de traslado modificado correctamente!");
  };
  const handleCancelTransfer = (trId: string) => {
    const transfer = transfers.find(t => t.id === trId);
    const request = intercampRequests.find(r => r.id === transfer?.requestId);
    if (!transfer || !request) return;

    if (!confirm(`¿Está seguro de que desea cancelar el traslado ${trId}? Se devolverán los recursos correspondientes al almacén proveedor.`)) {
      return;
    }

    onUpdateTransferStatus(trId, "CANCELED", "El traslado ha sido cancelado formalmente. Inventario devuelto.");

    displayToast(`Traslado ${trId} cancelado. Recursos reincorporados.`);
  };

  return (
    <SectionShell kicker="Logística de Traslados" title="Control Unificado de Convoys">
      {showToast && (
        <div className="fixed top-24 right-5 z-50 bg-[#0c1e1c] border border-cyan-400 text-[#5ff7ea] text-xs font-bold px-4 py-2.5 rounded shadow-lg shadow-black/80 animate-fade-in flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-6 border-b border-[#67ACA9]/10 pb-3 mt-1">
        <button
          onClick={() => setSubFilterTab("por_preparar")}
          className={`px-2.5 sm:px-4 py-1.5 sm:py-2 font-bold uppercase tracking-wider rounded-md border cursor-pointer transition-all text-[10px] sm:text-xs ${subFilterTab === "por_preparar"
            ? "bg-[#67ACA9]/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-900/10"
            : "bg-black/30 border-gray-800 text-slate-400 hover:text-white"
            }`}
        >
          <Briefcase className="h-3 w-3 sm:h-3.5 sm:w-3.5 inline mr-1 text-amber-400" />
          Por preparar ({transfers.filter(t => { const req = intercampRequests.find(r => r.id === t.requestId); return req?.destinationCampId === currentUser.campId && t.status === "PENDING_DEPARTURE"; }).length})
        </button>
        <button
          onClick={() => setSubFilterTab("solicitados")}
          className={`px-2.5 sm:px-4 py-1.5 sm:py-2 font-bold uppercase tracking-wider rounded-md border cursor-pointer transition-all text-[10px] sm:text-xs ${subFilterTab === "solicitados"
            ? "bg-[#67ACA9]/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-900/10"
            : "bg-black/30 border-gray-800 text-slate-400 hover:text-white"
            }`}
        >
          <ArrowRightLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5 inline mr-1 text-cyan-400" />
          Solicitados por mi campamento ({transfers.filter(t => { const req = intercampRequests.find(r => r.id === t.requestId); return req?.originCampId === currentUser.campId; }).length})
        </button>
        <button
          onClick={() => setSubFilterTab("en_transito")}
          className={`px-2.5 sm:px-4 py-1.5 sm:py-2 font-bold uppercase tracking-wider rounded-md border cursor-pointer transition-all text-[10px] sm:text-xs ${subFilterTab === "en_transito"
            ? "bg-[#67ACA9]/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-900/10"
            : "bg-black/30 border-gray-800 text-slate-400 hover:text-white"
            }`}
        >
          <Truck className="h-3 w-3 sm:h-3.5 sm:w-3.5 inline mr-1 text-cyan-300" />
          En tránsito ({transfers.filter(t => t.status === "IN_TRANSIT").length})
        </button>
        <button
          onClick={() => setSubFilterTab("cerrados")}
          className={`px-2.5 sm:px-4 py-1.5 sm:py-2 font-bold uppercase tracking-wider rounded-md border cursor-pointer transition-all text-[10px] sm:text-xs ${subFilterTab === "cerrados"
            ? "bg-[#67ACA9]/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-900/10"
            : "bg-black/30 border-gray-800 text-slate-400 hover:text-white"
            }`}
        >
          <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 inline mr-1 text-emerald-400" />
          Cerrados ({transfers.filter(t => t.status === "COMPLETED" || t.status === "CANCELED").length})
        </button>
      </div>

      <div className="flex flex-col gap-4 animate-fade-in text-xs">
        <div className="bg-[#0b1213] border border-[#67ACA9]/20 rounded p-4 shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#58DDD3] border-b border-[#67ACA9]/10 pb-2.5 mb-3 flex justify-between items-center font-sans">
            <span>
              {subFilterTab === "por_preparar" && "Pendientes de Salida (Como Proveedor)"}
              {subFilterTab === "solicitados" && "Traslados Solicitados por Mi Campamiento"}
              {subFilterTab === "en_transito" && "Monitoreo en Tiempo Real - En Tránsito"}
              {subFilterTab === "cerrados" && "Historial de Operaciones Cerradas"}
            </span>
            <span className="text-[10px] text-zinc-500 lowercase font-mono font-normal">solo lectura salvo operativos y cancelaciones antes de salida</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans">
              <thead>
                <tr className="border-b border-cyan-950 text-[#69BFB7] text-[10px] uppercase tracking-wider font-mono">
                  <th className="py-2.5 font-bold">ID Traslado</th>
                  <th className="py-2.5 font-bold">Solicitud</th>
                  <th className="py-2.5 font-bold font-sans">Trayecto (Origen ➔ Destino)</th>
                  <th className="py-2.5 font-bold font-sans">Salida Planificada</th>
                  <th className="py-2.5 font-bold font-sans">Llegada Planificada</th>
                  <th className="py-2.5 font-bold font-sans">Estado</th>
                  <th className="py-2.5 font-bold font-sans">Raciones</th>
                  <th className="py-2.5 text-right font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#67ACA9]/5 text-slate-300 font-mono">
                {displayedTransfers.map(t => {
                  const req = intercampRequests.find(r => r.id === t.requestId);
                  const originCampName = getCampDisplayName(camps, req?.originCampId);
                  const destinationCampName = getCampDisplayName(camps, req?.destinationCampId);

                  return (
                    <tr key={t.id} className="hover:bg-slate-900/10 transition-colors">
                      <td className="py-3 font-mono font-bold text-white">{t.id}</td>
                      <td className="py-3 font-mono">#{t.requestId}</td>
                      <td className="py-3 uppercase font-semibold font-sans text-xs">
                        <span className="text-rose-400">{destinationCampName}</span>
                        <span className="text-slate-500 font-normal mx-1.5 font-mono">➔</span>
                        <span className="text-emerald-400">{originCampName}</span>
                      </td>
                      <td className="py-3 font-mono">{t.plannedDepartureDate}</td>
                      <td className="py-3 font-mono">{t.plannedArrivalDate}</td>
                      <td className="py-3 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${t.status === "COMPLETED"
                          ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                          : t.status === "CANCELED"
                            ? "bg-rose-950/40 text-rose-300 border-rose-500/30"
                            : t.status === "IN_TRANSIT"
                              ? "bg-cyan-950/40 text-cyan-300 border-cyan-500/30 font-bold"
                              : "bg-amber-950/40 text-amber-300 border-amber-500/30"
                          }`}>
                          {t.status === "PENDING_DEPARTURE" ? "Pendiente" : t.status === "IN_TRANSIT" ? "En Tránsito" : t.status === "COMPLETED" ? "Completado" : "Cancelado"}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-cyan-300 font-bold">
                        {t.rationsForTrip > 0 ? `${t.rationsForTrip} u` : "0 u"}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex gap-1.5 justify-end font-sans">

                          {subFilterTab === "por_preparar" && t.status === "PENDING_DEPARTURE" && (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(t.id)}
                                className="px-2 py-1 text-[10px] font-bold text-[#55f0df] hover:text-white bg-[#0e2421] hover:bg-teal-900/40 rounded border border-teal-800/40 cursor-pointer transition-all font-sans"
                              >
                                Editar operativos
                              </button>
                              <button
                                onClick={() => handleCancelTransfer(t.id)}
                                className="px-2 py-1 text-[10px] font-bold text-rose-400 hover:text-white bg-[#221015] hover:bg-rose-950/50 rounded border border-rose-950 hover:border-rose-800 cursor-pointer transition-all font-sans"
                              >
                                Cancelar
                              </button>
                            </>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })}
                {displayedTransfers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-500 italic font-sans font-normal">
                      {subFilterTab === "por_preparar" && "No hay traslados por preparar donde mi campamento es proveedor en este momento."}
                      {subFilterTab === "solicitados" && "No hay traslados solicitados por este campamento aún."}
                      {subFilterTab === "en_transito" && "No hay convoys en tránsito en este momento. Las salidas se inician de forma automática basada en la hora planificada de salida."}
                      {subFilterTab === "cerrados" && "No hay traslados cerrados en el historial."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {editingTransferId && (
        (() => {
          const selectedTransferObj = transfers.find(t => t.id === editingTransferId);
          const requestObj = intercampRequests.find(r => r.id === selectedTransferObj?.requestId);
          const originCampName = getCampDisplayName(camps, requestObj?.originCampId);
          const destCampName = getCampDisplayName(camps, requestObj?.destinationCampId);
          const providerCampPeople = PEOPLE.filter(p => String(p.campId) === String(requestObj?.destinationCampId));
          const candidateScouts = providerCampPeople.filter(p => (p.role ?? "").toLowerCase().includes("scout") || p.name.toLowerCase().includes("scout"));
          const candidateAdditional = providerCampPeople;
          const isPersonInOtherActiveTransfer = (pId: string) => {
            return transfers.some(t => {
              if (t.id === editingTransferId) return false;
              if (t.status !== "PENDING_DEPARTURE" && t.status !== "IN_TRANSIT") return false;
              return transferPersons.some(tp => tp.transferId === t.id && tp.personId === pId);
            });
          };

          return createPortal(
            <div className="fixed inset-0 z-50 bg-[#000505]/95 backdrop-blur-md flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-[#0b1213] border border-[#67ACA9]/30 rounded-md p-5 flex flex-col gap-3.5 text-gray-100 max-h-[92vh] overflow-y-auto shadow-2xl relative font-sans text-xs">
                <div className="flex justify-between items-center border-b border-[#67ACA9]/20 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-[#58DDD3]">
                      Modificar Personal de Convoy
                    </span>
                  </div>
                  <button
                    onClick={() => setEditingTransferId(null)}
                    className="text-gray-400 hover:text-white transition-colors p-1 text-[13px]"
                    title="Cerrar"
                  >
                    ✕
                  </button>
                </div>
                <div className="bg-black/35 p-2.5 rounded border border-cyan-950 text-[11px] flex justify-between gap-2">
                  <div>
                    <span className="text-[#A4C2C5]/50 block uppercase text-[10px]">Identificador Convoy</span>
                    <strong className="text-white font-mono">{editingTransferId}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[#A4C2C5]/50 block uppercase text-[10px]">Trayecto</span>
                    <span className="font-bold text-cyan-300 uppercase block">{destCampName} ➔ {originCampName}</span>
                  </div>
                </div>
                <div className="bg-black/25 p-2.5 rounded border border-[#67ACA9]/10 flex flex-col gap-1.5 font-sans">
                  <span className="text-amber-400 font-extrabold uppercase tracking-wide text-[9px]">
                    A) Personal Solicitado en el Oficio (Demanda del Origen)
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1 font-sans">
                    {requestObj?.personRequirements && requestObj.personRequirements.length > 0 ? (
                      requestObj.personRequirements.map(pr => {
                        const name = SPECIALISTS_OCCUPATIONS.find(o => o.id === pr.occupationId)?.name || pr.occupationId;
                        return (
                          <span key={pr.occupationId} className="px-1.5 py-0.5 bg-black/40 text-cyan-300 border border-cyan-900 rounded-sm text-[9px] font-mono">
                            {name}: {pr.quantity} Pax
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-zinc-500 italic text-[9.5px]">No se especificó personal en la solicitud original.</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1 bg-black/25 p-2.5 rounded border border-[#67ACA9]/10">
                  <span className="text-emerald-400 font-extrabold uppercase tracking-wider text-[9px]">
                    B) Scout obligatorio (Conductor/Escolta Principal *)
                  </span>
                  <select
                    value={modalScoutId}
                    onChange={e => setModalScoutId(e.target.value)}
                    className="bg-[#121c1e] text-white p-2 border border-cyan-950 rounded text-xs mt-1"
                  >
                    <option value="">[ Seleccione Scout activo ]</option>
                    {candidateScouts.map(sc => {
                      const occupied = isPersonInOtherActiveTransfer(sc.id);
                      return (
                        <option key={sc.id} value={sc.id} disabled={occupied}>
                          {sc.name} ({sc.role}) {occupied ? " [OCUPADO]" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="flex flex-col gap-1 bg-black/25 p-2.5 rounded border border-[#67ACA9]/10">
                  <span className="text-blue-400 font-extrabold uppercase tracking-wider text-[9px]">
                    C) Otros operativos opcionales (Agregados por gusto)
                  </span>

                  <div className="bg-[#121c1e] border border-cyan-950 rounded p-2 max-h-36 overflow-y-auto flex flex-col gap-1.5">
                    {candidateAdditional.filter(p => p.id !== modalScoutId).map(p => {
                      const isChecked = modalAdditionalIds.includes(p.id);
                      const occupied = isPersonInOtherActiveTransfer(p.id);

                      return (
                        <label key={p.id} className="flex items-center justify-between bg-black/20 p-2 rounded border border-gray-950 hover:bg-black/35 hover:border-cyan-900/30 transition-all cursor-pointer">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={occupied}
                              className="accent-cyan-400 h-3.5 w-3.5 cursor-pointer"
                              onChange={() => {
                                if (isChecked) {
                                  setModalAdditionalIds(prev => prev.filter(item => item !== p.id));
                                } else {
                                  setModalAdditionalIds(prev => [...prev, p.id]);
                                }
                              }}
                            />
                            <div>
                              <span className="font-bold text-white block leading-tight">{p.name}</span>
                              <span className="text-[9.5px] text-zinc-500 font-mono italic">{p.role} {occupied && "[OCUPADO]"}</span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                    {candidateAdditional.filter(p => p.id !== modalScoutId).length === 0 && (
                      <span className="text-center py-4 italic text-slate-600">No hay personal disponible.</span>
                    )}
                  </div>
                </div>
                {validationErrors.length > 0 && (
                  <div className="bg-rose-950/25 border border-rose-850/40 p-2.5 rounded text-[11px] text-rose-300">
                    <span className="font-bold uppercase tracking-wider block mb-1">Restricciones de Manifiesto Faltantes:</span>
                    <ul className="list-disc pl-3.5 space-y-0.5">
                      {validationErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex justify-end gap-2 border-t border-cyan-950 pt-3">
                  <button
                    onClick={() => setEditingTransferId(null)}
                    className="px-3 py-1 bg-[#1a2325] hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-gray-700 transition-all cursor-pointer"
                  >
                    Salir
                  </button>
                  <button
                    onClick={handleSaveManifest}
                    className="px-4 py-1 font-bold text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 rounded shadow-md transition-all cursor-pointer"
                  >
                    Validar y Guardar Manifiesto
                  </button>
                </div>

              </div>
            </div>,
            document.body
          );
        })()
      )}

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
  return (
    <SectionShell kicker="CONTROL LOGÍSTICO COMPLEMENTARIO" title="Movimiento de Expediciones">
      <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm flex flex-col gap-3">
        <div className="text-xs font-bold text-[#69BFB7] uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-2">Histórico de Consumos y Obtenciones (Movimientos)</div>

        <div className="v-table-wrap">
          <table className="v-table text-[10px]">
            <thead>
              <tr className="bg-black/25 font-mono text-[9px]">
                <th>Código Expedición</th>
                <th>Recurso Comercial</th>
                <th>Acción Operativa</th>
                <th>Cantidad Total</th>
                <th>Usuario Operador</th>
                <th>Fecha Reportada</th>
              </tr>
            </thead>
            <tbody>
              {expeditionsResources.slice().reverse().map(ex => {
                const rt = resourceTypes.find(t => t.id === ex.resourceTypeId);
                return (
                  <tr key={ex.id} className="hover:bg-white/5 border-b border-[#67ACA9]/5 leading-relaxed">
                    <td className="font-bold text-white">{ex.expeditionId}</td>
                    <td>{rt?.name || ex.resourceTypeId}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded-sm font-bold text-[8.5px] border uppercase ${ex.type === "CONSUMED" ? "border-rose-500/30 text-rose-300 bg-rose-950/20" : "border-emerald-500/30 text-emerald-300 bg-emerald-950/20"}`}>
                        {ex.type === "CONSUMED" ? "GASTO • CONSUMIDO" : "RECOLECTADO • BOTÍN"}
                      </span>
                    </td>
                    <td className="font-mono text-cyan-400 font-bold">{ex.amount} {rt?.unitOfMeasure || "un."},</td>
                    <td>{ex.recordedBy}</td>
                    <td>{ex.recordDate}</td>
                  </tr>
                );
              })}
              {expeditionsResources.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[#A4C2C5]/30 italic">No se han registrado movimientos de misiones o expediciones tácticas.</td>
                </tr>
              )}
            </tbody>
          </table>
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
  const [resourceTypeId, setResourceTypeId] = useState("2");
  const [sentAmount, setSentAmount] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [recordedBy, setRecordedBy] = useState("M. Operator");

  const completedTransfers = transfers.filter(t => t.status === "COMPLETED");

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

          <Btn variant="primary" onClick={() => { }} style={{ width: "100%", padding: "8px" }}>📊 Archivar Comprobante de Arribo</Btn>
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
                          <span className="px-1.5 py-0.5 rounded-sm bg-rose-950/20 border border-rose-500/20 text-rose-300 font-bold flex items-center gap-1 w-fit">
                            <AlertTriangle className="h-3 w-3 text-rose-400 shrink-0" />
                            <span>Faltan {dl.sentAmount - dl.receivedAmount} {rt?.unitOfMeasure}</span>
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
  campInventories,
  onUpdateInventory,
  onNavigateToSub
}: {
  resourceTypes: ResourceType[];
  campInventories: CampInventory[];
  onUpdateInventory: (campId: string, resourceTypeId: string, currentAmount: number, minimumAlertAmount: number) => void;
  onNavigateToSub?: (sub: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [detailResourceType, setDetailResourceType] = useState<ResourceType | null>(null);
  const [adjustResourceType, setAdjustResourceType] = useState<ResourceType | null>(null);
  const [adjustMinVal, setAdjustMinVal] = useState("");
  const [successToastMsgs, setSuccessToastMsgs] = useState<string[]>([]);

  const activeCampId = currentUser.campId;

  const triggerSuccessAlert = (msg: string) => {
    setSuccessToastMsgs(prev => [...prev, msg]);
    setTimeout(() => {
      setSuccessToastMsgs(prev => prev.slice(1));
    }, 4500);
  };

  const getInventoryDetails = (resourceTypeId: string) => {
    const inv = campInventories.find(item => item.campId === activeCampId && item.resourceTypeId === resourceTypeId);
    const currentAmount = inv ? inv.currentAmount : 0;
    const minimumAlertAmount = inv ? inv.minimumAlertAmount : 0;
    const isCritical = currentAmount <= minimumAlertAmount;
    const isWarning = currentAmount <= minimumAlertAmount * 1.5 && currentAmount > minimumAlertAmount;
    const statusLabel = isCritical ? "CRÍTICO" : isWarning ? "ALERTA" : "EXCELENTE";
    return {
      currentAmount,
      minimumAlertAmount,
      statusLabel,
      isCritical,
      isWarning
    };
  };

  const filteredTypes = resourceTypes.filter(rt => {
    const matchesSearch = rt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rt.description && rt.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategory === "ALL" || rt.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <SectionShell kicker="CENTRAL DE OPERACIONES" title="Inventario actual de recursos">
      <div className="flex flex-col gap-5">
        {successToastMsgs.length > 0 && (
          <div className="fixed bottom-5 right-5 z-[1000] flex flex-col gap-2 max-w-sm pointer-events-none">
            {successToastMsgs.map((msg, index) => (
              <div
                key={index}
                className="pointer-events-auto flex items-start gap-2.5 bg-[#0a1816]/95 border-2 border-emerald-400 px-4 py-3 rounded-sm shadow-2xl text-xs text-white uppercase font-mono tracking-wide animate-slideIn"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-emerald-400 text-[10px] font-black uppercase mb-1">¡OPERACIÓN EXITOSA!</strong>
                  <span>{msg}</span>
                </div>
                <button
                  className="ml-auto text-zinc-500 hover:text-white pl-2"
                  onClick={() => setSuccessToastMsgs(prev => prev.filter((_, idx) => idx !== index))}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
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
            Recursos coincidentes: <strong className="text-white font-mono">{filteredTypes.length}</strong>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm lg:col-span-8 flex flex-col gap-3">
            <div className="text-xs font-bold text-[#69BFB7] uppercase border-b border-[#67ACA9]/10 pb-1.5 flex justify-between items-center">
              <span>Existencias en Campamento Activo</span>
              <span className="text-[9px] text-[#A4C2C5]/50 uppercase font-normal">Rol: RESOURCE_MANAGEMENT</span>
            </div>

            <div className="v-table-wrap max-h-[450px] overflow-y-auto">
              <table className="v-table text-[11px]">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Categoría</th>
                    <th>Unidad</th>
                    <th className="text-right">Cantidad actual</th>
                    <th className="text-right">Mínimo permitido</th>
                    <th className="text-center">Estado</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTypes.map(rt => {
                    const { currentAmount, minimumAlertAmount, statusLabel, isCritical, isWarning } = getInventoryDetails(String(rt.id));
                    return (
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
                        <td className="text-right font-mono font-bold text-white">
                          {currentAmount} {rt.unitOfMeasure}
                        </td>
                        <td className="text-right font-mono font-semibold text-[#A4C2C5]/90">
                          {minimumAlertAmount} {rt.unitOfMeasure}
                        </td>
                        <td className="text-center">
                          <span className={`inline-flex items-center gap-1 font-mono text-[9px] font-black tracking-wider px-2 py-0.5 rounded-sm border ${isCritical
                            ? 'bg-rose-950/55 text-rose-400 border-rose-500/20'
                            : isWarning
                              ? 'bg-amber-950/55 text-amber-400 border-amber-500/20'
                              : 'bg-emerald-950/55 text-emerald-400 border-emerald-500/20'
                            }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isCritical ? 'bg-rose-400 animate-pulse' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                            {statusLabel}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex gap-1 justify-end items-center font-mono">
                            <Btn small variant="ghost" onClick={() => {
                              setDetailResourceType(rt);
                              setAdjustResourceType(null);
                            }}>
                              Detalle
                            </Btn>
                            <Btn small variant="ghost" onClick={() => {
                              setAdjustResourceType(rt);
                              setDetailResourceType(null);
                              setAdjustMinVal(minimumAlertAmount.toString());
                            }}>
                              Ajuste
                            </Btn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTypes.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-6 text-zinc-500 italic">
                        No se encontraron recursos en el campamento actual.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="lg:col-span-4 flex flex-col gap-4">
            {detailResourceType && (
              <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm flex flex-col gap-3 relative animate-fadeIn">
                <button
                  onClick={() => setDetailResourceType(null)}
                  className="absolute top-3 right-3 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white border border-rose-500/30 px-2.5 py-1 rounded-xs text-[10px] uppercase font-mono font-bold transition-all shadow-md shadow-rose-950/20"
                >
                  ✕ Cerrar
                </button>
                <div className="text-[10px] font-mono text-[#69BFB7] uppercase tracking-[3px] font-bold">FICHA DETALLADA</div>
                <h3 className="text-sm font-black text-white uppercase border-b border-[#67ACA9]/15 pb-1.5 mt-1">
                  {detailResourceType.name}
                </h3>
                {(() => {
                  const { currentAmount, minimumAlertAmount, statusLabel, isCritical, isWarning } = getInventoryDetails(String(detailResourceType.id));
                  return (
                    <div className="bg-[#0b1212] border border-[#67ACA9]/15 p-2.5 rounded-sm flex flex-col gap-2 font-mono text-[10px]">
                      <div className="text-[9px] text-[#69BFB7]/70 uppercase tracking-wider font-bold">Estado del recurso</div>
                      <div className="grid grid-cols-2 gap-2 text-white">
                        <div>
                          <span className="text-zinc-500">EXISTENCIA:</span>
                          <div className="font-bold text-sm text-[#69BFB7]">{currentAmount} {detailResourceType.unitOfMeasure}</div>
                        </div>
                        <div>
                          <span className="text-zinc-500">MÍNIMO ALERTA:</span>
                          <div className="font-bold text-sm text-yellow-500">{minimumAlertAmount} {detailResourceType.unitOfMeasure}</div>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center justify-between border-t border-[#67ACA9]/10 pt-1.5">
                        <span className="text-zinc-500">ESTADO OPERATIVO:</span>
                        <span className={`inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-sm border ${isCritical
                          ? 'bg-rose-950/55 text-rose-400 border-rose-500/20'
                          : isWarning
                            ? 'bg-amber-950/55 text-amber-400 border-amber-500/20'
                            : 'bg-emerald-950/55 text-emerald-400 border-emerald-500/20'
                          }`}>
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div className="bg-black/45 p-2.5 rounded-sm border border-[#67ACA9]/10 text-xs text-[#A4C2C5]/90 leading-relaxed font-mono">
                  <span className="block text-zinc-500 text-[9px] font-mono mb-1 uppercase">DESCRIPCIÓN OPERATIVA:</span>
                  {detailResourceType.description || "Sin descripción táctica registrada en el glosario central."}
                </div>

                <div className="grid grid-cols-2 gap-x-2 gap-y-3 font-mono text-[10px] text-[#A4C2C5]/80 py-1.5 border-t border-[#67ACA9]/10">
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

                <Btn
                  variant="ghost"
                  style={{ width: "100%", marginTop: "6px" }}
                  onClick={() => setDetailResourceType(null)}
                >
                  ✕ Cerrar Ficha
                </Btn>
              </div>
            )}
            {adjustResourceType && (
              <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm flex flex-col gap-3 relative animate-fadeIn">
                <button
                  onClick={() => setAdjustResourceType(null)}
                  className="absolute top-3 right-3 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white border border-rose-500/30 px-2.5 py-1 rounded-xs text-[10px] uppercase font-mono font-bold transition-all shadow-md shadow-rose-950/20"
                >
                  ✕ Cerrar
                </button>
                <div className="text-[10px] font-mono text-amber-400 uppercase tracking-[3px] font-bold">AJUSTE DE MÍNIMO</div>
                <h3 className="text-sm font-black text-white uppercase border-b border-[#67ACA9]/15 pb-1.5 mt-1">
                  {adjustResourceType.name}
                </h3>
                {(() => {
                  const { currentAmount } = getInventoryDetails(String(adjustResourceType.id));
                  return (
                    <div className="bg-black/35 p-2.5 rounded-sm border border-[#67ACA9]/10 text-xs text-[#A4C2C5]/90 leading-relaxed font-mono">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-zinc-500 text-[9px] uppercase">CANTIDAD ACTUAL (SOLO LECTURA):</span>
                      </div>
                      <div className="text-sm font-bold text-zinc-400 bg-zinc-950/40 border border-zinc-800 p-1.5 rounded-xs mt-0.5 font-mono">
                        {currentAmount} {adjustResourceType.unitOfMeasure}
                      </div>
                    </div>
                  );
                })()}
                <div className="flex flex-col gap-2 font-mono text-xs">
                  <label className="flex flex-col gap-1">
                    <span className="text-zinc-500 text-[9px] uppercase">MÍNIMO REQUERIDO DE ALERTA:</span>
                    <input
                      type="number"
                      className="v-input font-mono text-white text-sm"
                      value={adjustMinVal}
                      onChange={e => setAdjustMinVal(e.target.value)}
                      placeholder="Ej. 10"
                    />
                  </label>

                  <div className="flex gap-2 mt-1.5">
                    <Btn
                      variant="ghost"
                      style={{ flex: 1 }}
                      onClick={() => setAdjustResourceType(null)}
                    >
                      ✕ Cancelar
                    </Btn>
                    <Btn
                      variant="primary"
                      style={{ flex: 1.5 }}
                      onClick={() => {
                        const minNum = Number(adjustMinVal);
                        if (adjustMinVal.trim() === "" || isNaN(minNum) || minNum < 0) {
                          alert("Por favor ingrese un número entero o decimal válido no-negativo.");
                          return;
                        }

                        const { currentAmount } = getInventoryDetails(String(adjustResourceType.id));
                        onUpdateInventory(activeCampId, String(adjustResourceType.id), currentAmount, minNum);
                        triggerSuccessAlert(`Se modificó el mínimo de seguridad de "${adjustResourceType.name}" a ${minNum} ${adjustResourceType.unitOfMeasure} correctamente.`);
                        setAdjustResourceType(null);
                      }}
                    >
                      💾 Guardar Mínimo
                    </Btn>
                  </div>
                </div>
              </div>
            )}

            {!detailResourceType && !adjustResourceType && (
              <div className="mission-card border border-[#67ACA9]/10 bg-black/20 p-6 rounded-sm text-center text-zinc-500 italic text-xs h-full flex items-center justify-center">
                Seleccione "Detalle" o "Ajuste" en cualquier recurso para revisar sus especificaciones o cambiar el mínimo permitido.
              </div>
            )}

          </div>

        </div>

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
  occupations,
  resourceTypes
}: {
  occupations: Occupation[];
  resourceTypes: ResourceType[];
}) {
  return (
    <SectionShell kicker="DICCIONARIO OPERACIONAL DE CAMPAÑA" title="Glosario Oficial de Ocupaciones y Tipos de Recursos">
      <div className="flex flex-col gap-8">
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-5 rounded-sm flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#67ACA9]/20 pb-2.5">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-[#69BFB7] shrink-0" />
              <div>
                <h3 className="text-xs font-black text-[#69BFB7] uppercase tracking-wider">Tabla de Ocupaciones (Occupations Schema)</h3>
                <p className="text-[10px] text-[#A4C2C5]/60">Glosario oficial de oficios operativos y sus recolecciones asociadas</p>
              </div>
            </div>
            <span className="font-mono text-[9px] text-[#69BFB7] bg-[#67ACA9]/10 px-2 py-0.5 rounded border border-[#67ACA9]/20 font-bold uppercase">
              {occupations.length} Registradas
            </span>
          </div>

          <div className="v-table-wrap overflow-x-auto">
            <table className="v-table text-xs min-w-full">
              <thead>
                <tr className="border-b border-[#67ACA9]/25 text-left text-[9.5px] uppercase font-mono tracking-tight text-cyan-400/80">
                  <th className="py-2 px-3 text-center w-10">#</th>
                  <th className="py-2 px-4 w-12">id</th>
                  <th className="py-2 px-4 w-44">name</th>
                  <th className="py-2 px-4">description</th>
                  <th className="py-2 px-4 text-center w-32">collects_resources</th>
                  <th className="py-2 px-4 w-36">resource_type_id</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#67ACA9]/10">
                {occupations.map((occ, idx) => {
                  const rType = resourceTypes.find(t => t.id === occ.resource_type_id);
                  return (
                    <tr key={occ.id} className="hover:bg-cyan-950/20 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[10px] text-zinc-500 text-center font-bold">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-mono text-[10.5px] font-bold text-[#69BFB7]">{occ.id}</td>
                      <td className="py-2.5 px-4 font-black text-white text-[11px] tracking-tight">{occ.name}</td>
                      <td className="py-2.5 px-4 text-[10.5px] text-[#A4C2C5]/90 font-sans leading-relaxed">{occ.description}</td>
                      <td className="py-2.5 px-4 text-center font-mono">
                        <span className={`text-[10.5px] font-black ${occ.collects_resources
                          ? "text-emerald-400"
                          : "text-rose-400"
                          }`}>
                          {occ.collects_resources ? "t" : "f"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[10px]">
                        {occ.resource_type_id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-400 font-bold">{occ.resource_type_id}</span>
                            <span className="text-[9px] text-[#A4C2C5]/60">({rType?.name || ""})</span>
                          </div>
                        ) : (
                          <span className="text-zinc-600 block">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-5 rounded-sm flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#67ACA9]/20 pb-2.5">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-amber-400 shrink-0" />
              <div>
                <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider">Tabla de Tipos de Suministros (Resource Types Schema)</h3>
                <p className="text-[10px] text-[#A4C2C5]/60">Catálogo general de suministros de campaña con unidades métricas y categorías</p>
              </div>
            </div>
            <span className="font-mono text-[9px] text-amber-400 bg-amber-950/20 px-2 py-0.5 rounded border border-amber-500/20 font-bold uppercase">
              {resourceTypes.length} Registrados
            </span>
          </div>

          <div className="v-table-wrap overflow-x-auto">
            <table className="v-table text-xs min-w-full">
              <thead>
                <tr className="border-b border-[#67ACA9]/25 text-left text-[9.5px] uppercase font-mono tracking-tight text-amber-400/80">
                  <th className="py-2 px-3 text-center w-10">#</th>
                  <th className="py-2 px-4 w-12">id</th>
                  <th className="py-2 px-4 w-44">name</th>
                  <th className="py-2 px-4 w-32">unit_of_measure</th>
                  <th className="py-2 px-4 w-32">category</th>
                  <th className="py-2 px-4">description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#67ACA9]/10">
                {resourceTypes.map((rt, idx) => {
                  return (
                    <tr key={rt.id} className="hover:bg-amber-950/10 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[10px] text-zinc-500 text-center font-bold">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-mono text-[10.5px] font-bold text-amber-300">{rt.id}</td>
                      <td className="py-2.5 px-4 font-black text-white text-[11px] tracking-tight">{rt.name}</td>
                      <td className="py-2.5 px-4 font-mono text-[10.5px] text-cyan-400">{rt.unitOfMeasure}</td>
                      <td className="py-2.5 px-4 font-mono">
                        <span className="text-amber-300 text-[10px] font-bold uppercase tracking-tight">
                          {rt.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-[10.5px] text-[#A4C2C5]/90 font-sans leading-relaxed">{rt.description}</td>
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
  const campId = currentUser.campId;
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
              {camps.find(c => String(c.id) === String(campId))?.name || `Campamento ${campId}`} (Propio)
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

          <Btn type="submit" variant="primary" style={{ width: "100%", padding: "8px" }}>Transmitir Notificación</Btn>
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

          <Btn variant="primary" onClick={() => { }} style={{ width: "100%", padding: "8px" }}>Agregar Recurso</Btn>
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

          <Btn variant="primary" onClick={() => { }} style={{ width: "100%", padding: "8px" }}>Añadir Escolta de Convoy</Btn>
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
  intercampRequests,
  requestResourceDetails,
  camps,
  resourceTypes,
  occupations = [],
  onAddHistoryEntry
}: {
  transfers: Transfer[];
  transferHistories: TransferHistory[];
  intercampRequests: IntercampRequest[];
  requestResourceDetails: RequestResourceDetail[];
  camps: Camp[];
  resourceTypes: ResourceType[];
  occupations?: Occupation[];
  onAddHistoryEntry: (data: Omit<TransferHistory, "id">) => void;
}) {
  const [filterType, setFilterType] = useState<"ALL" | "REQUESTS" | "TRANSFERS" | "PENDING" | "APPROVED" | "COMPLETED">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [formTransferId, setFormTransferId] = useState("");
  const [previousStatus, setPreviousStatus] = useState<Transfer["status"]>("PENDING_DEPARTURE");
  const [newStatus, setNewStatus] = useState<Transfer["status"]>("COMPLETED");
  const [comment, setComment] = useState("");
  const [userId, setUserId] = useState("3");
  const unifiedItems: {
    keyId: string;
    type: "Solicitud" | "Traslado";
    origId: string;
    originCampId: string;
    destinationCampId: string;
    status: string;
    plannedDepartureDate: string;
    plannedArrivalDate: string;
    dateEvent: string;
    responsible: string;
    rawObject: any;
  }[] = [];
  intercampRequests.filter(r => r.status !== "DRAFT").forEach(req => {
    unifiedItems.push({
      keyId: `req-${req.id}`,
      type: "Solicitud",
      origId: req.id,
      originCampId: req.originCampId,
      destinationCampId: req.destinationCampId,
      status: req.status,
      plannedDepartureDate: req.plannedDepartureDate,
      plannedArrivalDate: req.plannedArrivalDate,
      dateEvent: req.plannedDepartureDate,
      responsible: req.respondedBy || req.createdBy || "Sistema",
      rawObject: req
    });
  });
  transfers.forEach(tr => {
    const assocReq = intercampRequests.find(r => r.id === tr.requestId);
    const origin = assocReq ? assocReq.originCampId : "Desc.";
    const dest = assocReq ? assocReq.destinationCampId : "Desc.";
    const resp = assocReq ? (assocReq.respondedBy || assocReq.createdBy) : "Sistema";
    const hist = transferHistories.filter(h => h.transferId === tr.id);
    const lastHistDate = hist.length > 0 ? hist[hist.length - 1].date : "Planeado";

    unifiedItems.push({
      keyId: `tr-${tr.id}`,
      type: "Traslado",
      origId: tr.id,
      originCampId: origin,
      destinationCampId: dest,
      status: tr.status,
      plannedDepartureDate: tr.plannedDepartureDate,
      plannedArrivalDate: tr.plannedArrivalDate,
      dateEvent: lastHistDate,
      responsible: resp,
      rawObject: tr
    });
  });
  unifiedItems.sort((a, b) => {
    const idA = parseInt(a.origId.replace(/\D/g, '')) || 0;
    const idB = parseInt(b.origId.replace(/\D/g, '')) || 0;
    if (idB !== idA) return idB - idA;
    return b.origId.localeCompare(a.origId);
  });
  const getStatusDisplay = (status: string, type: "Solicitud" | "Traslado") => {
    if (type === "Solicitud") {
      switch (status) {
        case "PENDING": return { text: "PENDIENTE", color: "bg-amber-950/25 text-amber-300 border border-amber-500/20 animate-pulse" };
        case "APPROVED": return { text: "APROBADO", color: "bg-emerald-950/25 text-emerald-300 border border-emerald-500/20" };
        case "REJECTED": return { text: "RECHAZADO", color: "bg-rose-950/25 text-rose-300 border border-rose-500/20" };
        case "CANCELED": return { text: "CANCELADO", color: "bg-zinc-950/20 text-zinc-400 border border-zinc-500/20" };
        default: return { text: status, color: "bg-zinc-950/20 text-zinc-400 border border-zinc-500/20" };
      }
    } else {
      switch (status) {
        case "PENDING_DEPARTURE": return { text: "PROGRAMADO", color: "bg-blue-950/25 text-blue-300 border border-blue-500/30" };
        case "COMPLETED": return { text: "COMPLETADO", color: "bg-emerald-950/30 text-emerald-300 border border-emerald-500/30" };
        case "CANCELED": return { text: "ANULADO", color: "bg-rose-950/30 text-rose-300 border border-rose-500/30" };
        default: return { text: status, color: "bg-zinc-950/30 text-zinc-400 border border-zinc-500/30" };
      }
    }
  };
  const filteredUnifiedItems = unifiedItems.filter(item => {
    const term = searchTerm.toLowerCase();
    const originCampName = getCampDisplayName(camps, item.originCampId);
    const destCampName = getCampDisplayName(camps, item.destinationCampId);
    const statusDisp = getStatusDisplay(item.status, item.type).text;

    const matchesSearch =
      item.origId.toLowerCase().includes(term) ||
      originCampName.toLowerCase().includes(term) ||
      destCampName.toLowerCase().includes(term) ||
      statusDisp.toLowerCase().includes(term) ||
      item.type.toLowerCase().includes(term);

    if (!matchesSearch) return false;
    if (filterType === "ALL") return true;
    if (filterType === "REQUESTS") return item.type === "Solicitud";
    if (filterType === "TRANSFERS") return item.type === "Traslado";
    if (filterType === "PENDING") return item.status === "PENDING" || item.status === "PENDING_DEPARTURE";
    if (filterType === "APPROVED") return item.status === "APPROVED" || item.status === "PENDING_DEPARTURE";
    if (filterType === "COMPLETED") return item.status === "COMPLETED";

    return true;
  });

  const historyPageSize = 10;
  const [historyPage, setHistoryPage] = useState(1);
  const totalHistoryPages = Math.max(1, Math.ceil(filteredUnifiedItems.length / historyPageSize));
  const safeHistoryPage = Math.min(historyPage, totalHistoryPages);
  const paginatedUnifiedItems = filteredUnifiedItems.slice(
    (safeHistoryPage - 1) * historyPageSize,
    safeHistoryPage * historyPageSize
  );

  useEffect(() => {
    setHistoryPage(1);
  }, [filterType, searchTerm]);

  const activeItem = filteredUnifiedItems.find(item => item.keyId === selectedKeyId) || paginatedUnifiedItems[0] || filteredUnifiedItems[0];
  let activeRequest: IntercampRequest | null = null;
  let activeTransfer: Transfer | null = null;

  if (activeItem) {
    if (activeItem.type === "Solicitud") {
      activeRequest = activeItem.rawObject as IntercampRequest;
      activeTransfer = transfers.find(t => t.requestId === activeRequest!.id) || null;
    } else {
      activeTransfer = activeItem.rawObject as Transfer;
      activeRequest = intercampRequests.find(r => r.id === activeTransfer!.requestId) || null;
    }
  }
  useEffect(() => {
    if (activeTransfer) {
      setFormTransferId(activeTransfer.id);
      setPreviousStatus(activeTransfer.status);
      if (activeTransfer.status === "PENDING_DEPARTURE") {
        setNewStatus("COMPLETED");
      } else {
        setNewStatus(activeTransfer.status);
      }
    } else {
      setFormTransferId("");
    }
  }, [activeTransfer]);
  const handleCreateLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTransferId || !previousStatus || !newStatus || !userId) {
      alert("Por favor complete todos los campos obligatorios.");
      return;
    }
    if (previousStatus === newStatus) {
      alert("El estado nuevo debe ser distinto al anterior.");
      return;
    }

    onAddHistoryEntry({
      transferId: formTransferId,
      previousStatus,
      newStatus,
      date: new Date().toLocaleDateString("es-ES") + " " + new Date().toLocaleTimeString("es-ES"),
      userId,
      comment: comment.trim() || "Tránsito y actualización voluntaria operacional"
    });

    setComment("");
  };

  return (
    <SectionShell kicker="CONTROL AUDITORÍA Y BITÁCORA" title="Historial Logístico">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-5 bg-[#0d1414]/90 p-3 border border-[#67ACA9]/20 rounded-xs">
        <div className="flex flex-wrap gap-1.5">
          {([
            { id: "ALL", label: "Todos" },
            { id: "REQUESTS", label: "Solicitudes" },
            { id: "TRANSFERS", label: "Traslados" },
            { id: "PENDING", label: "Pendientes / Planif" },
            { id: "APPROVED", label: "Aprobados / En Ruta" },
            { id: "COMPLETED", label: "Completados" }
          ] as const).map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-3 py-1.5 text-[9.5px] uppercase tracking-wider font-extrabold border rounded-xs transition-colors ${filterType === f.id
                ? "bg-[#67ACA9]/20 border-cyan-400 text-cyan-300 shadow-sm"
                : "bg-black/35 border-transparent text-[#A4C2C5]/60 hover:text-white"
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Buscar (ID, campamento, estado)..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="bg-black/50 border border-[#67ACA9]/25 px-3 py-1.5 text-[10.5px] text-white focus:outline-none focus:border-cyan-400 placeholder-[#A4C2C5]/30 rounded-xs w-full md:w-72 font-mono"
        />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-7 flex flex-col gap-3">
          <div className="mission-card border border-[#67ACA9]/25 bg-[#0d1414]/95 p-4 rounded-sm">
            <div className="text-[10px] font-black text-amber-300 uppercase tracking-widest border-b border-[#67ACA9]/10 pb-1.5 mb-3 flex justify-between items-center bg-black/10 px-2 py-1 rounded-sm">
              <span>Registro de Operaciones de Enlace</span>
              <span className="font-mono text-[9px] text-[#A4C2C5]/60">
                {filteredUnifiedItems.length} En Base · Página {safeHistoryPage}/{totalHistoryPages}
              </span>
            </div>

            <div className="v-table-wrap max-h-[500px] overflow-y-auto">
              <table className="v-table text-[10.5px]">
                <thead>
                  <tr className="bg-black/35 font-mono text-[9.5px]">
                    <th>Tipo</th>
                    <th>ID</th>
                    <th>Camp. Origen</th>
                    <th>Camp. Destino</th>
                    <th>Estado</th>
                    <th>Salida Planif.</th>
                    <th>Entrada Planif.</th>
                    <th>F. Respuesta/Evento</th>
                    <th>Responsable</th>
                    <th className="text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUnifiedItems.map(item => {
                    const isSelected = activeItem && activeItem.keyId === item.keyId;
                    const originCampName = getCampDisplayName(camps, item.originCampId);
                    const destCampName = getCampDisplayName(camps, item.destinationCampId);
                    const statusObj = getStatusDisplay(item.status, item.type);

                    return (
                      <tr
                        key={item.keyId}
                        onClick={() => setSelectedKeyId(item.keyId)}
                        className={`cursor-pointer transition-colors leading-normal text-[10.5px] ${isSelected
                          ? "bg-[#67ACA9]/15 hover:bg-[#67ACA9]/20 border-l border-cyan-400 font-medium"
                          : "hover:bg-[#67ACA9]/5 border-b border-[#67ACA9]/5"
                          }`}
                      >
                        <td className="py-2.5 px-1.5">
                          <span className={`px-1.5 py-0.5 rounded-xs font-mono font-black text-[8px] tracking-wider uppercase border ${item.type === "Solicitud"
                            ? "bg-cyan-950/20 text-cyan-400 border-cyan-500/20"
                            : "bg-purple-950/20 text-purple-300 border-purple-500/20"
                            }`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="font-bold font-mono text-white text-[11px] px-1">{item.origId}</td>
                        <td className="font-bold text-white uppercase text-[10.5px] px-1 max-w-[80px] truncate" title={originCampName}>{originCampName}</td>
                        <td className="font-bold text-white uppercase text-[10.5px] px-1 max-w-[80px] truncate" title={destCampName}>{destCampName}</td>
                        <td className="px-1 text-center">
                          <span className={`px-1.5 py-0.5 rounded-xs font-mono font-black text-[8.5px] ${statusObj.color}`}>
                            {statusObj.text}
                          </span>
                        </td>
                        <td className="font-mono text-[#A4C2C5]/70 text-[9.5px] px-1">{item.plannedDepartureDate}</td>
                        <td className="font-mono text-[#A4C2C5]/70 text-[9.5px] px-1">{item.plannedArrivalDate}</td>
                        <td className="font-mono text-cyan-400 text-[9.5px] px-1 leading-tight">{item.dateEvent}</td>
                        <td className="font-mono text-zinc-300 text-[9.5px] px-1 italic truncate max-w-[70px]" title={item.responsible}>{item.responsible}</td>
                        <td className="px-2 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedKeyId(item.keyId);
                            }}
                            className={`px-2 py-0.5 rounded-xs font-black uppercase text-[8.5px] tracking-wider transition-all border ${isSelected
                              ? "bg-cyan-400 text-black border-cyan-400"
                              : "bg-black/40 text-cyan-300 border-cyan-400/25 hover:bg-cyan-400 hover:text-black"
                              }`}
                          >
                            Detalle
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUnifiedItems.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-16 text-[#A4C2C5]/40 italic font-mono">No se hallaron registros coincidentes en la bitácora logística.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredUnifiedItems.length > historyPageSize && (
              <div className="flex items-center justify-between gap-3 border-t border-[#67ACA9]/10 pt-3 mt-3">
                <span className="text-[9.5px] text-[#A4C2C5]/55 uppercase font-mono">
                  Mostrando {((safeHistoryPage - 1) * historyPageSize) + 1}-{Math.min(safeHistoryPage * historyPageSize, filteredUnifiedItems.length)} de {filteredUnifiedItems.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 text-[10px] font-black uppercase border border-[#67ACA9]/25 text-[#A4C2C5] hover:text-white hover:border-[#69BFB7] disabled:opacity-30 disabled:hover:text-[#A4C2C5] disabled:hover:border-[#67ACA9]/25"
                    disabled={safeHistoryPage <= 1}
                    onClick={() => setHistoryPage(page => Math.max(1, page - 1))}
                  >
                    Anterior
                  </button>
                  <span className="text-[10px] text-white font-mono font-black">{safeHistoryPage}/{totalHistoryPages}</span>
                  <button
                    type="button"
                    className="px-3 py-1.5 text-[10px] font-black uppercase border border-[#67ACA9]/25 text-[#A4C2C5] hover:text-white hover:border-[#69BFB7] disabled:opacity-30 disabled:hover:text-[#A4C2C5] disabled:hover:border-[#67ACA9]/25"
                    disabled={safeHistoryPage >= totalHistoryPages}
                    onClick={() => setHistoryPage(page => Math.min(totalHistoryPages, page + 1))}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="xl:col-span-5 flex flex-col gap-4">
          <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/95 p-4 rounded-sm flex flex-col gap-4">
            <div className="border-b border-[#67ACA9]/15 pb-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9.5px] font-mono tracking-wider text-[#69BFB7] font-extrabold uppercase">Expediente de Enlace Logístico</span>
                <span className="font-semibold text-[#A4C2C5]/50 bg-black/40 px-2 py-0.5 rounded-xs text-[9px] font-mono whitespace-nowrap">
                  {activeItem.type === "Solicitud" ? "Registro Solicitante" : "Fase de Ejecución"}
                </span>
              </div>
              <h3 className="text-sm font-black text-white uppercase mt-0.5 tracking-tight flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>EXPEDIENTE: {activeItem.type} #{activeItem.origId}</span>
              </h3>
            </div>
            {activeRequest ? (
              <div className="bg-black/35 border border-[#67ACA9]/10 p-3 rounded-xs flex flex-col gap-2.5">
                <div className="flex items-center justify-between border-b border-[#67ACA9]/10 pb-1.5">
                  <h4 className="text-[10px] font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    <span>1. Solicitud Base #{activeRequest.id}</span>
                  </h4>
                  <span className={`px-1.5 py-0.2 rounded-xs font-mono font-black text-[8px] uppercase ${getStatusDisplay(activeRequest.status, "Solicitud").color}`}>
                    {getStatusDisplay(activeRequest.status, "Solicitud").text}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-[10.5px]">
                  <div>
                    <span className="text-zinc-500 font-mono text-[9px] block">Campamento Origen:</span>
                    <span className="text-white font-extrabold uppercase font-mono">{getCampDisplayName(camps, activeRequest!.originCampId)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-mono text-[9px] block">Campamento Destino:</span>
                    <span className="text-white font-extrabold uppercase font-mono">{getCampDisplayName(camps, activeRequest!.destinationCampId)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] bg-black/45 p-2 rounded-xs border border-gray-950">
                  <div>
                    <span className="text-zinc-500 font-mono block">Salida Teorica:</span>
                    <span className="text-[#A4C2C5] font-mono font-semibold">{activeRequest.plannedDepartureDate}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-mono block">Llegada Teorica:</span>
                    <span className="text-[#A4C2C5] font-mono font-semibold">{activeRequest.plannedArrivalDate}</span>
                  </div>
                </div>

                {activeRequest.description && (
                  <div>
                    <span className="text-[9px] text-zinc-500 block font-mono">Motivación / Justificación:</span>
                    <blockquote className="text-[10px] text-[#A4C2C5]/90 italic bg-cyan-950/15 px-2.5 py-1.5 border-l-2 border-cyan-400 rounded-r-sm leading-relaxed">
                      "{activeRequest.description}"
                    </blockquote>
                  </div>
                )}
                <div>
                  <span className="text-[9px] text-zinc-500 block font-mono mb-1">Recursos Planificados:</span>
                  <div className="flex flex-col gap-1 bg-[#0d1414]/90 p-2 border border-[#67ACA9]/10 rounded-xs">
                    {requestResourceDetails.filter(d => d.requestId === activeRequest!.id).length > 0 ? (
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        {requestResourceDetails.filter(d => d.requestId === activeRequest!.id).map(d => {
                          const type = resourceTypes.find(t => t.id === d.resourceTypeId);
                          return (
                            <div key={d.id} className="flex justify-between items-center bg-black/40 px-2 py-0.5 rounded-sm">
                              <span className="text-[#A4C2C5] font-bold text-[9.5px]">{type?.name || d.resourceTypeId}</span>
                              <span className="text-cyan-400 font-black font-mono">{d.requestedAmount} {type?.unitOfMeasure || "u"}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-[9.5px] text-gray-500 italic block">No se listaron recursos solicitados.</span>
                    )}
                  </div>
                </div>
                {activeRequest.personRequirements && activeRequest.personRequirements.length > 0 && (
                  <div>
                    <span className="text-[9px] text-zinc-500 block font-mono mb-1">Guarnición de Escolta:</span>
                    <div className="flex flex-wrap gap-1">
                      {activeRequest.personRequirements.map(pr => {
                        const matchOcc = occupations.find(o => o.id === pr.occupationId);
                        const alias = matchOcc ? matchOcc.name : pr.occupationId;
                        return (
                          <span key={pr.occupationId} className="px-2 py-0.5 bg-cyan-500/10 text-cyan-300 font-mono text-[9px] border border-cyan-500/20 rounded-xs flex items-center gap-1">
                            <Users className="h-2.5 w-2.5 text-cyan-400" />
                            <span>{alias}: {pr.quantity}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-black/20 border border-dashed border-gray-800 rounded-xs text-center text-zinc-500 text-[10px] italic">
                Ninguna solicitud base hallada para este expediente.
              </div>
            )}
            {activeTransfer ? (
              <div className="bg-black/35 border border-amber-900/15 p-3 rounded-xs flex flex-col gap-2.5">
                <div className="flex items-center justify-between border-b border-amber-500/10 pb-1.5">
                  <h4 className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                    <Truck className="h-3 w-3" />
                    <span>2. Ejecución Logística: Convoy #{activeTransfer.id}</span>
                  </h4>
                  <span className={`px-1.5 py-0.2 rounded-xs font-mono font-black text-[8px] uppercase ${getStatusDisplay(activeTransfer.status, "Traslado").color}`}>
                    {getStatusDisplay(activeTransfer.status, "Traslado").text}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                  <div>
                    <span className="text-zinc-500 font-mono text-[9px] block">Raciones para el Viaje:</span>
                    <span className="text-amber-400 font-extrabold font-mono text-[11px]">{activeTransfer.rationsForTrip} kg de provisiones</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-mono text-[9px] block">Asociado a Demanda:</span>
                    <span className="text-cyan-400 font-mono font-black text-[11px]">#{activeTransfer.requestId}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[9.5px] bg-black/40 p-2 border border-amber-500/10 rounded-xs">
                  <div>
                    <span className="text-zinc-500 block">Salida Real Planif:</span>
                    <span className="text-[#A4C2C5] font-mono leading-tight">{activeTransfer.plannedDepartureDate}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Entrada Real Planif:</span>
                    <span className="text-[#A4C2C5] font-mono leading-tight">{activeTransfer.plannedArrivalDate}</span>
                  </div>
                </div>
                <div className="border-t border-amber-500/10 pt-2 pb-1.5">
                  <h5 className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>3. Bitácora de Sucesos de Tránsito</span>
                    <span className="text-[8px] text-[#A4C2C5]/40 leading-none">Historial Auditoría</span>
                  </h5>

                  <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {transferHistories.filter(h => h.transferId === activeTransfer!.id).length === 0 ? (
                      <p className="text-[9.5px] text-zinc-500 italic py-1.5 select-none text-center">Sin hitos cargados. Use el formulario inferior para loggear novedades.</p>
                    ) : (
                      [...transferHistories].filter(h => h.transferId === activeTransfer!.id).reverse().map(h => (
                        <div key={h.id} className="p-2 bg-black/50 border-l border-amber-500/30 rounded-r-xs flex flex-col gap-0.5 text-[9.5px] leading-relaxed">
                          <div className="flex items-center justify-between gap-1 flex-wrap text-[8px]">
                            <span className="text-emerald-400 font-bold font-mono text-[8.5px] uppercase">{h.previousStatus} ➜ {h.newStatus}</span>
                            <span className="text-zinc-500 font-mono">{h.date}</span>
                          </div>
                          <p className="text-zinc-300 italic font-mono bg-black/15 px-1.5 py-0.5 rounded-xs mt-0.5">"{h.comment}"</p>
                          <div className="text-right text-[8px] text-[#A4C2C5]/40">UID Operador: {h.userId}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <form onSubmit={handleCreateLog} className="border-t border-[#67ACA9]/20 pt-3 mt-2 flex flex-col gap-2 bg-black/25 p-2 rounded-xs">
                  <span className="text-[9.5px] font-black uppercase text-amber-400 block tracking-widest font-mono">Registrar Evento de Tránsito (Ruta)</span>

                  <div className="grid grid-cols-2 gap-1.5">
                    <label className="flex flex-col gap-0.5 text-[9px]">
                      <span className="text-[#A4C2C5]/60 font-semibold uppercase">Estado Anterior *</span>
                      <select
                        value={previousStatus}
                        onChange={e => setPreviousStatus(e.target.value as any)}
                        className="bg-black border border-[#67ACA9]/30 text-[9px] text-[#69BFB7] p-1 rounded-sm focus:outline-none"
                      >
                        <option value="PENDING_DEPARTURE">PENDING_DEPARTURE</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="CANCELED">CANCELED</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-0.5 text-[9px]">
                      <span className="text-[#A4C2C5]/60 font-semibold uppercase">Nuevo Estado *</span>
                      <select
                        value={newStatus}
                        onChange={e => setNewStatus(e.target.value as any)}
                        className="bg-black border border-[#67ACA9]/30 text-[9px] text-amber-300 p-1 rounded-sm focus:outline-none"
                      >
                        <option value="PENDING_DEPARTURE">PENDING_DEPARTURE</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="CANCELED">CANCELED</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <label className="flex flex-col gap-0.5 text-[9px] col-span-1">
                      <span className="text-[#A4C2C5]/60 font-medium">Registrador *</span>
                      <input
                        type="text"
                        value={userId}
                        onChange={e => setUserId(e.target.value)}
                        className="bg-black border border-[#67ACA9]/30 px-1.5 py-0.5 text-[9.5px] text-white rounded-sm font-mono focus:outline-none focus:border-cyan-400"
                        placeholder="ID"
                      />
                    </label>
                    <label className="flex flex-col gap-0.5 text-[9px] col-span-2">
                      <span className="text-[#A4C2C5]/60 font-medium">Comentario / Reporte de Hito *</span>
                      <input
                        type="text"
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        className="bg-black border border-[#67ACA9]/30 px-1.5 py-0.5 text-[9.5px] text-[#A4C2C5] rounded-sm focus:outline-none focus:border-cyan-400 placeholder-[#A4C2C5]/20"
                        placeholder="e.g. Convoy partió a ruta segura"
                        required
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="px-2 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[9px] uppercase tracking-wider rounded-xs transition-colors mt-1"
                  >
                    Publicar Evento a la Bitácora
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-black/30 border border-dashed border-amber-500/20 p-4 rounded-xs text-center">
                <Truck className="h-6 w-6 text-amber-500/40 mx-auto mb-1 animate-pulse" />
                <span className="text-[10px] text-amber-400/80 font-mono font-bold block uppercase">Estatus: Enlace Pendiente De Envío</span>
                <p className="text-[9.5px] text-[#A4C2C5]/50 italic mt-1 leading-normal">
                  La demanda de enlace está aprobada base, pero todavía no cuenta con un convoy/cronograma logístico de tránsitos programado en la red.
                </p>
              </div>
            )}

          </div>
        </div>

      </div>
    </SectionShell>
  );
}
export function ViewPersonalDashboard({
  camps,
  campInventories,
  inventoryMovements,
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
  const activeCampId = currentUser.campId;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const triggerRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };
  const [localExpeditions] = useState({
    PLANNED: 2,
    IN_PROGRESS: 1,
    DELAYED: 0,
    COMPLETED: 5,
    LOST: 1,
    CANCELED: 1
  });

  const [simulatedEfectivos, setSimulatedEfectivos] = useState(0);

  const handleAddSpecialistLocal = () => {
    setSimulatedEfectivos(prev => prev + 1);
  };
  const baseGarrisonCount = camps.find(c => c.id === activeCampId)?.personnelCount || 35;
  const totalGarrison = baseGarrisonCount + simulatedEfectivos;
  const criticalStockCount = campInventories.filter(ci => ci.campId === activeCampId && ci.currentAmount <= ci.minimumAlertAmount).length;
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
        <Btn onClick={triggerRefresh}>{isRefreshing ? "Sincronizando..." : "Sincronizar personal"}</Btn>
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
              BASE ALFA CENTRALIZADA
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
            onClick={() => onNavigateToSub("Inventario actual")}
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
                  <AlertCircle className="h-2 w-2 text-[#69BFB7] shrink-0" />
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
            onClick={() => onNavigateToSub("Glosario")}
            className="text-[10px] font-mono text-[#69BFB7] hover:underline uppercase text-left w-fit cursor-pointer font-bold mt-3"
          >
            VER GLOSARIO DE OFICIOS →
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
                      <stop offset="5%" stopColor={CHART_THEME.teal} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_THEME.teal} stopOpacity={0} />
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
            <h3 className="text-xs font-bold text-white uppercase mt-0.5">Nóminas de Especialistas en Base Alfa</h3>
          </div>

          <Btn small onClick={() => onNavigateToSub("Glosario")}>
            Ver Glosario de Oficios
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