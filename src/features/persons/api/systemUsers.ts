import { apiRequest } from '../../../shared/services/httpClient'
import type { SystemUser, UpdateSystemUserRequest } from '../types'

export async function fetchSystemUserById(userId: number): Promise<SystemUser> {
  return apiRequest<SystemUser>(`/users/${userId}`)
}

export async function updateSystemUser(userId: number, data: UpdateSystemUserRequest): Promise<SystemUser> {
  return apiRequest<SystemUser>(`/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}
