import { ApiHttpError, apiRequest } from '../../../shared/services/httpClient'
import type { AdminAdmissionRequest } from './types'

type AdmissionDecision = 'approved' | 'rejected'

export async function listAdmissionRequests(campId?: number): Promise<AdminAdmissionRequest[]> {
  const path = campId
    ? `/admission-requests/camps/${campId}/pending`
    : '/admission-requests'

  return apiRequest<AdminAdmissionRequest[]>(path)
}

export async function updateAdmissionRequestStatus(
  id: number,
  status: AdmissionDecision,
): Promise<AdminAdmissionRequest> {
  try {
    return await apiRequest<AdminAdmissionRequest>(`/admission-requests/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ status, decision: status }),
    })
  } catch (error) {
    if (!(error instanceof ApiHttpError) || (error.statusCode !== 400 && error.statusCode !== 404)) {
      throw error
    }
  }

  return apiRequest<AdminAdmissionRequest>(`/admission-requests/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}
