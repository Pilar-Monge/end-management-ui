import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import type { ApiError, Person, PersonWithStats, PersonsStats } from '../types'
import { ENDPOINTS, personsKeys } from './keys'

const getToken = () => localStorage.getItem('token')

function buildHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  }
}

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

export async function fetchPersons(): Promise<Person[]> {
  const res = await fetch(ENDPOINTS.persons, { headers: buildHeaders() })
  if (!res.ok) throw new Error('Failed to fetch persons')
  const payload = await res.json()
  return unwrapList<Person>(payload)
}

export function usePersons(
  options?: Omit<UseQueryOptions<Person[], ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Person[], ApiError>({
    queryKey: personsKeys.list(),
    queryFn: fetchPersons,
    ...options,
  })
}

export async function fetchPersonById(id: number): Promise<PersonWithStats> {
  const res = await fetch(`${ENDPOINTS.persons}/${id}`, { headers: buildHeaders() })
  if (!res.ok) throw new Error('Failed to fetch person')
  const payload = await res.json()
  return unwrapPayload<PersonWithStats>(payload)
}

export function usePersonById(
  id: number,
  options?: Omit<UseQueryOptions<PersonWithStats, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<PersonWithStats, ApiError>({
    queryKey: personsKeys.detail(id),
    queryFn: () => fetchPersonById(id),
    enabled: !!id,
    ...options,
  })
}

export async function fetchPersonsStats(): Promise<PersonsStats> {
  const res = await fetch(ENDPOINTS.personsStats, { headers: buildHeaders() })
  if (!res.ok) throw new Error('Failed to fetch persons stats')
  const payload = await res.json()
  return unwrapPayload<PersonsStats>(payload)
}

export function usePersonsStats(
  options?: Omit<UseQueryOptions<PersonsStats, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<PersonsStats, ApiError>({
    queryKey: personsKeys.stats(),
    queryFn: fetchPersonsStats,
    ...options,
  })
}
