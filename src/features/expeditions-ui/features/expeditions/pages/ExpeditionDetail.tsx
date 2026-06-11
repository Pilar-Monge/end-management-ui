import { useEffect, useState } from "react";
import {
  MOCK_PEOPLE_CARDS,
  StatusBadge,
  Btn,
  MissionShell,
  MissionStack,
  ExpeditionFlow,
} from "../components/SharedLayout";
import type { DBExpedition } from "../utils/expeditionsStore";
import {
  createExpeditionParticipant,
  getCurrentExpeditionUser,
  getExpeditionResourceSummary,
  getUiExpedition,
  listAvailablePeople,
  listExpeditionParticipants,
  type ExpeditionParticipant,
  type ExpeditionPerson,
  type ExpeditionResourceSummary,
} from "../../../services/expeditionsUi.service";

interface ExpeditionDetailProps {
  expeditionId?: number;
  onNavigate?: (sub: string, id?: number) => void;
}

function flowStatus(status: string): "PLANIFICADA" | "ACTIVA" | "COMPLETADA" | "CANCELADA" {
  if (status === "COMPLETED" || status === "RETURNED_AFTER_LOST") return "COMPLETADA";
  if (status === "CANCELED") return "CANCELADA";
  if (status === "PLANNED") return "PLANIFICADA";
  return "ACTIVA";
}

function displayPerson(personId: number, people: ExpeditionPerson[]) {
  const real = people.find((person) => person.id === personId);
  const mock = MOCK_PEOPLE_CARDS.find((person) => person.id === personId);
  return {
    id: personId,
    name: real?.fullName ?? mock?.name ?? `Persona ${personId}`,
    role: real?.role ?? mock?.role ?? "Operador de campo",
    status: real?.status ?? mock?.status ?? "ACTIVE",
    img: real?.img || mock?.img || `https://i.pravatar.cc/150?u=${personId}`,
  };
}

export function ExpeditionDetail({ expeditionId, onNavigate }: ExpeditionDetailProps) {
  const [activeTab, setActiveTab] = useState<"detalles" | "participantes" | "recursos">("detalles");
  const [expedition, setExpedition] = useState<DBExpedition | null>(null);
  const [participants, setParticipants] = useState<ExpeditionParticipant[]>([]);
  const [availablePeople, setAvailablePeople] = useState<ExpeditionPerson[]>([]);
  const [resources, setResources] = useState<ExpeditionResourceSummary>({ consumed: [], obtained: [] });
  const [selectedAddPerson, setSelectedAddPerson] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = async () => {
    if (!expeditionId) return;
    setLoading(true);
    try {
      setError(null);
      const [loadedExpedition, loadedParticipants, loadedResources, user] = await Promise.all([
        getUiExpedition(expeditionId),
        listExpeditionParticipants(expeditionId),
        getExpeditionResourceSummary(expeditionId),
        getCurrentExpeditionUser(),
      ]);
      const loadedPeople = await listAvailablePeople(user.campId);

      setExpedition(loadedExpedition);
      setParticipants(loadedParticipants);
      setResources(loadedResources);
      setAvailablePeople(loadedPeople);

      const assignedIds = loadedParticipants.map((participant) => participant.personId);
      const firstAvailable = loadedPeople.find((person) => !assignedIds.includes(person.id));
      setSelectedAddPerson(firstAvailable?.id ?? 0);
    } catch (loadError) {
      console.error("Error loading expedition detail:", loadError);
      setError("No se pudo cargar la expedicion desde el backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [expeditionId]);

  if (!expedition) {
    return (
      <MissionShell kicker="Bitacora de mision" title="Expedicion no encontrada">
        <MissionStack>
          <div className="mission-card py-10 text-center text-[#A4C2C5]/50 italic">
            {loading ? "Sincronizando expediente tactico..." : error ?? "No se encontraron expediciones activas."}
            <div className="mt-4">
              <Btn variant="primary" onClick={() => onNavigate?.("Lanzar Mision")}>Planificar Nueva Mision</Btn>
            </div>
          </div>
        </MissionStack>
      </MissionShell>
    );
  }

  const participantIds = participants.map((participant) => participant.personId);
  const assignedPeople = participantIds.map((personId) => displayPerson(personId, availablePeople));
  const availableToAssign = availablePeople.filter(
    (person) => person.status === "ACTIVE" && !participantIds.includes(person.id),
  );

  const handleAddPerson = async () => {
    if (!selectedAddPerson) return;
    await createExpeditionParticipant({ expeditionId: expedition.id, personId: selectedAddPerson });
    await loadDetail();
  };

  return (
    <MissionShell kicker="Bitacora de mision" title={expedition.name}>
      <MissionStack>
        <div className="mission-card mission-card-wide">
          <div className="mission-header-row">
            <div>
              <Btn small variant="ghost" onClick={() => onNavigate?.("Archivo Historico")}>{"<-"} Volver al listado</Btn>
              <h2 className="mission-inline-title">{expedition.name} <span>#{expedition.id}00</span></h2>
              <div className="flex gap-2 mt-1">
                <StatusBadge status={expedition.status} />
                <span className="text-[10px] text-[#67ACA9]/60 uppercase font-bold self-center">
                  Objetivo: {expedition.objective || "Reconocimiento de zona"}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-5">
            <ExpeditionFlow current={flowStatus(expedition.status)} />
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
                  <div className="flex justify-between border-b border-[#67ACA9]/10 pb-1"><span>Partida planeada:</span> <span className="text-[#A4C2C5]">{expedition.departure}</span></div>
                  <div className="flex justify-between border-b border-[#67ACA9]/10 pb-1"><span>Retorno planeado:</span> <span className="text-[#A4C2C5]">{expedition.returnDate}</span></div>
                  <div className="flex justify-between border-b border-[#67ACA9]/10 pb-1"><span>Dias extra usados:</span> <span className="text-amber-400">{expedition.extraUsed}/{expedition.extraDays}</span></div>
                  <div className="flex justify-between font-bold"><span>Estado logistico:</span> <span className="text-[#69BFB7]">{expedition.status.replace("_", " ")}</span></div>
                </div>
              </div>
              <div className="mission-card">
                <div className="mission-card-title">Ubicacion y Satelite</div>
                <div className="flex flex-col gap-3">
                  <p className="text-[11px] text-[#A4C2C5]">{expedition.dest}.</p>
                  <div className="p-2 bg-black/30 border border-[#67ACA9]/20 rounded-sm font-mono text-[9px] text-[#69BFB7]">
                    Coordenadas: LAT: {expedition.lat} | LNG: {expedition.lng}
                  </div>
                  <div className="flex gap-2">
                    <Btn small variant="ghost" onClick={() => navigator.clipboard.writeText(`LAT: ${expedition.lat}, LNG: ${expedition.lng}`)}>Copiar Coords</Btn>
                    <Btn small variant="ghost" onClick={() => onNavigate?.("Analizador Satelital")}>Ver en Mapa Satelital</Btn>
                  </div>
                </div>
              </div>
            </div>
            <div className="mission-card mission-summary-card">
              <div className="mission-card-title">Resumen de Mision</div>
              <div className="mission-summary-list">
                <div><span>Participantes</span><strong>{assignedPeople.length}</strong></div>
                <div><span>Suministros</span><strong>{expedition.resources}</strong></div>
                <div><span>Estado Logistico</span><strong>{expedition.status.replace("_", " ")}</strong></div>
                <div><span>Riesgo inicial</span><strong className="text-amber-400 font-bold">{expedition.danger || "Medio"}</strong></div>
                <div><span>Clima estimado</span><strong>{expedition.climate || "No registrado"}</strong></div>
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
                    {assignedPeople.map(person => (
                      <tr key={person.id}>
                        <td>
                          <img src={person.img} alt={person.name} className="w-7 h-7 rounded-full object-cover border border-[#67ACA9]/20" referrerPolicy="no-referrer" />
                        </td>
                        <td className="font-bold text-[#f0fafa]">{person.name}</td>
                        <td className="text-[#A4C2C5]">{person.role}</td>
                        <td className="text-[#69BFB7] font-semibold uppercase text-[10px]">Especialista de Campo</td>
                        <td><StatusBadge status={person.status} /></td>
                      </tr>
                    ))}
                    {assignedPeople.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-xs text-[#A4C2C5]/50 italic">
                          No hay personal asignado a esta expedicion todavia.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {availableToAssign.length > 0 && expedition.status === "PLANNED" && (
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
                      onChange={(event) => setSelectedAddPerson(Number(event.target.value))}
                    >
                      {availableToAssign.map(person => (
                        <option key={person.id} value={person.id}>
                          {person.fullName} ({person.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <Btn variant="primary" onClick={handleAddPerson}>Confirmar Asignacion</Btn>
                </div>
              </div>
            )}
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
                      <th>Unidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resources.consumed.map((resource) => (
                      <tr key={resource.resourceTypeId}>
                        <td className="font-bold">{resource.resourceTypeName}</td>
                        <td>{resource.amount}</td>
                        <td className="text-[#A4C2C5]">{resource.unit}</td>
                      </tr>
                    ))}
                    {resources.consumed.length === 0 && (
                      <tr><td colSpan={3} className="text-center py-6 text-xs text-[#A4C2C5]/50 italic">Sin recursos consumidos registrados.</td></tr>
                    )}
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
                      <th>Unidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resources.obtained.map((resource) => (
                      <tr key={resource.resourceTypeId}>
                        <td className="font-bold text-[#f0fafa]">{resource.resourceTypeName}</td>
                        <td>{resource.amount}</td>
                        <td>{resource.unit}</td>
                      </tr>
                    ))}
                    {resources.obtained.length === 0 && (
                      <tr><td colSpan={3} className="text-center py-6 text-xs text-[#A4C2C5]/50 italic">Sin recursos obtenidos registrados.</td></tr>
                    )}
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
