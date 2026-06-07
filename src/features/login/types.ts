export interface LoginForm {
  username: string
  password: string

  campId: number | null
}
export interface Camp {
  id: number
  name: string
  status: 'ACTIVE' | 'INACTIVE' | 'ABANDONED'
}

export interface ApiError {
  field?: string
  message: string
}

export interface LoggedUser {
  role: string
  username: string
}

export interface LoginApiResponse {
  token?: string
  accessToken?: string
  user: {
    id: number
    personId?: number
    person_id?: number
    userId?: number
    username: string
    rol: string
    role?: string
    campId: number
  }
}
export type LoginErrors = Partial<{
  username: string
  password: string
  campId: string
  general: string
}>

export interface PasswordResetRequestPayload {
  username: string
  email: string
  campId: number
}

export interface PasswordResetConfirmPayload extends PasswordResetRequestPayload {
  code: string
  newPassword: string
}

export interface PasswordResetApiResponse {
  success?: boolean
  message?: string
}

export type PasswordResetErrors = Partial<{
  username: string
  email: string
  code: string
  newPassword: string
  confirmPassword: string
  general: string
}>
