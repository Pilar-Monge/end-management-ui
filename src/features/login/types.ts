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
  token: string
  user: {
    id: number
    username: string
    rol: string
    campId: number
  }
}
export type LoginErrors = Partial<LoginForm & { general: string }>
