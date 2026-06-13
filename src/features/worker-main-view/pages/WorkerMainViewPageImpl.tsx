import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  fetchCurrentUserProfile,
  fetchWorkerServerTime,
  fetchWorkerDailyCollectionRecord,
  fetchWorkerNotificationById,
  fetchWorkerNotifications,
  fetchWorkerOccupationById,
  fetchWorkerOccupations,
  updateWorkerNotificationReadState,
} from '../services/workerMainViewApi'
import type {
  CurrentUserProfile,
  PaginationInfo,
  WorkerAuthenticatedUser,
  WorkerDailyCollectionRecord,
  WorkerNotification,
  WorkerOccupation,
  
} from '../types'
import { WorkerApiError } from '../services/workerMainViewApi'
import { checkCurrentSessionStatus, clearCachedSession, logoutCurrentSession } from '../../../shared/services/sessionProfile'
import '../pages/worker-main-view.css'
import endWorkerBg from '../assets/images/end-worker.jpg'

type WorkerSectionId = 'recoleccion' | 'notificaciones' | 'ocupaciones' | 'perfil'

type WorkerSection = {
  id: WorkerSectionId
  label: string
  shortLabel: string
  icon: ReactNode
}

const WORKER_NAV_DATA: WorkerSection[] = [
  { id: 'perfil', label: 'Mi perfil', shortLabel: 'PF', icon: <ProfileIcon /> },
  { id: 'recoleccion', label: 'Recolección diaria', shortLabel: 'RC', icon: <CollectionIcon /> },
  { id: 'notificaciones', label: 'Notificaciones', shortLabel: 'NT', icon: <NotificationIcon /> },
  { id: 'ocupaciones', label: 'Ocupaciones', shortLabel: 'OC', icon: <OccupationIcon /> },
]

const LOGICAL_TIME_SESSION_CHECK_THRESHOLD_MS = 60 * 1000

type WorkerGlobalTimeState = {
  baseServerTime: Date
  syncedAtClientMs: number
  status: 'synced' | 'syncing' | 'error'
}

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
  const navigate = useNavigate()
  const [showLoading, setShowLoading] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasEntered, setHasEntered] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState<WorkerSectionId>('recoleccion')
  const [globalTimeState, setGlobalTimeState] = useState<WorkerGlobalTimeState>({
    baseServerTime: new Date(),
    syncedAtClientMs: Date.now(),
    status: 'syncing',
  })
  const globalTimeStateRef = useRef(globalTimeState)
  const lastSyncedGlobalTimeRef = useRef<Pick<WorkerGlobalTimeState, 'baseServerTime' | 'syncedAtClientMs'> | null>(null)

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

  const hudUser = useMemo(() => getStoredWorkerHudUser(sessionUser), [sessionUser])

  useEffect(() => {
    globalTimeStateRef.current = globalTimeState
    if (globalTimeState.status === 'synced') {
      lastSyncedGlobalTimeRef.current = {
        baseServerTime: globalTimeState.baseServerTime,
        syncedAtClientMs: globalTimeState.syncedAtClientMs,
      }
    }
  }, [globalTimeState])

  const redirectExpiredLogicalSession = () => {
    clearCachedSession(true)
    navigate('/main-homepage', {
      replace: true,
      state: {
        initialAppState: 'login',
        sessionMessage: 'Sesion expirada por avance del tiempo logico. Inicia sesion para continuar.',
      },
    })
  }

  const validateSessionAfterLogicalTimeJump = async (nextServerTime: Date): Promise<boolean> => {
    const previous = lastSyncedGlobalTimeRef.current
    if (!previous) {
      return false
    }

    const expectedServerTimeMs = previous.baseServerTime.getTime() + Math.max(0, Date.now() - previous.syncedAtClientMs)
    const forwardJumpMs = nextServerTime.getTime() - expectedServerTimeMs

    if (forwardJumpMs <= LOGICAL_TIME_SESSION_CHECK_THRESHOLD_MS) {
      return false
    }

    const status = await checkCurrentSessionStatus()
    if (status !== 'expired') {
      return false
    }

    redirectExpiredLogicalSession()
    return true
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsLoaded(true)
    }, 1500)

    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!hasEntered) return

    const syncGlobalTime = async () => {
      setGlobalTimeState((prev) => ({ ...prev, status: 'syncing' }))
      try {
        const data = await fetchWorkerServerTime()
        const parsed = new Date(data.serverTime)
        if (Number.isNaN(parsed.getTime())) {
          throw new Error('Invalid server time')
        }

        const sessionExpired = await validateSessionAfterLogicalTimeJump(parsed)
        if (sessionExpired) return

        setGlobalTimeState({
          baseServerTime: parsed,
          syncedAtClientMs: Date.now(),
          status: 'synced',
        })
      } catch (error) {
        console.warn('Could not sync worker HUD with /system/time. Keeping previous clock state.', error)
        setGlobalTimeState((prev) => ({
          ...prev,
          status: 'error',
        }))
      }
    }

    void syncGlobalTime()
    const syncInterval = window.setInterval(() => {
      void syncGlobalTime()
    }, 10000)

    return () => window.clearInterval(syncInterval)
  }, [hasEntered])

  const handleLogout = async () => {
    await logoutCurrentSession()
    navigate('/main-homepage', { state: { initialAppState: 'explore' } })
  }

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
          <TopHud
            globalTimeState={globalTimeState}
            username={hudUser.username}
            roleLabel={hudUser.roleLabel}
            onLogout={handleLogout}
          />

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
        </>
      ) : null}
    </div>
  )
}

export default WorkerMainViewPage

function TopHud({
  globalTimeState,
  username,
  roleLabel,
  onLogout,
}: {
  globalTimeState: WorkerGlobalTimeState
  username: string
  roleLabel: string
  onLogout: () => void
}) {
  const [currentGlobalTime, setCurrentGlobalTime] = useState(() => {
    const elapsedClientMs = Date.now() - globalTimeState.syncedAtClientMs
    return new Date(globalTimeState.baseServerTime.getTime() + Math.max(0, elapsedClientMs))
  })

  useEffect(() => {
    const updateClock = () => {
      const elapsedClientMs = Date.now() - globalTimeState.syncedAtClientMs
      setCurrentGlobalTime(new Date(globalTimeState.baseServerTime.getTime() + Math.max(0, elapsedClientMs)))
    }

    updateClock()
    const tickInterval = window.setInterval(updateClock, 1000)
    return () => window.clearInterval(tickInterval)
  }, [globalTimeState.baseServerTime, globalTimeState.syncedAtClientMs])

  return (
    <header className="worker-top-hud pointer-events-none flex items-start justify-between px-3 pt-3 pb-2 text-[10px] font-black uppercase tracking-[-0.02em] text-[#A4C2C5]/80">
      <div className="worker-hud-chip pointer-events-auto flex items-center gap-2.5 bg-[#0d1414]/90 border border-[#67ACA9]/25 px-2.5 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-[-0.02em] text-white shadow-md shrink-0">
        <div className={`inline-flex items-center shrink-0 ${globalTimeState.status === 'error' ? 'text-rose-400' : 'text-[#69BFB7]'}`}>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <title>{globalTimeState.status === 'error' ? 'Hora no sincronizada' : 'Hora del servidor'}</title>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
          </svg>
        </div>

        <div className="flex flex-col justify-center leading-tight">
          <div className="flex items-center gap-1">
            <span className="text-[#A4C2C5]/50 font-black">FECHA:</span>
            <span className="text-white font-black">
              {currentGlobalTime.getUTCDate().toString().padStart(2, '0')}/{(currentGlobalTime.getUTCMonth() + 1).toString().padStart(2, '0')}/{currentGlobalTime.getUTCFullYear()}
            </span>
          </div>

          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[#A4C2C5]/50 font-black">HORA:</span>
            <span className="text-white font-black">
              {currentGlobalTime.getUTCHours().toString().padStart(2, '0')}:{currentGlobalTime.getUTCMinutes().toString().padStart(2, '0')}:{currentGlobalTime.getUTCSeconds().toString().padStart(2, '0')} UTC
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="pointer-events-auto flex items-center gap-2.5 bg-[#0d1414]/90 border border-[#67ACA9]/25 px-2.5 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-[-0.02em] text-white shadow-md shrink-0">
          <div className="inline-flex items-center shrink-0">
            <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>

          <div className="flex flex-col justify-center leading-tight">
            <div className="flex items-center gap-1">
              <span className="text-[#A4C2C5]/50 font-black">USUARIO:</span>
              <span className="text-white font-black">{username}</span>
            </div>

            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[#A4C2C5]/50 font-black">ROL:</span>
              <span className="text-white font-black">{roleLabel}</span>
            </div>
          </div>
        </div>

        <button className="pointer-events-auto worker-hud-btn shrink-0" type="button" onClick={onLogout}>
          <span className="btn-text">
            CERRAR SESIÓN
            <span className="logout-mark" aria-hidden="true" />
          </span>
        </button>
      </div>
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
          <div className="absolute inset-0 select-none pointer-events-none overflow-hidden bg-[#020706]">
            <img
              src={endWorkerBg}
              alt="Fondo de carga del trabajador"
              className="w-full h-full object-cover opacity-75 md:opacity-85 filter brightness-[0.65] contrast-[1.05]"
              referrerPolicy="no-referrer"
            />
          </div>

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
      return <OccupationsSection sessionUser={sessionUser} />
    case 'perfil':
      return <CurrentUserProfileSection />
    default:
      return <ModuleStateCard title={section.label} message="Sin datos disponibles para este módulo." />
  }
}

function CurrentUserProfileSection() {
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionIssue, setSessionIssue] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadProfile() {
      setLoading(true)
      setError(null)
      setSessionIssue(false)

      try {
        const result = await fetchCurrentUserProfile()
        if (isMounted) {
          setProfile(result)
        }
      } catch (fetchError) {
        if (!isMounted) return

        const translated = translateCurrentUserProfileError(fetchError)
        if (translated.requiresSession) {
          setSessionIssue(true)
          setError(null)
        } else {
          setError(translated.message)
        }
        setProfile(null)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void loadProfile()

    return () => {
      isMounted = false
    }
  }, [])

  if (loading) {
    return <ModuleStateCard title="Cargando perfil" message="Obteniendo la información personal del usuario autenticado..." />
  }

  if (sessionIssue) {
    return <ModuleStateCard title="Sesión no disponible" message="Tu sesión expiró o no tiene autorización para consultar el perfil." />
  }

  if (error) {
    return <ModuleStateCard title="No se pudo cargar el perfil" message={error} />
  }

  if (!profile) {
    return <ModuleStateCard title="Sin datos" message="No fue posible recuperar el perfil del usuario." />
  }

  return (
    <div className="worker-content-grid worker-content-grid-single">
      <article className="worker-card worker-card-wide">
        <div className="worker-card-label">Perfil del usuario</div>
        <div className="worker-detail-stack">
          <p>Información personal registrada en el sistema.</p>
          <div className="worker-detail-grid worker-detail-grid-two-up">
            <DetailRow label="Usuario" value={profile.username} />
            <DetailRow label="Correo" value={profile.email} />
            <DetailRow label="Rol" value={formatRoleLabel(profile.role)} />
            <DetailRow label="Estado" value={formatStatusLabel(profile.status)} />
            <DetailRow label="Campamento" value={`#${profile.campId}`} />
            <DetailRow label="Identificador" value={String(profile.id)} />
          </div>
        </div>
      </article>
    </div>
  )
}

function NotificationsSection({ sessionUser }: { sessionUser: WorkerAuthenticatedUser | null }) {
  const NOTIFICATION_PAGE_SIZE = 5
  const [draftFilters, setDraftFilters] = useState({ read: 'all' })
  const [appliedFilters, setAppliedFilters] = useState({ read: 'all', page: 1 })
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
          read: appliedFilters.read === 'all' ? null : appliedFilters.read === 'true',
          page: appliedFilters.page,
          limit: NOTIFICATION_PAGE_SIZE,
        })

        if (!isMounted) return

        setItems(result.items)
        setPagination(result.pagination)
      } catch (fetchError) {
        if (isMounted) {
          const friendly = fetchError instanceof Error ? translateNotificationError(fetchError.message) : 'No se pudieron cargar las notificaciones.'
          setError(friendly)
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
        if (isMounted) {
          const friendly = fetchError instanceof Error ? translateNotificationError(fetchError.message) : 'No se pudo cargar el detalle de la notificación.'
          setError(friendly)
        }
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
    setAppliedFilters((prev) => ({ ...prev, read: draftFilters.read, page: 1 }))
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
                  <strong>ID #{item.id}</strong>
                </div>
              </button>
            ))}
            {!items.length && !error ? <ModuleStateCard title="Sin resultados" message="No hay notificaciones para los filtros actuales." /> : null}
          </div>

          {pagination ? (
            <div className="worker-pagination-bar">
              <span>{`${pagination.page} / ${pagination.pages} páginas`}</span>
              <div className="worker-pagination-actions">
                <button
                  type="button"
                  className="worker-secondary-btn"
                  disabled={pagination.page <= 1}
                  onClick={() => setAppliedFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="worker-secondary-btn"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setAppliedFilters((prev) => ({ ...prev, page: Math.min(pagination.pages, prev.page + 1) }))}
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : null}
        </article>

        <article className="worker-card">
          <div className="worker-card-label">Detalle de la notificación</div>
          {detailLoading ? <ModuleStateCard title="Cargando detalle" message="Obteniendo la notificación seleccionada..." /> : null}
          {selected ? (
            <div className="worker-detail-stack">
              <h3>{selected.title}</h3>
              <p>{selected.message}</p>
              <div className="worker-detail-grid worker-detail-grid-two-up">
                <DetailRow label="Tipo" value={selected.type} />
                <DetailRow label="Destino" value={selected.targetRole || 'Todos'} />
                <DetailRow label="Fecha" value={formatDateLabel(selected.createdDate)} />
                <DetailRow label="Estado" value={selected.read ? 'Leída' : 'Sin leer'} />
                <DetailRow label="Origen" value={selected.sourceType ? `${selected.sourceType} #${selected.sourceId ?? '-'}` : 'Sin origen'} />
              </div>
              {!selected.read ? (
                <div className="worker-action-row">
                  <button type="button" className="worker-primary-btn" onClick={markAsRead}>
                    Marcar como leída
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <ModuleStateCard title="Sin selección" message="Selecciona una notificación para ver su detalle." />
          )}
        </article>
      </div>
    </div>
  )
}

function OccupationsSection({ sessionUser }: { sessionUser: WorkerAuthenticatedUser | null }) {
  const OCCUPATIONS_PAGE_SIZE = 5
  const [draftFilters, setDraftFilters] = useState({ collectsResources: 'all', participatesInExpeditions: 'all', resourceTypeId: '', page: 1 })
  const [appliedFilters, setAppliedFilters] = useState(draftFilters)
  const [items, setItems] = useState<WorkerOccupation[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selected, setSelected] = useState<WorkerOccupation | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionIssue, setSessionIssue] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadOccupations() {
      setLoading(true)
      setError(null)
      setSessionIssue(false)

      try {
        const result = await fetchWorkerOccupations({
          collectsResources: appliedFilters.collectsResources === 'all' ? null : appliedFilters.collectsResources === 'true',
          participatesInExpeditions:
            appliedFilters.participatesInExpeditions === 'all' ? null : appliedFilters.participatesInExpeditions === 'true',
          resourceTypeId: appliedFilters.resourceTypeId ? Number(appliedFilters.resourceTypeId) : null,
          page: appliedFilters.page,
          limit: OCCUPATIONS_PAGE_SIZE,
        })

        if (!isMounted) return

        setItems(result.items)
        setPagination(result.pagination)
      } catch (fetchError) {
        if (isMounted) {
          const translatedError = translateOccupationError(fetchError instanceof Error ? fetchError.message : 'No se pudieron cargar las ocupaciones.')
          if (translatedError.requiresSession) {
            setSessionIssue(true)
            setError(null)
          } else {
            setError(translatedError.message)
          }
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
        if (isMounted) {
          const translatedError = fetchError instanceof Error ? translateOccupationError(fetchError.message) : { message: 'No se pudo cargar el detalle de la ocupación.', requiresSession: false }
          if (translatedError.requiresSession) {
            setSessionIssue(true)
            setError(null)
          } else {
            setError(translatedError.message)
          }
        }
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

  if (!sessionUser || sessionIssue) {
    return <ModuleStateCard title="Sesión no disponible" message="Inicia sesión otra vez para consultar las notificaciones." />
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
                </div>
              </button>
            ))}
            {!items.length && !error ? <ModuleStateCard title="Sin resultados" message="No hay ocupaciones para los filtros actuales." /> : null}
          </div>

          {pagination ? (
            <div className="worker-pagination-bar">
              <span>{`${pagination.page} / ${pagination.pages} páginas`}</span>
              <div className="worker-pagination-actions">
                <button
                  type="button"
                  className="worker-secondary-btn"
                  disabled={pagination.page <= 1}
                  onClick={() => setAppliedFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="worker-secondary-btn"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() =>
                    setAppliedFilters((prev) => ({
                      ...prev,
                      page: Math.min(pagination.pages, prev.page + 1),
                    }))
                  }
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : null}
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
      setError(fetchError instanceof Error ? translateDailyCollectionError(fetchError.message) : 'No se pudo cargar el registro')
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
      </article>

      <article className="worker-card worker-card-wide">
        <div className="worker-card-label">Detalle del registro</div>
        {loading ? <ModuleStateCard title="Cargando registro" message="Buscando el registro solicitado..." /> : null}
        {error ? <ModuleStateCard title="No se pudo cargar" message={error} /> : null}
        {record ? (
          <div className="worker-detail-stack">
            <h3>Registro #{record.id}</h3>
            <div className="worker-detail-grid">
              <DetailRow label="Fecha" value={formatDateLabel(record.date)} />
              <DetailRow label="Esperado" value={record.expectedAmount} />
              <DetailRow label="Real" value={record.actualAmount} />
              <DetailRow label="Motivo" value={record.differenceReason || 'Sin observaciones'} />
            </div>
          </div>
        ) : null}
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
 


function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="worker-detail-row">
      <span className="worker-detail-label">{label}</span>
      <strong className="worker-detail-value">{value}</strong>
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

function translateDailyCollectionError(message: string): string {
  const normalizedMessage = message.trim().toLowerCase()

  if (normalizedMessage === 'daily collection record not found') {
    return 'No se encontró el registro de recolección diaria.'
  }

  if (normalizedMessage === 'you do not have permission to view this record') {
    return 'No tienes permiso para ver este registro.'
  }

  return message
}

function translateNotificationError(message: string): string {
  const normalized = message.trim().toLowerCase()

  if (normalized.includes('token') || normalized.includes('authorization') || normalized.includes('unauthorized') || normalized.includes('no token')) {
    return 'Sesión no válida o expirada. Por favor inicia sesión.'
  }

  if (normalized.includes('not found')) {
    return 'No se encontraron notificaciones.'
  }

  
  return 'No se pudieron cargar las notificaciones. Intenta de nuevo más tarde.'
}

function translateOccupationError(message: string): { message: string; requiresSession: boolean } {
  const normalized = message.trim().toLowerCase()

  if (normalized.includes('token') || normalized.includes('authorization') || normalized.includes('unauthorized') || normalized.includes('no token')) {
    return {
      message: 'Sesión no disponible',
      requiresSession: true,
    }
  }

  return {
    message: 'No se pudieron cargar las ocupaciones. Intenta de nuevo más tarde.',
    requiresSession: false,
  }
}

function translateCurrentUserProfileError(error: unknown): { message: string; requiresSession: boolean } {
  if (error instanceof WorkerApiError) {
    if (error.statusCode === 401) {
      return {
        message: 'Sesión inválida o expirada. Inicia sesión otra vez para ver tu perfil.',
        requiresSession: true,
      }
    }

    if (error.statusCode === 400) {
      return {
        message: 'El contexto autenticado no es válido. Intenta iniciar sesión de nuevo.',
        requiresSession: true,
      }
    }

    if (error.statusCode === 404) {
      return {
        message: 'No se encontró el usuario autenticado o no coincide con el campId actual.',
        requiresSession: false,
      }
    }

    return {
      message: 'No se pudo cargar el perfil del usuario. Intenta de nuevo más tarde.',
      requiresSession: false,
    }
  }

  if (error instanceof Error) {
    const normalized = error.message.trim().toLowerCase()

    if (normalized.includes('unauthorized') || normalized.includes('token') || normalized.includes('authorization')) {
      return {
        message: 'Sesión inválida o expirada. Inicia sesión otra vez para ver tu perfil.',
        requiresSession: true,
      }
    }
  }

  return {
    message: 'No se pudo cargar el perfil del usuario. Intenta de nuevo más tarde.',
    requiresSession: false,
  }
}

function formatRoleLabel(role: CurrentUserProfile['role']): string {
  switch (role) {
    case 'WORKER':
      return 'Trabajador'
    case 'RESOURCE_MANAGEMENT':
      return 'Gestión de recursos'
    case 'TRAVEL_MANAGER':
      return 'Gestión de viajes'
    case 'SYSTEM_ADMIN':
      return 'Administrador del sistema'
    default:
      return role
  }
}

function getStoredWorkerHudUser(sessionUser: WorkerAuthenticatedUser | null) {
  if (typeof window === 'undefined') {
    return {
      username: 'TRABAJADOR',
      role: 'WORKER',
      roleLabel: 'Trabajador',
    }
  }

  const savedDisplayName = localStorage.getItem('game_username')
  const rawUser = localStorage.getItem('session_user') ?? localStorage.getItem('user')

  try {
    const parsed = rawUser ? JSON.parse(rawUser) as {
      username?: unknown
      name?: unknown
      fullName?: unknown
      rol?: unknown
      role?: unknown
    } : null

    const sessionName = String(parsed?.username ?? parsed?.name ?? parsed?.fullName ?? sessionUser?.username ?? '').trim()
    const role = String(parsed?.rol ?? parsed?.role ?? sessionUser?.role ?? 'WORKER').toUpperCase()
    const roleLabel = role === 'WORKER'
      ? 'Trabajador'
      : formatWorkerHudRoleLabel(role)

    return {
      username: sessionName || savedDisplayName || 'TRABAJADOR',
      role,
      roleLabel,
    }
  } catch {
    const role = String(sessionUser?.role ?? 'WORKER').toUpperCase()

    return {
      username: savedDisplayName || sessionUser?.username || 'TRABAJADOR',
      role,
      roleLabel: role === 'WORKER' ? 'Trabajador' : formatWorkerHudRoleLabel(role),
    }
  }
}

function formatWorkerHudRoleLabel(role: string): string {
  switch (role) {
    case 'RESOURCE_MANAGEMENT':
      return 'Gestión de recursos'
    case 'TRAVEL_MANAGER':
      return 'Gestión de viajes'
    case 'SYSTEM_ADMIN':
      return 'Administrador del sistema'
    default:
      return role.replace(/_/g, ' ')
  }
}

function formatStatusLabel(status: CurrentUserProfile['status']): string {
  switch (status) {
    case 'ACTIVE':
      return 'Activo'
    case 'BLOCKED':
      return 'Bloqueado'
    case 'INACTIVE':
      return 'Inactivo'
    default:
      return status
  }
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

function ProfileIcon() {
  return (
    <IconSvg>
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5.5 19c1.3-3.1 4-4.8 6.5-4.8S17.2 15.9 18.5 19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M7.5 11.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
    </IconSvg>
  )
}

 
