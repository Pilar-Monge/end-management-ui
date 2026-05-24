import { useEffect, useMemo, useState, type ReactNode } from 'react'
import './worker-main-view.css'

type WorkerSectionId =
  | 'dashboard'
  | 'recoleccion'
  | 'notificaciones'

type WorkerSection = {
  id: WorkerSectionId
  label: string
  shortLabel: string
  icon: ReactNode
}

const WORKER_NAV_DATA: WorkerSection[] = [
  {
    id: 'dashboard',
    label: 'Dashboard personal',
    shortLabel: 'DB',
    icon: <DashboardIcon />,
  },
  {
    id: 'recoleccion',
    label: 'Recoleccion diaria',
    shortLabel: 'RC',
    icon: <CollectionIcon />,
  },
  {
    id: 'notificaciones',
    label: 'Notificaciones',
    shortLabel: 'NT',
    icon: <NotificationIcon />,
  },
  {
    id: 'ocupaciones',
    label: 'Ocupaciones',
    shortLabel: 'OC',
    icon: <OccupationIcon />,
  },
  {
    id: 'cobertura',
    label: 'Cobertura de oficio',
    shortLabel: 'CB',
    icon: <CoverageIcon />,
  },
]

export function WorkerMainViewPage() {
  const [showLoading, setShowLoading] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasEntered, setHasEntered] = useState(false)

  const [activeSectionId, setActiveSectionId] = useState<WorkerSectionId>('dashboard')

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

  const handleSectionSelect = (id: WorkerSectionId) => {
    setActiveSectionId(id)
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
                <GenericWorkerContent
                  section={activeSection}
                />
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
                onClick={() => handleSectionSelect(item.id)}
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

function LoadingOverlay({
  show,
  isLoaded,
  onEnter,
}: {
  show: boolean
  isLoaded: boolean
  onEnter: () => void
}) {
  if (!show) {
    return null
  }

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
}: {
  section: WorkerSection
}) {
  return (
    <div className="worker-content-grid worker-content-grid-single">
      {renderModuleDetails(section)}
    </div>
  )
}

function renderModuleDetails(section: WorkerSection) {
  switch (section.id) {
    case 'dashboard':
      return (
        <>
          <article className="worker-card worker-card-wide">
            <div className="worker-card-label">Resumen completo</div>
            <div className="worker-metric-grid">
              <div>
                <span>Turno</span>
                <strong>Mañana</strong>
              </div>
              <div>
                <span>Actividad</span>
                <strong>12 eventos</strong>
              </div>
              <div>
                <span>Estado</span>
                <strong>Operativo</strong>
              </div>
              <div>
                <span>Prioridad</span>
                <strong>Media</strong>
              </div>
            </div>
          </article>

          <article className="worker-card worker-card-wide">
            <div className="worker-card-label">Actividad reciente</div>
            <ul className="worker-status-list">
              <li><span>08:45</span><strong>Validacion de equipo</strong></li>
              <li><span>09:20</span><strong>Despacho de material</strong></li>
              <li><span>10:05</span><strong>Recepcion de solicitud</strong></li>
            </ul>
          </article>

          <article className="worker-card worker-card-wide">
            <div className="worker-card-label">Estado del turno</div>
            <div className="worker-note-grid">
              <div>
                <h4>Inicio</h4>
                <p>Registro de entrada completado y validado en sistema.</p>
              </div>
              <div>
                <h4>Progreso</h4>
                <p>Asignaciones procesadas sin incidencias y con sincronización estable.</p>
              </div>
              <div>
                <h4>Cierre</h4>
                <p>Listo para consolidación de fin de jornada cuando corresponda.</p>
              </div>
            </div>
          </article>

          <article className="worker-card worker-card-wide">
            <div className="worker-card-label">Accesos rapidos</div>
            <div className="worker-quick-actions">
              <button type="button" className="worker-quick-btn">Abrir panel completo</button>
              <button type="button" className="worker-quick-btn">Actualizar vista</button>
              <button type="button" className="worker-quick-btn">Exportar resumen</button>
              <button type="button" className="worker-quick-btn worker-quick-btn-alt">Volver al panel</button>
            </div>
          </article>
        </>
      )

    case 'recoleccion':
      return (
        <>
          <article className="worker-card worker-card-wide">
            <div className="worker-card-label">Detalle de registro</div>
            <div className="worker-note-grid">
              <div>
                <h4>Registro actual</h4>
                <p>Recolección diaria #2048 asociada al campamento principal.</p>
              </div>
              <div>
                <h4>Estado</h4>
                <p>Verificado por supervisión, con observaciones menores registradas.</p>
              </div>
              <div>
                <h4>Responsable</h4>
                <p>Operador asignado: worker operativo turno A.</p>
              </div>
            </div>
          </article>

          <article className="worker-card worker-card-wide">
            <div className="worker-card-label">Historial y observaciones</div>
            <ul className="worker-status-list">
              <li><span>07:10</span><strong>Registro iniciado</strong></li>
              <li><span>07:42</span><strong>Confirmacion parcial de insumos</strong></li>
              <li><span>08:15</span><strong>Observacion: paquete pendiente de revisión</strong></li>
            </ul>
          </article>

          <article className="worker-card worker-card-wide">
            <div className="worker-card-label">Restricciones aplicadas</div>
            <p>Crear, listar, ajustar, actualizar y eliminar permanecen bloqueados para worker.</p>
          </article>
        </>
      )

    case 'notificaciones':
      return (
        <>
          <article className="worker-card worker-card-wide">
            <div className="worker-card-label">Bandeja completa</div>
            <ul className="worker-status-list">
              <li><span>Critica</span><strong>Validar cambio de turno</strong></li>
              <li><span>Media</span><strong>Actualizar confirmación de entrega</strong></li>
              <li><span>Baja</span><strong>Recordatorio de reporte</strong></li>
            </ul>
          </article>

          <article className="worker-card worker-card-wide">
            <div className="worker-card-label">Detalle y actualizacion</div>
            <div className="worker-note-grid">
              <div>
                <h4>Seleccionada</h4>
                <p>Notificación de validación operativa abierta en lectura.</p>
              </div>
              <div>
                <h4>Accion permitida</h4>
                <p>El worker puede actualizar el estado de la notificación desde esta misma pantalla.</p>
              </div>
            </div>
          </article>
        </>
      )

    case 'ocupaciones':
      return (
        <>
          <article className="worker-card worker-card-wide">
            <div className="worker-card-label">Listado de ocupaciones</div>
            <div className="worker-note-grid">
              <div><h4>Guardian</h4><p>Cobertura activa y estable.</p></div>
              <div><h4>Sanitario</h4><p>Requiere apoyo eventual.</p></div>
              <div><h4>Logística</h4><p>Completa para el turno actual.</p></div>
            </div>
          </article>

          <article className="worker-card worker-card-wide">
            <div className="worker-card-label">Detalle y búsqueda</div>
            <div className="worker-note-grid">
              <div>
                <h4>Consulta actual</h4>
                <p>Ficha de ocupación disponible sin edición ni cambios estructurales.</p>
              </div>
              <div>
                <h4>Filtro</h4>
                <p>Busqueda por oficio incluida en la misma pantalla para lectura rápida.</p>
              </div>
            </div>
          </article>
        </>
      )

    case 'cobertura':
      return (
        <>
          <article className="worker-card worker-card-wide">
            <div className="worker-card-label">Cobertura por campamento</div>
            <div className="worker-metric-grid worker-metric-grid-wide">
              <div><span>Norte</span><strong>92%</strong></div>
              <div><span>Central</span><strong>86%</strong></div>
              <div><span>Este</span><strong>78%</strong></div>
              <div><span>Reserva</span><strong>100%</strong></div>
            </div>
          </article>

          <article className="worker-card worker-card-wide">
            <div className="worker-card-label">Cobertura por ocupacion</div>
            <ul className="worker-status-list">
              <li><span>Críticas</span><strong>2 ocupaciones</strong></li>
              <li><span>En riesgo</span><strong>4 ocupaciones</strong></li>
              <li><span>Reemplazo sugerido</span><strong>Automático disponible</strong></li>
            </ul>
          </article>

          <article className="worker-card worker-card-wide">
            <div className="worker-card-label">Accion completa</div>
            <p>La pantalla integra sugerencias y auto-asignación de reemplazo para operar sin navegar a subcategorías.</p>
          </article>
        </>
      )

    default:
      return null
  }
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
