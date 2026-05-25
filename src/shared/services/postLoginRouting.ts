const ROLE_REDIRECT_MAP: Record<string, string> = {
  SYSTEM_ADMIN: '/admin-main-view-ui',
  RESOURCE_MANAGEMENT: '/resource-main-view',
  TRAVEL_MANAGER: '/expeditions',
  WORKER: '/worker-main-view',
}

const DEFAULT_POST_LOGIN_ROUTE = '/app'

export function normalizeUserRole(role: string | null | undefined): string {
  return (role ?? '').trim().toUpperCase()
}

export function getPostLoginRoute(role: string | null | undefined): string {
  const normalizedRole = normalizeUserRole(role)
  return ROLE_REDIRECT_MAP[normalizedRole] ?? DEFAULT_POST_LOGIN_ROUTE
}