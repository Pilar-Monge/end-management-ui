import { useEffect, useMemo, useState, type ReactNode, Component } from 'react'
import React from 'react'
import {
  autoAssignWorkerCoverage,
  fetchWorkerAtRiskCoverage,
  fetchWorkerCoverageSuggestions,
  fetchWorkerCriticalCoverage,
  fetchWorkerDailyCollectionRecord,
  fetchWorkerDashboardPersonal,
  fetchWorkerNotificationById,
  fetchWorkerNotifications,
  fetchWorkerOccupationById,
  fetchWorkerOccupationCoverage,
  fetchWorkerOccupationCoverageByOccupation,
  fetchWorkerOccupations,
  updateWorkerNotificationReadState,
} from '../services/workerMainViewApi'
import type {
  PaginationInfo,
  WorkerAuthenticatedUser,
  WorkerAutoAssignmentResult,
  WorkerDashboardPersonalData,
  WorkerDailyCollectionRecord,
  WorkerNotification,
  WorkerOccupation,
  WorkerOccupationAtRisk,
  WorkerOccupationCoverage,
  WorkerReplacementSuggestion,
} from '../types'
import '../pages/worker-main-view.css'

type WorkerSectionId = 'dashboard' | 'recoleccion' | 'notificaciones' | 'ocupaciones' | 'cobertura'

type WorkerSection = {
  id: WorkerSectionId
  label: string
  shortLabel: string
  icon: ReactNode
}

const WORKER_NAV_DATA: WorkerSection[] = [
  { id: 'dashboard', label: 'Dashboard personal', shortLabel: 'DB', icon: <DashboardIcon /> },
  { id: 'recoleccion', label: 'Recolección diaria', shortLabel: 'RC', icon: <CollectionIcon /> },
  { id: 'notificaciones', label: 'Notificaciones', shortLabel: 'NT', icon: <NotificationIcon /> },
  { id: 'ocupaciones', label: 'Ocupaciones', shortLabel: 'OC', icon: <OccupationIcon /> },
  { id: 'cobertura', label: 'Cobertura de oficio', shortLabel: 'CB', icon: <CoverageIcon /> },
]

const EXPEDITION_STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planeadas',
  IN_PROGRESS: 'En curso',
  DELAYED: 'Retrasadas',
  COMPLETED: 'Completadas',
  LOST: 'Perdidas',
  RETURNED_AFTER_LOST: 'Recuperadas',
  CANCELED: 'Canceladas',
}

export function WorkerMainViewPage() {
  const [showLoading, setShowLoading] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasEntered, setHasEntered] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState<WorkerSectionId>('dashboard')

  const sessionUser = useMemo<WorkerAuthenticatedUser | null>(() => {
    const raw = localStorage.getItem('user')
    if (!raw) return null

    try {
      const parsed = JSON.parse(raw) as Partial<WorkerAuthenticatedUser> & { rol?: string; role?: string }
      return {
        id: Number(parsed.id ?? 0),
        username: parsed.username ?? '',
        role: parsed.role ?? parsed.rol ?? '',
        campId: typeof parsed.campId === 'number' ? parsed.campId : null,
      }
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsLoaded(true)
    }, 1500)

    return () => window.clearTimeout(timer)
  }, [])

  const activeSection = useMemo(
    () => WORKER_NAV_DATA.find((item) => item.id === activeSectionId) ?? WORKER_NAV_DATA[0],
    [activeSectionId],
  )

  const handleEnter = () => {
    setHasEntered(true)
    window.setTimeout(() => {
      setShowLoading(false)
    }, 280)
  }

  return (
    <div className="worker-screen-layout">
      <div className="worker-holo-grid" aria-hidden="true" />

      <LoadingOverlay show={showLoading} isLoaded={isLoaded} onEnter={handleEnter} />

      {hasEntered ? (
        <>
          <header className="worker-top-hud">
            <button className="worker-hud-btn" type="button">
              Panel Trabajador
            </button>
          </header>

          <main className="worker-main-area">
            <div className="worker-title-row">
              <h1>{activeSection.label}</h1>
            </div>

            <section className="worker-shell" aria-label="Panel de trabajador">
              <div className="worker-content">
                <GenericWorkerContent section={activeSection} sessionUser={sessionUser} />
              </div>
            </section>
          </main>

          <footer className="worker-dock" aria-label="Modulos de trabajador">
            {WORKER_NAV_DATA.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                className={`worker-dock-item ${activeSectionId === item.id ? 'is-active' : ''}`}
                onClick={() => setActiveSectionId(item.id)}
              >
                <span className="worker-dock-icon">{item.icon}</span>
                <span className="worker-dock-text">{item.shortLabel}</span>
              </button>
            ))}
          </footer>
        </>
      ) : null}
    </div>
  )
}

export default WorkerMainViewPage

function LoadingOverlay({
  show,
  isLoaded,
  onEnter,
}: {
  show: boolean
  isLoaded: boolean
  onEnter: () => void
}) {
  if (!show) return null

  return (
    <div className={`worker-loading-overlay ${isLoaded ? 'is-loaded' : ''}`}>
      <div className="worker-loading-panel">
        <p className="worker-loading-eyebrow">Inicializando consola operativa</p>
        <h2>Sistema de trabajador</h2>
        <div className="worker-loading-bar">
          <span style={{ width: isLoaded ? '100%' : '44%' }} />
        </div>
        <button type="button" className="worker-enter-btn" onClick={onEnter} disabled={!isLoaded}>
          Entrar
        </button>
      </div>
    </div>
  )
}

function GenericWorkerContent({
  section,
  sessionUser,
}: {
  section: WorkerSection
  sessionUser: WorkerAuthenticatedUser | null
}) {
  switch (section.id) {
    case 'dashboard':
      return <DashboardSection />
    case 'recoleccion':
      return <CollectionSection sessionUser={sessionUser} />
    case 'notificaciones':
      return <NotificationsSection sessionUser={sessionUser} />
    case 'ocupaciones':
      return <OccupationsSection />
    case 'cobertura':
      return (
        <ErrorBoundary>
          <CoverageSection sessionUser={sessionUser} />
        </ErrorBoundary>
      )
    default:
      return <ModuleStateCard title={section.label} message="Sin datos disponibles para este módulo." />
  }
}

function DashboardSection() {
  const [data, setData] = useState<WorkerDashboardPersonalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      setLoading(true)
      setError(null)

      try {
        const nextData = await fetchWorkerDashboardPersonal()
        if (isMounted) setData(nextData)
      } catch (fetchError) {
        if (isMounted) setError(fetchError instanceof Error ? fetchError.message : 'No se pudo cargar el tablero')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void loadDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  if (loading) return <ModuleStateCard title="Cargando tablero" message="Obteniendo indicadores reales del trabajador..." />
  if (error) return <ModuleStateCard title="No se pudo cargar el tablero" message={error} />
  if (!data) return <ModuleStateCard title="Sin información" message="No se obtuvo respuesta del tablero personal." />

  return (
    <div className="worker-content-grid worker-content-grid-single">
      <article className="worker-card worker-card-wide">
        <div className="worker-card-label">Resumen general</div>
        <div className="worker-metric-grid worker-metric-grid-dashboard">
          <MetricBox label="Usuario" value={data.userId ? `#${data.userId}` : 'No asignado'} />
          <MetricBox label="Alertas sin leer" value={String(data.general.unreadNotifications)} />
          <MetricBox label="Personas registradas" value={String(data.general.totalPersons)} />
          <MetricBox label="Solicitudes pendientes" value={String(data.general.pendingAdmissionRequests)} />
        </div>
      </article>

      <article className="worker-card worker-card-wide">
        <div className="worker-card-label">Inventario visible</div>
        <div className="worker-note-grid worker-note-grid-dashboard">
          <div>
            <h4>Recursos actuales</h4>
            <ul className="worker-status-list">
              {data.inventory.resources.length > 0 ? (
                data.inventory.resources.map((resource) => (
                  <li key={resource.resourceName}>
                    <span>{resource.resourceName}</span>
                    <strong>{String(resource.currentAmount)}</strong>
                  </li>
                ))
              ) : (
                <li>
                  <span>Sin recursos registrados</span>
                  <strong>-</strong>
                </li>
              )}
            </ul>
          </div>
          <div>
            <h4>Stock crítico</h4>
            <p>{data.inventory.criticalStockCount} recurso(s) en nivel crítico</p>
          </div>
        </div>
      </article>

      <article className="worker-card worker-card-wide">
        <div className="worker-card-label">Expediciones</div>
        <div className="worker-chart-list">
          {Object.entries(data.expeditions).map(([status, count]) => (
            <div className="worker-chart-row" key={status}>
              <div className="worker-chart-row-head">
                <span>{EXPEDITION_STATUS_LABELS[status] ?? status}</span>
                <strong>{count}</strong>
              </div>
              <div className="worker-chart-track">
                <div
                  className="worker-chart-fill"
                  style={{ width: `${Math.min(100, Math.max(4, count * 10))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="worker-card worker-card-wide">
        <div className="worker-card-label">Consumo diario</div>
        <div className="worker-note-grid worker-note-grid-dashboard">
          {data.consumptionTrend.length > 0 ? (
            data.consumptionTrend.map((item) => (
              <div key={item.date}>
                <h4>{formatDateLabel(item.date)}</h4>
                <p>{String(item.totalConsumed)} consumidos</p>
              </div>
            ))
          ) : (
            <div>
              <h4>Sin historial</h4>
              <p>No hay datos de consumo todavía.</p>
            </div>
          )}
        </div>
      </article>
    </div>
  )
}

function NotificationsSection({ sessionUser }: { sessionUser: WorkerAuthenticatedUser | null }) {
  const [draftFilters, setDraftFilters] = useState({ targetRole: '', type: '', read: 'all', page: 1, limit: 5 })
  const [appliedFilters, setAppliedFilters] = useState(draftFilters)
  const [items, setItems] = useState<WorkerNotification[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selected, setSelected] = useState<WorkerNotification | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadNotifications() {
      setLoading(true)
      setError(null)

      try {
        const result = await fetchWorkerNotifications({
          targetRole: appliedFilters.targetRole || undefined,
          type: appliedFilters.type || undefined,
          read: appliedFilters.read === 'all' ? null : appliedFilters.read === 'true',
          page: appliedFilters.page,
          limit: appliedFilters.limit,
        })

        if (!isMounted) return

        setItems(result.items)
        setPagination(result.pagination)
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError instanceof Error ? fetchError.message : 'No se pudieron cargar las notificaciones')
          setItems([])
          setPagination(null)
          setSelectedId(null)
          setSelected(null)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void loadNotifications()

    return () => {
      isMounted = false
    }
  }, [appliedFilters])

  useEffect(() => {
    if (items.length === 0) {
      setSelectedId(null)
      setSelected(null)
      return
    }

    if (!selectedId || !items.some((item) => item.id === selectedId)) {
      setSelectedId(items[0].id)
    }
  }, [items, selectedId])

  useEffect(() => {
    let isMounted = true

    async function loadSelectedNotification() {
      if (!selectedId) {
        setSelected(null)
        return
      }

      setDetailLoading(true)
      try {
        const record = await fetchWorkerNotificationById(selectedId)
        if (isMounted) setSelected(record)
      } catch (fetchError) {
        if (isMounted) setError(fetchError instanceof Error ? fetchError.message : 'No se pudo cargar el detalle de la notificación')
      } finally {
        if (isMounted) setDetailLoading(false)
      }
    }

    void loadSelectedNotification()

    return () => {
      isMounted = false
    }
  }, [selectedId])

  const applyFilters = () => {
    setAppliedFilters({ ...draftFilters, page: 1 })
  }

  const markAsRead = async () => {
    if (!selected) return
    setDetailLoading(true)

    try {
      const result = await updateWorkerNotificationReadState(selected.id, true)
      setSelected(result.notification)
      setItems((prev) => prev.map((item) => (item.id === result.notification.id ? result.notification : item)))
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'No se pudo actualizar la notificación')
    } finally {
      setDetailLoading(false)
    }
  }

  if (!sessionUser) {
    return <ModuleStateCard title="Sesión no disponible" message="Inicia sesión otra vez para consultar tus notificaciones." />
  }

  if (loading) return <ModuleStateCard title="Cargando notificaciones" message="Buscando notificaciones reales para tu campamento..." />

  return (
    <div className="worker-content-grid worker-content-grid-single">
      <article className="worker-card worker-card-wide">
        <div className="worker-card-label">Filtros</div>
        <div className="worker-control-grid">
          <label className="worker-field">
            <span>Tipo</span>
            <input
              className="worker-input"
              value={draftFilters.type}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, type: event.target.value }))}
              placeholder="Todos"
            />
          </label>
          <label className="worker-field">
            <span>Rol objetivo</span>
            <select
              className="worker-input"
              value={draftFilters.targetRole}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, targetRole: event.target.value }))}
            >
              <option value="">Todos</option>
              <option value="WORKER">Worker</option>
              <option value="RESOURCE_MANAGEMENT">Resource management</option>
              <option value="TRAVEL_MANAGER">Travel manager</option>
              <option value="SYSTEM_ADMIN">System admin</option>
            </select>
          </label>
          <label className="worker-field">
            <span>Estado</span>
            <select
              className="worker-input"
              value={draftFilters.read}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, read: event.target.value }))}
            >
              <option value="all">Todas</option>
              <option value="false">Sin leer</option>
              <option value="true">Leídas</option>
            </select>
          </label>
          <label className="worker-field">
            <span>Página</span>
            <input
              className="worker-input"
              type="number"
              min={1}
              value={draftFilters.page}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, page: Number(event.target.value) || 1 }))}
            />
          </label>
          <label className="worker-field">
            <span>Límite</span>
            <input
              className="worker-input"
              type="number"
              min={1}
              max={50}
              value={draftFilters.limit}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, limit: Number(event.target.value) || 5 }))}
            />
          </label>
          <button type="button" className="worker-primary-btn" onClick={applyFilters}>
            Buscar
          </button>
        </div>
      </article>

      <div className="worker-two-col-grid">
        <article className="worker-card">
          <div className="worker-card-label">Notificaciones</div>
          {error ? <ModuleStateCard title="No se pudieron cargar" message={error} /> : null}
          <div className="worker-list-stack">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`worker-list-item ${selectedId === item.id ? 'is-active' : ''}`}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="worker-list-item-head">
                  <strong>{item.title}</strong>
                  <span className={`worker-pill ${item.read ? 'is-muted' : 'is-highlight'}`}>
                    {item.read ? 'Leída' : 'Sin leer'}
                  </span>
                </div>
                <p>{item.message}</p>
                <div className="worker-list-item-foot">
                  <span>{item.type}</span>
                  <span>{formatDateLabel(item.createdDate)}</span>
                </div>
              </button>
            ))}
            {!items.length && !error ? <ModuleStateCard title="Sin resultados" message="No hay notificaciones para los filtros actuales." /> : null}
          </div>

          <div className="worker-pagination-bar">
            <span>{pagination ? `${pagination.page} / ${pagination.pages} páginas` : 'Sin paginación'}</span>
            <div className="worker-pagination-actions">
              <button
                type="button"
                className="worker-secondary-btn"
                disabled={!pagination || pagination.page <= 1}
                onClick={() => setAppliedFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              >
                Anterior
              </button>
              <button
                type="button"
                className="worker-secondary-btn"
                disabled={!pagination || pagination.page >= pagination.pages}
                onClick={() =>
                  setAppliedFilters((prev) => ({
                    ...prev,
                    page: pagination ? Math.min(pagination.pages, prev.page + 1) : prev.page + 1,
                  }))
                }
              >
                Siguiente
              </button>
            </div>
          </div>
        </article>

        <article className="worker-card">
          <div className="worker-card-label">Detalle de la notificación</div>
          {detailLoading ? <ModuleStateCard title="Cargando detalle" message="Obteniendo la notificación seleccionada..." /> : null}
          {selected ? (
            <div className="worker-detail-stack">
              <h3>{selected.title}</h3>
              <p>{selected.message}</p>
              <div className="worker-detail-grid">
                <DetailRow label="Campamento" value={`#${selected.campId}`} />
                <DetailRow label="Destino" value={selected.targetRole || 'Todos'} />
                <DetailRow label="Tipo" value={selected.type} />
                <DetailRow label="Fecha" value={formatDateLabel(selected.createdDate)} />
                <DetailRow label="Estado" value={selected.read ? 'Leída' : 'Sin leer'} />
                <DetailRow label="Origen" value={selected.sourceType ? `${selected.sourceType} #${selected.sourceId ?? '-'}` : 'Sin origen'} />
              </div>
              <div className="worker-action-row">
                <button type="button" className="worker-primary-btn" onClick={markAsRead} disabled={selected.read}>
                  Marcar como leída
                </button>
              </div>
            </div>
          ) : (
            <ModuleStateCard title="Sin selección" message="Selecciona una notificación para ver su detalle." />
          )}
        </article>
      </div>
    </div>
  )
}

function OccupationsSection() {
  const [draftFilters, setDraftFilters] = useState({ collectsResources: 'all', participatesInExpeditions: 'all', resourceTypeId: '', page: 1, limit: 8 })
  const [appliedFilters, setAppliedFilters] = useState(draftFilters)
  const [items, setItems] = useState<WorkerOccupation[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selected, setSelected] = useState<WorkerOccupation | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadOccupations() {
      setLoading(true)
      setError(null)

      try {
        const result = await fetchWorkerOccupations({
          collectsResources: appliedFilters.collectsResources === 'all' ? null : appliedFilters.collectsResources === 'true',
          participatesInExpeditions:
            appliedFilters.participatesInExpeditions === 'all' ? null : appliedFilters.participatesInExpeditions === 'true',
          resourceTypeId: appliedFilters.resourceTypeId ? Number(appliedFilters.resourceTypeId) : null,
          page: appliedFilters.page,
          limit: appliedFilters.limit,
        })

        if (!isMounted) return

        setItems(result.items)
        setPagination(result.pagination)
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError instanceof Error ? fetchError.message : 'No se pudieron cargar las ocupaciones')
          setItems([])
          setPagination(null)
          setSelectedId(null)
          setSelected(null)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void loadOccupations()

    return () => {
      isMounted = false
    }
  }, [appliedFilters])

  useEffect(() => {
    if (items.length === 0) {
      setSelectedId(null)
      setSelected(null)
      return
    }

    if (!selectedId || !items.some((item) => item.id === selectedId)) {
      setSelectedId(items[0].id)
    }
  }, [items, selectedId])

  useEffect(() => {
    let isMounted = true

    async function loadSelectedOccupation() {
      if (!selectedId) {
        setSelected(null)
        return
      }

      setDetailLoading(true)
      try {
        const record = await fetchWorkerOccupationById(selectedId)
        if (isMounted) setSelected(record)
      } catch (fetchError) {
        if (isMounted) setError(fetchError instanceof Error ? fetchError.message : 'No se pudo cargar el detalle de la ocupación')
      } finally {
        if (isMounted) setDetailLoading(false)
      }
    }

    void loadSelectedOccupation()

    return () => {
      isMounted = false
    }
  }, [selectedId])

  const applyFilters = () => {
    setAppliedFilters({ ...draftFilters, page: 1 })
  }

  if (loading) return <ModuleStateCard title="Cargando ocupaciones" message="Obteniendo ocupaciones reales del sistema..." />

  return (
    <div className="worker-content-grid worker-content-grid-single">
      <article className="worker-card worker-card-wide">
        <div className="worker-card-label">Filtros</div>
        <div className="worker-control-grid">
          <label className="worker-field">
            <span>Incluye recolección</span>
            <select
              className="worker-input"
              value={draftFilters.collectsResources}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, collectsResources: event.target.value }))}
            >
              <option value="all">Todos</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="worker-field">
            <span>Participa en expediciones</span>
            <select
              className="worker-input"
              value={draftFilters.participatesInExpeditions}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, participatesInExpeditions: event.target.value }))}
            >
              <option value="all">Todos</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="worker-field">
            <span>Tipo de recurso</span>
            <input
              className="worker-input"
              type="number"
              min={1}
              value={draftFilters.resourceTypeId}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, resourceTypeId: event.target.value }))}
              placeholder="Opcional"
            />
          </label>
          <label className="worker-field">
            <span>Página</span>
            <input
              className="worker-input"
              type="number"
              min={1}
              value={draftFilters.page}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, page: Number(event.target.value) || 1 }))}
            />
          </label>
          <label className="worker-field">
            <span>Límite</span>
            <input
              className="worker-input"
              type="number"
              min={1}
              max={50}
              value={draftFilters.limit}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, limit: Number(event.target.value) || 8 }))}
            />
          </label>
          <button type="button" className="worker-primary-btn" onClick={applyFilters}>
            Buscar
          </button>
        </div>
      </article>

      <div className="worker-two-col-grid">
        <article className="worker-card">
          <div className="worker-card-label">Ocupaciones</div>
          {error ? <ModuleStateCard title="No se pudieron cargar" message={error} /> : null}
          <div className="worker-list-stack">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`worker-list-item ${selectedId === item.id ? 'is-active' : ''}`}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="worker-list-item-head">
                  <strong>{item.name}</strong>
                  <span className={`worker-pill ${item.collectsResources ? 'is-highlight' : 'is-muted'}`}>
                    {item.collectsResources ? 'Recolección' : 'No recolecta'}
                  </span>
                </div>
                <p>{item.description || 'Sin descripción registrada'}</p>
                <div className="worker-list-item-foot">
                  <span>{item.participatesInExpeditions ? 'Participa en expediciones' : 'Solo operaciones locales'}</span>
                  <span>{formatDateLabel(item.createdAt)}</span>
                </div>
              </button>
            ))}
            {!items.length && !error ? <ModuleStateCard title="Sin resultados" message="No hay ocupaciones para los filtros actuales." /> : null}
          </div>

          <div className="worker-pagination-bar">
            <span>{pagination ? `${pagination.page} / ${pagination.pages} páginas` : 'Sin paginación'}</span>
            <div className="worker-pagination-actions">
              <button
                type="button"
                className="worker-secondary-btn"
                disabled={!pagination || pagination.page <= 1}
                onClick={() => setAppliedFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              >
                Anterior
              </button>
              <button
                type="button"
                className="worker-secondary-btn"
                disabled={!pagination || pagination.page >= pagination.pages}
                onClick={() =>
                  setAppliedFilters((prev) => ({
                    ...prev,
                    page: pagination ? Math.min(pagination.pages, prev.page + 1) : prev.page + 1,
                  }))
                }
              >
                Siguiente
              </button>
            </div>
          </div>
        </article>

        <article className="worker-card">
          <div className="worker-card-label">Detalle de la ocupación</div>
          {detailLoading ? <ModuleStateCard title="Cargando detalle" message="Obteniendo la ocupación seleccionada..." /> : null}
          {selected ? (
            <div className="worker-detail-stack">
              <h3>{selected.name}</h3>
              <p>{selected.description || 'Sin descripción registrada'}</p>
              <div className="worker-detail-grid">
                <DetailRow label="Recolección" value={selected.collectsResources ? 'Sí' : 'No'} />
                <DetailRow label="Expediciones" value={selected.participatesInExpeditions ? 'Sí' : 'No'} />
                <DetailRow label="Tipo de recurso" value={selected.resourceTypeId ? `#${selected.resourceTypeId}` : 'No aplica'} />
                <DetailRow label="Producción diaria" value={selected.dailyAmountProduced} />
                <DetailRow label="Consumo diario" value={selected.dailyRationConsumed} />
                <DetailRow label="Mínimo requerido" value={String(selected.minimumRequiredWorkers)} />
                <DetailRow label="Preferido" value={selected.preferredWorkers ? String(selected.preferredWorkers) : 'Sin preferencia'} />
                <DetailRow label="Umbral crítico" value={selected.criticalThresholdPercent} />
                <DetailRow label="Creada" value={formatDateLabel(selected.createdAt)} />
              </div>
            </div>
          ) : (
            <ModuleStateCard title="Sin selección" message="Selecciona una ocupación para ver su detalle." />
          )}
        </article>
      </div>
    </div>
  )
}

function CoverageSection({ sessionUser }: { sessionUser: WorkerAuthenticatedUser | null }) {
  const campId = sessionUser?.campId ?? null
  const [occupationOptions, setOccupationOptions] = useState<WorkerOccupation[]>([])
  const [coverageRows, setCoverageRows] = useState<WorkerOccupationCoverage[]>([])
  const [criticalRows, setCriticalRows] = useState<WorkerOccupationCoverage[]>([])
  const [atRiskRows, setAtRiskRows] = useState<WorkerOccupationAtRisk[]>([])
  const [selectedOccupationId, setSelectedOccupationId] = useState<number | null>(null)
  const [selectedCoverage, setSelectedCoverage] = useState<WorkerOccupationCoverage | null>(null)
  const [suggestions, setSuggestions] = useState<WorkerReplacementSuggestion[]>([])
  const [autoResult, setAutoResult] = useState<WorkerAutoAssignmentResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadCoverageData() {
      if (!campId) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const [occupations, coverage, critical, atRisk] = await Promise.all([
          fetchWorkerOccupations({ page: 1, limit: 100 }),
          fetchWorkerOccupationCoverage(campId),
          fetchWorkerCriticalCoverage(campId),
          fetchWorkerAtRiskCoverage(campId),
        ])

        if (!isMounted) return

        setOccupationOptions(occupations.items)
        setCoverageRows(coverage)
        setCriticalRows(critical)
        setAtRiskRows(atRisk)

        setSelectedOccupationId((current) => current ?? atRisk[0]?.occupationId ?? occupations.items[0]?.id ?? null)
      } catch (fetchError) {
        if (isMounted) setError(fetchError instanceof Error ? fetchError.message : 'No se pudo cargar la cobertura')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void loadCoverageData()

    return () => {
      isMounted = false
    }
  }, [campId, selectedOccupationId])

  useEffect(() => {
    let isMounted = true

    async function loadSelectedCoverage() {
      if (!campId || !selectedOccupationId) {
        setSelectedCoverage(null)
        setSuggestions([])
        return
      }

      setActionLoading(true)

      try {
        const [coverage, replacementSuggestions] = await Promise.all([
          fetchWorkerOccupationCoverageByOccupation(campId, selectedOccupationId),
          fetchWorkerCoverageSuggestions(campId, selectedOccupationId),
        ])

        if (!isMounted) return

        setSelectedCoverage(coverage)
        setSuggestions(replacementSuggestions)
      } catch (fetchError) {
        if (isMounted) setError(fetchError instanceof Error ? fetchError.message : 'No se pudo cargar la cobertura seleccionada')
      } finally {
        if (isMounted) setActionLoading(false)
      }
    }

    void loadSelectedCoverage()

    return () => {
      isMounted = false
    }
  }, [campId, selectedOccupationId])

  const handleAutoAssign = async () => {
    if (!campId || !selectedOccupationId) return
    setActionLoading(true)
    setAutoResult(null)

    try {
      const result = await autoAssignWorkerCoverage(campId, selectedOccupationId)
      setAutoResult(result)
    } catch (fetchError) {
      setAutoResult({
        success: false,
        message: fetchError instanceof Error ? fetchError.message : 'No se pudo ejecutar la asignación automática',
      })
    } finally {
      setActionLoading(false)
    }
  }

  if (!sessionUser) {
    return <ModuleStateCard title="Sesión no disponible" message="Inicia sesión otra vez para consultar la cobertura." />
  }

  if (loading) return <ModuleStateCard title="Cargando cobertura" message="Consultando cobertura y sugerencias reales..." />
  if (!campId) return <ModuleStateCard title="Campamento no disponible" message="No se encontró un campamento asociado al usuario." />

  return (
    <div className="worker-content-grid worker-content-grid-single">
      <article className="worker-card worker-card-wide">
        <div className="worker-card-label">Cobertura general</div>
        <div className="worker-metric-grid worker-metric-grid-dashboard">
          <MetricBox label="Campamento" value={`#${campId}`} />
          <MetricBox label="Críticas" value={String(criticalRows.length)} />
          <MetricBox label="En riesgo" value={String(atRiskRows.length)} />
          <MetricBox label="Ocupaciones analizadas" value={String(coverageRows.length)} />
        </div>
      </article>

      <article className="worker-card worker-card-wide">
        <div className="worker-card-label">Elegir ocupación</div>
        {error ? <ModuleStateCard title="Cobertura con observaciones" message={error} /> : null}
        <div className="worker-control-grid">
          <label className="worker-field worker-field-wide">
            <span>Ocupación</span>
            <select className="worker-input" value={selectedOccupationId ?? ''} onChange={(event) => setSelectedOccupationId(Number(event.target.value) || null)}>
              <option value="">Selecciona una ocupación</option>
              {occupationOptions.map((occupation) => (
                <option key={occupation.id} value={occupation.id}>
                  {occupation.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="worker-primary-btn" onClick={handleAutoAssign} disabled={!selectedOccupationId}>
            Auto asignar reemplazo
          </button>
        </div>
      </article>

      <div className="worker-two-col-grid">
        <article className="worker-card">
          <div className="worker-card-label">Cobertura por ocupación</div>
          <div className="worker-list-stack">
            {coverageRows.map((row) => (
              <div key={row.occupationId} className="worker-list-item is-static">
                <div className="worker-list-item-head">
                  <strong>{row.occupationName}</strong>
                  <span className={`worker-pill ${row.isCritical ? 'is-critical' : row.isAtRisk ? 'is-highlight' : 'is-muted'}`}>
                    {row.isCritical ? 'Crítica' : row.isAtRisk ? 'En riesgo' : 'Estable'}
                  </span>
                </div>
                <p>{row.activeWorkers} activos / {row.minimumRequiredWorkers} mínimos</p>
                <div className="worker-chart-track">
                  <div className="worker-chart-fill" style={{ width: `${Math.min(100, row.coveragePercent)}%` }} />
                </div>
              </div>
            ))}
            {!coverageRows.length ? <ModuleStateCard title="Sin datos" message="No hay cobertura registrada." /> : null}
          </div>
        </article>

        <article className="worker-card">
          <div className="worker-card-label">Detalle seleccionado</div>
          {selectedCoverage ? (
            <div className="worker-detail-stack">
              <h3>{selectedCoverage.occupationName}</h3>
              <div className="worker-detail-grid">
                <DetailRow label="Disponibles" value={String(selectedCoverage.availableWorkers)} />
                <DetailRow label="Activos" value={String(selectedCoverage.activeWorkers)} />
                <DetailRow label="Cobertura" value={`${selectedCoverage.coveragePercent}%`} />
                <DetailRow label="Mínimo" value={String(selectedCoverage.minimumRequiredWorkers)} />
                <DetailRow label="Preferido" value={selectedCoverage.preferredWorkers ? String(selectedCoverage.preferredWorkers) : 'Sin preferencia'} />
                <DetailRow label="Déficit" value={String(selectedCoverage.deficit)} />
                <DetailRow label="Excedente" value={String(selectedCoverage.surplus)} />
                <DetailRow label="Umbral" value={selectedCoverage.criticalThresholdPercent} />
              </div>
            </div>
          ) : (
            <ModuleStateCard title="Sin selección" message="Elige una ocupación para ver su cobertura exacta." />
          )}
        </article>
      </div>

      <div className="worker-two-col-grid">
        <article className="worker-card">
          <div className="worker-card-label">Ocupaciones críticas</div>
          <div className="worker-list-stack">
            {criticalRows.map((row) => (
              <div key={row.occupationId} className="worker-list-item is-static">
                <div className="worker-list-item-head">
                  <strong>{row.occupationName}</strong>
                  <span className="worker-pill is-critical">Crítica</span>
                </div>
                <p>{row.availableWorkers} disponibles, cobertura {row.coveragePercent}%</p>
              </div>
            ))}
            {!criticalRows.length ? <ModuleStateCard title="Sin alertas críticas" message="No hay ocupaciones críticas en este campamento." /> : null}
          </div>
        </article>

        <article className="worker-card">
          <div className="worker-card-label">Sugerencias de reemplazo</div>
          <div className="worker-list-stack">
            {suggestions.map((suggestion) => (
              <div key={suggestion.personId} className="worker-list-item is-static">
                <div className="worker-list-item-head">
                  <strong>{suggestion.personName}</strong>
                  <span className={`worker-pill priority-${suggestion.priority.toLowerCase()}`}>{suggestion.priority}</span>
                </div>
                <p>{suggestion.currentOccupationName} → {suggestion.targetOccupationName}</p>
                <p>{suggestion.reason}</p>
              </div>
            ))}
            {!suggestions.length ? <ModuleStateCard title="Sin sugerencias" message="No hay reemplazos sugeridos para la ocupación seleccionada." /> : null}
          </div>
          {autoResult ? (
            <div className={`worker-result-box ${autoResult.success ? 'is-success' : 'is-error'}`}>
              <strong>{autoResult.success ? 'Asignación completada' : 'No se pudo asignar'}</strong>
              <p>{autoResult.message}</p>
              {autoResult.assignedPerson ? (
                <p>{autoResult.assignedPerson.name}: {autoResult.assignedPerson.fromOccupation} → {autoResult.assignedPerson.toOccupation}</p>
              ) : null}
            </div>
          ) : null}
          {actionLoading ? <ModuleStateCard title="Procesando" message="Ejecutando la acción solicitada..." /> : null}
        </article>
      </div>
    </div>
  )
}

function CollectionSection({ sessionUser }: { sessionUser: WorkerAuthenticatedUser | null }) {
  const [recordId, setRecordId] = useState('')
  const [record, setRecord] = useState<WorkerDailyCollectionRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRecord = async () => {
    const numericId = Number(recordId)
    if (!numericId) {
      setError('Ingresa un id de registro válido.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const nextRecord = await fetchWorkerDailyCollectionRecord(numericId)
      setRecord(nextRecord)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'No se pudo cargar el registro')
      setRecord(null)
    } finally {
      setLoading(false)
    }
  }

  if (!sessionUser) {
    return <ModuleStateCard title="Sesión no disponible" message="Inicia sesión otra vez para consultar los registros de recolección." />
  }

  return (
    <div className="worker-content-grid worker-content-grid-single">
      <article className="worker-card worker-card-wide">
        <div className="worker-card-label">Consulta de registro</div>
        <div className="worker-control-grid worker-control-grid-inline">
          <label className="worker-field worker-field-wide">
            <span>ID del registro</span>
            <input
              className="worker-input"
              type="number"
              min={1}
              value={recordId}
              onChange={(event) => setRecordId(event.target.value)}
              placeholder="Ej. 1024"
            />
          </label>
          <button type="button" className="worker-primary-btn" onClick={loadRecord} disabled={loading}>
            Cargar registro
          </button>
        </div>
        <p className="worker-helper-text">Se muestran solo registros reales y la vista respeta el campamento del usuario autenticado.</p>
      </article>

      <article className="worker-card worker-card-wide">
        <div className="worker-card-label">Detalle del registro</div>
        {loading ? <ModuleStateCard title="Cargando registro" message="Buscando el registro solicitado..." /> : null}
        {error ? <ModuleStateCard title="No se pudo cargar" message={error} /> : null}
        {record ? (
          <div className="worker-detail-stack">
            <h3>Registro #{record.id}</h3>
            <div className="worker-detail-grid">
              <DetailRow label="Campamento" value={`#${record.campId}`} />
              <DetailRow label="Persona" value={`#${record.personId}`} />
              <DetailRow label="Tipo de recurso" value={`#${record.resourceTypeId}`} />
              <DetailRow label="Fecha" value={formatDateLabel(record.date)} />
              <DetailRow label="Esperado" value={record.expectedAmount} />
              <DetailRow label="Real" value={record.actualAmount} />
              <DetailRow label="Motivo" value={record.differenceReason || 'Sin observaciones'} />
              <DetailRow label="Registrado por" value={`#${record.recordedBy}`} />
              <DetailRow label="Movimiento" value={record.movementId ? `#${record.movementId}` : 'Sin vínculo'} />
            </div>
          </div>
        ) : (
          <ModuleStateCard title="Sin registro cargado" message="Ingresa un id para ver el detalle de la recolección diaria." />
        )}
      </article>
    </div>
  )
}

function ModuleStateCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="worker-empty-state">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  )
}
 
class ErrorBoundary extends Component<{ children?: ReactNode }, { hasError: boolean; message?: string }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  componentDidCatch(error: unknown) {
    console.error('Worker coverage error:', error)
    this.setState({ hasError: true, message: error instanceof Error ? error.message : String(error) })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="worker-empty-state">
          <strong>Se produjo un error</strong>
          <p>{this.state.message ?? 'Error en el módulo de cobertura'}</p>
        </div>
      )
    }

    return this.props.children ?? null
  }
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="worker-detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function formatDateLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function IconSvg({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" className="worker-svg-icon">
      {children}
    </svg>
  )
}

function DashboardIcon() {
  return (
    <IconSvg>
      <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13" y="4" width="7" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13" y="10" width="7" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
    </IconSvg>
  )
}

function CollectionIcon() {
  return (
    <IconSvg>
      <path d="M5 7h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M7 7v10h10V7" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 11h6M9 14h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </IconSvg>
  )
}

function NotificationIcon() {
  return (
    <IconSvg>
      <path d="M12 4a4 4 0 0 0-4 4v2c0 1.1-.3 2.2-.9 3.1L6 14h12l-1.1-.9c-.6-.9-.9-2-.9-3.1V8a4 4 0 0 0-4-4Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </IconSvg>
  )
}

function OccupationIcon() {
  return (
    <IconSvg>
      <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 19c1.4-3.2 4.2-5 7-5s5.6 1.8 7 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </IconSvg>
  )
}

function CoverageIcon() {
  return (
    <IconSvg>
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M8 4v16M16 4v16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </IconSvg>
  )
}
