import { apiRequest } from '../../../shared/services/httpClient'
import type { IntercampRecord } from './types'

export async function getIntercampRequestById(id: number): Promise<IntercampRecord> {
  return apiRequest<IntercampRecord>(`/intercamp-requests/${id}`)
}

export async function getTransferById(id: number): Promise<IntercampRecord> {
  return apiRequest<IntercampRecord>(`/transfers/${id}`)
}

export async function getTransferHistoryById(id: number): Promise<IntercampRecord> {
  return apiRequest<IntercampRecord>(`/transfer-history/${id}`)
}

export async function getTransferPersonById(id: number): Promise<IntercampRecord> {
  return apiRequest<IntercampRecord>(`/transfer-persons/${id}`)
}

export async function getDeliveredTransferResourceById(id: number): Promise<IntercampRecord> {
  return apiRequest<IntercampRecord>(`/delivered-transfer-resources/${id}`)
}
