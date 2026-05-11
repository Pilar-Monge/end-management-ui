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
  quantity?: number
  currentAmount?: number
  updatedAt?: string
  lastUpdate?: string
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
    quantity: data.quantity ?? data.currentAmount ?? 0,
    updatedAt: data.updatedAt ?? data.lastUpdate,
  }
}

export async function deleteCampInventory(campId: number, resourceTypeId: number): Promise<void> {
  await apiRequest<void>(`/camp-inventory/${campId}/${resourceTypeId}`, {
    method: 'DELETE',
  })
}
