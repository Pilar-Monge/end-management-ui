import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import type { Camp, CampWithStats, CampsStats, CampResourceItem, ApiError } from '../types'
import { campsKeys, ENDPOINTS } from './keys'

const getToken = () => localStorage.getItem('token')

function buildHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  }
}
export async function fetchCamps(): Promise<Camp[]> {
  const res = await fetch(ENDPOINTS.camps, { headers: buildHeaders() })
  if (!res.ok) throw new Error('Failed to fetch camps')
  return res.json()
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
  const res = await fetch(`${ENDPOINTS.camps}/${id}`, { headers: buildHeaders() })
  if (!res.ok) throw new Error('Failed to fetch camp')
  return res.json()
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
  const res = await fetch(ENDPOINTS.campStats, { headers: buildHeaders() })
  if (!res.ok) throw new Error('Failed to fetch camp stats')
  return res.json()
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
  const res = await fetch(`${ENDPOINTS.campResources}?campId=${campId}`, { headers: buildHeaders() })
  if (!res.ok) throw new Error('Failed to fetch camp resources')
  return res.json()
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
