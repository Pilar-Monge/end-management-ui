
export const campsKeys = {
  all: ['camps'] as const,
  lists: () => [...campsKeys.all, 'list'],
  list: () => [...campsKeys.lists()],
  details: () => [...campsKeys.all, 'detail'],
  detail: (id: number) => [...campsKeys.details(), id],
  stats: () => [...campsKeys.all, 'stats'],
  resources: () => [...campsKeys.all, 'resources'],
  resourcesByCamp: (campId: number) => [...campsKeys.resources(), campId],
} as const;

export const ENDPOINTS = {
  camps: `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/camps`,
  campStats: `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/camps/stats`,
  campResources: `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/camps/resources`,
} as const;
