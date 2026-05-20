import { useState, useRef } from "react";
  import { createPortal } from "react-dom";
import {
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart,
} from "recharts";



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

const MOCK_INTERCAMP_REQUESTS = [
  { id: 1, origin: "Camp Alfa", destination: "Camp Bravo", status: "PENDING", date: "15/05 08:00", desc: "Traslado médico" },
  { id: 2, origin: "Camp Bravo", destination: "Camp Charlie", status: "APPROVED", date: "12/05 10:00", desc: "Suministros" },
  { id: 3, origin: "Camp Alfa", destination: "Camp Delta", status: "REJECTED", date: "10/05 09:00", desc: "Refuerzos" },
];



const STATUS_COLORS: Record<string, string> = {
  PLANNED: "bg-blue-500/30 text-blue-200 border-blue-400/40",
  IN_PROGRESS: "bg-emerald-500/30 text-emerald-200 border-emerald-400/40",
  DELAYED: "bg-amber-500/30 text-amber-200 border-amber-400/40",
  COMPLETED: "bg-green-700/30 text-green-200 border-green-500/40",
  LOST: "bg-red-900/40 text-red-200 border-red-800/50",
  RETURNED_AFTER_LOST: "bg-purple-600/40 text-purple-100 border-purple-500/40",
  CANCELED: "bg-red-500/30 text-red-200 border-red-400/40",
  ACTIVE: "bg-emerald-500/30 text-emerald-200 border-emerald-400/40",
  WITHDRAWN: "bg-gray-600/30 text-gray-300 border-gray-400/40",
  PENDING: "bg-amber-500/30 text-amber-200 border-amber-400/40",
  APPROVED: "bg-emerald-500/30 text-emerald-200 border-emerald-400/40",
  REJECTED: "bg-red-500/30 text-red-200 border-red-400/40",
  PENDING_DEPARTURE: "bg-blue-500/30 text-blue-200 border-blue-400/40",
  IN_TRANSIT: "bg-blue-500/30 text-blue-200 border-blue-400/40",
  DELIVERED: "bg-emerald-500/30 text-emerald-200 border-emerald-400/40",
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
  const [month, setMonth] = useState(4);
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




export function TrasladosVer() {
  const [view, setView] = useState<"requests" | "transfers">("requests");

  return (
    <MissionShell
      kicker="Operación logística"
      title="Traslados"
    >
      <MissionStack>
        <div className="mission-card mission-card-wide">
          <div className="mission-card-title">Vista Operativa</div>
          <div className="flex gap-2">
            <Btn variant={view === "requests" ? "primary" : "ghost"} onClick={() => setView("requests")}>Solicitudes de Traslado</Btn>
            <Btn variant={view === "transfers" ? "primary" : "ghost"} onClick={() => setView("transfers")}>Transferencias en Ejecución</Btn>
          </div>
        </div>

        {view === "requests" ? (
          <div className="mission-card mission-card-wide">
            <div className="mission-card-title">Solicitudes entre campamentos</div>
            <div className="v-table-wrap">
              <table className="v-table">
                <thead>
                  <tr>
                    <th>Origen</th>
                    <th>Destino</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_INTERCAMP_REQUESTS.map(r => (
                    <tr key={r.id}>
                      <td>{r.origin}</td>
                      <td>{r.destination}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>{r.date}</td>
                      <td>
                        <div className="flex gap-1">
                          {r.status === "PENDING" && <><Btn small variant="success">Aprobar</Btn><Btn small variant="danger">Rechazar</Btn></>}
                          <Btn small variant="ghost">Ver Requisitos</Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="mission-card mission-card-wide">
            <div className="mission-card-title">Transferencias en ejecución</div>
            <div className="v-table-wrap">
              <table className="v-table">
                <thead>
                  <tr>
                    <th>ID Transfer</th>
                    <th>Estado</th>
                    <th>Salida Real</th>
                    <th>Llegada Est.</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-bold">#TR-442</td>
                    <td><StatusBadge status="IN_TRANSIT" /></td>
                    <td>14/05 08:30</td>
                    <td>14/05 18:00</td>
                    <td><Btn small variant="primary">Marcar Llegada</Btn></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </MissionStack>
    </MissionShell>
  );
}

export function TrasladosCrear() {
  return (
    <MissionShell
      kicker="Movimiento estratégico"
      title="Crear Manifiesto de Traslado"
    >
      <MissionStack>
        <div className="mission-grid mission-grid-details">
          <div className="mission-stack">
            <div className="mission-card">
              <div className="mission-card-title">Ruta y Fechas</div>
              <div className="v-form-grid">
                <SelectField label="Origen" options={[{id: 1, name: "Campamento Base Alfa"}]} value={1} />
                <SelectField label="Destino" options={[{id: 2, name: "Camp Bravo"}, {id: 3, name: "Camp Charlie"}]} required />
                <div className="grid grid-cols-2 gap-3">
                  <DateTimeField label="Salida" required defaultDay="18" defaultTime="06:00" />
                  <DateTimeField label="Llegada" required defaultDay="18" defaultTime="14:00" />
                </div>
              </div>
            </div>

            <div className="mission-card">
              <div className="mission-card-title">Personal a Trasladar</div>
              <div className="flex flex-col gap-2">
                {MOCK_PEOPLE_CARDS.slice(0, 3).map(p => (
                  <label key={p.id} className="v-checkbox-row">
                    <input type="checkbox" className="v-checkbox" />
                    <span className="font-bold">{p.name}</span>
                    <span className="text-[#A4C2C5]/50 text-[10px]">({p.role})</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mission-card">
            <div className="mission-card-title">Recursos en Tránsito</div>
            <div className="v-form-grid">
              <div className="grid grid-cols-[1fr_60px_auto] gap-2 items-end">
                <SelectField label="Recurso" options={[{id: 1, name: "Alimentos"}, {id: 2, name: "Agua"}]} />
                <InputField label="Cant." type="number" />
                <Btn small style={{ marginTop: 20 }}>+</Btn>
              </div>
              <div className="mt-4 flex flex-col gap-2 text-[10px]">
                <div className="flex justify-between border-b border-[#67ACA9]/10 pb-1"><span>Alimentos</span><span>50 kg</span></div>
                <div className="flex justify-between border-b border-[#67ACA9]/10 pb-1"><span>Agua</span><span>100 lts</span></div>
              </div>
            </div>
            <div className="mt-6">
              <Btn variant="primary" style={{ width: '100%' }}>Generar Manifiesto</Btn>
            </div>
          </div>
        </div>
      </MissionStack>
    </MissionShell>
  );
}



const MOCK_PEOPLE_CARDS = [
  { id: 7, name: "Mario Hugo", age: 25, role: "Cazador", status: "ACTIVE", img: "https://i.pravatar.cc/150?u=7" },
  { id: 12, name: "Ana García", age: 35, role: "Médico", status: "ACTIVE", img: "https://i.pravatar.cc/150?u=12" },
  { id: 5, name: "Juan López", age: 28, role: "Recolector", status: "ACTIVE", img: "https://i.pravatar.cc/150?u=5" },
  { id: 3, name: "María Sánchez", age: 31, role: "Cazador", status: "ON_EXPEDITION", img: "https://i.pravatar.cc/150?u=3" },
  { id: 9, name: "Carlos Ruiz", age: 42, role: "Investigador", status: "ACTIVE", img: "https://i.pravatar.cc/150?u=9" },
  { id: 15, name: "Lucía Torres", age: 29, role: "Ingeniero", status: "ACTIVE", img: "https://i.pravatar.cc/150?u=15" },
];

export function PersonasView({ onNavigate }: { onNavigate?: (sub: string, id?: number) => void }) {
  return (
    <MissionShell
      kicker="Registro humano"
      title="Personas del Campamento"
    >
      <MissionStack>
        <div className="mission-card mission-card-wide">
          <div className="mission-card-title">Personal Disponible en Campamento</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MOCK_PEOPLE_CARDS.map((person) => (
              <div key={person.id} className="v-person-card">
                <div className="v-person-photo-wrap">
                  <img src={person.img} alt={person.name} className="v-person-photo" />
                  <div className={`v-person-status-dot ${person.status === "ACTIVE" ? "bg-emerald-500" : "bg-blue-500"}`} />
                </div>
                
                <div className="v-person-info">
                  <h4 className="v-person-name">{person.name}</h4>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <span className="v-person-detail">Edad: <span className="text-[#A4C2C5]">{person.age} años</span></span>
                    <span className="v-person-detail">Puesto: <span className="text-[#69BFB7] font-bold">{person.role}</span></span>
                    <span className="v-person-detail">Estado: <span className="text-[9px] uppercase tracking-wider">{person.status.replace("_", " ")}</span></span>
                  </div>
                </div>

                <div className="v-person-actions">
                  <Btn variant="primary" small style={{ width: '100%' }} onClick={() => onNavigate?.("Detalles de Expedición")}>
                    Asignar a Expedición
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        </div>
      </MissionStack>
    </MissionShell>
  );
}


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
