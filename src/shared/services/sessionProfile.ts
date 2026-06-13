import { normalizeUserRole } from './postLoginRouting'
import { SESSION_TOKEN_CHANGED_EVENT } from './sessionService'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

export interface CachedSessionUser {
  id?: number
  userId?: number
  username?: string
  role?: string
  rol?: string
  campId?: number
  status?: string
  personId?: number
  person_id?: number
  [key: string]: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function unwrapPayload(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {}
  const data = value.data
  return isRecord(data) ? data : value
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function readCachedSessionUser(): CachedSessionUser | null {
  const raw = localStorage.getItem('user')
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    return isRecord(parsed) ? (parsed as CachedSessionUser) : null
  } catch {
    return null
  }
}

export function saveCachedSessionUser(user: CachedSessionUser, notify = true): void {
  localStorage.setItem('user', JSON.stringify(user))
  if (notify) {
    window.dispatchEvent(new Event(SESSION_TOKEN_CHANGED_EVENT))
  }
}

export function clearCachedSession(notify = true): void {
  localStorage.removeItem('token')
  localStorage.removeItem('accessToken')
  localStorage.removeItem('user')
  localStorage.removeItem('admin_settings_v2')
  if (notify) {
    window.dispatchEvent(new Event(SESSION_TOKEN_CHANGED_EVENT))
  }
}

export type SessionCheckStatus = 'active' | 'expired' | 'unknown'

export async function checkCurrentSessionStatus(): Promise<SessionCheckStatus> {
  try {
    const response = await fetch(`${API_BASE}/auth/check-session`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) return 'active'
    if (response.status === 401) return 'expired'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

export function normalizeSessionUser(profile: unknown, cachedUser: CachedSessionUser | null = readCachedSessionUser()): CachedSessionUser {
  const data = unwrapPayload(profile)
  const person = isRecord(data.person) ? data.person : null
  const role = normalizeUserRole(stringValue(data.role ?? data.rol) ?? cachedUser?.role ?? cachedUser?.rol)
  const personId = numberValue(data.personId ?? data.person_id ?? person?.id ?? cachedUser?.personId ?? cachedUser?.person_id)
  const userId = numberValue(data.id ?? data.userId ?? cachedUser?.id ?? cachedUser?.userId)

  const nextUser: CachedSessionUser = {
    ...(cachedUser ?? {}),
    ...(userId !== undefined ? { id: userId, userId } : {}),
    username: stringValue(data.username) ?? cachedUser?.username,
    role: role || cachedUser?.role,
    rol: stringValue(data.rol ?? data.role) ?? cachedUser?.rol ?? role,
    status: stringValue(data.status) ?? cachedUser?.status,
    campId: numberValue(data.campId ?? data.camp_id ?? person?.campId ?? person?.camp_id ?? cachedUser?.campId),
  }

  if (personId !== undefined) {
    nextUser.personId = personId
    nextUser.person_id = personId
  }

  return nextUser
}

export async function fetchCurrentSessionUser(): Promise<CachedSessionUser> {
  const response = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Session profile request failed (${response.status})`)
  }

  const payload = await response.json()
  return normalizeSessionUser(payload)
}

export async function refreshCachedSessionUser(notify = false): Promise<CachedSessionUser> {
  const user = await fetchCurrentSessionUser()
  saveCachedSessionUser(user, notify)
  return user
}

export async function logoutCurrentSession(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } finally {
    clearCachedSession()
  }
}
