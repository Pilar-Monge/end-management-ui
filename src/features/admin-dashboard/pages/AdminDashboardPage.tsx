
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "./admin-dashboard.css";
import {
  Users, UserPlus, Package, Map, Radio,
  Trophy, Bell, Settings,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  XCircle, Activity, ChevronDown, ChevronLeft,
  BarChart2, Search, Edit2, Trash2, Shield,
  X, Database, Cpu, User
} from "lucide-react";
import {
  AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { fetchPersons as fetchPersonsApi } from "../../persons/api/queries";
import { updatePerson as updatePersonApi, deletePerson as deletePersonApi } from "../../persons/api/mutations";
import { fetchCamps as fetchCampsApi } from "../../camps/api/queries";
import { fetchOccupations as fetchOccupationsApi, fetchResourceTypes as fetchResourceTypesApi } from "../../catalogs/api/queries";
import type { Person as BackendPerson, PersonStatus } from "../../persons/types";
import type { Camp as BackendCamp } from "../../camps/types";
import type { Occupation as BackendOccupation, ResourceType as BackendResourceType } from "../../catalogs/types";
import { ApiHttpError } from "../../../shared/services";
import {
  completeExpedition,
  getDeliveredTransferResourceById,
  getCampInventoryEntry,
  getIntercampRequestById,
  deleteCampInventory,
  getExpeditionsDashboard,
  getGeneralDashboard,
  getInventoryMovementById,
  getInventoryDashboard,
  getNotificationById,
  getPersonStatusHistoryById,
  getTransferById,
  getTransferHistoryById,
  getTransferPersonById,
  getUserRoleHistoryById,
  listActiveExpeditions,
  listAdmissionRequests,
  listNotifications,
  markNotificationAsRead,
  upsertCampInventory,
  updateAdmissionRequestStatus,
  type AuditRecord,
} from "../services";
import {
  extractCampInventoryEntries,
  extractDailyCollections,
  extractInventoryAlerts,
  extractInventoryMovements,
  extractNumberByHint,
  mapAdmissionFromApi,
  mapExpeditionFromApi,
  mapIntercampFromApi,
  mapNotificationFromApi,
  summarizeAuditRecord,
  toDisplayDate,
} from "../mappers/adminMappers";
import { ExpeditionsPanel } from "../expeditions/ExpeditionsPanel";
import { prefetchExpeditionsData } from "../expeditions/useExpeditionsState";
import { prefetchExpeditionsWorldMap } from "../expeditions/components/ExpeditionsWorldMap";


const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Permanent+Marker&family=Share+Tech+Mono&family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@400;700;900&display=swap');`

type NavSection =
  | 'CENTRO DE MANDO'
  | 'POBLACIÓN'
  | 'ADMISIONES IA'
  | 'INVENTARIO'
  | 'EXPEDICIONES'
  | 'INTER-CAMPAMENTOS'
  | 'SEGURIDAD / LOGS'
  | 'LOGROS'
  | 'NOTIFICACIONES'
  | 'CONFIGURACIÓN'

type PopulationViewMode = "stats" | "users" | "tempRoles";
type AdmissionsViewMode = "queue" | "history";
type InventoryViewMode = "summary" | "items" | "movements" | "alerts" | "collection";
type ExpeditionsViewMode =
  | "active"
  | "planning"
  | "history"
  | "consumed"
  | "gained"
  | "map"
  | "activeOps"
  | "resources";
type IntercampViewMode = "pending" | "history";
type SecurityViewMode = "live" | "errors" | "system";
type LogrosViewMode = "overview" | "progress";
type NotifsViewMode = "all" | "unread" | "critical";
type ConfigViewMode = "camp" | "system";
type AppRole = "SYSTEM_ADMIN" | "GESTION_RECURSOS" | "TRABAJADOR" | "ENCARGADO_VIAJES";
type HttpCode = 400 | 401 | 403 | 404;

const UI_COLORS = {
  bg: "#04090A",
  panel: "#081213",
  panelAlt: "#0A1718",
  panelRaised: "#102023",
  border: "#2B464B",
  borderSoft: "#1A2F34",
  textPrimary: "#EAF8F8",
  textMuted: "#9EC3C2",
  textFaint: "#6D8B8C",
  accent: "#69BFB7",
  state: {
    critical: "#DC2626",
    warning: "#D4A65A",
    info: "#67ACA9",
    system: "#89A9AA",
  },
} as const

const MOTION = {
  fast: { duration: 0.16, ease: "easeOut" as const },
  base: { duration: 0.24, ease: "easeOut" as const },
  alert: { duration: 0.2, ease: "easeInOut" as const },
  progress: { duration: 0.7, ease: "easeOut" as const },
  page: { duration: 0.26, ease: "easeOut" as const },
} as const;

const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  SYSTEM_ADMIN: ["admissions.review", "inventory.adjust", "intercamp.approve", "expeditions.force", "users.edit"],
  GESTION_RECURSOS: ["inventory.adjust", "intercamp.approve"],
  TRABAJADOR: [],
  ENCARGADO_VIAJES: ["expeditions.force", "intercamp.approve"],
};

function httpMessage(code: HttpCode) {
  if (code === 400) return "SOLICITUD INVÁLIDA (400): revisa los campos y vuelve a intentar.";
  if (code === 401) return "SESIÓN EXPIRADA (401): inicia sesión nuevamente.";
  if (code === 403) return "SIN PERMISOS (403): esta acción no está autorizada para tu rol.";
  return "RECURSO NO ENCONTRADO (404): verifica el elemento solicitado.";
}

function confirmAction(message: string, onConfirm: () => void) {
  if (window.confirm(message)) onConfirm();
}

interface Person {
  id: number;
  name: string;
  profileImage: string;
  role: string;
  status: "Activo" | "Herido" | "Enfermo" | "Fuera";
  age: number;
  sector: string;
  joined: string;
}

interface Admission {
  id: number
  name: string
  profession: string
  score: number
  badge: string | null
  status: 'pending' | 'approved' | 'rejected'
  skills: string[]
  reason: string
}

interface InventoryItem {
  id: number
  name: string
  category: string
  pct: number
  units: number
  max: number
  status: 'CRÍTICO' | 'BAJO' | 'NORMAL' | 'OK'
}

interface TempOccupationAssignment {
  id: number;
  personId: number;
  personName: string;
  fromRole: string;
  occupationId: number;
  occupationName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "ACTIVA" | "FINALIZADA";
}

interface InventoryMovement {
  id: number;
  resource: string;
  type: "INGRESO" | "EGRESO" | "AJUSTE";
  amount: number;
  date: string;
  reason: string;
}

interface InventoryAlert {
  id: number;
  resource: string;
  severity: "CRÍTICA" | "MEDIA";
  status: "ACTIVA" | "ATENDIDA";
  threshold: number;
}

interface DailyCollection {
  id: number;
  resource: string;
  amountCollected: number;
  date: string;
  notes: string;
}

interface Expedition {
  id: number
  name: string
  day: number
  total: number
  participants: string[]
  status: 'EN CURSO' | 'PROGRAMADA' | 'REGRESANDO' | 'COMPLETADA'
  objective: string
  sector: string
}

interface IntercampRequest {
  id: number
  from: string
  text: string
  time: string
  status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'CONFIRMADO'
  urgent: boolean
  type: 'solicitud' | 'traslado' | 'oferta'
}

interface LogEntry {
  id: number
  time: string
  level: 'info' | 'warn' | 'error' | 'system'
  user: string
  action: string
}

interface Notification {
  id: number
  title: string
  body: string
  time: string
  read: boolean
  level: 'critical' | 'warning' | 'info'
}

const INVENTORY_CATEGORY_MAP: Record<BackendResourceType["category"], string> = {
  CONSUMABLE: "Esencial",
  FOOD: "Esencial",
  MEDICINE: "Médico",
  EQUIPMENT: "Defensa",
  TOOL: "Agricultura",
  OTHER: "Bienestar",
};

function toHttpCode(error: unknown): HttpCode | null {
  if (!(error instanceof ApiHttpError)) return null;
  const status = error.statusCode;
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    return status;
  }
  return null;
}

function mapPersonStatus(status: PersonStatus): Person["status"] {
  if (status === "ACTIVE") return "Activo";
  if (status === "INJURED") return "Herido";
  if (status === "MISSING") return "Fuera";
  return "Fuera";
}

function unmapPersonStatus(status: Person["status"]): PersonStatus {
  if (status === "Activo") return "ACTIVE";
  if (status === "Herido") return "INJURED";
  if (status === "Enfermo") return "INJURED";
  return "MISSING";
}

// ─── INITIAL DATA ─────────────────────────────────────────────────────────────

const INITIAL_PERSONS: Person[] = [
  { id: 1, name: "María González", profileImage: "https://i.pravatar.cc/96?img=5", role: "Médica", status: "Activo", age: 34, sector: "Enfermería", joined: "D-40" },
  { id: 2, name: "Roberto Soto", profileImage: "https://i.pravatar.cc/96?img=12", role: "Mecánico", status: "Activo", age: 42, sector: "Taller", joined: "D-35" },
  { id: 3, name: "Ana Quirós", profileImage: "https://i.pravatar.cc/96?img=20", role: "Agricultora", status: "Activo", age: 28, sector: "Huerto", joined: "D-47" },
  { id: 4, name: "Luis Mora", profileImage: "https://i.pravatar.cc/96?img=15", role: "Guardia", status: "Fuera", age: 31, sector: "Perimetro", joined: "D-20" },
  { id: 5, name: "Karen Torres", profileImage: "https://i.pravatar.cc/96?img=32", role: "Cocinera", status: "Activo", age: 25, sector: "Cocina", joined: "D-47" },
  { id: 6, name: "Pedro Jiménez", profileImage: "https://i.pravatar.cc/96?img=53", role: "Ingeniero", status: "Herido", age: 39, sector: "Construcción", joined: "D-30" },
  { id: 7, name: "Sofía Vargas", profileImage: "https://i.pravatar.cc/96?img=47", role: "Médica", status: "Activo", age: 45, sector: "Enfermería", joined: "D-10" },
  { id: 8, name: "Diego Ramírez", profileImage: "https://i.pravatar.cc/96?img=68", role: "Explorador", status: "Fuera", age: 27, sector: "Exteriores", joined: "D-38" },
  { id: 9, name: "Valeria López", profileImage: "https://i.pravatar.cc/96?img=36", role: "Maestra", status: "Activo", age: 33, sector: "Educación", joined: "D-41" },
  { id: 10, name: "Camilo Ruiz", profileImage: "https://i.pravatar.cc/96?img=69", role: "Guardia", status: "Enfermo", age: 22, sector: "Perimetro", joined: "D-45" },
  { id: 11, name: "Natalia Castro", profileImage: "https://i.pravatar.cc/96?img=41", role: "Química", status: "Activo", age: 37, sector: "Laboratorio", joined: "D-15" },
  { id: 12, name: "Andrés Blanco", profileImage: "https://i.pravatar.cc/96?img=13", role: "Chofer", status: "Activo", age: 50, sector: "Logística", joined: "D-22" },
];

const INITIAL_ADMISSIONS: Admission[] = [
  {
    id: 1,
    name: 'María González',
    profession: 'Médica',
    score: 94,
    badge: null,
    status: 'pending',
    skills: ['Cirugía', 'Primeros Auxilios', 'Farmacología'],
    reason: 'Encontrada en sector norte, documentos verificados.',
  },
  {
    id: 2,
    name: 'Roberto Soto',
    profession: 'Mecánico',
    score: 78,
    badge: null,
    status: 'pending',
    skills: ['Motores', 'Soldadura', 'Electricidad'],
    reason: 'Grupo de 3 personas, referenciado por Expedición Norte.',
  },
  {
    id: 3,
    name: 'Unnamed',
    profession: 'Desconocido',
    score: 12,
    badge: 'SOSPECHOSO',
    status: 'pending',
    skills: [],
    reason: 'Sin documentos. Comportamiento errático. Revisión IA: posible infección.',
  },
  {
    id: 4,
    name: 'Luis Mora',
    profession: 'Agricultor',
    score: 67,
    badge: null,
    status: 'pending',
    skills: ['Cultivos', 'Riego', 'Conservas'],
    reason: 'Llega con semillas y herramientas propias.',
  },
]

const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 1,
    name: 'Agua potable',
    category: 'Esencial',
    pct: 8,
    units: 240,
    max: 3000,
    status: 'CRÍTICO',
  },
  {
    id: 2,
    name: 'Raciones de comida',
    category: 'Esencial',
    pct: 23,
    units: 690,
    max: 3000,
    status: 'BAJO',
  },
  {
    id: 3,
    name: 'Medicamentos',
    category: 'Médico',
    pct: 15,
    units: 150,
    max: 1000,
    status: 'CRÍTICO',
  },
  { id: 4, name: 'Munición', category: 'Defensa', pct: 67, units: 2010, max: 3000, status: 'OK' },
  { id: 5, name: 'Baterías', category: 'Energía', pct: 45, units: 360, max: 800, status: 'NORMAL' },
  { id: 6, name: 'Higiene', category: 'Bienestar', pct: 31, units: 248, max: 800, status: 'BAJO' },
  {
    id: 7,
    name: 'Combustible',
    category: 'Energía',
    pct: 52,
    units: 520,
    max: 1000,
    status: 'NORMAL',
  },
  { id: 8, name: 'Semillas', category: 'Agricultura', pct: 75, units: 300, max: 400, status: 'OK' },
]

const INITIAL_TEMP_ASSIGNMENTS: TempOccupationAssignment[] = [
  {
    id: 1,
    personId: 2,
    personName: "Roberto Soto",
    fromRole: "Mecánico",
    occupationId: 101,
    occupationName: "Guardia",
    startDate: "2026-05-01",
    endDate: "2026-05-08",
    reason: "Cobertura por baja médica",
    status: "ACTIVA",
  },
  {
    id: 2,
    personId: 9,
    personName: "Valeria López",
    fromRole: "Maestra",
    occupationId: 205,
    occupationName: "Logística",
    startDate: "2026-04-20",
    endDate: "2026-04-28",
    reason: "Pico de transferencias inter-camp",
    status: "FINALIZADA",
  },
];

const INITIAL_MOVEMENTS: InventoryMovement[] = [
  { id: 1, resource: "Agua potable", type: "INGRESO", amount: 120, date: "D-47 08:10", reason: "Retorno expedición sur" },
  { id: 2, resource: "Medicamentos", type: "EGRESO", amount: 25, date: "D-47 10:30", reason: "Atención clínica" },
  { id: 3, resource: "Munición", type: "AJUSTE", amount: 40, date: "D-47 11:45", reason: "Conteo físico" },
];

const INITIAL_INV_ALERTS: InventoryAlert[] = [
  { id: 1, resource: "Agua potable", severity: "CRÍTICA", status: "ACTIVA", threshold: 20 },
  { id: 2, resource: "Medicamentos", severity: "CRÍTICA", status: "ACTIVA", threshold: 25 },
  { id: 3, resource: "Higiene", severity: "MEDIA", status: "ATENDIDA", threshold: 30 },
];

const INITIAL_COLLECTIONS: DailyCollection[] = [
  { id: 1, resource: "Agua potable", amountCollected: 65, date: "D-47", notes: "Pozo este" },
  { id: 2, resource: "Raciones de comida", amountCollected: 90, date: "D-47", notes: "Caza y trueque" },
  { id: 3, resource: "Semillas", amountCollected: 12, date: "D-47", notes: "Huerto norte" },
];

//  INITIAL DATA 
const INITIAL_EXPEDITIONS: Expedition[] = [
  {
    id: 1,
    name: 'EXPEDICIÓN NORTE',
    day: 3,
    total: 5,
    participants: ['JR', 'MA', 'PC', 'LS', 'KT'],
    status: 'EN CURSO',
    objective: 'Buscar suministros médicos en hospital abandonado.',
    sector: 'Sector Norte — 12km',
  },
  {
    id: 2,
    name: 'EXPLORACIÓN SECTOR 7',
    day: 0,
    total: 5,
    participants: ['DN', 'AS', 'FG', 'JL'],
    status: 'PROGRAMADA',
    objective: 'Reconocimiento de rutas alternativas.',
    sector: 'Sector Este — 8km',
  },
  {
    id: 3,
    name: 'RETORNO GRUPO DELTA',
    day: 4,
    total: 5,
    participants: ['CA', 'MT', 'PB', 'RQ', 'EV'],
    status: 'REGRESANDO',
    objective: 'Recolección de agua y filtros.',
    sector: 'Sector Sur — 5km',
  },
  {
    id: 4,
    name: 'MISIÓN SUMINISTROS',
    day: 5,
    total: 5,
    participants: ['WN', 'SK', 'LR', 'PR', 'YU'],
    status: 'COMPLETADA',
    objective: 'Recuperar generadores.',
    sector: 'Sector Oeste — 15km',
  },
]

const INITIAL_EXP_CONSUMED: ExpeditionResourceEntry[] = [
  { id: 1, expeditionId: 1, resource: "Agua potable", amount: 35, date: "D-47 09:00", notes: "Raciones de salida" },
  { id: 2, expeditionId: 3, resource: "Combustible", amount: 18, date: "D-47 07:30", notes: "Recorrido largo" },
];

const INITIAL_EXP_GAINED: ExpeditionResourceEntry[] = [
  { id: 1, expeditionId: 1, resource: "Medicamentos", amount: 42, date: "D-47 14:20", notes: "Hospital norte" },
  { id: 2, expeditionId: 4, resource: "Baterías", amount: 26, date: "D-46 18:10", notes: "Bodega industrial" },
];

const INITIAL_INTERCAMP: IntercampRequest[] = [
  {
    id: 1,
    from: 'CAMPAMENTO BETA',
    text: 'Solicita 50 raciones de comida urgente',
    time: 'hace 2h',
    status: 'PENDIENTE',
    urgent: true,
    type: 'solicitud',
  },
  {
    id: 2,
    from: 'CAMPAMENTO GAMMA',
    text: 'Envía 3 personas especializadas (médicos)',
    time: 'hace 1d',
    status: 'APROBADO',
    urgent: false,
    type: 'oferta',
  },
  {
    id: 3,
    from: 'CAMPAMENTO DELTA',
    text: 'Solicita 10 médicos para brote de infección',
    time: 'hace 3h',
    status: 'PENDIENTE',
    urgent: false,
    type: 'solicitud',
  },
  {
    id: 4,
    from: 'CAMPAMENTO BETA',
    text: 'Traslado programado — BETA a ALFA',
    time: 'Mañana 08:00',
    status: 'CONFIRMADO',
    urgent: false,
    type: 'traslado',
  },
  {
    id: 5,
    from: 'CAMPAMENTO ÉPSILON',
    text: 'Ofrece intercambio: munición por agua',
    time: 'hace 5h',
    status: 'PENDIENTE',
    urgent: false,
    type: 'solicitud',
  },
]

const INITIAL_LOGS: LogEntry[] = [
  {
    id: 1,
    time: '14:32',
    level: 'info',
    user: 'Admin Edicson',
    action: 'LOGIN exitoso desde 192.168.1.1',
  },
  {
    id: 2,
    time: '14:28',
    level: 'info',
    user: 'GestorRecursos_Ana',
    action: 'INVENTARIO_EDIT — Agua potable: +50 unidades',
  },
  {
    id: 3,
    time: '13:55',
    level: 'info',
    user: 'Trabajador_Jose',
    action: 'BODEGA_CONSULTA — Sección Médicos',
  },
  {
    id: 4,
    time: '13:30',
    level: 'error',
    user: 'Intento fallido',
    action: 'LOGIN FALLIDO — IP: 192.168.1.45 (3 intentos)',
  },
  {
    id: 5,
    time: '12:00',
    level: 'info',
    user: 'Encargado_Viajes',
    action: 'EXPEDICION_CREAR — Exploración Sector 7',
  },
  {
    id: 6,
    time: '11:45',
    level: 'system',
    user: 'SISTEMA',
    action: 'CONSUMO_DIARIO_AUTO — -30 raciones, -10 agua',
  },
  {
    id: 7,
    time: '10:15',
    level: 'warn',
    user: 'SISTEMA',
    action: 'ALERTA_INVENTARIO — Medicamentos por debajo del 20%',
  },
  {
    id: 8,
    time: '09:30',
    level: 'info',
    user: 'Admin Edicson',
    action: 'ADMISION_APROBADA — María González',
  },
  {
    id: 9,
    time: '08:00',
    level: 'system',
    user: 'SISTEMA',
    action: 'REPORTE_NOCTURNO_ENVIADO — Día 47 del apocalipsis',
  },
  {
    id: 10,
    time: '07:45',
    level: 'warn',
    user: 'SISTEMA',
    action: 'ALERTA_EXPEDICION — Retorno Grupo Delta con 1h de retraso',
  },
]

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    title: 'ALERTA CRÍTICA: Agua potable',
    body: 'Stock de agua al 8%. Acción inmediata requerida.',
    time: 'hace 30min',
    read: false,
    level: 'critical',
  },
  {
    id: 2,
    title: 'Admisión pendiente',
    body: "'Unnamed' con score 12 — revisión de seguridad necesaria.",
    time: 'hace 45min',
    read: false,
    level: 'critical',
  },
  {
    id: 3,
    title: 'Expedición Norte: Día 3/5',
    body: 'Grupo en curso sin novedades reportadas.',
    time: 'hace 2h',
    read: false,
    level: 'info',
  },
  {
    id: 4,
    title: 'Solicitud inter-campamento urgente',
    body: 'Campamento Beta solicita 50 raciones de comida.',
    time: 'hace 2h',
    read: false,
    level: 'warning',
  },
  {
    id: 5,
    title: 'Medicamentos al 15%',
    body: 'Nivel crítico. Expedición de reabastecimiento sugerida.',
    time: 'hace 3h',
    read: true,
    level: 'critical',
  },
  {
    id: 6,
    title: 'Nuevo logro desbloqueado',
    body: '¡7 días sin bajas de vida completado!',
    time: 'hace 1d',
    read: true,
    level: 'info',
  },
  {
    id: 7,
    title: 'Intento de acceso no autorizado',
    body: 'IP 192.168.1.45 — 3 intentos fallidos. Bloqueado.',
    time: 'hace 1h',
    read: false,
    level: 'warning',
  },
]

const resourceTrendData = [
  { day: 'D-6', food: 85, water: 72, ammo: 90 },
  { day: 'D-5', food: 80, water: 68, ammo: 85 },
  { day: 'D-4', food: 74, water: 55, ammo: 82 },
  { day: 'D-3', food: 65, water: 40, ammo: 78 },
  { day: 'D-2', food: 53, water: 25, ammo: 70 },
  { day: 'D-1', food: 38, water: 15, ammo: 68 },
  { day: 'HOY', food: 23, water: 8, ammo: 67 },
]

function scoreColor(s: number) {
  if (s < 50) return "#DC2626";
  if (s <= 75) return "#4AAED2";
  return "#0D9488";
}
function statusColor(s: string) {
  switch (s) {
    case "CRÍTICO": return "#DC2626";
    case "BAJO": return "#EA580C";
    case "OK": return "#0D9488";
    default: return "#4AAED2";
  }
}
function invBarColor(pct: number) {
  if (pct < 20) return "#DC2626";
  if (pct < 40) return "#EA580C";
  if (pct < 60) return "#4AAED2";
  return "#0D9488";
}
function expColor(s: string) {
  if (s === "EN CURSO") return "#4AAED2";
  if (s === "PROGRAMADA") return "#0D9488";
  if (s === "REGRESANDO") return "#0D9488";
  return "#4B5563";
}
function intercampColor(s: string) {
  if (s === "APROBADO" || s === "CONFIRMADO") return "#0D9488";
  if (s === "PENDIENTE") return "#4AAED2";
  if (s === "RECHAZADO") return "#DC2626";
  return "#B8C7DB";
}
function logLevelColor(l: string) {
  if (l === 'error') return UI_COLORS.state.critical
  if (l === 'warn') return UI_COLORS.state.warning
  if (l === 'system') return UI_COLORS.state.system
  return UI_COLORS.state.info
}
function notifColor(l: string) {
  if (l === 'critical') return UI_COLORS.state.critical
  if (l === 'warning') return UI_COLORS.state.warning
  return UI_COLORS.state.info
}

function Card({
  children,
  className = '',
  glow = '',
}: {
  children: React.ReactNode
  className?: string
  glow?: string
}) {
  return (
    <div
      className={`admin-card relative rounded-sm card-soft p-4 ${className}`}
      style={{
        background: UI_COLORS.panel,
        border: `1px solid ${glow || UI_COLORS.border}`,
        boxShadow: glow ? `0 0 12px 1px ${glow}22` : `inset 0 0 0 1px ${UI_COLORS.borderSoft}`,
      }}
    >
      {children}
    </div>
  )
}

function SectionHeader({ title, accent = true }: { title: string; accent?: boolean }) {
  return (
    <div className="admin-section-header mb-3">
      <h3
        style={{
          fontFamily: "'Share Tech Mono', monospace",
          color: UI_COLORS.textPrimary,
          fontSize: 12,
          letterSpacing: '0.12em',
        }}
        className="admin-title-brush uppercase"
      >
        {title}
      </h3>
      {accent && (
        <div
          style={{
            height: 1,
            background: `linear-gradient(90deg, ${UI_COLORS.accent} 0%, transparent 100%)`,
            marginTop: 4,
          }}
        />
      )}
    </div>
  )
}

function Toggle({ active, onChange }: { active: boolean; onChange?: () => void }) {
  return (
    <button
      onClick={onChange}
      className="admin-toggle relative inline-flex items-center cursor-pointer"
      style={{ width: 32, height: 16, borderRadius: 8, background: active ? "#7FB8FF" : "#2A3444", border: "1px solid #324154", transition: "background 0.2s" }}
    >
      <div className="admin-toggle-knob" style={{ width: 12, height: 12, borderRadius: "50%", background: "#EEF3FB", position: "absolute", left: active ? 16 : 2, transition: "left 0.2s" }} />
    </button>
  )
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="admin-badge px-1.5 py-0.5 rounded-sm"
      style={{
        background: `${color}22`,
        border: `1px solid ${color}`,
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: 9,
        color,
      }}
    >
      {label}
    </span>
  )
}

function EmptyState({
  title,
  hint,
  icon: Icon,
}: {
  title: string
  hint: string
  icon: React.ElementType
}) {
  return (
    <div className="text-center py-8">
      <Icon size={30} style={{ color: UI_COLORS.border, margin: '0 auto 8px' }} />
      <div
        style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 11,
          color: UI_COLORS.textMuted,
        }}
      >
        {title}
      </div>
      <div
        style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: UI_COLORS.textFaint }}
      >
        {hint}
      </div>
    </div>
  )
}

interface ExpeditionResourceEntry {
  id: number;
  expeditionId: number;
  resource: string;
  amount: number;
  date: string;
  notes: string;
}

function ModuleContext({ module }: { module: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-sm" style={{ background: UI_COLORS.panelAlt, border: `1px solid ${UI_COLORS.border}` }}>
      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: UI_COLORS.textMuted }}>CAMPAMENTO ACTUAL: CAMPAMENTO ALFA</span>
      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: UI_COLORS.accent }}>{module}</span>
    </div>
  );
}

function PaginationBar({
  page,
  totalPages,
  totalItems,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (next: number) => void;
}) {
  const safeTotal = Math.max(1, totalPages);
  return (
    <div className="flex items-center justify-between gap-2 mt-3">
      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: UI_COLORS.textFaint }}>REGISTROS: {totalItems}</span>
      <div className="flex items-center gap-1">
        <button className="admin-chip-btn px-2 py-1 rounded-sm" style={{ border: `1px solid ${UI_COLORS.border}`, color: UI_COLORS.textMuted }} disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>ANT</button>
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: UI_COLORS.textPrimary }}>PÁG {page}/{safeTotal}</span>
        <button className="admin-chip-btn px-2 py-1 rounded-sm" style={{ border: `1px solid ${UI_COLORS.border}`, color: UI_COLORS.textMuted }} disabled={page >= safeTotal} onClick={() => onPageChange(Math.min(safeTotal, page + 1))}>SIG</button>
      </div>
    </div>
  );
}

function SearchBar({ value, onChange, placeholder = "BUSCAR..." }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div
      className="admin-search flex items-center gap-2 px-3 py-1.5 rounded-sm"
      style={{ background: UI_COLORS.panelAlt, border: `1px solid ${UI_COLORS.border}`, flex: 1 }}
    >
      <Search size={11} style={{ color: UI_COLORS.textFaint }} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="admin-input flex-1 bg-transparent outline-none"
        style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 10,
          color: UI_COLORS.textPrimary,
        }}
      />
    </div>
  )
}

function ActionBtn({
  label,
  color,
  onClick,
  small = false,
}: {
  label: string
  color: string
  onClick?: () => void
  small?: boolean
}) {
  const isCritical = color === UI_COLORS.state.critical
  const toneBg = isCritical ? `${color}2A` : `${color}20`
  return (
    <button
      onClick={onClick}
      className={`admin-btn px-2 py-1 rounded-sm cursor-pointer${small ? ' admin-btn--small' : ''}`}
      style={{
        background: toneBg,
        border: `1px solid ${color}`,
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: small ? 9 : 10,
        color: isCritical ? '#FFD8D8' : color,
      }}
    >
      {label}
    </button>
  )
}

function Modal({
  open,
  onClose,
  title,
  children,
  backgroundVideoSrc,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  backgroundVideoSrc?: string;
}) {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={MOTION.base}
        className="admin-modal fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={MOTION.base}
          onClick={e => e.stopPropagation()}
          className="admin-modal-card relative w-full max-w-lg rounded-sm p-5"
          style={{ background: backgroundVideoSrc ? "#081018" : "#0B1118", border: "1px solid #7FB8FF", boxShadow: "0 0 30px #7FB8FF22", maxHeight: "90vh", overflowY: "auto", overflowX: "hidden" }}
        >
          {backgroundVideoSrc && (
            <>
              <video
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full"
                style={{ objectFit: "cover", opacity: 0.62 }}
              >
                <source src={backgroundVideoSrc} type="video/mp4" />
              </video>
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(180deg, rgba(5,7,10,0.1) 0%, rgba(5,7,10,0.42) 35%, rgba(5,7,10,0.62) 100%)",
                }}
              />
            </>
          )}
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4" style={{ borderBottom: "1px solid #2A3444", paddingBottom: 12 }}>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#4AAED2", letterSpacing: "0.1em" }}>{title}</span>
              <button onClick={onClose} className="admin-icon-btn"><X size={14} style={{ color: "#B8C7DB" }} /></button>
            </div>
            {children}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function DonutCenter({ cx, cy, total }: { cx?: number; cy?: number; total: number }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-8" style={{ fontFamily: "'Orbitron', monospace", fill: "#EEF3FB", fontSize: 22, fontWeight: 900 }}>{total}</tspan>
      <tspan x={cx} dy="18" style={{ fontFamily: "'Share Tech Mono', monospace", fill: "#B8C7DB", fontSize: 9 }}>TOTAL</tspan>
    </text>
  )
}


function ViewPoblacion({ mode, campId }: { mode: PopulationViewMode; campId?: number }) {
  const [persons, setPersons] = useState<Person[]>(INITIAL_PERSONS);
  const [backendPersons, setBackendPersons] = useState<BackendPerson[]>([]);
  const [occupationCatalog, setOccupationCatalog] = useState<BackendOccupation[]>([]);
  const [campCatalog, setCampCatalog] = useState<BackendCamp[]>([]);
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("pob_q") ?? "");
  const [filterStatus, setFilterStatus] = useState(() => new URLSearchParams(window.location.search).get("pob_status") ?? "Todos");
  const [selected, setSelected] = useState<Person | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Person>>({});
  const [assignments, setAssignments] = useState<TempOccupationAssignment[]>(INITIAL_TEMP_ASSIGNMENTS);
  const [newAssign, setNewAssign] = useState({ personId: 0, occupationName: "", startDate: "", endDate: "", reason: "" });
  const [assignSearch, setAssignSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<HttpCode | null>(null);
  const [page, setPage] = useState(() => Number(new URLSearchParams(window.location.search).get("pob_page") ?? "1") || 1);
  const [personPhotoPreview, setPersonPhotoPreview] = useState<{ src: string; name: string } | null>(null);
  const limit = Number(new URLSearchParams(window.location.search).get("pob_limit") ?? "8") || 8;

  const mapBackendPerson = (person: BackendPerson, occupations: BackendOccupation[], camps: BackendCamp[]) => {
    const role = occupations.find((occupation) => occupation.id === person.occupationId)?.name ?? `Ocupación #${person.occupationId}`;
    const sector = camps.find((camp) => camp.id === person.campId)?.name ?? `Campamento #${person.campId}`;
    return {
      id: person.id,
      name: [person.firstName, person.lastName].filter(Boolean).join(" ").trim() || person.alias || `Persona #${person.id}`,
      profileImage: `https://i.pravatar.cc/96?img=${(person.id % 69) + 1}`,
      role,
      status: mapPersonStatus(person.status),
      age: person.age,
      sector,
      joined: toDisplayDate(person.admissionDate),
    } as Person;
  };

  const loadPopulation = async () => {
    setIsLoading(true);
    setErrorCode(null);

    try {
      const [personsData, occupations, camps] = await Promise.all([
        fetchPersonsApi(),
        fetchOccupationsApi(),
        fetchCampsApi(),
      ]);

      const campFilteredPersons = campId
        ? personsData.filter((person) => person.campId === campId)
        : personsData;

      setBackendPersons(campFilteredPersons);
      setOccupationCatalog(occupations);
      setCampCatalog(camps);
      setPersons(campFilteredPersons.map((person) => mapBackendPerson(person, occupations, camps)));
    } catch (error) {
      setErrorCode(toHttpCode(error));
      console.error("Error loading population data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const statuses = ['Todos', 'Activo', 'Herido', 'Enfermo', 'Fuera']
  const filtered = persons.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.role.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'Todos' || p.status === filterStatus
    return matchSearch && matchStatus
  })

  const counts = {
    Activo: persons.filter(p => p.status === "Activo").length,
    Herido: persons.filter(p => p.status === "Herido").length,
    Enfermo: persons.filter(p => p.status === "Enfermo").length,
    Fuera: persons.filter(p => p.status === "Fuera").length,
  };
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const safePage = Math.min(page, totalPages);
  const pagedFiltered = filtered.slice((safePage - 1) * limit, safePage * limit);

  const assignmentCandidates = persons.filter(person => {
    const normalizedSearch = assignSearch.toLowerCase().trim();
    const matchSearch =
      normalizedSearch.length === 0 ||
      person.name.toLowerCase().includes(normalizedSearch) ||
      person.role.toLowerCase().includes(normalizedSearch) ||
      person.sector.toLowerCase().includes(normalizedSearch);
    const matchStatus = person.status === "Activo";
    return matchSearch && matchStatus;
  });
  const visibleCandidates = assignmentCandidates.slice(0, 60);
  const selectedCandidate = persons.find(p => p.id === newAssign.personId) ?? null;
  const hasRequiredAssignmentData = Boolean(
    selectedCandidate && newAssign.occupationName.trim() && newAssign.startDate && newAssign.endDate,
  );

  useEffect(() => {
    void loadPopulation();
  }, [campId]);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, mode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("pob_q", search);
    params.set("pob_status", filterStatus);
    params.set("pob_page", String(safePage));
    params.set("pob_limit", String(limit));
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  }, [search, filterStatus, safePage, limit]);

  const handleSaveEdit = () => {
    if (!selected) return;
    const source = backendPersons.find((person) => person.id === selected.id);
    if (!source) return;

    const fullName = ((editData as { name?: string }).name ?? selected.name).trim();
    const parts = fullName.split(/\s+/).filter(Boolean);
    const firstName = parts[0] ?? source.firstName;
    const lastName = parts.slice(1).join(" ") || source.lastName;

    const nextStatus = ((editData as { status?: Person["status"] }).status ?? selected.status);
    const nextRoleName = ((editData as { role?: string }).role ?? selected.role).trim();
    const nextSectorName = ((editData as { sector?: string }).sector ?? selected.sector).trim();

    const matchedOccupation = occupationCatalog.find((occupation) => occupation.name.toLowerCase() === nextRoleName.toLowerCase());
    const matchedCamp = campCatalog.find((camp) => camp.name.toLowerCase() === nextSectorName.toLowerCase());

    setIsLoading(true);
    setErrorCode(null);

    updatePersonApi(selected.id, {
      firstName,
      lastName,
      age: source.age,
      occupationId: matchedOccupation?.id ?? source.occupationId,
      campId: matchedCamp?.id ?? source.campId,
      status: unmapPersonStatus(nextStatus),
      notes: source.notes,
      alias: source.alias,
    })
      .then(() => loadPopulation())
      .then(() => {
        setEditMode(false);
        setSelected(null);
      })
      .catch((error) => {
        setErrorCode(toHttpCode(error));
        window.alert(error instanceof Error ? error.message : "No se pudo actualizar la persona");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleDelete = (id: number) => {
    setIsLoading(true);
    setErrorCode(null);

    deletePersonApi(id)
      .then(() => loadPopulation())
      .then(() => {
        setSelected(null);
      })
      .catch((error) => {
        setErrorCode(toHttpCode(error));
        window.alert(error instanceof Error ? error.message : "No se pudo eliminar la persona");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleCreateAssignment = () => {
    const person = persons.find(p => p.id === newAssign.personId);
    if (!person || !newAssign.occupationName || !newAssign.startDate || !newAssign.endDate) return;
    setAssignments(prev => [{
      id: Date.now(),
      personId: person.id,
      personName: person.name,
      fromRole: person.role,
      occupationId: Date.now(),
      occupationName: newAssign.occupationName,
      startDate: newAssign.startDate,
      endDate: newAssign.endDate,
      reason: newAssign.reason || "Asignación temporal",
      status: "ACTIVA",
    }, ...prev]);
    setNewAssign({ personId: 0, occupationName: "", startDate: "", endDate: "", reason: "" });
    setAssignSearch("");
  };

  const handleFinishAssignment = (id: number) => {
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, status: "FINALIZADA" } : a));
  };

  const getBadgeClass = (status: string) => {
    if (status === "Activo") return "pop-badge-activo";
    if (status === "Herido") return "pop-badge-herido";
    if (status === "Enfermo") return "pop-badge-enfermo";
    if (status === "Fuera") return "pop-badge-fuera";
    return "";
  };

  return (
    <div className="pop-container">
      {isLoading && <EmptyState title="CARGANDO POBLACIÓN" hint="Sincronizando personas del campamento" icon={Users} />}
      {errorCode && <HttpStatusNotice code={errorCode} />}
      
      <div className="flex items-center justify-between mb-6">
        <h2 className="pop-title m-0 tracking-tight">Registro de Población</h2>
        <div className="flex items-center gap-2">
          <span className="pop-text-muted">Campamento Actual: Alfa</span>
        </div>
      </div>

      {mode === "stats" ? (
        (() => {
          const getAreaColor = (str: string) => {
            const colors = ["#4aaed2", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];
            let hash = 0;
            for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
            return colors[Math.abs(hash) % colors.length];
          };

          return (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" style={{ marginBottom: 22 }}>
                {Object.entries(counts).map(([k, v]) => {
                  const color = getAreaColor(k);
                  return (
                  <div key={k} className="pop-card relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 opacity-10 rounded-bl-full group-hover:scale-110 transition-transform" style={{ background: `linear-gradient(to bottom right, ${color}, transparent)` }}></div>
                    <div className="absolute left-0 top-0 w-1 h-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }}></div>
                    <div className="pop-text-muted uppercase tracking-widest text-[10px] mb-2 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-sm" style={{ background: color }}></div>
                      {k}
                    </div>
                    <div className="pop-stat-value text-5xl font-bold tracking-tighter" style={{ textShadow: `0 0 20px ${color}40` }}>
                      {v}
                    </div>
                  </div>
                )})}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Roles - Horizontal Progress Bars */}
                <div className="pop-card flex flex-col">
                  <div className="flex justify-between items-end mb-6 border-b pb-3" style={{ borderColor: "var(--admin-border-soft)" }}>
                    <h3 className="pop-text-primary text-lg m-0 flex items-center gap-2">
                      <Activity size={18} style={{ color: "var(--admin-teal)" }} />
                      DISTRIBUCIÓN POR ROL
                    </h3>
                    <span className="pop-text-muted text-[10px] font-mono tracking-widest">TIEMPO REAL</span>
                  </div>
                  <div className="flex flex-col gap-6 flex-1">
                    {Object.entries(persons.reduce<Record<string, number>>((acc, person) => {
                      acc[person.role] = (acc[person.role] ?? 0) + 1;
                      return acc;
                    }, {}))
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([role, total], index, arr) => {
                      const maxCount = Math.max(...arr.map(a => a[1]));
                      const percent = (total / maxCount) * 100;
                      const color = getAreaColor(role);
                      return (
                        <div key={role} className="relative group">
                          <div className="flex justify-between items-end mb-3">
                            <span className="pop-text-primary text-xs font-bold tracking-wide uppercase">{role}</span>
                            <div className="flex items-center gap-2">
                              <span className="pop-text-muted text-[10px] font-mono">{(total/persons.length * 100).toFixed(1)}%</span>
                              <span className="font-bold text-base leading-none" style={{ color }}>{total}</span>
                            </div>
                          </div>
                          <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "var(--admin-surface-alt)" }}>
                            <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${percent}%` }} 
                              transition={{ duration: 1, ease: "easeOut", delay: index * 0.1 }}
                              className="h-full rounded-full relative"
                              style={{ background: `linear-gradient(90deg, ${color}33, ${color})`, boxShadow: `0 0 10px ${color}80` }}
                            >
                              <div className="absolute right-0 top-0 bottom-0 w-2 bg-white opacity-50"></div>
                            </motion.div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sectors - Vertical Meters in Grid */}
                <div className="pop-card flex flex-col">
                  <div className="flex justify-between items-end mb-6 border-b pb-3" style={{ borderColor: "var(--admin-border-soft)" }}>
                    <h3 className="pop-text-primary text-lg m-0 flex items-center gap-2">
                      <Map size={18} style={{ color: "var(--admin-teal)" }} />
                      OCUPACIÓN POR SECTOR
                    </h3>
                    <span className="pop-text-muted text-[10px] font-mono tracking-widest">ZONAS ACTIVAS</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 flex-1">
                    {Object.entries(persons.reduce<Record<string, number>>((acc, person) => {
                      acc[person.sector] = (acc[person.sector] ?? 0) + 1;
                      return acc;
                    }, {}))
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([sector, total], index, arr) => {
                      const maxCount = Math.max(...arr.map(a => a[1]));
                      const percent = (total / maxCount) * 100;
                      const color = getAreaColor(sector);
                      return (
                        <div key={sector} className="p-3 rounded-lg flex flex-col justify-between relative overflow-hidden group" style={{ background: "var(--admin-surface-alt)", border: "1px solid var(--admin-border-soft)" }}>
                          <div className="absolute top-0 right-0 h-full w-1" style={{ background: "var(--admin-surface)" }}>
                            <motion.div 
                              initial={{ height: 0 }}
                              animate={{ height: `${percent}%` }}
                              transition={{ duration: 1, ease: "easeOut", delay: index * 0.1 }}
                              className="absolute bottom-0 w-full"
                              style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                            ></motion.div>
                          </div>
                          <span className="pop-text-muted text-[9px] font-mono tracking-widest mb-1 opacity-70">SECTOR</span>
                          <span className="pop-text-primary font-bold text-xs uppercase mb-3 pr-4 truncate group-hover:text-white transition-colors">{sector}</span>
                          <div className="flex items-end justify-between pr-4 mt-auto">
                            <span className="font-bold text-xl leading-none" style={{ color: color, textShadow: `0 0 10px ${color}66` }}>{total}</span>
                            <span className="pop-text-muted text-[9px] font-mono opacity-50">UNID.</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          );
        })()
      ) : mode === "users" ? (
        <div className="pop-card">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
            <h3 className="pop-text-primary text-lg m-0 flex-shrink-0">Lista de Personal ({persons.length})</h3>
            <div className="flex-1">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o rol..."
                className="pop-input w-full max-w-md"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {statuses.map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className="pop-btn-secondary"
                  style={{ opacity: filterStatus === s ? 1 : 0.6, borderColor: filterStatus === s ? 'var(--admin-teal)' : '' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

            <div className="w-full overflow-x-auto">
            <div style={{ minWidth: 740 }}>
              <div className="pop-table-header grid grid-cols-12">
                <div className="col-span-3">Nombre</div>
                <div className="col-span-2">Rol</div>
                <div className="col-span-2">Estado</div>
                <div className="col-span-1">Edad</div>
                <div className="col-span-2">Sector</div>
                <div className="col-span-1">Ingreso</div>
                <div className="col-span-1 text-center">Acciones</div>
              </div>
              
              <div className="mt-2 flex flex-col gap-1">
                <AnimatePresence>
                  {pagedFiltered.map(person => (
                    <motion.div
                      key={person.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="pop-table-row grid grid-cols-12 items-center cursor-pointer shadow-sm"
                      onClick={() => { setSelected(person); setEditMode(false); setEditData({}); }}
                      style={{ borderLeft: selected?.id === person.id ? '4px solid var(--admin-teal)' : '4px solid transparent' }}
                    >
                      <div className="col-span-3 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={event => {
                            event.stopPropagation();
                            setPersonPhotoPreview({ src: person.profileImage, name: person.name });
                          }}
                          className="w-8 h-8 rounded-full shrink-0 overflow-hidden cursor-pointer"
                          style={{ border: "1px solid var(--admin-border)", padding: 0, background: "var(--admin-surface-alt)" }}
                        >
                          <img src={person.profileImage} alt={`Perfil de ${person.name}`} className="w-full h-full" style={{ objectFit: "cover" }} />
                        </button>
                        <span className="font-bold pop-text-primary">{person.name}</span>
                      </div>
                      <div className="col-span-2 pop-text-muted text-sm">{person.role}</div>
                      <div className="col-span-2">
                        <span className={`pop-badge ${getBadgeClass(person.status)}`}>{person.status}</span>
                      </div>
                      <div className="col-span-1 font-semibold pop-text-muted">{person.age}</div>
                      <div className="col-span-2 pop-text-muted text-sm">{person.sector}</div>
                      <div className="col-span-1 pop-text-muted text-xs font-mono">{person.joined}</div>
                      <div className="col-span-1 flex gap-2 justify-center">
                        <button 
                          onClick={event => { event.stopPropagation(); setSelected(person); setEditMode(true); setEditData(person); }} 
                          className="pop-icon-btn edit shadow-sm"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={event => { event.stopPropagation(); confirmAction("¿Eliminar este registro de persona?", () => handleDelete(person.id)); }} 
                          className="pop-icon-btn danger shadow-sm"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
          
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Users size={40} className="mx-auto pop-text-muted mb-3 opacity-50" />
              <div className="pop-text-muted font-medium">No se encontraron resultados</div>
            </div>
          )}
          
          <div className="mt-4 pt-4 flex justify-between items-center text-sm pop-text-muted border-t" style={{ borderColor: "var(--admin-border)" }}>
            <div>Registros: <span className="font-bold pop-text-primary">{filtered.length}</span></div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(Math.max(1, page - 1))} 
                disabled={page <= 1}
                className="pop-btn-secondary cursor-pointer disabled:opacity-50"
              >ANT</button>
              <span className="px-2 font-medium pop-text-primary">Pág {safePage} / {totalPages}</span>
              <button 
                onClick={() => setPage(Math.min(totalPages, page + 1))} 
                disabled={page >= totalPages}
                className="pop-btn-secondary cursor-pointer disabled:opacity-50"
              >SIG</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="pop-card xl:col-span-3">
              <h3 className="pop-text-primary text-lg mb-4">ASIGNACIONES ACTIVAS</h3>
              <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2">
                {assignments.filter(a => a.status === "ACTIVA").map(a => (
                  <div key={a.id} className="p-4 rounded-xl shadow-sm relative overflow-hidden" style={{ background: "var(--admin-surface-alt)", border: "1px solid var(--admin-border-soft)" }}>
                    <div className="absolute top-0 left-0 w-1 h-full" style={{ background: "var(--admin-teal)" }}></div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="pop-text-primary font-bold text-lg">{a.personName}</span>
                      <span className="pop-badge pop-badge-herido">{a.status}</span>
                    </div>
                    <div className="text-xs font-mono mb-2 px-2 py-1 rounded inline-block shadow-sm" style={{ background: "var(--admin-surface)", color: "var(--admin-text-muted)", border: "1px solid var(--admin-border)" }}>
                      {a.startDate} — {a.endDate}
                    </div>
                    <div className="pop-text-primary font-medium flex items-center gap-2">
                      <span className="pop-text-muted line-through">{a.fromRole}</span> 
                      <span className="font-bold" style={{ color: "var(--admin-teal)" }}>→</span> 
                      <span style={{ color: "var(--admin-teal)" }}>{a.occupationName}</span>
                    </div>
                    <div className="flex justify-end mt-3">
                      <button 
                        className="pop-btn-primary"
                        onClick={() => confirmAction("¿Finalizar esta asignación temporal?", () => handleFinishAssignment(a.id))}
                      >
                        FINALIZAR
                      </button>
                    </div>
                  </div>
                ))}
                {assignments.filter(a => a.status === "ACTIVA").length === 0 && (
                  <div className="text-center py-8 pop-text-muted">No hay coberturas temporales en curso</div>
                )}
              </div>
            </div>

            <div className="xl:col-span-2 flex flex-col gap-6">
              <div className="pop-card">
                <h3 className="pop-text-primary text-lg mb-4">1. SELECCIONAR PERSONA</h3>
                <div className="flex gap-2 mb-3">
                  <input
                    value={assignSearch}
                    onChange={e => setAssignSearch(e.target.value)}
                    placeholder="Buscar por nombre..."
                    className="pop-input flex-1"
                  />
                </div>
                
                <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto mb-4 pr-1">
                  {visibleCandidates.map(person => {
                    const isSelected = person.id === newAssign.personId;
                    return (
                      <div
                        key={person.id}
                        onClick={() => setNewAssign(prev => ({ ...prev, personId: person.id }))}
                        className="p-2 rounded-lg cursor-pointer transition-colors border"
                        style={{ background: isSelected ? "var(--admin-border)" : "transparent", borderColor: isSelected ? "var(--admin-teal)" : "var(--admin-border-soft)" }}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm pop-text-primary">{person.name}</span>
                          <span className={`pop-badge text-[9px] px-2 py-0.5 ${getBadgeClass(person.status)}`}>{person.status}</span>
                        </div>
                        <div className="text-xs pop-text-muted">{person.role}</div>
                      </div>
                    );
                  })}
                </div>
                
                {selectedCandidate && (
                  <div className="p-3 rounded-lg border" style={{ background: "rgba(74, 174, 210, 0.1)", borderColor: "rgba(74, 174, 210, 0.3)" }}>
                    <div className="text-xs font-bold mb-1 uppercase tracking-wider" style={{ color: "var(--admin-teal)" }}>Seleccionado</div>
                    <div className="font-bold pop-text-primary">{selectedCandidate.name}</div>
                  </div>
                )}
              </div>

              <div className="pop-card">
                <h3 className="pop-text-primary text-lg mb-4">2. DATOS DEL ROL</h3>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-bold pop-text-muted mb-1">OFICIO TEMPORAL *</label>
                    <input
                      value={newAssign.occupationName}
                      onChange={e => setNewAssign(prev => ({ ...prev, occupationName: e.target.value }))}
                      placeholder="Ej: Guardia de perímetro"
                      className="pop-input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold pop-text-muted mb-1">DESDE *</label>
                      <input type="date" value={newAssign.startDate} onChange={e => setNewAssign(prev => ({ ...prev, startDate: e.target.value }))} className="pop-input" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold pop-text-muted mb-1">HASTA *</label>
                      <input type="date" value={newAssign.endDate} onChange={e => setNewAssign(prev => ({ ...prev, endDate: e.target.value }))} className="pop-input" />
                    </div>
                  </div>
                  <button
                    onClick={handleCreateAssignment}
                    disabled={!hasRequiredAssignmentData}
                    className={`pop-btn-primary w-full py-3 text-sm mt-2 ${!hasRequiredAssignmentData ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    ASIGNAR TEMPORALMENTE
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pop-card">
            <h3 className="pop-text-primary text-lg mb-4">HISTÓRICO DE ASIGNACIONES</h3>
            <div className="w-full overflow-x-auto">
              <div style={{ minWidth: 640 }}>
                <div className="pop-table-header grid grid-cols-12">
                  <div className="col-span-3">Persona</div>
                  <div className="col-span-3">Cambio</div>
                  <div className="col-span-3">Periodo</div>
                  <div className="col-span-2">Estado</div>
                  <div className="col-span-1">Motivo</div>
                </div>
                <div className="mt-2 flex flex-col gap-1">
                  {assignments.filter(a => a.status === "FINALIZADA").map(a => (
                    <div key={a.id} className="pop-table-row grid grid-cols-12 items-center">
                      <div className="col-span-3 font-bold">{a.personName}</div>
                      <div className="col-span-3 text-sm pop-text-muted">{a.fromRole} → {a.occupationName}</div>
                      <div className="col-span-3 text-xs font-mono pop-text-muted">{a.startDate} a {a.endDate}</div>
                      <div className="col-span-2"><span className="pop-badge pop-badge-fuera">FINALIZADA</span></div>
                      <div className="col-span-1 pop-text-muted text-sm">{a.reason ? "SI" : "-"}</div>
                    </div>
                  ))}
                  {assignments.filter(a => a.status === "FINALIZADA").length === 0 && (
                    <div className="text-center py-6 pop-text-muted">Aún no hay asignaciones finalizadas</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Modal using custom implementation instead of standard Modal so it matches the theme */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {selected && (
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
            onClick={() => { setSelected(null); setEditMode(false); }}
          >
              <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="rounded-lg shadow-2xl overflow-hidden pop-card !p-0"
              style={{ width: "min(100%, 32rem)" }}
            >
              <div className="relative px-6 pt-5 pb-4" style={{ borderBottom: "1px solid #2A3444", background: "#0B1118" }}>
                <h3 className="font-bold pop-text-primary m-0 text-lg uppercase font-mono tracking-wider">{editMode ? "EDITAR PERSONA" : "FICHA INDIVIDUAL"}</h3>
                <button
                  onClick={() => { setSelected(null); setEditMode(false); }}
                  className="pop-icon-btn"
                  style={{ position: "absolute", top: 12, right: 12 }}
                  aria-label="Cerrar ficha"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6" style={{ background: "#070C12" }}>
                {editMode ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-bold pop-text-muted mb-1 uppercase">Nombre</label>
                        <input value={(editData as any)["name"] ?? ""} onChange={e => setEditData(prev => ({ ...prev, name: e.target.value }))} className="pop-input" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold pop-text-muted mb-1 uppercase">Rol</label>
                        <input value={(editData as any)["role"] ?? ""} onChange={e => setEditData(prev => ({ ...prev, role: e.target.value }))} className="pop-input" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold pop-text-muted mb-1 uppercase">Sector</label>
                        <input value={(editData as any)["sector"] ?? ""} onChange={e => setEditData(prev => ({ ...prev, sector: e.target.value }))} className="pop-input" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold pop-text-muted mb-1 uppercase">Estado</label>
                      <select value={(editData.status as string) ?? selected.status} onChange={e => setEditData(prev => ({ ...prev, status: e.target.value as Person["status"] }))} className="pop-input cursor-pointer">
                        {["Activo", "Herido", "Enfermo", "Fuera"].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-3 justify-end mt-4 pt-4" style={{ borderTop: "1px solid var(--admin-border)" }}>
                      <button className="pop-btn-secondary" onClick={() => setEditMode(false)}>CANCELAR</button>
                      <button className="pop-btn-primary" onClick={handleSaveEdit}>GUARDAR CAMBIOS</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-4 p-4 rounded-lg" style={{ background: "#0B1118", border: "1px solid #2A3444" }}>
                      <button
                        type="button"
                        className="w-16 h-16 rounded-sm shadow-md overflow-hidden cursor-pointer"
                        onClick={() => setPersonPhotoPreview({ src: selected.profileImage, name: selected.name })}
                        style={{ background: "var(--admin-surface-alt)", border: "1px solid #2A3444", padding: 0 }}
                      >
                        <img src={selected.profileImage} alt={`Perfil de ${selected.name}`} className="w-full h-full" style={{ objectFit: "cover" }} />
                      </button>
                      <div>
                        <h2 className="text-2xl font-bold pop-text-primary m-0 uppercase">{selected.name}</h2>
                        <div className="pop-text-muted font-medium font-mono">{selected.role}</div>
                      </div>
                      <div className="ml-auto">
                        <span className={`pop-badge px-3 py-1 text-xs ${getBadgeClass(selected.status)}`}>{selected.status}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: "EDAD", value: `${selected.age} años` },
                        { label: "INGRESO", value: selected.joined },
                        { label: "SECTOR", value: selected.sector },
                        { label: "ID DE REGISTRO", value: `#${selected.id.toString().padStart(4, '0')}` },
                      ].map(({ label, value }) => (
                        <div key={label} className="p-3 rounded-lg" style={{ background: "#0B1118", border: "1px solid #2A3444" }}>
                          <div className="text-xs font-bold mb-1 tracking-wider" style={{ color: "#B8C7DB" }}>{label}</div>
                          <div className="font-semibold pop-text-primary" style={{ fontSize: 20, lineHeight: 1.1, fontFamily: "'Orbitron', monospace", wordBreak: "break-word" }}>{value}</div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-3 justify-end mt-2 pt-4" style={{ borderTop: "1px solid var(--admin-border)" }}>
                      <button className="pop-btn-secondary text-red-400 border-red-900 hover:bg-red-900/30 hover:text-red-300" onClick={() => confirmAction("¿Confirmas eliminar este registro?", () => handleDelete(selected.id))}>
                        ELIMINAR
                      </button>
                      <button className="pop-btn-primary" onClick={() => { setEditMode(true); setEditData(selected); }}>
                        EDITAR REGISTRO
                      </button>
                    </div>
                  </div>
                )}
              </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {personPhotoPreview && (
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPersonPhotoPreview(null)}
            className="p-4"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 120,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(3, 7, 12, 0.74)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
          >
              <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onClick={event => event.stopPropagation()}
              style={{
                width: "min(420px, calc(100vw - 32px))",
                borderRadius: 10,
                overflow: "hidden",
                border: "1px solid rgba(127, 184, 255, 0.32)",
                boxShadow: "0 22px 44px rgba(0, 0, 0, 0.46)",
                background: "#0B1118",
              }}
            >
              <img
                src={personPhotoPreview.src}
                alt={`Perfil ampliado de ${personPhotoPreview.name}`}
                style={{ width: "100%", height: "auto", display: "block", maxHeight: "72vh", objectFit: "cover" }}
              />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}

function ViewAdmisiones({ mode, canReview, campId }: { mode: AdmissionsViewMode; canReview: boolean; campId?: number }) {
  const [admissions, setAdmissions] = useState<Admission[]>(INITIAL_ADMISSIONS);
  const [selected, setSelected] = useState<Admission | null>(null);
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<HttpCode | null>(null);
  const [page, setPage] = useState(() => Number(new URLSearchParams(window.location.search).get("adm_page") ?? "1") || 1);
  const limit = Number(new URLSearchParams(window.location.search).get("adm_limit") ?? "6") || 6;

  const showToast = (msg: string, color: string) => {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 2500)
  }

  const loadAdmissions = async () => {
    setIsLoading(true);
    setErrorCode(null);

    try {
      const incoming = await listAdmissionRequests(campId);
      setAdmissions(incoming.map(mapAdmissionFromApi));
    } catch (error) {
      setErrorCode(toHttpCode(error));
      console.error("Error loading admissions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = (id: number) => {
    setIsLoading(true);
    setErrorCode(null);

    updateAdmissionRequestStatus(id, "approved")
      .then(() => loadAdmissions())
      .then(() => {
        setSelected(null);
        showToast("ADMISIÓN APROBADA — Persona añadida al registro.", "#0D9488");
      })
      .catch((error) => {
        setErrorCode(toHttpCode(error));
        showToast(error instanceof Error ? error.message : "No se pudo aprobar la admisión", "#DC2626");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleReject = (id: number) => {
    setIsLoading(true);
    setErrorCode(null);

    updateAdmissionRequestStatus(id, "rejected")
      .then(() => loadAdmissions())
      .then(() => {
        setSelected(null);
        showToast("ADMISIÓN RECHAZADA — Persona bloqueada.", "#DC2626");
      })
      .catch((error) => {
        setErrorCode(toHttpCode(error));
        showToast(error instanceof Error ? error.message : "No se pudo rechazar la admisión", "#DC2626");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const pending = admissions.filter(a => a.status === "pending");
  const resolved = admissions.filter(a => a.status !== "pending");
  const activeList = mode === "history" ? resolved : pending;
  const totalPages = Math.max(1, Math.ceil(activeList.length / limit));
  const safePage = Math.min(page, totalPages);
  const pagedActive = activeList.slice((safePage - 1) * limit, safePage * limit);

  useEffect(() => {
    setPage(1);
  }, [mode, admissions.length]);

  useEffect(() => {
    void loadAdmissions();
  }, [campId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("adm_mode", mode);
    params.set("adm_page", String(safePage));
    params.set("adm_limit", String(limit));
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  }, [mode, safePage, limit]);

  return (
    <div className="admin-stack-lg">
      <ModuleContext module="ADMISIONES IA" />
      {isLoading && <EmptyState title="CARGANDO ADMISIONES" hint="Consultando cola y procesadas" icon={UserPlus} />}
      {errorCode && <HttpStatusNotice code={errorCode} />}
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 right-4 z-50 px-4 py-2 rounded-sm"
            style={{ background: toast.color, fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#EEF3FB" }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {(mode === 'queue' || mode === 'history') && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "PENDIENTES", value: pending.length, color: "#4AAED2" },
            { label: "APROBADAS HOY", value: resolved.filter(a => a.status === "approved").length, color: "#0D9488" },
            { label: "RECHAZADAS HOY", value: resolved.filter(a => a.status === "rejected").length, color: "#DC2626" },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <div className="admin-kpi-value" style={{ fontFamily: "'Orbitron', monospace", fontWeight: 900, color }}>{value}</div>
              <div className="admin-text-label" style={{ fontFamily: "'Rajdhani', sans-serif", color: "#B8C7DB", letterSpacing: "0.1em" }}>{label}</div>
            </Card>
          ))}
        </div>
      )}

      {mode === "queue" && <Card glow="#7FB8FF">
        <div className="flex items-center justify-between mb-3">
          <SectionHeader title="SOLICITUDES PENDIENTES — EVALUACION IA" accent={false} />
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: UI_COLORS.textFaint }}>Modelo: admission-v1 | Precisión: 89%</span>
        </div>
        <div style={{ height: 1, background: "linear-gradient(90deg, #7FB8FF 0%, transparent 100%)", marginBottom: 12 }} />
        <div className="admin-stack-md">
          {pagedActive.map((a) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-3 rounded-sm"
              style={{ background: "#0B1118", border: `1px solid ${a.score < 50 ? "#DC262655" : "#2A3444"}` }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-sm flex items-center justify-center" style={{ background: "#121B26", border: "1px solid #2A3444" }}>
                    <User size={16} style={{ color: "#7FB8FF" }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, fontWeight: 700, color: a.score < 50 ? "#DC2626" : "#EEF3FB" }}>{a.name}</span>
                      {a.badge && <Badge label={a.badge} color="#DC2626" />}
                    </div>
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#B8C7DB" }}>{a.profession}</span>
                  </div>
                </div>
                {/* Score bar */}
                <div
                  className="admin-bar h-1.5 rounded-sm overflow-hidden mb-2"
                  style={{ background: '#2D2A24' }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${a.score}%` }}
                    transition={MOTION.progress}
                    className="admin-bar-fill"
                    style={{ height: '100%', background: scoreColor(a.score), borderRadius: 2 }}
                  />
                </div>
                <p
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    fontSize: 11,
                    color: '#8B8070',
                    marginBottom: 8,
                  }}
                >
                  {a.reason}
                </p>
                {a.skills.length > 0 && (
                  <div className="flex gap-1 flex-wrap mb-2">
                    {a.skills.map((s) => (
                      <Badge key={s} label={s} color="#D97706" />
                    ))}
                  </div>
                )}
                <div className="flex gap-2 items-center">
                  <ActionBtn
                    label="VER DETALLE"
                    color="#8B8070"
                    small
                    onClick={() => setSelected(a)}
                  />
                  <ActionBtn
                    label="APROBAR"
                    color="#0D9488"
                    small
                    onClick={() => handleApprove(a.id)}
                  />
                  <ActionBtn
                    label="RECHAZAR"
                    color="#DC2626"
                    small
                    onClick={() => handleReject(a.id)}
                  />
                </div>
              </div>
              </motion.div>
            ))}
          {pending.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle size={32} style={{ color: '#0D9488', margin: '0 auto 8px' }} />
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 10,
                  color: '#8B8070',
                }}
              >
                SIN PENDIENTES — COLA LIMPIA
              </div>
            </div>
          )}
          {pending.length > 0 && <PaginationBar page={safePage} totalPages={totalPages} totalItems={pending.length} onPageChange={setPage} />}
        </div>
      </Card>}

      {mode === 'history' && resolved.length > 0 && (
        <Card>
          <SectionHeader title="PROCESADAS RECIENTEMENTE" />
          <div className="admin-stack-sm">
            {pagedActive.map(a => (
              <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-sm"
                style={{ background: "#0B1118", border: "1px solid #2A3444" }}>
                <div className="flex items-center gap-2">
                  {a.status === "approved" ? <CheckCircle size={12} style={{ color: "#0D9488" }} /> : <XCircle size={12} style={{ color: "#DC2626" }} />}
                  <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#EEF3FB" }}>{a.name}</span>
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#B8C7DB" }}>{a.profession}</span>
                </div>
                <Badge
                  label={a.status === 'approved' ? 'APROBADO' : 'RECHAZADO'}
                  color={a.status === 'approved' ? '#0D9488' : '#DC2626'}
                />
              </div>
            ))}
            {resolved.length > 0 && <PaginationBar page={safePage} totalPages={totalPages} totalItems={resolved.length} onPageChange={setPage} />}
          </div>
        </Card>
      )}

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="REPORTE DETALLADO — IA">
        {selected && (
          <div className="admin-stack-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-sm flex items-center justify-center" style={{ background: "#121B26", border: "1px solid #2A3444" }}>
                <User size={24} style={{ color: "#7FB8FF" }} />
              </div>
              <div>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: "#EEF3FB" }}>{selected.name}</div>
                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#B8C7DB" }}>{selected.profession}</div>
              </div>
            </div>
            <div className="p-3 rounded-sm" style={{ background: "#0B1118", border: "1px solid #2A3444" }}>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#7FB8FF", marginBottom: 4 }}>EVALUACIÓN IA</div>
              <div className="flex items-end gap-2 mb-2">
                <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 36, fontWeight: 900, color: scoreColor(selected.score) }}>{selected.score}</span>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#B8C7DB", marginBottom: 6 }}>/100</span>
              </div>
              <div className="admin-bar h-2 rounded-sm overflow-hidden" style={{ background: "#2A3444" }}>
                <div className="admin-bar-fill" style={{ width: `${selected.score}%`, height: "100%", background: scoreColor(selected.score) }} />
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: UI_COLORS.textFaint, marginBottom: 6 }}>RAZÓN DE LLEGADA</div>
              <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#EEF3FB" }}>{selected.reason}</p>
            </div>
            {selected.skills.length > 0 && (
              <div>
                <div
                  style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: 10,
                    color: UI_COLORS.textFaint,
                    marginBottom: 6,
                  }}
                >
                  HABILIDADES VERIFICADAS
                </div>
                <div className="flex gap-1 flex-wrap">
                  {selected.skills.map(s => <Badge key={s} label={s} color="#7FB8FF" />)}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <SecuredActionBtn allowed={canReview} reason="Requiere permiso de revisión de admisiones" label="APROBAR ADMISIÓN" color="#0D9488" onClick={() => confirmAction("¿Aprobar esta admisión?", () => handleApprove(selected.id))} />
              <SecuredActionBtn allowed={canReview} reason="Requiere permiso de revisión de admisiones" label="RECHAZAR" color="#DC2626" onClick={() => confirmAction("¿Rechazar esta admisión?", () => handleReject(selected.id))} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function ViewInventario({ mode, canAdjust, campId }: { mode: InventoryViewMode; canAdjust: boolean; campId?: number }) {
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [movements, setMovements] = useState<InventoryMovement[]>(INITIAL_MOVEMENTS);
  const [invAlerts, setInvAlerts] = useState<InventoryAlert[]>(INITIAL_INV_ALERTS);
  const [resourceTypes, setResourceTypes] = useState<BackendResourceType[]>([]);
  const [maxByResourceType, setMaxByResourceType] = useState<Record<number, number>>({});
  const [collections, setCollections] = useState<DailyCollection[]>(INITIAL_COLLECTIONS);
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("inv_q") ?? "");
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [editUnits, setEditUnits] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({ name: "", category: "Esencial", units: 0, max: 100 });
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<HttpCode | null>(null);
  const [page, setPage] = useState(() => Number(new URLSearchParams(window.location.search).get("inv_page") ?? "1") || 1);
  const limit = Number(new URLSearchParams(window.location.search).get("inv_limit") ?? "7") || 7;
  const activeCampId = campId ?? 1;

  const showToast = (msg: string, color: string) => {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 2500)
  }

  const computeStatus = (pct: number): InventoryItem['status'] => {
    if (pct < 20) return 'CRÍTICO'
    if (pct < 40) return 'BAJO'
    if (pct < 70) return 'NORMAL'
    return 'OK'
  }

  const loadInventory = async () => {
    setIsLoading(true);
    setErrorCode(null);

    try {
      const [resourceTypesData, dashboardPayload] = await Promise.all([
        fetchResourceTypesApi(),
        getInventoryDashboard(),
      ]);

      const inventoryEntryResults = await Promise.allSettled(
        resourceTypesData.map((resourceType) => getCampInventoryEntry(activeCampId, resourceType.id)),
      );

      const campResourcesFromInventory = inventoryEntryResults
        .filter((result): result is PromiseFulfilledResult<{ campId: number; resourceTypeId: number; quantity: number; updatedAt?: string }> => result.status === "fulfilled")
        .map((result) => result.value)
        .filter((entry) => entry.campId === activeCampId);

      const campResourcesFromDashboard = extractCampInventoryEntries(dashboardPayload, activeCampId)
        .filter((entry) => entry.campId === activeCampId);

      const campResources = campResourcesFromInventory.length > 0
        ? campResourcesFromInventory
        : campResourcesFromDashboard;
      const movementsFromApi = extractInventoryMovements(dashboardPayload);
      const alertsFromApi = extractInventoryAlerts(dashboardPayload);
      const collectionsFromApi = extractDailyCollections(dashboardPayload);

      const maxLookup: Record<number, number> = {};
      const mappedItems = campResources.map((entry) => {
        const type = resourceTypesData.find((resourceType) => resourceType.id === entry.resourceTypeId);
        const max = Math.max(entry.quantity, 100);
        const pct = max > 0 ? Math.min(100, Math.round((entry.quantity / max) * 100)) : 0;
        maxLookup[entry.resourceTypeId] = max;

        return {
          id: entry.resourceTypeId,
          name: type?.name ?? `Recurso #${entry.resourceTypeId}`,
          category: type ? INVENTORY_CATEGORY_MAP[type.category] : "Esencial",
          pct,
          units: entry.quantity,
          max,
          status: computeStatus(pct),
        } as InventoryItem;
      });

      setResourceTypes(resourceTypesData);
      setMaxByResourceType(maxLookup);
      setItems(mappedItems);
      if (movementsFromApi.length > 0) setMovements(movementsFromApi);
      if (alertsFromApi.length > 0) {
        setInvAlerts(alertsFromApi);
      } else {
        setInvAlerts(
          mappedItems
            .filter((item) => item.pct < 40)
            .map((item) => ({
              id: item.id,
              resource: item.name,
              severity: item.pct < 20 ? "CRÍTICA" : "MEDIA",
              status: "ACTIVA",
              threshold: item.pct < 20 ? 20 : 40,
            } as InventoryAlert)),
        );
      }
      if (collectionsFromApi.length > 0) setCollections(collectionsFromApi);
    } catch (error) {
      setErrorCode(toHttpCode(error));
      console.error("Error loading inventory:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = () => {
    if (!editing) return;
    const max = maxByResourceType[editing.id] ?? editing.max;
    const pct = max > 0 ? Math.round((editUnits / max) * 100) : 0;

    setIsLoading(true);
    setErrorCode(null);

    upsertCampInventory({ campId: activeCampId, resourceTypeId: editing.id, quantity: editUnits })
      .then(() => loadInventory())
      .then(() => {
        setEditing(null);
        showToast("INVENTARIO ACTUALIZADO", "#0D9488");
      })
      .catch((error) => {
        setErrorCode(toHttpCode(error));
        showToast(error instanceof Error ? error.message : "No se pudo actualizar el inventario", "#DC2626");
      })
      .finally(() => {
        setItems((prev) => prev.map((item) => item.id === editing.id ? { ...item, units: editUnits, pct, status: computeStatus(pct) } : item));
        setIsLoading(false);
      });
  };

  const handleDelete = (id: number) => {
    setIsLoading(true);
    setErrorCode(null);

    deleteCampInventory(activeCampId, id)
      .then(() => loadInventory())
      .then(() => {
        showToast("ÍTEM ELIMINADO", "#DC2626");
      })
      .catch((error) => {
        setErrorCode(toHttpCode(error));
        showToast(error instanceof Error ? error.message : "No se pudo eliminar el recurso", "#DC2626");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleAdd = () => {
    if (!newItem.name || newItem.units === undefined || newItem.units === null) return;

    const resourceType = resourceTypes.find((type) => type.name.toLowerCase() === String(newItem.name).trim().toLowerCase());
    if (!resourceType) {
      showToast("El recurso debe existir en el catálogo", "#DC2626");
      return;
    }

    const quantity = Number(newItem.units) || 0;
    setIsLoading(true);
    setErrorCode(null);

    upsertCampInventory({ campId: activeCampId, resourceTypeId: resourceType.id, quantity })
      .then(() => loadInventory())
      .then(() => {
        setNewItem({ name: "", category: "Esencial", units: 0, max: 100 });
        setShowAdd(false);
        showToast("ÍTEM AGREGADO", "#0D9488");
      })
      .catch((error) => {
        setErrorCode(toHttpCode(error));
        showToast(error instanceof Error ? error.message : "No se pudo agregar el recurso", "#DC2626");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()));
  const categories = [...new Set(items.map(i => i.category))];
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const safePage = Math.min(page, totalPages);
  const pagedFiltered = filtered.slice((safePage - 1) * limit, safePage * limit);

  useEffect(() => {
    setPage(1);
  }, [search, mode, items.length]);

  useEffect(() => {
    void loadInventory();
  }, [activeCampId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("inv_q", search);
    params.set("inv_mode", mode);
    params.set("inv_page", String(safePage));
    params.set("inv_limit", String(limit));
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  }, [search, mode, safePage, limit]);

  return (
    <div className="admin-stack-lg">
      <ModuleContext module="INVENTARIO" />
      {isLoading && <EmptyState title="CARGANDO INVENTARIO" hint="Consultando stock del campamento" icon={Package} />}
      {errorCode && <HttpStatusNotice code={errorCode} />}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-16 right-4 z-50 px-4 py-2 rounded-sm"
            style={{ background: toast.color, fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#EEF3FB" }}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {mode === "summary" && <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
        {categories.map(cat => {
          const catItems = items.filter(i => i.category === cat);
          const avgPct = Math.round(catItems.reduce((a, b) => a + b.pct, 0) / catItems.length);
          return (
            <Card key={cat}>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 900, color: invBarColor(avgPct) }}>{avgPct}%</div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#B8C7DB" }}>{cat.toUpperCase()}</div>
              <div className="admin-bar h-1 rounded-sm overflow-hidden mt-1" style={{ background: "#2A3444" }}>
                <div className="admin-bar-fill" style={{ width: `${avgPct}%`, height: "100%", background: invBarColor(avgPct) }} />
              </div>
            </Card>
          );
        })}
      </div>}

      {(mode === "items" || mode === "summary") && <Card>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <SectionHeader title="BODEGA COMPLETA" accent={false} />
          <div className="flex-1" />
          <SearchBar value={search} onChange={setSearch} placeholder="BUSCAR RECURSO..." />
          <ActionBtn label="VER MOVIMIENTOS" color="#B8C7DB" onClick={() => { }} />
          <ActionBtn label="VER ALERTAS" color="#B8C7DB" onClick={() => { }} />
          <SecuredActionBtn allowed={canAdjust} reason="Requiere permiso de gestión de inventario" label="+ AGREGAR ÍTEM" color="#0D9488" onClick={() => setShowAdd(true)} />
        </div>
        <div style={{ height: 1, background: "linear-gradient(90deg, #7FB8FF 0%, transparent 100%)", marginBottom: 12 }} />

        <div className="admin-stack-sm">
          {pagedFiltered.map(item => {
            const isEditing = editing?.id === item.id;
            const bcolor = invBarColor(item.pct);
            return (
              <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-3 rounded-sm" style={{ background: "#0B1118", border: `1px solid ${item.status === "CRÍTICO" ? "#DC262644" : "#2A3444"}` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, fontWeight: 600, color: "#EEF3FB" }}>{item.name}</span>
                    <Badge label={item.category} color="#B8C7DB" />
                    <Badge label={item.status} color={statusColor(item.status)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 16, fontWeight: 900, color: bcolor }}>{item.pct}%</span>
                    <button onClick={() => { setEditing(item); setEditUnits(item.units); }} className="admin-icon-btn"><Edit2 size={11} style={{ color: "#7FB8FF" }} /></button>
                    <button onClick={() => confirmAction("¿Eliminar este ítem de inventario?", () => handleDelete(item.id))} className="admin-icon-btn"><Trash2 size={11} style={{ color: "#DC2626" }} /></button>
                  </div>
                </div>
                {isEditing ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#B8C7DB" }}>UNIDADES:</span>
                    <input
                      type="number"
                      value={editUnits}
                      onChange={e => setEditUnits(Number(e.target.value))}
                      className="px-2 py-1 rounded-sm outline-none w-24"
                      style={{ background: "#121B26", border: "1px solid #7FB8FF", fontFamily: "'Orbitron', monospace", fontSize: 11, color: "#EEF3FB" }}
                    />
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: UI_COLORS.textFaint }}>/ {item.max} max</span>
                    <SecuredActionBtn allowed={canAdjust} reason="Requiere permiso de gestión de inventario" label="GUARDAR" color="#0D9488" small onClick={handleSaveEdit} />
                    <ActionBtn label="CANCELAR" color="#B8C7DB" small onClick={() => setEditing(null)} />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="admin-bar flex-1 h-2 rounded-sm overflow-hidden" style={{ background: "#2A3444" }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${item.pct}%` }} transition={MOTION.progress}
                        className={`admin-bar-fill ${item.status === "CRÍTICO" ? "animate-pulse" : ""}`}
                        style={{ height: "100%", background: bcolor, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#B8C7DB", whiteSpace: "nowrap" }}>
                      {item.units} / {item.max} unidades
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
        {filtered.length === 0 && <EmptyState title="SIN RECURSOS" hint="No hay coincidencias para el filtro actual" icon={Package} />}
        {filtered.length > 0 && <PaginationBar page={safePage} totalPages={totalPages} totalItems={filtered.length} onPageChange={setPage} />}
      </Card>}

      {mode === "movements" && (
        <Card>
          <SectionHeader title="MOVIMIENTOS DE INVENTARIO" />
          <div className="admin-stack-sm">
            {movements.map(m => (
              <div key={m.id} className="p-3 rounded-sm" style={{ background: UI_COLORS.panelAlt, border: `1px solid ${UI_COLORS.border}` }}>
                <div className="flex items-center justify-between mb-1">
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: UI_COLORS.textPrimary }}>{m.resource}</span>
                  <Badge label={m.type} color={m.type === "INGRESO" ? UI_COLORS.state.info : m.type === "EGRESO" ? UI_COLORS.state.critical : UI_COLORS.state.warning} />
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: UI_COLORS.textMuted }}>{m.reason}</span>
                  <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, color: UI_COLORS.textPrimary }}>{m.amount} u.</span>
                </div>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: UI_COLORS.textFaint }}>{m.date}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {mode === "alerts" && (
        <Card glow={UI_COLORS.state.warning}>
          <SectionHeader title="ALERTAS DE INVENTARIO" />
          <div className="admin-stack-sm">
            {invAlerts.map(a => (
              <div key={a.id} className="p-3 rounded-sm" style={{ background: UI_COLORS.panelAlt, border: `1px solid ${(a.severity === "CRÍTICA" ? UI_COLORS.state.critical : UI_COLORS.state.warning)}66` }}>
                <div className="flex items-center justify-between mb-1">
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: UI_COLORS.textPrimary }}>{a.resource}</span>
                  <div className="flex items-center gap-1">
                    <Badge label={a.severity} color={a.severity === "CRÍTICA" ? UI_COLORS.state.critical : UI_COLORS.state.warning} />
                    <Badge label={a.status} color={a.status === "ACTIVA" ? UI_COLORS.state.critical : UI_COLORS.state.info} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: UI_COLORS.textMuted }}>Umbral mínimo: {a.threshold}%</span>
                  {a.status === "ACTIVA" && (
                    <SecuredActionBtn
                      allowed={canAdjust}
                      reason="Requiere permiso de gestión de inventario"
                      label="MARCAR ATENDIDA"
                      color={UI_COLORS.state.info}
                      small
                      onClick={() => setInvAlerts(prev => prev.map(x => x.id === a.id ? { ...x, status: "ATENDIDA" } : x))}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {mode === "collection" && (
        <Card>
          <SectionHeader title="RECOLECCIÓN DIARIA" />
          <div className="admin-stack-sm">
            {collections.map(c => (
              <div key={c.id} className="p-3 rounded-sm" style={{ background: UI_COLORS.panelAlt, border: `1px solid ${UI_COLORS.border}` }}>
                <div className="flex items-center justify-between mb-1">
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: UI_COLORS.textPrimary }}>{c.resource}</span>
                  <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, color: UI_COLORS.state.info }}>+{c.amountCollected}</span>
                </div>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: UI_COLORS.textMuted }}>{c.notes}</div>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: UI_COLORS.textFaint }}>{c.date}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add item modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="AGREGAR ÍTEM AL INVENTARIO">
        <div className="admin-stack-md">
          <div>
            <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#B8C7DB" }}>NOMBRE DEL RECURSO</label>
            <select
              value={newItem.name ?? ""}
              onChange={e => {
                const selectedResource = resourceTypes.find((resourceType) => resourceType.name === e.target.value);
                setNewItem(prev => ({
                  ...prev,
                  name: e.target.value,
                  category: selectedResource ? INVENTORY_CATEGORY_MAP[selectedResource.category] : prev.category,
                }));
              }}
              className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
              style={{ background: "#0B1118", border: "1px solid #2A3444", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#EEF3FB" }}
            >
              <option value="">Seleccione un recurso...</option>
              {resourceTypes.map((resourceType) => (
                <option key={resourceType.id} value={resourceType.name}>
                  {resourceType.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#B8C7DB" }}>CATEGORÍA</label>
            <select value={newItem.category ?? "Esencial"} onChange={e => setNewItem(prev => ({ ...prev, category: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
              style={{ background: "#0B1118", border: "1px solid #2A3444", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#EEF3FB" }}>
              {["Esencial", "Médico", "Defensa", "Energía", "Bienestar", "Agricultura"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'UNIDADES ACTUALES', key: 'units' },
              { label: 'CAPACIDAD MÁXIMA', key: 'max' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#B8C7DB" }}>{label}</label>
                <input type="number" value={(newItem as any)[key] ?? 0} onChange={e => setNewItem(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                  className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
                  style={{ background: "#0B1118", border: "1px solid #2A3444", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#EEF3FB" }} />
              </div>
            ))}
          </div>
          <SecuredActionBtn allowed={canAdjust} reason="Requiere permiso de gestión de inventario" label="AGREGAR AL INVENTARIO" color="#0D9488" onClick={handleAdd} />
        </div>
      </Modal>
    </div>
  )
}

function ViewExpediciones({ mode, canForce }: { mode: ExpeditionsViewMode; canForce: boolean }) {
  const [expeditions, setExpeditions] = useState<Expedition[]>(INITIAL_EXPEDITIONS);
  const [consumedEntries, setConsumedEntries] = useState<ExpeditionResourceEntry[]>(INITIAL_EXP_CONSUMED);
  const [gainedEntries, setGainedEntries] = useState<ExpeditionResourceEntry[]>(INITIAL_EXP_GAINED);
  const [, setSelected] = useState<Expedition | null>(null);
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<HttpCode | null>(null);

  const loadExpeditions = async () => {
    setIsLoading(true);
    setErrorCode(null);

    try {
      const records = await listActiveExpeditions();
      if (records.length > 0) {
        setExpeditions(records.map(mapExpeditionFromApi));
      }
    } catch (error) {
      setErrorCode(toHttpCode(error));
      console.error("Error loading expeditions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (msg: string, color: string) => {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 2500)
  }

  const handleAdvanceDay = (id: number) => {
    setExpeditions((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e
        const newDay = e.day + 1
        const newStatus = newDay >= e.total ? 'REGRESANDO' : e.status
        return { ...e, day: newDay, status: newStatus }
      }),
    )
  }

  const handleComplete = (id: number) => {
    setIsLoading(true);
    setErrorCode(null);

    completeExpedition(id)
      .then(() => {
        setExpeditions(prev => prev.map(e => e.id === id ? { ...e, status: "COMPLETADA" } : e));
        setSelected(null);
        showToast("EXPEDICIÓN MARCADA COMO COMPLETADA", "#0D9488");
      })
      .catch((error) => {
        setErrorCode(toHttpCode(error));
        showToast(error instanceof Error ? error.message : "No se pudo completar la expedición", "#DC2626");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleForceStatus = (id: number, status: Expedition["status"]) => {
    setExpeditions(prev => prev.map(e => e.id === id ? { ...e, status } : e));
    showToast(`ESTADO FORZADO: ${status}`, "#7FB8FF");
  };

  const active = expeditions.filter((e) => e.status === 'EN CURSO' || e.status === 'REGRESANDO')
  const scheduled = expeditions.filter((e) => e.status === 'PROGRAMADA')
  const completed = expeditions.filter((e) => e.status === 'COMPLETADA')

  useEffect(() => {
    void loadExpeditions();
  }, []);

  return (
    <div className="admin-stack-lg">
      <ModuleContext module="EXPEDICIONES" />
      {isLoading && <EmptyState title="CARGANDO EXPEDICIONES" hint="Actualizando tablero operativo" icon={Map} />}
      {errorCode && <HttpStatusNotice code={errorCode} />}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-16 right-4 z-50 px-4 py-2 rounded-sm"
            style={{ background: toast.color, fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#EEF3FB" }}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "EN CURSO", value: active.length, color: "#4AAED2" },
          { label: "PROGRAMADAS", value: scheduled.length, color: "#0D9488" },
          { label: "COMPLETADAS", value: completed.length, color: "#4B5563" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <div className="admin-kpi-value" style={{ fontFamily: "'Orbitron', monospace", fontWeight: 900, color }}>{value}</div>
            <div className="admin-text-label" style={{ fontFamily: "'Rajdhani', sans-serif", color: "#B8C7DB", letterSpacing: "0.1em" }}>{label}</div>
          </Card>
        ))}
      </div>

      {/* Expedition list */}
      {(["active", "planning", "history"] as ExpeditionsViewMode[]).includes(mode) && (
        <div className="admin-stack-md">
          {(mode === "active" ? expeditions.filter(e => e.status !== "COMPLETADA") : mode === "history" ? expeditions.filter(e => e.status === "COMPLETADA") : expeditions).map(exp => {
            const pct = exp.total > 0 ? Math.round((exp.day / exp.total) * 100) : 0;
            const sc = expColor(exp.status);
            return (
              <Card key={exp.id} className="cursor-pointer hover:opacity-90 transition-opacity" glow={exp.status === "EN CURSO" ? "#7FB8FF" : ""}>
                <div onClick={() => setSelected(exp)}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Map size={12} style={{ color: sc }} />
                        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#EEF3FB" }}>{exp.name}</span>
                      </div>
                      <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: "#B8C7DB" }}>{exp.sector}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge label={exp.status} color={sc} />
                      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: sc }}>DÍA {exp.day}/{exp.total}</span>
                    </div>
                  </div>
                  <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: "#B8C7DB", marginBottom: 8 }}>{exp.objective}</p>
                  {exp.total > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="admin-bar flex-1 h-1.5 rounded-sm overflow-hidden" style={{ background: "#2A3444" }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={MOTION.progress}
                          className="admin-bar-fill" style={{ height: "100%", background: sc, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: UI_COLORS.textFaint }}>{pct}%</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    {exp.participants.slice(0, 6).map((p, i) => (
                      <div key={i} className="w-6 h-6 rounded-sm flex items-center justify-center flex-shrink-0"
                        style={{ background: "#121B26", border: "1px solid #2A3444", fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#B8C7DB" }}>
                        {p}
                      </div>
                    ))}
                    {exp.participants.length > 6 && (
                      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: UI_COLORS.textFaint }}>+{exp.participants.length - 6}</span>
                    )}
                  </div>
                </div>
                {exp.status !== "COMPLETADA" && (
                  <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: "1px solid #2A3444" }}>
                    <ActionBtn label="+ AVANZAR DÍA" color="#7FB8FF" small onClick={() => handleAdvanceDay(exp.id)} />
                    <ActionBtn label="MARCAR COMPLETADA" color="#0D9488" small onClick={() => confirmAction("¿Marcar esta expedición como completada?", () => handleComplete(exp.id))} />
                    <SecuredActionBtn allowed={canForce} reason="Requiere permiso de control de expediciones" label="FORZAR EN CURSO" color="#B8C7DB" small onClick={() => confirmAction("¿Forzar estado EN CURSO?", () => handleForceStatus(exp.id, "EN CURSO"))} />
                    <SecuredActionBtn allowed={canForce} reason="Requiere permiso de control de expediciones" label="FORZAR REGRESO" color="#B8C7DB" small onClick={() => confirmAction("¿Forzar estado REGRESANDO?", () => handleForceStatus(exp.id, "REGRESANDO"))} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {mode === "consumed" && (
        <Card>
          <SectionHeader title="RECURSOS CONSUMIDOS EN EXPEDICIÓN" />
          <div className="admin-stack-sm">
            {consumedEntries.map(r => (
              <div key={r.id} className="p-3 rounded-sm" style={{ background: UI_COLORS.panelAlt, border: `1px solid ${UI_COLORS.border}` }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: UI_COLORS.textPrimary }}>{r.resource}</span>
                  <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, color: UI_COLORS.state.warning }}>-{r.amount}</span>
                </div>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: UI_COLORS.textMuted }}>{r.notes}</div>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: UI_COLORS.textFaint }}>{r.date}</span>
              </div>
            ))}
            <SecuredActionBtn
              allowed={canForce}
              reason="Requiere permiso de control de expediciones"
              label="REGISTRAR CONSUMO (UI)"
              color={UI_COLORS.state.warning}
              onClick={() => setConsumedEntries(prev => [{ id: Date.now(), expeditionId: 1, resource: "Raciones", amount: 8, date: "D-47 16:00", notes: "Ajuste manual" }, ...prev])}
            />
          </div>
        </Card>
      )}

      {mode === "gained" && (
        <Card>
          <SectionHeader title="RECURSOS OBTENIDOS EN EXPEDICIÓN" />
          <div className="admin-stack-sm">
            {gainedEntries.map(r => (
              <div key={r.id} className="p-3 rounded-sm" style={{ background: UI_COLORS.panelAlt, border: `1px solid ${UI_COLORS.border}` }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: UI_COLORS.textPrimary }}>{r.resource}</span>
                  <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, color: UI_COLORS.state.info }}>+{r.amount}</span>
                </div>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: UI_COLORS.textMuted }}>{r.notes}</div>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: UI_COLORS.textFaint }}>{r.date}</span>
              </div>
            ))}
            <SecuredActionBtn
              allowed={canForce}
              reason="Requiere permiso de control de expediciones"
              label="REGISTRAR RECURSO OBTENIDO (UI)"
              color={UI_COLORS.state.info}
              onClick={() => setGainedEntries(prev => [{ id: Date.now(), expeditionId: 1, resource: "Agua", amount: 20, date: "D-47 16:10", notes: "Registro manual" }, ...prev])}
            />
          </div>
        </Card>
      )}

    </div>
  )
}

function ViewIntercamp({ mode, canApprove }: { mode: IntercampViewMode; canApprove: boolean }) {
  const [requests, setRequests] = useState<IntercampRequest[]>(INITIAL_INTERCAMP);
  const [lookupId, setLookupId] = useState("");
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<HttpCode | null>(null);
  const [page, setPage] = useState(() => Number(new URLSearchParams(window.location.search).get("ic_page") ?? "1") || 1);
  const limit = Number(new URLSearchParams(window.location.search).get("ic_limit") ?? "6") || 6;

  const showToast = (msg: string, color: string) => {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 2500)
  }

  const handleApprove = (id: number) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'APROBADO' } : r)))
    showToast('SOLICITUD APROBADA', '#0D9488')
  }

  const handleReject = (id: number) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'RECHAZADO' } : r)))
    showToast('SOLICITUD RECHAZADA', '#DC2626')
  }

  const mergeRequest = (incoming: IntercampRequest) => {
    setRequests((prev) => {
      const filtered = prev.filter((request) => request.id !== incoming.id);
      return [incoming, ...filtered];
    });
  };

  const handleLookup = () => {
    const id = Number(lookupId);
    if (!Number.isFinite(id) || id <= 0) {
      showToast("Ingresa un ID válido", "#DC2626");
      return;
    }

    setIsLoading(true);
    setErrorCode(null);

    const tryLoad = async () => {
      const loaders = [
        () => getIntercampRequestById(id),
        () => getTransferById(id),
        () => getTransferHistoryById(id),
        () => getTransferPersonById(id),
        () => getDeliveredTransferResourceById(id),
      ];

      for (const load of loaders) {
        try {
          return await load();
        } catch {
          // keep trying remaining endpoints
        }
      }

      throw new Error("No se encontró registro inter-camp para ese ID");
    };

    tryLoad()
      .then((record) => {
        mergeRequest(mapIntercampFromApi(record));
        showToast(`Registro #${id} sincronizado`, "#0D9488");
      })
      .catch((error) => {
        setErrorCode(toHttpCode(error));
        showToast(error instanceof Error ? error.message : "No se pudo consultar el ID", "#DC2626");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const pending = requests.filter(r => r.status === "PENDIENTE");
  const others = requests.filter(r => r.status !== "PENDIENTE");
  const activeList = mode === "pending" ? pending : others;
  const totalPages = Math.max(1, Math.ceil(activeList.length / limit));
  const safePage = Math.min(page, totalPages);
  const pagedActive = activeList.slice((safePage - 1) * limit, safePage * limit);

  const campsList = [
    'CAMPAMENTO BETA',
    'CAMPAMENTO GAMMA',
    'CAMPAMENTO DELTA',
    'CAMPAMENTO ÉPSILON',
  ]

  useEffect(() => {
    setPage(1);
  }, [mode, requests.length]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("ic_mode", mode);
    params.set("ic_page", String(safePage));
    params.set("ic_limit", String(limit));
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  }, [mode, safePage, limit]);

  return (
    <div className="admin-stack-lg">
      <ModuleContext module="INTER-CAMPAMENTOS" />
      {isLoading && <EmptyState title="CARGANDO INTER-CAMP" hint="Sincronizando solicitudes y transferencias" icon={Radio} />}
      {errorCode && <HttpStatusNotice code={errorCode} />}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-16 right-4 z-50 px-4 py-2 rounded-sm"
            style={{ background: toast.color, fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#EEF3FB" }}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "PENDIENTES", value: pending.length, color: "#4AAED2" },
          { label: "APROBADAS", value: requests.filter(r => r.status === "APROBADO").length, color: "#0D9488" },
          { label: "CAMPAMENTOS", value: campsList.length, color: "#B8C7DB" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <div className="admin-kpi-value" style={{ fontFamily: "'Orbitron', monospace", fontWeight: 900, color }}>{value}</div>
            <div className="admin-text-label" style={{ fontFamily: "'Rajdhani', sans-serif", color: "#B8C7DB", letterSpacing: "0.1em" }}>{label}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: UI_COLORS.textFaint }}>CONSULTA RÁPIDA POR ID</span>
          <input
            value={lookupId}
            onChange={event => setLookupId(event.target.value)}
            placeholder="ID de solicitud/transferencia"
            className="px-3 py-2 rounded-sm outline-none"
            style={{ background: "#0B1118", border: "1px solid #2A3444", fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#EEF3FB", minWidth: 220 }}
          />
          <ActionBtn label="CARGAR ID" color="#7FB8FF" onClick={handleLookup} />
        </div>
      </Card>

      {mode === 'pending' && pending.length > 0 && (
        <Card glow="#EA580C">
          <SectionHeader title="SOLICITUDES PENDIENTES — ACCIÓN REQUERIDA" />
          <div className="admin-stack-sm">
            {pagedActive.map(req => (
              <motion.div key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-3 rounded-sm" style={{ background: "#0B1118", border: `1px solid ${req.urgent ? "#DC262655" : "#2A3444"}` }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Radio size={11} style={{ color: '#EA580C' }} />
                      <span
                        style={{
                          fontFamily: "'Share Tech Mono', monospace",
                          fontSize: 9,
                          color: '#EA580C',
                        }}
                      >
                        {req.from}
                      </span>
                      {req.urgent && <Badge label="URGENTE" color="#DC2626" />}
                    </div>
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#EEF3FB" }}>{req.text}</span>
                  </div>
                  <span
                    style={{
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: 9,
                      color: UI_COLORS.textFaint,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {req.time}
                  </span>
                </div>
                <div className="flex gap-2">
                  <SecuredActionBtn allowed={canApprove} reason="Requiere permiso de aprobación inter-campamento" label="APROBAR" color="#0D9488" small onClick={() => confirmAction("¿Aprobar esta solicitud inter-campamento?", () => handleApprove(req.id))} />
                  <SecuredActionBtn allowed={canApprove} reason="Requiere permiso de aprobación inter-campamento" label="RECHAZAR" color="#DC2626" small onClick={() => confirmAction("¿Rechazar esta solicitud inter-campamento?", () => handleReject(req.id))} />
                </div>
              </motion.div>
            ))}
            {pending.length > 0 && <PaginationBar page={safePage} totalPages={totalPages} totalItems={pending.length} onPageChange={setPage} />}
          </div>
        </Card>
      )}

      {mode === "pending" && pending.length === 0 && (
        <Card>
          <EmptyState title="SIN SOLICITUDES PENDIENTES" hint="No hay acciones urgentes en esta bandeja" icon={Radio} />
        </Card>
      )}

      {mode === "history" && <Card>
        <SectionHeader title="HISTORIAL DE COMUNICACIONES" />
        <div className="admin-stack-sm">
          {pagedActive.map(req => {
            const sc = intercampColor(req.status);
            return (
              <div key={req.id} className="p-3 rounded-sm" style={{ background: "#0B1118", border: "1px solid #2A3444" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Radio size={10} style={{ color: UI_COLORS.textFaint }} />
                      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#B8C7DB" }}>{req.from}</span>
                      <Badge label={req.type.toUpperCase()} color={UI_COLORS.textFaint} />
                    </div>
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: "#EEF3FB" }}>{req.text}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge label={req.status} color={sc} />
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: UI_COLORS.textFaint }}>{req.time}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {others.length > 0 && <PaginationBar page={safePage} totalPages={totalPages} totalItems={others.length} onPageChange={setPage} />}
          {others.length === 0 && <EmptyState title="SIN HISTORIAL" hint="No hay comunicaciones registradas" icon={Radio} />}
        </div>
      </Card>}
    </div>
  )
}

function ViewSeguridad({ mode }: { mode: SecurityViewMode }) {
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [filterLevel, setFilterLevel] = useState("todos");
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lookupSource, setLookupSource] = useState("inventory");
  const [lookupId, setLookupId] = useState("");
  const [isLoadingLookup, setIsLoadingLookup] = useState(false);

  const loadAuditRecordBySource = async (source: string, id: number): Promise<AuditRecord> => {
    if (source === "inventory") return getInventoryMovementById(id);
    if (source === "notification") return getNotificationById(id);
    if (source === "person-status") return getPersonStatusHistoryById(id);
    return getUserRoleHistoryById(id);
  };

  const handleLookupLog = () => {
    const id = Number(lookupId);
    if (!Number.isFinite(id) || id <= 0) {
      return;
    }

    setIsLoadingLookup(true);
    loadAuditRecordBySource(lookupSource, id)
      .then((record) => {
        const label = lookupSource === "inventory"
          ? "INVENTORY_MOVEMENT"
          : lookupSource === "notification"
            ? "NOTIFICATION"
            : lookupSource === "person-status"
              ? "PERSON_STATUS"
              : "USER_ROLE";

        setLogs((prev) => [summarizeAuditRecord(label, record), ...prev]);
      })
      .catch((error) => {
        const now = new Date().toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
        const message = error instanceof Error ? error.message : "Error consultando registro";

        setLogs((prev) => [{
          id: Date.now(),
          time: now,
          level: "error",
          user: "SISTEMA",
          action: `LOOKUP FALLIDO #${id} (${lookupSource}) — ${message}`,
        }, ...prev]);
      })
      .finally(() => {
        setIsLoadingLookup(false);
      });
  };

  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(() => {
      const now = new Date().toLocaleTimeString('es-CR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
      const systemEvents = [
        'HEARTBEAT — Servidor activo',
        'SESION_CHECK — Sin anomalías',
        'PERIMETRO_OK — Sensores normales',
      ]
      const newLog: LogEntry = {
        id: Date.now(),
        time: now,
        level: 'system',
        user: 'SISTEMA',
        action: systemEvents[Math.floor(Math.random() * systemEvents.length)],
      }
      setLogs((prev) => [newLog, ...prev.slice(0, 24)])
    }, 8000)
    return () => clearInterval(t)
  }, [autoRefresh])

  const levels = ['todos', 'info', 'warn', 'error', 'system']
  const baseFiltered = logs.filter((l) => {
    const matchLevel = filterLevel === 'todos' || l.level === filterLevel
    const matchSearch =
      l.user.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase())
    return matchLevel && matchSearch
  })
  const filtered = baseFiltered.filter((l) => {
    if (mode === 'errors') return l.level === 'error' || l.level === 'warn'
    if (mode === 'system') return l.level === 'system'
    return true
  })

  const counts = {
    error: logs.filter((l) => l.level === 'error').length,
    warn: logs.filter((l) => l.level === 'warn').length,
    info: logs.filter((l) => l.level === 'info').length,
    system: logs.filter((l) => l.level === 'system').length,
  }

  return (
    <div className="admin-stack-lg">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(counts).map(([k, v]) => (
          <Card key={k}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 24, fontWeight: 900, color: logLevelColor(k) }}>{v}</div>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#B8C7DB" }}>{k.toUpperCase()}</div>
          </Card>
        ))}
      </div>

      <Card className="notifs-shell">
        <div className="notifs-toolbar flex items-center gap-3 mb-3 flex-wrap">
          <SectionHeader title={mode === "errors" ? "ALERTAS Y ERRORES" : mode === "system" ? "EVENTOS DEL SISTEMA" : "REGISTRO DE ACCESO Y ACTIVIDAD"} accent={false} />
          <div className="flex-1" />
          <SearchBar value={search} onChange={setSearch} placeholder="BUSCAR EN LOGS..." />
          <div className="notifs-filters flex gap-1">
            {levels.map(l => (
              <button key={l} onClick={() => setFilterLevel(l)}
                className="admin-chip-btn px-2 py-1 rounded-sm cursor-pointer"
                style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, background: filterLevel === l ? logLevelColor(l) : "#121B26", color: filterLevel === l ? "#05070A" : "#B8C7DB", border: "1px solid #2A3444" }}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: UI_COLORS.textFaint }}>AUTO-REFRESH</span>
            <Toggle active={autoRefresh} onChange={() => setAutoRefresh(prev => !prev)} />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={lookupSource}
              onChange={event => setLookupSource(event.target.value)}
              className="px-2 py-1 rounded-sm outline-none"
              style={{ background: "#0B1118", border: "1px solid #2A3444", fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#B8C7DB" }}
            >
              <option value="inventory">Inventory Movement</option>
              <option value="notification">Notification</option>
              <option value="person-status">Person Status</option>
              <option value="user-role">User Role</option>
            </select>
            <input
              value={lookupId}
              onChange={event => setLookupId(event.target.value)}
              placeholder="ID"
              className="px-2 py-1 rounded-sm outline-none"
              style={{ width: 80, background: "#0B1118", border: "1px solid #2A3444", fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#EEF3FB" }}
            />
            <ActionBtn label={isLoadingLookup ? "CARGANDO..." : "LOOKUP"} color="#7FB8FF" small onClick={handleLookupLog} />
          </div>
        </div>
        <div className="notifs-divider" style={{ height: 1, background: "linear-gradient(90deg, #7FB8FF 0%, transparent 100%)", marginBottom: 12 }} />

        {autoRefresh && (
          <div className="flex items-center gap-1.5 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            <span
              style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: '#0D9488' }}
            >
              MONITOREANDO EN TIEMPO REAL
            </span>
          </div>
        )}

        <div className="admin-stack-sm notifs-list">
          <AnimatePresence initial={false}>
            {filtered.map((log) => {
              const lc = logLevelColor(log.level)
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={MOTION.base}
                  className="flex items-start gap-3 px-3 py-2 rounded-sm"
                  style={{ background: "#0B1118", borderLeft: `2px solid ${lc}` }}
                >
                  <span
                    style={{
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: 9,
                      color: UI_COLORS.textFaint,
                      flexShrink: 0,
                      paddingTop: 2,
                    }}
                  >
                    [{log.time}]
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded-sm flex-shrink-0"
                    style={{
                      background: `${lc}22`,
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: 9,
                      color: lc,
                    }}
                  >
                    {log.level.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: "#EEF3FB" }}>{log.user}</span>
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#B8C7DB", marginLeft: 8 }}>— {log.action}</span>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
          {filtered.length === 0 && (
            <EmptyState
              title="SIN REGISTROS"
              hint="Ajusta los filtros o espera nuevos eventos"
              icon={Shield}
            />
          )}
        </div>
      </Card>
    </div>
  )
}

function ViewLogros({ mode }: { mode: LogrosViewMode }) {
  const achievements = [
    { name: "PRIMER MES", desc: "Sobrevivimos 30 días", unlocked: true, pct: 100, color: "#0D9488", xp: 500, category: "Supervivencia" },
    { name: "SIN BAJAS", desc: "7 días sin pérdidas de vida", unlocked: true, pct: 100, color: "#4AAED2", xp: 300, category: "Bienestar" },
    { name: "EQUIPO MÉDICO COMPLETO", desc: "5/5 médicos activos", unlocked: false, pct: 80, color: "#7FB8FF", xp: 400, category: "Salud" },
    { name: "100 EXPLORACIONES", desc: "67/100 completadas", unlocked: false, pct: 67, color: "#0D9488", xp: 600, category: "Exploración" },
    { name: "AUTOSUFICIENCIA", desc: "Produce el 50% de alimentos propios", unlocked: false, pct: 45, color: "#EA580C", xp: 800, category: "Agricultura" },
    { name: "FORTALEZA", desc: "Resistir 5 ataques sin bajas", unlocked: false, pct: 60, color: "#DC2626", xp: 700, category: "Defensa" },
    { name: "RED DE ALIANZAS", desc: "3 campamentos aliados", unlocked: false, pct: 33, color: "#B8C7DB", xp: 500, category: "Diplomacia" },
    { name: "INVENTARIO SEGURO", desc: "Todos los recursos sobre 50%", unlocked: false, pct: 15, color: "#4AAED2", xp: 400, category: "Logística" },
  ];

  const categories = [...new Set(achievements.map((a) => a.category))]
  const totalXP = achievements.filter((a) => a.unlocked).reduce((acc, a) => acc + a.xp, 0)
  const nextLevelXP = 3000

  return (
    <div className="admin-stack-lg">
      {mode === "overview" && (
        <Card glow="#7FB8FF">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: UI_COLORS.textFaint }}>NIVEL</div>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 48, fontWeight: 900, color: "#4AAED2", lineHeight: 1 }}>7</div>
              <Badge label="CONSOLIDADO" color="#7FB8FF" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between mb-2">
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#B8C7DB" }}>EXPERIENCIA TOTAL</span>
                <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, color: "#4AAED2" }}>{totalXP} / {nextLevelXP} XP</span>
              </div>
              <div className="admin-bar h-3 rounded-sm overflow-hidden mb-1" style={{ background: "#2A3444" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${(totalXP / nextLevelXP) * 100}%` }} transition={MOTION.progress}
                  className="admin-bar-fill" style={{ height: "100%", background: "linear-gradient(90deg, #7FB8FF, #4AAED2)", borderRadius: 2 }} />
              </div>
              <div className="grid grid-cols-4 gap-2 mt-3">
                {[
                  { label: "LOGROS", value: `${achievements.filter(a => a.unlocked).length}/${achievements.length}` },
                  { label: "DESBLOQUEADOS", value: achievements.filter(a => a.unlocked).length },
                  { label: "EN PROGRESO", value: achievements.filter(a => !a.unlocked).length },
                  { label: "PRÓXIMO NIVEL", value: `${nextLevelXP - totalXP} XP` },
                ].map(({ label, value }) => (
                  <div key={label} className="p-2 rounded-sm text-center" style={{ background: "#0B1118", border: "1px solid #2A3444" }}>
                    <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 13, fontWeight: 900, color: "#EEF3FB" }}>{value}</div>
                    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: UI_COLORS.textFaint }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Achievements by category */}
      {categories.map((cat) => (
        <div key={cat}>
          <div className="mb-2 flex items-center gap-2">
            <div style={{ height: 1, flex: 1, background: "#2A3444" }} />
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: UI_COLORS.textFaint }}>{cat.toUpperCase()}</span>
            <div style={{ height: 1, flex: 1, background: "#2A3444" }} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {achievements.filter(a => a.category === cat).map(ach => (
              <Card key={ach.name} glow={ach.unlocked ? ach.color : ""}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0"
                    style={{ background: ach.unlocked ? `${ach.color}22` : "#121B26", border: `1px solid ${ach.unlocked ? ach.color : "#2A3444"}`, opacity: ach.unlocked ? 1 : 0.5 }}>
                    <Trophy size={18} style={{ color: ach.unlocked ? ach.color : UI_COLORS.textFaint }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: ach.unlocked ? ach.color : "#B8C7DB" }}>{ach.name}</span>
                        {ach.unlocked && <CheckCircle size={10} style={{ color: ach.color }} />}
                      </div>
                      <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, color: ach.unlocked ? "#4AAED2" : UI_COLORS.textFaint }}>+{ach.xp} XP</span>
                    </div>
                    <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: UI_COLORS.textMuted, marginBottom: 6 }}>{ach.desc}</p>
                    <div className="admin-bar h-1 rounded-sm overflow-hidden" style={{ background: "#2A3444" }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${ach.pct}%` }} transition={MOTION.progress}
                        className="admin-bar-fill" style={{ height: "100%", background: ach.unlocked ? ach.color : `${ach.color}66`, borderRadius: 2 }} />
                    </div>
                    {!ach.unlocked && (
                      <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: UI_COLORS.textFaint, marginTop: 2 }}>{ach.pct}% completado</div>
                    )}
                  </div>
                </div>
                </Card>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ViewNotificaciones({ mode, notifs, setNotifs }: { mode: NotifsViewMode; notifs: Notification[]; setNotifs: React.Dispatch<React.SetStateAction<Notification[]>> }) {
  const [filter, setFilter] = useState(() => new URLSearchParams(window.location.search).get("not_type") ?? "todas");
  const [page, setPage] = useState(() => Number(new URLSearchParams(window.location.search).get("not_page") ?? "1") || 1);
  const [limit] = useState(() => Number(new URLSearchParams(window.location.search).get("not_limit") ?? "6") || 6);
  const [isLoading, setIsLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<HttpCode | null>(null);

  const loadNotifs = async () => {
    setIsLoading(true);
    setErrorCode(null);

    try {
      const notifications = await listNotifications();
      setNotifs(notifications.map(mapNotificationFromApi));
    } catch (error) {
      setErrorCode(toHttpCode(error));
      console.error("Error loading notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markRead = (id: number) => {
    setIsLoading(true);
    setErrorCode(null);

    markNotificationAsRead(id)
      .then(() => {
        setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      })
      .catch((error) => {
        setErrorCode(toHttpCode(error));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const markAllRead = () => {
    const unread = notifs.filter((notification) => !notification.read);
    if (unread.length === 0) return;

    setIsLoading(true);
    setErrorCode(null);

    Promise.all(unread.map((notification) => markNotificationAsRead(notification.id)))
      .then(() => {
        setNotifs(prev => prev.map(n => ({ ...n, read: true })));
      })
      .catch((error) => {
        setErrorCode(toHttpCode(error));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const dismiss = (id: number) => setNotifs(prev => prev.filter(n => n.id !== id));

  const levels = ["todas", "critical", "warning", "info"];
  const filteredByLevel = notifs.filter(n => filter === "todas" || n.level === filter);
  const filtered = filteredByLevel.filter(n => {
    if (mode === "unread") return !n.read;
    if (mode === "critical") return n.level === "critical";
    return true;
  });
  const unread = notifs.filter(n => !n.read).length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * limit, safePage * limit);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("not_mode", mode);
    params.set("not_type", filter);
    params.set("not_page", String(safePage));
    params.set("not_limit", String(limit));
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  }, [mode, filter, safePage, limit]);

  useEffect(() => {
    setPage(1);
  }, [filter, mode]);

  useEffect(() => {
    void loadNotifs();
  }, []);

  return (
    <div className="admin-stack-lg">
      <ModuleContext module="NOTIFICACIONES" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "SIN LEER", value: unread, color: "#DC2626" },
          { label: "CRÍTICAS", value: notifs.filter(n => n.level === "critical").length, color: "#DC2626" },
          { label: "TOTAL", value: notifs.length, color: "#B8C7DB" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 28, fontWeight: 900, color }}>{value}</div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, color: "#B8C7DB", letterSpacing: "0.1em" }}>{label}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <SectionHeader title="CENTRO DE NOTIFICACIONES" accent={false} />
          <div className="flex-1" />
          <div className="flex gap-1">
            {levels.map(l => (
              <button key={l} onClick={() => setFilter(l)}
                className="admin-chip-btn px-2 py-1 rounded-sm cursor-pointer"
                style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, background: filter === l ? notifColor(l) : "#121B26", color: filter === l ? "#05070A" : "#B8C7DB", border: "1px solid #2A3444" }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          {unread > 0 && <ActionBtn label="MARCAR TODO LEÍDO" color="#B8C7DB" onClick={markAllRead} />}
        </div>
        <div style={{ height: 1, background: "linear-gradient(90deg, #7FB8FF 0%, transparent 100%)", marginBottom: 12 }} />

        <div className="admin-stack-sm">
          {isLoading && <EmptyState title="CARGANDO BANDEJA" hint="Consultando notificaciones del campamento" icon={Bell} />}
          {errorCode && <HttpStatusNotice code={errorCode} />}
          <AnimatePresence>
            {paged.map(n => {
              const nc = notifColor(n.level);
              return (
                <motion.div key={n.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10, height: 0 }} transition={MOTION.base}
                  className="notifs-item p-3 rounded-sm"
                  style={{ background: n.read ? "#0B1118" : "#0B1118", border: `1px solid ${n.read ? "#2A3444" : nc + "55"}`, borderLeft: `3px solid ${n.read ? "#2A3444" : nc}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: nc }} />}
                        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: n.read ? "#B8C7DB" : "#EEF3FB" }}>{n.title}</span>
                        <Badge label={n.level.toUpperCase()} color={nc} />
                      </div>
                      <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: "#B8C7DB" }}>{n.body}</p>
                      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: UI_COLORS.textFaint }}>{n.time}</span>
                    </div>
                    <div className="flex gap-1">
                      {!n.read && (
                        <button onClick={() => markRead(n.id)} className="admin-icon-btn">
                          <CheckCircle size={12} style={{ color: '#0D9488' }} />
                        </button>
                      )}
                      <button onClick={() => dismiss(n.id)} className="admin-icon-btn">
                        <X size={12} style={{ color: UI_COLORS.textFaint }} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
          {!isLoading && !errorCode && filtered.length === 0 && <EmptyState title="SIN NOTIFICACIONES" hint="No hay eventos para este filtro" icon={Bell} />}
        </div>
        <PaginationBar page={safePage} totalPages={totalPages} totalItems={filtered.length} onPageChange={setPage} />
      </Card>
    </div>
  )
}

function HttpStatusNotice({ code }: { code: HttpCode }) {
  return (
    <div className="p-2 rounded-sm" style={{ background: `${UI_COLORS.state.critical}14`, border: `1px solid ${UI_COLORS.state.critical}66` }}>
      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#FCA5A5" }}>{httpMessage(code)}</span>
    </div>
  );
}

function SecuredActionBtn({
  allowed,
  reason,
  label,
  color,
  onClick,
  small = false,
}: {
  allowed: boolean;
  reason: string;
  label: string;
  color: string;
  onClick?: () => void;
  small?: boolean;
}) {
  return (
    <div title={allowed ? "" : reason} style={{ opacity: allowed ? 1 : 0.55, cursor: allowed ? "pointer" : "not-allowed" }}>
      <ActionBtn label={label} color={color} onClick={allowed ? onClick : undefined} small={small} />
    </div>
  );
}

function ViewConfiguracion({ mode }: { mode: ConfigViewMode }) {
  const [settings, setSettings] = useState({
    campName: 'CAMPAMENTO ALFA',
    adminName: 'Edicson Vargas',
    day: 47,
    alertThreshold: 20,
    autoBackup: true,
    soundAlerts: true,
    nightReport: true,
    dailyConsumption: true,
    language: 'es',
    timezone: 'America/Costa_Rica',
    sessionTimeout: 60,
  })
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="admin-stack-lg">
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-16 right-4 z-50 px-4 py-2 rounded-sm"
            style={{ background: "#0D9488", fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#EEF3FB" }}>
            CONFIGURACIÓN GUARDADA
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`grid grid-cols-1 ${mode === "system" ? "lg:grid-cols-2" : ""} gap-4`}>
        {mode === "camp" && (
          <Card>
            <SectionHeader title="CONFIGURACIÓN DEL CAMPAMENTO" />
            <div className="admin-stack-md">
              {[
                { label: "NOMBRE DEL CAMPAMENTO", key: "campName" },
                { label: "NOMBRE DEL ADMINISTRADOR", key: "adminName" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#B8C7DB" }}>{label}</label>
                  <input value={(settings as any)[key]} onChange={e => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
                    style={{ background: "#0B1118", border: "1px solid #2A3444", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#EEF3FB" }} />
                </div>
              ))}
              <div>
                <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#B8C7DB" }}>DÍA ACTUAL DEL APOCALIPSIS</label>
                <input type="number" value={settings.day} onChange={e => setSettings(prev => ({ ...prev, day: Number(e.target.value) }))}
                  className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
                  style={{ background: "#0B1118", border: "1px solid #2A3444", fontFamily: "'Orbitron', monospace", fontSize: 12, color: "#4AAED2" }} />
              </div>
              <div>
                <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#B8C7DB" }}>UMBRAL DE ALERTA DE INVENTARIO (%)</label>
                <input type="number" min={1} max={100} value={settings.alertThreshold} onChange={e => setSettings(prev => ({ ...prev, alertThreshold: Number(e.target.value) }))}
                  className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
                  style={{ background: "#0B1118", border: "1px solid #2A3444", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#EEF3FB" }} />
              </div>
            </div>
          </Card>
        )}

        {mode === 'camp' && (
          <Card>
            <SectionHeader title="SISTEMA" />
            <div className="admin-stack-md">
              <div>
                <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#B8C7DB" }}>IDIOMA</label>
                <select value={settings.language} onChange={e => setSettings(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
                  style={{ background: "#0B1118", border: "1px solid #2A3444", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#EEF3FB" }}>
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#B8C7DB" }}>ZONA HORARIA</label>
                <select value={settings.timezone} onChange={e => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
                  style={{ background: "#0B1118", border: "1px solid #2A3444", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#EEF3FB" }}>
                  <option value="America/Costa_Rica">America/Costa_Rica (UTC-6)</option>
                  <option value="America/New_York">America/New_York (UTC-5)</option>
                  <option value="America/Bogota">America/Bogota (UTC-5)</option>
                </select>
              </div>
              <div>
                <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#B8C7DB" }}>TIMEOUT DE SESIÓN (MINUTOS)</label>
                <input type="number" value={settings.sessionTimeout} onChange={e => setSettings(prev => ({ ...prev, sessionTimeout: Number(e.target.value) }))}
                  className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
                  style={{ background: "#0B1118", border: "1px solid #2A3444", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#EEF3FB" }} />
              </div>
            </div>
          </Card>
        )}

        {mode === 'system' && (
          <Card>
            <SectionHeader title="INFORMACIÓN DEL SISTEMA" />
            <div className="admin-stack-sm">
              {[
                { label: "VERSIÓN", value: "1.0.0" },
                { label: "BASE DE DATOS", value: "NEON DB (PostgreSQL)" },
                { label: "SERVIDOR", value: "VERCEL SERVERLESS" },
                { label: "MODELO IA", value: "admission-v1 (Precisión 89%)" },
                { label: "ÚLTIMA SINCRONIZACIÓN", value: "HOY 14:32" },
                { label: "UPTIME", value: "47 DÍAS" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center px-3 py-2 rounded-sm" style={{ background: "#0B1118", border: "1px solid #2A3444" }}>
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: UI_COLORS.textFaint }}>{label}</span>
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#B8C7DB" }}>{value}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className="flex gap-3 justify-center flex-wrap">
        <ActionBtn label="GUARDAR CONFIGURACIÓN" color="#0D9488" onClick={handleSave} />
        <ActionBtn label="RESTABLECER VALORES" color="#B8C7DB" onClick={() => { }} />
      </div>
    </div>
  )
}


function ViewDashboard({ onQuickNav, notifs }: { onQuickNav?: (target: NavSection) => void; notifs: Notification[] }) {
  const [countdown, setCountdown] = useState({ h: 3, m: 28, s: 0 });
  const [threatLevel, setThreatLevel] = useState(72);
  const [isLoading, setIsLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<HttpCode | null>(null);
  const [kpi, setKpi] = useState({
    populationTotal: 247,
    criticalResources: 3,
    activeExpeditions: 2,
    pendingIntercamp: 5,
    activePopulation: 189,
    injuredPopulation: 23,
    sickPopulation: 18,
    outPopulation: 17,
  });
  const [automations] = useState([
    { ok: true, name: 'Consumo diario de raciones', time: 'Ejecutado 06:00', active: true },
    { ok: true, name: 'Colecta de recursos', time: 'Ejecutado 06:00', active: true },
    { ok: false, name: 'Alerta de inventario', time: '3 alertas activas', active: true },
    { ok: true, name: 'Reporte nocturno', time: 'Enviado 00:00', active: true },
  ])

  const refreshDashboard = async () => {
    setIsLoading(true);
    setErrorCode(null);

    const [generalResult, inventoryResult, expeditionsResult] = await Promise.allSettled([
      getGeneralDashboard(),
      getInventoryDashboard(),
      getExpeditionsDashboard(),
    ]);

    const general = generalResult.status === "fulfilled" ? generalResult.value : null;
    const inventory = inventoryResult.status === "fulfilled" ? inventoryResult.value : null;
    const expeditions = expeditionsResult.status === "fulfilled" ? expeditionsResult.value : null;

    if (!general && !inventory && !expeditions) {
      const firstError = generalResult.status === "rejected"
        ? generalResult.reason
        : inventoryResult.status === "rejected"
          ? inventoryResult.reason
          : expeditionsResult.status === "rejected"
            ? expeditionsResult.reason
            : null;

      setErrorCode(toHttpCode(firstError));
      console.error("Error loading dashboard metrics:", firstError);
      setIsLoading(false);
      return;
    }

    if (generalResult.status === "rejected" || inventoryResult.status === "rejected" || expeditionsResult.status === "rejected") {
      const firstError = generalResult.status === "rejected"
        ? generalResult.reason
        : inventoryResult.status === "rejected"
          ? inventoryResult.reason
          : expeditionsResult.status === "rejected"
            ? expeditionsResult.reason
            : null;
      setErrorCode(toHttpCode(firstError));
    }

    const populationTotal = extractNumberByHint(general, ["population", "persons", "totalpeople", "total"], kpi.populationTotal);
    const activePopulation = extractNumberByHint(general, ["active", "healthy"], kpi.activePopulation);
    const injuredPopulation = extractNumberByHint(general, ["injured"], kpi.injuredPopulation);
    const sickPopulation = extractNumberByHint(general, ["sick", "ill"], kpi.sickPopulation);
    const outPopulation = extractNumberByHint(general, ["missing", "outside", "out"], kpi.outPopulation);
    const criticalResources = extractNumberByHint(inventory, ["critical", "alert", "low"], kpi.criticalResources);
    const activeExpeditions = extractNumberByHint(expeditions, ["active", "ongoing"], kpi.activeExpeditions);
    const pendingIntercamp = extractNumberByHint(general, ["intercamp", "transfer", "pending"], kpi.pendingIntercamp);

    setKpi({
      populationTotal,
      criticalResources,
      activeExpeditions,
      pendingIntercamp,
      activePopulation,
      injuredPopulation,
      sickPopulation,
      outPopulation,
    });

    setIsLoading(false);
  };

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown((prev) => {
        const { h, m, s } = prev
        if (s > 0) return { h, m, s: s - 1 }
        if (m > 0) return { h, m: m - 1, s: 59 }
        if (h > 0) return { h: h - 1, m: 59, s: 59 }
        return { h: 0, m: 0, s: 0 }
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      setThreatLevel((prev) => {
        const jitter = Math.floor(Math.random() * 7) - 3
        return Math.min(95, Math.max(38, prev + jitter))
      })
    }, 4500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    void refreshDashboard();
  }, []);

  const populationData = [
    { name: "Activos", value: kpi.activePopulation, color: "#0D9488" },
    { name: "Heridos", value: kpi.injuredPopulation, color: "#EA580C" },
    { name: "Enfermos", value: kpi.sickPopulation, color: "#DC2626" },
    { name: "Fuera", value: kpi.outPopulation, color: "#4AAED2" },
  ];
  const totalPop = populationData.reduce((a, b) => a + b.value, 0);
  const liveAlerts = notifs.filter(n => !n.read).slice(0, 5);

  const crisisToday = {
    title: 'CRISIS DEL DÍA: RIESGO DE ABASTECIMIENTO',
    subtitle: 'Si el agua cae por debajo del 6%, habrá penalización de moral y productividad.',
    impact: [
      '-12% eficiencia de tareas',
      '+18% riesgo médico',
      'IA recomienda expedición de agua en < 2h',
    ],
    urgency: 'VENTANA SEGURA: 01:45:00',
  }
  const rowVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { ...MOTION.base, staggerChildren: 0.07 } },
  }
  const cardVariants = {
    hidden: { opacity: 0, y: 8, scale: 0.99 },
    show: { opacity: 1, y: 0, scale: 1, transition: MOTION.base },
  }

  const levelTone = (level: Notification["level"]) => {
    if (level === "critical") return { color: "#DC2626", label: "CRÍTICA", bg: "#DC262622" };
    if (level === "warning") return { color: "#4AAED2", label: "MEDIA", bg: "#4AAED222" };
    return { color: "#0D9488", label: "INFO", bg: "#0D948822" };
  };
  const isMaxAlert = threatLevel >= 80;

  return (
    <div style={{ position: "relative" }}>
      {isLoading && <EmptyState title="CARGANDO DASHBOARD" hint="Sincronizando métricas generales" icon={Activity} />}
      {errorCode && <HttpStatusNotice code={errorCode} />}

      <AnimatePresence>
        {isMaxAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MOTION.alert}
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 0%, rgba(220,38,38,0.18) 0%, rgba(220,38,38,0) 60%)',
              border: '1px solid rgba(220,38,38,0.22)',
              zIndex: 0,
            }}
          />
        )}
      </AnimatePresence>

      {/* KPI row (top priority, as original flow) */}
      <motion.div
        variants={rowVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3"
      >
        {[
          { icon: Users, color: "#0D9488", value: String(kpi.populationTotal), label: "POBLACIÓN TOTAL", sub: `${kpi.activePopulation} ACTIVOS`, subColor: "#0D9488", subIcon: TrendingUp },
          { icon: Package, color: "#DC2626", value: String(kpi.criticalResources), label: "RECURSOS CRÍTICOS", sub: "CRÍTICO", subColor: "#DC2626", subIcon: TrendingDown, pulse: kpi.criticalResources > 0 },
          { icon: Map, color: "#7FB8FF", value: String(kpi.activeExpeditions), label: "EXPEDICIONES ACTIVAS", sub: `${kpi.outPopulation} FUERA`, subColor: "#4AAED2", subIcon: Activity },
          { icon: Radio, color: "#EA580C", value: String(kpi.pendingIntercamp), label: "SOLICITUDES INTER-CAMP.", sub: "PENDIENTES", subColor: "#EA580C", subIcon: AlertTriangle },
        ].map(({ icon: Icon, color, value, label, sub, subColor, subIcon: SubIcon, pulse }) => (
          <motion.div key={label} variants={cardVariants}>
            <Card glow={color}>
              <div className="flex items-start justify-between mb-2">
                <div
                  className={`p-2 rounded-sm ${pulse ? 'animate-pulse' : ''}`}
                  style={{ background: `${color}22` }}
                >
                  <Icon size={20} style={{ color }} />
                </div>
                <div className="flex items-center gap-1">
                  <SubIcon size={10} style={{ color: subColor }} />
                  <span
                    className="admin-text-micro"
                    style={{ fontFamily: "'Share Tech Mono', monospace", color: subColor }}
                  >
                    {sub}
                  </span>
                </div>
              </div>
              <div className="admin-kpi-value" style={{ fontFamily: "'Orbitron', monospace", fontWeight: 900, color: "#EEF3FB" }}>{value}</div>
              <div className="admin-text-label" style={{ fontFamily: "'Rajdhani', sans-serif", color: "#B8C7DB", letterSpacing: "0.1em", marginTop: 4 }}>{label}</div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <Card className="mb-3">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: UI_COLORS.textMuted }}>ACCESOS RÁPIDOS DEL PANEL GENERAL</span>
          <div className="flex flex-wrap gap-2">
            <ActionBtn label="ACTUALIZAR PANEL" color="#0D9488" onClick={() => void refreshDashboard()} />
            <ActionBtn label="VER SOLICITUDES PENDIENTES" color="#7FB8FF" onClick={() => onQuickNav?.("ADMISIONES IA")} />
            <ActionBtn label="VER INVENTARIO" color="#B8C7DB" onClick={() => onQuickNav?.("INVENTARIO")} />
            <ActionBtn label="IR A EXPEDICIONES" color="#B8C7DB" onClick={() => onQuickNav?.("EXPEDICIONES")} />
          </div>
        </div>
      </Card>

      {/* Crisis row (urgent first for glanceability) */}
      <div className="mb-3">
        <Card glow="#DC2626" className="admin-priority-card">
          <div
            className="p-3 rounded-sm admin-stack-md"
            style={{
              background:
                'radial-gradient(circle at 0% 0%, rgba(220,38,38,0.25) 0%, rgba(220,38,38,0.08) 42%, rgba(13,13,16,1) 100%)',
              border: '1px solid #7F1D1D',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={12} style={{ color: '#DC2626' }} />
                <span
                  className="admin-text-micro"
                  style={{ fontFamily: "'Share Tech Mono', monospace", color: '#FCA5A5' }}
                >
                  {crisisToday.title}
                </span>
              </div>
              <Badge label="MISIÓN PRIORITARIA" color="#DC2626" />
            </div>
            <p className="admin-text-title" style={{ fontFamily: "'Rajdhani', sans-serif", color: "#EEF3FB", fontWeight: 600 }}>
              {crisisToday.subtitle}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {crisisToday.impact.map(item => (
                <div key={item} className="p-2 rounded-sm" style={{ background: "#0B1118", border: "1px solid #2A3444" }}>
                  <span className="admin-text-micro" style={{ fontFamily: "'Share Tech Mono', monospace", color: "#FCA5A5" }}>{item}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 16, color: "#4AAED2", fontWeight: 900 }}>{crisisToday.urgency}</span>
              <div className="flex items-center gap-2">
                <ActionBtn label="PLAN IA" color="#7FB8FF" />
                <ActionBtn label="DESPLEGAR RESPUESTA" color="#DC2626" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-12 gap-3 mb-3">
        <div className="col-span-12 lg:col-span-8">
          <Card>
            <SectionHeader title="TENDENCIA DE RECURSOS — ÚLTIMOS 7 DÍAS" />
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart
                data={resourceTrendData}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <defs>
                  {[["gFood", "#4AAED2"], ["gWater", "#0D9488"], ["gAmmo", "#DC2626"]].map(([id, color]) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A3444" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#B8C7DB", fontSize: 9, fontFamily: "'Share Tech Mono', monospace" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#B8C7DB", fontSize: 9, fontFamily: "'Share Tech Mono', monospace" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0B1118", border: "1px solid #2A3444", borderRadius: 2, fontFamily: "'Share Tech Mono', monospace", fontSize: 10 }} labelStyle={{ color: "#EEF3FB" }} itemStyle={{ color: "#B8C7DB" }} />
                <Legend wrapperStyle={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#B8C7DB" }} />
                <Area type="monotone" dataKey="food" name="Comida" stroke="#4AAED2" fill="url(#gFood)" strokeWidth={1.5} dot={false} />
                <Area type="monotone" dataKey="water" name="Agua" stroke="#0D9488" fill="url(#gWater)" strokeWidth={1.5} dot={false} />
                <Area type="monotone" dataKey="ammo" name="Munición" stroke="#DC2626" fill="url(#gAmmo)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-4">
          <Card className="h-full">
            <SectionHeader title="ESTADO DE LA POBLACIÓN" />
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={populationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {populationData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                  <DonutCenter total={totalPop} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">
              {populationData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                  <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, color: "#B8C7DB" }}>{d.name}: </span>
                  <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, color: "#EEF3FB" }}>{d.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Alertas e inteligencia esencial */}
      <div className="grid grid-cols-12 gap-3 mb-3">
        <div className="col-span-12 lg:col-span-8">
          <Card className="h-full admin-density-card" glow="#EA580C">
            <SectionHeader title="ALERTAS VIVAS — TOP 3" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {liveAlerts.slice(0, 3).map((alert, index) => {
                const tone = levelTone(alert.level)
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-2 rounded-sm"
                    style={{ background: "#0B1118", border: `1px solid ${tone.color}44` }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#EEF3FB", fontWeight: 700 }}>{alert.title}</span>
                      <span
                        style={{
                          fontFamily: "'Rajdhani', sans-serif",
                          fontSize: 12,
                          color: '#F5F0E8',
                          fontWeight: 700,
                        }}
                      >
                        {alert.title}
                      </span>
                      <span
                        className={alert.level === 'critical' ? 'animate-pulse' : ''}
                        style={{
                          fontFamily: "'Share Tech Mono', monospace",
                          fontSize: 9,
                          color: tone.color,
                          background: tone.bg,
                          border: `1px solid ${tone.color}44`,
                          padding: '1px 4px',
                          borderRadius: 2,
                          flexShrink: 0,
                        }}
                      >
                        {tone.label}
                      </span>
                    </div>
                    <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: "#B8C7DB", marginBottom: 4 }}>{alert.body}</p>
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: UI_COLORS.textFaint }}>{alert.time}</span>
                  </motion.div>
                )
              })}
            </div>
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-4">
          <Card className="h-full admin-density-card" glow="#0D9488">
            <SectionHeader title="ESTADO OPERATIVO" />
            <div className="admin-stack-sm">
              {[
                { name: "ADMISIONES IA", status: "ESTABLE", note: "Cola promedio 02:11", color: "#0D9488", icon: UserPlus },
                { name: "INVENTARIO", status: "ALERTA", note: "3 recursos críticos", color: "#EA580C", icon: Package },
                { name: "EXPEDICIONES", status: "ALERTA", note: "1 equipo con retraso", color: "#4AAED2", icon: Map },
                { name: "SEGURIDAD", status: "BLOQUEADO", note: "IP sospechosa aislada", color: "#DC2626", icon: Shield },
              ].map(module => (
                <div key={module.name} className="p-2 rounded-sm" style={{ background: "#0B1118", border: `1px solid ${module.color}44` }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <module.icon size={11} style={{ color: module.color }} />
                      <span className="admin-text-micro" style={{ fontFamily: "'Share Tech Mono', monospace", color: "#EEF3FB" }}>{module.name}</span>
                    </div>
                    <span
                      className={`admin-text-micro ${module.status === 'BLOQUEADO' ? 'animate-pulse' : ''}`}
                      style={{ fontFamily: "'Share Tech Mono', monospace", color: module.color }}
                    >
                      {module.status}
                    </span>
                  </div>
                  <span className="admin-text-body" style={{ fontFamily: "'Rajdhani', sans-serif", color: "#B8C7DB" }}>{module.note}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Próximo ciclo automático */}
      <div className="mb-3">
        <Card>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Settings size={14} style={{ color: "#7FB8FF" }} />
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#7FB8FF" }}>PRÓXIMO CICLO AUTOMÁTICO — HOY 18:00</span>
            </div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 22, fontWeight: 900, color: "#4AAED2" }}>
              {String(countdown.h).padStart(2, "0")}:{String(countdown.m).padStart(2, "0")}:{String(countdown.s).padStart(2, "0")}
            </div>
            <div className="flex gap-2">
              {automations.map((a, i) => (
                <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-sm" style={{ background: "#0B1118", border: `1px solid ${a.ok ? "#0D948844" : "#EA580C44"}` }}>
                  <span style={{ fontSize: 10, color: a.ok ? "#0D9488" : "#EA580C" }}>{a.ok ? "✓" : "⚠"}</span>
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#B8C7DB" }}>{a.name.split(" ").slice(0, 2).join(" ")}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState<NavSection>("CENTRO DE MANDO");
  const storedUserRaw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const parsedUser = (() => {
    if (!storedUserRaw) return null;
    try {
      const value = JSON.parse(storedUserRaw) as { username?: string; role?: string; rol?: string; campId?: number };
      return value;
    } catch {
      return null;
    }
  })();

  const mapBackendRoleToAppRole = (role?: string): AppRole => {
    if (!role) return "TRABAJADOR";
    if (role === "SYSTEM_ADMIN") return "SYSTEM_ADMIN";
    if (role === "RESOURCE_MANAGEMENT" || role === "GESTION_RECURSOS") return "GESTION_RECURSOS";
    if (role === "WORKER" || role === "TRABAJADOR") return "TRABAJADOR";
    if (role === "TRAVEL_MANAGER" || role === "ENCARGADO_VIAJES") return "ENCARGADO_VIAJES";
    return "TRABAJADOR";
  };

  const currentRole: AppRole = mapBackendRoleToAppRole(parsedUser?.role ?? parsedUser?.rol);
  const currentCampId = typeof parsedUser?.campId === "number" ? parsedUser.campId : 1;
  const [sessionPanelOpen, setSessionPanelOpen] = useState(false);
  const [profilePreviewOpen, setProfilePreviewOpen] = useState(false);
  const [sessionLocked, setSessionLocked] = useState(false);
  const [globalHttpCode, setGlobalHttpCode] = useState<HttpCode | null>(null);
  const [populationViewMode, setPopulationViewMode] = useState<PopulationViewMode>("stats");
  const [admissionsViewMode, setAdmissionsViewMode] = useState<AdmissionsViewMode>("queue");
  const [inventoryViewMode, setInventoryViewMode] = useState<InventoryViewMode>("summary");
  const [expeditionsViewMode, setExpeditionsViewMode] = useState<ExpeditionsViewMode>("map");
  const [intercampViewMode, setIntercampViewMode] = useState<IntercampViewMode>("pending");
  const [securityViewMode, setSecurityViewMode] = useState<SecurityViewMode>("live");
  const [logrosViewMode, setLogrosViewMode] = useState<LogrosViewMode>("overview");
  const [notifsViewMode, setNotifsViewMode] = useState<NotifsViewMode>("all");
  const [configViewMode, setConfigViewMode] = useState<ConfigViewMode>("camp");
  const [serverTime, setServerTime] = useState(new Date());
  const [notifs, setNotifs] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const unreadNotifs = notifs.filter(n => !n.read).length;
  const currentUser = {
    name: parsedUser?.username ?? "Operador",
    email: `${parsedUser?.username ?? "operador"}@camp-alpha.local`,
    role: currentRole,
    camp: `Campamento #${currentCampId}`,
    shift: "Turno Noche",
    profileImage: "https://i.pravatar.cc/80?img=12",
  };
  const can = (permission: string) => ROLE_PERMISSIONS[currentRole].includes(permission);

  const warmExpeditionsModule = () => {
    void prefetchExpeditionsData(currentCampId);
    prefetchExpeditionsWorldMap();
  };

  const loadGlobalNotifications = async () => {
    try {
      const notifications = await listNotifications();
      if (notifications.length > 0) {
        setNotifs(notifications.map(mapNotificationFromApi));
      }
    } catch (error) {
      setGlobalHttpCode(toHttpCode(error));
      console.error("Error loading global notifications:", error);
    }
  };

  useEffect(() => {
    const t = setInterval(() => setServerTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    void loadGlobalNotifications();
  }, [currentCampId]);

  useEffect(() => {
    const prefetchTimer = window.setTimeout(() => {
      warmExpeditionsModule();
    }, 180);
    return () => window.clearTimeout(prefetchTimer);
  }, [currentCampId]);

  useEffect(() => {
    if (activeNav !== "EXPEDICIONES") return;
    warmExpeditionsModule();
  }, [activeNav, currentCampId]);

  useEffect(() => {
    const ttl = 20 * 60 * 1000;
    let timeout: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setSessionLocked(true), ttl);
    };
    const events: Array<keyof WindowEventMap> = ["mousemove", "keydown", "click", "scroll"];
    events.forEach(evt => window.addEventListener(evt, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timeout);
      events.forEach(evt => window.removeEventListener(evt, reset));
    };
  }, []);

  useEffect(() => {
    if (!sessionPanelOpen) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSessionPanelOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("keydown", onEsc);
    };
  }, [sessionPanelOpen]);

  const quickAccess: { icon: React.ElementType; label: string; target: NavSection }[] = [
    { icon: Users, label: 'Poblacion', target: 'POBLACIÓN' },
    { icon: UserPlus, label: 'Admisiones', target: 'ADMISIONES IA' },
    { icon: Package, label: 'Inventario', target: 'INVENTARIO' },
    { icon: Map, label: 'Expediciones', target: 'EXPEDICIONES' },
    { icon: Radio, label: 'Intercamp', target: 'INTER-CAMPAMENTOS' },
  ]

  const navWithSidebar: NavSection[] = [
    "POBLACIÓN",
    "ADMISIONES IA",
    "INVENTARIO",
    "EXPEDICIONES",
    "INTER-CAMPAMENTOS",
    "SEGURIDAD / LOGS",
    "LOGROS",
    "NOTIFICACIONES",
    "CONFIGURACIÓN",
  ];
  const hasSidebar = navWithSidebar.includes(activeNav);

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString('es-CR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

  const renderSection = () => {
    switch (activeNav) {
      case "POBLACIÓN": return <ViewPoblacion mode={populationViewMode} campId={currentCampId} />;
      case "ADMISIONES IA": return <ViewAdmisiones mode={admissionsViewMode} canReview={can("admissions.review")} campId={currentCampId} />;
      case "INVENTARIO": return <ViewInventario mode={inventoryViewMode} canAdjust={can("inventory.adjust")} campId={currentCampId} />;
      case "EXPEDICIONES":
        if (["active", "planning", "consumed", "gained"].includes(expeditionsViewMode)) {
          return <ViewExpediciones mode={expeditionsViewMode} canForce={can("expeditions.force")} />;
        }
        return (
          <ExpeditionsPanel
            mode={expeditionsViewMode}
            currentCampId={currentCampId}
          />
        );
      case "INTER-CAMPAMENTOS": return <ViewIntercamp mode={intercampViewMode} canApprove={can("intercamp.approve")} />;
      case "SEGURIDAD / LOGS": return <ViewSeguridad mode={securityViewMode} />;
      case "LOGROS": return <ViewLogros mode={logrosViewMode} />;
      case "NOTIFICACIONES": return <ViewNotificaciones mode={notifsViewMode} notifs={notifs} setNotifs={setNotifs} />;
      case "CONFIGURACIÓN": return <ViewConfiguracion mode={configViewMode} />;
      default: return <ViewDashboard onQuickNav={setActiveNav} notifs={notifs} />;
    }
  }

  const handleDockNav = (target: NavSection) => {
    if (activeNav === target) {
      if (target === 'POBLACIÓN') {
        setActiveNav('CENTRO DE MANDO')
        return
      }
      setActiveNav('CENTRO DE MANDO')
      return
    }

    if (target === 'POBLACIÓN') {
      setPopulationViewMode('stats')
      setActiveNav('POBLACIÓN')
      return
    }

    if (target === 'ADMISIONES IA') {
      setAdmissionsViewMode('queue')
      setActiveNav(target)
      return
    }

    if (target === 'INVENTARIO') {
      setInventoryViewMode('summary')
      setActiveNav(target)
      return
    }

    if (target === "EXPEDICIONES") {
      warmExpeditionsModule();
      setExpeditionsViewMode("map");
      setActiveNav(target);
      return;
    }

    if (target === 'INTER-CAMPAMENTOS') {
      setIntercampViewMode('pending')
      setActiveNav(target)
      return
    }

    if (target === 'SEGURIDAD / LOGS') {
      setSecurityViewMode('live')
      setActiveNav(target)
      return
    }

    if (target === 'LOGROS') {
      setLogrosViewMode('overview')
      setActiveNav(target)
      return
    }

    if (target === 'NOTIFICACIONES') {
      setNotifsViewMode('all')
      setActiveNav(target)
      return
    }

    if (target === 'CONFIGURACIÓN') {
      setConfigViewMode('camp')
      setActiveNav(target)
      return
    }

    setActiveNav(target)
  }

  return (
    <>
      <style>{FONT_IMPORT}</style>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #05070A; }
        ::-webkit-scrollbar-thumb { background: #2A3444; border-radius: 2px; }
        select option { background: #0B1118; color: #EEF3FB; }
        .scanlines::before {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px);
          pointer-events: none;
          z-index: 1;
        }
        .scanlines::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 0%, rgba(127, 184, 255, 0.14) 48%, transparent 100%);
          animation: scanSweep 4.2s linear infinite;
          pointer-events: none;
          z-index: 1;
        }
        .noise-bg {
          background-color: #05070A;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"),
            radial-gradient(ellipse at 50% 0%, #1A1A14 0%, #05070A 70%);
        }
        @keyframes scanSweep {
          0% { transform: translateY(-100%); opacity: 0; }
          8% { opacity: 0.5; }
          50% { opacity: 0.9; }
          92% { opacity: 0.5; }
          100% { transform: translateY(100%); opacity: 0; }
        }
      `}</style>

      <div className="admin-dashboard">
        <div className="admin-stage">
          <div className="admin-hud" aria-hidden="true" />

          <div className="admin-layout">
            {hasSidebar && (
                <aside className="admin-sidebar hidden md:flex flex-col flex-shrink-0" style={{ width: "clamp(220px, 24vw, 250px)", background: "transparent", borderRight: "1px solid #2A3444", zIndex: 1 }}>
                  <div className="admin-logo px-4 py-5 flex flex-col" style={{ borderBottom: "1px solid #2A3444" }}>
                    <div className="flex items-center gap-2 mb-1">
                      {activeNav === "POBLACIÓN" && <Users size={18} style={{ color: "#7FB8FF" }} />}
                      {activeNav === "ADMISIONES IA" && <UserPlus size={18} style={{ color: "#7FB8FF" }} />}
                      {activeNav === "INVENTARIO" && <Package size={18} style={{ color: "#7FB8FF" }} />}
                      {activeNav === "EXPEDICIONES" && <Map size={18} style={{ color: "#7FB8FF" }} />}
                      {activeNav === "INTER-CAMPAMENTOS" && <Radio size={18} style={{ color: "#7FB8FF" }} />}
                      {activeNav === "SEGURIDAD / LOGS" && <Shield size={18} style={{ color: "#7FB8FF" }} />}
                      {activeNav === "LOGROS" && <Trophy size={18} style={{ color: "#7FB8FF" }} />}
                      {activeNav === "NOTIFICACIONES" && <Bell size={18} style={{ color: "#7FB8FF" }} />}
                      {activeNav === "CONFIGURACIÓN" && <Settings size={18} style={{ color: "#7FB8FF" }} />}
                      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#7FB8FF", letterSpacing: "0.06em" }}>{activeNav}</span>
                    </div>
                  </div>

                  <nav className="admin-nav flex-1 px-3 py-3 overflow-y-auto">
                    {activeNav === "POBLACIÓN" && (
                      <>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${populationViewMode === "stats" ? " admin-nav-button--active" : ""}`} onClick={() => setPopulationViewMode("stats")} style={{ color: populationViewMode === "stats" ? "#05070A" : "#B8C7DB" }}>
                          <BarChart2 size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Ver estadísticas</span>
                        </button>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${populationViewMode === "users" ? " admin-nav-button--active" : ""}`} onClick={() => setPopulationViewMode("users")} style={{ color: populationViewMode === "users" ? "#05070A" : "#B8C7DB" }}>
                          <Users size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Ver usuarios y filtros</span>
                        </button>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${populationViewMode === "tempRoles" ? " admin-nav-button--active" : ""}`} onClick={() => setPopulationViewMode("tempRoles")} style={{ color: populationViewMode === "tempRoles" ? "#05070A" : "#B8C7DB" }}>
                          <Activity size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Oficios temporales</span>
                        </button>
                      </>
                    )}

                    {activeNav === "ADMISIONES IA" && (
                      <>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${admissionsViewMode === "queue" ? " admin-nav-button--active" : ""}`} onClick={() => setAdmissionsViewMode("queue")} style={{ color: admissionsViewMode === "queue" ? "#05070A" : "#B8C7DB" }}>
                          <AlertTriangle size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Cola pendiente</span>
                        </button>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${admissionsViewMode === "history" ? " admin-nav-button--active" : ""}`} onClick={() => setAdmissionsViewMode("history")} style={{ color: admissionsViewMode === "history" ? "#05070A" : "#B8C7DB" }}>
                          <CheckCircle size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Historial procesado</span>
                        </button>
                      </>
                    )}

                    {activeNav === "INVENTARIO" && (
                      <>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${inventoryViewMode === "summary" ? " admin-nav-button--active" : ""}`} onClick={() => setInventoryViewMode("summary")} style={{ color: inventoryViewMode === "summary" ? "#05070A" : "#B8C7DB" }}>
                          <BarChart2 size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Resumen por categoría</span>
                        </button>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${inventoryViewMode === "items" ? " admin-nav-button--active" : ""}`} onClick={() => setInventoryViewMode("items")} style={{ color: inventoryViewMode === "items" ? "#05070A" : "#B8C7DB" }}>
                          <Package size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Gestión de ítems</span>
                        </button>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${inventoryViewMode === "movements" ? " admin-nav-button--active" : ""}`} onClick={() => setInventoryViewMode("movements")} style={{ color: inventoryViewMode === "movements" ? "#05070A" : "#B8C7DB" }}>
                          <Activity size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Movimientos</span>
                        </button>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${inventoryViewMode === "alerts" ? " admin-nav-button--active" : ""}`} onClick={() => setInventoryViewMode("alerts")} style={{ color: inventoryViewMode === "alerts" ? "#05070A" : "#B8C7DB" }}>
                          <AlertTriangle size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Alertas</span>
                        </button>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${inventoryViewMode === "collection" ? " admin-nav-button--active" : ""}`} onClick={() => setInventoryViewMode("collection")} style={{ color: inventoryViewMode === "collection" ? "#05070A" : "#B8C7DB" }}>
                          <Database size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Recolección diaria</span>
                        </button>
                      </>
                    )}

                    {activeNav === "EXPEDICIONES" && (
                      <>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${expeditionsViewMode === "map" ? " admin-nav-button--active" : ""}`} onClick={() => setExpeditionsViewMode("map")} style={{ color: expeditionsViewMode === "map" ? "#05070A" : "#B8C7DB" }}>
                          <Map size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Mapa operativo</span>
                        </button>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${expeditionsViewMode === "activeOps" ? " admin-nav-button--active" : ""}`} onClick={() => setExpeditionsViewMode("activeOps")} style={{ color: expeditionsViewMode === "activeOps" ? "#05070A" : "#B8C7DB" }}>
                          <Activity size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Misiones activas</span>
                        </button>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${expeditionsViewMode === "history" ? " admin-nav-button--active" : ""}`} onClick={() => setExpeditionsViewMode("history")} style={{ color: expeditionsViewMode === "history" ? "#05070A" : "#B8C7DB" }}>
                          <Trophy size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Historial</span>
                        </button>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${expeditionsViewMode === "resources" ? " admin-nav-button--active" : ""}`} onClick={() => setExpeditionsViewMode("resources")} style={{ color: expeditionsViewMode === "resources" ? "#05070A" : "#B8C7DB" }}>
                          <TrendingUp size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Recursos</span>
                        </button>
                      </>
                    )}

                    {activeNav === "INTER-CAMPAMENTOS" && (
                      <>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${intercampViewMode === "pending" ? " admin-nav-button--active" : ""}`} onClick={() => setIntercampViewMode("pending")} style={{ color: intercampViewMode === "pending" ? "#05070A" : "#B8C7DB" }}>
                          <AlertTriangle size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Pendientes</span>
                        </button>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${intercampViewMode === "history" ? " admin-nav-button--active" : ""}`} onClick={() => setIntercampViewMode("history")} style={{ color: intercampViewMode === "history" ? "#05070A" : "#B8C7DB" }}>
                          <Radio size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Historial</span>
                        </button>
                      </>
                    )}

                    {activeNav === "SEGURIDAD / LOGS" && (
                      <>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${securityViewMode === "live" ? " admin-nav-button--active" : ""}`} onClick={() => setSecurityViewMode("live")} style={{ color: securityViewMode === "live" ? "#05070A" : "#B8C7DB" }}>
                          <Activity size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Monitoreo en vivo</span>
                        </button>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${securityViewMode === "errors" ? " admin-nav-button--active" : ""}`} onClick={() => setSecurityViewMode("errors")} style={{ color: securityViewMode === "errors" ? "#05070A" : "#B8C7DB" }}>
                          <AlertTriangle size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Errores y alertas</span>
                        </button>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${securityViewMode === "system" ? " admin-nav-button--active" : ""}`} onClick={() => setSecurityViewMode("system")} style={{ color: securityViewMode === "system" ? "#05070A" : "#B8C7DB" }}>
                          <Cpu size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Eventos del sistema</span>
                        </button>
                      </>
                    )}

                    {activeNav === "LOGROS" && (
                      <>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${logrosViewMode === "overview" ? " admin-nav-button--active" : ""}`} onClick={() => setLogrosViewMode("overview")} style={{ color: logrosViewMode === "overview" ? "#05070A" : "#B8C7DB" }}>
                          <Trophy size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Resumen de nivel</span>
                        </button>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${logrosViewMode === "progress" ? " admin-nav-button--active" : ""}`} onClick={() => setLogrosViewMode("progress")} style={{ color: logrosViewMode === "progress" ? "#05070A" : "#B8C7DB" }}>
                          <BarChart2 size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Progreso por categorías</span>
                        </button>
                      </>
                    )}

                    {activeNav === "NOTIFICACIONES" && (
                      <>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${notifsViewMode === "all" ? " admin-nav-button--active" : ""}`} onClick={() => setNotifsViewMode("all")} style={{ color: notifsViewMode === "all" ? "#05070A" : "#B8C7DB" }}>
                          <Bell size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Todas</span>
                        </button>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${notifsViewMode === "unread" ? " admin-nav-button--active" : ""}`} onClick={() => setNotifsViewMode("unread")} style={{ color: notifsViewMode === "unread" ? "#05070A" : "#B8C7DB" }}>
                          <CheckCircle size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Sin leer</span>
                        </button>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${notifsViewMode === "critical" ? " admin-nav-button--active" : ""}`} onClick={() => setNotifsViewMode("critical")} style={{ color: notifsViewMode === "critical" ? "#05070A" : "#B8C7DB" }}>
                          <AlertTriangle size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Críticas</span>
                        </button>
                      </>
                    )}

                    {activeNav === "CONFIGURACIÓN" && (
                      <>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${configViewMode === "camp" ? " admin-nav-button--active" : ""}`} onClick={() => setConfigViewMode("camp")} style={{ color: configViewMode === "camp" ? "#05070A" : "#B8C7DB" }}>
                          <Users size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Campamento</span>
                        </button>
                        <button type="button" className={`admin-nav-button w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-sm transition-all cursor-pointer${configViewMode === "system" ? " admin-nav-button--active" : ""}`} onClick={() => setConfigViewMode("system")} style={{ color: configViewMode === "system" ? "#05070A" : "#B8C7DB" }}>
                          <Settings size={14} />
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Sistema</span>
                        </button>
                      </>
                    )}
                  </nav>

                  <div className="px-3" style={{ borderTop: "1px solid #2A3444", paddingTop: 0, paddingBottom: 80 }}>
                    <div className="admin-clock px-2 py-1 rounded-sm" style={{ background: "#0B1118", border: "1px solid #2A3444" }}>
                      <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 12, color: "#4AAED2", letterSpacing: "0.1em" }}>{fmtTime(serverTime)}</span>
                    </div>
                  </div>
                </aside>
              )}

            {/* MAIN */}
            <div
              className="admin-main flex-1 flex flex-col overflow-hidden"
              style={{ position: 'relative', zIndex: 1 }}
            >
              {/* Header */}
              <header className="admin-header relative flex-shrink-0 px-4 py-3"
                style={{ background: "transparent", borderBottom: "none" }}>
                <div className="admin-top-strip flex items-center justify-between gap-3 relative z-10">
                  <div>
                    <button
                      onClick={() => navigate('/admin-main-view-ui')}
                      className="admin-icon-btn admin-header-icon-btn flex items-center justify-center p-1.5 rounded-sm"
                      style={{ background: "transparent", border: "1px solid rgba(127, 184, 255, 0.32)", minWidth: 34, minHeight: 34 }}
                      title="Volver a vista monitor"
                    >
                      <ChevronLeft size={16} style={{ color: "#7FB8FF" }} />
                    </button>
                  </div>
                  <div className="admin-top-title-badge">{activeNav}</div>
                  <div className="admin-profile admin-header-actions flex items-center gap-2">
                    <button onClick={() => setActiveNav("NOTIFICACIONES")} className="admin-icon-btn admin-header-icon-btn relative p-2.5 rounded-sm"
                      style={{ background: "transparent", border: "1px solid rgba(127, 184, 255, 0.32)", minWidth: 34, minHeight: 34 }}>
                      <Bell size={14} style={{ color: "#7FB8FF", marginTop: 4 }} />
                      {unreadNotifs > 0 && (
                        <span
                          className="absolute flex items-center justify-center rounded-sm px-1"
                          style={{
                            top: -1,
                            right: -1,
                            minWidth: 14,
                            height: 14,
                            lineHeight: "14px",
                            background: "#DC2626",
                            fontFamily: "'Share Tech Mono', monospace",
                            fontSize: 8,
                            fontWeight: 700,
                            color: "#EEF3FB"
                          }}
                        >
                          {unreadNotifs}
                        </span>
                      )}
                    </button>
                    <button onClick={() => setActiveNav("CONFIGURACIÓN")} className="admin-icon-btn admin-header-icon-btn flex items-center justify-center p-1.5 rounded-sm"
                      style={{ background: "transparent", border: "1px solid rgba(127, 184, 255, 0.32)", minWidth: 34, minHeight: 34 }}>
                      <Settings size={16} style={{ color: "#7FB8FF" }} />
                    </button>
                    <button onClick={() => setSessionPanelOpen(prev => !prev)} className="admin-icon-btn admin-header-icon-btn flex items-center gap-1.5 px-2 py-1 rounded-sm"
                      style={{ background: "transparent", border: "1px solid rgba(127, 184, 255, 0.32)" }}>
                      <img
                        src={currentUser.profileImage}
                        alt={`Perfil de ${currentUser.name}`}
                        className="w-5 h-5 rounded-sm"
                        style={{ objectFit: "cover", border: "1px solid rgba(127, 184, 255, 0.45)", cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setProfilePreviewOpen(true);
                        }}
                      />
                      <ChevronDown size={10} style={{ color: "#B8C7DB", transform: sessionPanelOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} />
                    </button>
                  </div>
                </div>
              </header>

              {typeof document !== "undefined" && createPortal(
                <AnimatePresence initial={false} mode="wait">
                  {sessionPanelOpen && (
                    <>
                      <motion.button
                        type="button"
                        aria-label="Cerrar panel de sesion"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeInOut" }}
                        onClick={() => setSessionPanelOpen(false)}
                        style={{
                          position: "fixed",
                          inset: 0,
                          background: "rgba(0,0,0,0.32)",
                          zIndex: 99998,
                          border: "none",
                          padding: 0,
                          margin: 0,
                        }}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -14, scale: 0.96, filter: "blur(6px)" }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -10, scale: 0.97, filter: "blur(4px)" }}
                        transition={{
                          y: { type: "spring", stiffness: 340, damping: 30, mass: 0.75 },
                          scale: { type: "spring", stiffness: 360, damping: 28, mass: 0.7 },
                          opacity: { duration: 0.18, ease: "easeOut" },
                          filter: { duration: 0.2, ease: "easeOut" },
                        }}
                        style={{
                          position: "fixed",
                          top: 72,
                          right: 16,
                          width: "min(304px, calc(100vw - 24px))",
                          padding: 12,
                          borderRadius: 6,
                          zIndex: 99999,
                          background: "linear-gradient(160deg, rgba(11,17,24,0.98), rgba(18,27,38,0.96))",
                          border: "1px solid #2A3444",
                          boxShadow: "0 14px 36px rgba(0,0,0,0.42), inset 0 0 0 1px rgba(127,184,255,0.12)",
                          backdropFilter: "blur(8px)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, padding: 8, borderRadius: 6, background: "rgba(127,184,255,0.08)", border: "1px solid rgba(127,184,255,0.2)" }}>
                          <div
                            style={{ width: 40, height: 40, borderRadius: 6, overflow: "hidden", background: "#121B26", border: "1px solid #2A3444", cursor: "pointer" }}
                            onClick={() => setProfilePreviewOpen(true)}
                          >
                            <img
                              src={currentUser.profileImage}
                              alt={`Perfil de ${currentUser.name}`}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, fontWeight: 700, color: "#EEF3FB", lineHeight: 1.1 }}>{currentUser.name}</div>
                            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#B8C7DB", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis" }}>{currentUser.email}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12, borderTop: "1px solid #2A3444", paddingTop: 8 }}>
                          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#7F93AC" }}>ROL · {currentUser.role}</div>
                          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#7F93AC" }}>CAMP · {currentUser.camp}</div>
                          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#7F93AC" }}>TURNO · {currentUser.shift}</div>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch("/logout", { method: "POST" });
                              if (!res.ok) setGlobalHttpCode((res.status as HttpCode) || 400);
                            } finally {
                              window.location.reload();
                            }
                          }}
                          className="admin-icon-btn"
                          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "8px 12px", borderRadius: 6, background: "#1B2734", border: "1px solid #2A3444" }}
                        >
                          <XCircle size={13} style={{ color: "#DC2626" }} />
                          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#EEF3FB", letterSpacing: "0.06em" }}>CERRAR SESIÓN</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>,
                document.body
              )}

              {typeof document !== "undefined" && createPortal(
                <AnimatePresence>
                  {profilePreviewOpen && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      onClick={() => setProfilePreviewOpen(false)}
                      style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 100000,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 16,
                        background: "rgba(3, 7, 12, 0.74)",
                        backdropFilter: "blur(4px)",
                        WebkitBackdropFilter: "blur(4px)",
                      }}
                    >
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: 8 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: "min(420px, calc(100vw - 32px))",
                          borderRadius: 10,
                          overflow: "hidden",
                          border: "1px solid rgba(127, 184, 255, 0.32)",
                          boxShadow: "0 22px 44px rgba(0, 0, 0, 0.46)",
                          background: "#0B1118",
                        }}
                      >
                        <img
                          src={currentUser.profileImage}
                          alt={`Perfil ampliado de ${currentUser.name}`}
                          style={{ width: "100%", height: "auto", display: "block", maxHeight: "72vh", objectFit: "cover" }}
                        />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>,
                document.body
              )}

              {globalHttpCode && (
                <div className="px-4 pt-2">
                  <HttpStatusNotice code={globalHttpCode} />
                </div>
              )}

              {sessionLocked && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
                  <div className="w-full max-w-md p-4 rounded-sm" style={{ background: UI_COLORS.panel, border: `1px solid ${UI_COLORS.state.warning}` }}>
                    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#4AAED2", marginBottom: 8 }}>SESIÓN BLOQUEADA POR INACTIVIDAD</div>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: UI_COLORS.textMuted, marginBottom: 12 }}>Por seguridad, se bloqueó la interfaz tras 20 minutos sin actividad.</div>
                    <div className="flex gap-2">
                      <ActionBtn label="REACTIVAR SESIÓN" color="#0D9488" onClick={() => setSessionLocked(false)} />
                      <ActionBtn label="CERRAR SESIÓN" color="#DC2626" onClick={() => window.location.reload()} />
                    </div>
                  </div>
                </div>
              )}

              {/* Content */}
              <main className="admin-content flex-1 p-4">
                <div className="admin-panel">
                  <div className="admin-panel-frame" aria-hidden="true" />
                  <div className="admin-panel-inner">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeNav}
                        initial={{ opacity: 0, y: 12, scale: 0.995 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.995 }}
                        transition={MOTION.page}
                      >
                        {renderSection()}
                      </motion.div>
                    </AnimatePresence>
                    <div className="h-4" />
                  </div>
                </div>
              </main>
              <footer className={`admin-dock${hasSidebar ? " admin-dock--sidebar-offset" : ""}`} aria-label="Acceso rapido">
                {quickAccess.map((item) => {
                  const isActive = activeNav === item.target
                  const Icon = item.icon
                  return (
                    <button
                      key={item.target}
                      type="button"
                      className={`admin-dock-item${isActive ? ' admin-dock-item--active' : ''}`}
                      onClick={() => handleDockNav(item.target)}
                      onMouseEnter={item.target === "EXPEDICIONES" ? warmExpeditionsModule : undefined}
                      onFocus={item.target === "EXPEDICIONES" ? warmExpeditionsModule : undefined}
                      aria-label={item.label}
                    >
                      <span className="admin-dock-label">{item.label}</span>
                      <Icon size={16} />
                    </button>
                  )
                })}
              </footer>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
