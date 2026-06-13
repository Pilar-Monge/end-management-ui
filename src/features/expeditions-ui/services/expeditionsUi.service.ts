import { ApiHttpError, apiRequest } from '../../../shared/services/httpClient'
import type { AdminExpeditionRecord } from '../../admin-dashboard/services/types'
import type { DBExpedition } from '../features/expeditions/utils/expeditionsStore'

type UnknownRecord = Record<string, unknown>

export interface CurrentExpeditionUser {
  id: number
  username: string
  name: string
  email: string
  role: string
  campId: number
  campName: string
}

export interface ExpeditionPerson {
  id: number
  name: string
  fullName: string
  age?: number
  role: string
  status: string
  campId: number
  occupationId?: number
  img?: string
}

export interface ExpeditionParticipant {
  id: number
  expeditionId: number
  personId: number
  expeditionRole: string
  status: string
}

export interface CreateExpeditionCommand {
  name: string
  objective: string
  campId: number
  destinationDescription: string
  destinationLatitude?: number
  destinationLongitude?: number
  plannedDepartureDate: string
  plannedReturnDate: string
  participantIds: number[]
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? (value as UnknownRecord) : {}
}

function str(value: unknown, fallback = ''): string {
  if (value === null || value === undefined || value === '') return fallback
  return String(value)
}

function num(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function listFromPayload<T>(payload: unknown, mapper: (item: UnknownRecord) => T): T[] {
  if (Array.isArray(payload)) return payload.map((item) => mapper(asRecord(item)))
  const record = asRecord(payload)
  const candidates = [record.data, record.items, record.results, record.records]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.map((item) => mapper(asRecord(item)))
  }
  return []
}

function formatShortDate(value: unknown): string {
  const date = new Date(str(value))
  if (Number.isNaN(date.getTime())) return 'Pendiente'
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}/${month} ${hour}:${minutes}`
}

async function safeRequest<T>(request: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await request()
  } catch (error) {
    if (error instanceof ApiHttpError && (error.statusCode === 403 || error.statusCode === 404)) {
      return fallback
    }
    throw error
  }
}

function mapPerson(item: UnknownRecord): ExpeditionPerson {
  const name = str(item.name, `Persona ${item.id ?? ''}`)
  const lastName1 = str(item.lastName1)
  const lastName2 = str(item.lastName2)
  const fullName = str(item.fullName, [name, lastName1, lastName2].filter(Boolean).join(' '))
  const occupation = asRecord(item.occupation)

  return {
    id: num(item.id ?? item.personId),
    name,
    fullName,
    age: item.age === undefined ? undefined : num(item.age),
    role: str(occupation.name ?? item.occupationName ?? item.role, 'Expedicion'),
    status: str(item.currentStatus ?? item.status, 'ACTIVE'),
    campId: num(item.campId),
    occupationId: item.occupationId === undefined ? undefined : num(item.occupationId),
    img: str(item.imageUrl ?? item.photoUrl ?? item.img, `https://i.pravatar.cc/300?u=${item.id ?? name}`),
  }
}

function mapExpedition(item: UnknownRecord): DBExpedition {
  const participants = Array.isArray(item.participants) ? item.participants.length : num(item.participants)
  return {
    id: num(item.id),
    name: str(item.name, 'Expedicion'),
    dest: str(item.destinationDescription, 'Destino sin descripcion'),
    status: str(item.status, 'PLANNED') as DBExpedition['status'],
    departure: formatShortDate(item.plannedDepartureDate),
    returnDate: formatShortDate(item.plannedReturnDate),
    participants,
    resources: str(item.resources, 'Provisionamiento automatico'),
    extraDays: num(item.maxExtraDays ?? item.extraDaysAvailable),
    extraUsed: num(item.extraDaysUsed),
    objective: str(item.objective, 'Sin objetivo registrado'),
    lat: num(item.destinationLatitude),
    lng: num(item.destinationLongitude),
    danger: 'Medio',
    climate: 'No registrado',
    assignedPersonnelIds: [],
  }
}

function mapParticipant(item: UnknownRecord): ExpeditionParticipant {
  return {
    id: num(item.id),
    expeditionId: num(item.expeditionId),
    personId: num(item.personId),
    expeditionRole: str(item.expeditionRole, 'EXPEDITION_MEMBER'),
    status: str(item.status, 'ACTIVE'),
  }
}

export async function getCurrentExpeditionUser(): Promise<CurrentExpeditionUser> {
  const user = asRecord(await apiRequest<unknown>('/auth/me'))
  const person = asRecord(user.person)
  return {
    id: num(user.id),
    username: str(user.username, str(user.email, 'usuario')),
    name: str(user.name ?? person.name ?? user.username, 'Usuario'),
    email: str(user.email),
    role: str(user.role ?? user.rol, 'TRAVEL_MANAGER'),
    campId: num(user.campId ?? person.campId, 1),
    campName: str(user.campName, `Campamento ${num(user.campId ?? person.campId, 1)}`),
  }
}

export async function listUiExpeditions(filters: { campId?: number; status?: string } = {}): Promise<DBExpedition[]> {
  const params = new URLSearchParams({ page: '1', limit: '100' })
  if (filters.campId) params.set('campId', String(filters.campId))
  if (filters.status) params.set('status', filters.status)

  const payload = await apiRequest<unknown>(`/expeditions?${params.toString()}`)
  return listFromPayload(payload, mapExpedition)
}

export async function listExpeditionParticipants(expeditionId: number): Promise<ExpeditionParticipant[]> {
  const payload = await safeRequest(
    () => apiRequest<unknown>(`/expedition-participants?expeditionId=${expeditionId}&page=1&limit=100`),
    [],
  )
  return listFromPayload(payload, mapParticipant)
}

export async function createExpeditionParticipant(data: {
  expeditionId: number
  personId: number
  expeditionRole?: string
}): Promise<void> {
  await apiRequest<unknown>('/expedition-participants', {
    method: 'POST',
    body: JSON.stringify({
      expeditionId: data.expeditionId,
      personId: data.personId,
      expeditionRole: data.expeditionRole ?? 'EXPEDITION_MEMBER',
      status: 'ACTIVE',
    }),
  })
}

export async function listAvailablePeople(campId: number): Promise<ExpeditionPerson[]> {
  const occupationsPayload = await safeRequest(
    () => apiRequest<unknown>('/occupations?participatesInExpeditions=true&page=1&limit=100'),
    [],
  )
  const expeditionOccupationIds = new Set(
    listFromPayload(occupationsPayload, (item) => num(item.id)).filter((id) => id > 0),
  )

  const peoplePayload = await safeRequest(
    () => apiRequest<unknown>(`/person?campId=${campId}&currentStatus=ACTIVE&page=1&limit=100`),
    [],
  )

  return listFromPayload(peoplePayload, mapPerson).filter((person) => {
    if (person.campId !== campId || person.status !== 'ACTIVE') return false
    const roleText = person.role.toLowerCase()
    const isScoutOrExpeditionRole =
      roleText.includes('scout') ||
      roleText.includes('explor') ||
      roleText.includes('expedition') ||
      roleText.includes('expedicion')
    if (expeditionOccupationIds.size === 0) return isScoutOrExpeditionRole
    return (
      (person.occupationId !== undefined && expeditionOccupationIds.has(person.occupationId)) ||
      isScoutOrExpeditionRole
    )
  })
}

export async function createExpedition(
  payload: CreateExpeditionCommand,
): Promise<AdminExpeditionRecord> {
  const body = JSON.stringify(payload)

  try {
    return await apiRequest<AdminExpeditionRecord>('/expeditions', {
      method: 'POST',
      body,
    })
  } catch (error) {
    if (!(error instanceof ApiHttpError) || error.statusCode !== 404) {
      throw error
    }
  }

  return apiRequest<AdminExpeditionRecord>('/explorations', {
    method: 'POST',
    body,
  })
}
