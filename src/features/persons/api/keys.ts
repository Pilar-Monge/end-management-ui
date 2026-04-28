export const personsKeys = {
  all: ['persons'] as const,
  lists: () => [...personsKeys.all, 'list'] as const,
  list: () => [...personsKeys.lists()] as const,
  details: () => [...personsKeys.all, 'detail'] as const,
  detail: (id: number) => [...personsKeys.details(), id] as const,
  stats: () => [...personsKeys.all, 'stats'] as const,
} as const

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const ENDPOINTS = {
  persons: `${API_BASE}/persons`,
  personsStats: `${API_BASE}/persons/stats`,
} as const
