import { memo, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
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
import type { Person } from "../../persons/types";
import { deletePerson, updatePerson, updatePersonPhoto } from "../../persons/api/mutations";
import type { Camp } from "../../camps/types";
import type { Occupation } from "../../catalogs/types";
import {
  getCampAchievementsProgress,
  getServerTime,
  getLatestCampAchievementUnlocks,
  listNotifications,
  markCampAchievementSeen,
  updateAdmissionRequestStatus,
  ADMIN_DASHBOARD_BOOT_MAX_VISUAL_LEAD,
  ADMIN_DASHBOARD_BOOT_MIN_MS,
  INITIAL_DASHBOARD_KPI,
  bootstrapAdminDashboard,
  type CampAchievementProgress,
  type CampAchievementUnlock,
  type AdminDashboardBootstrapData,
} from "../services";
import {
  mapNotificationFromApi,
} from "../mappers/adminMappers";
import { ExpeditionsWorldMap, prefetchExpeditionsWorldMap } from "../expeditions/components/ExpeditionsWorldMap";
import type { MappedCampPoint } from "../expeditions/types";
import { AdminSyncOverlay } from "../components/AdminSyncOverlay";
import { SESSION_TOKEN_CHANGED_EVENT } from "../../../shared/services/sessionService";
import { ApiHttpError, apiRequest } from "../../../shared/services/httpClient";
import { getErrorMessage } from "../../../shared/services/errorMessages";
import { PopupMessage } from "../../../shared/components/PopupMessage";
import "../../expeditions-ui/expeditionsUi.css";
import "../expeditions/expeditions-panel.css";
import "./admin-dashboard.css";

type AdminSectionId =
  | "centro"
  | "poblacion"
  | "admisiones"
  | "expediciones"
  | "intercamp"
  | "logros"
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
  workflowStatus: "PENDING_AI" | "PENDING_ADMIN" | "APPROVED" | "REJECTED";
  skills: string[];
  reason: string;
  suggestedOccupationId?: number;
  finalOccupationId?: number;
  rejectionReason?: string;
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

type ModuleMessageType = "info" | "warning" | "error" | "success";

interface ModuleFeedback {
  section: AdminSectionId | "global";
  message: string;
  type: ModuleMessageType;
  id: number;
}

interface ResourceTrendPoint {
  day: string;
  food: number;
  water: number;
  ammo: number;
}

interface ResourceLedgerEntry {
  id: number;
  resource: string;
  amount: number;
  date: string;
  notes: string;
}

interface SessionAdminUser {
  id?: number;
  personId?: number;
  person_id?: number;
  userId?: number;
  username?: string;
  displayName?: string;
  firstName?: string;
  lastName1?: string;
  lastName2?: string;
  role?: string;
  campId?: number;
  photoUrl?: string;
  imageUrl?: string;
  profileImage?: string;
  avatar?: string;
  photo?: string;
}

interface AdminProfileSummary {
  id: number | null;
  username: string;
  displayName: string;
  firstName: string;
  lastName1: string;
  lastName2: string;
  role: string;
  occupation: string;
  camp: string;
  status: string;
  avatarUrl: string | null;
  sessionState: "ACTIVA" | "INACTIVA";
}

interface GlobalTimeState {
  baseServerTime: Date;
  syncedAtClientMs: number;
  status: "synced" | "syncing" | "error";
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

type TemporaryView = "sectors" | "timeline" | "quick" | "history";

interface TemporarySector {
  id: string;
  name: string;
  tag: string;
  description: string;
  primaryRole: string;
  basePerformance: number;
  keywords: string[];
}

const TEMPORARY_SECTORS: TemporarySector[] = [
  {
    id: "alfa",
    name: "Sector Alfa",
    tag: "ALFA_DEF",
    description: "Guardia perimetral, seguridad interna y cobertura defensiva del campamento.",
    primaryRole: "Centinela de Perímetro",
    basePerformance: 68,
    keywords: ["centinela", "guardia", "defensa", "perimetro", "perímetro", "seguridad", "explorador"],
  },
  {
    id: "delta",
    name: "Sector Delta",
    tag: "DELTA_LOG",
    description: "Logística, inventario, reparaciones críticas y soporte técnico operativo.",
    primaryRole: "Operador de Suministros",
    basePerformance: 62,
    keywords: ["suministro", "logistica", "logística", "mecanico", "mecánico", "tecnico", "técnico", "redes", "estructural"],
  },
  {
    id: "omega",
    name: "Sector Omega",
    tag: "OMEGA_MED",
    description: "Unidad clínica, contención sanitaria y respuesta médica de emergencia.",
    primaryRole: "Soporte Sanitario de Campo",
    basePerformance: 76,
    keywords: ["clinico", "clínico", "medico", "médico", "sanitario", "salud", "enfermer", "farmacia", "cirugia", "cirugía"],
  },
  {
    id: "sigma",
    name: "Sector Sigma",
    tag: "SIGMA_AGR",
    description: "Producción alimentaria, agua, cultivos protegidos y estabilidad ambiental.",
    primaryRole: "Ingeniero Hidropónico",
    basePerformance: 54,
    keywords: ["hidropon", "agr", "cultivo", "botan", "agua", "alimento", "invernadero"],
  },
  {
    id: "general",
    name: "Reserva General",
    tag: "GEN_POOL",
    description: "Asignaciones sin sector específico derivado del oficio temporal.",
    primaryRole: "Operario General",
    basePerformance: 50,
    keywords: [],
  },
];

const NAVIGATION_DATA: NavItem[] = [
  { id: "centro", label: "Centro de Mando", icon: <RadarIcon />, subOptions: ["Resumen táctico", "Monitoreo general"] },
  { id: "poblacion", label: "Población", icon: <ProfileIcon />, subOptions: ["Estadísticas", "Usuarios", "Oficios temporales"] },
  { id: "admisiones", label: "Admisiones IA", icon: <ShieldIcon />, subOptions: ["Pendientes", "Historial"] },
  {
    id: "expediciones",
    label: "Expediciones",
    icon: <CompassIcon />,
    subOptions: ["Mapa operativo", "Misiones activas", "Historial", "Recursos"],
  },
  { id: "intercamp", label: "Inter-campamentos", icon: <VehicleIcon />, subOptions: ["Pendientes", "Historial"] },
  { id: "logros", label: "Logros", icon: <TrophyIcon />, subOptions: ["Progreso", "Desbloqueados", "Historial"] },
  { id: "seguridad", label: "Seguridad", icon: <SecurityIcon />, subOptions: ["En vivo", "Errores", "Sistema"] },
  { id: "notificaciones", label: "Notificaciones", icon: <AlertIcon />, subOptions: ["Todas", "No leídas", "Críticas"] },
  { id: "configuracion", label: "Configuración", icon: <GearIcon />, subOptions: ["Campamento"] },
];

const BOTTOM_DOCK_ORDER: AdminSectionId[] = ["poblacion", "admisiones", "expediciones", "intercamp", "logros"];

const SECTION_DESCRIPTIONS: Record<AdminSectionId, string> = {
  centro: "Vista global del sistema, alertas y salud operativa del campamento.",
  poblacion: "Gestión de supervivientes, estado individual y asignaciones temporales.",
  admisiones: "Análisis asistido para admisiones nuevas y validación de perfiles.",
  expediciones: "Seguimiento de operaciones de campo, rutas y resultados.",
  intercamp: "Solicitudes y traslados entre campamentos aliados.",
  logros: "Seguimiento de logros automáticos desbloqueados por desempeño del campamento.",
  seguridad: "Auditoría, trazas y eventos críticos del sistema.",
  notificaciones: "Centro de notificaciones con priorización por severidad.",
  configuracion: "Parámetros operativos y políticas del panel administrativo.",
};

function expeditionRouteStatus(status: UiExpedition["status"]): string {
  if (status === "PROGRAMADA") return "PLANNED";
  if (status === "REGRESANDO") return "DELAYED";
  if (status === "COMPLETADA") return "COMPLETED";
  return "IN_PROGRESS";
}

function buildExpeditionRoute(expedition: UiExpedition, points: MappedCampPoint[]) {
  const base = points[0];
  if (!base) return null;
  const destinations = points.filter((point) => point.id !== base.id);
  const destination = destinations[expedition.id % Math.max(1, destinations.length)];
  if (!destination) return null;

  return {
    start: { lat: base.latitude, lng: base.longitude, label: "Base" },
    end: { lat: destination.latitude, lng: destination.longitude, label: destination.name.slice(0, 14) },
    status: expeditionRouteStatus(expedition.status),
  };
}

const INITIAL_TEMP_ASSIGNMENTS: TempRoleAssignment[] = [];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function firstNumberField(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function firstStringField(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return null;
}

function extractTemporaryAssignmentList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];

  for (const key of ["items", "records", "results", "assignments", "temporaryOccupationAssignments", "temporaryAssignments", "data"]) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
  }

  return [];
}

function assignmentStatusFromApi(item: Record<string, unknown>): TempRoleAssignment["status"] {
  const rawStatus = firstStringField(item, ["status", "state", "assignmentStatus"]);
  const normalizedStatus = rawStatus?.trim().toUpperCase();
  const revokedAt = firstStringField(item, ["revokedAt", "revoked_at", "deletedAt", "deleted_at", "finishedAt", "finished_at"]);

  if (revokedAt || normalizedStatus === "FINALIZADA" || normalizedStatus === "FINISHED" || normalizedStatus === "REVOKED" || normalizedStatus === "INACTIVE") {
    return "FINALIZADA";
  }

  return "ACTIVA";
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function temporarySectorForRole(roleName: string): TemporarySector {
  const normalized = normalizeSearchText(roleName);
  return TEMPORARY_SECTORS.find((sector) => sector.keywords.some((keyword) => normalized.includes(normalizeSearchText(keyword))))
    ?? TEMPORARY_SECTORS[TEMPORARY_SECTORS.length - 1];
}

function parseTemporaryDate(value: string): Date {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return new Date(value);
}

function temporaryAssignmentProgress(startDate: string, endDate: string): { value: number; urgent: boolean; label: string } {
  const start = parseTemporaryDate(startDate).getTime();
  const end = parseTemporaryDate(endDate).getTime();
  const now = Date.now();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return { value: 0, urgent: false, label: "Sin ventana definida" };
  }

  const value = Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
  const urgent = now < end && end - now < 24 * 60 * 60 * 1000;
  return { value, urgent, label: `${value}% completado` };
}

function temporaryDateLabel(value: string): string {
  const parsed = parseTemporaryDate(value);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";
  return parsed.toLocaleDateString("es-CR");
}

function dateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateInputFromToday(daysToAdd = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  return dateInputValue(date);
}

function startOfLocalDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function temporaryNameInitials(name: string): string {
  return resolveInitials(name.split(/\s+/), 2);
}

function nestedName(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (!isRecord(value)) continue;

    const directName = firstStringField(value, ["name", "fullName", "displayName", "nombre"]);
    if (directName) return directName;

    const firstName = firstStringField(value, ["firstName", "nombre", "primerNombre", "first_name"]);
    const lastName = firstStringField(value, ["lastName", "apellido", "last_name"]);
    const resolvedName = [firstName, lastName].filter(Boolean).join(" ").trim();
    if (resolvedName) return resolvedName;
  }

  return null;
}

function buildResourceTrendData(records: Array<Record<string, unknown>>): ResourceTrendPoint[] {
  const byDay = new Map<string, ResourceTrendPoint>();

  const bucketFromResource = (resourceValue: string): keyof Omit<ResourceTrendPoint, "day"> => {
    const normalized = resourceValue.toLowerCase();
    if (normalized.includes("agua")) return "water";
    if (normalized.includes("mun") || normalized.includes("ammo")) return "ammo";
    return "food";
  };

  for (const record of records) {
    const dateValue =
      typeof record.createdAt === "string"
        ? record.createdAt
        : typeof record.date === "string"
          ? record.date
          : "";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) continue;

    const key = date.toISOString().slice(0, 10);
    const dayLabel = date.toLocaleDateString("es-CR", { day: "2-digit", month: "2-digit" });
    const quantityRaw =
      typeof record.quantity === "number"
        ? record.quantity
        : typeof record.amount === "number"
          ? record.amount
          : 0;
    const quantity = Number.isFinite(quantityRaw) ? Math.max(0, Math.abs(quantityRaw)) : 0;
    const resource =
      typeof record.resourceName === "string"
        ? record.resourceName
        : typeof record.resourceTypeName === "string"
          ? record.resourceTypeName
          : typeof record.resource === "string"
            ? record.resource
            : "recurso";
    const movementType =
      typeof record.movementType === "string"
        ? record.movementType.toUpperCase()
        : typeof record.type === "string"
          ? record.type.toUpperCase()
          : "";
    const signedValue = movementType.includes("OUT") || movementType.includes("EGRES") ? -quantity : quantity;

    const point = byDay.get(key) ?? { day: dayLabel, food: 0, water: 0, ammo: 0 };
    const bucket = bucketFromResource(resource);
    point[bucket] += signedValue;
    byDay.set(key, point);
  }

  return Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-7)
    .map(([, value]) => value);
}

function buildResourceLedger(records: Array<Record<string, unknown>>): { consumed: ResourceLedgerEntry[]; gained: ResourceLedgerEntry[] } {
  const rows = records
    .map((record, index) => {
      const movementType =
        typeof record.movementType === "string"
          ? record.movementType.toUpperCase()
          : typeof record.type === "string"
            ? record.type.toUpperCase()
            : "";
      const amountRaw =
        typeof record.quantity === "number"
          ? record.quantity
          : typeof record.amount === "number"
            ? record.amount
            : 0;
      const amount = Number.isFinite(amountRaw) ? Math.abs(amountRaw) : 0;
      const resource =
        typeof record.resourceName === "string"
          ? record.resourceName
          : typeof record.resourceTypeName === "string"
            ? record.resourceTypeName
            : typeof record.resource === "string"
              ? record.resource
              : "Recurso";
      const dateValue =
        typeof record.createdAt === "string"
          ? record.createdAt
          : typeof record.date === "string"
            ? record.date
            : "";
      const parsedDate = new Date(dateValue);
      const date = Number.isNaN(parsedDate.getTime())
        ? "Sin fecha"
        : parsedDate.toLocaleString("es-CR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

      return {
        id: typeof record.id === "number" ? record.id : Date.now() + index,
        movementType,
        amount,
        resource,
        date,
        notes:
          typeof record.reason === "string"
            ? record.reason
            : typeof record.description === "string"
              ? record.description
              : "Sin detalle",
      };
    })
    .filter((item) => item.amount > 0)
    .slice(0, 80);

  const consumed = rows
    .filter((item) => item.movementType.includes("OUT") || item.movementType.includes("EGRES"))
    .slice(0, 8)
    .map(({ id, resource, amount, date, notes }) => ({ id, resource, amount, date, notes }));
  const gained = rows
    .filter((item) => item.movementType.includes("IN") || item.movementType.includes("INGRES"))
    .slice(0, 8)
    .map(({ id, resource, amount, date, notes }) => ({ id, resource, amount, date, notes }));

  return { consumed, gained };
}

function normalizeStatusLabel(status: Person["status"]): string {
  if (status === "ACTIVE") return "Activo";
  if (status === "INJURED") return "Herido";
  if (status === "SICK") return "Enfermo";
  if (status === "OUTSIDE_CAMP" || status === "ON_EXPEDITION") return "Fuera";
  return "Inactivo";
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

function resolveInitials(parts: Array<string | null | undefined>, maxLetters = 3): string {
  const initials = parts
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .filter(Boolean)
    .slice(0, maxLetters)
    .join("");
  return initials || "USR";
}

function personInitials(person: Person): string {
  const lastNameTokens = String(person.lastName ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return resolveInitials([person.firstName, lastNameTokens[0], lastNameTokens[1]], 3);
}

function resolvePersonProfileImage(person: Person | null): string | null {
  if (!person) return null;
  const candidate =
    (typeof person.photoUrl === "string" && person.photoUrl.trim()) ||
    (typeof person.profileImage === "string" && person.profileImage.trim()) ||
    (typeof person.avatar === "string" && person.avatar.trim()) ||
    (typeof person.photo === "string" && person.photo.trim()) ||
    (typeof person.imageUrl === "string" && person.imageUrl.trim()) ||
    "";
  return candidate || null;
}

function resolveSessionPerson(profile: SessionAdminUser, persons: Person[]): Person | null {
  const explicitPersonId =
    typeof profile.personId === "number"
      ? profile.personId
      : typeof profile.person_id === "number"
        ? profile.person_id
        : null;
  if (explicitPersonId !== null) {
    return persons.find((person) => person.id === explicitPersonId) ?? null;
  }

  const sessionId = typeof profile.id === "number" ? profile.id : typeof profile.userId === "number" ? profile.userId : null;
  if (sessionId !== null) {
    const linkedPerson = persons.find(
      (person) => person.userId === sessionId || person.systemUserId === sessionId || person.accountId === sessionId,
    );
    if (linkedPerson) return linkedPerson;
  }

  const username = profile.username?.trim().toLowerCase();
  if (username) {
    return persons.find((person) => person.username?.trim().toLowerCase() === username) ?? null;
  }

  if (sessionId !== null) {
    return persons.find((person) => person.id === sessionId) ?? null;
  }

  return null;
}

function resolveSessionPersonId(profile: SessionAdminUser, persons: Person[]): number | null {
  if (typeof profile.personId === "number") return profile.personId;
  if (typeof profile.person_id === "number") return profile.person_id;
  return resolveSessionPerson(profile, persons)?.id ?? null;
}

function achievementUnlockKey(item: Pick<CampAchievementUnlock, "achievementId" | "unlockedAt">): string {
  return `${item.achievementId}:${item.unlockedAt}`;
}

function achievementProgressRatio(item: CampAchievementProgress): number {
  if (item.isUnlocked) return 1;
  if (!Number.isFinite(item.targetValue) || item.targetValue <= 0) return 0;
  if (item.progressSnapshot === null || item.progressSnapshot === undefined || !Number.isFinite(item.progressSnapshot)) return 0;
  const normalized = Math.max(0, item.progressSnapshot / item.targetValue);
  return Math.max(0, Math.min(1, normalized));
}

function achievementValueLabel(item: CampAchievementProgress): string {
  const progressRaw = item.progressSnapshot;
  if (progressRaw === null || progressRaw === undefined || !Number.isFinite(progressRaw)) {
    return "En evaluacion por cron";
  }

  const progress = Number(progressRaw);
  const metric = item.metricKey.toLowerCase();
  if (metric.includes("rate") || item.targetValue <= 1) {
    return `${Math.round(progress * 100)}% de ${Math.round(item.targetValue * 100)}%`;
  }
  return `${Math.round(progress)} de ${Math.round(item.targetValue)}`;
}

function achievementDateLabel(value?: string | null): string {
  if (!value) return "Sin fecha";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("es-CR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function readSessionAdminUser(): SessionAdminUser {
  try {
    const rawUser = localStorage.getItem("user");
    const rawSettings = localStorage.getItem("admin_settings_v2");

    const parsedUser = rawUser ? (JSON.parse(rawUser) as SessionAdminUser) : {};
    const parsedSettings = rawSettings ? (JSON.parse(rawSettings) as Record<string, unknown>) : {};

    const resolvedUser: SessionAdminUser =
      parsedUser && typeof parsedUser === "object" ? parsedUser : {};

    if (parsedSettings && typeof parsedSettings === "object") {
      if (typeof parsedSettings.firstName === "string") {
        resolvedUser.firstName = parsedSettings.firstName;
      }
      if (typeof parsedSettings.lastName1 === "string") {
        resolvedUser.lastName1 = parsedSettings.lastName1;
      }
      if (typeof parsedSettings.lastName2 === "string") {
        resolvedUser.lastName2 = parsedSettings.lastName2;
      }
    }

    return resolvedUser;
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

function resolveAdminProfileImage(sessionUser: SessionAdminUser, matchedPerson: Person | null): string | null {
  const storedProfileImage =
    (typeof sessionUser.photoUrl === "string" && sessionUser.photoUrl.trim()) ||
    (typeof sessionUser.imageUrl === "string" && sessionUser.imageUrl.trim()) ||
    (typeof sessionUser.profileImage === "string" && sessionUser.profileImage.trim()) ||
    (typeof sessionUser.avatar === "string" && sessionUser.avatar.trim()) ||
    (typeof sessionUser.photo === "string" && sessionUser.photo.trim()) ||
    "";

  if (storedProfileImage) {
    return storedProfileImage;
  }

  return resolvePersonProfileImage(matchedPerson);
}

function formatHudDateTime(date: Date): { day: string; time: string } {
  const day = `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
  const time = `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}:${String(date.getUTCSeconds()).padStart(2, "0")} UTC`;
  return { day, time };
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialBootstrapDataRef = useRef(
    (location.state as { bootstrappedDashboardData?: AdminDashboardBootstrapData } | null)?.bootstrappedDashboardData ?? null,
  );
  const initialBootstrapData = initialBootstrapDataRef.current;

  const [hasEntered] = useState(true);

  const [activeNav, setActiveNav] = useState<AdminSectionId>("centro");
  const [activeSub, setActiveSub] = useState<string>(NAVIGATION_DATA.find((item) => item.id === "centro")?.subOptions[0] ?? "Resumen táctico");

  const [dataError, setDataError] = useState<string | null>(null);

  const [persons, setPersons] = useState<Person[]>(initialBootstrapData?.persons ?? []);
  const [camps, setCamps] = useState<Camp[]>(initialBootstrapData?.camps ?? []);
  const [occupations, setOccupations] = useState<Occupation[]>(initialBootstrapData?.occupations ?? []);
  const [admissions, setAdmissions] = useState<UiAdmission[]>(initialBootstrapData?.admissions ?? []);
  const [expeditions, setExpeditions] = useState<UiExpedition[]>(initialBootstrapData?.expeditions ?? []);
  const [intercampRequests, setIntercampRequests] = useState<UiIntercampRequest[]>(initialBootstrapData?.intercampRequests ?? []);
  const [dashboardKpi, setDashboardKpi] = useState<DashboardKpi>(initialBootstrapData?.dashboardKpi ?? INITIAL_DASHBOARD_KPI);
  const [notifications, setNotifications] = useState<UiNotification[]>([]);
  const [resourceTrendData, setResourceTrendData] = useState<ResourceTrendPoint[]>([]);
  const [consumedResources, setConsumedResources] = useState<ResourceLedgerEntry[]>([]);
  const [gainedResources, setGainedResources] = useState<ResourceLedgerEntry[]>([]);
  const [achievementProgress, setAchievementProgress] = useState<CampAchievementProgress[]>([]);
  const [achievementUnlockQueue, setAchievementUnlockQueue] = useState<CampAchievementUnlock[]>([]);
  const [activeAchievementUnlock, setActiveAchievementUnlock] = useState<CampAchievementUnlock | null>(null);
  const [sessionState, setSessionState] = useState<"ACTIVA" | "INACTIVA">("INACTIVA");
  const [moduleFeedback, setModuleFeedback] = useState<ModuleFeedback | null>(null);
  const [sessionAdminUser, setSessionAdminUser] = useState<SessionAdminUser>(() => readSessionAdminUser());
  const [dashboardPopup, setDashboardPopup] = useState<{ id: number; message: string; type: ModuleMessageType } | null>(null);
  const [globalTimeState, setGlobalTimeState] = useState<GlobalTimeState>({
    baseServerTime: new Date(),
    syncedAtClientMs: Date.now(),
    status: "syncing",
  });
  const lastActivityUpdateRef = useRef(0);
  const lastActivityAtRef = useRef(Date.now());
  const bootStartedAtRef = useRef<number>(Date.now());
  const initialCoreLoadStartedRef = useRef(false);
  const preloadedDeferredLoadStartedRef = useRef(false);
  const [isBootstrapping, setIsBootstrapping] = useState(!initialBootstrapData);
  const [bootDataProgress, setBootDataProgress] = useState(0);
  const [bootVisualProgress, setBootVisualProgress] = useState(0);
  const [bootPhase, setBootPhase] = useState("Inicializando consola tactica...");
  const seenAchievementKeysRef = useRef<Set<string>>(new Set());

  const notifyModule = useCallback(
    (section: AdminSectionId | "global", type: ModuleMessageType, message: string) => {
      setModuleFeedback({ section, type, message, id: Date.now() });
    },
    [],
  );

  const enqueueAchievementUnlocks = useCallback(
    (items: CampAchievementUnlock[]) => {
      if (items.length === 0) return;

      setAchievementUnlockQueue((prev) => {
        const queuedKeys = new Set(prev.map((item) => achievementUnlockKey(item)));
        const activeKey = activeAchievementUnlock ? achievementUnlockKey(activeAchievementUnlock) : null;
        const nextQueue = [...prev];

        for (const item of items) {
          if (item.isSeen) continue;
          const key = achievementUnlockKey(item);
          if (seenAchievementKeysRef.current.has(key) || queuedKeys.has(key) || key === activeKey) continue;
          queuedKeys.add(key);
          nextQueue.push(item);
        }

        return nextQueue;
      });
    },
    [activeAchievementUnlock],
  );

  const applyBootstrapData = useCallback((data: AdminDashboardBootstrapData) => {
    setPersons(data.persons);
    setCamps(data.camps);
    setOccupations(data.occupations);
    setAdmissions(data.admissions);
    setExpeditions(data.expeditions);
    setIntercampRequests(data.intercampRequests);
    setDashboardKpi(data.dashboardKpi);
  }, []);

  const loadDeferredDashboardData = useCallback(async () => {
    let deferredFailedCount = 0;

    const safeRunDeferred = async <T,>(runner: () => Promise<T>, fallback: T): Promise<T> => {
      try {
        return await runner();
      } catch {
        deferredFailedCount += 1;
        return fallback;
      }
    };

    const [notificationRecords, achievementProgressRecords, latestAchievementUnlocks] = await Promise.all([
      safeRunDeferred(listNotifications, [] as Awaited<ReturnType<typeof listNotifications>>),
      safeRunDeferred(getCampAchievementsProgress, [] as Awaited<ReturnType<typeof getCampAchievementsProgress>>),
      safeRunDeferred(() => getLatestCampAchievementUnlocks(5), [] as Awaited<ReturnType<typeof getLatestCampAchievementUnlocks>>),
    ]);

    setNotifications(notificationRecords.map((item) => mapNotificationFromApi(item) as UiNotification));
    setResourceTrendData([]);
    setConsumedResources([]);
    setGainedResources([]);
    setAchievementProgress(achievementProgressRecords);
    enqueueAchievementUnlocks(latestAchievementUnlocks);

    if (deferredFailedCount > 0) {
      notifyModule("global", "warning", `Carga diferida parcial: ${deferredFailedCount} modulo(s) secundarios fallaron.`);
    }
  }, [enqueueAchievementUnlocks, notifyModule]);

  useEffect(() => {
    if (!moduleFeedback) return;
    const timeout = window.setTimeout(() => setModuleFeedback(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [moduleFeedback]);

  useEffect(() => {
    if (!moduleFeedback) return;
    setDashboardPopup({
      id: moduleFeedback.id,
      message: moduleFeedback.message,
      type: moduleFeedback.type,
    });
  }, [moduleFeedback]);

  useEffect(() => {
    if (!dataError) return;
    setDashboardPopup({
      id: Date.now(),
      message: dataError,
      type: "error",
    });
  }, [dataError]);

  const loadCoreData = useCallback(async () => {
    setDataError(null);
    setIsBootstrapping(true);
    setBootDataProgress(0);
    setBootVisualProgress(0);
    setBootPhase("Inicializando consola tactica...");
    bootStartedAtRef.current = Date.now();

    try {
      const data = await bootstrapAdminDashboard({
        onProgress: ({ progress, phase }) => {
          setBootDataProgress(progress);
          setBootPhase(phase);
        },
      });

      applyBootstrapData(data);

      if (data.criticalFailedCount > 0) {
        notifyModule("global", "warning", `Carga inicial parcial: ${data.criticalFailedCount} modulo(s) critico(s) fallaron en backend.`);
      }
      if (data.readOnlySkippedCount > 0) {
        notifyModule("global", "info", `Algunos modulos de consulta no estan disponibles para este rol (${data.readOnlySkippedCount}).`);
      }

      void loadDeferredDashboardData();
    } catch (error) {
      setDataError(getErrorMessage(error, "load_dashboard"));
      notifyModule("global", "error", "No se logro completar la sincronizacion general de modulos.");
    } finally {
      setBootDataProgress(100);
      setBootPhase("Finalizando despliegue...");
      const elapsed = Date.now() - bootStartedAtRef.current;
      const waitMs = Math.max(0, ADMIN_DASHBOARD_BOOT_MIN_MS - elapsed);
      if (waitMs > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, waitMs));
      }
      setIsBootstrapping(false);
    }
  }, [applyBootstrapData, loadDeferredDashboardData, notifyModule]);

  const dismissAchievementUnlock = useCallback(async () => {
    if (!activeAchievementUnlock) return;
    const item = activeAchievementUnlock;
    const unlockKey = achievementUnlockKey(item);
    seenAchievementKeysRef.current.add(unlockKey);
    setActiveAchievementUnlock(null);

    try {
      await markCampAchievementSeen(item.achievementId);
    } catch {
      notifyModule("logros", "warning", `No se pudo marcar como visto el logro #${item.achievementId}.`);
    }
  }, [activeAchievementUnlock, notifyModule]);

  useEffect(() => {
    if (!isBootstrapping) {
      setBootVisualProgress(100);
      return;
    }

    const timer = window.setInterval(() => {
      setBootVisualProgress((prev) => {
        const target = Math.min(99, bootDataProgress + ADMIN_DASHBOARD_BOOT_MAX_VISUAL_LEAD);
        if (prev >= target) return prev;
        return Math.min(target, prev + 1);
      });
    }, 26);

    return () => window.clearInterval(timer);
  }, [bootDataProgress, isBootstrapping]);

  useEffect(() => {
    if (!hasEntered) return;
    if (initialBootstrapDataRef.current) return;
    if (initialCoreLoadStartedRef.current) return;
    initialCoreLoadStartedRef.current = true;
    void loadCoreData();
  }, [hasEntered, loadCoreData]);

  useEffect(() => {
    const data = initialBootstrapDataRef.current;
    if (!data) return;
    if (preloadedDeferredLoadStartedRef.current) return;
    preloadedDeferredLoadStartedRef.current = true;

    if (data.criticalFailedCount > 0) {
      notifyModule("global", "warning", `Carga inicial parcial: ${data.criticalFailedCount} modulo(s) critico(s) fallaron en backend.`);
    }
    if (data.readOnlySkippedCount > 0) {
      notifyModule("global", "info", `Algunos modulos de consulta no estan disponibles para este rol (${data.readOnlySkippedCount}).`);
    }

    void loadDeferredDashboardData();
  }, [loadDeferredDashboardData, notifyModule]);

  useEffect(() => {
    if (!hasEntered) return;

    const syncGlobalTime = async () => {
      setGlobalTimeState((prev) => ({ ...prev, status: "syncing" }));
      try {
        const data = await getServerTime();
        const parsed = new Date(data.serverTime);
        if (Number.isNaN(parsed.getTime())) {
          throw new Error("Invalid server time");
        }

        setGlobalTimeState({
          baseServerTime: parsed,
          syncedAtClientMs: Date.now(),
          status: "synced",
        });
      } catch {
        setGlobalTimeState((prev) => ({
          ...prev,
          baseServerTime: new Date(),
          syncedAtClientMs: Date.now(),
          status: "error",
        }));
      }
    };

    void syncGlobalTime();
    const syncInterval = window.setInterval(() => {
      void syncGlobalTime();
    }, 60000);

    return () => window.clearInterval(syncInterval);
  }, [hasEntered]);

  useEffect(() => {
    if (activeAchievementUnlock || achievementUnlockQueue.length === 0) return;
    const [nextUnlock, ...rest] = achievementUnlockQueue;
    setAchievementUnlockQueue(rest);
    setActiveAchievementUnlock(nextUnlock);
  }, [activeAchievementUnlock, achievementUnlockQueue]);

  useEffect(() => {
    if (!activeAchievementUnlock) return;
    const timer = window.setTimeout(() => {
      void dismissAchievementUnlock();
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [activeAchievementUnlock, dismissAchievementUnlock]);

  useEffect(() => {
    if (!hasEntered) return;

    const pollUnlocks = async () => {
      try {
        const latest = await getLatestCampAchievementUnlocks(5);
        enqueueAchievementUnlocks(latest);
      } catch {
        // Ignore transient polling errors
      }
    };

    const interval = window.setInterval(() => {
      void pollUnlocks();
    }, 75000);

    return () => window.clearInterval(interval);
  }, [enqueueAchievementUnlocks, hasEntered]);

  useEffect(() => {
    const markActivity = () => {
      const now = Date.now();
      if (now - lastActivityUpdateRef.current < 500) return;
      lastActivityUpdateRef.current = now;
      lastActivityAtRef.current = now;
    };
    const events: Array<keyof WindowEventMap> = ["mousemove", "mousedown", "click", "keydown", "touchstart", "scroll"];
    events.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));
    return () => events.forEach((eventName) => window.removeEventListener(eventName, markActivity));
  }, []);

  useEffect(() => {
    const evaluateSession = () => {
      const hasToken = Boolean(localStorage.getItem("token") ?? localStorage.getItem("accessToken"));
      if (!hasToken) {
        setSessionState((prev) => (prev === "INACTIVA" ? prev : "INACTIVA"));
        return;
      }

      const idleMs = Date.now() - lastActivityAtRef.current;
      const nextSessionState = idleMs >= SESSION_TIMEOUT_MS ? "INACTIVA" : "ACTIVA";
      setSessionState((prev) => (prev === nextSessionState ? prev : nextSessionState));
    };

    evaluateSession();

    const interval = setInterval(evaluateSession, 5000);
    const onTokenChanged = () => evaluateSession();
    window.addEventListener(SESSION_TOKEN_CHANGED_EVENT, onTokenChanged);

    return () => {
      clearInterval(interval);
      window.removeEventListener(SESSION_TOKEN_CHANGED_EVENT, onTokenChanged);
    };
  }, []);

  const handleNavClick = (navId: AdminSectionId) => {
    const nextNavId: AdminSectionId = activeNav === navId ? "centro" : navId;
    const navItem = NAVIGATION_DATA.find((item) => item.id === nextNavId);
    if (!navItem) return;
    setActiveNav(nextNavId);
    setActiveSub(navItem.subOptions[0]);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
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
    const sessionUser = sessionAdminUser;
    const matchedPerson = resolveSessionPerson(sessionUser, persons);
    const firstName = sessionUser.firstName?.trim() || matchedPerson?.firstName || "Administrador";
    const lastName1 = sessionUser.lastName1?.trim() || matchedPerson?.lastName || "";
    const lastName2 = sessionUser.lastName2?.trim() || "";
    const fullName = [firstName, lastName1, lastName2].filter(Boolean).join(" ").trim();
    const displayName = fullName || sessionUser.username?.trim() || (matchedPerson ? personFullName(matchedPerson) : "Administrador");
    const occupation = matchedPerson ? occupationNameById.get(matchedPerson.occupationId) ?? `Ocupación #${matchedPerson.occupationId}` : "No disponible";
    const campId = matchedPerson?.campId ?? sessionUser.campId;
    const camp = typeof campId === "number" ? campNameById.get(campId) ?? `Campamento #${campId}` : "Sin asignar";
    const status = matchedPerson ? normalizeStatusLabel(matchedPerson.status) : "Sin registro";

    return {
      id: typeof sessionUser.id === "number" ? sessionUser.id : matchedPerson?.id ?? null,
      username: sessionUser.username ?? "sin-usuario",
      displayName,
      firstName,
      lastName1,
      lastName2,
      role: normalizeRoleLabel(sessionUser.role),
      occupation,
      camp,
      status,
      avatarUrl: resolveAdminProfileImage(sessionUser, matchedPerson),
      sessionState,
    };
  }, [persons, occupationNameById, campNameById, sessionState, sessionAdminUser]);

  const populationStats = useMemo(() => {
    const total = persons.length;
    const active = persons.filter((person) => person.status === "ACTIVE").length;
    const injured = persons.filter((person) => person.status === "INJURED").length;
    const missing = persons.filter((person) => person.status === "OUTSIDE_CAMP" || person.status === "ON_EXPEDITION").length;
    return { total, active, injured, missing };
  }, [persons]);

  const admissionsQueue = useMemo(
    () => admissions.filter((admission) => admission.workflowStatus === "PENDING_ADMIN"),
    [admissions],
  );
  const admissionsHistory = useMemo(
    () => admissions.filter((admission) => admission.workflowStatus === "APPROVED" || admission.workflowStatus === "REJECTED"),
    [admissions],
  );
  const pendingIntercampCount = useMemo(
    () => intercampRequests.filter((item) => item.status === "PENDIENTE").length,
    [intercampRequests],
  );
  const unreadNotificationsCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );

  const activeNavData = NAVIGATION_DATA.find((item) => item.id === activeNav) ?? NAVIGATION_DATA[0];
  const isDashboardView = activeNav === "centro";

  const handleAdmissionDecision = async (
    id: number,
    decision: "approved" | "rejected",
    options?: { finalOccupationId?: number; finalRole?: string; rejectionReason?: string },
  ) => {
    try {
      await updateAdmissionRequestStatus(id, decision, options);
      setAdmissions((prev) => prev.map((admission) => (admission.id === id ? { ...admission, status: decision } : admission)));
      notifyModule(
        "admisiones",
        "success",
        decision === "approved" ? "Admision aprobada correctamente." : "Admision rechazada correctamente.",
      );
    } catch (error) {
      setDataError(getErrorMessage(error, "update_admission"));
    }
  };

  const threatLevel = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        dashboardKpi.criticalResources * 15
          + admissionsQueue.length * 8
          + pendingIntercampCount * 7
          + unreadNotificationsCount * 5,
      ),
    ),
  );

  return (
    <div className="game-screen-layout text-[#A4C2C5]">
      <div className="holo-grid" />

      {hasEntered && (
        <TopHud
          onBack={() => navigate("/admin-main-view-ui")}
          onLogout={handleLogout}
          profile={adminProfile}
          globalTimeState={globalTimeState}
        />
      )}

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
                      persons={persons}
                      dashboardKpi={dashboardKpi}
                      notifications={notifications}
                      threatLevel={threatLevel}
                      populationStats={populationStats}
                      achievementProgress={achievementProgress}
                      admissions={admissions}
                      admissionsQueue={admissionsQueue}
                      admissionsHistory={admissionsHistory}
                      expeditions={expeditions}
                      consumedResources={consumedResources}
                      gainedResources={gainedResources}
                      intercampRequests={intercampRequests}
                      campCatalog={camps}
                      campNameById={campNameById}
                      occupationNameById={occupationNameById}
                      onAdmissionDecision={handleAdmissionDecision}
                      onPopulationReload={loadCoreData}
                      onDashboardReload={loadCoreData}
                      resourceTrendData={resourceTrendData}
                      onQuickNav={handleNavClick}
                      onSetDataError={setDataError}
                      onSetModuleFeedback={notifyModule}
                      sessionAdminUser={sessionAdminUser}
                      onRefreshAdminProfile={() => setSessionAdminUser(readSessionAdminUser())}
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
                        persons={persons}
                        dashboardKpi={dashboardKpi}
                        notifications={notifications}
                        threatLevel={threatLevel}
                        populationStats={populationStats}
                        achievementProgress={achievementProgress}
                        admissions={admissions}
                        admissionsQueue={admissionsQueue}
                        admissionsHistory={admissionsHistory}
                        expeditions={expeditions}
                        consumedResources={consumedResources}
                        gainedResources={gainedResources}
                        intercampRequests={intercampRequests}
                        campCatalog={camps}
                        campNameById={campNameById}
                        occupationNameById={occupationNameById}
                        onAdmissionDecision={handleAdmissionDecision}
                        onPopulationReload={loadCoreData}
                        onDashboardReload={loadCoreData}
                        resourceTrendData={resourceTrendData}
                        onQuickNav={handleNavClick}
                        onSetDataError={setDataError}
                        onSetModuleFeedback={notifyModule}
                        sessionAdminUser={sessionAdminUser}
                        onRefreshAdminProfile={() => setSessionAdminUser(readSessionAdminUser())}
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
          <SettingsHint onOpen={() => handleNavClick("configuracion")} />
        </>
      )}

      <AdminSyncOverlay
        visible={isBootstrapping}
        isReady={false}
        progress={Math.max(bootDataProgress, bootVisualProgress)}
        phase={bootPhase}
        presetName="CENTRO DE MANDO"
        showActions={false}
      />
      <AnimatePresence>
        {activeAchievementUnlock && (
          <motion.div
            className="admin-ui-v2-achievement-unlock-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <motion.div
              className="admin-ui-v2-achievement-unlock-card"
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
            >
              <div className="admin-ui-v2-achievement-unlock-badge">LOGRO DESBLOQUEADO</div>
              <div className="admin-ui-v2-achievement-unlock-icon">{activeAchievementUnlock.icon ?? "🏆"}</div>
              <h3>{activeAchievementUnlock.name}</h3>
              <p>{activeAchievementUnlock.description}</p>
              <div className="admin-ui-v2-achievement-unlock-meta">
                <span>{activeAchievementUnlock.category ?? "GENERAL"}</span>
                <span>{typeof activeAchievementUnlock.points === "number" ? `+${activeAchievementUnlock.points} pts` : "Sin puntaje"}</span>
              </div>
              <button className="admin-ui-v2-btn is-info" type="button" onClick={() => void dismissAchievementUnlock()}>
                Entendido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <PopupMessage
        message={dashboardPopup?.message ?? null}
        onClose={() => setDashboardPopup(null)}
        variant={
          dashboardPopup?.type === "success"
            ? "success"
            : dashboardPopup?.type === "warning"
              ? "warning"
              : dashboardPopup?.type === "info"
                ? "info"
                : "error"
        }
      />
    </div>
  );
}

function TopHud({
  onBack,
  onLogout,
  profile,
  globalTimeState,
}: {
  onBack: () => void;
  onLogout: () => void;
  profile: AdminProfileSummary;
  globalTimeState: GlobalTimeState;
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfilePreviewOpen, setIsProfilePreviewOpen] = useState(false);
  const [currentGlobalTime, setCurrentGlobalTime] = useState<Date>(() => {
    const elapsedClientMs = Date.now() - globalTimeState.syncedAtClientMs;
    return new Date(globalTimeState.baseServerTime.getTime() + elapsedClientMs);
  });
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

  useEffect(() => {
    if (!isProfilePreviewOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfilePreviewOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isProfilePreviewOpen]);

  useEffect(() => {
    const tickInterval = window.setInterval(() => {
      const elapsedClientMs = Date.now() - globalTimeState.syncedAtClientMs;
      setCurrentGlobalTime(new Date(globalTimeState.baseServerTime.getTime() + elapsedClientMs));
    }, 1000);

    return () => window.clearInterval(tickInterval);
  }, [globalTimeState.baseServerTime, globalTimeState.syncedAtClientMs]);

  const hudDateTime = useMemo(() => formatHudDateTime(currentGlobalTime), [currentGlobalTime]);
  const profileButtonLabel = `${profile.role} · @${profile.username}`;
  const profileInitials = useMemo(
    () => resolveInitials([profile.firstName, profile.lastName1, profile.lastName2, profile.displayName], 3),
    [profile.firstName, profile.lastName1, profile.lastName2, profile.displayName],
  );
  const hasProfileImage = Boolean(profile.avatarUrl);

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
      <div className="admin-ui-v2-time-hud pointer-events-auto" aria-live="polite">
        <span className="admin-ui-v2-time-day">{hudDateTime.day}</span>
        <span className="admin-ui-v2-time-sep" aria-hidden="true">|</span>
        <span className="admin-ui-v2-time-clock">{hudDateTime.time}</span>
        <span className={`admin-ui-v2-time-status is-${globalTimeState.status}`}>
          {globalTimeState.status === "synced" ? "Sincronizado" : globalTimeState.status === "syncing" ? "Sincronizando" : "Hora local"}
        </span>
      </div>
      <div className="admin-ui-v2-profile-hud-wrap pointer-events-auto" ref={profileWrapRef}>
        <button
          className={`top-hud-btn admin-ui-v2-profile-hud-btn ${isProfileOpen ? "is-open" : ""}`}
          type="button"
          onClick={() => setIsProfileOpen((prev) => !prev)}
          aria-expanded={isProfileOpen}
          aria-haspopup="dialog"
        >
          <span className="btn-text">
            {profileButtonLabel}
            <span className="admin-ui-v2-profile-session-dot" data-state={profile.sessionState} aria-hidden="true" />
          </span>
        </button>

        {isProfileOpen && (
          <div className="admin-ui-v2-profile-popover" role="dialog" aria-label="Información del perfil administrativo">
            <div className="admin-ui-v2-profile-popover-head">
              <button
                className={`admin-ui-v2-profile-avatar-button ${hasProfileImage ? "is-clickable" : "is-static"}`}
                type="button"
                onClick={() => {
                  if (hasProfileImage) {
                    setIsProfilePreviewOpen(true);
                  }
                }}
                aria-label={hasProfileImage ? "Ver foto de perfil ampliada" : `Iniciales de ${profile.displayName}`}
              >
                {hasProfileImage ? (
                  <img
                    className="admin-ui-v2-profile-popover-avatar"
                    src={profile.avatarUrl ?? undefined}
                    alt={`Perfil de ${profile.displayName}`}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="admin-ui-v2-profile-popover-avatar admin-ui-v2-avatar-fallback" aria-hidden="true">
                    {profileInitials}
                  </span>
                )}
              </button>
              <div>
                <strong>{profile.displayName}</strong>
                <span>@{profile.username}</span>
              </div>
            </div>

            <div className="admin-ui-v2-profile-popover-grid">
              <div><small>Primer nombre</small><strong>{profile.firstName || "-"}</strong></div>
              <div><small>Primer apellido</small><strong>{profile.lastName1 || "-"}</strong></div>
              <div><small>Segundo apellido</small><strong>{profile.lastName2 || "-"}</strong></div>
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

      <AnimatePresence>
        {isProfilePreviewOpen && hasProfileImage && (
          <motion.div
            className="admin-ui-v2-photo-preview-overlay pointer-events-auto"
            role="dialog"
            aria-label="Foto de perfil ampliada"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <motion.div
              className="admin-ui-v2-photo-preview-card"
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
            >
              <button
                className="admin-ui-v2-photo-preview-close"
                type="button"
                onClick={() => setIsProfilePreviewOpen(false)}
              >
                CERRAR
              </button>
              <img
                src={profile.avatarUrl ?? undefined}
                alt={`Perfil ampliado de ${profile.displayName}`}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
  persons,
  dashboardKpi,
  notifications,
  threatLevel,
  resourceTrendData,
  achievementProgress,
  populationStats,
  admissions,
  admissionsQueue,
  admissionsHistory,
  expeditions,
  consumedResources,
  gainedResources,
  intercampRequests,
  campCatalog,
  campNameById,
  occupationNameById,
  onAdmissionDecision,
  onPopulationReload,
  onDashboardReload,
  onQuickNav,
  onSetDataError,
  onSetModuleFeedback,
  sessionAdminUser,
  onRefreshAdminProfile,
}: {
  section: AdminSectionId;
  sub: string;
  persons: Person[];
  dashboardKpi: DashboardKpi;
  notifications: UiNotification[];
  threatLevel: number;
  resourceTrendData: ResourceTrendPoint[];
  achievementProgress: CampAchievementProgress[];
  populationStats: { total: number; active: number; injured: number; missing: number };
  admissions: UiAdmission[];
  admissionsQueue: UiAdmission[];
  admissionsHistory: UiAdmission[];
  expeditions: UiExpedition[];
  consumedResources: ResourceLedgerEntry[];
  gainedResources: ResourceLedgerEntry[];
  intercampRequests: UiIntercampRequest[];
  campCatalog: Camp[];
  campNameById: Map<number, string>;
  occupationNameById: Map<number, string>;
  onAdmissionDecision: (
    id: number,
    decision: "approved" | "rejected",
    options?: { finalOccupationId?: number; finalRole?: string; rejectionReason?: string },
  ) => Promise<void>;
  onPopulationReload: () => Promise<void>;
  onDashboardReload: () => Promise<void>;
  onQuickNav: (id: AdminSectionId) => void;
  onSetDataError: (message: string | null) => void;
  onSetModuleFeedback: (section: AdminSectionId | "global", type: ModuleMessageType, message: string) => void;
  sessionAdminUser: SessionAdminUser;
  onRefreshAdminProfile: () => void;
}) {
  const unreadNotificationsCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );
  const criticalUnreadCount = useMemo(
    () => notifications.filter((item) => !item.read && item.level === "critical").length,
    [notifications],
  );
  const activeExpeditionsCount = useMemo(
    () => expeditions.filter((item) => item.status !== "COMPLETADA").length,
    [expeditions],
  );
  const pendingIntercampCount = useMemo(
    () => intercampRequests.filter((item) => item.status === "PENDIENTE").length,
    [intercampRequests],
  );

  const moduleWarnings = useMemo(() => {
    if (section === "centro") {
      if (threatLevel >= 80) {
        return ["Riesgo operativo alto: prioriza admisiones e inter-campamento."];
      }
      if (criticalUnreadCount > 0) {
        return [`Hay ${criticalUnreadCount} alerta(s) critica(s) sin atender.`];
      }
      return [];
    }

    if (section === "poblacion") {
      if (persons.length === 0) {
        return ["No hay registros de población cargados en este momento."];
      }
      return [];
    }

    if (section === "admisiones") {
      if (admissionsQueue.length > 0) {
        return [`Hay ${admissionsQueue.length} admision(es) pendiente(s) de decision.`];
      }
      return [];
    }

    if (section === "expediciones") {
      if (activeExpeditionsCount === 0) {
        return ["No hay expediciones activas. Valida si necesitas programar una operacion."];
      }
      return [];
    }

    if (section === "intercamp") {
      if (pendingIntercampCount > 0) {
        return [`Hay ${pendingIntercampCount} solicitud(es) inter-campamento pendiente(s).`];
      }
      return [];
    }

    if (section === "logros") {
      if (achievementProgress.length === 0) {
        return ["Aun no hay logros cargados para este campamento."];
      }
      return [];
    }

    if (section === "seguridad") {
      if (criticalUnreadCount > 0) {
        return ["Existen alertas criticas sin cierre en el sistema."];
      }
      return [];
    }

    if (section === "notificaciones") {
      if (unreadNotificationsCount > 0) {
        return [`Tienes ${unreadNotificationsCount} notificacion(es) sin leer.`];
      }
      return [];
    }

    if (section === "configuracion") {
      return ["Los cambios de configuracion pueden impactar toda la operacion del sistema."];
    }

    return [];
  }, [
    section,
    threatLevel,
    criticalUnreadCount,
    persons.length,
    admissionsQueue.length,
    activeExpeditionsCount,
    pendingIntercampCount,
    achievementProgress.length,
    unreadNotificationsCount,
  ]);

  return (
    <div className="admin-ui-v2-content">
      <div className="admin-ui-v2-meta">
        <div className="admin-ui-v2-meta-title">{section.toUpperCase()}</div>
        <div className="admin-ui-v2-meta-sub">{sub}</div>
        <p className="admin-ui-v2-meta-desc">{SECTION_DESCRIPTIONS[section]}</p>
      </div>

      {void moduleWarnings}

      {section === "centro" && (
        <DashboardModule
          kpi={dashboardKpi}
          populationStats={populationStats}
          admissionsQueue={admissionsQueue.length}
          activeExpeditions={expeditions.filter((item) => item.status !== "COMPLETADA").length}
          intercampCount={intercampRequests.length}
          notifications={notifications}
          threatLevel={threatLevel}
          resourceTrendData={resourceTrendData}
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
          currentAdminId={sessionAdminUser.id ?? null}
          onReload={onPopulationReload}
          onError={onSetDataError}
          onNotice={onSetModuleFeedback}
        />
      )}

      {section === "admisiones" && (
        <AdmissionsModule
          sub={sub}
          admissions={admissions}
          admissionsQueue={admissionsQueue}
          admissionsHistory={admissionsHistory}
          occupations={occupationNameById}
          onAdmissionDecision={onAdmissionDecision}
        />
      )}

      {section === "expediciones" && (
        <ExpeditionsModule
          sub={sub}
          expeditions={expeditions}
          campCatalog={campCatalog}
          consumedResources={consumedResources}
          gainedResources={gainedResources}
        />
      )}

      {section === "intercamp" && (
        <>
          <div className="admin-ui-v2-module-card">
            <p className="admin-ui-v2-muted">Módulo en modo solo lectura para el rol administrador del sistema.</p>
          </div>

          <table className="v-table admin-ui-v2-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Origen</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Tiempo</th>
                <th>Acceso</th>
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
                    <td><span className="admin-ui-v2-muted">Solo lectura</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}

      {section === "configuracion" && (
        <SettingsModule
          sub={sub}
          profile={sessionAdminUser}
          persons={persons}
          onNotice={onSetModuleFeedback}
          onProfileRefresh={onRefreshAdminProfile}
          onReloadPersons={onPopulationReload}
        />
      )}

      {section === "logros" && (
        <AchievementsModule sub={sub} achievements={achievementProgress} />
      )}

      {(section === "seguridad" || section === "notificaciones") && (
        <div className="admin-ui-v2-module-card">
          <h3>Módulo en diseño táctico</h3>
          <p>Este módulo mantiene la estructura visual nueva. En la siguiente iteración se porta la lógica completa igual que Población, Admisiones, Expediciones e Inter-campamentos.</p>
        </div>
      )}
    </div>
  );
}

const CountdownClock = memo(function CountdownClock() {
  const [countdown, setCountdown] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const target = new Date(now);
      target.setHours(18, 0, 0, 0);
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      const remainingMs = Math.max(0, target.getTime() - now.getTime());
      const totalSeconds = Math.floor(remainingMs / 1000);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      setCountdown({ h, m, s });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="admin-ui-v2-countdown">
      {String(countdown.h).padStart(2, "0")}:{String(countdown.m).padStart(2, "0")}:{String(countdown.s).padStart(2, "0")}
    </div>
  );
});

const DashboardModule = memo(function DashboardModule({
  kpi,
  populationStats,
  admissionsQueue,
  activeExpeditions,
  intercampCount,
  notifications,
  threatLevel,
  resourceTrendData,
  onReload,
  onQuickNav,
}: {
  kpi: DashboardKpi;
  populationStats: { total: number; active: number; injured: number; missing: number };
  admissionsQueue: number;
  activeExpeditions: number;
  intercampCount: number;
  notifications: UiNotification[];
  threatLevel: number;
  resourceTrendData: ResourceTrendPoint[];
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
  const healthScore = Math.max(0, Math.min(100, Math.round(100 - kpi.criticalResources * 8 - admissionsQueue * 4 - liveAlerts.length * 7)));
  const healthTone = healthScore < 45 ? "danger" : healthScore < 70 ? "warn" : "ok";
  const immediateEvents = [
    { name: "Revision admisiones IA", impact: admissionsQueue > 3 ? "Alto" : "Medio", eta: "50 min", action: "Ir a admisiones" },
    { name: "Sincronizacion intercamp", impact: intercampCount > 0 ? "Medio" : "Bajo", eta: "80 min", action: "Ir a intercamp" },
    { name: "Cierre de expedicion", impact: activeExpeditions > 1 ? "Alto" : "Medio", eta: "120 min", action: "Ir a expediciones" },
  ];
  const moduleStatus = [
    { name: "Admisiones IA", status: admissionsQueue > 0 ? "Pendiente" : "Estable", note: `${admissionsQueue} en cola`, tone: admissionsQueue > 0 ? "warn" : "ok" },
    { name: "Expediciones", status: (kpi.activeExpeditions || activeExpeditions) > 0 ? "Activo" : "Reposo", note: `${kpi.activeExpeditions || activeExpeditions} operaciones`, tone: "info" },
    { name: "Intercamp", status: (kpi.pendingIntercamp || intercampCount) > 0 ? "Pendiente" : "Estable", note: `${kpi.pendingIntercamp || intercampCount} solicitudes`, tone: "warn" },
  ] as Array<{ name: string; status: string; note: string; tone: "warn" | "ok" | "danger" | "info" }>;

  return (
    <div className="admin-ui-v2-dashboard">
      <div className="admin-ui-v2-overview-band">
        <div className="admin-ui-v2-grid admin-ui-v2-grid-4">
          <DashboardMetricCard label="Población total" value={populationTotal} detail={`${activePopulation} activos`} tone="info" />
          <DashboardMetricCard label="Recursos críticos" value={kpi.criticalResources} detail={kpi.criticalResources > 0 ? "Atención inmediata" : "Sin alertas"} tone={kpi.criticalResources > 0 ? "danger" : "ok"} />
          <DashboardMetricCard label="Expediciones activas" value={kpi.activeExpeditions || activeExpeditions} detail={`${outPopulation} fuera del campamento`} tone="info" />
          <DashboardMetricCard label="Solicitudes intercamp" value={kpi.pendingIntercamp || intercampCount} detail="Pendientes de coordinación" tone="warn" />
        </div>

        <div className="admin-ui-v2-module-card admin-ui-v2-briefing-card">
          <div>
            <h3>Centro de mando operativo</h3>
            <p>Estado general del campamento, prioridades activas y rutas de respuesta inmediata.</p>
          </div>
          <div className="admin-ui-v2-briefing-status">
            <small>Salud operativa</small>
            <strong>{healthScore}%</strong>
            <span className={`admin-ui-v2-pill is-${healthTone}`}>{healthScore < 45 ? "Comprometido" : healthScore < 70 ? "Inestable" : "Estable"}</span>
          </div>
          <div className="admin-ui-v2-actions admin-ui-v2-actions-wrap">
            <button className="admin-ui-v2-btn is-info" type="button" onClick={() => void onReload()}>Actualizar</button>
            <button className="admin-ui-v2-btn is-info" type="button" onClick={() => onQuickNav("admisiones")}>Admisiones</button>
            <button className="admin-ui-v2-btn" type="button" onClick={() => onQuickNav("expediciones")}>Expediciones</button>
          </div>
        </div>
      </div>

      <div className="admin-ui-v2-analytics-band">
        <div className="admin-ui-v2-module-card">
          <div className="admin-ui-v2-section-head">
            <span>Tendencia de recursos</span>
            <span>Últimos 7 días</span>
          </div>
          <div className="admin-ui-v2-chart">
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={resourceTrendData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
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
      </div>

      <div className="admin-ui-v2-artifacts-band">
        <div className="admin-ui-v2-module-card admin-ui-v2-artifact-card">
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

        <div className="admin-ui-v2-module-card admin-ui-v2-artifact-card">
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

        <div className="admin-ui-v2-module-card admin-ui-v2-artifact-card">
          <div className="admin-ui-v2-section-head">
            <span>Eventos inmediatos</span>
            <span>Top 4</span>
          </div>
          <table className="v-table admin-ui-v2-table admin-ui-v2-events-table">
            <thead>
              <tr>
                <th>Evento</th>
                <th>Impacto</th>
                <th>ETA</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {immediateEvents.map((eventItem) => (
                <tr key={eventItem.name}>
                  <td>{eventItem.name}</td>
                  <td>{eventItem.impact}</td>
                  <td>{eventItem.eta}</td>
                  <td>{eventItem.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-ui-v2-module-card admin-ui-v2-cycle-card">
        <div className="admin-ui-v2-section-head">
          <span>Próximo ciclo automático</span>
          <span>Hoy 18:00</span>
        </div>
        <div className="admin-ui-v2-cycle-layout">
          <div>
            <CountdownClock />
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
});

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

const PopulationModule = memo(function PopulationModule({
  sub,
  persons,
  camps,
  occupations,
  currentAdminId,
  onReload,
  onError,
  onNotice,
}: {
  sub: string;
  persons: Person[];
  camps: Map<number, string>;
  occupations: Map<number, string>;
  currentAdminId: number | null;
  onReload: () => Promise<void>;
  onError: (message: string | null) => void;
  onNotice: (section: AdminSectionId | "global", type: ModuleMessageType, message: string) => void;
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
    lastName1: "",
    lastName2: "",
    age: 0,
    status: "ACTIVE" as Person["status"],
    occupationId: 0,
    notes: "",
    accountStatus: "ACTIVE" as "ACTIVE" | "BLOCKED" | "INACTIVE",
  });

  const [assignments, setAssignments] = useState<TempRoleAssignment[]>(INITIAL_TEMP_ASSIGNMENTS);
  const [assignSearch, setAssignSearch] = useState("");
  const [temporaryView, setTemporaryView] = useState<TemporaryView>("sectors");
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [revocationTargetId, setRevocationTargetId] = useState<number | null>(null);
  const [revocationReason, setRevocationReason] = useState("");
  const [quickPersonId, setQuickPersonId] = useState<number | null>(null);
  const [quickOccupationId, setQuickOccupationId] = useState<number | null>(null);
  const [quickReason, setQuickReason] = useState("");
  const [newAssignment, setNewAssignment] = useState({
    personId: 0,
    tempRole: "",
    startDate: dateInputFromToday(),
    endDate: dateInputFromToday(7),
    reason: "",
  });

  const loadTempAssignments = useCallback(async () => {
    const response = await apiRequest<unknown>("/temporary-occupation-assignments?page=1&limit=100");
    const list = extractTemporaryAssignmentList(response);
    const mapped: TempRoleAssignment[] = [];

    list.forEach((rawItem) => {
      if (!isRecord(rawItem)) return;

      const assignmentId = firstNumberField(rawItem, ["id", "assignmentId", "temporaryOccupationAssignmentId", "temporaryAssignmentId"]);
      const personId = firstNumberField(rawItem, ["personId", "person_id", "residentId", "survivorId"])
        ?? (isRecord(rawItem.person) ? firstNumberField(rawItem.person, ["id", "personId"]) : null);
      if (assignmentId === null || personId === null) return;

      const temporaryOccupationId = firstNumberField(rawItem, ["temporaryOccupationId", "temporary_occupation_id", "occupationId", "occupation_id"])
        ?? (isRecord(rawItem.temporaryOccupation) ? firstNumberField(rawItem.temporaryOccupation, ["id", "occupationId"]) : null);
      const originalOccupationId = firstNumberField(rawItem, ["originalOccupationId", "baseOccupationId", "previousOccupationId"]);
      const person = persons.find((candidate) => candidate.id === personId);
      const personName = person ? personFullName(person) : nestedName(rawItem, ["person", "resident", "survivor"]) ?? `Usuario #${personId}`;
      const fromRole = person
        ? occupations.get(person.occupationId) ?? `Ocupación #${person.occupationId}`
        : originalOccupationId !== null
          ? occupations.get(originalOccupationId) ?? `Ocupación #${originalOccupationId}`
          : nestedName(rawItem, ["originalOccupation", "baseOccupation", "previousOccupation"]) ?? "Desconocido";
      const tempRole = temporaryOccupationId !== null
        ? occupations.get(temporaryOccupationId) ?? `Ocupación #${temporaryOccupationId}`
        : firstStringField(rawItem, ["temporaryOccupationName", "occupationName", "temporaryRole", "tempRole"])
          ?? nestedName(rawItem, ["temporaryOccupation", "occupation"])
          ?? "Desconocido";
      const startDate = firstStringField(rawItem, ["startDate", "start_date", "assignedAt", "assigned_at", "createdAt", "created_at"])
        ?? new Date().toISOString();
      const endDate = firstStringField(rawItem, ["endDate", "end_date", "expiresAt", "expires_at", "finishedAt", "finished_at", "revokedAt", "revoked_at"])
        ?? startDate;

      mapped.push({
        id: assignmentId,
        personId,
        personName,
        fromRole,
        tempRole,
        startDate,
        endDate,
        reason: firstStringField(rawItem, ["reason", "motivo", "description", "details"]) ?? "Sin motivo",
        status: assignmentStatusFromApi(rawItem),
      });
    });

    return mapped.sort((a, b) => b.id - a.id || b.startDate.localeCompare(a.startDate));
  }, [occupations, persons]);

  useEffect(() => {
    if (sub !== "Oficios temporales") return;

    let isMounted = true;
    loadTempAssignments()
      .then((mapped) => {
        if (isMounted) setAssignments(mapped);
      })
      .catch((err) => {
        console.error("Failed to fetch temporary assignments", err);
      });

    return () => { isMounted = false; };
  }, [loadTempAssignments, sub]);

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
  const activeAssignedPersonIds = new Set(activeAssignments.map((assignment) => assignment.personId));
  const availableTempCandidates = assignCandidates.filter((person) => !activeAssignedPersonIds.has(person.id));
  const occupationOptions = Array.from(occupations.entries());
  const quickSelectedPerson = quickPersonId === null ? null : availableTempCandidates.find((person) => person.id === quickPersonId) ?? null;
  const quickSelectedOccupation = quickOccupationId === null ? null : occupations.get(quickOccupationId) ?? null;
  const sectorSummaries = TEMPORARY_SECTORS.map((sector) => {
    const workers = activeAssignments.filter((assignment) => temporarySectorForRole(assignment.tempRole).id === sector.id);
    const performance = Math.min(100, sector.basePerformance + workers.length * 11);
    const tone = workers.length === 0 ? "danger" : performance >= 80 ? "ok" : "warn";
    return { sector, workers, performance, tone };
  });
  const quickVacancies = TEMPORARY_SECTORS.filter((sector) => sector.id !== "general").map((sector) => {
    const matchedOccupation = occupationOptions.find(([, name]) => temporarySectorForRole(name).id === sector.id)
      ?? occupationOptions.find(([, name]) => normalizeSearchText(name) === normalizeSearchText(sector.primaryRole))
      ?? occupationOptions[0]
      ?? null;
    return {
      sector,
      occupationId: matchedOccupation?.[0] ?? 0,
      occupationName: matchedOccupation?.[1] ?? sector.primaryRole,
      activeCount: activeAssignments.filter((assignment) => temporarySectorForRole(assignment.tempRole).id === sector.id).length,
    };
  });

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
    const normalizedLastName = String(person.lastName ?? "").trim();
    const lastNameParts = normalizedLastName.split(/\s+/).filter(Boolean);
    const lastName1 = lastNameParts[0] ?? "";
    const lastName2 = lastNameParts.slice(1).join(" ");

    setSelectedPerson(person);
    setIsEditMode(editMode);
    setEditForm({
      firstName: person.firstName,
      lastName1,
      lastName2,
      age: person.age,
      status: person.status,
      occupationId: person.occupationId,
      notes: person.notes ?? "",
      accountStatus: person.accountStatus ?? "ACTIVE",
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
      onNotice("poblacion", "success", "Registro de persona eliminado correctamente.");
    } catch (error) {
      onError(getErrorMessage(error, "delete_person"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePerson = async () => {
    if (!selectedPerson) return;

    const isSelfAccountEdit = currentAdminId !== null && selectedPerson.id === currentAdminId;
    const originalAccountStatus = normalizeAccountStatus(selectedPerson.accountStatus);
    const requestedAccountStatus = normalizeAccountStatus(editForm.accountStatus);

    if (isSelfAccountEdit && requestedAccountStatus !== originalAccountStatus) {
      onNotice("poblacion", "error", "No puedes cambiar el estado de tu propia cuenta. Debe hacerlo otro administrador.");
      return;
    }

    setIsSaving(true);
    onError(null);
    try {
      const normalizedFirstName = String(editForm.firstName ?? "").trim();
      const normalizedLastName1 = String(editForm.lastName1 ?? "").trim();
      const normalizedLastName2 = String(editForm.lastName2 ?? "").trim();
      const normalizedLastName = [normalizedLastName1, normalizedLastName2].filter(Boolean).join(" ");
      const normalizedNotes = String(editForm.notes ?? "").trim();

      const payload = {
        firstName: normalizedFirstName,
        nombre: normalizedFirstName,
        first_name: normalizedFirstName,
        primer_nombre: normalizedFirstName,
        lastName: normalizedLastName,
        lastName1: normalizedLastName1,
        lastName2: normalizedLastName2 || null,
        primer_apellido: normalizedLastName1,
        segundo_apellido: normalizedLastName2 || null,
        age: Number(editForm.age),
        status: editForm.status,
        currentStatus: editForm.status,
        campId: selectedPerson.campId,
        occupationId: Number(editForm.occupationId),
        notes: normalizedNotes || undefined,
      };

      try {
        await updatePerson(selectedPerson.id, {
          ...payload,
          accountStatus: editForm.accountStatus,
        });
      } catch (error) {
        if (!(error instanceof ApiHttpError) || error.statusCode !== 400) {
          throw error;
        }

        await updatePerson(selectedPerson.id, payload);
      }
      await onReload();
      setIsEditMode(false);
      setSelectedPerson(null);
      onNotice("poblacion", "success", "Datos de persona actualizados correctamente.");
    } catch (error) {
      onError(getErrorMessage(error, "update_person"));
    } finally {
      setIsSaving(false);
    }
  };

  const submitTempAssignment = async (person: Person, tempOccupationId: number, reason: string, startDate: string, endDate: string): Promise<boolean> => {
    if (!Number.isFinite(tempOccupationId) || tempOccupationId <= 0) {
      onNotice("poblacion", "warning", "Selecciona un oficio temporal válido antes de continuar.");
      return false;
    }

    const normalizedStartDate = startDate.trim();
    const normalizedEndDate = endDate.trim();
    if (!normalizedStartDate || !normalizedEndDate) {
      onNotice("poblacion", "warning", "Indica la fecha de inicio y la fecha de finalización antes de continuar.");
      return false;
    }

    const startTime = parseTemporaryDate(normalizedStartDate).getTime();
    const endTime = parseTemporaryDate(normalizedEndDate).getTime();
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
      onNotice("poblacion", "warning", "Las fechas de la asignación temporal no son válidas.");
      return false;
    }

    if (startTime < startOfLocalDay(new Date())) {
      onNotice("poblacion", "warning", "La fecha de inicio no puede ser menor al día actual.");
      return false;
    }

    if (endTime < startTime) {
      onNotice("poblacion", "warning", "La fecha de finalización no puede ser anterior a la fecha de inicio.");
      return false;
    }

    try {
      await apiRequest("/temporary-occupation-assignments", {
        method: "POST",
        body: JSON.stringify({
          personId: person.id,
          temporaryOccupationId: tempOccupationId,
          reason: reason.trim() || "Asignación temporal",
          assignedBy: currentAdminId ?? 1,
          startDate: normalizedStartDate,
          endDate: normalizedEndDate,
        }),
      });

      setAssignments(await loadTempAssignments());
      setRevocationTargetId(null);
      setRevocationReason("");
      onNotice("poblacion", "success", "Asignación creada y usuario notificado por correo.");
      return true;
    } catch (error) {
      onError(error instanceof Error ? error.message : "Error al crear la asignación temporal");
      return false;
    }
  };

  const handleCreateTempAssignment = async () => {
    if (!selectedCandidate) return;
    if (!newAssignment.tempRole.trim()) return;

    const tempOccupationId = Number(newAssignment.tempRole);
    const created = await submitTempAssignment(selectedCandidate, tempOccupationId, newAssignment.reason, newAssignment.startDate, newAssignment.endDate);
    if (created) {
      setNewAssignment({ personId: 0, tempRole: "", startDate: dateInputFromToday(), endDate: dateInputFromToday(7), reason: "" });
      setAssignSearch("");
    }
  };

  const handleCreateQuickAssignment = async () => {
    if (!quickSelectedPerson || quickOccupationId === null) return;
    const sector = temporarySectorForRole(quickSelectedOccupation ?? "");
    const reason = quickReason.trim() || `Refuerzo operacional sugerido para ${sector.name}`;
    const created = await submitTempAssignment(quickSelectedPerson, quickOccupationId, reason, newAssignment.startDate, newAssignment.endDate);
    if (created) {
      setQuickPersonId(null);
      setQuickOccupationId(null);
      setQuickReason("");
      setNewAssignment({ personId: 0, tempRole: "", startDate: dateInputFromToday(), endDate: dateInputFromToday(7), reason: "" });
    }
  };

  const handleFinishAssignment = async (assignmentId: number) => {
    if (revokingId !== null) return;
    const targetAssignment = assignments.find((assignment) => assignment.id === assignmentId);
    const normalizedReason = revocationReason.trim();
    if (!normalizedReason) {
      setRevocationTargetId(assignmentId);
      onNotice("poblacion", "warning", "Indica el motivo de revocación antes de continuar.");
      return;
    }

    setRevokingId(assignmentId);
    try {
      await apiRequest(`/temporary-occupation-assignments/${assignmentId}`, {
        method: "DELETE",
        body: JSON.stringify({
          reason: normalizedReason,
        }),
      });

      setAssignments(await loadTempAssignments());
      setRevocationTargetId(null);
      setRevocationReason("");
      onNotice("poblacion", "success", "Asignación revocada y usuario notificado por correo.");
    } catch (error) {
      try {
        setAssignments(await loadTempAssignments());
      } catch (reloadError) {
        console.error("Failed to reload temporary assignments after revoke error", reloadError);
      }

      if (error instanceof ApiHttpError && error.details) {
        onError(`${error.message} ID_ASIGNACIÓN: ${assignmentId}${targetAssignment ? `, ID_OPERARIO: ${targetAssignment.personId}` : ""}. Detalle: ${error.details}`);
      } else {
        const fallbackMessage = error instanceof Error ? error.message : "Error al revocar la asignación temporal";
        onError(`${fallbackMessage} ID_ASIGNACIÓN: ${assignmentId}${targetAssignment ? `, ID_OPERARIO: ${targetAssignment.personId}` : ""}.`);
      }
    } finally {
      setRevokingId(null);
    }
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

  const normalizeAccountStatus = (value: unknown): "ACTIVE" | "BLOCKED" | "INACTIVE" => {
    const normalized = String(value ?? "ACTIVE").toUpperCase();
    if (normalized === "ACTIVE" || normalized === "BLOCKED" || normalized === "INACTIVE") return normalized;
    return "INACTIVE";
  };

  const accountStatusPill = (value: unknown) => {
    const normalized = normalizeAccountStatus(value);
    if (normalized === "ACTIVE") return "is-ok";
    if (normalized === "BLOCKED") return "is-warn";
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
                <th>Cuenta</th>
                <th>Edad</th>
                <th>Sector</th>
                <th>Ingreso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagedPersons.map((person) => {
                const profileImage = resolvePersonProfileImage(person);
                return (
                  <tr key={person.id}>
                    <td>
                      <div className="admin-ui-v2-person-cell">
                        {profileImage ? (
                          <img
                            src={profileImage}
                            alt={`Perfil de ${personFullName(person)}`}
                            className="admin-ui-v2-person-avatar"
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="admin-ui-v2-person-avatar admin-ui-v2-avatar-fallback" aria-hidden="true">
                            {personInitials(person)}
                          </span>
                        )}
                        <span>{personFullName(person)}</span>
                      </div>
                    </td>
                    <td>{occupations.get(person.occupationId) ?? `Ocupación #${person.occupationId}`}</td>
                    <td>
                      <span className={`admin-ui-v2-pill ${statusPillFromLegacy(legacyPopulationStatus(person.status))}`}>
                        {legacyPopulationStatus(person.status)}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-ui-v2-pill ${accountStatusPill(person.accountStatus)}`}>
                        {normalizeAccountStatus(person.accountStatus)}
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
                );
              })}
              {filteredPersons.length === 0 && (
                <tr>
                  <td colSpan={8} className="admin-ui-v2-empty-cell">No hay personas para mostrar con esos filtros.</td>
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

      {sub === "Oficios temporales" && (
        <div className="admin-ui-v2-temp-shell">
          <div className="admin-ui-v2-temp-hero">
            <div>
              <span className="admin-ui-v2-temp-kicker">Consola de población</span>
              <h2>Gestión Táctica de Oficios</h2>
              <p>Reasignación temporal de personal sin turnos ni campos no soportados por el backend.</p>
            </div>
            <div className="admin-ui-v2-temp-kpis">
              <MetricCard label="Activas" value={activeAssignments.length} tone="info" />
              <MetricCard label="Disponibles" value={availableTempCandidates.length} tone="ok" />
              <MetricCard label="Historial" value={historicalAssignments.length} tone="warn" />
            </div>
          </div>

          <div className="admin-ui-v2-temp-nav" role="tablist" aria-label="Vistas de oficios temporales">
            {([
              ["sectors", "Cuadrícula de Sectores"],
              ["timeline", "Cronograma de Asignaciones"],
              ["quick", "Acoplamiento Rápido"],
              ["history", "Historial"],
            ] as Array<[TemporaryView, string]>).map(([view, label]) => (
              <button
                key={view}
                className={`admin-ui-v2-temp-nav-btn ${temporaryView === view ? "is-active" : ""}`}
                type="button"
                onClick={() => setTemporaryView(view)}
              >
                {label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {temporaryView === "sectors" && (
              <motion.div
                key="temp-sectors"
                className="admin-ui-v2-temp-sector-grid"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {sectorSummaries.map(({ sector, workers, performance, tone }) => (
                  <div key={sector.id} className={`admin-ui-v2-temp-sector-card is-${tone}`}>
                    <div className="admin-ui-v2-temp-sector-head">
                      <div>
                        <span>{sector.tag}</span>
                        <h3>{sector.name}</h3>
                      </div>
                      <span className={`admin-ui-v2-pill ${tone === "ok" ? "is-ok" : tone === "warn" ? "is-warn" : "is-danger"}`}>
                        {workers.length === 0 ? "Déficit" : `${workers.length} activo${workers.length === 1 ? "" : "s"}`}
                      </span>
                    </div>
                    <p>{sector.description}</p>
                    <div className="admin-ui-v2-temp-sector-meter">
                      <div><span style={{ width: `${performance}%` }} /></div>
                      <strong>{performance}% eficacia estimada</strong>
                    </div>
                    <div className="admin-ui-v2-temp-worker-list">
                      {workers.slice(0, 4).map((assignment) => (
                        <div key={assignment.id} className="admin-ui-v2-temp-worker-row">
                          <span className="admin-ui-v2-temp-avatar">{temporaryNameInitials(assignment.personName)}</span>
                          <div>
                            <strong>{assignment.personName}</strong>
                            <small>{assignment.tempRole}</small>
                          </div>
                        </div>
                      ))}
                      {workers.length === 0 && <div className="admin-ui-v2-muted">Sin operarios temporales en este sector.</div>}
                    </div>
                    <button
                      className="admin-ui-v2-btn is-info"
                      type="button"
                      onClick={() => {
                        const vacancy = quickVacancies.find((item) => item.sector.id === sector.id);
                        setQuickOccupationId(vacancy?.occupationId || null);
                        setTemporaryView("quick");
                      }}
                      disabled={availableTempCandidates.length === 0 || sector.id === "general"}
                    >
                      Asignar refuerzo temporal
                    </button>
                  </div>
                ))}
              </motion.div>
            )}

            {temporaryView === "timeline" && (
              <motion.div
                key="temp-timeline"
                className="admin-ui-v2-temp-timeline"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeAssignments.map((assignment) => {
                  const progress = temporaryAssignmentProgress(assignment.startDate, assignment.endDate);
                  const sector = temporarySectorForRole(assignment.tempRole);
                  return (
                    <div key={assignment.id} className={`admin-ui-v2-temp-assignment-card ${progress.urgent ? "is-urgent" : ""}`}>
                      <div className="admin-ui-v2-temp-assignment-head">
                        <div className="admin-ui-v2-temp-person-line">
                          <span className="admin-ui-v2-temp-avatar">{temporaryNameInitials(assignment.personName)}</span>
                          <div>
                            <strong>{assignment.personName}</strong>
                            <small>ID_ASIGNACIÓN: {assignment.id} · ID_OPERARIO: {assignment.personId}</small>
                          </div>
                        </div>
                        <div className="admin-ui-v2-actions">
                          <span className="admin-ui-v2-pill is-info">{sector.name}</span>
                          <button
                            className="admin-ui-v2-btn is-danger"
                            type="button"
                            onClick={() => {
                              setRevocationTargetId(assignment.id);
                              setRevocationReason("");
                            }}
                            disabled={revokingId !== null}
                          >
                            {revokingId === assignment.id ? "Revocando" : "Revocar"}
                          </button>
                        </div>
                      </div>
                      <div className="admin-ui-v2-temp-role-flow">
                        <div><span>Oficio base</span><strong>{assignment.fromRole}</strong></div>
                        <i>»</i>
                        <div><span>Oficio temporal</span><strong>{assignment.tempRole}</strong></div>
                      </div>
                      <p className="admin-ui-v2-temp-reason">{assignment.reason}</p>
                      <div className="admin-ui-v2-temp-progress-row">
                        <span>Inicio: {temporaryDateLabel(assignment.startDate)}</span>
                        <strong>{progress.label}</strong>
                        <span>Fin: {temporaryDateLabel(assignment.endDate)}</span>
                      </div>
                      <div className="admin-ui-v2-timeline-bar-wrap">
                        <div className={`admin-ui-v2-timeline-bar ${progress.urgent ? "is-urgent" : ""}`} style={{ width: `${progress.value}%` }} />
                      </div>
                      {revocationTargetId === assignment.id && (
                        <div className="admin-ui-v2-temp-revoke-box">
                          <textarea
                            className="v-textarea"
                            placeholder="Motivo de revocación"
                            value={revocationReason}
                            onChange={(event) => setRevocationReason(event.target.value)}
                            disabled={revokingId !== null}
                          />
                          <div className="admin-ui-v2-actions admin-ui-v2-actions-wrap">
                            <button className="admin-ui-v2-btn is-danger" onClick={() => void handleFinishAssignment(assignment.id)} type="button" disabled={revokingId !== null || !revocationReason.trim()}>
                              Confirmar revocación
                            </button>
                            <button className="admin-ui-v2-btn" onClick={() => { setRevocationTargetId(null); setRevocationReason(""); }} type="button" disabled={revokingId !== null}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {activeAssignments.length === 0 && <div className="admin-ui-v2-empty-cell">Ninguna asignación activa en progreso.</div>}
              </motion.div>
            )}

            {temporaryView === "quick" && (
              <motion.div
                key="temp-quick"
                className="admin-ui-v2-temp-quick"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="admin-ui-v2-temp-panel">
                  <div className="admin-ui-v2-section-head"><span>1. Operarios aptos</span><span>{availableTempCandidates.length} disponibles</span></div>
                  <input className="v-input admin-ui-v2-temp-field" placeholder="Buscar por nombre u oficio base" value={assignSearch} onChange={(event) => setAssignSearch(event.target.value)} />
                  <div className="admin-ui-v2-temp-choice-list">
                    {availableTempCandidates.map((person) => (
                      <button
                        key={person.id}
                        className={`admin-ui-v2-temp-choice ${quickPersonId === person.id ? "is-selected" : ""}`}
                        type="button"
                        onClick={() => {
                          setQuickPersonId(person.id);
                          setNewAssignment((prev) => ({ ...prev, personId: person.id }));
                        }}
                      >
                        <span className="admin-ui-v2-temp-avatar">{personInitials(person)}</span>
                        <div><strong>{personFullName(person)}</strong><small>{occupations.get(person.occupationId) ?? `Ocupación #${person.occupationId}`} · {person.age} años</small></div>
                      </button>
                    ))}
                    {availableTempCandidates.length === 0 && <div className="admin-ui-v2-empty-cell">No hay operarios disponibles con esos filtros.</div>}
                  </div>
                </div>

                <div className="admin-ui-v2-temp-panel">
                  <div className="admin-ui-v2-section-head"><span>2. Vacantes sugeridas</span><span>Derivadas por oficio</span></div>
                  <div className="admin-ui-v2-temp-choice-list">
                    {quickVacancies.map((vacancy) => (
                      <button key={vacancy.sector.id} className={`admin-ui-v2-temp-vacancy ${quickOccupationId === vacancy.occupationId ? "is-selected" : ""}`} type="button" onClick={() => setQuickOccupationId(vacancy.occupationId)} disabled={vacancy.occupationId <= 0}>
                        <div><strong>{vacancy.sector.name}</strong><small>{vacancy.sector.description}</small></div>
                        <span>{vacancy.occupationName}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="admin-ui-v2-temp-panel admin-ui-v2-temp-create-panel">
                  <div className="admin-ui-v2-section-head"><span>3. Confirmación de enlace</span><span>Payload compatible</span></div>
                  <select className="v-select admin-ui-v2-temp-field" value={newAssignment.tempRole} onChange={(event) => setNewAssignment((prev) => ({ ...prev, tempRole: event.target.value }))}>
                    <option value="">Crear manualmente: seleccionar oficio...</option>
                    {occupationOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                  </select>
                  <div className="admin-ui-v2-temp-date-grid">
                    <label>
                      <span>Fecha de inicio</span>
                      <input
                        className="v-input admin-ui-v2-temp-field"
                        type="date"
                        min={dateInputFromToday()}
                        value={newAssignment.startDate}
                        onChange={(event) => setNewAssignment((prev) => ({
                          ...prev,
                          startDate: event.target.value,
                          endDate: prev.endDate && prev.endDate < event.target.value ? event.target.value : prev.endDate,
                        }))}
                      />
                    </label>
                    <label>
                      <span>Fecha de finalización</span>
                      <input
                        className="v-input admin-ui-v2-temp-field"
                        type="date"
                        min={newAssignment.startDate || undefined}
                        value={newAssignment.endDate}
                        onChange={(event) => setNewAssignment((prev) => ({ ...prev, endDate: event.target.value }))}
                      />
                    </label>
                  </div>
                  <textarea className="v-textarea admin-ui-v2-temp-field" placeholder="Motivo operacional para el enlace rápido o manual" value={quickReason || newAssignment.reason} onChange={(event) => { setQuickReason(event.target.value); setNewAssignment((prev) => ({ ...prev, reason: event.target.value })); }} />
                  <div className="admin-ui-v2-temp-link-preview">
                    <div><span>Operario</span><strong>{quickSelectedPerson ? personFullName(quickSelectedPerson) : selectedCandidate ? personFullName(selectedCandidate) : "Sin selección"}</strong></div>
                    <i>»</i>
                    <div><span>Oficio temporal</span><strong>{quickSelectedOccupation ?? (newAssignment.tempRole ? occupations.get(Number(newAssignment.tempRole)) : null) ?? "Sin oficio"}</strong></div>
                  </div>
                  <div className="admin-ui-v2-actions admin-ui-v2-actions-wrap">
                    <button className="admin-ui-v2-btn is-info" type="button" onClick={() => void handleCreateQuickAssignment()} disabled={!quickSelectedPerson || quickOccupationId === null}>
                      Vincular vacante sugerida
                    </button>
                    <button className="admin-ui-v2-btn" type="button" onClick={() => void handleCreateTempAssignment()} disabled={!selectedCandidate || !newAssignment.tempRole}>
                      Crear asignación manual
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {temporaryView === "history" && (
              <motion.div
                key="temp-history"
                className="admin-ui-v2-temp-history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {historicalAssignments.map((assignment) => (
                  <div key={assignment.id} className="admin-ui-v2-tactical-history-item">
                    <div>
                      <h4>{assignment.personName}</h4>
                      <p>{assignment.fromRole} » {assignment.tempRole}</p>
                      <p>{temporaryDateLabel(assignment.startDate)} - {temporaryDateLabel(assignment.endDate)}</p>
                    </div>
                    <span className="admin-ui-v2-pill is-neutral">Finalizada</span>
                  </div>
                ))}
                {historicalAssignments.length === 0 && <div className="admin-ui-v2-empty-cell">Sin registros previos.</div>}
              </motion.div>
            )}
          </AnimatePresence>
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
                <input className="v-input" value={editForm.lastName1} onChange={(event) => setEditForm((prev) => ({ ...prev, lastName1: event.target.value }))} placeholder="Primer apellido" />
                <input className="v-input" value={editForm.lastName2} onChange={(event) => setEditForm((prev) => ({ ...prev, lastName2: event.target.value }))} placeholder="Segundo apellido" />
                <input className="v-input" type="number" value={editForm.age} onChange={(event) => setEditForm((prev) => ({ ...prev, age: Number(event.target.value) }))} placeholder="Edad" />
                <select className="v-select" value={editForm.status} onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value as Person["status"] }))}>
                  <option value="ACTIVE">Activo</option>
                  <option value="INJURED">Herido</option>
                  <option value="MISSING">Desaparecido</option>
                  <option value="DECEASED">Fallecido</option>
                </select>
                <select
                  className="v-select"
                  value={editForm.accountStatus}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, accountStatus: event.target.value as "ACTIVE" | "BLOCKED" | "INACTIVE" }))}
                  disabled={currentAdminId !== null && selectedPerson.id === currentAdminId}
                >
                  <option value="ACTIVE">Cuenta activa</option>
                  <option value="BLOCKED">Cuenta bloqueada</option>
                  <option value="INACTIVE">Cuenta inactiva</option>
                </select>
                {currentAdminId !== null && selectedPerson.id === currentAdminId && (
                  <div className="admin-ui-v2-muted">No puedes cambiar el estado de tu propia cuenta.</div>
                )}
                <div className="v-input" aria-readonly="true">
                  {camps.get(selectedPerson.campId) ?? `Camp #${selectedPerson.campId}`}
                </div>
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
                <div><strong>Estado de cuenta:</strong> {selectedPerson.accountStatus ?? "ACTIVE"}</div>
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
});

const AdmissionsModule = memo(function AdmissionsModule({
  sub,
  admissions,
  admissionsQueue,
  admissionsHistory,
  occupations,
  onAdmissionDecision,
}: {
  sub: string;
  admissions: UiAdmission[];
  admissionsQueue: UiAdmission[];
  admissionsHistory: UiAdmission[];
  occupations: Map<number, string>;
  onAdmissionDecision: (
    id: number,
    decision: "approved" | "rejected",
    options?: { finalOccupationId?: number; finalRole?: string; rejectionReason?: string },
  ) => Promise<void>;
}) {
  const [selectedAdmission, setSelectedAdmission] = useState<UiAdmission | null>(null);
  const [page, setPage] = useState(1);
  const limit = 6;

  const approvedCount = useMemo(
    () => admissions.filter((item) => item.status === "approved").length,
    [admissions],
  );
  const rejectedCount = useMemo(
    () => admissions.filter((item) => item.status === "rejected").length,
    [admissions],
  );

  const activeList = useMemo(
    () => (sub === "Historial" ? admissionsHistory : admissionsQueue),
    [admissionsHistory, admissionsQueue, sub],
  );
  const totalPages = useMemo(() => Math.max(1, Math.ceil(activeList.length / limit)), [activeList.length]);
  const safePage = Math.min(page, totalPages);
  const pagedList = useMemo(
    () => activeList.slice((safePage - 1) * limit, safePage * limit),
    [activeList, safePage],
  );
  const occupationOptions = useMemo(() => Array.from(occupations.entries()), [occupations]);

  const statusLabel = (status: UiAdmission["status"]) => {
    if (status === "pending") return "Pendiente";
    if (status === "approved") return "Aprobada";
    return "Rechazada";
  };

  const workflowStatusLabel = (status: UiAdmission["workflowStatus"]) => {
    if (status === "PENDING_AI") return "Pendiente IA";
    if (status === "PENDING_ADMIN") return "Pendiente admin";
    if (status === "APPROVED") return "Aprobada";
    return "Rechazada";
  };

  const iaTone = (score: number) => {
    if (score < 40) return "danger";
    if (score < 70) return "warn";
    return "ok";
  };

  const openAdmissionDetail = useCallback((admission: UiAdmission) => {
    setSelectedAdmission(admission);
  }, []);

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
                    <span className={`admin-ui-v2-pill ${admission.workflowStatus === "PENDING_ADMIN" ? "is-warn" : admission.workflowStatus === "PENDING_AI" ? "is-neutral" : admission.workflowStatus === "APPROVED" ? "is-ok" : "is-danger"}`}>
                      {workflowStatusLabel(admission.workflowStatus)}
                    </span>
                  </div>
                  <div className="admin-ui-v2-adm-prof">{admission.profession}</div>
                </div>
                <div className={`admin-ui-v2-adm-score ${iaTone(admission.score)}`}>
                  {admission.score}
                </div>
              </div>

              <div className="admin-ui-v2-adm-bar">
                <div className={`admin-ui-v2-adm-bar-fill ${iaTone(admission.score)}`} style={{ width: `${Math.max(0, Math.min(100, admission.score))}%` }} />
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
                <button className="admin-ui-v2-btn" type="button" onClick={() => openAdmissionDetail(admission)}>Ver detalle</button>
                {admission.workflowStatus === "PENDING_ADMIN" ? (
                  <>
                    <button className="admin-ui-v2-btn is-ok" type="button" onClick={() => openAdmissionDetail(admission)}>Revisar y aprobar</button>
                    <button className="admin-ui-v2-btn is-danger" type="button" onClick={() => openAdmissionDetail(admission)}>Revisar y rechazar</button>
                  </>
                ) : (
                  <span className="admin-ui-v2-muted">Pendiente de IA o ya procesada</span>
                )}
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
                  <span className={`admin-ui-v2-pill ${admission.workflowStatus === "APPROVED" ? "is-ok" : admission.workflowStatus === "REJECTED" ? "is-danger" : "is-warn"}`}>
                    {workflowStatusLabel(admission.workflowStatus)}
                  </span>
                </td>
                <td>
                  <button className="admin-ui-v2-btn" type="button" onClick={() => openAdmissionDetail(admission)}>
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
        <AdmissionReviewModal
          admission={selectedAdmission}
          occupations={occupationOptions}
          statusLabel={statusLabel}
          workflowStatusLabel={workflowStatusLabel}
          onClose={() => setSelectedAdmission(null)}
          onAdmissionDecision={onAdmissionDecision}
        />
      )}
    </div>
  );
});

const AchievementsModule = memo(function AchievementsModule({
  sub,
  achievements,
}: {
  sub: string;
  achievements: CampAchievementProgress[];
}) {
  const unlocked = useMemo(
    () => achievements.filter((item) => item.isUnlocked).sort((a, b) => String(b.unlockedAt ?? "").localeCompare(String(a.unlockedAt ?? ""))),
    [achievements],
  );

  const locked = useMemo(() => achievements.filter((item) => !item.isUnlocked), [achievements]);

  const activeList =
    sub === "Desbloqueados"
      ? unlocked
      : sub === "Historial"
        ? unlocked
        : achievements;

  return (
    <div className="admin-ui-v2-achievements-wrap">
      <div className="admin-ui-v2-grid admin-ui-v2-grid-3 admin-ui-v2-achievement-kpi-grid">
        <MetricCard label="Totales" value={achievements.length} tone="info" />
        <MetricCard label="Desbloqueados" value={unlocked.length} tone="ok" />
        <MetricCard label="Pendientes" value={locked.length} tone="warn" />
      </div>

      <div className="admin-ui-v2-achievement-grid">
        {activeList.map((item) => {
          const ratio = achievementProgressRatio(item);
          const progressPercent = Math.round(ratio * 100);
          const isUnlocked = item.isUnlocked;

          return (
            <article key={`${item.achievementId}-${item.metricKey}`} className={`admin-ui-v2-achievement-card ${isUnlocked ? "is-unlocked" : "is-locked"}`}>
              <div className="admin-ui-v2-achievement-head">
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                </div>
                <span className={`admin-ui-v2-pill ${isUnlocked ? "is-ok" : "is-warn"}`}>{isUnlocked ? "Desbloqueado" : "Bloqueado"}</span>
              </div>

              <div className="admin-ui-v2-achievement-meta">
                <span>Metrica: {item.metricKey || "no definida"}</span>
                <span>{achievementValueLabel(item)}</span>
              </div>

              {!isUnlocked && (
                <div className="admin-ui-v2-achievement-progress">
                  <div className="admin-ui-v2-achievement-progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
              )}

              <div className="admin-ui-v2-achievement-foot">
                <span>Meta: {Number.isFinite(item.targetValue) ? item.targetValue : 0}</span>
                <span>{isUnlocked ? `Desbloqueado: ${achievementDateLabel(item.unlockedAt)}` : "En evaluacion"}</span>
              </div>
            </article>
          );
        })}
      </div>

      {activeList.length === 0 && (
        <div className="admin-ui-v2-empty-cell">No hay logros para mostrar en esta vista.</div>
      )}
    </div>
  );
});

const SettingsModule = memo(function SettingsModule({
  sub,
  profile,
  persons,
  onNotice,
  onProfileRefresh,
  onReloadPersons,
}: {
  sub: string;
  profile: SessionAdminUser;
  persons: Person[];
  onNotice: (section: AdminSectionId | "global", type: ModuleMessageType, message: string) => void;
  onProfileRefresh: () => void;
  onReloadPersons: () => Promise<void>;
}) {
  const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
  const ALLOWED_PROFILE_PHOTO_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

  const [settings, setSettings] = useState(() => {
    const base = {
      firstName: profile.firstName ?? "",
      lastName1: profile.lastName1 ?? "",
      lastName2: profile.lastName2 ?? "",
    };

    const stored = localStorage.getItem("admin_settings_v2");
    if (!stored) return base;

    try {
      const parsed = JSON.parse(stored) as Partial<typeof base>;
      return { ...base, ...parsed };
    } catch {
      return base;
    }
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<{ type: ModuleMessageType; text: string } | null>(null);
  const resolvedProfilePerson = useMemo(() => resolveSessionPerson(profile, persons), [profile, persons]);
  const resolvedProfilePersonId = useMemo(() => resolveSessionPersonId(profile, persons), [profile, persons]);

  const currentProfilePhoto = useMemo(
    () =>
      resolvePersonProfileImage(resolvedProfilePerson) ||
      (typeof profile.photoUrl === "string" && profile.photoUrl.trim()) ||
      (typeof profile.imageUrl === "string" && profile.imageUrl.trim()) ||
      (typeof profile.profileImage === "string" && profile.profileImage.trim()) ||
      (typeof profile.avatar === "string" && profile.avatar.trim()) ||
      (typeof profile.photo === "string" && profile.photo.trim()) ||
      null,
    [resolvedProfilePerson, profile.photoUrl, profile.imageUrl, profile.profileImage, profile.avatar, profile.photo],
  );
  const currentProfileInitials = useMemo(
    () => resolveInitials([profile.firstName, profile.lastName1, profile.lastName2, profile.displayName, profile.username], 3),
    [profile.firstName, profile.lastName1, profile.lastName2, profile.displayName, profile.username],
  );

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  const persistSettings = (nextSettings: typeof settings) => {
    localStorage.setItem("admin_settings_v2", JSON.stringify(nextSettings));

    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser) as Record<string, unknown>;
        const updated: Record<string, unknown> = {
          ...parsed,
          firstName: nextSettings.firstName,
          lastName1: nextSettings.lastName1,
          lastName2: nextSettings.lastName2,
        };
        const profileName = [nextSettings.firstName, nextSettings.lastName1, nextSettings.lastName2]
          .map((part) => String(part ?? "").trim())
          .filter(Boolean)
          .join(" ");
        if (profileName) {
          updated.displayName = profileName;
        }
        localStorage.setItem("user", JSON.stringify(updated));
      } catch {
        // Ignore malformed cached user
      }
    }

    onProfileRefresh();
    onNotice("configuracion", "success", "Configuracion guardada correctamente.");
  };

  const handleSave = () => {
    persistSettings(settings);
  };

  const handleReset = () => {
    localStorage.removeItem("admin_settings_v2");
    onNotice("configuracion", "info", "Se restablecio la configuracion local del panel.");
  };

  const handlePhotoSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;

    if (!selectedFile) {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
      setPhotoFile(null);
      setPhotoPreviewUrl(null);
      setPhotoMessage({ type: "info", text: "Selecciona una imagen para habilitar la actualizacion." });
      return;
    }

    if (!ALLOWED_PROFILE_PHOTO_TYPES.has(selectedFile.type)) {
      event.target.value = "";
      setPhotoMessage({ type: "warning", text: "Formato no permitido. Usa JPG, PNG o WEBP." });
      onNotice("configuracion", "warning", "Formato no permitido. Usa JPG, PNG o WEBP.");
      return;
    }

    if (selectedFile.size > PROFILE_PHOTO_MAX_BYTES) {
      event.target.value = "";
      setPhotoMessage({ type: "warning", text: "La imagen supera 5 MB. Selecciona un archivo mas liviano." });
      onNotice("configuracion", "warning", "La imagen supera 5 MB. Selecciona un archivo mas liviano.");
      return;
    }

    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }

    setPhotoFile(selectedFile);
    setPhotoPreviewUrl(URL.createObjectURL(selectedFile));
    setPhotoMessage({ type: "info", text: `Imagen lista: ${selectedFile.name}. Presiona Actualizar foto.` });
  };

  const handlePhotoUpdate = async () => {
    if (isUploadingPhoto) return;
    if (!photoFile) {
      setPhotoMessage({ type: "warning", text: "Primero selecciona una imagen." });
      onNotice("configuracion", "warning", "Primero selecciona una imagen.");
      return;
    }
    if (resolvedProfilePersonId === null) {
      const message = "No se pudo identificar la persona enlazada a este usuario. Revisa que la cuenta tenga personId o username asociado.";
      setPhotoMessage({ type: "error", text: message });
      onNotice("configuracion", "error", message);
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoMessage({ type: "info", text: "Subiendo imagen de perfil..." });
    try {
      const updatedPerson = await updatePersonPhoto(resolvedProfilePersonId, photoFile);
      const resolvedPhotoUrl = resolvePersonProfileImage(updatedPerson);

      const rawUser = localStorage.getItem("user");
      if (rawUser) {
        try {
          const parsed = JSON.parse(rawUser) as Record<string, unknown>;
          const updated: Record<string, unknown> = {
            ...parsed,
            personId: resolvedProfilePersonId,
          };
          if (resolvedPhotoUrl) {
            updated.photoUrl = resolvedPhotoUrl;
            updated.imageUrl = resolvedPhotoUrl;
            updated.profileImage = resolvedPhotoUrl;
            updated.avatar = resolvedPhotoUrl;
            updated.photo = resolvedPhotoUrl;
          }
          localStorage.setItem("user", JSON.stringify(updated));
        } catch {
          // Ignore malformed cached user
        }
      }

      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
      setPhotoFile(null);
      setPhotoPreviewUrl(null);
      setPhotoInputKey((prev) => prev + 1);

      await onReloadPersons();
      onProfileRefresh();
      setPhotoMessage({ type: "success", text: "Foto de perfil actualizada correctamente." });
      onNotice("configuracion", "success", "Foto de perfil actualizada correctamente.");
    } catch (error) {
      const message = error instanceof Error && error.message.trim()
        ? error.message
        : getErrorMessage(error, "update_person");
      setPhotoMessage({ type: "error", text: message });
      onNotice("configuracion", "error", message);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const settingsProfilePreview = photoPreviewUrl || currentProfilePhoto;

  return (
    <div className="admin-ui-v2-dashboard">
      <div className="admin-ui-v2-grid admin-ui-v2-grid-2">
        {sub === "Campamento" && (
          <>
            <div className="admin-ui-v2-module-card">
              <div className="admin-ui-v2-section-head">
                <span>Configuracion del campamento</span>
                <span>Operativa</span>
              </div>
              <div className="admin-ui-v2-form-grid">
                <label className="admin-ui-v2-muted">Campamento asignado</label>
                <div className="v-input" aria-readonly="true">
                  {`Campamento #${profile.campId ?? 1}`}
                </div>

                <label className="admin-ui-v2-muted">Nombre de usuario</label>
                <div className="v-input" aria-readonly="true">
                  {profile.username ?? "sin-usuario"}
                </div>

                <label className="admin-ui-v2-muted">Primer nombre</label>
                <input
                  className="v-input"
                  value={settings.firstName}
                  onChange={(event) => setSettings((prev) => ({ ...prev, firstName: event.target.value }))}
                />

                <label className="admin-ui-v2-muted">Primer apellido</label>
                <input
                  className="v-input"
                  value={settings.lastName1}
                  onChange={(event) => setSettings((prev) => ({ ...prev, lastName1: event.target.value }))}
                />

                <label className="admin-ui-v2-muted">Segundo apellido</label>
                <input
                  className="v-input"
                  value={settings.lastName2}
                  onChange={(event) => setSettings((prev) => ({ ...prev, lastName2: event.target.value }))}
                />

              </div>
            </div>

            <div className="admin-ui-v2-module-card">
              <div className="admin-ui-v2-section-head">
                <span>Foto de perfil</span>
                <span>Cuenta</span>
              </div>
              <div className="admin-ui-v2-settings-photo-panel">
                <div className="admin-ui-v2-settings-photo-preview-wrap">
                  {settingsProfilePreview ? (
                    <img
                      src={settingsProfilePreview}
                      alt={`Foto de perfil de ${profile.displayName ?? profile.username ?? "usuario"}`}
                      className="admin-ui-v2-settings-photo-preview"
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="admin-ui-v2-settings-photo-preview admin-ui-v2-avatar-fallback" aria-hidden="true">
                      {currentProfileInitials}
                    </span>
                  )}
                </div>

                <div className="admin-ui-v2-form-grid">
                  <label className="admin-ui-v2-muted" htmlFor="admin-profile-photo-input">Seleccionar nueva imagen</label>
                  <input
                    id="admin-profile-photo-input"
                    key={photoInputKey}
                    className="v-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoSelection}
                  />
                  <small className="admin-ui-v2-muted">Formatos permitidos: JPG, PNG, WEBP. Límite de tamaño: 5MB.</small>
                </div>

                <div className="admin-ui-v2-actions admin-ui-v2-actions-wrap">
                  <button
                    className="admin-ui-v2-btn is-info"
                    type="button"
                    disabled={isUploadingPhoto}
                    onClick={() => void handlePhotoUpdate()}
                  >
                    {isUploadingPhoto ? "Actualizando foto..." : "Actualizar foto"}
                  </button>
                </div>

                <div className={`admin-ui-v2-settings-photo-message is-${photoMessage?.type ?? "info"}`}>
                  {photoMessage?.text ??
                    (resolvedProfilePersonId === null
                      ? "No se encontro una persona enlazada para este usuario."
                      : "Selecciona una imagen JPG, PNG o WEBP para actualizarla.")}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="admin-ui-v2-actions admin-ui-v2-actions-wrap">
        <button className="admin-ui-v2-btn is-info" type="button" onClick={handleSave}>Guardar configuracion</button>
        <button className="admin-ui-v2-btn" type="button" onClick={handleReset}>Restablecer</button>
      </div>
    </div>
  );
});

function AdmissionReviewModal({
  admission,
  occupations,
  statusLabel,
  workflowStatusLabel,
  onClose,
  onAdmissionDecision,
}: {
  admission: UiAdmission;
  occupations: Array<[number, string]>;
  statusLabel: (status: UiAdmission["status"]) => string;
  workflowStatusLabel: (status: UiAdmission["workflowStatus"]) => string;
  onClose: () => void;
  onAdmissionDecision: (
    id: number,
    decision: "approved" | "rejected",
    options?: { finalOccupationId?: number; finalRole?: string; rejectionReason?: string },
  ) => Promise<void>;
}) {
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    finalOccupationId: admission.finalOccupationId ?? admission.suggestedOccupationId ?? 0,
    finalRole: "WORKER",
    rejectionReason: admission.rejectionReason ?? "",
  });

  const canReviewSelected = admission.workflowStatus === "PENDING_ADMIN";

  const submitAdmissionReview = async (decision: "approved" | "rejected") => {
    if (reviewSubmitting || !canReviewSelected) return;

    if (decision === "approved" && (!reviewForm.finalOccupationId || !reviewForm.finalRole.trim())) return;
    if (decision === "rejected" && !reviewForm.rejectionReason.trim()) return;

    setReviewSubmitting(true);
    try {
      await onAdmissionDecision(admission.id, decision, {
        finalOccupationId: decision === "approved" ? reviewForm.finalOccupationId : undefined,
        finalRole: decision === "approved" ? reviewForm.finalRole : undefined,
        rejectionReason: decision === "rejected" ? reviewForm.rejectionReason : undefined,
      });
      onClose();
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="admin-ui-v2-modal-backdrop" onClick={onClose}>
      <div className="admin-ui-v2-modal" onClick={(event) => event.stopPropagation()}>
        <div className="admin-ui-v2-modal-header">
          <h3>Reporte Detallado - IA</h3>
          <button className="admin-ui-v2-btn" type="button" onClick={onClose}>Cerrar</button>
        </div>

        <div className="admin-ui-v2-adm-detail">
          <div><strong>Nombre:</strong> {admission.name}</div>
          <div><strong>Profesión:</strong> {admission.profession}</div>
          <div><strong>Score IA:</strong> {admission.score}/100</div>
          <div><strong>Estado:</strong> {statusLabel(admission.status)}</div>
          <div><strong>Flujo:</strong> {workflowStatusLabel(admission.workflowStatus)}</div>
          <div><strong>Oficio sugerido IA:</strong> {typeof admission.suggestedOccupationId === "number" ? occupations.find(([id]) => id === admission.suggestedOccupationId)?.[1] ?? `Ocupación #${admission.suggestedOccupationId}` : "No definido"}</div>
          <div><strong>Oficio final:</strong> {typeof admission.finalOccupationId === "number" ? occupations.find(([id]) => id === admission.finalOccupationId)?.[1] ?? `Ocupación #${admission.finalOccupationId}` : "Sin asignar"}</div>
          <div><strong>Razón:</strong> {admission.reason}</div>
          {admission.skills.length > 0 && (
            <div className="admin-ui-v2-adm-skills">
              {admission.skills.map((skill) => (
                <span key={skill} className="admin-ui-v2-pill is-info">{skill}</span>
              ))}
            </div>
          )}

          {canReviewSelected ? (
            <>
              <div className="admin-ui-v2-form-grid">
                <label className="admin-ui-v2-muted">Oficio final (requerido para aprobar)</label>
                <select
                  className="v-select"
                  value={reviewForm.finalOccupationId}
                  onChange={(event) => setReviewForm((prev) => ({ ...prev, finalOccupationId: Number(event.target.value) }))}
                >
                  <option value={0}>Selecciona oficio final</option>
                  {occupations.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>

                <label className="admin-ui-v2-muted">Rol de sistema (requerido para aprobar)</label>
                <select
                  className="v-select"
                  value={reviewForm.finalRole}
                  onChange={(event) => setReviewForm((prev) => ({ ...prev, finalRole: event.target.value }))}
                >
                  <option value="">Selecciona rol final</option>
                  <option value="WORKER">WORKER</option>
                  <option value="TRAVEL_MANAGER">TRAVEL_MANAGER</option>
                  <option value="RESOURCE_MANAGEMENT">RESOURCE_MANAGEMENT</option>
                </select>

                <label className="admin-ui-v2-muted">Motivo de rechazo (obligatorio al rechazar)</label>
                <textarea
                  className="v-textarea"
                  value={reviewForm.rejectionReason}
                  onChange={(event) => setReviewForm((prev) => ({ ...prev, rejectionReason: event.target.value }))}
                  placeholder="Motivo documentado para auditoria"
                />
              </div>

              <div className="admin-ui-v2-actions">
                <button
                  className="admin-ui-v2-btn is-ok"
                  type="button"
                  disabled={reviewSubmitting || !reviewForm.finalOccupationId || !reviewForm.finalRole.trim()}
                  onClick={() => void submitAdmissionReview("approved")}
                >
                  {reviewSubmitting ? "Procesando..." : "Aprobar admisión"}
                </button>
                <button
                  className="admin-ui-v2-btn is-danger"
                  type="button"
                  disabled={reviewSubmitting || !reviewForm.rejectionReason.trim()}
                  onClick={() => void submitAdmissionReview("rejected")}
                >
                  {reviewSubmitting ? "Procesando..." : "Rechazar"}
                </button>
              </div>

              <p className="admin-ui-v2-muted">
                Al aprobar, se crea automaticamente la persona y su cuenta de acceso.
              </p>
            </>
          ) : (
            <p className="admin-ui-v2-muted">
              Esta solicitud no esta lista para revision administrativa. Solo se puede revisar en estado PENDING_ADMIN.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const ExpeditionsModule = memo(function ExpeditionsModule({
  sub,
  expeditions,
  campCatalog,
  consumedResources,
  gainedResources,
}: {
  sub: string;
  expeditions: UiExpedition[];
  campCatalog: Camp[];
  consumedResources: ResourceLedgerEntry[];
  gainedResources: ResourceLedgerEntry[];
}) {
  const [selectedCampId, setSelectedCampId] = useState<number | null>(null);
  const [selectedExpeditionId, setSelectedExpeditionId] = useState<number | null>(null);
  const effectiveExpeditions = expeditions;

  const mappedCamps = useMemo<MappedCampPoint[]>(() => {
    const backendPoints = campCatalog
      .filter(
        (camp) =>
          camp.location &&
          Number.isFinite(camp.location.latitude) &&
          Number.isFinite(camp.location.longitude),
      )
      .map((camp) => ({
        id: camp.id,
        name: camp.name,
        latitude: camp.location!.latitude,
        longitude: camp.location!.longitude,
        status: camp.status,
        currentPopulation: camp.currentPopulation,
        capacity: camp.capacity,
      }));

    return backendPoints;
  }, [campCatalog]);

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

  const visibleExpeditions = useMemo(() => {
    if (sub === "Misiones activas") return activeExpeditions;
    if (sub === "Historial") return historyExpeditions;
    return effectiveExpeditions;
  }, [activeExpeditions, effectiveExpeditions, historyExpeditions, sub]);

  const selectedExpedition = visibleExpeditions.find((item) => item.id === selectedExpeditionId) ?? null;
  const selectedExpeditionRoute = selectedExpedition ? buildExpeditionRoute(selectedExpedition, mappedCamps) : null;

  useEffect(() => {
    if (sub !== "Mapa operativo") return;

    const idleApi = window as Window & {
      requestIdleCallback?: (callback: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof idleApi.requestIdleCallback === "function") {
      const idleCallbackId = idleApi.requestIdleCallback(() => prefetchExpeditionsWorldMap());
      return () => {
        if (typeof idleApi.cancelIdleCallback === "function") {
          idleApi.cancelIdleCallback(idleCallbackId);
        }
      };
    }

    const timer = window.setTimeout(() => prefetchExpeditionsWorldMap(), 120);
    return () => window.clearTimeout(timer);
  }, [sub]);

  useEffect(() => {
    setSelectedExpeditionId((prev) => {
      if (prev && visibleExpeditions.some((item) => item.id === prev)) return prev;
      return visibleExpeditions[0]?.id ?? null;
    });
  }, [visibleExpeditions]);

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
                  <p>Ruta calculada con la ubicación real de campamentos registrados en el backend.</p>
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
                <div className="admin-ui-v2-muted">Vista de consulta habilitada para administración.</div>
              </div>
            ) : (
              <div className="admin-ui-v2-empty-cell">Selecciona una expedición para ver detalle.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

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

function SettingsHint({ onOpen }: { onOpen: () => void }) {
  return (
    <button className="settings-hint" type="button" onClick={onOpen}>
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

function TrophyIcon() {
  return (
    <IconSvg>
      <path d="M9 6h14v2a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5V6Z" />
      <path d="M9 8H6a3 3 0 0 0 3 3" />
      <path d="M23 8h3a3 3 0 0 1-3 3" />
      <path d="M16 13v6" />
      <path d="M12 27h8" />
      <path d="M13 19h6" />
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
