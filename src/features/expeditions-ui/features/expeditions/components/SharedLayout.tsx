import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";

export type ExpeditionStatus = "PLANIFICADA" | "COMPLETADA" | "CANCELADA" | "IN_PROGRESS" | "DELAYED" | "LOST" | "RETURNED_AFTER_LOST" | "PLANNED" | "COMPLETED" | "CANCELED";
export type ParticipantStatus = "ACTIVO" | "BAJA" | "ACTIVE" | "WITHDRAWN" | "ON_EXPEDITION";
export type ResourceCategory = "COMIDA" | "AGUA" | "HIGIENE" | "DEFENSA" | "MUNICION" | "MEDICO" | "OTRO";

export interface Expedition {
  id: number;
  campamento_id?: number;
  name: string;
  dest: string;
  status: ExpeditionStatus;
  departure: string;
  returnDate: string;
  participants: number;
  resources: string;
  extraDays: number;
  extraUsed: number;
  objective?: string;
  created_at?: string;
}

export interface Participant {
  id: number;
  expedicion_id?: number;
  persona_id?: number;
  name: string;
  role?: string;
  status: ParticipantStatus;
  fecha_asignacion?: string;
}

export interface ResourceConsumed {
  type: string;
  unit: string;
  amount: string;
  date: string;
  user: string;
}

export const MOCK_EXPEDITIONS: Expedition[] = [
  { id: 1, name: "Valle Profundo", dest: "Valle a 50km norte", status: "IN_PROGRESS", departure: "15/05 08:00", returnDate: "20/05 18:00", participants: 5, resources: "20 kg", extraDays: 3, extraUsed: 2, objective: "Reconocimiento de zona norte" },
  { id: 2, name: "Río Oeste", dest: "Río a 30km oeste", status: "PLANNED", departure: "28/05 06:00", returnDate: "02/06 16:00", participants: 0, resources: "0", extraDays: 5, extraUsed: 0, objective: "Abastecimiento de agua" },
  { id: 3, name: "Montaña Negra", dest: "Montaña a 70km sur", status: "DELAYED", departure: "10/05 08:00", returnDate: "15/05 18:00", participants: 3, resources: "15 kg", extraDays: 3, extraUsed: 3, objective: "Exploración de fallas tectónicas" },
  { id: 4, name: "Costa Esmeralda", dest: "Playa a 25km este", status: "COMPLETED", departure: "01/05 07:00", returnDate: "05/05 17:00", participants: 8, resources: "45 kg", extraDays: 2, extraUsed: 0, objective: "Estudio de ecosistema costero" },
  { id: 7, name: "Páramo Perdido", dest: "Zona desconocida", status: "LOST", departure: "10/04 08:00", returnDate: "15/04 18:00", participants: 4, resources: "10 kg", extraDays: 0, extraUsed: 0, objective: "Búsqueda arqueológica" },
  { id: 8, name: "Rescate Alfa", dest: "Bosque denso", status: "RETURNED_AFTER_LOST", departure: "20/03 08:00", returnDate: "30/03 18:00", participants: 6, resources: "30 kg", extraDays: 5, extraUsed: 5, objective: "Sintetizar recursos en bosque denso" },
];

export const MOCK_PARTICIPANTS: Participant[] = [
  { id: 1, name: "Mario Hugo", role: "Explorador", status: "ACTIVE" },
  { id: 2, name: "Ana García", role: "Médico de campo", status: "ACTIVE" },
  { id: 3, name: "Juan López", role: "Recolector", status: "WITHDRAWN" },
];

export const MOCK_RESOURCES_CONSUMED: ResourceConsumed[] = [
  { type: "Alimentos", unit: "kg", amount: "45.00", date: "20/05/2026", user: "Admin" },
  { type: "Agua", unit: "lts", amount: "98.50", date: "20/05/2026", user: "Logística" },
];

export const MOCK_PEOPLE_CARDS = [
  { id: 7, name: "Mario Hugo", age: 25, role: "Cazador", status: "ACTIVE", img: "https://i.pravatar.cc/150?u=7" },
  { id: 12, name: "Ana García", age: 35, role: "Médico", status: "ACTIVE", img: "https://i.pravatar.cc/150?u=12" },
  { id: 5, name: "Juan López", age: 28, role: "Recolector", status: "ACTIVE", img: "https://i.pravatar.cc/150?u=5" },
  { id: 3, name: "María Sánchez", age: 31, role: "Cazador", status: "ON_EXPEDITION", img: "https://i.pravatar.cc/150?u=3" },
  { id: 9, name: "Carlos Ruiz", age: 42, role: "Investigador", status: "ACTIVE", img: "https://i.pravatar.cc/150?u=9" },
  { id: 15, name: "Lucía Torres", age: 29, role: "Ingeniero", status: "ACTIVE", img: "https://i.pravatar.cc/150?u=15" },
];

export const STATUS_COLORS: Record<string, string> = {

  PLANNED: "bg-blue-500/30 text-blue-200 border-blue-400/40",
  PLANIFICADA: "bg-blue-500/30 text-blue-200 border-blue-400/40",
  IN_PROGRESS: "bg-emerald-500/30 text-emerald-200 border-emerald-400/40",
  ACTIVA: "bg-emerald-500/30 text-emerald-200 border-emerald-400/40",
  DELAYED: "bg-amber-500/30 text-amber-200 border-amber-400/40",
  COMPLETED: "bg-green-700/30 text-green-200 border-green-500/40",
  COMPLETADA: "bg-green-700/30 text-green-200 border-green-500/40",
  LOST: "bg-red-900/40 text-red-200 border-red-800/50",
  RETURNED_AFTER_LOST: "bg-purple-600/40 text-purple-100 border-purple-500/40",
  CANCELED: "bg-red-500/30 text-red-200 border-red-400/40",
  CANCELADA: "bg-red-500/30 text-red-200 border-red-400/40",
  
  // Participantes
  ACTIVE: "bg-emerald-500/30 text-emerald-200 border-emerald-400/40",
  ACTIVO: "bg-emerald-500/30 text-emerald-200 border-emerald-400/40",
  WITHDRAWN: "bg-gray-600/30 text-gray-300 border-gray-400/40",
  BAJA: "bg-gray-600/30 text-gray-300 border-gray-400/40",

 
  FOOD: "bg-emerald-500/20 text-emerald-300 border-emerald-500/20",
  WATER: "bg-blue-500/20 text-blue-300 border-blue-500/20",
  HYGIENE: "bg-cyan-500/20 text-cyan-300 border-cyan-500/20",
  DEFENSE: "bg-red-500/20 text-red-300 border-red-500/20",
  AMMUNITION: "bg-orange-500/20 text-orange-300 border-orange-500/20",
  MEDICAL: "bg-pink-500/20 text-pink-300 border-pink-500/20",
  OTHER: "bg-gray-500/20 text-gray-300 border-gray-500/20",
};

export const CATEGORY_LABELS: Record<string, string> = {
  FOOD: "Alimentos", WATER: "Agua", HYGIENE: "Higiene", DEFENSE: "Defensa",
  AMMUNITION: "Munición", MEDICAL: "Médico", OTHER: "Otro"
};

export function StatusBadge({ status }: { status: string }) {
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

export function KpiCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`v-kpi ${accent ? "v-kpi-accent" : ""}`}>
      <span className="v-kpi-value">{value}</span>
      <span className="v-kpi-label">{label}</span>
    </div>
  );
}

export function InputField({ label, placeholder, required, type = "text", value, unit }: { label: string; placeholder?: string; required?: boolean; type?: string; value?: string; unit?: string }) {
  return (
    <label className="v-field">
      <span className="v-field-label">{label}{unit && ` (${unit})`}{required && <span className="text-[#69BFB7]"> *</span>}</span>
      <input type={type} className="v-input" placeholder={placeholder} defaultValue={value} />
    </label>
  );
}

export function SelectField({ label, options, required, value }: { label: string; options: {id: string|number, name: string}[]; required?: boolean; value?: string|number }) {
  return (
    <label className="v-field">
      <span className="v-field-label">{label}{required && <span className="text-[#69BFB7]"> *</span>}</span>
      <select className="v-select" defaultValue={value}>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  );
}

export function TextareaField({ label, placeholder, required }: { label: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="v-field">
      <span className="v-field-label">{label}{required && <span className="text-[#69BFB7]"> *</span>}</span>
      <textarea className="v-textarea" placeholder={placeholder} rows={3} />
    </label>
  );
}

export function DateTimeField({ label, required, defaultDay = "18", defaultTime = "08:00" }: { label: string; required?: boolean; defaultDay?: string; defaultTime?: string }) {
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

export function MissionShell({
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

export function MissionStack({ children }: { children: React.ReactNode }) {
  return <div className="mission-stack">{children}</div>;
}

export function FilterChip({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return <button onClick={onClick} className={`mission-filter-chip ${active ? "is-active" : ""}`} type="button">{label}</button>;
}

export function ExpeditionFlow({ current }: { current: "PLANIFICADA" | "ACTIVA" | "COMPLETADA" | "CANCELADA" }) {
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
