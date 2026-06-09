/**
 * CONFIGURACIÓN DE CONEXIÓN CON EL BACKEND TÁCTICO
 *
 * Modifica estas variables para conectar con tu servidor API real.
 */

import { getExpeditions } from "./expeditionsStore";

export const BACKEND_CONFIG = {
  // Cambia a true para activar las peticiones HTTP reales a tu backend
  USE_REAL_BACKEND: false,

  // URL del backend (por ejemplo, http://localhost:5000 o /api de tu proxy)
  API_URL: "http://localhost:3000/api",
};

export interface APIExpedition {
  id: number;
  name: string;
  team: string;
  status: "IN_PROGRESS" | "PLANNED" | "DELAYED" | "COMPLETED" | "LOST";
  time: string;
  start: { lat: number; lng: number; label?: string };
  end: { lat: number; lng: number; label?: string };
  danger: string;
  climate: string;
  resources: string[];
  desc: string;
}

export interface APICamp {
  id: string;
  name: string;
  lat: number;
  lng: number;
  label?: string;
}

/**
 * Servicio API para gestionar la comunicación con el Backend de supervivencia.
 */
export const SurvivalApiService = {
  /**
   * Obtiene la lista de expediciones disponibles.
   * Si USE_REAL_BACKEND está desactivado, retorna los datos locales de respaldo.
   */
  async getExpeditions(localFallback: APIExpedition[]): Promise<APIExpedition[]> {
    if (!BACKEND_CONFIG.USE_REAL_BACKEND) {
      try {
        const stored = getExpeditions();
        if (stored && stored.length > 0) {
          return stored.map((e) => {
            const statusMap: Record<string, "IN_PROGRESS" | "PLANNED" | "DELAYED" | "COMPLETED" | "LOST"> = {
              "PLANIFICADA": "PLANNED",
              "PLANNED": "PLANNED",
              "COMPLETADA": "COMPLETED",
              "COMPLETED": "COMPLETED",
              "CANCELADA": "PLANNED",
              "IN_PROGRESS": "IN_PROGRESS",
              "DELAYED": "DELAYED",
              "LOST": "LOST",
            };
            return {
              id: e.id,
              name: e.name,
              team: e.assignedPersonnelIds && e.assignedPersonnelIds.length > 0 ? `Equipo Asignado` : "Equipo de Exploración",
              status: statusMap[e.status] || "PLANNED",
              time: e.departure.includes(" ") ? e.departure.split(" ")[1] : "08:00",
              start: {
                lat: e.startLat || 9.93,
                lng: e.startLng || -84.08,
                label: e.startLabel || "Base Alfa CR",
              },
              end: {
                lat: e.lat,
                lng: e.lng,
                label: `${e.dest}`,
              },
              danger: e.danger,
              climate: e.climate,
              resources: e.resources.split(",").map((s) => s.trim()),
              desc: e.objective,
            };
          });
        }
      } catch (err) {
        console.error("Error reading stored expeditions in API fallback:", err);
      }
      return localFallback;
    }
    try {
      const response = await fetch(`${BACKEND_CONFIG.API_URL}/expeditions`);
      if (!response.ok) throw new Error("Error en la respuesta del servidor");
      return await response.json();
    } catch (error) {
      console.warn("⚠️ No se pudo conectar al backend real, usando respaldo local:", error);
      return localFallback;
    }
  },

  /**
   * Envía una nueva expedición al backend.
   */
  async createExpedition(expedition: Omit<APIExpedition, "id">): Promise<APIExpedition | null> {
    if (!BACKEND_CONFIG.USE_REAL_BACKEND) {
      console.log("📝 Modo Demo: Guardando localmente en consola", expedition);
      return { ...expedition, id: Date.now() };
    }
    try {
      const response = await fetch(`${BACKEND_CONFIG.API_URL}/expeditions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expedition),
      });
      if (!response.ok) throw new Error("Error al crear expedición");
      return await response.json();
    } catch (error) {
      console.error("❌ Error conectando para crear expedición:", error);
      return null;
    }
  },

  /**
   * Obtiene los campamentos base.
   */
  async getCamps(localCampsFallback: APICamp[]): Promise<APICamp[]> {
    if (!BACKEND_CONFIG.USE_REAL_BACKEND) {
      return localCampsFallback;
    }
    try {
      const response = await fetch(`${BACKEND_CONFIG.API_URL}/camps`);
      if (!response.ok) throw new Error("Error obteniendo campamentos");
      return await response.json();
    } catch (error) {
      console.warn("⚠️ No se pudo obtener campamentos reales, usando respaldo local:", error);
      return localCampsFallback;
    }
  }
};

export interface ActiveCampSession {
  campId: number;
  campName: string;
  lat: number;
  lng: number;
  label: string;
}

// Mapeo de los 5 campamentos reales del backend
export const CAMP_COORDINATES: Record<number, ActiveCampSession> = {
  1: { campId: 1, campName: "Alpha Bunker", lat: 39.8283, lng: -98.5795, label: "Alpha Bunker [USA]" },
  2: { campId: 2, campName: "Sierra Base", lat: 52.52, lng: 13.405, label: "Sierra Base [Berlín]" },
  3: { campId: 3, campName: "Delta Refuge", lat: -34.6037, lng: -58.3816, label: "Delta Refuge [Buenos Aires]" },
  4: { campId: 4, campName: "Omega Fortress", lat: 35.6762, lng: 139.6503, label: "Omega Fortress [Tokio]" },
  5: { campId: 5, campName: "Echo Outpost", lat: -22.5621, lng: 17.0658, label: "Echo Outpost [Namibia]" },
};

// Por ahora retorna campamento 1 (Alpha Bunker) como mock.
// Cuando haya autenticación real, esto leerá el JWT o el contexto de sesión.
export function getActiveCamp(): ActiveCampSession {
  const stored = localStorage.getItem("activeCampId");
  const campId = stored ? parseInt(stored) : 1;
  return CAMP_COORDINATES[campId] ?? CAMP_COORDINATES[1]!;
}
