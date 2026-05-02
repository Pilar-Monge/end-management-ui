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

export async function fetchPersons(): Promise<Person[]> {
  const res = await fetch(ENDPOINTS.persons, { headers: buildHeaders() })
  if (!res.ok) throw new Error('Failed to fetch persons')
  return res.json()
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
  return res.json()
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
  return res.json()
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
