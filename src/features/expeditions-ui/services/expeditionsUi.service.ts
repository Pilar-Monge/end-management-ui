import { ApiHttpError, apiRequest } from '../../../shared/services/httpClient'
import type { AdminExpeditionRecord } from '../../admin-dashboard/services/types'
import type { DBExpedition } from '../features/expeditions/utils/expeditionsStore'

type UnknownRecord = Record<string, unknown>

export type ExpeditionStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'DELAYED'
  | 'COMPLETED'
  | 'LOST'
  | 'RETURNED_AFTER_LOST'
  | 'CANCELED'

export interface CurrentExpeditionUser {
  id: number
  username: string
  name: string
  email: string
  role: string
  rol: string
  campId: number
  campName: string
  personId?: number
  photoUrl?: string
}

export interface ExpeditionPerson {
  id: number
  name: string
  lastName1?: string
  lastName2?: string
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
  status: 'ACTIVE' | 'WITHDRAWN'
  assignmentDate?: string
  person?: ExpeditionPerson
}

export interface ExpeditionResourceSummaryItem {
  resourceTypeId: number
  resourceTypeName: string
  unit: string
  amount: string
}

export interface ExpeditionResourceSummary {
  consumed: ExpeditionResourceSummaryItem[]
  obtained: ExpeditionResourceSummaryItem[]
}

export interface ExpeditionNotification {
  id: number
  title: string
  message: string
  type: string
  read: boolean
  createdDate: string
  sourceType?: string
  sourceId?: number
}

export interface ExpeditionResourceType {
  id: number
  name: string
  category: string
  unitOfMeasure: string
}

export interface CampInventoryResource {
  resourceTypeId: number
  resourceTypeName: string
  category: string
  unit: string
  currentAmount: number
  minimumAlertAmount: number
}

export interface ExpeditionMapRecord {
  id: number
  name: string
  team: string
  status: ExpeditionStatus
  time: string
  start: { lat: number; lng: number; label?: string }
  end: { lat: number; lng: number; label?: string }
  danger: string
  climate: string
  resources: string[]
  desc: string
}

export interface CreateExpeditionCommand {
  name: string
  objective: string
  campId: number
  destinationDescription: string
  destinationLatitude?: number | string
  destinationLongitude?: number | string
  plannedDepartureDate: string
  plannedReturnDate: string
  maxExtraDays?: number
  participantIds?: number[]
}

const PAGE_LIMIT = 100

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

function toDate(value: unknown): Date | null {
  const date = new Date(str(value))
  return Number.isNaN(date.getTime()) ? null : date
}

function formatShortDate(value: unknown): string {
  const date = toDate(value)
  if (!date) return 'Pendiente'
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}/${month} ${hour}:${minutes}`
}

function daysBetween(startIso: string, endIso: string): number {
  const start = toDate(startIso)
  const end = toDate(endIso)
  if (!start || !end) return 1
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000))
}

function minutesUntil(value: unknown): string {
  const date = toDate(value)
  if (!date) return '-'
  const diffMinutes = Math.round((date.getTime() - Date.now()) / 60_000)
  if (diffMinutes <= 0) return '00:00'
  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function normalizeStatus(value: unknown): ExpeditionStatus {
  const raw = str(value, 'PLANNED').toUpperCase()
  if (
    raw === 'PLANNED' ||
    raw === 'IN_PROGRESS' ||
    raw === 'DELAYED' ||
    raw === 'COMPLETED' ||
    raw === 'LOST' ||
    raw === 'RETURNED_AFTER_LOST' ||
    raw === 'CANCELED'
  ) {
    return raw
  }
  return 'PLANNED'
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

function mapExpedition(item: UnknownRecord): DBExpedition {
  const participants = Array.isArray(item.participants) ? item.participants.length : num(item.participants)
  const lat = num(item.destinationLatitude, 0)
  const lng = num(item.destinationLongitude, 0)

  return {
    id: num(item.id),
    name: str(item.name, 'Expedicion'),
    dest: str(item.destinationDescription, 'Destino sin descripcion'),
    status: normalizeStatus(item.status),
    departure: formatShortDate(item.plannedDepartureDate),
    returnDate: formatShortDate(item.plannedReturnDate),
    participants,
    resources: str(item.resources, 'Provisionamiento automatico'),
    extraDays: num(item.maxExtraDays ?? item.extraDaysAvailable),
    extraUsed: num(item.extraDaysUsed),
    objective: str(item.objective, 'Sin objetivo registrado'),
    lat,
    lng,
    danger: 'Medio',
    climate: 'No registrado',
    assignedPersonnelIds: [],
    startLat: undefined,
    startLng: undefined,
    startLabel: undefined,
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
    lastName1,
    lastName2,
    fullName,
    age: item.age === undefined ? undefined : num(item.age),
    role: str(occupation.name ?? item.occupationName ?? item.role, 'Operador'),
    status: str(item.currentStatus ?? item.status, 'ACTIVE'),
    campId: num(item.campId),
    occupationId: item.occupationId === undefined ? undefined : num(item.occupationId),
    img: str(item.imageUrl ?? item.photoUrl ?? item.img, `https://i.pravatar.cc/300?u=${item.id ?? name}`),
  }
}

function mapParticipant(item: UnknownRecord): ExpeditionParticipant {
  return {
    id: num(item.id),
    expeditionId: num(item.expeditionId),
    personId: num(item.personId),
    expeditionRole: str(item.expeditionRole, 'Operador de campo'),
    status: str(item.status, 'ACTIVE') === 'WITHDRAWN' ? 'WITHDRAWN' : 'ACTIVE',
    assignmentDate: item.assignmentDate === undefined ? undefined : str(item.assignmentDate),
  }
}

export async function getCurrentExpeditionUser(): Promise<CurrentExpeditionUser> {
  const user = asRecord(await apiRequest<unknown>('/auth/me'))
  const person = asRecord(user.person)
  const name = [person.name, person.lastName1].filter(Boolean).join(' ')
  return {
    id: num(user.id),
    username: str(user.username, str(user.email, 'usuario')),
    name: name || str(user.name ?? user.username, 'Usuario'),
    email: str(user.email),
    role: str(user.role ?? user.rol, 'TRAVEL_MANAGER'),
    rol: str(user.rol ?? user.role, 'TRAVEL_MANAGER'),
    campId: num(user.campId ?? person.campId, 1),
    campName: str(user.campName, `Campamento ${num(user.campId ?? person.campId, 1)}`),
    personId: user.personId === undefined ? undefined : num(user.personId),
    photoUrl: str(person.imageUrl ?? user.photoUrl),
  }
}

export async function getServerTime(): Promise<string> {
  const payload = asRecord(await apiRequest<unknown>('/system/time', { withAuth: false }))
  return str(payload.serverTime, new Date().toISOString())
}

export async function getCamp(campId: number): Promise<{
  id: number
  name: string
  lat: number
  lng: number
  label: string
  minimumDailyRationPerPerson: number
}> {
  const camp = asRecord(await apiRequest<unknown>(`/camps/${campId}`))
  const name = str(camp.name, `Campamento ${campId}`)
  return {
    id: campId,
    name,
    lat: num(camp.latitude),
    lng: num(camp.longitude),
    label: name,
    minimumDailyRationPerPerson: num(camp.minimumDailyRationPerPerson, 1),
  }
}

export async function listExpeditionParticipants(expeditionId: number): Promise<ExpeditionParticipant[]> {
  const payload = await safeRequest(
    () => apiRequest<unknown>(`/expedition-participants?expeditionId=${encodeURIComponent(expeditionId)}&page=1&limit=${PAGE_LIMIT}`),
    [],
  )
  return listFromPayload(payload, mapParticipant)
}

export async function listUiExpeditions(
  filters: { campId?: number; status?: ExpeditionStatus | string } = {},
): Promise<DBExpedition[]> {
  const user = filters.campId ? null : await getCurrentExpeditionUser()
  const params = new URLSearchParams({
    campId: String(filters.campId ?? user?.campId ?? 1),
    page: '1',
    limit: String(PAGE_LIMIT),
  })
  if (filters.status) params.set('status', filters.status)
  const payload = await apiRequest<unknown>(`/expeditions?${params.toString()}`)
  const expeditions = listFromPayload(payload, mapExpedition)
  const participantBatches = await Promise.allSettled(
    expeditions.map((expedition) => listExpeditionParticipants(expedition.id)),
  )

  return expeditions.map((expedition, index) => {
    const batch = participantBatches[index]
    const participants = batch?.status === 'fulfilled' ? batch.value : []
    return {
      ...expedition,
      participants: participants.length || expedition.participants,
      assignedPersonnelIds: participants.map((participant) => participant.personId),
    }
  })
}

export async function getUiExpedition(id: number): Promise<DBExpedition | null> {
  try {
    const expedition = mapExpedition(asRecord(await apiRequest<unknown>(`/expeditions/${id}`)))
    const participants = await listExpeditionParticipants(id)
    return {
      ...expedition,
      participants: participants.length,
      assignedPersonnelIds: participants.map((participant) => participant.personId),
    }
  } catch (error) {
    if (error instanceof ApiHttpError && error.statusCode === 404) return null
    throw error
  }
}

export async function listMapExpeditions(): Promise<ExpeditionMapRecord[]> {
  const [user, expeditions] = await Promise.all([getCurrentExpeditionUser(), listUiExpeditions()])
  const camp = await safeRequest(() => getCamp(user.campId), {
    id: user.campId,
    name: user.campName,
    lat: 0,
    lng: 0,
    label: user.campName,
    minimumDailyRationPerPerson: 1,
  })

  return expeditions.map((expedition) => ({
    id: expedition.id,
    name: expedition.name,
    team: expedition.participants > 0 ? `${expedition.participants} participantes` : 'Sin participantes',
    status: normalizeStatus(expedition.status),
    time: minutesUntil(expedition.returnDate),
    start: { lat: camp.lat, lng: camp.lng, label: camp.name },
    end: { lat: expedition.lat, lng: expedition.lng, label: expedition.dest },
    danger: expedition.danger,
    climate: expedition.climate,
    resources: [expedition.resources],
    desc: expedition.objective,
  }))
}

export async function createExpedition(payload: CreateExpeditionCommand): Promise<AdminExpeditionRecord> {
  const body = {
    campId: payload.campId,
    name: payload.name,
    objective: payload.objective || null,
    destinationDescription: payload.destinationDescription || null,
    destinationLatitude:
      payload.destinationLatitude === undefined || payload.destinationLatitude === ''
        ? null
        : String(payload.destinationLatitude),
    destinationLongitude:
      payload.destinationLongitude === undefined || payload.destinationLongitude === ''
        ? null
        : String(payload.destinationLongitude),
    plannedDepartureDate: payload.plannedDepartureDate,
    estimatedDurationDays: daysBetween(payload.plannedDepartureDate, payload.plannedReturnDate),
    maxExtraDays: payload.maxExtraDays ?? 0,
  }

  const created = await apiRequest<AdminExpeditionRecord>('/expeditions', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  const participantIds = payload.participantIds ?? []
  await Promise.all(
    participantIds.map((personId) =>
      createExpeditionParticipant({
        expeditionId: Number(created.id),
        personId,
        expeditionRole: 'Operador de campo',
      }),
    ),
  )

  return created
}

export async function updateExpeditionStatus(id: number, status: ExpeditionStatus): Promise<DBExpedition> {
  return mapExpedition(
    asRecord(
      await apiRequest<unknown>(`/expeditions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
    ),
  )
}

export async function forceUpdateExpeditionState(id: number): Promise<DBExpedition> {
  return mapExpedition(
    asRecord(
      await apiRequest<unknown>(`/expeditions/${id}/force-update-state`, {
        method: 'POST',
      }),
    ),
  )
}

export async function completeExpedition(id: number): Promise<DBExpedition> {
  return mapExpedition(
    asRecord(
      await apiRequest<unknown>(`/expeditions/${id}/complete`, {
        method: 'POST',
      }),
    ),
  )
}

export async function createExpeditionParticipant(data: {
  expeditionId: number
  personId: number
  expeditionRole?: string
}): Promise<ExpeditionParticipant> {
  return mapParticipant(
    asRecord(
      await apiRequest<unknown>('/expedition-participants', {
        method: 'POST',
        body: JSON.stringify({
          expeditionId: data.expeditionId,
          personId: data.personId,
          expeditionRole: data.expeditionRole ?? 'Operador de campo',
          status: 'ACTIVE',
        }),
      }),
    ),
  )
}

export async function listAvailablePeople(campId: number): Promise<ExpeditionPerson[]> {
  const occupationsPayload = await safeRequest(
    () => apiRequest<unknown>('/occupations?participatesInExpeditions=true&page=1&limit=100'),
    [],
  )
  const occupationIds = new Set(
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
    if (occupationIds.size === 0) return isScoutOrExpeditionRole
    return (
      (person.occupationId !== undefined && occupationIds.has(person.occupationId)) ||
      isScoutOrExpeditionRole
    )
  })
}

export async function getExpeditionResourceSummary(id: number): Promise<ExpeditionResourceSummary> {
  return apiRequest<ExpeditionResourceSummary>(`/expeditions/${id}/resources`)
}

export async function listResourceTypes(): Promise<ExpeditionResourceType[]> {
  return safeRequest(async () => {
    const payload = await apiRequest<unknown>('/resource-types?page=1&limit=100')
    return listFromPayload(payload, (item) => ({
      id: num(item.id),
      name: str(item.name, 'Recurso'),
      category: str(item.category, 'OTHER'),
      unitOfMeasure: str(item.unitOfMeasure ?? item.unit_of_measure ?? item.unit, 'u'),
    }))
  }, [])
}

export async function createConsumedExpeditionResource(data: {
  expeditionId: number
  resourceTypeId: number
  amount: number | string
  recordedBy: number
}): Promise<void> {
  await apiRequest<unknown>('/expedition-resources-consumed', {
    method: 'POST',
    body: JSON.stringify({
      expeditionId: data.expeditionId,
      resourceTypeId: data.resourceTypeId,
      amount: String(data.amount),
      recordedBy: data.recordedBy,
      recordDate: new Date().toISOString(),
      movementId: null,
    }),
  })
}

export async function createObtainedExpeditionResource(data: {
  expeditionId: number
  resourceTypeId: number
  amount: number | string
  recordedBy: number
}): Promise<void> {
  await apiRequest<unknown>('/expedition-resources-obtained', {
    method: 'POST',
    body: JSON.stringify({
      expeditionId: data.expeditionId,
      resourceTypeId: data.resourceTypeId,
      amount: String(data.amount),
      recordedBy: data.recordedBy,
      recordDate: new Date().toISOString(),
      movementId: null,
    }),
  })
}

export async function listCampInventory(campId: number): Promise<CampInventoryResource[]> {
  const [resourceTypes, inventoryPayload] = await Promise.all([
    listResourceTypes(),
    safeRequest(
      () => apiRequest<unknown>(`/camp-inventory?campId=${campId}&page=1&limit=100`),
      [],
    ),
  ])
  const resourcesById = new Map(resourceTypes.map((resource) => [resource.id, resource]))

  return listFromPayload(inventoryPayload, (item) => {
    const resourceTypeId = num(item.resourceTypeId)
    const resource = resourcesById.get(resourceTypeId)
    return {
      resourceTypeId,
      resourceTypeName: resource?.name ?? `Recurso ${resourceTypeId}`,
      category: resource?.category ?? 'OTHER',
      unit: resource?.unitOfMeasure ?? 'u',
      currentAmount: num(item.currentAmount),
      minimumAlertAmount: num(item.minimumAlertAmount),
    }
  })
}

export async function listExpeditionNotifications(): Promise<ExpeditionNotification[]> {
  const payload = await apiRequest<unknown>('/notifications?page=1&limit=20')
  return listFromPayload(payload, (item) => ({
    id: num(item.id),
    title: str(item.title, 'Notificacion'),
    message: str(item.message),
    type: str(item.type, 'INFO'),
    read: Boolean(item.read),
    createdDate: str(item.createdDate, new Date().toISOString()),
    sourceType: item.sourceType === undefined ? undefined : str(item.sourceType),
    sourceId: item.sourceId === undefined ? undefined : num(item.sourceId),
  })).filter((notification) => notification.type.includes('EXPEDITION'))
}

export async function markNotificationRead(id: number): Promise<void> {
  await apiRequest<unknown>(`/notifications/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ read: true, readDate: new Date().toISOString() }),
  })
}
