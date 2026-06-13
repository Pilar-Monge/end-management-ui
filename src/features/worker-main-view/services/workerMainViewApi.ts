import type {
  CurrentUserProfile,
  PaginationInfo,
  WorkerAutoAssignmentResult,
  WorkerDailyCollectionRecord,
  WorkerNotification,
  WorkerOccupation,
  WorkerOccupationAtRisk,
  WorkerOccupationCoverage,
  WorkerReplacementSuggestion,
} from '../types'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
  }
}

export class WorkerApiError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'WorkerApiError'
    this.statusCode = statusCode
  }
}

function buildQuery(params: Record<string, string | number | boolean | null | undefined>): string {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.set(key, String(value))
  })
  const queryString = query.toString()
  return queryString ? `?${queryString}` : ''
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...getHeaders(),
      ...(init?.headers || {}),
    },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message || payload?.error || response.statusText || 'No se pudieron cargar los datos'
    throw new WorkerApiError(response.status, message)
  }

  return payload as T
}

export async function fetchCurrentUserProfile(): Promise<CurrentUserProfile> {
  const payload = await requestJson<{ success: boolean; data: CurrentUserProfile }>(`/users/me`, {
    method: 'GET',
  })

  return payload.data
}

export async function fetchWorkerNotifications(params: {
  targetRole?: string
  type?: string
  read?: boolean | null
  page?: number
  limit?: number
}): Promise<{ items: WorkerNotification[]; pagination: PaginationInfo | null }> {
  const payload = await requestJson<{
    success: boolean
    data: WorkerNotification[]
    pagination?: PaginationInfo
  }>(`/notifications${buildQuery(params)}`, {
    method: 'GET',
  })

  return {
    items: payload.data,
    pagination: payload.pagination || null,
  }
}

export async function fetchWorkerNotificationById(id: number): Promise<WorkerNotification> {
  const payload = await requestJson<{ success: boolean; data: WorkerNotification }>(`/notifications/${id}`, {
    method: 'GET',
  })

  return payload.data
}

export async function updateWorkerNotificationReadState(
  id: number,
  read: boolean,
): Promise<{ notification: WorkerNotification; message: string }> {
  const payload = await requestJson<{ success: boolean; data: WorkerNotification; message: string }>(
    `/notifications/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify({ read }),
    },
  )

  return { notification: payload.data, message: payload.message }
}

export async function fetchWorkerOccupations(params: {
  collectsResources?: boolean | null
  participatesInExpeditions?: boolean | null
  resourceTypeId?: number | null
  page?: number
  limit?: number
}): Promise<{ items: WorkerOccupation[]; pagination: PaginationInfo | null }> {
  const payload = await requestJson<{
    success: boolean
    data: WorkerOccupation[]
    pagination?: PaginationInfo
  }>(`/occupations${buildQuery(params)}`, {
    method: 'GET',
  })

  return {
    items: payload.data,
    pagination: payload.pagination || null,
  }
}

export async function fetchWorkerOccupationById(id: number): Promise<WorkerOccupation> {
  const payload = await requestJson<{ success: boolean; data: WorkerOccupation }>(`/occupations/${id}`, {
    method: 'GET',
  })

  return payload.data
}

export async function fetchWorkerOccupationCoverage(campId: number): Promise<WorkerOccupationCoverage[]> {
  const payload = await requestJson<{ success: boolean; data: WorkerOccupationCoverage[] }>(
    `/occupation-coverage/${campId}/coverage`,
    { method: 'GET' },
  )

  return payload.data
}

export async function fetchWorkerOccupationCoverageByOccupation(
  campId: number,
  occupationId: number,
): Promise<WorkerOccupationCoverage> {
  const payload = await requestJson<{ success: boolean; data: WorkerOccupationCoverage }>(
    `/occupation-coverage/${campId}/coverage/${occupationId}`,
    { method: 'GET' },
  )

  return payload.data
}

export async function fetchWorkerCriticalCoverage(campId: number): Promise<WorkerOccupationCoverage[]> {
  const payload = await requestJson<{ success: boolean; data: WorkerOccupationCoverage[] }>(
    `/occupation-coverage/${campId}/critical`,
    { method: 'GET' },
  )

  return payload.data
}

export async function fetchWorkerAtRiskCoverage(campId: number): Promise<WorkerOccupationAtRisk[]> {
  const payload = await requestJson<{ success: boolean; data: WorkerOccupationAtRisk[] }>(
    `/occupation-coverage/${campId}/at-risk`,
    { method: 'GET' },
  )

  return payload.data
}

export async function fetchWorkerCoverageSuggestions(
  campId: number,
  occupationId: number,
): Promise<WorkerReplacementSuggestion[]> {
  const payload = await requestJson<{ success: boolean; data: WorkerReplacementSuggestion[] }>(
    `/occupation-coverage/${campId}/suggestions/${occupationId}`,
    { method: 'GET' },
  )

  return payload.data
}

export async function autoAssignWorkerCoverage(
  campId: number,
  occupationId: number,
): Promise<WorkerAutoAssignmentResult> {
  const payload = await requestJson<{ success: boolean; data: WorkerAutoAssignmentResult }>(
    `/occupation-coverage/${campId}/auto-assign/${occupationId}`,
    { method: 'POST' },
  )

  return payload.data
}

export async function fetchWorkerDailyCollectionRecord(
  id: number,
): Promise<WorkerDailyCollectionRecord> {
  const payload = await requestJson<{ success: boolean; data: WorkerDailyCollectionRecord }>(
    `/daily-collection-records/${id}`,
    { method: 'GET' },
  )

  return payload.data
}
