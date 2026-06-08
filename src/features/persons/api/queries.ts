import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import type { AccountStatus, ApiError, Gender, Person, PersonStatus, PersonWithStats, PersonsStats, SystemRole } from '../types'
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

function normalizeAccountStatus(value: unknown): AccountStatus | undefined {
  const normalized = String(value ?? '').toUpperCase()
  if (normalized === 'ACTIVE') return 'ACTIVE'
  if (normalized === 'BLOCKED') return 'BLOCKED'
  if (normalized === 'INACTIVE') return 'INACTIVE'
  return undefined
}

function normalizeSystemRole(value: unknown): SystemRole | undefined {
  const normalized = String(value ?? '').toUpperCase()
  if (normalized === 'WORKER') return 'WORKER'
  if (normalized === 'RESOURCE_MANAGEMENT') return 'RESOURCE_MANAGEMENT'
  if (normalized === 'TRAVEL_MANAGER') return 'TRAVEL_MANAGER'
  if (normalized === 'SYSTEM_ADMIN') return 'SYSTEM_ADMIN'
  return undefined
}

function normalizeGender(value: unknown): Gender | undefined {
  const normalized = String(value ?? '').toUpperCase()
  if (normalized === 'MALE') return 'MALE'
  if (normalized === 'FEMALE') return 'FEMALE'
  if (normalized === 'OTHER') return 'OTHER'
  return undefined
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

function recordFromValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function ageFromBirthDate(value: unknown): number | undefined {
  const rawDate = stringFromValue(value)
  if (!rawDate) return undefined
  const birthDate = new Date(rawDate)
  if (Number.isNaN(birthDate.getTime())) return undefined

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDelta = today.getMonth() - birthDate.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1
  }
  return age >= 0 ? age : undefined
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
  status?: string
  campId?: number
  personId?: number
  person_id?: number
  person?: Person | null
}

export interface AuthMeProfile {
  user: AuthMeProfileUser
  person: Person | null
}

export function mapPersonRecord(record: unknown): Person {
  const source = record as Record<string, unknown>
  const occupationRecord = recordFromValue(source.occupation)
  const campRecord = recordFromValue(source.camp)
  const userRecord = recordFromValue(source.systemUser ?? source.user ?? source.account)

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
    source.lastName1
    ?? source.lastName
    ?? source.primer_apellido
    ?? source.last_name
    ?? source.apellido
    ?? source.apellido1
    ?? '',
  ).trim()

  const lastNameSecondary = String(
    source.segundo_apellido
    ?? source.apellido2
    ?? source.lastName2
    ?? '',
  ).trim()

  const lastName = [lastNamePrimary, lastNameSecondary].filter(Boolean).join(' ').trim()

  const statusValue = source.currentStatus ?? source.current_status ?? source.status ?? source.personStatus ?? source.person_status ?? source.estado
  const normalizedStatus = normalizePersonStatus(statusValue)
  const occupationId =
    numberFromValue(source.occupationId ?? source.occupation_id)
    ?? numberFromValue(occupationRecord?.id)
    ?? null
  const occupationName = stringFromValue(occupationRecord?.name ?? occupationRecord?.nombre)
  const occupationDescription = stringFromValue(occupationRecord?.description ?? occupationRecord?.descripcion) ?? null
  const campId = numberFromValue(source.campId ?? source.camp_id) ?? numberFromValue(campRecord?.id) ?? 0
  const admissionDateValue =
    source.admissionDate
    ?? source.entryDate
    ?? source.entry_date
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
  const birthDateValue = stringFromValue(source.birthDate ?? source.birth_date)
  const resolvedAge = numberFromValue(source.age ?? source.edad) ?? ageFromBirthDate(birthDateValue) ?? 0

  return {
    ...(record as Person),
    id: numberFromValue(source.id) ?? 0,
    userId: numberFromValue(source.userId ?? source.user_id ?? userRecord?.id),
    systemUserId:
      numberFromValue(source.systemUserId ?? source.system_user_id),
    accountId: numberFromValue(source.accountId ?? source.account_id),
    identificationNumber: stringFromValue(source.identificationNumber ?? source.identification_number) ?? '',
    birthDate: birthDateValue,
    gender: normalizeGender(source.gender),
    username: typeof source.username === 'string' ? source.username : typeof source.userName === 'string' ? source.userName : undefined,
    name: firstName,
    lastName1: lastNamePrimary || null,
    lastName2: lastNameSecondary || null,
    status: normalizedStatus,
    currentStatus: normalizedStatus,
    firstName,
    lastName,
    age: resolvedAge,
    campId,
    occupationId,
    occupation: occupationName
      ? {
          id: occupationId ?? numberFromValue(occupationRecord?.id) ?? 0,
          name: occupationName,
          description: occupationDescription,
        }
      : null,
    character: numberFromValue(source.character),
    photoUrl: resolvedProfileImage,
    profileImage: resolvedProfileImage,
    avatar: resolvedProfileImage,
    photo: resolvedProfileImage,
    imageUrl: resolvedProfileImage,
    imageSignedUrl: resolvedProfileImage,
    admissionDate: String(admissionDateValue),
    notes: typeof source.notes === 'string' ? source.notes : undefined,
    accountStatus: normalizeAccountStatus(source.accountStatus ?? source.account_status ?? userRecord?.status),
    accountRole: normalizeSystemRole(source.accountRole ?? source.account_role ?? source.role ?? source.rol ?? userRecord?.role ?? userRecord?.rol),
  }
}

export async function fetchAuthMeProfile(): Promise<AuthMeProfile> {
  const res = await fetch(`${API_BASE}/auth/me`, { headers: buildHeaders(), credentials: 'include' })
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
      status: stringFromValue(data.status),
      campId: numberFromValue(data.campId ?? data.camp_id),
      personId,
      person_id: personId,
      person,
    },
    person,
  }
}

export async function fetchPersons(): Promise<Person[]> {
  const res = await fetch(ENDPOINTS.persons, { headers: buildHeaders(), credentials: 'include' })
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
  const res = await fetch(`${ENDPOINTS.persons}/${id}`, { headers: buildHeaders(), credentials: 'include' })
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
  const res = await fetch(ENDPOINTS.personsStats, { headers: buildHeaders(), credentials: 'include' })
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
