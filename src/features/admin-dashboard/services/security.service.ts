import { apiRequest } from '../../../shared/services/httpClient'
import type { AuditRecord, InventoryMovementRecord } from './types'

export async function listInventoryMovements(): Promise<InventoryMovementRecord[]> {
  return apiRequest<InventoryMovementRecord[]>('/inventory-movements')
}

export async function getInventoryMovementById(id: number): Promise<AuditRecord> {
  return apiRequest<AuditRecord>(`/inventory-movements/${id}`)
}

export async function getNotificationById(id: number): Promise<AuditRecord> {
  return apiRequest<AuditRecord>(`/notifications/${id}`)
}

export async function getPersonStatusHistoryById(id: number): Promise<AuditRecord> {
  return apiRequest<AuditRecord>(`/person-status-history/${id}`)
}

export async function getUserRoleHistoryById(id: number): Promise<AuditRecord> {
  return apiRequest<AuditRecord>(`/user-role-history/${id}`)
}
