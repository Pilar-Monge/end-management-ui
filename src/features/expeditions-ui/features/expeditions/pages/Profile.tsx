import { useState, useEffect } from "react";
import { MissionShell, MissionStack } from "../components/SharedLayout";
import {
  Mail,
  Shield,
  CheckCircle,
  Bell,
  Eye,
  Trash2,
  Calendar,
  AlertTriangle,
  Package,
  CloudLightning
} from "lucide-react";

interface SystemNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  campId?: number;
  userId?: number;
  createdAt: string;
}

const MOCK_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 1,
    title: "Expedición Finalizada",
    message: "La escuadra de exploración Alpha regresó con éxito al Campamento Base con raciones recolectadas.",
    type: "EXPEDITION_RETURN",
    isRead: false,
    createdAt: "2026-06-08T10:30:00Z",
  },
  {
    id: 2,
    title: "Alerta de Recursos Críticos",
    message: "Las reservas de agua potable en el Campamento Delta han bajado del umbral mínimo de seguridad.",
    type: "LOW_RESOURCES",
    isRead: false,
    createdAt: "2026-06-08T08:15:00Z",
  },
  {
    id: 3,
    title: "Incursión Hostil Detectada",
    message: "Los radares de movimiento informan de firmas calóricas desconocidas aproximándose al Sector Norte.",
    type: "CAMP_ATTACK",
    isRead: true,
    createdAt: "2026-06-07T21:45:00Z",
  },
  {
    id: 4,
    title: "Tormenta de Ceniza Aproximándose",
    message: "Se prevé una tormenta ácida que afectará las comunicaciones satelitales durante las próximas 12 horas.",
    type: "WEATHER_WARNING",
    isRead: true,
    createdAt: "2026-06-07T14:20:00Z",
  }
];

export function ProfileView() {
  const [activeTab, setActiveTab] = useState<"info" | "notifications">("info");
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState(false);

  const profile = {
    fullName: "Pilar Monge",
    email: "pilarmongeu@gmail.com",
    username: "pilarmongeu",
    role: "Comandante de Operaciones",
    status: "Activo / Verificado",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
  };

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("token");
    
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch("/api/notifications", {
        method: "GET",
        headers,
      });
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setNotifications(data);
          setIsMockMode(false);
        } else {
          throw new Error("Formato de respuesta inválido");
        }
      } else {
        throw new Error(`Error HTTP ${response.status}`);
      }
    } catch (err: any) {
      console.warn("Backend notification fetch failed, using mock data:", err);
      // Use local mock notifications if none loaded/active
      setNotifications((prev) => (prev.length > 0 ? prev : MOCK_NOTIFICATIONS));
      setIsMockMode(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: number) => {
    const token = localStorage.getItem("token");
    
    if (!isMockMode) {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        
        await fetch(`/api/notifications/${id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ isRead: true })
        });
      } catch (err) {
        console.error("Failed to mark notification as read on backend:", err);
      }
    }
    
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleDeleteNotification = async (id: number) => {
    const token = localStorage.getItem("token");
    
    if (!isMockMode) {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        
        await fetch(`/api/notifications/${id}`, {
          method: "DELETE",
          headers
        });
      } catch (err) {
        console.error("Failed to delete notification on backend:", err);
      }
    }
    
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const pad = (num: number) => String(num).padStart(2, "0");
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hours = pad(d.getHours());
      const minutes = pad(d.getMinutes());
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch {
      return dateStr;
    }
  };

  const getNotificationTypeConfig = (type: string) => {
    switch (type) {
      case "EXPEDITION_RETURN":
        return {
          translatedName: "Expedición finalizada",
          icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
          borderClass: "border-emerald-500/20",
          bgClass: "bg-emerald-950/20",
          tagBorderClass: "border-emerald-500/30 bg-emerald-950/30",
          tagTextClass: "text-emerald-400"
        };
      case "LOW_RESOURCES":
        return {
          translatedName: "Alerta de recursos",
          icon: <Package className="w-4 h-4 text-amber-400" />,
          borderClass: "border-amber-500/20",
          bgClass: "bg-amber-950/20",
          tagBorderClass: "border-amber-500/30 bg-amber-950/30",
          tagTextClass: "text-amber-400"
        };
      case "CAMP_ATTACK":
        return {
          translatedName: "Incursión detectada",
          icon: <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />,
          borderClass: "border-red-500/20",
          bgClass: "bg-red-950/20",
          tagBorderClass: "border-red-500/30 bg-red-950/30",
          tagTextClass: "text-red-400"
        };
      case "WEATHER_WARNING":
        return {
          translatedName: "Alerta climática",
          icon: <CloudLightning className="w-4 h-4 text-cyan-400" />,
          borderClass: "border-cyan-500/20",
          bgClass: "bg-cyan-950/20",
          tagBorderClass: "border-cyan-500/30 bg-cyan-950/30",
          tagTextClass: "text-cyan-400"
        };
      default:
        return {
          translatedName: "Aviso del sistema",
          icon: <Bell className="w-4 h-4 text-[#69BFB7]" />,
          borderClass: "border-[#67ACA9]/20",
          bgClass: "bg-black/30",
          tagBorderClass: "border-[#67ACA9]/30 bg-black/40",
          tagTextClass: "text-[#69BFB7]"
        };
    }
  };

  return (
    <MissionShell kicker="Identificación de Red" title="Mi Perfil">
      <MissionStack>
        {/* Selector de Pestañas tácticas */}
        <div className="mission-tabs mb-6 flex gap-2">
          <button
            id="profile-tab-info"
            className={activeTab === "info" ? "is-active" : ""}
            onClick={() => setActiveTab("info")}
          >
            INFORMACIÓN PERSONAL
          </button>
          <button
            id="profile-tab-notifications"
            className={activeTab === "notifications" ? "is-active" : ""}
            onClick={() => setActiveTab("notifications")}
          >
            NOTIFICACIONES ({unreadCount})
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card Izquierda - Resumen Visual */}
          <div className="v-person-card flex flex-col items-center justify-between p-6">
            <div className="w-full flex flex-col items-center">
              <div 
                className="v-person-photo-wrap mb-4" 
                style={{ width: "120px", height: "120px", borderRadius: "50%", overflow: "hidden" }}
              >
                <img 
                  src={profile.avatarUrl} 
                  alt={profile.fullName} 
                  className="v-person-photo w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
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
                SISTEMA PROTEGIDO / LECTURA ÚNICA
              </span>
            </div>
          </div>

          {/* Card Derecha - Detalles del perfil en modo lectura o Notificaciones */}
          {activeTab === "info" ? (
            <div className="lg:col-span-2 mission-card flex flex-col justify-between">
              <div>
                <div className="mission-card-title border-b border-[#67ACA9]/20 pb-2 mb-4 flex items-center justify-between">
                  <span>DATOS PERSONALES DEL USUARIO</span>
                  <span className="text-[9px] text-[#69BFB7] tracking-widest font-mono uppercase">MÓDULO DE ACCESO ENCRIPTADO</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-6 py-2">
                  <div className="border-l-2 border-[#69BFB7]/40 pl-3">
                    <span className="text-[10px] uppercase font-bold text-[#69BFB7] tracking-wider block mb-1">
                      Nombre Completo
                    </span>
                    <span className="text-sm font-semibold text-[#f0fafa]">{profile.fullName}</span>
                  </div>

                  <div className="border-l-2 border-[#69BFB7]/40 pl-3">
                    <span className="text-[10px] uppercase font-bold text-[#69BFB7] tracking-wider block mb-1">
                      Correo Electrónico
                    </span>
                    <span className="text-sm font-semibold text-[#f0fafa] truncate block">{profile.email}</span>
                  </div>

                  <div className="border-l-2 border-[#69BFB7]/40 pl-3">
                    <span className="text-[10px] uppercase font-bold text-[#69BFB7] tracking-wider block mb-1">
                      Nombre de Usuario
                    </span>
                    <span className="text-sm font-semibold text-[#69BFB7] font-mono">@{profile.username}</span>
                  </div>

                  <div className="border-l-2 border-[#69BFB7]/40 pl-3">
                    <span className="text-[10px] uppercase font-bold text-[#69BFB7] tracking-wider block mb-1">
                      Rol Actual
                    </span>
                    <span className="text-sm font-semibold text-[#f0fafa]">{profile.role}</span>
                  </div>

                  <div className="border-l-2 border-[#69BFB7]/40 pl-3">
                    <span className="text-[10px] uppercase font-bold text-[#69BFB7] tracking-wider block mb-1">
                      Estado de la Cuenta
                    </span>
                    <span className="text-sm font-bold text-emerald-400 font-mono text-[13px]">{profile.status}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 border border-[#67ACA9]/20 bg-[#041515] rounded-sm text-xs text-[#A4C2C5]/70" style={{ clipPath: "polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)" }}>
                <div className="font-bold text-[#69BFB7] mb-1 text-[10px] uppercase tracking-wider">BITÁCORA DE CONTROL OPERATIVO</div>
                <p className="leading-relaxed">
                  Este terminal está reservado para oficiales de rango <strong className="text-[#69BFB7]">Comandante</strong>. Los registros de acceso e información confidencial están firmados digitalmente. Por motivos de seguridad de la Red de Operaciones, estas credenciales no se pueden modificar directamente desde esta interfaz satelital.
                </p>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2 mission-card flex flex-col justify-between">
              <div>
                <div className="mission-card-title border-b border-[#67ACA9]/20 pb-2 mb-4 flex items-center justify-between">
                  <span>CENTRO DE MENSAJES Y ALERTAS</span>
                  <span className="text-[9px] text-[#69BFB7] tracking-widest font-mono uppercase">CANAL ENCRIPTADO DE RECEPCIÓN</span>
                </div>

                {loading ? (
                  <div className="p-8 text-center text-xs font-mono text-[#69BFB7] animate-pulse">
                    CONECTANDO CON EL SATÉLITE OPERATIVO...
                  </div>
                ) : error ? (
                  <div className="p-6 border border-red-500/30 bg-red-950/20 rounded-sm text-center text-xs font-mono text-red-200">
                    ⚠️ ERROR DE ENLACE: {error}. MODO DE EMERGENCIA ACTIVO.
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs font-mono text-[#A4C2C5]/40 border border-[#67ACA9]/10 rounded-sm">
                    NO HAY NOTIFICACIONES REGISTRADAS EN LA RED.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
                    {notifications.map((n) => {
                      const typeConfig = getNotificationTypeConfig(n.type);
                      const formattedDate = formatDate(n.createdAt);

                      return (
                        <div
                          key={n.id}
                          id={`notification-${n.id}`}
                          className={`p-3 border transition-all relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                            n.isRead
                              ? "bg-black/10 border-[#67ACA9]/10 text-[#A4C2C5]/50"
                              : "bg-[#67ACA9]/5 border-[#69BFB7]/30 text-[#f0fafa] shadow-[0_0_8px_rgba(105,191,183,0.05)]"
                          }`}
                        >
                          {!n.isRead && (
                            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#69BFB7]" />
                          )}

                          <div className="flex items-start gap-3 pl-1 max-w-full sm:max-w-[70%]">
                            <div className={`p-1.5 rounded-sm border shrink-0 ${typeConfig.borderClass} ${typeConfig.bgClass}`}>
                              {typeConfig.icon}
                            </div>

                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className={`text-xs uppercase tracking-wider font-bold ${n.isRead ? "text-[#A4C2C5]/70" : "text-[#f0fafa]"}`}>
                                  {n.title}
                                </h4>
                                <span className={`text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 border shrink-0 ${typeConfig.tagBorderClass} ${typeConfig.tagTextClass}`}>
                                  {typeConfig.translatedName}
                                </span>
                              </div>
                              <p className="text-[11px] leading-relaxed mt-1 text-[#A4C2C5]/85 break-words">
                                {n.message}
                              </p>
                              <span className="text-[9px] font-mono text-[#A4C2C5]/40 mt-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-[#69BFB7]/40" />
                                {formattedDate}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 sm:self-center self-end shrink-0">
                            {!n.isRead && (
                              <button
                                id={`read-btn-${n.id}`}
                                onClick={() => handleMarkAsRead(n.id)}
                                className="font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-1 bg-[#0a1f1e] border border-[#69BFB7]/45 hover:bg-[#69BFB7]/15 hover:border-[#69BFB7] text-[#69BFB7] hover:text-[#f0fafa] transition-all flex items-center gap-1"
                                title="Marcar como leído"
                              >
                                <Eye className="w-3 h-3" />
                                Procesar
                              </button>
                            )}
                            <button
                              id={`delete-btn-${n.id}`}
                              onClick={() => handleDeleteNotification(n.id)}
                              className="font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-1 bg-black/40 border border-red-500/20 hover:bg-red-950/40 hover:border-red-500 hover:text-red-300 text-red-400/80 transition-all flex items-center gap-1"
                              title="Eliminar notificación"
                            >
                              <Trash2 className="w-3 h-3" />
                              Eliminar
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
                  Este terminal muestra alertas del sistema, cambios de estado de expediciones y solicitudes de recursos. Recuerde marcar como leídas las notificaciones procesadas para optimizar el ancho de banda del canal.
                </p>
              </div>
            </div>
          )}
        </div>
      </MissionStack>
    </MissionShell>
  );
}
