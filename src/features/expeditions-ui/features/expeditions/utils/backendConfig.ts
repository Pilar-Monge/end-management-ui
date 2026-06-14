import {
  getCamp,
  getCurrentExpeditionUser,
  listMapExpeditions,
  type ExpeditionMapRecord,
} from "../../../services/expeditionsUi.service";

export interface APIExpedition extends ExpeditionMapRecord {}

export interface APICamp {
  id: string;
  name: string;
  lat: number;
  lng: number;
  label?: string;
}

export interface ActiveCampSession {
  campId: number;
  campName: string;
  lat: number;
  lng: number;
  label: string;
}

export const CAMP_COORDINATES: Record<number, ActiveCampSession> = {
  1: { campId: 1, campName: "Alpha Bunker", lat: 39.8283, lng: -98.5795, label: "Alpha Bunker [USA]" },
  2: { campId: 2, campName: "Sierra Base", lat: 52.52, lng: 13.405, label: "Sierra Base [Berlin]" },
  3: { campId: 3, campName: "Delta Refuge", lat: -34.6037, lng: -58.3816, label: "Delta Refuge [Buenos Aires]" },
  4: { campId: 4, campName: "Omega Fortress", lat: 35.6762, lng: 139.6503, label: "Omega Fortress [Tokio]" },
  5: { campId: 5, campName: "Echo Outpost", lat: -22.5621, lng: 17.0658, label: "Echo Outpost [Namibia]" },
};

export const SurvivalApiService = {
  async getExpeditions(localFallback: APIExpedition[]): Promise<APIExpedition[]> {
    try {
      return await listMapExpeditions();
    } catch (error) {
      console.warn("No se pudieron cargar expediciones reales, usando respaldo visual:", error);
      return localFallback;
    }
  },

  async getCamps(localCampsFallback: APICamp[]): Promise<APICamp[]> {
    try {
      const user = await getCurrentExpeditionUser();
      const camp = await getCamp(user.campId);
      return [{ id: String(camp.id), name: camp.name, lat: camp.lat, lng: camp.lng, label: camp.label }];
    } catch (error) {
      console.warn("No se pudo cargar campamento real, usando respaldo visual:", error);
      return localCampsFallback;
    }
  },
};

export function getFallbackActiveCamp(campId = 1): ActiveCampSession {
  return CAMP_COORDINATES[campId] ?? CAMP_COORDINATES[1]!;
}

export async function getActiveCamp(fallbackCampId = 1): Promise<ActiveCampSession> {
  try {
    const user = await getCurrentExpeditionUser();
    const camp = await getCamp(user.campId);
    return {
      campId: camp.id,
      campName: camp.name,
      lat: camp.lat || getFallbackActiveCamp(user.campId).lat,
      lng: camp.lng || getFallbackActiveCamp(user.campId).lng,
      label: camp.label,
    };
  } catch (error) {
    console.warn("No se pudo resolver campamento activo desde backend:", error);
    return getFallbackActiveCamp(fallbackCampId);
  }
}
