import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { WorldMap } from "../../expeditions-ui/components/WorldMap";
import { fetchPersons } from "../../persons/api/queries";
import type { Person } from "../../persons/types";
import { deletePerson, updatePerson } from "../../persons/api/mutations";
import { fetchCamps } from "../../camps/api/queries";
import type { Camp } from "../../camps/types";
import { fetchOccupations } from "../../catalogs/api/queries";
import type { Occupation } from "../../catalogs/types";
import {
  completeExpedition,
  getDeliveredTransferResourceById,
  getExpeditionsDashboard,
  getGeneralDashboard,
  getInventoryDashboard,
  getIntercampRequestById,
  getTransferById,
  getTransferHistoryById,
  getTransferPersonById,
  listActiveExpeditions,
  listAdmissionRequests,
  listNotifications,
  updateAdmissionRequestStatus,
} from "../../admin-dashboard/services";
import {
  extractNumberByHint,
  mapAdmissionFromApi,
  mapExpeditionFromApi,
  mapIntercampFromApi,
  mapNotificationFromApi,
} from "../../admin-dashboard/mappers/adminMappers";
import { ExpeditionsWorldMap } from "../../admin-dashboard/expeditions/components/ExpeditionsWorldMap";
import type { MappedCampPoint } from "../../admin-dashboard/expeditions/types";
import { SESSION_TOKEN_CHANGED_EVENT } from "../../../shared/services/sessionService";
import "../../expeditions-ui/expeditionsUi.css";
import "../../admin-dashboard/expeditions/expeditions-panel.css";
import "./admin-dashboard-ui-v2.css";

type AdminSectionId =
  | "centro"
  | "poblacion"
  | "admisiones"
  | "inventario"
  | "expediciones"
  | "intercamp"
  | "seguridad"
  | "notificaciones"
  | "configuracion";

interface NavItem {
  id: AdminSectionId;
  label: string;
  icon: ReactNode;
  subOptions: string[];
}

interface UiAdmission {
  id: number;
  name: string;
  profession: string;
  score: number;
  badge: string | null;
  status: "pending" | "approved" | "rejected";
  skills: string[];
  reason: string;
}

interface UiExpedition {
  id: number;
  name: string;
  day: number;
  total: number;
  participants: string[];
  status: "EN CURSO" | "PROGRAMADA" | "REGRESANDO" | "COMPLETADA";
  objective: string;
  sector: string;
}

interface UiIntercampRequest {
  id: number;
  from: string;
  text: string;
  time: string;
  status: "PENDIENTE" | "APROBADO" | "RECHAZADO" | "CONFIRMADO";
  urgent: boolean;
  type: "solicitud" | "traslado" | "oferta";
}

interface UiNotification {
  id: number;
  title: string;
  body: string;
  time: string;
  read: boolean;
  level: "critical" | "warning" | "info";
}

interface DashboardKpi {
  populationTotal: number;
  criticalResources: number;
  activeExpeditions: number;
  pendingIntercamp: number;
  activePopulation: number;
  injuredPopulation: number;
  sickPopulation: number;
  outPopulation: number;
}

interface SessionAdminUser {
  id?: number;
  username?: string;
  role?: string;
  campId?: number;
  profileImage?: string;
  avatar?: string;
  photo?: string;
}

interface AdminProfileSummary {
  id: number | null;
  username: string;
  displayName: string;
  role: string;
  occupation: string;
  camp: string;
  status: string;
  avatarUrl: string;
  sessionState: "ACTIVA" | "INACTIVA";
}

const SESSION_TIMEOUT_MS = 20 * 60 * 1000;

interface TempRoleAssignment {
  id: number;
  personId: number;
  personName: string;
  fromRole: string;
  tempRole: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "ACTIVA" | "FINALIZADA";
}

const NAVIGATION_DATA: NavItem[] = [
  { id: "centro", label: "Centro de Mando", icon: <RadarIcon />, subOptions: ["Resumen táctico", "Monitoreo general"] },
  { id: "poblacion", label: "Población", icon: <ProfileIcon />, subOptions: ["Estadísticas", "Usuarios", "Roles temporales"] },
  { id: "admisiones", label: "Admisiones IA", icon: <ShieldIcon />, subOptions: ["Pendientes", "Historial"] },
  { id: "inventario", label: "Inventario", icon: <CrateIcon />, subOptions: ["Resumen", "Ítems", "Movimientos", "Alertas", "Recolección"] },
  {
    id: "expediciones",
    label: "Expediciones",
    icon: <CompassIcon />,
    subOptions: ["Mapa operativo", "Misiones activas", "Historial", "Recursos"],
  },
  { id: "intercamp", label: "Inter-campamentos", icon: <VehicleIcon />, subOptions: ["Pendientes", "Historial"] },
  { id: "seguridad", label: "Seguridad", icon: <SecurityIcon />, subOptions: ["En vivo", "Errores", "Sistema"] },
  { id: "notificaciones", label: "Notificaciones", icon: <AlertIcon />, subOptions: ["Todas", "No leídas", "Críticas"] },
  { id: "configuracion", label: "Configuración", icon: <GearIcon />, subOptions: ["Campamento", "Sistema"] },
];

const BOTTOM_DOCK_ORDER: AdminSectionId[] = ["poblacion", "admisiones", "expediciones", "intercamp"];

const SECTION_DESCRIPTIONS: Record<AdminSectionId, string> = {
  centro: "Vista global del sistema, alertas y salud operativa del campamento.",
  poblacion: "Gestión de supervivientes, estado individual y asignaciones temporales.",
  admisiones: "Análisis asistido para admisiones nuevas y validación de perfiles.",
  inventario: "Control de recursos, niveles críticos, movimientos y ajustes.",
  expediciones: "Seguimiento de operaciones de campo, rutas y resultados.",
  intercamp: "Solicitudes y traslados entre campamentos aliados.",
  seguridad: "Auditoría, trazas y eventos críticos del sistema.",
  notificaciones: "Centro de notificaciones con priorización por severidad.",
  configuracion: "Parámetros operativos y políticas del panel administrativo.",
};

const SAMPLE_INTERCAMP: UiIntercampRequest[] = [
  {
    id: 1001,
    from: "CAMPAMENTO NORTE",
    text: "Requieren traslado de 40kg de alimento deshidratado.",
    time: "hace 2h",
    status: "PENDIENTE",
    urgent: true,
    type: "solicitud",
  },
  {
    id: 1002,
    from: "CAMPAMENTO DELTA",
    text: "Oferta de repuestos para módulo de agua.",
    time: "hace 5h",
    status: "CONFIRMADO",
    urgent: false,
    type: "oferta",
  },
];

const INITIAL_DASHBOARD_KPI: DashboardKpi = {
  populationTotal: 0,
  criticalResources: 0,
  activeExpeditions: 0,
  pendingIntercamp: 0,
  activePopulation: 0,
  injuredPopulation: 0,
  sickPopulation: 0,
  outPopulation: 0,
};

const RESOURCE_TREND_DATA = [
  { day: "D-6", food: 85, water: 72, ammo: 90 },
  { day: "D-5", food: 80, water: 68, ammo: 85 },
  { day: "D-4", food: 74, water: 55, ammo: 82 },
  { day: "D-3", food: 65, water: 40, ammo: 78 },
  { day: "D-2", food: 53, water: 25, ammo: 70 },
  { day: "D-1", food: 38, water: 15, ammo: 68 },
  { day: "HOY", food: 23, water: 8, ammo: 67 },
];

const FALLBACK_NOTIFICATIONS: UiNotification[] = [
  { id: 1, title: "ALERTA CRÍTICA: Agua potable", body: "Stock de agua bajo el umbral operativo.", time: "hace 30min", read: false, level: "critical" },
  { id: 2, title: "Admisión pendiente", body: "Perfil requiere revisión de seguridad.", time: "hace 45min", read: false, level: "warning" },
  { id: 3, title: "Expedición activa", body: "Grupo en curso sin novedades reportadas.", time: "hace 2h", read: false, level: "info" },
];

const SIMULATED_EXPEDITION_POINTS: MappedCampPoint[] = [
  {
    id: 9001,
    name: "Base Alfa",
    latitude: 9.9281,
    longitude: -84.0907,
    status: "ACTIVE",
    currentPopulation: 247,
    capacity: 320,
  },
  {
    id: 9002,
    name: "Hospital Norte",
    latitude: 10.0206,
    longitude: -84.2141,
    status: "COMPROMISED",
    currentPopulation: 0,
    capacity: 80,
  },
  {
    id: 9003,
    name: "Bodega Industrial",
    latitude: 9.9988,
    longitude: -84.1198,
    status: "ACTIVE",
    currentPopulation: 0,
    capacity: 50,
  },
  {
    id: 9004,
    name: "Pozo Este",
    latitude: 9.8845,
    longitude: -83.9437,
    status: "UNDER_CONSTRUCTION",
    currentPopulation: 0,
    capacity: 40,
  },
  {
    id: 9005,
    name: "Sector Sur",
    latitude: 9.7489,
    longitude: -84.1043,
    status: "ABANDONED",
    currentPopulation: 0,
    capacity: 60,
  },
];

const SIMULATED_EXPEDITIONS: UiExpedition[] = [
  {
    id: 101,
    name: "Expedición Norte",
    day: 3,
    total: 5,
    participants: ["JR", "MA", "PC", "LS"],
    status: "EN CURSO",
    objective: "Buscar suministros médicos en el hospital abandonado del sector norte.",
    sector: "Hospital Norte",
  },
  {
    id: 102,
    name: "Ruta de Agua Este",
    day: 1,
    total: 4,
    participants: ["AN", "RV", "KT"],
    status: "EN CURSO",
    objective: "Verificar pozo este, instalar filtros temporales y recuperar bidones.",
    sector: "Pozo Este",
  },
  {
    id: 103,
    name: "Retorno Grupo Delta",
    day: 4,
    total: 5,
    participants: ["CA", "MT", "PB", "RQ"],
    status: "REGRESANDO",
    objective: "Regresar con piezas eléctricas recuperadas de una bodega industrial.",
    sector: "Bodega Industrial",
  },
  {
    id: 104,
    name: "Exploración Sector Sur",
    day: 0,
    total: 3,
    participants: ["DN", "AS", "FG"],
    status: "PROGRAMADA",
    objective: "Reconocer una posible ruta segura hacia el sector sur.",
    sector: "Sector Sur",
  },
  {
    id: 105,
    name: "Misión Generadores",
    day: 5,
    total: 5,
    participants: ["WN", "SK", "LR", "PR"],
    status: "COMPLETADA",
    objective: "Recuperar generadores portátiles y baterías de respaldo.",
    sector: "Bodega Industrial",
  },
];

function expeditionRouteStatus(status: UiExpedition["status"]): string {
  if (status === "PROGRAMADA") return "PLANNED";
  if (status === "REGRESANDO") return "DELAYED";
  if (status === "COMPLETADA") return "COMPLETED";
  return "IN_PROGRESS";
}

function buildExpeditionRoute(expedition: UiExpedition, points: MappedCampPoint[]) {
  const base = points[0] ?? SIMULATED_EXPEDITION_POINTS[0];
  const destinations = points.filter((point) => point.id !== base.id);
  const destination = destinations[expedition.id % Math.max(1, destinations.length)] ?? SIMULATED_EXPEDITION_POINTS[1];

  return {
    start: { lat: base.latitude, lng: base.longitude, label: "Base" },
    end: { lat: destination.latitude, lng: destination.longitude, label: destination.name.slice(0, 14) },
    status: expeditionRouteStatus(expedition.status),
  };
}

const INITIAL_TEMP_ASSIGNMENTS: TempRoleAssignment[] = [];

function normalizeStatusLabel(status: Person["status"]): string {
  if (status === "ACTIVE") return "Activo";
  if (status === "INJURED") return "Herido";
  if (status === "MISSING") return "Desaparecido";
  return "Fallecido";
}

function legacyPopulationStatus(status: Person["status"]): "Activo" | "Herido" | "Enfermo" | "Fuera" {
  if (status === "ACTIVE") return "Activo";
  if (status === "INJURED") return "Herido";
  return "Fuera";
}

function expeditionPillClass(status: UiExpedition["status"]): string {
  if (status === "EN CURSO") return "is-info";
  if (status === "PROGRAMADA") return "is-neutral";
  if (status === "REGRESANDO") return "is-warn";
  return "is-ok";
}

function intercampPillClass(status: UiIntercampRequest["status"]): string {
  if (status === "PENDIENTE") return "is-warn";
  if (status === "APROBADO") return "is-ok";
  if (status === "RECHAZADO") return "is-danger";
  return "is-info";
}

function personFullName(person: Person): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

function readSessionAdminUser(): SessionAdminUser {
  try {
    const rawUser = localStorage.getItem("user");
    if (!rawUser) return {};
    const parsed = JSON.parse(rawUser) as SessionAdminUser;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeRoleLabel(role?: string): string {
  if (!role) return "Sin rol";
  if (role === "SYSTEM_ADMIN") return "Administrador del sistema";
  if (role === "RESOURCE_MANAGEMENT") return "Gestión de recursos";
  if (role === "TRAVEL_MANAGER") return "Encargado de viajes";
  if (role === "WORKER") return "Trabajador";
  return role.replace(/_/g, " ");
}

function resolveAdminProfileImage(sessionUser: SessionAdminUser, matchedPerson: Person | null): string {
  const storedProfileImage =
    (typeof sessionUser.profileImage === "string" && sessionUser.profileImage.trim()) ||
    (typeof sessionUser.avatar === "string" && sessionUser.avatar.trim()) ||
    (typeof sessionUser.photo === "string" && sessionUser.photo.trim()) ||
    "";

  if (storedProfileImage) {
    return storedProfileImage;
  }

  if (typeof sessionUser.id === "number") {
    return `https://i.pravatar.cc/96?img=${(sessionUser.id % 69) + 1}`;
  }

  if (matchedPerson) {
    return `https://i.pravatar.cc/96?img=${(matchedPerson.id % 69) + 1}`;
  }

  return "https://i.pravatar.cc/80?img=12";
}

export default function AdminDashboardUiV2Page() {
  const navigate = useNavigate();

  const [hasEntered] = useState(true);

  const [activeNav, setActiveNav] = useState<AdminSectionId>("centro");
  const [activeSub, setActiveSub] = useState<string>(NAVIGATION_DATA.find((item) => item.id === "centro")?.subOptions[0] ?? "Resumen táctico");

  const [isDataLoading, setIsDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [persons, setPersons] = useState<Person[]>([]);
  const [camps, setCamps] = useState<Camp[]>([]);
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [admissions, setAdmissions] = useState<UiAdmission[]>([]);
  const [expeditions, setExpeditions] = useState<UiExpedition[]>([]);
  const [intercampRequests, setIntercampRequests] = useState<UiIntercampRequest[]>(SAMPLE_INTERCAMP);
  const [dashboardKpi, setDashboardKpi] = useState<DashboardKpi>(INITIAL_DASHBOARD_KPI);
  const [notifications, setNotifications] = useState<UiNotification[]>(FALLBACK_NOTIFICATIONS);
  const [countdown, setCountdown] = useState({ h: 3, m: 28, s: 0 });
  const [threatLevel, setThreatLevel] = useState(72);
  const [lookupId, setLookupId] = useState("");
  const [sessionState, setSessionState] = useState<"ACTIVA" | "INACTIVA">("INACTIVA");
  const [lastActivityAt, setLastActivityAt] = useState(Date.now());

  const loadCoreData = useCallback(async () => {
    setIsDataLoading(true);
    setDataError(null);
    try {
      const [
        personsData,
        campsData,
        occupationsData,
        admissionsData,
        expeditionsData,
        generalDashboard,
        inventoryDashboard,
        expeditionsDashboard,
        notificationRecords,
      ] = await Promise.all([
        fetchPersons(),
        fetchCamps(),
        fetchOccupations(),
        listAdmissionRequests(),
        listActiveExpeditions(),
        getGeneralDashboard(),
        getInventoryDashboard(),
        getExpeditionsDashboard(),
        listNotifications(),
      ]);

      setPersons(personsData);
      setCamps(campsData);
      setOccupations(occupationsData);
      setAdmissions(admissionsData.map((item) => mapAdmissionFromApi(item) as UiAdmission));
      setExpeditions(expeditionsData.map((item) => mapExpeditionFromApi(item) as UiExpedition));
      setDashboardKpi({
        populationTotal: extractNumberByHint(generalDashboard, ["population", "persons", "totalpeople", "total"], personsData.length),
        criticalResources: extractNumberByHint(inventoryDashboard, ["critical", "alert", "low"], 0),
        activeExpeditions: extractNumberByHint(expeditionsDashboard, ["active", "ongoing"], expeditionsData.length),
        pendingIntercamp: extractNumberByHint(generalDashboard, ["intercamp", "transfer", "pending"], SAMPLE_INTERCAMP.length),
        activePopulation: extractNumberByHint(generalDashboard, ["active", "healthy"], personsData.filter((person) => person.status === "ACTIVE").length),
        injuredPopulation: extractNumberByHint(generalDashboard, ["injured"], personsData.filter((person) => person.status === "INJURED").length),
        sickPopulation: extractNumberByHint(generalDashboard, ["sick", "ill"], 0),
        outPopulation: extractNumberByHint(generalDashboard, ["missing", "outside", "out"], personsData.filter((person) => person.status === "MISSING").length),
      });
      if (notificationRecords.length > 0) {
        setNotifications(notificationRecords.map((item) => mapNotificationFromApi(item) as UiNotification));
      }
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "No se pudo cargar la data inicial");
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasEntered) return;
    void loadCoreData();
  }, [hasEntered, loadCoreData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        const { h, m, s } = prev;
        if (s > 0) return { h, m, s: s - 1 };
        if (m > 0) return { h, m: m - 1, s: 59 };
        if (h > 0) return { h: h - 1, m: 59, s: 59 };
        return { h: 0, m: 0, s: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setThreatLevel((prev) => Math.min(95, Math.max(38, prev + Math.floor(Math.random() * 7) - 3)));
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const markActivity = () => setLastActivityAt(Date.now());
    const events: Array<keyof WindowEventMap> = ["mousemove", "mousedown", "click", "keydown", "touchstart", "scroll"];
    events.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));
    return () => events.forEach((eventName) => window.removeEventListener(eventName, markActivity));
  }, []);

  useEffect(() => {
    const evaluateSession = () => {
      const hasToken = Boolean(localStorage.getItem("token"));
      if (!hasToken) {
        setSessionState("INACTIVA");
        return;
      }

      const idleMs = Date.now() - lastActivityAt;
      setSessionState(idleMs >= SESSION_TIMEOUT_MS ? "INACTIVA" : "ACTIVA");
    };

    evaluateSession();

    const interval = setInterval(evaluateSession, 1000);
    const onTokenChanged = () => evaluateSession();
    window.addEventListener(SESSION_TOKEN_CHANGED_EVENT, onTokenChanged);

    return () => {
      clearInterval(interval);
      window.removeEventListener(SESSION_TOKEN_CHANGED_EVENT, onTokenChanged);
    };
  }, [lastActivityAt]);

  const handleNavClick = (navId: AdminSectionId) => {
    const nextNavId: AdminSectionId = activeNav === navId ? "centro" : navId;
    const navItem = NAVIGATION_DATA.find((item) => item.id === nextNavId);
    if (!navItem) return;
    setActiveNav(nextNavId);
    setActiveSub(navItem.subOptions[0]);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event(SESSION_TOKEN_CHANGED_EVENT));
    navigate("/");
  };

  const campNameById = useMemo(() => {
    const map = new Map<number, string>();
    camps.forEach((camp) => map.set(camp.id, camp.name));
    return map;
  }, [camps]);

  const occupationNameById = useMemo(() => {
    const map = new Map<number, string>();
    occupations.forEach((occupation) => map.set(occupation.id, occupation.name));
    return map;
  }, [occupations]);

  const adminProfile = useMemo<AdminProfileSummary>(() => {
    const sessionUser = readSessionAdminUser();
    const matchedPerson = typeof sessionUser.id === "number" ? persons.find((person) => person.id === sessionUser.id) : null;
    const displayName = matchedPerson ? personFullName(matchedPerson) : sessionUser.username ?? "Administrador";
    const occupation = matchedPerson ? occupationNameById.get(matchedPerson.occupationId) ?? `Ocupación #${matchedPerson.occupationId}` : "No disponible";
    const campId = matchedPerson?.campId ?? sessionUser.campId;
    const camp = typeof campId === "number" ? campNameById.get(campId) ?? `Campamento #${campId}` : "Sin asignar";
    const status = matchedPerson ? normalizeStatusLabel(matchedPerson.status) : "Sin registro";

    return {
      id: typeof sessionUser.id === "number" ? sessionUser.id : matchedPerson?.id ?? null,
      username: sessionUser.username ?? "sin-usuario",
      displayName,
      role: normalizeRoleLabel(sessionUser.role),
      occupation,
      camp,
      status,
      avatarUrl: resolveAdminProfileImage(sessionUser, matchedPerson),
      sessionState,
    };
  }, [persons, occupationNameById, campNameById, sessionState]);

  const populationStats = useMemo(() => {
    const total = persons.length;
    const active = persons.filter((person) => person.status === "ACTIVE").length;
    const injured = persons.filter((person) => person.status === "INJURED").length;
    const missing = persons.filter((person) => person.status === "MISSING").length;
    return { total, active, injured, missing };
  }, [persons]);

  const admissionsQueue = admissions.filter((admission) => admission.status === "pending");
  const admissionsHistory = admissions.filter((admission) => admission.status !== "pending");

  const activeNavData = NAVIGATION_DATA.find((item) => item.id === activeNav) ?? NAVIGATION_DATA[0];
  const isDashboardView = activeNav === "centro";

  const handleAdmissionDecision = async (id: number, decision: "approved" | "rejected") => {
    try {
      await updateAdmissionRequestStatus(id, decision);
      setAdmissions((prev) => prev.map((admission) => (admission.id === id ? { ...admission, status: decision } : admission)));
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "No se pudo actualizar la admisión");
    }
  };

  const handleCompleteExpedition = async (id: number) => {
    try {
      await completeExpedition(id);
      setExpeditions((prev) => prev.map((expedition) => (expedition.id === id ? { ...expedition, status: "COMPLETADA" } : expedition)));
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "No se pudo completar la expedición");
    }
  };

  const handleLookupIntercamp = async () => {
    const id = Number(lookupId);
    if (!Number.isFinite(id) || id <= 0) {
      setDataError("Ingresa un ID válido para buscar registros inter-campamento");
      return;
    }

    setDataError(null);

    const loaders = [
      () => getIntercampRequestById(id),
      () => getTransferById(id),
      () => getTransferHistoryById(id),
      () => getTransferPersonById(id),
      () => getDeliveredTransferResourceById(id),
    ];

    for (const load of loaders) {
      try {
        const record = await load();
        const mapped = mapIntercampFromApi(record) as UiIntercampRequest;
        setIntercampRequests((prev) => [mapped, ...prev.filter((item) => item.id !== mapped.id)]);
        return;
      } catch {
        // Keep trying remaining endpoints
      }
    }

    setDataError("No se encontró un registro inter-campamento con ese ID");
  };

  return (
    <div className="game-screen-layout text-[#A4C2C5]">
      <div className="holo-grid" />

      {hasEntered && <TopHud onBack={() => navigate("/admin-main-view-ui")} onLogout={handleLogout} profile={adminProfile} />}

      {hasEntered && (
        <div className="main-area">
          <div className="content-scroll">
            <SectionTitle title={activeNavData.label} />
            <section aria-label="Panel administrativo táctico" className="settings-shell h-full w-full">
              <div className="paint-glow" aria-hidden="true" />
              <div className="settings-inner h-full" style={{ padding: "42px 0 0 0", overflow: "hidden" }}>
                <div className="watermark-x" aria-hidden="true" />
                {isDashboardView ? (
                  <div className="inner-content admin-ui-v2-content-wrap admin-ui-v2-content-wrap-full">
                    <ContentArea
                      section={activeNav}
                      sub={activeSub}
                      isDataLoading={isDataLoading}
                      dataError={dataError}
                      persons={persons}
                      dashboardKpi={dashboardKpi}
                      notifications={notifications}
                      countdown={countdown}
                      threatLevel={threatLevel}
                      populationStats={populationStats}
                      admissions={admissions}
                      admissionsQueue={admissionsQueue}
                      admissionsHistory={admissionsHistory}
                      expeditions={expeditions}
                      intercampRequests={intercampRequests}
                      lookupId={lookupId}
                      setLookupId={setLookupId}
                      onLookupIntercamp={handleLookupIntercamp}
                      campCatalog={camps}
                      campNameById={campNameById}
                      occupationNameById={occupationNameById}
                      onAdmissionDecision={handleAdmissionDecision}
                      onCompleteExpedition={handleCompleteExpedition}
                      onUpdateIntercampStatus={setIntercampRequests}
                      onPopulationReload={loadCoreData}
                      onDashboardReload={loadCoreData}
                      onQuickNav={handleNavClick}
                      onSetDataError={setDataError}
                    />
                  </div>
                ) : (
                  <div className="inner-layout">
                    <aside className="inner-sidebar">
                      <SideMenu items={activeNavData.subOptions} activeItem={activeSub} onSelect={setActiveSub} />
                    </aside>
                    <div className="inner-divider" />
                    <div className="inner-content admin-ui-v2-content-wrap">
                      <ContentArea
                        section={activeNav}
                        sub={activeSub}
                        isDataLoading={isDataLoading}
                        dataError={dataError}
                        persons={persons}
                        dashboardKpi={dashboardKpi}
                        notifications={notifications}
                        countdown={countdown}
                        threatLevel={threatLevel}
                        populationStats={populationStats}
                        admissions={admissions}
                        admissionsQueue={admissionsQueue}
                        admissionsHistory={admissionsHistory}
                        expeditions={expeditions}
                        intercampRequests={intercampRequests}
                        lookupId={lookupId}
                        setLookupId={setLookupId}
                        onLookupIntercamp={handleLookupIntercamp}
                        campCatalog={camps}
                        campNameById={campNameById}
                        occupationNameById={occupationNameById}
                        onAdmissionDecision={handleAdmissionDecision}
                        onCompleteExpedition={handleCompleteExpedition}
                        onUpdateIntercampStatus={setIntercampRequests}
                        onPopulationReload={loadCoreData}
                        onDashboardReload={loadCoreData}
                        onQuickNav={handleNavClick}
                        onSetDataError={setDataError}
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {hasEntered && (
        <>
          <BottomDock activeDock={activeNav} onSelect={handleNavClick} />
          <SupportLink />
          <SettingsHint />
        </>
      )}
    </div>
  );
}

function TopHud({ onBack, onLogout, profile }: { onBack: () => void; onLogout: () => void; profile: AdminProfileSummary }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfilePreviewOpen, setIsProfilePreviewOpen] = useState(false);
  const profileWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isProfileOpen) return;

    const handleOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!profileWrapRef.current?.contains(target)) {
        setIsProfileOpen(false);
      }
    };

    window.addEventListener("mousedown", handleOutside);
    window.addEventListener("touchstart", handleOutside, { passive: true });

    return () => {
      window.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("touchstart", handleOutside);
    };
  }, [isProfileOpen]);

  return (
    <header className="game-hud-header pointer-events-none flex items-center justify-between px-3 pt-3 pb-2 text-[10px] font-black uppercase tracking-[-0.02em] text-[#A4C2C5]/80">
      <button className="pointer-events-auto top-hud-btn" type="button" onClick={onBack}>
        <span className="btn-text">
          <span className="flex items-center gap-[1px] text-[#69BFB7]">
            <ChevronLeft />
            <ChevronLeft />
          </span>
          Volver al Centro
        </span>
      </button>
      <div className="admin-ui-v2-profile-hud-wrap pointer-events-auto" ref={profileWrapRef}>
        <button
          className={`top-hud-btn admin-ui-v2-profile-hud-btn ${isProfileOpen ? "is-open" : ""}`}
          type="button"
          onClick={() => setIsProfileOpen((prev) => !prev)}
          aria-expanded={isProfileOpen}
          aria-haspopup="dialog"
        >
          <span className="btn-text">
            Perfil
            <span className="admin-ui-v2-profile-session-dot" data-state={profile.sessionState} aria-hidden="true" />
          </span>
        </button>

        {isProfileOpen && (
          <div className="admin-ui-v2-profile-popover" role="dialog" aria-label="Información del perfil administrativo">
            <div className="admin-ui-v2-profile-popover-head">
              <button
                className="admin-ui-v2-profile-avatar-button"
                type="button"
                onClick={() => setIsProfilePreviewOpen(true)}
                aria-label="Ver foto de perfil ampliada"
              >
                <img className="admin-ui-v2-profile-popover-avatar" src={profile.avatarUrl} alt={`Perfil de ${profile.displayName}`} />
              </button>
              <div>
                <strong>{profile.displayName}</strong>
                <span>@{profile.username}</span>
              </div>
            </div>

            <div className="admin-ui-v2-profile-popover-grid">
              <div><small>Rol</small><strong>{profile.role}</strong></div>
              <div><small>Oficio</small><strong>{profile.occupation}</strong></div>
              <div><small>Campamento</small><strong>{profile.camp}</strong></div>
              <div><small>Estado</small><strong>{profile.status}</strong></div>
              <div><small>Sesión</small><strong className={`admin-ui-v2-session-${profile.sessionState === "ACTIVA" ? "active" : "inactive"}`}>{profile.sessionState}</strong></div>
            </div>

            <button className="admin-ui-v2-btn is-danger admin-ui-v2-profile-logout" type="button" onClick={onLogout}>
              CERRAR SESION
            </button>
          </div>
        )}
      </div>

      {isProfilePreviewOpen && (
        <div className="admin-ui-v2-photo-preview-overlay pointer-events-auto" role="dialog" aria-label="Foto de perfil ampliada" onClick={() => setIsProfilePreviewOpen(false)}>
          <div className="admin-ui-v2-photo-preview-card" onClick={(event) => event.stopPropagation()}>
            <img src={profile.avatarUrl} alt={`Perfil ampliado de ${profile.displayName}`} />
          </div>
        </div>
      )}
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
    <nav aria-label="Secciones internas" className="w-full pl-2 pt-6 h-full flex flex-col">
      <div className="flex flex-col gap-[18px] perspective-[800px]">
        {items.map((item) => (
          <button
            className={`side-button ${activeItem === item ? "is-active" : ""} relative`}
            key={item}
            onClick={() => onSelect(item)}
            type="button"
            style={{
              transformStyle: "preserve-3d",
              transform: "rotateY(25deg) translateZ(10px)",
            }}
          >
            <span className="btn-text whitespace-nowrap overflow-visible drop-shadow-md">{item}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function ContentArea({
  section,
  sub,
  isDataLoading,
  dataError,
  persons,
  dashboardKpi,
  notifications,
  countdown,
  threatLevel,
  populationStats,
  admissions,
  admissionsQueue,
  admissionsHistory,
  expeditions,
  intercampRequests,
  lookupId,
  setLookupId,
  onLookupIntercamp,
  campCatalog,
  campNameById,
  occupationNameById,
  onAdmissionDecision,
  onCompleteExpedition,
  onUpdateIntercampStatus,
  onPopulationReload,
  onDashboardReload,
  onQuickNav,
  onSetDataError,
}: {
  section: AdminSectionId;
  sub: string;
  isDataLoading: boolean;
  dataError: string | null;
  persons: Person[];
  dashboardKpi: DashboardKpi;
  notifications: UiNotification[];
  countdown: { h: number; m: number; s: number };
  threatLevel: number;
  populationStats: { total: number; active: number; injured: number; missing: number };
  admissions: UiAdmission[];
  admissionsQueue: UiAdmission[];
  admissionsHistory: UiAdmission[];
  expeditions: UiExpedition[];
  intercampRequests: UiIntercampRequest[];
  lookupId: string;
  setLookupId: (value: string) => void;
  onLookupIntercamp: () => void;
  campCatalog: Camp[];
  campNameById: Map<number, string>;
  occupationNameById: Map<number, string>;
  onAdmissionDecision: (id: number, decision: "approved" | "rejected") => Promise<void>;
  onCompleteExpedition: (id: number) => Promise<void>;
  onUpdateIntercampStatus: (callback: (prev: UiIntercampRequest[]) => UiIntercampRequest[]) => void;
  onPopulationReload: () => Promise<void>;
  onDashboardReload: () => Promise<void>;
  onQuickNav: (id: AdminSectionId) => void;
  onSetDataError: (message: string | null) => void;
}) {
  return (
    <div className="admin-ui-v2-content">
      <div className="admin-ui-v2-meta">
        <div className="admin-ui-v2-meta-title">{section.toUpperCase()}</div>
        <div className="admin-ui-v2-meta-sub">{sub}</div>
        <p className="admin-ui-v2-meta-desc">{SECTION_DESCRIPTIONS[section]}</p>
      </div>

      {isDataLoading && <PanelMessage label="Sincronizando datos del backend..." type="info" />}
      {dataError && <PanelMessage label={dataError} type="error" />}

      {section === "centro" && (
        <DashboardModule
          kpi={dashboardKpi}
          populationStats={populationStats}
          admissionsQueue={admissionsQueue.length}
          activeExpeditions={expeditions.filter((item) => item.status !== "COMPLETADA").length}
          intercampCount={intercampRequests.length}
          notifications={notifications}
          countdown={countdown}
          threatLevel={threatLevel}
          onReload={onDashboardReload}
          onQuickNav={onQuickNav}
        />
      )}

      {section === "poblacion" && (
        <PopulationModule
          sub={sub}
          persons={persons}
          camps={campNameById}
          occupations={occupationNameById}
          onReload={onPopulationReload}
          onError={onSetDataError}
        />
      )}

      {section === "admisiones" && (
        <AdmissionsModule
          sub={sub}
          admissions={admissions}
          admissionsQueue={admissionsQueue}
          admissionsHistory={admissionsHistory}
          onAdmissionDecision={onAdmissionDecision}
        />
      )}

      {section === "expediciones" && (
        <ExpeditionsModule
          sub={sub}
          expeditions={expeditions}
          campCatalog={campCatalog}
          onCompleteExpedition={onCompleteExpedition}
        />
      )}

      {section === "intercamp" && (
        <>
          <div className="admin-ui-v2-toolbar">
            <input
              className="v-input admin-ui-v2-search"
              placeholder="Buscar por ID de solicitud/traslado"
              value={lookupId}
              onChange={(event) => setLookupId(event.target.value)}
            />
            <button className="admin-ui-v2-btn is-info" onClick={() => void onLookupIntercamp()}>
              Sincronizar por ID
            </button>
          </div>

          <table className="v-table admin-ui-v2-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Origen</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Tiempo</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {intercampRequests
                .filter((request) => (sub === "Pendientes" ? request.status === "PENDIENTE" : request.status !== "PENDIENTE"))
                .map((request) => (
                  <tr key={request.id}>
                    <td>#{request.id}</td>
                    <td>{request.from}</td>
                    <td>{request.type}</td>
                    <td><span className={`admin-ui-v2-pill ${intercampPillClass(request.status)}`}>{request.status}</span></td>
                    <td>{request.time}</td>
                    <td>
                      {request.status === "PENDIENTE" ? (
                        <div className="admin-ui-v2-actions">
                          <button
                            className="admin-ui-v2-btn is-ok"
                            onClick={() => onUpdateIntercampStatus((prev) => prev.map((item) => (item.id === request.id ? { ...item, status: "APROBADO" } : item)))}
                          >
                            Aprobar
                          </button>
                          <button
                            className="admin-ui-v2-btn is-danger"
                            onClick={() => onUpdateIntercampStatus((prev) => prev.map((item) => (item.id === request.id ? { ...item, status: "RECHAZADO" } : item)))}
                          >
                            Rechazar
                          </button>
                        </div>
                      ) : (
                        <span className="admin-ui-v2-muted">Sin acción</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}

      {(section === "inventario" || section === "seguridad" || section === "notificaciones" || section === "configuracion") && (
        <div className="admin-ui-v2-module-card">
          <h3>Módulo en diseño táctico</h3>
          <p>Este módulo mantiene la estructura visual nueva. En la siguiente iteración se porta la lógica completa igual que Población, Admisiones, Expediciones e Inter-campamentos.</p>
        </div>
      )}
    </div>
  );
}

function DashboardModule({
  kpi,
  populationStats,
  admissionsQueue,
  activeExpeditions,
  intercampCount,
  notifications,
  countdown,
  threatLevel,
  onReload,
  onQuickNav,
}: {
  kpi: DashboardKpi;
  populationStats: { total: number; active: number; injured: number; missing: number };
  admissionsQueue: number;
  activeExpeditions: number;
  intercampCount: number;
  notifications: UiNotification[];
  countdown: { h: number; m: number; s: number };
  threatLevel: number;
  onReload: () => Promise<void>;
  onQuickNav: (id: AdminSectionId) => void;
}) {
  const populationTotal = kpi.populationTotal || populationStats.total;
  const activePopulation = kpi.activePopulation || populationStats.active;
  const injuredPopulation = kpi.injuredPopulation || populationStats.injured;
  const outPopulation = kpi.outPopulation || populationStats.missing;
  const sickPopulation = kpi.sickPopulation;
  const populationData = [
    { name: "Activos", value: activePopulation, color: "#48c58f" },
    { name: "Heridos", value: injuredPopulation, color: "#efc16e" },
    { name: "Enfermos", value: sickPopulation, color: "#f37b7b" },
    { name: "Fuera", value: outPopulation, color: "#69bfb7" },
  ];
  const liveAlerts = notifications.filter((notification) => !notification.read).slice(0, 3);
  const threatTone = threatLevel >= 80 ? "danger" : threatLevel >= 65 ? "warn" : "ok";
  const moduleStatus = [
    { name: "Admisiones IA", status: admissionsQueue > 0 ? "Pendiente" : "Estable", note: `${admissionsQueue} en cola`, tone: admissionsQueue > 0 ? "warn" : "ok" },
    { name: "Inventario", status: kpi.criticalResources > 0 ? "Alerta" : "Estable", note: `${kpi.criticalResources} recursos críticos`, tone: kpi.criticalResources > 0 ? "danger" : "ok" },
    { name: "Expediciones", status: (kpi.activeExpeditions || activeExpeditions) > 0 ? "Activo" : "Reposo", note: `${kpi.activeExpeditions || activeExpeditions} operaciones`, tone: "info" },
    { name: "Intercamp", status: (kpi.pendingIntercamp || intercampCount) > 0 ? "Pendiente" : "Estable", note: `${kpi.pendingIntercamp || intercampCount} solicitudes`, tone: "warn" },
  ] as const;

  return (
    <div className="admin-ui-v2-dashboard">
      <div className="admin-ui-v2-grid admin-ui-v2-grid-4">
        <DashboardMetricCard label="Población total" value={populationTotal} detail={`${activePopulation} activos`} tone="info" />
        <DashboardMetricCard label="Recursos críticos" value={kpi.criticalResources} detail={kpi.criticalResources > 0 ? "Atención inmediata" : "Sin alertas"} tone={kpi.criticalResources > 0 ? "danger" : "ok"} />
        <DashboardMetricCard label="Expediciones activas" value={kpi.activeExpeditions || activeExpeditions} detail={`${outPopulation} fuera del campamento`} tone="info" />
        <DashboardMetricCard label="Solicitudes intercamp" value={kpi.pendingIntercamp || intercampCount} detail="Pendientes de coordinación" tone="warn" />
      </div>

      <div className="admin-ui-v2-module-card admin-ui-v2-command-row">
        <div>
          <h3>Centro de mando operativo</h3>
          <p>Estado general del campamento, prioridades activas y rutas de respuesta inmediata.</p>
        </div>
        <div className="admin-ui-v2-actions admin-ui-v2-actions-wrap">
          <button className="admin-ui-v2-btn is-info" type="button" onClick={() => void onReload()}>Actualizar</button>
          <button className="admin-ui-v2-btn is-info" type="button" onClick={() => onQuickNav("admisiones")}>Admisiones</button>
          <button className="admin-ui-v2-btn" type="button" onClick={() => onQuickNav("inventario")}>Inventario</button>
          <button className="admin-ui-v2-btn" type="button" onClick={() => onQuickNav("expediciones")}>Expediciones</button>
        </div>
      </div>

      <div className="admin-ui-v2-module-card admin-ui-v2-priority-card">
        <div className="admin-ui-v2-section-head">
          <span>Crisis del día</span>
          <span className={`admin-ui-v2-pill is-${threatTone}`}>Amenaza {threatLevel}%</span>
        </div>
        <div className="admin-ui-v2-priority-layout">
          <div>
            <h3>Riesgo de abastecimiento</h3>
            <p>Si el agua cae por debajo del umbral crítico, habrá penalización de moral y productividad.</p>
          </div>
          <div className="admin-ui-v2-threat-meter">
            <div className="admin-ui-v2-threat-value">{threatLevel}%</div>
            <div className="admin-ui-v2-threat-track">
              <span className={`is-${threatTone}`} style={{ width: `${threatLevel}%` }} />
            </div>
          </div>
        </div>
        <div className="admin-ui-v2-grid admin-ui-v2-grid-3">
          <SignalTile label="-12% eficiencia de tareas" tone="danger" />
          <SignalTile label="+18% riesgo médico" tone="warn" />
          <SignalTile label="IA recomienda expedición de agua" tone="info" />
        </div>
      </div>

      <div className="admin-ui-v2-dashboard-main-grid">
        <div className="admin-ui-v2-module-card">
          <div className="admin-ui-v2-section-head">
            <span>Tendencia de recursos</span>
            <span>Últimos 7 días</span>
          </div>
          <div className="admin-ui-v2-chart">
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={RESOURCE_TREND_DATA} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="v2Food" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#efc16e" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#efc16e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="v2Water" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#69bfb7" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#69bfb7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="v2Ammo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f37b7b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f37b7b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: "#a4c2c5", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#a4c2c5", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#061012", border: "1px solid rgba(103,172,169,0.35)", color: "#f0fafa" }} />
                <Area type="monotone" dataKey="food" name="Comida" stroke="#efc16e" fill="url(#v2Food)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="water" name="Agua" stroke="#69bfb7" fill="url(#v2Water)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="ammo" name="Munición" stroke="#f37b7b" fill="url(#v2Ammo)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-ui-v2-module-card">
          <div className="admin-ui-v2-section-head">
            <span>Estado de población</span>
            <span>{populationTotal} total</span>
          </div>
          <div className="admin-ui-v2-donut-wrap">
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={populationData} cx="50%" cy="50%" innerRadius={48} outerRadius={70} dataKey="value" strokeWidth={0}>
                  {populationData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="admin-ui-v2-donut-total">{populationTotal}</div>
          </div>
          <div className="admin-ui-v2-legend">
            {populationData.map((entry) => (
              <span key={entry.name}><i style={{ background: entry.color }} />{entry.name}: {entry.value}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-ui-v2-dashboard-main-grid">
        <div className="admin-ui-v2-module-card">
          <div className="admin-ui-v2-section-head">
            <span>Alertas vivas</span>
            <span>Top 3</span>
          </div>
          <div className="admin-ui-v2-alert-list">
            {liveAlerts.map((alert) => (
              <div className="admin-ui-v2-alert-item" key={alert.id}>
                <span className={`admin-ui-v2-pill ${alert.level === "critical" ? "is-danger" : alert.level === "warning" ? "is-warn" : "is-info"}`}>
                  {alert.level === "critical" ? "Crítica" : alert.level === "warning" ? "Media" : "Info"}
                </span>
                <strong>{alert.title}</strong>
                <p>{alert.body}</p>
                <small>{alert.time}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-ui-v2-module-card">
          <div className="admin-ui-v2-section-head">
            <span>Estado operativo</span>
            <span>Resumen</span>
          </div>
          <div className="admin-ui-v2-status-stack">
            {moduleStatus.map((item) => (
              <div className={`admin-ui-v2-status-row is-${item.tone}`} key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.note}</span>
                </div>
                <em>{item.status}</em>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-ui-v2-module-card admin-ui-v2-cycle-card">
        <div className="admin-ui-v2-section-head">
          <span>Próximo ciclo automático</span>
          <span>Hoy 18:00</span>
        </div>
        <div className="admin-ui-v2-cycle-layout">
          <div>
            <div className="admin-ui-v2-countdown">
              {String(countdown.h).padStart(2, "0")}:{String(countdown.m).padStart(2, "0")}:{String(countdown.s).padStart(2, "0")}
            </div>
            <p>Automatización de consumo, colecta, alertas de inventario y reporte nocturno.</p>
          </div>
          <div className="admin-ui-v2-cycle-signals">
            <SignalTile label="Consumo diario ejecutado" tone="ok" />
            <SignalTile label="Colecta de recursos ejecutada" tone="ok" />
            <SignalTile label={`${kpi.criticalResources} alertas de inventario`} tone={kpi.criticalResources > 0 ? "warn" : "ok"} />
            <SignalTile label="Reporte nocturno enviado" tone="info" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardMetricCard({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: "info" | "ok" | "warn" | "danger" }) {
  return (
    <div className={`admin-ui-v2-metric admin-ui-v2-dashboard-metric ${tone}`}>
      <span className="admin-ui-v2-metric-label">{label}</span>
      <span className="admin-ui-v2-metric-value">{value}</span>
      <span className="admin-ui-v2-metric-detail">{detail}</span>
    </div>
  );
}

function SignalTile({ label, tone }: { label: string; tone: "ok" | "warn" | "danger" | "info" }) {
  return <div className={`admin-ui-v2-signal is-${tone}`}>{label}</div>;
}

function PopulationModule({
  sub,
  persons,
  camps,
  occupations,
  onReload,
  onError,
}: {
  sub: string;
  persons: Person[];
  camps: Map<number, string>;
  occupations: Map<number, string>;
  onReload: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Todos" | "Activo" | "Herido" | "Desaparecido" | "Fallecido">("Todos");
  const [userPage, setUserPage] = useState(1);
  const usersPerPage = 8;
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    age: 0,
    status: "ACTIVE" as Person["status"],
    campId: 0,
    occupationId: 0,
    notes: "",
  });

  const [assignments, setAssignments] = useState<TempRoleAssignment[]>(INITIAL_TEMP_ASSIGNMENTS);
  const [assignSearch, setAssignSearch] = useState("");
  const [newAssignment, setNewAssignment] = useState({
    personId: 0,
    tempRole: "",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const roleDistribution = useMemo(() => {
    const map = new Map<string, number>();
    persons.forEach((person) => {
      const role = occupations.get(person.occupationId) ?? `Ocupación #${person.occupationId}`;
      map.set(role, (map.get(role) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [persons, occupations]);

  const sectorDistribution = useMemo(() => {
    const map = new Map<string, number>();
    persons.forEach((person) => {
      const sector = camps.get(person.campId) ?? `Camp #${person.campId}`;
      map.set(sector, (map.get(sector) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [persons, camps]);

  const filteredPersons = useMemo(() => {
    const query = search.trim().toLowerCase();
    return persons.filter((person) => {
      const normalizedStatus = legacyPopulationStatus(person.status);
      const matchStatus = statusFilter === "Todos" || normalizedStatus === statusFilter;
      if (!matchStatus) return false;
      if (!query) return true;

      const name = personFullName(person).toLowerCase();
      const role = (occupations.get(person.occupationId) ?? "").toLowerCase();
      const sector = (camps.get(person.campId) ?? "").toLowerCase();
      return name.includes(query) || role.includes(query) || sector.includes(query);
    });
  }, [persons, search, statusFilter, occupations, camps]);

  const assignCandidates = useMemo(() => {
    const query = assignSearch.trim().toLowerCase();
    return persons
      .filter((person) => person.status === "ACTIVE")
      .filter((person) => {
        if (!query) return true;
        const name = personFullName(person).toLowerCase();
        const role = (occupations.get(person.occupationId) ?? "").toLowerCase();
        return name.includes(query) || role.includes(query);
      })
      .slice(0, 60);
  }, [persons, assignSearch, occupations]);

  const selectedCandidate = persons.find((person) => person.id === newAssignment.personId) ?? null;
  const activeAssignments = assignments.filter((item) => item.status === "ACTIVA");
  const historicalAssignments = assignments.filter((item) => item.status === "FINALIZADA");

  const pagedPersons = useMemo(() => {
    const start = (userPage - 1) * usersPerPage;
    return filteredPersons.slice(start, start + usersPerPage);
  }, [filteredPersons, userPage]);

  const userTotalPages = Math.max(1, Math.ceil(filteredPersons.length / usersPerPage));

  const legacyCounts = useMemo(() => {
    return persons.reduce(
      (acc, person) => {
        const label = legacyPopulationStatus(person.status);
        acc[label] += 1;
        return acc;
      },
      { Activo: 0, Herido: 0, Enfermo: 0, Fuera: 0 },
    );
  }, [persons]);

  useEffect(() => {
    setUserPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (userPage > userTotalPages) {
      setUserPage(userTotalPages);
    }
  }, [userPage, userTotalPages]);

  const openPersonModal = (person: Person, editMode: boolean) => {
    setSelectedPerson(person);
    setIsEditMode(editMode);
    setEditForm({
      firstName: person.firstName,
      lastName: person.lastName,
      age: person.age,
      status: person.status,
      campId: person.campId,
      occupationId: person.occupationId,
      notes: person.notes ?? "",
    });
  };

  const closePersonModal = () => {
    if (isSaving) return;
    setSelectedPerson(null);
    setIsEditMode(false);
  };

  const handleDeletePerson = async (personId: number) => {
    if (!window.confirm("¿Eliminar este registro de persona?")) return;
    setIsSaving(true);
    onError(null);
    try {
      await deletePerson(personId);
      await onReload();
      setSelectedPerson(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : "No se pudo eliminar la persona");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePerson = async () => {
    if (!selectedPerson) return;

    setIsSaving(true);
    onError(null);
    try {
      await updatePerson(selectedPerson.id, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        age: Number(editForm.age),
        status: editForm.status,
        campId: Number(editForm.campId),
        occupationId: Number(editForm.occupationId),
        notes: editForm.notes.trim() || undefined,
      });
      await onReload();
      setIsEditMode(false);
      setSelectedPerson(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : "No se pudo actualizar la persona");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTempAssignment = () => {
    if (!selectedCandidate) return;
    if (!newAssignment.tempRole.trim() || !newAssignment.startDate || !newAssignment.endDate) return;

    const role = occupations.get(selectedCandidate.occupationId) ?? `Ocupación #${selectedCandidate.occupationId}`;
    setAssignments((prev) => [
      {
        id: Date.now(),
        personId: selectedCandidate.id,
        personName: personFullName(selectedCandidate),
        fromRole: role,
        tempRole: newAssignment.tempRole.trim(),
        startDate: newAssignment.startDate,
        endDate: newAssignment.endDate,
        reason: newAssignment.reason.trim() || "Asignación temporal",
        status: "ACTIVA",
      },
      ...prev,
    ]);
    setNewAssignment({ personId: 0, tempRole: "", startDate: "", endDate: "", reason: "" });
    setAssignSearch("");
  };

  const handleFinishAssignment = (assignmentId: number) => {
    setAssignments((prev) =>
      prev.map((assignment) =>
        assignment.id === assignmentId
          ? { ...assignment, status: "FINALIZADA" }
          : assignment,
      ),
    );
  };

  const legacyFilterFromStatus = (value: typeof statusFilter): "Todos" | "Activo" | "Herido" | "Enfermo" | "Fuera" => {
    if (value === "Todos") return "Todos";
    if (value === "Activo") return "Activo";
    if (value === "Herido") return "Herido";
    return "Fuera";
  };

  const legacyToStatusFilter = (value: "Todos" | "Activo" | "Herido" | "Enfermo" | "Fuera"): typeof statusFilter => {
    if (value === "Todos") return "Todos";
    if (value === "Activo") return "Activo";
    if (value === "Herido") return "Herido";
    return "Desaparecido";
  };

  const statusPillFromLegacy = (value: "Activo" | "Herido" | "Enfermo" | "Fuera") => {
    if (value === "Activo") return "is-ok";
    if (value === "Herido") return "is-warn";
    if (value === "Enfermo") return "is-warn";
    return "is-danger";
  };

  return (
    <div className="admin-ui-v2-population">
      {sub === "Estadísticas" && (
        <>
          <div className="admin-ui-v2-grid admin-ui-v2-grid-4">
            <MetricCard label="Activo" value={legacyCounts.Activo} tone="ok" />
            <MetricCard label="Herido" value={legacyCounts.Herido} tone="warn" />
            <MetricCard label="Enfermo" value={legacyCounts.Enfermo} tone="warn" />
            <MetricCard label="Fuera" value={legacyCounts.Fuera} tone="danger" />
          </div>

          <div className="admin-ui-v2-grid admin-ui-v2-grid-2">
            <div className="admin-ui-v2-module-card">
              <h3>Distribución por Rol</h3>
              <div className="admin-ui-v2-stat-list">
                {roleDistribution.map(([role, total]) => (
                  <div key={role} className="admin-ui-v2-stat-row">
                    <span>{role}</span>
                    <strong>{total}</strong>
                  </div>
                ))}
                {roleDistribution.length === 0 && <div className="admin-ui-v2-muted">No hay roles disponibles.</div>}
              </div>
            </div>

            <div className="admin-ui-v2-module-card">
              <h3>Ocupación por Sector</h3>
              <div className="admin-ui-v2-stat-list">
                {sectorDistribution.map(([sector, total]) => (
                  <div key={sector} className="admin-ui-v2-stat-row">
                    <span>{sector}</span>
                    <strong>{total}</strong>
                  </div>
                ))}
                {sectorDistribution.length === 0 && <div className="admin-ui-v2-muted">No hay sectores disponibles.</div>}
              </div>
            </div>
          </div>
        </>
      )}

      {sub === "Usuarios" && (
        <>
          <div className="admin-ui-v2-toolbar admin-ui-v2-toolbar-population">
            <input
              className="v-input admin-ui-v2-search"
              placeholder="Buscar por nombre, rol o sector"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="admin-ui-v2-filter-group">
              {(["Todos", "Activo", "Herido", "Enfermo", "Fuera"] as const).map((legacyFilter) => (
                <button
                  key={legacyFilter}
                  className={`admin-ui-v2-btn ${legacyFilterFromStatus(statusFilter) === legacyFilter ? "is-info" : ""}`}
                  onClick={() => setStatusFilter(legacyToStatusFilter(legacyFilter))}
                  type="button"
                >
                  {legacyFilter}
                </button>
              ))}
            </div>
          </div>

          <table className="v-table admin-ui-v2-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Edad</th>
                <th>Sector</th>
                <th>Ingreso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagedPersons.map((person) => (
                <tr key={person.id}>
                  <td>
                    <div className="admin-ui-v2-person-cell">
                      <img
                        src={`https://i.pravatar.cc/60?img=${(person.id % 69) + 1}`}
                        alt={`Perfil de ${personFullName(person)}`}
                        className="admin-ui-v2-person-avatar"
                      />
                      <span>{personFullName(person)}</span>
                    </div>
                  </td>
                  <td>{occupations.get(person.occupationId) ?? `Ocupación #${person.occupationId}`}</td>
                  <td>
                    <span className={`admin-ui-v2-pill ${statusPillFromLegacy(legacyPopulationStatus(person.status))}`}>
                      {legacyPopulationStatus(person.status)}
                    </span>
                  </td>
                  <td>{person.age}</td>
                  <td>{camps.get(person.campId) ?? `Camp #${person.campId}`}</td>
                  <td>{new Date(person.admissionDate).toLocaleDateString("es-CR")}</td>
                  <td>
                    <div className="admin-ui-v2-actions">
                      <button className="admin-ui-v2-btn" onClick={() => openPersonModal(person, false)} type="button">Ver</button>
                      <button className="admin-ui-v2-btn is-info" onClick={() => openPersonModal(person, true)} type="button">Editar</button>
                      <button className="admin-ui-v2-btn is-danger" onClick={() => void handleDeletePerson(person.id)} type="button">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPersons.length === 0 && (
                <tr>
                  <td colSpan={7} className="admin-ui-v2-empty-cell">No hay personas para mostrar con esos filtros.</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="admin-ui-v2-pagination">
            <span className="admin-ui-v2-muted">Registros: {filteredPersons.length}</span>
            <div className="admin-ui-v2-actions">
              <button
                className="admin-ui-v2-btn"
                type="button"
                onClick={() => setUserPage((prev) => Math.max(1, prev - 1))}
                disabled={userPage <= 1}
              >
                Ant
              </button>
              <span className="admin-ui-v2-muted">Pág {userPage} / {userTotalPages}</span>
              <button
                className="admin-ui-v2-btn"
                type="button"
                onClick={() => setUserPage((prev) => Math.min(userTotalPages, prev + 1))}
                disabled={userPage >= userTotalPages}
              >
                Sig
              </button>
            </div>
          </div>
        </>
      )}

      {sub === "Roles temporales" && (
        <div className="admin-ui-v2-grid admin-ui-v2-grid-roles">
          <div className="admin-ui-v2-module-card">
            <h3>Asignaciones Activas</h3>
            <div className="admin-ui-v2-role-list">
              {activeAssignments.map((assignment) => (
                <div key={assignment.id} className="admin-ui-v2-role-item">
                  <div>
                    <strong>{assignment.personName}</strong>
                    <p>{assignment.fromRole} {"->"} {assignment.tempRole}</p>
                    <p>{assignment.startDate} - {assignment.endDate}</p>
                  </div>
                  <button className="admin-ui-v2-btn is-ok" onClick={() => handleFinishAssignment(assignment.id)} type="button">
                    Finalizar
                  </button>
                </div>
              ))}
              {activeAssignments.length === 0 && <div className="admin-ui-v2-muted">No hay coberturas temporales activas.</div>}
            </div>
          </div>

          <div className="admin-ui-v2-module-card">
            <h3>Nueva Asignación</h3>
            <input
              className="v-input admin-ui-v2-search"
              placeholder="Buscar persona activa"
              value={assignSearch}
              onChange={(event) => setAssignSearch(event.target.value)}
            />
            <div className="admin-ui-v2-candidate-list">
              {assignCandidates.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className={`admin-ui-v2-candidate ${newAssignment.personId === person.id ? "is-selected" : ""}`}
                  onClick={() => setNewAssignment((prev) => ({ ...prev, personId: person.id }))}
                >
                  <span>{personFullName(person)}</span>
                  <small>{occupations.get(person.occupationId) ?? `Ocupación #${person.occupationId}`}</small>
                </button>
              ))}
            </div>

            <div className="admin-ui-v2-form-grid">
              <input
                className="v-input"
                placeholder="Oficio temporal"
                value={newAssignment.tempRole}
                onChange={(event) => setNewAssignment((prev) => ({ ...prev, tempRole: event.target.value }))}
              />
              <input
                className="v-input"
                type="date"
                value={newAssignment.startDate}
                onChange={(event) => setNewAssignment((prev) => ({ ...prev, startDate: event.target.value }))}
              />
              <input
                className="v-input"
                type="date"
                value={newAssignment.endDate}
                onChange={(event) => setNewAssignment((prev) => ({ ...prev, endDate: event.target.value }))}
              />
              <textarea
                className="v-textarea"
                placeholder="Motivo"
                value={newAssignment.reason}
                onChange={(event) => setNewAssignment((prev) => ({ ...prev, reason: event.target.value }))}
              />
              <button className="admin-ui-v2-btn is-info" onClick={handleCreateTempAssignment} type="button">
                Asignar Temporalmente
              </button>
            </div>

            <h3 className="admin-ui-v2-subtitle">Histórico</h3>
            <div className="admin-ui-v2-role-list">
              {historicalAssignments.map((assignment) => (
                <div key={assignment.id} className="admin-ui-v2-role-item is-historical">
                  <div>
                    <strong>{assignment.personName}</strong>
                    <p>{assignment.fromRole} {"->"} {assignment.tempRole}</p>
                    <p>{assignment.startDate} - {assignment.endDate}</p>
                  </div>
                  <span className="admin-ui-v2-pill is-neutral">Finalizada</span>
                </div>
              ))}
              {historicalAssignments.length === 0 && <div className="admin-ui-v2-muted">Aún no hay asignaciones finalizadas.</div>}
            </div>
          </div>
        </div>
      )}

      {selectedPerson && (
        <div className="admin-ui-v2-modal-backdrop" onClick={closePersonModal}>
          <div className="admin-ui-v2-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-ui-v2-modal-header">
              <h3>{isEditMode ? "Editar Persona" : "Ficha de Persona"}</h3>
              <button className="admin-ui-v2-btn" type="button" onClick={closePersonModal}>Cerrar</button>
            </div>

            {isEditMode ? (
              <div className="admin-ui-v2-form-grid">
                <input className="v-input" value={editForm.firstName} onChange={(event) => setEditForm((prev) => ({ ...prev, firstName: event.target.value }))} placeholder="Nombre" />
                <input className="v-input" value={editForm.lastName} onChange={(event) => setEditForm((prev) => ({ ...prev, lastName: event.target.value }))} placeholder="Apellido" />
                <input className="v-input" type="number" value={editForm.age} onChange={(event) => setEditForm((prev) => ({ ...prev, age: Number(event.target.value) }))} placeholder="Edad" />
                <select className="v-select" value={editForm.status} onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value as Person["status"] }))}>
                  <option value="ACTIVE">Activo</option>
                  <option value="INJURED">Herido</option>
                  <option value="MISSING">Desaparecido</option>
                  <option value="DECEASED">Fallecido</option>
                </select>
                <select className="v-select" value={editForm.campId} onChange={(event) => setEditForm((prev) => ({ ...prev, campId: Number(event.target.value) }))}>
                  {Array.from(camps.entries()).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
                <select className="v-select" value={editForm.occupationId} onChange={(event) => setEditForm((prev) => ({ ...prev, occupationId: Number(event.target.value) }))}>
                  {Array.from(occupations.entries()).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
                <textarea className="v-textarea" value={editForm.notes} onChange={(event) => setEditForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Notas" />
                <div className="admin-ui-v2-actions">
                  <button className="admin-ui-v2-btn is-info" onClick={() => void handleSavePerson()} type="button" disabled={isSaving}>Guardar</button>
                  <button className="admin-ui-v2-btn" onClick={() => setIsEditMode(false)} type="button" disabled={isSaving}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="admin-ui-v2-person-detail">
                <div><strong>Nombre:</strong> {personFullName(selectedPerson)}</div>
                <div><strong>Edad:</strong> {selectedPerson.age}</div>
                <div><strong>Estado:</strong> {normalizeStatusLabel(selectedPerson.status)}</div>
                <div><strong>Rol:</strong> {occupations.get(selectedPerson.occupationId) ?? `Ocupación #${selectedPerson.occupationId}`}</div>
                <div><strong>Sector:</strong> {camps.get(selectedPerson.campId) ?? `Camp #${selectedPerson.campId}`}</div>
                <div><strong>Ingreso:</strong> {new Date(selectedPerson.admissionDate).toLocaleDateString("es-CR")}</div>
                <div><strong>Notas:</strong> {selectedPerson.notes || "Sin notas"}</div>
                <div className="admin-ui-v2-actions">
                  <button className="admin-ui-v2-btn is-info" onClick={() => setIsEditMode(true)} type="button">Editar</button>
                  <button className="admin-ui-v2-btn is-danger" onClick={() => void handleDeletePerson(selectedPerson.id)} type="button" disabled={isSaving}>Eliminar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AdmissionsModule({
  sub,
  admissions,
  admissionsQueue,
  admissionsHistory,
  onAdmissionDecision,
}: {
  sub: string;
  admissions: UiAdmission[];
  admissionsQueue: UiAdmission[];
  admissionsHistory: UiAdmission[];
  onAdmissionDecision: (id: number, decision: "approved" | "rejected") => Promise<void>;
}) {
  const [selectedAdmission, setSelectedAdmission] = useState<UiAdmission | null>(null);
  const [page, setPage] = useState(1);
  const limit = 6;

  const approvedCount = admissions.filter((item) => item.status === "approved").length;
  const rejectedCount = admissions.filter((item) => item.status === "rejected").length;

  const activeList = sub === "Historial" ? admissionsHistory : admissionsQueue;
  const totalPages = Math.max(1, Math.ceil(activeList.length / limit));
  const safePage = Math.min(page, totalPages);
  const pagedList = activeList.slice((safePage - 1) * limit, safePage * limit);

  const scoreTone = (score: number) => {
    if (score < 30) return "danger";
    if (score < 70) return "warn";
    return "ok";
  };

  const statusLabel = (status: UiAdmission["status"]) => {
    if (status === "pending") return "Pendiente";
    if (status === "approved") return "Aprobada";
    return "Rechazada";
  };

  return (
    <div className="admin-ui-v2-admissions">
      <div className="admin-ui-v2-grid admin-ui-v2-grid-3">
        <MetricCard label="Pendientes" value={admissionsQueue.length} tone="warn" />
        <MetricCard label="Aprobadas" value={approvedCount} tone="ok" />
        <MetricCard label="Rechazadas" value={rejectedCount} tone="danger" />
      </div>

      {sub === "Pendientes" ? (
        <div className="admin-ui-v2-adm-list">
          {pagedList.map((admission) => (
            <div key={admission.id} className="admin-ui-v2-adm-card">
              <div className="admin-ui-v2-adm-head">
                <div>
                  <div className="admin-ui-v2-adm-name">
                    {admission.name}
                    {admission.badge && <span className="admin-ui-v2-pill is-danger">{admission.badge}</span>}
                  </div>
                  <div className="admin-ui-v2-adm-prof">{admission.profession}</div>
                </div>
                <div className={`admin-ui-v2-adm-score ${scoreTone(admission.score)}`}>
                  {admission.score}
                </div>
              </div>

              <div className="admin-ui-v2-adm-bar">
                <div className={`admin-ui-v2-adm-bar-fill ${scoreTone(admission.score)}`} style={{ width: `${Math.max(0, Math.min(100, admission.score))}%` }} />
              </div>

              <p className="admin-ui-v2-adm-reason">{admission.reason}</p>

              {admission.skills.length > 0 && (
                <div className="admin-ui-v2-adm-skills">
                  {admission.skills.slice(0, 5).map((skill) => (
                    <span key={skill} className="admin-ui-v2-pill is-info">{skill}</span>
                  ))}
                </div>
              )}

              <div className="admin-ui-v2-actions">
                <button className="admin-ui-v2-btn" type="button" onClick={() => setSelectedAdmission(admission)}>Ver detalle</button>
                <button className="admin-ui-v2-btn is-ok" type="button" onClick={() => void onAdmissionDecision(admission.id, "approved")}>Aprobar</button>
                <button className="admin-ui-v2-btn is-danger" type="button" onClick={() => void onAdmissionDecision(admission.id, "rejected")}>Rechazar</button>
              </div>
            </div>
          ))}
          {activeList.length === 0 && <div className="admin-ui-v2-empty-cell">Sin solicitudes pendientes.</div>}
        </div>
      ) : (
        <table className="v-table admin-ui-v2-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Profesión</th>
              <th>Score IA</th>
              <th>Estado</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {pagedList.map((admission) => (
              <tr key={admission.id}>
                <td>{admission.name}</td>
                <td>{admission.profession}</td>
                <td>{admission.score}</td>
                <td>
                  <span className={`admin-ui-v2-pill ${admission.status === "approved" ? "is-ok" : "is-danger"}`}>
                    {statusLabel(admission.status)}
                  </span>
                </td>
                <td>
                  <button className="admin-ui-v2-btn" type="button" onClick={() => setSelectedAdmission(admission)}>
                    Ver detalle
                  </button>
                </td>
              </tr>
            ))}
            {activeList.length === 0 && (
              <tr>
                <td colSpan={5} className="admin-ui-v2-empty-cell">Sin admisiones procesadas.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <div className="admin-ui-v2-pagination">
        <span className="admin-ui-v2-muted">Registros: {activeList.length}</span>
        <div className="admin-ui-v2-actions">
          <button className="admin-ui-v2-btn" type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={safePage <= 1}>
            Ant
          </button>
          <span className="admin-ui-v2-muted">Pág {safePage} / {totalPages}</span>
          <button className="admin-ui-v2-btn" type="button" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={safePage >= totalPages}>
            Sig
          </button>
        </div>
      </div>

      {selectedAdmission && (
        <div className="admin-ui-v2-modal-backdrop" onClick={() => setSelectedAdmission(null)}>
          <div className="admin-ui-v2-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-ui-v2-modal-header">
              <h3>Reporte Detallado - IA</h3>
              <button className="admin-ui-v2-btn" type="button" onClick={() => setSelectedAdmission(null)}>Cerrar</button>
            </div>

            <div className="admin-ui-v2-adm-detail">
              <div><strong>Nombre:</strong> {selectedAdmission.name}</div>
              <div><strong>Profesión:</strong> {selectedAdmission.profession}</div>
              <div><strong>Score IA:</strong> {selectedAdmission.score}/100</div>
              <div><strong>Estado:</strong> {statusLabel(selectedAdmission.status)}</div>
              <div><strong>Razón:</strong> {selectedAdmission.reason}</div>
              {selectedAdmission.skills.length > 0 && (
                <div className="admin-ui-v2-adm-skills">
                  {selectedAdmission.skills.map((skill) => (
                    <span key={skill} className="admin-ui-v2-pill is-info">{skill}</span>
                  ))}
                </div>
              )}

              {selectedAdmission.status === "pending" && (
                <div className="admin-ui-v2-actions">
                  <button className="admin-ui-v2-btn is-ok" type="button" onClick={() => void onAdmissionDecision(selectedAdmission.id, "approved")}>Aprobar admisión</button>
                  <button className="admin-ui-v2-btn is-danger" type="button" onClick={() => void onAdmissionDecision(selectedAdmission.id, "rejected")}>Rechazar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExpeditionsModule({
  sub,
  expeditions,
  campCatalog,
  onCompleteExpedition,
}: {
  sub: string;
  expeditions: UiExpedition[];
  campCatalog: Camp[];
  onCompleteExpedition: (id: number) => Promise<void>;
}) {
  const [selectedCampId, setSelectedCampId] = useState<number | null>(null);
  const [selectedExpeditionId, setSelectedExpeditionId] = useState<number | null>(null);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const effectiveExpeditions = expeditions.length > 0 ? expeditions : SIMULATED_EXPEDITIONS;

  const mappedCamps = useMemo<MappedCampPoint[]>(() => {
    const backendPoints = campCatalog
      .filter((camp) => Number.isFinite(camp.location.latitude) && Number.isFinite(camp.location.longitude))
      .map((camp) => ({
        id: camp.id,
        name: camp.name,
        latitude: camp.location.latitude,
        longitude: camp.location.longitude,
        status: camp.status,
        currentPopulation: camp.currentPopulation,
        capacity: camp.capacity,
      }));

    return backendPoints.length > 1 ? backendPoints : SIMULATED_EXPEDITION_POINTS;
  }, [campCatalog]);

  const isSimulatedMap = mappedCamps === SIMULATED_EXPEDITION_POINTS;

  useEffect(() => {
    if (mappedCamps.length === 0) {
      setSelectedCampId(null);
      return;
    }
    setSelectedCampId((prev) => {
      if (prev && mappedCamps.some((camp) => camp.id === prev)) return prev;
      return mappedCamps[0].id;
    });
  }, [mappedCamps]);

  const activeExpeditions = effectiveExpeditions.filter((item) => item.status !== "COMPLETADA");
  const plannedExpeditions = effectiveExpeditions.filter((item) => item.status === "PROGRAMADA");
  const historyExpeditions = effectiveExpeditions.filter((item) => item.status === "COMPLETADA");
  const returningExpeditions = effectiveExpeditions.filter((item) => item.status === "REGRESANDO");
  const consumedResources = [
    { id: 1, resource: "Agua potable", amount: 35, date: "D-47 09:00", notes: "Raciones de salida" },
    { id: 2, resource: "Combustible", amount: 18, date: "D-47 07:30", notes: "Recorrido largo" },
    { id: 3, resource: "Raciones", amount: 24, date: "D-47 12:20", notes: "Equipo norte" },
  ];
  const gainedResources = [
    { id: 1, resource: "Medicamentos", amount: 42, date: "D-47 14:20", notes: "Hospital norte" },
    { id: 2, resource: "Baterías", amount: 26, date: "D-46 18:10", notes: "Bodega industrial" },
    { id: 3, resource: "Filtros de agua", amount: 12, date: "D-47 15:10", notes: "Puesto abandonado" },
  ];

  const visibleExpeditions = useMemo(() => {
    if (sub === "Misiones activas") return activeExpeditions;
    if (sub === "Historial") return historyExpeditions;
    return effectiveExpeditions;
  }, [activeExpeditions, effectiveExpeditions, historyExpeditions, sub]);

  const selectedExpedition = visibleExpeditions.find((item) => item.id === selectedExpeditionId) ?? null;
  const selectedExpeditionRoute = selectedExpedition ? buildExpeditionRoute(selectedExpedition, mappedCamps) : null;

  useEffect(() => {
    setSelectedExpeditionId((prev) => {
      if (prev && visibleExpeditions.some((item) => item.id === prev)) return prev;
      return visibleExpeditions[0]?.id ?? null;
    });
  }, [visibleExpeditions]);

  const handleComplete = async (expeditionId: number) => {
    setCompletingId(expeditionId);
    try {
      await onCompleteExpedition(expeditionId);
    } finally {
      setCompletingId(null);
    }
  };

  const deployedPeopleCount = activeExpeditions.reduce((sum, expedition) => sum + expedition.participants.length, 0);
  const averageProgress =
    activeExpeditions.length === 0
      ? 0
      : Math.round(
          activeExpeditions.reduce((sum, expedition) => sum + Math.min(100, Math.round((expedition.day / Math.max(1, expedition.total)) * 100)), 0)
            / activeExpeditions.length,
        );

  return (
    <div className="admin-ui-v2-expeditions">
      <div className="admin-ui-v2-module-card admin-ui-v2-expedition-command">
        <div>
          <h3>Control de expediciones</h3>
          <p>Mapa de rutas, misiones activas, historial y balance de recursos obtenidos o consumidos.</p>
        </div>
        <div className="admin-ui-v2-expedition-radar">
          <span>{averageProgress}%</span>
          <small>avance promedio</small>
        </div>
      </div>

      <div className="admin-ui-v2-grid admin-ui-v2-grid-4">
        <MetricCard label="En curso" value={effectiveExpeditions.filter((item) => item.status === "EN CURSO").length} tone="info" />
        <MetricCard label="Programadas" value={plannedExpeditions.length} tone="warn" />
        <MetricCard label="Regresando" value={returningExpeditions.length} tone="danger" />
        <MetricCard label="Completadas" value={historyExpeditions.length} tone="ok" />
      </div>

      {sub === "Mapa operativo" && (
        mappedCamps.length > 1 ? (
          <div className="admin-ui-v2-map-shell">
            {isSimulatedMap && (
              <div className="admin-ui-v2-map-sim-banner">
                Datos simulados de rutas por coordenadas hasta recibir ubicaciones reales de expedición.
              </div>
            )}
            <ExpeditionsWorldMap camps={mappedCamps} selectedCampId={selectedCampId} onSelectCamp={setSelectedCampId} />
          </div>
        ) : (
          <div className="admin-ui-v2-module-card">
            <h3>Mapa operativo</h3>
            <p>Se requieren al menos dos campamentos con coordenadas para renderizar rutas intercampamento.</p>
          </div>
        )
      )}

      {sub === "Recursos" && (
        <div className="admin-ui-v2-expedition-resources">
          <div className="admin-ui-v2-grid admin-ui-v2-grid-3">
            <div className="admin-ui-v2-module-card">
              <h3>Personal desplegado</h3>
              <p>{deployedPeopleCount} supervivientes en operaciones fuera del campamento.</p>
            </div>
            <div className="admin-ui-v2-module-card">
              <h3>Progreso promedio</h3>
              <p>{averageProgress}% de avance en expediciones activas.</p>
            </div>
            <div className="admin-ui-v2-module-card">
              <h3>Cierre operativo</h3>
              <p>{returningExpeditions.length} expediciones en retorno y {historyExpeditions.length} en historial cerrado.</p>
            </div>
          </div>

          <div className="admin-ui-v2-expedition-ledger">
            <div className="admin-ui-v2-module-card">
              <div className="admin-ui-v2-section-head">
                <span>Recursos consumidos</span>
                <span>Salida</span>
              </div>
              {consumedResources.map((item) => (
                <ResourceLedgerRow key={item.id} entry={item} direction="out" />
              ))}
            </div>
            <div className="admin-ui-v2-module-card">
              <div className="admin-ui-v2-section-head">
                <span>Recursos obtenidos</span>
                <span>Retorno</span>
              </div>
              {gainedResources.map((item) => (
                <ResourceLedgerRow key={item.id} entry={item} direction="in" />
              ))}
            </div>
          </div>
        </div>
      )}

      {(sub === "Misiones activas" || sub === "Historial") && (
        <div className="admin-ui-v2-expeditions-grid">
          <div className="admin-ui-v2-module-card admin-ui-v2-expeditions-list">
            {visibleExpeditions.map((expedition) => {
              const isSelected = selectedExpeditionId === expedition.id;
              const progress = Math.min(100, Math.round((expedition.day / Math.max(1, expedition.total)) * 100));
              return (
                <button
                  className={`admin-ui-v2-expedition-row${isSelected ? " is-selected" : ""}`}
                  key={expedition.id}
                  onClick={() => setSelectedExpeditionId(expedition.id)}
                  type="button"
                >
                  <div className="admin-ui-v2-expedition-row-top">
                    <strong>{expedition.name}</strong>
                    <span className={`admin-ui-v2-pill ${expeditionPillClass(expedition.status)}`}>{expedition.status}</span>
                  </div>
                  <p>{expedition.objective}</p>
                  <small>
                    Sector: {expedition.sector} | Dia {expedition.day}/{expedition.total}
                  </small>
                  <div className="admin-ui-v2-expedition-progress">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                </button>
              );
            })}
            {visibleExpeditions.length === 0 && <div className="admin-ui-v2-empty-cell">Sin registros para esta vista.</div>}
          </div>

          <div className="admin-ui-v2-module-card">
            {selectedExpedition ? (
              <div className="admin-ui-v2-expedition-detail">
                <div className="admin-ui-v2-expedition-detail-head">
                  <div>
                    <h3>{selectedExpedition.name}</h3>
                    <p>{selectedExpedition.objective}</p>
                  </div>
                  <span className={`admin-ui-v2-pill ${expeditionPillClass(selectedExpedition.status)}`}>{selectedExpedition.status}</span>
                </div>

                {selectedExpeditionRoute && (
                  <div className="admin-ui-v2-expedition-mini-map">
                    <WorldMap dots={[selectedExpeditionRoute]} lineColor="#69BFB7" />
                    <div className="admin-ui-v2-mini-map-caption">
                      <span>Ruta específica</span>
                      <strong>{selectedExpeditionRoute.start.label} &gt; {selectedExpeditionRoute.end.label}</strong>
                    </div>
                  </div>
                )}

                <div className="admin-ui-v2-expedition-facts">
                  <div><strong>Sector</strong><span>{selectedExpedition.sector}</span></div>
                  <div><strong>Duración</strong><span>Día {selectedExpedition.day}/{selectedExpedition.total}</span></div>
                  <div><strong>Progreso</strong><span>{Math.min(100, Math.round((selectedExpedition.day / Math.max(1, selectedExpedition.total)) * 100))}%</span></div>
                  <div><strong>Participantes</strong><span>{selectedExpedition.participants.length}</span></div>
                </div>

                <div className="admin-ui-v2-expedition-route-card">
                  <span>Ruta estimada</span>
                  <strong>Base alfa &gt; {selectedExpedition.sector}</strong>
                  <p>Visualización simulada por coordenadas para validar dirección y trazado operativo.</p>
                </div>
                {selectedExpedition.participants.length > 0 && (
                  <div className="admin-ui-v2-adm-skills">
                    {selectedExpedition.participants.map((participant, index) => (
                      <span key={`${selectedExpedition.id}-${participant}-${index}`} className="admin-ui-v2-pill is-info">
                        {participant}
                      </span>
                    ))}
                  </div>
                )}
                {selectedExpedition.status !== "COMPLETADA" ? (
                  <div className="admin-ui-v2-actions">
                    <button
                      className="admin-ui-v2-btn is-ok"
                      onClick={() => void handleComplete(selectedExpedition.id)}
                      type="button"
                      disabled={completingId === selectedExpedition.id}
                    >
                      {completingId === selectedExpedition.id ? "Completando..." : "Completar expedición"}
                    </button>
                  </div>
                ) : (
                  <div className="admin-ui-v2-muted">Misión cerrada y transferida a historial.</div>
                )}
              </div>
            ) : (
              <div className="admin-ui-v2-empty-cell">Selecciona una expedición para ver detalle.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ResourceLedgerRow({
  entry,
  direction,
}: {
  entry: { resource: string; amount: number; date: string; notes: string };
  direction: "in" | "out";
}) {
  return (
    <div className={`admin-ui-v2-resource-row is-${direction}`}>
      <div>
        <strong>{entry.resource}</strong>
        <span>{entry.notes}</span>
        <small>{entry.date}</small>
      </div>
      <em>{direction === "in" ? "+" : "-"}{entry.amount}</em>
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: "info" | "ok" | "warn" | "danger" }) {
  return (
    <div className={`admin-ui-v2-metric ${tone}`}>
      <span className="admin-ui-v2-metric-value">{value}</span>
      <span className="admin-ui-v2-metric-label">{label}</span>
    </div>
  );
}

function PanelMessage({ label, type }: { label: string; type: "info" | "error" }) {
  return <div className={`admin-ui-v2-message ${type}`}>{label}</div>;
}

function BottomDock({ activeDock, onSelect }: { activeDock: AdminSectionId; onSelect: (id: AdminSectionId) => void }) {
  const dockItems = BOTTOM_DOCK_ORDER
    .map((id) => NAVIGATION_DATA.find((item) => item.id === id))
    .filter((item): item is NavItem => Boolean(item));

  return (
    <footer aria-label="Navegación del panel admin" className="dock">
      {dockItems.map((item) => (
        <button
          aria-label={item.label}
          className={`dock-item ${activeDock === item.id ? "is-active" : ""}`}
          key={item.id}
          onClick={() => onSelect(item.id)}
          type="button"
        >
          <span className="dock-content">{item.icon}</span>
        </button>
      ))}
    </footer>
  );
}

function SupportLink() {
  return (
    <button className="support-link" type="button">
      <span className="btn-text">
        <span>?</span> Support
      </span>
    </button>
  );
}

function SettingsHint() {
  return (
    <button className="settings-hint" type="button">
      <span className="btn-text">
        Admin <GearIcon />
      </span>
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

function ChevronLeft() {
  return (
    <svg aria-hidden="true" className="h-4 w-3" fill="none" viewBox="0 0 10 16">
      <path d="M8 2 2 8l6 6" stroke="currentColor" strokeLinecap="square" strokeWidth="3" />
    </svg>
  );
}

function RadarIcon() {
  return (
    <IconSvg>
      <circle cx="16" cy="16" r="10" />
      <circle cx="16" cy="16" r="5" />
      <path d="M16 6v10l7 7" />
    </IconSvg>
  );
}

function ProfileIcon() {
  return (
    <IconSvg>
      <path d="M16 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" />
      <path d="M7 27c2.2-4.2 5.1-6.3 9-6.3s6.8 2.1 9 6.3" />
    </IconSvg>
  );
}

function ShieldIcon() {
  return (
    <IconSvg>
      <path d="M16 4 25 8v7c0 6-4 10-9 13-5-3-9-7-9-13V8l9-4Z" />
      <path d="m12 16 3 3 5-6" />
    </IconSvg>
  );
}

function CrateIcon() {
  return (
    <IconSvg>
      <path d="M6 11 16 6l10 5-10 5-10-5Z" />
      <path d="M6 11v10l10 5 10-5V11" />
      <path d="M16 16v10" />
    </IconSvg>
  );
}

function CompassIcon() {
  return (
    <IconSvg>
      <path d="M16 4a12 12 0 1 0 0 24 12 12 0 0 0 0-24Z" />
      <path d="m20 12-3 8-5-3 8-5Z" />
    </IconSvg>
  );
}

function VehicleIcon() {
  return (
    <IconSvg>
      <path d="M4 18h22l2 4H7l-3-4Z" />
      <path d="M8 18 12 10h8l4 8" />
      <path d="M10 23h4m7 0h4" />
    </IconSvg>
  );
}

function SecurityIcon() {
  return (
    <IconSvg>
      <path d="M16 4 25 8v7c0 6-4 10-9 13-5-3-9-7-9-13V8l9-4Z" />
      <path d="M16 12v5" />
      <circle cx="16" cy="21" r="1" />
    </IconSvg>
  );
}

function AlertIcon() {
  return (
    <IconSvg>
      <path d="M16 5 3 27h26L16 5Z" />
      <path d="M16 13v7" />
      <circle cx="16" cy="23" r="1" />
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
