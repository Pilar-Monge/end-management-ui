import { ApiHttpError, apiRequest } from '../../../shared/services/httpClient'
import type { AdminExpeditionRecord } from './types'

export async function listActiveExpeditions(): Promise<AdminExpeditionRecord[]> {
  try {
    return await apiRequest<AdminExpeditionRecord[]>('/expeditions/active')
  } catch (error) {
    if (!(error instanceof ApiHttpError) || error.statusCode !== 404) {
      throw error
    }
  }

  return apiRequest<AdminExpeditionRecord[]>('/explorations/active')
}

export async function completeExpedition(id: number): Promise<AdminExpeditionRecord> {
  try {
    return await apiRequest<AdminExpeditionRecord>(`/expeditions/${id}/complete`, {
      method: 'POST',
    })
  } catch (error) {
    if (!(error instanceof ApiHttpError) || error.statusCode !== 404) {
      throw error
    }
  }

  return apiRequest<AdminExpeditionRecord>(`/explorations/${id}/complete`, {
    method: 'POST',
  })
}

export async function assignExpeditionParticipants(
  expeditionId: number,
  participantIds: number[],
): Promise<AdminExpeditionRecord> {
  const body = JSON.stringify({ participantIds })
  try {
    return await apiRequest<AdminExpeditionRecord>(`/expeditions/${expeditionId}/participants`, {
      method: 'POST',
      body,
    })
  } catch (error) {
    if (!(error instanceof ApiHttpError) || error.statusCode !== 404) {
      throw error
    }
  }

  return apiRequest<AdminExpeditionRecord>(`/explorations/${expeditionId}/participants`, {
    method: 'POST',
    body,
  })
}
