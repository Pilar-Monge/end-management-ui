import { useEffect, useMemo, useState, type ReactNode } from 'react'
import './worker-main-view.css'

type WorkerSectionId =
  | 'dashboard'
  | 'recoleccion'
  | 'notificaciones'
  | 'ocupaciones'
  | 'cobertura'
  | 'tiempo'

type WorkerSection = {
  id: WorkerSectionId
  label: string
  shortLabel: string
  subOptions: string[]
  allowedActions: string[]
  deniedActions?: string[]
  note: string
  icon: ReactNode
}

const WORKER_NAV_DATA: WorkerSection[] = [
  {
    id: 'dashboard',
    label: 'Dashboard personal',
    shortLabel: 'DB',
    subOptions: ['Resumen general', 'Actividad reciente', 'Estado del turno'],
    allowedActions: ['Ver dashboard personal', 'Abrir resumen del turno', 'Revisar actividad reciente'],
    note: 'El worker solo tiene acceso a dashboard personal. No puede acceder a dashboard general, inventario ni expediciones.',
    icon: <DashboardIcon />,
  },
  {
    id: 'recoleccion',
    label: 'Recoleccion diaria',
    shortLabel: 'RC',
    subOptions: ['Ver detalle', 'Historial local', 'Observaciones'],
    allowedActions: ['Ver detalle de registro', 'Consultar historial', 'Inspeccionar observaciones'],
    deniedActions: ['Crear', 'Listar', 'Ajustar', 'Actualizar', 'Eliminar'],
    note: 'Según la matriz, worker solo puede ver el detalle del registro de recoleccion diaria.',
    icon: <CollectionIcon />,
  },
  {
    id: 'notificaciones',
    label: 'Notificaciones',
    shortLabel: 'NT',
    subOptions: ['Listar', 'Ver detalle', 'Actualizar'],
    allowedActions: ['Listar notificaciones', 'Ver detalle', 'Actualizar notificacion'],
    note: 'Worker puede listar, ver detalle y actualizar notificaciones, pero no crearlas ni eliminarlas.',
    icon: <NotificationIcon />,
  },
  {
    id: 'ocupaciones',
    label: 'Ocupaciones',
    shortLabel: 'OC',
    subOptions: ['Listar', 'Ver detalle', 'Buscar por oficio'],
    allowedActions: ['Listar ocupaciones', 'Ver detalle de ocupacion', 'Buscar ocupacion'],
    note: 'El acceso a ocupaciones es de solo lectura para worker.',
    icon: <OccupationIcon />,
  },
  {
    id: 'cobertura',
    label: 'Cobertura de oficio',
    shortLabel: 'CB',
    subOptions: ['Por campamento', 'Por ocupacion', 'Criticas y riesgo'],
    allowedActions: [
      'Ver cobertura por campamento',
      'Ver cobertura por ocupacion',
      'Ver ocupaciones criticas',
      'Ver ocupaciones en riesgo',
      'Ver sugerencias de reemplazo',
      'Auto asignar reemplazo',
    ],
    note: 'Este es uno de los pocos módulos donde worker conserva el conjunto completo de acciones.',
    icon: <CoverageIcon />,
  },
  {
    id: 'tiempo',
    label: 'Tiempo del sistema',
    shortLabel: 'TS',
    subOptions: ['Hora actual', 'Avance restringido', 'Offset restringido'],
    allowedActions: ['Obtener hora'],
    deniedActions: ['Avanzar tiempo', 'Desplazar tiempo'],
    note: 'El worker solo puede consultar la hora pública. Las acciones de avance o desplazamiento están restringidas.',
    icon: <ClockIcon />,
  },
]

export function WorkerMainViewPage() {
  const [showLoading, setShowLoading] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasEntered, setHasEntered] = useState(false)

  const [activeSectionId, setActiveSectionId] = useState<WorkerSectionId>('dashboard')
  const [activeSubOption, setActiveSubOption] = useState('Resumen general')
  const [selectedAction, setSelectedAction] = useState('Ver dashboard personal')

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
    const nextSection = WORKER_NAV_DATA.find((item) => item.id === id)
    setActiveSectionId(id)
    setActiveSubOption(nextSection?.subOptions[0] ?? '')
    setSelectedAction(nextSection?.allowedActions[0] ?? '')
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
            <button className="worker-hud-btn" type="button">
              Sesion de Prueba
            </button>
          </header>

          <main className="worker-main-area">
            <div className="worker-title-row">
              <h1>{activeSection.label}</h1>
              <span>Rol worker con permisos filtrados</span>
            </div>

            <section className="worker-shell" aria-label="Panel de trabajador">
              <aside className="worker-sidebar">
                {activeSection.subOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`worker-side-btn ${activeSubOption === option ? 'is-active' : ''}`}
                    onClick={() => {
                      setActiveSubOption(option)
                      setSelectedAction(activeSection.allowedActions[0] ?? '')
                    }}
                  >
                    {option}
                  </button>
                ))}
              </aside>

              <div className="worker-content">
                <GenericWorkerContent
                  section={activeSection}
                  subsection={activeSubOption}
                  selectedAction={selectedAction}
                  onActionSelect={setSelectedAction}
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
  subsection,
  selectedAction,
  onActionSelect,
}: {
  section: WorkerSection
  subsection: string
  selectedAction: string
  onActionSelect: (action: string) => void
}) {
  return (
    <div className="worker-content-grid">
      <article className="worker-card worker-card-highlight">
        <div className="worker-card-label">Modulo activo</div>
        <h3>
          {section.label} / {subsection}
        </h3>
        <p>
          {section.note}
        </p>
      </article>

      <article className="worker-card">
        <div className="worker-card-label">Acciones permitidas</div>
        <div className="worker-action-strip">
          {section.allowedActions.map((action) => (
            <button
              key={action}
              type="button"
              className={`worker-action-btn ${selectedAction === action ? 'is-active' : ''}`}
              onClick={() => onActionSelect(action)}
            >
              {action}
            </button>
          ))}
        </div>
        <div className="worker-action-summary">
          <span>Accion activa</span>
          <strong>{selectedAction || 'Sin seleccionar'}</strong>
        </div>
      </article>

      <article className="worker-card worker-card-wide">
        <div className="worker-card-label">Subopciones y restricciones</div>
        <div className="worker-grid-two">
          <div>
            <h4>Subopciones disponibles</h4>
            <ul className="worker-status-list">
              {section.subOptions.map((option) => (
                <li key={option}>
                  <span>{option}</span>
                  <strong>Habilitado</strong>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4>Acciones no permitidas</h4>
            <ul className="worker-status-list">
              {(section.deniedActions?.length ? section.deniedActions : ['Sin restricciones adicionales']).map(
                (action) => (
                  <li key={action}>
                    <span>{action}</span>
                    <strong>{action === 'Sin restricciones adicionales' ? 'N/A' : 'Bloqueado'}</strong>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      </article>

      <article className="worker-card worker-card-wide">
        <div className="worker-card-label">Accesos rapidos</div>
        <div className="worker-quick-actions">
          <button type="button" className="worker-quick-btn">Abrir detalle</button>
          <button type="button" className="worker-quick-btn">Actualizar vista</button>
          <button type="button" className="worker-quick-btn">Filtrar por estado</button>
          <button type="button" className="worker-quick-btn worker-quick-btn-alt">Volver al panel</button>
        </div>
      </article>
    </div>
  )
}

function IconSvg({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" className="worker-svg-icon">
      {children}
    </svg>
  )
}

function ClockIcon() {
  return (
    <IconSvg>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8v4l2.5 1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </IconSvg>
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
