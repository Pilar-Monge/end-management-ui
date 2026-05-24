import { ApiHttpError, apiRequest } from '../../../shared/services/httpClient'
import type { AdminAdmissionRequest } from './types'

type AdmissionDecision = 'approved' | 'rejected'

interface AdmissionReviewOptions {
  finalOccupationId?: number
  finalRole?: string
  rejectionReason?: string
}

function readAdminUserId(): number | null {
  const rawUser = localStorage.getItem('user')
  if (!rawUser) return null
  try {
    const parsed = JSON.parse(rawUser) as { id?: unknown }
    if (typeof parsed.id === 'number') return parsed.id
    if (typeof parsed.id === 'string') {
      const parsedId = Number(parsed.id)
      return Number.isFinite(parsedId) ? parsedId : null
    }
    return null
  } catch {
    return null
  }
}

function isRecoverableAdmissionError(error: unknown): boolean {
  return (
    error instanceof ApiHttpError
    && [400, 404, 405, 409, 422].includes(error.statusCode)
  )
}

export async function listAdmissionRequests(campId?: number): Promise<AdminAdmissionRequest[]> {
  const path = campId
    ? `/admission-requests/camps/${campId}/pending`
    : '/admission-requests'

  return apiRequest<AdminAdmissionRequest[]>(path)
}

export async function updateAdmissionRequestStatus(
  id: number,
  status: AdmissionDecision,
  options: AdmissionReviewOptions = {},
): Promise<AdminAdmissionRequest> {
  const upperStatus = status.toUpperCase()
  const approved = status === 'approved'
  const adminUserId = readAdminUserId()
  const reviewPayload = {
    approved,
    ...(typeof options.finalOccupationId === 'number' ? { finalOccupationId: options.finalOccupationId } : {}),
    ...(typeof options.finalRole === 'string' && options.finalRole.trim()
      ? { finalRole: options.finalRole.trim() }
      : {}),
    ...(typeof options.rejectionReason === 'string' && options.rejectionReason.trim()
      ? { rejectionReason: options.rejectionReason.trim() }
      : {}),
    ...(adminUserId ? { adminUserId } : {}),
  }

  const attempts: Array<{ path: string; method: 'PUT' | 'POST'; body: Record<string, unknown> }> = [
    // Endpoint canonico para disparar eventos de negocio (incluye correo)
    { path: `/admission-requests/${id}/review`, method: 'POST', body: reviewPayload },
    // Compatibilidad con variantes de backend
    { path: `/admission-requests/${id}/review`, method: 'PUT', body: reviewPayload },
    {
      path: `/admission-requests/${id}/review`,
      method: 'POST',
      body: {
        approved,
        status: upperStatus,
        decision: status,
        ...(typeof options.finalOccupationId === 'number' ? { oficioFinalId: options.finalOccupationId } : {}),
        ...(typeof options.finalRole === 'string' && options.finalRole.trim() ? { rolFinal: options.finalRole.trim() } : {}),
        ...(typeof options.rejectionReason === 'string' && options.rejectionReason.trim() ? { rejectionReason: options.rejectionReason.trim() } : {}),
        ...(adminUserId ? { adminUserId } : {}),
      },
    },
    { path: `/admission-requests/${id}/review`, method: 'PUT', body: { status: upperStatus } },
  ]

  let lastRecoverableError: unknown = null

  for (const attempt of attempts) {
    try {
      return await apiRequest<AdminAdmissionRequest>(attempt.path, {
        method: attempt.method,
        body: JSON.stringify(attempt.body),
      })
    } catch (error) {
      if (!isRecoverableAdmissionError(error)) {
        throw error
      }
      lastRecoverableError = error
    }
  }

  throw (lastRecoverableError ?? new Error('No se pudo revisar la admision'))
}
