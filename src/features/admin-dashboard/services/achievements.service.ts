import { apiRequest } from '../../../shared/services/httpClient'
import type { CampAchievementProgress, CampAchievementUnlock } from './types'

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function mapProgressRecord(record: unknown): CampAchievementProgress {
  const source = (record ?? {}) as Record<string, unknown>
  return {
    achievementId: toNumber(source.achievementId ?? source.id),
    name: String(source.name ?? 'Logro sin nombre'),
    description: String(source.description ?? 'Sin descripcion'),
    metricKey: String(source.metricKey ?? ''),
    targetValue: toNumber(source.targetValue),
    unlockedAt: typeof source.unlockedAt === 'string' ? source.unlockedAt : null,
    progressSnapshot:
      source.progressSnapshot === null || source.progressSnapshot === undefined
        ? null
        : toNumber(source.progressSnapshot, Number.NaN),
    isUnlocked: Boolean(source.isUnlocked),
  }
}

function mapUnlockRecord(record: unknown): CampAchievementUnlock {
  const source = (record ?? {}) as Record<string, unknown>
  const unlockedAt =
    typeof source.unlockedAt === 'string'
      ? source.unlockedAt
      : typeof source.createdAt === 'string'
        ? source.createdAt
        : new Date().toISOString()

  return {
    achievementId: toNumber(source.achievementId ?? source.id),
    name: String(source.name ?? 'Logro desbloqueado'),
    description: String(source.description ?? 'Sin descripcion'),
    icon: typeof source.icon === 'string' ? source.icon : undefined,
    points: typeof source.points === 'number' ? source.points : undefined,
    category: typeof source.category === 'string' ? source.category : undefined,
    unlockedAt,
    isSeen: typeof source.isSeen === 'boolean' ? source.isSeen : undefined,
  }
}

function normalizeList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object') {
    const source = payload as Record<string, unknown>
    if (Array.isArray(source.items)) return source.items
    if (Array.isArray(source.results)) return source.results
    if (Array.isArray(source.records)) return source.records
    if (Array.isArray(source.unlocks)) return source.unlocks
    if (Array.isArray(source.data)) return source.data
  }
  return []
}

export async function getCampAchievementsProgress(): Promise<CampAchievementProgress[]> {
  const payload = await apiRequest<unknown>('/camp-achievements/progress')
  return normalizeList(payload)
    .map((item) => mapProgressRecord(item))
    .filter((item) => item.achievementId > 0)
}

export async function getLatestCampAchievementUnlocks(limit = 5): Promise<CampAchievementUnlock[]> {
  const safeLimit = Math.max(1, Math.min(20, Math.trunc(limit)))
  const payload = await apiRequest<unknown>(`/camp-achievements/latest-unlocks?limit=${safeLimit}`)
  return normalizeList(payload)
    .map((item) => mapUnlockRecord(item))
    .filter((item) => item.achievementId > 0)
}

export async function markCampAchievementSeen(achievementId: number): Promise<void> {
  await apiRequest<unknown>(`/camp-achievements/${achievementId}/seen`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}
