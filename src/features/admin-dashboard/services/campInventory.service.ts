import { apiRequest } from '../../../shared/services/httpClient'
import type { CampInventoryEntry } from './types'

interface CampInventoryMutationPayload {
  campId: number
  resourceTypeId: number
  quantity: number
}

interface CampInventoryEntryResponse {
  campId: number
  resourceTypeId: number
  resourceTypeKey?: string
  resourceTypeName?: string
  quantity?: number
  currentAmount?: number
  updatedAt?: string
  lastUpdate?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function listFromPayload(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter(isRecord)
  if (!isRecord(payload)) return []

  for (const key of ['data', 'items', 'records', 'results', 'inventory', 'campInventory']) {
    const value = payload[key]
    if (Array.isArray(value)) return value.filter(isRecord)
  }

  return []
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function childRecord(source: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = source[key]
  return isRecord(value) ? value : null
}

export async function listCampInventoryEntries(): Promise<CampInventoryEntry[]> {
  const payload = await apiRequest<unknown>('/camp-inventory?page=1&limit=100')
  return listFromPayload(payload).map((item) => {
    const resourceType = childRecord(item, 'resourceType')
    const resource = childRecord(item, 'resource')
    const rawResourceTypeId = item.resourceTypeId ?? item.resourceId ?? resourceType?.id ?? resource?.id

    return {
      campId: numberValue(item.campId ?? childRecord(item, 'camp')?.id) ?? 0,
      resourceTypeId: numberValue(rawResourceTypeId) ?? 0,
      resourceTypeKey: stringValue(rawResourceTypeId),
      resourceTypeName: stringValue(item.resourceTypeName ?? item.resourceName ?? resourceType?.name ?? resource?.name),
      quantity: numberValue(item.quantity ?? item.currentAmount ?? item.amount) ?? 0,
      updatedAt: stringValue(item.updatedAt ?? item.lastUpdate),
    }
  })
}

export async function upsertCampInventory(
  payload: CampInventoryMutationPayload,
): Promise<CampInventoryEntry> {
  return apiRequest<CampInventoryEntry>('/camp-inventory', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getCampInventoryEntry(campId: number, resourceTypeId: number): Promise<CampInventoryEntry> {
  const data = await apiRequest<CampInventoryEntryResponse>(`/camp-inventory/${campId}/${resourceTypeId}`)

  return {
    campId: data.campId,
    resourceTypeId: data.resourceTypeId,
    resourceTypeKey: data.resourceTypeKey,
    resourceTypeName: data.resourceTypeName,
    quantity: data.quantity ?? data.currentAmount ?? 0,
    updatedAt: data.updatedAt ?? data.lastUpdate,
  }
}

export async function deleteCampInventory(campId: number, resourceTypeId: number): Promise<void> {
  await apiRequest<void>(`/camp-inventory/${campId}/${resourceTypeId}`, {
    method: 'DELETE',
  })
}
