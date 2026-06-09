import { useState, useEffect } from "react";
import {
  StatusBadge,
  Btn,
  MissionShell,
  MissionStack
} from "../components/SharedLayout";
import { getExpeditions } from "../utils/expeditionsStore";
import type { DBExpedition } from "../utils/expeditionsStore";

interface ExpeditionListProps {
  onNavigate?: (sub: string, id?: number) => void;
}

export function ExpeditionList({ onNavigate }: ExpeditionListProps) {
  const [expeditions, setExpeditions] = useState<DBExpedition[]>([]);
  const [searchName, setSearchName] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  useEffect(() => {
    setExpeditions(getExpeditions());
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchName, filterStatus]);

  const filtered = expeditions.filter(e => {
    const matchesName = e.name.toLowerCase().includes(searchName.toLowerCase()) || 
                        e.dest.toLowerCase().includes(searchName.toLowerCase());
    const matchesStatus = filterStatus === "all" || e.status === filterStatus;
    return matchesName && matchesStatus;
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <MissionShell
      kicker="Control de rutas"
      title="Listado de Expediciones"
    >
      <MissionStack>
        <div className="mission-card mission-card-wide">
          <div className="mission-card-title">Búsqueda de Expediciones</div>
          <div className="grid grid-cols-[1fr_220px_auto_auto] gap-3 items-end">
            <div>
              <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">Nombre / Destino</label>
              <input
                type="text"
                className="w-full bg-[#020706] border border-[#67ACA9]/30 rounded-sm p-1.5 text-xs text-[#A4C2C5]"
                placeholder="Buscar..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">Estado</label>
              <select
                className="w-full bg-[#020706] border border-[#67ACA9]/30 rounded-sm p-1.5 text-xs text-[#A4C2C5]"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="PLANNED">Planeada / Planificada</option>
                <option value="IN_PROGRESS">En Progreso</option>
                <option value="DELAYED">Retrasada</option>
                <option value="COMPLETED">Completada</option>
                <option value="LOST">Perdida</option>
              </select>
            </div>
            <Btn variant="ghost" onClick={() => { setSearchName(""); setFilterStatus("all"); }} style={{ marginTop: 20 }}>Limpiar</Btn>
          </div>
        </div>

        <div className="mission-card mission-card-wide">
          <div className="mission-card-title">Listado General</div>
          <div className="v-table-wrap">
            <table className="v-table">
              <thead>
                <tr>
                  <th>Expedición</th>
                  <th>Destino</th>
                  <th>Estado</th>
                  <th>Salida</th>
                  <th>Regreso</th>
                  <th className="text-center">Integrantes</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(e => (
                  <tr key={e.id}>
                    <td className="font-bold text-[#f0fafa]">{e.name}</td>
                    <td className="text-[#A4C2C5]">{e.dest}</td>
                    <td><StatusBadge status={e.status} /></td>
                    <td>{e.departure}</td>
                    <td>{e.returnDate}</td>
                    <td className="text-center font-mono font-bold text-[#69BFB7]">{e.participants || e.assignedPersonnelIds?.length || 0}</td>
                    <td>
                      <div className="flex gap-1">
                        <Btn small variant="ghost" onClick={() => onNavigate?.("Detalles de Expedición", e.id)}>Ver</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-xs text-[#A4C2C5]/50 italic">
                      No se encontraron expediciones que coincidan con los filtros de búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center mt-4 pt-3 border-t border-[#67ACA9]/20 gap-3">
            <span className="text-[10px] font-mono text-[#A4C2C5]/50">
              Mostrando {paginated.length} de {filtered.length} registro(s) {filtered.length !== expeditions.length && `(filtrados de ${expeditions.length})`}
            </span>
            <div className="flex items-center gap-3">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className={`px-3 py-1 font-mono text-[10px] tracking-wider uppercase border border-[#67ACA9]/30 rounded-sm transition-all ${
                  currentPage === 1
                    ? "opacity-30 cursor-not-allowed text-[#A4C2C5]/40 border-[#67ACA9]/10 bg-transparent"
                    : "bg-[#020706]/80 text-[#69BFB7] hover:bg-[#67ACA9]/10 hover:border-[#69BFB7] cursor-pointer"
                }`}
              >
                &lt; Anterior
              </button>
              <span className="font-mono text-[10px] text-[#A4C2C5] uppercase tracking-wider">
                Página <strong className="text-[#69BFB7] font-bold">{currentPage}</strong> de <strong className="text-[#69BFB7] font-bold">{totalPages}</strong>
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className={`px-3 py-1 font-mono text-[10px] tracking-wider uppercase border border-[#67ACA9]/30 rounded-sm transition-all ${
                  currentPage === totalPages
                    ? "opacity-30 cursor-not-allowed text-[#A4C2C5]/40 border-[#67ACA9]/10 bg-transparent"
                    : "bg-[#020706]/80 text-[#69BFB7] hover:bg-[#67ACA9]/10 hover:border-[#69BFB7] cursor-pointer"
                }`}
              >
                Siguiente &gt;
              </button>
            </div>
          </div>
        </div>
      </MissionStack>
    </MissionShell>
  );
}
