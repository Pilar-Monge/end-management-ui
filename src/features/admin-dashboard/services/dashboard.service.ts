import { apiRequest } from '../../../shared/services/httpClient'
import type { ExpeditionsDashboardPayload, GeneralDashboardPayload, InventoryDashboardPayload } from './types'

export async function getGeneralDashboard(): Promise<GeneralDashboardPayload> {
  return apiRequest<GeneralDashboardPayload>('/dashboard/general')
}

export async function getInventoryDashboard(): Promise<InventoryDashboardPayload> {
  return apiRequest<InventoryDashboardPayload>('/dashboard/inventory')
}

export async function getExpeditionsDashboard(): Promise<ExpeditionsDashboardPayload> {
  return apiRequest<ExpeditionsDashboardPayload>('/dashboard/expeditions')
}

export async function getServerTime(): Promise<{ serverTime: string }> {
  return apiRequest<{ serverTime: string }>('/system/time')
}
