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

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin
  } catch {
    return 'http://localhost:3000'
  }
})()

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

function normalizeMediaUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^https?:\/\//i.test(trimmed)) return null

  try {
    const url = new URL(trimmed)
    if (url.origin === API_ORIGIN && /^\/(person-photos|admission-photos)\//i.test(url.pathname)) {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}

function resolveProfilePhotoFromRecord(record: unknown, depth = 0): string | null {
  if (!record || typeof record !== 'object') return null
  if (depth > 3) return null
  const source = record as Record<string, unknown>
  const directPhoto =
    normalizeMediaUrl(source.imageSignedUrl ?? source.image_signed_url) ??
    normalizeMediaUrl(source.signedImageUrl ?? source.signed_image_url) ??
    normalizeMediaUrl(source.signedUrl ?? source.signed_url) ??
    normalizeMediaUrl(source.photoSignedUrl ?? source.photo_signed_url) ??
    normalizeMediaUrl(source.url) ??
    normalizeMediaUrl(source.secureUrl ?? source.secure_url) ??
    normalizeMediaUrl(source.publicUrl ?? source.public_url) ??
    normalizeMediaUrl(source.downloadUrl ?? source.download_url) ??
    normalizeMediaUrl(source.imageUrl ?? source.image_url) ??
    normalizeMediaUrl(source.photoUrl ?? source.photo_url) ??
    normalizeMediaUrl(source.profileImage ?? source.profile_image ?? source.profilePhoto ?? source.profile_photo) ??
    normalizeMediaUrl(source.avatar) ??
    normalizeMediaUrl(source.photo)

  if (directPhoto) return directPhoto

  for (const value of Object.values(source)) {
    const nestedPhoto = resolveProfilePhotoFromRecord(value, depth + 1)
    if (nestedPhoto) return nestedPhoto
  }

  return null
}

function numberFromValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return null
}

function resolveProfilePersonIdFromRecord(record: unknown, depth = 0): number | null {
  if (!record || typeof record !== 'object') return null
  if (depth > 3) return null

  const source = record as Record<string, unknown>
  const explicitPersonId = numberFromValue(source.personId ?? source.person_id ?? source.profilePersonId ?? source.profile_person_id)
  if (explicitPersonId !== null) return explicitPersonId

  for (const key of ['person', 'profile', 'data', 'user'] as const) {
    const nestedId = resolveProfilePersonIdFromRecord(source[key], depth + 1)
    if (nestedId !== null) return nestedId
  }

  const directId = numberFromValue(source.id)
  if (directId !== null) return directId

  for (const value of Object.values(source)) {
    const nestedId = resolveProfilePersonIdFromRecord(value, depth + 1)
    if (nestedId !== null) return nestedId
  }

  return null
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
  const data = unwrapPayload<Person>(payload)
  const resolvedPhotoUrl = resolveProfilePhotoFromRecord(data) ?? resolveProfilePhotoFromRecord(payload)
  const resolvedPersonId = resolveProfilePersonIdFromRecord(data) ?? resolveProfilePersonIdFromRecord(payload) ?? numberFromValue(id)

  if (!resolvedPhotoUrl) {
    return {
      ...data,
      ...(resolvedPersonId !== null ? { id: resolvedPersonId } : {}),
    }
  }

  return {
    ...data,
    id: resolvedPersonId ?? data.id ?? id,
    imageSignedUrl: resolvedPhotoUrl,
    imageUrl: resolvedPhotoUrl,
    photoUrl: resolvedPhotoUrl,
    profileImage: resolvedPhotoUrl,
    avatar: resolvedPhotoUrl,
    photo: resolvedPhotoUrl,
  }
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
