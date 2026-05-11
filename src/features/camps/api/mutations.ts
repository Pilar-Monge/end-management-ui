import { useMutation, type UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import type {
  Camp,
  CreateCampRequest,
  UpdateCampRequest,
  CampStatusUpdateRequest,
  CampResourceRequest,
  UpdateCampResourceRequest,
  ApiError,
} from '../types'
import { campsKeys, ENDPOINTS } from './keys'

const getToken = () => localStorage.getItem('token')

const getHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken() || ''}`,
})

export async function createCamp(data: CreateCampRequest): Promise<Camp> {
  const res = await fetch(ENDPOINTS.camps, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create camp')
  return res.json()
}

export function useCreateCamp(
  options?: Omit<UseMutationOptions<Camp, ApiError, CreateCampRequest>, 'mutationFn'>,
) {
  const queryClient = useQueryClient()
  return useMutation<Camp, ApiError, CreateCampRequest>({
    mutationFn: createCamp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: campsKeys.stats() })
    },
    ...options,
  })
}
export async function updateCamp(id: number, data: UpdateCampRequest): Promise<Camp> {
  const res = await fetch(`${ENDPOINTS.camps}/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update camp')
  return res.json()
}

export function useUpdateCamp(
  options?: Omit<
    UseMutationOptions<Camp, ApiError, { id: number; data: UpdateCampRequest }>,
    'mutationFn'
  >,
) {
  const queryClient = useQueryClient()
  return useMutation<Camp, ApiError, { id: number; data: UpdateCampRequest }>({
    mutationFn: (params: { id: number; data: UpdateCampRequest }) =>
      updateCamp(params.id, params.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: campsKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: campsKeys.lists() })
    },
    ...options,
  })
}
export async function deleteCamp(id: number): Promise<void> {
  const res = await fetch(`${ENDPOINTS.camps}/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  if (!res.ok) throw new Error('Failed to delete camp')
}

export function useDeleteCamp(
  options?: Omit<UseMutationOptions<void, ApiError, number>, 'mutationFn'>,
) {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, number>({
    mutationFn: deleteCamp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: campsKeys.stats() })
    },
    ...options,
  })
}
export async function updateCampStatus(id: number, data: CampStatusUpdateRequest): Promise<Camp> {
  const res = await fetch(`${ENDPOINTS.camps}/${id}/status`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update camp status')
  return res.json()
}

export function useUpdateCampStatus(
  options?: Omit<
    UseMutationOptions<Camp, ApiError, { id: number; data: CampStatusUpdateRequest }>,
    'mutationFn'
  >,
) {
  const queryClient = useQueryClient()
  return useMutation<Camp, ApiError, { id: number; data: CampStatusUpdateRequest }>({
    mutationFn: (params: { id: number; data: CampStatusUpdateRequest }) =>
      updateCampStatus(params.id, params.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: campsKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: campsKeys.lists() })
    },
    ...options,
  })
}
export async function addCampResource(data: CampResourceRequest): Promise<any> {
  const res = await fetch(`${ENDPOINTS.campResources}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to add resource to camp')
  return res.json()
}

export function useAddCampResource(
  options?: Omit<UseMutationOptions<any, ApiError, CampResourceRequest>, 'mutationFn'>,
) {
  const queryClient = useQueryClient()
  return useMutation<any, ApiError, CampResourceRequest>({
    mutationFn: addCampResource,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: campsKeys.resourcesByCamp(variables.campId) })
      queryClient.invalidateQueries({ queryKey: campsKeys.detail(variables.campId) })
    },
    ...options,
  })
}

export async function updateCampResource(
  campId: number,
  resourceTypeId: number,
  data: UpdateCampResourceRequest,
): Promise<any> {
  const res = await fetch(`${ENDPOINTS.campResources}/${campId}/${resourceTypeId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update camp resource')
  return res.json()
}

export function useUpdateCampResource(
  options?: Omit<
    UseMutationOptions<
      any,
      ApiError,
      { campId: number; resourceTypeId: number; data: UpdateCampResourceRequest }
    >,
    'mutationFn'
  >,
) {
  const queryClient = useQueryClient()
  return useMutation<
    any,
    ApiError,
    { campId: number; resourceTypeId: number; data: UpdateCampResourceRequest }
  >({
    mutationFn: (params: {
      campId: number
      resourceTypeId: number
      data: UpdateCampResourceRequest
    }) => updateCampResource(params.campId, params.resourceTypeId, params.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: campsKeys.resourcesByCamp(variables.campId) })
      queryClient.invalidateQueries({ queryKey: campsKeys.detail(variables.campId) })
    },
    ...options,
  })
}

export async function removeCampResource(campId: number, resourceTypeId: number): Promise<void> {
  const res = await fetch(`${ENDPOINTS.campResources}/${campId}/${resourceTypeId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  if (!res.ok) throw new Error('Failed to remove resource from camp')
}

export function useRemoveCampResource(
  options?: Omit<
    UseMutationOptions<void, ApiError, { campId: number; resourceTypeId: number }>,
    'mutationFn'
  >,
) {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, { campId: number; resourceTypeId: number }>({
    mutationFn: (params: { campId: number; resourceTypeId: number }) =>
      removeCampResource(params.campId, params.resourceTypeId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: campsKeys.resourcesByCamp(variables.campId) })
      queryClient.invalidateQueries({ queryKey: campsKeys.detail(variables.campId) })
    },
    ...options,
  })
}
