import type {
  Camp,
  LoginApiResponse,
  LoginForm,
  PasswordResetApiResponse,
  PasswordResetConfirmPayload,
  PasswordResetRequestPayload,
} from '../types'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

function authErrorMessage(status: number): string {
  if (status === 400) return 'Solicitud invalida. Revisa los datos e intenta nuevamente.'
  if (status === 401) return 'Credenciales invalidas. Verifica tu usuario y contrasena.'
  if (status === 403) return 'No tienes permisos para iniciar sesion en este modulo.'
  if (status === 429) return 'Demasiados intentos. Espera un momento e intenta nuevamente.'
  if (status >= 500) return 'Servicio de autenticacion no disponible temporalmente.'
  return 'No se pudo iniciar sesion. Intenta nuevamente.'
}

function passwordResetErrorMessage(status: number): string {
  if (status === 429) return 'Demasiados intentos. Espera un momento antes de solicitar otro codigo.'
  if (status >= 500) return 'Servicio de recuperacion no disponible temporalmente.'
  return 'El codigo es invalido, expiro o ya fue utilizado.'
}

function forgotPasswordErrorMessage(status: number): string {
  if (status === 429) return 'Demasiados intentos. Espera un momento antes de solicitar otro codigo.'
  if (status >= 500) return 'Servicio de recuperacion no disponible temporalmente.'
  return 'No se pudo solicitar el codigo. Revisa los datos e intenta nuevamente.'
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T
  } catch {
    return {} as T
  }
}

export async function fetchCamps(): Promise<Camp[]> {
  const res = await fetch(`${BASE_URL}/camps?status=ACTIVE`)
  if (!res.ok) throw new Error('No se pudo cargar la lista de campamentos')

  const data = await res.json()
  return Array.isArray(data) ? data : (data.data ?? [])
}

export async function loginRequest(form: LoginForm): Promise<LoginApiResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      username: form.username,
      password: form.password,
      campId: form.campId,
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(authErrorMessage(res.status))

  return data.data as LoginApiResponse
}

export async function requestPasswordReset(
  payload: PasswordResetRequestPayload,
): Promise<PasswordResetApiResponse> {
  const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await readJsonResponse<PasswordResetApiResponse>(res)
  if (!res.ok) throw new Error(forgotPasswordErrorMessage(res.status))

  return data
}

export async function resetPasswordWithCode(
  payload: PasswordResetConfirmPayload,
): Promise<PasswordResetApiResponse> {
  const res = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await readJsonResponse<PasswordResetApiResponse>(res)
  if (!res.ok) throw new Error(passwordResetErrorMessage(res.status))

  return data
}
