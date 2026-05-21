// @ts-nocheck
import { useState } from "react";
import {
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart, BarChart, Bar
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
  OperationalNotification
} from "../types/resourceManagementTypes";

const currentUser = {
  userId: "3",
  campId: "alfa",
  rol: "RESOURCE_MANAGEMENT"
};

export function Btn({
  children,
  variant = "primary",
  onClick,
  small,
  style,
  disabled
}: {
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "danger" | "success" | "warning";
  onClick?: () => void;
  small?: boolean;
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  const base = small ? "px-2 py-0.5 text-[9px]" : "px-3 py-1.5 text-[11px]";
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
      className={`${base} ${colors} font-bold uppercase tracking-wide rounded-sm transition-all whitespace-nowrap ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      type="button"
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
    <div className="v-page res-management px-2 overflow-y-auto max-h-[70vh]">
      <div className="mission-brief mb-4">
        <div>
          <span className="mission-kicker text-[#69BFB7] text-[10px] font-bold uppercase tracking-[3px] block mb-1">
            {kicker}
          </span>
          <h2 className="text-lg font-black uppercase text-[#f0fafa] tracking-tight">{title}</h2>
        </div>
      </div>
      <div className="mission-stack flex flex-col gap-5">{children}</div>
    </div>
  );
}

// ----------------- Helper text adapters -----------------
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

// ----------------- SUB-COMPONENTS -----------------

/* 1. DASHBOARD DE INVENTARIO */
export function ViewDashboard({
  camps,
  resourceTypes,
  campInventories,
  inventoryAlerts,
  inventoryMovements,
  onNavigateToSub
}: {
  camps: Camp[];
  resourceTypes: ResourceType[];
  campInventories: CampInventory[];
  inventoryAlerts: InventoryAlert[];
  inventoryMovements: InventoryMovement[];
  onNavigateToSub: (sub: string) => void;
}) {
  const totalByResource = campInventories.reduce((acc, curr) => {
    acc[curr.resourceTypeId] = (acc[curr.resourceTypeId] || 0) + curr.currentAmount;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(totalByResource).map(([key, val]) => {
    const type = resourceTypes.find(t => t.id === key);
    return {
      name: type ? type.name : key,
      cantidad: val
    };
  });

  const unresolvedAlerts = inventoryAlerts.filter(a => !a.resolved);
  const recentMovements = inventoryMovements.slice(-5).reverse();

  return (
    <SectionShell kicker="MONITOREO OPERACIONES" title="Dashboard de Inventario y Control">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="v-kpi border border-[#67ACA9]/20 bg-black/40 p-3 rounded-sm flex flex-col justify-between">
          <span className="v-kpi-label text-[9px] text-[#A4C2C5]/70 uppercase font-bold">Reserva Total Almacenes</span>
          <span className="v-kpi-value text-2xl font-black text-white mt-1">
            {campInventories.reduce((sum, item) => sum + item.currentAmount, 0)} <span className="text-xs font-normal">unidades</span>
          </span>
        </div>
        <div className="v-kpi border border-rose-500/20 bg-rose-950/10 p-3 rounded-sm flex flex-col justify-between">
          <span className="v-kpi-label text-[9px] text-rose-400 uppercase font-bold text-rose-300">Alertas de Stock Abiertas 🚨</span>
          <span className="v-kpi-value text-2xl font-black text-rose-400 mt-1">
            {unresolvedAlerts.length} <span className="text-xs font-normal text-rose-300/80">críticos / bajos</span>
          </span>
        </div>
        <div className="v-kpi border border-[#67ACA9]/20 bg-black/40 p-3 rounded-sm flex flex-col justify-between">
          <span className="v-kpi-label text-[9px] text-[#A4C2C5]/70 uppercase font-bold">Campamentos en Sistema</span>
          <span className="v-kpi-value text-2xl font-black text-[#69BFB7] mt-1">{camps.length} <span className="text-xs font-normal">Campamentos</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart */}
        <div className="mission-card border border-[#67ACA9]/20 bg-black/35 p-3 rounded-sm">
          <div className="text-xs font-bold text-[#69BFB7] uppercase mb-2">Existencias Totales Acumuladas</div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
                <XAxis dataKey="name" tick={{ fill: CHART_THEME.text, fontSize: 8 }} />
                <YAxis tick={{ fill: CHART_THEME.text, fontSize: 8 }} />
                <Tooltip {...chartTooltipStyle} />
                <Bar dataKey="cantidad" fill="#69BFB7" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Unresolved Alert List */}
        <div className="mission-card border border-[#67ACA9]/20 bg-black/35 p-3 rounded-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-rose-400 uppercase mb-2 flex justify-between items-center">
              <span>Alertas Críticas Activas</span>
              <Btn small variant="ghost" onClick={() => onNavigateToSub("Alertas de inventario")}>Resolver Alertas</Btn>
            </div>
            <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
              {unresolvedAlerts.map(alert => {
                const camp = camps.find(c => c.id === alert.campId);
                const type = resourceTypes.find(t => t.id === alert.resourceTypeId);
                return (
                  <div key={alert.id} className="text-[10px] bg-red-950/20 border border-red-500/20 rounded-sm p-1.5 py-1 text-red-100 flex justify-between items-center">
                    <span>
                      ⚠️ <strong>{camp?.name || alert.campId}</strong>: {type?.name || alert.resourceTypeId} bajo el mínimo
                    </span>
                    <span className="text-rose-300 font-mono font-bold">{alert.amountAtAlertGeneration} {type?.unitOfMeasure}</span>
                  </div>
                );
              })}
              {unresolvedAlerts.length === 0 && (
                <div className="text-[10px] text-emerald-400 border border-emerald-500/20 p-4 text-center rounded-sm bg-emerald-950/5">
                  ✓ Ninguna alerta de stock activa de momento. Red balanceada.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent movements */}
      <div className="mission-card border border-[#67ACA9]/20 bg-black/35 p-3 rounded-sm">
        <div className="text-xs font-bold text-[#69BFB7] uppercase mb-2">Últimos Operaciones de Inventario Realizados</div>
        <div className="v-table-wrap max-h-40 overflow-y-auto">
          <table className="v-table text-[10px]">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Campamento</th>
                <th>Recurso</th>
                <th>Cantidad</th>
                <th>Encargado</th>
                <th>Fecha / Hora</th>
              </tr>
            </thead>
            <tbody>
              {recentMovements.map(m => {
                const camp = camps.find(c => c.id === m.campId);
                const rt = resourceTypes.find(t => t.id === m.resourceTypeId);
                return (
                  <tr key={m.id}>
                    <td>
                      <span className="px-1 py-0.5 rounded-xs font-bold font-mono text-[8px] border border-[#67ACA9]/20 text-[#69BFB7]">
                        {m.movementType}
                      </span>
                    </td>
                    <td>{camp?.name || m.campId}</td>
                    <td className="font-bold">{rt?.name || m.resourceTypeId}</td>
                    <td>{m.amount} {rt?.unitOfMeasure}</td>
                    <td>{m.recordedBy}</td>
                    <td>{m.date}</td>
                  </tr>
                );
              })}
              {recentMovements.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-[#A4C2C5]/40 italic">Inicie la red de datos para visualizar movimientos de inventario.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SectionShell>
  );
}

/* 2. INVENTARIO DEL CAMPAMENTO */
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
        {/* Tabla de existencias - Full Width */}
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
                      <td className="text-right">
                        {isEditing ? (
                          <div className="flex gap-1 justify-end">
                            <Btn small variant="success" onClick={() => handleUpdate(item.campId, item.resourceTypeId)}>✓ Guardar</Btn>
                            <Btn small variant="ghost" onClick={() => setEditingKey(null)}>✕</Btn>
                          </div>
                        ) : (
                          <Btn small variant="ghost" onClick={() => {
                            setEditingKey(`${item.campId}-${item.resourceTypeId}`);
                            setCurrVal(String(item.currentAmount));
                            setMinVal(String(item.minimumAlertAmount));
                          }}>⚙ Editar</Btn>
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

/* 3. RECOLECCION DIARIA */
export function ViewRecoleccionDiaria({
  camps,
  resourceTypes,
  dailyCollectionRecords,
  onSaveRecord,
  onAdjustRecord,
  onDeleteRecord
}: {
  camps: Camp[];
  resourceTypes: ResourceType[];
  dailyCollectionRecords: DailyCollectionRecord[];
  onSaveRecord: (data: Omit<DailyCollectionRecord, "id">) => void;
  onAdjustRecord: (id: string, actualAmount: number, reason: string) => void;
  onDeleteRecord: (id: string) => void;
}) {
  const campId = currentUser.campId;
  const [personId, setPersonId] = useState("p-colector");
  const [resourceTypeId, setResourceTypeId] = useState("rt-food");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [actualAmount, setActualAmount] = useState("");
  const [differenceReason, setDifferenceReason] = useState("Sin anomalías");
  const recordedBy = currentUser.userId;

  // Adjust modal states
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustVal, setAdjustVal] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expectedAmount || !actualAmount) return;
    onSaveRecord({
      campId,
      personId,
      resourceTypeId,
      date: new Date().toISOString().split("T")[0],
      expectedAmount: Number(expectedAmount),
      actualAmount: Number(actualAmount),
      differenceReason,
      recordedBy,
      movementId: `mov-manual-${Date.now().toString().slice(-4)}`
    });
    setExpectedAmount("");
    setActualAmount("");
    setDifferenceReason("Sin anomalías");
  };

  return (
    <SectionShell kicker="COSECHA Y PRODUCCIÓN COLECTIVA" title="Registros de Recolección Diaria">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Registration Form */}
        <form onSubmit={handleCreate} className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-3 rounded-sm lg:col-span-5 flex flex-col gap-3">
          <div className="text-xs font-bold text-emerald-400 uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-2">Crear Parte de Recolección</div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex flex-col gap-1">
              <span className="v-field-label text-[#A4C2C5]/70">Campamento Activo</span>
              <span className="v-input bg-black/20 text-[#69BFB7] border border-[#67ACA9]/10 select-none flex items-center px-2 py-1.5 h-[34px] font-bold rounded-sm">
                Base Alfa (Propio)
              </span>
            </div>
            <label className="v-field flex flex-col gap-1">
              <span className="v-field-label text-[#A4C2C5]/70">Suministro recolectado</span>
              <select value={resourceTypeId} onChange={e => setResourceTypeId(e.target.value)} className="v-select">
                {resourceTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="v-field flex flex-col gap-1">
              <span className="v-field-label text-[#A4C2C5]/70">Estimado Esperado</span>
              <input type="number" value={expectedAmount} onChange={e => setExpectedAmount(e.target.value)} className="v-input" placeholder="0" />
            </label>
            <label className="v-field flex flex-col gap-1">
              <span className="v-field-label text-[#A4C2C5]/70">Extraído Real</span>
              <input type="number" value={actualAmount} onChange={e => setActualAmount(e.target.value)} className="v-input" placeholder="0" />
            </label>
          </div>

          <label className="v-field flex flex-col gap-1 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70">Código de Persona (Ficha)</span>
            <input type="text" value={personId} onChange={e => setPersonId(e.target.value)} className="v-input" placeholder="e.g. p-agricultor-02" />
          </label>

          <div className="flex flex-col gap-1 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70 font-semibold text-[#69BFB7]">Operador de Registro</span>
            <span className="v-input bg-black/20 text-[#A4C2C5]/50 border border-[#67ACA9]/10 select-none flex items-center px-2 py-1.5 h-[34px] rounded-sm font-mono text-[10px]">
              Operario #{currentUser.userId} (Firmado)
            </span>
          </div>

          <label className="v-field flex flex-col gap-1 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70">Explicación de diferencia o discrepancia</span>
            <textarea value={differenceReason} onChange={e => setDifferenceReason(e.target.value)} className="v-input min-h-12" placeholder="Describir si la cosecha real rinde más o menos que lo proyectado" />
          </label>

          <Btn variant="primary" onClick={() => {}} style={{ width: "100%", padding: "8px" }}>Guardar Bitácora Diaria</Btn>
        </form>

        {/* Existing records */}
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-3 rounded-sm lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-[#69BFB7] uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-2">Parte Técnico de Recolección Histórico</div>
            <div className="v-table-wrap max-h-72 overflow-y-auto">
              <table className="v-table text-[10px]">
                <thead>
                  <tr>
                    <th>Campamento</th>
                    <th>Recurso</th>
                    <th>Esperado</th>
                    <th>Real</th>
                    <th>Explicación</th>
                    <th className="text-right">Ajuste</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyCollectionRecords.slice().reverse().map(record => {
                    const camp = camps.find(c => c.id === record.campId);
                    const rt = resourceTypes.find(t => t.id === record.resourceTypeId);
                    return (
                      <tr key={record.id} className="hover:bg-cyan-950/5">
                        <td className="font-bold text-white">{camp?.name || record.campId}</td>
                        <td>{rt?.name || record.resourceTypeId}</td>
                        <td>{record.expectedAmount} {rt?.unitOfMeasure}</td>
                        <td className="text-emerald-300 font-bold">{record.actualAmount} {rt?.unitOfMeasure}</td>
                        <td className="italic text-[#A4C2C5]/70">{record.differenceReason}</td>
                        <td className="text-right flex gap-1 justify-end">
                          <Btn small variant="warning" onClick={() => {
                            setAdjustingId(record.id);
                            setAdjustVal(record.actualAmount);
                            setAdjustReason(record.differenceReason);
                          }}>Ajustar</Btn>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Adjust Sub-form Modal inside sidebar flow */}
          {adjustingId && (
            <div className="mt-3 p-3 bg-black/40 border border-amber-500/30 rounded-xs text-xs">
              <div className="font-bold text-amber-400 mb-1.5 uppercase tracking-wide">Ajustar Registro Seleccionado</div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-[#A4C2C5]/70">Nuevo Escrito Real:</span>
                  <input type="number" value={adjustVal} onChange={e => setAdjustVal(Number(e.target.value))} className="v-input !py-1 text-center font-mono text-white" />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-[#A4C2C5]/70">Justificación Técnica:</span>
                  <input type="text" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} className="v-input !py-1 text-white" />
                </label>
              </div>
              <div className="flex justify-end gap-1.5">
                <Btn small variant="success" onClick={() => {
                  onAdjustRecord(adjustingId, adjustVal, adjustReason);
                  setAdjustingId(null);
                }}>Confirmar Ajuste</Btn>
                <Btn small variant="danger" onClick={() => setAdjustingId(null)}>Descartar</Btn>
              </div>
            </div>
          )}
        </div>

      </div>
    </SectionShell>
  );
}

/* 4. MOVIMIENTOS DE INVENTARIO */
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
  const [resourceTypeId, setResourceTypeId] = useState("rt-food");
  const [amount, setAmount] = useState("");
  const [movementType, setMovementType] = useState<InventoryMovement["movementType"]>("MANUAL_ADJUSTMENT");
  const [description, setDescription] = useState("");
  const recordedBy = currentUser.userId;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
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
    <SectionShell kicker="AUDITORÍA DE STOCK" title="Operaciones y Movimientos de Inventario">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Manual Movement Form */}
        <form onSubmit={handleCreate} className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-3 rounded-sm lg:col-span-4 flex flex-col gap-3">
          <div className="text-xs font-bold text-[#69BFB7] uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-1">Registrar Operación Manual de Inventario</div>

          <div className="flex flex-col gap-1 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Campamento Activo</span>
            <span className="v-input bg-black/20 text-[#69BFB7] border border-[#67ACA9]/10 select-none flex items-center px-2 py-1.5 h-[34px] font-bold rounded-sm">
              Base Alfa (Propio)
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
              Operario #{currentUser.userId} (Firmado)
            </span>
          </div>

          <label className="v-field flex flex-col gap-1 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70">Fundamento Técnico o Detalle</span>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="v-input" placeholder="Por ej. Ajuste de stock por auditoría" />
          </label>

          <Btn variant="primary" onClick={() => {}} style={{ width: "100%", padding: "8px" }}>Insertar Operación en Historial</Btn>
        </form>

        {/* Audit Movements Log List */}
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

/* 5. ALERTAS DE INVENTARIO */
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
  const resolver = currentUser.userId;

  return (
    <SectionShell kicker="MONITOREO DE ALARMAS DE SEGURIDAD" title="Frenos y Alertas de Inventario">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Detail layout summary */}
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm lg:col-span-4 text-xs">
          <div className="text-xs font-bold text-[#69BFB7] uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-3">Protocolo de Alarma de Stock</div>
          <p className="text-[#A4C2C5]/80 leading-relaxed mb-3">
            El sistema genera alertas automatizadas en cuanto las reservas de cualquier recurso de un campamento descienden por debajo del rango de seguridad establecido.
          </p>
          <div className="p-2 border border-[#67ACA9]/20 bg-black/45 rounded-sm flex flex-col gap-1 font-mono text-[10px] text-[#A4C2C5]/85">
            <div>📌 <strong>Campos de Auditoría:</strong></div>
            <div>• campId, resourceTypeId</div>
            <div>• amountAtAlertGeneration</div>
            <div>• alertDate</div>
          </div>
          <div className="mt-4 flex flex-col gap-1.5">
            <span className="text-[10px] text-[#A4C2C5]/60 font-semibold block">Responsable de Resolución:</span>
            <span className="v-input bg-black/20 text-[#A4C2C5]/50 border border-[#67ACA9]/10 select-none flex items-center px-2 py-1.5 h-[34px] rounded-sm font-mono text-[10px]">
              Operario #{currentUser.userId} (Firmado)
            </span>
          </div>
        </div>

        {/* Alert grid tables */}
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm lg:col-span-8 flex flex-col gap-3">
          <div className="text-xs font-bold text-rose-400 uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-2">Alertas de Almacén Registradas</div>

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
                {inventoryAlerts.map(alert => {
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
                          <span className="text-[9px] text-[#A4C2C5]/50 font-mono italic">Resuelto por {alert.resolvedBy}</span>
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

/* 6. SOLICITUDES INTERCAMPAMENTO */
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
  const originCampId = currentUser.campId;
  const [destinationCampId, setDestinationCampId] = useState("delta");
  const [description, setDescription] = useState("");
  const [plannedDepartureDate, setPlannedDepartureDate] = useState("2026-05-20");
  const [plannedArrivalDate, setPlannedArrivalDate] = useState("2026-05-21");
  const createdBy = currentUser.userId;

  // Selected state for details sub-panel
  const [activeReqId, setActiveReqId] = useState<string | null>(null);

  // New resource item fields
  const [resourceTypeId, setResourceTypeId] = useState("rt-food");
  const [qty, setQty] = useState("");

  const selectedRequest = intercampRequests.find(r => r.id === activeReqId);

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) return;
    onAddRequest({
      originCampId,
      destinationCampId,
      status: "PENDING",
      description,
      plannedDepartureDate,
      plannedArrivalDate,
      personRequirements: [{ occupationId: "occ-driver", quantity: 1 }],
      createdDate: new Date().toLocaleDateString("es-ES"),
      createdBy
    });
    setDescription("");
  };

  const currentDetails = requestResourceDetails.filter(d => d.requestId === activeReqId);

  return (
    <SectionShell kicker="COORDINACIÓN LOGÍSTICA SUCURSAL" title="Solicitudes de Reabastecimiento Intercampamento">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Create Form */}
        <form onSubmit={handleCreateRequest} className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-3 rounded-sm lg:col-span-4 flex flex-col gap-3">
          <div className="text-xs font-bold text-[#69BFB7] uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-1">Nueva Solicitud Intercampamento</div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex flex-col gap-1">
              <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Campamento Origen (Abastece)</span>
              <span className="v-input bg-black/20 text-[#69BFB7] border border-[#67ACA9]/20 select-none flex items-center px-2 py-1.5 h-[34px] font-bold rounded-sm">
                Base Alfa (Propio)
              </span>
            </div>
            <label className="v-field flex flex-col gap-1">
              <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Campamento Destino (Solicita) *</span>
              <select value={destinationCampId} onChange={e => setDestinationCampId(e.target.value)} className="v-select text-[11px]">
                {camps.filter(c => c.id !== currentUser.campId).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="v-field flex flex-col gap-1">
              <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Salida Planificada</span>
              <input type="date" value={plannedDepartureDate} onChange={e => setPlannedDepartureDate(e.target.value)} className="v-input" />
            </label>
            <label className="v-field flex flex-col gap-1">
              <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Llegada Proyectada</span>
              <input type="date" value={plannedArrivalDate} onChange={e => setPlannedArrivalDate(e.target.value)} className="v-input" />
            </label>
          </div>

          <div className="flex flex-col gap-1 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Encargado de Solicitud</span>
            <span className="v-input bg-black/20 text-[#A4C2C5]/50 border border-[#67ACA9]/10 select-none flex items-center px-2 py-1.5 h-[34px] rounded-sm font-mono text-[10px]">
              Operario #{currentUser.userId} (Firmado)
            </span>
          </div>

          <label className="v-field flex flex-col gap-1 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70">Motivación y detalles de recursos</span>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="v-input" placeholder="e.g. Alimento crítico para el personal minero de Bravo" />
          </label>

          <Btn variant="primary" onClick={() => {}} style={{ width: "100%", padding: "8px" }}>Crear Solicitud Intercampamento</Btn>
        </form>

        {/* List of Requests */}
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-3 rounded-sm lg:col-span-8 flex flex-col gap-4">
          <div>
            <div className="text-xs font-bold text-amber-400 uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-2">Canal Operativo de Solicitudes</div>
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
                  {intercampRequests.map(req => {
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
                          {req.status === "PENDING" && (
                            <>
                              <Btn small variant="success" onClick={() => onUpdateRequestStatus(req.id, "APPROVED", currentUser.userId)}>Aprobar</Btn>
                              <Btn small variant="danger" onClick={() => onUpdateRequestStatus(req.id, "REJECTED", currentUser.userId)}>Rechazar</Btn>
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

          {/* Sub-Panel: Resource Request Detail */}
          {activeReqId && selectedRequest && (
            <div className="p-3 bg-black/45 border border-[#67ACA9]/30 rounded-sm">
              <div className="flex justify-between items-center border-b border-[#67ACA9]/15 pb-1 mb-2">
                <span className="text-xs font-bold text-[#69BFB7]">Detalle de Recursos para Solicitud ({selectedRequest.id})</span>
                <button type="button" className="text-red-400 hover:text-white" onClick={() => setActiveReqId(null)}>✕</button>
              </div>

              {/* Form to add item details to requested list */}
              {selectedRequest.status === "PENDING" && (
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-3 items-end">
                  <div className="col-span-5 flex flex-col gap-0.5 text-[10px]">
                    <span className="text-[#A4C2C5]/70">Tipo de Recurso</span>
                    <select value={resourceTypeId} onChange={e => setResourceTypeId(e.target.value)} className="v-select py-1 text-xs">
                      {resourceTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3 flex flex-col gap-0.5 text-[10px]">
                    <span className="text-[#A4C2C5]/70">Ración Cantidad</span>
                    <input type="number" value={qty} onChange={e => setQty(e.target.value)} className="v-input py-1 text-xs text-center" placeholder="0" />
                  </div>
                  <div className="col-span-4">
                    <Btn small variant="primary" style={{ width: "100%", padding: "5px" }} onClick={() => {
                      if (!qty) return;
                      onAddResourceToRequest(selectedRequest.id, resourceTypeId, Number(qty));
                      setQty("");
                    }}>Agregar Articulo</Btn>
                  </div>
                </div>
              )}

              {/* Table of items added */}
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

/* 7. TRASLADOS */
export function ViewTraslados({
  camps,
  intercampRequests,
  transfers,
  transferPersons,
  onAddTransfer,
  onUpdateTransferStatus,
  onAddPersonToTransfer,
  onUpdatePersonStatus
}: {
  camps: Camp[];
  intercampRequests: IntercampRequest[];
  transfers: Transfer[];
  transferPersons: TransferPerson[];
  onAddTransfer: (data: Omit<Transfer, "id">) => void;
  onUpdateTransferStatus: (id: string, status: Transfer["status"], notes: string) => void;
  onAddPersonToTransfer: (transferId: string, personId: string) => void;
  onUpdatePersonStatus: (id: string, status: TransferPerson["status"]) => void;
}) {
  const [requestId, setRequestId] = useState("");
  const [depDate, setDepDate] = useState("2026-05-20");
  const [arrDate, setArrDate] = useState("2026-05-21");
  const [rations, setRations] = useState("10");

  const [activeTransferId, setActiveTransferId] = useState<string | null>(null);
  const [personId, setPersonId] = useState("");

  const [notes, setNotes] = useState("");

  const approvedRequests = intercampRequests.filter(r => r.status === "APPROVED" && !transfers.some(t => t.requestId === r.id));

  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestId) return;
    onAddTransfer({
      requestId,
      plannedDepartureDate: depDate,
      plannedArrivalDate: arrDate,
      status: "PENDING_DEPARTURE",
      rationsForTrip: Number(rations),
    });
    setRequestId("");
  };

  const selectedTransfer = transfers.find(t => t.id === activeTransferId);
  const selectedReq = selectedTransfer ? intercampRequests.find(r => r.id === selectedTransfer.requestId) : null;
  const currentPersons = transferPersons.filter(tp => tp.transferId === activeTransferId);

  return (
    <SectionShell kicker="COORDINACIÓN LOGÍSTICA SUCURSAL" title="Gestión de Convoyes e Historial de Traslado">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Forms box */}
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-3 rounded-sm lg:col-span-4 flex flex-col gap-3">
          <div className="text-xs font-bold text-emerald-400 uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-1">Habilitar Traslado desde Solicitud Aprobada</div>

          {approvedRequests.length > 0 ? (
            <form onSubmit={handleCreateTransfer} className="flex flex-col gap-3 text-xs">
              <label className="v-field flex flex-col gap-1">
                <span className="v-field-label text-[#A4C2C5]/70">Solicitud Aprobada Relacionada</span>
                <select value={requestId} onChange={e => setRequestId(e.target.value)} className="v-select">
                  <option value="">Seleccionar Solicitud...</option>
                  {approvedRequests.map(r => (
                    <option key={r.id} value={r.id}>{r.id} - ({r.description})</option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="v-field flex flex-col gap-1">
                  <span className="v-field-label text-[#A4C2C5]/70">Salida Real</span>
                  <input type="date" value={depDate} onChange={e => setDepDate(e.target.value)} className="v-input" />
                </label>
                <label className="v-field flex flex-col gap-1">
                  <span className="v-field-label text-[#A4C2C5]/70">Llegada Real</span>
                  <input type="date" value={arrDate} onChange={e => setArrDate(e.target.value)} className="v-input" />
                </label>
              </div>

              <label className="v-field flex flex-col gap-1">
                <span className="v-field-label text-[#A4C2C5]/70">Raciones para el Viaje</span>
                <input type="number" value={rations} onChange={e => setRations(e.target.value)} className="v-input" />
              </label>

              <Btn variant="primary" onClick={() => {}} style={{ width: "100%", padding: "8px" }}>Habilitar Manifiesto de Convoy</Btn>
            </form>
          ) : (
            <div className="text-[10px] text-amber-300 bg-amber-950/20 p-4 text-center rounded-sm border border-amber-500/20">
              ⚡ No hay solicitudes de reabastecimiento intercampamento aprobadas pendientes de traslado.
            </div>
          )}
        </div>

        {/* Transfers Active List */}
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
                        <span className={`px-1 rounded-xs font-bold text-[8px] uppercase border ${tr.status === "COMPLETED" ? "border-emerald-500/30 text-emerald-300" : "border-rose-500/3 animate-pulse text-amber-300 bg-amber-950/20"}`}>
                          {tr.status}
                        </span>
                      </td>
                      <td>{tr.rationsForTrip} Raciones</td>
                      <td>{tr.plannedDepartureDate}</td>
                      <td className="text-right flex gap-1 justify-end">
                        <Btn small variant="ghost" onClick={() => setActiveTransferId(tr.id)}>Asignar Personas</Btn>
                        {tr.status === "PENDING_DEPARTURE" && (
                          <Btn small variant="success" onClick={() => onUpdateTransferStatus(tr.id, "COMPLETED", "Entrega completada sin retraso")}>Marcar Completado ✓</Btn>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Subpanel for persons in transit convoy */}
          {activeTransferId && selectedTransfer && (
            <div className="p-3 bg-black/45 border border-[#67ACA9]/30 rounded-sm">
              <div className="flex justify-between items-center border-b border-[#67ACA9]/15 pb-1 mb-2">
                <span className="text-xs font-bold text-[#69BFB7]">Personal Asociado al Convoy ({selectedTransfer.id})</span>
                <button type="button" className="text-red-400 hover:text-white" onClick={() => setActiveTransferId(null)}>✕</button>
              </div>

              {selectedTransfer.status !== "COMPLETED" && (
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-3 items-end">
                  <div className="col-span-8 flex flex-col gap-0.5 text-[10px]">
                    <span className="text-[#A4C2C5]/70">Ficha de Identidad Persona (Nombre/Código)</span>
                    <input type="text" value={personId} onChange={e => setPersonId(e.target.value)} className="v-input py-1 text-xs" placeholder="e.g. p-soldado-04" />
                  </div>
                  <div className="col-span-4">
                    <Btn small variant="primary" style={{ width: "100%", padding: "5px" }} onClick={() => {
                      if (!personId) return;
                      onAddPersonToTransfer(selectedTransfer.id, personId);
                      setPersonId("");
                    }}>Vincular Escolta</Btn>
                  </div>
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
                          {tp.status === "CONFIRMED" && (
                            <div className="flex justify-end gap-1">
                              <Btn small variant="success" onClick={() => onUpdatePersonStatus(tp.id, "DELIVERED")}>Entregado</Btn>
                              <Btn small variant="danger" onClick={() => onUpdatePersonStatus(tp.id, "CANCELED")}>Cancelar</Btn>
                            </div>
                          )}
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
            </div>
          )}
        </div>

      </div>
    </SectionShell>
  );
}

/* 8. RECURSOS DE EXPEDICIONES */
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
        
        {/* Registration */}
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

        {/* Historic lists */}
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

/* 9. RECURSOS ENTREGADOS DE TRASLADO */
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
        
        {/* Form */}
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

        {/* List data */}
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

/* 10. TIPOS DE RECURSO */
export function ViewTiposDeRecurso({
  resourceTypes,
  onAddResourceType,
  onUpdateResourceType,
  onDeleteResourceType
}: {
  resourceTypes: ResourceType[];
  onAddResourceType: (data: ResourceType) => void;
  onUpdateResourceType: (id: string, updated: Partial<ResourceType>) => void;
  onDeleteResourceType: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [unitOfMeasure, setUnitOfMeasure] = useState("");
  const [category, setCategory] = useState<ResourceType["category"]>("FOOD");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Editing states
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editCat, setEditCat] = useState<ResourceType["category"]>("FOOD");
  const [editDesc, setEditDesc] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !unitOfMeasure.trim() || !category) {
      alert("Por favor rellene todos los campos obligatorios.");
      return;
    }

    const nameExists = resourceTypes.some(rt => rt.name.toLowerCase() === name.trim().toLowerCase());
    if (nameExists) {
      alert("Error: Ya existe un tipo de recurso con este nombre.");
      return;
    }

    onAddResourceType({
      id: `rt-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      unitOfMeasure: unitOfMeasure.trim(),
      category,
      description: description.trim()
    });

    setName("");
    setUnitOfMeasure("");
    setDescription("");
  };

  const handleUpdate = (id: string) => {
    if (!editName.trim() || !editUnit.trim()) {
      alert("Nombre y Unidad de medida obligatorios.");
      return;
    }

    const nameExists = resourceTypes.some(rt => rt.id !== id && rt.name.toLowerCase() === editName.trim().toLowerCase());
    if (nameExists) {
      alert("Error: Ya existe otro tipo de recurso con este nombre.");
      return;
    }

    onUpdateResourceType(id, {
      name: editName.trim(),
      unitOfMeasure: editUnit.trim(),
      category: editCat,
      description: editDesc.trim()
    });

    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm("🚨 ATENCIÓN: Eliminar un tipo de recurso puede invalidar inventarios actuales, movimientos y registros de distribución previos. ¿Está seguro de continuar?")) {
      onDeleteResourceType(id);
    }
  };

  return (
    <SectionShell kicker="DICCIONARIO DE SUMINISTROS" title="Glosario Registrado de Tipos de Recursos">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Create Form */}
        <form onSubmit={handleCreate} className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm lg:col-span-4 flex flex-col gap-3 h-fit">
          <div className="text-xs font-bold text-[#69BFB7] uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-1">Registrar Tipo de Recurso</div>

          <label className="v-field flex flex-col gap-0.5 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Nombre del Recurso *</span>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="v-input" placeholder="e.g. Drinking Water" />
          </label>

          <label className="v-field flex flex-col gap-0.5 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Unidad de Medida *</span>
            <input type="text" value={unitOfMeasure} onChange={e => setUnitOfMeasure(e.target.value)} className="v-input" placeholder="e.g. liters, kg" />
          </label>

          <label className="v-field flex flex-col gap-1 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Categoría *</span>
            <select value={category} onChange={e => setCategory(e.target.value as any)} className="v-select">
              <option value="FOOD">Comida (FOOD)</option>
              <option value="WATER">Agua (WATER)</option>
              <option value="HYGIENE">Higiene (HYGIENE)</option>
              <option value="DEFENSE">Defensa (DEFENSE)</option>
              <option value="AMMUNITION">Munición (AMMUNITION)</option>
              <option value="MEDICAL">Medicina (MEDICAL)</option>
              <option value="OTHER">Otro (OTHER)</option>
            </select>
          </label>

          <label className="v-field flex flex-col gap-0.5 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70">Descripción Táctica</span>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="v-input" placeholder="Breve nota de uso..." />
          </label>

          <Btn variant="primary" onClick={() => {}} style={{ width: "100%", padding: "8px" }}>Agregar Tipo de Recurso</Btn>
        </form>

        {/* List & Edit Table */}
        <div className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-4 rounded-sm lg:col-span-8 flex flex-col gap-3">
          <div className="text-xs font-bold text-amber-300 uppercase border-b border-[#67ACA9]/10 pb-1.5">Tipos de Suministros Homologados</div>

          <div className="v-table-wrap max-h-[450px] overflow-y-auto">
            <table className="v-table text-[10px]">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Clase</th>
                  <th>Unidad</th>
                  <th>Descripción</th>
                  <th className="text-right">Operaciones</th>
                </tr>
              </thead>
              <tbody>
                {resourceTypes.map(rt => {
                  const isEditing = editingId === rt.id;

                  return (
                    <tr key={rt.id} className="hover:bg-cyan-950/5">
                      <td className="font-mono text-white text-[9px]">{rt.id}</td>
                      <td>
                        {isEditing ? (
                          <input type="text" className="v-input py-0.5 px-1 font-bold" value={editName} onChange={e => setEditName(e.target.value)} />
                        ) : (
                          <span className="font-bold text-[#69BFB7]">{rt.name}</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <select value={editCat} onChange={e => setEditCat(e.target.value as any)} className="v-select py-0.5 px-1 text-[9px]">
                            <option value="FOOD">FOOD</option>
                            <option value="WATER">WATER</option>
                            <option value="HYGIENE">HYGIENE</option>
                            <option value="DEFENSE">DEFENSE</option>
                            <option value="AMMUNITION">AMMUNITION</option>
                            <option value="MEDICAL">MEDICAL</option>
                            <option value="OTHER">OTHER</option>
                          </select>
                        ) : (
                          <span className="font-mono text-[9px]">{rt.category}</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input type="text" className="v-input py-0.5 px-1" value={editUnit} onChange={e => setEditUnit(e.target.value)} />
                        ) : (
                          rt.unitOfMeasure
                        )}
                      </td>
                      <td className="italic text-[#A4C2C5]/70 max-w-[150px] truncate">
                        {isEditing ? (
                          <input type="text" className="v-input py-0.5 px-1 italic" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                        ) : (
                          rt.description
                        )}
                      </td>
                      <td className="text-right flex gap-1 justify-end items-center">
                        {isEditing ? (
                          <>
                            <Btn small variant="success" onClick={() => handleUpdate(rt.id)}>Guardar ✓</Btn>
                            <Btn small variant="ghost" onClick={() => setEditingId(null)}>Can.</Btn>
                          </>
                        ) : (
                          <>
                            <Btn small variant="primary" onClick={() => {
                              setEditingId(rt.id);
                              setEditName(rt.name);
                              setEditUnit(rt.unitOfMeasure);
                              setEditCat(rt.category);
                              setEditDesc(rt.description);
                            }}>Editar</Btn>
                            <Btn small variant="ghost" onClick={() => handleDelete(rt.id)}>Eliminar</Btn>
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

/* 11. CAMPAMENTOS */
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

/* 12. OFICIOS Y COBERTURA COLECTIVA */
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
        
        {/* Left dictionary */}
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

        {/* Right coverage check */}
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
                          <Btn small variant="warning" onClick={() => onAutoAssign(cov.campId, cov.occupationId)}>⚡ Reforzar</Btn>
                        ) : (
                          <span className="text-[#A4C2C5]/50 font-mono text-[9px]">✔ Completo</span>
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

/* 13. NOTIFICACIONES OPERACIONALES */
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
        
        {/* Create notify */}
        <form onSubmit={handleSubmit} className="mission-card border border-[#67ACA9]/30 bg-[#0d1414]/90 p-3 rounded-sm lg:col-span-4 flex flex-col gap-3">
          <div className="text-xs font-bold text-[#69BFB7] uppercase border-b border-[#67ACA9]/10 pb-1.5 mb-1">Escribir Notificación de Red</div>

          <div className="flex flex-col gap-1 text-xs">
            <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Campamento Origen (Emisor)</span>
            <span className="v-input bg-black/20 text-[#69BFB7] border border-[#67ACA9]/10 select-none flex items-center px-2 py-1.5 h-[34px] font-bold rounded-sm">
              Base Alfa (Propio)
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

        {/* Existing notification items list */}
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

/* 14. DETALLE DE RECURSOS SOLICITADOS */
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
        
        {/* Adición de Detalles */}
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

        {/* Lista de Detalles de recursos solicitados */}
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

/* 15. PERSONAS EN TRASLADO */
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
        
        {/* Vínculo de Personal */}
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

        {/* Lista de Personal en traslado */}
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

/* 16. HISTORIAL DE TRASLADO */
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
  const [previousStatus, setPreviousStatus] = useState<Transfer["status"]>("PENDING_DEPARTURE");
  const [newStatus, setNewStatus] = useState<Transfer["status"]>("COMPLETED");
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
        
        {/* Registrar Historial Manual */}
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
                <option value="PENDING_DEPARTURE">PENDING_DEPARTURE</option>
                <option value="EN_ROUTE">EN_ROUTE</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELED">CANCELED</option>
              </select>
            </label>
            <label className="v-field flex flex-col gap-1">
              <span className="v-field-label text-[#A4C2C5]/70 font-semibold">Nuevo Estado *</span>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value as any)} className="v-select bg-black font-mono text-[9px]">
                <option value="PENDING_DEPARTURE">PENDING_DEPARTURE</option>
                <option value="EN_ROUTE">EN_ROUTE</option>
                <option value="COMPLETED">COMPLETED</option>
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

        {/* List of transfer histories */}
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
