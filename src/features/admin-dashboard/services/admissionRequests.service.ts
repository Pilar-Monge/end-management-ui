import { ApiHttpError, apiRequest } from '../../../shared/services/httpClient'
import type { AdminAdmissionRequest } from './types'

type AdmissionDecision = 'approved' | 'rejected'

interface AdmissionReviewOptions {
  finalOccupationId?: number
  finalRole?: string
  rejectionReason?: string
}

const ADMISSION_REVIEW_ENDPOINT_KEY = 'admin_dashboard_admission_review_endpoint'
const ADMISSION_REVIEW_ENDPOINTS = [
  '/admission-requests/{id}/review',
  '/admission-requests/{id}',
] as const

let cachedAdmissionReviewEndpointTemplate: string | null = null

function isKnownAdmissionReviewEndpoint(template: string): boolean {
  return ADMISSION_REVIEW_ENDPOINTS.includes(template as (typeof ADMISSION_REVIEW_ENDPOINTS)[number])
}

function readCachedAdmissionReviewEndpoint(): string | null {
  if (cachedAdmissionReviewEndpointTemplate) return cachedAdmissionReviewEndpointTemplate
  if (typeof window === 'undefined') return null

  const stored = window.localStorage.getItem(ADMISSION_REVIEW_ENDPOINT_KEY)
  if (!stored || !isKnownAdmissionReviewEndpoint(stored)) return null

  cachedAdmissionReviewEndpointTemplate = stored
  return stored
}

function rememberAdmissionReviewEndpoint(template: string): void {
  if (!isKnownAdmissionReviewEndpoint(template)) return
  cachedAdmissionReviewEndpointTemplate = template
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ADMISSION_REVIEW_ENDPOINT_KEY, template)
}

function resolveAdmissionEndpoint(template: string, id: number): string {
  return template.replace('{id}', String(id))
}

function prioritizeAdmissionAttempts(
  attempts: Array<{ template: string; method: 'PUT' | 'POST'; body: Record<string, unknown> }>,
): Array<{ template: string; method: 'PUT' | 'POST'; body: Record<string, unknown> }> {
  const cachedTemplate = readCachedAdmissionReviewEndpoint()
  if (!cachedTemplate) return attempts

  const preferred = attempts.filter((attempt) => attempt.template === cachedTemplate)
  const fallback = attempts.filter((attempt) => attempt.template !== cachedTemplate)
  return [...preferred, ...fallback]
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

  const attempts = prioritizeAdmissionAttempts([
    // Endpoint canonico para disparar eventos de negocio (incluye correo)
    { template: '/admission-requests/{id}/review', method: 'POST', body: reviewPayload },
    // Compatibilidad con variantes de backend
    { template: '/admission-requests/{id}/review', method: 'PUT', body: reviewPayload },
    {
      template: '/admission-requests/{id}/review',
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
    { template: '/admission-requests/{id}/review', method: 'PUT', body: { status: upperStatus } },
    { template: '/admission-requests/{id}', method: 'PUT', body: { status: upperStatus } },
  ])

  let lastRecoverableError: unknown = null

  for (const attempt of attempts) {
    try {
      const path = resolveAdmissionEndpoint(attempt.template, id)
      const response = await apiRequest<AdminAdmissionRequest>(path, {
        method: attempt.method,
        body: JSON.stringify(attempt.body),
      })
      rememberAdmissionReviewEndpoint(attempt.template)
      return response
    } catch (error) {
      if (!isRecoverableAdmissionError(error)) {
        throw error
      }
      lastRecoverableError = error
    }
  }

  throw (lastRecoverableError ?? new Error('No se pudo revisar la admision'))
}
