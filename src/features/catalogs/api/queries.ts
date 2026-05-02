import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import type {
  ResourceType,
  Occupation,
  OccupationAssignmentCriteria,
  Achievement,
  ApiError,
} from '../types'
import { catalogsKeys, ENDPOINTS } from './keys'

const getToken = () => localStorage.getItem('token')
export async function fetchResourceTypes(): Promise<ResourceType[]> {
  const res = await fetch(ENDPOINTS.resourceTypes, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error('Failed to fetch resource types')
  const data = await res.json()
  return Array.isArray(data) ? data : (data.data ?? [])
}

export function useResourceTypes(
  options?: Omit<UseQueryOptions<ResourceType[], ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<ResourceType[], ApiError>({
    queryKey: catalogsKeys.resourceTypes(),
    queryFn: fetchResourceTypes,
    ...options,
  })
}
export async function fetchOccupations(): Promise<Occupation[]> {
  const res = await fetch(ENDPOINTS.occupations, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error('Failed to fetch occupations')
  const data = await res.json()
  return Array.isArray(data) ? data : (data.data ?? [])
}

export function useOccupations(
  options?: Omit<UseQueryOptions<Occupation[], ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Occupation[], ApiError>({
    queryKey: catalogsKeys.occupations(),
    queryFn: fetchOccupations,
    ...options,
  })
}
export async function fetchOccupationCriteria(): Promise<OccupationAssignmentCriteria[]> {
  const res = await fetch(ENDPOINTS.criteria, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error('Failed to fetch occupation criteria')
  const data = await res.json()
  return Array.isArray(data) ? data : (data.data ?? [])
}

export function useOccupationCriteria(
  options?: Omit<UseQueryOptions<OccupationAssignmentCriteria[], ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<OccupationAssignmentCriteria[], ApiError>({
    queryKey: catalogsKeys.criteria(),
    queryFn: fetchOccupationCriteria,
    ...options,
  })
}

export async function fetchOccupationCriteriaByOccupation(
  occupationId: number,
): Promise<OccupationAssignmentCriteria[]> {
  const res = await fetch(`${ENDPOINTS.criteria}?occupationId=${occupationId}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error('Failed to fetch criteria for occupation')
  const data = await res.json()
  return Array.isArray(data) ? data : (data.data ?? [])
}
export async function fetchAchievements(): Promise<Achievement[]> {
  const res = await fetch(ENDPOINTS.achievements, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error('Failed to fetch achievements')
  const data = await res.json()
  return Array.isArray(data) ? data : (data.data ?? [])
}

export function useAchievements(
  options?: Omit<UseQueryOptions<Achievement[], ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Achievement[], ApiError>({
    queryKey: catalogsKeys.achievements(),
    queryFn: fetchAchievements,
    ...options,
  })
}
