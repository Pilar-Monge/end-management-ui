import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle,
  CloudLightning,
  Eye,
  Mail,
  Package,
  Shield,
  Trash2,
} from "lucide-react";
import { MissionShell, MissionStack } from "../components/SharedLayout";
import {
  getCurrentExpeditionUser,
  listExpeditionNotifications,
  markNotificationRead,
  type CurrentExpeditionUser,
} from "../../../services/expeditionsUi.service";

interface SystemNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    SYSTEM_ADMIN: "Administrador del Sistema",
    TRAVEL_MANAGER: "Enc. de Expediciones",
    RESOURCE_MANAGEMENT: "Gestor de Recursos",
    WORKER: "Trabajador",
  };
  return labels[role] ?? role;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDateUtc(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

function getNotificationTypeConfig(type: string) {
  const normalized = type.toUpperCase();

  if (normalized.includes("RETURN") || normalized.includes("COMPLETE")) {
    return {
      translatedName: "Expedicion finalizada",
      icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
      borderClass: "border-emerald-500/20",
      bgClass: "bg-emerald-950/20",
      tagBorderClass: "border-emerald-500/30 bg-emerald-950/30",
      tagTextClass: "text-emerald-400",
    };
  }

  if (normalized.includes("RESOURCE")) {
    return {
      translatedName: "Recursos de expedicion",
      icon: <Package className="w-4 h-4 text-amber-400" />,
      borderClass: "border-amber-500/20",
      bgClass: "bg-amber-950/20",
      tagBorderClass: "border-amber-500/30 bg-amber-950/30",
      tagTextClass: "text-amber-400",
    };
  }

  if (normalized.includes("ATTACK") || normalized.includes("LOST")) {
    return {
      translatedName: "Alerta critica",
      icon: <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />,
      borderClass: "border-red-500/20",
      bgClass: "bg-red-950/20",
      tagBorderClass: "border-red-500/30 bg-red-950/30",
      tagTextClass: "text-red-400",
    };
  }

  if (normalized.includes("WEATHER") || normalized.includes("DELAY")) {
    return {
      translatedName: "Alerta temporal",
      icon: <CloudLightning className="w-4 h-4 text-cyan-400" />,
      borderClass: "border-cyan-500/20",
      bgClass: "bg-cyan-950/20",
      tagBorderClass: "border-cyan-500/30 bg-cyan-950/30",
      tagTextClass: "text-cyan-400",
    };
  }

  return {
    translatedName: "Aviso de expedicion",
    icon: <Bell className="w-4 h-4 text-[#69BFB7]" />,
    borderClass: "border-[#67ACA9]/20",
    bgClass: "bg-black/30",
    tagBorderClass: "border-[#67ACA9]/30 bg-black/40",
    tagTextClass: "text-[#69BFB7]",
  };
}

export function ProfileView() {
  const [activeTab, setActiveTab] = useState<"info" | "notifications">("info");
  const [profileUser, setProfileUser] = useState<CurrentExpeditionUser | null>(null);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadProfileData() {
      setLoading(true);
      setError(null);
      try {
        const [user, notificationData] = await Promise.all([
          getCurrentExpeditionUser(),
          listExpeditionNotifications(),
        ]);
        if (!mounted) return;
        setProfileUser(user);
        setNotifications(
          notificationData.map((notification) => ({
            id: notification.id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            isRead: notification.read,
            createdAt: notification.createdDate,
          })),
        );
      } catch (err) {
        console.warn("Unable to load expedition profile data:", err);
        if (mounted) {
          setError("No se pudo cargar la informacion de la sesion actual.");
          setNotifications([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProfileData();

    return () => {
      mounted = false;
    };
  }, []);

  const profile = {
    fullName: profileUser?.name || "Usuario",
    email: profileUser?.email || "Sin correo registrado",
    username: profileUser?.username || "usuario",
    role: getRoleLabel(profileUser?.role || ""),
    status: profileUser?.status === "ACTIVE" ? "Activo / Verificado" : profileUser?.status || "Sin estado",
    avatarUrl: profileUser?.photoUrl,
  };

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  const handleMarkAsRead = async (id: number) => {
    try {
      await markNotificationRead(id);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id ? { ...notification, isRead: true } : notification,
        ),
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleDeleteNotification = (id: number) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  };

  return (
    <MissionShell kicker="Identificacion de Red" title="Mi Perfil">
      <MissionStack>
        <div className="mission-tabs mb-6 flex gap-2">
          <button
            id="profile-tab-info"
            className={activeTab === "info" ? "is-active" : ""}
            onClick={() => setActiveTab("info")}
            type="button"
          >
            INFORMACION PERSONAL
          </button>
          <button
            id="profile-tab-notifications"
            className={activeTab === "notifications" ? "is-active" : ""}
            onClick={() => setActiveTab("notifications")}
            type="button"
          >
            NOTIFICACIONES ({unreadCount})
          </button>
        </div>

        {error && (
          <div className="border border-red-500/30 bg-red-950/20 rounded-sm p-3 text-xs font-mono text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="v-person-card flex flex-col items-center justify-between p-6">
            <div className="w-full flex flex-col items-center">
              <div
                className="v-person-photo-wrap mb-4 flex items-center justify-center bg-black/35"
                style={{ width: "120px", height: "120px", borderRadius: "50%", overflow: "hidden" }}
              >
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.fullName}
                    className="v-person-photo w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-3xl font-black text-[#69BFB7] font-mono">
                    {getInitials(profile.fullName)}
                  </span>
                )}
                <div className="v-person-status-dot bg-emerald-500 bottom-1 right-1" style={{ width: "16px", height: "16px" }} />
              </div>

              <h3 className="text-lg font-black text-[#A4C2C5] uppercase tracking-wider text-center">
                {profile.fullName}
              </h3>
              <p className="text-[#69BFB7] text-[10px] uppercase tracking-widest font-mono mt-1">
                @{profile.username}
              </p>

              <div className="w-full border-t border-[#67ACA9]/20 my-4 pt-4 flex flex-col gap-2.5">
                <div className="flex items-center gap-2 text-xs text-[#A4C2C5]/80">
                  <Shield className="w-3.5 h-3.5 text-[#69BFB7]" />
                  <span>Rango: <strong className="text-[#69BFB7] uppercase">{profile.role}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#A4C2C5]/80">
                  <Mail className="w-3.5 h-3.5 text-[#69BFB7]" />
                  <span className="truncate">{profile.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#A4C2C5]/80">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Estado: <strong className="text-emerald-400 uppercase">{profile.status}</strong></span>
                </div>
              </div>
            </div>

            <div className="w-full mt-4 text-center">
              <span className="inline-block font-mono text-[8px] text-[#69BFB7]/60 uppercase tracking-widest bg-black/40 border border-[#67ACA9]/20 py-2 px-3 rounded-sm w-full">
                SISTEMA PROTEGIDO / SESION ACTUAL
              </span>
            </div>
          </div>

          {activeTab === "info" ? (
            <div className="lg:col-span-2 mission-card flex flex-col justify-between">
              <div>
                <div className="mission-card-title border-b border-[#67ACA9]/20 pb-2 mb-4 flex items-center justify-between">
                  <span>DATOS PERSONALES DEL USUARIO</span>
                  <span className="text-[9px] text-[#69BFB7] tracking-widest font-mono uppercase">MODULO DE ACCESO ENCRIPTADO</span>
                </div>

                {loading ? (
                  <div className="p-8 text-center text-xs font-mono text-[#69BFB7] animate-pulse">
                    CARGANDO PERFIL DE LA SESION...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-6 py-2">
                    <ProfileField label="Nombre Completo" value={profile.fullName} />
                    <ProfileField label="Correo Electronico" value={profile.email} />
                    <ProfileField label="Nombre de Usuario" value={`@${profile.username}`} accent />
                    <ProfileField label="Rol Actual" value={profile.role} />
                    <ProfileField label="Estado de la Cuenta" value={profile.status} status />
                  </div>
                )}
              </div>

              <div className="mt-6 p-4 border border-[#67ACA9]/20 bg-[#041515] rounded-sm text-xs text-[#A4C2C5]/70" style={{ clipPath: "polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)" }}>
                <div className="font-bold text-[#69BFB7] mb-1 text-[10px] uppercase tracking-wider">BITACORA DE CONTROL OPERATIVO</div>
                <p className="leading-relaxed">
                  Este terminal muestra la informacion del usuario autenticado en el backend. Los permisos y notificaciones dependen de la sesion activa.
                </p>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2 mission-card flex flex-col justify-between">
              <div>
                <div className="mission-card-title border-b border-[#67ACA9]/20 pb-2 mb-4 flex items-center justify-between">
                  <span>CENTRO DE MENSAJES Y ALERTAS</span>
                  <span className="text-[9px] text-[#69BFB7] tracking-widest font-mono uppercase">EXPEDICIONES / SESION ACTUAL</span>
                </div>

                {loading ? (
                  <div className="p-8 text-center text-xs font-mono text-[#69BFB7] animate-pulse">
                    CARGANDO NOTIFICACIONES DE EXPEDICIONES...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs font-mono text-[#A4C2C5]/40 border border-[#67ACA9]/10 rounded-sm">
                    NO HAY NOTIFICACIONES DE EXPEDICIONES PARA ESTE USUARIO.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
                    {notifications.map((notification) => {
                      const typeConfig = getNotificationTypeConfig(notification.type);

                      return (
                        <div
                          key={notification.id}
                          id={`notification-${notification.id}`}
                          className={`p-3 border transition-all relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                            notification.isRead
                              ? "bg-black/10 border-[#67ACA9]/10 text-[#A4C2C5]/50"
                              : "bg-[#67ACA9]/5 border-[#69BFB7]/30 text-[#f0fafa] shadow-[0_0_8px_rgba(105,191,183,0.05)]"
                          }`}
                        >
                          {!notification.isRead && (
                            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#69BFB7]" />
                          )}

                          <div className="flex items-start gap-3 pl-1 max-w-full sm:max-w-[70%]">
                            <div className={`p-1.5 rounded-sm border shrink-0 ${typeConfig.borderClass} ${typeConfig.bgClass}`}>
                              {typeConfig.icon}
                            </div>

                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className={`text-xs uppercase tracking-wider font-bold ${notification.isRead ? "text-[#A4C2C5]/70" : "text-[#f0fafa]"}`}>
                                  {notification.title}
                                </h4>
                                <span className={`text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 border shrink-0 ${typeConfig.tagBorderClass} ${typeConfig.tagTextClass}`}>
                                  {typeConfig.translatedName}
                                </span>
                              </div>
                              <p className="text-[11px] leading-relaxed mt-1 text-[#A4C2C5]/85 break-words">
                                {notification.message}
                              </p>
                              <span className="text-[9px] font-mono text-[#A4C2C5]/40 mt-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-[#69BFB7]/40" />
                                {formatDateUtc(notification.createdAt)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 sm:self-center self-end shrink-0">
                            {!notification.isRead && (
                              <button
                                id={`read-btn-${notification.id}`}
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-1 bg-[#0a1f1e] border border-[#69BFB7]/45 hover:bg-[#69BFB7]/15 hover:border-[#69BFB7] text-[#69BFB7] hover:text-[#f0fafa] transition-all flex items-center gap-1"
                                title="Marcar como leido"
                                type="button"
                              >
                                <Eye className="w-3 h-3" />
                                Procesar
                              </button>
                            )}
                            <button
                              id={`delete-btn-${notification.id}`}
                              onClick={() => handleDeleteNotification(notification.id)}
                              className="font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-1 bg-black/40 border border-red-500/20 hover:bg-red-950/40 hover:border-red-500 hover:text-red-300 text-red-400/80 transition-all flex items-center gap-1"
                              title="Ocultar notificacion"
                              type="button"
                            >
                              <Trash2 className="w-3 h-3" />
                              Ocultar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-6 p-4 border border-[#67ACA9]/20 bg-[#041515] rounded-sm text-xs text-[#A4C2C5]/70" style={{ clipPath: "polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)" }}>
                <div className="font-bold text-[#69BFB7] mb-1 text-[10px] uppercase tracking-wider">REGISTRO DE COMUNICACIONES SATELITALES</div>
                <p className="leading-relaxed">
                  Este canal consume las notificaciones de expediciones autorizadas para el usuario y rol de la sesion actual.
                </p>
              </div>
            </div>
          )}
        </div>
      </MissionStack>
    </MissionShell>
  );
}

function ProfileField({
  label,
  value,
  accent = false,
  status = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  status?: boolean;
}) {
  return (
    <div className="border-l-2 border-[#69BFB7]/40 pl-3">
      <span className="text-[10px] uppercase font-bold text-[#69BFB7] tracking-wider block mb-1">
        {label}
      </span>
      <span
        className={`text-sm font-semibold truncate block ${
          status ? "text-emerald-400 font-mono text-[13px]" : accent ? "text-[#69BFB7] font-mono" : "text-[#f0fafa]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
