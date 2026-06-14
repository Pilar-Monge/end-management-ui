import { useEffect, useMemo, useState } from "react";
import { Btn, MissionShell, MissionStack } from "../components/SharedLayout";
import type { DBExpedition } from "../utils/expeditionsStore";
import {
  createConsumedExpeditionResource,
  getCurrentExpeditionUser,
  listResourceTypes,
  listUiExpeditions,
  type ExpeditionResourceType,
} from "../../../services/expeditionsUi.service";

interface ResourceLog {
  expeditionId: number;
  expeditionName: string;
  type: "CONSUMIDO";
  category: string;
  item: string;
  amount: number;
  unit: string;
  timestamp: string;
  operator: string;
}

function formatNow() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

export function RegistrarRecursos() {
  const [expeditions, setExpeditions] = useState<DBExpedition[]>([]);
  const [resourceTypes, setResourceTypes] = useState<ExpeditionResourceType[]>([]);
  const [selectedExpId, setSelectedExpId] = useState<number>(0);
  const [selectedResourceTypeId, setSelectedResourceTypeId] = useState<number>(0);
  const [recordedByUserId, setRecordedByUserId] = useState<number>(0);

  const [logType] = useState<"CONSUMIDO">("CONSUMIDO");
  const [amount, setAmount] = useState<number | "">("");
  const [operator, setOperator] = useState("Operador de expediciones");

  const [logs, setLogs] = useState<ResourceLog[]>([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadResources() {
      setErrorMsg("");
      try {
        const [loadedExpeditions, loadedResourceTypes, user] = await Promise.all([
          listUiExpeditions(),
          listResourceTypes(),
          getCurrentExpeditionUser(),
        ]);

        if (!isMounted) return;

        setExpeditions(loadedExpeditions);
        setResourceTypes(loadedResourceTypes);
        setRecordedByUserId(user.id);
        setOperator(user.name || user.username || "Operador de expediciones");

        if (loadedExpeditions.length > 0) {
          setSelectedExpId(loadedExpeditions[0].id);
        }
        if (loadedResourceTypes.length > 0) {
          setSelectedResourceTypeId(loadedResourceTypes[0].id);
        }

        if (loadedResourceTypes.length === 0) {
          setErrorMsg("El backend no devolvio tipos de recurso para registrar movimientos.");
        }
      } catch (error) {
        console.error("Unable to load resource registration data", error);
        if (isMounted) {
          setErrorMsg("No se pudo cargar la informacion necesaria desde el backend.");
        }
      }
    }

    loadResources();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedExpedition = useMemo(
    () => expeditions.find((expedition) => expedition.id === selectedExpId),
    [expeditions, selectedExpId],
  );

  const selectedResourceType = useMemo(
    () => resourceTypes.find((resource) => resource.id === selectedResourceTypeId),
    [resourceTypes, selectedResourceTypeId],
  );

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!selectedExpedition || !selectedResourceType || !amount || !recordedByUserId) {
      setErrorMsg("Seleccione expedicion, recurso y cantidad antes de guardar.");
      return;
    }

    setIsSaving(true);
    try {
      await createConsumedExpeditionResource({
        expeditionId: selectedExpedition.id,
        resourceTypeId: selectedResourceType.id,
        amount: Number(amount),
        recordedBy: recordedByUserId,
      });

      const newLog: ResourceLog = {
        expeditionId: selectedExpedition.id,
        expeditionName: selectedExpedition.name,
        type: logType,
        category: selectedResourceType.category || "OTHER",
        item: selectedResourceType.name,
        amount: Number(amount),
        unit: selectedResourceType.unitOfMeasure || "unidades",
        timestamp: formatNow(),
        operator,
      };

      setLogs((current) => [newLog, ...current]);
      setAmount("");
      setSuccessMsg(`Recurso "${newLog.item}" registrado con exito.`);
      window.setTimeout(() => setSuccessMsg(""), 4000);
    } catch (error) {
      console.error("Unable to register expedition resource", error);
      setErrorMsg("El backend rechazo el registro. Revise permisos o datos del recurso.");
    } finally {
      setIsSaving(false);
    }
  };

  const canSubmit = expeditions.length > 0 && resourceTypes.length > 0 && !isSaving;

  return (
    <MissionShell kicker="Logistica militar de recursos" title="Registrar Recursos">
      <MissionStack>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3.5">
          <div className="mission-card lg:col-span-2">
            <div className="mission-card-title">Registro de Movimiento de Recursos</div>

            <form onSubmit={handleRegister} className="mt-4 flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                  Expedicion Destino *
                </label>
                <select
                  className="w-full bg-[#020706] border border-[#67ACA9]/30 rounded-sm p-2 text-xs text-[#A4C2C5] focus:outline-none focus:border-[#69BFB7]"
                  value={selectedExpId}
                  onChange={(event) => setSelectedExpId(Number(event.target.value))}
                >
                  {expeditions.map((expedition) => (
                    <option key={expedition.id} value={expedition.id}>
                      {expedition.name} ({expedition.status.replace("_", " ")})
                    </option>
                  ))}
                  {expeditions.length === 0 && <option value="">No hay expediciones registradas</option>}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                  Tipo de Operacion
                </label>
                <div className="bg-[#020706] rounded-sm p-2 border border-[#67ACA9]/20">
                  <span className="inline-block text-[10px] font-bold uppercase rounded-xs bg-red-500/30 text-red-200 px-2 py-1">
                    Consumido
                  </span>
                  <p className="mt-2 text-[9px] text-[#A4C2C5]/60 leading-snug">
                    Los recursos obtenidos se generan automaticamente al completar la expedicion.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                  Recurso *
                </label>
                <select
                  className="w-full bg-[#020706] border border-[#67ACA9]/30 rounded-sm p-2 text-xs text-[#A4C2C5] focus:outline-none focus:border-[#69BFB7]"
                  value={selectedResourceTypeId}
                  onChange={(event) => setSelectedResourceTypeId(Number(event.target.value))}
                >
                  {resourceTypes.map((resource) => (
                    <option key={resource.id} value={resource.id}>
                      {resource.name} ({resource.category || "OTHER"})
                    </option>
                  ))}
                  {resourceTypes.length === 0 && <option value="">Sin recursos disponibles</option>}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                    Cantidad *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="0.00"
                    className="w-full bg-[#020706] border border-[#67ACA9]/30 rounded-sm p-2 text-xs text-[#A4C2C5] focus:outline-none focus:border-[#69BFB7]"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value === "" ? "" : Number(event.target.value))}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                    Unidad
                  </label>
                  <input
                    type="text"
                    readOnly
                    className="w-full bg-[#020706] border border-[#67ACA9]/30 rounded-sm p-2 text-xs text-[#A4C2C5]/70 focus:outline-none"
                    value={selectedResourceType?.unitOfMeasure || "unidades"}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                  Personal que registra
                </label>
                <input
                  type="text"
                  readOnly
                  className="w-full bg-[#020706] border border-[#67ACA9]/30 rounded-sm p-2 text-xs text-[#A4C2C5]/70 focus:outline-none"
                  value={operator}
                />
              </div>

              {successMsg && (
                <div className="p-2 border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] uppercase font-bold text-center tracking-wide mt-2">
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="p-2 border border-red-500/30 bg-red-500/10 text-red-200 text-[10px] uppercase font-bold text-center tracking-wide mt-2">
                  {errorMsg}
                </div>
              )}

              <div className="mt-3">
                <Btn variant="primary" style={{ width: "100%", padding: "10px" }} disabled={!canSubmit}>
                  {isSaving ? "Guardando..." : "Guardar en Base de Datos de Mision"}
                </Btn>
              </div>
            </form>
          </div>

          <div className="mission-card lg:col-span-3">
            <div className="mission-card-title flex justify-between items-center">
              <span>Bitacora de Recursos Registrados</span>
              <span className="text-[9px] text-[#69BFB7]/60 font-mono tracking-widest uppercase">
                Sesion actual
              </span>
            </div>

            <div className="v-table-wrap mt-3 max-h-[460px] overflow-y-auto">
              <table className="v-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Expedicion</th>
                    <th>Tipo</th>
                    <th>Item / Recurso</th>
                    <th>Cantidad</th>
                    <th>Registrado por</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => (
                    <tr key={`${log.timestamp}-${index}`} className="hover:bg-[#67ACA9]/5 transition-colors">
                      <td className="font-mono text-[9px] text-[#A4C2C5]/70">{log.timestamp}</td>
                      <td className="font-bold text-[#f0fafa] text-[11px] max-w-[110px] truncate">
                        {log.expeditionName}
                      </td>
                      <td>
                        <span className={`inline-block text-[8px] font-bold uppercase rounded-xs px-1.5 py-0.5 ${log.type === "CONSUMIDO" ? "bg-red-500/20 text-red-300 border border-red-500/20" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20"}`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="text-xs font-semibold text-[#69BFB7]">{log.item}</td>
                      <td className="font-mono text-xs font-black">
                        {log.amount} <span className="text-[10px] text-[#A4C2C5]/60 font-medium">{log.unit}</span>
                      </td>
                      <td className="text-[10px] text-[#A4C2C5]/60 italic">{log.operator}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-xs italic text-[#A4C2C5]/40">
                        Los movimientos que se registren en backend apareceran aqui durante esta sesion.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-2.5 bg-black/30 border border-[#67ACA9]/10 rounded-sm text-[10px] text-[#A4C2C5]/70 leading-snug">
              <strong className="text-[#69BFB7]">OPERACION TACTICA:</strong> Los consumos se guardan en backend. Los recursos obtenidos se generan automaticamente al completar la expedicion.
            </div>
          </div>
        </div>
      </MissionStack>
    </MissionShell>
  );
}
