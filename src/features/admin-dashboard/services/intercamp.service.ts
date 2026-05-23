import { ApiHttpError, apiRequest } from '../../../shared/services/httpClient'
import type { IntercampRecord } from './types'

type IntercampDecision = 'APPROVED' | 'REJECTED' | 'PENDING' | 'CONFIRMED'

export async function listIntercampRequests(): Promise<IntercampRecord[]> {
  return apiRequest<IntercampRecord[]>('/intercamp-requests')
}

export async function updateIntercampRequestStatus(id: number, status: IntercampDecision): Promise<IntercampRecord> {
  try {
    return await apiRequest<IntercampRecord>(`/intercamp-requests/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
  } catch (error) {
    if (!(error instanceof ApiHttpError) || (error.statusCode !== 404 && error.statusCode !== 400)) {
      throw error
    }
  }

  return apiRequest<IntercampRecord>(`/intercamp-requests/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}

export async function getIntercampRequestById(id: number): Promise<IntercampRecord> {
  return apiRequest<IntercampRecord>(`/intercamp-requests/${id}`)
}

export async function getTransferById(id: number): Promise<IntercampRecord> {
  return apiRequest<IntercampRecord>(`/transfers/${id}`)
}

export async function getTransferHistoryById(id: number): Promise<IntercampRecord> {
  return apiRequest<IntercampRecord>(`/transfer-history/${id}`)
}

export async function getTransferPersonById(id: number): Promise<IntercampRecord> {
  return apiRequest<IntercampRecord>(`/transfer-persons/${id}`)
}

export async function getDeliveredTransferResourceById(id: number): Promise<IntercampRecord> {
  return apiRequest<IntercampRecord>(`/delivered-transfer-resources/${id}`)
}
