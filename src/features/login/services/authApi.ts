import type {
  Camp,
  LoginApiResponse,
  LoginForm,
  PasswordResetApiResponse,
  PasswordResetConfirmPayload,
  PasswordResetRequestPayload,
} from '../types'
import { clearCachedSession, normalizeSessionUser } from '../../../shared/services/sessionProfile'

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

async function clearPreviousBackendSession(): Promise<void> {
  clearCachedSession(false)
  try {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    // Best effort only. The next login still has to overwrite/validate the cookie.
  }
}

async function fetchAuthenticatedUserAfterLogin(): Promise<{ campId?: number; role?: string; rol?: string }> {
  const response = await fetch(`${BASE_URL}/auth/me`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    throw new Error('La sesion no quedo activa despues del login. Revisa cookies/credentials.')
  }

  return normalizeSessionUser(await response.json())
}

export async function fetchCamps(): Promise<Camp[]> {
  const res = await fetch(`${BASE_URL}/camps?status=ACTIVE`)
  if (!res.ok) throw new Error('No se pudo cargar la lista de campamentos')

  const data = await res.json()
  return Array.isArray(data) ? data : (data.data ?? [])
}

export async function loginRequest(form: LoginForm): Promise<LoginApiResponse> {
  const campId = Number(form.campId)
  if (!Number.isFinite(campId) || campId <= 0) {
    throw new Error('Debes seleccionar un campamento valido antes de iniciar sesion.')
  }

  await clearPreviousBackendSession()

  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      username: form.username.trim(),
      password: form.password,
      campId,
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(authErrorMessage(res.status))

  const loginData = data.data as LoginApiResponse
  const sessionUser = await fetchAuthenticatedUserAfterLogin()

  if (sessionUser.campId !== undefined && sessionUser.campId !== campId) {
    throw new Error(`La sesion quedo en el campamento ${sessionUser.campId}, pero se solicito el campamento ${campId}.`)
  }

  return {
    ...loginData,
    user: {
      ...loginData.user,
      campId: sessionUser.campId ?? loginData.user.campId,
      rol: sessionUser.rol ?? sessionUser.role ?? loginData.user.rol,
      role: sessionUser.role ?? loginData.user.role,
    },
  }
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
