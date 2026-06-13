import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart,
} from "recharts";
import { AlertTriangle, X, Check } from "lucide-react";
import {
  createExpeditionParticipant,
  getCurrentExpeditionUser,
  listAvailablePeople,
  listExpeditionParticipants,
  listUiExpeditions,
  type ExpeditionPerson,
} from "../services/expeditionsUi.service";

/* ════════════════ MOCK DATA ACTUALIZADA ════════════════ */

const MOCK_EXPEDITIONS = [
  { id: 1, name: "Valle Profundo", dest: "Valle a 50km norte", status: "IN_PROGRESS", departure: "15/05 08:00", returnDate: "20/05 18:00", participants: 5, resources: "20 kg", extraDays: 3, extraUsed: 2 },
  { id: 2, name: "Río Oeste", dest: "Río a 30km oeste", status: "PLANNED", departure: "28/05 06:00", returnDate: "02/06 16:00", participants: 0, resources: "0", extraDays: 5, extraUsed: 0 },
  { id: 3, name: "Montaña Negra", dest: "Montaña a 70km sur", status: "DELAYED", departure: "10/05 08:00", returnDate: "15/05 18:00", participants: 3, resources: "15 kg", extraDays: 3, extraUsed: 3 },
  { id: 4, name: "Costa Esmeralda", dest: "Playa a 25km este", status: "COMPLETED", departure: "01/05 07:00", returnDate: "05/05 17:00", participants: 8, resources: "45 kg", extraDays: 2, extraUsed: 0 },
  { id: 7, name: "Páramo Perdido", dest: "Zona desconocida", status: "LOST", departure: "10/04 08:00", returnDate: "15/04 18:00", participants: 4, resources: "10 kg", extraDays: 0, extraUsed: 0 },
  { id: 8, name: "Rescate Alfa", dest: "Bosque denso", status: "RETURNED_AFTER_LOST", departure: "20/03 08:00", returnDate: "30/03 18:00", participants: 6, resources: "30 kg", extraDays: 5, extraUsed: 5 },
];

const MOCK_PARTICIPANTS = [
  { id: 1, personId: 7, name: "Mario Hugo", role: "Explorador", status: "ACTIVE" },
  { id: 2, personId: 12, name: "Ana García", role: "Médico de campo", status: "ACTIVE" },
  { id: 3, personId: 5, name: "Juan López", role: "Recolector", status: "WITHDRAWN" },
];

const MOCK_RESOURCES_CONSUMED = [
  { type: "Alimentos", unit: "kg", amount: "45.00", date: "20/05/2026", user: "Admin" },
  { type: "Agua", unit: "lts", amount: "98.50", date: "20/05/2026", user: "Logística" },
];

/* ════════════════ STATUS COLORS AMPLIADOS ════════════════ */

const STATUS_COLORS: Record<string, string> = {
  // Expediciones
  PLANNED: "bg-blue-500/30 text-blue-200 border-blue-400/40",
  IN_PROGRESS: "bg-emerald-500/30 text-emerald-200 border-emerald-400/40",
  DELAYED: "bg-amber-500/30 text-amber-200 border-amber-400/40",
  COMPLETED: "bg-green-700/30 text-green-200 border-green-500/40",
  LOST: "bg-red-900/40 text-red-200 border-red-800/50",
  RETURNED_AFTER_LOST: "bg-purple-600/40 text-purple-100 border-purple-500/40",
  CANCELED: "bg-red-500/30 text-red-200 border-red-400/40",
  
  // Participantes
  ACTIVE: "bg-emerald-500/30 text-emerald-200 border-emerald-400/40",
  WITHDRAWN: "bg-gray-600/30 text-gray-300 border-gray-400/40",

  // Categorías Recursos
  FOOD: "bg-emerald-500/20 text-emerald-300 border-emerald-500/20",
  WATER: "bg-blue-500/20 text-blue-300 border-blue-500/20",
  HYGIENE: "bg-cyan-500/20 text-cyan-300 border-cyan-500/20",
  DEFENSE: "bg-red-500/20 text-red-300 border-red-500/20",
  AMMUNITION: "bg-orange-500/20 text-orange-300 border-orange-500/20",
  MEDICAL: "bg-pink-500/20 text-pink-300 border-pink-500/20",
  OTHER: "bg-gray-500/20 text-gray-300 border-gray-500/20",
};

const CATEGORY_LABELS: Record<string, string> = {
  FOOD: "Alimentos", WATER: "Agua", HYGIENE: "Higiene", DEFENSE: "Defensa",
  AMMUNITION: "Munición", MEDICAL: "Médico", OTHER: "Otro"
};

/* ════════════════ COMPONENTES BASE ════════════════ */

function StatusBadge({ status }: { status: string }) {
  const label = status === "RETURNED_AFTER_LOST" ? "Regresó tras perderse" : status.replace("_", " ");
  const catLabel = CATEGORY_LABELS[status] || label;
  return (
    <span className={`inline-block rounded-sm border px-2 py-0.5 text-[9px] font-bold uppercase ${STATUS_COLORS[status] || "bg-gray-500/20 text-gray-300"}`}>
      {catLabel}
    </span>
  );
}

export function Btn({ children, variant = "primary", onClick, small, style, disabled }: { children: React.ReactNode; variant?: "primary" | "ghost" | "danger" | "success" | "warning"; onClick?: () => void; small?: boolean; style?: React.CSSProperties; disabled?: boolean }) {
  const base = small ? "px-2 py-0.5 text-[9px]" : "px-3 py-1.5 text-[11px]";
  const colors = {
    primary: "bg-[#67ACA9] text-white hover:bg-[#69BFB7]",
    danger: "bg-red-600/40 text-red-200 border border-red-500/40 hover:bg-red-500/50",
    success: "bg-emerald-600/40 text-emerald-100 border border-emerald-500/40 hover:bg-emerald-500/50",
    warning: "bg-amber-600/40 text-amber-100 border border-amber-500/40 hover:bg-amber-500/50",
    ghost: "bg-[#67ACA9]/15 text-[#A4C2C5] border border-[#67ACA9]/40 hover:bg-[#67ACA9]/25",
  }[variant];
  return (
    <button onClick={onClick} style={style} disabled={disabled} className={`${base} ${colors} font-bold uppercase tracking-wide rounded-sm transition-all whitespace-nowrap ${disabled ? "opacity-50 cursor-not-allowed" : ""}`} type="button">
      {children}
    </button>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`v-kpi ${accent ? "v-kpi-accent" : ""}`}>
      <span className="v-kpi-value">{value}</span>
      <span className="v-kpi-label">{label}</span>
    </div>
  );
}

function InputField({ label, placeholder, required, type = "text", value, unit }: { label: string; placeholder?: string; required?: boolean; type?: string; value?: string; unit?: string }) {
  return (
    <label className="v-field">
      <span className="v-field-label">{label}{unit && ` (${unit})`}{required && <span className="text-[#69BFB7]"> *</span>}</span>
      <input type={type} className="v-input" placeholder={placeholder} defaultValue={value} />
    </label>
  );
}

function SelectField({ label, options, required, value }: { label: string; options: {id: string|number, name: string}[]; required?: boolean; value?: string|number }) {
  return (
    <label className="v-field">
      <span className="v-field-label">{label}{required && <span className="text-[#69BFB7]"> *</span>}</span>
      <select className="v-select" defaultValue={value}>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  );
}

function TextareaField({ label, placeholder, required }: { label: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="v-field">
      <span className="v-field-label">{label}{required && <span className="text-[#69BFB7]"> *</span>}</span>
      <textarea className="v-textarea" placeholder={placeholder} rows={3} />
    </label>
  );
}

function DateTimeField({ label, required, defaultDay = "18", defaultTime = "08:00" }: { label: string; required?: boolean; defaultDay?: string; defaultTime?: string }) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(defaultDay);
  const [hour, setHour] = useState(defaultTime.split(":")[0] || "08");
  const [minute, setMinute] = useState(defaultTime.split(":")[1] || "00");
  const [month, setMonth] = useState(4); // mayo = 4
  const [year, setYear] = useState(2026);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const monthNames = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];

  const days = ["27", "28", "29", "30", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "1", "2", "3", "4", "5", "6", "7"];
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
  const years = Array.from({ length: 7 }, (_, i) => 2024 + i);
  const time = `${hour}:${minute}`;

  const handleOpen = () => {
    setOpen(true);
  };

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  return (
    <div className="v-field dt-shell">
      <span className="v-field-label">{label}{required && <span className="text-[#69BFB7]"> *</span>}</span>
      <button
        ref={triggerRef}
        className="dt-trigger"
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
      >
        <span>{monthNames[month]} {day}, {year}</span>
        <span className="dt-time">{time}</span>
        <span className="dt-icon">▾</span>
      </button>

      {open && createPortal(
        <div className="dt-portal-root">
          <div className="dt-backdrop" onClick={() => setOpen(false)} />
          <div
            className="dt-popover"
            style={{ 
              position: "fixed", 
              top: "50%", 
              left: "50%", 
              transform: "translate(-50%, -50%)", 
              width: 520 
            }}
          >
            <div className="dt-head">
              <div className="dt-head-left">
                <button type="button" className="dt-nav-btn" onClick={prevMonth}>‹</button>
                <span>{monthNames[month]} de {year}</span>
                <button type="button" className="dt-nav-btn" onClick={nextMonth}>›</button>
              </div>
              <div className="dt-head-right">
                <select className="dt-year-select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <button type="button" className="dt-close" onClick={() => setOpen(false)}>✕</button>
              </div>
            </div>
            <div className="dt-body">
              <div className="dt-cal">
                <div className="dt-week"><span>LU</span><span>MA</span><span>MI</span><span>JU</span><span>VI</span><span>SA</span><span>DO</span></div>
                <div className="dt-days">
                  {days.map((item, index) => (
                    <button
                      key={`${item}-${index}`}
                      type="button"
                      className={item === day ? "is-active" : ""}
                      onClick={() => setDay(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div className="dt-time-col" data-label="HORA">
                {hours.map((item) => (
                  <button key={`h-${item}`} type="button" className={item === hour ? "is-active" : ""} onClick={() => setHour(item)}>
                    {item}
                  </button>
                ))}
              </div>
              <div className="dt-time-col" data-label="MIN">
                {minutes.map((item) => (
                  <button key={`m-${item}`} type="button" className={item === minute ? "is-active" : ""} onClick={() => setMinute(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="dt-actions">
              <button type="button" onClick={() => setOpen(false)}>Borrar</button>
              <button type="button" onClick={() => setOpen(false)}>Hoy</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ════════════════ VISTAS ════════════════ */

function MissionShell({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="v-page exp-create">
      <div className="mission-brief">
        <div>
          <span className="mission-kicker">{kicker}</span>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </div>
  );
}

function MissionStack({ children }: { children: React.ReactNode }) {
  return <div className="mission-stack">{children}</div>;
}

function FilterChip({ label, active }: { label: string; active?: boolean }) {
  return <button className={`mission-filter-chip ${active ? "is-active" : ""}`}>{label}</button>;
}

function ExpeditionFlow({ current }: { current: "PLANIFICADA" | "ACTIVA" | "COMPLETADA" | "CANCELADA" }) {
  const steps = ["PLANIFICADA", "PREPARACIÓN", "EN CURSO", "RETORNO", "COMPLETADA"];
  const activeIndex = current === "PLANIFICADA" ? 0 : current === "ACTIVA" ? 2 : current === "COMPLETADA" ? 4 : 0;
  return (
    <div className="exp-flow">
      {steps.map((step, index) => (
        <div key={step} className={`exp-flow-step ${index <= activeIndex ? "is-active" : ""}`}>
          <span>{step}</span>
          {index < steps.length - 1 && <i />}
        </div>
      ))}
    </div>
  );
}

/* ════════ CHART DATA ════════ */
const MONTHLY_DATA = [
  { mes: "Ene", expediciones: 4 }, { mes: "Feb", expediciones: 6 }, { mes: "Mar", expediciones: 3 },
  { mes: "Abr", expediciones: 8 }, { mes: "May", expediciones: 5 }, { mes: "Jun", expediciones: 7 },
  { mes: "Jul", expediciones: 9 }, { mes: "Ago", expediciones: 6 }, { mes: "Sep", expediciones: 4 },
  { mes: "Oct", expediciones: 7 }, { mes: "Nov", expediciones: 5 }, { mes: "Dic", expediciones: 3 },
];

const STATUS_PIE_DATA = [
  { name: "Completadas", value: 24, color: "#4ade80" },
  { name: "Perdidas", value: 4, color: "#991b1b" },
  { name: "En Progreso", value: 5, color: "#69BFB7" },
  { name: "Retrasadas", value: 3, color: "#f59e0b" },
];

const CHART_THEME = {
  teal: "#69BFB7", grid: "rgba(103,172,169,0.12)", text: "rgba(164,194,197,0.6)",
};

const chartTooltipStyle = {
  contentStyle: { background: "rgba(4,14,14,0.92)", border: "1px solid rgba(105,191,183,0.4)", fontSize: 11 },
  labelStyle: { color: "#69BFB7", fontWeight: 700 },
};

/* ── DASHBOARD ── */
export function ExpDashboard({ onNavigate }: { onNavigate?: (sub: string, id?: number) => void }) {
  return (
    <MissionShell
      kicker="Centro de mando"
      title="Dashboard de Expediciones"
    >
      <MissionStack>
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-sm font-black tracking-widest text-[#69BFB7] uppercase">Panel de Control Operativo</h2>
          <Btn onClick={() => onNavigate?.("Crear expedición")}>+ Crear expedición</Btn>
        </div>

        <div className="mission-filter-row">
          <FilterChip label="Todas" active />
          <FilterChip label="Activas" />
          <FilterChip label="Planificadas" />
          <FilterChip label="Completadas" />
          <FilterChip label="Canceladas" />
        </div>

        <div className="mission-card mission-card-wide">
          <div className="mission-card-title">Métricas Globales</div>
          <div className="v-kpi-grid">
            <KpiCard label="Activas / Retrasadas" value="5 / 3" accent />
            <KpiCard label="Completadas" value={24} />
            <KpiCard label="Perdidas / Rescatadas" value="4 / 1" />
          </div>
        </div>

        <div className="mission-grid mission-grid-dashboard">
          <div className="mission-card">
            <div className="mission-card-title">Tendencia Anual</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={MONTHLY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
                <XAxis dataKey="mes" tick={{ fill: CHART_THEME.text, fontSize: 10 }} />
                <YAxis tick={{ fill: CHART_THEME.text, fontSize: 10 }} />
                <Tooltip {...chartTooltipStyle} />
                <Area type="monotone" dataKey="expediciones" stroke={CHART_THEME.teal} fill={CHART_THEME.teal} fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mission-card">
            <div className="mission-card-title">Estado General</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={STATUS_PIE_DATA} innerRadius={40} outerRadius={70} dataKey="value" strokeWidth={0}>
                  {STATUS_PIE_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip {...chartTooltipStyle} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mission-card mission-card-wide">
          <div className="mission-card-title">Timeline — Próximas Salidas</div>
          <div className="v-table-wrap">
            <table className="v-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th>Partida</th>
                  <th>Participantes</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_EXPEDITIONS.slice(0, 3).map(e => (
                  <tr key={e.id}>
                    <td className="font-bold">{e.name}</td>
                    <td><StatusBadge status={e.status} /></td>
                    <td>{e.departure}</td>
                    <td className="text-center">{e.participants}</td>
                    <td><Btn small variant="ghost" onClick={() => onNavigate?.("Detalles de Expedición", e.id)}>Ver</Btn></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mission-card mission-card-wide">
          <div className="mission-card-title">Alertas de Campo</div>
          <div className="flex flex-col gap-2">
            <div className="v-alert v-alert-warn">⚠️ Expedición "Río Oeste" no tiene participantes asignados</div>
            <div className="v-alert v-alert-warn">⚠️ Expedición "Montaña Negra" está retrasada (3 días extra)</div>
          </div>
        </div>
      </MissionStack>
    </MissionShell>
  );
}

/* ── CREACIÓN (WIZARD 5 PASOS) ── */
export function ExpCrear() {
  const [step, setStep] = useState(1);

  const steps = ["Información", "Ubicación", "Fechas", "Recursos", "Resumen"];

  return (
    <MissionShell kicker="Nuevo protocolo de salida" title="Crear Expedición">
      <MissionStack>
        <div className="mission-wizard-steps">
          {steps.map((s, i) => (
            <div key={s} className={`mission-wizard-step ${i + 1 <= step ? "is-active" : ""}`}>
              <span className="mission-wizard-num">{i + 1}</span>
              <span className="mission-wizard-label">{s}</span>
            </div>
          ))}
        </div>

        <div className="mission-card mission-card-wide">
          {step === 1 && (
            <div className="v-form-grid">
              <div className="mission-card-title">Paso 1: Información General</div>
              <InputField label="Nombre de expedición" placeholder="Ej: Valle Profundo" required />
              <TextareaField label="Objetivo / Descripción" placeholder="Objetivo de la misión, recursos esperados..." />
            </div>
          )}

          {step === 2 && (
            <div className="v-form-grid">
              <div className="mission-card-title">Paso 2: Ubicación y Destino</div>
              <InputField label="Descripción del destino" placeholder="Ej: Valle a 50km norte" />
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Latitud" type="number" placeholder="-90 a 90" />
                <InputField label="Longitud" type="number" placeholder="-180 a 180" />
              </div>
              <Btn variant="ghost">Ver en mapa</Btn>
            </div>
          )}

          {step === 3 && (
            <div className="v-form-grid">
              <div className="mission-card-title">Paso 3: Fechas y Contingencia</div>
              <div className="grid grid-cols-2 gap-3">
                <DateTimeField label="Partida planeada" required defaultDay="18" defaultTime="08:00" />
                <DateTimeField label="Retorno planeado" defaultDay="23" defaultTime="18:00" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Duración estimada (días)" type="number" />
                <InputField label="Días extras permitidos" type="number" value="0" />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="v-form-grid">
              <div className="mission-card-title">Paso 4: Recursos Iniciales</div>
              <div className="grid grid-cols-[1fr_100px_auto] gap-2 items-end">
                <SelectField label="Tipo de Recurso" options={[{id: 1, name: "Alimentos"}, {id: 2, name: "Agua"}]} />
                <InputField label="Cantidad" type="number" />
                <Btn variant="ghost" style={{ marginTop: 20 }}>Agregar</Btn>
              </div>
              <div className="text-[10px] text-[#A4C2C5]/50 mt-2">Aún no se han agregado recursos.</div>
            </div>
          )}

          {step === 5 && (
            <div className="v-form-grid">
              <div className="mission-card-title">Paso 5: Resumen y Confirmación</div>
              <div className="mission-summary-list">
                <div><span>Expedición</span><strong>Valle Profundo</strong></div>
                <div><span>Destino</span><strong>Valle a 50km norte</strong></div>
                <div><span>Salida</span><strong>18/05/2026 08:00</strong></div>
                <div><span>Días extra</span><strong>0</strong></div>
              </div>
            </div>
          )}
        </div>

        <div className="mission-wizard-actions">
          <Btn variant="ghost" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}>Atrás</Btn>
          {step < 5 ? (
            <Btn variant="primary" onClick={() => setStep(s => Math.min(5, s + 1))}>Siguiente</Btn>
          ) : (
            <Btn variant="success">Confirmar y Crear Expedición</Btn>
          )}
        </div>
      </MissionStack>
    </MissionShell>
  );
}

/* ── LISTADO ── */
export function ExpLista({ onNavigate }: { onNavigate?: (sub: string, id?: number) => void }) {
  return (
    <MissionShell
      kicker="Control de rutas"
      title="Listado de Expediciones"
    >
      <MissionStack>
        <div className="mission-card mission-card-wide">
          <div className="mission-card-title">Búsqueda de Expediciones</div>
          <div className="grid grid-cols-[1fr_220px_auto_auto] gap-3 items-end">
            <InputField label="Nombre" placeholder="Buscar..." />
            <SelectField label="Estado" options={[{id: 'all', name: 'Todos'}, {id: 'PLANNED', name: 'Planeada'}, {id: 'LOST', name: 'Perdida'}]} />
            <Btn variant="ghost" style={{ marginTop: 20 }}>Exportar CSV</Btn>
            <Btn variant="ghost" style={{ marginTop: 20 }}>Limpiar</Btn>
          </div>
        </div>

        <div className="mission-card mission-card-wide">
          <div className="mission-card-title">Listado General</div>
          <div className="v-table-wrap">
            <table className="v-table">
              <thead>
                <tr>
                  <th>Expedición</th>
                  <th>Estado</th>
                  <th>Salida</th>
                  <th>Regreso</th>
                  <th>Días Extra</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_EXPEDITIONS.map(e => (
                  <tr key={e.id}>
                    <td className="font-bold">{e.name}</td>
                    <td><StatusBadge status={e.status} /></td>
                    <td>{e.departure}</td>
                    <td>{e.returnDate}</td>
                    <td className="text-center">{e.extraUsed}/{e.extraDays}</td>
                    <td>
                      <div className="flex gap-1">
                        <Btn small variant="ghost" onClick={() => onNavigate?.("Detalles de Expedición", e.id)}>Ver</Btn>
                        <Btn small variant="ghost">Editar</Btn>
                        {(e.status === "IN_PROGRESS" || e.status === "DELAYED") && <Btn small variant="success">Completar</Btn>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center mt-3 text-[10px] text-[#A4C2C5]/50">
            <span>Mostrando 6 de 247 expediciones</span>
            <div className="flex gap-1">
              <Btn small variant="ghost">◄ Anterior</Btn>
              <Btn small variant="primary">1</Btn>
              <Btn small variant="ghost">2</Btn>
              <Btn small variant="ghost">Siguiente ►</Btn>
            </div>
          </div>
        </div>
      </MissionStack>
    </MissionShell>
  );
}

/* ── DETALLES (UNIFICADA POR TABS) ── */
export function ExpDetalles({ expeditionId, onNavigate }: { expeditionId?: number; onNavigate?: (sub: string) => void }) {
  const [activeTab, setActiveTab] = useState<"detalles" | "participantes" | "recursos">("detalles");
  const exp = MOCK_EXPEDITIONS.find(e => e.id === expeditionId) || MOCK_EXPEDITIONS[0];

  return (
    <MissionShell
      kicker="Bitácora de misión"
      title={exp.name}
    >
      <MissionStack>
        <div className="mission-card mission-card-wide">
          <div className="mission-header-row">
            <div>
              <Btn small variant="ghost" onClick={() => onNavigate?.("Lista de expediciones")}>← Volver al listado</Btn>
              <h2 className="mission-inline-title">📍 {exp.name} <span>#{exp.id}00</span></h2>
              <div className="flex gap-2 mt-1">
                <StatusBadge status={exp.status} />
                <span className="text-[10px] text-[#67ACA9]/60 uppercase font-bold self-center">Objetivo: Reconocimiento de zona norte</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Btn variant="ghost">Editar</Btn>
              <Btn variant="success">Completar</Btn>
              <Btn variant="danger">Cancelar</Btn>
            </div>
          </div>
          <div className="mt-5">
            <ExpeditionFlow current={exp.status === "COMPLETED" ? "COMPLETADA" : exp.status === "CANCELED" ? "CANCELADA" : exp.status === "PLANNED" ? "PLANIFICADA" : "ACTIVA"} />
          </div>
        </div>

        <div className="mission-tabs">
          <button className={activeTab === "detalles" ? "is-active" : ""} onClick={() => setActiveTab("detalles")}>Detalles</button>
          <button className={activeTab === "participantes" ? "is-active" : ""} onClick={() => setActiveTab("participantes")}>Participantes</button>
          <button className={activeTab === "recursos" ? "is-active" : ""} onClick={() => setActiveTab("recursos")}>Recursos</button>
        </div>

        {activeTab === "detalles" && (
          <div className="mission-grid mission-grid-details">
            <div className="mission-stack">
              <div className="mission-card">
                <div className="mission-card-title">Cronograma</div>
                <div className="flex flex-col gap-2 text-[11px]">
                  <div className="flex justify-between border-b border-[#67ACA9]/10 pb-1"><span>Partida planeada:</span> <span className="text-[#A4C2C5]">{exp.departure}</span></div>
                  <div className="flex justify-between border-b border-[#67ACA9]/10 pb-1"><span>Retorno planeado:</span> <span className="text-[#A4C2C5]">{exp.returnDate}</span></div>
                  <div className="flex justify-between border-b border-[#67ACA9]/10 pb-1"><span>Partida real:</span> <span className="text-[#69BFB7]">{exp.departure} (08:15)</span></div>
                  <div className="flex justify-between border-b border-[#67ACA9]/10 pb-1"><span>Duración:</span> <span className="text-[#A4C2C5]">5 días</span></div>
                  <div className="flex justify-between font-bold"><span>Contingencia:</span> <span className="text-amber-400">{exp.extraUsed}/{exp.extraDays} días usados ⏱️</span></div>
                </div>
              </div>
              <div className="mission-card">
                <div className="mission-card-title">Ubicación</div>
                <div className="flex flex-col gap-3">
                  <p className="text-[11px] text-[#A4C2C5]">Valle a 50km norte del campamento principal.</p>
                  <div className="p-2 bg-black/30 border border-[#67ACA9]/20 rounded-sm font-mono text-[9px] text-[#69BFB7]">
                    Coords: 41.234567, -2.876543
                  </div>
                  <div className="flex gap-2">
                    <Btn small variant="ghost">Copiar Coords</Btn>
                    <Btn small variant="ghost">Ver en Google Maps</Btn>
                  </div>
                </div>
              </div>
            </div>
            <div className="mission-card mission-summary-card">
              <div className="mission-card-title">Resumen de Misión</div>
              <div className="mission-summary-list">
                <div><span>Participantes</span><strong>{exp.participants}</strong></div>
                <div><span>Recursos</span><strong>{exp.resources}</strong></div>
                <div><span>Duración</span><strong>5 días</strong></div>
                <div><span>Días extra</span><strong>{exp.extraUsed}/{exp.extraDays}</strong></div>
                <div><span>Destino</span><strong>{exp.dest}</strong></div>
                <div><span>Estado</span><strong>{exp.status}</strong></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "participantes" && (
          <>
            <div className="mission-card mission-card-wide">
              <div className="mission-card-title">Participantes ({MOCK_PARTICIPANTS.length}/20)</div>
              <div className="v-table-wrap">
                <table className="v-table">
                  <thead>
                    <tr>
                      <th>Persona</th>
                      <th>Rol en Misión</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_PARTICIPANTS.map(p => (
                      <tr key={p.id}>
                        <td className="font-bold">{p.name}</td>
                        <td>{p.role}</td>
                        <td><StatusBadge status={p.status} /></td>
                        <td><Btn small variant="danger">✕</Btn></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mission-card mission-card-wide">
              <div className="mission-card-title">Agregar Participante</div>
              <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <SelectField label="Persona" options={[{id: 1, name: "Mario Hugo"}, {id: 2, name: "Ana García"}]} />
                <InputField label="Rol en expedición" placeholder="Ej: Guía de montaña" />
                <Btn variant="primary" style={{ marginTop: 20 }}>Confirmar Asignación</Btn>
              </div>
            </div>
          </>
        )}

        {activeTab === "recursos" && (
          <>
            <div className="mission-card mission-card-wide">
              <div className="mission-card-title">Recursos Consumidos</div>
              <div className="v-table-wrap">
                <table className="v-table">
                  <thead>
                    <tr>
                      <th>Recurso</th>
                      <th>Cantidad</th>
                      <th>Fecha</th>
                      <th>Registrado por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_RESOURCES_CONSUMED.map((r, i) => (
                      <tr key={i}>
                        <td className="font-bold">{r.type}</td>
                        <td>{r.amount} {r.unit}</td>
                        <td>{r.date}</td>
                        <td>{r.user}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mission-card mission-card-wide">
              <div className="mission-card-title">Recursos Obtenidos</div>
              <div className="v-table-wrap">
                <table className="v-table">
                  <thead>
                    <tr>
                      <th>Recurso</th>
                      <th>Cantidad</th>
                      <th>Categoría</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="font-bold">Plantas medicinales</td>
                      <td>25.50 kg</td>
                      <td><StatusBadge status="MEDICAL" /></td>
                      <td><Btn small variant="danger">✕</Btn></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mt-4 items-end">
                <SelectField label="Tipo" options={[{id: 1, name: "Plantas"}, {id: 2, name: "Carne"}]} />
                <InputField label="Cantidad" type="number" />
                <Btn variant="primary" style={{ marginTop: 18 }}>Registrar</Btn>
              </div>
            </div>
          </>
        )}
      </MissionStack>
    </MissionShell>
  );
}



/* ════════ PERSONAS (VISTA SOLO LECTURA + ASIGNAR) ════════ */


type PersonCard = ExpeditionPerson;

interface PlannedExpeditionCard {
  id: number;
  name: string;
  destination: string;
  objective: string;
  plannedDate: string;
  riskLevel: string;
  status: string;
  participants: number;
  maxParticipants: number;
}

const PEOPLE_PAGE_SIZE = 6;

export function PersonasView({ onNavigate }: { onNavigate?: (sub: string, id?: number) => void }) {
  const [peopleCards, setPeopleCards] = useState<PersonCard[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<PersonCard | null>(null);
  
  // Planned expeditions loaded dynamically from backend.
  const [plannedExpeditions, setPlannedExpeditions] = useState<PlannedExpeditionCard[]>([]);

  // Track mapping from personId to assigned expeditionIds.
  const [assignments, setAssignments] = useState<Record<number, number[]>>({});
  const [successAssignment, setSuccessAssignment] = useState<{ message: string; expId: number } | null>(null);
  const [isLoadingPeople, setIsLoadingPeople] = useState(true);
  const [peopleError, setPeopleError] = useState("");
  const [page, setPage] = useState(1);
  const [assigningKey, setAssigningKey] = useState("");
  const totalPages = Math.max(1, Math.ceil(peopleCards.length / PEOPLE_PAGE_SIZE));
  const currentPeople = peopleCards.slice((page - 1) * PEOPLE_PAGE_SIZE, page * PEOPLE_PAGE_SIZE);

  const syncStore = async () => {
    setIsLoadingPeople(true);
    setPeopleError("");

    try {
      const user = await getCurrentExpeditionUser();
      const [people, expeditions] = await Promise.all([
        listAvailablePeople(user.campId),
        listUiExpeditions({ campId: user.campId, status: "PLANNED" }),
      ]);
      const activePlanned = expeditions.filter(e => e.status === "PLANNED" || e.status === "PLANIFICADA");
      const participantLists = await Promise.all(
        activePlanned.map((expedition) => listExpeditionParticipants(expedition.id)),
      );
      const nextAssignments: Record<number, number[]> = {};

      participantLists.forEach((participants, index) => {
        const expeditionId = activePlanned[index].id;
        participants.forEach((participant) => {
          if (participant.status === "WITHDRAWN") return;
          nextAssignments[participant.personId] = [
            ...(nextAssignments[participant.personId] || []),
            expeditionId,
          ];
        });
      });

      setPeopleCards(people);
      setPlannedExpeditions(activePlanned.map((e, index) => ({
        id: e.id,
        name: e.name,
        destination: e.dest,
        objective: e.objective,
        plannedDate: e.departure.split(" ")[0] || "Pendiente",
        riskLevel: e.danger || "Medio",
        status: "Planeada",
        participants: participantLists[index]?.filter((participant) => participant.status !== "WITHDRAWN").length || e.participants || 0,
        maxParticipants: 10
      })));
      setAssignments(nextAssignments);
      setPage(1);

      if (people.length === 0) {
        setPeopleError("No hay personas activas con rol de expedicion o scout para este campamento.");
      }
    } catch (error) {
      console.error("Unable to load people from backend", error);
      setPeopleCards([]);
      setPlannedExpeditions([]);
      setAssignments({});
      setPeopleError("No se pudo cargar personal desde el backend.");
    } finally {
      setIsLoadingPeople(false);
    }
  };

  useEffect(() => {
    syncStore();
  }, []);

  const handleAssign = async (personId: number, expeditionId: number) => {
    // 1. Double check safety rules
    const currentPersonAssignments = assignments[personId] || [];
    if (currentPersonAssignments.includes(expeditionId)) return;

    const person = peopleCards.find((item) => item.id === personId);
    const exp = plannedExpeditions.find(e => e.id === expeditionId);
    const key = `${personId}-${expeditionId}`;

    setAssigningKey(key);
    try {
      await createExpeditionParticipant({
        personId,
        expeditionId,
        expeditionRole: person?.role || "EXPEDITION_MEMBER",
      });

      setAssignments((current) => ({
        ...current,
        [personId]: [...(current[personId] || []), expeditionId],
      }));
      setPlannedExpeditions((current) => current.map((item) => (
        item.id === expeditionId ? { ...item, participants: item.participants + 1 } : item
      )));

    // 5. Set visual success message
    setSuccessAssignment({
      message: `Persona asignada correctamente a la expedición "${exp?.name || "Expedición"}".`,
      expId: expeditionId
    });
    } catch (error) {
      console.error("Unable to assign person to expedition", error);
      setSuccessAssignment({
        message: "No se pudo registrar la asignacion en el backend. Revise permisos o disponibilidad.",
        expId: expeditionId
      });
    } finally {
      setAssigningKey("");
    }
  };

  const handleCloseModal = () => {
    setSelectedPerson(null);
    setSuccessAssignment(null);
  };

  const handleGoToDetails = (expId: number) => {
    if (onNavigate) {
      onNavigate("Detalles de Expedición", expId);
    }
  };

  return (
    <MissionShell
      kicker="Registro humano"
      title="Personas del Campamento"
    >
      <MissionStack>
        <div className="mission-card mission-card-wide">
          <div className="mission-card-title">Personal Disponible en Campamento</div>
          {isLoadingPeople && (
            <div className="p-6 text-center text-xs font-mono text-[#69BFB7] uppercase tracking-widest animate-pulse">
              Cargando personal del backend...
            </div>
          )}
          {!isLoadingPeople && peopleError && (
            <div className="mb-4 p-3 border border-amber-500/30 bg-amber-500/10 text-amber-200 text-[10px] uppercase font-bold tracking-wide">
              {peopleError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentPeople.map((person) => {
              const isAvailable = person.status === "ACTIVE";
              const personAssignments = assignments[person.id] || [];

              return (
                <div key={person.id} className="v-person-card flex flex-col justify-between h-full">
                  <div>
                    {/* PHOTO AREA (takes full horizontal block as per index.css styles) */}
                    <div className="v-person-photo-wrap flex-shrink-0">
                      <img src={person.img} alt={person.name} className="v-person-photo" referrerPolicy="no-referrer" />
                      <div className={`v-person-status-dot ${isAvailable ? "bg-emerald-500" : "bg-blue-500 animate-pulse"}`} />
                    </div>
                    
                    {/* INFO AREA containing the name, age, role and availability */}
                    <div className="v-person-info mt-3">
                      <h4 className="v-person-name text-base font-black text-[#f0fafa] uppercase">{person.name}</h4>
                      <div className="flex flex-col gap-1 mt-1.5 text-xs">
                        <span className="v-person-detail">Edad: <span className="text-[#A4C2C5]">{person.age} años</span></span>
                        <span className="v-person-detail">Puesto: <span className="text-[#69BFB7] font-bold">{person.role}</span></span>
                        <span className="v-person-detail font-medium">
                          Estado: <span className={`text-[10px] uppercase font-bold ${isAvailable ? "text-emerald-400" : "text-amber-400"}`}>{person.status.replace("_", " ")}</span>
                        </span>
                      </div>
                    </div>

                    {/* Active Assignments Info on Card to satisfy "actualizar visualmente" */}
                    {personAssignments.length > 0 && (
                      <div className="mt-3.5 pt-2.5 border-t border-[#67ACA9]/20 font-mono text-[10px]">
                        <span className="text-[#A4C2C5]/50 uppercase tracking-tight block text-[8px] font-bold mb-1.5">Misiones Asignadas</span>
                        <div className="flex flex-col gap-1.5">
                          {personAssignments.map(expId => {
                            const matchedExp = plannedExpeditions.find(e => e.id === expId);
                            return (
                              <div key={expId} className="flex flex-col bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2 py-1 rounded-sm text-[10px] font-semibold leading-tight">
                                <span className="uppercase text-[9px] font-bold">✓ {matchedExp?.name || "Expedición"}</span>
                                <span className="text-[8px] text-emerald-400/80 italic mt-0.5 line-clamp-1">Destino: {matchedExp?.destination}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="v-person-actions mt-4 pt-2 border-t border-[#67ACA9]/5">
                    <Btn 
                      variant={isAvailable ? "primary" : "ghost"} 
                      small 
                      style={{ width: '100%', opacity: isAvailable ? 1 : 0.4 }} 
                      disabled={!isAvailable}
                      onClick={() => isAvailable && setSelectedPerson(person)}
                    >
                      {isAvailable ? "Asignar a Expedición" : "No Disponible"}
                    </Btn>
                  </div>
                </div>
              );
            })}
          </div>
          {!isLoadingPeople && peopleCards.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5 pt-4 border-t border-[#67ACA9]/15 font-mono text-[10px] uppercase tracking-wider">
              <span className="text-[#A4C2C5]/60">
                Mostrando {currentPeople.length} de {peopleCards.length} personas | Pagina {page} de {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Btn
                  small
                  variant="ghost"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Anterior
                </Btn>
                <Btn
                  small
                  variant="ghost"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Siguiente
                </Btn>
              </div>
            </div>
          )}
        </div>

        {/* HIGH-TECH POPUP / OVERLAY FOR EXPEDITION ASSIGNMENT IN REACT PORTAL TO PREVENT CLIPPING */}
        {selectedPerson && createPortal(
          <div className="fixed inset-0 bg-[#020706]/92 backdrop-blur-md flex items-center justify-center z-[9999] p-3 md:p-4 overflow-y-auto">
            <div 
              className="bg-[#051717] border border-[#67ACA9]/40 max-w-2xl w-full text-[#A4C2C5] relative rounded shadow-[0_0_50px_rgba(103,172,169,0.35)] flex flex-col my-auto max-h-[92vh] md:max-h-[88vh] overflow-hidden"
              id="assignment-modal"
            >
              {/* Top title area - Sticky */}
              <div className="flex justify-between items-center border-b border-[#67ACA9]/25 p-4 md:px-6 md:py-4 bg-[#051717] z-10 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#69BFB7] rounded-full animate-pulse" />
                  <span className="font-mono text-[9px] tracking-[2.5px] text-[#69BFB7] font-bold uppercase">PROTOCOLO DE ASIGNACIÓN ESTRATÉGICA</span>
                </div>
                <button 
                  onClick={handleCloseModal}
                  className="p-1 rounded bg-[#67ACA9]/10 border border-[#67ACA9]/25 hover:border-red-500 hover:bg-red-500/20 text-[#A4C2C5] hover:text-red-400 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Modal Content */}
              <div className="overflow-y-auto p-4 md:p-6 flex-grow custom-scrollbar scroll-smooth">
                {!successAssignment ? (
                  <>
                    <div className="mb-2">
                      <h3 className="text-xl font-black text-[#f0fafa] uppercase tracking-wide mb-3">Asignar a expedición</h3>
                      
                      {/* Selected Person Bio Card */}
                      <div className="flex items-center bg-[#072020]/75 border border-[#67ACA9]/20 p-3 md:p-4 rounded-sm mb-5">
                        <div className="w-11 h-11 rounded-full overflow-hidden border border-[#69BFB7]/40 mr-4 flex-shrink-0">
                          <img 
                            src={selectedPerson.img} 
                            alt={selectedPerson.name} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-grow min-w-0">
                          <h4 className="text-base font-black text-[#69BFB7] uppercase truncate">{selectedPerson.name}</h4>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-xs">
                            <div>
                              <span className="font-mono text-[9px] text-[#A4C2C5]/50 block uppercase">Puesto / Oficio</span>
                              <span className="font-bold text-[#A4C2C5] truncate block">{selectedPerson.role}</span>
                            </div>
                            <div>
                              <span className="font-mono text-[9px] text-[#A4C2C5]/50 block uppercase">Estado actual</span>
                              <span className="font-bold text-emerald-400 flex items-center gap-1 text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block" /> Disponible
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <h4 className="font-mono text-[9px] text-[#69BFB7]/80 tracking-[2px] uppercase font-bold mb-3 flex items-center gap-1.5">
                        <span className="w-1 h-3 bg-[#69BFB7]/55 inline-block" /> EXPEDICIONES DE ESTADO PLANEADA
                      </h4>

                      {/* Planned Expeditions List inside Modal */}
                      <div className="flex flex-col gap-3">
                        {plannedExpeditions.map((exp) => {
                          const isAssigned = (assignments[selectedPerson.id] || []).includes(exp.id);
                          const isFull = exp.participants >= exp.maxParticipants;

                          return (
                            <div 
                              key={exp.id} 
                              className={`p-3 bg-black/45 border transition-all rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                                isAssigned 
                                  ? "border-emerald-500/40 bg-emerald-500/5 shadow-[rgba(16,185,129,0.02)_0_0_15px_inset]" 
                                  : isFull 
                                    ? "border-red-500/20 opacity-60 bg-red-950/5" 
                                    : "border-[#67ACA9]/20 hover:border-[#69BFB7]/40 hover:bg-white/[0.01]"
                              }`}
                            >
                              <div className="flex-grow min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-sm text-[#f0fafa] uppercase tracking-wide truncate">{exp.name}</span>
                                  <span className="font-mono text-[8px] bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/20 uppercase font-bold flex-shrink-0">
                                    {exp.status}
                                  </span>
                                </div>

                                {/* Responsive Grid to prevent text overlap */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2.5 gap-x-3 mt-2 text-[11px] text-[#A4C2C5]/85">
                                  <div>
                                    <span className="font-mono text-[8px] text-[#A4C2C5]/45 block uppercase">Destino o zona</span>
                                    <span className="font-semibold block truncate max-w-[130px]">{exp.destination}</span>
                                  </div>
                                  <div>
                                    <span className="font-mono text-[8px] text-[#A4C2C5]/45 block uppercase">Fecha planificada</span>
                                    <span className="font-mono">{exp.plannedDate}</span>
                                  </div>
                                  <div>
                                    <span className="font-mono text-[8px] text-[#A4C2C5]/45 block uppercase">Nivel de riesgo</span>
                                    <span className={`font-mono font-bold ${exp.riskLevel === 'Alto' || exp.riskLevel === 'Muy alto' ? 'text-amber-400' : 'text-[#69BFB7]'}`}>
                                      {exp.riskLevel}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-mono text-[8px] text-[#A4C2C5]/45 block uppercase">Cupo asignado</span>
                                    <span className={`font-bold ${isFull ? "text-red-400" : "text-[#A4C2C5]"}`}>
                                      {exp.participants} / {exp.maxParticipants}
                                    </span>
                                  </div>
                                </div>

                                {/* Fully informative Mission/Objective text block */}
                                <div className="mt-2.5 pt-2 border-t border-[#67ACA9]/10">
                                  <span className="font-mono text-[8px] text-[#A4C2C5]/45 block uppercase">Misión / Objetivo</span>
                                  <p className="text-[11.5px] text-emerald-300/90 font-medium italic leading-relaxed">{exp.objective}</p>
                                </div>
                              </div>

                              <div className="flex-shrink-0 self-end md:self-center pt-2 md:pt-0">
                                {isAssigned ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1.5 rounded-sm">
                                    <Check className="w-3 h-3" /> Ya asignada
                                  </span>
                                ) : isFull ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-1.5 rounded-sm">
                                    <AlertTriangle className="w-3 h-3" /> Cupo lleno
                                  </span>
                                ) : (
                                  <Btn 
                                    variant="primary" 
                                    small
                                    disabled={assigningKey === `${selectedPerson.id}-${exp.id}`}
                                    onClick={() => handleAssign(selectedPerson.id, exp.id)}
                                  >
                                    Asignar aquí
                                  </Btn>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  /* SCREEN SHOWING DELIGHTFUL VISUAL SUCCESS & MESSAGE WITH DETAILED EXPLAINER */
                  <div className="text-center py-6 flex flex-col items-center">
                    <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500 rounded-full flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
                      <Check className="w-7 h-7 stroke-[3px]" />
                    </div>
                    
                    <h3 className="text-lg font-black text-emerald-400 uppercase tracking-widest mb-2">ASIGNACIÓN EXITOSA</h3>
                    <p className="text-[#f0fafa] text-sm max-w-md mx-auto mb-6">
                      {successAssignment.message}
                    </p>

                    <div className="bg-[#072020]/75 border border-[#67ACA9]/35 p-4 rounded-sm max-w-md w-full mb-6 text-left font-mono text-[11px] leading-relaxed shadow-[0_0_20px_rgba(16,185,129,0.05)]">
                      <div className="flex justify-between border-b border-[#67ACA9]/10 pb-1.5 mb-1.5">
                        <span className="text-[#A4C2C5]/50 uppercase">PERSONA</span>
                        <strong className="text-emerald-300 font-bold uppercase">{selectedPerson.name} ({selectedPerson.role})</strong>
                      </div>
                      <div className="flex justify-between border-b border-[#67ACA9]/10 pb-1.5 mb-1.5">
                        <span className="text-[#A4C2C5]/50 uppercase">EXPEDICIÓN</span>
                        <strong className="text-[#69BFB7] font-bold uppercase">
                          {plannedExpeditions.find(e => e.id === successAssignment.expId)?.name}
                        </strong>
                      </div>
                      <div className="border-b border-[#67ACA9]/10 pb-1.5 mb-1.5">
                        <span className="text-[#A4C2C5]/50 uppercase block">MISIÓN DE ASIGNACIÓN</span>
                        <strong className="text-emerald-300 font-semibold italic mt-0.5 block leading-normal">
                          "{plannedExpeditions.find(e => e.id === successAssignment.expId)?.objective}"
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#A4C2C5]/50 uppercase">ESTADO REGISTROS</span>
                        <strong className="text-emerald-400 font-bold uppercase tracking-wider">REGISTRADO CORRECTAMENTE</strong>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-md pt-3 border-t border-[#67ACA9]/10 text-xs">
                      <Btn variant="ghost" onClick={() => handleGoToDetails(successAssignment.expId)} style={{ flex: 1 }}>
                        Ver detalle de expedición
                      </Btn>
                      <Btn variant="success" onClick={handleCloseModal} style={{ flex: 1 }}>
                        Listo / Cerrar
                      </Btn>
                    </div>
                  </div>
                )}
              </div>

              {/* Pinned Footer - Sticky */}
              {!successAssignment && (
                <div className="p-4 bg-[#051717] border-t border-[#67ACA9]/20 flex justify-end gap-3 flex-shrink-0">
                  <Btn variant="ghost" onClick={handleCloseModal}>
                    Cancelar
                  </Btn>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
      </MissionStack>
    </MissionShell>
  );
}

/* ════════ PLACEHOLDER ════════ */
export function PlaceholderView({ section, sub }: { section: string; sub: string }) {
  return (
    <div className="v-page flex items-center justify-center min-h-[300px]">
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-widest text-[#A4C2C5] uppercase">{section} &gt; {sub}</h2>
        <p className="mt-2 text-[#67ACA9]/40 uppercase tracking-wider text-[10px]">Módulo en implementación</p>
      </div>
    </div>
  );
}
