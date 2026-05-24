import '../expeditionsUi.css'
import { useState, useEffect, type ReactNode } from 'react'
import {
  ExpDashboard,
  ExpCrear,
  ExpLista,
  ExpDetalles,
  TrasladosVer,
  TrasladosCrear,
  PlaceholderView,
  PersonasView,
} from '../views/ExpedicionesViews'
import { WorldMapDashboard } from '../views/WorldMapView'
import { LoadingScreen } from '../components/LoadingScreen'
import { OrientationWarning } from '../components/OrientationWarning'

const NAVIGATION_DATA = [
  { id: 'personas', label: 'Personas', icon: <ProfileIcon />, subOptions: ['Lista de personas'] },
  {
    id: 'expediciones',
    label: 'Expediciones',
    icon: <CompassIcon />,
    subOptions: ['Dashboard', 'Crear expedición', 'Lista de expediciones'],
  },
  {
    id: 'campamentos',
    label: 'Campamentos',
    icon: <WeaponIcon />,
    subOptions: ['Dashboard', 'Crear campamento', 'Lista de campamentos'],
  },
  {
    id: 'traslados',
    label: 'Traslados',
    icon: <VehicleIcon />,
    subOptions: ['Ver traslados', 'Crear traslado'],
  },
  {
    id: 'recursos',
    label: 'Recursos',
    icon: <SquadIcon />,
    subOptions: ['Inventario', 'Registrar consumo', 'Registrar obtención'],
  },
  {
    id: 'economia',
    label: 'Economía',
    icon: <CurrencyIcon />,
    subOptions: ['Balance general', 'Transacciones'],
  },
  {
    id: 'configuracion',
    label: 'Configuración',
    icon: <RankIcon />,
    subOptions: ['Perfil', 'Preferencias', 'Usuarios'],
  },
]

export default function ExpeditionsUiPage() {
  const [showLoading, setShowLoading] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasEntered, setHasEntered] = useState(false)

  const [activeNav, setActiveNav] = useState<string | null>(null)
  const [activeSub, setActiveSub] = useState<string>('Dashboard')
  const [activeExpId, setActiveExpId] = useState<number | undefined>(undefined)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true)
    }, 2600)
    return () => clearTimeout(timer)
  }, [])

  const handleEnter = () => {
    setHasEntered(true)
    setTimeout(() => {
      setShowLoading(false)
    }, 450)
  }

  const handleNavClick = (navId: string) => {
    if (activeNav === navId) {
      setActiveNav(null)
    } else {
      setActiveNav(navId)
      const navItem = NAVIGATION_DATA.find((item) => item.id === navId)
      setActiveSub(navItem?.subOptions[0] || '')
      setActiveExpId(undefined)
    }
  }

  const handleInnerNavigation = (sub: string, id?: number) => {
    setActiveSub(sub)
    if (id !== undefined) setActiveExpId(id)
  }

  const activeNavData = NAVIGATION_DATA.find((item) => item.id === activeNav)

  return (
    <div className="game-screen-layout text-[#A4C2C5]">
      <div className="holo-grid" />

      <OrientationWarning />

      <LoadingScreen show={showLoading} isLoaded={isLoaded} onEnter={handleEnter} />

      {hasEntered && <TopHud />}

      {hasEntered && (
        <div className="main-area">
          {activeNavData ? (
            <div className="content-scroll">
              <SectionTitle title={activeNavData.label} />
              <section aria-label="Panel principal" className="settings-shell h-full w-full">
                <div className="paint-glow" aria-hidden="true" />
                <div
                  className="settings-inner h-full"
                  style={{ padding: '42px 0 0 0', overflow: 'hidden' }}
                >
                  <div className="watermark-x" aria-hidden="true" />
                  <div className="inner-layout">
                    <aside className="inner-sidebar">
                      <SideMenu
                        items={activeNavData.subOptions}
                        activeItem={
                          activeSub === 'Detalles de Expedición'
                            ? 'Lista de expediciones'
                            : activeSub
                        }
                        onSelect={setActiveSub}
                      />
                    </aside>
                    <div className="inner-divider" />
                    <div className="inner-content">
                      <ContentArea
                        section={activeNav!}
                        sub={activeSub}
                        activeExpId={activeExpId}
                        onNavigate={handleInnerNavigation}
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div className="content-scroll">
              <SectionTitle title="Centro de Operaciones" />
              <section aria-label="Mapa mundial" className="settings-shell h-full w-full">
                <div className="paint-glow" aria-hidden="true" />
                <div
                  className="settings-inner h-full"
                  style={{ padding: '42px 0 0 0', overflow: 'hidden' }}
                >
                  <div className="watermark-x" aria-hidden="true" />
                  <div className="inner-content" style={{ padding: '16px 20px' }}>
                    <WorldMapDashboard />
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      )}

      {hasEntered && (
        <>
          <BottomDock activeDock={activeNav} onSelect={handleNavClick} />
          <SupportLink />
          <SettingsHint />
        </>
      )}
    </div>
  )
}

function TopHud() {
  return (
    <header className="game-hud-header pointer-events-none flex items-center justify-between px-3 pt-3 pb-2 text-[10px] font-black uppercase tracking-[-0.02em] text-[#A4C2C5]/80">
      <button className="pointer-events-auto top-hud-btn" type="button">
        <span className="btn-text">
          <span className="flex items-center gap-[1px] text-[#69BFB7]">
            <ChevronLeft />
            <ChevronLeft />
          </span>
          Back To Game
        </span>
      </button>
      <button className="pointer-events-auto top-hud-btn" type="button">
        <span className="btn-text">
          Logout
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
  activeItem,
  onSelect,
}: {
  items: string[]
  activeItem: string
  onSelect: (item: string) => void
}) {
  return (
    <nav aria-label="Settings sections" className="w-full pl-2 pt-6 h-full flex flex-col">
      <div className="flex flex-col gap-[18px] perspective-[800px]">
        {items.map((item) => (
          <button
            className={`side-button ${activeItem === item ? 'is-active' : ''} relative`}
            key={item}
            onClick={() => onSelect(item)}
            type="button"
            style={{
              transformStyle: 'preserve-3d',
              transform: 'rotateY(25deg) translateZ(10px)',
            }}
          >
            <span className="btn-text whitespace-nowrap overflow-visible drop-shadow-md">
              {item}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}

function ContentArea({
  section,
  sub,
  activeExpId,
  onNavigate,
}: {
  section: string
  sub: string
  activeExpId?: number
  onNavigate: (sub: string, id?: number) => void
}) {
  const VIEW_MAP: Record<string, Record<string, React.ReactNode>> = {
    expediciones: {
      Dashboard: <ExpDashboard onNavigate={onNavigate} />,
      'Crear expedición': <ExpCrear />,
      'Lista de expediciones': <ExpLista onNavigate={onNavigate} />,
      'Detalles de Expedición': <ExpDetalles expeditionId={activeExpId} onNavigate={onNavigate} />,
    },
    personas: {
      'Lista de personas': <PersonasView onNavigate={onNavigate} />,
    },
    traslados: {
      'Ver traslados': <TrasladosVer />,
      'Crear traslado': <TrasladosCrear />,
    },
  }

  const view = VIEW_MAP[section]?.[sub]
  if (view) return <>{view}</>
  return <PlaceholderView section={section} sub={sub} />
}

function BottomDock({
  activeDock,
  onSelect,
}: {
  activeDock: string | null
  onSelect: (id: string) => void
}) {
  return (
    <footer aria-label="Game navigation" className="dock">
      {NAVIGATION_DATA.map((item) => (
        <button
          aria-label={item.label}
          className={`dock-item ${activeDock === item.id ? 'is-active' : ''}`}
          key={item.id}
          onClick={() => onSelect(item.id)}
          type="button"
        >
          <span className="dock-content">
            {item.icon}
            {item.id === 'economia' && <span className="dock-number">304</span>}
          </span>
        </button>
      ))}
    </footer>
  )
}

function SupportLink() {
  return (
    <button className="support-link" type="button">
      <span className="btn-text">
        <span>?</span> Support
      </span>
    </button>
  )
}

function SettingsHint() {
  return (
    <button className="settings-hint" type="button">
      <span className="btn-text">
        Settings <GearIcon />
      </span>
    </button>
  )
}

function IconSvg({ children, className = 'h-6 w-6' }: { children: ReactNode; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 32 32"
    >
      {children}
    </svg>
  )
}

function ChevronLeft() {
  return (
    <svg aria-hidden="true" className="h-4 w-3" fill="none" viewBox="0 0 10 16">
      <path d="M8 2 2 8l6 6" stroke="currentColor" strokeLinecap="square" strokeWidth="3" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <IconSvg>
      <path d="M16 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" />
      <path d="M7 27c2.2-4.2 5.1-6.3 9-6.3s6.8 2.1 9 6.3" />
      <path d="M12 22.3 9 18m11 4.3 3-4.3" />
    </IconSvg>
  )
}

function CompassIcon() {
  return (
    <IconSvg>
      <path d="M16 3v26M3 16h26" />
      <path d="m16 7 4.5 9L16 25l-4.5-9L16 7Z" />
      <path d="m7 7 18 18M25 7 7 25" />
    </IconSvg>
  )
}

function WeaponIcon() {
  return (
    <IconSvg>
      <path d="M5 14h17l3 2v3H10l-2 5H5l1.7-5H5v-5Z" />
      <path d="M22 14v-3h5v5M12 19v4" />
      <path d="M8 12h8" />
    </IconSvg>
  )
}

function VehicleIcon() {
  return (
    <IconSvg>
      <path d="M4 18h22l2 4H7l-3-4Z" />
      <path d="M8 18 12 10h8l4 8" />
      <path d="M10 23h4m7 0h4" />
      <path d="M11 14h10" />
    </IconSvg>
  )
}

function SquadIcon() {
  return (
    <IconSvg>
      <path d="M16 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
      <path d="M8 12a3 3 0 1 0 0 6M24 12a3 3 0 1 1 0 6" />
      <path d="M9 26c1.7-3.7 4-5.5 7-5.5s5.3 1.8 7 5.5M2.5 25c1.1-2.8 2.8-4.2 5.2-4.2M29.5 25c-1.1-2.8-2.8-4.2-5.2-4.2" />
    </IconSvg>
  )
}

function CurrencyIcon() {
  return (
    <IconSvg>
      <path d="M16 4a12 12 0 1 0 0 24 12 12 0 0 0 0-24Z" />
      <path d="M21 11.5c-1.1-1-2.7-1.5-4.7-1.5-3 0-5.1 1.4-5.1 3.5 0 4.6 10.1 1.9 10.1 6.2 0 2.2-2.2 3.7-5.3 3.7-2.3 0-4.1-.7-5.3-2" />
      <path d="M16 7v18" />
    </IconSvg>
  )
}

function RankIcon() {
  return (
    <IconSvg className="h-7 w-7">
      <path d="M16 3 20 13l9 2-6.8 5.6L23 29l-7-4.5L9 29l.8-8.4L3 15l9-2 4-10Z" />
      <path d="M16 9v15M10 15l6 4 6-4" />
    </IconSvg>
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
