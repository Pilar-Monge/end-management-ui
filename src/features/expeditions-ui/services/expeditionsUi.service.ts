import { ApiHttpError, apiRequest } from '../../../shared/services/httpClient'
import type { AdminExpeditionRecord } from '../../admin-dashboard/services/types'

export interface CreateExpeditionCommand {
  name: string
  objective: string
  campId: number
  destinationDescription: string
  destinationLatitude?: number
  destinationLongitude?: number
  plannedDepartureDate: string
  plannedReturnDate: string
  participantIds: number[]
}

export async function createExpedition(
  payload: CreateExpeditionCommand,
): Promise<AdminExpeditionRecord> {
  const body = JSON.stringify(payload)

  try {
    return await apiRequest<AdminExpeditionRecord>('/expeditions', {
      method: 'POST',
      body,
    })
  } catch (error) {
    if (!(error instanceof ApiHttpError) || error.statusCode !== 404) {
      throw error
    }
  }

  return apiRequest<AdminExpeditionRecord>('/explorations', {
    method: 'POST',
    body,
  })
}
