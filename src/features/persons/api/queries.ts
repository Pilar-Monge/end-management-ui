import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import type { ApiError, Person, PersonStatus, PersonWithStats, PersonsStats } from '../types'
import { ENDPOINTS, personsKeys } from './keys'

const getToken = () => localStorage.getItem('token') ?? localStorage.getItem('accessToken')

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

function normalizePersonStatus(value: unknown): PersonStatus {
  const normalized = String(value ?? '').toUpperCase()
  if (normalized === 'ACTIVE') return 'ACTIVE'
  if (normalized === 'SICK') return 'SICK'
  if (normalized === 'INJURED') return 'INJURED'
  if (normalized === 'ON_EXPEDITION') return 'ON_EXPEDITION'
  if (normalized === 'OUTSIDE_CAMP') return 'OUTSIDE_CAMP'
  if (normalized === 'INACTIVE') return 'INACTIVE'
  return 'INACTIVE'
}

function mapPersonRecord(record: unknown): Person {
  const source = record as Record<string, unknown>

  const firstName = String(
    source.firstName
    ?? source.nombre
    ?? source.name
    ?? source.first_name
    ?? source.primerNombre
    ?? source.primer_nombre
    ?? '',
  ).trim()

  const lastNamePrimary = String(
    source.lastName
    ?? source.primer_apellido
    ?? source.last_name
    ?? source.apellido
    ?? source.apellido1
    ?? source.lastName1
    ?? '',
  ).trim()

  const lastNameSecondary = String(
    source.segundo_apellido
    ?? source.apellido2
    ?? source.lastName2
    ?? '',
  ).trim()

  const lastName = [lastNamePrimary, lastNameSecondary].filter(Boolean).join(' ').trim()

  const statusValue = source.status ?? source.currentStatus
  const admissionDateValue =
    source.admissionDate
    ?? source.joinedAt
    ?? source.joinDate
    ?? source.createdAt
    ?? new Date().toISOString()
  return {
    ...(record as Person),
    status: normalizePersonStatus(statusValue),
    currentStatus: normalizePersonStatus(statusValue),
    firstName,
    lastName,
    admissionDate: String(admissionDateValue),
    notes: typeof source.notes === 'string' ? source.notes : undefined,
  }
}

export async function fetchPersons(): Promise<Person[]> {
  const res = await fetch(ENDPOINTS.persons, { headers: buildHeaders() })
  if (!res.ok) throw new Error('Failed to fetch persons')
  const payload = await res.json()
  return unwrapList<Person>(payload).map((item) => mapPersonRecord(item))
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
  const data = unwrapPayload<PersonWithStats>(payload)
  return {
    ...data,
    ...mapPersonRecord(data),
  }
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
