import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import type { ApiError, Person, PersonStatus, PersonWithStats, PersonsStats } from '../types'
import { ENDPOINTS, personsKeys } from './keys'

const getToken = () => localStorage.getItem('token') ?? localStorage.getItem('accessToken')

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin
  } catch {
    return 'http://localhost:3000'
  }
})()

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

function normalizeMediaUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^https?:\/\//i.test(trimmed)) return null

  try {
    const url = new URL(trimmed)
    if (url.origin === API_ORIGIN && /^\/(person-photos|admission-photos)\//i.test(url.pathname)) {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}

export interface AuthMeProfileUser {
  id: number
  username?: string
  role?: string
  rol?: string
  campId?: number
  personId?: number
  person_id?: number
  person?: Person | null
}

export interface AuthMeProfile {
  user: AuthMeProfileUser
  person: Person | null
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

  const imageSignedUrl = normalizeMediaUrl(source.imageSignedUrl ?? source.image_signed_url)
  const photoUrl = normalizeMediaUrl(source.photoUrl ?? source.photo_url)
  const profileImage = normalizeMediaUrl(source.profileImage ?? source.profile_image ?? source.profilePhoto ?? source.profile_photo)
  const avatar = normalizeMediaUrl(source.avatar)
  const photo = normalizeMediaUrl(source.photo)
  const imageUrl = normalizeMediaUrl(source.imageUrl ?? source.image_url)
  const resolvedProfileImage = imageSignedUrl ?? imageUrl ?? photoUrl ?? profileImage ?? avatar ?? photo

  return {
    ...(record as Person),
    userId: typeof source.userId === 'number' ? source.userId : typeof source.user_id === 'number' ? source.user_id : undefined,
    systemUserId:
      typeof source.systemUserId === 'number'
        ? source.systemUserId
        : typeof source.system_user_id === 'number'
          ? source.system_user_id
          : undefined,
    accountId: typeof source.accountId === 'number' ? source.accountId : typeof source.account_id === 'number' ? source.account_id : undefined,
    username: typeof source.username === 'string' ? source.username : typeof source.userName === 'string' ? source.userName : undefined,
    status: normalizePersonStatus(statusValue),
    currentStatus: normalizePersonStatus(statusValue),
    firstName,
    lastName,
    photoUrl: resolvedProfileImage,
    profileImage: resolvedProfileImage,
    avatar: resolvedProfileImage,
    photo: resolvedProfileImage,
    imageUrl: resolvedProfileImage,
    imageSignedUrl: resolvedProfileImage,
    admissionDate: String(admissionDateValue),
    notes: typeof source.notes === 'string' ? source.notes : undefined,
  }
}

function numberFromValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function stringFromValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export async function fetchAuthMeProfile(): Promise<AuthMeProfile> {
  const res = await fetch(`${API_BASE}/auth/me`, { headers: buildHeaders() })
  if (!res.ok) throw new Error('Failed to fetch current profile')

  const payload = await res.json()
  const data = unwrapPayload<Record<string, unknown>>(payload)
  const rawPerson = data.person && typeof data.person === 'object' ? data.person : null
  const person = rawPerson ? mapPersonRecord(rawPerson) : null
  const personId = numberFromValue(data.personId ?? data.person_id) ?? (person ? numberFromValue(person.id) : undefined)

  return {
    user: {
      id: numberFromValue(data.id) ?? 0,
      username: stringFromValue(data.username),
      role: stringFromValue(data.role),
      rol: stringFromValue(data.rol),
      campId: numberFromValue(data.campId ?? data.camp_id),
      personId,
      person_id: personId,
      person,
    },
    person,
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
