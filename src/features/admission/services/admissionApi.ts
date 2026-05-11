import type {
  AdmissionRequest,
  CreateAdmissionRequestInput,
  ProcessAIPayload,
  ReviewAdmissionPayload,
} from '../types'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

const getToken = (): string | null => localStorage.getItem('token')

const getHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken() || ''}`,
})

export async function submitAdmission(
  payload: FormData | Record<string, any>,
): Promise<AdmissionRequest> {
  const token = getToken()
  if (payload instanceof FormData) {
    const res = await fetch(`${BASE_URL}/admission-requests`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token || ''}`,
      },
      body: payload,
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.message || 'Error al enviar la solicitud de admisión')
    }
    return data.data
  }
  const res = await fetch(`${BASE_URL}/admission-requests`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Error al enviar la solicitud de admisión')
  }
  return data.data
}
export async function fetchPendingAdmissions(campId: number): Promise<AdmissionRequest[]> {
  const token = getToken()
  const res = await fetch(`${BASE_URL}/admission-requests/camps/${campId}/pending`, {
    headers: getHeaders(),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Error al obtener solicitudes pendientes')
  }
  return data.data
}
export async function fetchAdmissionRequestById(id: number): Promise<AdmissionRequest> {
  const token = getToken()
  const res = await fetch(`${BASE_URL}/admission-requests/${id}`, {
    headers: getHeaders(),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Error obteniendo solicitud')
  }
  return data.data
}
export async function processAdmissionWithAI(
  id: number,
  payload: ProcessAIPayload,
): Promise<AdmissionRequest> {
  const token = getToken()
  const res = await fetch(`${BASE_URL}/admission-requests/${id}/process-ai`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Error procesando con IA')
  }
  return data.data
}
export async function reviewAdmissionRequest(
  id: number,
  payload: ReviewAdmissionPayload,
): Promise<AdmissionRequest> {
  const token = getToken()
  const res = await fetch(`${BASE_URL}/admission-requests/${id}/review`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Error en revisión de solicitud')
  }
  return data.data
}
