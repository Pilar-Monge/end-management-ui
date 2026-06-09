import { useState, useEffect } from "react";
import {
  Btn,
  MissionShell,
  MissionStack,
} from "../components/SharedLayout";
import { getExpeditions } from "../utils/expeditionsStore";
import type { DBExpedition } from "../utils/expeditionsStore";

interface ResourceLog {
  expeditionId: number;
  expeditionName: string;
  type: "CONSUMIDO" | "RECUPERADO";
  category: "FOOD" | "WATER" | "MEDICAL" | "DEFENSE" | "OTHER";
  item: string;
  amount: number;
  unit: string;
  timestamp: string;
  operator: string;
}

const STORAGE_KEY_RESOURCES = "tactical_resources_log";

export function RegistrarRecursos() {
  const [expeditions, setExpeditions] = useState<DBExpedition[]>([]);
  const [selectedExpId, setSelectedExpId] = useState<number>(0);
  
  // Form fields
  const [logType, setLogType] = useState<"CONSUMIDO" | "RECUPERADO">("CONSUMIDO");
  const [category, setCategory] = useState<"FOOD" | "WATER" | "MEDICAL" | "DEFENSE" | "OTHER">("FOOD");
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [unit, setUnit] = useState("kg");
  const [operator, setOperator] = useState("Ing. Logístico Alfa");
  
  const [logs, setLogs] = useState<ResourceLog[]>([]);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const list = getExpeditions();
    setExpeditions(list);
    if (list.length > 0) {
      setSelectedExpId(list[0].id);
    }

    const stored = localStorage.getItem(STORAGE_KEY_RESOURCES);
    if (stored) {
      try {
        setLogs(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Pre-seed some default logs matching image aesthetics
      const defaultLogs: ResourceLog[] = [
        {
          expeditionId: 1,
          expeditionName: "Valle Profundo",
          type: "CONSUMIDO",
          category: "FOOD",
          item: "Raciones Militares Deshidratadas",
          amount: 45.0,
          unit: "kg",
          timestamp: "2026-05-30 08:35",
          operator: "Ing. Logístico Alfa"
        },
        {
          expeditionId: 1,
          expeditionName: "Valle Profundo",
          type: "CONSUMIDO",
          category: "WATER",
          item: "Agua purificada",
          amount: 98.5,
          unit: "lts",
          timestamp: "2026-05-30 11:20",
          operator: "Cabo Guardia"
        },
        {
          expeditionId: 4,
          expeditionName: "Costa Esmeralda",
          type: "RECUPERADO",
          category: "MEDICAL",
          item: "Plantas medicinales silvestres",
          amount: 25.5,
          unit: "kg",
          timestamp: "2026-05-29 16:50",
          operator: "Dr. García"
        },
        {
          expeditionId: 4,
          expeditionName: "Costa Esmeralda",
          type: "RECUPERADO",
          category: "OTHER",
          item: "Piezas de chatarra reciclada",
          amount: 12.0,
          unit: "unidades",
          timestamp: "2026-05-29 17:15",
          operator: "Sargento Torres"
        }
      ];
      localStorage.setItem(STORAGE_KEY_RESOURCES, JSON.stringify(defaultLogs));
      setLogs(defaultLogs);
    }
  }, []);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpId || !item || !amount) {
      return;
    }

    const selectedExp = expeditions.find(ex => ex.id === selectedExpId);
    if (!selectedExp) return;

    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const newLog: ResourceLog = {
      expeditionId: selectedExp.id,
      expeditionName: selectedExp.name,
      type: logType,
      category,
      item,
      amount: Number(amount),
      unit,
      timestamp: formattedDate,
      operator
    };

    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem(STORAGE_KEY_RESOURCES, JSON.stringify(updatedLogs));

    // Clear form inputs
    setItem("");
    setAmount("");
    setSuccessMsg(`¡Recurso "${newLog.item}" registrado con éxito!`);
    
    setTimeout(() => {
      setSuccessMsg("");
    }, 4000);
  };

  return (
    <MissionShell kicker="Logística militar de recursos" title="Registrar Recursos">
      <MissionStack>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3.5">
          
          {/* Registration Form Panel */}
          <div className="mission-card lg:col-span-2">
            <div className="mission-card-title">📝 Registro de Movimiento de Recursos</div>
            
            <form onSubmit={handleRegister} className="mt-4 flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                  Expedición Destino *
                </label>
                <select 
                  className="w-full bg-[#020706] border border-[#67ACA9]/30 rounded-sm p-2 text-xs text-[#A4C2C5] focus:outline-none focus:border-[#69BFB7]"
                  value={selectedExpId}
                  onChange={(e) => setSelectedExpId(Number(e.target.value))}
                >
                  {expeditions.map(ex => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name} ({ex.status.replace("_", " ")})
                    </option>
                  ))}
                  {expeditions.length === 0 && (
                    <option value="">No hay expediciones registradas</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                    Tipo de Operación
                  </label>
                  <div className="flex bg-[#020706] rounded-sm p-0.5 border border-[#67ACA9]/20">
                    <button
                      type="button"
                      className={`flex-1 text-center py-1 text-[10px] font-bold uppercase rounded-xs transition-all ${logType === "CONSUMIDO" ? "bg-red-500/30 text-red-200" : "text-[#A4C2C5]"}`}
                      onClick={() => setLogType("CONSUMIDO")}
                    >
                      Consumido
                    </button>
                    <button
                      type="button"
                      className={`flex-1 text-center py-1 text-[10px] font-bold uppercase rounded-xs transition-all ${logType === "RECUPERADO" ? "bg-emerald-500/30 text-emerald-200" : "text-[#A4C2C5]"}`}
                      onClick={() => setLogType("RECUPERADO")}
                    >
                      Recuperado
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                    Categoría
                  </label>
                  <select 
                    className="w-full bg-[#020706] border border-[#67ACA9]/30 rounded-sm p-1.5 text-xs text-[#A4C2C5] focus:outline-none focus:border-[#69BFB7]"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                  >
                    <option value="FOOD">Alimentos</option>
                    <option value="WATER">Agua m3/Lts</option>
                    <option value="MEDICAL">Médico</option>
                    <option value="DEFENSE">Armamento / Defensa</option>
                    <option value="OTHER">Otro Suministro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                  Nombre del Recurso / Item *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Raciones MRE, Antídotos, Chatarra"
                  className="w-full bg-[#020706] border border-[#67ACA9]/30 rounded-sm p-2 text-xs text-[#A4C2C5] focus:outline-none focus:border-[#69BFB7]"
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                    Cantidad *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    className="w-full bg-[#020706] border border-[#67ACA9]/30 rounded-sm p-2 text-xs text-[#A4C2C5] focus:outline-none focus:border-[#69BFB7]"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                    Unidad de Medida
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="kg, lts, unidades"
                    className="w-full bg-[#020706] border border-[#67ACA9]/30 rounded-sm p-2 text-xs text-[#A4C2C5] focus:outline-none focus:border-[#69BFB7]"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                  Personal que registra
                </label>
                <input
                  type="text"
                  className="w-full bg-[#020706] border border-[#67ACA9]/30 rounded-sm p-2 text-xs text-[#A4C2C5]/70 focus:outline-none"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                />
              </div>

              {successMsg && (
                <div className="p-2 border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] uppercase font-bold text-center tracking-wide mt-2">
                  {successMsg}
                </div>
              )}

              <div className="mt-3">
                <Btn variant="primary" style={{ width: "100%", padding: "10px" }} disabled={expeditions.length === 0}>
                  Guardar en Base de Datos de Misión
                </Btn>
              </div>
            </form>
          </div>

          {/* Historical Logs List Panel */}
          <div className="mission-card lg:col-span-3">
            <div className="mission-card-title flex justify-between items-center">
              <span>Bitácora de Recursos Registrados</span>
              <span className="text-[9px] text-[#69BFB7]/60 font-mono tracking-widest uppercase">Base de datos militar</span>
            </div>

            <div className="v-table-wrap mt-3 max-h-[460px] overflow-y-auto">
              <table className="v-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Expedición</th>
                    <th>Tipo</th>
                    <th>Item / Recurso</th>
                    <th>Cantidad</th>
                    <th>Registrado por</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={i} className="hover:bg-[#67ACA9]/5 transition-colors">
                      <td className="font-mono text-[9px] text-[#A4C2C5]/70">{log.timestamp}</td>
                      <td className="font-bold text-[#f0fafa] text-[11px] max-w-[110px] truncate">{log.expeditionName}</td>
                      <td>
                        <span className={`inline-block text-[8px] font-bold uppercase rounded-xs px-1.5 py-0.5 ${log.type === "CONSUMIDO" ? "bg-red-500/20 text-red-300 border border-red-500/20" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20"}`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="text-xs font-semibold text-[#69BFB7]">{log.item}</td>
                      <td className="font-mono text-xs font-black">{log.amount} <span className="text-[10px] text-[#A4C2C5]/60 font-medium">{log.unit}</span></td>
                      <td className="text-[10px] text-[#A4C2C5]/60 italic">{log.operator}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-xs italic text-[#A4C2C5]/40">
                        No hay registros de recursos guardados todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-2.5 bg-black/30 border border-[#67ACA9]/10 rounded-sm text-[10px] text-[#A4C2C5]/70 leading-snug">
              📍 <strong className="text-[#69BFB7]">OPERACIÓN TÁCTICA:</strong> Los consumos y botines de recursos ingresados aquí impactan el nivel de contingencia militar del campamento base y alimentan el gráfico de eficiencia de misiones.
            </div>
          </div>

        </div>
      </MissionStack>
    </MissionShell>
  );
}
