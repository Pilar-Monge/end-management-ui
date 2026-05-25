import type {
  AdminAdmissionRequest,
  AdminExpeditionRecord,
  AdminNotificationRecord,
  AuditRecord,
  CampInventoryEntry,
  IntercampRecord,
} from '../services'

type UiAdmission = {
  id: number
  name: string
  profession: string
  score: number
  badge: string | null
  status: 'pending' | 'approved' | 'rejected'
  skills: string[]
  reason: string
}

type UiNotification = {
  id: number
  title: string
  body: string
  time: string
  read: boolean
  level: 'critical' | 'warning' | 'info'
}

type UiExpedition = {
  id: number
  name: string
  day: number
  total: number
  participants: string[]
  status: 'EN CURSO' | 'PROGRAMADA' | 'REGRESANDO' | 'COMPLETADA'
  objective: string
  sector: string
}

type UiIntercampRequest = {
  id: number
  from: string
  text: string
  time: string
  status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'CONFIRMADO'
  urgent: boolean
  type: 'solicitud' | 'traslado' | 'oferta'
}

type UiInventoryMovement = {
  id: number
  resource: string
  type: 'INGRESO' | 'EGRESO' | 'AJUSTE'
  amount: number
  date: string
  reason: string
}

type UiInventoryAlert = {
  id: number
  resource: string
  severity: 'CRÍTICA' | 'MEDIA'
  status: 'ACTIVA' | 'ATENDIDA'
  threshold: number
}

type UiDailyCollection = {
  id: number
  resource: string
  amountCollected: number
  date: string
  notes: string
}

type UiLogEntry = {
  id: number
  time: string
  level: 'info' | 'warn' | 'error' | 'system'
  user: string
  action: string
}

export function toDisplayDate(value?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('es-CR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function toRelativeTime(value?: string): string {
  if (!value) return 'ahora'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `hace ${days}d`
}

export function mapAdmissionFromApi(item: AdminAdmissionRequest): UiAdmission {
  const rawSkills = Array.isArray(item.skills)
    ? item.skills
    : Array.isArray(item.habilidades)
      ? item.habilidades
      : typeof item.skills === 'string'
        ? item.skills.split(',').map((skill) => skill.trim()).filter(Boolean)
        : typeof item.habilidades === 'string'
          ? item.habilidades.split(',').map((skill) => skill.trim()).filter(Boolean)
          : []

  const normalizedStatus = String(item.status ?? '').toLowerCase()
  const status = normalizedStatus === 'approved' || normalizedStatus === 'rejected'
    ? (normalizedStatus as 'approved' | 'rejected')
    : 'pending'

  const score = Number(item.score ?? item.ia_score ?? 0)
  const hasSuspiciousFlag = Boolean(item.sospechoso ?? item.suspicious) || score < 30

  return {
    id: item.id,
    name: [item.nombre ?? item.name, item.primer_apellido ?? item.lastName1, item.segundo_apellido ?? item.lastName2]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Sin nombre',
    profession: item.profession
      ?? item.ocupacion
      ?? (typeof item.finalOccupationId === 'number' ? `Ocupación #${item.finalOccupationId}` : undefined)
      ?? (typeof item.suggestedOccupationId === 'number' ? `Sugerida #${item.suggestedOccupationId}` : undefined)
      ?? 'Desconocido',
    score,
    badge: hasSuspiciousFlag ? 'SOSPECHOSO' : null,
    status,
    skills: rawSkills.length > 0
      ? rawSkills
      : typeof item.declaredSkills === 'string'
        ? item.declaredSkills.split(',').map((skill) => skill.trim()).filter(Boolean)
        : [],
    reason: item.reason
      ?? item.rejectionReason
      ?? item.condicion
      ?? item.physicalCondition
      ?? item.salud
      ?? item.declaredHealthLevel
      ?? item.experiencia
      ?? 'Sin observaciones',
  }
}

export function extractCampInventoryEntries(payload: unknown, campId?: number): CampInventoryEntry[] {
  if (Array.isArray(payload)) {
    return payload
      .filter((entry): entry is CampInventoryEntry => {
        if (!entry || typeof entry !== 'object') return false
        const maybeEntry = entry as Record<string, unknown>
        return typeof maybeEntry.resourceTypeId === 'number' && typeof maybeEntry.quantity === 'number'
      })
      .map((entry) => ({
        campId: typeof entry.campId === 'number' ? entry.campId : (campId ?? 1),
        resourceTypeId: entry.resourceTypeId,
        quantity: entry.quantity,
        updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : undefined,
      }))
  }

  if (payload && typeof payload === 'object') {
    const objectPayload = payload as Record<string, unknown>
    for (const key of Object.keys(objectPayload)) {
      const extracted = extractCampInventoryEntries(objectPayload[key], campId)
      if (extracted.length > 0) return extracted
    }
  }

  return []
}

export function extractNumberByHint(payload: unknown, hints: string[], fallback: number): number {
  if (typeof payload === 'number' && Number.isFinite(payload)) return payload

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const value = extractNumberByHint(item, hints, Number.NaN)
      if (Number.isFinite(value)) return value
    }
    return fallback
  }

  if (payload && typeof payload === 'object') {
    const objectPayload = payload as Record<string, unknown>
    for (const key of Object.keys(objectPayload)) {
      if (hints.some((hint) => key.toLowerCase().includes(hint))) {
        const rawValue = objectPayload[key]
        if (typeof rawValue === 'number' && Number.isFinite(rawValue)) return rawValue
      }
    }

    for (const key of Object.keys(objectPayload)) {
      const value = extractNumberByHint(objectPayload[key], hints, Number.NaN)
      if (Number.isFinite(value)) return value
    }
  }

  return fallback
}

function mapNotificationLevel(levelCandidate: string | undefined): UiNotification['level'] {
  const normalized = (levelCandidate ?? '').toLowerCase()
  if (normalized.includes('critical') || normalized.includes('high') || normalized.includes('crit')) return 'critical'
  if (normalized.includes('warn') || normalized.includes('medium') || normalized.includes('alert')) return 'warning'
  return 'info'
}

export function mapNotificationFromApi(item: AdminNotificationRecord): UiNotification {
  return {
    id: item.id,
    title: item.title ?? item.message ?? 'Notificación',
    body: item.body ?? item.description ?? item.message ?? 'Sin detalles',
    time: toRelativeTime(item.createdAt ?? item.createdDate ?? item.updatedAt ?? item.readDate),
    read: Boolean(item.read ?? item.isRead),
    level: mapNotificationLevel(item.level ?? item.severity ?? item.type),
  }
}

function mapExpeditionStatus(statusCandidate?: string): UiExpedition['status'] {
  const normalized = (statusCandidate ?? '').toLowerCase()
  if (normalized.includes('complete') || normalized.includes('done')) return 'COMPLETADA'
  if (normalized.includes('return') || normalized.includes('regres')) return 'REGRESANDO'
  if (normalized.includes('plan') || normalized.includes('schedule') || normalized.includes('pending')) return 'PROGRAMADA'
  return 'EN CURSO'
}

export function mapExpeditionFromApi(item: AdminExpeditionRecord): UiExpedition {
  const participants = Array.isArray(item.participants)
    ? item.participants
    : Array.isArray(item.members)
      ? item.members
      : []

  const day = Number(item.day ?? item.currentDay ?? 0)
  const total = Number(item.total ?? item.totalDays ?? item.durationDays ?? Math.max(day, 1))

  return {
    id: item.id,
    name: item.name ?? item.title ?? `EXPEDICIÓN #${item.id}`,
    day: Number.isFinite(day) && day >= 0 ? day : 0,
    total: Number.isFinite(total) && total > 0 ? total : 1,
    participants: participants.map((participant) => String(participant).toUpperCase().slice(0, 2)),
    status: mapExpeditionStatus(item.status ?? item.expeditionStatus),
    objective: item.objective ?? item.description ?? 'Objetivo no especificado',
    sector: item.sector ?? item.location ?? 'Sector no definido',
  }
}

function mapIntercampStatus(statusCandidate?: string): UiIntercampRequest['status'] {
  const normalized = (statusCandidate ?? '').toLowerCase()
  if (normalized.includes('approve') || normalized.includes('accept') || normalized.includes('ok')) return 'APROBADO'
  if (normalized.includes('reject') || normalized.includes('deny')) return 'RECHAZADO'
  if (normalized.includes('confirm') || normalized.includes('done')) return 'CONFIRMADO'
  return 'PENDIENTE'
}

export function mapIntercampFromApi(record: IntercampRecord): UiIntercampRequest {
  const time = toRelativeTime(record.createdAt ?? record.createdDate ?? record.updatedAt ?? record.responseDate)
  const text = record.message ?? record.text ?? record.description ?? record.title ?? 'Solicitud inter-campamento'
  const fromCamp = record.fromCamp
    ?? record.from
    ?? (typeof record.originCampId === 'number' ? `CAMPAMENTO #${record.originCampId}` : undefined)
    ?? 'CAMPAMENTO EXTERNO'
  const mappedType = (record.type ?? 'solicitud').toLowerCase()
  const requestType: UiIntercampRequest['type'] = mappedType.includes('offer')
    ? 'oferta'
    : mappedType.includes('transfer')
      ? 'traslado'
      : 'solicitud'

  return {
    id: record.id,
    from: fromCamp.toUpperCase(),
    text,
    time,
    status: mapIntercampStatus(record.status),
    urgent: Boolean(record.urgent) || String(record.urgency ?? '').toLowerCase().includes('high'),
    type: requestType,
  }
}

export function summarizeAuditRecord(label: string, record: AuditRecord): UiLogEntry {
  const status = typeof record.status === 'string' ? record.status : 'REGISTRO'
  const actor = typeof record.user === 'string'
    ? record.user
    : typeof record.username === 'string'
      ? record.username
      : 'SISTEMA'
  const recordDetails = JSON.stringify(record).slice(0, 120)
  const now = new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

  return {
    id: Date.now(),
    time: now,
    level: status.toLowerCase().includes('error') ? 'error' : 'system',
    user: actor,
    action: `${label} #${record.id} - ${status} - ${recordDetails}`,
  }
}

function findArraysByHint(payload: unknown, hints: string[]): Record<string, unknown>[] {
  if (!payload) return []

  if (Array.isArray(payload)) {
    if (payload.every((item) => item && typeof item === 'object')) {
      return payload as Record<string, unknown>[]
    }
    for (const item of payload) {
      const found = findArraysByHint(item, hints)
      if (found.length > 0) return found
    }
    return []
  }

  if (typeof payload === 'object') {
    const objectPayload = payload as Record<string, unknown>
    for (const key of Object.keys(objectPayload)) {
      const value = objectPayload[key]
      if (Array.isArray(value) && hints.some((hint) => key.toLowerCase().includes(hint))) {
        if (value.every((entry) => entry && typeof entry === 'object')) {
          return value as Record<string, unknown>[]
        }
      }
    }

    for (const key of Object.keys(objectPayload)) {
      const found = findArraysByHint(objectPayload[key], hints)
      if (found.length > 0) return found
    }
  }

  return []
}

function readString(source: Record<string, unknown>, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim().length > 0) return value
  }
  return fallback
}

function readNumber(source: Record<string, unknown>, keys: string[], fallback: number): number {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return fallback
}

export function extractInventoryMovements(payload: unknown): UiInventoryMovement[] {
  const raw = findArraysByHint(payload, ['movement', 'movimiento'])
  const direct = raw.slice(0, 40).map((record, index) => {
    const typeRaw = readString(record, ['type', 'movementType', 'direction'], 'AJUSTE').toUpperCase()
    const type: UiInventoryMovement['type'] = typeRaw.includes('IN')
      ? 'INGRESO'
      : typeRaw.includes('OUT') || typeRaw.includes('EGRES')
        ? 'EGRESO'
        : 'AJUSTE'

    return {
      id: readNumber(record, ['id'], Date.now() + index),
      resource: readString(record, ['resource', 'resourceName', 'name'], 'Recurso'),
      type,
      amount: readNumber(record, ['amount', 'quantity', 'value'], 0),
      date: toRelativeTime(readString(record, ['createdAt', 'date', 'time'], '')),
      reason: readString(record, ['reason', 'description', 'note'], 'Sin detalle'),
    }
  })

  if (direct.length > 0) return direct

  const consumptionTrend = findArraysByHint(payload, ['consumption', 'trend'])
  return consumptionTrend.slice(0, 14).map((record, index) => ({
    id: Date.now() + index,
    resource: 'Consumo total',
    type: 'EGRESO',
    amount: readNumber(record, ['totalConsumed', 'amount', 'quantity'], 0),
    date: readString(record, ['date', 'createdAt'], 'hoy'),
    reason: 'Tendencia de consumo diaria',
  }))
}

export function extractInventoryAlerts(payload: unknown): UiInventoryAlert[] {
  const raw = findArraysByHint(payload, ['alert', 'warning'])
  const direct: UiInventoryAlert[] = raw.slice(0, 30).map((record, index) => {
    const severityRaw = readString(record, ['severity', 'level', 'priority'], '').toLowerCase()
    const statusRaw = readString(record, ['status', 'state'], '').toLowerCase()
    const threshold = readNumber(record, ['threshold', 'limit', 'minPercent'], severityRaw.includes('crit') ? 20 : 40)

    return {
      id: readNumber(record, ['id'], Date.now() + index),
      resource: readString(record, ['resource', 'resourceName', 'name'], 'Recurso'),
      severity: severityRaw.includes('crit') || severityRaw.includes('high') ? 'CRÍTICA' : 'MEDIA',
      status: statusRaw.includes('attend') || statusRaw.includes('resolve') || statusRaw.includes('closed') ? 'ATENDIDA' : 'ACTIVA',
      threshold,
    }
  })

  if (direct.length > 0) return direct

  const criticalCount = extractNumberByHint(payload, ['criticalStockCount', 'critical', 'alert'], 0)
  if (criticalCount <= 0) return []

  return [{
    id: Date.now(),
    resource: 'Inventario general',
    severity: 'CRÍTICA' as const,
    status: 'ACTIVA' as const,
    threshold: 20,
  }]
}

export function extractDailyCollections(payload: unknown): UiDailyCollection[] {
  const raw = findArraysByHint(payload, ['collection', 'collect', 'recolect'])
  const direct = raw.slice(0, 30).map((record, index) => ({
    id: readNumber(record, ['id'], Date.now() + index),
    resource: readString(record, ['resource', 'resourceName', 'name'], 'Recurso'),
    amountCollected: readNumber(record, ['amountCollected', 'amount', 'quantity'], 0),
    date: toRelativeTime(readString(record, ['createdAt', 'date'], '')),
    notes: readString(record, ['notes', 'note', 'description'], 'Sin observaciones'),
  }))

  if (direct.length > 0) return direct

  const resources = findArraysByHint(payload, ['resources'])
  return resources.slice(0, 20).map((record, index) => ({
    id: Date.now() + index,
    resource: readString(record, ['resourceName', 'name', 'resource'], 'Recurso'),
    amountCollected: readNumber(record, ['currentAmount', 'amount', 'quantity'], 0),
    date: 'hoy',
    notes: 'Snapshot del inventario actual',
  }))
}
