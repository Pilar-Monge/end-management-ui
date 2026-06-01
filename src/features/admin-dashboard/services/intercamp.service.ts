import { ApiHttpError, apiRequest } from '../../../shared/services/httpClient'
import type { IntercampRecord } from './types'

type IntercampDecision = 'APPROVED' | 'REJECTED' | 'PENDING' | 'CONFIRMED'

const INTERCAMP_ENDPOINT_KEY = 'admin_dashboard_intercamp_endpoint'
const INTERCAMP_ENDPOINT_ATTEMPTS = [
  '/intercamp-requests',
  '/inter-camp-requests',
  '/transfers',
  '/transfer-history',
] as const

let cachedIntercampEndpoint: string | null = null

function readCachedIntercampEndpoint(): string | null {
  if (cachedIntercampEndpoint) return cachedIntercampEndpoint
  if (typeof window === 'undefined') return null

  const stored = window.localStorage.getItem(INTERCAMP_ENDPOINT_KEY)
  if (stored && INTERCAMP_ENDPOINT_ATTEMPTS.includes(stored as (typeof INTERCAMP_ENDPOINT_ATTEMPTS)[number])) {
    cachedIntercampEndpoint = stored
    return stored
  }

  return null
}

function rememberIntercampEndpoint(path: string): void {
  cachedIntercampEndpoint = path
  if (typeof window === 'undefined') return
  window.localStorage.setItem(INTERCAMP_ENDPOINT_KEY, path)
}

function getIntercampAttempts(): string[] {
  const cached = readCachedIntercampEndpoint()
  if (!cached) return [...INTERCAMP_ENDPOINT_ATTEMPTS]
  return [cached, ...INTERCAMP_ENDPOINT_ATTEMPTS.filter((path) => path !== cached)]
}

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
  const attempts = getIntercampAttempts()

  let lastError: unknown = null

  for (const path of attempts) {
    try {
      const payload = await apiRequest<unknown>(path)
      const extracted = extractIntercampList(payload)
      if (extracted.length > 0) {
        rememberIntercampEndpoint(path)
        return extracted
      }
    } catch (error) {
      if (error instanceof ApiHttpError && [400, 401, 403, 404].includes(error.statusCode)) {
        lastError = error
        continue
      }
      throw error
    }
  }

  if (lastError instanceof ApiHttpError && lastError.statusCode === 401) {
    throw lastError
  }

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
