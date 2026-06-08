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

function buildHeaders(): HeadersInit {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function buildAuthHeaders(): HeadersInit {
  const token = getToken()
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function unwrapPayload<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

async function readServiceError(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: unknown; error?: unknown }
    const rawMessage = payload.message ?? payload.error
    const message = Array.isArray(rawMessage)
      ? rawMessage.filter((item): item is string => typeof item === 'string').join('. ')
      : typeof rawMessage === 'string'
        ? rawMessage
        : ''
    return message.trim() || fallback
  } catch {
    return fallback
  }
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

export async function updatePersonPhoto(id: number, photo: File): Promise<Person> {
  const formData = new FormData()
  formData.append('file', photo) // Como requiere la guía: estrictamente 'file'

  // Deducimos la ruta reemplazando dinámicamente '/person' por el nuevo endpoint
  const endpoint = ENDPOINTS.persons.replace(/\/person\/?$/, '/auth/me/photo')

  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: buildAuthHeaders(), // buildAuthHeaders envía Authorization pero sin Content-Type
    body: formData,
  })

  if (!res.ok) {
    const errorMsg = await readServiceError(res, 'No se pudo actualizar la foto de perfil')
    throw new Error(errorMsg)
  }

  const payload = await res.json()
  return unwrapPayload<Person>(payload)
}

export function useUpdatePersonPhoto(
  options?: Omit<
    UseMutationOptions<Person, ApiError, { id: number; photo: File }>,
    'mutationFn'
  >,
) {
  const queryClient = useQueryClient()

  return useMutation<Person, ApiError, { id: number; photo: File }>({
    mutationFn: (params: { id: number; photo: File }) =>
      updatePersonPhoto(params.id, params.photo),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: personsKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: personsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: personsKeys.stats() })
      // Invalida la sesión por si la persona actualizada es el usuario logeado actual
      queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
    },
    ...options,
  })
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
