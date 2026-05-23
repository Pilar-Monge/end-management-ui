import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import type { Camp, CampWithStats, CampsStats, CampResourceItem, ApiError } from '../types'
import { campsKeys, ENDPOINTS } from './keys'

const getToken = () => localStorage.getItem('token')

const getHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken() || ''}`,
})

function unwrapPayload<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

function unwrapList<T>(payload: unknown): T[] {
  const data = unwrapPayload<unknown>(payload)
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object') {
    const objectData = data as Record<string, unknown>
    if (Array.isArray(objectData.items)) return objectData.items as T[]
    if (Array.isArray(objectData.results)) return objectData.results as T[]
  }
  return []
}

export async function fetchCamps(): Promise<Camp[]> {
  const res = await fetch(ENDPOINTS.camps, { headers: getHeaders() })
  if (!res.ok) throw new Error('Failed to fetch camps')
  const payload = await res.json()
  return unwrapList<Camp>(payload)
}

export function useCamps(
  options?: Omit<UseQueryOptions<Camp[], ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Camp[], ApiError>({
    queryKey: campsKeys.list(),
    queryFn: fetchCamps,
    ...options,
  })
}

export async function fetchCampById(id: number): Promise<CampWithStats> {
  const res = await fetch(`${ENDPOINTS.camps}/${id}`, { headers: getHeaders() })
  if (!res.ok) throw new Error('Failed to fetch camp')
  const payload = await res.json()
  return unwrapPayload<CampWithStats>(payload)
}

export function useCampById(
  id: number,
  options?: Omit<UseQueryOptions<CampWithStats, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<CampWithStats, ApiError>({
    queryKey: campsKeys.detail(id),
    queryFn: () => fetchCampById(id),
    ...options,
  })
}

export async function fetchCampStats(): Promise<CampsStats> {
  const res = await fetch(ENDPOINTS.campStats, { headers: getHeaders() })
  if (!res.ok) throw new Error('Failed to fetch camp stats')
  const payload = await res.json()
  return unwrapPayload<CampsStats>(payload)
}

export function useCampStats(
  options?: Omit<UseQueryOptions<CampsStats, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<CampsStats, ApiError>({
    queryKey: campsKeys.stats(),
    queryFn: fetchCampStats,
    ...options,
  })
}

export async function fetchCampResources(campId: number): Promise<CampResourceItem[]> {
  const res = await fetch(`${ENDPOINTS.campResources}?campId=${campId}`, { headers: getHeaders() })
  if (!res.ok) throw new Error('Failed to fetch camp resources')
  const payload = await res.json()
  return unwrapList<CampResourceItem>(payload)
}

export function useCampResources(
  campId: number,
  options?: Omit<UseQueryOptions<CampResourceItem[], ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<CampResourceItem[], ApiError>({
    queryKey: campsKeys.resourcesByCamp(campId),
    queryFn: () => fetchCampResources(campId),
    enabled: !!campId,
    ...options,
  })
}
