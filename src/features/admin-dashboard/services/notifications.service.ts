import { ApiHttpError, apiRequest } from '../../../shared/services/httpClient'
import type { AdminNotificationRecord } from './types'

export async function listNotifications(): Promise<AdminNotificationRecord[]> {
  return apiRequest<AdminNotificationRecord[]>('/notifications')
}

export async function markNotificationAsRead(id: number): Promise<AdminNotificationRecord> {
  try {
    return await apiRequest<AdminNotificationRecord>(`/notifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ read: true }),
    })
  } catch (error) {
    if (!(error instanceof ApiHttpError) || error.statusCode !== 400) {
      throw error
    }
  }

  return apiRequest<AdminNotificationRecord>(`/notifications/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ isRead: true }),
  })
}
