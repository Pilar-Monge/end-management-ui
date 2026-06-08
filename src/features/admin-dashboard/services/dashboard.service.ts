import { apiRequest } from '../../../shared/services/httpClient'
import type { ExpeditionsDashboardPayload, GeneralDashboardPayload, InventoryDashboardPayload } from './types'

export type SystemTimeUnit = 'minutes' | 'hours'

export interface SystemTimeOffset {
  offsetMilliseconds: number
  currentSystemTime?: string
  lastModifiedAt?: string
}

export interface AdvanceSystemTimePayload {
  unit: SystemTimeUnit
  amount: number
}

export interface AdvanceSystemTimeResult {
  offsetMilliseconds: number
  currentSystemTime: string
  lastModifiedAt: string
  message: string
  automations: string[]
}

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

export async function getSystemTimeOffset(): Promise<SystemTimeOffset> {
  return apiRequest<SystemTimeOffset>('/system/time/offset')
}

export async function advanceSystemTime(payload: AdvanceSystemTimePayload): Promise<AdvanceSystemTimeResult> {
  return apiRequest<AdvanceSystemTimeResult>('/system/time/advance', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
