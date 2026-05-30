import { useEffect, useMemo, useState, type ReactNode, Component } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  autoAssignWorkerCoverage,
  fetchWorkerAtRiskCoverage,
  fetchWorkerCoverageSuggestions,
  fetchWorkerCriticalCoverage,
  fetchWorkerDailyCollectionRecord,
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
  WorkerDailyCollectionRecord,
  WorkerNotification,
  WorkerOccupation,
  WorkerOccupationAtRisk,
  WorkerOccupationCoverage,
  WorkerReplacementSuggestion,
} from '../types'
import '../pages/worker-main-view.css'

type WorkerSectionId = 'recoleccion' | 'notificaciones' | 'ocupaciones' | 'cobertura'

type WorkerSection = {
  id: WorkerSectionId
  label: string
  shortLabel: string
  icon: ReactNode
}

const WORKER_NAV_DATA: WorkerSection[] = [
  { id: 'recoleccion', label: 'Recolección diaria', shortLabel: 'RC', icon: <CollectionIcon /> },
  { id: 'notificaciones', label: 'Notificaciones', shortLabel: 'NT', icon: <NotificationIcon /> },
  { id: 'ocupaciones', label: 'Ocupaciones', shortLabel: 'OC', icon: <OccupationIcon /> },
  { id: 'cobertura', label: 'Cobertura de oficio', shortLabel: 'CB', icon: <CoverageIcon /> },
]

const WORKER_LOADING_ART = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#020706"/>
      <stop offset="55%" stop-color="#061313"/>
      <stop offset="100%" stop-color="#020706"/>
    </linearGradient>
    <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1180 360) rotate(135) scale(620 330)">
      <stop offset="0%" stop-color="#69BFB7" stop-opacity="0.28"/>
      <stop offset="60%" stop-color="#69BFB7" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#69BFB7" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#A4C2C5" stop-opacity="0.94"/>
      <stop offset="100%" stop-color="#5D9797" stop-opacity="0.82"/>
    </linearGradient>
    <linearGradient id="wood" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#1A120D"/>
      <stop offset="100%" stop-color="#342319"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#bg)"/>
  <rect width="1600" height="900" fill="url(#glow)"/>
  <ellipse cx="960" cy="640" rx="720" ry="210" fill="#0B1716" fill-opacity="0.72"/>
  <path d="M0 650C260 570 500 560 760 590C1040 625 1270 660 1600 620V900H0V650Z" fill="url(#wood)"/>
  <path d="M0 690C240 635 500 630 760 650C1020 670 1280 704 1600 690V900H0V690Z" fill="#251A12" fill-opacity="0.82"/>
  <g transform="translate(1090 110)">
    <ellipse cx="140" cy="95" rx="190" ry="45" fill="#040806" fill-opacity="0.65"/>
    <path d="M70 60H210C230 60 245 75 245 95V160H35V95C35 75 50 60 70 60Z" fill="url(#metal)" fill-opacity="0.16"/>
    <path d="M58 88H218L260 175H16L58 88Z" fill="url(#metal)" fill-opacity="0.9"/>
    <path d="M88 15H188C206 15 221 30 221 48V92H55V48C55 30 70 15 88 15Z" fill="#0C1313" fill-opacity="0.95"/>
    <path d="M105 0H171C184 0 194 10 194 23V43H82V23C82 10 92 0 105 0Z" fill="#A4C2C5" fill-opacity="0.18"/>
    <rect x="109" y="176" width="42" height="236" rx="18" fill="url(#metal)" fill-opacity="0.82"/>
    <rect x="86" y="382" width="90" height="34" rx="8" fill="#0D1010" fill-opacity="0.8"/>
    <circle cx="142" cy="82" r="18" fill="#020706"/>
    <circle cx="144" cy="81" r="8" fill="#69BFB7" fill-opacity="0.42"/>
  </g>
  <g opacity="0.65">
    <path d="M110 160H430" stroke="#69BFB7" stroke-opacity="0.12" stroke-width="2"/>
    <path d="M110 205H510" stroke="#69BFB7" stroke-opacity="0.1" stroke-width="2"/>
    <path d="M110 250H370" stroke="#69BFB7" stroke-opacity="0.08" stroke-width="2"/>
    <path d="M110 295H460" stroke="#69BFB7" stroke-opacity="0.06" stroke-width="2"/>
  </g>
</svg>
`)}`

export function WorkerMainViewPage() {
  const [showLoading, setShowLoading] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasEntered, setHasEntered] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState<WorkerSectionId>('recoleccion')

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
    <div className="worker-screen-layout text-[#A4C2C5]">
      <div className="worker-holo-grid" aria-hidden="true" />

      <LoadingOverlay show={showLoading} isLoaded={isLoaded} onEnter={handleEnter} />

      {hasEntered ? (
        <>
          <TopHud />

          <div className="main-area">
            <div className="content-scroll">
              <SectionTitle title={activeSection.label} />
              <section aria-label="Panel principal" className="settings-shell h-full w-full">
                <div className="paint-glow" aria-hidden="true" />
                <div className="settings-inner h-full" style={{ padding: '42px 0 0 0', overflow: 'hidden' }}>
                  <div className="watermark-x" aria-hidden="true" />
                  <div className="inner-layout">
                    <aside className="inner-sidebar">
                      <SideMenu
                        items={WORKER_NAV_DATA}
                        activeId={activeSectionId}
                        onSelect={(id) => setActiveSectionId(id)}
                      />
                    </aside>
                    <div className="inner-divider" />
                    <div className="inner-content">
                      <GenericWorkerContent section={activeSection} sessionUser={sessionUser} />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <BottomDock activeDock={activeSectionId} onSelect={(id) => setActiveSectionId(id)} />
          <SupportLink />
          <SettingsHint />
        </>
      ) : null}
    </div>
  )
}

export default WorkerMainViewPage

function TopHud() {
  return (
    <header className="worker-top-hud pointer-events-none flex items-center justify-between px-3 pt-3 pb-2 text-[10px] font-black uppercase tracking-[-0.02em] text-[#A4C2C5]/80">
      <button className="pointer-events-auto worker-hud-btn" type="button">
        <span className="btn-text">
          <span className="flex items-center gap-[1px] text-[#69BFB7]">
            <ChevronLeft />
            <ChevronLeft />
          </span>
          Centro operativo
        </span>
      </button>
      <button className="pointer-events-auto worker-hud-btn" type="button">
        <span className="btn-text">
          Panel trabajador
          <span className="logout-mark" aria-hidden="true" />
        </span>
      </button>
    </header>
  )
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="section-header">
      <div
        className="section-title-brush"
        style={{
          transformStyle: 'preserve-3d',
          transform: 'rotateY(25deg) translateZ(10px)',
        }}
      >
        <span className="btn-text">{title}</span>
      </div>
    </div>
  )
}

function SideMenu({
  items,
  activeId,
  onSelect,
}: {
  items: WorkerSection[]
  activeId: WorkerSectionId
  onSelect: (id: WorkerSectionId) => void
}) {
  return (
    <nav aria-label="Settings sections" className="w-full pl-2 pt-6 h-full flex flex-col">
      <div className="flex flex-col gap-[18px] perspective-[800px]">
        {items.map((item) => (
          <button
            className={`side-button ${activeId === item.id ? 'is-active' : ''} relative`}
            key={item.id}
            onClick={() => onSelect(item.id)}
            type="button"
            style={{
              transformStyle: 'preserve-3d',
              transform: 'rotateY(25deg) translateZ(10px)',
            }}
          >
            <span className="btn-text whitespace-nowrap overflow-visible drop-shadow-md">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

function BottomDock({
  activeDock,
  onSelect,
}: {
  activeDock: WorkerSectionId
  onSelect: (id: WorkerSectionId) => void
}) {
  return (
    <footer aria-label="Game navigation" className="dock">
      {WORKER_NAV_DATA.map((item) => (
        <button
          aria-label={item.label}
          className={`dock-item ${activeDock === item.id ? 'is-active' : ''}`}
          key={item.id}
          onClick={() => onSelect(item.id)}
          type="button"
        >
          <span className="dock-content">{item.icon}</span>
        </button>
      ))}
    </footer>
  )
}

function SupportLink() {
  return (
    <button className="support-link" type="button">
      <span className="btn-text"><span>?</span> Soporte</span>
    </button>
  )
}

function SettingsHint() {
  return (
    <button className="settings-hint" type="button">
      <span className="btn-text">Ajustes <GearIcon /></span>
    </button>
  )
}

function ChevronLeft() {
  return (
    <svg aria-hidden="true" className="h-4 w-3" fill="none" viewBox="0 0 10 16">
      <path d="M8 2 2 8l6 6" stroke="currentColor" strokeLinecap="square" strokeWidth="3" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 8.2A3.8 3.8 0 1 0 12 15.8 3.8 3.8 0 0 0 12 8.2Zm8.5 4.6v-1.6l-2.3-.8a6.8 6.8 0 0 0-.7-1.6l1-2.2-1.1-1.1-2.2 1a7 7 0 0 0-1.6-.7L12.8 3h-1.6l-.8 2.3a7 7 0 0 0-1.6.7l-2.2-1-1.1 1.1 1 2.2a6.8 6.8 0 0 0-.7 1.6l-2.3.8v1.6l2.3.8c.2.6.4 1.1.7 1.6l-1 2.2 1.1 1.1 2.2-1c.5.3 1 .5 1.6.7l.8 2.3h1.6l.8-2.3c.6-.2 1.1-.4 1.6-.7l2.2 1 1.1-1.1-1-2.2c.3-.5.5-1 .7-1.6l2.3-.8Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}

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
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[999] bg-[#020706]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        >
          <div className="worker-loading-art" aria-hidden="true" style={{ backgroundImage: `url("${WORKER_LOADING_ART}")` }} />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `
                linear-gradient(90deg, rgba(2,7,6,0.85) 0%, rgba(2,7,6,0.4) 35%, transparent 60%),
                linear-gradient(0deg, rgba(2,7,6,0.8) 0%, transparent 40%),
                radial-gradient(ellipse at 65% 45%, transparent 35%, rgba(2,7,6,0.5) 65%, rgba(2,7,6,0.92) 90%)
              `,
            }}
          />

          <div className="absolute left-8 right-8 bottom-0 top-0 z-10 flex flex-col justify-end pb-12 pointer-events-none">
            <motion.div
              className="text-[11px] font-bold tracking-[5px] text-[#A4C2C5]/40 uppercase mb-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              Conectando con base de campo
            </motion.div>

            <motion.h1
              className="text-[clamp(54px,8vw,118px)] font-black leading-none tracking-[-2px] text-[#f0fafa] uppercase whitespace-nowrap"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              TRABAJADOR
            </motion.h1>

            <motion.div
              className="h-[2px] my-4 bg-gradient-to-r from-[#69BFB7] via-[#67ACA9]/60 to-transparent"
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.8, duration: 0.9, ease: 'easeOut' }}
            />

            <motion.div
              className="text-[10px] font-bold tracking-[4px] text-[#A4C2C5]/35 uppercase mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.6 }}
            >
              {isLoaded
                ? 'Sincronizando asignaciones • Verificando permisos • Listo para comenzar'
                : 'Sincronizando asignaciones • Cargando tareas asignadas • Verificando permisos...'}
            </motion.div>

            {isLoaded && (
              <motion.div
                className="pointer-events-auto"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                whileHover={{ x: 10, scale: 1.04 }}
                whileTap={{ scale: 0.98 }}
              >
                <button
                  onClick={onEnter}
                  className="side-button is-active relative loading-enter-button"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: 'rotateY(25deg) translateZ(10px)',
                    width: 'auto',
                    maxWidth: 320,
                    minHeight: 38,
                    lineHeight: '38px',
                    fontSize: 18,
                    paddingLeft: '1.6em',
                    paddingRight: '1.2em',
                  }}
                >
                  <span className="btn-text whitespace-nowrap drop-shadow-md">INGRESAR</span>
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
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
              <div className="worker-detail-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                <DetailRow label="Destino" value={selected.targetRole || 'Todos'} />
                <DetailRow label="Fecha" value={formatDateLabel(selected.createdDate)} />
              </div>
              <div className="worker-detail-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
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
                <p>ID #{item.id} · Recurso {item.resourceTypeId ? `#${item.resourceTypeId}` : 'sin tipo'}</p>
                <p>{item.description || 'Sin descripción registrada'}</p>
                <p>
                  Produce {item.dailyAmountProduced} · Consume {item.dailyRationConsumed} · Mínimo {item.minimumRequiredWorkers}
                </p>
                <p>
                  Preferido {item.preferredWorkers ? String(item.preferredWorkers) : 'sin preferencia'} · Umbral {item.criticalThresholdPercent}
                </p>
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
              <p>ID #{selected.id}</p>
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

        setOccupationOptions(occupations.items ?? [])
        setCoverageRows(coverage ?? [])
        setCriticalRows(critical ?? [])
        setAtRiskRows(atRisk ?? [])

        setSelectedOccupationId((current) =>
          current ?? atRisk?.[0]?.occupationId ?? occupations.items?.[0]?.id ?? null,
        )
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

        setSelectedCoverage(coverage ?? null)
        setSuggestions(replacementSuggestions ?? [])
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
    const confirmed = window.confirm('¿Deseas ejecutar la autoasignación para esta ocupación?')
    if (!confirmed) return
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
                  <p>ID #{row.occupationId} · Campamento #{row.campId}</p>
                  <p>
                    Activos {row.activeWorkers} · Disponibles {row.availableWorkers} · Mínimo {row.minimumRequiredWorkers}
                  </p>
                  <p>
                    Preferido {row.preferredWorkers ? String(row.preferredWorkers) : 'sin preferencia'} · Umbral {row.criticalThresholdPercent}
                  </p>
                  <p>
                    Cobertura {row.coveragePercent}% · Déficit {row.deficit} · Excedente {row.surplus}
                  </p>
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
          <div className="worker-card-label">Ocupaciones críticas y en riesgo</div>
          <div className="worker-list-stack">
            {criticalRows.map((row) => (
              <div key={row.occupationId} className="worker-list-item is-static">
                <div className="worker-list-item-head">
                  <strong>{row.occupationName}</strong>
                  <span className="worker-pill is-critical">Crítica</span>
                </div>
                <p>ID #{row.occupationId} · Campamento #{row.campId}</p>
                <p>
                  Disponibles {row.availableWorkers} · Activos {row.activeWorkers} · Mínimo {row.minimumRequiredWorkers}
                </p>
                <p>Cobertura {row.coveragePercent}% · Déficit {row.deficit} · Excedente {row.surplus}</p>
              </div>
            ))}
            {atRiskRows.map((row) => (
              <div key={row.occupationId} className="worker-list-item is-static">
                <div className="worker-list-item-head">
                  <strong>{row.occupationName}</strong>
                  <span className="worker-pill is-highlight">En riesgo</span>
                </div>
                <p>ID #{row.occupationId} · Campamento #{row.campId}</p>
                <p>
                  Disponibles {row.availableWorkers} · Mínimo {row.minimumRequired}
                </p>
                <p>Cobertura {row.coveragePercent}%</p>
                <p>
                  Sugerencias: {row.suggestedReplacements.length > 0
                    ? row.suggestedReplacements.map((suggestion) => `${suggestion.personName} (${suggestion.priority})`).join(' · ')
                    : 'Sin sugerencias'}
                </p>
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
                <p>
                  Persona #{suggestion.personId} · Origen #{suggestion.currentOccupationId} · Destino #{suggestion.targetOccupationId}
                </p>
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
