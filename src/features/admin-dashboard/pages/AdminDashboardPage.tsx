
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./admin-dashboard.css";
import {
  LayoutDashboard, Users, UserPlus, Package, Map, Radio,
  Shield, Trophy, Bell, Settings, ChevronRight,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  XCircle, Activity, ChevronDown,
  BarChart2, Skull, Search, Edit2, Trash2,
  X, Volume2, Database, Cpu, User
} from "lucide-react";
import {
  AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

// ─── FONTS ──────────────────────────────────────────────────────────────────
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@400;700;900&display=swap');`;

// ─── TYPES ───────────────────────────────────────────────────────────────────

type NavSection =
  | "CENTRO DE MANDO"
  | "POBLACIÓN"
  | "ADMISIONES IA"
  | "INVENTARIO"
  | "EXPEDICIONES"
  | "INTER-CAMPAMENTOS"
  | "SEGURIDAD / LOGS"
  | "LOGROS"
  | "NOTIFICACIONES"
  | "CONFIGURACIÓN";

interface Person {
  id: number;
  name: string;
  role: string;
  status: "Activo" | "Herido" | "Enfermo" | "Fuera";
  age: number;
  sector: string;
  joined: string;
}

interface Admission {
  id: number;
  name: string;
  profession: string;
  score: number;
  badge: string | null;
  status: "pending" | "approved" | "rejected";
  skills: string[];
  reason: string;
}

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  pct: number;
  units: number;
  max: number;
  status: "CRÍTICO" | "BAJO" | "NORMAL" | "OK";
}

interface Expedition {
  id: number;
  name: string;
  day: number;
  total: number;
  participants: string[];
  status: "EN CURSO" | "PROGRAMADA" | "REGRESANDO" | "COMPLETADA";
  objective: string;
  sector: string;
}

interface IntercampRequest {
  id: number;
  from: string;
  text: string;
  time: string;
  status: "PENDIENTE" | "APROBADO" | "RECHAZADO" | "CONFIRMADO";
  urgent: boolean;
  type: "solicitud" | "traslado" | "oferta";
}

interface LogEntry {
  id: number;
  time: string;
  level: "info" | "warn" | "error" | "system";
  user: string;
  action: string;
}

interface Notification {
  id: number;
  title: string;
  body: string;
  time: string;
  read: boolean;
  level: "critical" | "warning" | "info";
}

// ─── INITIAL DATA ─────────────────────────────────────────────────────────────

const INITIAL_PERSONS: Person[] = [
  { id: 1, name: "María González", role: "Médica", status: "Activo", age: 34, sector: "Enfermería", joined: "D-40" },
  { id: 2, name: "Roberto Soto", role: "Mecánico", status: "Activo", age: 42, sector: "Taller", joined: "D-35" },
  { id: 3, name: "Ana Quirós", role: "Agricultora", status: "Activo", age: 28, sector: "Huerto", joined: "D-47" },
  { id: 4, name: "Luis Mora", role: "Guardia", status: "Fuera", age: 31, sector: "Perimetro", joined: "D-20" },
  { id: 5, name: "Karen Torres", role: "Cocinera", status: "Activo", age: 25, sector: "Cocina", joined: "D-47" },
  { id: 6, name: "Pedro Jiménez", role: "Ingeniero", status: "Herido", age: 39, sector: "Construcción", joined: "D-30" },
  { id: 7, name: "Sofía Vargas", role: "Médica", status: "Activo", age: 45, sector: "Enfermería", joined: "D-10" },
  { id: 8, name: "Diego Ramírez", role: "Explorador", status: "Fuera", age: 27, sector: "Exteriores", joined: "D-38" },
  { id: 9, name: "Valeria López", role: "Maestra", status: "Activo", age: 33, sector: "Educación", joined: "D-41" },
  { id: 10, name: "Camilo Ruiz", role: "Guardia", status: "Enfermo", age: 22, sector: "Perimetro", joined: "D-45" },
  { id: 11, name: "Natalia Castro", role: "Química", status: "Activo", age: 37, sector: "Laboratorio", joined: "D-15" },
  { id: 12, name: "Andrés Blanco", role: "Chofer", status: "Activo", age: 50, sector: "Logística", joined: "D-22" },
];

const INITIAL_ADMISSIONS: Admission[] = [
  { id: 1, name: "María González", profession: "Médica", score: 94, badge: null, status: "pending", skills: ["Cirugía", "Primeros Auxilios", "Farmacología"], reason: "Encontrada en sector norte, documentos verificados." },
  { id: 2, name: "Roberto Soto", profession: "Mecánico", score: 78, badge: null, status: "pending", skills: ["Motores", "Soldadura", "Electricidad"], reason: "Grupo de 3 personas, referenciado por Expedición Norte." },
  { id: 3, name: "Unnamed", profession: "Desconocido", score: 12, badge: "SOSPECHOSO", status: "pending", skills: [], reason: "Sin documentos. Comportamiento errático. Revisión IA: posible infección." },
  { id: 4, name: "Luis Mora", profession: "Agricultor", score: 67, badge: null, status: "pending", skills: ["Cultivos", "Riego", "Conservas"], reason: "Llega con semillas y herramientas propias." },
];

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 1, name: "Agua potable", category: "Esencial", pct: 8, units: 240, max: 3000, status: "CRÍTICO" },
  { id: 2, name: "Raciones de comida", category: "Esencial", pct: 23, units: 690, max: 3000, status: "BAJO" },
  { id: 3, name: "Medicamentos", category: "Médico", pct: 15, units: 150, max: 1000, status: "CRÍTICO" },
  { id: 4, name: "Munición", category: "Defensa", pct: 67, units: 2010, max: 3000, status: "OK" },
  { id: 5, name: "Baterías", category: "Energía", pct: 45, units: 360, max: 800, status: "NORMAL" },
  { id: 6, name: "Higiene", category: "Bienestar", pct: 31, units: 248, max: 800, status: "BAJO" },
  { id: 7, name: "Combustible", category: "Energía", pct: 52, units: 520, max: 1000, status: "NORMAL" },
  { id: 8, name: "Semillas", category: "Agricultura", pct: 75, units: 300, max: 400, status: "OK" },
];

const INITIAL_EXPEDITIONS: Expedition[] = [
  { id: 1, name: "EXPEDICIÓN NORTE", day: 3, total: 5, participants: ["JR", "MA", "PC", "LS", "KT"], status: "EN CURSO", objective: "Buscar suministros médicos en hospital abandonado.", sector: "Sector Norte — 12km" },
  { id: 2, name: "EXPLORACIÓN SECTOR 7", day: 0, total: 5, participants: ["DN", "AS", "FG", "JL"], status: "PROGRAMADA", objective: "Reconocimiento de rutas alternativas.", sector: "Sector Este — 8km" },
  { id: 3, name: "RETORNO GRUPO DELTA", day: 4, total: 5, participants: ["CA", "MT", "PB", "RQ", "EV"], status: "REGRESANDO", objective: "Recolección de agua y filtros.", sector: "Sector Sur — 5km" },
  { id: 4, name: "MISIÓN SUMINISTROS", day: 5, total: 5, participants: ["WN", "SK", "LR", "PR", "YU"], status: "COMPLETADA", objective: "Recuperar generadores.", sector: "Sector Oeste — 15km" },
];

const INITIAL_INTERCAMP: IntercampRequest[] = [
  { id: 1, from: "CAMPAMENTO BETA", text: "Solicita 50 raciones de comida urgente", time: "hace 2h", status: "PENDIENTE", urgent: true, type: "solicitud" },
  { id: 2, from: "CAMPAMENTO GAMMA", text: "Envía 3 personas especializadas (médicos)", time: "hace 1d", status: "APROBADO", urgent: false, type: "oferta" },
  { id: 3, from: "CAMPAMENTO DELTA", text: "Solicita 10 médicos para brote de infección", time: "hace 3h", status: "PENDIENTE", urgent: false, type: "solicitud" },
  { id: 4, from: "CAMPAMENTO BETA", text: "Traslado programado — BETA a ALFA", time: "Mañana 08:00", status: "CONFIRMADO", urgent: false, type: "traslado" },
  { id: 5, from: "CAMPAMENTO ÉPSILON", text: "Ofrece intercambio: munición por agua", time: "hace 5h", status: "PENDIENTE", urgent: false, type: "solicitud" },
];

const INITIAL_LOGS: LogEntry[] = [
  { id: 1, time: "14:32", level: "info", user: "Admin Edicson", action: "LOGIN exitoso desde 192.168.1.1" },
  { id: 2, time: "14:28", level: "info", user: "GestorRecursos_Ana", action: "INVENTARIO_EDIT — Agua potable: +50 unidades" },
  { id: 3, time: "13:55", level: "info", user: "Trabajador_Jose", action: "BODEGA_CONSULTA — Sección Médicos" },
  { id: 4, time: "13:30", level: "error", user: "Intento fallido", action: "LOGIN FALLIDO — IP: 192.168.1.45 (3 intentos)" },
  { id: 5, time: "12:00", level: "info", user: "Encargado_Viajes", action: "EXPEDICION_CREAR — Exploración Sector 7" },
  { id: 6, time: "11:45", level: "system", user: "SISTEMA", action: "CONSUMO_DIARIO_AUTO — -30 raciones, -10 agua" },
  { id: 7, time: "10:15", level: "warn", user: "SISTEMA", action: "ALERTA_INVENTARIO — Medicamentos por debajo del 20%" },
  { id: 8, time: "09:30", level: "info", user: "Admin Edicson", action: "ADMISION_APROBADA — María González" },
  { id: 9, time: "08:00", level: "system", user: "SISTEMA", action: "REPORTE_NOCTURNO_ENVIADO — Día 47 del apocalipsis" },
  { id: 10, time: "07:45", level: "warn", user: "SISTEMA", action: "ALERTA_EXPEDICION — Retorno Grupo Delta con 1h de retraso" },
];

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 1, title: "ALERTA CRÍTICA: Agua potable", body: "Stock de agua al 8%. Acción inmediata requerida.", time: "hace 30min", read: false, level: "critical" },
  { id: 2, title: "Admisión pendiente", body: "'Unnamed' con score 12 — revisión de seguridad necesaria.", time: "hace 45min", read: false, level: "critical" },
  { id: 3, title: "Expedición Norte: Día 3/5", body: "Grupo en curso sin novedades reportadas.", time: "hace 2h", read: false, level: "info" },
  { id: 4, title: "Solicitud inter-campamento urgente", body: "Campamento Beta solicita 50 raciones de comida.", time: "hace 2h", read: false, level: "warning" },
  { id: 5, title: "Medicamentos al 15%", body: "Nivel crítico. Expedición de reabastecimiento sugerida.", time: "hace 3h", read: true, level: "critical" },
  { id: 6, title: "Nuevo logro desbloqueado", body: "¡7 días sin bajas de vida completado!", time: "hace 1d", read: true, level: "info" },
  { id: 7, title: "Intento de acceso no autorizado", body: "IP 192.168.1.45 — 3 intentos fallidos. Bloqueado.", time: "hace 1h", read: false, level: "warning" },
];

const resourceTrendData = [
  { day: "D-6", food: 85, water: 72, ammo: 90 },
  { day: "D-5", food: 80, water: 68, ammo: 85 },
  { day: "D-4", food: 74, water: 55, ammo: 82 },
  { day: "D-3", food: 65, water: 40, ammo: 78 },
  { day: "D-2", food: 53, water: 25, ammo: 70 },
  { day: "D-1", food: 38, water: 15, ammo: 68 },
  { day: "HOY", food: 23, water: 8, ammo: 67 },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s < 50) return "#DC2626";
  if (s <= 75) return "#F59E0B";
  return "#0D9488";
}
function statusColor(s: string) {
  switch (s) {
    case "CRÍTICO": return "#DC2626";
    case "BAJO": return "#EA580C";
    case "OK": return "#0D9488";
    default: return "#F59E0B";
  }
}
function invBarColor(pct: number) {
  if (pct < 20) return "#DC2626";
  if (pct < 40) return "#EA580C";
  if (pct < 60) return "#F59E0B";
  return "#0D9488";
}
function expColor(s: string) {
  if (s === "EN CURSO") return "#F59E0B";
  if (s === "PROGRAMADA") return "#0D9488";
  if (s === "REGRESANDO") return "#0D9488";
  return "#4B5563";
}
function intercampColor(s: string) {
  if (s === "APROBADO" || s === "CONFIRMADO") return "#0D9488";
  if (s === "PENDIENTE") return "#F59E0B";
  if (s === "RECHAZADO") return "#DC2626";
  return "#8B8070";
}
function logLevelColor(l: string) {
  if (l === "error") return "#DC2626";
  if (l === "warn") return "#F59E0B";
  if (l === "system") return "#8B8070";
  return "#0D9488";
}
function personStatusColor(s: string) {
  if (s === "Activo") return "#0D9488";
  if (s === "Herido") return "#EA580C";
  if (s === "Enfermo") return "#DC2626";
  return "#F59E0B";
}
function notifColor(l: string) {
  if (l === "critical") return "#DC2626";
  if (l === "warning") return "#F59E0B";
  return "#0D9488";
}

// ─── SHARED UI ───────────────────────────────────────────────────────────────

function Card({ children, className = "", glow = "" }: { children: React.ReactNode; className?: string; glow?: string }) {
  return (
    <div
      className={`relative rounded-sm p-4 ${className}`}
      style={{ background: "#111114", border: `1px solid ${glow || "#2D2A24"}`, boxShadow: glow ? `0 0 12px 1px ${glow}22` : "none" }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ title, accent = true }: { title: string; accent?: boolean }) {
  return (
    <div className="mb-3">
      <h3 style={{ fontFamily: "'Share Tech Mono', monospace", color: "#F5F0E8", fontSize: 11, letterSpacing: "0.12em" }} className="uppercase">{title}</h3>
      {accent && <div style={{ height: 1, background: "linear-gradient(90deg, #D97706 0%, transparent 100%)", marginTop: 4 }} />}
    </div>
  );
}

function Toggle({ active, onChange }: { active: boolean; onChange?: () => void }) {
  return (
    <button
      onClick={onChange}
      className="relative inline-flex items-center cursor-pointer"
      style={{ width: 32, height: 16, borderRadius: 8, background: active ? "#D97706" : "#2D2A24", border: "1px solid #3D3A34", transition: "background 0.2s" }}
    >
      <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#F5F0E8", position: "absolute", left: active ? 16 : 2, transition: "left 0.2s" }} />
    </button>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="px-1.5 py-0.5 rounded-sm"
      style={{ background: `${color}22`, border: `1px solid ${color}`, fontFamily: "'Share Tech Mono', monospace", fontSize: 7, color }}>
      {label}
    </span>
  );
}

function SearchBar({ value, onChange, placeholder = "BUSCAR..." }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm" style={{ background: "#0D0D10", border: "1px solid #2D2A24", flex: 1 }}>
      <Search size={11} style={{ color: "#4B4540" }} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none"
        style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#F5F0E8" }}
      />
    </div>
  );
}

function ActionBtn({ label, color, onClick, small = false }: { label: string; color: string; onClick?: () => void; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-1 rounded-sm hover:opacity-80 transition-opacity cursor-pointer"
      style={{ background: `${color}22`, border: `1px solid ${color}`, fontFamily: "'Share Tech Mono', monospace", fontSize: small ? 7 : 9, color }}
    >
      {label}
    </button>
  );
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.7)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-lg rounded-sm p-5"
          style={{ background: "#111114", border: "1px solid #D97706", boxShadow: "0 0 30px #D9770622", maxHeight: "90vh", overflowY: "auto" }}
        >
          <div className="flex items-center justify-between mb-4" style={{ borderBottom: "1px solid #2D2A24", paddingBottom: 12 }}>
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#F59E0B", letterSpacing: "0.1em" }}>{title}</span>
            <button onClick={onClose} className="hover:opacity-60 transition-opacity"><X size={14} style={{ color: "#8B8070" }} /></button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function DonutCenter({ cx, cy, total }: { cx?: number; cy?: number; total: number }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-8" style={{ fontFamily: "'Orbitron', monospace", fill: "#F5F0E8", fontSize: 22, fontWeight: 900 }}>{total}</tspan>
      <tspan x={cx} dy="18" style={{ fontFamily: "'Share Tech Mono', monospace", fill: "#8B8070", fontSize: 9 }}>TOTAL</tspan>
    </text>
  );
}

// ─── SECTION VIEWS ───────────────────────────────────────────────────────────

function ViewPoblacion() {
  const [persons, setPersons] = useState<Person[]>(INITIAL_PERSONS);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [selected, setSelected] = useState<Person | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Person>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newPerson, setNewPerson] = useState<Partial<Person>>({ name: "", role: "", status: "Activo", age: 0, sector: "", joined: `D-47` });

  const statuses = ["Todos", "Activo", "Herido", "Enfermo", "Fuera"];
  const filtered = persons.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.role.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "Todos" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    Activo: persons.filter(p => p.status === "Activo").length,
    Herido: persons.filter(p => p.status === "Herido").length,
    Enfermo: persons.filter(p => p.status === "Enfermo").length,
    Fuera: persons.filter(p => p.status === "Fuera").length,
  };

  const handleSaveEdit = () => {
    if (!selected) return;
    setPersons(prev => prev.map(p => p.id === selected.id ? { ...p, ...editData } : p));
    setSelected(prev => prev ? { ...prev, ...editData } as Person : null);
    setEditMode(false);
  };

  const handleDelete = (id: number) => {
    setPersons(prev => prev.filter(p => p.id !== id));
    setSelected(null);
  };

  const handleAdd = () => {
    if (!newPerson.name) return;
    const id = Math.max(...persons.map(p => p.id)) + 1;
    setPersons(prev => [...prev, { ...newPerson, id } as Person]);
    setNewPerson({ name: "", role: "", status: "Activo", age: 0, sector: "", joined: "D-47" });
    setShowAdd(false);
  };

  return (
    <div>
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {Object.entries(counts).map(([k, v]) => (
          <Card key={k}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 24, fontWeight: 900, color: personStatusColor(k) }}>{v}</div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, color: "#8B8070", letterSpacing: "0.1em" }}>{k.toUpperCase()}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <SectionHeader title={`REGISTRO DE POBLACIÓN — ${persons.length} PERSONAS`} accent={false} />
          <div className="flex-1" />
          <SearchBar value={search} onChange={setSearch} placeholder="BUSCAR PERSONA..." />
          <div className="flex gap-1">
            {statuses.map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className="px-2 py-1 rounded-sm cursor-pointer transition-opacity hover:opacity-80"
                style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, background: filterStatus === s ? "#D97706" : "#1A1A20", color: filterStatus === s ? "#0A0A0B" : "#8B8070", border: "1px solid #2D2A24" }}>
                {s}
              </button>
            ))}
          </div>
          <ActionBtn label="+ AGREGAR" color="#0D9488" onClick={() => setShowAdd(true)} />
        </div>
        <div style={{ height: 1, background: "linear-gradient(90deg, #D97706 0%, transparent 100%)", marginBottom: 12 }} />

        {/* Table */}
        <div className="grid gap-px" style={{ background: "#2D2A24" }}>
          {/* Header */}
          <div className="grid grid-cols-12 px-3 py-2" style={{ background: "#0D0D10" }}>
            {["NOMBRE", "ROL", "ESTADO", "EDAD", "SECTOR", "INGRESO", "ACC."].map((h, i) => (
              <div key={h} className={i === 0 ? "col-span-3" : i === 1 ? "col-span-2" : i === 2 ? "col-span-2" : i === 3 ? "col-span-1" : i === 4 ? "col-span-2" : i === 5 ? "col-span-1" : "col-span-1"}>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#4B4540", letterSpacing: "0.08em" }}>{h}</span>
              </div>
            ))}
          </div>
          {filtered.map(p => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-12 items-center px-3 py-2 cursor-pointer hover:opacity-90 transition-opacity"
              style={{ background: selected?.id === p.id ? "#1A1A20" : "#111114" }}
              onClick={() => { setSelected(p); setEditMode(false); setEditData({}); }}
            >
              <div className="col-span-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-sm flex items-center justify-center flex-shrink-0"
                  style={{ background: "#1A1A20", fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#8B8070", border: "1px solid #2D2A24" }}>
                  {p.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 600, color: "#F5F0E8" }}>{p.name}</span>
              </div>
              <div className="col-span-2"><span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: "#8B8070" }}>{p.role}</span></div>
              <div className="col-span-2"><Badge label={p.status} color={personStatusColor(p.status)} /></div>
              <div className="col-span-1"><span style={{ fontFamily: "'Orbitron', monospace", fontSize: 10, color: "#F5F0E8" }}>{p.age}</span></div>
              <div className="col-span-2"><span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>{p.sector}</span></div>
              <div className="col-span-1"><span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#4B4540" }}>{p.joined}</span></div>
              <div className="col-span-1 flex gap-1">
                <button onClick={e => { e.stopPropagation(); setSelected(p); setEditMode(true); setEditData(p); }} className="hover:opacity-80"><Edit2 size={11} style={{ color: "#D97706" }} /></button>
                <button onClick={e => { e.stopPropagation(); handleDelete(p.id); }} className="hover:opacity-80"><Trash2 size={11} style={{ color: "#DC2626" }} /></button>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Detail/Edit panel */}
      <Modal open={!!selected} onClose={() => { setSelected(null); setEditMode(false); }} title={editMode ? "EDITAR PERSONA" : "FICHA INDIVIDUAL"}>
        {selected && (
          <div className="flex flex-col gap-3">
            {editMode ? (
              <>
                {[
                  { label: "NOMBRE", key: "name" },
                  { label: "ROL", key: "role" },
                  { label: "SECTOR", key: "sector" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>{label}</label>
                    <input
                      value={(editData as any)[key] ?? ""}
                      onChange={e => setEditData(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
                      style={{ background: "#0D0D10", border: "1px solid #2D2A24", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#F5F0E8" }}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>ESTADO</label>
                  <select
                    value={(editData.status as string) ?? selected.status}
                    onChange={e => setEditData(prev => ({ ...prev, status: e.target.value as Person["status"] }))}
                    className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
                    style={{ background: "#0D0D10", border: "1px solid #2D2A24", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#F5F0E8" }}
                  >
                    {["Activo", "Herido", "Enfermo", "Fuera"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 mt-2">
                  <ActionBtn label="GUARDAR" color="#0D9488" onClick={handleSaveEdit} />
                  <ActionBtn label="CANCELAR" color="#8B8070" onClick={() => setEditMode(false)} />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-sm flex items-center justify-center" style={{ background: "#1A1A20", border: "1px solid #2D2A24" }}>
                    <User size={24} style={{ color: "#D97706" }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: "#F5F0E8" }}>{selected.name}</div>
                    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>{selected.role} — {selected.sector}</div>
                  </div>
                  <Badge label={selected.status} color={personStatusColor(selected.status)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "EDAD", value: `${selected.age} años` },
                    { label: "INGRESO", value: selected.joined },
                    { label: "SECTOR", value: selected.sector },
                    { label: "ESTADO", value: selected.status },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-2 rounded-sm" style={{ background: "#0D0D10", border: "1px solid #2D2A24" }}>
                      <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#4B4540" }}>{label}</div>
                      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, color: "#F5F0E8", fontWeight: 600 }}>{value}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-1">
                  <ActionBtn label="EDITAR" color="#D97706" onClick={() => { setEditMode(true); setEditData(selected); }} />
                  <ActionBtn label="ELIMINAR REGISTRO" color="#DC2626" onClick={() => handleDelete(selected.id)} />
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Add person modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="AGREGAR PERSONA">
        <div className="flex flex-col gap-3">
          {[
            { label: "NOMBRE COMPLETO", key: "name" },
            { label: "ROL / PROFESIÓN", key: "role" },
            { label: "SECTOR ASIGNADO", key: "sector" },
          ].map(({ label, key }) => (
            <div key={key}>
              <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>{label}</label>
              <input
                value={(newPerson as any)[key] ?? ""}
                onChange={e => setNewPerson(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
                style={{ background: "#0D0D10", border: "1px solid #2D2A24", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#F5F0E8" }}
              />
            </div>
          ))}
          <div>
            <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>EDAD</label>
            <input
              type="number"
              value={newPerson.age ?? 0}
              onChange={e => setNewPerson(prev => ({ ...prev, age: Number(e.target.value) }))}
              className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
              style={{ background: "#0D0D10", border: "1px solid #2D2A24", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#F5F0E8" }}
            />
          </div>
          <div>
            <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>ESTADO INICIAL</label>
            <select
              value={newPerson.status ?? "Activo"}
              onChange={e => setNewPerson(prev => ({ ...prev, status: e.target.value as Person["status"] }))}
              className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
              style={{ background: "#0D0D10", border: "1px solid #2D2A24", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#F5F0E8" }}
            >
              {["Activo", "Herido", "Enfermo", "Fuera"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <ActionBtn label="REGISTRAR PERSONA" color="#0D9488" onClick={handleAdd} />
        </div>
      </Modal>
    </div>
  );
}

function ViewAdmisiones() {
  const [admissions, setAdmissions] = useState<Admission[]>(INITIAL_ADMISSIONS);
  const [selected, setSelected] = useState<Admission | null>(null);
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null);

  const showToast = (msg: string, color: string) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2500);
  };

  const handleApprove = (id: number) => {
    setAdmissions(prev => prev.map(a => a.id === id ? { ...a, status: "approved" } : a));
    setSelected(null);
    showToast("ADMISIÓN APROBADA — Persona añadida al registro.", "#0D9488");
  };

  const handleReject = (id: number) => {
    setAdmissions(prev => prev.map(a => a.id === id ? { ...a, status: "rejected" } : a));
    setSelected(null);
    showToast("ADMISIÓN RECHAZADA — Persona bloqueada.", "#DC2626");
  };

  const pending = admissions.filter(a => a.status === "pending");
  const resolved = admissions.filter(a => a.status !== "pending");

  return (
    <div className="flex flex-col gap-4">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 right-4 z-50 px-4 py-2 rounded-sm"
            style={{ background: toast.color, fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#F5F0E8" }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "PENDIENTES", value: pending.length, color: "#F59E0B" },
          { label: "APROBADAS HOY", value: resolved.filter(a => a.status === "approved").length, color: "#0D9488" },
          { label: "RECHAZADAS HOY", value: resolved.filter(a => a.status === "rejected").length, color: "#DC2626" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 28, fontWeight: 900, color }}>{value}</div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, color: "#8B8070", letterSpacing: "0.1em" }}>{label}</div>
          </Card>
        ))}
      </div>

      {/* Pending */}
      <Card glow="#D97706">
        <div className="flex items-center justify-between mb-3">
          <SectionHeader title="SOLICITUDES PENDIENTES — EVALUACION IA" accent={false} />
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#4B4540" }}>Modelo: admission-v1 | Precisión: 89%</span>
        </div>
        <div style={{ height: 1, background: "linear-gradient(90deg, #D97706 0%, transparent 100%)", marginBottom: 12 }} />
        <div className="flex flex-col gap-3">
          {pending.map((a) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-3 rounded-sm"
              style={{ background: "#0D0D10", border: `1px solid ${a.score < 50 ? "#DC262655" : "#2D2A24"}` }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-sm flex items-center justify-center" style={{ background: "#1A1A20", border: "1px solid #2D2A24" }}>
                    <User size={16} style={{ color: "#D97706" }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, fontWeight: 700, color: a.score < 50 ? "#DC2626" : "#F5F0E8" }}>{a.name}</span>
                      {a.badge && <Badge label={a.badge} color="#DC2626" />}
                    </div>
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>{a.profession}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 20, fontWeight: 900, color: scoreColor(a.score) }}>{a.score}</div>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 7, color: "#4B4540" }}>SCORE IA /100</div>
                </div>
              </div>
              {/* Score bar */}
              <div className="h-1.5 rounded-sm overflow-hidden mb-2" style={{ background: "#2D2A24" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${a.score}%` }} transition={{ duration: 0.8 }}
                  style={{ height: "100%", background: scoreColor(a.score), borderRadius: 2 }} />
              </div>
              <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: "#8B8070", marginBottom: 8 }}>{a.reason}</p>
              {a.skills.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-2">
                  {a.skills.map(s => <Badge key={s} label={s} color="#D97706" />)}
                </div>
              )}
              <div className="flex gap-2 items-center">
                <ActionBtn label="VER DETALLE" color="#8B8070" small onClick={() => setSelected(a)} />
                <ActionBtn label="APROBAR" color="#0D9488" small onClick={() => handleApprove(a.id)} />
                <ActionBtn label="RECHAZAR" color="#DC2626" small onClick={() => handleReject(a.id)} />
              </div>
            </motion.div>
          ))}
          {pending.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle size={32} style={{ color: "#0D9488", margin: "0 auto 8px" }} />
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#8B8070" }}>SIN PENDIENTES — COLA LIMPIA</div>
            </div>
          )}
        </div>
      </Card>

      {/* Resolved */}
      {resolved.length > 0 && (
        <Card>
          <SectionHeader title="PROCESADAS RECIENTEMENTE" />
          <div className="flex flex-col gap-2">
            {resolved.map(a => (
              <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-sm"
                style={{ background: "#0D0D10", border: "1px solid #2D2A24" }}>
                <div className="flex items-center gap-2">
                  {a.status === "approved" ? <CheckCircle size={12} style={{ color: "#0D9488" }} /> : <XCircle size={12} style={{ color: "#DC2626" }} />}
                  <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#F5F0E8" }}>{a.name}</span>
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#8B8070" }}>{a.profession}</span>
                </div>
                <Badge label={a.status === "approved" ? "APROBADO" : "RECHAZADO"} color={a.status === "approved" ? "#0D9488" : "#DC2626"} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="REPORTE DETALLADO — IA">
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-sm flex items-center justify-center" style={{ background: "#1A1A20", border: "1px solid #2D2A24" }}>
                <User size={24} style={{ color: "#D97706" }} />
              </div>
              <div>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: "#F5F0E8" }}>{selected.name}</div>
                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>{selected.profession}</div>
              </div>
            </div>
            <div className="p-3 rounded-sm" style={{ background: "#0D0D10", border: "1px solid #2D2A24" }}>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#D97706", marginBottom: 4 }}>EVALUACIÓN IA</div>
              <div className="flex items-end gap-2 mb-2">
                <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 36, fontWeight: 900, color: scoreColor(selected.score) }}>{selected.score}</span>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#8B8070", marginBottom: 6 }}>/100</span>
              </div>
              <div className="h-2 rounded-sm overflow-hidden" style={{ background: "#2D2A24" }}>
                <div style={{ width: `${selected.score}%`, height: "100%", background: scoreColor(selected.score) }} />
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#4B4540", marginBottom: 6 }}>RAZÓN DE LLEGADA</div>
              <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#F5F0E8" }}>{selected.reason}</p>
            </div>
            {selected.skills.length > 0 && (
              <div>
                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#4B4540", marginBottom: 6 }}>HABILIDADES VERIFICADAS</div>
                <div className="flex gap-1 flex-wrap">
                  {selected.skills.map(s => <Badge key={s} label={s} color="#D97706" />)}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <ActionBtn label="APROBAR ADMISIÓN" color="#0D9488" onClick={() => handleApprove(selected.id)} />
              <ActionBtn label="RECHAZAR" color="#DC2626" onClick={() => handleReject(selected.id)} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ViewInventario() {
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [editUnits, setEditUnits] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({ name: "", category: "Esencial", units: 0, max: 100 });
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null);

  const showToast = (msg: string, color: string) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2500);
  };

  const computeStatus = (pct: number): InventoryItem["status"] => {
    if (pct < 20) return "CRÍTICO";
    if (pct < 40) return "BAJO";
    if (pct < 70) return "NORMAL";
    return "OK";
  };

  const handleSaveEdit = () => {
    if (!editing) return;
    const pct = Math.round((editUnits / editing.max) * 100);
    setItems(prev => prev.map(i => i.id === editing.id ? { ...i, units: editUnits, pct, status: computeStatus(pct) } : i));
    setEditing(null);
    showToast("INVENTARIO ACTUALIZADO", "#0D9488");
  };

  const handleDelete = (id: number) => {
    setItems(prev => prev.filter(i => i.id !== id));
    showToast("ÍTEM ELIMINADO", "#DC2626");
  };

  const handleAdd = () => {
    if (!newItem.name || !newItem.units || !newItem.max) return;
    const pct = Math.round((newItem.units! / newItem.max!) * 100);
    const id = Math.max(...items.map(i => i.id)) + 1;
    setItems(prev => [...prev, { ...newItem, id, pct, status: computeStatus(pct) } as InventoryItem]);
    setNewItem({ name: "", category: "Esencial", units: 0, max: 100 });
    setShowAdd(false);
    showToast("ÍTEM AGREGADO", "#0D9488");
  };

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()));
  const categories = [...new Set(items.map(i => i.category))];

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-16 right-4 z-50 px-4 py-2 rounded-sm"
            style={{ background: toast.color, fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#F5F0E8" }}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category summary */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
        {categories.map(cat => {
          const catItems = items.filter(i => i.category === cat);
          const avgPct = Math.round(catItems.reduce((a, b) => a + b.pct, 0) / catItems.length);
          return (
            <Card key={cat}>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 900, color: invBarColor(avgPct) }}>{avgPct}%</div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#8B8070" }}>{cat.toUpperCase()}</div>
              <div className="h-1 rounded-sm overflow-hidden mt-1" style={{ background: "#2D2A24" }}>
                <div style={{ width: `${avgPct}%`, height: "100%", background: invBarColor(avgPct) }} />
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <SectionHeader title="BODEGA COMPLETA" accent={false} />
          <div className="flex-1" />
          <SearchBar value={search} onChange={setSearch} placeholder="BUSCAR RECURSO..." />
          <ActionBtn label="+ AGREGAR ÍTEM" color="#0D9488" onClick={() => setShowAdd(true)} />
        </div>
        <div style={{ height: 1, background: "linear-gradient(90deg, #D97706 0%, transparent 100%)", marginBottom: 12 }} />

        <div className="flex flex-col gap-2">
          {filtered.map(item => {
            const isEditing = editing?.id === item.id;
            const bcolor = invBarColor(item.pct);
            return (
              <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-3 rounded-sm" style={{ background: "#0D0D10", border: `1px solid ${item.status === "CRÍTICO" ? "#DC262644" : "#2D2A24"}` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, fontWeight: 600, color: "#F5F0E8" }}>{item.name}</span>
                    <Badge label={item.category} color="#8B8070" />
                    <Badge label={item.status} color={statusColor(item.status)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 16, fontWeight: 900, color: bcolor }}>{item.pct}%</span>
                    <button onClick={() => { setEditing(item); setEditUnits(item.units); }} className="hover:opacity-80"><Edit2 size={11} style={{ color: "#D97706" }} /></button>
                    <button onClick={() => handleDelete(item.id)} className="hover:opacity-80"><Trash2 size={11} style={{ color: "#DC2626" }} /></button>
                  </div>
                </div>
                {isEditing ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#8B8070" }}>UNIDADES:</span>
                    <input
                      type="number"
                      value={editUnits}
                      onChange={e => setEditUnits(Number(e.target.value))}
                      className="px-2 py-1 rounded-sm outline-none w-24"
                      style={{ background: "#1A1A20", border: "1px solid #D97706", fontFamily: "'Orbitron', monospace", fontSize: 11, color: "#F5F0E8" }}
                    />
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#4B4540" }}>/ {item.max} max</span>
                    <ActionBtn label="GUARDAR" color="#0D9488" small onClick={handleSaveEdit} />
                    <ActionBtn label="CANCELAR" color="#8B8070" small onClick={() => setEditing(null)} />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-sm overflow-hidden" style={{ background: "#2D2A24" }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${item.pct}%` }} transition={{ duration: 0.6 }}
                        className={item.status === "CRÍTICO" ? "animate-pulse" : ""}
                        style={{ height: "100%", background: bcolor, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070", whiteSpace: "nowrap" }}>
                      {item.units} / {item.max} unidades
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* Add item modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="AGREGAR ÍTEM AL INVENTARIO">
        <div className="flex flex-col gap-3">
          {[
            { label: "NOMBRE DEL RECURSO", key: "name" },
          ].map(({ label, key }) => (
            <div key={key}>
              <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>{label}</label>
              <input value={(newItem as any)[key] ?? ""} onChange={e => setNewItem(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
                style={{ background: "#0D0D10", border: "1px solid #2D2A24", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#F5F0E8" }} />
            </div>
          ))}
          <div>
            <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>CATEGORÍA</label>
            <select value={newItem.category ?? "Esencial"} onChange={e => setNewItem(prev => ({ ...prev, category: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
              style={{ background: "#0D0D10", border: "1px solid #2D2A24", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#F5F0E8" }}>
              {["Esencial", "Médico", "Defensa", "Energía", "Bienestar", "Agricultura"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "UNIDADES ACTUALES", key: "units" },
              { label: "CAPACIDAD MÁXIMA", key: "max" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>{label}</label>
                <input type="number" value={(newItem as any)[key] ?? 0} onChange={e => setNewItem(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                  className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
                  style={{ background: "#0D0D10", border: "1px solid #2D2A24", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#F5F0E8" }} />
              </div>
            ))}
          </div>
          <ActionBtn label="AGREGAR AL INVENTARIO" color="#0D9488" onClick={handleAdd} />
        </div>
      </Modal>
    </div>
  );
}

function ViewExpediciones() {
  const [expeditions, setExpeditions] = useState<Expedition[]>(INITIAL_EXPEDITIONS);
  const [, setSelected] = useState<Expedition | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newExp, setNewExp] = useState<Partial<Expedition>>({ name: "", objective: "", sector: "", total: 5, participants: [], status: "PROGRAMADA" });
  const [participantInput, setParticipantInput] = useState("");
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null);

  const showToast = (msg: string, color: string) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2500);
  };

  const handleCreate = () => {
    if (!newExp.name) return;
    const id = Math.max(...expeditions.map(e => e.id)) + 1;
    setExpeditions(prev => [...prev, { ...newExp, id, day: 0 } as Expedition]);
    setShowCreate(false);
    setNewExp({ name: "", objective: "", sector: "", total: 5, participants: [], status: "PROGRAMADA" });
    showToast("EXPEDICIÓN CREADA", "#0D9488");
  };

  const handleAdvanceDay = (id: number) => {
    setExpeditions(prev => prev.map(e => {
      if (e.id !== id) return e;
      const newDay = e.day + 1;
      const newStatus = newDay >= e.total ? "REGRESANDO" : e.status;
      return { ...e, day: newDay, status: newStatus };
    }));
  };

  const handleComplete = (id: number) => {
    setExpeditions(prev => prev.map(e => e.id === id ? { ...e, status: "COMPLETADA" } : e));
    setSelected(null);
    showToast("EXPEDICIÓN MARCADA COMO COMPLETADA", "#0D9488");
  };

  const addParticipant = () => {
    if (!participantInput) return;
    setNewExp(prev => ({ ...prev, participants: [...(prev.participants ?? []), participantInput.toUpperCase().slice(0, 2)] }));
    setParticipantInput("");
  };

  const active = expeditions.filter(e => e.status === "EN CURSO" || e.status === "REGRESANDO");
  const scheduled = expeditions.filter(e => e.status === "PROGRAMADA");
  const completed = expeditions.filter(e => e.status === "COMPLETADA");

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-16 right-4 z-50 px-4 py-2 rounded-sm"
            style={{ background: toast.color, fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#F5F0E8" }}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "EN CURSO", value: active.length, color: "#F59E0B" },
          { label: "PROGRAMADAS", value: scheduled.length, color: "#0D9488" },
          { label: "COMPLETADAS", value: completed.length, color: "#4B5563" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 28, fontWeight: 900, color }}>{value}</div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, color: "#8B8070", letterSpacing: "0.1em" }}>{label}</div>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <ActionBtn label="+ NUEVA EXPEDICIÓN" color="#D97706" onClick={() => setShowCreate(true)} />
      </div>

      {/* Expedition list */}
      <div className="flex flex-col gap-3">
        {expeditions.map(exp => {
          const pct = exp.total > 0 ? Math.round((exp.day / exp.total) * 100) : 0;
          const sc = expColor(exp.status);
          return (
            <Card key={exp.id} className="cursor-pointer hover:opacity-90 transition-opacity" glow={exp.status === "EN CURSO" ? "#D97706" : ""}>
              <div onClick={() => setSelected(exp)}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Map size={12} style={{ color: sc }} />
                      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#F5F0E8" }}>{exp.name}</span>
                    </div>
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: "#8B8070" }}>{exp.sector}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge label={exp.status} color={sc} />
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: sc }}>DÍA {exp.day}/{exp.total}</span>
                  </div>
                </div>
                <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: "#8B8070", marginBottom: 8 }}>{exp.objective}</p>
                {exp.total > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-1.5 rounded-sm overflow-hidden" style={{ background: "#2D2A24" }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
                        style={{ height: "100%", background: sc, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#4B4540" }}>{pct}%</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  {exp.participants.slice(0, 6).map((p, i) => (
                    <div key={i} className="w-6 h-6 rounded-sm flex items-center justify-center flex-shrink-0"
                      style={{ background: "#1A1A20", border: "1px solid #2D2A24", fontFamily: "'Share Tech Mono', monospace", fontSize: 7, color: "#8B8070" }}>
                      {p}
                    </div>
                  ))}
                  {exp.participants.length > 6 && (
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#4B4540" }}>+{exp.participants.length - 6}</span>
                  )}
                </div>
              </div>
              {exp.status !== "COMPLETADA" && (
                <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: "1px solid #2D2A24" }}>
                  <ActionBtn label="+ AVANZAR DÍA" color="#D97706" small onClick={() => handleAdvanceDay(exp.id)} />
                  <ActionBtn label="MARCAR COMPLETADA" color="#0D9488" small onClick={() => handleComplete(exp.id)} />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="CREAR NUEVA EXPEDICIÓN">
        <div className="flex flex-col gap-3">
          {[
            { label: "NOMBRE DE LA MISIÓN", key: "name" },
            { label: "OBJETIVO", key: "objective" },
            { label: "SECTOR / DISTANCIA", key: "sector" },
          ].map(({ label, key }) => (
            <div key={key}>
              <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>{label}</label>
              <input value={(newExp as any)[key] ?? ""} onChange={e => setNewExp(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
                style={{ background: "#0D0D10", border: "1px solid #2D2A24", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#F5F0E8" }} />
            </div>
          ))}
          <div>
            <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>DURACIÓN ESTIMADA (DÍAS)</label>
            <input type="number" value={newExp.total ?? 5} onChange={e => setNewExp(prev => ({ ...prev, total: Number(e.target.value) }))}
              className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
              style={{ background: "#0D0D10", border: "1px solid #2D2A24", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#F5F0E8" }} />
          </div>
          <div>
            <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>PARTICIPANTES (INICIALES)</label>
            <div className="flex gap-2 mt-1">
              <input value={participantInput} onChange={e => setParticipantInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addParticipant()}
                placeholder="ej. JR" className="flex-1 px-3 py-2 rounded-sm outline-none"
                style={{ background: "#0D0D10", border: "1px solid #2D2A24", fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#F5F0E8" }} />
              <ActionBtn label="AGREGAR" color="#D97706" onClick={addParticipant} />
            </div>
            <div className="flex gap-1 flex-wrap mt-2">
              {(newExp.participants ?? []).map((p, i) => (
                <button key={i} onClick={() => setNewExp(prev => ({ ...prev, participants: prev.participants?.filter((_, j) => j !== i) }))}
                  className="px-1.5 py-0.5 rounded-sm hover:opacity-60"
                  style={{ background: "#1A1A20", border: "1px solid #2D2A24", fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#8B8070" }}>
                  {p} x
                </button>
              ))}
            </div>
          </div>
          <ActionBtn label="LANZAR EXPEDICIÓN" color="#D97706" onClick={handleCreate} />
        </div>
      </Modal>
    </div>
  );
}

function ViewIntercamp() {
  const [requests, setRequests] = useState<IntercampRequest[]>(INITIAL_INTERCAMP);
  const [showSend, setShowSend] = useState(false);
  const [newReq, setNewReq] = useState({ to: "", text: "", type: "solicitud" });
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null);

  const showToast = (msg: string, color: string) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2500);
  };

  const handleApprove = (id: number) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "APROBADO" } : r));
    showToast("SOLICITUD APROBADA", "#0D9488");
  };

  const handleReject = (id: number) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "RECHAZADO" } : r));
    showToast("SOLICITUD RECHAZADA", "#DC2626");
  };

  const handleSend = () => {
    if (!newReq.to || !newReq.text) return;
    const id = Math.max(...requests.map(r => r.id)) + 1;
    setRequests(prev => [...prev, {
      id, from: "CAMPAMENTO ALFA", text: `→ ${newReq.to}: ${newReq.text}`,
      time: "ahora", status: "CONFIRMADO", urgent: false, type: newReq.type as IntercampRequest["type"]
    }]);
    setShowSend(false);
    setNewReq({ to: "", text: "", type: "solicitud" });
    showToast("MENSAJE ENVIADO", "#0D9488");
  };

  const pending = requests.filter(r => r.status === "PENDIENTE");
  const others = requests.filter(r => r.status !== "PENDIENTE");

  const campsList = ["CAMPAMENTO BETA", "CAMPAMENTO GAMMA", "CAMPAMENTO DELTA", "CAMPAMENTO ÉPSILON"];

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-16 right-4 z-50 px-4 py-2 rounded-sm"
            style={{ background: toast.color, fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#F5F0E8" }}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "PENDIENTES", value: pending.length, color: "#F59E0B" },
          { label: "APROBADAS", value: requests.filter(r => r.status === "APROBADO").length, color: "#0D9488" },
          { label: "CAMPAMENTOS", value: campsList.length, color: "#8B8070" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 28, fontWeight: 900, color }}>{value}</div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, color: "#8B8070", letterSpacing: "0.1em" }}>{label}</div>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <ActionBtn label="+ ENVIAR MENSAJE" color="#0D9488" onClick={() => setShowSend(true)} />
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <Card glow="#EA580C">
          <SectionHeader title="SOLICITUDES PENDIENTES — ACCIÓN REQUERIDA" />
          <div className="flex flex-col gap-2">
            {pending.map(req => (
              <motion.div key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-3 rounded-sm" style={{ background: "#0D0D10", border: `1px solid ${req.urgent ? "#DC262655" : "#2D2A24"}` }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Radio size={11} style={{ color: "#EA580C" }} />
                      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#EA580C" }}>{req.from}</span>
                      {req.urgent && <Badge label="URGENTE" color="#DC2626" />}
                    </div>
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#F5F0E8" }}>{req.text}</span>
                  </div>
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#4B4540", whiteSpace: "nowrap" }}>{req.time}</span>
                </div>
                <div className="flex gap-2">
                  <ActionBtn label="APROBAR" color="#0D9488" small onClick={() => handleApprove(req.id)} />
                  <ActionBtn label="RECHAZAR" color="#DC2626" small onClick={() => handleReject(req.id)} />
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* History */}
      <Card>
        <SectionHeader title="HISTORIAL DE COMUNICACIONES" />
        <div className="flex flex-col gap-2">
          {others.map(req => {
            const sc = intercampColor(req.status);
            return (
              <div key={req.id} className="p-3 rounded-sm" style={{ background: "#0D0D10", border: "1px solid #2D2A24" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Radio size={10} style={{ color: "#4B4540" }} />
                      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>{req.from}</span>
                      <Badge label={req.type.toUpperCase()} color="#4B4540" />
                    </div>
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: "#F5F0E8" }}>{req.text}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge label={req.status} color={sc} />
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 7, color: "#4B4540" }}>{req.time}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Send message modal */}
      <Modal open={showSend} onClose={() => setShowSend(false)} title="ENVIAR MENSAJE INTER-CAMPAMENTO">
        <div className="flex flex-col gap-3">
          <div>
            <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>DESTINATARIO</label>
            <select value={newReq.to} onChange={e => setNewReq(prev => ({ ...prev, to: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
              style={{ background: "#0D0D10", border: "1px solid #2D2A24", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#F5F0E8" }}>
              <option value="">-- SELECCIONAR --</option>
              {campsList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>TIPO</label>
            <select value={newReq.type} onChange={e => setNewReq(prev => ({ ...prev, type: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
              style={{ background: "#0D0D10", border: "1px solid #2D2A24", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#F5F0E8" }}>
              <option value="solicitud">SOLICITUD</option>
              <option value="oferta">OFERTA</option>
              <option value="traslado">TRASLADO</option>
            </select>
          </div>
          <div>
            <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>MENSAJE</label>
            <textarea value={newReq.text} onChange={e => setNewReq(prev => ({ ...prev, text: e.target.value }))} rows={3}
              className="w-full mt-1 px-3 py-2 rounded-sm outline-none resize-none"
              style={{ background: "#0D0D10", border: "1px solid #2D2A24", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#F5F0E8" }} />
          </div>
          <ActionBtn label="ENVIAR MENSAJE" color="#0D9488" onClick={handleSend} />
        </div>
      </Modal>
    </div>
  );
}

function ViewSeguridad() {
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [filterLevel, setFilterLevel] = useState("todos");
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => {
      const now = new Date().toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      const systemEvents = [
        "HEARTBEAT — Servidor activo",
        "SESION_CHECK — Sin anomalías",
        "PERIMETRO_OK — Sensores normales",
      ];
      const newLog: LogEntry = {
        id: Date.now(),
        time: now,
        level: "system",
        user: "SISTEMA",
        action: systemEvents[Math.floor(Math.random() * systemEvents.length)],
      };
      setLogs(prev => [newLog, ...prev.slice(0, 24)]);
    }, 8000);
    return () => clearInterval(t);
  }, [autoRefresh]);

  const levels = ["todos", "info", "warn", "error", "system"];
  const filtered = logs.filter(l => {
    const matchLevel = filterLevel === "todos" || l.level === filterLevel;
    const matchSearch = l.user.toLowerCase().includes(search.toLowerCase()) || l.action.toLowerCase().includes(search.toLowerCase());
    return matchLevel && matchSearch;
  });

  const counts = {
    error: logs.filter(l => l.level === "error").length,
    warn: logs.filter(l => l.level === "warn").length,
    info: logs.filter(l => l.level === "info").length,
    system: logs.filter(l => l.level === "system").length,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(counts).map(([k, v]) => (
          <Card key={k}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 24, fontWeight: 900, color: logLevelColor(k) }}>{v}</div>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#8B8070" }}>{k.toUpperCase()}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <SectionHeader title="REGISTRO DE ACCESO Y ACTIVIDAD" accent={false} />
          <div className="flex-1" />
          <SearchBar value={search} onChange={setSearch} placeholder="BUSCAR EN LOGS..." />
          <div className="flex gap-1">
            {levels.map(l => (
              <button key={l} onClick={() => setFilterLevel(l)}
                className="px-2 py-1 rounded-sm cursor-pointer transition-opacity hover:opacity-80"
                style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, background: filterLevel === l ? logLevelColor(l) : "#1A1A20", color: filterLevel === l ? "#0A0A0B" : "#8B8070", border: "1px solid #2D2A24" }}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#4B4540" }}>AUTO-REFRESH</span>
            <Toggle active={autoRefresh} onChange={() => setAutoRefresh(prev => !prev)} />
          </div>
        </div>
        <div style={{ height: 1, background: "linear-gradient(90deg, #D97706 0%, transparent 100%)", marginBottom: 12 }} />

        {autoRefresh && (
          <div className="flex items-center gap-1.5 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#0D9488" }}>MONITOREANDO EN TIEMPO REAL</span>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <AnimatePresence initial={false}>
            {filtered.map(log => {
              const lc = logLevelColor(log.level);
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-3 px-3 py-2 rounded-sm"
                  style={{ background: "#0D0D10", borderLeft: `2px solid ${lc}` }}
                >
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#4B4540", flexShrink: 0, paddingTop: 2 }}>[{log.time}]</span>
                  <span className="px-1.5 py-0.5 rounded-sm flex-shrink-0"
                    style={{ background: `${lc}22`, fontFamily: "'Share Tech Mono', monospace", fontSize: 7, color: lc }}>
                    {log.level.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: "#F5F0E8" }}>{log.user}</span>
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070", marginLeft: 8 }}>— {log.action}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}

function ViewLogros() {
  const achievements = [
    { name: "PRIMER MES", desc: "Sobrevivimos 30 días", unlocked: true, pct: 100, color: "#0D9488", xp: 500, category: "Supervivencia" },
    { name: "SIN BAJAS", desc: "7 días sin pérdidas de vida", unlocked: true, pct: 100, color: "#F59E0B", xp: 300, category: "Bienestar" },
    { name: "EQUIPO MÉDICO COMPLETO", desc: "5/5 médicos activos", unlocked: false, pct: 80, color: "#D97706", xp: 400, category: "Salud" },
    { name: "100 EXPLORACIONES", desc: "67/100 completadas", unlocked: false, pct: 67, color: "#0D9488", xp: 600, category: "Exploración" },
    { name: "AUTOSUFICIENCIA", desc: "Produce el 50% de alimentos propios", unlocked: false, pct: 45, color: "#EA580C", xp: 800, category: "Agricultura" },
    { name: "FORTALEZA", desc: "Resistir 5 ataques sin bajas", unlocked: false, pct: 60, color: "#DC2626", xp: 700, category: "Defensa" },
    { name: "RED DE ALIANZAS", desc: "3 campamentos aliados", unlocked: false, pct: 33, color: "#8B8070", xp: 500, category: "Diplomacia" },
    { name: "INVENTARIO SEGURO", desc: "Todos los recursos sobre 50%", unlocked: false, pct: 15, color: "#F59E0B", xp: 400, category: "Logística" },
  ];

  const categories = [...new Set(achievements.map(a => a.category))];
  const totalXP = achievements.filter(a => a.unlocked).reduce((acc, a) => acc + a.xp, 0);
  const nextLevelXP = 3000;

  return (
    <div className="flex flex-col gap-4">
      {/* Level bar */}
      <Card glow="#D97706">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#4B4540" }}>NIVEL</div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 48, fontWeight: 900, color: "#F59E0B", lineHeight: 1 }}>7</div>
            <Badge label="CONSOLIDADO" color="#D97706" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between mb-2">
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>EXPERIENCIA TOTAL</span>
              <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, color: "#F59E0B" }}>{totalXP} / {nextLevelXP} XP</span>
            </div>
            <div className="h-3 rounded-sm overflow-hidden mb-1" style={{ background: "#2D2A24" }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${(totalXP / nextLevelXP) * 100}%` }} transition={{ duration: 1 }}
                style={{ height: "100%", background: "linear-gradient(90deg, #D97706, #F59E0B)", borderRadius: 2 }} />
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {[
                { label: "LOGROS", value: `${achievements.filter(a => a.unlocked).length}/${achievements.length}` },
                { label: "DESBLOQUEADOS", value: achievements.filter(a => a.unlocked).length },
                { label: "EN PROGRESO", value: achievements.filter(a => !a.unlocked).length },
                { label: "PRÓXIMO NIVEL", value: `${nextLevelXP - totalXP} XP` },
              ].map(({ label, value }) => (
                <div key={label} className="p-2 rounded-sm text-center" style={{ background: "#0D0D10", border: "1px solid #2D2A24" }}>
                  <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 13, fontWeight: 900, color: "#F5F0E8" }}>{value}</div>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 7, color: "#4B4540" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Achievements by category */}
      {categories.map(cat => (
        <div key={cat}>
          <div className="mb-2 flex items-center gap-2">
            <div style={{ height: 1, flex: 1, background: "#2D2A24" }} />
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#4B4540" }}>{cat.toUpperCase()}</span>
            <div style={{ height: 1, flex: 1, background: "#2D2A24" }} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {achievements.filter(a => a.category === cat).map(ach => (
              <Card key={ach.name} glow={ach.unlocked ? ach.color : ""}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0"
                    style={{ background: ach.unlocked ? `${ach.color}22` : "#1A1A20", border: `1px solid ${ach.unlocked ? ach.color : "#2D2A24"}`, opacity: ach.unlocked ? 1 : 0.5 }}>
                    <Trophy size={18} style={{ color: ach.unlocked ? ach.color : "#4B4540" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: ach.unlocked ? ach.color : "#8B8070" }}>{ach.name}</span>
                        {ach.unlocked && <CheckCircle size={10} style={{ color: ach.color }} />}
                      </div>
                      <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, color: ach.unlocked ? "#F59E0B" : "#4B4540" }}>+{ach.xp} XP</span>
                    </div>
                    <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: "#4B4540", marginBottom: 6 }}>{ach.desc}</p>
                    <div className="h-1 rounded-sm overflow-hidden" style={{ background: "#2D2A24" }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${ach.pct}%` }} transition={{ duration: 0.8 }}
                        style={{ height: "100%", background: ach.unlocked ? ach.color : `${ach.color}66`, borderRadius: 2 }} />
                    </div>
                    {!ach.unlocked && (
                      <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#4B4540", marginTop: 2 }}>{ach.pct}% completado</div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ViewNotificaciones() {
  const [notifs, setNotifs] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState("todas");

  const markRead = (id: number) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const dismiss = (id: number) => setNotifs(prev => prev.filter(n => n.id !== id));

  const levels = ["todas", "critical", "warning", "info"];
  const filtered = notifs.filter(n => filter === "todas" || n.level === filter);
  const unread = notifs.filter(n => !n.read).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "SIN LEER", value: unread, color: "#DC2626" },
          { label: "CRÍTICAS", value: notifs.filter(n => n.level === "critical").length, color: "#DC2626" },
          { label: "TOTAL", value: notifs.length, color: "#8B8070" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 28, fontWeight: 900, color }}>{value}</div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, color: "#8B8070", letterSpacing: "0.1em" }}>{label}</div>
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
                className="px-2 py-1 rounded-sm cursor-pointer hover:opacity-80"
                style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, background: filter === l ? notifColor(l) : "#1A1A20", color: filter === l ? "#0A0A0B" : "#8B8070", border: "1px solid #2D2A24" }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          {unread > 0 && <ActionBtn label="MARCAR TODO LEÍDO" color="#8B8070" onClick={markAllRead} />}
        </div>
        <div style={{ height: 1, background: "linear-gradient(90deg, #D97706 0%, transparent 100%)", marginBottom: 12 }} />

        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {filtered.map(n => {
              const nc = notifColor(n.level);
              return (
                <motion.div key={n.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10, height: 0 }}
                  className="p-3 rounded-sm"
                  style={{ background: n.read ? "#0D0D10" : "#111114", border: `1px solid ${n.read ? "#2D2A24" : nc + "55"}`, borderLeft: `3px solid ${n.read ? "#2D2A24" : nc}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: nc }} />}
                        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: n.read ? "#8B8070" : "#F5F0E8" }}>{n.title}</span>
                        <Badge label={n.level.toUpperCase()} color={nc} />
                      </div>
                      <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: "#8B8070" }}>{n.body}</p>
                      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#4B4540" }}>{n.time}</span>
                    </div>
                    <div className="flex gap-1">
                      {!n.read && <button onClick={() => markRead(n.id)} className="hover:opacity-80"><CheckCircle size={12} style={{ color: "#0D9488" }} /></button>}
                      <button onClick={() => dismiss(n.id)} className="hover:opacity-80"><X size={12} style={{ color: "#4B4540" }} /></button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="text-center py-8">
              <Bell size={32} style={{ color: "#2D2A24", margin: "0 auto 8px" }} />
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#4B4540" }}>SIN NOTIFICACIONES</div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function ViewConfiguracion() {
  const [settings, setSettings] = useState({
    campName: "CAMPAMENTO ALFA",
    adminName: "Edicson Vargas",
    day: 47,
    alertThreshold: 20,
    autoBackup: true,
    soundAlerts: true,
    nightReport: true,
    dailyConsumption: true,
    language: "es",
    timezone: "America/Costa_Rica",
    sessionTimeout: 60,
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence>
        {saved && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-16 right-4 z-50 px-4 py-2 rounded-sm"
            style={{ background: "#0D9488", fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#F5F0E8" }}>
            CONFIGURACIÓN GUARDADA
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Camp settings */}
        <Card>
          <SectionHeader title="CONFIGURACIÓN DEL CAMPAMENTO" />
          <div className="flex flex-col gap-3">
            {[
              { label: "NOMBRE DEL CAMPAMENTO", key: "campName" },
              { label: "NOMBRE DEL ADMINISTRADOR", key: "adminName" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>{label}</label>
                <input value={(settings as any)[key]} onChange={e => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
                  style={{ background: "#0D0D10", border: "1px solid #2D2A24", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#F5F0E8" }} />
              </div>
            ))}
            <div>
              <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>DÍA ACTUAL DEL APOCALIPSIS</label>
              <input type="number" value={settings.day} onChange={e => setSettings(prev => ({ ...prev, day: Number(e.target.value) }))}
                className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
                style={{ background: "#0D0D10", border: "1px solid #2D2A24", fontFamily: "'Orbitron', monospace", fontSize: 12, color: "#F59E0B" }} />
            </div>
            <div>
              <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>UMBRAL DE ALERTA DE INVENTARIO (%)</label>
              <input type="number" min={1} max={100} value={settings.alertThreshold} onChange={e => setSettings(prev => ({ ...prev, alertThreshold: Number(e.target.value) }))}
                className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
                style={{ background: "#0D0D10", border: "1px solid #2D2A24", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#F5F0E8" }} />
            </div>
          </div>
        </Card>

        {/* Automations */}
        <Card>
          <SectionHeader title="AUTOMATIZACIONES" />
          <div className="flex flex-col gap-3">
            {[
              { label: "BACKUP AUTOMÁTICO DIARIO", key: "autoBackup", icon: Database },
              { label: "ALERTAS DE SONIDO", key: "soundAlerts", icon: Volume2 },
              { label: "REPORTE NOCTURNO", key: "nightReport", icon: BarChart2 },
              { label: "CONSUMO DIARIO AUTOMÁTICO", key: "dailyConsumption", icon: Cpu },
            ].map(({ label, key, icon: Icon }) => (
              <div key={key} className="flex items-center justify-between px-3 py-2 rounded-sm" style={{ background: "#0D0D10", border: "1px solid #2D2A24" }}>
                <div className="flex items-center gap-2">
                  <Icon size={12} style={{ color: "#D97706" }} />
                  <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#F5F0E8" }}>{label}</span>
                </div>
                <Toggle active={(settings as any)[key]} onChange={() => setSettings(prev => ({ ...prev, [key]: !(prev as any)[key] }))} />
              </div>
            ))}
          </div>
        </Card>

        {/* System settings */}
        <Card>
          <SectionHeader title="SISTEMA" />
          <div className="flex flex-col gap-3">
            <div>
              <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>IDIOMA</label>
              <select value={settings.language} onChange={e => setSettings(prev => ({ ...prev, language: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
                style={{ background: "#0D0D10", border: "1px solid #2D2A24", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#F5F0E8" }}>
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>ZONA HORARIA</label>
              <select value={settings.timezone} onChange={e => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
                style={{ background: "#0D0D10", border: "1px solid #2D2A24", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#F5F0E8" }}>
                <option value="America/Costa_Rica">America/Costa_Rica (UTC-6)</option>
                <option value="America/New_York">America/New_York (UTC-5)</option>
                <option value="America/Bogota">America/Bogota (UTC-5)</option>
              </select>
            </div>
            <div>
              <label style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>TIMEOUT DE SESIÓN (MINUTOS)</label>
              <input type="number" value={settings.sessionTimeout} onChange={e => setSettings(prev => ({ ...prev, sessionTimeout: Number(e.target.value) }))}
                className="w-full mt-1 px-3 py-2 rounded-sm outline-none"
                style={{ background: "#0D0D10", border: "1px solid #2D2A24", fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#F5F0E8" }} />
            </div>
          </div>
        </Card>

        {/* Info */}
        <Card>
          <SectionHeader title="INFORMACIÓN DEL SISTEMA" />
          <div className="flex flex-col gap-2">
            {[
              { label: "VERSIÓN", value: "1.0.0" },
              { label: "BASE DE DATOS", value: "NEON DB (PostgreSQL)" },
              { label: "SERVIDOR", value: "VERCEL SERVERLESS" },
              { label: "MODELO IA", value: "admission-v1 (Precisión 89%)" },
              { label: "ÚLTIMA SINCRONIZACIÓN", value: "HOY 14:32" },
              { label: "UPTIME", value: "47 DÍAS" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center px-3 py-2 rounded-sm" style={{ background: "#0D0D10", border: "1px solid #2D2A24" }}>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#4B4540" }}>{label}</span>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }}>{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex gap-3">
        <ActionBtn label="GUARDAR CONFIGURACIÓN" color="#0D9488" onClick={handleSave} />
        <ActionBtn label="RESTABLECER VALORES" color="#8B8070" onClick={() => {}} />
      </div>
    </div>
  );
}

// ─── DASHBOARD (overview) ─────────────────────────────────────────────────────

function ViewDashboard() {
  const [countdown, setCountdown] = useState({ h: 3, m: 28, s: 0 });
  const [automations, setAutomations] = useState([
    { ok: true, name: "Consumo diario de raciones", time: "Ejecutado 06:00", active: true },
    { ok: true, name: "Colecta de recursos", time: "Ejecutado 06:00", active: true },
    { ok: false, name: "Alerta de inventario", time: "3 alertas activas", active: true },
    { ok: true, name: "Reporte nocturno", time: "Enviado 00:00", active: true },
  ]);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(prev => {
        const { h, m, s } = prev;
        if (s > 0) return { h, m, s: s - 1 };
        if (m > 0) return { h, m: m - 1, s: 59 };
        if (h > 0) return { h: h - 1, m: 59, s: 59 };
        return { h: 0, m: 0, s: 0 };
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const populationData = [
    { name: "Activos", value: 189, color: "#0D9488" },
    { name: "Heridos", value: 23, color: "#EA580C" },
    { name: "Enfermos", value: 18, color: "#DC2626" },
    { name: "Fuera", value: 17, color: "#F59E0B" },
  ];
  const totalPop = populationData.reduce((a, b) => a + b.value, 0);

  return (
    <div>
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        {[
          { icon: Users, color: "#0D9488", value: "247", label: "POBLACIÓN TOTAL", sub: "+3 SEMANA", subColor: "#0D9488", subIcon: TrendingUp },
          { icon: Package, color: "#DC2626", value: "3", label: "RECURSOS CRÍTICOS", sub: "CRÍTICO", subColor: "#DC2626", subIcon: TrendingDown, pulse: true },
          { icon: Map, color: "#D97706", value: "2", label: "EXPEDICIONES ACTIVAS", sub: "14 FUERA", subColor: "#F59E0B", subIcon: Activity },
          { icon: Radio, color: "#EA580C", value: "5", label: "SOLICITUDES INTER-CAMP.", sub: "2 URGENTES", subColor: "#EA580C", subIcon: AlertTriangle },
        ].map(({ icon: Icon, color, value, label, sub, subColor, subIcon: SubIcon, pulse }) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card glow={color}>
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-sm ${pulse ? "animate-pulse" : ""}`} style={{ background: `${color}22` }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <div className="flex items-center gap-1">
                  <SubIcon size={10} style={{ color: subColor }} />
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: subColor }}>{sub}</span>
                </div>
              </div>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 28, fontWeight: 900, color: "#F5F0E8", lineHeight: 1 }}>{value}</div>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: "#8B8070", letterSpacing: "0.1em", marginTop: 4 }}>{label}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-12 gap-3 mb-3">
        <div className="col-span-12 lg:col-span-8">
          <Card>
            <SectionHeader title="TENDENCIA DE RECURSOS — ÚLTIMOS 7 DÍAS" />
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={resourceTrendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  {[["gFood", "#F59E0B"], ["gWater", "#0D9488"], ["gAmmo", "#DC2626"]].map(([id, color]) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D2A24" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#8B8070", fontSize: 9, fontFamily: "'Share Tech Mono', monospace" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8B8070", fontSize: 9, fontFamily: "'Share Tech Mono', monospace" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#111114", border: "1px solid #2D2A24", borderRadius: 2, fontFamily: "'Share Tech Mono', monospace", fontSize: 10 }} labelStyle={{ color: "#F5F0E8" }} itemStyle={{ color: "#8B8070" }} />
                <Legend wrapperStyle={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#8B8070" }} />
                <Area type="monotone" dataKey="food" name="Comida" stroke="#F59E0B" fill="url(#gFood)" strokeWidth={1.5} dot={false} />
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
                <Pie data={populationData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" strokeWidth={0}>
                  {populationData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  <DonutCenter total={totalPop} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">
              {populationData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                  <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, color: "#8B8070" }}>{d.name}: </span>
                  <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, color: "#F5F0E8" }}>{d.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Admissions + Expeditions */}
      <div className="grid grid-cols-12 gap-3 mb-3">
        <div className="col-span-12 lg:col-span-6">
          <Card glow="#D97706" className="h-full">
            <SectionHeader title="ADMISIONES PENDIENTES — IA" />
            <div className="flex flex-col gap-2">
              {INITIAL_ADMISSIONS.filter(a => a.status === "pending").map((a, idx) => (
                <div key={a.id} className="grid grid-cols-12 items-center px-2 py-1.5 rounded-sm"
                  style={{ background: idx % 2 === 0 ? "#0D0D10" : "transparent" }}>
                  <div className="col-span-4 flex items-center gap-1.5">
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, color: a.score < 50 ? "#DC2626" : "#F5F0E8" }}>{a.name}</span>
                    {a.badge && <Badge label={a.badge} color="#DC2626" />}
                  </div>
                  <div className="col-span-3"><span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: "#8B8070" }}>{a.profession}</span></div>
                  <div className="col-span-2"><span style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, fontWeight: 700, color: scoreColor(a.score) }}>{a.score}</span></div>
                  <div className="col-span-3 flex gap-1">
                    <ActionBtn label="APR" color="#0D9488" small />
                    <ActionBtn label="REC" color="#DC2626" small />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-6">
          <Card className="h-full">
            <SectionHeader title="EXPEDICIONES EN CURSO" />
            <div className="flex flex-col gap-2">
              {INITIAL_EXPEDITIONS.map(exp => {
                const pct = exp.total > 0 ? (exp.day / exp.total) * 100 : 0;
                const sc = expColor(exp.status);
                return (
                  <div key={exp.id} className="p-2 rounded-sm" style={{ background: "#0D0D10", border: "1px solid #2D2A24" }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#F5F0E8" }}>{exp.name}</span>
                      <Badge label={exp.status} color={sc} />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-sm overflow-hidden" style={{ background: "#2D2A24" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: sc }} />
                      </div>
                      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#8B8070" }}>D{exp.day}/{exp.total}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Inventory + Intercamp + Logs */}
      <div className="grid grid-cols-12 gap-3 mb-3">
        <div className="col-span-12 lg:col-span-4">
          <Card className="h-full">
            <SectionHeader title="ALERTAS DE INVENTARIO" />
            <div className="flex flex-col gap-2">
              {INITIAL_INVENTORY.map(item => (
                <div key={item.id}>
                  <div className="flex justify-between mb-0.5">
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, color: "#F5F0E8" }}>{item.name}</span>
                    <span className={item.status === "CRÍTICO" ? "animate-pulse" : ""} style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: statusColor(item.status) }}>{item.status}</span>
                  </div>
                  <div className="h-1.5 rounded-sm overflow-hidden" style={{ background: "#2D2A24" }}>
                    <div className={item.status === "CRÍTICO" ? "animate-pulse" : ""} style={{ width: `${item.pct}%`, height: "100%", background: invBarColor(item.pct) }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-4">
          <Card className="h-full">
            <SectionHeader title="INTER-CAMPAMENTOS" />
            <div className="flex flex-col gap-2">
              {INITIAL_INTERCAMP.map(req => {
                const sc = intercampColor(req.status);
                return (
                  <div key={req.id} className="p-2 rounded-sm" style={{ background: "#0D0D10", border: "1px solid #2D2A24" }}>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: "#F5F0E8" }}>{req.text}</span>
                      {req.urgent && <Badge label="URG" color="#DC2626" />}
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#4B4540" }}>{req.time}</span>
                      <Badge label={req.status} color={sc} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-4">
          <Card className="h-full">
            <SectionHeader title="ACCESO RECIENTE" />
            <div className="flex flex-col gap-1.5">
              {INITIAL_LOGS.slice(0, 6).map(log => {
                const lc = logLevelColor(log.level);
                return (
                  <div key={log.id} className="flex items-start gap-2 py-1" style={{ borderBottom: "1px solid #2D2A2444" }}>
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#4B4540", flexShrink: 0 }}>[{log.time}]</span>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1" style={{ background: lc }} />
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: "#F5F0E8" }}>{log.user}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Achievements + Automation */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 lg:col-span-8">
          <Card>
            <SectionHeader title="LOGROS DEL CAMPAMENTO" />
            <div className="flex items-center gap-3 mb-3 p-2 rounded-sm" style={{ background: "#0D0D10", border: "1px solid #2D2A24" }}>
              <div>
                <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, color: "#4B4540" }}>LVL </span>
                <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 22, fontWeight: 900, color: "#F59E0B" }}>7</span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#8B8070" }}>2340 / 3000 XP</span>
                  <Badge label="CAMPAMENTO ALFA — RANGO: CONSOLIDADO" color="#D97706" />
                </div>
                <div className="h-2 rounded-sm overflow-hidden" style={{ background: "#2D2A24" }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: "78%" }} transition={{ duration: 1, delay: 0.5 }}
                    style={{ height: "100%", background: "linear-gradient(90deg, #D97706, #F59E0B)", borderRadius: 2 }} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: "PRIMER MES", desc: "Sobrevivimos 30 días", unlocked: true, pct: 100, color: "#0D9488" },
                { name: "SIN BAJAS", desc: "7 días sin pérdidas", unlocked: true, pct: 100, color: "#F59E0B" },
                { name: "EQUIPO MÉDICO", desc: "5/5 médicos activos", unlocked: false, pct: 80, color: "#D97706" },
                { name: "100 EXPLORACIONES", desc: "67/100 completadas", unlocked: false, pct: 67, color: "#0D9488" },
              ].map(ach => (
                <div key={ach.name} className="p-2 rounded-sm flex items-start gap-2"
                  style={{ background: "#0D0D10", border: `1px solid ${ach.unlocked ? ach.color + "44" : "#2D2A24"}`, opacity: ach.unlocked ? 1 : 0.7 }}>
                  <Trophy size={14} style={{ color: ach.unlocked ? ach.color : "#4B4540", flexShrink: 0, marginTop: 2 }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: ach.unlocked ? ach.color : "#8B8070" }}>{ach.name}</span>
                      {ach.unlocked && <CheckCircle size={9} style={{ color: ach.color }} />}
                    </div>
                    <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, color: "#4B4540" }}>{ach.desc}</p>
                    {!ach.unlocked && (
                      <div className="h-1 rounded-sm overflow-hidden mt-1" style={{ background: "#2D2A24" }}>
                        <div style={{ width: `${ach.pct}%`, height: "100%", background: ach.color }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-4">
          <Card className="h-full">
            <SectionHeader title="AUTOMATIZACIÓN DEL SISTEMA" />
            <div className="flex flex-col gap-2">
              {automations.map((a, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-sm" style={{ background: "#0D0D10", border: "1px solid #2D2A24" }}>
                  <span style={{ fontSize: 12, color: a.ok ? "#0D9488" : "#EA580C", flexShrink: 0 }}>{a.ok ? "✓" : "⚠"}</span>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, color: "#F5F0E8" }}>{a.name}</div>
                    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#4B4540" }}>{a.time}</div>
                  </div>
                  <Toggle active={a.active} onChange={() => setAutomations(prev => prev.map((aa, j) => j === i ? { ...aa, active: !aa.active } : aa))} />
                </div>
              ))}
              <div className="p-2 rounded-sm" style={{ background: "#1A1A20", border: "1px solid #D97706" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Settings size={10} style={{ color: "#D97706" }} />
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#D97706" }}>PRÓXIMO CICLO — HOY 18:00</span>
                </div>
                <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 900, color: "#F59E0B" }}>
                  {String(countdown.h).padStart(2, "0")}:{String(countdown.m).padStart(2, "0")}:{String(countdown.s).padStart(2, "0")}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [activeNav, setActiveNav] = useState<NavSection>("CENTRO DE MANDO");
  const [serverTime, setServerTime] = useState(new Date());
  const [unreadNotifs] = useState(4);

  useEffect(() => {
    const t = setInterval(() => setServerTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const navItems: { icon: React.ElementType; label: NavSection; badge?: number }[] = [
    { icon: LayoutDashboard, label: "CENTRO DE MANDO" },
    { icon: Users, label: "POBLACIÓN" },
    { icon: UserPlus, label: "ADMISIONES IA" },
    { icon: Package, label: "INVENTARIO" },
    { icon: Map, label: "EXPEDICIONES" },
    { icon: Radio, label: "INTER-CAMPAMENTOS" },
    { icon: Shield, label: "SEGURIDAD / LOGS" },
    { icon: Trophy, label: "LOGROS" },
    { icon: Bell, label: "NOTIFICACIONES", badge: unreadNotifs },
    { icon: Settings, label: "CONFIGURACIÓN" },
  ];

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  const sectionTitles: Record<NavSection, string> = {
    "CENTRO DE MANDO": "CENTRO DE MANDO",
    "POBLACIÓN": "REGISTRO DE POBLACIÓN",
    "ADMISIONES IA": "ADMISIONES — EVALUACIÓN IA",
    "INVENTARIO": "GESTIÓN DE INVENTARIO",
    "EXPEDICIONES": "GESTIÓN DE EXPEDICIONES",
    "INTER-CAMPAMENTOS": "COMUNICACIONES INTER-CAMPAMENTO",
    "SEGURIDAD / LOGS": "SEGURIDAD Y LOGS DE ACCESO",
    "LOGROS": "LOGROS Y GAMIFICACIÓN",
    "NOTIFICACIONES": "CENTRO DE NOTIFICACIONES",
    "CONFIGURACIÓN": "CONFIGURACIÓN DEL SISTEMA",
  };

  const renderSection = () => {
    switch (activeNav) {
      case "POBLACIÓN": return <ViewPoblacion />;
      case "ADMISIONES IA": return <ViewAdmisiones />;
      case "INVENTARIO": return <ViewInventario />;
      case "EXPEDICIONES": return <ViewExpediciones />;
      case "INTER-CAMPAMENTOS": return <ViewIntercamp />;
      case "SEGURIDAD / LOGS": return <ViewSeguridad />;
      case "LOGROS": return <ViewLogros />;
      case "NOTIFICACIONES": return <ViewNotificaciones />;
      case "CONFIGURACIÓN": return <ViewConfiguracion />;
      default: return <ViewDashboard />;
    }
  };

  return (
    <>
      <style>{FONT_IMPORT}</style>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0A0A0B; }
        ::-webkit-scrollbar-thumb { background: #2D2A24; border-radius: 2px; }
        select option { background: #111114; color: #F5F0E8; }
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
          background: linear-gradient(180deg, transparent 0%, rgba(217, 119, 6, 0.14) 48%, transparent 100%);
          animation: scanSweep 4.2s linear infinite;
          pointer-events: none;
          z-index: 1;
        }
        .noise-bg {
          background-color: #0A0A0B;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"),
            radial-gradient(ellipse at 50% 0%, #1A1A14 0%, #0A0A0B 70%);
        }
        @keyframes scanSweep {
          0% { transform: translateY(-100%); opacity: 0; }
          8% { opacity: 0.5; }
          50% { opacity: 0.9; }
          92% { opacity: 0.5; }
          100% { transform: translateY(100%); opacity: 0; }
        }
      `}</style>

      <div
        className="admin-dashboard noise-bg flex h-screen overflow-hidden"
        style={{
          position: "relative",
          display: "flex",
          height: "100vh",
          overflow: "hidden",
          fontFamily: "'Rajdhani', sans-serif",
          color: "#F5F0E8",
        }}
      >
        <div
          aria-hidden
          className="absolute"
          style={{
            top: -130,
            left: -90,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(13,148,136,0.12) 0%, rgba(13,148,136,0) 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          className="absolute"
          style={{
            bottom: -180,
            right: -120,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(217,119,6,0.12) 0%, rgba(217,119,6,0) 72%)",
            pointerEvents: "none",
          }}
        />

        {/* SIDEBAR */}
        <aside className="hidden md:flex flex-col flex-shrink-0"
          style={{ width: 220, background: "#0D0D10", borderRight: "1px solid #2D2A24", zIndex: 1 }}>
          {/* Logo */}
          <div className="px-4 py-5 flex flex-col items-center" style={{ borderBottom: "1px solid #2D2A24" }}>
            <div className="flex items-center gap-2 mb-1">
              <Skull size={20} style={{ color: "#D97706" }} />
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#D97706", letterSpacing: "0.05em" }}>GESTIÓN DEL FIN</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-block w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#8B8070", letterSpacing: "0.08em" }}>CAMPAMENTO ALFA</span>
            </div>
            <div className="mt-2 px-2 py-1 rounded-sm" style={{ background: "#111114", border: "1px solid #2D2A24" }}>
              <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 12, color: "#F59E0B", letterSpacing: "0.1em" }}>{fmtTime(serverTime)}</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2 py-3 overflow-y-auto">
            {navItems.map(({ icon: Icon, label, badge }) => {
              const isActive = activeNav === label;
              return (
                <button key={label} onClick={() => setActiveNav(label)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 mb-0.5 rounded-sm transition-all cursor-pointer"
                  style={{ background: isActive ? "#1A1A20" : "transparent", borderLeft: isActive ? "2px solid #D97706" : "2px solid transparent", color: isActive ? "#F59E0B" : "#8B8070" }}>
                  <Icon size={14} />
                  <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>{label}</span>
                  {badge ? (
                    <span className="flex items-center justify-center w-4 h-4 rounded-sm"
                      style={{ background: "#DC2626", color: "#F5F0E8", fontSize: 9, fontFamily: "'Share Tech Mono', monospace", fontWeight: 700 }}>
                      {badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* User */}
          <div className="px-3 py-3" style={{ borderTop: "1px solid #2D2A24" }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-sm flex items-center justify-center"
                style={{ background: "#D97706", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#0A0A0B", fontWeight: 700 }}>
                EV
              </div>
              <div>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 700, color: "#F5F0E8" }}>Edicson V.</div>
                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#D97706" }}>ADMIN SISTEMA</div>
              </div>
            </div>
            <div className="mt-2">
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#4B4540" }}>v1.0.0 | DÍA 47</span>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ position: "relative", zIndex: 1 }}>
          {/* Header */}
          <header className="scanlines relative flex-shrink-0 flex items-center justify-between px-5"
            style={{ height: 52, background: "#0D0D10", borderBottom: "1px solid #2D2A24" }}>
            <div className="flex items-center gap-2 relative z-10">
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#8B8070" }}>CAMPAMENTO ALFA</span>
              <ChevronRight size={10} style={{ color: "#4B4540" }} />
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#D97706" }}>{sectionTitles[activeNav]}</span>
            </div>
            <div className="hidden lg:flex items-center gap-3 relative z-10">
              {[
                { label: "SERVIDOR: ONLINE", color: "#0D9488" },
                { label: "DÍA 47 DEL APOCALIPSIS", color: "#F5F0E8" },
                { label: "247 SUPERVIVIENTES", color: "#F5F0E8" },
                { label: "3 ALERTAS CRÍTICAS", color: "#DC2626" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1">
                  {i > 0 && <span style={{ color: "#2D2A24" }}>|</span>}
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: item.color }}>{item.label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 relative z-10">
              <button onClick={() => setActiveNav("NOTIFICACIONES")} className="relative p-1.5 rounded-sm hover:opacity-80"
                style={{ background: "#1A1A20", border: "1px solid #2D2A24" }}>
                <Bell size={14} style={{ color: "#D97706" }} />
                {unreadNotifs > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center w-3.5 h-3.5 rounded-sm"
                    style={{ background: "#DC2626", fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#F5F0E8" }}>{unreadNotifs}</span>
                )}
              </button>
              <button onClick={() => setActiveNav("CONFIGURACIÓN")} className="flex items-center gap-1.5 px-2 py-1 rounded-sm hover:opacity-80"
                style={{ background: "#1A1A20", border: "1px solid #2D2A24" }}>
                <div className="w-5 h-5 rounded-sm flex items-center justify-center"
                  style={{ background: "#D97706", fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#0A0A0B", fontWeight: 700 }}>
                  EV
                </div>
                <ChevronDown size={10} style={{ color: "#8B8070" }} />
              </button>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeNav}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                {renderSection()}
              </motion.div>
            </AnimatePresence>
            <div className="h-4" />
          </main>
        </div>
      </div>
    </>
  );
}
