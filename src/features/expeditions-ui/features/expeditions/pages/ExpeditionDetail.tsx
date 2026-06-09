import { useState, useEffect } from "react";
import {
  MOCK_PEOPLE_CARDS,
  MOCK_RESOURCES_CONSUMED,
  StatusBadge,
  Btn,
  MissionShell,
  MissionStack,
  ExpeditionFlow,
} from "../components/SharedLayout";
import { getExpeditions, assignPersonToExpedition } from "../utils/expeditionsStore";
import type { DBExpedition } from "../utils/expeditionsStore";

interface ExpeditionDetailProps {
  expeditionId?: number;
  onNavigate?: (sub: string, id?: number) => void;
}

export function ExpeditionDetail({ expeditionId, onNavigate }: ExpeditionDetailProps) {
  const [activeTab, setActiveTab] = useState<"detalles" | "participantes" | "recursos">("detalles");
  const [expeditions, setExpeditions] = useState<DBExpedition[]>([]);
  const [selectedAddPerson, setSelectedAddPerson] = useState<number>(MOCK_PEOPLE_CARDS[0].id);

  useEffect(() => {
    setExpeditions(getExpeditions());
  }, [expeditionId, activeTab]);

  const reloadStore = () => {
    setExpeditions(getExpeditions());
  };

  const exp = expeditions.find(e => e.id === expeditionId) || expeditions[0] || getExpeditions()[0];

  if (!exp) {
    return (
      <MissionShell kicker="Bitácora de misión" title="Expedición no encontrada">
        <MissionStack>
          <div className="mission-card py-10 text-center text-[#A4C2C5]/50 italic">
            No se encontraron expediciones activas.
            <div className="mt-4">
              <Btn variant="primary" onClick={() => onNavigate?.("Lanzar Misión")}>Planificar Nueva Misión</Btn>
            </div>
          </div>
        </MissionStack>
      </MissionShell>
    );
  }

  // Get dynamic participants based on selected personnel
  const participantIds = exp.assignedPersonnelIds || [];
  const assignedPeople = MOCK_PEOPLE_CARDS.filter(p => participantIds.includes(p.id));

  // Options for adding campers to this expedition
  const availableToAssign = MOCK_PEOPLE_CARDS.filter(p => !participantIds.includes(p.id) && p.status === "ACTIVE");

  const handleAddPerson = () => {
    if (!selectedAddPerson) return;
    assignPersonToExpedition(selectedAddPerson, exp.id);
    reloadStore();
    // Auto reset to first available if any
    const updatedExp = getExpeditions().find(e => e.id === exp.id);
    const updatedIds = updatedExp?.assignedPersonnelIds || [];
    const rem = MOCK_PEOPLE_CARDS.filter(p => !updatedIds.includes(p.id) && p.status === "ACTIVE");
    if (rem.length > 0) {
      setSelectedAddPerson(rem[0].id);
    }
  };

  return (
    <MissionShell kicker="Bitácora de misión" title={exp.name}>
      <MissionStack>
        <div className="mission-card mission-card-wide">
          <div className="mission-header-row">
            <div>
              <Btn small variant="ghost" onClick={() => onNavigate?.("Archivo Histórico")}>← Volver al listado</Btn>
              <h2 className="mission-inline-title">📍 {exp.name} <span>#{exp.id}00</span></h2>
              <div className="flex gap-2 mt-1">
                <StatusBadge status={exp.status} />
                <span className="text-[10px] text-[#67ACA9]/60 uppercase font-bold self-center">Objetivo: {exp.objective || "Reconocimiento de zona"}</span>
              </div>
            </div>
          </div>
          <div className="mt-5">
            <ExpeditionFlow current={exp.status === "COMPLETED" || exp.status === "COMPLETADA" ? "COMPLETADA" : exp.status === "CANCELED" || exp.status === "CANCELADA" ? "CANCELADA" : exp.status === "PLANNED" || exp.status === "PLANIFICADA" ? "PLANIFICADA" : "ACTIVA"} />
          </div>
        </div>

        <div className="mission-tabs">
          <button className={activeTab === "detalles" ? "is-active" : ""} onClick={() => setActiveTab("detalles")}>Detalles</button>
          <button className={activeTab === "participantes" ? "is-active" : ""} onClick={() => setActiveTab("participantes")}>Participantes ({assignedPeople.length})</button>
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
                  <div className="flex justify-between border-b border-[#67ACA9]/10 pb-1"><span>Partida real:</span> <span className="text-[#69BFB7]">{exp.departure} (Eficiencia 98%)</span></div>
                  <div className="flex justify-between border-b border-[#67ACA9]/10 pb-1"><span>Duración Planeada:</span> <span className="text-[#A4C2C5]">45 Horas útiles</span></div>
                  <div className="flex justify-between font-bold"><span>Contingencia militar:</span> <span className="text-amber-400">{exp.extraUsed}/{exp.extraDays} días usados ⏱️</span></div>
                </div>
              </div>
              <div className="mission-card">
                <div className="mission-card-title">Ubicación y Satélite</div>
                <div className="flex flex-col gap-3">
                  <p className="text-[11px] text-[#A4C2C5]">{exp.dest}.</p>
                  <div className="p-2 bg-black/30 border border-[#67ACA9]/20 rounded-sm font-mono text-[9px] text-[#69BFB7]">
                    Coordenadas: LAT: {exp.lat} | LNG: {exp.lng}
                  </div>
                  <div className="flex gap-2">
                    <Btn small variant="ghost" onClick={() => navigator.clipboard.writeText(`LAT: ${exp.lat}, LNG: ${exp.lng}`)}>Copiar Coords</Btn>
                    <Btn small variant="ghost" onClick={() => onNavigate?.("Analizador Satelital")}>Ver en Mapa Satelital</Btn>
                  </div>
                </div>
              </div>
            </div>
            <div className="mission-card mission-summary-card">
              <div className="mission-card-title">Resumen de Misión</div>
              <div className="mission-summary-list">
                <div><span>Participantes</span><strong>{assignedPeople.length}</strong></div>
                <div><span>Suministros</span><strong>{exp.resources}</strong></div>
                <div><span>Estado Logístico</span><strong>{exp.status.replace("_", " ")}</strong></div>
                <div><span>Riesgo inicial</span><strong className="text-amber-400 font-bold">{exp.danger || "Medio"}</strong></div>
                <div><span>Clima estimado</span><strong>{exp.climate || "Templado"}</strong></div>
                <div><span>Zonaje satelital</span><strong className="text-[#69BFB7]">Activo</strong></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "participantes" && (
          <>
            <div className="mission-card mission-card-wide">
              <div className="mission-card-title">Participantes ({assignedPeople.length}/10)</div>
              <div className="v-table-wrap">
                <table className="v-table">
                  <thead>
                    <tr>
                      <th className="w-12">Foto</th>
                      <th>Persona</th>
                      <th>Rol en Campamento</th>
                      <th>Puesto asignado</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedPeople.map(p => (
                      <tr key={p.id}>
                        <td>
                          <img src={p.img} alt={p.name} className="w-7 h-7 rounded-full object-cover border border-[#67ACA9]/20" referrerPolicy="no-referrer" />
                        </td>
                        <td className="font-bold text-[#f0fafa]">{p.name}</td>
                        <td className="text-[#A4C2C5]">{p.role}</td>
                        <td className="text-[#69BFB7] font-semibold uppercase text-[10px]">Especialista de Campo</td>
                        <td><StatusBadge status="ACTIVE" /></td>
                      </tr>
                    ))}
                    {assignedPeople.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-xs text-[#A4C2C5]/50 italic">
                          No hay personal asignado a esta expedición todavía.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {availableToAssign.length > 0 && (
              <div className="mission-card mission-card-wide">
                <div className="mission-card-title">Asignar Operador Adicional</div>
                <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                  <div>
                    <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                      Personal Disponible
                    </label>
                    <select 
                      className="w-full bg-[#020706] border border-[#67ACA9]/30 rounded-sm p-1.5 text-xs text-[#A4C2C5]"
                      value={selectedAddPerson}
                      onChange={(e) => setSelectedAddPerson(Number(e.target.value))}
                    >
                      {availableToAssign.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <Btn variant="primary" onClick={handleAddPerson}>Confirmar Asignación</Btn>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "recursos" && (
          <>
            <div className="mission-card mission-card-wide">
              <div className="mission-card-title">Recursos Consumidos Estimados</div>
              <div className="v-table-wrap">
                <table className="v-table">
                  <thead>
                    <tr>
                      <th>Recurso</th>
                      <th>Cantidad</th>
                      <th>Unidad</th>
                      <th>Fecha Registro</th>
                      <th>Registrado por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_RESOURCES_CONSUMED.map((r, i) => (
                      <tr key={i}>
                        <td className="font-bold">{r.type}</td>
                        <td>{r.amount}</td>
                        <td className="text-[#A4C2C5]">{r.unit}</td>
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
                      <th>Recurso recuperado</th>
                      <th>Cantidad aprox.</th>
                      <th>Categoría de Suministro</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="font-bold text-[#f0fafa]">Plantas medicinales silvestres</td>
                      <td>25.50 kg</td>
                      <td><StatusBadge status="MEDICAL" /></td>
                    </tr>
                    <tr>
                      <td className="font-bold text-[#f0fafa]">Piezas de chatarra reciclada</td>
                      <td>12.00 Unidades</td>
                      <td><StatusBadge status="OTHER" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </MissionStack>
    </MissionShell>
  );
}
