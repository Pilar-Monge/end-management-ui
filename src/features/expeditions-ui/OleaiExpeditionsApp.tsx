import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Bell } from "lucide-react";
import { LoadingScreen } from "./components/LoadingScreen";

// New feature-based architecture
import { ExpeditionDashboard } from "./features/expeditions/pages/Dashboard";
import { ExpeditionList } from "./features/expeditions/pages/ExpeditionList";
import { ExpeditionDetail } from "./features/expeditions/pages/ExpeditionDetail";
import { ExpeditionCreate } from "./features/expeditions/pages/ExpeditionCreate";
import { ZoneAnalysis } from "./features/expeditions/pages/ZoneAnalysis";
import { RegistrarRecursos } from "./features/expeditions/pages/RegistrarRecursos";
import { PersonasView } from "./views/ExpedicionesViews";
import { AdventuresView } from "./features/expeditions/pages/Adventures";
import { ProfileView } from "./features/expeditions/pages/Profile";
import {
  getCurrentExpeditionUser,
  getServerTime,
  listExpeditionNotifications,
  markNotificationRead,
} from "./services/expeditionsUi.service";
import { checkCurrentSessionStatus, clearCachedSession, logoutCurrentSession } from "../../shared/services/sessionProfile";

const LOGICAL_TIME_SESSION_CHECK_THRESHOLD_MS = 60 * 1000;

function Placeholder({ section, sub }: { section: string; sub: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <h2 className="text-2xl font-black tracking-[4px] text-[#A4C2C5] uppercase">{section}</h2>
        <p className="mt-2 text-[#69BFB7] text-[10px] uppercase tracking-widest">{sub} — Módulo encriptado</p>
      </div>
    </div>
  );
}

interface CurrentUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  campId: number;
  campName: string;
  photoUrl?: string;
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    TRAVEL_MANAGER: "Enc. de Expediciones",
    SYSTEM_ADMIN: "Administrador",
    WORKER: "Trabajador",
    RESOURCE_MANAGEMENT: "Gestor de Recursos"
  };

  return labels[role] ?? role;
}

const fallbackUser: CurrentUser = {
  id: 0,
  username: "sesion",
  name: "Usuario",
  email: "",
  role: "TRAVEL_MANAGER",
  campId: 1,
  campName: "Campamento 1",
  photoUrl: undefined
};

const NAVIGATION_DATA = [
  { id: "exploration", label: "Mapa y Zonas", icon: <CompassIcon />, subOptions: ["Analizador Satelital"] },
  { id: "personas", label: "Personas", icon: <SquadIcon />, subOptions: ["Lista de Personas"] },
  { id: "aventuras", label: "Aventuras", icon: <MapIcon />, subOptions: ["Lista de Aventuras"] },
  { id: "expediciones", label: "Expediciones", icon: <WeaponIcon />, subOptions: ["DASHBOARD", "CREAR EXPEDICIÓN", "LISTA DE EXPEDICIONES"] },
  { id: "profile", label: "Mi perfil", icon: <ProfileIcon />, subOptions: ["Información Personal", "Notificaciones"] },
];

export default function App() {
  const [showLoading, setShowLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);

  const [currentUser, setCurrentUser] = useState<CurrentUser>(fallbackUser);

  const [activeNav, setActiveNav] = useState<string | null>(null);
  const [activeSub, setActiveSub] = useState<string>("");
  const [activeExpId, setActiveExpId] = useState<number | undefined>(undefined);
  const [activeCampId, setActiveCampId] = useState<number>(fallbackUser.campId);

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      try {
        const user = await getCurrentExpeditionUser();
        if (!isMounted) return;
        setCurrentUser({
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          campId: user.campId,
          campName: user.campName,
          photoUrl: user.photoUrl,
        });
        setActiveCampId(user.campId);
      } catch (err) {
        console.warn("Backend auth unavailable, staying with fallbackUser:", err);
      }
    }

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 2600);
    return () => clearTimeout(timer);
  }, []);

  const handleEnter = () => {
    setHasEntered(true);
    setTimeout(() => {
      setShowLoading(false);
    }, 450);
  };

  const handleNavClick = (navId: string) => {
    if (activeNav === navId) {
      setActiveNav(null);
    } else {
      setActiveNav(navId);
      const navItem = NAVIGATION_DATA.find((item) => item.id === navId);
      setActiveSub(navItem?.subOptions[0] || "");
      setActiveExpId(undefined);
    }
  };

  const handleVolver = () => {
    if (activeSub === "Detalles de Expedición") {
      setActiveSub("LISTA DE EXPEDICIONES");
    } else if (activeNav) {
      setActiveNav(null);
      setActiveSub("");
    }
  };

  const handleNotificationClick = () => {
    setActiveNav("profile");
    setActiveSub("Notificaciones");
  };

  const handleProfileClick = () => {
    setActiveNav("profile");
    setActiveSub("Información Personal");
  };

  const handleLogout = async () => {
    await logoutCurrentSession();
    setHasEntered(false);
    setShowLoading(true);
  };

  const handleInnerNavigation = (sub: string, id?: number) => {
    let translated = sub;
    if (sub === "Lanzar Misión" || sub === "CREAR EXPEDICIÓN" || sub === "Crear Expedición") {
      translated = "CREAR EXPEDICIÓN";
      setActiveNav("expediciones");
    }
    if (sub === "Archivo Histórico" || sub === "LISTA DE EXPEDICIONES") {
      translated = "LISTA DE EXPEDICIONES";
      setActiveNav("expediciones");
    }
    if (sub === "Dashboard" || sub === "DASHBOARD") {
      translated = "DASHBOARD";
      setActiveNav("expediciones");
    }
    if (sub === "Analizador Satelital") {
      setActiveNav("exploration");
    }
    if (sub === "Detalles de Expedición") {
      setActiveNav("expediciones");
    }
    setActiveSub(translated);
    if (id !== undefined) setActiveExpId(id);
  };

  const activeNavData = NAVIGATION_DATA.find((item) => item.id === activeNav);

  return (
    <div className="game-screen-layout text-[#A4C2C5]">
      <div className="holo-grid" />

      <LoadingScreen 
        show={showLoading} 
        isLoaded={isLoaded} 
        onEnter={handleEnter} 
      />

      {hasEntered && (
        <TopHud 
          currentUser={currentUser} 
          onVolver={handleVolver}
          onNotificationClick={handleNotificationClick}
          onProfileClick={handleProfileClick}
          onLogout={handleLogout}
        />
      )}

      {hasEntered && (
        <div className="fixed bottom-[22px] left-[22px] z-[70] pointer-events-auto flex items-center gap-2 px-3 py-1.5 bg-[#030d0d]/90 border border-[#67ACA9]/40 rounded text-[#A4C2C5] select-none shadow-[0_0_15px_rgba(103,172,169,0.25)] font-mono text-[10px] tracking-wider uppercase">
          <span className="text-[#69BFB7] font-bold">⬡</span>
          <span className="tracking-widest font-black">
            {currentUser.campName || `Campamento ${activeCampId}`}
          </span>
          <button 
            onClick={() => {
              const nextId = (activeCampId % 5) + 1;
              setActiveCampId(currentUser.campId || nextId);
            }}
            className="ml-1 text-[#69BFB7] hover:text-[#69BFB7] px-1.5 py-0.5 hover:bg-[#67ACA9]/20 rounded border border-[#67ACA9]/40 transition-all font-mono normal-case text-[10px]"
            title="Cambiar Campamento Activo"
            style={{ cursor: "pointer" }}
          >
            [↔]
          </button>
        </div>
      )}

      {hasEntered && (
        <div className="main-area">
          {!activeNav || activeNav === "exploration" ? (
            <div className="content-scroll">
              <SectionTitle title="Centro de Operaciones" />
              <section aria-label="Mapa mundial" className="settings-shell h-full w-full">
                <div className="paint-glow" aria-hidden="true" />
                <div className="settings-inner-padding settings-inner h-full" style={{ overflow: "hidden" }}>
                  <div className="watermark-x" aria-hidden="true" />
                  <div className="inner-content">
                    <ZoneAnalysis key={activeCampId} onNavigate={handleInnerNavigation} />
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div className="content-scroll">
              <SectionTitle title={activeNavData?.label || ""} />
              <section aria-label="Panel principal" className="settings-shell h-full w-full">
                <div className="paint-glow" aria-hidden="true" />
                <div className="settings-inner-padding settings-inner h-full" style={{ overflow: "hidden" }}>
                  <div className="watermark-x" aria-hidden="true" />
                  <div className="inner-layout">
                    <aside className="inner-sidebar">
                      <SideMenu 
                        items={activeNavData?.subOptions || []} 
                        activeItem={activeSub === "Detalles de Expedición" ? "LISTA DE EXPEDICIONES" : activeSub} 
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
                        activeCampId={activeCampId}
                      />
                    </div>
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
        </>
      )}
    </div>
  );
}

function TopHud({ 
  currentUser,
  onVolver,
  onNotificationClick,
  onProfileClick,
  onLogout
}: { 
  currentUser: CurrentUser;
  onVolver: () => void;
  onNotificationClick: () => void;
  onProfileClick: () => void;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  const [timeString, setTimeString] = useState("Sin sincronizar");
  const serverBaseRef = useRef<Date | null>(null);
  const clientBaseRef = useRef(Date.now());
  const lastSyncedGlobalTimeRef = useRef<{
    baseServerTime: Date;
    syncedAtClientMs: number;
  } | null>(null);

  const redirectExpiredLogicalSession = useCallback(() => {
    clearCachedSession(true);
    navigate("/main-homepage", {
      replace: true,
      state: {
        initialAppState: "login",
        sessionMessage: "Sesion expirada por avance del tiempo logico. Inicia sesion para continuar.",
      },
    });
  }, [navigate]);

  const validateSessionAfterLogicalTimeJump = useCallback(
    async (nextServerTime: Date): Promise<boolean> => {
      const previous = lastSyncedGlobalTimeRef.current;
      if (!previous) return false;

      const expectedServerTimeMs =
        previous.baseServerTime.getTime() + Math.max(0, Date.now() - previous.syncedAtClientMs);
      const forwardJumpMs = nextServerTime.getTime() - expectedServerTimeMs;

      if (forwardJumpMs <= LOGICAL_TIME_SESSION_CHECK_THRESHOLD_MS) {
        return false;
      }

      const status = await checkCurrentSessionStatus();
      if (status !== "expired") {
        return false;
      }

      redirectExpiredLogicalSession();
      return true;
    },
    [redirectExpiredLogicalSession],
  );

  useEffect(() => {
    let cancelled = false;

    const updateTime = () => {
      const serverBase = serverBaseRef.current;
      if (!serverBase) return;
      const now = new Date(serverBase.getTime() + Math.max(0, Date.now() - clientBaseRef.current));
      const yyyy = now.getUTCFullYear();
      const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(now.getUTCDate()).padStart(2, "0");
      const hh = String(now.getUTCHours()).padStart(2, "0");
      const min = String(now.getUTCMinutes()).padStart(2, "0");
      const sec = String(now.getUTCSeconds()).padStart(2, "0");
      setTimeString(`${yyyy}-${mm}-${dd} ${hh}:${min}:${sec}`);
    };

    async function syncServerTime() {
      try {
        const syncedTime = new Date(await getServerTime());
        if (Number.isNaN(syncedTime.getTime())) return;

        const sessionExpired = await validateSessionAfterLogicalTimeJump(syncedTime);
        if (sessionExpired || cancelled) return;

        serverBaseRef.current = syncedTime;
        clientBaseRef.current = Date.now();
        lastSyncedGlobalTimeRef.current = {
          baseServerTime: syncedTime,
          syncedAtClientMs: clientBaseRef.current,
        };
        if (!cancelled) updateTime();
      } catch (error) {
        console.warn("Server time unavailable:", error);
        try {
          const status = await checkCurrentSessionStatus();
          if (status === "expired" && !cancelled) {
            redirectExpiredLogicalSession();
          }
        } catch (sessionError) {
          console.warn("Unable to validate expedition session after server time sync failed:", sessionError);
        }
      }
    }

    syncServerTime();
    const clockInterval = window.setInterval(updateTime, 1000);
    const syncInterval = window.setInterval(syncServerTime, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(clockInterval);
      window.clearInterval(syncInterval);
    };
  }, [redirectExpiredLogicalSession, validateSessionAfterLogicalTimeJump]);

  const getInitials = (name: string) => {
    return (name || "")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <header className="game-hud-header pointer-events-none flex items-center justify-between px-3 pt-3 pb-2 text-[10px] font-black uppercase tracking-[-0.02em] text-[#A4C2C5]/80 flex-wrap gap-2 md:flex-nowrap">
      
      {/* Left side: Back Button */}
      <button 
        onClick={onVolver} 
        className="pointer-events-auto top-hud-btn hud-back-btn" 
        style={{ cursor: "pointer" }}
        type="button"
      >
        <span className="btn-text">
          <span className="flex items-center gap-[1px] text-[#69BFB7]">
            <ChevronLeft />
            <ChevronLeft />
          </span>
          <span className="hud-back-text">VOLVER</span>
        </span>
      </button>

      {/* Center: Server Time Module */}
      <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-1.5 bg-[#030d0d]/90 border border-[#67ACA9]/40 hover:border-[#69BFB7]/50 rounded-sm transition-all font-mono text-[9px] sm:text-[10px] tracking-wider select-none hud-clock-container">
        <Clock className="w-3.5 h-3.5 text-[#69BFB7] hud-clock-icon" />
        <span className="text-[#69BFB7]/80 font-bold uppercase tracking-widest whitespace-nowrap hud-clock-label">Hora Del Servidor:</span>
        <span className="text-[#F0FAFA] font-black hud-clock-value">{timeString}</span>
      </div>

      {/* Right side: Actions, Notifications & Profile Card */}
      <div className="flex items-center gap-3 hud-right-actions">
        {/* Notification Button */}
        <button 
          onClick={onNotificationClick}
          className="pointer-events-auto relative w-8 h-8 flex items-center justify-center bg-[#030d0d]/90 border border-[#67ACA9]/40 hover:border-[#69BFB7]/60 hover:bg-[#67ACA9]/20 rounded-sm transition-all shadow-[0_0_10px_rgba(103,172,169,0.1)] text-[#A4C2C5] hover:text-[#69BFB7] hud-notif-btn"
          style={{ cursor: "pointer" }}
          title="Notificaciones"
          type="button"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-[3px] right-[3px] w-1.5 h-1.5 bg-red-500 rounded-full border border-[#030d0d]" />
        </button>

        {/* User Status Profile Card */}
        <button 
          onClick={onProfileClick}
          className="pointer-events-auto flex items-center gap-3 px-3 py-1 bg-[#030d0d]/90 border border-[#67ACA9]/40 hover:border-[#69BFB7]/60 hover:bg-[#67ACA9]/15 rounded-sm transition-all text-left shadow-[0_0_10px_rgba(103,172,169,0.15)] focus:outline-none hud-profile-btn"
          style={{ cursor: "pointer" }}
          type="button"
        >
          <div className="flex flex-col text-[9px] sm:text-[10px] font-mono leading-tight tracking-wider pr-1 hud-profile-info">
            <span className="text-[#F0FAFA] font-black uppercase text-[10px] sm:text-[11px] font-sans pb-0.5 hud-username">{currentUser.name}</span>
            <span className="text-[#69BFB7] text-[8px] font-bold hud-userrole">{getRoleLabel(currentUser.role)}</span>
          </div>
          {currentUser.photoUrl ? (
            <img
              src={currentUser.photoUrl}
              alt={currentUser.name}
              className="w-7 h-7 rounded-full border border-[#69BFB7]/40 object-cover hud-avatar"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-7 h-7 rounded-full border border-[#69BFB7]/40 flex items-center justify-center bg-[#67ACA9]/10 text-[#69BFB7] font-mono text-[9px] font-black hud-avatar-fallback">
              {getInitials(currentUser.name || "")}
            </div>
          )}
        </button>

        {/* Logout Button */}
        <button 
          onClick={onLogout} 
          className="pointer-events-auto top-hud-btn hud-logout-btn" 
          style={{ cursor: "pointer" }}
          type="button"
          title="Cerrar Sesión"
        >
          <span className="btn-text" style={{ gap: "10px" }}>
            <span className="hud-logout-text">CERRAR SESIÓN</span>
            <span className="logout-mark" aria-hidden="true" />
          </span>
        </button>
      </div>

    </header>
  );
}

function NotificationsView() {
  const [backendNotifications, setBackendNotifications] = useState<Array<{
    id: number;
    title: string;
    body: string;
    time: string;
    severity: string;
  }>>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      try {
        const data = await listExpeditionNotifications();
        if (!isMounted) return;
        setBackendNotifications(
          data.map((notification) => ({
            id: notification.id,
            title: notification.title,
            body: notification.message,
            time: formatUtcDateTime(notification.createdDate),
            severity: notification.type,
          })),
        );
      } catch (error) {
        console.warn("Notifications unavailable:", error);
        if (isMounted) setBackendNotifications([]);
      }
    }

    loadNotifications();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await markNotificationRead(id);
      setBackendNotifications((current) => current.filter((notification) => notification.id !== id));
    } catch (error) {
      console.warn("Unable to mark notification as read:", error);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
      {/* Left Card - Feed Status Overview to mirror Profile's visual weight and style */}
      <div className="v-person-card flex flex-col items-center justify-between p-6">
        <div className="w-full flex flex-col items-center">
          <div 
            className="v-person-photo-wrap mb-4 flex items-center justify-center bg-black/40 border border-[#67ACA9]/20" 
            style={{ width: "120px", height: "120px", borderRadius: "50%", overflow: "hidden" }}
          >
            {/* Visual satellite dish or status pulse indicator */}
            <div className="relative flex items-center justify-center w-full h-full">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(105,191,183,0.15),transparent_70%)] animate-pulse" />
              <div className="w-16 h-16 rounded-full border border-[#67ACA9]/35 border-dashed flex items-center justify-center animate-spin-slow">
                <Bell className="w-8 h-8 text-[#69BFB7]" />
              </div>
            </div>
            <div className="v-person-status-dot bg-emerald-500 bottom-1 right-1" style={{ width: "16px", height: "16px" }} />
          </div>

          <h3 className="text-sm font-black text-[#f0fafa] uppercase tracking-wider text-center">
            Estado de Red
          </h3>
          <p className="text-emerald-400 text-[9px] uppercase tracking-widest font-mono mt-1 font-bold">
            CONEXIÓN ESTABLE
          </p>

          <div className="w-full border-t border-[#67ACA9]/20 my-4 pt-4 flex flex-col gap-2.5 font-mono text-[11px] text-[#A4C2C5]/80">
            <div className="flex items-center justify-between">
              <span className="text-[#A4C2C5]/50">MODO FEED:</span>
              <span className="text-[#69BFB7] font-bold">ALPHA MASTER</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#A4C2C5]/50">TERMINAL:</span>
              <span className="text-[#69BFB7]">HUD-SECURE-01</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#A4C2C5]/50">TELEMETRÍA:</span>
              <span className="text-emerald-400 font-bold">COMPLETA</span>
            </div>
          </div>
        </div>

        <div className="w-full mt-4 text-center">
          <span className="inline-block font-mono text-[8px] text-[#69BFB7]/65 uppercase tracking-widest bg-black/40 border border-[#67ACA9]/20 py-2 px-3 rounded-sm w-full">
            SAT_FEED // ONLINE
          </span>
        </div>
      </div>

      {/* Right Area - Alerts container matching mission-card */}
      <div className="lg:col-span-2 mission-card flex flex-col justify-between">
        <div>
          <div className="mission-card-title border-b border-[#67ACA9]/20 pb-2 mb-4 flex items-center justify-between">
            <span>ALERTAS DE LA RED SATELITAL</span>
            <span className="text-[9px] text-[#69BFB7] tracking-widest font-mono uppercase bg-[#67ACA9]/10 px-2 py-0.5 rounded border border-[#67ACA9]/15">Módulos Activos</span>
          </div>

          <div className="flex flex-col gap-3 ml-1 mt-4">
            {backendNotifications.map(n => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleMarkRead(n.id)}
                className="p-3 bg-black/40 border border-[#67ACA9]/20 hover:border-[#69BFB7]/50 rounded-sm relative flex flex-col gap-1.5 transition-all text-left"
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold uppercase tracking-wider text-[11px] ${n.severity === 'high' ? 'text-red-400 font-black' : 'text-[#69BFB7]'}`}>
                    {n.severity === 'high' ? "⚠️ " : ""}{n.title}
                  </span>
                  <span className="text-[8px] tracking-widest text-[#A4C2C5]/50 uppercase font-mono">{n.time}</span>
                </div>
                <p className="text-[#A4C2C5]/85 text-[10.5px] leading-relaxed font-sans text-left">{n.body}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 p-4 border border-[#67ACA9]/20 bg-[#041515] rounded-sm text-xs text-[#A4C2C5]/70" style={{ clipPath: "polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)" }}>
          <div className="font-bold text-[#69BFB7] mb-1 text-[10px] uppercase tracking-wider font-mono">REGISTRO DE CONTROL DE RED SECURE</div>
          <p className="leading-relaxed font-sans text-left text-[#A4C2C5]/85">
            Las alertas y transmisiones del canal satelital son actualizadas en tiempo de ejecución por el nodo central del campamento terrestre. Cualquier anomalía o pérdida de señal de las cuadrillas generará una alerta de nivel crítico con prioridad alta automáticamente.
          </p>
        </div>
      </div>
    </div>
  );
}

function formatUtcDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="section-header">
      <div
        className="section-title-brush"
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateY(25deg) translateZ(10px)",
        }}
      >
        <span className="btn-text">{title}</span>
      </div>
    </div>
  );
}

function SideMenu({ items, activeItem, onSelect }: { items: string[]; activeItem: string; onSelect: (item: string) => void }) {
  return (
    <nav aria-label="Settings sections" className="w-full pl-2 pt-6 h-full flex flex-col">
      <div className="flex flex-col gap-[18px] perspective-[800px]">
        {items.map((item) => (
          <button
            className={`side-button ${activeItem === item ? "is-active" : ""} relative`}
            key={item}
            onClick={() => onSelect(item)}
            type="button"
            style={{
              transformStyle: "preserve-3d",
              transform: "rotateY(25deg) translateZ(10px)",
            }}
          >
            <span className="btn-text whitespace-nowrap overflow-visible drop-shadow-md">{item}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function ContentArea({ 
  section, 
  sub, 
  activeExpId, 
  onNavigate,
  activeCampId
}: { 
  section: string; 
  sub: string; 
  activeExpId?: number;
  onNavigate: (sub: string, id?: number) => void;
  activeCampId: number;
}) {
  const VIEW_MAP: Record<string, Record<string, React.ReactNode>> = {
    exploration: {
       "Analizador Satelital": <ZoneAnalysis key={activeCampId} onNavigate={onNavigate} />
    },
    expediciones: {
      "DASHBOARD": <ExpeditionDashboard onNavigate={onNavigate} />,
      "CREAR EXPEDICIÓN": <ExpeditionCreate onNavigate={onNavigate} />,
      "LISTA DE EXPEDICIONES": <ExpeditionList onNavigate={onNavigate} />,
      "GESTIONAR PARTICIPANTES": <PersonasView onNavigate={onNavigate} />,
      "REGISTRAR RECURSOS": <RegistrarRecursos />,
      "Detalles de Expedición": <ExpeditionDetail expeditionId={activeExpId} onNavigate={onNavigate} />,
    },
    profile: {
      "Información Personal": <ProfileView />,
      "Notificaciones": <NotificationsView />,
    },
    personas: {
      "Lista de Personas": <PersonasView onNavigate={onNavigate} />
    },
    aventuras: {
      "Lista de Aventuras": <AdventuresView onNavigate={onNavigate} />
    }
  };

  const view = VIEW_MAP[section]?.[sub];
  if (view) return <>{view}</>;
  return <Placeholder section={section} sub={sub} />;
}

function BottomDock({ activeDock, onSelect }: { activeDock: string | null; onSelect: (id: string) => void }) {
  return (
    <footer aria-label="Game navigation" className="dock">
      {NAVIGATION_DATA.map((item) => (
        <button
          aria-label={item.label}
          className={`dock-item ${activeDock === item.id ? "is-active" : ""}`}
          key={item.id}
          onClick={() => onSelect(item.id)}
          type="button"
        >
          <span className="dock-content">
            {item.icon}
          </span>
        </button>
      ))}
    </footer>
  );
}

// Underlay buttons removed as requested

function IconSvg({ children, className = "h-6 w-6" }: { children: ReactNode; className?: string }) {
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
  );
}

function ChevronLeft() {
  return (
    <svg aria-hidden="true" className="h-4 w-3" fill="none" viewBox="0 0 10 16">
      <path d="M8 2 2 8l6 6" stroke="currentColor" strokeLinecap="square" strokeWidth="3" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <IconSvg>
      <path d="M16 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" />
      <path d="M7 27c2.2-4.2 5.1-6.3 9-6.3s6.8 2.1 9 6.3" />
      <path d="M12 22.3 9 18m11 4.3 3-4.3" />
    </IconSvg>
  );
}

function CompassIcon() {
  return (
    <IconSvg>
      <path d="M16 3v26M3 16h26" />
      <path d="m16 7 4.5 9L16 25l-4.5-9L16 7Z" />
      <path d="m7 7 18 18M25 7 7 25" />
    </IconSvg>
  );
}

function WeaponIcon() {
  return (
    <IconSvg>
      <path d="M5 14h17l3 2v3H10l-2 5H5l1.7-5H5v-5Z" />
      <path d="M22 14v-3h5v5M12 19v4" />
      <path d="M8 12h8" />
    </IconSvg>
  );
}

function SquadIcon() {
  return (
    <IconSvg>
      <path d="M16 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
      <path d="M8 12a3 3 0 1 0 0 6M24 12a3 3 0 1 1 0 6" />
      <path d="M9 26c1.7-3.7 4-5.5 7-5.5s5.3 1.8 7 5.5M2.5 25c1.1-2.8 2.8-4.2 5.2-4.2M29.5 25c-1.1-2.8-2.8-4.2-5.2-4.2" />
    </IconSvg>
  );
}

function MapIcon() {
  return (
    <IconSvg>
      <path d="M4 8l8-4 8 4 8-4v18l-8 4-8-4-8 4V8z" />
      <path d="M12 4v18M20 8v18" />
    </IconSvg>
  );
}


