import { useMutation, type UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import type {
  ApiError,
  CreatePersonRequest,
  Person,
  PersonStatusUpdateRequest,
  UpdatePersonRequest,
} from '../types'
import { ENDPOINTS, personsKeys } from './keys'

const getToken = () => localStorage.getItem('token') ?? localStorage.getItem('accessToken')

function buildHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  }
}

function unwrapPayload<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

export async function createPerson(data: CreatePersonRequest): Promise<Person> {
  const res = await fetch(ENDPOINTS.persons, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  })

  if (!res.ok) throw new Error('Failed to create person')
  const payload = await res.json()
  return unwrapPayload<Person>(payload)
}

export function useCreatePerson(
  options?: Omit<UseMutationOptions<Person, ApiError, CreatePersonRequest>, 'mutationFn'>,
) {
  const queryClient = useQueryClient()

  return useMutation<Person, ApiError, CreatePersonRequest>({
    mutationFn: createPerson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: personsKeys.stats() })
    },
    ...options,
  })
}

export async function updatePerson(id: number, data: UpdatePersonRequest): Promise<Person> {
  const res = await fetch(`${ENDPOINTS.persons}/${id}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  })

  if (!res.ok) throw new Error('Failed to update person')
  const payload = await res.json()
  return unwrapPayload<Person>(payload)
}

export function useUpdatePerson(
  options?: Omit<
    UseMutationOptions<Person, ApiError, { id: number; data: UpdatePersonRequest }>,
    'mutationFn'
  >,
) {
  const queryClient = useQueryClient()

  return useMutation<Person, ApiError, { id: number; data: UpdatePersonRequest }>({
    mutationFn: (params: { id: number; data: UpdatePersonRequest }) =>
      updatePerson(params.id, params.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: personsKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: personsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: personsKeys.stats() })
    },
    ...options,
  })
}

export async function deletePerson(id: number): Promise<void> {
  const res = await fetch(`${ENDPOINTS.persons}/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  })

  if (!res.ok) throw new Error('Failed to delete person')
}

export function useDeletePerson(
  options?: Omit<UseMutationOptions<void, ApiError, number>, 'mutationFn'>,
) {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, number>({
    mutationFn: deletePerson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: personsKeys.stats() })
    },
    ...options,
  })
}

export async function updatePersonStatus(
  id: number,
  data: PersonStatusUpdateRequest,
): Promise<Person> {
  const res = await fetch(`${ENDPOINTS.persons}/${id}/status`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  })

  if (!res.ok) throw new Error('Failed to update person status')
  const payload = await res.json()
  return unwrapPayload<Person>(payload)
}

export function useUpdatePersonStatus(
  options?: Omit<
    UseMutationOptions<Person, ApiError, { id: number; data: PersonStatusUpdateRequest }>,
    'mutationFn'
  >,
) {
  const queryClient = useQueryClient()

  return useMutation<Person, ApiError, { id: number; data: PersonStatusUpdateRequest }>({
    mutationFn: (params: { id: number; data: PersonStatusUpdateRequest }) =>
      updatePersonStatus(params.id, params.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: personsKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: personsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: personsKeys.stats() })
    },
    ...options,
  })
}
