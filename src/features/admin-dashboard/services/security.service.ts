import { apiRequest } from '../../../shared/services/httpClient'
import type { AuditRecord, InventoryMovementRecord } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function listFromPayload(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter(isRecord)
  if (!isRecord(payload)) return []

  for (const key of ['data', 'items', 'records', 'results', 'movements', 'inventoryMovements']) {
    const value = payload[key]
    if (Array.isArray(value)) return value.filter(isRecord)
  }

  return []
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

export async function listInventoryMovements(): Promise<InventoryMovementRecord[]> {
  const payload = await apiRequest<unknown>('/inventory-movements?page=1&limit=100')
  return listFromPayload(payload).map((item, index) => {
    const resourceType = isRecord(item.resourceType) ? item.resourceType : null
    const resource = isRecord(item.resource) ? item.resource : null

    return {
      id: numberValue(item.id) ?? index + 1,
      resourceTypeId: numberValue(item.resourceTypeId ?? item.resourceId ?? resourceType?.id ?? resource?.id),
      resourceTypeName: stringValue(item.resourceTypeName ?? resourceType?.name),
      resourceName: stringValue(item.resourceName ?? item.name ?? resource?.name),
      resource: stringValue(item.resource),
      quantity: numberValue(item.quantity),
      amount: numberValue(item.amount ?? item.value),
      movementType: stringValue(item.movementType),
      type: stringValue(item.type ?? item.direction),
      reason: stringValue(item.reason),
      description: stringValue(item.description ?? item.comment ?? item.note),
      createdAt: stringValue(item.createdAt ?? item.created_at),
      date: stringValue(item.date ?? item.time),
    }
  })
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
