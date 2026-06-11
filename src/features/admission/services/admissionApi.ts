import type { AdmissionRequest, ProcessAIPayload, ReviewAdmissionPayload } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

const getHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
})

function admissionErrorMessage(status: number, action: 'submit' | 'pending' | 'detail' | 'ai' | 'review'): string {
  if (status === 400 || status === 422) return 'Solicitud invalida. Revisa los datos e intenta nuevamente.'
  if (status === 401) return 'Sesion inactiva o expirada. Inicia sesion para continuar.'
  if (status === 403) return 'No tienes permisos para realizar esta accion.'
  if (status === 404) return 'No se encontro la solicitud indicada.'
  if (status === 429) return 'Demasiadas solicitudes. Espera un momento e intenta nuevamente.'
  if (status >= 500) return 'Servicio no disponible temporalmente. Intenta nuevamente mas tarde.'

  if (action === 'submit') return 'No se pudo enviar la solicitud de admision.'
  if (action === 'pending') return 'No se pudo obtener la lista de solicitudes pendientes.'
  if (action === 'detail') return 'No se pudo obtener el detalle de la solicitud.'
  if (action === 'ai') return 'No se pudo procesar la solicitud con IA.'
  return 'No se pudo completar la revision de la solicitud.'
}

export async function submitAdmission(
  payload: FormData | Record<string, any>,
): Promise<AdmissionRequest> {
  if (payload instanceof FormData) {
    const res = await fetch(`${BASE_URL}/admission-requests`, {
      method: 'POST',
      credentials: 'include',
      body: payload,
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(admissionErrorMessage(res.status, 'submit'))
    }
    return data.data
  }
  const res = await fetch(`${BASE_URL}/admission-requests`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(admissionErrorMessage(res.status, 'submit'))
  }
  return data.data
}
export async function fetchPendingAdmissions(campId: number): Promise<AdmissionRequest[]> {
  const res = await fetch(`${BASE_URL}/admission-requests/camps/${campId}/pending`, {
    headers: getHeaders(),
    credentials: 'include',
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(admissionErrorMessage(res.status, 'pending'))
  }
  return data.data
}
export async function fetchAdmissionRequestById(id: number): Promise<AdmissionRequest> {
  const res = await fetch(`${BASE_URL}/admission-requests/${id}`, {
    headers: getHeaders(),
    credentials: 'include',
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(admissionErrorMessage(res.status, 'detail'))
  }
  return data.data
}
export async function processAdmissionWithAI(
  id: number,
  payload: ProcessAIPayload,
): Promise<AdmissionRequest> {
  const res = await fetch(`${BASE_URL}/admission-requests/${id}/process-ai`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(admissionErrorMessage(res.status, 'ai'))
  }
  return data.data
}
export async function reviewAdmissionRequest(
  id: number,
  payload: ReviewAdmissionPayload,
): Promise<AdmissionRequest> {
  const res = await fetch(`${BASE_URL}/admission-requests/${id}/review`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(admissionErrorMessage(res.status, 'review'))
  }
  return data.data
}
