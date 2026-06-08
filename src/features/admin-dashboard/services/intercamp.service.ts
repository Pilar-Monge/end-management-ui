import { ApiHttpError, apiRequest } from '../../../shared/services/httpClient'
import type { AdminTransferRecord, IntercampRecord } from './types'

type IntercampDecision = 'APPROVED' | 'REJECTED' | 'PENDING' | 'CONFIRMED'

function isIntercampRecord(value: unknown): value is IntercampRecord {
  return Boolean(value && typeof value === 'object' && 'id' in (value as Record<string, unknown>))
}

function extractIntercampList(payload: unknown): IntercampRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter(isIntercampRecord)
  }

  if (!payload || typeof payload !== 'object') return []

  const objectPayload = payload as Record<string, unknown>
  const candidates = [
    objectPayload.items,
    objectPayload.records,
    objectPayload.requests,
    objectPayload.results,
    objectPayload.data,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isIntercampRecord)
    }
  }

  for (const value of Object.values(objectPayload)) {
    const extracted = extractIntercampList(value)
    if (extracted.length > 0) return extracted
  }

  return []
}

export async function listIntercampRequests(): Promise<IntercampRecord[]> {
  const payload = await apiRequest<unknown>('/intercamp-requests?page=1&limit=100')
  return extractIntercampList(payload)
}

export async function listTransfers(): Promise<AdminTransferRecord[]> {
  return []
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
